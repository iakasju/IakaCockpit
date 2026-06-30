/**
 * usePortfolioEconomy — coût par projet agrégé (L18 #5b) depuis les transcripts (façade
 * `portfolioEconomy`, Rust). Mappe vers `TreemapItem` (taille = total tokens ; segments =
 * coordinateur vs délégués, part de sortie). Aucun `invoke` direct (D7). Dégradé toléré :
 * échec/hors-Tauri → `[]` (l'Étagère retombe sur placeholder / démo).
 */
import { useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import type { TreemapItem } from "../components/TreemapPanel";

export function usePortfolioEconomy(api: Backend = backend): TreemapItem[] {
  const [items, setItems] = useState<TreemapItem[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .portfolioEconomy()
      .then((rows) => {
        if (!alive) return;
        setItems(
          rows.map((r) => ({
            project: r.project,
            tokens: r.input + r.output,
            segments: [
              { label: "coordinateur", tokens: r.coord },
              { label: "délégués", tokens: r.sub },
            ].filter((s) => s.tokens > 0),
            // Conserve coord/sub en CHAMPS de premier rang (pas seulement repliés dans les
            // segments) → le panneau « Coordinateur vs délégués » lit la donnée réelle sans
            // matcher des labels (le `label` des segments varie : agents nommés en démo).
            coord: r.coord,
            sub: r.sub,
          })),
        );
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
