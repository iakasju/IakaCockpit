/**
 * usePortfolio — hook d'état du portefeuille de projets (L2).
 *
 * Branché sur `backend.scanPortfolio` (donnée RÉELLE git/version/work_status) +
 * `backend.getRoot` (racine du chapeau). Un hook par préoccupation (D6/D7) :
 * AUCUN `invoke` direct ici — tout passe par la façade `backend.ts`. Le hook ne
 * fait pas de rendu ; les composants reçoivent l'état en props.
 *
 * Cycle : loading → success (projects) | error. `refresh()` re-scanne la racine
 * courante. `getRoot` n'est appelé qu'hors contexte Tauri ? non : il est appelé
 * dans tous les cas (le défaut racine est calculé par OS côté Rust), mais on
 * dégrade proprement si le backend est indisponible (tests / dev front pur).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend, type Project } from "../api/backend";

export interface UsePortfolio {
  projects: Project[];
  loading: boolean;
  error: string | null;
  root: string | null;
  refresh: () => Promise<void>;
}

/** Injection de la façade pour les tests (défaut = vraie façade). */
export function usePortfolio(api: Backend = backend): UsePortfolio {
  const [projects, setProjects] = useState<Project[]>([]);
  const [root, setRoot] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(
    async (target: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.scanPortfolio(target);
        setProjects(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setProjects([]);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getRoot();
      setRoot(r);
      await scan(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }, [api, scan]);

  useEffect(() => {
    // Premier chargement : ne crashe pas hors Tauri (façade peut rejeter).
    void refresh();
  }, [refresh]);

  return { projects, loading, error, root, refresh };
}
