/**
 * Harnais E2E (L10b) — reproduit le VRAI chaînage qui peuple le chat, de bout en bout,
 * SANS mocker chaque maillon isolément (c'est ce gap mock-vs-live qui a piégé 2×) :
 *
 *   openRunner → session_id (uuid) → usePty.sessions.runnerSessionId
 *     → useRunnerViews subscribe(onRunnerEvent, sid) + transcriptTailStart(sid)
 *     → l'événement émis sur `runner://event/{sid}` → appendTurn → history.
 *
 * Le backend fake est un VRAI bus d'événements keyé par `session_id` : `onRunnerEvent`
 * s'abonne à la clé, `transcriptTailStart` ÉMET sur la clé. Le SEUL lien entre l'émission
 * et l'abonnement est le `session_id` renvoyé par `ptyRunnerOpen` et propagé par usePty.
 * Si le front perd/mésappaire ce `session_id` n'importe où, la bulle n'apparaît jamais —
 * c'est exactement le symptôme « chat muet » de la recette terrain.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { StrictMode, useEffect, useRef, useState } from "react";
import type { UsePty } from "../hooks/usePty";
import type { Backend, RunnerEvent } from "../api/backend";
import { useConversations } from "../hooks/useConversations";
import { usePty } from "../hooks/usePty";
import { useRunnerViews } from "../hooks/useRunnerViews";

/**
 * Backend fake = bus d'événements fidèle à Tauri (émission/abonnement keyés par nom).
 * `ptyRunnerOpen` génère un session_id (comme Rust pré-génère son uuid). Le tailer est
 * SIMULÉ : `transcriptTailStart(sid)` émet la parole assistant réelle sur la clé `sid`
 * APRÈS un court délai (comme le transcript qui apparaît après quelques instants), pour
 * exercer le cas « événement émis APRÈS l'abonnement et le rendu ».
 */
function makeBusBackend(opts?: { sessionId?: string; emitDelayMs?: number }) {
  const sessionId =
    opts?.sessionId ?? "4b5ff60c-257b-4d22-b0dc-03f0fac1154e";
  // bus: event name → set of callbacks
  const listeners = new Map<string, Set<(p: unknown) => void>>();
  const sub = (name: string, cb: (p: unknown) => void): (() => void) => {
    let s = listeners.get(name);
    if (!s) {
      s = new Set();
      listeners.set(name, s);
    }
    s.add(cb);
    return () => s?.delete(cb);
  };
  const emit = (name: string, payload: unknown): void => {
    listeners.get(name)?.forEach((cb) => cb(payload));
  };

  const api = {
    // --- PTY plumbing (no-op output/closed) ---
    onPtyOutput: vi.fn(async (id: string, cb: (d: string) => void) =>
      sub(`pty://output/${id}`, (p) => cb(p as string)),
    ),
    onPtyClosed: vi.fn(async (id: string, cb: () => void) =>
      sub(`pty://closed/${id}`, () => cb()),
    ),
    ptyOpen: vi.fn().mockResolvedValue(undefined),
    ptyWrite: vi.fn().mockResolvedValue(undefined),
    ptyResize: vi.fn().mockResolvedValue(undefined),
    ptyClose: vi.fn().mockResolvedValue(undefined),

    // --- Chef-runner : renvoie le session_id (uuid), comme Rust ---
    ptyRunnerOpen: vi.fn(async () => ({
      session_id: sessionId,
      transcript_path: `/home/u/.claude/projects/-iaka-demo/${sessionId}.jsonl`,
    })),

    // --- Tailer SIMULÉ : émet la parole assistant réelle sur la clé `sid` ---
    transcriptTailStart: vi.fn(async (sid: string) => {
      const ev: RunnerEvent = {
        kind: "parole",
        role: "assistant",
        is_sidechain: false,
        text: "🟡 [COORDINATION][Aragorn] — Coordinateur d'équipe prêt. Je suis là",
      };
      // Émission APRÈS un tick (le transcript apparaît un peu après l'abonnement).
      setTimeout(() => emit(`runner://event/${sid}`, ev), opts?.emitDelayMs ?? 5);
    }),
    transcriptTailStop: vi.fn(async () => {}),

    // --- Abonnement aux vues dérivées : keyé par session_id ---
    onRunnerEvent: vi.fn(
      async (sid: string, cb: (e: RunnerEvent) => void) =>
        sub(`runner://event/${sid}`, (p) => cb(p as RunnerEvent)),
    ),
  } as unknown as Backend;

  return { api, sessionId };
}

/**
 * Composant-harnais : compose les hooks EXACTEMENT comme `App.tsx` (mêmes branchements),
 * ouvre la conversation démo et spawne le chef-runner (comme `PtyTerminal`/openRunner).
 * Rend l'historique en DOM pour observer la bulle (assertion de bout en bout).
 */
function Harness({ api }: { api: Backend }): JSX.Element {
  const conversations = useConversations();
  const pty = usePty(api);

  // Branchement IDENTIQUE à App.tsx.
  useRunnerViews({
    api,
    conversations: conversations.conversations,
    ptySessions: pty.sessions,
    appendTurn: conversations.appendTurn,
  });

  // Ouvre la conversation + spawne le runner UNE fois (comme demo seed + PtyTerminal).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ptySessionId = conversations.openConversation(
      "iaka-demo",
      "iaka-demo",
      "/iaka-demo",
    );
    void pty.openRunner(
      ptySessionId,
      "claude-code",
      undefined,
      "/iaka-demo",
      80,
      24,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = conversations.active;
  return (
    <div>
      {active?.history.map((t, i) => (
        <div key={i} data-role={t.role} data-kind={t.kind}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

/**
 * Reproduit fidèlement `PtyTerminal` : monte tardivement (comme la navigation vers
 * Working) et appelle `openRunner` dans un effet SANS garde de composant (la garde vit
 * dans `usePty.spawnRef`). Sous StrictMode, l'effet est monté→démonté→remonté → openRunner
 * est appelé 2× (1er spawn + remontage). Au démontage, NE FERME PAS le runner (R-L10b-1).
 */
function RunnerMount({
  pty,
  sessionId,
  cwd,
}: {
  pty: UsePty;
  sessionId: string;
  cwd: string;
}): JSX.Element {
  const ptyRef = useRef(pty);
  ptyRef.current = pty;
  useEffect(() => {
    void ptyRef.current.openRunner(
      sessionId,
      "claude-code",
      undefined,
      cwd,
      80,
      24,
    );
    // Démontage : NE FERME PAS le runner (survit au remontage / StrictMode).
    return () => {};
  }, [sessionId, cwd]);
  return <div data-testid="runner-mount" />;
}

/**
 * Harnais fidèle à App : ouvre la conversation au montage (comme demo seed), puis monte
 * `RunnerMount` APRÈS un délai (comme la navigation vers Working) — l'apparition tardive
 * du `runnerSessionId` doit quand même déclencher l'abonnement du tailer.
 */
function HarnessLate({ api }: { api: Backend }): JSX.Element {
  const conversations = useConversations();
  const pty = usePty(api);
  useRunnerViews({
    api,
    conversations: conversations.conversations,
    ptySessions: pty.sessions,
    appendTurn: conversations.appendTurn,
  });

  const [navWorking, setNavWorking] = useState(false);
  const ptySessionIdRef = useRef<string | null>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    ptySessionIdRef.current = conversations.openConversation(
      "iaka-demo",
      "iaka-demo",
      "/iaka-demo",
    );
    // Navigation vers Working un peu plus tard (le runner ne spawne qu'à ce moment).
    setTimeout(() => setNavWorking(true), 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = conversations.active;
  return (
    <div>
      {navWorking && ptySessionIdRef.current && (
        <RunnerMount
          pty={pty}
          sessionId={ptySessionIdRef.current}
          cwd="/iaka-demo"
        />
      )}
      {active?.history.map((t, i) => (
        <div key={i} data-role={t.role} data-kind={t.kind}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

describe("E2E chat — chaînage openRunner→tailer→onRunnerEvent→appendTurn (régression recette)", () => {
  it("la parole assistant du chef-runner apparaît comme bulle dans la conversation", async () => {
    const { api } = makeBusBackend();
    await act(async () => {
      render(<Harness api={api} />);
    });
    // La bulle doit apparaître (vue filtrée du transcript). C'est le symptôme « chat muet ».
    await waitFor(() => {
      expect(
        screen.getByText(/COORDINATION\]\[Aragorn\]/),
      ).toBeTruthy();
    });
  });

  it("[StrictMode] la bulle apparaît MÊME avec le double-invoke des effets (recette dev)", async () => {
    // `tauri dev` rend sous <React.StrictMode> : les effets sont montés→démontés→remontés.
    // Ce double-invoke stresse la téardown des abonnements (`useRunnerViews`) et
    // l'idempotence du spawn (`usePty`). C'est l'écart jsdom-vs-live qui nous a piégés.
    const { api } = makeBusBackend({ emitDelayMs: 30 });
    await act(async () => {
      render(
        <StrictMode>
          <Harness api={api} />
        </StrictMode>,
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText(/COORDINATION\]\[Aragorn\]/),
      ).toBeTruthy();
    });
  });

  it("[StrictMode + spawn tardif] la bulle apparaît quand le runner est ouvert APRÈS coup (navigation Working)", async () => {
    // Reproduit le VRAI scénario recette : conversation ouverte au boot (demo seed,
    // sur Portfolio), puis runner spawné PLUS TARD (navigation Working → PtyTerminal),
    // le tout sous StrictMode (double-mount de l'opener). L'apparition tardive du
    // runnerSessionId DOIT déclencher l'abonnement + le tailer → bulle.
    const { api } = makeBusBackend({ emitDelayMs: 40 });
    await act(async () => {
      render(
        <StrictMode>
          <HarnessLate api={api} />
        </StrictMode>,
      );
    });
    await waitFor(
      () => {
        expect(
          screen.getByText(/COORDINATION\]\[Aragorn\]/),
        ).toBeTruthy();
      },
      { timeout: 2000 },
    );
    // Le runner n'est ouvert qu'UNE fois malgré le double-invoke StrictMode (idempotence).
    expect(
      (api.ptyRunnerOpen as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(1);
  });
});
