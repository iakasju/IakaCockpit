/**
 * receive.ts — RÉCEPTION d'un paquet de handoff (H1) : parse + mapping + provenance + conflit.
 *
 * PUR (zéro I/O, zéro horloge lue ici — l'horloge `importedAt` est FOURNIE, résolue via le
 * backend `nowMillis`, jamais `Date.now()`). La forge livre une **Team PURE** au schéma
 * `@iakaframe/core` que le cockpit ne peut pas importer d'un autre dépôt (Q-C) : on **parse
 * défensivement** la forme connue (record invalide → `null`, jamais d'exception), puis on
 * **mappe** vers le modèle roster du cockpit (`useTeams` : `Team`/`Agent`).
 *
 * Invariants :
 *  - runner/modèle NON fournis par la forge (team PURE, AR-1) → **défaut cockpit** au mapping
 *    (`runner:"claude-code"`, `model:""`) — jamais inventés côté forge.
 *  - la réception est **non destructive** : le `team.json` d'origine est conservé VERBATIM dans
 *    la provenance (`originTeamJson`) → les champs additifs forge (`roleKey`, `guardrails`,
 *    `methodId`, `connectors`, `workflowId`) restent conservés/relisibles même si le roster
 *    cockpit ne les porte pas.
 *  - anti-dérive : au ré-import, si des éditions locales existent ET que l'empreinte a changé,
 *    on signale un **conflit** (jamais d'écrasement silencieux).
 */

import type { Agent, Team } from "../hooks/useTeams";

/** Forme d'une persona telle que la forge la sérialise (`@iakaframe/core`, PURE). */
export interface ForgePersona {
  id: string;
  name: string;
  roleKey: string;
  royaume: string;
  roleIndex: number;
  skills: string[];
  guardrails: string[];
}

/** Forme d'une team telle que la forge la sérialise (`@iakaframe/core`, PURE — AR-1). */
export interface ForgeTeam {
  id: string;
  name: string;
  methodId: string;
  vignetteTeam: string;
  coordinator: string;
  personas: ForgePersona[];
  connectors: string[];
  workflowId?: string;
}

/** Manifeste de provenance écrit par la forge (`handoff.json`). */
export interface HandoffManifest {
  source: string;
  teamId: string;
  teamName: string;
  version: string;
  timestamp: string;
  originHash: string;
}

/**
 * Provenance STOCKÉE côté cockpit après réception (config non sensible, clé `handoff:<teamId>`).
 * Étend le manifeste forge avec l'état local (import + dérive).
 */
export interface HandoffProvenance {
  /** Émetteur (forge). */
  source: string;
  teamId: string;
  teamName: string;
  /** Version de la livraison réceptionnée (= `manifest.version`). */
  sourceVersion: string;
  /** Empreinte du `team.json` d'origine (support anti-dérive). */
  originHash: string;
  /** Horodatage forge de la livraison (`manifest.timestamp`). */
  deliveredAt: string;
  /** Horodatage ISO de la réception côté cockpit (fourni, via `nowMillis`). */
  importedAt: string;
  /** La team importée a-t-elle été éditée localement depuis (diverge de la forge) ? */
  localEdits: boolean;
  /** `team.json` d'origine conservé VERBATIM (passthrough des champs additifs forge). */
  originTeamJson: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/** Parse défensif d'UNE persona forge (record invalide → `null`). */
export function parseForgePersona(raw: unknown): ForgePersona | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" && r.name.trim().length > 0 ? r.name : null;
  if (!name) return null;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id : name.toLowerCase();
  const roleIndex =
    typeof r.roleIndex === "number" && Number.isFinite(r.roleIndex) ? r.roleIndex : 0;
  return {
    id,
    name,
    roleKey: str(r.roleKey),
    royaume: str(r.royaume),
    roleIndex,
    skills: strArray(r.skills),
    guardrails: strArray(r.guardrails),
  };
}

/** Parse défensif d'UNE team forge (record/personas invalides ignorés ; `null` si inutilisable). */
export function parseForgeTeam(json: string | null | undefined): ForgeTeam | null {
  if (!json || json.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id : null;
  if (!id) return null;
  const name = typeof r.name === "string" && r.name.trim().length > 0 ? r.name : id;
  const personas = Array.isArray(r.personas)
    ? r.personas.map(parseForgePersona).filter((p): p is ForgePersona => p !== null)
    : [];
  const coordRaw = str(r.coordinator);
  const coordinator =
    personas.some((p) => p.id === coordRaw) && coordRaw.length > 0
      ? coordRaw
      : (personas[0]?.id ?? "");
  const team: ForgeTeam = {
    id,
    name,
    methodId: typeof r.methodId === "string" ? r.methodId : "iakaframe",
    vignetteTeam: typeof r.vignetteTeam === "string" ? r.vignetteTeam : "none",
    coordinator,
    personas,
    connectors: strArray(r.connectors),
  };
  if (typeof r.workflowId === "string" && r.workflowId.length > 0) {
    team.workflowId = r.workflowId;
  }
  return team;
}

/** Parse défensif du manifeste de provenance forge (`handoff.json`). */
export function parseManifest(json: string | null | undefined): HandoffManifest | null {
  if (!json || json.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  const originHash = str(r.originHash);
  if (originHash.length === 0) return null; // sans empreinte, pas de provenance exploitable
  return {
    source: str(r.source) || "forge",
    teamId: str(r.teamId),
    teamName: str(r.teamName),
    version: str(r.version),
    timestamp: str(r.timestamp),
    originHash,
  };
}

/**
 * Mappe une team forge PURE vers le modèle roster du cockpit (`useTeams.Team`). runner/modèle
 * NON fournis par la forge → **défaut cockpit** (`claude-code` / ""). vignette forge `"none"`
 * conservée telle quelle (le roster cockpit sait l'afficher en pastilles).
 */
export function forgeTeamToCockpit(forge: ForgeTeam): Team {
  const agents: Agent[] = forge.personas.map((p) => ({
    id: p.id,
    name: p.name,
    royaume: p.royaume,
    roleIndex: p.roleIndex,
    runner: "claude-code",
    model: "",
    skills: p.skills,
  }));
  return {
    id: forge.id,
    name: forge.name,
    vignetteTeam: forge.vignetteTeam,
    coordinator: forge.coordinator,
    agents,
  };
}

/**
 * Construit la provenance à stocker après une réception acceptée. `importedAt` est FOURNI
 * (ISO dérivé de `nowMillis`). `originTeamJson` = le `team.json` d'origine VERBATIM. Une
 * réception (ou un ré-import « prendre la forge ») **repart de `localEdits:false`**.
 */
export function buildProvenance(
  manifest: HandoffManifest,
  importedAt: string,
  originTeamJson: string,
): HandoffProvenance {
  return {
    source: manifest.source,
    teamId: manifest.teamId,
    teamName: manifest.teamName,
    sourceVersion: manifest.version,
    originHash: manifest.originHash,
    deliveredAt: manifest.timestamp,
    importedAt,
    localEdits: false,
    originTeamJson,
  };
}

/**
 * Détecte un **conflit de dérive** au ré-import : il y a conflit si une provenance existe avec
 * des éditions locales ET que l'empreinte entrante diffère de celle stockée (nouvelle livraison
 * forge écraserait des modifications locales). Même empreinte = ré-import idempotent (pas de
 * conflit). Pas de provenance / pas d'édition locale = pas de conflit.
 */
export function detectConflict(
  existing: HandoffProvenance | null,
  incomingHash: string,
): boolean {
  if (!existing) return false;
  if (!existing.localEdits) return false;
  return existing.originHash !== incomingHash;
}

/** Sérialise/parse la provenance (config non sensible). */
export function serializeProvenance(p: HandoffProvenance): string {
  return JSON.stringify(p);
}

export function parseProvenance(json: string | null | undefined): HandoffProvenance | null {
  if (!json || json.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  const teamId = str(r.teamId);
  const originHash = str(r.originHash);
  if (teamId.length === 0 || originHash.length === 0) return null;
  return {
    source: str(r.source) || "forge",
    teamId,
    teamName: str(r.teamName),
    sourceVersion: str(r.sourceVersion),
    originHash,
    deliveredAt: str(r.deliveredAt),
    importedAt: str(r.importedAt),
    localEdits: r.localEdits === true,
    originTeamJson: str(r.originTeamJson),
  };
}

/** Préfixe des clés de provenance en config (une par team réceptionnée). */
export const HANDOFF_PROVENANCE_PREFIX = "handoff:";
