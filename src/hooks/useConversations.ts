/**
 * useConversations — modèle « 1 conversation par projet » (L8, D1).
 *
 * Remplace l'abstraction « N onglets PTY » (useGridState) par UNE conversation par
 * projet, avec un mode (`chat` | `shell`), un agent courant (persona), un id de
 * session PTY stable (survit au toggle, D4) et un historique chat en mémoire (D3).
 *
 * État pur, séparé (D8) : aucun rendu, aucun xterm ici. Le SEUL I/O est l'appel
 * `backend.chat(...)` (façade unique) lors de l'envoi d'un message — calque exact de
 * `useNextStep`. Le cycle de vie PTY réel reste dans `usePty`/`PtyTerminal`.
 *
 * Bornes L8 (R-L8-3) : `@agent` = changement de PERSONA (un seul appel `chat`),
 * AUCUNE orchestration. Historique mémoire (fermer/rouvrir = vide, D3).
 */
import { useCallback, useRef, useState } from "react";
import {
  backend,
  type Backend,
  type ChatMessage,
  type ChatReply,
} from "../api/backend";

export type ConvMode = "chat" | "shell";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  /** Un projet = une conversation (clé d'unicité). */
  projectId: string;
  /** Libellé (nom de projet). */
  title: string;
  /** Chemin projet (cwd PTY + path contexte IA). */
  cwd: string;
  /** Mode affiché (toggle D4) — défaut "chat" (AR-2). */
  mode: ConvMode;
  /** Interlocuteur courant (persona) — défaut = responsable (D3). */
  agent: string;
  /** Id de session PTY stable (survit au toggle, D4). */
  ptySessionId: string;
  /** Historique chat multi-tours (mémoire MVP, D3). */
  history: ChatTurn[];
  /** Un tour de chat est en vol (UI : saisie désactivée + statut roster). */
  pending: boolean;
  /** Dernière erreur chat lisible (dégradation D3). */
  error: string | null;
}

/**
 * Interlocuteur RESPONSABLE par défaut (AR-1 / D3). En L8 la conversation vit dans
 * Working (contexte projet) → responsable concret = **Aragorn**. Le cas Odin
 * (portefeuille) est tracé : il s'activera quand une conversation portefeuille
 * existera (paramétrable via `openConversation`).
 */
export const DEFAULT_RESPONSIBLE = "Aragorn";

/**
 * Préfixe `@<Agent> : ` inséré au clic roster (D6). Format stable (réutilisé par la
 * saisie + le parsing). Espace avant et après les deux-points pour la lisibilité.
 */
export function mentionPrefix(agent: string): string {
  return `@${agent} : `;
}

/**
 * Extrait la persona d'un message commençant par `@Agent` (D3/D6). Renvoie l'agent
 * mentionné (sans le préfixe) ou `null` si aucune mention. Borné : on lit UN seul
 * `@agent` en tête — PAS d'orchestration (R-L8-3). Insensible aux espaces/`:`.
 */
export function parseMention(content: string): string | null {
  const m = content.trimStart().match(/^@([A-Za-zÀ-ÿ][\w-]*)\s*:?/);
  return m ? m[1] : null;
}

export interface UseConversations {
  conversations: Conversation[];
  /** Projet de la conversation active (clé), ou `null`. */
  activeProjectId: string | null;
  /** Conversation active (dérivée), ou `null`. */
  active: Conversation | null;
  /**
   * Ouvre (ou ré-active) la conversation d'un projet et la rend active.
   * Dédoublonne par `projectId` (calque `useGridState.openTab`). `agent` optionnel
   * = responsable par défaut. `initialHistory` optionnel (L9) précharge l'historique
   * à la création SEULEMENT (rétro-compat : défaut `[]` ; ignoré si la conv existe).
   * Renvoie le `ptySessionId` (stable).
   */
  openConversation: (
    projectId: string,
    title: string,
    cwd: string,
    agent?: string,
    initialHistory?: ChatTurn[],
  ) => string;
  /** Sélectionne une conversation existante comme active. */
  setActive: (projectId: string) => void;
  /** Bascule le mode (chat|shell) d'une conversation SANS toucher au `ptySessionId` (D4). */
  setMode: (projectId: string, mode: ConvMode) => void;
  /** Fixe l'agent courant (persona) d'une conversation (clic roster / @agent, D3/D6). */
  setAgent: (projectId: string, agent: string) => void;
  /**
   * Envoie un message dans la conversation `projectId` EN TANT QUE `agent`. Ajoute
   * le tour user, appelle `backend.chat`, ajoute le tour assistant. Ne rejette
   * jamais : erreur → champ `error` peuplé (D3). Borné à UN appel (R-L8-3).
   */
  send: (projectId: string, agent: string, content: string) => Promise<void>;
}

let seq = 0;
/** Id de session PTY déterministe-croissant (unicité garantie, calque useGridState). */
function nextSessionId(projectId: string): string {
  seq += 1;
  return `conv-${projectId}-${seq}`;
}

export function useConversations(api: Backend = backend): UseConversations {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Réf miroir : lire la liste courante sans la mettre en dépendance (callbacks
  // stables, pas de re-render en cascade).
  const convRef = useRef<Conversation[]>(conversations);
  convRef.current = conversations;

  const patch = useCallback(
    (projectId: string, fn: (c: Conversation) => Conversation): void => {
      setConversations((prev) =>
        prev.map((c) => (c.projectId === projectId ? fn(c) : c)),
      );
    },
    [],
  );

  const openConversation = useCallback(
    (
      projectId: string,
      title: string,
      cwd: string,
      agent: string = DEFAULT_RESPONSIBLE,
      initialHistory: ChatTurn[] = [],
    ): string => {
      const existing = convRef.current.find((c) => c.projectId === projectId);
      if (existing) {
        setActiveProjectId(existing.projectId);
        return existing.ptySessionId;
      }
      const ptySessionId = nextSessionId(projectId);
      const conv: Conversation = {
        projectId,
        title,
        cwd,
        mode: "chat", // défaut = chat (AR-2)
        agent,
        ptySessionId,
        // L9 : copie défensive (rétro-compat : défaut `[]` → comportement L8 inchangé).
        history: [...initialHistory],
        pending: false,
        error: null,
      };
      setConversations((prev) => [...prev, conv]);
      setActiveProjectId(projectId);
      return ptySessionId;
    },
    [],
  );

  const setActive = useCallback((projectId: string): void => {
    setActiveProjectId(projectId);
  }, []);

  const setMode = useCallback(
    (projectId: string, mode: ConvMode): void => {
      // NE TOUCHE PAS au ptySessionId : le shell survit au toggle (D4).
      patch(projectId, (c) => ({ ...c, mode }));
    },
    [patch],
  );

  const setAgent = useCallback(
    (projectId: string, agent: string): void => {
      patch(projectId, (c) => ({ ...c, agent }));
    },
    [patch],
  );

  const send = useCallback(
    async (projectId: string, agent: string, content: string): Promise<void> => {
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      const conv = convRef.current.find((c) => c.projectId === projectId);
      if (!conv) return;

      // Tour user ajouté + persona courante fixée + pending (statut roster).
      const userTurn: ChatTurn = { role: "user", content: trimmed };
      const history: ChatTurn[] = [...conv.history, userTurn];
      patch(projectId, (c) => ({
        ...c,
        agent,
        history,
        pending: true,
        error: null,
      }));

      // Multi-tours : on envoie tout l'historique (le system est ajouté côté Rust).
      const messages: ChatMessage[] = history.map((t) => ({
        role: t.role,
        content: t.content,
      }));

      try {
        const reply: ChatReply = await api.chat(conv.cwd, agent, messages);
        patch(projectId, (c) => ({
          ...c,
          history: [...c.history, { role: "assistant", content: reply.content }],
          pending: false,
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        patch(projectId, (c) => ({ ...c, pending: false, error: msg }));
      }
    },
    [api, patch],
  );

  const active =
    conversations.find((c) => c.projectId === activeProjectId) ?? null;

  return {
    conversations,
    activeProjectId,
    active,
    openConversation,
    setActive,
    setMode,
    setAgent,
    send,
  };
}
