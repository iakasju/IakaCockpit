/**
 * usePortfolioCost — coût $ réel Analytics (L30-P2) sur une plage de temps, depuis la façade
 * `analyticsCost` (Rust : transcripts + table de prix par modèle). RANGE-AWARE : re-fetch
 * quand les bornes changent (le sélecteur de plage vit dans `AnalyticsView`, donc le fetch
 * range-borné vit ici — au plus près de la plage — via la façade unique D7, jamais d'`invoke`
 * direct). Dégradé toléré : hors-Tauri / échec → `null` (les widgets coût retombent sur
 * placeholder / démo dev). Aucun fetch réseau côté front (le refresh de prix est backend Rust).
 */
import { useEffect, useState } from "react";
import { backend, type Backend, type AnalyticsCost } from "../api/backend";

export function usePortfolioCost(
  fromMs: number,
  toMs: number,
  api: Backend = backend,
): AnalyticsCost | null {
  const [cost, setCost] = useState<AnalyticsCost | null>(null);

  useEffect(() => {
    // Hors-Tauri (dev front pur / tests) : pas d'`invoke` → placeholder honnête.
    if (!api.isTauri()) {
      setCost(null);
      return;
    }
    let alive = true;
    api
      .analyticsCost(fromMs, toMs)
      .then((c) => {
        if (alive) setCost(c);
      })
      .catch(() => {
        if (alive) setCost(null);
      });
    return () => {
      alive = false;
    };
  }, [api, fromMs, toMs]);

  return cost;
}
