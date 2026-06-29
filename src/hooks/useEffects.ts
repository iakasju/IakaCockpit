/**
 * useEffects — accumulation des EFFETS FICHIERS de la session (L18 #7).
 *
 * Les gestes d'édition (`RunnerEvent` `kind:"geste"`, `tool_name` ∈ Edit/Write/…) portent
 * le `file_path` dans `tool_input` (en tête du JSON → survit à la troncature 200). Ce hook
 * accumule, par `projectId`, le nombre d'éditions par fichier → alimente le panneau
 * « effets fichiers ». `reduceEffects` est PUR (testable). Aucune invention : on compte
 * ce que le transcript montre.
 */
import { useCallback, useState } from "react";
import type { RunnerEvent } from "../api/backend";

/** Outils qui modifient un fichier (effet). */
const EDIT_TOOLS: ReadonlySet<string> = new Set([
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
]);

/** Un fichier touché + son compte d'éditions. */
export interface FileEffect {
  /** Chemin complet (clé). */
  path: string;
  /** Nombre d'éditions accumulées. */
  count: number;
  /** Dernier outil ayant touché le fichier. */
  tool: string;
}

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

/** Réduit la map d'effets par un `RunnerEvent` (PUR). Ignore tout sauf un geste d'édition. */
export function reduceEffects(
  byPath: Record<string, FileEffect>,
  ev: RunnerEvent,
): Record<string, FileEffect> {
  if (ev.kind !== "geste") return byPath;
  const tool = ev.tool_name ?? "";
  if (!EDIT_TOOLS.has(tool)) return byPath;
  const path = parseFilePath(ev.tool_input);
  if (!path) return byPath;
  const cur = byPath[path];
  return {
    ...byPath,
    [path]: { path, count: (cur?.count ?? 0) + 1, tool },
  };
}

/** Effets triés par compte décroissant (puis chemin), pour l'affichage. */
export function sortedEffects(byPath: Record<string, FileEffect>): FileEffect[] {
  return Object.values(byPath).sort(
    (a, b) => b.count - a.count || a.path.localeCompare(b.path),
  );
}

const EMPTY: Readonly<Record<string, FileEffect>> = Object.freeze({});

export interface UseEffects {
  ingest: (projectId: string, ev: RunnerEvent) => void;
  effectsFor: (projectId: string) => Record<string, FileEffect>;
}

export function useEffects(): UseEffects {
  const [byProject, setByProject] = useState<
    Record<string, Record<string, FileEffect>>
  >({});

  const ingest = useCallback((projectId: string, ev: RunnerEvent): void => {
    if (ev.kind !== "geste") return; // évite un re-render inutile.
    setByProject((prev) => {
      const cur = prev[projectId] ?? {};
      const next = reduceEffects(cur, ev);
      if (next === cur) return prev;
      return { ...prev, [projectId]: next };
    });
  }, []);

  const effectsFor = useCallback(
    (projectId: string): Record<string, FileEffect> =>
      byProject[projectId] ?? EMPTY,
    [byProject],
  );

  return { ingest, effectsFor };
}
