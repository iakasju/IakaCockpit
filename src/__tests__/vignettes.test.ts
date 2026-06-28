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

  it("L15 : team thématique non embarquée (inexistante) → null", () => {
    expect(resolveVignette("naonedge-dark", "klingons", 2)).toBeNull();
  });

  it("L15 : xmen désormais EMBARQUÉE (catalogue complet) → vignette", () => {
    // L9 retournait null ; L15 embarque les 11 teams.
    expect(resolveVignette("naonedge-dark", "xmen", 2)).toBeTruthy();
    // roleIndex 5..7 désormais valides (8 rôles par team).
    expect(resolveVignette("naonedge-dark", "lotr", 5)).toBeTruthy(); // boromir
    expect(resolveVignette("naonedge-dark", "lotr", 7)).toBeTruthy(); // frodo
  });

  it("A2 fallback : roleIndex hors 0..7 → null", () => {
    expect(resolveVignette("naonedge-dark", "lotr", 8)).toBeNull();
    expect(resolveVignette("naonedge-dark", "lotr", 99)).toBeNull();
  });

  it("L15 : nouvelles chartes embarquées (grimoire/os/cartoon/photoreal/studio)", () => {
    expect(resolveVignette("grimoire-dark-fantasy", "lotr", 2)).toBeTruthy();
    expect(resolveVignette("os-windows", "avengers", 3)).toBeTruthy();
    expect(resolveVignette("os-macos", "starfleet", 0)).toBeTruthy();
    expect(resolveVignette("cartoon-std", "norse", 1)).toBeTruthy();
    expect(resolveVignette("photoreal-modern", "xmen", 4)).toBeTruthy();
    expect(resolveVignette("studio-clair", "rebels", 5)).toBeTruthy();
  });

  it("A2 fallback : clé charte sans correspondance (grimoire-dark) → null", () => {
    // La clé exacte est grimoire-dark-fantasy ; grimoire-dark n'existe pas.
    expect(resolveVignette("grimoire-dark", "lotr", 2)).toBeNull();
  });

  it("L15 : pseudo-team 'iakaframe' (casting natif) résolue (naonedge-dark)", () => {
    // Ordre racine : 0=odin .. 2=gandalf .. 3=gimli.
    expect(String(resolveVignette("naonedge-dark", "iakaframe", 0))).toContain(
      "odin",
    );
    expect(String(resolveVignette("naonedge-dark", "iakaframe", 3))).toContain(
      "gimli",
    );
    // studio-clair n'a pas le casting natif → fallback null.
    expect(resolveVignette("studio-clair", "iakaframe", 0)).toBeNull();
  });

  it("embeddedTeams expose les 11 teams + 'iakaframe' (catalogue complet L15)", () => {
    expect(embeddedTeams()).toEqual([
      "autobots",
      "avengers",
      "dc-justice",
      "defenders",
      "harry-potter",
      "iakaframe",
      "lotr",
      "norse",
      "olympians",
      "rebels",
      "starfleet",
      "xmen",
    ]);
  });

  it("manifest : 10 chartes embarquées", () => {
    expect(Object.keys(VIGNETTES)).toHaveLength(10);
  });

  it("manifest : chaque team THÉMATIQUE a bien 8 rôles (0..7)", () => {
    for (const charte of Object.keys(VIGNETTES)) {
      for (const team of Object.keys(VIGNETTES[charte])) {
        if (team === "iakaframe") continue; // casting natif (absent en studio-clair)
        expect(Object.keys(VIGNETTES[charte][team])).toHaveLength(8);
      }
    }
  });

  it("re-sync WebP : toutes les vignettes embarquées sont des .webp (256px)", () => {
    let count = 0;
    for (const charte of Object.keys(VIGNETTES)) {
      for (const team of Object.keys(VIGNETTES[charte])) {
        for (const url of Object.values(VIGNETTES[charte][team])) {
          expect(String(url)).toMatch(/\.webp(\?.*)?$/);
          count++;
        }
      }
    }
    // Catalogue complet conservé (≈ 952 entrées, identique au jeu PNG remplacé).
    expect(count).toBeGreaterThan(900);
  });
});
