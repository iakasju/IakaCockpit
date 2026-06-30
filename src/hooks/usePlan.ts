/**
 * usePlan — plan vivant de l'atelier actif (L18 #3 + L19 #9a). Lit la main courante
 * (façade L4) et en dérive le dernier snapshot (`derivePlan`, pour la checklist) ET tous
 * les snapshots horodatés (`derivePlanSnapshots`, pour la timeline du réalisé). Aucun
 * `invoke` direct ici (D7). Mode dégradé toléré : si la lecture échoue, items=null /
 * snapshots=[] → empty-state honnête.
 *
 * MVP : (re)chargement au changement de projet + `refresh()`. Temps réel différé (L4).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { derivePlan, derivePlanSnapshots, type PlanItem } from "./derivePlan";
import type { PlanSnapshot } from "./derivePlanTimeline";

export interface UsePlan {
  items: PlanItem[] | null;
  snapshots: PlanSnapshot[];
  refresh: () => Promise<void>;
}

export function usePlan(project: string | null, api: Backend = backend): UsePlan {
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!project) {
      setItems(null);
      setSnapshots([]);
      return;
    }
    try {
      const evs = await api.fetchMainCourante();
      setItems(derivePlan(evs, project));
      setSnapshots(derivePlanSnapshots(evs, project));
    } catch {
      setItems(null); // dégradé : pas de plan affiché (jamais d'erreur dure)
      setSnapshots([]);
    }
  }, [project, api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, snapshots, refresh };
}
