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
 * Gardes :
 *   - démarrage **idempotent** par `runnerSessionId` (ref `startedRef`) → un re-render
 *     ne relance pas un tailer ni un abonnement ;
 *   - nettoyage au démontage : `transcriptTailStop` + désabonnement de chaque session
 *     (anti-fuite, calque `usePty`).
 */
import { useEffect, useRef } from "react";
import { backend, type Backend, type UnlistenFn } from "../api/backend";
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
}

export function useRunnerViews({
  api = backend,
  conversations,
  ptySessions,
  appendTurn,
}: UseRunnerViewsDeps): void {
  // Réfs miroir : lire les valeurs courantes sans réabonner (callbacks stables).
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const appendRef = useRef(appendTurn);
  appendRef.current = appendTurn;

  // Tailers démarrés (par runnerSessionId) + leurs désabonnements (anti-doublon/fuite).
  const startedRef = useRef<Set<string>>(new Set());
  const unlistenRef = useRef<Record<string, UnlistenFn>>({});

  useEffect(() => {
    for (const conv of convRef.current) {
      const sess = ptySessions[conv.ptySessionId];
      const sid = sess?.runnerSessionId;
      const path = sess?.transcriptPath;
      if (!sid || !path) continue; // pas (encore) de chef-runner / repli shell.
      if (startedRef.current.has(sid)) continue; // déjà branché (idempotent).

      startedRef.current.add(sid);
      const projectId = conv.projectId;

      // S'ABONNER D'ABORD, démarrer le tailer ENSUITE (ordre voulu) : si le transcript
      // existe déjà (réouverture), le tailer relit depuis le début et émet aussitôt — on
      // ne veut perdre aucun event entre `start` et l'enregistrement du listener.
      void api
        .onRunnerEvent(sid, (ev) => {
          const turn = runnerEventToTurn(ev);
          if (turn) appendRef.current(projectId, turn);
        })
        .then((unlisten) => {
          unlistenRef.current[sid] = unlisten;
          return api.transcriptTailStart(sid, path);
        })
        .catch(() => {
          // Hors Tauri / abonnement ou démarrage impossible : on rouvre la porte pour
          // un éventuel retry ultérieur.
          startedRef.current.delete(sid);
        });
    }
    // Dépend des sessions PTY (apparition d'un runnerSessionId) ; les conversations
    // sont lues via réf miroir pour ne pas réabonner à chaque changement d'historique.
  }, [api, ptySessions]);

  // Filet anti-fuite : au démontage, arrête tous les tailers + désabonne.
  useEffect(() => {
    const started = startedRef.current;
    const unl = unlistenRef.current;
    const apiRef = api;
    return () => {
      for (const sid of started) {
        void apiRef.transcriptTailStop(sid).catch(() => {});
        unl[sid]?.();
      }
    };
  }, [api]);
}
