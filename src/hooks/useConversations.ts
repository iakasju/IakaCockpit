/**
 * useConversations — modèle « 1 conversation par projet » (L8, migré L10b).
 *
 * Remplace l'abstraction « N onglets PTY » (useGridState) par UNE conversation par
 * projet, avec un mode (`chat` | `shell` = chat-vue ⇄ terminal-source), un agent
 * courant (persona), un id de session PTY stable (survit au toggle, D4) et un
 * historique chat en mémoire (D3).
 *
 * **Migration L10b (§ 5.1).** Le chat n'est plus piloté par un appel `backend.chat`
 * one-shot : il est la **vue filtrée du transcript** du chef-runner.
 *   - `echoUser` ajoute le tour utilisateur (entrée partagée : l'écriture stdin du PTY
 *     est faite par l'appelant, `usePty.write`) ;
 *   - `appendTurn` ajoute un tour produit par le **tailer** (`runner://event` →
 *     `runnerEventToTurn`), agent par-tour préservé (L9), VERBATIM (jamais reformulé).
 * État pur, séparé (D8) : aucun rendu, aucun xterm, **aucun I/O** ici.
 *
 * Bornes : `@agent` = changement de PERSONA + préfixe verbatim injecté au PTY
 * (arbitrage #5), AUCUNE orchestration côté cockpit. Historique mémoire (D3).
 */
import { useCallback, useRef, useState } from "react";
import type { AgentRunnerKind } from "./useTeams";

export type ConvMode = "chat" | "shell";

/**
 * Métadonnées d'un SLOT d'agent (L31-P1). Un slot d'agent = un agent de la team lancé
 * comme SON PROPRE runner réel (codex/claude-code), en plus du coordinateur. Le slot
 * vit dans `useConversations` comme une conversation à part entière, avec un `projectId`
 * **synthétique** (`slotIdFor`) distinct du vrai projet ; `realProjectId` conserve le
 * lien vers le projet réel (team, avatars, plan). Absent d'une conversation = slot
 * COORDINATEUR (comportement historique : `projectId` = vrai id projet).
 */
export interface SlotInfo {
  /** Vrai id de projet (pour résoudre team/avatars/plan). */
  realProjectId: string;
  /** Nom de l'agent qui possède ce slot (ex. "Gimli"). */
  agent: string;
  /** Runner conceptuel de l'agent (exécutable : codex/claude-code). */
  runner: AgentRunnerKind;
  /** Modèle de l'agent (vide = défaut du runner). */
  model: string;
}

/**
 * Id de slot d'agent DÉTERMINISTE (clé d'unicité + dédoublonnage idempotent). Distinct
 * de tout vrai id projet grâce au séparateur `::agent::`. Insensible à la casse du nom.
 */
export function slotIdFor(realProjectId: string, agent: string): string {
  return `${realProjectId}::agent::${agent.toLowerCase()}`;
}

/**
 * Source d'une conversation (L25), DISTINCTE du toggle d'affichage `mode` (chat|shell) :
 *   - `owned` : le cockpit possède le runner (PTY `claude`/`codex` lancé par lui) — Shell
 *     typable, Chat = vue du transcript de SON runner (comportement historique) ;
 *   - `attached` : le cockpit **tail** un transcript EXISTANT (session externe vivante),
 *     **sans PTY propre** → vue **LECTURE SEULE** (on ne tape jamais dans un process qui
 *     tourne déjà ailleurs). Pour interagir, l'utilisateur « démarre un runner du cockpit »
 *     (bascule en `owned`, cf. `convertToOwned`).
 */
export type ConvSource = "owned" | "attached";

/** Coordonnées d'attache d'une conversation `attached` (session externe vivante, L25). */
export interface AttachInfo {
  /** `session_id` externe = nom du transcript sans extension (clef du tailer). */
  sessionId: string;
  /** Chemin absolu du transcript `.jsonl` externe à tailer (lecture seule). */
  transcriptPath: string;
}

/** Canal d'un tour de chat (vue filtrée L10b). Défaut/absent = `parole` (rétro-compat). */
export type ChatTurnKind =
  | "parole"
  | "geste"
  | "delegation"
  | "activite"
  | "pensee";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  /**
   * Émetteur du tour, FIGÉ au moment où il est produit (L9 fix avatar par-tour).
   * Pour un tour `assistant` = l'agent qui l'a produit (persona courante / `@agent`
   * de CE tour). Pour un tour `user` = absent (pas d'avatar agent). Optionnel et
   * rétro-compatible : si absent, le rendu retombe sur la persona de la conversation
   * (comportement L8). NE DOIT JAMAIS être une référence vivante à `Conversation.agent` :
   * changer l'interlocuteur ensuite ne change pas les tours déjà présents.
   */
  agent?: string;
  /**
   * Canal du tour (L10b). `parole` (ou absent) = bulle de conversation classique ;
   * `geste`/`delegation`/`activite`/`pensee` = vues dérivées du transcript, rendues
   * en lignes d'événement (la `pensee` est masquable). Rétro-compat : un tour sans
   * `kind` se rend comme une parole (L8/L9 inchangés).
   */
  kind?: ChatTurnKind;
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
  /** Id de session PTY stable (survit au toggle, D4). Non spawné si `source:"attached"`. */
  ptySessionId: string;
  /**
   * Source de la conversation (L25) — `owned` (runner du cockpit) ou `attached` (tail
   * d'une session externe, lecture seule). Défaut `owned` (rétro-compat L8/L24).
   */
  source: ConvSource;
  /**
   * `session_id` externe de la session attachée (clef du tailer `runner://event`) —
   * présent UNIQUEMENT si `source:"attached"`. `null` sinon (owned : le tailer dérive
   * du PTY via `usePty.sessions`).
   */
  attachedSessionId: string | null;
  /** Chemin du transcript externe tailé en lecture seule — présent si `attached`, `null` sinon. */
  attachedTranscriptPath: string | null;
  /**
   * L31-P1 — métadonnées de SLOT d'agent. Absent (défaut) = slot COORDINATEUR
   * (comportement historique : `projectId` = vrai id projet). Présent = slot d'un
   * agent lancé comme SON runner réel : `projectId` est alors un id de slot synthétique
   * (`slotIdFor`) et `slot.realProjectId` porte le vrai projet (team/avatars/plan).
   */
  slot?: SlotInfo;
  /** Historique chat multi-tours (mémoire MVP, D3). */
  history: ChatTurn[];
  /** Un tour de chat est en vol (UI : saisie désactivée + statut roster). */
  pending: boolean;
  /** Dernière erreur chat lisible (dégradation D3). */
  error: string | null;
}

/**
 * Interlocuteur RESPONSABLE de **dernier recours** (repli). **L11** : l'autorité de
 * l'interlocuteur par défaut est désormais le **coordinateur de la team du projet**,
 * résolu par `App` (`useTeams.coordinatorOf`) et passé à `openConversation(agent)`.
 * Cette constante ne subsiste que comme **repli** quand aucun coordinateur n'est fourni
 * (ex. tests, conversation hors team). Le coordinateur de la team par défaut iakaframe
 * est précisément `aragorn` → continuité avec L8/L10.
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
   * `attach` optionnel (L25) : si fourni → conversation `attached` (tail d'une session
   * externe, LECTURE SEULE, sans PTY propre) ; absent → `owned` (runner du cockpit).
   * Renvoie le `ptySessionId` (stable).
   */
  openConversation: (
    projectId: string,
    title: string,
    cwd: string,
    agent?: string,
    initialHistory?: ChatTurn[],
    attach?: AttachInfo,
  ) => string;
  /**
   * Ouvre (ou ré-active) un SLOT D'AGENT (L31-P1) : une conversation `owned` propre à un
   * agent lancé comme SON runner réel, EN PLUS du coordinateur. Clé synthétique
   * (`slotIdFor(realProjectId, agent)`) → **idempotent** (ré-active sans double spawn si
   * le slot existe déjà). `runner`/`model` = ceux de l'agent (déjà résolus par l'appelant
   * depuis la team). Le PTY est spawné par `WorkingView` (garde L10 : monté une fois).
   * Renvoie le `ptySessionId` du slot.
   */
  openAgentSlot: (
    realProjectId: string,
    cwd: string,
    agent: string,
    runner: AgentRunnerKind,
    model: string,
  ) => string;
  /** Sélectionne une conversation existante comme active. */
  setActive: (projectId: string) => void;
  /** Bascule le mode (chat|shell) d'une conversation SANS toucher au `ptySessionId` (D4). */
  setMode: (projectId: string, mode: ConvMode) => void;
  /** Fixe l'agent courant (persona) d'une conversation (clic roster / @agent, D3/D6). */
  setAgent: (projectId: string, agent: string) => void;
  /**
   * Échote le tour UTILISATEUR (entrée partagée L10b) EN TANT QUE `agent`. Ajoute le
   * tour `user`, fixe la persona courante, lève `pending` (statut roster). L'écriture
   * stdin du PTY (`usePty.write`, frappe + `\r`) est faite par l'appelant — ici on ne
   * fait QU'échoer (aucun I/O). Ignore un contenu vide.
   */
  echoUser: (projectId: string, agent: string, content: string) => void;
  /**
   * Ajoute un tour produit par le **tailer** (`runner://event` → `runnerEventToTurn`).
   * L'émetteur (`turn.agent`) est FIGÉ (L9). Une **parole assistant** (kind `parole`/
   * absent) retombe le `pending` (le chef a répondu). Borné à l'ajout (pas d'I/O).
   */
  appendTurn: (projectId: string, turn: ChatTurn) => void;
  /**
   * Bascule une conversation `attached` en `owned` (L25) — geste « démarrer un runner du
   * cockpit ». Vide les coordonnées d'attache (`attachedSessionId`/`attachedTranscriptPath`)
   * et passe `source:"owned"` → au prochain rendu, `WorkingView` monte le `PtyTerminal`
   * (spawn du runner), le tailer démarre sur la NOUVELLE session. L'arrêt du tailer externe
   * (`transcriptTailStop`) est fait par l'appelant AVANT ce basculement (aucun I/O ici).
   * No-op si la conversation est déjà `owned` (idempotent).
   */
  convertToOwned: (projectId: string) => void;
  /**
   * Ferme (retire) la conversation d'un projet — geste EXPLICITE de retrait de la Table
   * (L23, incrément 2026-07-12). Retire la conversation du tableau ; si c'était l'active,
   * remet `activeProjectId → null`. **Aucun I/O** ici : la fermeture du PTY (`usePty.close`)
   * est faite par l'appelant AVANT ce retrait (l'ordre importe : lire `ptySessionId` puis
   * fermer le runner, PUIS démonter la vue). Ne concerne PAS le toggle/navigation (garde
   * L10 : le `PtyTerminal` survit — la fermeture n'a lieu qu'au retrait explicite).
   */
  closeConversation: (projectId: string) => void;
}

let seq = 0;
/** Id de session PTY déterministe-croissant (unicité garantie, calque useGridState). */
function nextSessionId(projectId: string): string {
  seq += 1;
  return `conv-${projectId}-${seq}`;
}

export function useConversations(): UseConversations {
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
      attach?: AttachInfo,
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
        // L25 : `attached` si des coordonnées d'attache sont fournies (session externe
        // vivante), sinon `owned` (runner du cockpit — comportement historique).
        source: attach ? "attached" : "owned",
        attachedSessionId: attach?.sessionId ?? null,
        attachedTranscriptPath: attach?.transcriptPath ?? null,
        // L9 : copie défensive (rétro-compat : défaut `[]` → comportement L8 inchangé).
        history: [...initialHistory],
        pending: false,
        error: null,
      };
      // Ajout IDEMPOTENT par projectId (garde StrictMode / ouverture eager async L24/L25 :
      // deux appels quasi-synchrones avant commit ne créent qu'UNE conversation).
      setConversations((prev) =>
        prev.some((c) => c.projectId === projectId) ? prev : [...prev, conv],
      );
      setActiveProjectId(projectId);
      return ptySessionId;
    },
    [],
  );

  const openAgentSlot = useCallback(
    (
      realProjectId: string,
      cwd: string,
      agent: string,
      runner: AgentRunnerKind,
      model: string,
    ): string => {
      const slotId = slotIdFor(realProjectId, agent);
      // Idempotent : un slot (realProjectId, agent) déjà ouvert est ré-activé, JAMAIS
      // recréé → pas de double spawn (garde L10 côté rendu + garde de spawn usePty).
      const existing = convRef.current.find((c) => c.projectId === slotId);
      if (existing) {
        setActiveProjectId(existing.projectId);
        return existing.ptySessionId;
      }
      const ptySessionId = nextSessionId(slotId);
      const conv: Conversation = {
        projectId: slotId,
        title: agent, // libellé d'onglet = nom de l'agent (slot)
        cwd,
        mode: "chat", // défaut = chat (calque coordinateur)
        agent,
        ptySessionId,
        // Un slot d'agent est TOUJOURS `owned` (le cockpit lance son runner).
        source: "owned",
        attachedSessionId: null,
        attachedTranscriptPath: null,
        slot: { realProjectId, agent, runner, model },
        history: [],
        pending: false,
        error: null,
      };
      setConversations((prev) =>
        prev.some((c) => c.projectId === slotId) ? prev : [...prev, conv],
      );
      setActiveProjectId(slotId);
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

  const echoUser = useCallback(
    (projectId: string, agent: string, content: string): void => {
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      // Tour user ajouté + persona courante fixée + pending (statut roster). Le tour
      // user reste SANS `agent` (L9 : pas d'avatar agent côté utilisateur).
      patch(projectId, (c) => ({
        ...c,
        agent,
        history: [...c.history, { role: "user", content: trimmed }],
        pending: true,
        error: null,
      }));
    },
    [patch],
  );

  const appendTurn = useCallback(
    (projectId: string, turn: ChatTurn): void => {
      // Une parole assistant (kind parole/absent) signifie que le chef a répondu →
      // on retombe le `pending`. Les gestes/délégations/pensées le laissent levé
      // (le chef travaille encore).
      const isAssistantParole =
        turn.role === "assistant" &&
        (turn.kind === undefined || turn.kind === "parole");
      patch(projectId, (c) => ({
        ...c,
        history: [...c.history, turn],
        pending: isAssistantParole ? false : c.pending,
      }));
    },
    [patch],
  );

  const convertToOwned = useCallback(
    (projectId: string): void => {
      patch(projectId, (c) =>
        c.source === "owned"
          ? c
          : {
              ...c,
              source: "owned",
              attachedSessionId: null,
              attachedTranscriptPath: null,
            },
      );
    },
    [patch],
  );

  const closeConversation = useCallback((projectId: string): void => {
    // Retire la conversation du tableau (miroir convRef mis à jour au prochain render
    // par l'affectation `convRef.current = conversations`). État pur, aucun I/O.
    setConversations((prev) => prev.filter((c) => c.projectId !== projectId));
    // Si on fermait l'active, plus d'active (l'utilisateur rouvre depuis la worklist).
    setActiveProjectId((cur) => (cur === projectId ? null : cur));
  }, []);

  const active =
    conversations.find((c) => c.projectId === activeProjectId) ?? null;

  return {
    conversations,
    activeProjectId,
    active,
    openConversation,
    openAgentSlot,
    setActive,
    setMode,
    setAgent,
    echoUser,
    appendTurn,
    convertToOwned,
    closeConversation,
  };
}
