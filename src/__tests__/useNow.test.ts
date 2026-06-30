import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNow } from "../hooks/useNow";

/** Force `document.hidden` et notifie le hook (visibilitychange). */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useNow (L20 B1) — ticker front pur", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it("avance l'horloge à chaque intervalle", () => {
    const { result } = renderHook(() => useNow(1000));
    const t0 = result.current;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const t1 = result.current;
    expect(t1).toBeGreaterThanOrEqual(t0 + 1000);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBeGreaterThanOrEqual(t1 + 2000);
  });

  it("met le ticker EN PAUSE quand l'onglet est masqué", () => {
    const { result } = renderHook(() => useNow(1000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const paused = result.current;
    act(() => {
      setHidden(true);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(paused); // figé tant que l'onglet est masqué
  });

  it("reprend avec un tick immédiat au retour de l'onglet", () => {
    const { result } = renderHook(() => useNow(1000));
    act(() => {
      setHidden(true);
      vi.advanceTimersByTime(3000);
    });
    const hidden = result.current;
    act(() => {
      setHidden(false); // retour → rattrapage immédiat
    });
    expect(result.current).toBeGreaterThanOrEqual(hidden + 3000);
  });

  it("nettoie l'intervalle au démontage (pas de fuite)", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
