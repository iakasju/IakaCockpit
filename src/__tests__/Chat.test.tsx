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

  it("L9-A5 : affiche l'avatar de l'agent dans la bulle assistant (pas dans la bulle user)", () => {
    const resolveAvatar = (agent: string) =>
      `/assets/${agent.toLowerCase()}.png`;
    render(
      <Chat
        history={HISTORY}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={resolveAvatar}
      />,
    );
    // Une seule image (la bulle assistant), pas pour la bulle user.
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(screen.getByAltText("Aragorn")).toBeTruthy();
    // Le nom (bwho) reste affiché.
    expect(screen.getByText("Aragorn")).toBeTruthy();
  });

  it("L9-A2 fallback : resolveAvatar=null → pas d'avatar (rendu L8), bwho conservé", () => {
    render(
      <Chat
        history={HISTORY}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={() => null}
      />,
    );
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Aragorn")).toBeTruthy();
  });

  it("L9 fix : l'avatar de chaque bulle vient de turn.agent (émetteur figé), pas de l'agent courant", () => {
    // Trace réelle : un tour d'Aragorn puis un tour de Gandalf.
    const traced: ChatTurn[] = [
      { role: "user", content: "cadre le lot" },
      { role: "assistant", content: "je délègue", agent: "Aragorn" },
      { role: "assistant", content: "cadrage fait", agent: "Gandalf" },
    ];
    const resolveAvatar = (a: string) => `/assets/${a.toLowerCase()}.png`;
    render(
      <Chat
        history={traced}
        agent="Gimli" // agent COURANT volontairement différent des émetteurs.
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={resolveAvatar}
      />,
    );
    // Chaque bulle porte l'avatar + le nom de SON émetteur, pas de l'agent courant.
    expect(screen.getByAltText("Aragorn")).toBeTruthy();
    expect(screen.getByAltText("Gandalf")).toBeTruthy();
    expect(screen.queryByAltText("Gimli")).toBeNull();
    // bwho par tour : on retrouve bien Aragorn ET Gandalf comme noms d'émetteur.
    const bubbles = document.querySelectorAll(".bubble.them .bwho");
    const names = Array.from(bubbles).map((n) => n.textContent);
    expect(names).toEqual(["Aragorn", "Gandalf"]);
  });

  it("L9 fix (CŒUR DU BUG) : changer l'agent courant NE CHANGE PAS les avatars des tours déjà présents", () => {
    const traced: ChatTurn[] = [
      { role: "assistant", content: "tour 1", agent: "Aragorn" },
      { role: "assistant", content: "tour 2", agent: "Gandalf" },
    ];
    const resolveAvatar = (a: string) => `/assets/${a.toLowerCase()}.png`;
    const props = {
      history: traced,
      pending: false,
      error: null,
      draft: "",
      onDraftChange: () => {},
      onSend: () => {},
      resolveAvatar,
    };
    const { rerender } = render(<Chat {...props} agent="Aragorn" />);

    const srcsBefore = (
      screen.getAllByRole("img") as HTMLImageElement[]
    ).map((i) => i.getAttribute("src"));
    expect(srcsBefore).toEqual([
      "/assets/aragorn.png",
      "/assets/gandalf.png",
    ]);

    // L'utilisateur clique un NOUVEL agent → l'agent courant de la conv change.
    rerender(<Chat {...props} agent="Legolas" />);

    const srcsAfter = (
      screen.getAllByRole("img") as HTMLImageElement[]
    ).map((i) => i.getAttribute("src"));
    // Cœur du bug : les avatars des tours passés sont IDENTIQUES (trace intacte).
    expect(srcsAfter).toEqual(srcsBefore);
    // Aucun avatar n'a basculé sur le nouvel interlocuteur.
    expect(screen.queryByAltText("Legolas")).toBeNull();
  });

  it("L9 fix : sans turn.agent (tour L8 legacy) → fallback sur la persona courante", () => {
    const legacy: ChatTurn[] = [
      { role: "assistant", content: "ancien tour sans émetteur" },
    ];
    const { rerender } = render(
      <Chat
        history={legacy}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={(a) => `/assets/${a.toLowerCase()}.png`}
      />,
    );
    expect(screen.getByAltText("Aragorn")).toBeTruthy();
    // Rétro-compat assumée : un tour SANS émetteur suit la persona courante.
    rerender(
      <Chat
        history={legacy}
        agent="Gandalf"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={(a) => `/assets/${a.toLowerCase()}.png`}
      />,
    );
    expect(screen.getByAltText("Gandalf")).toBeTruthy();
  });

  it("L9-A2 fallback : onError sur l'avatar → l'image disparaît, jamais cassée", () => {
    render(
      <Chat
        history={HISTORY}
        agent="Aragorn"
        pending={false}
        error={null}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        resolveAvatar={() => "/broken.png"}
      />,
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Aragorn")).toBeTruthy();
  });
});
