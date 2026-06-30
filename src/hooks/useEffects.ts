/**
 * useEffects — accumulation des EFFETS FICHIERS de la session (L18 #7, variante B heatmap).
 *
 * Les gestes d'édition (`RunnerEvent` `kind:"geste"`, `tool_name` ∈ Edit/Write/…) portent
 * le `file_path` dans `tool_input` (en tête → survit à la troncature 200). On accumule, par
 * `projectId`, pour chaque fichier la SÉQUENCE de ses éditions (ordinaux 1..total) → la
 * heatmap fichiers × tours bucketise ces ordinaux. `reduceEffects` est PUR (testable).
 */
import { useCallback, useState } from "react";
import type { RunnerEvent } from "../api/backend";

const EDIT_TOOLS: ReadonlySet<string> = new Set([
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
]);

/** Un fichier touché : compte + ordinaux d'édition (pour la heatmap) + dernier outil. */
export interface FileEffect {
  path: string;
  count: number;
  tool: string;
  /** Ordinaux globaux (1..total) où ce fichier a été édité. */
  hits: number[];
}

/** État par projet : compteur global d'éditions + fichiers. */
export interface EffectsState {
  total: number;
  byPath: Record<string, FileEffect>;
}

const EMPTY_STATE: EffectsState = Object.freeze({ total: 0, byPath: {} });

/** Extrait `file_path` d'un `tool_input` (JSON compact tronqué). Null si absent. */
export function parseFilePath(input: string | undefined | null): string | null {
  if (!input) return null;
  const m = input.match(/"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

/** Réduit l'état par un `RunnerEvent` (PUR). Ignore tout sauf un geste d'édition. */
export function reduceEffects(state: EffectsState, ev: RunnerEvent): EffectsState {
  if (ev.kind !== "geste") return state;
  const tool = ev.tool_name ?? "";
  if (!EDIT_TOOLS.has(tool)) return state;
  const path = parseFilePath(ev.tool_input);
  if (!path) return state;
  const total = state.total + 1;
  const cur = state.byPath[path];
  const next: FileEffect = {
    path,
    count: (cur?.count ?? 0) + 1,
    tool,
    hits: [...(cur?.hits ?? []), total],
  };
  return { total, byPath: { ...state.byPath, [path]: next } };
}

/** Compte les éditions d'un fichier par bucket (grille fichiers × tours). PUR. */
export function bucketize(
  hits: readonly number[],
  total: number,
  buckets: number,
): number[] {
  const cells = new Array(buckets).fill(0);
  if (total <= 0) return cells;
  for (const h of hits) {
    const b = Math.min(buckets - 1, Math.floor(((h - 1) / total) * buckets));
    if (b >= 0) cells[b] += 1;
  }
  return cells;
}

/** Fichiers triés par compte décroissant (puis chemin). */
export function sortedEffects(state: EffectsState): FileEffect[] {
  return Object.values(state.byPath).sort(
    (a, b) => b.count - a.count || a.path.localeCompare(b.path),
  );
}

export interface UseEffects {
  ingest: (projectId: string, ev: RunnerEvent) => void;
  effectsFor: (projectId: string) => EffectsState;
}

export function useEffects(): UseEffects {
  const [byProject, setByProject] = useState<Record<string, EffectsState>>({});

  const ingest = useCallback((projectId: string, ev: RunnerEvent): void => {
    if (ev.kind !== "geste") return; // évite un re-render inutile.
    setByProject((prev) => {
      const cur = prev[projectId] ?? EMPTY_STATE;
      const next = reduceEffects(cur, ev);
      if (next === cur) return prev;
      return { ...prev, [projectId]: next };
    });
  }, []);

  const effectsFor = useCallback(
    (projectId: string): EffectsState => byProject[projectId] ?? EMPTY_STATE,
    [byProject],
  );

  return { ingest, effectsFor };
}
