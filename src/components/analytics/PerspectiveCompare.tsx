/**
 * PerspectiveCompare — V3 « Comparaison de config ». DEUX scénarios commutables :
 *   A · Avant/après CONSTATÉ (RÉEL) : deux périodes en regard (fenêtre précédente vs courante),
 *      deltas tokens/coût/coût-M/délégations/temps, tokens par agent A vs B, verdict dérivé.
 *   B · Constaté vs HYPOTHÈSE : re-tarifage des tokens OBSERVÉS (attribution B) sous un autre
 *      modèle — les tokens ne bougent PAS. TOUJOURS étiqueté « hypothèse · à volume constant ».
 * Présentationnel PUR (D8) : reçoit le `compare` RÉEL (composé par `useCompare`), la table de prix
 * et l'attribution B ; tient l'état LOCAL (scénario, override d'hypothèse). Démo en repli (dev).
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyticsModel, CompareAgent, CompareModel } from "../../hooks/useAnalytics";
import type { AgentAttribution, PricingTable } from "../../api/backend";
import { repriceHypothesis } from "../../hooks/compareModel";
import { fmtTokens, fmtCost } from "./format";
import { EmptyPerspective, Placeholder } from "./Placeholder";

type Scenario = "beforeAfter" | "hypothesis";
export type CompareWindow = "24h" | "7d" | "30d";

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

/** Scénario B RÉEL : override de modèle (source → cible) + re-tarifage des tokens observés. */
function HypothesisReal({
  attribB,
  pricing,
}: {
  attribB: AgentAttribution;
  pricing: PricingTable | null;
}): JSX.Element {
  const { t } = useTranslation();
  const fromOptions = useMemo(
    () => [...new Set(attribB.agents.map((a) => a.model).filter((m) => m))],
    [attribB],
  );
  const agentOptions = useMemo(
    () => [...new Set(attribB.agents.map((a) => a.agent))],
    [attribB],
  );
  const toOptions = pricing?.models.map((m) => m.model) ?? [];
  // Cible : « par modèle » (global) ou « par agent » nommé.
  const [mode, setMode] = useState<"global" | "agent">("global");
  const [fromModel, setFromModel] = useState(fromOptions[0] ?? "");
  const [agent, setAgent] = useState(agentOptions[0] ?? "");
  const [toModel, setToModel] = useState(toOptions[0] ?? "");
  const hyp = useMemo(
    () =>
      repriceHypothesis(
        attribB,
        pricing,
        mode === "agent" ? { agent, toModel } : { fromModel, toModel },
      ),
    [attribB, pricing, mode, agent, fromModel, toModel],
  );

  return (
    <div className="vcard hypcard">
      <div className="vh">
        <span className="vt">{t("analytics.hypothesisTitle")}</span>
      </div>
      {/* Étiquette d'honnêteté GRAVÉE : toujours présente sur ce scénario. */}
      <div className="hyplabel">{t("analytics.hypothesisLabel")}</div>

      {/* Cible : par modèle (global) ou par agent nommé. */}
      <div className="hypmode" role="group" aria-label={t("analytics.hypothesisMode")}>
        <button
          type="button"
          className={`btn xs${mode === "global" ? " accent" : ""}`}
          aria-pressed={mode === "global"}
          onClick={() => setMode("global")}
        >
          {t("analytics.hypothesisModeGlobal")}
        </button>
        <button
          type="button"
          className={`btn xs${mode === "agent" ? " accent" : ""}`}
          aria-pressed={mode === "agent"}
          onClick={() => setMode("agent")}
        >
          {t("analytics.hypothesisModeAgent")}
        </button>
      </div>

      {/* Override : remplacer (le modèle source | l'agent ciblé) par un modèle cible. */}
      <div className="hypover">
        <label className="hypsel">
          <span>
            {mode === "agent" ? t("analytics.hypothesisAgent") : t("analytics.hypothesisFrom")}
          </span>
          {mode === "agent" ? (
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {agentOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <select value={fromModel} onChange={(e) => setFromModel(e.target.value)}>
              {fromOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </label>
        <span className="dar" aria-hidden>
          →
        </span>
        <label className="hypsel">
          <span>{t("analytics.hypothesisTo")}</span>
          <select value={toModel} onChange={(e) => setToModel(e.target.value)}>
            {toOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hyp.baseCost != null ? (
        <div className="hyprow">
          <div className="hypcol">
            <div className="hl">{t("analytics.hypothesisObserved")}</div>
            <div className="hv">{fmtCost(hyp.baseCost)}</div>
          </div>
          <span className="dar" aria-hidden>
            →
          </span>
          <div className="hypcol">
            <div className="hl">{t("analytics.hypothesisReplan", { model: toModel })}</div>
            <div className="hv acc">
              {hyp.altCost != null ? fmtCost(hyp.altCost) : "—"}
            </div>
          </div>
        </div>
      ) : (
        <Placeholder lines={2} />
      )}

      {/* Honnêteté : agents non re-tarifés (prix source manquant) + délégations non attribuables. */}
      {hyp.notRepriced > 0 && (
        <p className="hypnote compact">
          {t("analytics.hypothesisNotRepriced", { count: hyp.notRepriced })}
        </p>
      )}
      {hyp.unavailable > 0 && (
        <p className="hypnote compact">
          {t("analytics.attributionUnavailable", { count: hyp.unavailable })}
        </p>
      )}
      <p className="hypnote">{t("analytics.hypothesisNote")}</p>
    </div>
  );
}

/** Scénario B en DÉMO (dev) : re-tarifage figé (pas d'attribution réelle). */
function HypothesisDemo({ cmp }: { cmp: CompareModel }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="vcard hypcard">
      <div className="vh">
        <span className="vt">{t("analytics.hypothesisTitle")}</span>
      </div>
      <div className="hyplabel">{t("analytics.hypothesisLabel")}</div>
      {cmp.hypothesis && cmp.hypothesis.baseCost != null && cmp.hypothesis.altCost != null ? (
        <div className="hyprow">
          <div className="hypcol">
            <div className="hl">{t("analytics.hypothesisObserved")}</div>
            <div className="hv">{fmtCost(cmp.hypothesis.baseCost)}</div>
          </div>
          <span className="dar" aria-hidden>
            →
          </span>
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
  );
}

export function PerspectiveCompare({
  model,
  compare = null,
  attribB = null,
  pricing = null,
  window: win = "7d",
  onWindow,
}: {
  model: AnalyticsModel;
  /** Comparaison RÉELLE (composée par `useCompare`) ; à défaut, la démo (`model.compare`). */
  compare?: CompareModel | null;
  /** Attribution par agent de la période B — base du re-tarifage d'hypothèse (V3-B réel). */
  attribB?: AgentAttribution | null;
  pricing?: PricingTable | null;
  /** Fenêtre de comparaison (précédente vs courante). */
  window?: CompareWindow;
  onWindow?: (w: CompareWindow) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState<Scenario>("beforeAfter");
  // RÉEL prioritaire ; sinon démo (dev). `null` des deux → placeholder honnête.
  const cmp = compare ?? model.compare;
  const hasRealHypothesis = attribB != null && attribB.agents.length > 0;

  if (!cmp && !hasRealHypothesis) {
    return (
      <div className="ana-persp">
        <EmptyPerspective reason={t("analytics.emptyCompareReason")} />
      </div>
    );
  }

  return (
    <div className="ana-persp">
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
        !cmp ? (
          <EmptyPerspective reason={t("analytics.emptyCompareReason")} />
        ) : (
          <>
            {/* Fenêtre de comparaison (précédente vs courante). */}
            {onWindow && (
              <div className="cmpwin" role="group" aria-label={t("analytics.compareWindow")}>
                <span className="cmpwin-lab">{t("analytics.compareWindow")}</span>
                {(["24h", "7d", "30d"] as const).map((w) => (
                  <button
                    type="button"
                    key={w}
                    className={`btn xs${win === w ? " accent" : ""}`}
                    aria-pressed={win === w}
                    onClick={() => onWindow(w)}
                  >
                    {t(`analytics.preset.${w}`)}
                  </button>
                ))}
              </div>
            )}

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
        )
      ) : hasRealHypothesis ? (
        <HypothesisReal attribB={attribB!} pricing={pricing} />
      ) : cmp ? (
        <HypothesisDemo cmp={cmp} />
      ) : (
        <EmptyPerspective reason={t("analytics.emptyCompareReason")} />
      )}
    </div>
  );
}
