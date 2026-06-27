import { describe, it, expect, vi } from "vitest";
import { StrictMode } from "react";
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

/** Vide la file de microtâches (l'abonnement puis le démarrage du tailer sont chaînés). */
const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("useRunnerViews — branchement tailer → conversation (L10b)", () => {
  it("démarre le tailer + s'abonne quand un runnerSessionId apparaît", async () => {
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
    // On s'abonne D'ABORD, puis le tailer démarre (chaîné) → flush des microtâches.
    await flush();
    expect(api.onRunnerEvent).toHaveBeenCalledWith("sid-1", expect.any(Function));
    expect(api.transcriptTailStart).toHaveBeenCalledWith(
      "sid-1",
      "/t/sid-1.jsonl",
    );
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

  it("idempotent : un re-render ne redémarre pas un tailer déjà actif", async () => {
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
    await flush();
    expect(api.transcriptTailStart).toHaveBeenCalledTimes(1);
  });

  it("désabonne au démontage MAIS NE STOPPE PAS le tailer (il survit, calque usePty)", async () => {
    const unlisten = vi.fn();
    const api = {
      transcriptTailStart: vi.fn(async () => {}),
      transcriptTailStop: vi.fn(async () => {}),
      onRunnerEvent: vi.fn(async () => unlisten),
    } as unknown as Backend;
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
    await flush(); // laisse l'abonnement s'enregistrer (unlistenRef peuplé).
    unmount();
    // Anti-fuite : le listener est désabonné…
    expect(unlisten).toHaveBeenCalledTimes(1);
    // …mais le tailer N'EST PAS stoppé (il survit au remontage, comme le PTY de usePty).
    expect(api.transcriptTailStop).not.toHaveBeenCalled();
  });

  it("RÉGRESSION StrictMode : le double-invoke ré-abonne le listener et ne re-spawne pas le tailer (chat pas muet)", async () => {
    // Bug réparé : avant, le démontage stoppait le tailer + désabonnait SANS retirer le
    // sid de startedRef → au remontage tout était court-circuité, listener perdu. Sous un
    // VRAI <StrictMode> (même instance, refs persistantes), l'effet est monté→démonté→
    // remonté : le tailer ne doit PAS être re-démarré (startedRef survit) et le listener
    // COURANT (post-remontage) doit recevoir les events.
    const holder: { emit: ((e: RunnerEvent) => void) | null } = { emit: null };
    const api = {
      transcriptTailStart: vi.fn(async () => {}),
      transcriptTailStop: vi.fn(async () => {}),
      onRunnerEvent: vi.fn(async (_sid: string, cb: (e: RunnerEvent) => void) => {
        holder.emit = cb; // dernier abonnement gagnant = listener COURANT.
        return () => {};
      }),
    } as unknown as Backend;
    const appendTurn = vi.fn();
    renderHook(
      () =>
        useRunnerViews({
          api,
          conversations: [conv("p1", "pty-1")],
          ptySessions: {
            "pty-1": ptySession("pty-1", "sid-1", "/t/sid-1.jsonl"),
          },
          appendTurn,
        }),
      { wrapper: StrictMode },
    );
    await flush();

    // Le tailer n'est PAS re-spawné malgré le double-invoke (startedRef survit → idempotent).
    expect(api.transcriptTailStart).toHaveBeenCalledTimes(1);
    // Le listener COURANT (post-remontage) reçoit bien les events → chat vivant.
    holder.emit?.({
      kind: "parole",
      role: "assistant",
      is_sidechain: false,
      text: "après remontage",
    });
    expect(appendTurn).toHaveBeenCalledWith("p1", {
      role: "assistant",
      content: "après remontage",
      kind: "parole",
    });
  });
});
