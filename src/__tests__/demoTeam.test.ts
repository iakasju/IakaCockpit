import { describe, it, expect } from "vitest";
import {
  DEMO_TEAM,
  teamTabProjectId,
  teamTabTitle,
} from "../mock/demoTeam";
import { AGENT_ROLE_KEYS } from "../theme/roles";

describe("demoTeam — team iakaframe (7 rôles canoniques)", () => {
  it("contient exactement les 7 agents (un par rôle), dans l'ordre", () => {
    expect(DEMO_TEAM.map((m) => m.agent)).toEqual([
      "Odin",
      "Aragorn",
      "Gandalf",
      "Gimli",
      "Legolas",
      "Loki",
      "Nathalie",
    ]);
  });

  it("chaque royaume est une clé de rôle canonique (ordre roleIndex)", () => {
    expect(DEMO_TEAM.map((m) => m.royaume)).toEqual(AGENT_ROLE_KEYS);
  });

  it("chaque membre porte un roleIndex (0..6, un par rôle)", () => {
    expect(DEMO_TEAM.map((m) => m.roleIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("teamTabTitle produit un titre [ROYAUME][Agent] bien formé", () => {
    expect(teamTabTitle({ royaume: "DEV", agent: "Gimli", roleIndex: 3 })).toBe(
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
