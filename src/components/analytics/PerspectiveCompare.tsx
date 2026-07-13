/**
 * PerspectiveCompare — V3 « Comparaison de config » (L30-P1, F3). Calque du mock
 * `analytics/v3.html` + arbitrage AR-6 : DEUX scénarios commutables —
 *   A · Avant/après CONSTATÉ : deux périodes réelles en regard, deltas, tokens par agent A vs B.
 *   B · Constaté vs HYPOTHÈSE : re-tarifage des tokens observés sous un autre modèle, TOUJOURS
 *      étiqueté « hypothèse · à volume constant » (honnêteté gravée — jamais une mesure).
 * En P1, la donnée de comparaison vit en démo/placeholder (backend bi-période = P2/P3).
 * Présentationnel PUR : reçoit le modèle, tient l'état LOCAL du scénario.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyticsModel, CompareAgent } from "../../hooks/useAnalytics";
import { fmtTokens, fmtCost } from "./format";
import { EmptyPerspective, Placeholder } from "./Placeholder";

type Scenario = "beforeAfter" | "hypothesis";

function AgentList({ agents }: { agents: readonly CompareAgent[] }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="aglist">
      {agents.map((a, i) => (
        <div className="agrow" key={`${a.name}-${i}`}>
          <span className="an">{a.name}</span>
          {a.flag && (
            <span className={`flag ${a.flag}`}>
              {a.flag === "new" ? t("analytics.flagNew") : t("analytics.flagChg")}
            </span>
          )}
          <span className="rm">{a.runner}</span>
        </div>
      ))}
    </div>
  );
}

export function PerspectiveCompare({ model }: { model: AnalyticsModel }): JSX.Element {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState<Scenario>("beforeAfter");
  const cmp = model.compare;

  // Comparaison bi-période = pas de source réelle (backend à venir). Plutôt qu'un layout de
  // cartes vides (double période / configs / deltas), un unique bloc compact honnête.
  if (!cmp) {
    return (
      <div className="ana-persp">
        <EmptyPerspective reason={t("analytics.emptyCompareReason")} />
      </div>
    );
  }

  return (
    <div className="ana-persp">
      {/* Sélecteur de scénario A/B (toujours affiché : l'UX des deux) */}
      <div className="scenpick" role="tablist" aria-label={t("analytics.scenario")}>
        <button
          type="button"
          role="tab"
          aria-selected={scenario === "beforeAfter"}
          className={scenario === "beforeAfter" ? "on" : ""}
          onClick={() => setScenario("beforeAfter")}
        >
          {t("analytics.scenarioBeforeAfter")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scenario === "hypothesis"}
          className={scenario === "hypothesis" ? "on" : ""}
          onClick={() => setScenario("hypothesis")}
        >
          {t("analytics.scenarioHypothesis")}
        </button>
      </div>

      {scenario === "beforeAfter" ? (
        <>
          {/* Double période */}
          <div className="cmpbar">
            <div className="perpick a">
              <span className="tag">{t("analytics.periodA")}</span>
              <span className="rg">{cmp.aLabel}</span>
            </div>
            <span className="vsword">{t("analytics.vs")}</span>
            <div className="perpick b">
              <span className="tag">{t("analytics.periodB")}</span>
              <span className="rg">{cmp.bLabel}</span>
            </div>
          </div>

          {/* Deux configs */}
          <div className="cfgrow">
            <div className="cfgcard a">
              <div className="ch">
                <span className="tag">{t("analytics.configA")}</span>
              </div>
              <div className="cmeta">{cmp.aSummary}</div>
              <AgentList agents={cmp.aAgents} />
            </div>
            <div className="cfgcard b">
              <div className="ch">
                <span className="tag">{t("analytics.configB")}</span>
              </div>
              <div className="cmeta">{cmp.bSummary}</div>
              <AgentList agents={cmp.bAgents} />
            </div>
          </div>

          {/* Deltas */}
          <div className="dmets">
            {cmp.deltas.map((d) => (
              <div className="dmet" key={d.label}>
                <div className="dl">{d.label}</div>
                <div className="dv">
                  <span className="da">{d.a}</span>
                  <span className="dar">→</span>
                  <span className="db">{d.b}</span>
                </div>
                <span className={`dchip ${d.tone}`}>{d.chip}</span>
              </div>
            ))}
          </div>

          {/* Tokens par agent A vs B */}
          <div className="vcard" style={{ marginTop: "18px" }}>
            <div className="vh">
              <span className="vt">{t("analytics.tokensByAgentAB")}</span>
              <span className="vs">{t("analytics.tokensByAgentABSub")}</span>
            </div>
            <div className="hbars">
              {cmp.perAgent.map((a) => {
                const max = Math.max(a.aTokens ?? 0, a.bTokens ?? 0, 1);
                return (
                  <div className="hb" key={a.name}>
                    <div className="hlab">{a.name}</div>
                    <div className="hcol">
                      <div className="row">
                        <div className="t a" style={{ width: `${((a.aTokens ?? 0) / max) * 100}%` }} />
                        <span className="lg">
                          A {a.aTokens != null ? fmtTokens(a.aTokens) : "—"}
                        </span>
                      </div>
                      <div className="row">
                        <div
                          className="t"
                          style={{ width: `${((a.bTokens ?? 0) / max) * 100}%`, background: a.color }}
                        />
                        <span className="k">
                          B {a.bTokens != null ? fmtTokens(a.bTokens) : "—"}
                          {a.note ? ` · ${a.note}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verdict */}
          {cmp.verdict && (
            <div className="averdict">
              <div className="vi" aria-hidden>
                ✓
              </div>
              <div>
                <div className="vt">{cmp.verdict.title}</div>
                <div className="vd">{cmp.verdict.body}</div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Scénario B — constaté vs hypothèse (re-tarifage à volume constant) */
        <div className="vcard hypcard">
          <div className="vh">
            <span className="vt">{t("analytics.hypothesisTitle")}</span>
          </div>
          {/* Étiquette d'honnêteté GRAVÉE : toujours présente. */}
          <div className="hyplabel">{t("analytics.hypothesisLabel")}</div>
          {cmp.hypothesis && cmp.hypothesis.baseCost != null && cmp.hypothesis.altCost != null ? (
            <div className="hyprow">
              <div className="hypcol">
                <div className="hl">{t("analytics.hypothesisObserved")}</div>
                <div className="hv">{fmtCost(cmp.hypothesis.baseCost)}</div>
              </div>
              <span className="dar">→</span>
              <div className="hypcol">
                <div className="hl">
                  {t("analytics.hypothesisReplan", { model: cmp.hypothesis.model })}
                </div>
                <div className="hv acc">{fmtCost(cmp.hypothesis.altCost)}</div>
              </div>
            </div>
          ) : (
            <Placeholder lines={2} />
          )}
          <p className="hypnote">{t("analytics.hypothesisNote")}</p>
        </div>
      )}
    </div>
  );
}
