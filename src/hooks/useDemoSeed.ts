/**
 * useDemoSeed — bootstrap de la DÉMO DEV (L7, D5/D7).
 *
 * Au montage d'`App`, **une seule fois par session** : appelle `backend.seedDemo()`
 * (côté Rust : crée le dossier démo + seede la config, **borné par un flag dev** —
 * inerte en prod). Si le seed a eu lieu (`seeded:true`) et qu'aucun onglet n'est
 * encore ouvert (`tabs.length === 0`, D2), ouvre les **onglets team** `[ROYAUME][Agent]`
 * (mise en scène DEMO_TEAM, AR-1) pointés sur le dossier démo, puis **rafraîchit le
 * portfolio** pour faire apparaître la tuile `iaka-demo`. Reste sur la vue **Portfolio**
 * (AR-4) : on NE bascule PAS sur Working.
 *
 * Frontière (D5/D7) : I/O **uniquement** via la façade `backend.ts` (aucun `invoke`
 * ici) et les hooks `useGridState`/`usePortfolio` reçus en paramètre. Le hook ne fait
 * **que créer les onglets** (descripteurs) ; le PTY réel est ouvert par `PtyTerminal`
 * à l'affichage de l'onglet (architecture L2) — on n'ouvre PAS le PTY ici, pour éviter
 * des sessions dupliquées/orphelines (R-L7-7).
 *
 * Gardes (R-L7-7) :
 *   - `useRef` de premier passage → exécution **unique** par session (re-render ≠ ré-exec) ;
 *   - condition `tabs.length === 0` → si l'utilisateur a déjà ouvert des onglets, on
 *     n'ouvre rien ;
 *   - `seeded:false` (flag off / prod) → le hook ne fait **rien**.
 */
import { useEffect, useRef } from "react";
import { backend, type Backend } from "../api/backend";
import {
  DEMO_TEAM,
  teamTabProjectId,
  teamTabTitle,
} from "../mock/demoTeam";

export interface DemoSeedDeps {
  /** Façade backend (injectable pour tests). */
  api?: Backend;
  /** Nombre d'onglets déjà ouverts (garde de non-doublon, D2). */
  tabsCount: number;
  /** Ouvre (ou ré-active) un onglet team — réutilise `useGridState.openTab`. */
  openTab: (projectId: string, title: string, cwd: string) => string;
  /** Rafraîchit le portfolio (fait apparaître la tuile démo). */
  refreshPortfolio: () => Promise<void> | void;
}

export function useDemoSeed(deps: DemoSeedDeps): void {
  const { api = backend, tabsCount, openTab, refreshPortfolio } = deps;

  // Garde d'exécution unique par session (R-L7-7) : indépendante du re-render.
  const ranRef = useRef(false);
  // Réfs miroir pour lire les valeurs courantes dans l'effet sans le réexécuter.
  const tabsCountRef = useRef(tabsCount);
  tabsCountRef.current = tabsCount;
  const openTabRef = useRef(openTab);
  openTabRef.current = openTab;
  const refreshRef = useRef(refreshPortfolio);
  refreshRef.current = refreshPortfolio;

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    void (async () => {
      let report;
      try {
        report = await api.seedDemo();
      } catch {
        // Hors Tauri (dev front pur / tests sans backend) ou erreur : no-op silencieux.
        return;
      }

      // Flag off / prod (`seeded:false`) ou pas de dossier → on ne fait RIEN.
      if (!report.seeded || !report.demo_path) return;

      // Non-doublon (D2) : n'ouvre les onglets team que si aucun onglet ouvert.
      if (tabsCountRef.current === 0) {
        for (const member of DEMO_TEAM) {
          openTabRef.current(
            teamTabProjectId(member),
            teamTabTitle(member),
            report.demo_path,
          );
        }
      }

      // Fait apparaître la tuile `iaka-demo` (AR-4 : on reste sur Portfolio).
      try {
        await refreshRef.current();
      } catch {
        /* best-effort : un échec de refresh ne casse pas le boot */
      }
    })();
    // Exécution unique gardée par `ranRef` : les valeurs courantes (tabsCount,
    // openTab, refresh) sont lues via réfs miroir, hors dépendances réactives.
  }, [api]);
}
