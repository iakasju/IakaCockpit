/**
 * WorkingView — vue Working reworkée (L8, D5). « 1 projet = 1 conversation ».
 *
 * Assemble (présentationnel, PAS de god-component — D8) :
 *   - gauche  : worklist (set de Work) — inchangée ;
 *   - centre  : espace conversation = barre de tête (titre + toggle Chat/Shell +
 *               bouton « prochaine étape ») + corps ;
 *               • Shell = PtyTerminal plein cadre, MONTÉ UNE FOIS et MASQUÉ en CSS
 *                 quand mode=chat (le shell SURVIT au toggle — R-L8-1/D4) ;
 *               • Chat  = bulles + saisie (composant Chat) ;
 *   - droite  : widget Roster (5 agents + statut + clic → @agent, D6).
 *
 * Plus de `tabsbar` (5 onglets PTY retirés, D5). L'état vit dans useConversations /
 * useNextStep ; les appels I/O passent par la façade. Aucun `invoke` ici.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChefRunnerKind, NextStep, Project } from "../api/backend";
import type {
  Conversation,
  ConvMode,
} from "../hooks/useConversations";
import { mentionPrefix, parseMention } from "../hooks/useConversations";
import { deriveWorkingAgents } from "../hooks/runnerView";
import type { UsePty } from "../hooks/usePty";
import { PtyTerminal } from "../components/PtyTerminal";
import { NextStepPanel } from "../components/NextStepPanel";
import { Chat } from "../components/Chat";
import { Roster } from "../components/Roster";
import { TasksPanel } from "../components/TasksPanel";
import { PlanPanel } from "../components/PlanPanel";
import type { PlanItem } from "../hooks/derivePlan";
import { EconomyPanel } from "../components/EconomyPanel";
import type { EcoPoint } from "../hooks/useEconomy";
import type { AgentTask } from "../hooks/useAgentTasks";
import type { AvatarResolver } from "../theme/teamAvatar";
import { isExecutableRunner, type AgentRunnerKind } from "../hooks/useTeams";
import { DEMO_TEAM, type DemoTeamMember } from "../mock/demoTeam";

/**
 * Mappe le runner CONCEPTUEL du coordinateur (4 valeurs) vers le `kind` PTY du
 * terminal-source (frontière d'abstraction — calque `resolve_runner_spec` côté Rust).
 * **`claude-code` ET `codex` sont exécutables** (TUI natives + tailer on-disk) : eux seuls
 * atteignent ce mapping (les runners non câblés `ollama`/`litellm` affichent une bannière,
 * jamais ce spawn). On NE code donc pas le kind en dur dans le JSX : il DÉRIVE du
 * coordinateur résolu.
 */
function ptyRunnerKindFor(kind: AgentRunnerKind): ChefRunnerKind {
  if (kind === "claude-code") return "claude-code";
  if (kind === "codex") return "codex";
  return "shell";
}

/** Runner+modèle+coordinateur résolus pour une conversation (depuis sa team — L11). */
export interface ResolvedRunner {
  /** Runner conceptuel du coordinateur (4 valeurs, AR-2). */
  kind: AgentRunnerKind;
  /** Modèle du coordinateur (vide = défaut du runner). */
  model: string;
  /** Nom du coordinateur (affiché en convhead). */
  coordinator: string;
}

export interface WorkingViewProps {
  worksetProjects: Project[];
  conversations: Conversation[];
  active: Conversation | null;
  /**
   * Hook PTY (L10a) : le terminal-source (vue « Shell ») lance le chef-runner `claude`
   * en **TUI native** dans le PTY du projet (réflexes intacts : Shift+Tab, esc, box).
   * Réutilise la couture PTY (`terminal.rs`/`PtyTerminal`) ; la couture pipes est
   * parquée (hors chemin conversation). Le tailer du transcript = L10b.
   */
  pty: UsePty;
  /** État du moteur « prochaine étape » (L3, conservé — D5). */
  nextStepResult: NextStep | null;
  nextStepLoading: boolean;
  nextStepError: string | null;
  onOpenProject: (project: Project) => void;
  onAddProject: () => void;
  onSetMode: (projectId: string, mode: ConvMode) => void;
  onSetAgent: (projectId: string, agent: string) => void;
  /** Envoie un message EN TANT QUE `agent` dans la conversation `projectId`. */
  onSend: (projectId: string, agent: string, content: string) => void;
  onRequestNextStep: (path: string) => void;
  /** Résolveur d'avatar par nom d'agent (L9) — vignettes roster + chat. */
  resolveAvatar?: AvatarResolver;
  /**
   * Roster de la team du projet ACTIF (L11) — alimente le widget Roster. Absent →
   * défaut `DEMO_TEAM` (secours / tests).
   */
  rosterMembers?: readonly DemoTeamMember[];
  /**
   * Tâches/délégations en cours de la conversation ACTIVE (panneau « Tâches en cours »,
   * sous le Roster). Accumulées par `useAgentTasks` depuis les `RunnerEvent` du tailer.
   * Absent → panneau vide (état normal en démo : conversation mockée).
   */
  tasks?: readonly AgentTask[];
  /** Plan vivant (L18 #3) : items du dernier snapshot, ou null si aucun. */
  planItems?: PlanItem[] | null;
  /** Économie du tour (L18 #5) : série de points tokens de la session active. */
  economySeries?: readonly EcoPoint[];
  /**
   * Résout le runner+modèle+coordinateur d'une conversation depuis sa team (L11/P3).
   * `WorkingView` ne code plus `runnerKind="claude-code"` en dur : le coordinateur le
   * porte. Si le runner n'est pas exécutable → bannière honnête, pas de spawn.
   */
  resolveRunner: (projectId: string) => ResolvedRunner;
  /** Canal pensée masqué ? (L10b/P3, réglage global persisté). */
  hidePensee?: boolean;
  /** Bascule + persiste l'état du canal pensée (L10b/P3). */
  onToggleHidePensee?: () => void;
}

export function WorkingView({
  worksetProjects,
  conversations,
  active,
  pty,
  nextStepResult,
  nextStepLoading,
  nextStepError,
  onOpenProject,
  onAddProject,
  onSetMode,
  onSetAgent,
  onSend,
  onRequestNextStep,
  resolveAvatar,
  rosterMembers,
  tasks,
  planItems,
  economySeries,
  resolveRunner,
  hidePensee,
  onToggleHidePensee,
}: WorkingViewProps): JSX.Element {
  const { t } = useTranslation();
  // Saisie par conversation (préfixe @agent au clic roster, D6).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Panneau « prochaine étape » repliable (D5 : conservé, repositionné).
  const [showNextStep, setShowNextStep] = useState(false);

  // Statut roster VIVANT (L10b/P3) : agents « au travail » dérivés du transcript
  // (délégations) de la conversation active. Recalculé à chaque nouveau tour.
  const workingAgents = useMemo(
    () =>
      active
        ? deriveWorkingAgents(active.history, active.pending, active.agent)
        : new Set<string>(),
    [active],
  );

  // Runner+modèle+coordinateur de la conversation active (L11/P3) — pilote le
  // terminal-source si exécutable, sinon bannière honnête.
  const activeRunner = active ? resolveRunner(active.projectId) : null;
  const activeExecutable = activeRunner
    ? isExecutableRunner(activeRunner.kind)
    : true;

  const draft = active ? (drafts[active.projectId] ?? "") : "";
  const setDraft = (projectId: string, value: string): void =>
    setDrafts((prev) => ({ ...prev, [projectId]: value }));

  // Clic roster : insère le préfixe @agent et fixe l'interlocuteur courant (D6).
  const pickAgent = (agent: string): void => {
    if (!active) return;
    onSetAgent(active.projectId, agent);
    setDraft(active.projectId, mentionPrefix(agent));
  };

  // Un nom est-il un agent de la team du projet actif ? (borne le `@agent`, C2).
  const inRoster = (name: string): boolean =>
    (rosterMembers ?? DEMO_TEAM).some(
      (m) => m.agent.toLowerCase() === name.toLowerCase(),
    );

  // Envoi (L11/C2) : la persona ne bascule QUE vers un agent présent dans la team du
  // projet (`@agent` borné). Un `@inconnu` n'a PAS d'effet de persona — mais le contenu
  // part VERBATIM au PTY du coordinateur (entrée partagée L10b inchangée).
  const sendActive = (content: string): void => {
    if (!active) return;
    const mentioned = parseMention(content);
    const agent = mentioned && inRoster(mentioned) ? mentioned : active.agent;
    onSend(active.projectId, agent, content);
    setDraft(active.projectId, "");
  };

  return (
    <section className="view wk" aria-label={t("working.ariaLabel")}>
      <aside className="worklist">
        <div className="wlhead">
          <div className="mid">
            <div className="nm">{t("working.worksetTitle")}</div>
            <div className="sub">
              {t("working.worksetCount", { count: worksetProjects.length })}
            </div>
          </div>
          <button
            type="button"
            className="addbtn"
            aria-label={t("working.importAria")}
            title={t("working.importTitle")}
            onClick={onAddProject}
          >
            +
          </button>
        </div>
        <div className="wlscroll">
          <div className="wlbl">{t("working.selectedProjects")}</div>
          {worksetProjects.length === 0 && (
            <div className="wlbl" style={{ color: "var(--text-3)" }}>
              {t("working.emptyList")}
            </div>
          )}
          {worksetProjects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`workitem${active?.projectId === p.id ? " active" : ""}`}
              onClick={() => onOpenProject(p)}
            >
              <span className="av">{p.id.slice(0, 1).toUpperCase()}</span>
              <span className="mid">
                <span className="nm">{p.id}</span>
                <span className="pv">{p.path}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="workpane">
        {active ? (
          <>
            <div className="convhead">
              <div className="convtitle">
                <span className="ct-nm">{active.title}</span>
                <span className="ct-agent" title={t("working.interlocutorTitle")}>
                  {active.agent}
                </span>
                {activeRunner && (
                  <span className="ct-runner" title={t("working.runnerTitle")}>
                    {activeRunner.coordinator} · {activeRunner.kind} ·{" "}
                    {activeRunner.model || t("working.runnerModelDefault")}
                  </span>
                )}
              </div>
              <div
                className="modetoggle"
                role="tablist"
                aria-label={t("working.modeAria")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active.mode === "chat"}
                  className={`seg${active.mode === "chat" ? " active" : ""}`}
                  onClick={() => onSetMode(active.projectId, "chat")}
                >
                  {t("working.chat")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active.mode === "shell"}
                  className={`seg${active.mode === "shell" ? " active" : ""}`}
                  onClick={() => onSetMode(active.projectId, "shell")}
                >
                  {t("working.shell")}
                </button>
              </div>
              {active.mode === "shell" && (
                <button
                  type="button"
                  className="btn sm"
                  title={t("working.interruptTitle")}
                  onClick={() => void pty.write(active.ptySessionId, "\x1b")}
                >
                  {t("working.interrupt")}
                </button>
              )}
              <button
                type="button"
                className={`btn sm${showNextStep ? " accent" : ""}`}
                aria-pressed={showNextStep}
                onClick={() => setShowNextStep((v) => !v)}
              >
                {t("working.nextStep")}
              </button>
            </div>

            {showNextStep && (
              <NextStepPanel
                projectId={active.projectId}
                result={nextStepResult}
                loading={nextStepLoading}
                error={nextStepError}
                onRequest={() => onRequestNextStep(active.cwd)}
              />
            )}

            <div className="convbody">
              {/*
                Le chef-runner (terminal-source L10a) est MONTÉ UNE FOIS par
                conversation et MASQUÉ en CSS quand mode=chat (R-L8-1/D4) — JAMAIS
                démonté (sinon pty.close → process claude tué). On boucle sur toutes les
                conversations pour garder chaque runner vivant en arrière-plan même
                quand on change de projet actif. La surface (PtyTerminal, runnerKind
                claude-code) rend la TUI NATIVE : auto-lancement de `claude` dans le cwd
                (zéro manip), frappe → stdin, réflexes natifs (Shift+Tab, esc, box).
              */}
              {conversations.map((c) => {
                const visible =
                  c.projectId === active.projectId && c.mode === "shell";
                const runner = resolveRunner(c.projectId);
                // RÈGLE D'EXÉCUTION HONNÊTE (L11 § 8) : le terminal-source réel n'est
                // spawné QUE si le runner du coordinateur est claude-code. Sinon
                // (ollama/litellm/codex) : aucun PTY, bannière honnête — définition
                // conservée, zéro crash, aucune perte de la team.
                if (!isExecutableRunner(runner.kind)) {
                  return (
                    <div
                      key={c.ptySessionId}
                      className="termwrap runner-banner-wrap"
                      style={{ display: visible ? "block" : "none" }}
                      aria-hidden={!visible}
                    >
                      <div className="runner-banner" role="status">
                        <strong>
                          {t("working.bannerNotWiredStrong", {
                            kind: runner.kind,
                          })}
                        </strong>
                        <br />
                        {t("working.bannerNotWiredCoord")}{" "}
                        <strong>{runner.coordinator}</strong>
                        {runner.model
                          ? t("working.bannerNotWiredModel", {
                              model: runner.model,
                            })
                          : ""}{" "}
                        {t("working.bannerNotWiredRest")}
                        <code>@persona</code>).
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={c.ptySessionId}
                    className="termwrap"
                    style={{ display: visible ? "block" : "none" }}
                    aria-hidden={!visible}
                  >
                    <PtyTerminal
                      sessionId={c.ptySessionId}
                      cwd={c.cwd}
                      pty={pty}
                      runnerKind={ptyRunnerKindFor(runner.kind)}
                      model={runner.model || undefined}
                    />
                  </div>
                );
              })}

              {active.mode === "chat" && !activeExecutable && activeRunner && (
                <div className="runner-banner chat-banner" role="status">
                  {t("working.bannerChat", {
                    kind: activeRunner.kind,
                    coordinator: activeRunner.coordinator,
                  })}
                </div>
              )}
              {active.mode === "chat" && (
                <Chat
                  history={active.history}
                  agent={active.agent}
                  pending={active.pending}
                  error={active.error}
                  draft={draft}
                  onDraftChange={(v) => setDraft(active.projectId, v)}
                  onSend={sendActive}
                  resolveAvatar={resolveAvatar}
                  // Affordance esc côté chat (L10b/#4) : envoie `esc` au PTY du
                  // chef-runner (EN PLUS de l'esc natif de la TUI).
                  onInterrupt={() =>
                    void pty.write(active.ptySessionId, "\x1b")
                  }
                  // Canal pensée masquable persisté (L10b/P3) : contrôlé si fourni.
                  hidePensee={hidePensee}
                  onToggleHidePensee={onToggleHidePensee}
                />
              )}
            </div>
          </>
        ) : (
          <div className="workempty">
            <span className="e">💬</span>
            {t("working.emptyConv")}
            <br />
            {t("working.emptyConvHint")}
          </div>
        )}
      </div>

      {active && (
        <aside className="wkright">
          <Roster
            members={rosterMembers}
            currentAgent={active.agent}
            pending={active.pending}
            workingAgents={workingAgents}
            onPick={pickAgent}
            resolveAvatar={resolveAvatar}
          />
          {/*
            Panneau « Tâches en cours » (façon Claude Code) SOUS le Roster : les
            délégations live dérivées du transcript (useAgentTasks). Présentationnel ;
            la collecte (tool_use_id, appariement running→done) vit dans le hook.
          */}
          <TasksPanel tasks={tasks ?? []} resolveAvatar={resolveAvatar} />
          {/*
            Plan vivant (L18 #3) : dernier snapshot de plan capté par le hook
            `plan-courante.mjs` sur la main courante (façade L4 → derivePlan).
          */}
          <PlanPanel items={planItems ?? null} />
          {/* HUD économie du tour (L18 #5) : tokens par tour de la session active. */}
          <EconomyPanel series={economySeries ?? []} />
        </aside>
      )}
    </section>
  );
}
