import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNextStep } from "../hooks/useNextStep";
import type { Backend, NextStep } from "../api/backend";

const SAMPLE: NextStep = {
  suggestion: "Rédige l'instruction L4.",
  provider: "mock",
  model: "llama3.1:8b",
  tokens_in: null,
  tokens_out: null,
};

function makeApi(impl: () => Promise<NextStep>) {
  return { nextStep: vi.fn(impl) } as unknown as Backend;
}

describe("useNextStep — cycle loading → success | error (L3)", () => {
  it("état initial : pas de résultat, pas de chargement, pas d'erreur", () => {
    const api = makeApi(async () => SAMPLE);
    const { result } = renderHook(() => useNextStep(api));
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("request → succès : pose le résultat et lève le loading", async () => {
    const api = makeApi(async () => SAMPLE);
    const { result } = renderHook(() => useNextStep(api));
    await act(async () => {
      await result.current.request("/home/u/work/proj");
    });
    expect(api.nextStep).toHaveBeenCalledWith("/home/u/work/proj");
    expect(result.current.result).toEqual(SAMPLE);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("request → erreur : capte le message, ne lève pas (pas de crash)", async () => {
    const api = makeApi(async () => {
      throw new Error("endpoint IA injoignable : refused");
    });
    const { result } = renderHook(() => useNextStep(api));
    await act(async () => {
      await result.current.request("/x");
    });
    expect(result.current.error).toContain("injoignable");
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("loading passe à true pendant l'appel puis retombe", async () => {
    let resolve!: (v: NextStep) => void;
    const api = makeApi(() => new Promise<NextStep>((r) => (resolve = r)));
    const { result } = renderHook(() => useNextStep(api));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.request("/x");
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      resolve(SAMPLE);
      await pending;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toEqual(SAMPLE);
  });

  it("reset efface résultat et erreur", async () => {
    const api = makeApi(async () => SAMPLE);
    const { result } = renderHook(() => useNextStep(api));
    await act(async () => {
      await result.current.request("/x");
    });
    expect(result.current.result).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
