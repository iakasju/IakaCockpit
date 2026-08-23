import { describe, it, expect } from "vitest";
import {
  DEMO_TEAM,
  teamTabProjectId,
  teamTabTitle,
} from "../mock/demoTeam";
import { AGENT_ROLE_KEYS } from "../theme/roles";

describe("demoTeam — team iakaframe alignée sur le réservoir", () => {
  // Ces trois tests figeaient « 7 agents / roleIndex 0..6 » : c'est précisément le modèle
  // fermé qui avait laissé le Cockpit diverger du réservoir sans que rien ne le signale
  // (charon, helm et feanor manquaient). Ils vérifient désormais l'ALIGNEMENT, pas un
  // effectif figé.
  it("contient les 10 agents du roster du réservoir, dans son ordre", () => {
    expect(DEMO_TEAM.map((m) => m.agent)).toEqual([
      "Odin",
      "Aragorn",
      "Gandalf",
      "Gimli",
      "Legolas",
      "Charon",
      "Helm",
      "Loki",
      "Nathalie",
      "Feanor",
    ]);
  });

  it("les 3 personas jadis manquants sont présents avec leur rôle du réservoir", () => {
    const par = new Map(DEMO_TEAM.map((m) => [m.agent, m.royaume]));
    expect(par.get("Charon")).toBe("deploiement");
    expect(par.get("Helm")).toBe("surveillance");
    expect(par.get("Feanor")).toBe("frame");
  });

  it("chaque royaume est une clé de rôle canonique, sans doublon", () => {
    const royaumes = DEMO_TEAM.map((m) => m.royaume);
    for (const r of royaumes) expect(AGENT_ROLE_KEYS).toContain(r);
    expect(new Set(royaumes).size).toBe(royaumes.length);
  });

  it("un roleIndex distinct par agent, et il suit le RÔLE (pas la position)", () => {
    const idx = DEMO_TEAM.map((m) => m.roleIndex);
    expect(new Set(idx).size).toBe(idx.length);
    // Charon est 6ᵉ à l'affichage mais porte l'index 7 : l'index pioche la vignette,
    // il ne doit pas suivre l'ordre du roster.
    const charon = DEMO_TEAM.find((m) => m.agent === "Charon");
    expect(charon?.roleIndex).toBe(7);
    expect(DEMO_TEAM.indexOf(charon!)).toBe(5);
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
