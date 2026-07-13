/**
 * useAnalytics — agrégateur FRONT de la page Analytics (L30-P1). PUR : dérive un
 * `AnalyticsModel` à partir des données RÉELLES déjà chargées par App via la façade
 * (`portfolioEconomy` → `TreemapItem[]`, `portfolioActivity` → `ProjectActivity[]`),
 * filtrées par `scope` (ALL · portefeuille ou un projet) et `range` (plage de temps).
 *
 * Honnêteté GRAVÉE (garde « zéro fausse donnée ») : le hook n'expose du RÉEL que ce que la
 * donnée existante couvre — tokens par projet, tokens/jour, coordinateur vs délégués. Tout
 * ce qui n'a PAS encore de source réelle (coût $, attribution par agent nommé, comparaison
 * bi-période, séries de coût) est laissé à `null` → le widget rend un PLACEHOLDER honnête.
 * La démo dev-gardée (`makeDemoAnalytics`) fournit un modèle COMPLET pour la vitrine, jamais
 * substitué en prod.
 *
 * Aucun I/O ici (D7/D8) : App fait les `invoke` via les hooks façade et passe les tableaux.
 */
import { useMemo } from "react";
import type { TreemapItem } from "../components/TreemapPanel";
import type {
  ProjectActivity,
  AnalyticsCost,
  AgentDelegations,
} from "../api/backend";

/** Périmètre spécial « tout le portefeuille » (somme cross-projet). */
export const ALL_SCOPE = "ALL";

/** Préréglages de plage de temps. Défaut de la page = `7d` (7 jours → maintenant). */
export type RangePreset = "24h" | "7d" | "30d" | "custom";

/** Plage de temps résolue en bornes absolues (ms epoch). */
export interface TimeRange {
  preset: RangePreset;
  fromMs: number;
  toMs: number;
}

/**
 * Construit une plage à partir d'un préréglage ancré sur `now` (pas de `Date.now()` figé).
 * Pour `custom`, utilise les bornes fournies si présentes, sinon un défaut `now-14j → now`
 * (distinct du 7j pour rendre l'effet du sélecteur visible).
 */
export function rangeFromPreset(
  preset: RangePreset,
  now: number,
  custom?: { fromMs: number; toMs: number },
): TimeRange {
  const day = 86_400_000;
  if (preset === "custom") {
    if (custom && custom.fromMs < custom.toMs) {
      return { preset, fromMs: custom.fromMs, toMs: custom.toMs };
    }
    return { preset, fromMs: now - 14 * day, toMs: now };
  }
  const span = preset === "24h" ? day : preset === "30d" ? 30 * day : 7 * day;
  return { preset, fromMs: now - span, toMs: now };
}

/** Une entrée de la colonne « Périmètre » (ALL en tête, puis projets tri tokens desc). */
export interface PerimeterEntry {
  id: string;
  label: string;
  tokens: number;
  /** Largeur de barre 0..100 (ALL = 100 ; projet = tokens / top projet). */
  barPct: number;
  isAll: boolean;
}

/** Bucket jour de la série d'activité (tokens réels ; split entrée/sortie = démo seule). */
export interface DailyBucket {
  date: string;
  tokens: number;
  input: number | null;
  output: number | null;
}

/** Un acteur de la config (agent) — attribution par NOM = démo/P3, `null` en réel. */
export interface AgentDatum {
  name: string;
  role: string;
  runner: string;
  color: string;
  tokens: number;
  cost: number | null;
  share: number;
  turns: number | null;
  avgDuration: string | null;
}

/** RÉEL (L30-P2) : coût $ par modèle sur la plage — alimente le mix par modèle (V4). */
export interface ModelCostDatum {
  model: string;
  tokens: number;
  cost: number;
  /** Modèle sans tarif (coût non compté) — marqueur honnête. */
  untariffed: boolean;
}

/** RÉEL (L30-P2) : délégations d'un agent nommé (comptes + durées, PAS de tokens/$). */
export interface AgentDelegationDatum {
  agent: string;
  count: number;
  totalMs: number;
  avgMs: number;
}

/** Une délégation coûteuse (top V1) — coût $ = démo/P2. */
export interface TopDelegation {
  from: string;
  to: string;
  project: string;
  tokens: number;
  cost: number | null;
}

/** Une ligne de delta A→B (V3). */
export interface CompareDelta {
  label: string;
  a: string;
  b: string;
  chip: string;
  tone: "pos" | "neg" | "neu";
}

/** Un agent dans une config comparée (V3). */
export interface CompareAgent {
  name: string;
  runner: string;
  flag?: "new" | "chg";
}

/** Barre A vs B par agent (V3). */
export interface CompareAgentBar {
  name: string;
  color: string;
  aTokens: number | null;
  bTokens: number | null;
  note?: string;
}

/** Modèle de comparaison de config (V3). Deux scénarios : avant/après vs hypothèse. */
export interface CompareModel {
  aLabel: string;
  bLabel: string;
  aSummary: string;
  bSummary: string;
  aAgents: CompareAgent[];
  bAgents: CompareAgent[];
  deltas: CompareDelta[];
  perAgent: CompareAgentBar[];
  verdict: { title: string; body: string } | null;
  /** Scénario B « constaté vs hypothèse » : re-tarifage à volume constant (étiqueté). */
  hypothesis: {
    model: string;
    baseCost: number | null;
    altCost: number | null;
  } | null;
}

/** Modèle complet consommé par les 4 perspectives. `null` = pas de source réelle (placeholder). */
export interface AnalyticsModel {
  perimeter: PerimeterEntry[];
  scopeId: string;
  scopeLabel: string;
  /** RÉEL : total tokens du scope sur la plage (economy). */
  tokens: number | null;
  /** RÉEL : coordinateur vs délégués (economy coord/sub). */
  coordVsSub: { coord: number; sub: number } | null;
  /** RÉEL : tokens/jour du scope, filtré par plage (activity). */
  daily: DailyBucket[];
  /** Placeholder/démo : coût $ (P2). */
  cost: number | null;
  /** Placeholder/démo : temps agent cumulé. */
  agentTime: string | null;
  /** Placeholder/démo : nombre de délégations. */
  delegations: number | null;
  /** Placeholder/démo : attribution par agent nommé (P3). */
  perAgent: AgentDatum[] | null;
  /** Placeholder/démo : $ / jour (sparkline V1). */
  costTrend: number[] | null;
  /** Placeholder/démo : top délégations chères (V1). */
  topDelegations: TopDelegation[] | null;
  /** Placeholder/démo : callout de variation (V2). */
  variation: { title: string; body: string } | null;
  /** Placeholder/démo : coût cumulé sur la plage (V2). */
  cumulativeCost: number[] | null;
  /** Placeholder/démo : heures agent / jour (V2). */
  agentHours: { date: string; hours: number }[] | null;
  /** Placeholder/démo : comparaison de config (V3). */
  compare: CompareModel | null;
  /** RÉEL (L30-P2) : coût $ par modèle sur la plage — mix par modèle (V4). */
  modelCost: ModelCostDatum[] | null;
  /** RÉEL (L30-P2) : délégations par agent (comptes/durées, PAS tokens/$) — V4. */
  perAgentDelegations: AgentDelegationDatum[] | null;
  /** RÉEL (L30-P2) : modèles rencontrés SANS tarif (marqueur honnête, jamais un coût inventé). */
  untariffedModels: string[];
  /** RÉEL (L30-P2) : date de la table de prix (`pricing.json`), ou null (table embarquée). */
  pricedAt: string | null;
  /** Vrai si au moins une donnée RÉELLE de tokens existe (economy non vide). */
  hasRealData: boolean;
}

const ALL_LABEL = "ALL · portefeuille";

/** `YYYY-MM-DD` → ms (minuit local). Renvoie `NaN` si mal formé. */
function dateToMs(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return NaN;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

/**
 * Dérive le modèle Analytics RÉEL. Pur et déterministe (testable sans invoke).
 *
 * @param economy  coût par projet (miroir `ProjectEconomy` via `usePortfolioEconomy`).
 * @param activity tokens/jour/projet (`usePortfolioActivity`).
 * @param scope    `ALL_SCOPE` ou un id de projet.
 * @param range    bornes de temps (ms).
 * @param cost     coût $ RÉEL de la plage (L30-P2, `usePortfolioCost`) — déjà range-borné côté
 *                 Rust. `null`/absent → coût en placeholder/démo (garde « zéro fausse donnée »).
 * @param delegations délégations RÉELLES par agent (L30-P2, `useDelegationsByAgent`) — déjà
 *                 range-bornées côté Rust. `null`/absent → placeholder.
 */
export function deriveAnalytics(
  economy: readonly TreemapItem[],
  activity: readonly ProjectActivity[],
  scope: string,
  range: TimeRange,
  cost?: AnalyticsCost | null,
  delegations?: AgentDelegations[] | null,
): AnalyticsModel {
  // Périmètre : projets triés tokens desc + ALL (somme) en tête.
  const projects = [...economy].sort((a, b) => b.tokens - a.tokens);
  const allTokens = projects.reduce((s, p) => s + p.tokens, 0);
  const topTokens = projects.reduce((m, p) => Math.max(m, p.tokens), 0) || 1;

  const perimeter: PerimeterEntry[] = [
    {
      id: ALL_SCOPE,
      label: ALL_LABEL,
      tokens: allTokens,
      barPct: 100,
      isAll: true,
    },
    ...projects.map((p) => ({
      id: p.project,
      label: p.project,
      tokens: p.tokens,
      barPct: Math.round((p.tokens / topTokens) * 100),
      isAll: false,
    })),
  ];

  const isAll = scope === ALL_SCOPE;
  const scoped = isAll ? projects : projects.filter((p) => p.project === scope);
  const scopeLabel = isAll
    ? ALL_LABEL
    : (scoped[0]?.project ?? scope);

  // Coordinateur vs délégués : réel ALL-TIME (economy). C'est un RATIO (pas un KPI de tête),
  // laissé all-time car le split coord/sub PAR JOUR n'est pas disponible → alignement sur la
  // plage = P2. On ne le fabrique pas.
  const coord = scoped.reduce((s, p) => s + (p.coord ?? 0), 0);
  const sub = scoped.reduce((s, p) => s + (p.sub ?? 0), 0);
  const coordVsSub =
    scoped.length > 0 && coord + sub > 0 ? { coord, sub } : null;

  // Série jour : activité du scope, filtrée par plage, sommée par date.
  const inScope = (proj: string): boolean => isAll || proj === scope;
  const byDate = new Map<string, number>();
  for (const pa of activity) {
    if (!inScope(pa.project)) continue;
    for (const d of pa.days) {
      const ms = dateToMs(d.date);
      if (Number.isNaN(ms) || ms < range.fromMs || ms > range.toMs) continue;
      byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.tokens);
    }
  }
  const daily: DailyBucket[] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, tk]) => ({ date, tokens: tk, input: null, output: null }));

  // KPI tokens = tokens RÉELS DE LA PLAGE (dérivés de `daily`, déjà range-filtré), PAS
  // l'all-time de l'économie — pour que les 4 KPIs de tête réagissent ENSEMBLE au sélecteur
  // de plage. Si des données d'activité existent → somme de la fenêtre (peut valoir 0 =
  // honnête) ; sinon (hors-Tauri / aucune donnée) → null (démo en dev, placeholder en prod).
  const rangeTokens = daily.reduce((s, d) => s + d.tokens, 0);
  const tokens = activity.length > 0 ? rangeTokens : null;

  const hasRealData = allTokens > 0 || daily.length > 0;

  // --- Coût $ RÉEL (L30-P2) : déjà range-borné côté Rust. On n'affiche du réel que si la
  // source EXISTE (by_model / by_day non vides) → sinon placeholder honnête (jamais un $0
  // fabriqué). La série by_day (coût/jour) donne tendance (V1) et cumulé (V2).
  const costObj = cost ?? null;
  const hasCost = costObj != null && costObj.by_model.length > 0;
  const realCost = hasCost ? costObj!.cost_total : null;
  const hasDayCost = costObj != null && costObj.by_day.length > 0;
  const realCostTrend = hasDayCost ? costObj!.by_day.map((d) => d.cost) : null;
  let realCumulative: number[] | null = null;
  if (hasDayCost) {
    let run = 0;
    realCumulative = costObj!.by_day.map((d) => {
      run += d.cost;
      return run;
    });
  }
  const realModelCost: ModelCostDatum[] | null = hasCost
    ? costObj!.by_model.map((m) => ({
        model: m.model,
        tokens: m.tokens,
        cost: m.cost,
        untariffed: m.untariffed,
      }))
    : null;
  const untariffedModels = costObj?.untariffed_models ?? [];
  const pricedAt = costObj?.priced_at ?? null;

  // --- Délégations RÉELLES par agent (L30-P2) : comptes + durées seulement (pas tokens/$).
  const delg = delegations ?? null;
  const realDelegations = delg != null ? delg.reduce((s, d) => s + d.count, 0) : null;
  const realPerAgentDeleg: AgentDelegationDatum[] | null =
    delg != null && delg.length > 0
      ? delg.map((d) => ({
          agent: d.agent,
          count: d.count,
          totalMs: d.total_ms,
          avgMs: d.avg_ms,
        }))
      : null;

  return {
    perimeter,
    scopeId: scope,
    scopeLabel,
    tokens,
    coordVsSub,
    daily,
    // Coût $ RÉEL (L30-P2) là où la source existe ; sinon placeholder honnête.
    cost: realCost,
    costTrend: realCostTrend,
    cumulativeCost: realCumulative,
    modelCost: realModelCost,
    untariffedModels,
    pricedAt,
    // Délégations RÉELLES par agent (L30-P2) : KPI (somme) + par-agent (comptes/durées).
    delegations: realDelegations,
    perAgentDelegations: realPerAgentDeleg,
    // Toujours placeholder/démo (pas de source réelle propre) : temps agent, tokens/$ par
    // agent nommé, top délégations chères ($), callout de variation, heures/jour, compare.
    agentTime: null,
    perAgent: null,
    topDelegations: null,
    variation: null,
    agentHours: null,
    compare: null,
    hasRealData,
  };
}

/**
 * Fusion démo PAR CHAMP (recette L30-P1). Le RÉEL ne couvre que 3 champs (tokens, coordVsSub,
 * daily) ; sans fusion, dès qu'une seule donnée réelle existe (`hasRealData`), tout le reste
 * tombe en placeholder et la page paraît vide. Le cadrage P1 = « réel LÀ OÙ dispo + démo POUR
 * LE RESTE » (pas tout-ou-rien). Cette fonction PURE prend, champ par champ, la valeur RÉELLE
 * si elle existe, sinon la valeur DÉMO. Appelée UNIQUEMENT en démo dev (`demoOn`) → garde
 * « zéro fausse donnée » en prod (non appelée, `real` inchangé). `scopeId`/`scopeLabel` sont
 * réécrits par la vue ensuite ; on garde ici ceux de `real`.
 */
export function mergeDemo(real: AnalyticsModel, demo: AnalyticsModel): AnalyticsModel {
  return {
    perimeter: real.hasRealData ? real.perimeter : demo.perimeter,
    scopeId: real.scopeId,
    scopeLabel: real.scopeLabel,
    tokens: real.tokens ?? demo.tokens,
    coordVsSub: real.coordVsSub ?? demo.coordVsSub,
    daily: real.daily.length > 0 ? real.daily : demo.daily,
    cost: real.cost ?? demo.cost,
    agentTime: real.agentTime ?? demo.agentTime,
    delegations: real.delegations ?? demo.delegations,
    perAgent: real.perAgent ?? demo.perAgent,
    costTrend: real.costTrend ?? demo.costTrend,
    topDelegations: real.topDelegations ?? demo.topDelegations,
    variation: real.variation ?? demo.variation,
    cumulativeCost: real.cumulativeCost ?? demo.cumulativeCost,
    agentHours: real.agentHours ?? demo.agentHours,
    compare: real.compare ?? demo.compare,
    modelCost: real.modelCost ?? demo.modelCost,
    perAgentDelegations: real.perAgentDelegations ?? demo.perAgentDelegations,
    // Marqueurs RÉELS (jamais démo) : untariffed = fait réel, pricedAt vient du réel si présent.
    untariffedModels: real.untariffedModels,
    pricedAt: real.pricedAt ?? demo.pricedAt,
    hasRealData: real.hasRealData,
  };
}

/**
 * Hook Analytics : mémoïse la dérivation réelle. Les entrées viennent d'App (façade D7) ;
 * `scope`/`range` sont l'état local de la vue.
 */
export function useAnalytics(
  economy: readonly TreemapItem[],
  activity: readonly ProjectActivity[],
  scope: string,
  range: TimeRange,
  cost?: AnalyticsCost | null,
  delegations?: AgentDelegations[] | null,
): AnalyticsModel {
  return useMemo(
    () => deriveAnalytics(economy, activity, scope, range, cost, delegations),
    [economy, activity, scope, range, cost, delegations],
  );
}
