import { describe, it, expect } from "vitest";
import { agentMarkdown, frameExportFiles, slugName } from "../frame/export";
import type { Frame } from "../frame/model";

/** L22-P2b — génération markdown (agent.md) depuis le frame.json. */
function sample(): Frame {
  return {
    version: 1,
    teamId: "iakaframe",
    rules: [
      { id: "r-noforce", type: "interdit", label: "Jamais push --force", value: "git push --force" },
      { id: "r-edit", type: "tool", label: "Edit" },
    ],
    skills: [
      { id: "s-git", name: "Git sûr", ruleIds: ["r-noforce"], description: "Sécurise l'usage de git." },
    ],
    templates: [{ id: "t-dev", name: "Développeur", skillIds: ["s-git"], ruleIds: ["r-edit"] }],
    agents: [
      { id: "a-gimli", name: "Gimli", templateId: "t-dev", extraSkillIds: [], extraRuleIds: [], brief: "Code le front." },
      { id: "a-legolas", name: "Legolas", templateId: "t-dev", extraSkillIds: [], extraRuleIds: [] },
    ],
    projectRuleIds: [],
    delegations: [{ from: "a-gimli", to: "a-legolas" }],
  };
}

describe("frame export markdown (L22-P2b)", () => {
  it("slugName nettoie et minusculise", () => {
    expect(slugName("Gimli")).toBe("gimli");
    expect(slugName("Aragorn le Rôdeur")).toBe("aragorn-le-rodeur");
    expect(slugName("!!!")).toBe("agent");
  });

  it("agentMarkdown rassemble identité, brief, skills, règles, délégations", () => {
    const md = agentMarkdown(sample(), "a-gimli");
    expect(md).toContain("# Agent — Gimli");
    expect(md).toContain("Template : **Développeur**");
    expect(md).toContain("## Brief");
    expect(md).toContain("Code le front.");
    expect(md).toContain("### Git sûr");
    expect(md).toContain("Sécurise l'usage de git."); // paragraphe P2 du skill
    expect(md).toContain("**[interdit]** Jamais push --force (`git push --force`)");
    expect(md).toContain("**[tool]** Edit");
    expect(md).toContain("## Délègue à");
    expect(md).toContain("- Legolas");
  });

  it("agentMarkdown sans brief ni délégation reste valide", () => {
    const md = agentMarkdown(sample(), "a-legolas");
    expect(md).toContain("# Agent — Legolas");
    expect(md).not.toContain("## Brief");
    expect(md).not.toContain("## Délègue à");
    expect(md).toContain("### Git sûr");
  });

  it("agent inconnu → chaîne vide", () => {
    expect(agentMarkdown(sample(), "nope")).toBe("");
  });

  it("frameExportFiles produit un fichier .md par agent", () => {
    const files = frameExportFiles(sample());
    expect(files.map((f) => f.name)).toEqual(["gimli.md", "legolas.md"]);
    expect(files[0].content).toContain("# Agent — Gimli");
  });
});
