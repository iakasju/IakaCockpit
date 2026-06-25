/**
 * useNextStep — état du moteur « prochaine étape » IA (L3, D7).
 *
 * Un hook par préoccupation : porte `{ result, loading, error }` + l'action
 * `request(path)`. AUCUN `invoke`/`fetch` ici — tout passe par la façade
 * `backend.ts` (D2/D7). L'appel réseau IA vit côté Rust ; ce hook ne fait
 * qu'orchestrer le cycle loading → success | error pour la vue (présentationnelle).
 *
 * Une suggestion par demande (L3) : pas de fil conversationnel persistant — c'est
 * L4 (mains courantes 3-canaux, DEP-1). `request` remplace simplement le résultat
 * courant.
 */
import { useCallback, useState } from "react";
import { backend, type Backend, type NextStep } from "../api/backend";

export interface UseNextStep {
  /** Dernière suggestion obtenue (`null` tant qu'aucune demande aboutie). */
  result: NextStep | null;
  loading: boolean;
  error: string | null;
  /** Demande une suggestion pour le projet `path`. Ne rejette jamais (erreur via `error`). */
  request: (path: string) => Promise<void>;
  /** Réinitialise l'état (ex. au changement d'onglet projet). */
  reset: () => void;
}

/** Injection de la façade pour les tests (défaut = vraie façade). */
export function useNextStep(api: Backend = backend): UseNextStep {
  const [result, setResult] = useState<NextStep | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (path: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const ns = await api.nextStep(path);
        setResult(ns);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  const reset = useCallback((): void => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { result, loading, error, request, reset };
}
