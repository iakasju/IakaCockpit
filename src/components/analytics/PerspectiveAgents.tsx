/**
 * PerspectiveAgents — V4 « Drill-down par agent » (L30-P1 + L30-P2, F3). Calque du mock
 * `analytics/v4.html`. Deux natures de donnée, honnêtes :
 *   - RÉEL (L30-P2) : **délégations par agent** (comptes + durées, via `tool_use "Agent"`/
 *     `"Task"` appariés) + **mix par modèle** (coût $ réel par modèle, marqueur « sans tarif »).
 *   - PLACEHOLDER/DÉMO (P3) : classement tokens/$ par agent nommé et répartition par projet —
 *     **pas de source réelle** (les sous-agents délégués tournent hors du transcript parent).
 * Présentationnel PUR : reçoit le modèle, tient l'état LOCAL de l'agent sélectionné.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyticsModel, AgentDatum } from "../../hooks/useAnalytics";
import { fmtTokens, fmtCost, fmtPct, fmtDurationMs } from "./format";
import { Placeholder } from "./Placeholder";

interface MixSlice {
  label: string;
  value: number;
  color: string;
}

/** Regroupe le roster par famille de runner (avant le « / ») → tokens. */
function runnerMix(agents: readonly AgentDatum[]): MixSlice[] {
  const by = new Map<string, { value: number; color: string }>();
  for (const a of agents) {
    const runner = a.runner.split("/")[0]?.trim() || a.runner;
    const cur = by.get(runner);
    if (cur) cur.value += a.tokens;
    else by.set(runner, { value: a.tokens, color: a.color });
  }
  return [...by.entries()]
    .map(([label, v]) => ({ label, value: v.value, color: v.color }))
    .sort((x, y) => y.value - x.value);
}

/** Regroupe le roster par modèle (après le « / ») → coût $ (si dispo, sinon tokens). */
function modelMix(agents: readonly AgentDatum[]): MixSlice[] {
  const by = new Map<string, { value: number; color: string }>();
  for (const a of agents) {
    const model = a.runner.split("/")[1]?.trim() || a.runner;
    const value = a.cost != null ? a.cost : a.tokens;
    const cur = by.get(model);
    if (cur) cur.value += value;
    else by.set(model, { value, color: a.color });
  }
  return [...by.entries()]
    .map(([label, v]) => ({ label, value: v.value, color: v.color }))
    .sort((x, y) => y.value - x.value);
}

/** Palette déterministe pour le mix par modèle réel (pas de couleur d'agent disponible). */
const MODEL_PALETTE = ["#3b82f6", "#30a46c", "#8e4ec6", "#f5a623", "#12a594", "#64748b"];

function MixBar({ slices }: { slices: readonly MixSlice[] }): JSX.Element {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="mixbar" aria-hidden>
      {slices.map((s) => (
        <div
          key={s.label}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
        >
          {s.value / total > 0.12 ? s.label : ""}
        </div>
      ))}
    </div>
  );
}

export function PerspectiveAgents({ model }: { model: AnalyticsModel }): JSX.Element {
  const { t } = useTranslation();
  const agents = model.perAgent;
  const deleg = model.perAgentDelegations;
  const modelCost = model.modelCost;
  const [selected, setSelected] = useState(0);

  const rmix = useMemo(() => (agents ? runnerMix(agents) : []), [agents]);
  const mmix = useMemo(() => (agents ? modelMix(agents) : []), [agents]);

  // Mix par modèle RÉEL (coût $ par modèle) — L30-P2. Couleurs de palette (pas d'agent lié).
  const realModelSlices = useMemo<MixSlice[]>(
    () =>
      (modelCost ?? [])
        .filter((m) => m.cost > 0)
        .map((m, i) => ({
          label: m.model,
          value: m.cost,
          color: MODEL_PALETTE[i % MODEL_PALETTE.length],
        })),
    [modelCost],
  );

  const hasAgents = agents != null && agents.length > 0;
  const max = hasAgents ? agents!.reduce((m, a) => Math.max(m, a.tokens), 1) : 1;
  const sel = hasAgents ? agents![Math.min(selected, agents!.length - 1)] : null;

  return (
    <div className="ana-persp">
      {/* Classement tokens/$ par agent — RÉEL (L30-P3) via `outputFile` là où dispo ; sinon
          démo (dev) ou note honnête (prod sans attribution). */}
      <div className="vcard">
        <div className="vh">
          <span className="vt">{t("analytics.leaderboard")}</span>
          <span className="vs">{t("analytics.leaderboardSub")}</span>
        </div>
        {hasAgents ? (
          <table className="lead">
            <thead>
              <tr>
                <th>{t("analytics.colAgent")}</th>
                <th>{t("analytics.colRunner")}</th>
                <th>{t("analytics.colTokens")}</th>
                <th className="r">{t("analytics.colCost")}</th>
                <th className="r">{t("analytics.colTurns")}</th>
                <th className="r">{t("analytics.colAvg")}</th>
              </tr>
            </thead>
            <tbody>
              {agents!.map((a, i) => (
                <tr
                  key={a.name}
                  className={i === selected ? "on" : ""}
                  onClick={() => setSelected(i)}
                >
                  <td>
                    <div className="acell">
                      <span className="asw" style={{ background: a.color }} aria-hidden />
                      <div>
                        <div className="nm">{a.name}</div>
                        <div className="rl">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="rchip">{a.runner}</span>
                  </td>
                  <td>
                    <div className="tkcell">
                      <div className="bar">
                        <i style={{ width: `${(a.tokens / max) * 100}%`, background: a.color }} />
                      </div>
                      <span className="v">{fmtTokens(a.tokens)}</span>
                    </div>
                  </td>
                  <td className="r costcell">
                    {a.cost == null ? "—" : a.cost === 0 ? t("analytics.free") : fmtCost(a.cost)}
                  </td>
                  <td className="r mono2">{a.turns ?? "—"}</td>
                  <td className="r mono2">{a.avgDuration ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Compaction : pas de gros skeleton — seulement la note honnête (POURQUOI tokens/$
             par agent n'ont pas de source). Réapparaîtra en table dès que le réel existe. */
          <p className="hypnote compact">{t("analytics.perAgentNoSource")}</p>
        )}
        {/* Honnêteté GRAVÉE (L30-P3) : délégations dont le transcript éphémère a expiré. */}
        {model.attributionUnavailable > 0 && (
          <p className="hypnote compact">
            {t("analytics.attributionUnavailable", {
              count: model.attributionUnavailable,
            })}
          </p>
        )}
      </div>

      {/* Délégations par agent — RÉEL (comptes + durées), L30-P2. */}
      {deleg && deleg.length > 0 && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.delegByAgent")}</span>
            <span className="vs">{t("analytics.delegByAgentSub")}</span>
          </div>
          <table className="lead">
            <thead>
              <tr>
                <th>{t("analytics.colAgent")}</th>
                <th className="r">{t("analytics.colDelegations")}</th>
                <th className="r">{t("analytics.colAvg")}</th>
              </tr>
            </thead>
            <tbody>
              {deleg.map((d) => (
                <tr key={d.agent}>
                  <td>
                    <div className="nm">{d.agent}</div>
                  </td>
                  <td className="r mono2">{d.count}</td>
                  <td className="r mono2">{fmtDurationMs(d.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mix par modèle — RÉEL (coût $ par modèle), L30-P2. */}
      {realModelSlices.length > 0 && (
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.modelCostTitle")}</span>
            <span className="vs">{t("analytics.modelCostSub")}</span>
          </div>
          <MixBar slices={realModelSlices} />
          <div className="mixkey">
            {realModelSlices.map((s) => (
              <div className="r" key={s.label}>
                <span className="sw" style={{ background: s.color }} />
                <span className="nm">{s.label}</span>
                <span className="pc">{fmtCost(s.value)}</span>
              </div>
            ))}
          </div>
          {model.untariffedModels.length > 0 && (
            <p className="hypnote">
              {t("analytics.untariffedNote", { models: model.untariffedModels.join(", ") })}
            </p>
          )}
        </div>
      )}

      {/* Détail agent sélectionné + mix roster — démo/P3 (attribution par NOM absente en prod). */}
      {hasAgents && sel && (
        <div className="drow">
          <div className="vcard">
            <div className="dethead">
              <span className="detsw" style={{ background: sel.color }} aria-hidden />
              <div>
                <div className="dn">{sel.name}</div>
                <div className="dr">
                  {sel.role} — {sel.runner}
                </div>
              </div>
              <span className="dtag">{t("analytics.selected")}</span>
            </div>
            <div className="detkpi">
              <div className="k">
                <div className="kl">{t("analytics.colTokens")}</div>
                <div className="kv">{fmtTokens(sel.tokens)}</div>
              </div>
              <div className="k">
                <div className="kl">{t("analytics.colCost")}</div>
                <div className="kv">
                  {sel.cost == null ? "—" : sel.cost === 0 ? t("analytics.free") : fmtCost(sel.cost)}
                </div>
              </div>
              <div className="k">
                <div className="kl">{t("analytics.colTurns")}</div>
                <div className="kv">{sel.turns ?? "—"}</div>
              </div>
              <div className="k">
                <div className="kl">{t("analytics.colAvg")}</div>
                <div className="kv">{sel.avgDuration ?? "—"}</div>
              </div>
            </div>
            <div className="eb detbreakhead">{t("analytics.perProjectBreakdown")}</div>
            {/* Répartition par projet d'un agent = attribution par NOM (P3) → placeholder honnête. */}
            <Placeholder lines={2} />
          </div>

          <div className="detmix">
            <div className="vcard">
              <div className="vh">
                <span className="vt">{t("analytics.runnerMix")}</span>
                <span className="vs">{t("analytics.tokensWord")}</span>
              </div>
              <MixBar slices={rmix} />
              <div className="mixkey">
                {rmix.map((s) => (
                  <div className="r" key={s.label}>
                    <span className="sw" style={{ background: s.color }} />
                    <span className="nm">{s.label}</span>
                    <span className="pc">{fmtTokens(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="vcard">
              <div className="vh">
                <span className="vt">{t("analytics.modelMix")}</span>
                <span className="vs">
                  {agents!.some((a) => a.cost != null) ? "$" : t("analytics.tokensWord")}
                </span>
              </div>
              <MixBar slices={mmix} />
              <div className="mixkey">
                {mmix.map((s) => {
                  const total = mmix.reduce((sum, x) => sum + x.value, 0) || 1;
                  return (
                    <div className="r" key={s.label}>
                      <span className="sw" style={{ background: s.color }} />
                      <span className="nm">{s.label}</span>
                      <span className="pc">{fmtPct(s.value / total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
