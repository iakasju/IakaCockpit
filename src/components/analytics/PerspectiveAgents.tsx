/**
 * PerspectiveAgents — V4 « Drill-down par agent » (L30-P1, F3). Calque du mock
 * `analytics/v4.html` : classement des agents (runner/modèle, tokens, coût, tours, durée
 * moy.) + fiche dépliée (KPIs + mix par runner + mix par modèle dérivés du roster). La
 * répartition par PROJET d'un agent exige l'attribution par agent nommé (P3) → placeholder
 * honnête. Attribution par NOM = démo/P3 : `perAgent === null` en prod → placeholder global.
 * Présentationnel PUR : reçoit le modèle, tient l'état LOCAL de l'agent sélectionné.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyticsModel, AgentDatum } from "../../hooks/useAnalytics";
import { fmtTokens, fmtCost, fmtPct } from "./format";
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
  const [selected, setSelected] = useState(0);

  const rmix = useMemo(() => (agents ? runnerMix(agents) : []), [agents]);
  const mmix = useMemo(() => (agents ? modelMix(agents) : []), [agents]);

  if (!agents || agents.length === 0) {
    return (
      <div className="ana-persp">
        <div className="vcard">
          <div className="vh">
            <span className="vt">{t("analytics.leaderboard")}</span>
          </div>
          <Placeholder />
        </div>
      </div>
    );
  }

  const max = agents.reduce((m, a) => Math.max(m, a.tokens), 1);
  const sel = agents[Math.min(selected, agents.length - 1)];

  return (
    <div className="ana-persp">
      <div className="vcard">
        <div className="vh">
          <span className="vt">{t("analytics.leaderboard")}</span>
          <span className="vs">{t("analytics.leaderboardSub")}</span>
        </div>
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
            {agents.map((a, i) => (
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
      </div>

      {/* Détail agent sélectionné + mix */}
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
                {agents.some((a) => a.cost != null) ? "$" : t("analytics.tokensWord")}
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
    </div>
  );
}
