/**
 * useCompare — V3 « Comparaison » : compose un `CompareModel` RÉEL (avant/après constaté) à partir
 * de DEUX plages A et B, scopées par projet (comme le reste d'Analytics). Réutilise les hooks façade
 * existants (coût / attribution / délégations) avec des bornes explicites A et B, puis `deriveAnalytics`
 * (coordinateur inclus) pour obtenir deux modèles réels, et `computeCompareStats` pour les deltas.
 * Range + scope-aware ; passe par l'index précalculé → rapide. `usePricingTable` fournit la table de
 * prix (V3-B). Zéro fausse donnée : pas de données réelles → `compare = null` (placeholder honnête).
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TreemapItem } from "../components/TreemapPanel";
import {
  backend,
  type Backend,
  type ProjectActivity,
  type AgentAttribution,
  type PricingTable,
} from "../api/backend";
import {
  deriveAnalytics,
  ALL_SCOPE,
  type TimeRange,
  type CompareModel,
  type CompareDelta,
  type CompareAgent,
} from "./useAnalytics";
import { usePortfolioCost } from "./usePortfolioCost";
import { useDelegationsByAgent } from "./useDelegationsByAgent";
import { useAgentAttribution } from "./useAgentAttribution";
import {
  computeCompareStats,
  pctChange,
  toneFor,
  type CompareStat,
} from "./compareModel";
import {
  fmtTokens,
  fmtCost,
  fmtDurationMs,
  fmtRangeLabel,
} from "../components/analytics/format";

/** Table de prix (fetch unique). Hors-Tauri / échec → `null`. */
export function usePricingTable(api: Backend = backend): PricingTable | null {
  const [table, setTable] = useState<PricingTable | null>(null);
  useEffect(() => {
    if (!api.isTauri()) {
      setTable(null);
      return;
    }
    let alive = true;
    api
      .pricingTable()
      .then((t) => {
        if (alive) setTable(t);
      })
      .catch(() => {
        if (alive) setTable(null);
      });
    return () => {
      alive = false;
    };
  }, [api]);
  return table;
}

/** Chip de variation « ↑/↓ X% » depuis une stat (vide si non calculable). */
function chipFor(stat: CompareStat): string {
  const p = pctChange(stat.a, stat.b);
  if (p == null || Math.abs(p) < 0.005) return "=";
  const arrow = p > 0 ? "↑" : "↓";
  return `${arrow} ${Math.round(Math.abs(p) * 100)}%`;
}

/** Formate la valeur d'une stat selon sa nature (tokens / $ / nombre / durée). */
function fmtStatValue(key: CompareStat["key"], v: number | null, locale: string): string {
  if (v == null) return "—";
  switch (key) {
    case "tokens":
      return fmtTokens(v);
    case "cost":
    case "costPerM":
      return fmtCost(v);
    case "delegations":
      return v.toLocaleString(locale);
    case "time":
      return fmtDurationMs(v);
  }
}

export interface UseCompareResult {
  /** Modèle de comparaison RÉEL A vs B, ou `null` si aucune donnée réelle sur les deux plages. */
  compare: CompareModel | null;
  /** Attribution par agent de la période B (base du re-tarifage d'hypothèse V3-B). */
  attribB: AgentAttribution | null;
}

export function useCompare(
  economy: readonly TreemapItem[],
  activity: readonly ProjectActivity[],
  scope: string,
  rangeA: TimeRange,
  rangeB: TimeRange,
  coordinatorNameOf: (project: string) => string,
  readyToken?: unknown,
  locale = "fr",
): UseCompareResult {
  const { t } = useTranslation();
  const projectScope = scope === ALL_SCOPE ? undefined : scope;

  const costA = usePortfolioCost(rangeA.fromMs, rangeA.toMs, projectScope);
  const delegA = useDelegationsByAgent(rangeA.fromMs, rangeA.toMs, projectScope);
  const attribA = useAgentAttribution(rangeA.fromMs, rangeA.toMs, projectScope, undefined, readyToken);
  const costB = usePortfolioCost(rangeB.fromMs, rangeB.toMs, projectScope);
  const delegB = useDelegationsByAgent(rangeB.fromMs, rangeB.toMs, projectScope);
  const attribB = useAgentAttribution(rangeB.fromMs, rangeB.toMs, projectScope, undefined, readyToken);

  const modelA = useMemo(
    () => deriveAnalytics(economy, activity, scope, rangeA, costA, delegA, attribA, coordinatorNameOf),
    [economy, activity, scope, rangeA, costA, delegA, attribA, coordinatorNameOf],
  );
  const modelB = useMemo(
    () => deriveAnalytics(economy, activity, scope, rangeB, costB, delegB, attribB, coordinatorNameOf),
    [economy, activity, scope, rangeB, costB, delegB, attribB, coordinatorNameOf],
  );

  const compare = useMemo<CompareModel | null>(() => {
    // Réel requis sur au moins une des deux périodes (sinon placeholder honnête).
    const hasReal =
      modelA.tokens != null ||
      modelA.cost != null ||
      modelB.tokens != null ||
      modelB.cost != null;
    if (!hasReal) return null;

    const { stats, perAgent } = computeCompareStats(modelA, modelB);
    const deltas: CompareDelta[] = stats.map((s) => ({
      label: t(`analytics.deltaLabel.${s.key}`),
      a: fmtStatValue(s.key, s.a, locale),
      b: fmtStatValue(s.key, s.b, locale),
      chip: chipFor(s),
      tone: toneFor(s),
    }));

    // Listes d'agents A/B (nom + modèle) ; flag « + ajout » pour un agent présent en B, pas en A.
    const namesA = new Set((modelA.perAgent ?? []).map((a) => a.name));
    const toAgent = (a: { name: string; runner: string }): CompareAgent => ({
      name: a.name,
      runner: a.runner,
    });
    const aAgents: CompareAgent[] = (modelA.perAgent ?? []).map(toAgent);
    const bAgents: CompareAgent[] = (modelB.perAgent ?? []).map((a) => ({
      ...toAgent(a),
      ...(namesA.has(a.name) ? {} : { flag: "new" as const }),
    }));

    // Verdict HONNÊTE dérivé des deltas (jamais de texte au-delà des chiffres réels).
    const costM = stats.find((s) => s.key === "costPerM")!;
    const tok = stats.find((s) => s.key === "tokens")!;
    const pCostM = pctChange(costM.a, costM.b);
    const pTok = pctChange(tok.a, tok.b);
    const verdict =
      pCostM != null
        ? {
            title:
              pCostM < 0
                ? t("analytics.verdictBetter")
                : pCostM > 0
                  ? t("analytics.verdictWorse")
                  : t("analytics.verdictStable"),
            body: t("analytics.verdictBody", {
              tokens: pTok != null ? `${pTok > 0 ? "+" : ""}${Math.round(pTok * 100)}%` : "—",
              costPerM: `${pCostM > 0 ? "+" : ""}${Math.round(pCostM * 100)}%`,
            }),
          }
        : null;

    return {
      aLabel: fmtRangeLabel(rangeA.fromMs, rangeA.toMs, locale),
      bLabel: fmtRangeLabel(rangeB.fromMs, rangeB.toMs, locale),
      aSummary: t("analytics.configSummary", { count: aAgents.length }),
      bSummary: t("analytics.configSummary", { count: bAgents.length }),
      aAgents,
      bAgents,
      deltas,
      perAgent,
      verdict,
      hypothesis: null,
    };
  }, [modelA, modelB, rangeA, rangeB, t, locale]);

  return { compare, attribB };
}
