import { describe, it, expect } from "vitest";
import {
  scopePortfolioEconomy,
  ringPct,
  tokensOf,
} from "../views/portfolioScope";
import type { TreemapItem } from "../components/TreemapPanel";

const eco = (project: string, tokens: number): TreemapItem => ({
  project,
  tokens,
  segments: [],
});

const ECONOMY: TreemapItem[] = [
  eco("alpha", 75_000),
  eco("beta", 25_000),
  eco("gamma", 50_000), // hors table
];

describe("portfolioScope — scoping de l'économie aux projets de la TABLE (L21/C)", () => {
  it("dénominateur = Σ tokens des SEULS projets de la table (gamma exclu)", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set(["alpha", "beta"]));
    expect(scope.tableTotal).toBe(100_000);
    expect(scope.tableEconomy.map((e) => e.project)).toEqual(["alpha", "beta"]);
  });

  it("anneau % = part dans le total de la table (partagé avec la treemap)", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set(["alpha", "beta"]));
    expect(ringPct(scope, "alpha")).toBe(75);
    expect(ringPct(scope, "beta")).toBe(25);
  });

  it("un projet HORS table n'entre ni dans le total ni dans la treemap", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set(["alpha", "beta"]));
    expect(scope.tableEconomy.find((e) => e.project === "gamma")).toBeUndefined();
    // gamma a des tokens mais n'est pas sur la table : aucun % (il n'est pas rendu).
    expect(scope.tableTotal).toBe(100_000);
  });

  it("un seul projet sur la table → anneau 100 %", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set(["alpha"]));
    expect(scope.tableTotal).toBe(75_000);
    expect(ringPct(scope, "alpha")).toBe(100);
  });

  it("table vide → pas de division par zéro (% null, total 0)", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set());
    expect(scope.tableTotal).toBe(0);
    expect(scope.tableEconomy).toEqual([]);
    expect(ringPct(scope, "alpha")).toBeNull();
  });

  it("projet sur la table SANS transcript → tokens null + anneau null (zéro fausse donnée)", () => {
    const scope = scopePortfolioEconomy(ECONOMY, new Set(["alpha", "delta"]));
    expect(tokensOf(scope, "delta")).toBeNull();
    expect(ringPct(scope, "delta")).toBeNull();
    // alpha reste référencé au seul dénominateur des projets À TOKENS de la table.
    expect(scope.tableTotal).toBe(75_000);
    expect(ringPct(scope, "alpha")).toBe(100);
  });
});
