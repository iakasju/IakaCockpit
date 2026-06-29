/**
 * demoWidgets — données de DÉMO pour les widgets dérivés du transcript/main courante
 * (L18 #3/#5/#6/#7). Vitrine du projet `iaka-demo` : alimente Plan vivant, Économie,
 * Mémoire (dérivée de l'économie) et Effets fichiers pour que TOUS les panneaux de la
 * Table soient pertinents en démo. **Démo-only** : App ne les substitue QUE si le projet
 * actif est `iaka-demo`, qu'aucune donnée LIVE n'existe, et que le seed dev a eu lieu
 * (flag `demoWidgetsOn`). Aucune fausse donnée en prod (inerte).
 */
import type { PlanItem } from "../hooks/derivePlan";
import type { EcoPoint } from "../hooks/useEconomy";
import type { FileEffect } from "../hooks/useEffects";

/** Plan vivant de démo (étapes + statuts cohérents avec la conversation démo). */
export const DEMO_PLAN: PlanItem[] = [
  { content: "Cadrer la refonte visuelle (direction A)", status: "completed" },
  { content: "Porter l'identité Atelier/Étagère/Table", status: "completed" },
  { content: "Implémenter les widgets de la Table", status: "in_progress" },
  { content: "Brancher l'économie du tour", status: "pending" },
  { content: "Recette visuelle + gate qualité", status: "pending" },
];

/** Économie de démo : input croissant (contexte qui se remplit) + une compaction (chute),
 *  mix coordinateur / sous-agents délégués. Le dernier `input` pilote la jauge mémoire. */
export const DEMO_ECONOMY: EcoPoint[] = [
  { input: 18_000, output: 320, sidechain: false },
  { input: 34_500, output: 540, sidechain: false },
  { input: 51_200, output: 280, sidechain: true },
  { input: 67_800, output: 910, sidechain: false },
  { input: 84_300, output: 460, sidechain: true },
  { input: 102_600, output: 1_240, sidechain: false },
  { input: 121_400, output: 680, sidechain: true },
  { input: 138_900, output: 1_510, sidechain: false },
  // Compaction : le contexte chute, puis repart.
  { input: 42_100, output: 390, sidechain: false },
  { input: 58_700, output: 820, sidechain: true },
  { input: 76_300, output: 1_080, sidechain: false },
  { input: 94_800, output: 640, sidechain: false },
];

/** Effets fichiers de démo : fichiers touchés par la session, triés par usage. */
export const DEMO_EFFECTS: FileEffect[] = [
  { path: "/src/App.tsx", count: 6, tool: "Edit" },
  { path: "/src/views/WorkingView.tsx", count: 5, tool: "Edit" },
  { path: "/src/theme/app.css", count: 5, tool: "Edit" },
  { path: "/src/components/EconomyPanel.tsx", count: 3, tool: "Write" },
  { path: "/src/hooks/useEconomy.ts", count: 2, tool: "Write" },
  { path: "/src/i18n/locales/fr.ts", count: 2, tool: "Edit" },
];
