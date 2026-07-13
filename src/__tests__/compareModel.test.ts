import { describe, it, expect } from "vitest";
import {
  computeCompareStats,
  toneFor,
  rateFor,
  repriceHypothesis,
} from "../hooks/compareModel";
import { deriveAnalytics, rangeFromPreset, ALL_SCOPE } from "../hooks/useAnalytics";
import type { TreemapItem } from "../components/TreemapPanel";
import type {
  ProjectActivity,
  AnalyticsCost,
  AgentDelegations,
  AgentAttribution,
  PricingTable,
} from "../api/backend";

const NOW = new Date(2026, 6, 13, 12, 0, 0).getTime();
const range = rangeFromPreset("30d", NOW);

/** Modèle réel minimal via `deriveAnalytics` (tokens du jour, coût, délégations, attribution). */
function makeModel(
  tokensDay: number,
  costTotal: number,
  delegCount: number,
  delegMs: number,
  agentTokens: number,
) {
  const economy: TreemapItem[] = [{ project: "p", tokens: 999, segments: [] }];
  const activity: ProjectActivity[] = [
    { project: "p", days: [{ date: "2026-07-11", tokens: tokensDay }] },
  ];
  const cost: AnalyticsCost = {
    cost_total: costTotal,
    by_model: [{ model: "m", tokens: tokensDay, cost: costTotal, untariffed: false }],
    by_day: [],
    untariffed_models: [],
    by_project: [],
    priced_at: null,
  };
  const deleg: AgentDelegations[] = [
    { agent: "gimli", count: delegCount, total_ms: delegMs, avg_ms: delegMs / delegCount },
  ];
  const attrib: AgentAttribution = {
    agents: [
      { agent: "gimli", tokens: agentTokens, cost: costTotal, delegations: delegCount, model: "claude-sonnet-4-5", untariffed: false },
    ],
    unavailable: 0,
    priced_at: null,
  };
  return deriveAnalytics(economy, activity, ALL_SCOPE, range, cost, deleg, attrib);
}

describe("computeCompareStats — deltas réels A vs B", () => {
  const a = makeModel(100_000, 1, 2, 1000, 100_000);
  const b = makeModel(200_000, 1.5, 3, 2000, 200_000);
  const { stats, perAgent } = computeCompareStats(a, b);

  it("compose tokens / coût / coût-M / délégations / temps A→B", () => {
    const by = (k: string) => stats.find((s) => s.key === k)!;
    expect(by("tokens")).toMatchObject({ a: 100_000, b: 200_000 });
    expect(by("cost")).toMatchObject({ a: 1, b: 1.5 });
    // coût/M : A = 1/100k×1e6 = 10 ; B = 1.5/200k×1e6 = 7.5.
    expect(by("costPerM").a).toBeCloseTo(10, 6);
    expect(by("costPerM").b).toBeCloseTo(7.5, 6);
    expect(by("delegations")).toMatchObject({ a: 2, b: 3 });
    expect(by("time")).toMatchObject({ a: 1000, b: 2000 });
  });

  it("ton : coût/M en baisse = amélioration (pos) ; volume = neutre", () => {
    const costM = stats.find((s) => s.key === "costPerM")!;
    expect(toneFor(costM)).toBe("pos"); // 10 → 7.5 = mieux
    const tok = stats.find((s) => s.key === "tokens")!;
    expect(toneFor(tok)).toBe("neu"); // volume : ni bon ni mauvais
  });

  it("barres par agent : fusion A ∪ B par nom (gimli des deux côtés)", () => {
    const gimli = perAgent.find((x) => x.name === "gimli")!;
    expect(gimli.aTokens).toBe(100_000);
    expect(gimli.bTokens).toBe(200_000);
  });
});

describe("rateFor — taux représentatif par plus long préfixe", () => {
  const table: PricingTable = {
    models: [
      { model: "claude-opus-4", input: 15, output: 75, cache_write: 18.75, cache_read: 1.5 },
      { model: "claude-haiku", input: 0.8, output: 4, cache_write: 1, cache_read: 0.08 },
    ],
    priced_at: null,
  };
  it("matche le préfixe + retire le suffixe [1m]", () => {
    expect(rateFor("claude-opus-4-8[1m]", table)).toBeCloseTo((15 + 75 + 18.75 + 1.5) / 4, 6);
  });
  it("modèle inconnu → null", () => {
    expect(rateFor("mistral-x", table)).toBeNull();
    expect(rateFor("anything", null)).toBeNull();
  });
});

describe("repriceHypothesis — re-tarifage à volume constant (V3-B)", () => {
  const table: PricingTable = {
    models: [
      { model: "claude-opus-4", input: 15, output: 75, cache_write: 18.75, cache_read: 1.5 },
      { model: "claude-haiku", input: 0.8, output: 4, cache_write: 1, cache_read: 0.08 },
    ],
    priced_at: null,
  };
  const attrib: AgentAttribution = {
    agents: [
      { agent: "gimli", tokens: 1_000_000, cost: 20, delegations: 1, model: "claude-opus-4-8[1m]", untariffed: false },
      { agent: "legolas", tokens: 500_000, cost: 0, delegations: 1, model: "mistral-x", untariffed: true },
    ],
    unavailable: 2,
    priced_at: null,
  };

  it("re-tarife le modèle source au prix cible (tokens constants) ; untariffé exclu", () => {
    const r = repriceHypothesis(attrib, table, {
      fromModel: "claude-opus-4-8[1m]",
      toModel: "claude-haiku",
    });
    // base = coût réel des agents tarifés (gimli 20 ; legolas untariffé exclu).
    expect(r.baseCost).toBe(20);
    // alt = 20 × rate(haiku)/rate(opus) = 20 × 1.47/27.5625.
    const rateHaiku = (0.8 + 4 + 1 + 0.08) / 4;
    const rateOpus = (15 + 75 + 18.75 + 1.5) / 4;
    expect(r.altCost).toBeCloseTo(20 * (rateHaiku / rateOpus), 6);
    expect(r.altCost! < r.baseCost!).toBe(true); // haiku moins cher
    expect(r.unavailable).toBe(2);
  });

  it("modèle cible sans prix → altCost null (« — »), base conservée", () => {
    const r = repriceHypothesis(attrib, table, {
      fromModel: "claude-opus-4-8[1m]",
      toModel: "modele-inconnu",
    });
    expect(r.baseCost).toBe(20);
    expect(r.altCost).toBeNull();
  });

  it("attribution vide → tout null (placeholder, zéro fausse donnée)", () => {
    const empty: AgentAttribution = { agents: [], unavailable: 0, priced_at: null };
    const r = repriceHypothesis(empty, table, { fromModel: "x", toModel: "y" });
    expect(r.baseCost).toBeNull();
    expect(r.altCost).toBeNull();
  });

  it("PAR AGENT : re-tarife UNIQUEMENT l'agent ciblé (les autres gardent leur coût réel)", () => {
    // Deux agents tarifés au même modèle opus ; on ne cible QUE gimli.
    const two: AgentAttribution = {
      agents: [
        { agent: "gimli", tokens: 1_000_000, cost: 20, delegations: 1, model: "claude-opus-4-8[1m]", untariffed: false },
        { agent: "legolas", tokens: 1_000_000, cost: 20, delegations: 1, model: "claude-opus-4-8[1m]", untariffed: false },
      ],
      unavailable: 0,
      priced_at: null,
    };
    const rHaiku = (20 * (0.8 + 4 + 1 + 0.08)) / 4 / ((15 + 75 + 18.75 + 1.5) / 4);
    const perAgent = repriceHypothesis(two, table, { agent: "gimli", toModel: "claude-haiku" });
    // base = 40 (les deux) ; alt = gimli re-tarifé (haiku) + legolas inchangé (20).
    expect(perAgent.baseCost).toBe(40);
    expect(perAgent.altCost).toBeCloseTo(rHaiku + 20, 6);
    // Mode GLOBAL (même modèle) re-tarife les DEUX → alt = 2 × gimli-haiku.
    const global = repriceHypothesis(two, table, {
      fromModel: "claude-opus-4-8[1m]",
      toModel: "claude-haiku",
    });
    expect(global.altCost).toBeCloseTo(2 * rHaiku, 6);
    // Cibler un agent ne touche donc PAS le même total que le global (preuve du ciblage).
    expect(perAgent.altCost! > global.altCost!).toBe(true);
  });
});
