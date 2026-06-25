import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridState } from "../hooks/useGridState";

describe("useGridState", () => {
  it("démarre sur Portfolio, sans onglet", () => {
    const { result } = renderHook(() => useGridState());
    expect(result.current.activeView).toBe("portfolio");
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
  });

  it("commute la vue active", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.setActiveView("settings"));
    expect(result.current.activeView).toBe("settings");
  });

  it("openTab crée un onglet et le rend actif", () => {
    const { result } = renderHook(() => useGridState());
    act(() => {
      result.current.openTab("p1", "p1", "/root/p1");
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].projectId).toBe("p1");
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
  });

  it("openTab sur un projet déjà ouvert ne duplique pas (ré-active)", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.openTab("p1", "p1", "/root/p1"));
    const firstId = result.current.tabs[0].id;
    act(() => result.current.openTab("p2", "p2", "/root/p2"));
    act(() => result.current.openTab("p1", "p1", "/root/p1"));
    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.activeTabId).toBe(firstId);
  });

  it("closeTab retire l'onglet et réassigne l'actif", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.openTab("p1", "p1", "/root/p1"));
    act(() => result.current.openTab("p2", "p2", "/root/p2"));
    const t1 = result.current.tabs[0].id;
    const t2 = result.current.tabs[1].id;
    act(() => result.current.closeTab(t2));
    expect(result.current.tabs.map((t) => t.id)).toEqual([t1]);
    expect(result.current.activeTabId).toBe(t1);
    act(() => result.current.closeTab(t1));
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBeNull();
  });

  it("setActiveTab change l'onglet actif", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.openTab("p1", "p1", "/root/p1"));
    act(() => result.current.openTab("p2", "p2", "/root/p2"));
    const t1 = result.current.tabs[0].id;
    act(() => result.current.setActiveTab(t1));
    expect(result.current.activeTabId).toBe(t1);
  });
});
