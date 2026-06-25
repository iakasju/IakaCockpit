import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMainCourante } from "../hooks/useMainCourante";
import type { Backend, FeedEvent } from "../api/backend";
import { MOCK_FEED } from "../mock/feed";

const REAL: FeedEvent[] = [
  {
    id: "r1",
    canal: "adresse",
    who: "[IAKACOCKPIT][Gimli]",
    project: "conv-1",
    body: "Lot L4 implémenté.",
    ts: "2026-06-25T17:30:00Z",
  },
  {
    id: "r2",
    canal: "pensee",
    who: "[IAKAFRAME][Gandalf]",
    project: "conv-2",
    body: "Lecture seule.",
    ts: "2026-06-25T17:20:00Z",
  },
];

function makeApi(impl: () => Promise<FeedEvent[]>): Backend {
  return { fetchMainCourante: vi.fn(impl) } as unknown as Backend;
}

describe("useMainCourante — cycle loading → success | dégradé (L4)", () => {
  it("charge les événements réels au montage", async () => {
    const api = makeApi(async () => REAL);
    const { result } = renderHook(() => useMainCourante(api));
    await waitFor(() => expect(result.current.events).toEqual(REAL));
    expect(result.current.degraded).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(api.fetchMainCourante).toHaveBeenCalled();
  });

  it("mode dégradé : un rejet substitue MOCK_FEED et pose degraded + error", async () => {
    const api = makeApi(async () =>
      Promise.reject(new Error("iakaboxlogs (CouchDB) injoignable : refused")),
    );
    const { result } = renderHook(() => useMainCourante(api));
    await waitFor(() => expect(result.current.degraded).toBe(true));
    expect(result.current.events).toEqual(MOCK_FEED);
    expect(result.current.error).toContain("injoignable");
    expect(result.current.loading).toBe(false);
  });

  it("refresh(filter) passe le filtre agent à la façade", async () => {
    const api = makeApi(async () => REAL);
    const { result } = renderHook(() => useMainCourante(api));
    await waitFor(() => expect(result.current.events).toEqual(REAL));
    await act(async () => {
      await result.current.refresh({ agent: "Gimli" });
    });
    expect(api.fetchMainCourante).toHaveBeenLastCalledWith({ agent: "Gimli" });
  });

  it("un refresh réussi après un échec lève le mode dégradé", async () => {
    let fail = true;
    const api = makeApi(async () => {
      if (fail) return Promise.reject(new Error("down"));
      return REAL;
    });
    const { result } = renderHook(() => useMainCourante(api));
    await waitFor(() => expect(result.current.degraded).toBe(true));
    fail = false;
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.degraded).toBe(false);
    expect(result.current.events).toEqual(REAL);
    expect(result.current.error).toBeNull();
  });
});
