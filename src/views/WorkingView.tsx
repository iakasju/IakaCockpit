/**
 * WorkingView — vue Working (D3). Set de Work à gauche, onglets PTY + terminal
 * RÉEL au centre, zone conversation = PLACEHOLDER propre (PO-3 tranché).
 *
 * Présentationnel : reçoit la liste des projets du set de Work, l'état des
 * onglets (useGridState) et le hook PTY (passé au PtyTerminal). Aucun I/O direct.
 */
import type { Project } from "../api/backend";
import type { PtyTab } from "../hooks/useGridState";
import type { UsePty } from "../hooks/usePty";
import { PtyTerminal } from "../components/PtyTerminal";

export interface WorkingViewProps {
  worksetProjects: Project[];
  tabs: PtyTab[];
  activeTabId: string | null;
  pty: UsePty;
  onOpenProject: (project: Project) => void;
  onAddProject: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function WorkingView({
  worksetProjects,
  tabs,
  activeTabId,
  pty,
  onOpenProject,
  onAddProject,
  onSelectTab,
  onCloseTab,
}: WorkingViewProps): JSX.Element {
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

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
              className="workitem"
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
        <div className="tabsbar" role="tablist">
          {tabs.map((t) => (
            <div
              key={t.id}
              role="tab"
              aria-selected={t.id === activeTabId}
              className={`tab${t.id === activeTabId ? " active" : ""}`}
              onClick={() => onSelectTab(t.id)}
            >
              <span>{t.title}</span>
              <span
                className="x"
                role="button"
                aria-label={`Fermer ${t.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(t.id);
                }}
              >
                ×
              </span>
            </div>
          ))}
        </div>

        <div className="workbody">
          {activeTab ? (
            <>
              <div className="convph">
                <span className="mockflag">placeholder</span>
                Conversation / thread agents — branchée en L3 (moteur IA) et L4
                (mains courantes). Le terminal ci-dessous est réel.
              </div>
              <div className="termwrap">
                {/* clé = id de session : remonter le composant à chaque onglet */}
                <PtyTerminal
                  key={activeTab.id}
                  sessionId={activeTab.id}
                  cwd={activeTab.cwd}
                  pty={pty}
                />
              </div>
            </>
          ) : (
            <div className="workempty">
              <span className="e">⌨</span>
              Aucune session ouverte.
              <br />
              Choisis un projet du set de Work pour ouvrir un terminal.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
