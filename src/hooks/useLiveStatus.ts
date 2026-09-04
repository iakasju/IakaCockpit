/**
 * useLiveStatus — statut « vivant » RÉEL par conversation-slot (L31-P2, AR-5).
 *
 * Dérive, PAR conversation-slot (`projectId` — coordinateur OU slot d'agent), un statut
 * `running`/`idle` à partir de la **récence du dernier `RunnerEvent` du tailer** de ce slot.
 * Un slot ayant émis un event il y a moins de `RUNNING_WINDOW_MS` est « en cours », sinon
 * « au repos ». Le roster ajoute un 3ᵉ état `none` (« non lancé ») quand AUCUN slot n'existe
 * pour l'agent.
 *
 * LIMITE HONNÊTE (MVP, documentée) : ce n'est PAS un vrai signal de process vivant (on
 * n'interroge pas l'état du PTY/runner). C'est la **fraîcheur du flux d'events du tailer** :
 * un runner qui tourne mais n'émet plus rien (attente d'entrée utilisateur, blocage) sera
 * vu « au repos » ; un runner mort dont le dernier event est récent restera « en cours »
 * jusqu'à expiration de la fenêtre. Suffisant pour « qui bosse maintenant » côté UI (DEP-1
 * = vrai statut vivant temps réel, différé).
 *
 * PUR + testable : `deriveLiveStatus(lastEventTs, now)` n'a aucune dépendance React. Le hook
 * `useLiveStatus` ne fait qu'accumuler l'horodatage du DERNIER event reçu par `projectId`
 * (horloge murale au moment de l'ingestion — pas le `ts` du transcript, qui peut être ancien
 * lors d'un re-read initial). Aucune I/O : les events viennent du tailer via `useRunnerViews`
 * (`onEvent`), seule frontière.
 *
 * SECONDE LIMITE, DISTINCTE de celle ci-dessus (lot « Statut vivant et session attachée »,
 * 2026-09-05, AR-5) : la limite ci-dessus répond « est-ce que ça tourne vraiment ? » ; celle-ci
 * répond « à QUI peut-on l'imputer ? ». Une conversation `attached` (L25, transcript EXTERNE
 * jamais informé par ce Cockpit) peut légitimement émettre des events frais — la première
 * limite est alors SATISFAITE (le tailer voit une activité réelle). Mais aucun persona de la
 * team liée n'a reçu la moindre identité (§ 2.2/2.3 de l'instruction) : imputer ce statut au
 * coordinateur serait une FABRICATION, pas une approximation. C'est pourquoi
 * `deriveRosterLiveStatus` ci-dessous n'admet, dans `ownedProjectIds`, QUE les conversations
 * `source === "owned"` (runner lancé ET informé par ce Cockpit) — jamais les `attached`. Le
 * signal SANS NOM (point d'onglet, chip de l'Étagère) reste, lui, dérivé de TOUTES les
 * conversations (`tabLiveStatus`/`liveProjectIds` côté `App.tsx`) : l'activité externe reste
 * visible, elle cesse seulement d'être attribuée à un nom. Condition de levée : AUCUNE — c'est
 * structurel (le process externe n'a reçu aucun `--append-system-prompt`).
 */
import { useCallback, useRef, useState } from "react";

/** Statut vivant d'un agent au roster : en cours / au repos / non lancé (aucun slot). */
export type LiveStatus = "running" | "idle" | "none";

/**
 * Fenêtre de fraîcheur (ms) : un slot ayant émis un event il y a MOINS que cette durée est
 * « en cours ». MVP ~20 s (assez large pour couvrir les silences entre deux tours d'un
 * runner actif, assez court pour retomber « au repos » quand il ne se passe plus rien).
 */
export const RUNNING_WINDOW_MS = 20_000;

/**
 * Anti-churn : on ne ré-enregistre l'horodatage d'un slot qu'au plus une fois par cette
 * durée (un runner actif émet des rafales d'events). Borne les re-renders sans fausser le
 * statut (le décalage max reste très inférieur à `RUNNING_WINDOW_MS`).
 */
export const MARK_THROTTLE_MS = 2_000;

/**
 * Statut `running`/`idle` d'un slot depuis l'horodatage de son dernier event (ms) et
 * l'horloge courante (ms). PUR. `undefined`/futur/expiré → `idle` ; dans la fenêtre →
 * `running`. Un `lastEventTs` dans le futur (horloges désalignées) est traité `idle`
 * (défensif : jamais « en cours » sur un timestamp incohérent).
 */
export function deriveLiveStatus(
  lastEventTs: number | undefined,
  now: number,
  windowMs: number = RUNNING_WINDOW_MS,
): "running" | "idle" {
  if (lastEventTs === undefined) return "idle";
  const dt = now - lastEventTs;
  return dt >= 0 && dt <= windowMs ? "running" : "idle";
}

/**
 * Résout le `projectId` du SLOT qui exécute `agent` dans le projet `realProjectId` :
 *   - `agent` = coordinateur → son slot est la conversation DU PROJET (`realProjectId`) ;
 *   - autre agent → slot d'agent synthétique (`slotIdFor`).
 * PUR. Insensible à la casse pour la comparaison au coordinateur.
 */
export function slotProjectIdForAgent(
  realProjectId: string,
  agent: string,
  coordinator: string | undefined,
): string {
  if (coordinator && agent.toLowerCase() === coordinator.toLowerCase()) {
    return realProjectId;
  }
  return `${realProjectId}::agent::${agent.toLowerCase()}`;
}

/**
 * F1 (lot « Statut vivant et session attachée ») — le prédicat « slot RÉELLEMENT possédé ».
 * Ne retient que les conversations `source === "owned"` (runner lancé ET informé par ce
 * Cockpit) — jamais `attached`. PUR, sans I/O.
 *
 * DISTINCT de `liveProjectIds` (`App.tsx`), qui reste l'ensemble de TOUTES les conversations
 * (owned + attached) : ce dernier alimente la chip « ● en cours » de l'Étagère et surtout la
 * réconciliation d'ouverture eager L24-F1 — le restreindre y rouvrirait en boucle les
 * conversations attachées (CA-7). Les deux ensembles servent des points de décision distincts,
 * volontairement.
 */
export function ownedConversationIds(
  conversations: readonly { projectId: string; source: string }[],
): Set<string> {
  const out = new Set<string>();
  for (const c of conversations) {
    if (c.source === "owned") out.add(c.projectId);
  }
  return out;
}

/**
 * Dérive le statut vivant (`running`/`idle`/`none`) de CHAQUE agent d'un roster, keyé par
 * nom d'agent en MINUSCULES. PUR + testable :
 *   - pas de slot POSSÉDÉ pour l'agent (`ownedProjectIds` ne contient pas son slotId) → `none`
 *     (« non lancé ») — zéro fausse donnée ;
 *   - slot possédé → `deriveLiveStatus` sur l'horodatage du dernier event de CE slot.
 * Le coordinateur est traité comme les autres (son slot = la conversation du projet).
 *
 * `ownedProjectIds` (renommé depuis `openProjectIds`, lot « Statut vivant et session
 * attachée ») DOIT être construit par `ownedConversationIds` (F1) — jamais l'ensemble brut de
 * TOUTES les conversations ouvertes. Sinon, une conversation `attached` (session externe
 * jamais informée par ce Cockpit) ferait passer le coordinateur de la team liée à « travaille »
 * sur un geste qui n'est pas le sien : c'est exactement le défaut S-1 de ce lot.
 */
export function deriveRosterLiveStatus(
  members: readonly { agent: string }[],
  realProjectId: string,
  coordinator: string | undefined,
  ownedProjectIds: ReadonlySet<string>,
  lastEventAt: Readonly<Record<string, number>>,
  now: number,
  windowMs: number = RUNNING_WINDOW_MS,
): Record<string, LiveStatus> {
  const out: Record<string, LiveStatus> = {};
  for (const m of members) {
    const slotId = slotProjectIdForAgent(realProjectId, m.agent, coordinator);
    out[m.agent.toLowerCase()] = ownedProjectIds.has(slotId)
      ? deriveLiveStatus(lastEventAt[slotId], now, windowMs)
      : "none";
  }
  return out;
}

export interface UseLiveStatus {
  /** Horodatage (ms, horloge murale) du DERNIER event reçu par `projectId`. */
  lastEventAt: Record<string, number>;
  /**
   * Marque un slot « vivant » : enregistre l'instant courant comme dernier event de
   * `projectId` (throttlé, cf. `MARK_THROTTLE_MS`). Appelé depuis l'observateur d'events
   * du tailer (`useRunnerViews.onEvent`), une seule frontière.
   */
  mark: (projectId: string) => void;
  /**
   * F4 (lot « Statut vivant et session attachée », AR-4) — purge la fraîcheur enregistrée
   * pour `projectId`. Appelé à la bascule `attached` → `owned` (`App.tsx`,
   * `startRunnerForActive`) : sans cette purge, l'horodatage déposé par les events de la
   * session EXTERNE (avant bascule) survivrait `RUNNING_WINDOW_MS` de plus, faisant
   * apparaître le coordinateur « travaille » sur la foi d'events qui ne sont pas ceux du
   * runner neuf (§ 2.7 de l'instruction). No-op si `projectId` n'a aucune entrée.
   */
  forget: (projectId: string) => void;
}

export function useLiveStatus(): UseLiveStatus {
  const [lastEventAt, setLastEventAt] = useState<Record<string, number>>({});
  // Réf miroir : lire l'horodatage courant sans mettre l'état en dépendance (callback
  // stable, throttle sans re-render inutile).
  const lastRef = useRef<Record<string, number>>(lastEventAt);
  lastRef.current = lastEventAt;

  const mark = useCallback((projectId: string): void => {
    const now = Date.now();
    const prev = lastRef.current[projectId];
    // Anti-churn : ignorer une rafale rapprochée (le statut reste juste à la fenêtre près).
    if (prev !== undefined && now - prev < MARK_THROTTLE_MS) return;
    setLastEventAt((s) => ({ ...s, [projectId]: now }));
  }, []);

  // F4 (AR-4) : purge la fraîcheur d'un slot (bascule attached → owned).
  const forget = useCallback((projectId: string): void => {
    if (lastRef.current[projectId] === undefined) return;
    setLastEventAt((s) => {
      if (!(projectId in s)) return s;
      const next = { ...s };
      delete next[projectId];
      return next;
    });
  }, []);

  return { lastEventAt, mark, forget };
}
