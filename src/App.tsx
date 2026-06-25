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
import { useWorkset } from "./hooks/useWorkset";
import { usePty } from "./hooks/usePty";
import { useSettings } from "./hooks/useSettings";
import { useServices } from "./hooks/useServices";
import { PortfolioView } from "./views/PortfolioView";
import { WorkingView } from "./views/WorkingView";
import { SettingsView } from "./views/SettingsView";
import type { Project } from "./api/backend";
import "./theme/tokens.css";
import "./theme/app.css";

export default function App(): JSX.Element {
  const portfolio = usePortfolio();
  const grid = useGridState();
  const workset = useWorkset();
  const pty = usePty();
  const settings = useSettings();
  const services = useServices();

  // Projets du set de Work (intersection ids ⨯ projets réels).
  const worksetProjects = useMemo<Project[]>(
    () => portfolio.projects.filter((p) => workset.ids.has(p.id)),
    [portfolio.projects, workset.ids],
  );

  const openProject = (project: Project): void => {
    grid.openTab(project.id, project.id, project.path);
    grid.setActiveView("working");
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
            {grid.tabs.length > 0 && <span className="nu">{grid.tabs.length}</span>}
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
            tabs={grid.tabs}
            activeTabId={grid.activeTabId}
            pty={pty}
            onOpenProject={openProject}
            onAddProject={() => void addProject()}
            onSelectTab={grid.setActiveTab}
            onCloseTab={grid.closeTab}
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
