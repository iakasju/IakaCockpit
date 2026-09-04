import { describe, it, expect } from "vitest";
import {
  projectsToEagerOpen,
  decideEagerOpenFocus,
} from "../app/reconcileEagerOpen";
import type { Project } from "../api/backend";

function project(over: Partial<Project> = {}): Project {
  return {
    id: "alpha",
    path: "/root/alpha",
    is_git: true,
    branch: "main",
    dirty: false,
    ahead: 0,
    behind: 0,
    last_commit_date: null,
    last_commit_subject: null,
    version: null,
    description: null,
    backlog_remaining: null,
    backlog_next: null,
    work_status: "stable",
    ...over,
  };
}

describe("projectsToEagerOpen — réconciliation workset → conversations (L24 F1)", () => {
  it("projet LIÉ sans conversation → à ouvrir (ouverture eager)", () => {
    const p = project({ id: "alpha" });
    const out = projectsToEagerOpen({
      worksetProjects: [p],
      openConversationIds: new Set(),
      hasBinding: () => true,
    });
    expect(out).toEqual([p]);
  });

  it("projet LIÉ déjà ouvert → exclu (idempotence, anti-boucle)", () => {
    const p = project({ id: "alpha" });
    const out = projectsToEagerOpen({
      worksetProjects: [p],
      openConversationIds: new Set(["alpha"]),
      hasBinding: () => true,
    });
    expect(out).toEqual([]);
  });

  it("projet NON lié → exclu (anti-empilement de TeamPicker, AR-3)", () => {
    const p = project({ id: "alpha" });
    const out = projectsToEagerOpen({
      worksetProjects: [p],
      openConversationIds: new Set(),
      hasBinding: () => false,
    });
    expect(out).toEqual([]);
  });

  it("mélange : n'ouvre QUE les liés-non-ouverts, ordre du workset préservé", () => {
    const bound = project({ id: "bound" });
    const boundOpen = project({ id: "boundOpen" });
    const unbound = project({ id: "unbound" });
    const bound2 = project({ id: "bound2" });
    const binding = new Set(["bound", "boundOpen", "bound2"]);
    const out = projectsToEagerOpen({
      worksetProjects: [bound, boundOpen, unbound, bound2],
      openConversationIds: new Set(["boundOpen"]),
      hasBinding: (id) => binding.has(id),
    });
    expect(out.map((p) => p.id)).toEqual(["bound", "bound2"]);
  });

  it("workset vide → rien à ouvrir", () => {
    expect(
      projectsToEagerOpen({
        worksetProjects: [],
        openConversationIds: new Set(),
        hasBinding: () => true,
      }),
    ).toEqual([]);
  });
});

describe("decideEagerOpenFocus — L37 F2 (AR-1 = (c) : le démarrage ne vole pas la navigation)", () => {
  it("CA-6 — le PREMIER passage après la fin de la restauration ne donne PAS le focus", () => {
    const { focus, nextState } = decideEagerOpenFocus(true, {
      restorationConsumed: false,
    });
    expect(focus).toBe(false);
    expect(nextState).toEqual({ restorationConsumed: true });
  });

  it("CA-6 — une pose utilisateur (restauration déjà consommée) donne le focus", () => {
    const { focus, nextState } = decideEagerOpenFocus(true, {
      restorationConsumed: true,
    });
    expect(focus).toBe(true);
    expect(nextState).toEqual({ restorationConsumed: true });
  });

  it("avant la fin de la restauration (workset pas encore chargé), le focus est donné (geste utilisateur possible)", () => {
    const { focus, nextState } = decideEagerOpenFocus(false, {
      restorationConsumed: false,
    });
    expect(focus).toBe(true);
    expect(nextState).toEqual({ restorationConsumed: false });
  });

  it("la restauration se consomme même si ce passage n'ouvre rien (Table vide au boot)", () => {
    const { nextState } = decideEagerOpenFocus(true, {
      restorationConsumed: false,
    });
    expect(nextState.restorationConsumed).toBe(true);
  });
});
