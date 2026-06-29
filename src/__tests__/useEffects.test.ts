import { describe, it, expect } from "vitest";
import {
  parseFilePath,
  reduceEffects,
  sortedEffects,
  type FileEffect,
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

describe("useEffects (L18 #7) — effets fichiers", () => {
  it("parseFilePath extrait le chemin du tool_input tronqué", () => {
    expect(
      parseFilePath('{"file_path":"/a/b/c.ts","old_string":"x…'),
    ).toBe("/a/b/c.ts");
    expect(parseFilePath('{"command":"ls"}')).toBeNull();
    expect(parseFilePath(undefined)).toBeNull();
  });

  it("ne compte que les gestes d'édition", () => {
    let m: Record<string, FileEffect> = {};
    m = reduceEffects(m, geste("Bash", '{"command":"ls"}'));
    expect(Object.keys(m)).toHaveLength(0);
    m = reduceEffects(m, geste("Edit", '{"file_path":"/x.ts"}'));
    expect(m["/x.ts"].count).toBe(1);
  });

  it("accumule les éditions par fichier et trie par compte", () => {
    let m: Record<string, FileEffect> = {};
    m = reduceEffects(m, geste("Edit", '{"file_path":"/a.ts"}'));
    m = reduceEffects(m, geste("Write", '{"file_path":"/a.ts"}'));
    m = reduceEffects(m, geste("Edit", '{"file_path":"/b.ts"}'));
    const sorted = sortedEffects(m);
    expect(sorted[0]).toMatchObject({ path: "/a.ts", count: 2 });
    expect(sorted[1]).toMatchObject({ path: "/b.ts", count: 1 });
    expect(sorted[0].tool).toBe("Write"); // dernier outil
  });

  it("ignore un geste sans file_path", () => {
    const m = reduceEffects({}, geste("Edit", '{"foo":"bar"}'));
    expect(Object.keys(m)).toHaveLength(0);
  });
});
