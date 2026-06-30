/**
 * usePortfolioActivity — ventilation tokens/jour/projet (L21 D) depuis les transcripts
 * (façade `portfolioActivity`, Rust). Aucun `invoke` direct (D7). Dégradé toléré :
 * échec / hors-Tauri → `[]` (la visu « travail passé » retombe sur empty-state honnête,
 * ou la démo dev-gardée).
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type ProjectActivity } from "../api/backend";

export function usePortfolioActivity(api: Backend = backend): ProjectActivity[] {
  const [items, setItems] = useState<ProjectActivity[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .portfolioActivity()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  return items;
}
