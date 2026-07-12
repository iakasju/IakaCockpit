import { describe, it, expect } from "vitest";
import { makeAvatarResolver, type RosterEntry } from "../theme/teamAvatar";
import { DEMO_TEAM } from "../mock/demoTeam";

/** Roster dérivé de DEMO_TEAM (nom + roleIndex) — entrée du résolveur reframé L11. */
const ROSTER: RosterEntry[] = DEMO_TEAM.map((m) => ({
  name: m.agent,
  roleIndex: m.roleIndex,
}));

describe("makeAvatarResolver — pont nom d'agent → vignette (L9-A, reframé L11)", () => {
  it("résout par nom d'agent via le roleIndex du roster (lotr)", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr", ROSTER);
    // Gandalf = cadrage = roleIndex 2 = slug gandalf.
    expect(String(resolve("Gandalf"))).toContain("gandalf");
    // Aragorn = coordination = roleIndex 1 = slug aragorn.
    expect(String(resolve("Aragorn"))).toContain("aragorn");
    // Odin = portefeuille = roleIndex 0 = slug galadriel (lotr index 0).
    expect(String(resolve("Odin"))).toContain("galadriel");
  });

  it("insensible à la casse du nom d'agent", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr", ROSTER);
    expect(resolve("GANDALF")).toBe(resolve("gandalf"));
  });

  it("le casting (vignetteTeam) de la team change tout le casting (avengers)", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "avengers", ROSTER);
    expect(String(resolve("Gandalf"))).toContain("strange"); // cadrage
    expect(String(resolve("Gimli"))).toContain("ironman"); // dev
  });

  it("le roster pilote le mapping : un agent custom prend son roleIndex", () => {
    // Roster custom : « Néo » sur roleIndex 3 (dev) → vignette de l'index 3.
    const custom: RosterEntry[] = [{ name: "Néo", roleIndex: 3 }];
    const resolve = makeAvatarResolver("naonedge-dark", "lotr", custom);
    expect(String(resolve("Néo"))).toContain("gimli"); // lotr index 3 = gimli
    // Un agent hors roster → null.
    expect(resolve("Aragorn")).toBeNull();
  });

  it("fallback : agent absent du roster → null", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr", ROSTER);
    expect(resolve("Inconnu")).toBeNull();
  });

  it("fallback : casting 'none' → null pour tout agent", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "none", ROSTER);
    expect(resolve("Gandalf")).toBeNull();
  });

  it("contrat vignettes (studio-clair/lotr) : roleIndex distincts → URLs distinctes ; identiques → mêmes URLs", () => {
    // roleIndex distincts (Aragorn=1, Gandalf=2) → deux vignettes différentes.
    const ok = makeAvatarResolver("studio-clair", "lotr", [
      { name: "Aragorn", roleIndex: 1 },
      { name: "Gandalf", roleIndex: 2 },
    ]);
    expect(String(ok("Aragorn"))).toContain("lotr/aragorn.webp");
    expect(String(ok("Gandalf"))).toContain("lotr/gandalf.webp");
    expect(ok("Aragorn")).not.toBe(ok("Gandalf"));

    // Collision legacy (deux agents au même roleIndex 2) → MÊME URL (bug reproduit).
    const collided = makeAvatarResolver("studio-clair", "lotr", [
      { name: "Aragorn", roleIndex: 2 },
      { name: "Gandalf", roleIndex: 2 },
    ]);
    expect(collided("Aragorn")).toBe(collided("Gandalf"));

    // Après réalignement (Aragorn→1), Aragorn ≠ Gandalf de nouveau.
    const fixed = makeAvatarResolver("studio-clair", "lotr", [
      { name: "Aragorn", roleIndex: 1 },
      { name: "Gandalf", roleIndex: 2 },
    ]);
    expect(String(fixed("Aragorn"))).toContain("lotr/aragorn.webp");
    expect(fixed("Aragorn")).not.toBe(fixed("Gandalf"));
  });
});
