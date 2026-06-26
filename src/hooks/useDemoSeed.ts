/**
 * useDemoSeed — bootstrap de la DÉMO DEV (L7, réconcilié L8/D7).
 *
 * Au montage d'`App`, **une seule fois par session** : appelle `backend.seedDemo()`
 * (côté Rust : crée le dossier démo + seede la config, **borné par un flag dev** —
 * inerte en prod). Si le seed a eu lieu (`seeded:true`) et qu'aucune conversation
 * n'est encore active (`conversationsCount === 0`, D7), ouvre **UNE conversation**
 * pour le projet démo `iaka-demo` (plus 5 onglets — L8/D7), puis **rafraîchit le
 * portfolio** pour faire apparaître la tuile `iaka-demo`. Reste sur la vue
 * **Portfolio** (AR-4) : on NE bascule PAS sur Working.
 *
 * **Réconciliation L8 (D7)** : SEUL change le bloc « ouverture d'onglets » →
 * « ouverture d'une conversation ». Tout le reste du contrat L7 est PRÉSERVÉ (seed
 * Rust inchangé, `seeded:false` inerte en prod, exécution unique, démarrage
 * Portfolio, refresh). `DEMO_TEAM` reste (alimente désormais le roster, D6).
 *
 * Frontière (D7/D8) : I/O **uniquement** via la façade `backend.ts` (aucun `invoke`
 * ici) et le hook `useConversations` reçu en paramètre. Le PTY réel est ouvert par
 * `PtyTerminal` à l'affichage du shell (architecture L2) — on n'ouvre PAS le PTY ici.
 *
 * Gardes (R-L7-7) :
 *   - `useRef` de premier passage → exécution **unique** par session (re-render ≠ ré-exec) ;
 *   - condition `conversationsCount === 0` → si une conversation est déjà active, on
 *     n'ouvre rien ;
 *   - `seeded:false` (flag off / prod) → le hook ne fait **rien**.
 */
import { useEffect, useRef } from "react";
import { backend, type Backend } from "../api/backend";
import type { ChatTurn } from "./useConversations";
import { DEMO_HISTORY } from "../mock/demoConversation";

/** Id/libellé logique de la conversation démo (projet `iaka-demo`). */
export const DEMO_PROJECT_ID = "iaka-demo";

export interface DemoSeedDeps {
  /** Façade backend (injectable pour tests). */
  api?: Backend;
  /** Nombre de conversations déjà ouvertes (garde de non-doublon, D7). */
  conversationsCount: number;
  /**
   * Ouvre (ou ré-active) la conversation démo — réutilise
   * `useConversations.openConversation`. L9 : un `initialHistory` optionnel
   * précharge l'historique de démo (chaîne de badges iakaframe).
   */
  openConversation: (
    projectId: string,
    title: string,
    cwd: string,
    agent?: string,
    initialHistory?: ChatTurn[],
  ) => string;
  /** Rafraîchit le portfolio (fait apparaître la tuile démo). */
  refreshPortfolio: () => Promise<void> | void;
  /**
   * Ajoute le projet démo au **set de Work** (L9-B). Idempotent côté
   * `useWorkset.add`. Optionnel : injecté par `App` ; absent en test → no-op.
   */
  addToWorkset?: (projectId: string) => void;
}

export function useDemoSeed(deps: DemoSeedDeps): void {
  const {
    api = backend,
    conversationsCount,
    openConversation,
    refreshPortfolio,
    addToWorkset,
  } = deps;

  // Garde d'exécution unique par session (R-L7-7) : indépendante du re-render.
  const ranRef = useRef(false);
  // Réfs miroir pour lire les valeurs courantes dans l'effet sans le réexécuter.
  const countRef = useRef(conversationsCount);
  countRef.current = conversationsCount;
  const openRef = useRef(openConversation);
  openRef.current = openConversation;
  const refreshRef = useRef(refreshPortfolio);
  refreshRef.current = refreshPortfolio;
  const addWorkRef = useRef(addToWorkset);
  addWorkRef.current = addToWorkset;

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

      // Non-doublon (D7) : n'ouvre la conversation démo que si aucune n'est active.
      // L9-C.1 : on précharge l'historique de démo (chaîne de badges iakaframe).
      if (countRef.current === 0) {
        openRef.current(
          DEMO_PROJECT_ID,
          DEMO_PROJECT_ID,
          report.demo_path,
          undefined,
          [...DEMO_HISTORY],
        );
      }

      // L9-B : le projet démo entre dans le set de Work (idempotent, non destructif).
      // Borné par le flag dev (`seeded:true`) → inerte en prod. Reste sur Portfolio (AR-4).
      addWorkRef.current?.(DEMO_PROJECT_ID);

      // Fait apparaître la tuile `iaka-demo` (AR-4 : on reste sur Portfolio).
      try {
        await refreshRef.current();
      } catch {
        /* best-effort : un échec de refresh ne casse pas le boot */
      }
    })();
    // Exécution unique gardée par `ranRef` : les valeurs courantes sont lues via
    // réfs miroir, hors dépendances réactives.
  }, [api]);
}
