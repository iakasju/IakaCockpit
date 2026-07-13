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
import type { ProjectActivity } from "../api/backend";

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
  it("ALL : total tokens = somme, coord/sub = somme", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    expect(m.tokens).toBe(850_000);
    expect(m.coordVsSub).toEqual({ coord: 610_000, sub: 240_000 });
    expect(m.hasRealData).toBe(true);
  });

  it("scope projet : tokens + coord/sub du seul projet", () => {
    const m = deriveAnalytics(ECONOMY, ACTIVITY, "mid", range7);
    expect(m.scopeLabel).toBe("mid");
    expect(m.tokens).toBe(250_000);
    expect(m.coordVsSub).toEqual({ coord: 250_000, sub: 0 });
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

describe("mergeDemo — fusion PAR CHAMP (recette L30-P1)", () => {
  const demo = makeDemoAnalytics(NOW);

  it("réel partiel (tokens réels, cost null) : garde le réel, comble le reste par la démo", () => {
    const real = deriveAnalytics(ECONOMY, ACTIVITY, ALL_SCOPE, range7);
    // Prérequis : le réel couvre tokens/coordVsSub/daily, mais PAS cost/perAgent/compare.
    expect(real.tokens).toBe(850_000);
    expect(real.cost).toBeNull();
    expect(real.perAgent).toBeNull();

    const m = mergeDemo(real, demo);
    // Champs réels PRÉSERVÉS (pas écrasés par la démo).
    expect(m.tokens).toBe(850_000);
    expect(m.coordVsSub).toEqual(real.coordVsSub);
    expect(m.daily).toBe(real.daily);
    expect(m.perimeter).toBe(real.perimeter); // hasRealData → périmètre réel
    // Champs non couverts COMBLÉS par la démo (plus de placeholder).
    expect(m.cost).toBe(demo.cost);
    expect(m.perAgent).toBe(demo.perAgent);
    expect(m.compare).toBe(demo.compare);
    expect(m.hasRealData).toBe(true);
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
});
