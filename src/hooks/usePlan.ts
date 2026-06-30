/**
 * usePlan — plan vivant de l'atelier actif (L18 #3 + L19 #9a). Lit la main courante
 * (façade L4) et en dérive le dernier snapshot (`derivePlan`, pour la checklist) ET tous
 * les snapshots horodatés (`derivePlanSnapshots`, pour la timeline du réalisé). Aucun
 * `invoke` direct ici (D7). Mode dégradé toléré : si la lecture échoue, items=null /
 * snapshots=[] → empty-state honnête.
 *
 * Live (L20 B2) : (re)chargement au changement de projet, `refresh()` manuel ET POLLING
 * périodique (`setInterval`) tant qu'un projet est actif → capte les NOUVELLES transitions
 * de statut écrites en main courante pendant la session, sans changer de projet. Nettoyage
 * strict de l'intervalle au démontage / changement de projet (anti-fuite, calque L10/usePty).
 * MVP polling ; la souscription `_changes` CouchDB reste différée (L4).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { derivePlan, derivePlanSnapshots, type PlanItem } from "./derivePlan";
import type { PlanSnapshot } from "./derivePlanTimeline";

/** Intervalle de polling de la main courante (ms). Volontairement large : le live « visuel »
 *  (barres/curseur) vient du ticker `useNow` ; ce poll ne sert qu'aux nouvelles transitions. */
export const PLAN_POLL_MS = 12_000;

export interface UsePlan {
  items: PlanItem[] | null;
  snapshots: PlanSnapshot[];
  refresh: () => Promise<void>;
}

export function usePlan(
  project: string | null,
  api: Backend = backend,
  pollMs: number = PLAN_POLL_MS,
): UsePlan {
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

  // Chargement immédiat au montage / changement de projet (et sur `refresh` recréé).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling périodique tant qu'un projet est actif (L20 B2). L'intervalle est recréé quand
  // `project`/`refresh` change (changement de projet) et NETTOYÉ au démontage → jamais de
  // double-abonnement ni de fuite. Idempotent et silencieux en mode dégradé (refresh gère
  // l'échec → empty-state). `_changes` CouchDB différé.
  useEffect(() => {
    if (!project || pollMs <= 0) return;
    const id = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [project, refresh, pollMs]);

  return { items, snapshots, refresh };
}
