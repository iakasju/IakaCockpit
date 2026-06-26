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
    ptyRunnerOpen: vi.fn().mockResolvedValue({
      session_id: "11111111-2222-3333-4444-555555555555",
      transcript_path: "/home/u/.claude/projects/-root-p1/sid.jsonl",
    }),
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

  it("openRunner : s'abonne, lance le chef-runner et mémorise session_id/transcript (L10a)", async () => {
    const { api } = mockPtyApi();
    const onData = vi.fn();
    const { result } = renderHook(() => usePty(api));
    let returned;
    await act(async () => {
      returned = await result.current.openRunner(
        "s1",
        "claude-code",
        "claude-haiku-4-5",
        "/root/p1",
        80,
        24,
        { onData },
      );
    });
    // Abonnements (mêmes événements PTY que open) + ouverture runner avec les bons args.
    expect(api.onPtyOutput).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.onPtyClosed).toHaveBeenCalledWith("s1", expect.any(Function));
    expect(api.ptyRunnerOpen).toHaveBeenCalledWith(
      "s1",
      "claude-code",
      "claude-haiku-4-5",
      "/root/p1",
      80,
      24,
    );
    // session_id + transcript mémorisés dans la session (clef pour le tailer L10b).
    expect(result.current.sessions.s1.ready).toBe(true);
    expect(result.current.sessions.s1.runnerSessionId).toBe(
      "11111111-2222-3333-4444-555555555555",
    );
    expect(result.current.sessions.s1.transcriptPath).toContain(
      ".claude/projects/",
    );
    expect(returned).toEqual({
      session_id: "11111111-2222-3333-4444-555555555555",
      transcript_path: "/home/u/.claude/projects/-root-p1/sid.jsonl",
    });
  });

  it("openRunner : le flux output est branché (TUI native rendue par pty://output)", async () => {
    const { api, outputCb } = mockPtyApi();
    const onData = vi.fn();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.openRunner(
        "s1",
        "claude-code",
        undefined,
        "/root/p1",
        80,
        24,
        { onData },
      );
    });
    act(() => outputCb.s1("\x1b[2K box claude"));
    expect(onData).toHaveBeenCalledWith("\x1b[2K box claude");
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

  // RÉGRESSION recette L10b (bug #2 « shell affiché 2× » + bug #1 session instable) :
  // `PtyTerminal` est remonté deux fois sur le 1ᵉʳ montage par `React.StrictMode`
  // (mount→cleanup→mount), et à chaque navigation Working↔Portfolio. Sans garde
  // d'idempotence, `openRunner` lançait DEUX `claude` (deux `session_id`) sur le même
  // `pty://output/{id}` → flux dédoublé + `session_id` instable (tailer sur le mauvais).
  it("openRunner : un 2ᵉ appel sur le MÊME id NE relance PAS le runner (idempotent / anti-double-spawn)", async () => {
    const { api } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24);
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24);
    });
    // UN SEUL spawn réel malgré deux appels (StrictMode double-mount / remontage).
    expect(api.ptyRunnerOpen).toHaveBeenCalledTimes(1);
    // Le session_id reste STABLE (clef du tailer L10b).
    expect(result.current.sessions.s1.runnerSessionId).toBe(
      "11111111-2222-3333-4444-555555555555",
    );
  });

  it("openRunner : un remontage REBIND la sortie sur la NOUVELLE surface (pas l'ancienne)", async () => {
    const { api, outputCb } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    const onDataA = vi.fn();
    const onDataB = vi.fn();
    await act(async () => {
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24, { onData: onDataA });
    });
    // Remontage : nouvelle surface xterm (onDataB) sur le MÊME id.
    await act(async () => {
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24, { onData: onDataB });
    });
    act(() => outputCb.s1("box claude"));
    // La sortie va à la surface COURANTE (B), pas à l'ancienne (A) disposée.
    expect(onDataB).toHaveBeenCalledWith("box claude");
    expect(onDataA).not.toHaveBeenCalled();
    // Toujours un seul spawn.
    expect(api.ptyRunnerOpen).toHaveBeenCalledTimes(1);
  });

  it("openRunner puis close : le garde d'idempotence est libéré (un futur open respawne)", async () => {
    const { api } = mockPtyApi();
    const { result } = renderHook(() => usePty(api));
    await act(async () => {
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24);
    });
    await act(async () => {
      await result.current.close("s1");
    });
    await act(async () => {
      await result.current.openRunner("s1", "claude-code", undefined, "/root/p1", 80, 24);
    });
    // Fermé puis rouvert = deux spawns légitimes (le garde a été libéré par close).
    expect(api.ptyRunnerOpen).toHaveBeenCalledTimes(2);
  });
});
