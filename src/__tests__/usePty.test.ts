import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty } from "../hooks/usePty";
import type { Backend } from "../api/backend";

/** Façade PTY mockée : capture les callbacks d'abonnement pour les déclencher. */
function mockPtyApi() {
  const outputCb: Record<string, (d: string) => void> = {};
  const closedCb: Record<string, () => void> = {};
  const unOutput = vi.fn();
  const unClosed = vi.fn();
  const api = {
    onPtyOutput: vi.fn(async (id: string, cb: (d: string) => void) => {
      outputCb[id] = cb;
      return unOutput;
    }),
    onPtyClosed: vi.fn(async (id: string, cb: () => void) => {
      closedCb[id] = cb;
      return unClosed;
    }),
    ptyOpen: vi.fn().mockResolvedValue(undefined),
    ptyWrite: vi.fn().mockResolvedValue(undefined),
    ptyResize: vi.fn().mockResolvedValue(undefined),
    ptyClose: vi.fn().mockResolvedValue(undefined),
  } as unknown as Backend;
  return { api, outputCb, closedCb, unOutput, unClosed };
}

describe("usePty", () => {
  it("open : s'abonne AVANT ptyOpen et marque la session prête", async () => {
    const { api } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.open("s1", "/root/p1", 80, 24);
    });
    expect(api.onPtyOutput).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.onPtyClosed).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.ptyOpen).toHaveBeenCalledWith("s1", "/root/p1", 80, 24);
    expect(result.current.sessions.s1.ready).toBe(true);
    expect(result.current.sessions.s1.closed).toBe(false);
  });

  it("mappe le flux output → onData", async () => {
    const { api, outputCb } = mockPtyApi();
    const onData = vi.fn();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.open("s1", "/root/p1", 80, 24, { onData });
    });
    act(() => outputCb.s1("hello"));
    expect(onData).toHaveBeenCalledWith("hello");
  });

  it("write/resize délèguent aux commandes", async () => {
    const { api } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.write("s1", "ls\n");
      await result.current.resize("s1", 120, 40);
    });
    expect(api.ptyWrite).toHaveBeenCalledWith("s1", "ls\n");
    expect(api.ptyResize).toHaveBeenCalledWith("s1", 120, 40);
  });

  it("évènement closed : marque la session fermée + désabonne + onClosed", async () => {
    const { api, closedCb, unOutput, unClosed } = mockPtyApi();
    const onClosed = vi.fn();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.open("s1", "/root/p1", 80, 24, { onClosed });
    });
    act(() => closedCb.s1());
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(unOutput).toHaveBeenCalledTimes(1);
    expect(unClosed).toHaveBeenCalledTimes(1);
    expect(result.current.sessions.s1.closed).toBe(true);
  });

  it("close : désabonne, ptyClose et retire la session (anti-fuite)", async () => {
    const { api, unOutput, unClosed } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.open("s1", "/root/p1", 80, 24);
    });
    await act(async () => {
      await result.current.close("s1");
    });
    expect(unOutput).toHaveBeenCalledTimes(1);
    expect(unClosed).toHaveBeenCalledTimes(1);
    expect(api.ptyClose).toHaveBeenCalledWith("s1");
    expect(result.current.sessions.s1).toBeUndefined();
  });
});
