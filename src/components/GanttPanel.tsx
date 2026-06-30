/**
 * GanttPanel — Gantt du RÉALISÉ (L19 #9a). Présentationnel : une barre par tâche du plan,
 * positionnée sur l'axe de temps [début de session → maintenant] selon ses transitions
 * de statut observées (snapshots L18). Pas d'estimation (#9b) : uniquement le réalisé +
 * une ALERTE de retard (tâche `in_progress` qui dure anormalement). Aucun I/O.
 *
 * Différé (#9b/raffinement) : la baseline PRÉVISIONNELLE + les flèches délégation/user↔agent.
 */
import { useTranslation } from "react-i18next";
import type { PlanTimeline } from "../hooks/derivePlanTimeline";

export interface GanttPanelProps {
  timeline: PlanTimeline;
}

export function GanttPanel({ timeline }: GanttPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { bars, minMs, nowMs } = timeline;
  const range = Math.max(1, nowMs - minMs);
  const started = bars.filter((b) => b.startMs != null);
  const overruns = bars.filter((b) => b.overrun).length;

  return (
    <section className="gantt" aria-label={t("gantt.ariaLabel")}>
      <div className="gh">
        <span className="gt">{t("gantt.title")}</span>
        {overruns > 0 && (
          <span className="galert">{t("gantt.overrun", { count: overruns })}</span>
        )}
      </div>
      {started.length === 0 ? (
        <p className="gempty">{t("gantt.empty")}</p>
      ) : (
        <div className="gbars">
          {bars.map((b, i) => {
            const start = b.startMs ?? nowMs;
            const endMs = b.endMs ?? nowMs;
            const left = ((start - minMs) / range) * 100;
            const width = Math.max(1.5, ((endMs - start) / range) * 100);
            return (
              <div key={i} className="grow" title={b.content}>
                <span className="glabel">{b.content}</span>
                <span className="gtrack">
                  {b.startMs != null && (
                    <i
                      className={`gbar st-${b.status}${b.overrun ? " ovr" : ""}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  )}
                </span>
              </div>
            );
          })}
          {/* Curseur « maintenant » (bord droit de l'axe). */}
          <span className="gnow" aria-hidden />
        </div>
      )}
    </section>
  );
}
