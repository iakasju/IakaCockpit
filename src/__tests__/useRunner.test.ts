import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunner } from "../hooks/useRunner";
import type { Backend } from "../api/backend";

/** Façade runner mockée : capture les callbacks d'abonnement pour les déclencher. */
function mockRunnerApi() {
  const rawCb: Record<string, (l: string) => void> = {};
  const stderrCb: Record<string, (l: string) => void> = {};
  const closedCb: Record<string, () => void> = {};
  const unRaw = vi.fn();
  const unStderr = vi.fn();
  const unClosed = vi.fn();
  const api = {
    onRunnerRaw: vi.fn(async (id: string, cb: (l: string) => void) => {
      rawCb[id] = cb;
      return unRaw;
    }),
    onRunnerStderr: vi.fn(async (id: string, cb: (l: string) => void) => {
      stderrCb[id] = cb;
      return unStderr;
    }),
    onRunnerClosed: vi.fn(async (id: string, cb: () => void) => {
      closedCb[id] = cb;
      return unClosed;
    }),
    runnerOpen: vi.fn().mockResolvedValue(undefined),
    runnerWrite: vi.fn().mockResolvedValue(undefined),
    runnerInterrupt: vi.fn().mockResolvedValue(undefined),
    runnerClose: vi.fn().mockResolvedValue(undefined),
  } as unknown as Backend;
  return { api, rawCb, stderrCb, closedCb, unRaw, unStderr, unClosed };
}

describe("useRunner", () => {
  it("open : s'abonne (raw/stderr/closed) AVANT runnerOpen et marque prêt", async () => {
    const { api } = mockRunnerApi();
    const { result } = renderHook(() => useRunner(api));
    await act(async () => {
      await result.current.open("s1", "claude-code", undefined, "/root/p1");
    });
    expect(api.onRunnerRaw).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.onRunnerStderr).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.onRunnerClosed).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.runnerOpen).toHaveBeenCalledWith(
      "s1",
      "claude-code",
      undefined,
      "/root/p1",
    );
    expect(result.current.sessions.s1.ready).toBe(true);
    expect(result.current.sessions.s1.closed).toBe(false);
  });

  it("mappe le flux brut → onRaw et stderr → onStderr", async () => {
    const { api, rawCb, stderrCb } = mockRunnerApi();
    const onRaw = vi.fn();
    const onStderr = vi.fn();
    const { result } = renderHook(() => useRunner(api));
    await act(async () => {
      await result.current.open("s1", "claude-code", undefined, "/root/p1", {
        onRaw,
        onStderr,
      });
    });
    act(() => rawCb.s1('{"type":"assistant"}'));
    act(() => stderrCb.s1("oops"));
    expect(onRaw).toHaveBeenCalledWith('{"type":"assistant"}');
    expect(onStderr).toHaveBeenCalledWith("oops");
  });

  it("write envoie un tour ; interrupt câble l'esc", async () => {
    const { api } = mockRunnerApi();
    const { result } = renderHook(() => useRunner(api));
    await act(async () => {
      await result.current.write("s1", "Bonjour");
      await result.current.interrupt("s1");
    });
    expect(api.runnerWrite).toHaveBeenCalledWith("s1", "Bonjour");
    expect(api.runnerInterrupt).toHaveBeenCalledWith("s1");
  });

  it("évènement closed : marque fermé + désabonne (raw/stderr/closed) + onClosed", async () => {
    const { api, closedCb, unRaw, unStderr, unClosed } = mockRunnerApi();
    const onClosed = vi.fn();
    const { result } = renderHook(() => useRunner(api));
    await act(async () => {
      await result.current.open("s1", "claude-code", undefined, "/root/p1", {
        onClosed,
      });
    });
    act(() => closedCb.s1());
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(unRaw).toHaveBeenCalledTimes(1);
    expect(unStderr).toHaveBeenCalledTimes(1);
    expect(unClosed).toHaveBeenCalledTimes(1);
    expect(result.current.sessions.s1.closed).toBe(true);
  });

  it("close : désabonne, runnerClose et retire la session (anti-fuite)", async () => {
    const { api, unRaw, unStderr, unClosed } = mockRunnerApi();
    const { result } = renderHook(() => useRunner(api));
    await act(async () => {
      await result.current.open("s1", "claude-code", undefined, "/root/p1");
    });
    await act(async () => {
      await result.current.close("s1");
    });
    expect(unRaw).toHaveBeenCalledTimes(1);
    expect(unStderr).toHaveBeenCalledTimes(1);
    expect(unClosed).toHaveBeenCalledTimes(1);
    expect(api.runnerClose).toHaveBeenCalledWith("s1");
    expect(result.current.sessions.s1).toBeUndefined();
  });
});
