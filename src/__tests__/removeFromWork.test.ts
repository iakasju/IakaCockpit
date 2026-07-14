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

  // --- L31-P2 : fermeture en CASCADE des slots d'agents du MÊME projet ---

  it("ferme en cascade les slots d'agents du projet (pty×2 + conversations) + coordinateur", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: owned("conv-alpha-1"),
      agentSlots: [
        {
          projectId: "alpha::agent::gimli",
          ptySessionId: "conv-slot-gimli",
          executable: true,
        },
        {
          projectId: "alpha::agent::legolas",
          ptySessionId: "conv-slot-legolas",
          executable: true,
        },
      ],
      ...d,
    });
    // Les 2 slots + le coordinateur → 3 pty.close et 3 closeConversation.
    expect(d.closePty).toHaveBeenCalledTimes(3);
    expect(d.closePty).toHaveBeenCalledWith("conv-slot-gimli");
    expect(d.closePty).toHaveBeenCalledWith("conv-slot-legolas");
    expect(d.closePty).toHaveBeenCalledWith("conv-alpha-1");
    expect(d.closeConversation).toHaveBeenCalledTimes(3);
    expect(d.closeConversation).toHaveBeenCalledWith("alpha::agent::gimli");
    expect(d.closeConversation).toHaveBeenCalledWith("alpha::agent::legolas");
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });

  it("cascade : chaque slot ferme SON pty AVANT sa conversation (garde L10)", () => {
    const order: string[] = [];
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: owned("conv-alpha-1"),
      agentSlots: [
        {
          projectId: "alpha::agent::gimli",
          ptySessionId: "conv-slot-gimli",
          executable: true,
        },
      ],
      toggleWork: vi.fn(),
      prepareResume: vi.fn(),
      closePty: vi.fn((id: string) => {
        order.push(`close:${id}`);
      }),
      stopTailer: vi.fn(),
      closeConversation: vi.fn((id: string) => {
        order.push(`conv:${id}`);
      }),
    });
    // Le slot : pty PUIS conversation, avant le coordinateur.
    expect(order).toEqual([
      "close:conv-slot-gimli",
      "conv:alpha::agent::gimli",
      "close:conv-alpha-1",
      "conv:alpha",
    ]);
  });

  it("cascade : un slot au runner NON exécutable ne ferme pas de pty mais retire la conversation", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: owned("conv-alpha-1"),
      agentSlots: [
        {
          projectId: "alpha::agent::loki",
          ptySessionId: "conv-slot-loki",
          executable: false,
        },
      ],
      ...d,
    });
    // Slot non exécutable : pas de close du pty du slot, mais conversation retirée.
    expect(d.closePty).not.toHaveBeenCalledWith("conv-slot-loki");
    expect(d.closeConversation).toHaveBeenCalledWith("alpha::agent::loki");
    // Le coordinateur, lui, ferme bien son pty.
    expect(d.closePty).toHaveBeenCalledWith("conv-alpha-1");
  });

  it("sans agentSlots : comportement mono-slot inchangé (non-régression)", () => {
    const d = deps();
    removeFromWork({
      projectId: "alpha",
      project: project(),
      conversation: owned("conv-alpha-1"),
      ...d,
    });
    expect(d.closePty).toHaveBeenCalledTimes(1);
    expect(d.closeConversation).toHaveBeenCalledTimes(1);
    expect(d.closeConversation).toHaveBeenCalledWith("alpha");
  });
});
