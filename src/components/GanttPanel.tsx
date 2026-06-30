/**
 * GanttPanel — Gantt prévisionnel de la Table (L19 #9a/#9b + L20). Présentationnel pur,
 * aucun I/O. Porte la GRAMMAIRE VISUELLE du mock (`specs/design/redesign/A/concepts/app/
 * travail.html`) sur la donnée ACTUELLE, **par tâche** (AR-1, pas par agent) :
 *
 *  - bandeau d'estimation (durées + total prévu + heure de lancement) quand des estimations
 *    existent ; masqué proprement sinon (dégradation honnête, jamais « estime 0 ») ;
 *  - axe de temps GRADUÉ et ÉTENDU au-delà de « maintenant » (AR-4 : `axisMax = max(nowMs,
 *    fin projetée)`) → le futur/prévisionnel devient visible à droite du curseur ;
 *  - curseur « maintenant » labellisé + pastille, positionné DANS l'axe (au bord seulement
 *    sans prévisionnel → non-régression #9a) ;
 *  - barres riches : remplissage `.fill`, caption `.cap`, débord rouge `.fill.ovf` + marqueur
 *    `prévu` `.planend` sur dépassement ;
 *  - baseline fantôme `.gghost` + cascade rendue (case d'attente `.gwait` + connecteur `.gslip
 *    ↦ +N min`) pour les tâches à venir estimées, exploitant `baselineStartMs` (cascade déjà
 *    calculée dans `derivePlanTimeline`) ;
 *  - alerte de retard inline `.galertbar` sur la barre en dépassement ;
 *  - légende `.gleg` (entrées effectivement rendues — pas de flèche/adresse, AR-2 différé).
 *
 * Différés (hors L20, AR-2) : couloirs-par-agent, flèches de relations, lane user.
 */
import { useTranslation } from "react-i18next";
import type { PlanTimeline, TaskBar } from "../hooks/derivePlanTimeline";

export interface GanttPanelProps {
  timeline: PlanTimeline;
}

/** Retire le préfixe d'estimation `[~5min] …` pour l'affichage (label/caption). */
function strip(content: string): string {
  return content.replace(/^\s*\[\s*~?\s*\d+\s*(?:h|min|m)\s*\]\s*/i, "");
}

/** Formate un instant epoch (ms) en horloge locale `HH:MM`. */
function clock(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Arrondit une durée (ms) en minutes entières (≥ 0). */
function minutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000));
}

export function GanttPanel({ timeline }: GanttPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { bars, minMs, nowMs } = timeline;

  const estimated = bars.filter((b) => b.estMs != null);
  const hasEstimates = estimated.length > 0;
  const started = bars.filter((b) => b.startMs != null);

  // Fin projetée = la plus tardive entre les fins prévues (baseline + estimé) et le réalisé.
  // AR-4 : l'axe s'étend jusque-là pour rendre le futur (ghost/wait) visible. SANS estimation,
  // axisMax retombe sur nowMs → curseur au bord droit = comportement #9a (non-régression).
  let projectedEnd = nowMs;
  for (const b of bars) {
    if (b.baselineStartMs != null && b.estMs != null) {
      projectedEnd = Math.max(projectedEnd, b.baselineStartMs + b.estMs);
    }
    if (b.endMs != null) projectedEnd = Math.max(projectedEnd, b.endMs);
  }
  const axisMax = Math.max(nowMs, projectedEnd);
  const range = Math.max(1, axisMax - minMs);
  const pct = (ms: number): number => ((ms - minMs) / range) * 100;

  // Baseline NON cascadée (place initiale prévue), dérivée localement des `estMs` réels — sert
  // à rendre le fantôme `.gghost` et à mesurer le décalage `.gslip` (slip = cascade − initiale).
  // Aucune donnée inventée : c'est la même chaîne que `derivePlanTimeline` SANS le dépassement.
  const planned = new Map<TaskBar, number>();
  {
    let cursor: number | null = null;
    for (const b of bars) {
      if (b.estMs == null) continue;
      if (cursor == null) cursor = b.startMs ?? minMs;
      planned.set(b, cursor);
      cursor += b.estMs;
    }
  }

  // Bandeau d'estimation (uniquement si des estimations existent).
  const totalEstMin = minutes(estimated.reduce((s, b) => s + (b.estMs ?? 0), 0));
  const overruns = bars.filter((b) => b.overrun).length;

  if (started.length === 0 && !hasEstimates) {
    return (
      <section className="gantt" aria-label={t("gantt.ariaLabel")}>
        <div className="gh">
          <span className="gt">{t("gantt.title")}</span>
        </div>
        <p className="gempty">{t("gantt.empty")}</p>
      </section>
    );
  }

  // Graduations de l'axe : 6 segments → 7 repères `HH:MM` sur [minMs … axisMax].
  const TICKS = 6;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const left = (i / TICKS) * 100;
    return { left, label: clock(minMs + (range * i) / TICKS), i };
  });

  const nowLeft = pct(nowMs);

  return (
    <section className="gantt" aria-label={t("gantt.ariaLabel")}>
      <div className="gh">
        <span className="gt">{t("gantt.title")}</span>
        {overruns > 0 && (
          <span className="galert">{t("gantt.overrun", { count: overruns })}</span>
        )}
      </div>

      {hasEstimates && (
        <div className="estban">
          <div className="who">{t("gantt.estimateTitle")}</div>
          <div className="est">
            {estimated.map((b, i) => (
              <span key={i}>
                <b>{strip(b.content)}</b> {minutes(b.estMs ?? 0)} min
              </span>
            ))}
            <span className="tot">
              · {t("gantt.totalPlanned", { min: totalEstMin })} ·{" "}
              {t("gantt.launchedAt", { time: clock(minMs) })}
            </span>
          </div>
        </div>
      )}

      <div className="gaxis">
        {ticks.map((tk) => (
          <div
            key={tk.i}
            className="tk"
            style={{
              left: `${tk.left}%`,
              transform:
                tk.i === 0
                  ? "none"
                  : tk.i === TICKS
                    ? "translateX(-100%)"
                    : undefined,
            }}
          >
            {tk.label}
            <i />
          </div>
        ))}
      </div>

      <div className="gbars">
        {/* Curseur « maintenant » traversant tous les couloirs. */}
        <div className="gnowwrap" aria-hidden>
          <div className="gnow" style={{ left: `${nowLeft}%` }}>
            <span className="lab">
              {t("gantt.now", { time: clock(nowMs) })}
            </span>
          </div>
        </div>

        {bars.map((b, i) => {
          const isStarted = b.startMs != null;
          const lane = b.overrun ? "glane alert" : "glane";

          // Tâche démarrée → barre riche.
          if (isStarted) {
            const start = b.startMs as number;
            const endMs = b.endMs ?? nowMs;
            const left = pct(start);
            const width = Math.max(1.5, pct(endMs) - left);
            // Frontière de la baseline DANS la barre (pour le débord rouge + marqueur prévu).
            const planEndAxis =
              b.estMs != null && b.baselineStartMs != null
                ? pct(b.baselineStartMs + b.estMs)
                : null;
            // Part « dans les temps » (verte) au sein de la barre, en % de la barre.
            const greenPct =
              planEndAxis != null && b.overrun
                ? Math.max(
                    0,
                    Math.min(100, ((planEndAxis - left) / width) * 100),
                  )
                : 100;
            const done = b.status === "completed";
            const overshootMin =
              b.estMs != null
                ? minutes(endMs - start - b.estMs)
                : null;
            return (
              <div key={i} className={lane}>
                <span className="glabel" title={b.content}>
                  {strip(b.content)}
                </span>
                <span className="gtrack">
                  <span
                    className={`gbar ${b.overrun ? "over" : done ? "done" : "run"}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <i
                      className={`fill ${done ? "done" : "run"}`}
                      style={{ width: `${greenPct}%` }}
                    />
                    {b.overrun && planEndAxis != null && (
                      <>
                        <i
                          className="fill ovf"
                          style={{
                            left: `${greenPct}%`,
                            width: `${Math.max(0, 100 - greenPct)}%`,
                          }}
                        />
                        <i className="planend" style={{ left: `${greenPct}%` }}>
                          <span className="pl">{t("gantt.planned")}</span>
                        </i>
                      </>
                    )}
                    <span className="cap">
                      {strip(b.content)}
                      {done ? " ✓" : ""}
                    </span>
                  </span>
                  {b.overrun && (
                    <span
                      className="galertbar"
                      style={{ left: `${Math.min(92, left + width)}%` }}
                    >
                      {overshootMin != null && overshootMin > 0
                        ? t("gantt.delayInline", { min: overshootMin })
                        : t("gantt.delayInlineBare")}
                    </span>
                  )}
                </span>
              </div>
            );
          }

          // Tâche à venir SANS estimation → pas de baseline (donnée honnête) : label seul.
          if (b.baselineStartMs == null || b.estMs == null) {
            return (
              <div key={i} className={lane}>
                <span className="glabel" title={b.content}>
                  {strip(b.content)}
                </span>
                <span className="gtrack" />
              </div>
            );
          }

          // Tâche à venir estimée → cascade : fantôme (place initiale) + case d'attente
          // (place cascadée) + connecteur de décalage si l'amont a glissé.
          const waitLeft = pct(b.baselineStartMs);
          const waitWidth = Math.max(1.5, pct(b.baselineStartMs + b.estMs) - waitLeft);
          const origMs = planned.get(b);
          const origLeft = origMs != null ? pct(origMs) : waitLeft;
          const slipMs = origMs != null ? b.baselineStartMs - origMs : 0;
          const showSlip = slipMs >= 60_000; // ≥ 1 min → décalage cascade visible
          return (
            <div key={i} className={lane}>
              <span className="glabel" title={b.content}>
                {strip(b.content)}
              </span>
              <span className="gtrack">
                {showSlip && (
                  <i
                    className="gghost"
                    style={{
                      left: `${origLeft}%`,
                      width: `${Math.max(1.5, pct((origMs as number) + b.estMs) - origLeft)}%`,
                    }}
                  />
                )}
                <i
                  className="gwait"
                  style={{ left: `${waitLeft}%`, width: `${waitWidth}%` }}
                >
                  <span className="gl">{strip(b.content)}</span>
                </i>
                {showSlip && (
                  <i
                    className="gslip"
                    style={{ left: `${origLeft}%`, width: `${waitLeft - origLeft}%` }}
                  >
                    <span className="gl">
                      {t("gantt.slip", { min: minutes(slipMs) })}
                    </span>
                  </i>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="gleg">
        <span>
          <i
            style={{
              background:
                "linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 70%, #fff))",
            }}
          />
          {t("gantt.legRealized")}
        </span>
        {hasEstimates && (
          <span>
            <i
              style={{
                border: "1.4px dashed color-mix(in srgb, var(--text-3) 45%, transparent)",
              }}
            />
            {t("gantt.legBaseline")}
          </span>
        )}
        {overruns > 0 && (
          <span>
            <i
              style={{
                background:
                  "repeating-linear-gradient(45deg, var(--red) 0 4px, color-mix(in srgb, var(--red) 78%, #fff) 4px 8px)",
              }}
            />
            {t("gantt.legOverrun")}
          </span>
        )}
        <span>
          <i style={{ width: "3px", background: "var(--red)" }} />
          {t("gantt.legNow")}
        </span>
        {hasEstimates && (
          <span>
            <i
              style={{
                height: 0,
                borderTop: "1.5px dotted var(--red)",
                borderRadius: 0,
              }}
            />
            {t("gantt.legCascade")}
          </span>
        )}
      </div>
    </section>
  );
}
