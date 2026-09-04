import { describe, it, expect } from "vitest";
import {
  deriveLiveStatus,
  deriveRosterLiveStatus,
  slotProjectIdForAgent,
  ownedConversationIds,
  RUNNING_WINDOW_MS,
} from "../hooks/useLiveStatus";

describe("deriveLiveStatus — running/idle par récence du tailer (L31-P2, AR-5)", () => {
  const now = 1_000_000;

  it("event récent (dans la fenêtre) → running", () => {
    expect(deriveLiveStatus(now - 1_000, now)).toBe("running");
    expect(deriveLiveStatus(now, now)).toBe("running");
  });

  it("event à l'exacte borne de la fenêtre → running (inclusif)", () => {
    expect(deriveLiveStatus(now - RUNNING_WINDOW_MS, now)).toBe("running");
  });

  it("event juste au-delà de la fenêtre → idle", () => {
    expect(deriveLiveStatus(now - RUNNING_WINDOW_MS - 1, now)).toBe("idle");
  });

  it("event très ancien → idle", () => {
    expect(deriveLiveStatus(now - 10 * RUNNING_WINDOW_MS, now)).toBe("idle");
  });

  it("aucun event (undefined) → idle (jamais inventé)", () => {
    expect(deriveLiveStatus(undefined, now)).toBe("idle");
  });

  it("timestamp dans le futur (horloges désalignées) → idle (défensif)", () => {
    expect(deriveLiveStatus(now + 5_000, now)).toBe("idle");
  });

  it("fenêtre personnalisée respectée", () => {
    expect(deriveLiveStatus(now - 5_000, now, 3_000)).toBe("idle");
    expect(deriveLiveStatus(now - 2_000, now, 3_000)).toBe("running");
  });
});

describe("slotProjectIdForAgent — résolution du slot d'un agent", () => {
  it("coordinateur → le projet lui-même (insensible à la casse)", () => {
    expect(slotProjectIdForAgent("proj", "Aragorn", "aragorn")).toBe("proj");
    expect(slotProjectIdForAgent("proj", "aragorn", "Aragorn")).toBe("proj");
  });

  it("agent non coordinateur → slot synthétique", () => {
    expect(slotProjectIdForAgent("proj", "Gimli", "Aragorn")).toBe(
      "proj::agent::gimli",
    );
  });

  it("sans coordinateur fourni → toujours slot synthétique", () => {
    expect(slotProjectIdForAgent("proj", "Gimli", undefined)).toBe(
      "proj::agent::gimli",
    );
  });
});

describe(
  "ownedConversationIds — F1 (lot « Statut vivant et session attachée ») : le prédicat " +
    "« slot RÉELLEMENT possédé » ne retient QUE source:owned",
  () => {
    it("liste mêlant owned et attached → ne retient QUE les owned", () => {
      const result = ownedConversationIds([
        { projectId: "a", source: "owned" },
        { projectId: "b", source: "attached" },
        { projectId: "c", source: "owned" },
      ]);
      expect(result).toEqual(new Set(["a", "c"]));
      expect(result.has("b")).toBe(false);
    });

    it("liste vide → ensemble vide (non vacuous : pas de valeur par défaut cachée)", () => {
      expect(ownedConversationIds([])).toEqual(new Set());
    });
  },
);

describe("deriveRosterLiveStatus — statut par agent (none/running/idle)", () => {
  const now = 1_000_000;
  const members = [
    { agent: "Aragorn" },
    { agent: "Gimli" },
    { agent: "Legolas" },
  ];

  it("aucun slot ouvert → tous « non lancé » (none)", () => {
    const map = deriveRosterLiveStatus(
      members,
      "proj",
      "Aragorn",
      new Set(),
      {},
      now,
    );
    expect(map).toEqual({ aragorn: "none", gimli: "none", legolas: "none" });
  });

  it("coordinateur avec event récent → running ; agents sans slot → none", () => {
    const open = new Set(["proj"]);
    const map = deriveRosterLiveStatus(
      members,
      "proj",
      "Aragorn",
      open,
      { proj: now - 1_000 },
      now,
    );
    expect(map.aragorn).toBe("running");
    expect(map.gimli).toBe("none");
    expect(map.legolas).toBe("none");
  });

  it("slot d'agent ouvert mais silencieux → idle ; slot d'agent frais → running", () => {
    const open = new Set(["proj", "proj::agent::gimli", "proj::agent::legolas"]);
    const map = deriveRosterLiveStatus(
      members,
      "proj",
      "Aragorn",
      open,
      {
        proj: now - 500,
        "proj::agent::gimli": now - 10 * RUNNING_WINDOW_MS, // ancien → idle
        "proj::agent::legolas": now - 2_000, // frais → running
      },
      now,
    );
    expect(map.aragorn).toBe("running");
    expect(map.gimli).toBe("idle");
    expect(map.legolas).toBe("running");
  });

  it("slot ouvert sans aucun event → idle (pas none : le slot existe)", () => {
    const open = new Set(["proj::agent::gimli"]);
    const map = deriveRosterLiveStatus(members, "proj", "Aragorn", open, {}, now);
    expect(map.gimli).toBe("idle");
    // Les autres (pas de slot) restent none.
    expect(map.aragorn).toBe("none");
  });
});
