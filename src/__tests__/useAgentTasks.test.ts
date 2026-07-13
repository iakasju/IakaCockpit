import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  reduceAgentTasks,
  useAgentTasks,
  type AgentTask,
} from "../hooks/useAgentTasks";
import type { RunnerEvent } from "../api/backend";

/**
 * useAgentTasks — accumulation des tâches/délégations du transcript (panneau
 * « Tâches en cours »). On teste le réducteur PUR (`reduceAgentTasks`) puis le hook
 * (accumulation par projet). Contrat : `delegation` → running, `activite` du même
 * `tool_use_id` → done, parse défensif (event sans id ignoré).
 */

/** Fabrique un `RunnerEvent` minimal (champs requis + surcharges). */
function ev(over: Partial<RunnerEvent> & { kind: RunnerEvent["kind"] }): RunnerEvent {
  return { role: "assistant", is_sidechain: false, ...over };
}

describe("reduceAgentTasks — réducteur pur", () => {
  it("delegation (+ tool_use_id) → ouvre une tâche running", () => {
    const out = reduceAgentTasks(
      [],
      ev({
        kind: "delegation",
        tool_use_id: "t1",
        agent: "gandalf",
        text: "Cadrer L12",
        ts: "2026-06-27T10:00:00Z",
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject<Partial<AgentTask>>({
      id: "t1",
      agent: "gandalf",
      description: "Cadrer L12",
      status: "running",
    });
  });

  it("activite au MÊME tool_use_id → passe la tâche à done", () => {
    const running = reduceAgentTasks(
      [],
      ev({ kind: "delegation", tool_use_id: "t1", agent: "gandalf", text: "x" }),
    );
    const done = reduceAgentTasks(running, ev({ kind: "activite", tool_use_id: "t1" }));
    expect(done[0].status).toBe("done");
    // L'appariement n'altère PAS les autres champs.
    expect(done[0].agent).toBe("gandalf");
  });

  it("doneTs (L29) : absent tant que running, renseigné au done (ts de clôture)", () => {
    const running = reduceAgentTasks(
      [],
      ev({
        kind: "delegation",
        tool_use_id: "t1",
        agent: "gimli",
        text: "coder",
        ts: "2026-06-27T10:00:00Z",
      }),
    );
    // Tant que running : pas de ts de clôture.
    expect(running[0].doneTs).toBeUndefined();
    expect(running[0].ts).toBe("2026-06-27T10:00:00Z");
    const done = reduceAgentTasks(
      running,
      ev({ kind: "activite", tool_use_id: "t1", ts: "2026-06-27T10:12:00Z" }),
    );
    // Le done porte le ts de clôture SANS altérer le ts de début.
    expect(done[0].doneTs).toBe("2026-06-27T10:12:00Z");
    expect(done[0].ts).toBe("2026-06-27T10:00:00Z");
  });

  it("doneTs : activite SANS ts → retombe sur le ts de début (barre mini, jamais négatif)", () => {
    const running = reduceAgentTasks(
      [],
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x", ts: "T0" }),
    );
    const done = reduceAgentTasks(running, ev({ kind: "activite", tool_use_id: "t1" }));
    expect(done[0].status).toBe("done");
    expect(done[0].doneTs).toBe("T0");
  });

  it("activite à un id INCONNU → liste inchangée (même référence, défensif)", () => {
    const tasks = reduceAgentTasks(
      [],
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x" }),
    );
    const out = reduceAgentTasks(tasks, ev({ kind: "activite", tool_use_id: "zzz" }));
    expect(out).toBe(tasks);
  });

  it("event SANS tool_use_id → ignoré (délégation ET activité)", () => {
    const tasks: AgentTask[] = [];
    expect(reduceAgentTasks(tasks, ev({ kind: "delegation", agent: "g", text: "x" }))).toBe(
      tasks,
    );
    expect(reduceAgentTasks(tasks, ev({ kind: "activite" }))).toBe(tasks);
  });

  it("kind non pertinent (parole/geste/pensee) → liste inchangée", () => {
    const tasks: AgentTask[] = [];
    for (const kind of ["parole", "geste", "pensee"] as const) {
      expect(reduceAgentTasks(tasks, ev({ kind, text: "blah" }))).toBe(tasks);
    }
  });

  it("ré-projection : une delegation déjà done n'est PAS rétrogradée running", () => {
    let tasks = reduceAgentTasks(
      [],
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x" }),
    );
    tasks = reduceAgentTasks(tasks, ev({ kind: "activite", tool_use_id: "t1" }));
    expect(tasks[0].status).toBe("done");
    // Re-read du transcript : la même délégation repasse → reste done.
    const re = reduceAgentTasks(
      tasks,
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x" }),
    );
    expect(re[0].status).toBe("done");
  });

  it("delegation identique re-lue (mêmes champs) → même référence (pas de re-render)", () => {
    const tasks = reduceAgentTasks(
      [],
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x", ts: "T" }),
    );
    const again = reduceAgentTasks(
      tasks,
      ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x", ts: "T" }),
    );
    expect(again).toBe(tasks);
  });
});

describe("useAgentTasks — accumulation par projet", () => {
  it("ingest accumule les tâches par projectId (isolation)", () => {
    const { result } = renderHook(() => useAgentTasks());

    act(() => {
      result.current.ingest(
        "projA",
        ev({ kind: "delegation", tool_use_id: "a1", agent: "gandalf", text: "x" }),
      );
      result.current.ingest(
        "projB",
        ev({ kind: "delegation", tool_use_id: "b1", agent: "legolas", text: "y" }),
      );
    });

    expect(result.current.tasksFor("projA")).toHaveLength(1);
    expect(result.current.tasksFor("projB")).toHaveLength(1);
    expect(result.current.tasksFor("projA")[0].agent).toBe("gandalf");
    // Projet inconnu → liste vide stable.
    expect(result.current.tasksFor("zzz")).toHaveLength(0);
  });

  it("delegation puis activite (même id) → la tâche du projet passe done", () => {
    const { result } = renderHook(() => useAgentTasks());
    act(() => {
      result.current.ingest(
        "p",
        ev({ kind: "delegation", tool_use_id: "t1", agent: "g", text: "x" }),
      );
    });
    expect(result.current.tasksFor("p")[0].status).toBe("running");
    act(() => {
      result.current.ingest("p", ev({ kind: "activite", tool_use_id: "t1" }));
    });
    expect(result.current.tasksFor("p")[0].status).toBe("done");
  });

  it("seed précharge des tâches de démo pour un projet (vitrine), isolation préservée", () => {
    const { result } = renderHook(() => useAgentTasks());
    const demo: AgentTask[] = [
      { id: "d1", agent: "Gandalf", description: "Audit", status: "running" },
      { id: "d2", agent: "Gimli", description: "Porter", status: "done" },
    ];
    act(() => result.current.seed("iaka-demo", demo));
    expect(result.current.tasksFor("iaka-demo")).toHaveLength(2);
    expect(result.current.tasksFor("autre")).toHaveLength(0);
  });

  it("seed est NON destructif : ne remplace pas des tâches LIVE déjà présentes", () => {
    const { result } = renderHook(() => useAgentTasks());
    act(() => {
      result.current.ingest(
        "p",
        ev({ kind: "delegation", tool_use_id: "live1", agent: "real", text: "live" }),
      );
    });
    act(() =>
      result.current.seed("p", [
        { id: "d1", agent: "Mock", description: "mock", status: "done" },
      ]),
    );
    const out = result.current.tasksFor("p");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("live1");
  });
});
