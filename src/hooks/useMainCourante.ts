/**
 * useMainCourante — état de la main courante 3-canaux (L4, D7).
 *
 * Un hook par préoccupation : porte `{ events, loading, error, degraded }` +
 * l'action `refresh(filter?)`. AUCUN `invoke`/`fetch` ici — tout passe par la
 * façade `backend.ts` (D2/D7). L'appel HTTP CouchDB vit côté Rust ; ce hook ne fait
 * qu'orchestrer le cycle loading → success | dégradé pour le composant.
 *
 * Mode dégradé (D5/R7) : si `fetchMainCourante` rejette (URL/identifiants absents,
 * box injoignable, réponse illisible, ou flag dev), on pose `degraded: true`, on
 * garde le message dans `error`, et on SUBSTITUE `MOCK_FEED` aux `events` — le feed
 * n'est jamais vide/cassé, jamais de crash.
 */
import { useCallback, useEffect, useState } from "react";
import {
  backend,
  type Backend,
  type FeedEvent,
  type MainCouranteFilter,
} from "../api/backend";
import { MOCK_FEED } from "../mock/feed";

export interface UseMainCourante {
  /** Événements affichés (réels, ou `MOCK_FEED` en mode dégradé). */
  events: FeedEvent[];
  loading: boolean;
  /** Message d'erreur lisible (présent en mode dégradé), `null` sinon. */
  error: string | null;
  /** Vrai quand la source réelle a échoué → `events` = mock, bandeau affiché. */
  degraded: boolean;
  /** (Re)charge la main courante. Ne rejette jamais (erreur via `error`/`degraded`). */
  refresh: (filter?: MainCouranteFilter) => Promise<void>;
}

/** Injection de la façade pour les tests (défaut = vraie façade). */
export function useMainCourante(api: Backend = backend): UseMainCourante {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState<boolean>(false);

  const refresh = useCallback(
    async (filter?: MainCouranteFilter): Promise<void> => {
      setLoading(true);
      try {
        const evs = await api.fetchMainCourante(filter);
        setEvents(evs);
        setError(null);
        setDegraded(false);
      } catch (e) {
        // Mode dégradé : fallback sur le mock, jamais de crash (D5/R7).
        setEvents(MOCK_FEED);
        setError(e instanceof Error ? e.message : String(e));
        setDegraded(true);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  // Chargement au montage (MVP : refresh sur demande/au montage, pas de temps réel).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, loading, error, degraded, refresh };
}
