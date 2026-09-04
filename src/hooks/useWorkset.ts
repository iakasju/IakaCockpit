/**
 * useWorkset — « set de Work » : projets sélectionnés pour ouverture dans Working.
 *
 * L37 — le set est désormais PERSISTANT (config non sensible, clé unique `WORKSET_KEY`,
 * valeur = tableau JSON d'ids, AR-6). Calque `useSettings`/`usePortfolio` :
 *   - lecture au montage, TOLÉRANTE (absent / illisible / hors Tauri → set vide,
 *     jamais un échec, CA-8/CA-9) ;
 *   - la restauration FUSIONNE avec l'état courant (union, jamais un remplacement,
 *     AR-3/CA-3) — un geste utilisateur ou le seed démo (asynchrone) survenu avant la
 *     fin de la lecture ne doit pas être perdu, NI EN MÉMOIRE NI SUR DISQUE : si la
 *     fusion diffère de la valeur lue, l'effet de restauration écrit lui-même le
 *     résultat fusionné (S-1) — sans quoi l'ajout ne survivrait qu'en mémoire jusqu'au
 *     prochain `toggle`/`add` explicite, et serait perdu si l'app se ferme avant ;
 *   - écriture DANS LES MUTATEURS (`toggle`, `add`), JAMAIS dans un effet sur `ids` :
 *     un tel effet écrirait le set vide initial avant la fin de la lecture asynchrone
 *     et EFFACERAIT la valeur persistée (R-1/CA-4 — c'est le défaut central du lot) ;
 *   - `loadedRef` interdit toute écriture tant que la restauration n'est pas terminée
 *     (même depuis un mutateur appelé pendant la fenêtre de lecture) : le set encore
 *     partiel ne doit jamais écraser la valeur persistée sur disque.
 *
 * Un id persisté sans projet correspondant n'est **jamais purgé** ici (AR-4) : c'est
 * `worksetProjects` (App.tsx, intersection portfolio ⨯ workset) qui l'ignore
 * silencieusement, par construction — ce hook ne connaît même pas le portefeuille.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";

/** Clé de config non sensible — valeur = tableau JSON d'ids (AR-6, cf. `config.rs`). */
export const WORKSET_KEY = "workset";

export interface UseWorkset {
  ids: ReadonlySet<string>;
  toggle: (projectId: string) => void;
  /** Ajoute un projet au set (idempotent — no-op s'il y est déjà). */
  add: (projectId: string) => void;
  has: (projectId: string) => boolean;
  /** Restauration terminée (lecture + fusion faites) — consommé par F2 (focus). */
  loaded: boolean;
}

/**
 * Parse tolérante de la valeur persistée : absent, JSON invalide, valeur non-tableau,
 * ou éléments non-chaînes → liste vide, JAMAIS d'exception (CA-8).
 */
function parsePersistedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
  } catch {
    return [];
  }
}

/** Injection de la façade pour les tests (défaut = vraie façade), calque `usePortfolio`. */
export function useWorkset(api: Backend = backend): UseWorkset {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<boolean>(false);
  // Réf miroir : source de vérité synchrone pour calculer le set suivant HORS de
  // l'updater React (l'updater doit rester pur — StrictMode le rejoue, cf. `main.tsx`).
  const idsRef = useRef<Set<string>>(ids);
  // Aucune écriture tant que la restauration n'est pas terminée (R-1/CA-4).
  const loadedRef = useRef<boolean>(false);

  // Restauration au montage : lecture tolérante + FUSION (union). Aucune écriture
  // ici : cet effet ne doit JAMAIS appeler `configSet` (CA-4).
  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      let raw: string | null = null;
      try {
        raw = await api.configGet(WORKSET_KEY);
      } catch {
        raw = null; // hors Tauri / backend indisponible → set vide (CA-9)
      }
      if (cancelled) return;
      const persisted = parsePersistedIds(raw);
      const persistedSet = new Set(persisted);
      const merged = new Set(idsRef.current);
      for (const id of persisted) merged.add(id);
      idsRef.current = merged;
      setIds(merged);
      loadedRef.current = true;
      setLoaded(true);
      // Un id ajouté EN MÉMOIRE pendant la fenêtre de lecture (course avec un geste,
      // ex. le seed démo asynchrone) n'était pas dans la valeur lue : sans cette
      // écriture, il ne survivrait qu'en mémoire jusqu'au prochain toggle/add
      // explicite — et serait perdu si l'app se ferme avant (S-1). N'écrit QUE si la
      // fusion diffère réellement de la valeur persistée (merged ⊇ persistedSet par
      // construction, donc « diffère » ⇔ tailles différentes) — jamais d'écriture du
      // set initial quand rien n'a été ajouté (CA-4/CA-5 restent verts).
      if (merged.size !== persistedSet.size) {
        void api
          .configSet(WORKSET_KEY, JSON.stringify(Array.from(merged)))
          .catch(() => {
            /* backend indisponible / hors Tauri : erreur avalée, jamais un crash */
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  /**
   * Applique le set suivant (déjà calculé HORS de l'updater React) et persiste —
   * SEUL point d'écriture du hook. Fire-and-forget, erreur avalée (hors Tauri /
   * backend indisponible ≠ crash, CA-9).
   */
  const commit = useCallback(
    (next: Set<string>): void => {
      idsRef.current = next;
      setIds(next);
      if (!loadedRef.current) return; // R-1/CA-4 : jamais avant la fin de la restauration
      void api
        .configSet(WORKSET_KEY, JSON.stringify(Array.from(next)))
        .catch(() => {
          /* backend indisponible / hors Tauri : erreur avalée, jamais un crash */
        });
    },
    [api],
  );

  const toggle = useCallback(
    (projectId: string): void => {
      const next = new Set(idsRef.current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      commit(next);
    },
    [commit],
  );

  const add = useCallback(
    (projectId: string): void => {
      if (idsRef.current.has(projectId)) return; // idempotent, ne retire jamais
      const next = new Set(idsRef.current);
      next.add(projectId);
      commit(next);
    },
    [commit],
  );

  const has = useCallback(
    (projectId: string): boolean => ids.has(projectId),
    [ids],
  );

  return { ids, toggle, add, has, loaded };
}
