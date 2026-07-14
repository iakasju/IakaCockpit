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
 * Dérive le statut vivant (`running`/`idle`/`none`) de CHAQUE agent d'un roster, keyé par
 * nom d'agent en MINUSCULES. PUR + testable :
 *   - pas de slot ouvert pour l'agent (`openProjectIds` ne contient pas son slotId) → `none`
 *     (« non lancé ») — zéro fausse donnée ;
 *   - slot ouvert → `deriveLiveStatus` sur l'horodatage du dernier event de CE slot.
 * Le coordinateur est traité comme les autres (son slot = la conversation du projet).
 */
export function deriveRosterLiveStatus(
  members: readonly { agent: string }[],
  realProjectId: string,
  coordinator: string | undefined,
  openProjectIds: ReadonlySet<string>,
  lastEventAt: Readonly<Record<string, number>>,
  now: number,
  windowMs: number = RUNNING_WINDOW_MS,
): Record<string, LiveStatus> {
  const out: Record<string, LiveStatus> = {};
  for (const m of members) {
    const slotId = slotProjectIdForAgent(realProjectId, m.agent, coordinator);
    out[m.agent.toLowerCase()] = openProjectIds.has(slotId)
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

  return { lastEventAt, mark };
}
