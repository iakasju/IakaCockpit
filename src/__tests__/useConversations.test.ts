import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useConversations,
  DEFAULT_RESPONSIBLE,
  mentionPrefix,
  parseMention,
  slotIdFor,
  type ChatTurn,
} from "../hooks/useConversations";

describe("useConversations — 1 conversation/projet (L8, migré L10b)", () => {
  it("ouvre une conversation et la rend active (agent = responsable par défaut)", () => {
    const { result } = renderHook(() => useConversations());
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
    const { result } = renderHook(() => useConversations());
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

  it("toggle de mode NE TOUCHE PAS au ptySessionId (le runner survit, D4/L10a)", () => {
    const { result } = renderHook(() => useConversations());
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
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    expect(result.current.active?.history).toEqual([]);
  });

  it("L9-C1 : avec initialHistory → la conversation est préchargée (copie défensive)", () => {
    const { result } = renderHook(() => useConversations());
    const seed: ChatTurn[] = [
      { role: "user", content: "salut" },
      { role: "assistant", content: "bonjour" },
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
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() =>
      result.current.openConversation("p1", "p1", "/root/p1", "Aragorn", [
        { role: "user", content: "tardif" },
      ]),
    );
    expect(result.current.active?.history).toEqual([]);
  });

  it("setAgent change l'interlocuteur courant (persona)", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.setAgent("p1", "Gandalf"));
    expect(result.current.active?.agent).toBe("Gandalf");
  });

  // --- Entrée partagée L10b : echoUser ---

  it("echoUser ajoute le tour user, fixe la persona courante et lève pending", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.echoUser("p1", "Aragorn", "Bonjour"));

    const conv = result.current.conversations[0];
    // Le tour user reste SANS agent (L9 : pas d'avatar côté utilisateur).
    expect(conv.history).toEqual([{ role: "user", content: "Bonjour" }]);
    expect(conv.history[0].agent).toBeUndefined();
    expect(conv.agent).toBe("Aragorn");
    expect(conv.pending).toBe(true);
  });

  it("echoUser avec @agent fixe la persona mentionnée comme courante", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.echoUser("p1", "Legolas", "@Legolas : valide ça"));
    expect(result.current.active?.agent).toBe("Legolas");
    // Le contenu est échoé VERBATIM (préfixe @agent conservé, arbitrage #5).
    expect(result.current.active?.history[0].content).toBe(
      "@Legolas : valide ça",
    );
  });

  it("echoUser ignore un message vide", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.echoUser("p1", "Aragorn", "   "));
    expect(result.current.conversations[0].history).toEqual([]);
  });

  // --- Vue filtrée L10b : appendTurn ---

  it("appendTurn (parole assistant) ajoute le tour et RETOMBE le pending", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.echoUser("p1", "Aragorn", "salut"));
    expect(result.current.conversations[0].pending).toBe(true);

    act(() =>
      result.current.appendTurn("p1", {
        role: "assistant",
        content: "Bonjour, voici l'état.",
        kind: "parole",
        agent: "Aragorn",
      }),
    );
    const conv = result.current.conversations[0];
    expect(conv.history[1]).toEqual({
      role: "assistant",
      content: "Bonjour, voici l'état.",
      kind: "parole",
      agent: "Aragorn",
    });
    expect(conv.pending).toBe(false);
  });

  it("appendTurn (geste/délégation/pensée) NE retombe PAS le pending (le chef travaille)", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.echoUser("p1", "Aragorn", "liste les fichiers"));

    act(() =>
      result.current.appendTurn("p1", {
        role: "assistant",
        content: "Bash — ls -1",
        kind: "geste",
      }),
    );
    expect(result.current.conversations[0].pending).toBe(true);
    expect(result.current.conversations[0].history).toHaveLength(2);
  });

  // --- Fermeture au retrait de la Table (L23, incrément 2026-07-12) ---

  it("closeConversation retire la conversation et, si c'était l'active, met active/activeProjectId à null", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.openConversation("p2", "p2", "/root/p2"));
    // p2 est l'active (dernière ouverte).
    expect(result.current.active?.projectId).toBe("p2");

    // Fermer un projet NON actif : il disparaît, l'active est préservée.
    act(() => result.current.closeConversation("p1"));
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].projectId).toBe("p2");
    expect(result.current.active?.projectId).toBe("p2");
    expect(result.current.activeProjectId).toBe("p2");

    // Fermer l'active : elle disparaît ET active/activeProjectId retombent à null.
    act(() => result.current.closeConversation("p2"));
    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.active).toBeNull();
    expect(result.current.activeProjectId).toBeNull();
  });

  it("closeConversation d'un projet inconnu est un no-op (aucune conv retirée, active intacte)", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() => result.current.closeConversation("absent"));
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.active?.projectId).toBe("p1");
  });

  it("appendTurn FIGE l'émetteur par-tour : changer l'agent courant ne le modifie pas (L9)", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    act(() =>
      result.current.appendTurn("p1", {
        role: "assistant",
        content: "tour d'Aragorn",
        kind: "parole",
        agent: "Aragorn",
      }),
    );
    act(() => result.current.setAgent("p1", "Legolas"));

    const conv = result.current.conversations[0];
    // L'émetteur du tour déjà présent reste Aragorn (trace intacte).
    expect(conv.history[0].agent).toBe("Aragorn");
    // La persona COURANTE a bien changé.
    expect(conv.agent).toBe("Legolas");
  });
});

describe("useConversations — source attachée / owned (L25)", () => {
  it("ouverture SANS attach → source owned, pas de coordonnées d'attache", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    const c = result.current.active!;
    expect(c.source).toBe("owned");
    expect(c.attachedSessionId).toBeNull();
    expect(c.attachedTranscriptPath).toBeNull();
  });

  it("ouverture AVEC attach → source attached + session/transcript externes portés", () => {
    const { result } = renderHook(() => useConversations());
    act(() =>
      result.current.openConversation("p1", "p1", "/root/p1", "Aragorn", [], {
        sessionId: "ext-123",
        transcriptPath: "/home/u/.claude/projects/-root-p1/ext-123.jsonl",
      }),
    );
    const c = result.current.active!;
    expect(c.source).toBe("attached");
    expect(c.attachedSessionId).toBe("ext-123");
    expect(c.attachedTranscriptPath).toBe(
      "/home/u/.claude/projects/-root-p1/ext-123.jsonl",
    );
  });

  it("convertToOwned : attaché → owned et vide les coordonnées d'attache", () => {
    const { result } = renderHook(() => useConversations());
    act(() =>
      result.current.openConversation("p1", "p1", "/root/p1", "Aragorn", [], {
        sessionId: "ext-123",
        transcriptPath: "/x/ext-123.jsonl",
      }),
    );
    act(() => result.current.convertToOwned("p1"));
    const c = result.current.active!;
    expect(c.source).toBe("owned");
    expect(c.attachedSessionId).toBeNull();
    expect(c.attachedTranscriptPath).toBeNull();
    // Le ptySessionId (clef de montage) reste stable (aucune régression clef).
    expect(c.ptySessionId).toBeTruthy();
  });

  it("convertToOwned : no-op idempotent sur une conversation déjà owned", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1"));
    const before = result.current.active;
    act(() => result.current.convertToOwned("p1"));
    // Même référence d'objet (patch renvoie `c` inchangé → pas de nouvel objet).
    expect(result.current.active).toBe(before);
  });
});

describe("useConversations — slots multi-runners d'agent (L31-P1)", () => {
  it("slotIdFor : id déterministe et distinct d'un vrai id projet (séparateur ::agent::)", () => {
    expect(slotIdFor("iaka-demo", "Gimli")).toBe("iaka-demo::agent::gimli");
    // Insensible à la casse du nom (dédoublonnage stable).
    expect(slotIdFor("p1", "Legolas")).toBe(slotIdFor("p1", "legolas"));
  });

  it("openAgentSlot (runner exécutable) crée un slot owned DISTINCT + porte les métadonnées", () => {
    const { result } = renderHook(() => useConversations());
    // Le coordinateur (conversation historique du projet).
    act(() => result.current.openConversation("p1", "p1", "/root/p1", "Aragorn"));
    let sid = "";
    act(() => {
      sid = result.current.openAgentSlot(
        "p1",
        "/root/p1",
        "Gimli",
        "codex",
        "gpt-5",
      );
    });
    // Deux conversations : coordinateur + slot d'agent (multi-slots coexistent).
    expect(result.current.conversations).toHaveLength(2);
    const slotId = slotIdFor("p1", "Gimli");
    const slot = result.current.conversations.find(
      (c) => c.projectId === slotId,
    )!;
    expect(slot.source).toBe("owned");
    expect(slot.agent).toBe("Gimli");
    expect(slot.title).toBe("Gimli");
    expect(slot.slot).toEqual({
      realProjectId: "p1",
      agent: "Gimli",
      runner: "codex",
      model: "gpt-5",
    });
    expect(slot.ptySessionId).toBe(sid);
    // Le coordinateur reste SANS métadonnées de slot (rétro-compat).
    const coord = result.current.conversations.find((c) => c.projectId === "p1")!;
    expect(coord.slot).toBeUndefined();
    // Le slot devient l'active.
    expect(result.current.active?.projectId).toBe(slotId);
  });

  it("openAgentSlot est IDEMPOTENT : ré-active le même slot, jamais de doublon/2ᵉ spawn", () => {
    const { result } = renderHook(() => useConversations());
    let s1 = "";
    act(() => {
      s1 = result.current.openAgentSlot("p1", "/root/p1", "Gimli", "codex", "");
    });
    // Ré-appel → même ptySessionId, pas de nouvelle conversation.
    let s2 = "";
    act(() => {
      s2 = result.current.openAgentSlot("p1", "/root/p1", "Gimli", "codex", "");
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(s2).toBe(s1);
  });

  it("plusieurs slots d'agents coexistent pour un même projet (ids distincts)", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1", "Aragorn"));
    act(() =>
      result.current.openAgentSlot("p1", "/root/p1", "Gimli", "codex", ""),
    );
    act(() =>
      result.current.openAgentSlot("p1", "/root/p1", "Legolas", "claude-code", ""),
    );
    expect(result.current.conversations).toHaveLength(3);
    const ids = result.current.conversations.map((c) => c.projectId);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain(slotIdFor("p1", "Gimli"));
    expect(ids).toContain(slotIdFor("p1", "Legolas"));
  });

  it("closeConversation d'un slot d'agent ne touche pas la conversation coordinateur", () => {
    const { result } = renderHook(() => useConversations());
    act(() => result.current.openConversation("p1", "p1", "/root/p1", "Aragorn"));
    act(() =>
      result.current.openAgentSlot("p1", "/root/p1", "Gimli", "codex", ""),
    );
    act(() => result.current.closeConversation(slotIdFor("p1", "Gimli")));
    // Le coordinateur (projet) survit.
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].projectId).toBe("p1");
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
