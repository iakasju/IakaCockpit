import { describe, it, expect } from "vitest";
import {
  resolveVignette,
  embeddedTeams,
  TEAM_NONE,
} from "../theme/vignettes";
import { VIGNETTES } from "../assets/vignettes/manifest";

describe("resolveVignette — mapping rôle→slug (L9-A)", () => {
  it("A1 : naonedge-dark / lotr / index 2 (cadrage) = vignette Gandalf", () => {
    const url = resolveVignette("naonedge-dark", "lotr", 2);
    expect(url).toBeTruthy();
    expect(String(url)).toContain("gandalf");
  });

  it("A1 : lotr index 0 = galadriel, index 4 = legolas (ordre teams.json)", () => {
    expect(String(resolveVignette("naonedge-dark", "lotr", 0))).toContain(
      "galadriel",
    );
    expect(String(resolveVignette("naonedge-dark", "lotr", 4))).toContain(
      "legolas",
    );
  });

  it("A4 : avengers index 0..4 = nickfury/capamerica/strange/ironman/hawkeye", () => {
    const expected = [
      "nickfury",
      "capamerica",
      "strange",
      "ironman",
      "hawkeye",
    ];
    expected.forEach((slug, i) => {
      expect(String(resolveVignette("naonedge-dark", "avengers", i))).toContain(
        slug,
      );
    });
  });

  it("tolérant : clé 'naonedge' sans variante retombe sur naonedge-dark", () => {
    const a = resolveVignette("naonedge", "lotr", 2);
    const b = resolveVignette("naonedge-dark", "lotr", 2);
    expect(a).toBe(b);
  });

  it("naonedge-light résout la même team (charte light embarquée)", () => {
    expect(resolveVignette("naonedge-light", "starfleet", 0)).toBeTruthy();
    expect(String(resolveVignette("naonedge-light", "starfleet", 0))).toContain(
      "picard",
    );
  });

  it("A2 fallback : team 'none' → null", () => {
    expect(resolveVignette("naonedge-dark", TEAM_NONE, 2)).toBeNull();
    expect(resolveVignette("naonedge-dark", "", 2)).toBeNull();
  });

  it("A2 fallback : team non embarquée → null", () => {
    expect(resolveVignette("naonedge-dark", "xmen", 2)).toBeNull();
  });

  it("A2 fallback : roleIndex inconnu (>4, hors DEMO_TEAM) → null", () => {
    expect(resolveVignette("naonedge-dark", "lotr", 5)).toBeNull();
    expect(resolveVignette("naonedge-dark", "lotr", 99)).toBeNull();
  });

  it("A2 fallback : charte non embarquée → null", () => {
    expect(resolveVignette("grimoire-dark", "lotr", 2)).toBeNull();
  });

  it("embeddedTeams expose les 3 teams embarquées (C-1)", () => {
    expect(embeddedTeams()).toEqual(["avengers", "lotr", "starfleet"]);
  });

  it("manifest : chaque team embarquée a bien 5 rôles (DEMO_TEAM)", () => {
    for (const charte of Object.keys(VIGNETTES)) {
      for (const team of Object.keys(VIGNETTES[charte])) {
        expect(Object.keys(VIGNETTES[charte][team])).toHaveLength(5);
      }
    }
  });
});
