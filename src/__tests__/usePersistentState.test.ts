import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistentState } from "../hooks/usePersistentState";

describe("usePersistentState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("retourne le défaut au premier lancement (rien de stocké)", () => {
    const { result } = renderHook(() =>
      usePersistentState("ui.test.k1", "list"),
    );
    expect(result.current[0]).toBe("list");
  });

  it("persiste la valeur en localStorage", () => {
    const { result } = renderHook(() =>
      usePersistentState("ui.test.k2", "list"),
    );
    act(() => result.current[1]("tiles"));
    expect(result.current[0]).toBe("tiles");
    expect(window.localStorage.getItem("ui.test.k2")).toBe(
      JSON.stringify("tiles"),
    );
  });

  it("relit la valeur persistée au montage suivant (survit au reload)", () => {
    window.localStorage.setItem("ui.test.k3", JSON.stringify("swim"));
    const { result } = renderHook(() =>
      usePersistentState("ui.test.k3", "tree"),
    );
    expect(result.current[0]).toBe("swim");
  });

  it("retombe sur le défaut si la valeur stockée est corrompue", () => {
    window.localStorage.setItem("ui.test.k4", "{not-json");
    const { result } = renderHook(() =>
      usePersistentState("ui.test.k4", "list"),
    );
    expect(result.current[0]).toBe("list");
  });
});
