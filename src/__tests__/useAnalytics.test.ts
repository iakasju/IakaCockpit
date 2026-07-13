import { describe, it, expect } from "vitest";
import {
  deriveAnalytics,
  mergeDemo,
  rangeFromPreset,
  ALL_SCOPE,
  type TimeRange,
} from "../hooks/useAnalytics";
import { makeDemoAnalytics } from "../mock/demoAnalytics";
import type { TreemapItem } from "../components/TreemapPanel";
import type {
  ProjectActivity,
  AnalyticsCost,
  AgentDelegations,
  AgentAttribution,
} from "../api/backend";

const NOW = new Date(2026, 6, 13, 12, 0, 0).getTime(); // 13 juil. 2026, midi local

const ECONOMY: TreemapItem[] = [
  { project: "small", tokens: 100_000, segments: [], coord: 60_000, sub: 40_000 },
  { project: "big", tokens: 500_000, segments: [], coord: 300_000, sub: 200_000 },
  { project: "mid", tokens: 250_000, segments: [], coord: 250_000, sub: 0 },
];

// Un jour DANS la plage 7j et un jour HORS (il y a 100 jours) pour prouver le filtre.
const ACTIVITY: ProjectActivity[] = [
  {
    project: "big",
    days: [
      { date: "2026-07-10", tokens: 30_000 }, // dans la plage 7j
      { date: "2026-04-01", tokens: 99_000 }, // hors plage
    ],
  },
  {
    project: "small",
    days: [{ date: "2026-07-11", tokens: 12_000 }],
  },
];

const range7: TimeRange = rangeFromPreset("7d", NOW);

describe("deriveAnalytics — périmètre", () => {
  it("place ALL · portefeuille en tête (somme) puis les projets triés tokens desc", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    expect(m.perimeter[0].id).toBe(ALL_SCOPE);
    expect(m.perimeter[0].isAll).toBe(true);
    expect(m.perimeter[0].tokens).toBe(850_000); // 100k + 500k + 250k
    expect(m.perimeter[0].barPct).toBe(100);
    // Projets triés desc : big (500k) > mid (250k) > small (100k).
    expect(m.perimeter.slice(1).map((e) => e.id)).toEqual(["big", "mid", "small"]);
    // Barre du top projet = 100 % ; les autres relatifs.
    expect(m.perimeter[1].barPct).toBe(100);
    expect(m.perimeter[3].barPct).toBe(20); // 100k / 500k
  });
});

describe("deriveAnalytics — scope réel", () => {
  it("ALL : tokens = somme des jours DANS la plage (pas l'all-time), coord/sub = somme", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    // KPI tokens = tokens de la FENÊTRE (07-10 + 07-11), pas l'économie all-time (850 k).
    expect(m.tokens).toBe(42_000);
    // coordVsSub reste all-time (ratio, alignement plage = P2).
    expect(m.coordVsSub).toEqual({ coord: 610_000, sub: 240_000 });
    expect(m.hasRealData).toBe(true);
  });

  it("scope projet : tokens = jours de CE projet dans la plage, coord/sub du projet", () => {
    // "mid" n'a aucune activité → tokens de plage = 0 (honnête), pas 250 k (all-time).
    const mMid = deriveAnalytics(ECONOMY, ACTIVITY, "mid", range7);
    expect(mMid.scopeLabel).toBe("mid");
    expect(mMid.tokens).toBe(0);
    expect(mMid.coordVsSub).toEqual({ coord: 250_000, sub: 0 });
    // "big" a 30 k dans la plage.
    const mBig = deriveAnalytics(ECONOMY, ACTIVITY, "big", range7);
    expect(mBig.tokens).toBe(30_000);
  });

  it("tokens SUIT la plage : rétrécir la fenêtre change la somme", () => {
    // 24h ne couvre ni le 10 ni le 11 juil. (NOW = 13 juil. midi) → 0 token de plage.
    const m24 = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, rangeFromPreset("24h", NOW));
    expect(m24.tokens).toBe(0);
    // 7j couvre les deux jours → 42 k.
    const m7 = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, rangeFromPreset("7d", NOW));
    expect(m7.tokens).toBe(42_000);
    expect(m24.tokens! < m7.tokens!).toBe(true);
  });

  it("economy présent mais AUCUNE activité → tokens null (démo/placeholder, jamais all-time)", () => {
    const m = deriveAnalytics(ECONOMY, [], ALL_SCOPE, range7);
    expect(m.tokens).toBeNull();
    // hasRealData reste vrai (le périmètre economy existe).
    expect(m.hasRealData).toBe(true);
  });
});

describe("deriveAnalytics — série jour filtrée par plage", () => {
  it("ALL : ne garde que les jours DANS la plage, sommés par date, triés asc", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    // Le jour du 1ᵉʳ avril (hors plage 7j) est exclu ; restent 07-10 et 07-11.
    expect(m.daily.map((d) => d.date)).toEqual(["2026-07-10", "2026-07-11"]);
    expect(m.daily[0].tokens).toBe(30_000);
    // Split entrée/sortie non réel → null (garde « zéro fausse donnée »).
    expect(m.daily[0].input).toBeNull();
    expect(m.daily[0].output).toBeNull();
  });

  it("scope projet : ne garde que les jours de CE projet", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, "small", range7);
    expect(m.daily.map((d) => d.date)).toEqual(["2026-07-11"]);
  });
});

describe("deriveAnalytics — placeholders honnêtes", () => {
  it("coût / temps / délégations / par-agent / comparaison = null (pas de source réelle)", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    expect(m.cost).toBeNull();
    expect(m.agentTime).toBeNull();
    expect(m.delegations).toBeNull();
    expect(m.perAgent).toBeNull();
    expect(m.topDelegations).toBeNull();
    expect(m.compare).toBeNull();
    expect(m.costTrend).toBeNull();
  });

  it("entrées vides → hasRealData false, tokens null, périmètre = ALL seul", () => {
    const m = deriveAnalytics([], [], ALL_SCOPE, range7);
    expect(m.hasRealData).toBe(false);
    expect(m.tokens).toBeNull();
    expect(m.coordVsSub).toBeNull();
    expect(m.daily).toEqual([]);
    expect(m.perimeter).toHaveLength(1);
    expect(m.perimeter[0].id).toBe(ALL_SCOPE);
    expect(m.perimeter[0].tokens).toBe(0);
  });
});

describe("deriveAnalytics — coût $ RÉEL (L30-P2)", () => {
  const COST: AnalyticsCost = {
    cost_total: 10,
    by_model: [
      { model: "claude-sonnet-4-5", tokens: 1_000_000, cost: 10, untariffed: false },
      { model: "mistral-x", tokens: 200_000, cost: 0, untariffed: true },
    ],
    by_day: [
      { date: "2026-07-10", cost: 4 },
      { date: "2026-07-11", cost: 6 },
    ],
    untariffed_models: ["mistral-x"],
    priced_at: "2026-07-13",
  };

  it("alimente coût, tendance, cumulé, mix modèle et marqueur untariffed depuis le RÉEL", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, COST);
    expect(m.cost).toBe(10); // cost_total autoritaire Rust
    expect(m.costTrend).toEqual([4, 6]); // by_day → tendance
    expect(m.cumulativeCost).toEqual([4, 10]); // somme courante
    expect(m.modelCost).toHaveLength(2);
    expect(m.untariffedModels).toEqual(["mistral-x"]);
    expect(m.pricedAt).toBe("2026-07-13");
  });

  it("coût absent (by_model vide) → cost/costTrend null (placeholder, jamais $0 fabriqué)", () => {
    const empty: AnalyticsCost = {
      cost_total: 0,
      by_model: [],
      by_day: [],
      untariffed_models: [],
      priced_at: null,
    };
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, empty);
    expect(m.cost).toBeNull();
    expect(m.costTrend).toBeNull();
    expect(m.cumulativeCost).toBeNull();
    expect(m.modelCost).toBeNull();
  });

  it("sans argument coût → tout placeholder (rétro-compat P1)", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    expect(m.cost).toBeNull();
    expect(m.modelCost).toBeNull();
    expect(m.untariffedModels).toEqual([]);
    expect(m.pricedAt).toBeNull();
  });
});

describe("deriveAnalytics — délégations RÉELLES par agent (L30-P2)", () => {
  const DELEG: AgentDelegations[] = [
    { agent: "gimli", count: 3, total_ms: 90_000, avg_ms: 30_000 },
    { agent: "legolas", count: 1, total_ms: 0, avg_ms: 0 },
  ];

  it("KPI délégations = somme des comptes ; perAgentDelegations = comptes + durées réels", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, null, DELEG);
    expect(m.delegations).toBe(4);
    expect(m.perAgentDelegations).toHaveLength(2);
    expect(m.perAgentDelegations![0]).toEqual({
      agent: "gimli",
      count: 3,
      totalMs: 90_000,
      avgMs: 30_000,
    });
    // Tokens/$ par agent restent placeholder (pas de source, cf. constat).
    expect(m.perAgent).toBeNull();
  });

  it("liste vide (fetch réel, aucune délégation) → KPI 0, perAgentDelegations null", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, null, []);
    expect(m.delegations).toBe(0);
    expect(m.perAgentDelegations).toBeNull();
  });
});

describe("deriveAnalytics — évolution V2 scopée par projet (FIX)", () => {
  it("l'évolution (daily) suit le projet sélectionné, pas le portefeuille", () => {
    const economy: TreemapItem[] = [
      { project: "big", tokens: 1_000_000, segments: [] },
      { project: "tiny", tokens: 100, segments: [] }, // aurait pu être tronqué (top-12) côté scan
    ];
    const activity: ProjectActivity[] = [
      { project: "big", days: [{ date: "2026-07-10", tokens: 900_000 }] },
      { project: "tiny", days: [{ date: "2026-07-11", tokens: 100 }] },
    ];
    const range = rangeFromPreset("30d", NOW);
    const all = deriveAnalytics(economy, activity, ALL_SCOPE, range);
    const tiny = deriveAnalytics(economy, activity, "tiny", range);
    // ALL = les deux jours ; scope tiny = SEULEMENT son jour (pas le portefeuille).
    expect(all.daily.length).toBe(2);
    expect(tiny.daily.length).toBe(1);
    expect(tiny.daily[0].date).toBe("2026-07-11");
    expect(tiny.daily[0].tokens).toBe(100);
  });
});

describe("deriveAnalytics — attribution par agent RÉELLE (L30-P3)", () => {
  const DELEG: AgentDelegations[] = [
    { agent: "gimli", count: 3, total_ms: 90_000, avg_ms: 30_000 },
  ];
  const ATTRIB: AgentAttribution = {
    agents: [
      { agent: "gimli", tokens: 1_000_000, cost: 12, delegations: 3, model: "claude-opus-4-8[1m]", untariffed: false },
      { agent: "legolas", tokens: 400_000, cost: 0, delegations: 2, model: "mistral-x", untariffed: true },
    ],
    unavailable: 2,
    priced_at: "2026-07-13",
  };

  it("remplit perAgent depuis l'attribution réelle (tokens/coût), fusionne durées par nom", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, null, DELEG, ATTRIB);
    expect(m.perAgent).toHaveLength(2);
    // Tri tokens desc : gimli (1 M) devant legolas (400 k).
    const gimli = m.perAgent![0];
    expect(gimli.name).toBe("gimli");
    expect(gimli.tokens).toBe(1_000_000);
    expect(gimli.cost).toBe(12); // tarifé
    expect(gimli.runner).toBe("claude-opus-4-8[1m]"); // resolvedModel
    expect(gimli.share).toBeCloseTo(1_000_000 / 1_400_000, 5);
    // Fusion par nom : durée moyenne des délégations (30 s) → "30 s".
    expect(gimli.turns).toBe(3);
    expect(gimli.avgDuration).toBe("30 s");
    // legolas : modèle untariffed → coût affiché null (« — »), pas 0 fabriqué.
    expect(m.perAgent![1].cost).toBeNull();
    expect(m.attributionUnavailable).toBe(2);
  });

  it("attribution vide → perAgent null (placeholder), unavailable 0", () => {
    const empty: AgentAttribution = { agents: [], unavailable: 0, priced_at: null };
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, null, DELEG, empty);
    expect(m.perAgent).toBeNull();
    expect(m.attributionUnavailable).toBe(0);
  });
});

describe("mergeDemo — fusion PAR CHAMP (recette L30-P1)", () => {
  const demo = makeDemoAnalytics(NOW, range7);

  it("réel partiel (tokens réels de la plage, cost null) : garde le réel, comble par la démo", () => {
    const real = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    // Prérequis : le réel couvre tokens (fenêtre)/coordVsSub/daily, mais PAS cost/perAgent/compare.
    expect(real.tokens).toBe(42_000);
    expect(real.cost).toBeNull();
    expect(real.perAgent).toBeNull();

    const m = mergeDemo(real, demo);
    // Champs réels PRÉSERVÉS (pas écrasés par la démo).
    expect(m.tokens).toBe(42_000);
    expect(m.coordVsSub).toEqual(real.coordVsSub);
    expect(m.daily).toBe(real.daily);
    expect(m.perimeter).toBe(real.perimeter); // hasRealData → périmètre réel
    // Champs non couverts COMBLÉS par la démo (plus de placeholder).
    expect(m.cost).toBe(demo.cost);
    expect(m.perAgent).toBe(demo.perAgent);
    expect(m.compare).toBe(demo.compare);
    expect(m.hasRealData).toBe(true);
  });

  it("coût RÉEL présent : mergeDemo garde le réel (pas la démo)", () => {
    const cost: AnalyticsCost = {
      cost_total: 42,
      by_model: [{ model: "claude-opus-4-8", tokens: 1_000_000, cost: 42, untariffed: false }],
      by_day: [{ date: "2026-07-11", cost: 42 }],
      untariffed_models: [],
      priced_at: "2026-07-13",
    };
    const real = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7, cost);
    const m = mergeDemo(real, demo);
    expect(m.cost).toBe(42); // réel préservé, pas la démo
    expect(m.modelCost).toBe(real.modelCost);
    expect(m.pricedAt).toBe("2026-07-13");
  });

  it("réel vide : périmètre + daily viennent de la démo (page pleine en dev)", () => {
    const real = deriveAnalytics([], [], ALL_SCOPE, range7);
    const m = mergeDemo(real, demo);
    expect(m.hasRealData).toBe(false);
    expect(m.perimeter).toBe(demo.perimeter);
    expect(m.daily).toBe(demo.daily);
    expect(m.tokens).toBe(demo.tokens);
  });
});

describe("rangeFromPreset", () => {
  it("7d borne 7 jours avant now → now", () => {
    const r = rangeFromPreset("7d", NOW);
    expect(r.toMs).toBe(NOW);
    expect(r.fromMs).toBe(NOW - 7 * 86_400_000);
    expect(r.preset).toBe("7d");
  });
  it("24h et 30d ajustent la fenêtre", () => {
    expect(rangeFromPreset("24h", NOW).fromMs).toBe(NOW - 86_400_000);
    expect(rangeFromPreset("30d", NOW).fromMs).toBe(NOW - 30 * 86_400_000);
  });
  it("custom : défaut 14j si pas de bornes, sinon les bornes fournies", () => {
    expect(rangeFromPreset("custom", NOW).fromMs).toBe(NOW - 14 * 86_400_000);
    const custom = { fromMs: NOW - 3 * 86_400_000, toMs: NOW };
    const r = rangeFromPreset("custom", NOW, custom);
    expect(r.fromMs).toBe(custom.fromMs);
    expect(r.toMs).toBe(custom.toMs);
  });
  it("custom : bornes incohérentes (from >= to) → repli sur le défaut 14j", () => {
    const r = rangeFromPreset("custom", NOW, { fromMs: NOW, toMs: NOW - 86_400_000 });
    expect(r.fromMs).toBe(NOW - 14 * 86_400_000);
  });
});

describe("makeDemoAnalytics — sensible à la plage (recette L30-P1)", () => {
  it("la série jour a autant de buckets que de jours (24h→1, 7j→7, 30j→30)", () => {
    expect(makeDemoAnalytics(NOW, rangeFromPreset("24h", NOW)).daily).toHaveLength(1);
    expect(makeDemoAnalytics(NOW, rangeFromPreset("7d", NOW)).daily).toHaveLength(7);
    expect(makeDemoAnalytics(NOW, rangeFromPreset("30d", NOW)).daily).toHaveLength(30);
  });
  it("les agrégats croissent avec la plage (30j > 7j > 24h)", () => {
    const d1 = makeDemoAnalytics(NOW, rangeFromPreset("24h", NOW));
    const d7 = makeDemoAnalytics(NOW, rangeFromPreset("7d", NOW));
    const d30 = makeDemoAnalytics(NOW, rangeFromPreset("30d", NOW));
    expect(d1.tokens! < d7.tokens!).toBe(true);
    expect(d7.tokens! < d30.tokens!).toBe(true);
    expect(d1.cost! < d7.cost!).toBe(true);
    expect(d7.delegations! < d30.delegations!).toBe(true);
    // costTrend / agentHours suivent la longueur de la série jour.
    expect(d30.costTrend).toHaveLength(30);
    expect(d1.agentHours).toHaveLength(1);
    // perAgent (V4) bouge aussi avec la plage.
    expect(d1.perAgent![0].tokens < d30.perAgent![0].tokens).toBe(true);
  });
  it("callout de variation seulement si la fenêtre ≥ 7 j (null sur 24h)", () => {
    expect(makeDemoAnalytics(NOW, rangeFromPreset("24h", NOW)).variation).toBeNull();
    expect(makeDemoAnalytics(NOW, rangeFromPreset("7d", NOW)).variation).not.toBeNull();
  });

  it("la COMPOSITION perAgent change avec la plage (pas un simple scaling proportionnel)", () => {
    const d1 = makeDemoAnalytics(NOW, rangeFromPreset("24h", NOW)).perAgent!;
    const d30 = makeDemoAnalytics(NOW, rangeFromPreset("30d", NOW)).perAgent!;
    const shareOf = (list: typeof d1, name: string): number =>
      list.find((a) => a.name === name)!.share;
    // Si c'était proportionnel, les PARTS seraient identiques ; le poids par plage les fait
    // diverger → la treemap V1 et le classement V4 bougent visuellement.
    expect(shareOf(d1, "Aragorn")).not.toBeCloseTo(shareOf(d30, "Aragorn"), 3);
    // Les parts restent une distribution valide (somme ≈ 1).
    const sum = d30.reduce((s, a) => s + a.share, 0);
    expect(sum).toBeCloseTo(1, 5);
    // Le classement est trié par tokens desc dans chaque plage.
    for (let i = 1; i < d30.length; i++) {
      expect(d30[i - 1].tokens >= d30[i].tokens).toBe(true);
    }
  });
});
