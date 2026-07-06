import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFrame } from "../hooks/useFrame";
import { resolveAgentRules, emptyFrame, type Frame } from "../frame/model";
import type { Backend } from "../api/backend";

/**
 * L22-P1 — hook autorité du Cadre. Mocke la façade (frameLoad/frameSave) et vérifie :
 * chargement, CRUD des niveaux, cascade de suppression, et persistance après mutation.
 */
function mockApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: vi.fn().mockReturnValue(true),
    frameLoad: vi.fn().mockResolvedValue(null),
    frameSave: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as Backend;
}

async function ready(api: Backend) {
  const hook = renderHook(() => useFrame("iakaframe", api));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useFrame (L22-P1)", () => {
  it("charge un cadre vide quand frameLoad renvoie null", async () => {
    const api = mockApi();
    const { result } = await ready(api);
    expect(result.current.frame.teamId).toBe("iakaframe");
    expect(result.current.frame.rules).toEqual([]);
    expect(api.frameLoad).toHaveBeenCalledWith("iakaframe");
  });

  it("assemble règle → skill → template → agent et résout les règles effectives", async () => {
    const api = mockApi();
    const { result } = await ready(api);

    let ruleId = "", skillId = "", tplId = "", agentId = "";
    act(() => {
      ruleId = result.current.addRule("interdit", "push force", "git push --force");
      skillId = result.current.addSkill("Git sûr");
    });
    act(() => {
      result.current.toggleSkillRule(skillId, ruleId);
      tplId = result.current.addTemplate("Développeur");
    });
    act(() => {
      result.current.toggleTemplateSkill(tplId, skillId);
      agentId = result.current.addAgent("Gimli", tplId);
    });

    const f = result.current.frame;
    expect(f.rules).toHaveLength(1);
    expect(resolveAgentRules(f, agentId).map((r) => r.id)).toEqual([ruleId]);
    expect(result.current.problems).toEqual([]);
    // a persisté (au moins une écriture)
    expect(api.frameSave).toHaveBeenCalled();
  });

  it("supprimer une règle nettoie toutes ses références (cascade)", async () => {
    const api = mockApi();
    const { result } = await ready(api);

    let ruleId = "", skillId = "";
    act(() => {
      ruleId = result.current.addRule("tool", "Edit");
      skillId = result.current.addSkill("S");
    });
    act(() => {
      result.current.toggleSkillRule(skillId, ruleId);
      result.current.toggleProjectRule(ruleId);
    });
    act(() => result.current.removeRule(ruleId));

    const f = result.current.frame;
    expect(f.rules).toHaveLength(0);
    expect(f.skills[0].ruleIds).toEqual([]);
    expect(f.projectRuleIds).toEqual([]);
    expect(result.current.problems).toEqual([]);
  });

  it("délégation : pas de doublon ni de self-loop", async () => {
    const api = mockApi();
    const { result } = await ready(api);
    let a = "", b = "", t = "";
    act(() => {
      t = result.current.addTemplate("T");
    });
    act(() => {
      a = result.current.addAgent("A", t);
      b = result.current.addAgent("B", t);
    });
    act(() => {
      result.current.addDelegation(a, b);
      result.current.addDelegation(a, b); // doublon ignoré
      result.current.addDelegation(a, a); // self-loop ignoré
    });
    expect(result.current.frame.delegations).toEqual([{ from: a, to: b }]);
  });

  it("charge et parse un frame.json existant", async () => {
    const existing = JSON.stringify({
      version: 1,
      teamId: "iakaframe",
      rules: [{ id: "r1", type: "tool", label: "Bash" }],
      skills: [],
      templates: [],
      agents: [],
      projectRuleIds: [],
      delegations: [],
    });
    const api = mockApi({ frameLoad: vi.fn().mockResolvedValue(existing) });
    const { result } = await ready(api);
    expect(result.current.frame.rules.map((r) => r.id)).toEqual(["r1"]);
  });

  it("sème un cadre de démo quand le frame.json est absent (seedFrame)", async () => {
    const api = mockApi(); // frameLoad -> null
    const seed: Frame = {
      version: 1,
      teamId: "iakaframe",
      rules: [{ id: "r1", type: "tool", label: "Edit" }],
      skills: [],
      templates: [],
      agents: [],
      projectRuleIds: [],
      delegations: [],
    };
    const hook = renderHook(() => useFrame("iakaframe", api, () => seed));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.frame.rules.map((r) => r.id)).toEqual(["r1"]);
    expect(api.frameSave).toHaveBeenCalled(); // semence persistée
  });

  it("ne sème PAS si un frame.json existe déjà (non destructif)", async () => {
    const existing = JSON.stringify(emptyFrame("iakaframe"));
    const seed = vi.fn().mockReturnValue(null);
    const api = mockApi({ frameLoad: vi.fn().mockResolvedValue(existing) });
    const hook = renderHook(() => useFrame("iakaframe", api, seed));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(seed).not.toHaveBeenCalled();
  });

  it("hors natif : pas d'appel façade, état en mémoire", async () => {
    const frameSave = vi.fn();
    const frameLoad = vi.fn();
    const api = mockApi({ isTauri: vi.fn().mockReturnValue(false), frameSave, frameLoad });
    const { result } = await ready(api);
    act(() => {
      result.current.addRule("geste", "notifier");
    });
    expect(frameLoad).not.toHaveBeenCalled();
    expect(frameSave).not.toHaveBeenCalled();
    expect(result.current.frame.rules).toHaveLength(1);
  });
});
