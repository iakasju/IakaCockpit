import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlan } from "../hooks/usePlan";
import type { Backend } from "../api/backend";

/** Façade L4 mockée : `fetchMainCourante` renvoie une liste vide (suffit au test du cycle). */
function mockApi() {
  const fetchMainCourante = vi.fn().mockResolvedValue([]);
  return { fetchMainCourante } as unknown as Backend;
}

describe("usePlan (L20 B2) — polling de la main courante", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("charge une fois au montage", () => {
    const api = mockApi();
    renderHook(() => usePlan("p1", api, 1000));
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(1);
  });

  it("poll périodiquement tant qu'un projet est actif", async () => {
    const api = mockApi();
    renderHook(() => usePlan("p1", api, 1000));
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(4);
  });

  it("ne poll pas (ni ne charge) sans projet actif", async () => {
    const api = mockApi();
    renderHook(() => usePlan(null, api, 1000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(api.fetchMainCourante).not.toHaveBeenCalled();
  });

  it("ne poll pas si pollMs <= 0 (désactivé)", async () => {
    const api = mockApi();
    renderHook(() => usePlan("p1", api, 0));
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(1); // chargement initial seul
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(1);
  });

  it("nettoie l'intervalle au démontage (pas de fuite ni double-abonnement)", async () => {
    const api = mockApi();
    const { unmount } = renderHook(() => usePlan("p1", api, 1000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const before = (api.fetchMainCourante as ReturnType<typeof vi.fn>).mock.calls
      .length;
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(
      (api.fetchMainCourante as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(before);
  });

  it("réinitialise le polling au changement de projet", async () => {
    const api = mockApi();
    const { rerender } = renderHook(({ p }) => usePlan(p, api, 1000), {
      initialProps: { p: "p1" as string },
    });
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(2);
    rerender({ p: "p2" }); // nouveau projet → rechargement immédiat
    expect(api.fetchMainCourante).toHaveBeenCalledTimes(3);
  });
});
