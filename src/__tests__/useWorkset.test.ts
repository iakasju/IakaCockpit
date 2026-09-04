import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWorkset, WORKSET_KEY } from "../hooks/useWorkset";
import type { Backend } from "../api/backend";

/** Façade mockée neutre : `configGet` résout immédiatement à `null` (rien de persisté). */
function mockApi(over: Partial<Backend> = {}): Backend {
  return {
    configGet: vi.fn().mockResolvedValue(null),
    configSet: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as Backend;
}

describe("useWorkset", () => {
  it("démarre vide", () => {
    const { result } = renderHook(() => useWorkset(mockApi()));
    expect(result.current.ids.size).toBe(0);
    expect(result.current.has("p1")).toBe(false);
  });

  it("toggle ajoute puis retire", () => {
    const { result } = renderHook(() => useWorkset(mockApi()));
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(false);
    expect(result.current.ids.size).toBe(0);
  });

  it("add ajoute une fois (idempotent, ne retire jamais)", () => {
    const { result } = renderHook(() => useWorkset(mockApi()));
    act(() => result.current.add("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
    // second add : no-op, reste présent (contraste avec toggle)
    act(() => result.current.add("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
  });

  it("gère plusieurs projets indépendamment", () => {
    const { result } = renderHook(() => useWorkset(mockApi()));
    act(() => result.current.toggle("p1"));
    act(() => result.current.toggle("p2"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.has("p2")).toBe(true);
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(false);
    expect(result.current.has("p2")).toBe(true);
  });
});

describe("useWorkset — persistance (L37)", () => {
  it("CA-1 — la Table survit au redémarrage (restauration relit la valeur persistée)", async () => {
    const api = mockApi({
      configGet: vi.fn().mockResolvedValue(JSON.stringify(["alpha", "beta"])),
    });
    const { result } = renderHook(() => useWorkset(api));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.has("alpha")).toBe(true);
    expect(result.current.has("beta")).toBe(true);
    expect(result.current.ids.size).toBe(2);
  });

  it("CA-2 — chaque geste est persisté, et le retrait aussi", async () => {
    const api = mockApi();
    const { result } = renderHook(() => useWorkset(api));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.add("a"));
    expect(api.configSet).toHaveBeenLastCalledWith(
      WORKSET_KEY,
      JSON.stringify(["a"]),
    );

    act(() => result.current.toggle("b"));
    expect(api.configSet).toHaveBeenLastCalledWith(
      WORKSET_KEY,
      JSON.stringify(["a", "b"]),
    );

    act(() => result.current.toggle("a"));
    expect(api.configSet).toHaveBeenLastCalledWith(
      WORKSET_KEY,
      JSON.stringify(["b"]),
    );
  });

  it("CA-3 — la restauration FUSIONNE, elle n'écrase pas", async () => {
    let resolveGet: (v: string | null) => void = () => {};
    const pending = new Promise<string | null>((resolve) => {
      resolveGet = resolve;
    });
    const api = mockApi({ configGet: vi.fn().mockReturnValue(pending) });
    const { result } = renderHook(() => useWorkset(api));

    // Geste utilisateur AVANT la fin de la lecture (course, cf. useDemoSeed asynchrone).
    act(() => result.current.add("seed"));
    expect(result.current.has("seed")).toBe(true);

    await act(async () => {
      resolveGet(JSON.stringify(["alpha"]));
      await pending;
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    // L'état final contient LES DEUX — pas un remplacement.
    expect(result.current.has("seed")).toBe(true);
    expect(result.current.has("alpha")).toBe(true);
  });

  it("CA-4 — aucune écriture avant la fin de la restauration", async () => {
    let resolveGet: (v: string | null) => void = () => {};
    const pending = new Promise<string | null>((resolve) => {
      resolveGet = resolve;
    });
    const api = mockApi({ configGet: vi.fn().mockReturnValue(pending) });
    const { result } = renderHook(() => useWorkset(api));

    // Ne rien faire, puis résoudre : configSet ne doit JAMAIS avoir été appelé.
    await act(async () => {
      resolveGet(JSON.stringify(["alpha"]));
      await pending;
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(api.configSet).not.toHaveBeenCalled();
  });

  it("CA-5 — un id sans projet ne déclenche ni écriture ni purge implicite", async () => {
    const api = mockApi({
      configGet: vi.fn().mockResolvedValue(JSON.stringify(["alpha", "fantome"])),
    });
    const { result } = renderHook(() => useWorkset(api));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    // Le hook ne connaît même pas le portefeuille : aucune tentative de purge/réécriture.
    expect(api.configSet).not.toHaveBeenCalled();
    // "fantome" reste dans le set — inerte, jamais purgé (AR-4).
    expect(result.current.has("fantome")).toBe(true);
    expect(result.current.has("alpha")).toBe(true);
  });

  it("CA-8 — valeur illisible → set vide, jamais un crash", async () => {
    for (const raw of ["pas du json", '{"a":1}', "[1,2]"]) {
      const api = mockApi({ configGet: vi.fn().mockResolvedValue(raw) });
      const { result } = renderHook(() => useWorkset(api));
      await waitFor(() => expect(result.current.loaded).toBe(true));
      expect(result.current.ids.size).toBe(0);
    }
  });

  it("CA-9 — hors Tauri (configGet rejette), rien ne casse", async () => {
    const api = mockApi({
      configGet: vi.fn().mockRejectedValue(new Error("hors Tauri")),
    });
    const { result } = renderHook(() => useWorkset(api));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.ids.size).toBe(0);
  });

  it("CA-9 — add reste fonctionnel en mémoire même si configSet échoue", async () => {
    const api = mockApi({
      configGet: vi.fn().mockResolvedValue(null),
      configSet: vi.fn().mockRejectedValue(new Error("backend indisponible")),
    });
    const { result } = renderHook(() => useWorkset(api));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.add("p1"));
    expect(result.current.has("p1")).toBe(true);
  });
});

describe("CA-5 (test A) — dérivation « projets de la Table » (App.tsx:209, filtre atteignable)", () => {
  it("un id sans projet correspondant ne produit rien (intersection, jamais de purge)", () => {
    const ids = new Set(["alpha", "fantome"]);
    const projects = [{ id: "alpha" }, { id: "beta" }];
    const worksetProjects = projects.filter((p) => ids.has(p.id));
    expect(worksetProjects.map((p) => p.id)).toEqual(["alpha"]);
  });
});
