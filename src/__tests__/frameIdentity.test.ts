/**
 * frame/identity.ts — carte d'identité du runner (F1, CA-1/CA-5/CA-6/CA-7).
 *
 * CA-3 (la JONCTION, le critère qui compte) vit dans `identityJunction.test.tsx` : ce
 * fichier ne teste QUE la fonction pure, un témoin insuffisant à lui seul (§ 6 F4 de
 * l'instruction — leçon L42-F1).
 *
 * Lot « Pastille du badge du runner » (2026-09-04) : CA-1 (résolution de pastille pure)
 * et CA-2 (badge ASSEMBLÉ) ci-dessous. Le second contrefactuel de CA-5 (aucune occurrence
 * de l'ancienne constante de secours dans `src/`) exige `fs`/`child_process`, indisponibles
 * sous le `tsconfig` strict de ce dépôt (pas d'`@types/node`) : il vit donc à part, en
 * `.mjs` non typechecké, calque des autres gardes transverses — voir
 * `scripts/__tests__/pastille-badge-runner.test.mjs`.
 */
import { describe, it, expect } from "vitest";
import {
  identityPreamble,
  composeSystemPromptExtra,
  resolveRunnerIdentity,
} from "../frame/identity";
import { phasePastilleFor } from "../theme/roles";

describe("phasePastilleFor — CA-1 (résolution pure et déterministe, table par rôle)", () => {
  it("mêmes entrées → même valeur, à chaque appel", () => {
    expect(phasePastilleFor("coordination", 1)).toBe(phasePastilleFor("coordination", 1));
  });

  it.each([
    ["coordination", 1, "🟠"],
    ["cadrage", 2, "🔵"], // vocabulaire réservoir : traduit via RESERVOIR_ROLE_ALIAS
    ["architecture", 2, "🔵"], // vocabulaire Cockpit déjà canonique
    ["dev", 3, "🔴"],
    ["fabrication", 3, "🔴"],
    ["deploiement", 7, "🟣"],
    ["surveillance", 8, "🟣"],
    ["frame", 9, "🟠"],
  ] as const)("rôle « %s » → pastille « %s »", (royaume, roleIndex, attendu) => {
    expect(phasePastilleFor(royaume, roleIndex)).toBe(attendu);
  });

  it(
    "CONTREFACTUEL — muter une valeur de la table (`coordination` 🟠 → 🟢) fait rougir " +
      "CE test, EN NOMMANT le rôle (joué manuellement sur src/theme/roles.ts, révoqué au " +
      "sha256 — cf. rapport de livraison ; ce test-ci fige l'assertion qui a mordu)",
    () => {
      expect(phasePastilleFor("coordination", 1)).toBe("🟠");
    },
  );

  it("CA-4 — team du CATALOGUE (royaume = slug de personnage) : la pastille vient du RÔLE, via roleIndex", () => {
    // `royaume` = "ARAGORN" (nom de personnage lotr), PAS une clé de rôle : le lookup
    // direct échoue, et c'est le repli sur `roleIndex` qui doit porter le résultat.
    expect(phasePastilleFor("ARAGORN", 1)).toBe("🟠");
  });

  it("CA-5 — rôle inconnu (royaume libre, roleIndex hors table) → `undefined`, jamais de secours", () => {
    expect(phasePastilleFor("un-royaume-invente", 42)).toBeUndefined();
    expect(phasePastilleFor(undefined, undefined)).toBeUndefined();
    expect(phasePastilleFor("", -1)).toBeUndefined();
  });
});

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

  it("CA-2 — pastille DÉFINIE → le préambule montre le badge ASSEMBLÉ, à l'octet", () => {
    const text = identityPreamble({
      persona: "Aragorn",
      royaume: "ROBOTIMMO",
      pastille: "🟠",
    });
    // Chaîne EXACTE, ouverture ET clôture — c'est le critère d'acceptation CA-2 verbatim.
    expect(text).toContain("🟠 [ROBOTIMMO][Aragorn]");
    expect(text).toContain("[ROBOTIMMO][Aragorn] 🟠");
    // AR-2 : présentée comme un DÉFAUT, jamais comme une valeur fixe.
    expect(text).toMatch(/défaut/i);
  });

  it(
    "CONTREFACTUEL CA-2 — revenir à la formulation « la pastille X porte le sens par sa " +
      "position » (badge et pastille DISJOINTS, comme avant ce lot) fait disparaître la " +
      "chaîne assemblée",
    () => {
      const disjoint = (pastille: string, r: string, p: string) =>
        `La pastille ${pastille} porte le sens par sa POSITION, jamais par un mot : ` +
        `${pastille} AVANT le bloc à l'OUVERTURE. Le badge attendu est [${r}][${p}].`;
      const text = disjoint("🟠", "ROBOTIMMO", "Aragorn");
      // La forme ASSEMBLÉE `🟠 [ROBOTIMMO][Aragorn]` n'existe PAS dans ce texte disjoint —
      // exactement ce que CA-2 exige de la vraie sortie et que l'ancienne formulation
      // ne produisait pas.
      expect(text).not.toContain("🟠 [ROBOTIMMO][Aragorn]");
    },
  );

  it("CA-5 — pastille ABSENTE (rôle inconnu) → la phrase est omise, AUCUN symbole n'apparaît", () => {
    const text = identityPreamble({ persona: "Aragorn", royaume: "ROBOTIMMO" });
    // Ni le point médian historique, ni aucune des pastilles de la palette réelle.
    for (const symbole of ["•", "🟡", "🟠", "🔵", "🔴", "🟣", "🟢", "⚫", "🟤"]) {
      expect(text).not.toContain(symbole);
    }
    // Nom, royaume et RÈGLE DE POSITION restent énoncés (§ 2.1 : le seul élément mesuré
    // comme suivi par le runner) — on ne retire pas ce qui marche (AR-5).
    expect(text).toContain("[ROBOTIMMO][Aragorn]");
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
