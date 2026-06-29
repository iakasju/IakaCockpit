import { describe, it, expect } from "vitest";
import { derivePlan } from "../hooks/derivePlan";
import type { FeedEvent } from "../api/backend";

function ev(partial: Partial<FeedEvent>): FeedEvent {
  return {
    id: "x",
    canal: "geste",
    who: "[LOTR][Aragorn]",
    project: "iaka-demo",
    body: "",
    ts: "2026-06-29T10:00:00Z",
    meta: null,
    ...partial,
  };
}

describe("derivePlan (L18 #3) — extraction du plan vivant", () => {
  it("renvoie null si aucun event plan", () => {
    expect(derivePlan([ev({ canal: "adresse" })])).toBeNull();
    expect(derivePlan([])).toBeNull();
  });

  it("extrait les items du snapshot plan", () => {
    const items = derivePlan([
      ev({
        ts: "2026-06-29T10:00:00Z",
        meta: {
          event: "plan",
          items: [
            { content: "Cadrer", status: "completed" },
            { content: "Coder", status: "in_progress" },
            { content: "Tester", status: "pending" },
          ],
        },
      }),
    ]);
    expect(items).toHaveLength(3);
    expect(items?.[0]).toEqual({ content: "Cadrer", status: "completed" });
    expect(items?.[1].status).toBe("in_progress");
  });

  it("prend le DERNIER snapshot (par ts)", () => {
    const items = derivePlan([
      ev({ ts: "2026-06-29T10:00:00Z", meta: { event: "plan", items: [{ content: "v1", status: "pending" }] } }),
      ev({ ts: "2026-06-29T11:00:00Z", meta: { event: "plan", items: [{ content: "v2", status: "completed" }] } }),
    ]);
    expect(items).toHaveLength(1);
    expect(items?.[0]).toEqual({ content: "v2", status: "completed" });
  });

  it("filtre par projet quand fourni", () => {
    const evs = [
      ev({ project: "autre", ts: "2026-06-29T12:00:00Z", meta: { event: "plan", items: [{ content: "X", status: "pending" }] } }),
      ev({ project: "iaka-demo", ts: "2026-06-29T11:00:00Z", meta: { event: "plan", items: [{ content: "Y", status: "pending" }] } }),
    ];
    expect(derivePlan(evs, "iaka-demo")?.[0].content).toBe("Y");
  });

  it("normalise un statut inconnu en pending et ignore les items vides", () => {
    const items = derivePlan([
      ev({ meta: { event: "plan", items: [{ content: "ok", status: "weird" }, { content: "  ", status: "pending" }] } }),
    ]);
    expect(items).toEqual([{ content: "ok", status: "pending" }]);
  });
});
