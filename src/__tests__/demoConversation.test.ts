import { describe, it, expect } from "vitest";
import {
  DEMO_HISTORY,
  DEMO_HISTORY_AGENTS,
  GANDALF_REPORT_VERBATIM,
} from "../mock/demoConversation";

describe("demoConversation — historique préchargé (L9-C.1)", () => {
  it("C1 : l'historique est non vide et démarre par une demande utilisateur", () => {
    expect(DEMO_HISTORY.length).toBeGreaterThan(0);
    expect(DEMO_HISTORY[0].role).toBe("user");
  });

  it("C1 : contient une délégation Aragorn→Gandalf", () => {
    const deleg = DEMO_HISTORY.find(
      (t) =>
        t.role === "assistant" &&
        t.content.includes("[ACCUEIL][Aragorn]") &&
        /délègue|delegue/i.test(t.content) &&
        t.content.includes("Gandalf"),
    );
    expect(deleg).toBeDefined();
  });

  it("C1 : contient un rapport de Gandalf (verbatim source)", () => {
    const rapport = DEMO_HISTORY.find(
      (t) =>
        t.role === "assistant" &&
        t.content.includes("[CADRAGE][Gandalf]") &&
        t.content.includes(GANDALF_REPORT_VERBATIM),
    );
    expect(rapport).toBeDefined();
  });

  it("C1 : contient une restitution VERBATIM par Aragorn citant Gandalf", () => {
    const verbatim = DEMO_HISTORY.find(
      (t) =>
        t.role === "assistant" &&
        t.content.includes("[ACCUEIL][Aragorn]") &&
        /verbatim/i.test(t.content) &&
        t.content.includes("[CADRAGE][Gandalf]") &&
        t.content.includes(GANDALF_REPORT_VERBATIM),
    );
    expect(verbatim).toBeDefined();
  });

  it("le texte cité est IDENTIQUE entre le rapport et la restitution (pas de dérive)", () => {
    const occurrences = DEMO_HISTORY.filter((t) =>
      t.content.includes(GANDALF_REPORT_VERBATIM),
    );
    // Au moins le rapport + la restitution.
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it("DEMO_HISTORY_AGENTS expose les paires (royaume,agent) de la scène", () => {
    expect(DEMO_HISTORY_AGENTS).toEqual(
      expect.arrayContaining([
        { royaume: "ACCUEIL", agent: "Aragorn" },
        { royaume: "CADRAGE", agent: "Gandalf" },
      ]),
    );
  });
});
