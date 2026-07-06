import { describe, it, expect } from "vitest";
import {
  emptyFrame,
  validateFrame,
  resolveAgentRules,
  parseFrame,
  RULE_TYPES,
  type Frame,
} from "../frame/model";

/**
 * L22-P1 — modèle PUR du Cadre. Tests : intégrité référentielle, résolution des règles
 * effectives d'un agent (skills template + règles + extras, dédupliqué), parse défensif.
 */

// Cadre cohérent minimal : 1 skill « Git sûr » (2 règles) + 1 règle tool + template + agent.
function sampleFrame(): Frame {
  return {
    version: 1,
    teamId: "iakaframe",
    rules: [
      { id: "r-commit", type: "autorisation", label: "git commit" },
      { id: "r-noforce", type: "interdit", label: "push --force", value: "git push --force" },
      { id: "r-edit", type: "tool", label: "Edit" },
      { id: "r-proj", type: "obligation", label: "doc à jour", scope: "projet" },
    ],
    skills: [{ id: "s-git", name: "Git sûr", ruleIds: ["r-commit", "r-noforce"] }],
    templates: [
      { id: "t-dev", name: "Développeur", skillIds: ["s-git"], ruleIds: ["r-edit"] },
    ],
    agents: [
      { id: "a-gimli", name: "Gimli", templateId: "t-dev", extraSkillIds: [], extraRuleIds: [] },
    ],
    projectRuleIds: ["r-proj"],
    delegations: [],
  };
}

describe("frame model (L22-P1)", () => {
  it("emptyFrame est valide et vide", () => {
    const f = emptyFrame("t1");
    expect(f.teamId).toBe("t1");
    expect(validateFrame(f)).toEqual([]);
    expect(f.rules).toEqual([]);
  });

  it("les 6 types de règle sont fermés (délégation exclue)", () => {
    expect(RULE_TYPES).toContain("interdit");
    expect(RULE_TYPES).not.toContain("delegation");
    expect(RULE_TYPES).toHaveLength(6);
  });

  it("un cadre cohérent ne remonte aucun problème", () => {
    expect(validateFrame(sampleFrame())).toEqual([]);
  });

  it("résout les règles effectives d'un agent (skills + règles template)", () => {
    const rules = resolveAgentRules(sampleFrame(), "a-gimli");
    expect(rules.map((r) => r.id)).toEqual(["r-commit", "r-noforce", "r-edit"]);
  });

  it("déduplique une règle présente via skill ET en extra", () => {
    const f = sampleFrame();
    f.agents[0].extraRuleIds = ["r-commit"]; // déjà dans le skill « Git sûr »
    const rules = resolveAgentRules(f, "a-gimli");
    expect(rules.filter((r) => r.id === "r-commit")).toHaveLength(1);
  });

  it("agent inconnu → aucune règle", () => {
    expect(resolveAgentRules(sampleFrame(), "nope")).toEqual([]);
  });

  it("détecte une référence cassée (skill → règle inconnue)", () => {
    const f = sampleFrame();
    f.skills[0].ruleIds.push("r-fantome");
    const p = validateFrame(f);
    expect(p.some((m) => m.includes("r-fantome"))).toBe(true);
  });

  it("détecte un template pointant un skill inconnu", () => {
    const f = sampleFrame();
    f.templates[0].skillIds = ["s-nope"];
    expect(validateFrame(f).some((m) => m.includes("s-nope"))).toBe(true);
  });

  it("détecte un agent sur un template inconnu", () => {
    const f = sampleFrame();
    f.agents[0].templateId = "t-nope";
    expect(validateFrame(f).some((m) => m.includes("t-nope"))).toBe(true);
  });

  it("détecte une arête de délégation vers un agent inconnu", () => {
    const f = sampleFrame();
    f.delegations = [{ from: "a-gimli", to: "a-ghost" }];
    expect(validateFrame(f).some((m) => m.includes("a-ghost"))).toBe(true);
  });

  it("détecte un id en double", () => {
    const f = sampleFrame();
    f.rules.push({ id: "r-edit", type: "tool", label: "doublon" });
    expect(validateFrame(f).some((m) => m.includes("double"))).toBe(true);
  });

  it("parseFrame reconstruit un cadre depuis un JSON quelconque, sans jeter", () => {
    const f = parseFrame({
      teamId: "x",
      rules: [
        { id: "r1", type: "tool", label: "Bash" },
        { id: "", type: "tool", label: "vide -> écartée" },
        { id: "r2", type: "type-bidon", label: "type invalide -> interdit" },
      ],
      skills: "pas un tableau",
      agents: [{ id: "a1", name: "N", templateId: "t1" }],
    });
    expect(f.version).toBe(1);
    expect(f.teamId).toBe("x");
    expect(f.rules.map((r) => r.id)).toEqual(["r1", "r2"]); // vide écartée
    expect(f.rules[1].type).toBe("interdit"); // type invalide normalisé
    expect(f.skills).toEqual([]); // champ mal typé -> défaut
    expect(f.agents[0].extraSkillIds).toEqual([]); // défaut
  });

  it("parseFrame sur null/undefined → cadre vide en forme", () => {
    const f = parseFrame(undefined, "fb");
    expect(f.teamId).toBe("fb");
    expect(validateFrame(f)).toEqual([]);
  });
});
