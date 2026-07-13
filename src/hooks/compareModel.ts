/**
 * compareModel — helpers PURS de la perspective V3 « Comparaison » (testables sans React/i18n).
 *   - V3-A (constaté) : `computeCompareStats` dérive les stats A vs B (tokens / coût / coût-M /
 *     délégations / temps) + les barres par agent, depuis DEUX `AnalyticsModel` réels.
 *   - V3-B (hypothèse) : `repriceHypothesis` re-tarife les tokens OBSERVÉS d'une période sous un
 *     autre modèle (les tokens ne bougent PAS) via la table de prix. Étiqueté « hypothèse ».
 * Zéro fausse donnée : rien n'est re-tarifé sans attribution réelle ; modèle cible sans prix → null.
 */
import type { AnalyticsModel, CompareAgentBar } from "./useAnalytics";
import type { AgentAttribution, PricingTable } from "../api/backend";

/** Une statistique comparée A→B (numérique pur ; le formatage/label i18n vit dans `useCompare`). */
export interface CompareStat {
  key: "tokens" | "cost" | "costPerM" | "delegations" | "time";
  a: number | null;
  b: number | null;
  /** Sens « mieux » : coût/temps → baisse = bien ; volume (tokens/délégations) → neutre. */
  lowerIsBetter: boolean;
}

export interface CompareStats {
  stats: CompareStat[];
  perAgent: CompareAgentBar[];
}

/** Somme des durées de délégation (ms) d'un modèle — `null` si pas de source réelle. */
function sumTimeMs(m: AnalyticsModel): number | null {
  const d = m.perAgentDelegations;
  if (d == null) return null;
  return d.reduce((s, x) => s + x.totalMs, 0);
}

/** Coût par million de tokens ($/M) — `null` si coût ou tokens absents/0. */
export function costPerM(cost: number | null, tokens: number | null): number | null {
  if (cost == null || tokens == null || tokens === 0) return null;
  return (cost / tokens) * 1_000_000;
}

/** Dérive les stats A vs B + les barres par agent (coordinateur inclus via `perAgent`). PUR. */
export function computeCompareStats(
  a: AnalyticsModel,
  b: AnalyticsModel,
): CompareStats {
  const stats: CompareStat[] = [
    { key: "tokens", a: a.tokens, b: b.tokens, lowerIsBetter: false },
    { key: "cost", a: a.cost, b: b.cost, lowerIsBetter: true },
    {
      key: "costPerM",
      a: costPerM(a.cost, a.tokens),
      b: costPerM(b.cost, b.tokens),
      lowerIsBetter: true,
    },
    { key: "delegations", a: a.delegations, b: b.delegations, lowerIsBetter: false },
    { key: "time", a: sumTimeMs(a), b: sumTimeMs(b), lowerIsBetter: true },
  ];

  // Barres par agent : fusion A ∪ B par NOM (coordinateur inclus), tri par volume B puis A.
  const byName = new Map<string, CompareAgentBar>();
  for (const ag of a.perAgent ?? []) {
    byName.set(ag.name, { name: ag.name, color: ag.color, aTokens: ag.tokens, bTokens: null });
  }
  for (const ag of b.perAgent ?? []) {
    const cur = byName.get(ag.name);
    if (cur) cur.bTokens = ag.tokens;
    else byName.set(ag.name, { name: ag.name, color: ag.color, aTokens: null, bTokens: ag.tokens });
  }
  const perAgent = [...byName.values()].sort(
    (x, y) => (y.bTokens ?? y.aTokens ?? 0) - (x.bTokens ?? x.aTokens ?? 0),
  );
  return { stats, perAgent };
}

/** Variation relative (b−a)/a, `null` si non calculable (a nul/absent). PUR. */
export function pctChange(a: number | null, b: number | null): number | null {
  if (a == null || b == null || a === 0) return null;
  return (b - a) / a;
}

/** Ton d'une stat (pos = amélioration, neg = dégradation, neu = neutre/volume). PUR. */
export function toneFor(stat: CompareStat): "pos" | "neg" | "neu" {
  const p = pctChange(stat.a, stat.b);
  if (p == null || Math.abs(p) < 0.005) return "neu";
  if (!stat.lowerIsBetter) return "neu"; // volume : ni bon ni mauvais
  return p > 0 ? "neg" : "pos"; // coût/temps : hausse = mauvais
}

/** Retire un suffixe entre crochets (`claude-opus-4-8[1m]` → `claude-opus-4-8`) + minuscule/trim. */
function normalizeModel(model: string): string {
  const lower = model.trim().toLowerCase();
  const i = lower.indexOf("[");
  return (i >= 0 ? lower.slice(0, i) : lower).trim();
}

/**
 * Taux représentatif $/M d'un modèle = moyenne des 4 prix de bucket (approximation ASSUMÉE,
 * cohérente avec l'étiquette « hypothèse · à volume constant »). Matching par PLUS LONG PRÉFIXE
 * (calque `pricing::match_price`). `null` si le modèle n'est pas dans la table (pas de prix).
 */
export function rateFor(model: string, table: PricingTable | null): number | null {
  if (!table) return null;
  const norm = normalizeModel(model);
  if (norm === "") return null;
  let best: { len: number; input: number; output: number; cw: number; cr: number } | null = null;
  for (const row of table.models) {
    const key = row.model.toLowerCase();
    if (norm.startsWith(key) && (best == null || key.length > best.len)) {
      best = { len: key.length, input: row.input, output: row.output, cw: row.cache_write, cr: row.cache_read };
    }
  }
  if (best == null) return null;
  return (best.input + best.output + best.cw + best.cr) / 4;
}

/** Résultat du re-tarifage d'hypothèse V3-B (coût réel B → coût sous le modèle de remplacement). */
export interface HypothesisResult {
  fromModel: string;
  toModel: string;
  /** Coût $ réel B (somme des agents tarifés). `null` si aucun agent tarifé. */
  baseCost: number | null;
  /** Coût $ ré-tarifé (agents du modèle source → prix cible). `null` si modèle cible sans prix. */
  altCost: number | null;
  /** Nb d'agents du modèle source non re-tarifables (prix source manquant). */
  notRepriced: number;
  /** Délégations non attribuables (transcripts expirés) — non re-tarifées, signalées. */
  unavailable: number;
}

/**
 * Re-tarife les tokens OBSERVÉS (attribution B) : les agents dont le modèle == `fromModel` sont
 * ré-évalués au prix de `toModel` ; les autres gardent leur coût réel. Les TOKENS ne bougent PAS
 * (ratio de taux représentatifs). Modèle cible sans prix → `altCost = null` (« — »). Agent au
 * modèle source sans prix → non re-tarifé (compté `notRepriced`). Untariffé → hors calcul $. PUR.
 */
export function repriceHypothesis(
  attrib: AgentAttribution | null,
  table: PricingTable | null,
  fromModel: string,
  toModel: string,
): HypothesisResult {
  const base: HypothesisResult = {
    fromModel,
    toModel,
    baseCost: null,
    altCost: null,
    notRepriced: 0,
    unavailable: attrib?.unavailable ?? 0,
  };
  if (!attrib || attrib.agents.length === 0) return base;

  const targetRate = rateFor(toModel, table);
  let sumBase = 0;
  let sumAlt = 0;
  let hasBase = false;
  let notRepriced = 0;

  for (const ag of attrib.agents) {
    if (ag.cost == null) continue; // untariffé → hors calcul $ (jamais un coût fabriqué)
    hasBase = true;
    sumBase += ag.cost;
    if (ag.model === fromModel) {
      const sourceRate = rateFor(ag.model, table);
      if (targetRate == null || sourceRate == null || sourceRate === 0) {
        notRepriced += 1;
        sumAlt += ag.cost; // non re-tarifable → garde son coût réel
      } else {
        sumAlt += ag.cost * (targetRate / sourceRate);
      }
    } else {
      sumAlt += ag.cost;
    }
  }

  return {
    fromModel,
    toModel,
    baseCost: hasBase ? sumBase : null,
    altCost: hasBase && targetRate != null ? sumAlt : null,
    notRepriced,
    unavailable: attrib.unavailable,
  };
}
