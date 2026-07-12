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
    stopTailer: vi.fn(),
    closeConversation: vi.fn(),
  };
}

/** Fabrique une conversation `owned` (avec son ptySessionId). */
function owned(ptySessionId: string) {
  return {
    source: "owned" as const,
    ptySessionId,
    attachedSessionId: null,
  };
}

describe("removeFromWork — orchestration du retrait de la Table (L23)", () => {
  it("ferme le PTY avec le bon ptySessionId ET retire la conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: owned("conv-alpha-7"),
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
      conversation: owned("conv-alpha-1"),
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
      conversation: owned("conv-alpha-1"),
      toggleWork: vi.fn(),
      prepareResume: vi.fn(),
      closePty: vi.fn(() => {
        order.push("closePty");
      }),
      stopTailer: vi.fn(),
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
      conversation: owned("conv-alpha-1"),
      ...d,
    });
    expect(d.prepareResume).not.toHaveBeenCalled();
    expect(d.closePty).toHaveBeenCalledWith("conv-alpha-1");
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });

  // --- L25 : conversation ATTACHÉE (session externe) — arrêt du tailer, pas de pty.close ---

  it("attaché : arrête le tailer externe (jamais de pty.close) et retire la conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: {
        source: "attached",
        ptySessionId: "conv-alpha-9",
        attachedSessionId: "ext-sid-123",
      },
      ...d,
    });
    // Lecture seule : on stoppe le tailer par sa clef externe, on NE ferme aucun PTY.
    expect(d.stopTailer).toHaveBeenCalledTimes(1);
    expect(d.stopTailer).toHaveBeenCalledWith("ext-sid-123");
    expect(d.closePty).not.toHaveBeenCalled();
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });

  it("attaché sans attachedSessionId : ne stoppe rien mais retire la conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: {
        source: "attached",
        ptySessionId: "conv-alpha-9",
        attachedSessionId: null,
      },
      ...d,
    });
    expect(d.stopTailer).not.toHaveBeenCalled();
    expect(d.closePty).not.toHaveBeenCalled();
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });
});
