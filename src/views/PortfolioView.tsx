/**
 * PortfolioView — vue Portfolio (D2). Présentationnel : main courante (mock)
 * gauche + grille de tuiles RÉELLE droite. Reçoit l'état des hooks en props,
 * aucun I/O ici.
 */
import type { Project } from "../api/backend";
import { MainCouranteMock } from "../components/MainCouranteMock";
import { Tile } from "../components/Tile";

export interface PortfolioViewProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
  root: string | null;
  worksetIds: ReadonlySet<string>;
  worksetCount: number;
  onToggleWork: (projectId: string) => void;
  onGotoWork: () => void;
}

export function PortfolioView({
  projects,
  loading,
  error,
  root,
  worksetIds,
  worksetCount,
  onToggleWork,
  onGotoWork,
}: PortfolioViewProps): JSX.Element {
  return (
    <section className="view pf" aria-label="Portfolio">
      <MainCouranteMock />
      <div className="pfright">
        <div className="rh">
          <h1>Portfolio</h1>
          <span className="sub">{root ?? "chapeau non résolu"}</span>
        </div>
        <div className="workset">
          <b>Set de Work</b>
          <span>{worksetCount} projet(s) sélectionné(s)</span>
          {worksetCount > 0 && (
            <button type="button" className="btn accent sm goto" onClick={onGotoWork}>
              Ouvrir dans Working →
            </button>
          )}
        </div>

        {loading && <div className="pfstate">Scan du chapeau…</div>}
        {error && <div className="pfstate err">Erreur de scan : {error}</div>}
        {!loading && !error && projects.length === 0 && (
          <div className="pfstate">Aucun projet sous le chapeau.</div>
        )}

        <div className="tilegrid">
          {projects.map((p) => (
            <Tile
              key={p.id}
              project={p}
              inWork={worksetIds.has(p.id)}
              onToggleWork={onToggleWork}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
