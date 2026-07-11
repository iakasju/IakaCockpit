/**
 * usePrepareResume — statut du job « préparation de reprise » par projet (L23).
 *
 * Au retrait d'un projet de la Table, App retire l'item IMMÉDIATEMENT du set de Work
 * puis déclenche `prepare(...)` SANS l'attendre (tâche de fond). Ce hook tient le statut
 * par projet (`running → done | error`) pour l'afficher dans la zone discrète de
 * l'en-tête de la worklist (SA-4) — l'item ayant disparu, le statut ne peut vivre sur lui.
 *
 * État FRONT pur ; le seul I/O (`backend.prepareResume`) passe par la façade unique (D7).
 * Aucun `invoke` ici.
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";

/** Phase du job pour un projet donné. */
export type PrepareStatus = "running" | "done" | "error";

/** Ligne de statut affichable (transitoire) pour un projet préparé. */
export interface PrepareEntry {
  /** Id du projet (clé). */
  projectId: string;
  /** Libellé lisible du projet (affiché). */
  name: string;
  /** Phase courante. */
  status: PrepareStatus;
  /** Vrai si le dossier préparé était hors git (SA-3) — nuance le libellé « prête ». */
  horsGit?: boolean;
  /** Message d'erreur lisible (statut `error`). */
  message?: string;
}

export interface UsePrepareResume {
  /** Entrées de statut, ordre d'insertion stable (les plus récentes en fin). */
  entries: PrepareEntry[];
  /**
   * Lance la préparation de reprise du projet et suit son statut. Fire-and-forget côté
   * appelant (App n'attend pas) : le hook met à jour l'état à la résolution/au rejet.
   */
  prepare: (projectId: string, name: string, path: string) => void;
  /** Retire une entrée de la liste (fermeture manuelle d'un statut terminé). */
  dismiss: (projectId: string) => void;
}

/**
 * `api` injectable (défaut = façade réelle) pour mocker `prepareResume` en test —
 * calque `useNextStep`. Seul `prepareResume` est requis.
 */
export function usePrepareResume(
  api: Pick<Backend, "prepareResume"> = backend,
): UsePrepareResume {
  const [map, setMap] = useState<Record<string, PrepareEntry>>({});

  const upsert = useCallback((entry: PrepareEntry): void => {
    setMap((prev) => ({ ...prev, [entry.projectId]: entry }));
  }, []);

  const dismiss = useCallback((projectId: string): void => {
    setMap((prev) => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  }, []);

  const prepare = useCallback(
    (projectId: string, name: string, path: string): void => {
      upsert({ projectId, name, status: "running" });
      void api
        .prepareResume(path)
        .then((report) => {
          upsert({
            projectId,
            name,
            status: "done",
            horsGit: !report.is_git,
          });
        })
        .catch((err: unknown) => {
          upsert({
            projectId,
            name,
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
    [api, upsert],
  );

  // Ordre d'insertion stable : Object.values suit l'ordre de création des clés.
  return { entries: Object.values(map), prepare, dismiss };
}
