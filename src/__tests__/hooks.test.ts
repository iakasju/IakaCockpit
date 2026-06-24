import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridState } from "../hooks/useGridState";
import { usePortfolio } from "../hooks/usePortfolio";

describe("useGridState (stub L0)", () => {
  it("démarre vide", () => {
    const { result } = renderHook(() => useGridState());
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
  });

  it("setActiveTab met à jour l'onglet actif sans muter les onglets", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.setActiveTab("t1"));
    expect(result.current.activeTabId).toBe("t1");
    expect(result.current.tabs).toEqual([]);
  });
});

describe("usePortfolio (stub L0)", () => {
  it("démarre vide et non chargé", () => {
    const { result } = renderHook(() => usePortfolio());
    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedId).toBeNull();
  });

  it("select met à jour la sélection", () => {
    const { result } = renderHook(() => usePortfolio());
    act(() => result.current.select("p1"));
    expect(result.current.selectedId).toBe("p1");
  });
});
