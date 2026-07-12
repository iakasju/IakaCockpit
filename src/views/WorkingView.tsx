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
import { ProjectTabs } from "../components/ProjectTabs";
import { NextStepPanel } from "../components/NextStepPanel";
import { Chat } from "../components/Chat";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import { Roster } from "../components/Roster";
import { TasksPanel } from "../components/TasksPanel";
import { PlanPanel } from "../components/PlanPanel";
import type { PlanItem } from "../hooks/derivePlan";
import { EconomyPanel } from "../components/EconomyPanel";
import { MemoryGauge } from "../components/MemoryGauge";
import { EffectsPanel } from "../components/EffectsPanel";
import { GanttPanel } from "../components/GanttPanel";
import type { EcoPoint } from "../hooks/useEconomy";
import type { FileEffect } from "../hooks/useEffects";
import type { PlanTimeline } from "../hooks/derivePlanTimeline";
import type { AgentTask } from "../hooks/useAgentTasks";
import type { AvatarResolver } from "../theme/teamAvatar";
import { isExecutableRunner, type AgentRunnerKind } from "../hooks/useTeams";
import { DEMO_TEAM, type DemoTeamMember } from "../mock/demoTeam";
import type { PrepareEntry } from "../hooks/usePrepareResume";

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
  /**
   * Retire un projet de la Table (L23). App orchestre : retrait IMMÉDIAT du set de Work
   * **puis** déclenchement du job de préparation de reprise (sans await). Le bouton
   * « retirer de la table » de chaque `.workitem` s'y branche.
   */
  onRemoveFromWork: (projectId: string) => void;
  /**
   * Statuts transitoires des préparations de reprise (L23, SA-4) — affichés dans une zone
   * discrète de l'en-tête de la worklist (l'item retiré a disparu, le statut ne peut y vivre).
   */
  prepareEntries?: readonly PrepareEntry[];
  /** Ferme une ligne de statut de préparation (bouton × d'une entrée terminée). */
  onDismissPrepare?: (projectId: string) => void;
  /**
   * Sélectionne la conversation d'un projet depuis la barre d'onglets (L24 F2) —
   * `App` branche `useConversations.setActive`. Bascule l'`active` sans rien démonter
   * (garde L10 : le `PtyTerminal` de chaque projet survit au switch d'onglet).
   */
  onSelectConversation: (projectId: string) => void;
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
  /** Effets fichiers (L18 #7) : fichiers touchés (triés) de la session active. */
  fileEffects?: readonly FileEffect[];
  /** Total d'éditions (borne des buckets de la heatmap). */
  fileEffectsTotal?: number;
  /** Gantt du réalisé (L19 #9a) : timeline dérivée des snapshots de plan. */
  timeline?: PlanTimeline;
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
  onRemoveFromWork,
  prepareEntries,
  onDismissPrepare,
  onSelectConversation,
  onSetMode,
  onSetAgent,
  onSend,
  onRequestNextStep,
  resolveAvatar,
  rosterMembers,
  tasks,
  planItems,
  economySeries,
  fileEffects,
  fileEffectsTotal,
  timeline,
  resolveRunner,
  hidePensee,
  onToggleHidePensee,
}: WorkingViewProps): JSX.Element {
  const { t } = useTranslation();
  // Props liées à l'affichage du statut de reprise : DÉBRANCHÉ (2026-07-12) mais conservé.
  // Le job prepareResume tourne toujours (App), seules ces props ne sont plus rendues.
  void prepareEntries;
  void onDismissPrepare;
  // Saisie par conversation (préfixe @agent au clic roster, D6).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Panneau « prochaine étape » repliable (D5 : conservé, repositionné).
  const [showNextStep, setShowNextStep] = useState(false);
  // Bandeau Gantt (L19) : ouvert par défaut (au-dessus du chat, large & lisible).
  const [showGantt, setShowGantt] = useState(true);

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

  // Dictée vocale (L16 reciblé) : le micro du chat capture la parole (STT local) et
  // AUTO-ENVOIE le transcript comme message (décision Stéphane). Garde anti-vide dans
  // le hook. `onTranscript` lu à jour (ref interne) → toujours le projet/persona actifs.
  const voice = useVoiceDictation((text) => sendActive(text));

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

        {/*
          Zone de statut des préparations de reprise (L23, SA-4) — discrète, sous
          l'en-tête. L'item retiré disparaît de la liste : son statut vit ICI, transitoire
          (« préparation… » → « prête »/« prête (hors git) » → fermable ; « échec » lisible).
        */}
        {/* Zone de statut de reprise débranchée sur demande 2026-07-12 (garder le code).
            Le job prepareResume continue de tourner. */}
        {/*
        {prepareEntries && prepareEntries.length > 0 && (
          <ul
            className="wlprep"
            aria-label={t("working.prepareAria")}
            aria-live="polite"
          >
            {prepareEntries.map((e) => (
              <li key={e.projectId} className={`prepitem prep-${e.status}`}>
                <span className="prepdot" aria-hidden />
                <span className="prepbody">
                  <span className="prepname">{e.name}</span>
                  <span className="prepmsg">
                    {e.status === "running" && t("working.prepareRunning")}
                    {e.status === "done" &&
                      (e.horsGit
                        ? t("working.prepareDoneHorsGit")
                        : t("working.prepareDone"))}
                    {e.status === "error" &&
                      t("working.prepareError", {
                        message: e.message ?? "",
                      })}
                  </span>
                </span>
                {e.status !== "running" && onDismissPrepare && (
                  <button
                    type="button"
                    className="prepclose"
                    aria-label={t("working.prepareDismissAria", {
                      project: e.name,
                    })}
                    title={t("working.prepareDismissAria", { project: e.name })}
                    onClick={() => onDismissPrepare(e.projectId)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        */}

        <div className="wlscroll">
          <div className="wlbl">{t("working.selectedProjects")}</div>
          {worksetProjects.length === 0 && (
            <div className="wlbl" style={{ color: "var(--text-3)" }}>
              {t("working.emptyList")}
            </div>
          )}
          {/*
            L23 — item RESTRUCTURÉ : `.workitem` n'est plus un `<button>` (interdit
            d'imbriquer le bouton « retirer » dans un bouton = button-in-button invalide).
            C'est un conteneur `<div>` avec une zone cliquable « ouvrir » (`.wiopen`) ET un
            bouton frère « retirer » (`.wirm`). Style/hover/`.active` conservés (sélecteurs
            adaptés). Les deux sont cliquables indépendamment.
          */}
          {worksetProjects.map((p) => (
            <div
              key={p.id}
              className={`workitem${active?.projectId === p.id ? " active" : ""}`}
            >
              <button
                type="button"
                className="wiopen"
                aria-label={t("working.openAria", { project: p.id })}
                onClick={() => onOpenProject(p)}
              >
                <span className="av">{p.id.slice(0, 1).toUpperCase()}</span>
                <span className="mid">
                  <span className="nm">{p.id}</span>
                  <span className="pv">{p.path}</span>
                </span>
              </button>
              <button
                type="button"
                className="wirm"
                aria-label={t("working.removeAria", { project: p.id })}
                title={t("working.removeTitle")}
                onClick={() => onRemoveFromWork(p.id)}
              >
                −
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="workpane">
        {/*
          Barre d'onglets par projet (L24 F2) : un onglet par conversation ouverte,
          en tête de la zone conversation. Coexiste avec la worklist gauche (AR-1) ;
          les deux pilotent le même `active`. Le « × » d'un onglet retire le projet de
          la Table (ferme PTY + conversation, L23-inc) — jamais un simple switch.
        */}
        <ProjectTabs
          conversations={conversations}
          activeProjectId={active?.projectId ?? null}
          onSelect={onSelectConversation}
          onClose={onRemoveFromWork}
        />
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
                    {activeRunner.coordinator.toLowerCase() !==
                    active.agent.toLowerCase()
                      ? `${activeRunner.coordinator} · ${activeRunner.kind} · ${activeRunner.model || t("working.runnerModelDefault")}`
                      : `${activeRunner.kind} · ${activeRunner.model || t("working.runnerModelDefault")}`}
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
              <button
                type="button"
                className={`btn sm${showGantt ? " accent" : ""}`}
                aria-pressed={showGantt}
                onClick={() => setShowGantt((v) => !v)}
              >
                {t("gantt.title")}
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

            {/* Bandeau Gantt CENTRAL (L19) : large & lisible, au-dessus du chat. */}
            {showGantt && timeline && (
              <div className="gantband">
                <GanttPanel timeline={timeline} />
              </div>
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
                  voiceStatus={voice.status}
                  onDictate={() => void voice.listen()}
                />
              )}
            </div>
          </>
        ) : (
          <div className="workempty">
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
          {/* Le Gantt vit en BANDEAU CENTRAL (large) — pas dans cette colonne étroite. */}
          {/* Jauge mémoire (L18 #6) : input du dernier tour ≈ contexte + frontière compaction. */}
          <MemoryGauge series={economySeries ?? []} />
          {/* HUD économie du tour (L18 #5) : tokens par tour de la session active. */}
          <EconomyPanel series={economySeries ?? []} />
          {/* Effets fichiers (L18 #7) : heatmap fichiers × tours (gestes d'édition). */}
          <EffectsPanel
            effects={fileEffects ?? []}
            total={fileEffectsTotal ?? 0}
          />
        </aside>
      )}
    </section>
  );
}
