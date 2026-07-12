/**
 * ShelfRow — ligne compacte d'un projet RANGÉ DANS L'ATELIER (hors table, L21 tranche B).
 * Calque la grammaire `.scanrow` du mock
 * (`specs/design/redesign/A/concepts/app/portefeuille.html:117-120`) :
 *   pastille d'urgence · nom · chemin · `.meta` (statut git RÉEL) · bouton `.add` (« poser »).
 *
 * Présentationnel PUR (D8). **Tags OMIS en MVP (AR-3)** : aucun champ `type`/`tags` sur
 * `Project` → on n'affiche que nom + chemin + statut git réel (`gitLabel`, scan L1). Aucun
 * placeholder inventé.
 *
 * F4-bis : la pastille de gauche porte la **MÊME urgence** que la tuile `ProjectCard`
 * (helper partagé `urgency.ts`, mêmes couleurs / tooltip i18n / mapping) — plus le point
 * de statut git `.dot o/i`. Le statut git reste visible dans le texte `.meta` (rien de perdu).
 */
import { useTranslation } from "react-i18next";
import type { Project } from "../api/backend";
import { gitLabel } from "./gitLabel";
import { urgencyLabel, urgencyLevel } from "./urgency";

export interface ShelfRowProps {
  project: Project;
  /** Pose le projet sur la table (workset.add). */
  onPut: (projectId: string) => void;
}

export function ShelfRow({ project, onPut }: ShelfRowProps): JSX.Element {
  const { t } = useTranslation();
  const git = gitLabel(project, t);
  // Pastille d'urgence (F4-bis) : IDENTIQUE à la tuile, dérivée du backlog restant.
  const level = urgencyLevel(project.backlog_remaining);
  const urgLabel = urgencyLabel(level, project.backlog_remaining, t);
  // Statut git réel : « branche · état » (calque « main · propre » du mock) — reste en `.meta`.
  const status = project.branch ? `${project.branch} · ${git.text}` : git.text;

  return (
    <div className="scanrow">
      <span
        className={`dot urg urg-${level}`}
        role="img"
        aria-label={urgLabel}
        title={urgLabel}
      />
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
