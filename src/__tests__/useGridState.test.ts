import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridState } from "../hooks/useGridState";

describe("useGridState — navigation des vues (L8 : sans onglets ; L12 : + iakajournal)", () => {
  it("démarre sur Portfolio", () => {
    const { result } = renderHook(() => useGridState());
    expect(result.current.activeView).toBe("portfolio");
  });

  it("commute la vue active", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.setActiveView("settings"));
    expect(result.current.activeView).toBe("settings");
    act(() => result.current.setActiveView("working"));
    expect(result.current.activeView).toBe("working");
  });

  it("accepte la vue iakajournal (L12)", () => {
    const { result } = renderHook(() => useGridState());
    act(() => result.current.setActiveView("iakajournal"));
    expect(result.current.activeView).toBe("iakajournal");
  });
});
