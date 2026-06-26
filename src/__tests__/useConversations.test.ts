import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useConversations,
  DEFAULT_RESPONSIBLE,
  mentionPrefix,
  parseMention,
} from "../hooks/useConversations";
import type { Backend, ChatReply } from "../api/backend";

function makeApi(
  chatImpl?: (
    path: string,
    agent: string,
    messages: { role: string; content: string }[],
  ) => Promise<ChatReply>,
): Backend {
  const impl =
    chatImpl ??
    (async () => ({
      content: "réponse",
      provider: "mock" as const,
      model: null,
      tokens_in: null,
      tokens_out: null,
    }));
  return { chat: vi.fn(impl) } as unknown as Backend;
}

describe("useConversations — 1 conversation/projet (L8/D1)", () => {
  it("ouvre une conversation et la rend active (agent = responsable par défaut)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    act(() => {
      result.current.openConversation("p1", "p1", "/root/p1");
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.active?.projectId).toBe("p1");
    expect(result.current.active?.agent).toBe(DEFAULT_RESPONSIBLE);
    // Défaut = chat (AR-2).
    expect(result.current.active?.mode).toBe("chat");
  });

  it("dédoublonne par projectId (ré-active sans créer de doublon)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    let id1 = "";
    act(() => {
      id1 = result.current.openConversation("p1", "p1", "/root/p1");
    });
    act(() => result.current.openConversation("p2", "p2", "/root/p2"));
    let id1bis = "";
    act(() => {
      id1bis = result.current.openConversation("p1", "p1", "/root/p1");
    });
    expect(result.current.conversations).toHaveLength(2);
    // Même ptySessionId stable au ré-accès.
    expect(id1bis).toBe(id1);
    expect(result.current.active?.projectId).toBe("p1");
  });

  it("toggle de mode NE TOUCHE PAS au ptySessionId (le shell survit, D4)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    let sid = "";
    act(() => {
      sid = result.current.openConversation("p1", "p1", "/root/p1");
    });
    act(() => result.current.setMode("p1", "shell"));
    expect(result.current.active?.mode).toBe("shell");
    expect(result.current.active?.ptySessionId).toBe(sid);
    act(() => result.current.setMode("p1", "chat"));
    expect(result.current.active?.mode).toBe("chat");
    // Inchangé : pas de nouvelle session (pas de pty.close au toggle).
    expect(result.current.active?.ptySessionId).toBe(sid);
  });

  it("L9-C2 : sans initialHistory → history vide (rétro-compat L8 stricte)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    expect(result.current.active?.history).toEqual([]);
  });

  it("L9-C1 : avec initialHistory → la conversation est préchargée (copie défensive)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    const seed = [
      { role: "user" as const, content: "salut" },
      { role: "assistant" as const, content: "bonjour" },
    ];
    act(() =>
      result.current.openConversation("p1", "p1", "/root/p1", "Aragorn", seed),
    );
    expect(result.current.active?.history).toEqual(seed);
    // Copie défensive : muter la source ne doit pas affecter la conversation.
    seed.push({ role: "user", content: "intrus" });
    expect(result.current.active?.history).toHaveLength(2);
  });

  it("L9-C1 : initialHistory ignoré si la conversation existe déjà (création seulement)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() =>
      result.current.openConversation("p1", "p1", "/root/p1", "Aragorn", [
        { role: "user", content: "tardif" },
      ]),
    );
    expect(result.current.active?.history).toEqual([]);
  });

  it("setAgent change l'interlocuteur courant (persona)", () => {
    const { result } = renderHook(() => useConversations(makeApi()));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.setAgent("p1", "Gandalf"));
    expect(result.current.active?.agent).toBe("Gandalf");
  });

  it("send ajoute le tour user, appelle backend.chat, ajoute le tour assistant", async () => {
    const api = makeApi(async () => ({
      content: "Voici la réponse.",
      provider: "litellm",
      model: "m",
      tokens_in: 1,
      tokens_out: 2,
    }));
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));

    await act(async () => {
      await result.current.send("p1", "Aragorn", "Bonjour");
    });

    const conv = result.current.conversations[0];
    expect(conv.history).toEqual([
      { role: "user", content: "Bonjour" },
      { role: "assistant", content: "Voici la réponse." },
    ]);
    expect(conv.pending).toBe(false);
    // L'historique (tour user) est bien passé à la commande.
    expect(api.chat).toHaveBeenCalledWith("/root/p1", "Aragorn", [
      { role: "user", content: "Bonjour" },
    ]);
  });

  it("send est multi-tours : le 2e message inclut l'historique précédent", async () => {
    const api = makeApi(async () => ({
      content: "ok",
      provider: "mock",
      model: null,
      tokens_in: null,
      tokens_out: null,
    }));
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));

    await act(async () => {
      await result.current.send("p1", "Aragorn", "premier");
    });
    await act(async () => {
      await result.current.send("p1", "Aragorn", "second");
    });

    // 2e appel : l'historique contient les tours précédents (multi-tours réel).
    const secondCall = (api.chat as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall[2]).toEqual([
      { role: "user", content: "premier" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "second" },
    ]);
  });

  it("send avec @agent passe la persona mentionnée et la fixe comme courante", async () => {
    const api = makeApi();
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));

    await act(async () => {
      await result.current.send("p1", "Legolas", "@Legolas : valide ça");
    });

    expect(api.chat).toHaveBeenCalledWith(
      "/root/p1",
      "Legolas",
      expect.anything(),
    );
    expect(result.current.active?.agent).toBe("Legolas");
  });

  it("send : une erreur backend peuple `error` sans crash et lève pending", async () => {
    const api = makeApi(async () => {
      throw new Error("endpoint IA injoignable");
    });
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));

    await act(async () => {
      await result.current.send("p1", "Aragorn", "coucou");
    });

    const conv = result.current.conversations[0];
    expect(conv.error).toContain("injoignable");
    expect(conv.pending).toBe(false);
    // Le tour user reste, pas de tour assistant fantôme.
    expect(conv.history).toEqual([{ role: "user", content: "coucou" }]);
  });

  it("send ignore un message vide", async () => {
    const api = makeApi();
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    await act(async () => {
      await result.current.send("p1", "Aragorn", "   ");
    });
    expect(api.chat).not.toHaveBeenCalled();
    expect(result.current.conversations[0].history).toEqual([]);
  });

  it("pending est vrai pendant l'appel (statut roster « travaille »)", async () => {
    let resolveChat: (r: ChatReply) => void = () => {};
    const api = makeApi(
      () =>
        new Promise<ChatReply>((res) => {
          resolveChat = res;
        }),
    );
    const { result } = renderHook(() => useConversations(api));
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = result.current.send("p1", "Aragorn", "hello");
    });
    await waitFor(() => expect(result.current.active?.pending).toBe(true));

    await act(async () => {
      resolveChat({
        content: "fin",
        provider: "mock",
        model: null,
        tokens_in: null,
        tokens_out: null,
      });
      await sendPromise;
    });
    expect(result.current.active?.pending).toBe(false);
  });
});

describe("useConversations — helpers @agent (D3/D6)", () => {
  it("mentionPrefix produit `@<Agent> : `", () => {
    expect(mentionPrefix("Gandalf")).toBe("@Gandalf : ");
  });

  it("parseMention extrait l'agent en tête, sinon null", () => {
    expect(parseMention("@Gandalf : cadre ce lot")).toBe("Gandalf");
    expect(parseMention("  @Legolas valide")).toBe("Legolas");
    expect(parseMention("pas de mention")).toBeNull();
    expect(parseMention("au milieu @Gimli ne compte pas")).toBeNull();
  });
});
