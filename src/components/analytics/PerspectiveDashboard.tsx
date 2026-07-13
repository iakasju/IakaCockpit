/**
 * PerspectiveDashboard — V1 « Tableau de bord KPI-first » (L30-P1, F3). Calque du mock
 * `analytics/v1.html` : bandeau 4 KPIs (tokens / coût / temps / délégations) + tokens par
 * agent (treemap) + part d'activité + tokens par jour (barres entrée/sortie) + tendance du
 * coût (sparkline) + top délégations chères. Présentationnel PUR : reçoit le modèle, rend la
 * donnée réelle là où elle existe, un PLACEHOLDER honnête sinon (garde « zéro fausse donnée »).
 */
import { useTranslation } from "react-i18next";
import type { AnalyticsModel } from "../../hooks/useAnalytics";
import { fmtTokens, fmtCost, fmtPct } from "./format";
import { SoonStrip, EmptyPerspective } from "./Placeholder";

/** Génère un `<path>` de sparkline (aire + ligne) depuis une série de valeurs. */
function sparkPath(values: readonly number[], w: number, h: number): { area: string; line: string } {
  if (values.length === 0) return { area: "", line: "" };
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 8) - 4] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return { area, line };
}

export function PerspectiveDashboard({ model }: { model: AnalyticsModel }): JSX.Element {
  const { t } = useTranslation();
  const { perAgent, daily, costTrend, topDelegations } = model;

  const dailyMax = daily.reduce((m, d) => Math.max(m, d.tokens), 1);
  const agentMax = (perAgent ?? []).reduce((m, a) => Math.max(m, a.tokens), 1);
  const spark = costTrend ? sparkPath(costTrend, 320, 96) : null;

  // KPI bar : uniquement les indicateurs qui portent une valeur RÉELLE. Un KPI `null`
  // (ex. temps agent sans source) n'est PAS rendu — pas de grande carte vide (compaction).
  const kpis = [
    model.tokens != null && {
      label: t("analytics.kpi.tokens"),
      value: fmtTokens(model.tokens),
      sub: t("analytics.kpi.tokensSub"),
    },
    model.cost != null && {
      label: t("analytics.kpi.cost"),
      value: fmtCost(model.cost),
      sub: t("analytics.kpi.costSub"),
    },
    model.delegations != null && {
      label: t("analytics.kpi.delegations"),
      value: String(model.delegations),
      sub: t("analytics.kpi.delegationsSub"),
    },
    model.agentTime != null && {
      label: t("analytics.kpi.time"),
      value: model.agentTime,
      sub: t("analytics.kpi.timeSub"),
    },
  ].filter((k): k is { label: string; value: string; sub: string } => !!k);

  // Présence de donnée réelle par widget → rendu plein ; absence → listé « à venir » (compact).
  const hasPerAgent = !!(perAgent && perAgent.length > 0);
  const hasDaily = daily.length > 0;
  const hasCostTrend = !!(spark && costTrend);
  const hasTop = !!(topDelegations && topDelegations.length > 0);
  const anyWidget = hasPerAgent || hasDaily || hasCostTrend || hasTop;

  const soon: string[] = [];
  if (!hasPerAgent) {
    soon.push(t("analytics.tokensByAgent"), t("analytics.activityShare"));
  }
  if (!hasDaily) soon.push(t("analytics.tokensPerDay"));
  if (!hasCostTrend) soon.push(t("analytics.costTrend"));
  if (!hasTop) soon.push(t("analytics.topDelegations"));

  return (
    <div className="ana-persp">
      {/* Bandeau KPI — rendu seulement s'il reste au moins un indicateur réel. */}
      {kpis.length > 0 && (
        <div className="kpibar" role="group" aria-label={t("analytics.kpis")}>
          {kpis.map((k) => (
            <div className="k" key={k.label}>
              <div className="kl">{k.label}</div>
              <div className="kv">{k.value}</div>
              <div className="kd">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {kpis.length === 0 && !anyWidget && <EmptyPerspective />}

      {anyWidget && (
      <div className="agrid">
        {/* Tokens par agent (treemap) */}
        {hasPerAgent && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.tokensByAgent")}</span>
            <span className="vs">{t("analytics.tokensByAgentSub")}</span>
          </div>
            <div className="atmap">
              {perAgent!.map((a) => (
                <div
                  key={a.name}
                  className="atcell"
                  style={{ width: `${30 + (a.tokens / agentMax) * 34}%`, background: a.color }}
                  title={`${a.name} · ${fmtTokens(a.tokens)}`}
                >
                  <span className="atnm">{a.name}</span>
                  <span className="atv">
                    {fmtTokens(a.tokens)} · {fmtPct(a.share)}
                    <br />
                    <small>{a.role}</small>
                  </span>
                </div>
              ))}
            </div>
        </div>
        )}

        {/* Part d'activité */}
        {hasPerAgent && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.activityShare")}</span>
            {model.delegations != null && (
              <span className="vs">
                {model.delegations} {t("analytics.delegationsWord")}
              </span>
            )}
          </div>
              <div className="ashare" aria-hidden>
                {perAgent!.map((a) => (
                  <div key={a.name} style={{ width: `${a.share * 100}%`, background: a.color }} />
                ))}
              </div>
              <div className="asharekey">
                {perAgent!.slice(0, 5).map((a) => (
                  <div className="r" key={a.name}>
                    <span className="sw" style={{ background: a.color }} />
                    <span className="nm">{a.name}</span>
                    <span className="rl">{a.runner}</span>
                    <span className="pc">{fmtPct(a.share)}</span>
                  </div>
                ))}
              </div>
        </div>
        )}

        {/* Tokens par jour (barres entrée/sortie) */}
        {hasDaily && (
        <div className="vcard span2">
          <div className="vh">
            <span className="vt">{t("analytics.tokensPerDay")}</span>
            <span className="vs">{t("analytics.tokensPerDaySub")}</span>
          </div>
            <div className="abars">
              {daily.map((d) => {
                const total = d.tokens;
                const h = (total / dailyMax) * 130;
                const inRatio = d.input != null && total > 0 ? d.input / total : 1;
                return (
                  <div className="col" key={d.date} title={`${d.date} · ${fmtTokens(total)}`}>
                    <div className="stk" style={{ height: `${h}px` }}>
                      {d.output != null && (
                        <div className="out" style={{ height: `${(1 - inRatio) * 100}%` }} />
                      )}
                      <div className="in" style={{ height: `${inRatio * 100}%` }} />
                    </div>
                    <div className="lb">{d.date.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          {daily.some((d) => d.input != null) && (
            <div className="legend2 analeg">
              <span>
                <i className="in" /> {t("analytics.legendInput")}
              </span>
              <span>
                <i className="out" /> {t("analytics.legendOutput")}
              </span>
            </div>
          )}
        </div>
        )}

        {/* Tendance du coût (sparkline) */}
        {hasCostTrend && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.costTrend")}</span>
            <span className="vs">{t("analytics.costTrendSub")}</span>
          </div>
            <svg viewBox="0 0 320 96" width="100%" style={{ display: "block" }} aria-hidden>
              <path d={spark!.area} fill="rgba(var(--accent-rgb), 0.16)" />
              <path
                d={spark!.line}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
        </div>
        )}

        {/* Top délégations chères */}
        {hasTop && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.topDelegations")}</span>
            <span className="vs">{t("analytics.topDelegationsSub")}</span>
          </div>
            <table className="deltbl">
              <tbody>
                {topDelegations!.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <div className="pair">
                        {d.from} <span className="ar">→</span> {d.to}
                      </div>
                      <span className="pj">{d.project}</span>
                    </td>
                    <td>
                      <div className="cost">{d.cost != null ? fmtCost(d.cost) : "—"}</div>
                      <div className="tk">{fmtTokens(d.tokens)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        )}
      </div>
      )}
      {(anyWidget || kpis.length > 0) && <SoonStrip labels={soon} />}
    </div>
  );
}
