import { describe, it, expect } from "vitest";
import { demoTasks } from "../mock/demoTasks";
import type { AgentTask } from "../hooks/useAgentTasks";

const NOW = Date.parse("2026-07-13T15:00:00Z"); // ancre déterministe.
const HOUR = 60 * 60_000;

const parse = (s?: string): number => Date.parse(s ?? "");

describe("demoTasks — factory ancrée sur maintenant (L29)", () => {
  it("produit un nouveau tableau à chaque appel (pas d'état partagé)", () => {
    const a = demoTasks(NOW);
    const b = demoTasks(NOW);
    expect(a).not.toBe(b);
    expect(a).toEqual(b); // même `now` → même contenu.
  });

  it("ancre les `ts` sur une fenêtre RÉCENTE (proche de `now`, jamais figée)", () => {
    for (const t of demoTasks(NOW)) {
      const start = parse(t.ts);
      expect(Number.isNaN(start)).toBe(false);
      expect(start).toBeLessThanOrEqual(NOW);
      expect(NOW - start).toBeLessThan(HOUR); // dans la dernière heure.
    }
  });

  it("borne la fenêtre totale (< ~1h entre la 1re et la dernière borne)", () => {
    const tasks = demoTasks(NOW);
    const stamps = tasks.flatMap((t) => [parse(t.ts), parse(t.doneTs)]);
    const known = stamps.filter((n) => !Number.isNaN(n));
    const span = Math.max(...known) - Math.min(...known);
    expect(span).toBeLessThan(HOUR);
  });

  it("chaque tâche `done` a un `doneTs` strictement postérieur à `ts`", () => {
    const done = demoTasks(NOW).filter(
      (t: AgentTask) => t.status === "done",
    );
    expect(done.length).toBeGreaterThan(0);
    for (const t of done) {
      expect(t.doneTs).toBeDefined();
      expect(parse(t.doneTs)).toBeGreaterThan(parse(t.ts));
    }
  });

  it("garde un showcase mixte : au moins un `running` (sans doneTs) et un `done`", () => {
    const tasks = demoTasks(NOW);
    const running = tasks.filter((t) => t.status === "running");
    expect(running.length).toBeGreaterThanOrEqual(1);
    for (const t of running) expect(t.doneTs).toBeUndefined();
    expect(tasks.some((t) => t.status === "done")).toBe(true);
  });

  it("conserve la cohérence roster (id stables + agents iakaframe)", () => {
    const ids = demoTasks(NOW).map((t) => t.id);
    expect(ids).toEqual([
      "demo-task-gandalf",
      "demo-task-gimli",
      "demo-task-loki",
      "demo-task-legolas",
    ]);
    expect(demoTasks(NOW).map((t) => t.agent)).toEqual([
      "Gandalf",
      "Gimli",
      "Loki",
      "Legolas",
    ]);
  });

  it("défaut = Date.now() (fenêtre récente sans argument)", () => {
    const before = Date.now();
    const tasks = demoTasks();
    const after = Date.now();
    const running = tasks.find((t) => t.status === "running");
    const start = parse(running?.ts);
    // Le `running` le plus récent est à ~6 min avant now → dans la fenêtre.
    expect(start).toBeLessThanOrEqual(after);
    expect(before - start).toBeLessThan(HOUR);
  });
});
