import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

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
    source: "owned",
    attachedSessionId: null,
    attachedTranscriptPath: null,
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
      onSelectConversation={() => {}}
      onSetMode={() => {}}
      onSetAgent={() => {}}
      onSend={() => {}}
      onStartRunner={() => {}}
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

  it("convhead : interlocuteur == coordinateur → nom affiché UNE seule fois (pas de doublon)", () => {
    // conv() par défaut : agent = "Aragorn" ; coordinateur = "Aragorn".
    renderView(() => ({
      kind: "claude-code",
      model: "opus",
      coordinator: "Aragorn",
    }));
    // Le chip runner n'inclut PAS le nom du coordinateur (déjà porté par ct-agent).
    const runner = screen.getByText("claude-code · opus");
    expect(runner).toBeTruthy();
    // Un seul « Aragorn » dans l'EN-TÊTE de conversation (celui de l'interlocuteur),
    // pas répété par le chip runner (le Roster à droite peut le porter aussi).
    const head = runner.closest(".convtitle") as HTMLElement;
    expect(within(head).getAllByText(/Aragorn/)).toHaveLength(1);
  });

  it("convhead : interlocuteur != coordinateur (@agent) → coordinateur affiché dans le chip runner", () => {
    // Interlocuteur changé via @agent (ex. Gandalf) ≠ coordinateur (Aragorn).
    renderView(
      () => ({
        kind: "claude-code",
        model: "opus",
        coordinator: "Aragorn",
      }),
      conv({ agent: "Gandalf" }),
    );
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
        onSelectConversation={() => {}}
        onSetMode={() => {}}
        onSetAgent={() => {}}
        onSend={onSend}
        onStartRunner={() => {}}
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
      onSelectConversation={() => {}}
      onSetMode={() => {}}
      onSetAgent={() => {}}
      onSend={() => {}}
      onStartRunner={() => {}}
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

  // Affichage du statut de reprise DÉBRANCHÉ (2026-07-12) : le job prepareResume tourne
  // toujours et les props restent passées, mais la zone n'est plus rendue dans la worklist.
  it("zone de statut débranchée : running/done ne s'affichent plus (props ignorées au rendu)", () => {
    const onDismissPrepare = vi.fn();
    const entries: PrepareEntry[] = [
      { projectId: "alpha", name: "alpha", status: "running" },
      { projectId: "beta", name: "beta", status: "done" },
    ];
    renderWorklist({ prepareEntries: entries, onDismissPrepare });
    expect(screen.queryByText(/préparation de reprise…/)).toBeNull();
    expect(screen.queryByText("prête")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Masquer le statut/ }),
    ).toBeNull();
  });

  it("zone de statut débranchée : hors git / erreur ne s'affichent plus", () => {
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
    expect(screen.queryByText("prête (hors git)")).toBeNull();
    expect(screen.queryByText(/dossier introuvable/)).toBeNull();
  });
});

// --- L25 : conversation attachée (session vivante, vue live lecture seule) ---

function renderAttached(
  over: Partial<Conversation>,
  onStartRunner = vi.fn(),
) {
  const c = conv({
    source: "attached",
    attachedSessionId: "ext-sid",
    attachedTranscriptPath: "/t/ext-sid.jsonl",
    ...over,
  });
  const utils = rtlRender(
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
      onSelectConversation={() => {}}
      onSetMode={() => {}}
      onSetAgent={() => {}}
      onSend={() => {}}
      onStartRunner={onStartRunner}
      onRequestNextStep={() => {}}
      resolveRunner={() => ({
        kind: "claude-code",
        model: "",
        coordinator: "Aragorn",
      })}
    />,
  );
  return { ...utils, onStartRunner };
}

describe("WorkingView — session attachée L25 (lecture seule)", () => {
  it("chat attaché : badge « session vivante · lecture seule » + saisie désactivée", () => {
    renderAttached({ mode: "chat" });
    // Badge présent dans la convhead (texte exact, distinct de la notice de chat).
    expect(screen.getByText("session vivante · lecture seule")).toBeTruthy();
    // Saisie chat désactivée (aucun write vers la session externe).
    const field = screen.getByLabelText("Saisie de message") as HTMLTextAreaElement;
    expect(field.disabled).toBe(true);
    const send = screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it("chat attaché : le bouton « démarrer un runner » bascule en owned", () => {
    const { onStartRunner } = renderAttached({ mode: "chat" });
    fireEvent.click(
      screen.getByRole("button", { name: /Démarrer un runner du cockpit/ }),
    );
    expect(onStartRunner).toHaveBeenCalledWith("demo");
  });

  it("attaché : AUCUN PtyTerminal monté (pas de PTY, garde L10)", () => {
    renderAttached({ mode: "shell" });
    expect(screen.queryByTestId("pty")).toBeNull();
  });

  it("shell attaché : bannière « session externe » + bouton démarrer un runner", () => {
    const { onStartRunner } = renderAttached({ mode: "shell" });
    expect(screen.getByText(/session externe/i)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /Démarrer un runner du cockpit/ }),
    );
    expect(onStartRunner).toHaveBeenCalledWith("demo");
  });

  it("owned (non attaché) : ni badge lecture seule ni bouton démarrer un runner", () => {
    renderView(() => ({
      kind: "claude-code",
      model: "opus",
      coordinator: "Aragorn",
    }));
    expect(screen.queryByText(/lecture seule/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Démarrer un runner du cockpit/ }),
    ).toBeNull();
  });
});

// --- L26 (révision recette) : mode focus de la Table (toggle plein écran) ---

describe("WorkingView — mode focus L26", () => {
  function renderFocus(focus: boolean, onToggleFocus = vi.fn()) {
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
        onSelectConversation={() => {}}
        onSetMode={() => {}}
        onSetAgent={() => {}}
        onSend={() => {}}
        onStartRunner={() => {}}
        onRequestNextStep={() => {}}
        resolveRunner={() => ({
          kind: "claude-code",
          model: "",
          coordinator: "Aragorn",
        })}
        focus={focus}
        onToggleFocus={onToggleFocus}
      />,
    );
  }

  it("focus → la section porte `wk--focus` (masque worklist en CSS), et garde `.wkright` + onglets", () => {
    const { container } = renderFocus(true);
    // La classe qui pilote le masquage (worklist) via CSS est bien posée.
    expect(container.querySelector(".wk.wk--focus")).not.toBeNull();
    // Colonne de widgets droite CONSERVÉE (exigence explicite).
    expect(container.querySelector(".wkright")).not.toBeNull();
    // Onglets + toggle plein écran TOUJOURS présents.
    expect(container.querySelector(".projtabs")).not.toBeNull();
    expect(container.querySelector(".fsbtn")).not.toBeNull();
    // Toggle Shell/Conversation conservé.
    expect(container.querySelector(".modetoggle")).not.toBeNull();
    // La worklist reste dans le DOM (masquée par CSS, non démontée).
    expect(container.querySelector(".worklist")).not.toBeNull();
  });

  it("normal (focus=false) → pas de `wk--focus`", () => {
    const { container } = renderFocus(false);
    expect(container.querySelector(".wk--focus")).toBeNull();
    expect(container.querySelector(".wk")).not.toBeNull();
  });

  it("clic sur le toggle plein écran → onToggleFocus", () => {
    const onToggleFocus = vi.fn();
    renderFocus(false, onToggleFocus);
    fireEvent.click(
      screen.getByRole("button", { name: /Plein écran \(mode focus\)/ }),
    );
    expect(onToggleFocus).toHaveBeenCalledTimes(1);
  });
});
