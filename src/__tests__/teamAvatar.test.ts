import { describe, it, expect } from "vitest";
import { makeAvatarResolver } from "../theme/teamAvatar";

describe("makeAvatarResolver — pont nom d'agent → vignette (L9-A)", () => {
  it("résout par nom d'agent via le roleIndex de DEMO_TEAM (lotr)", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr");
    // Gandalf = cadrage = roleIndex 2 = slug gandalf.
    expect(String(resolve("Gandalf"))).toContain("gandalf");
    // Aragorn = coordination = roleIndex 1 = slug aragorn.
    expect(String(resolve("Aragorn"))).toContain("aragorn");
    // Odin = portefeuille = roleIndex 0 = slug galadriel (lotr index 0).
    expect(String(resolve("Odin"))).toContain("galadriel");
  });

  it("insensible à la casse du nom d'agent", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr");
    expect(resolve("GANDALF")).toBe(resolve("gandalf"));
  });

  it("A4 : changer de team change tout le casting (avengers)", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "avengers");
    expect(String(resolve("Gandalf"))).toContain("strange"); // cadrage
    expect(String(resolve("Gimli"))).toContain("ironman"); // dev
  });

  it("fallback : agent inconnu de DEMO_TEAM → null", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "lotr");
    expect(resolve("Inconnu")).toBeNull();
  });

  it("fallback : team 'none' → null pour tout agent", () => {
    const resolve = makeAvatarResolver("naonedge-dark", "none");
    expect(resolve("Gandalf")).toBeNull();
  });
});
