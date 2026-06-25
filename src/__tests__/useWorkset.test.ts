import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkset } from "../hooks/useWorkset";

describe("useWorkset", () => {
  it("démarre vide", () => {
    const { result } = renderHook(() => useWorkset());
    expect(result.current.ids.size).toBe(0);
    expect(result.current.has("p1")).toBe(false);
  });

  it("toggle ajoute puis retire", () => {
    const { result } = renderHook(() => useWorkset());
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(false);
    expect(result.current.ids.size).toBe(0);
  });

  it("add ajoute une fois (idempotent, ne retire jamais)", () => {
    const { result } = renderHook(() => useWorkset());
    act(() => result.current.add("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
    // second add : no-op, reste présent (contraste avec toggle)
    act(() => result.current.add("p1"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.ids.size).toBe(1);
  });

  it("gère plusieurs projets indépendamment", () => {
    const { result } = renderHook(() => useWorkset());
    act(() => result.current.toggle("p1"));
    act(() => result.current.toggle("p2"));
    expect(result.current.has("p1")).toBe(true);
    expect(result.current.has("p2")).toBe(true);
    act(() => result.current.toggle("p1"));
    expect(result.current.has("p1")).toBe(false);
    expect(result.current.has("p2")).toBe(true);
  });
});
