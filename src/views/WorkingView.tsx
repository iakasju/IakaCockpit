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
import { useState } from "react";
import type { NextStep, Project } from "../api/backend";
import type {
  Conversation,
  ConvMode,
} from "../hooks/useConversations";
import { mentionPrefix, parseMention } from "../hooks/useConversations";
import type { UseRunner } from "../hooks/useRunner";
import { RunnerTerminal } from "../components/RunnerTerminal";
import { NextStepPanel } from "../components/NextStepPanel";
import { Chat } from "../components/Chat";
import { Roster } from "../components/Roster";
import type { AvatarResolver } from "../theme/teamAvatar";

export interface WorkingViewProps {
  worksetProjects: Project[];
  conversations: Conversation[];
  active: Conversation | null;
  /**
   * Hook chef-runner (L10) : le terminal-source (vue « Shell ») lance `claude` en
   * pipes et rend son flux brut. Remplace l'ancien PTY shell pour le chef-runner ;
   * `usePty`/`terminal.rs` restent disponibles pour le shell legacy (hors L10 P1).
   */
  runner: UseRunner;
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
}

export function WorkingView({
  worksetProjects,
  conversations,
  active,
  runner,
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
}: WorkingViewProps): JSX.Element {
  // Saisie par conversation (préfixe @agent au clic roster, D6).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Panneau « prochaine étape » repliable (D5 : conservé, repositionné).
  const [showNextStep, setShowNextStep] = useState(false);

  const draft = active ? (drafts[active.projectId] ?? "") : "";
  const setDraft = (projectId: string, value: string): void =>
    setDrafts((prev) => ({ ...prev, [projectId]: value }));

  // Clic roster : insère le préfixe @agent et fixe l'interlocuteur courant (D6).
  const pickAgent = (agent: string): void => {
    if (!active) return;
    onSetAgent(active.projectId, agent);
    setDraft(active.projectId, mentionPrefix(agent));
  };

  // Envoi : la persona courante = l'@agent en tête, sinon l'agent de la conv (D3).
  const sendActive = (content: string): void => {
    if (!active) return;
    const mentioned = parseMention(content);
    const agent = mentioned ?? active.agent;
    onSend(active.projectId, agent, content);
    setDraft(active.projectId, "");
  };

  return (
    <section className="view wk" aria-label="Working">
      <aside className="worklist">
        <div className="wlhead">
          <div className="mid">
            <div className="nm">Set de Work</div>
            <div className="sub">{worksetProjects.length} projet(s)</div>
          </div>
          <button
            type="button"
            className="addbtn"
            aria-label="Importer un projet (dossier existant)"
            title="Importer un projet existant…"
            onClick={onAddProject}
          >
            +
          </button>
        </div>
        <div className="wlscroll">
          <div className="wlbl">Projets sélectionnés</div>
          {worksetProjects.length === 0 && (
            <div className="wlbl" style={{ color: "var(--text-3)" }}>
              Aucun projet. Importe un dossier existant via le bouton + ci-dessus,
              ou ajoute des projets depuis Portfolio.
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
                <span className="ct-agent" title="Interlocuteur courant">
                  {active.agent}
                </span>
              </div>
              <div className="modetoggle" role="tablist" aria-label="Mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active.mode === "chat"}
                  className={`seg${active.mode === "chat" ? " active" : ""}`}
                  onClick={() => onSetMode(active.projectId, "chat")}
                >
                  Chat
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active.mode === "shell"}
                  className={`seg${active.mode === "shell" ? " active" : ""}`}
                  onClick={() => onSetMode(active.projectId, "shell")}
                >
                  Shell
                </button>
              </div>
              {active.mode === "shell" && (
                <button
                  type="button"
                  className="btn sm"
                  title="Interrompre l'outil en cours du chef-runner (esc)"
                  onClick={() =>
                    void runner.interrupt(active.ptySessionId)
                  }
                >
                  Interrompre (esc)
                </button>
              )}
              <button
                type="button"
                className={`btn sm${showNextStep ? " accent" : ""}`}
                aria-pressed={showNextStep}
                onClick={() => setShowNextStep((v) => !v)}
              >
                Prochaine étape
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
                Le chef-runner (terminal-source L10) est MONTÉ UNE FOIS par
                conversation et MASQUÉ en CSS quand mode=chat (R-L8-1/D4) — JAMAIS
                démonté (sinon runner.close → process tué). On boucle sur toutes les
                conversations pour garder chaque runner vivant en arrière-plan même
                quand on change de projet actif. La surface (RunnerTerminal) rend le
                FLUX BRUT et reste typeable (frappe → tour ; esc → interruption).
              */}
              {conversations.map((c) => {
                const visible =
                  c.projectId === active.projectId && c.mode === "shell";
                return (
                  <div
                    key={c.ptySessionId}
                    className="termwrap"
                    style={{ display: visible ? "block" : "none" }}
                    aria-hidden={!visible}
                  >
                    <RunnerTerminal
                      sessionId={c.ptySessionId}
                      cwd={c.cwd}
                      runner={runner}
                    />
                  </div>
                );
              })}

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
                />
              )}
            </div>
          </>
        ) : (
          <div className="workempty">
            <span className="e">💬</span>
            Aucune conversation ouverte.
            <br />
            Choisis un projet du set de Work pour ouvrir sa conversation.
          </div>
        )}
      </div>

      {active && (
        <Roster
          currentAgent={active.agent}
          pending={active.pending}
          onPick={pickAgent}
          resolveAvatar={resolveAvatar}
        />
      )}
    </section>
  );
}
