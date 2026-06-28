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
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { AGENT_ROLES, isCanonicalRole } from "../theme/roles";

/** Libellé i18n d'un runner (les 4 sont sélectionnables — AR-2). */
function runnerLabel(k: AgentRunnerKind, t: TFunction): string {
  return t(`teams.runnerLabels.${k}`);
}

/** Castings de vignettes embarqués (ids) ; libellés résolus en i18n au rendu. */
const CASTING_IDS: string[] = [TEAM_NONE, ...embeddedTeams()];

/** Libellé i18n d'un casting (fallback = l'id si pas de libellé dédié). */
function castingLabel(id: string, t: TFunction): string {
  return t(`teams.castingLabels.${id}`, { defaultValue: id });
}

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
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // État local de sélection de l'agent affiché dans la FICHE (direction A).
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [newAgentName, setNewAgentName] = useState<string>("");

  const selected: Team | null =
    teams.teams.find((tm) => tm.id === selectedId) ?? teams.teams[0] ?? null;

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
    if (teams.teams.some((tm) => tm.id === id)) return;
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
    <div className="block teamseditor" aria-label={t("teams.editorAria")}>
      <span className="eyebrow">{t("teams.eyebrow")}</span>
      <div className="bt">
        <span className="e">👥</span>
        <h2>{t("teams.title")}</h2>
      </div>
      <p className="lead">
        <Trans
          i18nKey="teams.lead"
          components={[
            <strong />,
            <strong />,
            <strong />,
            <strong />,
            <strong />,
          ]}
        />
      </p>

      {/* Barre du haut : sélecteurs + création / suppression de team */}
      <div className="teamhead">
        <label className="tsel">
          <span className="tsel-lab">{t("teams.teamLabel")}</span>
          <select
            className="field"
            value={selected?.id ?? ""}
            aria-label={t("teams.teamSelectAria")}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setSelectedAgentId(null);
            }}
          >
            {teams.teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
                {tm.id === teams.defaultTeamId
                  ? t("teams.teamDefaultSuffix")
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="tsel">
          <span className="tsel-lab">{t("teams.coordinatorLabel")}</span>
          <select
            className="field"
            value={selected?.coordinator ?? ""}
            aria-label={t("teams.coordinatorAria")}
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
          <span className="tsel-lab">{t("teams.castingLabel")}</span>
          <select
            className="field"
            value={selected?.vignetteTeam ?? TEAM_NONE}
            aria-label={t("teams.castingAria")}
            disabled={!selected}
            onChange={(e) => patchTeam({ vignetteTeam: e.target.value })}
          >
            {CASTING_IDS.map((id) => (
              <option key={id} value={id}>
                {castingLabel(id, t)}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <label className="tsel">
            <span className="tsel-lab">{t("teams.teamNameLabel")}</span>
            <input
              key={`name-${selected.id}`}
              className="field"
              type="text"
              defaultValue={selected.name}
              aria-label={t("teams.teamNameAria")}
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
            placeholder={t("teams.newTeamPlaceholder")}
            value={newTeamName}
            aria-label={t("teams.newTeamAria")}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button type="button" className="btn accent sm" onClick={createTeam}>
            {t("common.create")}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            title={t("teams.removeTeamTitle")}
            disabled={
              !selected ||
              selected.id === teams.defaultTeamId ||
              teams.teams.length <= 1
            }
            onClick={() => selected && void teams.removeTeam(selected.id)}
          >
            {t("teams.removeTeam")}
          </button>
        </div>
      </div>

      {coordinator && !isExecutableRunner(coordinator.runner) && (
        <div className="svcrow" role="status" aria-live="polite">
          {t("teams.coordWarning", {
            name: coordinator.name,
            runner: coordinator.runner,
          })}
        </div>
      )}

      {selected && (
        <div className="split">
          {/* Gauche : liste des agents (avatar + nom + royaume + 👑) */}
          <div className="agentlist" aria-label={t("teams.rosterAria")}>
            {selected.agents.length === 0 && (
              <div className="agentlist-empty">{t("teams.emptyAgents")}</div>
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
                  aria-label={t("teams.selectAgentAria", { name: a.name })}
                  onClick={() => setSelectedAgentId(a.id)}
                >
                  <AgentAvatar
                    url={resolveAvatar?.(a.name) ?? null}
                    name={a.name}
                    size="sm"
                  />
                  <span className="arowmeta">
                    <span className="arowname">{a.name}</span>
                    <span className="arowkingdom">
                      {a.royaume
                        ? isCanonicalRole(a.royaume)
                          ? t(`roles.${a.royaume.toLowerCase()}`)
                          : a.royaume
                        : "—"}
                    </span>
                  </span>
                  {isCoord && (
                    <span
                      className="crown"
                      title={t("teams.coordinatorTag")}
                      aria-hidden
                    >
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
                placeholder={t("teams.newAgentPlaceholder")}
                value={newAgentName}
                aria-label={t("teams.newAgentAria")}
                onChange={(e) => setNewAgentName(e.target.value)}
              />
              <button type="button" className="btn ghost sm" onClick={addAgent}>
                {t("teams.addAgent")}
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
                      {t("teams.fieldRoleHeader")}{" "}
                      <strong>
                        {selectedAgent.royaume
                          ? isCanonicalRole(selectedAgent.royaume)
                            ? t(`roles.${selectedAgent.royaume.toLowerCase()}`)
                            : selectedAgent.royaume
                          : "—"}
                      </strong>
                      {selAgentIsCoord ? t("teams.coordinatorPilots") : ""}
                    </div>
                  </div>
                </div>

                <div className="agentgrid">
                  <label className="agentf">
                    <span>{t("teams.fieldName")}</span>
                    <input
                      key={`an-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      defaultValue={selectedAgent.name}
                      aria-label={t("teams.fieldNameAria", {
                        id: selectedAgent.id,
                      })}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v.length > 0 && v !== selectedAgent.name)
                          patchAgent(selectedAgent, { name: v });
                      }}
                    />
                  </label>
                  <label className="agentf">
                    <span>{t("teams.fieldRole")}</span>
                    <select
                      className="field"
                      value={selectedAgent.royaume}
                      aria-label={t("teams.fieldRoleAria", {
                        id: selectedAgent.id,
                      })}
                      onChange={(e) =>
                        patchAgent(selectedAgent, { royaume: e.target.value })
                      }
                    >
                      {/* Tolérant : une valeur hors des 7 rôles (teams L15 à
                          royaumes dérivés) reste sélectionnée, jamais perdue. */}
                      {selectedAgent.royaume !== "" &&
                        !isCanonicalRole(selectedAgent.royaume) && (
                          <option value={selectedAgent.royaume}>
                            {t("teams.fieldRoleOutOfList", {
                              value: selectedAgent.royaume,
                            })}
                          </option>
                        )}
                      {AGENT_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {t(`roles.${r.key}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agentf">
                    <span>{t("teams.fieldRoleIndex")}</span>
                    <input
                      key={`ri-${selectedAgent.id}`}
                      className="field"
                      type="number"
                      min={0}
                      defaultValue={selectedAgent.roleIndex}
                      aria-label={t("teams.fieldRoleIndexAria", {
                        id: selectedAgent.id,
                      })}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== selectedAgent.roleIndex)
                          patchAgent(selectedAgent, { roleIndex: v });
                      }}
                    />
                  </label>
                  <label className="agentf">
                    <span>{t("teams.fieldRunner")}</span>
                    <select
                      className="field"
                      value={selectedAgent.runner}
                      aria-label={t("teams.fieldRunnerAria", {
                        id: selectedAgent.id,
                      })}
                      onChange={(e) =>
                        patchAgent(selectedAgent, {
                          runner: e.target.value as AgentRunnerKind,
                        })
                      }
                    >
                      {AGENT_RUNNER_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {runnerLabel(k, t)}
                          {isExecutableRunner(k)
                            ? ""
                            : t("teams.runnerDefinable")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="agentf">
                    <span>{t("teams.fieldModel")}</span>
                    <input
                      key={`am-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      placeholder={t("teams.fieldModelPlaceholder")}
                      defaultValue={selectedAgent.model}
                      aria-label={t("teams.fieldModelAria", {
                        id: selectedAgent.id,
                      })}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== selectedAgent.model)
                          patchAgent(selectedAgent, { model: v });
                      }}
                    />
                  </label>
                  <label className="agentf wide">
                    <span>{t("teams.fieldSkills")}</span>
                    <input
                      key={`as-${selectedAgent.id}`}
                      className="field"
                      type="text"
                      placeholder={t("teams.fieldSkillsPlaceholder")}
                      defaultValue={selectedAgent.skills.join(", ")}
                      aria-label={t("teams.fieldSkillsAria", {
                        id: selectedAgent.id,
                      })}
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
                        ? t("teams.removeCoordHint")
                        : t("teams.removeFromCastingTitle")
                    }
                    disabled={selAgentIsCoord}
                    onClick={() => {
                      void teams.removeAgent(selected.id, selectedAgent.id);
                      setSelectedAgentId(null);
                    }}
                  >
                    {t("teams.removeFromCasting")}
                  </button>
                </div>
              </>
            ) : (
              <div className="editor-empty">{t("teams.selectAgentPrompt")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
