/**
 * Tile — tuile de projet (Portfolio). Présentationnel : reçoit le `Project` réel
 * (scanPortfolio) + callbacks. Aucun I/O.
 */
import type { Project } from "../api/backend";

export interface TileProps {
  project: Project;
  inWork: boolean;
  /** Ajoute/retire du set de Work. */
  onToggleWork: (projectId: string) => void;
}

/** Libellé court de l'état git pour la métadonnée mono. */
function gitLabel(p: Project): { cls: string; text: string } {
  if (!p.is_git) return { cls: "dirty", text: "hors git" };
  if (p.dirty) return { cls: "dirty", text: "dirty" };
  if (p.ahead > 0) return { cls: "ahead", text: `↑${p.ahead}` };
  if (p.behind > 0) return { cls: "ahead", text: `↓${p.behind}` };
  return { cls: "clean", text: "clean" };
}

function statusDotClass(p: Project): string {
  if (!p.is_git) return "nogit";
  return p.dirty ? "dirty" : "clean";
}

export function Tile({ project, inWork, onToggleWork }: TileProps): JSX.Element {
  const git = gitLabel(project);
  return (
    <article className={`tile${inWork ? " inwork" : ""}`}>
      <div className="th">
        <span className={`st ${statusDotClass(project)}`} aria-hidden />
        <b>{project.id}</b>
      </div>
      <div className="desc">
        {project.last_commit_subject ?? project.path}
      </div>
      <div className="meta">
        <span className="ws">{project.work_status}</span>
        {project.version && <span className="v">v{project.version}</span>}
        {project.branch && <span>{project.branch}</span>}
        <span className={`git ${git.cls}`}>{git.text}</span>
      </div>
      <div className="tacts">
        <button
          type="button"
          className="addwork"
          aria-label={
            inWork ? "Retirer du set de Work" : "Ajouter au set de Work"
          }
          aria-pressed={inWork}
          onClick={() => onToggleWork(project.id)}
        >
          {inWork ? "−" : "+"}
        </button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-3)" }}>
          {inWork ? "dans le set de Work" : "ajouter au Work"}
        </span>
      </div>
    </article>
  );
}
