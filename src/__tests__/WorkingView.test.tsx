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

import { WorkingView, type ResolvedRunner } from "../views/WorkingView";
import type { Conversation } from "../hooks/useConversations";
import type { UsePty } from "../hooks/usePty";

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

  it("D3 : coordinateur codex → bannière (définition conservée, zéro crash)", () => {
    renderView(() => ({
      kind: "codex",
      model: "",
      coordinator: "Picard",
    }));
    expect(screen.queryByTestId("pty")).toBeNull();
    expect(screen.getAllByText(/codex/i).length).toBeGreaterThan(0);
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
