import { describe, it, expect } from "vitest";
import {
  parseEco,
  reduceEconomy,
  ECO_MAX_POINTS,
  type EcoPoint,
} from "../hooks/useEconomy";
import type { RunnerEvent } from "../api/backend";

function eco(text: string, sidechain = false): RunnerEvent {
  return { kind: "economie", role: "assistant", is_sidechain: sidechain, text };
}

describe("useEconomy (L18 #5) — réduction de l'économie", () => {
  it("parseEco lit 'input/output' (et rejette l'invalide)", () => {
    expect(parseEco("150/7")).toEqual({ input: 150, output: 7 });
    expect(parseEco("abc")).toBeNull();
    expect(parseEco(undefined)).toBeNull();
    expect(parseEco("1/2/3")).toBeNull();
  });

  it("ignore tout sauf kind:'economie'", () => {
    const s: EcoPoint[] = [];
    expect(reduceEconomy(s, { kind: "parole", role: "assistant", is_sidechain: false })).toBe(s);
  });

  it("ajoute un point par event economie (sidechain porté)", () => {
    let s: EcoPoint[] = [];
    s = reduceEconomy(s, eco("100/10"));
    s = reduceEconomy(s, eco("50/5", true));
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ input: 100, output: 10, sidechain: false });
    expect(s[1]).toMatchObject({ input: 50, output: 5, sidechain: true });
  });

  it("borne la série à ECO_MAX_POINTS", () => {
    let s: EcoPoint[] = [];
    for (let i = 0; i < ECO_MAX_POINTS + 25; i++) s = reduceEconomy(s, eco(`${i}/1`));
    expect(s).toHaveLength(ECO_MAX_POINTS);
    // On garde les DERNIERS.
    expect(s[s.length - 1].input).toBe(ECO_MAX_POINTS + 24);
  });
});
