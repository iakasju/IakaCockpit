/**
 * usePlan — plan vivant de l'atelier actif (L18 #3). Lit la main courante (façade L4)
 * et en dérive le dernier snapshot de plan pour le projet courant (`derivePlan`). Aucun
 * `invoke` direct ici (D7) : tout passe par la façade `backend`. Mode dégradé toléré :
 * si la lecture échoue (CouchDB absent/injoignable), `items = null` → empty-state honnête.
 *
 * MVP : (re)chargement au changement de projet + `refresh()` exposé. Le temps réel
 * (`_changes`) est différé (calque L4).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { derivePlan, type PlanItem } from "./derivePlan";

export interface UsePlan {
  items: PlanItem[] | null;
  refresh: () => Promise<void>;
}

export function usePlan(project: string | null, api: Backend = backend): UsePlan {
  const [items, setItems] = useState<PlanItem[] | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!project) {
      setItems(null);
      return;
    }
    try {
      const evs = await api.fetchMainCourante();
      setItems(derivePlan(evs, project));
    } catch {
      setItems(null); // dégradé : pas de plan affiché (jamais d'erreur dure)
    }
  }, [project, api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, refresh };
}
