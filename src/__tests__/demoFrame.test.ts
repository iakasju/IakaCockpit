import { describe, it, expect } from "vitest";
import { makeDemoFrame } from "../mock/demoFrame";
import { validateFrame, resolveAgentRules } from "../frame/model";

describe("demoFrame (cadre par défaut)", () => {
  it("reste référentiellement valide", () => {
    expect(validateFrame(makeDemoFrame("iakaframe"))).toEqual([]);
  });

  it("contient la règle obligation « def projet dans PROJET.md »", () => {
    const frame = makeDemoFrame("iakaframe");
    const rule = frame.rules.find((r) => r.id === "oblig-def-projet");
    expect(rule).toBeDefined();
    expect(rule?.type).toBe("obligation");
    expect(rule?.label).toContain("specs/PROJET.md");
  });

  it("attache l'obligation au coordinateur (Aragorn)", () => {
    const frame = makeDemoFrame("iakaframe");
    const rules = resolveAgentRules(frame, "a-aragorn");
    expect(rules.map((r) => r.id)).toContain("oblig-def-projet");
  });
});
