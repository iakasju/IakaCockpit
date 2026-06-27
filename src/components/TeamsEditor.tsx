/**
 * TeamsEditor — écran Settings « Teams & agents » (L11, § 5.3). Présentationnel.
 *
 * Cœur du lot : créer / éditer / supprimer une team, éditer son roster, **régler
 * runner + modèle + skills PAR AGENT**, **désigner le coordinateur**, choisir le
 * casting visuel. Toute écriture passe par `useTeams` (injecté en prop, comme
 * `settings`) — AUCUN I/O direct ici (pas de god-component, D8).
 *
 * Les 4 runners sont **tous sélectionnables** (on DÉFINIT tout, AR-2) ; le flag
 * `executable` ne grise PAS le choix — il **informe** : un coordinateur sur un runner
 * non exécutable affiche un avertissement (l'exécution réelle = claude-code, P3).
 * Champs texte persistés **onBlur** (calque des `setChef*` L10b) ; structure (ajout/
 * retrait d'agent, coordinateur, création/suppression de team) persistée à l'action.
 */
import { useState } from "react";
import {
  AGENT_RUNNER_KINDS,
  isExecutableRunner,
  type Agent,
  type AgentRunnerKind,
  type Team,
  type UseTeams,
} from "../hooks/useTeams";
import { embeddedTeams, TEAM_NONE } from "../theme/vignettes";

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
}

export function TeamsEditor({ teams }: TeamsEditorProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [newAgentName, setNewAgentName] = useState<string>("");

  const selected: Team | null =
    teams.teams.find((t) => t.id === selectedId) ?? teams.teams[0] ?? null;

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
    setNewAgentName("");
  };

  const coordinator = selected
    ? (selected.agents.find((a) => a.id === selected.coordinator) ??
      selected.agents[0] ??
      null)
    : null;

  return (
    <div className="block teamseditor" aria-label="Teams & agents">
      <div className="bt">
        <span className="e">👥</span>
        <h2>Teams &amp; agents</h2>
      </div>
      <p className="lead">
        Définis tes teams et, par agent, son <strong>runner</strong>, son{" "}
        <strong>modèle</strong> et ses <strong>skills</strong>, puis désigne le{" "}
        <strong>coordinateur</strong> (chef de projet). Les changements s'appliquent au{" "}
        <strong>prochain lancement</strong> de la conversation (pas de re-spawn à chaud).
      </p>

      {/* Liste des teams + création */}
      <div className="fieldrow">
        <div className="lab">
          <div className="t">Teams</div>
          <div className="d">{teams.teams.length} team(s) définie(s).</div>
        </div>
        <div className="ctl">
          <select
            className="field"
            value={selected?.id ?? ""}
            aria-label="Team à éditer"
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {teams.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === teams.defaultTeamId ? " · par défaut" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="fieldrow">
        <div className="lab">
          <div className="t">Créer une team</div>
          <div className="d">Nom de la nouvelle team (casting réglable ensuite).</div>
        </div>
        <div className="ctl">
          <input
            className="field"
            type="text"
            placeholder="nom de team"
            value={newTeamName}
            aria-label="Nom de la nouvelle team"
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button type="button" className="btn accent sm" onClick={createTeam}>
            Créer
          </button>
        </div>
      </div>

      {selected && (
        <>
          {/* Édition team : nom, casting, coordinateur, suppression */}
          <div className="fieldrow">
            <div className="lab">
              <div className="t">Nom de la team</div>
            </div>
            <div className="ctl">
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
            </div>
          </div>

          <div className="fieldrow">
            <div className="lab">
              <div className="t">Casting visuel</div>
              <div className="d">Univers des vignettes (suit la charte active).</div>
            </div>
            <div className="ctl">
              <select
                className="field"
                value={selected.vignetteTeam}
                aria-label="Casting visuel de la team"
                onChange={(e) => patchTeam({ vignetteTeam: e.target.value })}
              >
                {CASTING_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fieldrow">
            <div className="lab">
              <div className="t">Coordinateur</div>
              <div className="d">
                Chef de projet : interlocuteur par défaut de la conversation, pilote le
                terminal-source.
              </div>
            </div>
            <div className="ctl">
              <select
                className="field"
                value={selected.coordinator}
                aria-label="Coordinateur de la team"
                disabled={selected.agents.length === 0}
                onChange={(e) => void teams.setCoordinator(selected.id, e.target.value)}
              >
                {selected.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn sm"
                title="Supprimer cette team"
                disabled={
                  selected.id === teams.defaultTeamId || teams.teams.length <= 1
                }
                onClick={() => void teams.removeTeam(selected.id)}
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

          {/* Roster d'agents */}
          <div className="teamroster" aria-label="Roster d'agents">
            {selected.agents.length === 0 && (
              <div className="d" style={{ color: "var(--text-3)" }}>
                Aucun agent. Ajoute un agent ci-dessous.
              </div>
            )}
            {selected.agents.map((a) => {
              const isCoord = a.id === selected.coordinator;
              return (
                <div key={a.id} className="agentcard" data-agent={a.id}>
                  <div className="agenthead">
                    <strong>{a.name}</strong>
                    {isCoord && <span className="badge">coordinateur</span>}
                  </div>
                  <div className="agentgrid">
                    <label className="agentf">
                      <span>Nom</span>
                      <input
                        className="field"
                        type="text"
                        defaultValue={a.name}
                        aria-label={`Nom de ${a.id}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v.length > 0 && v !== a.name) patchAgent(a, { name: v });
                        }}
                      />
                    </label>
                    <label className="agentf">
                      <span>Royaume</span>
                      <input
                        className="field"
                        type="text"
                        defaultValue={a.royaume}
                        aria-label={`Royaume de ${a.id}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim().toUpperCase();
                          if (v !== a.royaume) patchAgent(a, { royaume: v });
                        }}
                      />
                    </label>
                    <label className="agentf">
                      <span>roleIndex</span>
                      <input
                        className="field"
                        type="number"
                        min={0}
                        defaultValue={a.roleIndex}
                        aria-label={`roleIndex de ${a.id}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== a.roleIndex)
                            patchAgent(a, { roleIndex: v });
                        }}
                      />
                    </label>
                    <label className="agentf">
                      <span>Runner</span>
                      <select
                        className="field"
                        value={a.runner}
                        aria-label={`Runner de ${a.id}`}
                        onChange={(e) =>
                          patchAgent(a, {
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
                        className="field"
                        type="text"
                        placeholder="(défaut du runner)"
                        defaultValue={a.model}
                        aria-label={`Modèle de ${a.id}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== a.model) patchAgent(a, { model: v });
                        }}
                      />
                    </label>
                    <label className="agentf wide">
                      <span>Skills (CSV)</span>
                      <input
                        className="field"
                        type="text"
                        placeholder="iakaframe-cadrage, …"
                        defaultValue={a.skills.join(", ")}
                        aria-label={`Skills de ${a.id}`}
                        onBlur={(e) => {
                          const next = parseSkillsCsv(e.target.value);
                          if (next.join(",") !== a.skills.join(","))
                            patchAgent(a, { skills: next });
                        }}
                      />
                    </label>
                  </div>
                  <div className="agentactions">
                    <button
                      type="button"
                      className="btn sm"
                      title={
                        isCoord
                          ? "Désigne d'abord un autre coordinateur"
                          : "Retirer cet agent"
                      }
                      disabled={isCoord}
                      onClick={() => void teams.removeAgent(selected.id, a.id)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fieldrow">
            <div className="lab">
              <div className="t">Ajouter un agent</div>
            </div>
            <div className="ctl">
              <input
                className="field"
                type="text"
                placeholder="nom de l'agent"
                value={newAgentName}
                aria-label="Nom du nouvel agent"
                onChange={(e) => setNewAgentName(e.target.value)}
              />
              <button type="button" className="btn accent sm" onClick={addAgent}>
                Ajouter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
