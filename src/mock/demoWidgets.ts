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
import type { ProjectActivity } from "../api/backend";

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
  // `coord`/`sub` = part coordinateur (non-sidechain) vs délégués (sidechain) de la SORTIE,
  // miroir de `ProjectEconomy.coord/sub` — alimente le panneau « Coordinateur vs délégués »
  // (le coordinateur = 1er segment, les autres = délégués, pour une démo cohérente).
  {
    project: "iaka-demo",
    tokens: 148_200,
    segments: [
      { label: "aragorn", tokens: 62_000 },
      { label: "gandalf", tokens: 44_000 },
      { label: "gimli", tokens: 31_000 },
      { label: "legolas", tokens: 11_200 },
    ],
    coord: 62_000,
    sub: 86_200,
  },
  {
    project: "iakacockpit",
    tokens: 96_700,
    segments: [
      { label: "aragorn", tokens: 53_000 },
      { label: "legolas", tokens: 43_700 },
    ],
    coord: 53_000,
    sub: 43_700,
  },
  {
    project: "iakagraph",
    tokens: 52_300,
    segments: [{ label: "frodo", tokens: 52_300 }],
    coord: 52_300,
    sub: 0,
  },
  {
    project: "iaka-notify",
    tokens: 20_200,
    segments: [
      { label: "gimli", tokens: 14_000 },
      { label: "gandalf", tokens: 6_200 },
    ],
    coord: 14_000,
    sub: 6_200,
  },
];

/** Activité « travail passé » de démo (L21 D) : tokens/jour/projet pour la scatter-timeline.
 *  Dev-only : substituée par App UNIQUEMENT si `demoWidgetsOn` et aucune donnée LIVE — inerte
 *  en prod. Scopée à la table côté front (en démo, seul `iaka-demo` est posé). */
export const DEMO_PORTFOLIO_ACTIVITY: ProjectActivity[] = [
  {
    project: "iaka-demo",
    days: [
      { date: "2026-06-24", tokens: 18_000 },
      { date: "2026-06-26", tokens: 42_000 },
      { date: "2026-06-27", tokens: 31_000 },
      { date: "2026-06-29", tokens: 57_000 },
      { date: "2026-06-30", tokens: 22_000 },
    ],
  },
  {
    project: "iakacockpit",
    days: [
      { date: "2026-06-25", tokens: 26_000 },
      { date: "2026-06-28", tokens: 44_000 },
      { date: "2026-06-30", tokens: 27_000 },
    ],
  },
];

/**
 * Gantt prévisionnel de démo. Les positions internes sont relatives (0 → 30 min de réalisé,
 * fin projetée ~41 min) ; on les ANCRE sur une horloge murale déterministe (10:25 local) pour
 * que l'axe et le bandeau affichent des heures lisibles plutôt que 1970. Cohérent avec
 * DEMO_PLAN et avec le nouveau rendu L20 (bandeau + axe étendu + cascade ghost/wait/slip).
 */
const DEMO_T0 = new Date(2026, 5, 30, 10, 25, 0).getTime(); // ancre « lancé 10:25 » (local)
const at = (rel: number | null): number | null => (rel == null ? null : DEMO_T0 + rel);

export const DEMO_TIMELINE: PlanTimeline = {
  minMs: DEMO_T0,
  nowMs: DEMO_T0 + 1_800_000, // maintenant = +30 min
  bars: [
    {
      content: "Cadrer la refonte visuelle (direction A)",
      startMs: at(0),
      endMs: at(240_000),
      status: "completed",
      overrun: false,
      estMs: 300_000, // estimé 5 min, fait en 4 → dans les temps
      baselineStartMs: at(0), // 1ʳᵉ tâche estimée : ancrée sur son début réel
    },
    {
      content: "Porter l'identité Atelier/Étagère/Table",
      startMs: at(240_000),
      endMs: at(660_000),
      status: "completed",
      overrun: true,
      estMs: 360_000, // estimé 6 min, pris 7 → dépassement (+1 min)
      baselineStartMs: at(300_000), // fin prévue de la tâche 1 (0 + 5 min)
    },
    {
      content: "Implémenter les widgets de la Table",
      startMs: at(660_000),
      endMs: null,
      status: "in_progress",
      overrun: true,
      estMs: 480_000, // estimé 8 min, déjà au-delà → en retard
      baselineStartMs: at(720_000), // fin prévue tâche 2 (5+6 min) décalée du dépassement (+1 min)
    },
    {
      content: "Brancher l'économie du tour",
      startMs: null,
      endMs: null,
      status: "pending",
      overrun: false,
      estMs: 240_000,
      baselineStartMs: at(1_860_000), // poussée par la cascade des dépassements amont (tâches 2 & 3)
    },
    {
      content: "Recette visuelle + gate qualité",
      startMs: null,
      endMs: null,
      status: "pending",
      overrun: false,
      estMs: 360_000,
      baselineStartMs: at(2_100_000), // 1_860_000 + 4 min (estimé tâche 4)
    },
  ],
};
