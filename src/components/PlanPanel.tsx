/**
 * PlanPanel — « plan vivant » (L18 #3, variante A). Présentationnel : une checklist des
 * items du plan courant, cochés en direct. Aucun I/O — reçoit les items dérivés de la
 * main courante (`derivePlan`). Empty-state honnête si aucun plan en cours.
 */
import { useTranslation } from "react-i18next";
import type { PlanItem } from "../hooks/derivePlan";

export interface PlanPanelProps {
  /** Items du plan courant, ou `null`/[] si aucun plan capté. */
  items: PlanItem[] | null;
}

/** Marqueur de statut (glyphe monochrome — charte A, sans emoji). */
function mark(status: PlanItem["status"]): string {
  if (status === "completed") return "✓";
  if (status === "in_progress") return "▸";
  return "○";
}

export function PlanPanel({ items }: PlanPanelProps): JSX.Element {
  const { t } = useTranslation();
  const list = items ?? [];
  const doneCount = list.filter((i) => i.status === "completed").length;

  return (
    <section className="planpanel" aria-label={t("plan.ariaLabel")}>
      <div className="planhead">
        <span className="plantitle">{t("plan.title")}</span>
        {list.length > 0 && (
          <span className="plancount">
            {t("plan.progress", { done: doneCount, total: list.length })}
          </span>
        )}
      </div>
      {list.length === 0 ? (
        <p className="planempty">{t("plan.empty")}</p>
      ) : (
        <ul className="planlist">
          {list.map((it, i) => (
            <li key={i} className={`planitem ps-${it.status}`}>
              <span className="pmark" aria-hidden>
                {mark(it.status)}
              </span>
              <span className="ptext">{it.content}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
