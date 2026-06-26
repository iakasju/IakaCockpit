import { describe, it, expect } from "vitest";
import { runnerEventToTurn, deriveWorkingAgents } from "../hooks/runnerView";
import type { RunnerEvent } from "../api/backend";
import type { ChatTurn } from "../hooks/useConversations";

const base = { is_sidechain: false } as const;

describe("runnerEventToTurn — projection RunnerEvent → ChatTurn (L10b)", () => {
  it("parole assistant → bulle parole (agent indéfini = persona courante)", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "parole",
      role: "assistant",
      text: "Bonjour, voici l'état.",
    };
    expect(runnerEventToTurn(ev)).toEqual({
      role: "assistant",
      content: "Bonjour, voici l'état.",
      kind: "parole",
    });
  });

  it("parole UTILISATEUR → IGNORÉE (déjà échoée localement, anti-doublon)", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "parole",
      role: "user",
      text: "Bonjour",
    };
    expect(runnerEventToTurn(ev)).toBeNull();
  });

  it("parole assistant vide → ignorée", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "parole",
      role: "assistant",
      text: "   ",
    };
    expect(runnerEventToTurn(ev)).toBeNull();
  });

  it("délégation → ligne attribuée au subagent (VERBATIM, pas de reformulation de la description)", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "delegation",
      role: "assistant",
      agent: "gandalf",
      text: "Cadrer le lot L11",
    };
    expect(runnerEventToTurn(ev)).toEqual({
      role: "assistant",
      content: "Délègue à gandalf : Cadrer le lot L11",
      kind: "delegation",
      agent: "gandalf",
    });
  });

  it("geste → ligne avec nom d'outil + entrée résumée", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "geste",
      role: "assistant",
      tool_name: "Bash",
      tool_use_id: "t1",
      tool_input: '{"command":"ls -1"}',
    };
    expect(runnerEventToTurn(ev)).toEqual({
      role: "assistant",
      content: 'Bash — {"command":"ls -1"}',
      kind: "geste",
    });
  });

  it("activité (tool_result) → ligne compacte", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "activite",
      role: "user",
      tool_use_id: "t1",
      text: "README.md specs",
    };
    expect(runnerEventToTurn(ev)).toEqual({
      role: "assistant",
      content: "Résultat : README.md specs",
      kind: "activite",
    });
  });

  it("pensée non vide → ligne pensée (masquable côté Chat)", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "pensee",
      role: "assistant",
      text: "je réfléchis",
    };
    expect(runnerEventToTurn(ev)).toEqual({
      role: "assistant",
      content: "je réfléchis",
      kind: "pensee",
    });
  });

  it("pensée vide → ignorée", () => {
    const ev: RunnerEvent = {
      ...base,
      kind: "pensee",
      role: "assistant",
      text: "",
    };
    expect(runnerEventToTurn(ev)).toBeNull();
  });
});

describe("deriveWorkingAgents — statut roster vivant (L10b/P3)", () => {
  it("une délégation met le sous-agent au travail (nom minuscule)", () => {
    const history: ChatTurn[] = [
      { role: "user", content: "cadre le lot" },
      {
        role: "assistant",
        content: "Délègue à gandalf : cadrer",
        kind: "delegation",
        agent: "gandalf",
      },
    ];
    const w = deriveWorkingAgents(history, false, "Aragorn");
    expect(w.has("gandalf")).toBe(true);
    expect(w.has("aragorn")).toBe(false); // pas pending
  });

  it("une parole assistant du chef clôt les délégations en cours", () => {
    const history: ChatTurn[] = [
      {
        role: "assistant",
        content: "Délègue à gandalf",
        kind: "delegation",
        agent: "gandalf",
      },
      // Le chef reprend la main (compte-rendu remonté) → délégation close.
      { role: "assistant", content: "Cadrage terminé, voici la suite.", agent: "Aragorn" },
    ];
    const w = deriveWorkingAgents(history, false, "Aragorn");
    expect(w.has("gandalf")).toBe(false);
    expect(w.size).toBe(0);
  });

  it("pending → l'interlocuteur courant (chef) travaille", () => {
    const w = deriveWorkingAgents([], true, "Aragorn");
    expect(w.has("aragorn")).toBe(true);
  });

  it("gestes/activités/pensées ne changent pas le set de délégués", () => {
    const history: ChatTurn[] = [
      {
        role: "assistant",
        content: "Délègue à legolas",
        kind: "delegation",
        agent: "legolas",
      },
      { role: "assistant", content: "Bash — ls", kind: "geste" },
      { role: "assistant", content: "Résultat : ok", kind: "activite" },
      { role: "assistant", content: "je réfléchis", kind: "pensee" },
    ];
    const w = deriveWorkingAgents(history, false, "Aragorn");
    expect(w.has("legolas")).toBe(true);
  });
});
