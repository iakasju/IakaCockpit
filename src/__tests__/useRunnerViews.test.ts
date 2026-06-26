import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRunnerViews } from "../hooks/useRunnerViews";
import type { Backend, RunnerEvent } from "../api/backend";
import type { Conversation } from "../hooks/useConversations";
import type { UsePtySession } from "../hooks/usePty";

function makeApi(
  onEvent?: (sid: string, cb: (e: RunnerEvent) => void) => void,
): Backend {
  return {
    transcriptTailStart: vi.fn(async () => {}),
    transcriptTailStop: vi.fn(async () => {}),
    onRunnerEvent: vi.fn(async (sid: string, cb: (e: RunnerEvent) => void) => {
      onEvent?.(sid, cb);
      return () => {};
    }),
  } as unknown as Backend;
}

const conv = (projectId: string, ptySessionId: string): Conversation => ({
  projectId,
  title: projectId,
  cwd: `/root/${projectId}`,
  mode: "chat",
  agent: "Aragorn",
  ptySessionId,
  history: [],
  pending: false,
  error: null,
});

const ptySession = (
  id: string,
  runnerSessionId?: string,
  transcriptPath?: string,
): UsePtySession => ({ id, ready: true, closed: false, runnerSessionId, transcriptPath });

describe("useRunnerViews — branchement tailer → conversation (L10b)", () => {
  it("démarre le tailer + s'abonne quand un runnerSessionId apparaît", () => {
    const api = makeApi();
    const conversations = [conv("p1", "pty-1")];
    const ptySessions = {
      "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
    };
    renderHook(() =>
      useRunnerViews({
        api,
        conversations,
        ptySessions,
        appendTurn: vi.fn(),
      }),
    );
    expect(api.transcriptTailStart).toHaveBeenCalledWith(
      "sid-1",
      "/t/sid-1.jsonl",
    );
    expect(api.onRunnerEvent).toHaveBeenCalledWith("sid-1", expect.any(Function));
  });

  it("ne démarre RIEN tant que le runnerSessionId/transcriptPath sont absents (repli shell)", () => {
    const api = makeApi();
    renderHook(() =>
      useRunnerViews({
        api,
        conversations: [conv("p1", "pty-1")],
        ptySessions: { "pty-1": ptySession("pty-1") },
        appendTurn: vi.fn(),
      }),
    );
    expect(api.transcriptTailStart).not.toHaveBeenCalled();
    expect(api.onRunnerEvent).not.toHaveBeenCalled();
  });

  it("route un RunnerEvent (parole assistant) vers appendTurn de la bonne conversation", () => {
    const holder: { emit: ((e: RunnerEvent) => void) | null } = { emit: null };
    const api = makeApi((_sid, cb) => {
      holder.emit = cb;
    });
    const appendTurn = vi.fn();
    renderHook(() =>
      useRunnerViews({
        api,
        conversations: [conv("p1", "pty-1")],
        ptySessions: {
          "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
        },
        appendTurn,
      }),
    );
    holder.emit?.({
      kind: "parole",
      role: "assistant",
      is_sidechain: false,
      text: "Bonjour",
    });
    expect(appendTurn).toHaveBeenCalledWith("p1", {
      role: "assistant",
      content: "Bonjour",
      kind: "parole",
    });
  });

  it("n'appelle PAS appendTurn pour une parole utilisateur (déjà échoée)", () => {
    const holder: { emit: ((e: RunnerEvent) => void) | null } = { emit: null };
    const api = makeApi((_sid, cb) => {
      holder.emit = cb;
    });
    const appendTurn = vi.fn();
    renderHook(() =>
      useRunnerViews({
        api,
        conversations: [conv("p1", "pty-1")],
        ptySessions: {
          "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
        },
        appendTurn,
      }),
    );
    holder.emit?.({
      kind: "parole",
      role: "user",
      is_sidechain: false,
      text: "ma saisie",
    });
    expect(appendTurn).not.toHaveBeenCalled();
  });

  it("idempotent : un re-render ne redémarre pas un tailer déjà actif", () => {
    const api = makeApi();
    const ptySessions = {
      "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
    };
    const { rerender } = renderHook(
      (props: {
        ptySessions: Record<string, UsePtySession>;
      }) =>
        useRunnerViews({
          api,
          conversations: [conv("p1", "pty-1")],
          ptySessions: props.ptySessions,
          appendTurn: vi.fn(),
        }),
      { initialProps: { ptySessions } },
    );
    rerender({ ptySessions: { ...ptySessions } });
    expect(api.transcriptTailStart).toHaveBeenCalledTimes(1);
  });

  it("arrête les tailers au démontage (anti-fuite)", () => {
    const api = makeApi();
    const { unmount } = renderHook(() =>
      useRunnerViews({
        api,
        conversations: [conv("p1", "pty-1")],
        ptySessions: {
          "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
        },
        appendTurn: vi.fn(),
      }),
    );
    unmount();
    expect(api.transcriptTailStop).toHaveBeenCalledWith("sid-1");
  });
});
