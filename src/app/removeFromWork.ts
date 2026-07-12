/**
 * removeFromWork — orchestration PURE du geste « retirer de la Table » (L23).
 *
 * Extrait de `App.removeFromWorkAndPrepare` pour être testable au niveau atteignable
 * (App entier n'est pas montable en test : portfolio/workset dépendent d'`invoke` qui
 * reste en attente). Aucune I/O propre : reçoit les effets en dépendances.
 *
 * Ordre VERROUILLÉ (incrément 2026-07-12) :
 *   1. retrait immédiat du set de Work (l'item quitte la liste tout de suite) ;
 *   2. job de préparation de reprise, fire-and-forget (le hook tient le statut) ;
 *   3. fermeture des fenêtres de travail :
 *      - `owned` : fermer le PTY (shell/runner) EXPLICITEMENT puis retirer la conversation
 *        — le `PtyTerminal` se démonte APRÈS la fermeture, plus de PTY orphelin (garde L10
 *        non violée : ce chemin explicite libère la garde de spawn R-L10b-1 ; le toggle/nav,
 *        lui, ne ferme jamais) ;
 *      - `attached` (L25) : PAS de PTY → on ARRÊTE le tailer externe (`transcript_tail_stop`)
 *        au lieu de `pty.close` (aucun process externe affecté), puis on retire la conversation.
 *
 * La conversation est capturée par l'appelant AVANT `toggleWork` (pour lire sa source et
 * son `ptySessionId`/`attachedSessionId`) et passée telle quelle ici.
 */
import type { Project } from "../api/backend";
import type { ConvSource } from "../hooks/useConversations";

export interface RemoveFromWorkParams {
  projectId: string;
  /** Projet correspondant (peut être absent : le retrait reste valide). */
  project: Project | undefined;
  /**
   * Conversation du projet capturée AVANT retrait. `source` décide de la fermeture :
   * `owned` → `closePty(ptySessionId)` ; `attached` → `stopTailer(attachedSessionId)`.
   */
  conversation:
    | {
        source: ConvSource;
        ptySessionId: string;
        attachedSessionId: string | null;
      }
    | undefined;
  /** Retrait immédiat du set de Work (front pur). */
  toggleWork: (projectId: string) => void;
  /** Lance le job de préparation de reprise (fire-and-forget). */
  prepareResume: (id: string, projectKey: string, path: string) => void;
  /** Ferme le PTY (shell/runner `owned`) — chemin explicite qui libère la garde de spawn. */
  closePty: (sessionId: string) => void | Promise<void>;
  /** Arrête le tailer d'une session `attached` externe (L25) — jamais de `pty.close`. */
  stopTailer: (sessionId: string) => void | Promise<void>;
  /** Retire la conversation du modèle (état pur). */
  closeConversation: (projectId: string) => void;
}

export function removeFromWork(p: RemoveFromWorkParams): void {
  // 1) Retrait immédiat.
  p.toggleWork(p.projectId);
  // 2) Préparation de reprise (systématique si le projet est connu).
  if (p.project) {
    p.prepareResume(p.project.id, p.project.id, p.project.path);
  }
  // 3) Fermer la fenêtre selon la source, PUIS retirer la conversation (ordre important).
  if (p.conversation) {
    if (p.conversation.source === "attached") {
      // Session externe : on n'arrête QUE le tailer (le process externe vit sa vie).
      if (p.conversation.attachedSessionId) {
        void p.stopTailer(p.conversation.attachedSessionId);
      }
    } else {
      void p.closePty(p.conversation.ptySessionId);
    }
    p.closeConversation(p.projectId);
  }
}
