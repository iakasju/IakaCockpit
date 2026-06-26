import { describe, it, expect } from "vitest";
import {
  DEMO_TEAM,
  teamTabProjectId,
  teamTabTitle,
} from "../mock/demoTeam";

describe("demoTeam — mise en scène démo (L7, AR-1)", () => {
  it("contient exactement les 5 agents tranchés, dans l'ordre", () => {
    expect(DEMO_TEAM.map((m) => m.agent)).toEqual([
      "Odin",
      "Aragorn",
      "Gandalf",
      "Gimli",
      "Legolas",
    ]);
  });

  it("chaque royaume est en MAJUSCULE", () => {
    for (const m of DEMO_TEAM) {
      expect(m.royaume).toBe(m.royaume.toUpperCase());
    }
  });

  it("teamTabTitle produit un titre [ROYAUME][Agent] bien formé", () => {
    expect(teamTabTitle({ royaume: "DEV", agent: "Gimli" })).toBe(
      "[DEV][Gimli]",
    );
    // Format respecté pour toute la team.
    for (const m of DEMO_TEAM) {
      expect(teamTabTitle(m)).toMatch(/^\[[A-ZÀ-Ÿ]+\]\[[A-Za-zÀ-ÿ]+\]$/);
    }
  });

  it("teamTabProjectId est unique par agent", () => {
    const ids = DEMO_TEAM.map(teamTabProjectId);
    expect(new Set(ids).size).toBe(DEMO_TEAM.length);
  });
});
