import { describe, it, expect } from "vitest";
import { MOCK_FEED, filterFeed, ALL_CANAUX, type Canal } from "../mock/feed";

describe("feed mocké (DEP-1) — filtres de canaux", () => {
  it("aucun canal actif = tout visible (filtre OFF)", () => {
    expect(filterFeed(MOCK_FEED, new Set())).toEqual(MOCK_FEED);
  });

  it("un seul canal actif ne laisse que ce canal", () => {
    const out = filterFeed(MOCK_FEED, new Set<Canal>(["geste"]));
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((e) => e.canal === "geste")).toBe(true);
  });

  it("plusieurs canaux actifs cumulent (union)", () => {
    const active = new Set<Canal>(["geste", "agent"]);
    const out = filterFeed(MOCK_FEED, active);
    expect(out.every((e) => active.has(e.canal))).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("le feed couvre les 4 canaux", () => {
    const present = new Set(MOCK_FEED.map((e) => e.canal));
    for (const c of ALL_CANAUX) {
      expect(present.has(c), `canal ${c} présent dans le mock`).toBe(true);
    }
  });
});
