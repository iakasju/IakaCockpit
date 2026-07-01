import { describe, it, expect } from "vitest";
import { dispatch, normalize, VOICE_COMMAND_EXAMPLES } from "../voice/dispatcher";
import type { ViewId } from "../hooks/useGridState";

/**
 * L16-P1 — dispatcher d'intent vocal (navigation). Tests du cœur PUR :
 * phrases FR → action `{type:"nav", view}`, tolérance au bruit STT, et « pas
 * compris » → null. Aucun I/O, aucun backend.
 */
describe("voice dispatcher — navigation (L16-P1)", () => {
  it("normalise minuscule + accents + ponctuation", () => {
    expect(normalize("Montre l'Étagère !")).toBe("montre l etagere");
    expect(normalize("  RÉGLAGES  ")).toBe("reglages");
  });

  const cases: Array<[string, ViewId]> = [
    // portefeuille
    ["montre le portefeuille", "portfolio"],
    ["va au portfolio", "portfolio"],
    ["ouvre l'étagère", "portfolio"],
    // travail
    ["va au travail", "working"],
    ["montre la table", "working"],
    ["ouvre le chantier", "working"],
    // journal
    ["ouvre le journal", "journal"],
    ["montre la main courante", "journal"],
    ["affiche l'historique", "journal"],
    // équipes
    ["montre les équipes", "teams"],
    ["va sur l'équipe", "teams"],
    ["ouvre le roster", "teams"],
    // réglages
    ["ouvre les réglages", "settings"],
    ["montre les paramètres", "settings"],
    ["va dans la configuration", "settings"],
  ];

  it.each(cases)("« %s » → %s", (phrase, view) => {
    expect(dispatch(phrase)).toEqual({ type: "nav", view });
  });

  it("tolère le bruit STT (fuzzy léger)", () => {
    // « tournal » ~ journal (distance 1)
    expect(dispatch("va au tournal")).toEqual({ type: "nav", view: "journal" });
    // « portefeuile » ~ portefeuille (distance 1)
    expect(dispatch("montre le portefeuile")).toEqual({
      type: "nav",
      view: "portfolio",
    });
  });

  it("reconnaît le mot-clé même sans verbe", () => {
    expect(dispatch("portefeuille")).toEqual({ type: "nav", view: "portfolio" });
    expect(dispatch("réglages")).toEqual({ type: "nav", view: "settings" });
  });

  it("retourne null quand rien n'est reconnu", () => {
    expect(dispatch("")).toBeNull();
    expect(dispatch("   ")).toBeNull();
    expect(dispatch("quelle heure est-il")).toBeNull();
    expect(dispatch("bonjour comment ça va")).toBeNull();
  });

  it("expose des exemples de commandes pour l'IHM", () => {
    expect(VOICE_COMMAND_EXAMPLES.length).toBeGreaterThan(0);
    // chaque exemple doit être une commande réellement reconnue
    for (const ex of VOICE_COMMAND_EXAMPLES) {
      expect(dispatch(ex)).not.toBeNull();
    }
  });
});
