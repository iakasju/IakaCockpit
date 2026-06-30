import { describe, it, expect } from "vitest";
import {
  derivePlanTimeline,
  parseEstimate,
  type PlanSnapshot,
} from "../hooks/derivePlanTimeline";

const T0 = "2026-06-30T10:00:00Z";
const T1 = "2026-06-30T10:05:00Z"; // +5 min
const T2 = "2026-06-30T10:10:00Z"; // +10 min
const ms = (s: string) => Date.parse(s);

describe("derivePlanTimeline (L19 #9a) — réalisé du plan", () => {
  it("vide → aucune barre", () => {
    const tl = derivePlanTimeline([], ms(T2));
    expect(tl.bars).toEqual([]);
  });

  it("dérive début/fin par tâche depuis les transitions de statut", () => {
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "A", status: "in_progress" }, { content: "B", status: "pending" }] },
      { ts: T1, items: [{ content: "A", status: "completed" }, { content: "B", status: "in_progress" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    const a = tl.bars.find((b) => b.content === "A")!;
    const b = tl.bars.find((b) => b.content === "B")!;
    expect(a.startMs).toBe(ms(T0));
    expect(a.endMs).toBe(ms(T1));
    expect(a.status).toBe("completed");
    expect(b.startMs).toBe(ms(T1));
    expect(b.endMs).toBeNull(); // pas encore finie
    expect(b.status).toBe("in_progress");
  });

  it("marque un dépassement (in_progress qui dure > 1,5× la médiane finie)", () => {
    // A : finie en 5 min (médiane). B : in_progress depuis T0, now = T0+10min > 5×1.5.
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "A", status: "in_progress" }, { content: "B", status: "in_progress" }] },
      { ts: T1, items: [{ content: "A", status: "completed" }, { content: "B", status: "in_progress" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    expect(tl.bars.find((b) => b.content === "B")!.overrun).toBe(true);
    expect(tl.bars.find((b) => b.content === "A")!.overrun).toBe(false);
  });

  it("parseEstimate lit la durée prévisionnelle préfixée (#9b option A)", () => {
    expect(parseEstimate("[~5min] Cadrer")).toBe(300_000);
    expect(parseEstimate("[20m] X")).toBe(1_200_000);
    expect(parseEstimate("[1h] Y")).toBe(3_600_000);
    expect(parseEstimate("Sans estimation")).toBeNull();
  });

  it("dépassement vs ESTIMATION quand annoncée (réalisé > estimé)", () => {
    // A estimée 5 min mais finie en 10 → overrun ; estMs porté.
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "[~5min] A", status: "in_progress" }] },
      { ts: T2, items: [{ content: "[~5min] A", status: "completed" }] }, // 10 min
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    const a = tl.bars[0];
    expect(a.estMs).toBe(300_000);
    expect(a.overrun).toBe(true);
  });

  it("CASCADE : un dépassement amont décale la baseline aval du montant du dépassement", () => {
    // A et B estimées 5 min. A démarre à T0 et finit à T2 (10 min → dépassement 5 min).
    // B (estimée) doit voir sa baseline démarrer à la fin PRÉVUE de A décalée du dépassement,
    // soit T0 + 5min(estimé) + 5min(dépassement) = T0 + 10min = T2.
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "[~5min] A", status: "in_progress" }, { content: "[~5min] B", status: "pending" }] },
      { ts: T2, items: [{ content: "[~5min] A", status: "completed" }, { content: "[~5min] B", status: "in_progress" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    const a = tl.bars.find((b) => b.content === "[~5min] A")!;
    const b = tl.bars.find((b) => b.content === "[~5min] B")!;
    expect(a.baselineStartMs).toBe(ms(T0)); // 1ʳᵉ tâche estimée : ancrée sur son début réel
    expect(a.overrun).toBe(true);
    expect(b.baselineStartMs).toBe(ms(T2)); // décalée de 5 min (le dépassement de A)
  });

  it("CASCADE : sans dépassement amont, la baseline aval démarre à la fin prévue de l'amont", () => {
    // A finit pile dans son estimation (5 min, T0→T1) → aucune cascade : la baseline de B
    // démarre à la fin PRÉVUE de A = T0 + 5min = T1 (et non T2 comme avec dépassement).
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "[~5min] A", status: "in_progress" }, { content: "[~5min] B", status: "pending" }] },
      { ts: T1, items: [{ content: "[~5min] A", status: "completed" }, { content: "[~5min] B", status: "in_progress" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    const a = tl.bars.find((b) => b.content === "[~5min] A")!;
    const b = tl.bars.find((b) => b.content === "[~5min] B")!;
    expect(a.overrun).toBe(false);
    expect(b.baselineStartMs).toBe(ms(T1));
  });

  it("CASCADE : pas d'estimation amont → pas de cascade (dégradation honnête)", () => {
    // A SANS estimation déborde (T0→T2). N'ayant pas d'estimé, A ne porte pas de baseline et
    // ne propage AUCUN décalage : la baseline de B (estimée) s'ancre sur SON propre début réel.
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "A", status: "in_progress" }, { content: "[~5min] B", status: "pending" }] },
      { ts: T2, items: [{ content: "A", status: "completed" }, { content: "[~5min] B", status: "in_progress" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    const a = tl.bars.find((b) => b.content === "A")!;
    const b = tl.bars.find((b) => b.content === "[~5min] B")!;
    expect(a.estMs).toBeNull();
    expect(a.baselineStartMs).toBeNull(); // pas d'estimation → pas de baseline
    expect(b.baselineStartMs).toBe(b.startMs); // ancrée sur son début réel, non décalée par A
  });

  it("l'ordre des barres suit le dernier snapshot", () => {
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "X", status: "in_progress" }] },
      { ts: T1, items: [{ content: "Y", status: "in_progress" }, { content: "X", status: "completed" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    expect(tl.bars.map((b) => b.content)).toEqual(["Y", "X"]);
  });
});
