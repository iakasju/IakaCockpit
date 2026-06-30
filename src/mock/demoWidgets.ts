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
import type { PlanTimeline } from "../hooks/derivePlanTimeline";
import type { TreemapItem } from "../components/TreemapPanel";

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

/** Effets fichiers de démo : fichiers touchés (avec ordinaux `hits` pour la heatmap). */
export const DEMO_EFFECTS: FileEffect[] = [
  { path: "/src/App.tsx", count: 6, tool: "Edit", hits: [1, 5, 9, 14, 18, 22] },
  { path: "/src/views/WorkingView.tsx", count: 5, tool: "Edit", hits: [2, 6, 11, 16, 21] },
  { path: "/src/theme/app.css", count: 5, tool: "Edit", hits: [3, 7, 12, 17, 23] },
  { path: "/src/components/EconomyPanel.tsx", count: 3, tool: "Write", hits: [8, 13, 19] },
  { path: "/src/hooks/useEconomy.ts", count: 2, tool: "Write", hits: [10, 20] },
  { path: "/src/i18n/locales/fr.ts", count: 2, tool: "Edit", hits: [4, 15] },
];

/** Total d'éditions de démo (borne des buckets de la heatmap). */
export const DEMO_EFFECTS_TOTAL = 23;

/** Économie de l'Étagère (KPI cross-projet) de démo : coût par projet & agent (#5b). */
export const DEMO_PORTFOLIO_ECONOMY: TreemapItem[] = [
  {
    project: "iaka-demo",
    tokens: 148_200,
    segments: [
      { label: "aragorn", tokens: 62_000 },
      { label: "gandalf", tokens: 44_000 },
      { label: "gimli", tokens: 31_000 },
      { label: "legolas", tokens: 11_200 },
    ],
  },
  {
    project: "iakacockpit",
    tokens: 96_700,
    segments: [
      { label: "aragorn", tokens: 53_000 },
      { label: "legolas", tokens: 43_700 },
    ],
  },
  {
    project: "iakagraph",
    tokens: 52_300,
    segments: [{ label: "frodo", tokens: 52_300 }],
  },
  {
    project: "iaka-notify",
    tokens: 20_200,
    segments: [
      { label: "gimli", tokens: 14_000 },
      { label: "gandalf", tokens: 6_200 },
    ],
  },
];

/** Gantt du réalisé de démo (ms relatifs : 0 → 30 min). Cohérent avec DEMO_PLAN. */
export const DEMO_TIMELINE: PlanTimeline = {
  minMs: 0,
  nowMs: 1_800_000,
  bars: [
    {
      content: "Cadrer la refonte visuelle (direction A)",
      startMs: 0,
      endMs: 240_000,
      status: "completed",
      overrun: false,
      estMs: 300_000, // estimé 5 min, fait en 4 → dans les temps
      baselineStartMs: 0, // 1ʳᵉ tâche estimée : ancrée sur son début réel
    },
    {
      content: "Porter l'identité Atelier/Étagère/Table",
      startMs: 240_000,
      endMs: 660_000,
      status: "completed",
      overrun: true,
      estMs: 360_000, // estimé 6 min, pris 7 → dépassement (+1 min)
      baselineStartMs: 300_000, // fin prévue de la tâche 1 (0 + 5 min)
    },
    {
      content: "Implémenter les widgets de la Table",
      startMs: 660_000,
      endMs: null,
      status: "in_progress",
      overrun: true,
      estMs: 480_000, // estimé 8 min, déjà au-delà → en retard
      baselineStartMs: 720_000, // fin prévue tâche 2 (5+6 min) décalée du dépassement (+1 min)
    },
    {
      content: "Brancher l'économie du tour",
      startMs: null,
      endMs: null,
      status: "pending",
      overrun: false,
      estMs: 240_000,
      baselineStartMs: 1_860_000, // poussée par la cascade des dépassements amont (tâches 2 & 3)
    },
    {
      content: "Recette visuelle + gate qualité",
      startMs: null,
      endMs: null,
      status: "pending",
      overrun: false,
      estMs: 360_000,
      baselineStartMs: 2_100_000, // 1_860_000 + 4 min (estimé tâche 4)
    },
  ],
};
