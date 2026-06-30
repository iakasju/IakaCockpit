import { describe, it, expect } from "vitest";
import {
  parseFilePath,
  reduceEffects,
  sortedEffects,
  type EffectsState,
  bucketize,
} from "../hooks/useEffects";
import type { RunnerEvent } from "../api/backend";

function geste(tool: string, input: string): RunnerEvent {
  return {
    kind: "geste",
    role: "assistant",
    is_sidechain: false,
    tool_name: tool,
    tool_input: input,
  };
}

const EMPTY: EffectsState = { total: 0, byPath: {} };

describe("useEffects (L18 #7) — effets fichiers (heatmap)", () => {
  it("parseFilePath extrait le chemin du tool_input tronqué", () => {
    expect(parseFilePath('{"file_path":"/a/b/c.ts","old_string":"x…')).toBe("/a/b/c.ts");
    expect(parseFilePath('{"command":"ls"}')).toBeNull();
  });

  it("ne compte que les gestes d'édition et incrémente le total + hits", () => {
    let s = EMPTY;
    s = reduceEffects(s, geste("Bash", '{"command":"ls"}'));
    expect(s).toBe(EMPTY);
    s = reduceEffects(s, geste("Edit", '{"file_path":"/x.ts"}'));
    s = reduceEffects(s, geste("Write", '{"file_path":"/x.ts"}'));
    expect(s.total).toBe(2);
    expect(s.byPath["/x.ts"].count).toBe(2);
    expect(s.byPath["/x.ts"].hits).toEqual([1, 2]); // ordinaux pour la heatmap
  });

  it("trie par compte décroissant", () => {
    let s = EMPTY;
    s = reduceEffects(s, geste("Edit", '{"file_path":"/a.ts"}'));
    s = reduceEffects(s, geste("Edit", '{"file_path":"/b.ts"}'));
    s = reduceEffects(s, geste("Edit", '{"file_path":"/a.ts"}'));
    const sorted = sortedEffects(s);
    expect(sorted[0]).toMatchObject({ path: "/a.ts", count: 2 });
    expect(sorted[1]).toMatchObject({ path: "/b.ts", count: 1 });
  });

  it("bucketize répartit les ordinaux d'édition en colonnes", () => {
    // 4 hits sur total 4, 4 buckets → un par bucket.
    expect(bucketize([1, 2, 3, 4], 4, 4)).toEqual([1, 1, 1, 1]);
    // 2 hits en début sur total 8, 4 buckets → tous dans le 1er bucket.
    expect(bucketize([1, 2], 8, 4)).toEqual([2, 0, 0, 0]);
  });
});
