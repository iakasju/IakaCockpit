/**
 * TeamsEditor — écran « Teams & agents » (L11, § 5.3). Présentationnel.
 *
 * Direction A (redesign) : enveloppe **LISTE + FICHE** (calque `specs/design/redesign/
 * A/teams.html`, `.split { 300px 1fr }`) au lieu de la colonne unique « questionnaire ».
 *   - Barre du haut : eyebrow + titre, puis sélecteurs Team / Coordinateur / Casting
 *     visuel + Nom de team + Créer / Supprimer la team.
 *   - Gauche (300px) : LISTE des agents (avatar + nom + royaume + 👑 coordinateur),
 *     cliquable → sélectionne l'agent (état local `selectedAgentId`).
 *   - Droite : FICHE éditeur UNIQUE de l'agent sélectionné (grille 2 colonnes).
 *
 * Cœur INCHANGÉ : créer / éditer / supprimer une team, runner + modèle + skills PAR
 * AGENT, coordinateur, casting visuel. Toute écriture passe par `useTeams` — AUCUN I/O
 * direct ici (pas de god-component, D8). Seul ajout de logique : l'état de SÉLECTION
 * local de l'agent affiché. Champs texte persistés **onBlur** ; structure à l'action.
 */
import { useMemo, useState } from "react";
import {
  AGENT_RUNNER_KINDS,
  isExecutableRunner,
  type Agent,
  type AgentRunnerKind,
  type Team,
  type UseTeams,
} from "../hooks/useTeams";
import { embeddedTeams, TEAM_NONE } from "../theme/vignettes";
import { makeAvatarResolver } from "../theme/teamAvatar";
import { AGENT_ROLES, isCanonicalRole, roleLabel } from "../theme/roles";

/** Libellés lisibles des runners (les 4 sont sélectionnables — AR-2). */
const RUNNER_LABELS: Record<AgentRunnerKind, string> = {
  "claude-code": "Claude Code (TUI native)",
  ollama: "Ollama",
  litellm: "LiteLLM",
  codex: "Codex",
};

/** Libellés des castings de vignettes (calque SettingsView L9). */
const TEAM_LABELS: Record<string, string> = {
  none: "Aucune (pastilles)",
  lotr: "LOTR",
  avengers: "Avengers",
  starfleet: "Starfleet",
};

const CASTING_OPTIONS: { id: string; label: string }[] = [
  { id: TEAM_NONE, label: TEAM_LABELS[TEAM_NONE] },
  ...embeddedTeams().map((t) => ({ id: t, label: TEAM_LABELS[t] ?? t })),
];

/** Slugifie un libellé en id stable (création de team/agent). */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `id-${Date.now()}`
  );
}

/** Parse un CSV de skills → liste nettoyée. */
function parseSkillsCsv(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface TeamsEditorProps {
  teams: UseTeams;
  /**
   * Charte active (L14) — sert à résoudre les vignettes de la LISTE/FICHE selon le
   * casting de la team éditée. Optionnel : absent → pastille initiale (jamais d'image
   * cassée). Présentationnel : le résolveur est PUR (`makeAvatarResolver`), pas d'I/O.
   */
  theme?: string;
}

/** Vignette ronde d'un agent (liste/fiche) + fallback initiale si absente / KO. */
function AgentAvatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: "sm" | "lg";
}): JSX.Element {
  const [broken, setBroken] = useState(false);
  const initial = name.slice(0, 1).toUpperCase();
  if (!url || broken) {
    return (
      <span className={`agentav ph ${size}`} aria-hidden>
        {initial}
      </span>
    );
  }
  return (
    <img
      className={`agentav ${size}`}
      src={url}
      alt={name}
      onError={() => setBroken(true)}
    />
  );
}

export function TeamsEditor({ teams, theme }: TeamsEditorProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // État local de sélection de l'agent affiché dans la FICHE (direction A).
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [newAgentName, setNewAgentName] = useState<string>("");

  const selected: Team | null =
    teams.teams.find((t) => t.id === selectedId) ?? teams.teams[0] ?? null;

  // Agent affiché : sélection locale si valide, sinon repli sur le coordinateur puis
  // le 1er agent (→ la FICHE du coordinateur est montrée par défaut au montage).
  const selectedAgent: Agent | null = selected
    ? (selected.agents.find((a) => a.id === selectedAgentId) ??
      selected.agents.find((a) => a.id === selected.coordinator) ??
      selected.agents[0] ??
      null)
    : null;

  // Résolveur d'avatar lié au casting de la team éditée (charte = thème app). Pur.
  const resolveAvatar = useMemo(
    () =>
      selected
        ? makeAvatarResolver(
            theme ?? "",
            selected.vignetteTeam,
            selected.agents.map((a) => ({
              name: a.name,
              roleIndex: a.roleIndex,
            })),
          )
        : null,
    [theme, selected],
  );

  const createTeam = (): void => {
    const name = newTeamName.trim();
    if (name.length === 0) return;
    const id = slugify(name);
    if (teams.teams.some((t) => t.id === id)) return;
    void teams.upsertTeam({
      id,
      name,
      vignetteTeam: "none",
      coordinator: "",
      agents: [],
    });
    setSelectedId(id);
    setSelectedAgentId(null);
    setNewTeamName("");
  };

  const patchTeam = (over: Partial<Team>): void => {
    if (!selected) return;
    void teams.upsertTeam({ ...selected, ...over });
  };

  const patchAgent = (agent: Agent, over: Partial<Agent>): void => {
    if (!selected) return;
    void teams.upsertAgent(selected.id, { ...agent, ...over });
  };

  const addAgent = (): void => {
    if (!selected) return;
    const name = newAgentName.trim();
    if (name.length === 0) return;
    let id = slugify(name);
    if (selected.agents.some((a) => a.id === id)) id = `${id}-${Date.now()}`;
    void teams.upsertAgent(selected.id, {
      id,
      name,
      royaume: "",
      roleIndex: selected.agents.length,
      runner: "claude-code",
      model: "",
      skills: [],
    });
    // Sélectionne la nouvelle fiche (UX : on édite l'agent qu'on vient d'ajouter).
    setSelectedAgentId(id);
    setNewAgentName("");
  };

  const coordinator = selected
    ? (selected.agents.find((a) => a.id === selected.coordinator) ??
      selected.agents[0] ??
      null)
    : null;

  const selAgentIsCoord =
    !!selectedAgent && !!selected && selectedAgent.id === selected.coordinator;

  return (
    <div className="block teamseditor" aria-label="Teams & agents">
      <span className="eyebrow">Casting</span>
      <div className="bt">
        <span className="e">👥</span>
        <h2>Teams &amp; agents</h2>
      </div>
      <p className="lead">
        Choisis l'agent à gauche, règle son <strong>runner</strong>, son{" "}
        <strong>modèle</strong> et ses <strong>skills</strong> à droite, puis désigne le{" "}
        <strong>coordinateur</strong> (chef de projet). Les changements s'appliquent au{" "}
        <strong>prochain lancement</strong> de la conversation (pas de re-spawn à chaud).
      </p>

      {/* Barre du haut : sélecteurs + création / suppression de team */}
      <div className="teamhead">
        <label className="tsel">
          <span className="tsel-lab">Team</span>
          <select
            className="field"
            value={selected?.id ?? ""}
            aria-label="Team à éditer"
            onChange={(e) => {
              setSelectedId(e.target.value);
              setSelectedAgentId(null);
            }}
          >
            {teams.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === teams.defaultTeamId ? " · par défaut" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="tsel">
          <span className="tsel-lab">Coordinateur</span>
          <select
            className="field"
            value={selected?.coordinator ?? ""}
            aria-label="Coordinateur de la team"
            disabled={!selected || selected.agents.length === 0}
            onChange={(e) =>
              selected && void teams.setCoordinator(selected.id, e.target.value)
            }
          >
            {selected?.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="tsel">
          <span className="tsel-lab">Casting visuel</span>
          <select
            className="field"
            value={selected?.vignetteTeam ?? TEAM_NONE}
            aria-label="Casting visuel de la team"
            disabled={!selected}
            onChange={(e) => patchTeam({ vignetteTeam: e.target.value })}
          >
            {CASTING_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <label className="tsel">
            <span className="tsel-lab">Nom de la team</span>
            <input
              key={`name-${selected.id}`}
              className="field"
              type="text"
              defaultValue={selected.name}
              aria-label="Nom de la team"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v.length > 0 && v !== selected.name) patchTeam({ name: v });
              }}
            />
          </label>
        )}

        <div className="teamhead-actions">
          <input
            className="field"
            type="text"
            placeholder="nouvelle team"
            value={newTeamName}
            aria-label="Nom de la nouvelle team"
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button type="button" className="btn accent sm" onClick={createTeam}>
            Créer
          </button>
          <button
            type="button"
            className="btn ghost sm"
            title="Supprimer cette team"
            disabled={
              !selected ||
              selected.id === teams.defaultTeamId ||
              teams.teams.length <= 1
            }
            onClick={() => selected && void teams.removeTeam(selected.id)}
          >
            Supprimer la team
          </button>
        </div>
      </div>

      {coordinator && !isExecutableRunner(coordinator.runner) && (
        <div className="svcrow" role="status" aria-live="polite">
          ⚠️ Le coordinateur <strong>{coordinator.name}</strong> est sur le runner{" "}
          <code>{coordinator.runner}</code> : il ne pilotera pas encore le
          terminal-source (étape actuelle : claude-code). La définition est
          conservée.
        </div>
      )}

      {selected && (
        <div className="split">
          {/* Gauche : liste des agents (avatar + nom + royaume + 👑) */}
          <div className="agentlist" aria-label="Roster d'agents">
            {selected.agents.length === 0 && (
              <div className="agentlist-empty">
                Aucun agent. Ajoute un agent ci-dessous.
              </div>
            )}
            {selected.agents.map((a) => {
              const isCoord = a.id === selected.coordinator;
              const isSel = a.id === selectedAgent?.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`arow${isSel ? " on" : ""}`}
                  data-agent={a.id}
                  aria-pressed={isSel}
                  aria-label={`Sélectionner ${a.name}`}
                  onClick={() => setSelectedAgentId(a.id)}
                >
                  <AgentAvatar
                    url={resolveAvatar?.(a.name) ?? null}
                    name={a.name}
                    size="sm"
                  />
                  <span className="arowmeta">
                    <span className="arowname">{a.name}</span>
                    <span className="arowkingdom">{a.royaume || "—"}</span>
                  </span>
                  {isCoord && (
                    <span className="crown" title="Coordinateur" aria-hidden>
                      👑
                    </span>
                  )}
                </button>
              );
            })}

            <div className="agentadd">
              <input
                className="field"
                type="text"
                placeholder="nom de l'agent"
                value={newAgentName}
                aria-label="Nom du nouvel agent"
                onChange={(e) => setNewAgentName(e.target.value)}
              />
              <button type="button" className="btn ghost sm" onClick={addAgent}>
                + Ajouter un agent
              </button>
            </div>
          </div>

          {/* Droite : fiche éditeur unique de l'agent sélectionné */}
          <div className="editor">
            {selectedAgent ? (
              <>
                <div className="ehead">
                  <AgentAvatar
                    url={resolveAvatar?.(selectedAgent.name) ?? null}
                    name={selectedAgent.name}
                    size="lg"
                  />
                  <div>
                    <h3>{selectedAgent.name}</h3>
                    <div className="ehead-r">
                      Rôle{" "}
                      <strong>
                        {selectedAgent.royaume
                          ? roleLabel(selectedAgent.royaume)
                          : "—"}
                      </strong>
                      {selAgentIsCoord
                        ? " · coordinateur — pilote le terminal-source"
                        : ""}
                    </div>
                  </div>
                </div>

                <div className="agentgrid">
                  <label className="agentf">
                    <span>Nom</span>
                    <input
                      key={`an-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      defaultValue={selectedAgent.name}
                      aria-label={`Nom de ${selectedAgent.id}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v.length > 0 && v !== selectedAgent.name)
                          patchAgent(selectedAgent, { name: v });
                      }}
                    />
                  </label>
                  <label className="agentf">
                    <span>Rôle</span>
                    <select
                      className="field"
                      value={selectedAgent.royaume}
                      aria-label={`Rôle de ${selectedAgent.id}`}
                      onChange={(e) =>
                        patchAgent(selectedAgent, { royaume: e.target.value })
                      }
                    >
                      {/* Tolérant : une valeur hors des 7 rôles (teams L15 à
                          royaumes dérivés) reste sélectionnée, jamais perdue. */}
                      {selectedAgent.royaume !== "" &&
                        !isCanonicalRole(selectedAgent.royaume) && (
                          <option value={selectedAgent.royaume}>
                            {selectedAgent.royaume} (hors liste)
                          </option>
                        )}
                      {AGENT_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agentf">
                    <span>roleIndex</span>
                    <input
                      key={`ri-${selectedAgent.id}`}
                      className="field"
                      type="number"
                      min={0}
                      defaultValue={selectedAgent.roleIndex}
                      aria-label={`roleIndex de ${selectedAgent.id}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== selectedAgent.roleIndex)
                          patchAgent(selectedAgent, { roleIndex: v });
                      }}
                    />
                  </label>
                  <label className="agentf">
                    <span>Runner</span>
                    <select
                      className="field"
                      value={selectedAgent.runner}
                      aria-label={`Runner de ${selectedAgent.id}`}
                      onChange={(e) =>
                        patchAgent(selectedAgent, {
                          runner: e.target.value as AgentRunnerKind,
                        })
                      }
                    >
                      {AGENT_RUNNER_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {RUNNER_LABELS[k]}
                          {isExecutableRunner(k) ? "" : " — définissable"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agentf">
                    <span>Modèle</span>
                    <input
                      key={`am-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      placeholder="(défaut du runner)"
                      defaultValue={selectedAgent.model}
                      aria-label={`Modèle de ${selectedAgent.id}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== selectedAgent.model)
                          patchAgent(selectedAgent, { model: v });
                      }}
                    />
                  </label>
                  <label className="agentf wide">
                    <span>Skills (CSV)</span>
                    <input
                      key={`as-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      placeholder="iakaframe-cadrage, …"
                      defaultValue={selectedAgent.skills.join(", ")}
                      aria-label={`Skills de ${selectedAgent.id}`}
                      onBlur={(e) => {
                        const next = parseSkillsCsv(e.target.value);
                        if (next.join(",") !== selectedAgent.skills.join(","))
                          patchAgent(selectedAgent, { skills: next });
                      }}
                    />
                  </label>
                </div>

                <div className="efoot">
                  <button
                    type="button"
                    className="btn ghost sm"
                    title={
                      selAgentIsCoord
                        ? "Désigne d'abord un autre coordinateur"
                        : "Retirer cet agent du casting"
                    }
                    disabled={selAgentIsCoord}
                    onClick={() => {
                      void teams.removeAgent(selected.id, selectedAgent.id);
                      setSelectedAgentId(null);
                    }}
                  >
                    Retirer du casting
                  </button>
                </div>
              </>
            ) : (
              <div className="editor-empty">
                Sélectionne un agent dans la liste, ou ajoute-en un.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
