import { describe, it, expect } from "vitest";
import { derivePlanTimeline, type PlanSnapshot } from "../hooks/derivePlanTimeline";

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

  it("l'ordre des barres suit le dernier snapshot", () => {
    const snaps: PlanSnapshot[] = [
      { ts: T0, items: [{ content: "X", status: "in_progress" }] },
      { ts: T1, items: [{ content: "Y", status: "in_progress" }, { content: "X", status: "completed" }] },
    ];
    const tl = derivePlanTimeline(snaps, ms(T2));
    expect(tl.bars.map((b) => b.content)).toEqual(["Y", "X"]);
  });
});
