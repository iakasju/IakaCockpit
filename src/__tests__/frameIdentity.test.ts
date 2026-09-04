/**
 * frame/identity.ts — carte d'identité du runner (F1, CA-1/CA-5/CA-6/CA-7).
 *
 * CA-2 (la JONCTION, le critère qui compte) vit dans `identityJunction.test.tsx` : ce
 * fichier ne teste QUE la fonction pure, un témoin insuffisant à lui seul (§ 6 F4 de
 * l'instruction — leçon L42-F1).
 */
import { describe, it, expect } from "vitest";
import {
  identityPreamble,
  composeSystemPromptExtra,
  resolveRunnerIdentity,
  DEFAULT_IDENTITY_PASTILLE,
} from "../frame/identity";

describe("identityPreamble — CA-1 pure et déterministe", () => {
  it("mêmes entrées → même chaîne, à l'octet", () => {
    const input = { persona: "Aragorn", royaume: "ROBOTIMMO" };
    expect(identityPreamble(input)).toBe(identityPreamble({ ...input }));
  });

  it("contient le nom, le royaume, et énonce la RÈGLE bannissant START/STOP", () => {
    const text = identityPreamble({ persona: "Aragorn", royaume: "ROBOTIMMO" });
    expect(text).toContain("Aragorn");
    expect(text).toContain("[ROBOTIMMO][Aragorn]");
    // La règle mentionne START/STOP pour les BANNIR (méthode iakaframe) — ce test vérifie
    // qu'ils sont bien amenés comme INTERDITS, pas comme un gabarit à écrire tel quel.
    expect(text).toMatch(/START.{0,40}STOP|jamais.{0,80}START/i);
  });

  it("ne nomme AUCUN autre agent (AR-3 — pas de roster injecté)", () => {
    const text = identityPreamble({ persona: "Aragorn", royaume: "ROBOTIMMO" });
    // Aucun des noms des 9 autres personas canoniques n'apparaît.
    for (const other of [
      "Odin",
      "Gandalf",
      "Gimli",
      "Legolas",
      "Charon",
      "Helm",
      "Loki",
      "Nathalie",
      "Feanor",
    ]) {
      expect(text).not.toContain(other);
    }
  });

  it("ne redit pas l'obligation L19 (TodoWrite) ni ne liste d'outil", () => {
    const text = identityPreamble({ persona: "Aragorn", royaume: "ROBOTIMMO" });
    expect(text).not.toContain("TodoWrite");
    expect(text).not.toMatch(/allowedTools|--allowedTools/);
  });

  it("CA-6 — persona absent → chaîne vide (zéro fabrication)", () => {
    expect(identityPreamble({ persona: undefined, royaume: "ROBOTIMMO" })).toBe("");
    expect(identityPreamble({ persona: "", royaume: "ROBOTIMMO" })).toBe("");
    expect(identityPreamble({ persona: "   ", royaume: "ROBOTIMMO" })).toBe("");
  });

  it("CA-6 — royaume absent → chaîne vide (zéro fabrication)", () => {
    expect(identityPreamble({ persona: "Aragorn", royaume: undefined })).toBe("");
    expect(identityPreamble({ persona: "Aragorn", royaume: null })).toBe("");
    expect(identityPreamble({ persona: "Aragorn", royaume: "" })).toBe("");
  });

  it("pastille par défaut, et personnalisable (position AVANT/APRÈS toujours décrite)", () => {
    const def = identityPreamble({ persona: "Aragorn", royaume: "X" });
    expect(def).toContain(DEFAULT_IDENTITY_PASTILLE);
    const custom = identityPreamble({
      persona: "Aragorn",
      royaume: "X",
      pastille: "🟢",
    });
    expect(custom).toContain("🟢");
    expect(custom).not.toContain(DEFAULT_IDENTITY_PASTILLE);
  });

  it("CONTREFACTUEL (déclaratif) — une horloge dans le texte romprait le déterminisme", () => {
    // On ne mute pas le module ici (le contrefactuel réel de CA-1 est joué manuellement,
    // cf. rapport de livraison) ; ce test fige l'ABSENCE d'horodatage dans la sortie —
    // toute régression qui en introduirait un ferait diverger deux appels successifs.
    const a = identityPreamble({ persona: "Aragorn", royaume: "X" });
    const b = identityPreamble({ persona: "Aragorn", royaume: "X" });
    expect(a).toBe(b);
  });
});

describe("composeSystemPromptExtra — préfixe, jamais substitue (CA-7)", () => {
  it("identité seule → identité seule", () => {
    expect(composeSystemPromptExtra("IDENTITE", undefined)).toBe("IDENTITE");
    expect(composeSystemPromptExtra("IDENTITE", "")).toBe("IDENTITE");
  });

  it("les deux présents → identité PUIS le Cadre, séparés, rien perdu", () => {
    const out = composeSystemPromptExtra("IDENTITE", "CADRE-TEXTE");
    expect(out.indexOf("IDENTITE")).toBeLessThan(out.indexOf("CADRE-TEXTE"));
    expect(out).toContain("IDENTITE");
    expect(out).toContain("CADRE-TEXTE");
  });

  it("les deux vides → chaîne vide (l'appelant retombe sur `undefined`)", () => {
    expect(composeSystemPromptExtra("", undefined)).toBe("");
    expect(composeSystemPromptExtra("   ", "  ")).toBe("");
  });
});

describe("resolveRunnerIdentity — CA-4/CA-5/CA-6 (pur, sans monter l'App)", () => {
  it("CA-5 — le royaume est l'id du PROJET en MAJUSCULES, jamais `agent.royaume`", () => {
    const { identity } = resolveRunnerIdentity({
      hasBinding: true,
      persona: "Aragorn",
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    expect(identity).toContain("[ROBOTIMMO][Aragorn]");
    // CONTREFACTUEL (CA-5) : si on utilisait `agent.royaume` ("coordination", la clé de
    // RÔLE stockée côté team — cf. AGENT_ROLES) au lieu de l'id du projet, le badge
    // afficherait la valeur FAUTIVE ci-dessous. On prouve son ABSENCE.
    expect(identity).not.toContain("COORDINATION");
  });

  it("CA-6 — sans liaison EXPLICITE (hasBinding:false) → AUCUNE identité, même avec un persona et un projectId valides", () => {
    const { identity, identityInjected } = resolveRunnerIdentity({
      hasBinding: false,
      persona: "Aragorn",
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    expect(identity).toBe("");
    expect(identityInjected).toBe(false);
  });

  it("CA-6 — persona absent (pas de coordinateur résolu) → aucune identité", () => {
    const { identity } = resolveRunnerIdentity({
      hasBinding: true,
      persona: undefined,
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    expect(identity).toBe("");
  });

  it("CA-4 (l'ESSENCE, prouvée ici en pur — le branchement réel est en CA-2/identityJunction) — " +
    "le PERSONA transmis est celui de l'appelant, jamais un rôle fixe : un slot passe le nom de SON agent", () => {
    const coordinateur = resolveRunnerIdentity({
      hasBinding: true,
      persona: "Aragorn", // App.tsx passe `coord.name` pour la branche coordinateur.
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    const slot = resolveRunnerIdentity({
      hasBinding: true,
      persona: "Gimli", // App.tsx passe `slot.agent` pour la branche slot (jamais le coord).
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    expect(coordinateur.identity).toContain("Aragorn");
    expect(coordinateur.identity).not.toContain("Gimli");
    expect(slot.identity).toContain("Gimli");
    expect(slot.identity).not.toContain("Aragorn");
  });

  it("HORS COUVERTURE (codex) — l'identité peut être COMPOSÉE mais `identityInjected` reste faux", () => {
    const { identity, identityInjected } = resolveRunnerIdentity({
      hasBinding: true,
      persona: "Aragorn",
      projectId: "robotimmo",
      runnerKind: "codex",
    });
    // Le texte existe (composé) — c'est bien `identityInjected`, pas `identity`, qui porte
    // l'honnêteté d'affichage (F3) : `codex_args` ne le transmettrait JAMAIS.
    expect(identity.length).toBeGreaterThan(0);
    expect(identityInjected).toBe(false);
  });

  it("CONTREFACTUEL — muter `runnerKind` en 'claude-code' pour le même cas rend `identityInjected` VRAI (le test précédent mord bien sur `runnerKind`, pas sur autre chose)", () => {
    const { identityInjected } = resolveRunnerIdentity({
      hasBinding: true,
      persona: "Aragorn",
      projectId: "robotimmo",
      runnerKind: "claude-code",
    });
    expect(identityInjected).toBe(true);
  });
});
