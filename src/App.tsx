/**
 * App.tsx — SHELL DE NAVIGATION (D1/D6). Pas de god-component : l'état métier
 * vit dans des hooks séparés (usePortfolio, useGridState, useWorkset, usePty,
 * useSettings, useServices) ; App ne fait que câbler et router les 3 vues.
 *
 * Aucun `invoke`/`listen` ici (ni nulle part hors `backend.ts`). Les vues sont
 * présentationnelles ; les seuls effets I/O passent par les hooks/façade.
 */
import { useMemo } from "react";
import { usePortfolio } from "./hooks/usePortfolio";
import { useGridState } from "./hooks/useGridState";
import { useConversations } from "./hooks/useConversations";
import { useRunnerViews } from "./hooks/useRunnerViews";
import { useWorkset } from "./hooks/useWorkset";
import { usePty } from "./hooks/usePty";
import { useSettings } from "./hooks/useSettings";
import { useServices } from "./hooks/useServices";
import { useNextStep } from "./hooks/useNextStep";
import { useDemoSeed } from "./hooks/useDemoSeed";
import { PortfolioView } from "./views/PortfolioView";
import { WorkingView } from "./views/WorkingView";
import { SettingsView } from "./views/SettingsView";
import { makeAvatarResolver } from "./theme/teamAvatar";
import type { Project } from "./api/backend";
import "./theme/tokens.css";
import "./theme/app.css";

export default function App(): JSX.Element {
  const portfolio = usePortfolio();
  const grid = useGridState();
  const conversations = useConversations();
  const workset = useWorkset();
  const pty = usePty();
  const settings = useSettings();
  const services = useServices();
  const nextStep = useNextStep();

  // Vue filtrée L10b : le tailer du transcript du chef-runner alimente les
  // conversations (runner://event → ChatTurn). Démarré dès qu'un runnerSessionId
  // apparaît dans une session PTY. Le parse vit côté Rust (CSP) ; ici on ne route que
  // des events typés vers l'état conversation.
  useRunnerViews({
    conversations: conversations.conversations,
    ptySessions: pty.sessions,
    appendTurn: conversations.appendTurn,
  });

  // Bootstrap démo dev (L7, réconcilié L8/D7) : seede dossier+config côté Rust
  // (inerte en prod) puis ouvre UNE conversation pour le projet démo (plus 5
  // onglets) si aucune conversation active. Reste sur Portfolio (AR-4).
  useDemoSeed({
    conversationsCount: conversations.conversations.length,
    openConversation: conversations.openConversation,
    refreshPortfolio: portfolio.refresh,
    // L9-B : le projet démo entre aussi dans le set de Work (idempotent).
    addToWorkset: workset.add,
  });

  // Projets du set de Work (intersection ids ⨯ projets réels).
  const worksetProjects = useMemo<Project[]>(
    () => portfolio.projects.filter((p) => workset.ids.has(p.id)),
    [portfolio.projects, workset.ids],
  );

  // Résolveur d'avatar (L9) : charte = thème app courant, team = ui_team.
  // Passé en prop aux vues/composants présentationnels (pas d'accès config en bas).
  const resolveAvatar = useMemo(
    () => makeAvatarResolver(settings.theme, settings.team),
    [settings.theme, settings.team],
  );

  const openProject = (project: Project): void => {
    conversations.openConversation(project.id, project.id, project.path);
    grid.setActiveView("working");
  };

  // Entrée partagée (L10b/§5.1) : la saisie chat ÉCHOTE (tour user) ET PILOTE le chef
  // (stdin du PTY : la frappe + `\r` pour soumettre la TUI native). Le `@agent` est un
  // préfixe VERBATIM (arbitrage #5) : `content` est écrit tel quel au PTY, aucune
  // traduction. La réponse du chef remonte par le tailer (`useRunnerViews`).
  const handleSend = (projectId: string, agent: string, content: string): void => {
    const conv = conversations.conversations.find(
      (c) => c.projectId === projectId,
    );
    if (!conv) return;
    conversations.echoUser(projectId, agent, content);
    void pty.write(conv.ptySessionId, `${content}\r`);
  };

  // Bouton + de Working : import d'un dossier existant → portfolio + set de Work.
  const addProject = async (): Promise<void> => {
    const project = await portfolio.importProject();
    if (project) workset.add(project.id);
  };

  return (
    <main className="app-shell" data-navpos={settings.ui.navPos}>
      <header className="topbar">
        <div className="brand">
          <span className="grue" aria-hidden>
            🏗
          </span>
          IakaCockpit
        </div>
        <nav className="nav" aria-label="Navigation principale">
          <button
            type="button"
            className={`navbtn${grid.activeView === "portfolio" ? " active" : ""}`}
            onClick={() => grid.setActiveView("portfolio")}
          >
            Portfolio
          </button>
          <button
            type="button"
            className={`navbtn${grid.activeView === "working" ? " active" : ""}`}
            onClick={() => grid.setActiveView("working")}
          >
            Working
            {conversations.conversations.length > 0 && (
              <span className="nu">{conversations.conversations.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`navbtn${grid.activeView === "settings" ? " active" : ""}`}
            onClick={() => grid.setActiveView("settings")}
          >
            Réglages
          </button>
        </nav>
        <div className="spc" />
      </header>

      <div className="host">
        {grid.activeView === "portfolio" && (
          <PortfolioView
            projects={portfolio.projects}
            loading={portfolio.loading}
            error={portfolio.error}
            root={portfolio.root}
            worksetIds={workset.ids}
            worksetCount={workset.ids.size}
            onToggleWork={workset.toggle}
            onGotoWork={() => grid.setActiveView("working")}
          />
        )}
        {grid.activeView === "working" && (
          <WorkingView
            worksetProjects={worksetProjects}
            conversations={conversations.conversations}
            active={conversations.active}
            pty={pty}
            nextStepResult={nextStep.result}
            nextStepLoading={nextStep.loading}
            nextStepError={nextStep.error}
            onOpenProject={openProject}
            onAddProject={() => void addProject()}
            onSetMode={conversations.setMode}
            onSetAgent={conversations.setAgent}
            onSend={handleSend}
            onRequestNextStep={(path) => void nextStep.request(path)}
            resolveAvatar={resolveAvatar}
            hidePensee={settings.hidePensee}
            onToggleHidePensee={() =>
              void settings.setHidePensee(!settings.hidePensee)
            }
          />
        )}
        {grid.activeView === "settings" && (
          <SettingsView
            settings={settings}
            services={services.services}
            onRescan={() => void portfolio.refresh()}
          />
        )}
      </div>
    </main>
  );
}
