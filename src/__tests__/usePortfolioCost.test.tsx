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

interface CostCall {
  from: number;
  to: number;
  project?: string;
}

/** Faux backend : coût = 1 $ par jour de fenêtre (× 10 quand un projet est scopé, pour
 *  distinguer un fetch scopé d'un fetch ALL). Change dès que bornes OU projet bougent. */
function makeFakeBackend(calls: CostCall[]): Backend {
  return {
    isTauri: () => true,
    analyticsCost: (
      fromMs: number,
      toMs: number,
      project?: string,
    ): Promise<AnalyticsCost> => {
      calls.push({ from: fromMs, to: toMs, project });
      const days = Math.max(1, Math.round((toMs - fromMs) / DAY));
      const total = project ? days * 10 : days;
      return Promise.resolve({
        cost_total: total,
        by_model: [
          { model: "claude-sonnet-4-5", tokens: days * 1000, cost: total, untariffed: false },
        ],
        by_day: [],
        untariffed_models: [],
        by_project: [],
        priced_at: null,
      });
    },
  } as unknown as Backend;
}

describe("usePortfolioCost — réactivité par plage", () => {
  it("re-fetche avec de nouvelles bornes et met à jour la valeur quand la plage s'élargit", async () => {
    const calls: CostCall[] = [];
    const api = makeFakeBackend(calls);

    const r24 = rangeFromPreset("24h", NOW);
    const { result, rerender } = renderHook(
      ({ from, to }) => usePortfolioCost(from, to, undefined, api),
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

  it("re-fetche avec le projet scopé quand le Périmètre change (coût suit le scope)", async () => {
    const calls: CostCall[] = [];
    const api = makeFakeBackend(calls);
    const r = rangeFromPreset("7d", NOW);

    const { result, rerender } = renderHook(
      ({ project }) => usePortfolioCost(r.fromMs, r.toMs, project, api),
      { initialProps: { project: undefined as string | undefined } },
    );

    // ALL (project undefined) → coût = 7 (7 jours × 1 $).
    await waitFor(() => expect(result.current?.cost_total).toBe(7));

    // Sélection d'un projet → nouveau fetch AVEC le projet → coût scopé (×10 dans le fake).
    rerender({ project: "iakacockpit" });
    await waitFor(() => expect(result.current?.cost_total).toBe(70));

    expect(calls).toHaveLength(2);
    expect(calls[0].project).toBeUndefined(); // ALL
    expect(calls[1].project).toBe("iakacockpit"); // scopé
  });

  it("deriveAnalytics reporte le coût réel de la plage sur model.cost (KPI réactif)", () => {
    const mk = (total: number): AnalyticsCost => ({
      cost_total: total,
      by_model: [{ model: "m", tokens: 1000, cost: total, untariffed: false }],
      by_day: [],
      untariffed_models: [],
      by_project: [],
      priced_at: null,
    });
    const c24 = deriveAnalytics([], [], ALL_SCOPE, rangeFromPreset("24h", NOW), mk(1));
    const c30 = deriveAnalytics([], [], ALL_SCOPE, rangeFromPreset("30d", NOW), mk(30));
    expect(c24.cost).toBe(1);
    expect(c30.cost).toBe(30);
    expect(c24.cost).not.toBe(c30.cost); // la valeur bouge avec la plage
  });
});
