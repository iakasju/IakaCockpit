/**
 * usePortfolioCost — RÉACTIVITÉ du coût $ par plage (audit L30-P3). Prouve que le hook
 * re-fetche `analyticsCost(from,to)` avec de NOUVELLES bornes dès que la plage change, et
 * ré-expose la nouvelle valeur (pas de mémoïsation qui figerait `model.cost`). Front pur :
 * un faux `Backend` (isTauri=true) renvoie un coût proportionnel à la largeur de la fenêtre.
 */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolioCost } from "../hooks/usePortfolioCost";
import { deriveAnalytics, rangeFromPreset, ALL_SCOPE } from "../hooks/useAnalytics";
import type { Backend, AnalyticsCost } from "../api/backend";

const DAY = 86_400_000;
const NOW = new Date(2026, 6, 13, 12, 0, 0).getTime();

/** Faux backend : coût = 1 $ par jour de fenêtre → change dès que les bornes bougent. */
function makeFakeBackend(calls: Array<{ from: number; to: number }>): Backend {
  return {
    isTauri: () => true,
    analyticsCost: (fromMs: number, toMs: number): Promise<AnalyticsCost> => {
      calls.push({ from: fromMs, to: toMs });
      const days = Math.max(1, Math.round((toMs - fromMs) / DAY));
      return Promise.resolve({
        cost_total: days, // 1 $/jour → strictement croissant avec la fenêtre
        by_model: [
          { model: "claude-sonnet-4-5", tokens: days * 1000, cost: days, untariffed: false },
        ],
        by_day: [],
        untariffed_models: [],
        priced_at: null,
      });
    },
  } as unknown as Backend;
}

describe("usePortfolioCost — réactivité par plage", () => {
  it("re-fetche avec de nouvelles bornes et met à jour la valeur quand la plage s'élargit", async () => {
    const calls: Array<{ from: number; to: number }> = [];
    const api = makeFakeBackend(calls);

    const r24 = rangeFromPreset("24h", NOW);
    const { result, rerender } = renderHook(
      ({ from, to }) => usePortfolioCost(from, to, api),
      { initialProps: { from: r24.fromMs, to: r24.toMs } },
    );

    await waitFor(() => expect(result.current?.cost_total).toBe(1)); // 24h → 1 jour → 1 $

    const r30 = rangeFromPreset("30d", NOW);
    rerender({ from: r30.fromMs, to: r30.toMs });

    await waitFor(() => expect(result.current?.cost_total).toBe(30)); // 30j → 30 $

    // Deux appels distincts, bornes différentes → pas de fetch figé.
    expect(calls).toHaveLength(2);
    expect(calls[0].to - calls[0].from).toBe(DAY);
    expect(calls[1].to - calls[1].from).toBe(30 * DAY);
  });

  it("deriveAnalytics reporte le coût réel de la plage sur model.cost (KPI réactif)", () => {
    const mk = (total: number): AnalyticsCost => ({
      cost_total: total,
      by_model: [{ model: "m", tokens: 1000, cost: total, untariffed: false }],
      by_day: [],
      untariffed_models: [],
      priced_at: null,
    });
    const c24 = deriveAnalytics([], [], ALL_SCOPE, rangeFromPreset("24h", NOW), mk(1));
    const c30 = deriveAnalytics([], [], ALL_SCOPE, rangeFromPreset("30d", NOW), mk(30));
    expect(c24.cost).toBe(1);
    expect(c30.cost).toBe(30);
    expect(c24.cost).not.toBe(c30.cost); // la valeur bouge avec la plage
  });
});
