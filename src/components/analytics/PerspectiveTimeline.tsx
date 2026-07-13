/**
 * PerspectiveTimeline — V2 « Évolution dans le temps » (L30-P1, F3). Calque du mock
 * `analytics/v2.html` : callout de variation + courbe d'évolution des tokens (aire = total
 * portefeuille, réel) + coût cumulé + temps agent par jour. Présentationnel PUR : donnée
 * réelle (série jour) là où elle existe, placeholder honnête sinon.
 */
import { useTranslation } from "react-i18next";
import type { AnalyticsModel } from "../../hooks/useAnalytics";
import { fmtCost } from "./format";
import { SoonStrip, EmptyPerspective } from "./Placeholder";

function areaPath(values: readonly number[], w: number, h: number): { area: string; line: string } {
  if (values.length === 0) return { area: "", line: "" };
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 12) - 6] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return { area, line };
}

export function PerspectiveTimeline({ model }: { model: AnalyticsModel }): JSX.Element {
  const { t } = useTranslation();
  const { daily, variation, cumulativeCost, agentHours } = model;

  const evo = daily.length > 0 ? areaPath(daily.map((d) => d.tokens), 700, 200) : null;
  const cum = cumulativeCost ? areaPath(cumulativeCost, 320, 110) : null;
  const hoursMax = (agentHours ?? []).reduce((m, d) => Math.max(m, d.hours), 1);

  // Présence de donnée réelle par widget → rendu plein ; absence → compact / omis.
  const hasVariation = !!variation;
  const hasEvo = !!evo;
  const hasCum = !!cum;
  const hasHours = !!(agentHours && agentHours.length > 0);
  const anyWidget = hasVariation || hasEvo || hasCum || hasHours;

  const soon: string[] = [];
  if (!hasVariation) soon.push(t("analytics.variation"));
  if (!hasCum) soon.push(t("analytics.cumulativeCost"));
  if (!hasHours) soon.push(t("analytics.agentTimePerDay"));

  if (!anyWidget) {
    return (
      <div className="ana-persp">
        <EmptyPerspective />
      </div>
    );
  }

  return (
    <div className="ana-persp">
      {/* Callout de variation */}
      {hasVariation && (
        <div className="acallout">
          <div className="ci" aria-hidden>
            ⚠
          </div>
          <div>
            <div className="ct">{variation!.title}</div>
            <div className="cd">{variation!.body}</div>
          </div>
        </div>
      )}

      {/* Courbe d'évolution (centerpiece) */}
      {hasEvo && (
      <div className="vcard evochart">
        <div className="vh">
          <span className="vt">{t("analytics.evolution")}</span>
          <span className="vs">{t("analytics.evolutionSub")}</span>
        </div>
          <svg viewBox="0 0 700 220" width="100%" style={{ display: "block" }} aria-hidden>
            <path d={evo!.area} fill="rgba(var(--accent-rgb), 0.14)" />
            <path
              d={evo!.line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        <div className="evoleg">
          <span className="area">
            <i style={{ background: "var(--accent)" }} /> {t("analytics.totalPortfolio")}
          </span>
        </div>
      </div>
      )}

      {(hasCum || hasHours) && (
      <div className="agrid">
        {/* Coût cumulé */}
        {hasCum && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.cumulativeCost")}</span>
            {model.cost != null && <span className="vs">{fmtCost(model.cost)}</span>}
          </div>
            <svg viewBox="0 0 320 120" width="100%" style={{ display: "block" }} aria-hidden>
              <path d={cum!.area} fill="rgba(var(--accent-rgb), 0.2)" />
              <path
                d={cum!.line}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
        </div>
        )}

        {/* Temps agent par jour */}
        {hasHours && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.agentTimePerDay")}</span>
            {model.agentTime != null && <span className="vs">{model.agentTime}</span>}
          </div>
            <div className="abars">
              {agentHours!.map((d) => (
                <div className="col" key={d.date} title={`${d.date} · ${d.hours} h`}>
                  <div className="stk" style={{ height: `${(d.hours / hoursMax) * 110}px` }}>
                    <div className="in" style={{ height: "100%" }} />
                  </div>
                  <div className="lb">{d.date.slice(5)}</div>
                </div>
              ))}
            </div>
        </div>
        )}
      </div>
      )}
      <SoonStrip labels={soon} />
    </div>
  );
}
