/**
 * useRunnerViews — branche le TAILER du transcript sur les conversations (L10b).
 *
 * Pour chaque conversation dont le chef-runner est ouvert (un `runnerSessionId` +
 * `transcriptPath` sont apparus dans `usePty.sessions`), démarre **une seule fois** le
 * tailer Rust (`transcriptTailStart`) et s'abonne à `runner://event/{sessionId}`. Chaque
 * `RunnerEvent` est projeté en `ChatTurn` (`runnerEventToTurn`, pur) puis ajouté à la
 * conversation via `appendTurn`. La conversation devient ainsi la **vue filtrée** du
 * transcript du chef.
 *
 * Frontière (D7/D8) : I/O UNIQUEMENT via la façade (`transcriptTailStart/Stop`,
 * `onRunnerEvent`). Aucun parse de format ici (il vit côté Rust) : on ne fait que
 * router des events typés vers l'état conversation. Pas de god-component.
 *
 * Gardes (calque EXACT de `usePty`, R-L10b-1) :
 *   - le **tailer** (thread Rust) est l'équivalent du PTY : il **SURVIT au remontage**
 *     (StrictMode dev, navigation) — on ne l'arrête PAS au démontage. `startedRef` joue
 *     le rôle de `spawnRef` : il garde le **démarrage** du tailer (idempotent ; côté Rust
 *     `transcript_tail_start` est déjà no-op si actif) et n'est **pas vidé** au démontage ;
 *   - l'**abonnement** est l'équivalent de `subscribe` : il est **toujours (re)lié** sur
 *     chaque run pour les sessions actives (désabonne l'ancien, réabonne le courant) et
 *     **désabonné au démontage** (anti-fuite). Ainsi, après un remontage, les events
 *     repartent vers le listener COURANT — la survie ne repose plus sur une **course**
 *     fragile `start` vs `stop` (bug réparé : avant, le démontage stoppait le tailer +
 *     désabonnait SANS retirer le sid de `startedRef` → au remontage `startedRef.has(sid)`
 *     court-circuitait tout → listener perdu, chat muet sauf coup de chance).
 */
import { useEffect, useRef } from "react";
import {
  backend,
  type Backend,
  type RunnerEvent,
  type UnlistenFn,
} from "../api/backend";
import type { ChatTurn, Conversation } from "./useConversations";
import { runnerEventToTurn } from "./runnerView";
import type { UsePtySession } from "./usePty";

export interface UseRunnerViewsDeps {
  /** Façade backend (injectable pour tests). */
  api?: Backend;
  /** Conversations courantes (clef ptySessionId → projectId). */
  conversations: Conversation[];
  /** Sessions PTY (porte `runnerSessionId`/`transcriptPath` après `openRunner`). */
  ptySessions: Record<string, UsePtySession>;
  /** Ajoute un tour dérivé à la conversation (`useConversations.appendTurn`). */
  appendTurn: (projectId: string, turn: ChatTurn) => void;
  /**
   * Observateur ADDITIF des `RunnerEvent` bruts (par `projectId`), AVANT projection en
   * `ChatTurn` — sert au panneau « Tâches en cours » (`useAgentTasks.ingest`) qui a
   * besoin du `tool_use_id` (perdu dans `ChatTurn`). N'altère PAS le chat-vue. Optionnel.
   */
  onEvent?: (projectId: string, ev: RunnerEvent) => void;
}

export function useRunnerViews({
  api = backend,
  conversations,
  ptySessions,
  appendTurn,
  onEvent,
}: UseRunnerViewsDeps): void {
  // Réfs miroir : lire les valeurs courantes sans réabonner (callbacks stables).
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const appendRef = useRef(appendTurn);
  appendRef.current = appendTurn;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Tailers démarrés (par runnerSessionId) + leurs désabonnements (anti-doublon/fuite).
  const startedRef = useRef<Set<string>>(new Set());
  const unlistenRef = useRef<Record<string, UnlistenFn>>({});

  useEffect(() => {
    const unl = unlistenRef.current;

    for (const conv of convRef.current) {
      const sess = ptySessions[conv.ptySessionId];
      const sid = sess?.runnerSessionId;
      if (!sid) continue; // pas (encore) de chef-runner / repli shell.

      // Dispatch « source de vues » par runner (frontière `ConversationSource`) : Codex se
      // tail par DÉCOUVERTE du rollout (cwd + récence) ; Claude par chemin de transcript
      // déterministe. `runnerKind` absent ⇒ comportement transcript (rétro-compatible).
      const isCodex = sess?.runnerKind === "codex";
      const path = sess?.transcriptPath;
      const cwd = sess?.cwd;
      // Garde de démarrage : claude exige un transcriptPath ; codex exige un cwd.
      if (isCodex ? !cwd : !path) continue;
      const startTailer = (): Promise<void> =>
        isCodex
          ? api.codexTailStart(sid, cwd as string, sess?.startedAtMs ?? 0)
          : api.transcriptTailStart(sid, path as string);
      const projectId = conv.projectId;

      // (Re)lie le listener sur CHAQUE run (rebind-safe, calque `usePty.subscribe`) :
      // désabonne un binding antérieur pour ce sid puis réabonne → après un remontage,
      // les events repartent vers le listener COURANT (jamais vers un disposé).
      unl[sid]?.();
      delete unl[sid];
      const bind = api
        .onRunnerEvent(sid, (ev) => {
          // Observateur additif (tâches) AVANT projection chat — garde le tool_use_id.
          onEventRef.current?.(projectId, ev);
          const turn = runnerEventToTurn(ev);
          if (turn) appendRef.current(projectId, turn);
        })
        .then((unlisten) => {
          unl[sid] = unlisten;
        })
        .catch(() => {});

      // Démarre le tailer UNE seule fois (il SURVIT au remontage ; côté Rust l'appel est
      // idempotent). On enchaîne sur l'abonnement pour ne perdre aucun event du re-read
      // initial (si le transcript existe déjà, le tailer émet aussitôt depuis le début).
      if (!startedRef.current.has(sid)) {
        startedRef.current.add(sid);
        void bind
          .then(() => startTailer())
          .catch(() => {
            // Démarrage impossible (hors Tauri / erreur) : on rouvre la porte au retry.
            startedRef.current.delete(sid);
          });
      }
    }

    // Démontage (StrictMode dev / sortie d'app / changement d'`api`) : on DÉSABONNE
    // seulement (anti-fuite). Le tailer SURVIT (calque `usePty` : le PTY n'est pas fermé
    // au démontage) et `startedRef` n'est PAS vidé → pas de re-spawn de thread, juste un
    // rebind du listener au remontage.
    return () => {
      for (const sid of Object.keys(unl)) {
        unl[sid]?.();
        delete unl[sid];
      }
    };
    // Dépend des sessions PTY (apparition d'un runnerSessionId) ; les conversations
    // sont lues via réf miroir pour ne pas réabonner à chaque changement d'historique.
  }, [api, ptySessions]);
}
