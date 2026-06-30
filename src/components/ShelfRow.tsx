/**
 * ShelfRow — ligne compacte d'un projet RANGÉ DANS L'ATELIER (hors table, L21 tranche B).
 * Calque la grammaire `.scanrow` du mock
 * (`specs/design/redesign/A/concepts/app/portefeuille.html:117-120`) :
 *   pastille de statut · nom · chemin · `.meta` (statut git RÉEL) · bouton `.add` (« poser »).
 *
 * Présentationnel PUR (D8). **Tags OMIS en MVP (AR-3)** : aucun champ `type`/`tags` sur
 * `Project` → on n'affiche que nom + chemin + statut git réel (`gitLabel`, scan L1). Aucun
 * placeholder inventé.
 */
import { useTranslation } from "react-i18next";
import type { Project } from "../api/backend";
import { gitLabel } from "./gitLabel";

export interface ShelfRowProps {
  project: Project;
  /** Pose le projet sur la table (workset.add). */
  onPut: (projectId: string) => void;
}

export function ShelfRow({ project, onPut }: ShelfRowProps): JSX.Element {
  const { t } = useTranslation();
  const git = gitLabel(project, t);
  // Pastille mock : `o` (orange) = dépôt modifié, `i` (idle) = propre/au repos.
  const dot = project.is_git && project.dirty ? "o" : "i";
  // Statut git réel : « branche · état » (calque « main · propre » du mock).
  const status = project.branch ? `${project.branch} · ${git.text}` : git.text;

  return (
    <div className="scanrow">
      <span className={`dot ${dot}`} aria-hidden />
      <div className="scanid">
        <div className="nm">{project.id}</div>
        <div className="pth">{project.path}</div>
      </div>
      <div className="meta">
        <span className={git.cls}>{status}</span>
      </div>
      <button type="button" className="add" onClick={() => onPut(project.id)}>
        {t("card.putOnTable")}
      </button>
    </div>
  );
}
