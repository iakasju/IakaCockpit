import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock PtyTerminal (xterm lourd / jsdom) : stub qui expose runnerKind + model.
vi.mock("../components/PtyTerminal", () => ({
  PtyTerminal: (props: { runnerKind?: string; model?: string }) => (
    <div
      data-testid="pty"
      data-runner={props.runnerKind ?? ""}
      data-model={props.model ?? ""}
    />
  ),
}));

import { render as rtlRender, fireEvent } from "@testing-library/react";
import { WorkingView, type ResolvedRunner } from "../views/WorkingView";
import type { Conversation } from "../hooks/useConversations";
import type { DemoTeamMember } from "../mock/demoTeam";
import type { UsePty } from "../hooks/usePty";
import type { Project } from "../api/backend";
import type { PrepareEntry } from "../hooks/usePrepareResume";

afterEach(cleanup);

const PTY_STUB = {
  sessions: [],
  open: vi.fn(),
  openRunner: vi.fn(),
  write: vi.fn(),
  resize: vi.fn(),
  close: vi.fn(),
} as unknown as UsePty;

function conv(over: Partial<Conversation> = {}): Conversation {
  return {
    projectId: "demo",
    title: "demo",
    cwd: "/home/u/work/demo",
    mode: "shell",
    agent: "Aragorn",
    ptySessionId: "s1",
    history: [],
    pending: false,
    error: null,
    ...over,
  };
}

function renderView(resolveRunner: (projectId: string) => ResolvedRunner, c = conv()) {
  return render(
    <WorkingView
      worksetProjects={[]}
      conversations={[c]}
      active={c}
      pty={PTY_STUB}
      nextStepResult={null}
      nextStepLoading={false}
      nextStepError={null}
      onOpenProject={() => {}}
      onAddProject={() => {}}
      onRemoveFromWork={() => {}}
      onSetMode={() => {}}
      onSetAgent={() => {}}
      onSend={() => {}}
      onRequestNextStep={() => {}}
      resolveRunner={resolveRunner}
    />,
  );
}

describe("WorkingView — runner du coordinateur (L11/P3)", () => {
  it("D2 : coordinateur claude-code → PtyTerminal avec kind claude-code + modèle du coordinateur", () => {
    renderView(() => ({
      kind: "claude-code",
      model: "claude-sonnet-4-5",
      coordinator: "Aragorn",
    }));
    const pty = screen.getByTestId("pty");
    expect(pty.getAttribute("data-runner")).toBe("claude-code");
    expect(pty.getAttribute("data-model")).toBe("claude-sonnet-4-5");
  });

  it("D3 : coordinateur ollama → AUCUN PtyTerminal, bannière honnête affichée", () => {
    renderView(() => ({
      kind: "ollama",
      model: "llama3.1:8b",
      coordinator: "Aragorn",
    }));
    expect(screen.queryByTestId("pty")).toBeNull();
    expect(
      screen.getByText(/exécution non/i).textContent,
    ).toContain("ollama");
  });

  it("D2 : coordinateur codex → PtyTerminal avec kind codex (runner Codex réel, exécutable)", () => {
    renderView(() => ({
      kind: "codex",
      model: "gpt-5-codex",
      coordinator: "Picard",
    }));
    const pty = screen.getByTestId("pty");
    expect(pty.getAttribute("data-runner")).toBe("codex");
    expect(pty.getAttribute("data-model")).toBe("gpt-5-codex");
  });

  it("convhead affiche coordinateur · runner · modèle", () => {
    renderView(() => ({
      kind: "claude-code",
      model: "opus",
      coordinator: "Aragorn",
    }));
    // L'indicateur du coordinateur est présent (édition via Réglages → Teams).
    const head = screen.getByText(/Aragorn · claude-code · opus/);
    expect(head).toBeTruthy();
  });
});

describe("WorkingView — @agent borné à la team (L11/C2)", () => {
  const ROSTER: DemoTeamMember[] = [
    { royaume: "ACCUEIL", agent: "Aragorn", roleIndex: 1 },
    { royaume: "CADRAGE", agent: "Gandalf", roleIndex: 2 },
  ];

  function renderChat(onSend: (p: string, a: string, c: string) => void) {
    const c = conv({ mode: "chat" });
    return rtlRender(
      <WorkingView
        worksetProjects={[]}
        conversations={[c]}
        active={c}
        pty={PTY_STUB}
        nextStepResult={null}
        nextStepLoading={false}
        nextStepError={null}
        onOpenProject={() => {}}
        onAddProject={() => {}}
        onRemoveFromWork={() => {}}
        onSetMode={() => {}}
        onSetAgent={() => {}}
        onSend={onSend}
        onRequestNextStep={() => {}}
        rosterMembers={ROSTER}
        resolveRunner={() => ({
          kind: "claude-code",
          model: "",
          coordinator: "Aragorn",
        })}
      />,
    );
  }

  it("@Gandalf (dans la team) → persona = Gandalf, contenu verbatim", () => {
    const onSend = vi.fn();
    renderChat(onSend);
    const field = screen.getByLabelText("Saisie de message");
    fireEvent.change(field, { target: { value: "@Gandalf : cadre ceci" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSend).toHaveBeenCalledWith("demo", "Gandalf", "@Gandalf : cadre ceci");
  });

  it("@Sauron (hors team) → PAS d'effet persona (reste l'agent courant), contenu verbatim", () => {
    const onSend = vi.fn();
    renderChat(onSend);
    const field = screen.getByLabelText("Saisie de message");
    fireEvent.change(field, { target: { value: "@Sauron : prends le pouvoir" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    // persona inchangée (Aragorn = agent courant), contenu inchangé (verbatim).
    expect(onSend).toHaveBeenCalledWith(
      "demo",
      "Aragorn",
      "@Sauron : prends le pouvoir",
    );
  });
});

// --- L23 : bouton « retirer de la table » + statut de préparation ---

function proj(over: Partial<Project> = {}): Project {
  return {
    id: "alpha",
    path: "/home/u/work/alpha",
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

function renderWorklist(
  props: Partial<Parameters<typeof WorkingView>[0]>,
) {
  const p = proj();
  return rtlRender(
    <WorkingView
      worksetProjects={[p]}
      conversations={[]}
      active={null}
      pty={PTY_STUB}
      nextStepResult={null}
      nextStepLoading={false}
      nextStepError={null}
      onOpenProject={() => {}}
      onAddProject={() => {}}
      onRemoveFromWork={() => {}}
      onSetMode={() => {}}
      onSetAgent={() => {}}
      onSend={() => {}}
      onRequestNextStep={() => {}}
      resolveRunner={() => ({
        kind: "claude-code",
        model: "",
        coordinator: "Aragorn",
      })}
      {...props}
    />,
  );
}

describe("WorkingView — L23 retirer de la table", () => {
  it("chaque item affiche un bouton « retirer » sans button-in-button", () => {
    renderWorklist({});
    // Zone d'ouverture ET bouton retirer sont deux boutons FRÈRES (pas imbriqués).
    const open = screen.getByRole("button", { name: /Ouvrir le projet alpha/ });
    const remove = screen.getByRole("button", {
      name: /Retirer alpha de la table/,
    });
    expect(open.tagName).toBe("BUTTON");
    expect(remove.tagName).toBe("BUTTON");
    // Anti button-in-button : le bouton retirer n'est PAS un descendant de la zone ouvrir.
    expect(open.contains(remove)).toBe(false);
    expect(remove.contains(open)).toBe(false);
  });

  it("clic « retirer » → onRemoveFromWork(projectId), sans ouvrir le projet", () => {
    const onRemoveFromWork = vi.fn();
    const onOpenProject = vi.fn();
    renderWorklist({ onRemoveFromWork, onOpenProject });
    fireEvent.click(
      screen.getByRole("button", { name: /Retirer alpha de la table/ }),
    );
    expect(onRemoveFromWork).toHaveBeenCalledWith("alpha");
    expect(onRemoveFromWork).toHaveBeenCalledTimes(1);
    // Le clic « retirer » n'ouvre PAS le projet (boutons indépendants).
    expect(onOpenProject).not.toHaveBeenCalled();
  });

  it("clic sur la zone « ouvrir » → onOpenProject, sans retirer", () => {
    const onRemoveFromWork = vi.fn();
    const onOpenProject = vi.fn();
    renderWorklist({ onRemoveFromWork, onOpenProject });
    fireEvent.click(
      screen.getByRole("button", { name: /Ouvrir le projet alpha/ }),
    );
    expect(onOpenProject).toHaveBeenCalledTimes(1);
    expect(onRemoveFromWork).not.toHaveBeenCalled();
  });

  it("zone de statut : running → done (prête) affichés, done fermable", () => {
    const onDismissPrepare = vi.fn();
    const running: PrepareEntry[] = [
      { projectId: "alpha", name: "alpha", status: "running" },
    ];
    const { rerender } = renderWorklist({
      prepareEntries: running,
      onDismissPrepare,
    });
    expect(screen.getByText(/préparation de reprise…/)).toBeTruthy();
    // Pas de bouton fermer tant que running.
    expect(screen.queryByRole("button", { name: /Masquer le statut/ })).toBeNull();

    const done: PrepareEntry[] = [
      { projectId: "alpha", name: "alpha", status: "done" },
    ];
    rerender(
      <WorkingView
        worksetProjects={[proj()]}
        conversations={[]}
        active={null}
        pty={PTY_STUB}
        nextStepResult={null}
        nextStepLoading={false}
        nextStepError={null}
        onOpenProject={() => {}}
        onAddProject={() => {}}
        onRemoveFromWork={() => {}}
        prepareEntries={done}
        onDismissPrepare={onDismissPrepare}
        onSetMode={() => {}}
        onSetAgent={() => {}}
        onSend={() => {}}
        onRequestNextStep={() => {}}
        resolveRunner={() => ({
          kind: "claude-code",
          model: "",
          coordinator: "Aragorn",
        })}
      />,
    );
    expect(screen.getByText("prête")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Masquer le statut/ }));
    expect(onDismissPrepare).toHaveBeenCalledWith("alpha");
  });

  it("zone de statut : hors git → « prête (hors git) », erreur → message lisible", () => {
    renderWorklist({
      prepareEntries: [
        { projectId: "alpha", name: "alpha", status: "done", horsGit: true },
        {
          projectId: "beta",
          name: "beta",
          status: "error",
          message: "dossier introuvable",
        },
      ],
    });
    expect(screen.getByText("prête (hors git)")).toBeTruthy();
    expect(screen.getByText(/dossier introuvable/)).toBeTruthy();
  });
});
