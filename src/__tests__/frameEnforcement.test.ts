/**
 * frameEnforcement.test — dériveur PUR du Cadre (L22-P3) : allowlist + system-prompt.
 * Frames synthétiques déterministes (indépendants du seed démo).
 */
import { describe, it, expect } from "vitest";
import {
  deriveAllowedTools,
  deriveSystemPromptExtra,
  deriveEnforcement,
  findAgentByName,
} from "../frame/enforcement";
import { emptyFrame, type Frame } from "../frame/model";

/**
 * Cadre d'exemple : un coordinateur (Aragorn) sur un template « Coordinateur » qui porte
 * un skill « Git sûr » (autorisation git commit + interdit push --force + obligation
 * commits atomiques, avec un paragraphe rédigé), plus une règle-outil `Edit`, un outil
 * interdit `Bash`, un brief, et une délégation vers Gimli.
 */
function sampleFrame(): Frame {
  return {
    version: 1,
    teamId: "iakaframe",
    rules: [
      { id: "r-commit", type: "autorisation", label: "git commit", value: "git commit" },
      { id: "r-noforce", type: "interdit", label: "push --force", value: "git push --force" },
      { id: "r-atomic", type: "obligation", label: "Commits atomiques & fréquents" },
      { id: "r-edit", type: "tool", label: "Edit", value: "Edit" },
      { id: "r-bash", type: "tool", label: "Bash", value: "Bash" },
      { id: "r-nobash", type: "interdit", label: "Pas de Bash", value: "Bash" },
      { id: "r-instr", type: "obligation", label: "Lire l'instruction avant de coder" },
    ],
    skills: [
      {
        id: "s-git",
        name: "Git sûr",
        ruleIds: ["r-commit", "r-noforce", "r-atomic"],
        description: "Git sûr : commits atomiques, jamais de push --force.",
      },
    ],
    templates: [
      { id: "t-coord", name: "Coordinateur", skillIds: ["s-git"], ruleIds: ["r-instr", "r-edit", "r-bash", "r-nobash"] },
    ],
    agents: [
      { id: "a-aragorn", name: "Aragorn", templateId: "t-coord", extraSkillIds: [], extraRuleIds: [], brief: "Cadrer avant d'exécuter." },
      { id: "a-gimli", name: "Gimli", templateId: "t-coord", extraSkillIds: [], extraRuleIds: [] },
    ],
    projectRuleIds: [],
    delegations: [{ from: "a-aragorn", to: "a-gimli" }],
  };
}

describe("findAgentByName", () => {
  it("trouve l'agent par nom, insensible à la casse et aux espaces", () => {
    const f = sampleFrame();
    expect(findAgentByName(f, "aragorn")?.id).toBe("a-aragorn");
    expect(findAgentByName(f, "  ARAGORN  ")?.id).toBe("a-aragorn");
    expect(findAgentByName(f, "inconnu")).toBeUndefined();
    expect(findAgentByName(f, "")).toBeUndefined();
  });
});

describe("deriveAllowedTools", () => {
  it("assemble tools + autorisations MOINS interdits (dédup, ordre stable)", () => {
    const f = sampleFrame();
    // s-git : autorisation git commit (+ interdit push --force, nom différent → conservé) ;
    // template : Edit (tool), Bash (tool) MAIS interdit Bash → retiré.
    const tools = deriveAllowedTools(f, "a-aragorn");
    expect(tools).toBe("git commit,Edit");
  });

  it("retourne null quand le Cadre ne définit aucun outil (repli global)", () => {
    const f = emptyFrame("t");
    f.agents = [{ id: "a1", name: "X", templateId: "t0", extraSkillIds: [], extraRuleIds: [] }];
    expect(deriveAllowedTools(f, "a1")).toBeNull();
  });

  it("retourne null pour un agent inconnu", () => {
    expect(deriveAllowedTools(sampleFrame(), "absent")).toBeNull();
  });
});

describe("deriveSystemPromptExtra", () => {
  it("concatène obligations + paragraphe de skill + brief + délégations", () => {
    const extra = deriveSystemPromptExtra(sampleFrame(), "a-aragorn");
    // Obligations (ordre de résolution : skill d'abord puis règles du template).
    expect(extra).toContain("Commits atomiques & fréquents");
    expect(extra).toContain("Lire l'instruction avant de coder");
    // Paragraphe du skill (P2).
    expect(extra).toContain("jamais de push --force");
    // Brief de l'agent.
    expect(extra).toContain("Cadrer avant d'exécuter.");
    // Chaîne de délégations (bonus texte).
    expect(extra).toContain("Tu peux déléguer à : Gimli.");
  });

  it("est vide quand le Cadre n'apporte rien (obligations/skills/brief absents)", () => {
    const f = emptyFrame("t");
    f.templates = [{ id: "t0", name: "T", skillIds: [], ruleIds: [] }];
    f.agents = [{ id: "a1", name: "X", templateId: "t0", extraSkillIds: [], extraRuleIds: [] }];
    expect(deriveSystemPromptExtra(f, "a1")).toBe("");
  });
});

describe("deriveEnforcement", () => {
  it("dérive l'enforcement du coordinateur nommé", () => {
    const enf = deriveEnforcement(sampleFrame(), "Aragorn");
    expect(enf.allowedTools).toBe("git commit,Edit");
    expect(enf.systemPromptExtra).toContain("Cadrer avant d'exécuter.");
  });

  it("repli neutre quand aucun agent ne porte ce nom (zéro régression)", () => {
    const enf = deriveEnforcement(sampleFrame(), "Personne");
    expect(enf).toEqual({ allowedTools: null, systemPromptExtra: "" });
  });

  it("repli neutre sur un cadre vide", () => {
    const enf = deriveEnforcement(emptyFrame("t"), "Aragorn");
    expect(enf).toEqual({ allowedTools: null, systemPromptExtra: "" });
  });
});
