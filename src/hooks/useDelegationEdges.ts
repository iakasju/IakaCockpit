/**
 * useDelegationEdges — arêtes de délégation parent→enfant (sous-délégations, niveau ≥ 2) pour
 * l'arbre MULTI-NIVEAUX du Journal, via la façade `delegationEdges` (index-backed, phase 2). Scopé
 * par projet. Dégradé toléré : hors-Tauri / échec / phase 2 pas prête → `[]` (l'arbre reste 1 niveau).
 * Le front ne lit AUCUN transcript/outputFile (garde CSP/D7).
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type DelegEdge } from "../api/backend";

export function useDelegationEdges(
  project: string | null,
  api: Backend = backend,
): DelegEdge[] {
  const [edges, setEdges] = useState<DelegEdge[]>([]);

  useEffect(() => {
    if (!api.isTauri() || !project) {
      setEdges([]);
      return;
    }
    let alive = true;
    // Journal = rétrospectif : fenêtre large (tout l'historique disponible) scopée au projet.
    api
      .delegationEdges(0, Date.now(), project)
      .then((e) => {
        if (alive) setEdges(e);
      })
      .catch(() => {
        if (alive) setEdges([]);
      });
    return () => {
      alive = false;
    };
  }, [api, project]);

  return edges;
}
