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
  /**
   * Ouvre le sélecteur de dossier natif, importe le dossier choisi comme projet
   * et rafraîchit la liste. Renvoie le projet importé, ou `null` si l'utilisateur
   * a annulé (ou en cas d'erreur, remontée via `error`).
   */
  importProject: () => Promise<Project | null>;
  /**
   * Le PREMIER scan a-t-il abouti (succès OU erreur) ? — L37-CA6 : le boot n'est
   * réellement terminé que lorsque CE signal ET `useWorkset().loaded` sont vrais
   * tous les deux ; un scan qui échoue (`error` posé, `projects` remis à `[]`)
   * termine le boot comme un scan réussi (calque `useWorkset.loaded`, jamais
   * réinitialisé — les rafraîchissements manuels ultérieurs le laissent `true`).
   */
  loaded: boolean;
}

/** Injection de la façade pour les tests (défaut = vraie façade). */
export function usePortfolio(api: Backend = backend): UsePortfolio {
  const [projects, setProjects] = useState<Project[]>([]);
  const [root, setRoot] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // L37-CA6 : distinct de `loading` (qui vaut `false` aussi AVANT le tout premier
  // scan, le temps que l'effet de montage démarre — `!loading` ne peut donc pas
  // servir de signal « premier scan terminé »). Posé dans `finally`, succès ET
  // erreur confondus (cf. JSDoc `UsePortfolio.loaded`).
  const [loaded, setLoaded] = useState<boolean>(false);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getRoot();
      setRoot(r);
      const base = await api.scanPortfolio(r);
      // Projets importés hors racine : best-effort (ne doit jamais casser le
      // listing principal si la commande échoue / est absente).
      let extra: Project[] = [];
      try {
        extra = (await api.listExtraProjects?.()) ?? [];
      } catch {
        extra = [];
      }
      const seen = new Set(base.map((p) => p.path));
      setProjects([...base, ...extra.filter((p) => !seen.has(p.path))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProjects([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [api]);

  const importProject = useCallback(async (): Promise<Project | null> => {
    try {
      const path = await api.pickDirectory();
      if (!path) return null; // annulation utilisateur
      const project = await api.addProject(path);
      await refresh();
      return project;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [api, refresh]);

  useEffect(() => {
    // Premier chargement : ne crashe pas hors Tauri (façade peut rejeter).
    void refresh();
  }, [refresh]);

  return { projects, loading, error, root, refresh, importProject, loaded };
}
