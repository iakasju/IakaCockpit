import { describe, it, expect, vi } from "vitest";
import { removeFromWork } from "../app/removeFromWork";
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

function deps() {
  return {
    toggleWork: vi.fn(),
    prepareResume: vi.fn(),
    closePty: vi.fn(),
    closeConversation: vi.fn(),
  };
}

describe("removeFromWork — orchestration du retrait de la Table (L23)", () => {
  it("ferme le PTY avec le bon ptySessionId ET retire la conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: { ptySessionId: "conv-alpha-7" },
      ...d,
    });
    // Fermeture PTY explicite, une seule fois, avec l'id du runner.
    expect(d.closePty).toHaveBeenCalledTimes(1);
    expect(d.closePty).toHaveBeenCalledWith("conv-alpha-7");
    // La conversation est retirée pour le bon projet.
    expect(d.closeConversation).toHaveBeenCalledTimes(1);
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });

  it("conserve le retrait immédiat et le job de reprise systématique (non-régression L23)", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project({ id: "alpha", path: "/root/alpha" }),
      conversation: { ptySessionId: "conv-alpha-1" },
      ...d,
    });
    expect(d.toggleWork).toHaveBeenCalledWith("alpha");
    expect(d.prepareResume).toHaveBeenCalledWith("alpha", "alpha", "/root/alpha");
  });

  it("ferme le PTY AVANT de retirer la conversation (ordre : runner puis démontage)", () => {
    const order: string[] = [];
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: { ptySessionId: "conv-alpha-1" },
      toggleWork: vi.fn(),
      prepareResume: vi.fn(),
      closePty: vi.fn(() => {
        order.push("closePty");
      }),
      closeConversation: vi.fn(() => {
        order.push("closeConversation");
      }),
    });
    expect(order).toEqual(["closePty", "closeConversation"]);
  });

  it("sans conversation : ne ferme aucun PTY et ne retire aucune conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: undefined,
      ...d,
    });
    expect(d.toggleWork).toHaveBeenCalledWith("alpha");
    expect(d.prepareResume).toHaveBeenCalledTimes(1);
    expect(d.closePty).not.toHaveBeenCalled();
    expect(d.closeConversation).not.toHaveBeenCalled();
  });

  it("sans projet connu : pas de job de reprise, mais ferme quand même les fenêtres", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: undefined,
      conversation: { ptySessionId: "conv-alpha-1" },
      ...d,
    });
    expect(d.prepareResume).not.toHaveBeenCalled();
    expect(d.closePty).toHaveBeenCalledWith("conv-alpha-1");
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });
});
