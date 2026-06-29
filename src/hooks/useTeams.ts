/**
 * useTeams — AUTORITÉ de la définition team/agents (L11) + résolution + liaison.
 *
 * La **team est l'objet de premier rang** (PROJET § 0) : un roster d'agents, chacun
 * = persona (nom/royaume/roleIndex) + **runner** + **modèle** + **skills**, avec un
 * **coordinateur** désigné (= chef de projet) et un **casting visuel** (`vignetteTeam`).
 * Les teams sont persistées en **config NON sensible** sérialisée **JSON** sous la clé
 * `teams` (AR-5 : zéro nouvelle commande Tauri — on réutilise `configGet/Set/All`).
 *
 * Ce hook est la SEULE autorité du modèle (pas de god-component) :
 *   - **chargement + bootstrap** : au montage, lit `teams`/`default_team`/`project_team:*`
 *     via `configAll` ; si `teams` est vide/illisible → écrit une team par défaut éditable
 *     dérivée de `DEMO_TEAM` (graine, calque `setTeam` L9) ;
 *   - **résolution (lecture)** : `teamForProject`, `coordinatorOf`, `agentInTeam`,
 *     `hasBinding` (popup), `defaultTeamId` ;
 *   - **définition (écriture)** : `upsertTeam`/`removeTeam`/`upsertAgent`/`removeAgent`/
 *     `setCoordinator` (sérialisent le tableau complet) ;
 *   - **liaison projet** : `bindProjectTeam` (écrit `project_team:<id>` + `default_team`).
 *
 * INVARIANT (§ 3) : le JSON `teams` ne contient AUCUN secret (runner = kind, modèle =
 * alias, skills = ids). Les credentials de runner restent au keychain (write-only).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { DEMO_TEAM, skillsForAgent } from "../mock/demoTeam";
import { TEAM_CATALOG, type CatalogTeam } from "../assets/teams/catalog";

/**
 * Runner conceptuel d'un agent (PROJET § 0.2). **`claude-code` ET `codex` sont
 * EXÉCUTABLES** (terminal-source : TUI native + tailer du transcript/rollout on-disk) ;
 * `ollama`/`litellm` sont **définissables** (la définition est complète) mais non câblés
 * ici (bannière honnête au lancement).
 */
export type AgentRunnerKind = "claude-code" | "ollama" | "litellm" | "codex";

/** Les 4 runners sélectionnables dans l'éditeur (AR-2). Ordre stable pour le `<select>`. */
export const AGENT_RUNNER_KINDS: readonly AgentRunnerKind[] = [
  "claude-code",
  "ollama",
  "litellm",
  "codex",
] as const;

/** Id de la team par défaut (miroir Rust `DEFAULT_TEAM_ID`). */
export const DEFAULT_TEAM_ID = "iakaframe";

/** Clés config (miroir Rust). Liaison projet = préfixe + projectId. */
export const TEAMS_KEYS = {
  teams: "teams",
  defaultTeam: "default_team",
  projectTeamPrefix: "project_team:",
  /** Legacy L9 (casting de vignettes par défaut) — graine du `vignetteTeam` par défaut. */
  uiTeam: "ui_team",
} as const;

/** Casting visuel de bootstrap si `ui_team` absent (calque `DEFAULT_TEAM` L9). */
const DEFAULT_VIGNETTE_TEAM = "lotr";

export interface Agent {
  /** Slug stable, unique dans la team (ex. "aragorn"). */
  id: string;
  /** Affichage (ex. "Aragorn"). */
  name: string;
  /** Royaume MAJUSCULE — pastille `[ROYAUME][Agent]`. */
  royaume: string;
  /** Index vignette (0..N-1) — pioche le slug du casting (L9). */
  roleIndex: number;
  /** Runner conceptuel (§ 0.2) ; seul `claude-code` est exécutable (P3). */
  runner: AgentRunnerKind;
  /** Alias/modèle transmis au runner (vide = défaut du runner). */
  model: string;
  /** Ids de skill-rôles iakaframe (ex. "iakaframe-cadrage"). */
  skills: string[];
}

export interface Team {
  /** Slug stable, unique (ex. "iakaframe"). */
  id: string;
  /** Affichage (ex. "iakaframe"). */
  name: string;
  /** Casting visuel ∈ `embeddedTeams()` (ex. "lotr") ; "none" = pastilles. */
  vignetteTeam: string;
  /** Id d'agent coordinateur (= chef de projet) ; doit exister dans `agents[]`. */
  coordinator: string;
  agents: Agent[];
}

export interface UseTeams {
  teams: Team[];
  loaded: boolean;
  /** = `default_team` (graine de pré-sélection du popup). */
  defaultTeamId: string;
  // --- Résolution (lecture) ---
  /** team du projet : `project_team:<id>` existant → sinon team par défaut. */
  teamForProject: (projectId: string) => Team;
  /** coordinateur : `team.coordinator` existant → sinon `agents[0]` (jamais sans chef). */
  coordinatorOf: (team: Team) => Agent | null;
  /** agent par nom (insensible casse) dans la team, pour `@agent` borné. */
  agentInTeam: (team: Team, name: string) => Agent | null;
  /** y a-t-il une liaison `project_team:<id>` ? (déclenche le popup si non). */
  hasBinding: (projectId: string) => boolean;
  // --- Définition (écriture) ---
  upsertTeam: (team: Team) => Promise<void>;
  removeTeam: (teamId: string) => Promise<void>;
  upsertAgent: (teamId: string, agent: Agent) => Promise<void>;
  removeAgent: (teamId: string, agentId: string) => Promise<void>;
  setCoordinator: (teamId: string, agentId: string) => Promise<void>;
  // --- Liaison projet ---
  bindProjectTeam: (projectId: string, teamId: string) => Promise<void>;
  /** Relit la config (teams + liaisons) — utile après le seed démo (Rust). */
  reload: () => Promise<void>;
}

/** Valide un runner (défensif) ; défaut `claude-code` si invalide/absent. */
export function parseAgentRunnerKind(value: unknown): AgentRunnerKind {
  return AGENT_RUNNER_KINDS.includes(value as AgentRunnerKind)
    ? (value as AgentRunnerKind)
    : "claude-code";
}

/** Un runner est-il EXÉCUTABLE en l'état (terminal-source réel : TUI native + tailer
 * on-disk) ? `claude-code` (L10) et `codex` (runner Codex réel). */
export function isExecutableRunner(kind: AgentRunnerKind): boolean {
  return kind === "claude-code" || kind === "codex";
}

/** Parse défensif d'UN agent (record invalide → `null`, jamais d'exception). */
function parseAgent(raw: unknown): Agent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name : null;
  if (!name || name.trim().length === 0) return null;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0
      ? r.id
      : name.toLowerCase();
  const royaume = typeof r.royaume === "string" ? r.royaume : "";
  const roleIndex =
    typeof r.roleIndex === "number" && Number.isFinite(r.roleIndex)
      ? r.roleIndex
      : 0;
  const model = typeof r.model === "string" ? r.model : "";
  const skills = Array.isArray(r.skills)
    ? r.skills.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id,
    name,
    royaume,
    roleIndex,
    runner: parseAgentRunnerKind(r.runner),
    model,
    skills,
  };
}

/** Parse défensif d'UNE team (record/agents invalides ignorés ; `null` si inutilisable). */
function parseTeam(raw: unknown): Team | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id : null;
  if (!id) return null;
  const name = typeof r.name === "string" && r.name.trim().length > 0 ? r.name : id;
  const vignetteTeam =
    typeof r.vignetteTeam === "string" ? r.vignetteTeam : DEFAULT_VIGNETTE_TEAM;
  const agents = Array.isArray(r.agents)
    ? r.agents.map(parseAgent).filter((a): a is Agent => a !== null)
    : [];
  // Coordinateur : référence valide → conservée ; sinon repli sur le 1er agent.
  const coordRaw = typeof r.coordinator === "string" ? r.coordinator : "";
  const coordinator =
    agents.some((a) => a.id === coordRaw) && coordRaw.length > 0
      ? coordRaw
      : (agents[0]?.id ?? "");
  return { id, name, vignetteTeam, coordinator, agents };
}

/**
 * Parse le JSON `teams` (défensif). Renvoie `[]` si absent/illisible/non-tableau —
 * l'appelant déclenche alors le bootstrap (§ A6 : jamais d'exception, ≥ 1 team).
 */
export function parseTeams(json: string | undefined): Team[] {
  if (!json || json.trim().length === 0) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(parseTeam).filter((t): t is Team => t !== null);
}

/**
 * Construit la **team par défaut éditable** (graine, § 5.6) à partir de `DEMO_TEAM` :
 * id/nom `iakaframe`, casting `vignetteTeam`, coordinateur `aragorn`, **7 agents** (un
 * par rôle canonique) en `runner:"claude-code"`, modèle vide, skills connus.
 */
export function defaultTeamFromDemo(vignetteTeam: string): Team {
  return {
    id: DEFAULT_TEAM_ID,
    name: DEFAULT_TEAM_ID,
    vignetteTeam: vignetteTeam || DEFAULT_VIGNETTE_TEAM,
    coordinator: "aragorn",
    agents: DEMO_TEAM.map((m) => ({
      id: m.agent.toLowerCase(),
      name: m.agent,
      royaume: m.royaume,
      roleIndex: m.roleIndex,
      runner: "claude-code" as const,
      model: "",
      skills: skillsForAgent(m.agent),
    })),
  };
}

/**
 * Construit une **team par défaut éditable** à partir d'une entrée du catalogue
 * iakagraph (L15-B). Chaque agent : `id` = slug, `name` = **nom du personnage**
 * (catalogue, ex. « Beast »/« Professor X » — L15 noms), `royaume` dérivé (slug
 * MAJUSCULE), `roleIndex` = ordre teams.json, `runner:"claude-code"`, modèle vide,
 * **aucune skill** (ces personas ne portent pas de skill-rôle iakaframe).
 *
 * `vignetteTeam` = la team elle-même (auto-casting : la team `lotr` affiche le
 * casting `lotr`, embarqué pour toute charte). **Coordinateur = agent à `roleIndex 1`**
 * (slot « coordination », convention cohérente avec iakaframe où aragorn=1) ; fallback
 * `roleIndex 0` puis premier agent si la team a < 2 agents.
 */
export function teamFromCatalog(cat: CatalogTeam): Team {
  const agents: Agent[] = cat.agents.map((a) => ({
    id: a.slug,
    name: a.name,
    royaume: a.slug.toUpperCase(),
    roleIndex: a.roleIndex,
    runner: "claude-code" as const,
    model: "",
    skills: [],
  }));
  const coord =
    agents.find((a) => a.roleIndex === 1) ??
    agents.find((a) => a.roleIndex === 0) ??
    agents[0];
  return {
    id: cat.id,
    name: cat.name,
    vignetteTeam: cat.id,
    coordinator: coord?.id ?? "",
    agents,
  };
}

/**
 * Réconcilie le **casting canonique** de la team par défaut `iakaframe` : si une team
 * `iakaframe` persistée (config antérieure) a perdu des agents de la graine `DEMO_TEAM`
 * (ex. team à 5 d'avant le modèle 7-rôles → **Loki/graphisme + Nathalie/doc** manquants),
 * on **AJOUTE les agents manquants** (par id), sans jamais modifier/supprimer un agent
 * existant ni changer le coordinateur. **Additif, idempotent, non destructif** : ne
 * touche QUE la team par défaut (pas les 11 teams L15 ni une team éditée). Réordonne par
 * `roleIndex` uniquement si on a ajouté quelque chose. Renvoie le tableau + flag `changed`.
 */
export function reconcileDefaultTeamCasting(existing: Team[]): {
  teams: Team[];
  changed: boolean;
} {
  const idx = existing.findIndex((t) => t.id === DEFAULT_TEAM_ID);
  if (idx < 0) return { teams: existing, changed: false };
  const team = existing[idx];
  const present = new Set(team.agents.map((a) => a.id));
  const missing = DEMO_TEAM.filter((m) => !present.has(m.agent.toLowerCase()));
  if (missing.length === 0) return { teams: existing, changed: false };
  const added: Agent[] = missing.map((m) => ({
    id: m.agent.toLowerCase(),
    name: m.agent,
    royaume: m.royaume,
    roleIndex: m.roleIndex,
    runner: "claude-code" as const,
    model: "",
    skills: skillsForAgent(m.agent),
  }));
  const agents = [...team.agents, ...added].sort(
    (a, b) => a.roleIndex - b.roleIndex,
  );
  const next = [...existing];
  next[idx] = { ...team, agents };
  return { teams: next, changed: true };
}

/**
 * Bootstrap **non destructif & idempotent** des teams par défaut (L15-B, calque la
 * garde « créer si absent »). Garantit la présence de la team `iakaframe` (graine
 * `DEMO_TEAM`) **puis** des 11 teams du catalogue iakagraph, **sans jamais réécrire**
 * une team déjà présente (donc déjà éditée par l'utilisateur). Complète aussi le
 * **casting canonique** de `iakaframe` si une config antérieure l'a laissé incomplet
 * (correctif terrain redesign-A). Renvoie le tableau (existant + ajouts en queue) et
 * un flag `changed` (→ persiste seulement si ajouts).
 */
export function ensureDefaultTeams(
  existing: Team[],
  vignetteTeam: string,
): { teams: Team[]; changed: boolean } {
  const ids = new Set(existing.map((t) => t.id));
  const additions: Team[] = [];
  if (!ids.has(DEFAULT_TEAM_ID)) {
    additions.push(defaultTeamFromDemo(vignetteTeam));
    ids.add(DEFAULT_TEAM_ID);
  }
  for (const cat of TEAM_CATALOG) {
    if (ids.has(cat.id)) continue;
    additions.push(teamFromCatalog(cat));
    ids.add(cat.id);
  }
  // Complète le casting canonique d'une team iakaframe DÉJÀ présente (stale).
  const reconciled = reconcileDefaultTeamCasting([...existing, ...additions]);
  if (additions.length === 0 && !reconciled.changed) {
    return { teams: existing, changed: false };
  }
  return { teams: reconciled.teams, changed: true };
}

/** Index `projectId → teamId` extrait des clés `project_team:*` de la config. */
function indexBindings(cfg: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (k.startsWith(TEAMS_KEYS.projectTeamPrefix) && v.trim().length > 0) {
      out[k.slice(TEAMS_KEYS.projectTeamPrefix.length)] = v;
    }
  }
  return out;
}

export interface UseTeamsDeps {
  api?: Backend;
}

export function useTeams(deps: UseTeamsDeps = {}): UseTeams {
  const api = deps.api ?? backend;

  const [teams, setTeams] = useState<Team[]>([]);
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [defaultTeamId, setDefaultTeamId] = useState<string>(DEFAULT_TEAM_ID);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Réf miroir : écrire le tableau courant sans le mettre en dépendance des callbacks.
  const teamsRef = useRef<Team[]>(teams);
  teamsRef.current = teams;

  /** Sérialise + persiste le tableau `teams` complet, puis met à jour l'état. */
  const persistTeams = useCallback(
    async (next: Team[]): Promise<void> => {
      await api.configSet(TEAMS_KEYS.teams, JSON.stringify(next));
      setTeams(next);
    },
    [api],
  );

  const load = useCallback(async (): Promise<void> => {
    let cfg: Record<string, string> = {};
    try {
      cfg = await api.configAll();
    } catch {
      cfg = {};
    }
    const parsed = parseTeams(cfg[TEAMS_KEYS.teams]);
    // Bootstrap non destructif (§ A1/A6, L15-B) : garantit iakaframe + les 11 teams
    // du catalogue (créer si absent), sans toucher les teams déjà présentes/éditées.
    const { teams: bootstrapped, changed } = ensureDefaultTeams(
      parsed,
      cfg[TEAMS_KEYS.uiTeam] ?? DEFAULT_VIGNETTE_TEAM,
    );
    if (changed) {
      try {
        await api.configSet(TEAMS_KEYS.teams, JSON.stringify(bootstrapped));
      } catch {
        /* hors Tauri / test sans backend : l'état mémoire suffit */
      }
    }
    setTeams(bootstrapped);
    setBindings(indexBindings(cfg));
    const dft = cfg[TEAMS_KEYS.defaultTeam];
    setDefaultTeamId(dft && dft.trim().length > 0 ? dft : DEFAULT_TEAM_ID);
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Résolution (lecture) ---

  const defaultTeam = useCallback((): Team => {
    return (
      teamsRef.current.find((t) => t.id === DEFAULT_TEAM_ID) ??
      teamsRef.current[0] ??
      defaultTeamFromDemo(DEFAULT_VIGNETTE_TEAM)
    );
  }, []);

  const teamForProject = useCallback(
    (projectId: string): Team => {
      const teamId = bindings[projectId];
      const bound = teamId
        ? teamsRef.current.find((t) => t.id === teamId)
        : undefined;
      return bound ?? defaultTeam();
    },
    [bindings, defaultTeam],
  );

  const coordinatorOf = useCallback((team: Team): Agent | null => {
    return (
      team.agents.find((a) => a.id === team.coordinator) ?? team.agents[0] ?? null
    );
  }, []);

  const agentInTeam = useCallback((team: Team, name: string): Agent | null => {
    const n = name.trim().toLowerCase();
    return (
      team.agents.find(
        (a) => a.name.toLowerCase() === n || a.id.toLowerCase() === n,
      ) ?? null
    );
  }, []);

  const hasBinding = useCallback(
    (projectId: string): boolean => projectId in bindings,
    [bindings],
  );

  // --- Définition (écriture) ---

  const upsertTeam = useCallback(
    async (team: Team): Promise<void> => {
      const exists = teamsRef.current.some((t) => t.id === team.id);
      const next = exists
        ? teamsRef.current.map((t) => (t.id === team.id ? team : t))
        : [...teamsRef.current, team];
      await persistTeams(next);
    },
    [persistTeams],
  );

  const removeTeam = useCallback(
    async (teamId: string): Promise<void> => {
      // Garde : on ne retire jamais la dernière team ni la team par défaut.
      if (teamsRef.current.length <= 1) return;
      if (teamId === DEFAULT_TEAM_ID) return;
      const next = teamsRef.current.filter((t) => t.id !== teamId);
      if (next.length === teamsRef.current.length) return;
      await persistTeams(next);
    },
    [persistTeams],
  );

  const upsertAgent = useCallback(
    async (teamId: string, agent: Agent): Promise<void> => {
      const next = teamsRef.current.map((t) => {
        if (t.id !== teamId) return t;
        const exists = t.agents.some((a) => a.id === agent.id);
        const agents = exists
          ? t.agents.map((a) => (a.id === agent.id ? agent : a))
          : [...t.agents, agent];
        // Premier agent ajouté à une team vide → coordinateur par défaut.
        const coordinator = t.coordinator || agents[0]?.id || "";
        return { ...t, agents, coordinator };
      });
      await persistTeams(next);
    },
    [persistTeams],
  );

  const removeAgent = useCallback(
    async (teamId: string, agentId: string): Promise<void> => {
      const next = teamsRef.current.map((t) => {
        if (t.id !== teamId) return t;
        // Garde : on ne retire pas le coordinateur courant (en désigner un autre d'abord).
        if (t.coordinator === agentId) return t;
        const agents = t.agents.filter((a) => a.id !== agentId);
        return { ...t, agents };
      });
      await persistTeams(next);
    },
    [persistTeams],
  );

  const setCoordinator = useCallback(
    async (teamId: string, agentId: string): Promise<void> => {
      const next = teamsRef.current.map((t) => {
        if (t.id !== teamId) return t;
        // Coordinateur invalide refusé (garde de cohérence).
        if (!t.agents.some((a) => a.id === agentId)) return t;
        return { ...t, coordinator: agentId };
      });
      await persistTeams(next);
    },
    [persistTeams],
  );

  // --- Liaison projet ---

  const bindProjectTeam = useCallback(
    async (projectId: string, teamId: string): Promise<void> => {
      await api.configSet(TEAMS_KEYS.projectTeamPrefix + projectId, teamId);
      await api.configSet(TEAMS_KEYS.defaultTeam, teamId);
      setBindings((prev) => ({ ...prev, [projectId]: teamId }));
      setDefaultTeamId(teamId);
    },
    [api],
  );

  return useMemo(
    () => ({
      teams,
      loaded,
      defaultTeamId,
      teamForProject,
      coordinatorOf,
      agentInTeam,
      hasBinding,
      upsertTeam,
      removeTeam,
      upsertAgent,
      removeAgent,
      setCoordinator,
      bindProjectTeam,
      reload: load,
    }),
    [
      teams,
      loaded,
      defaultTeamId,
      teamForProject,
      coordinatorOf,
      agentInTeam,
      hasBinding,
      upsertTeam,
      removeTeam,
      upsertAgent,
      removeAgent,
      setCoordinator,
      bindProjectTeam,
      load,
    ],
  );
}
