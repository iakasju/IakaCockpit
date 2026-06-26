/**
 * useRunner — cycle de vie des sessions chef-runner (L10 P1, cœur technique).
 *
 * Câble les commandes runner de la couture PIPES (`runnerOpen/Write/Interrupt/Close`)
 * et les événements (`runner://raw|stderr|closed/{id}`) — ces derniers via les helpers
 * EXPOSÉS par `backend.ts` (`onRunnerRaw`/`onRunnerStderr`/`onRunnerClosed`). AUCUN
 * import de `@tauri-apps/api/event` ici (D6/D7) : tout passe par la façade.
 *
 * Calque exact de `usePty` (cohérence, testabilité), MAIS pour le chef-runner en
 * pipes (PAS un PTY) : pas de `resize` (un flux de pipes n'a pas de géométrie), et
 * `write` envoie un TOUR (le texte est enveloppé en NDJSON `{"type":"user"}` côté
 * Rust). `interrupt` câble l'`esc` (abort outil, le process survit).
 *
 * Le rendu xterm vit dans le composant `RunnerTerminal` (présentationnel) qui consomme
 * ce hook : la LOGIQUE (mapping événement→callback, nettoyage) est ici, testable avec
 * une façade mockée ; le pixel xterm est validé à la main (D8).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  backend,
  type Backend,
  type RunnerKind,
  type UnlistenFn,
} from "../api/backend";

export interface UseRunnerSession {
  id: string;
  ready: boolean;
  closed: boolean;
}

export interface RunnerOpenOptions {
  /** Reçoit chaque ligne de FLUX BRUT du runner (à écrire dans xterm). */
  onRaw?: (line: string) => void;
  /** Reçoit chaque ligne de stderr (diagnostics routés à part). */
  onStderr?: (line: string) => void;
  /** Appelé quand le runner se ferme côté Rust (EOF / process terminé). */
  onClosed?: () => void;
}

export interface UseRunner {
  sessions: Record<string, UseRunnerSession>;
  open: (
    id: string,
    kind: RunnerKind,
    model: string | undefined,
    cwd: string,
    opts?: RunnerOpenOptions,
  ) => Promise<void>;
  /** Envoie un TOUR utilisateur (texte → NDJSON `{"type":"user"}` côté Rust). */
  write: (id: string, text: string) => Promise<void>;
  /** Interrompt l'outil en cours (`esc`) ; le process survit. */
  interrupt: (id: string) => Promise<void>;
  close: (id: string) => Promise<void>;
}

interface Subs {
  raw: UnlistenFn;
  stderr: UnlistenFn;
  closed: UnlistenFn;
}

export function useRunner(api: Backend = backend): UseRunner {
  const [sessions, setSessions] = useState<Record<string, UseRunnerSession>>(
    {},
  );
  // Abonnements par session (hors state : pas de re-render au nettoyage).
  const subsRef = useRef<Record<string, Subs>>({});

  const setSession = useCallback(
    (id: string, patch: Partial<UseRunnerSession>): void => {
      setSessions((prev) => ({
        ...prev,
        [id]: {
          ...{ id, ready: false, closed: false },
          ...prev[id],
          ...patch,
          id,
        },
      }));
    },
    [],
  );

  const cleanup = useCallback((id: string): void => {
    const subs = subsRef.current[id];
    if (subs) {
      subs.raw();
      subs.stderr();
      subs.closed();
      delete subsRef.current[id];
    }
  }, []);

  const open = useCallback(
    async (
      id: string,
      kind: RunnerKind,
      model: string | undefined,
      cwd: string,
      opts?: RunnerOpenOptions,
    ): Promise<void> => {
      // Abonnements AVANT l'ouverture pour ne perdre aucune ligne initiale.
      const raw = await api.onRunnerRaw(id, (line) => opts?.onRaw?.(line));
      const stderr = await api.onRunnerStderr(id, (line) =>
        opts?.onStderr?.(line),
      );
      const closed = await api.onRunnerClosed(id, () => {
        setSession(id, { closed: true });
        opts?.onClosed?.();
        cleanup(id);
      });
      subsRef.current[id] = { raw, stderr, closed };
      await api.runnerOpen(id, kind, model, cwd);
      setSession(id, { ready: true, closed: false });
    },
    [api, setSession, cleanup],
  );

  const write = useCallback(
    (id: string, text: string): Promise<void> => api.runnerWrite(id, text),
    [api],
  );

  const interrupt = useCallback(
    (id: string): Promise<void> => api.runnerInterrupt(id),
    [api],
  );

  const close = useCallback(
    async (id: string): Promise<void> => {
      cleanup(id);
      await api.runnerClose(id);
      setSessions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [api, cleanup],
  );

  // Filet anti-fuite : désabonne tout au démontage du hook (R-L2-4, calque usePty).
  useEffect(() => {
    const subs = subsRef.current;
    return () => {
      for (const id of Object.keys(subs)) {
        subs[id].raw();
        subs[id].stderr();
        subs[id].closed();
      }
    };
  }, []);

  return { sessions, open, write, interrupt, close };
}
