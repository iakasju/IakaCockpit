/**
 * useEconomy — accumulation de l'ÉCONOMIE du tour (tokens) depuis le transcript (L18 #5).
 *
 * Le tailer émet un `RunnerEvent` `kind:"economie"` par tour assistant, `text` portant
 * `"{input}/{output}"` (cf. `transcript.rs economie_event`). Ce hook accumule, par
 * `projectId`, une SÉRIE de points (un par tour) → alimente le HUD économie (sparkline).
 * `reduceEconomy` est PUR (testable). Le canal `is_sidechain` distingue le coordinateur
 * (tours principaux) des sous-agents délégués (fils sidechain) — donnée honnête dispo.
 */
import { useCallback, useState } from "react";
import type { RunnerEvent } from "../api/backend";

/** Un point d'économie = un tour assistant. */
export interface EcoPoint {
  /** Tokens d'entrée (input + caches). */
  input: number;
  /** Tokens de sortie (générés). */
  output: number;
  /** Tour d'un sous-agent délégué (fil sidechain) vs coordinateur. */
  sidechain: boolean;
  /** Horodatage du tour (optionnel). */
  ts?: string;
}

/** Borne de la série (sparkline) — on garde les N derniers tours. */
export const ECO_MAX_POINTS = 120;

/** Parse `text="input/output"` en `{input, output}` (défensif, null si invalide). */
export function parseEco(text: string | undefined): { input: number; output: number } | null {
  if (!text) return null;
  const m = text.split("/");
  if (m.length !== 2) return null;
  const input = Number.parseInt(m[0], 10);
  const output = Number.parseInt(m[1], 10);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  return { input, output };
}

/** Réduit une série par un `RunnerEvent` (PUR). Ignore tout sauf `kind:"economie"`. */
export function reduceEconomy(series: EcoPoint[], ev: RunnerEvent): EcoPoint[] {
  if (ev.kind !== "economie") return series;
  const parsed = parseEco(ev.text ?? undefined);
  if (parsed === null) return series;
  const point: EcoPoint = {
    input: parsed.input,
    output: parsed.output,
    sidechain: ev.is_sidechain,
    ts: ev.ts,
  };
  const next = [...series, point];
  return next.length > ECO_MAX_POINTS ? next.slice(next.length - ECO_MAX_POINTS) : next;
}

/** Index des tours où une COMPACTION est détectée (input chute à < 60 % du précédent). */
export function compactionFrontiers(series: readonly EcoPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i].input < series[i - 1].input * 0.6) out.push(i);
  }
  return out;
}

const EMPTY: readonly EcoPoint[] = Object.freeze([]);

export interface UseEconomy {
  ingest: (projectId: string, ev: RunnerEvent) => void;
  seriesFor: (projectId: string) => readonly EcoPoint[];
}

export function useEconomy(): UseEconomy {
  const [byProject, setByProject] = useState<Record<string, EcoPoint[]>>({});

  const ingest = useCallback((projectId: string, ev: RunnerEvent): void => {
    if (ev.kind !== "economie") return; // évite un re-render inutile.
    setByProject((prev) => {
      const cur = prev[projectId] ?? [];
      const next = reduceEconomy(cur, ev);
      if (next === cur) return prev;
      return { ...prev, [projectId]: next };
    });
  }, []);

  const seriesFor = useCallback(
    (projectId: string): readonly EcoPoint[] => byProject[projectId] ?? EMPTY,
    [byProject],
  );

  return { ingest, seriesFor };
}
