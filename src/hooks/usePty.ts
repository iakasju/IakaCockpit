/**
 * usePty — cycle de vie des sessions terminal PTY réelles (L2, cœur technique).
 *
 * Câble les commandes PTY de L1 (`ptyOpen/Write/Resize/Close`) et les événements
 * (`pty://output|closed/{id}`) — ces derniers via les helpers EXPOSÉS par
 * `backend.ts` (`onPtyOutput`/`onPtyClosed`). AUCUN import de
 * `@tauri-apps/api/event` ici (D6/D7) : tout passe par la façade.
 *
 * Le hook gère :
 *   - open  : `ptyOpen` + abonnement output/closed (mémorisés pour nettoyage) ;
 *   - write/resize : délégation aux commandes ;
 *   - close : désabonnement (unlisten) + `ptyClose` (anti-fuite R-L2-4).
 *
 * Le rendu xterm vit dans le composant `PtyTerminal` (présentationnel) qui
 * consomme ce hook : la LOGIQUE (mapping événement→callback, nettoyage) est ici,
 * testable avec une façade mockée ; le pixel xterm est validé à la main (D8).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  backend,
  type Backend,
  type ChefRunnerKind,
  type RunnerSession,
  type UnlistenFn,
} from "../api/backend";

export interface UsePtySession {
  id: string;
  ready: boolean;
  closed: boolean;
  /**
   * `session_id` (uuid) du chef-runner ouvert dans ce PTY (L10a) — clef PTY ↔
   * transcript JSONL ↔ session (consommée par le tailer L10b). Absent pour un PTY
   * shell legacy (`open`) ou un chef-runner `kind:"shell"`.
   */
  runnerSessionId?: string;
  /** Chemin PRÉVU du transcript JSONL du chef-runner (L10a) — pour le tailer L10b. */
  transcriptPath?: string;
}

export interface OpenOptions {
  /** Reçoit chaque chunk de sortie du PTY (à écrire dans xterm). */
  onData?: (data: string) => void;
  /** Appelé quand la session se ferme côté Rust. */
  onClosed?: () => void;
}

export interface UsePty {
  sessions: Record<string, UsePtySession>;
  open: (
    id: string,
    cwd: string,
    cols: number,
    rows: number,
    opts?: OpenOptions,
  ) => Promise<void>;
  /**
   * Ouvre un CHEF-RUNNER dans le PTY (L10a) : `claude` en TUI native (`kind`
   * `"claude-code"`) ou le shell legacy (`"shell"`). Même plomberie d'événements que
   * `open` (output/closed) ; en plus, mémorise `runnerSessionId`/`transcriptPath` et
   * renvoie le `RunnerSession`. La frappe et le rendu xterm restent identiques (TUI
   * native rendue par `pty://output`, frappe → stdin).
   */
  openRunner: (
    id: string,
    kind: ChefRunnerKind,
    model: string | undefined,
    cwd: string,
    cols: number,
    rows: number,
    opts?: OpenOptions,
  ) => Promise<RunnerSession>;
  write: (id: string, data: string) => Promise<void>;
  resize: (id: string, cols: number, rows: number) => Promise<void>;
  close: (id: string) => Promise<void>;
}

interface Subs {
  output: UnlistenFn;
  closed: UnlistenFn;
}

export function usePty(api: Backend = backend): UsePty {
  const [sessions, setSessions] = useState<Record<string, UsePtySession>>({});
  // Abonnements par session (hors state : pas de re-render au nettoyage).
  const subsRef = useRef<Record<string, Subs>>({});
  // Spawn EFFECTIF (process Rust) par session — mémorisé pour être IDEMPOTENT
  // (R-L10b-1) : un même `id` n'ouvre qu'UN seul PTY/runner, même si `open`/
  // `openRunner` est rappelé (remontage du composant : navigation Working↔Portfolio,
  // double-invocation des effets sous `React.StrictMode` en dev). Sans ce garde, on
  // spawnait DEUX `claude` (deux `session_id`) sur le même `pty://output/{id}` → flux
  // dédoublé (shell affiché 2×) et `session_id` instable → le tailer du transcript ne
  // démarrait jamais sur le bon (chat muet). Le runner SURVIT au remontage (il n'est
  // PAS fermé au démontage du composant) ; il n'est libéré que par `close` explicite.
  const spawnRef = useRef<Record<string, Promise<RunnerSession | void>>>({});

  const setSession = useCallback(
    (id: string, patch: Partial<UsePtySession>): void => {
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
      subs.output();
      subs.closed();
      delete subsRef.current[id];
    }
  }, []);

  // Abonnement commun (output/closed) — partagé par `open` (shell legacy) et
  // `openRunner` (chef-runner TUI native). **Rebind-safe** (R-L10b-1) : on désabonne
  // d'abord un abonnement antérieur pour le MÊME `id` (remontage = nouvelle surface
  // xterm) avant de réabonner → la sortie est routée vers le terminal COURANT, jamais
  // vers un terminal disposé. Abonnement AVANT l'ouverture pour ne perdre aucun chunk.
  const subscribe = useCallback(
    async (id: string, opts?: OpenOptions): Promise<void> => {
      cleanup(id); // désabonne la surface précédente (rebind sur la surface courante).
      const output = await api.onPtyOutput(id, (data) => {
        opts?.onData?.(data);
      });
      const closed = await api.onPtyClosed(id, () => {
        setSession(id, { closed: true });
        opts?.onClosed?.();
        cleanup(id);
      });
      subsRef.current[id] = { output, closed };
    },
    [api, setSession, cleanup],
  );

  const open = useCallback(
    (
      id: string,
      cwd: string,
      cols: number,
      rows: number,
      opts?: OpenOptions,
    ): Promise<void> => {
      // Rebind la sortie sur la surface courante (toujours), spawn le PTY UNE FOIS.
      const existing = spawnRef.current[id];
      if (!existing) {
        const spawn = (async () => {
          await subscribe(id, opts);
          await api.ptyOpen(id, cwd, cols, rows);
          setSession(id, { ready: true, closed: false });
        })();
        spawnRef.current[id] = spawn;
        return spawn as Promise<void>;
      }
      // Remontage : rebind la sortie sur la surface courante, PAS de second spawn.
      return (async () => {
        await subscribe(id, opts);
        await existing;
      })();
    },
    [api, subscribe, setSession],
  );

  const openRunner = useCallback(
    (
      id: string,
      kind: ChefRunnerKind,
      model: string | undefined,
      cwd: string,
      cols: number,
      rows: number,
      opts?: OpenOptions,
    ): Promise<RunnerSession> => {
      // Garde d'IDEMPOTENCE posé SYNCHRONEMENT : une seconde invocation quasi-synchrone
      // (StrictMode double-mount / remontage de vue) réutilise CE spawn au lieu de
      // lancer un 2ᵉ `claude`. Le `session_id` reste donc STABLE (clef du tailer L10b).
      const existing = spawnRef.current[id] as
        | Promise<RunnerSession>
        | undefined;
      if (!existing) {
        const spawn = (async () => {
          await subscribe(id, opts);
          const session = await api.ptyRunnerOpen(
            id,
            kind,
            model,
            cwd,
            cols,
            rows,
          );
          setSession(id, {
            ready: true,
            closed: false,
            runnerSessionId: session.session_id,
            transcriptPath: session.transcript_path,
          });
          return session;
        })();
        spawnRef.current[id] = spawn;
        return spawn;
      }
      // Remontage : rebind la sortie sur la surface courante, PAS de second spawn ;
      // on renvoie la session DÉJÀ ouverte (clef de tailer stable).
      return (async () => {
        await subscribe(id, opts);
        return existing;
      })();
    },
    [api, subscribe, setSession],
  );

  const write = useCallback(
    (id: string, data: string): Promise<void> => api.ptyWrite(id, data),
    [api],
  );

  const resize = useCallback(
    (id: string, cols: number, rows: number): Promise<void> =>
      api.ptyResize(id, cols, rows),
    [api],
  );

  const close = useCallback(
    async (id: string): Promise<void> => {
      cleanup(id);
      delete spawnRef.current[id]; // libère le garde : un futur `open` pourra respawner.
      await api.ptyClose(id);
      setSessions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [api, cleanup],
  );

  // Filet anti-fuite : désabonne tout au démontage du hook (changement de vue,
  // fermeture d'app). Les `ptyClose` ciblés restent gérés par la fermeture
  // d'onglet ; ici on évite les abonnements orphelins (R-L2-4).
  useEffect(() => {
    const subs = subsRef.current;
    return () => {
      for (const id of Object.keys(subs)) {
        subs[id].output();
        subs[id].closed();
      }
    };
  }, []);

  return { sessions, open, openRunner, write, resize, close };
}
