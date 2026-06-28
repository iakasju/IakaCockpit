/**
 * useAgentTasks — accumulation des TÂCHES d'agents (délégations) du transcript L10.
 *
 * Façon « Tâches en cours » de Claude Code : chaque délégation (`RunnerEvent`
 * `kind:"delegation"`) ouvre une tâche `running` (clé = `tool_use_id`) ; l'`activite`
 * portant le **même `tool_use_id`** (tool_result = fin de geste) la passe à `done`.
 *
 * `reduceAgentTasks` est PUR (aucun I/O/React) → testable directement. Le hook ne fait
 * qu'accumuler par `projectId` (la conversation active). Pas de god-component : la
 * collecte vit ici, le panneau (présentationnel) ne reçoit que la liste. Les events
 * proviennent du tailer via `useRunnerViews` (`onEvent`), seule frontière I/O.
 */
import { useCallback, useState } from "react";
import type { RunnerEvent } from "../api/backend";

export type TaskStatus = "running" | "done";

/** Une tâche déléguée, dérivée du transcript (clé stable = `tool_use_id`). */
export interface AgentTask {
  /** `tool_use_id` de la délégation (clé d'appariement running→done). */
  id: string;
  /** Sous-agent visé (`subagent_type`, ex. "gandalf"). */
  agent: string;
  /** Description de la tâche (texte de la délégation). */
  description: string;
  /** `running` à la délégation, `done` à l'`activite` du même `tool_use_id`. */
  status: TaskStatus;
  /** Horodatage de l'event source (optionnel). */
  ts?: string;
}

/**
 * Réduit une liste de tâches par un `RunnerEvent` (PUR). Défensif : un event sans
 * `tool_use_id` (ou une `activite` sans tâche connue) est ignoré proprement.
 *   - `delegation` (+ tool_use_id) → tâche `running` (créée ou re-projetée sans écraser
 *     un `done` déjà acquis) ;
 *   - `activite` (+ tool_use_id apparié) → la tâche passe `done` (idempotent) ;
 *   - tout autre kind → liste inchangée (même référence).
 */
export function reduceAgentTasks(
  tasks: AgentTask[],
  ev: RunnerEvent,
): AgentTask[] {
  if (ev.kind === "delegation") {
    const id = ev.tool_use_id?.trim();
    if (!id) return tasks; // défensif : pas de clé d'appariement.
    const agent = ev.agent?.trim() || "sous-agent";
    const description = (ev.text ?? "").trim();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      // Re-projection (re-read du transcript) : on rafraîchit les champs sans
      // dégrader un statut déjà `done`.
      const cur = tasks[idx];
      if (
        cur.agent === agent &&
        cur.description === description &&
        cur.ts === ev.ts
      ) {
        return tasks; // rien de neuf → même référence.
      }
      const next = tasks.slice();
      next[idx] = { ...cur, agent, description, ts: ev.ts ?? cur.ts };
      return next;
    }
    return [...tasks, { id, agent, description, status: "running", ts: ev.ts }];
  }

  if (ev.kind === "activite") {
    const id = ev.tool_use_id?.trim();
    if (!id) return tasks; // défensif : pas d'appariement possible.
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx < 0 || tasks[idx].status === "done") return tasks;
    const next = tasks.slice();
    next[idx] = { ...next[idx], status: "done" };
    return next;
  }

  return tasks; // parole / geste / pensée → pas une tâche.
}

const EMPTY: readonly AgentTask[] = Object.freeze([]);

export interface UseAgentTasks {
  /** Tâches accumulées par `projectId` (conversation). */
  tasks: Record<string, AgentTask[]>;
  /** Intègre un `RunnerEvent` dans les tâches du projet (via `reduceAgentTasks`). */
  ingest: (projectId: string, ev: RunnerEvent) => void;
  /**
   * Précharge des tâches pour un projet (vitrine démo, L-taches). **Idempotent et
   * non destructif** : ne sème QUE si le projet n'a encore aucune tâche → ne JAMAIS
   * écraser des tâches LIVE déjà accumulées (vraies conversations). Borné côté appelant
   * par le flag dev (`useDemoSeed`) au seul projet `iaka-demo`.
   */
  seed: (projectId: string, initial: readonly AgentTask[]) => void;
  /** Liste (stable) des tâches d'un projet ; `[]` si aucune. */
  tasksFor: (projectId: string) => readonly AgentTask[];
}

export function useAgentTasks(): UseAgentTasks {
  const [tasks, setTasks] = useState<Record<string, AgentTask[]>>({});

  const ingest = useCallback((projectId: string, ev: RunnerEvent): void => {
    setTasks((prev) => {
      const cur = prev[projectId] ?? [];
      const next = reduceAgentTasks(cur, ev);
      if (next === cur) return prev; // aucun changement → pas de re-render.
      return { ...prev, [projectId]: next };
    });
  }, []);

  const seed = useCallback(
    (projectId: string, initial: readonly AgentTask[]): void => {
      setTasks((prev) => {
        // Non destructif : si des tâches existent déjà (live ou seed antérieur), no-op.
        if ((prev[projectId]?.length ?? 0) > 0) return prev;
        return { ...prev, [projectId]: initial.slice() };
      });
    },
    [],
  );

  const tasksFor = useCallback(
    (projectId: string): readonly AgentTask[] => tasks[projectId] ?? EMPTY,
    [tasks],
  );

  return { tasks, ingest, seed, tasksFor };
}
