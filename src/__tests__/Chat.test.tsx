import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Chat } from "../components/Chat";
import type { ChatTurn } from "../hooks/useConversations";

afterEach(cleanup);

const HISTORY: ChatTurn[] = [
  { role: "user", content: "Salut Aragorn" },
  { role: "assistant", content: "Bonjour, voici l'état du projet." },
];

describe("Chat — bulles + saisie (L8/D2)", () => {
  it("rend les bulles user et assistant", () => {
    render(
      <Chat
        history={HISTORY}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
      />,
    );
    expect(screen.getByText("Salut Aragorn")).toBeTruthy();
    expect(screen.getByText("Bonjour, voici l'état du projet.")).toBeTruthy();
  });

  it("désactive la saisie et le bouton quand pending", () => {
    render(
      <Chat
        history={HISTORY}
        agent="Aragorn"
        pending
        error={null}
        draft="en cours"
        onDraftChange={() => {}}
        onSend={() => {}}
      />,
    );
    const field = screen.getByLabelText("Saisie de message") as HTMLTextAreaElement;
    expect(field.disabled).toBe(true);
    const btn = screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("envoie le contenu courant à la soumission", () => {
    const onSend = vi.fn();
    render(
      <Chat
        history={[]}
        agent="Aragorn"
        pending={false}
        error={null}
        draft="mon message"
        onDraftChange={() => {}}
        onSend={onSend}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSend).toHaveBeenCalledWith("mon message");
  });

  it("Entrée envoie, le bouton est désactivé si le brouillon est vide", () => {
    const onSend = vi.fn();
    render(
      <Chat
        history={[]}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={onSend}
      />,
    );
    const btn = screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // Entrée sur un champ vide n'envoie rien.
    fireEvent.keyDown(screen.getByLabelText("Saisie de message"), {
      key: "Enter",
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("affiche l'erreur de dégradation", () => {
    render(
      <Chat
        history={[]}
        agent="Aragorn"
        pending={false}
        error="endpoint IA injoignable"
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("injoignable");
  });

  it("propage la saisie via onDraftChange", () => {
    const onDraftChange = vi.fn();
    render(
      <Chat
        history={[]}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={onDraftChange}
        onSend={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Saisie de message"), {
      target: { value: "@Gandalf : " },
    });
    expect(onDraftChange).toHaveBeenCalledWith("@Gandalf : ");
  });
});
