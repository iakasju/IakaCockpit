/**
 * demoTasks — TÂCHES/délégations préchargées de la DÉMO (vitrine du panneau
 * « Tâches en cours », L-taches).
 *
 * En démo, la conversation est MOCKÉE (`demoConversation`) : aucun vrai `RunnerEvent`
 * `delegation` n'est émis → le panneau « Tâches en cours » resterait vide. Pour que la
 * démo « montre » la mécanique de délégation iakaframe (comme l'historique de chat
 * préchargé), on injecte cette liste de tâches dans `useAgentTasks` pour le SEUL projet
 * `iaka-demo`, bornée par le flag dev (via `useDemoSeed`). Elle ne pollue PAS les vraies
 * conversations (qui se peuplent de vrais `RunnerEvent`).
 *
 * Cohérence team iakaframe (7 rôles, `DEMO_TEAM`) : vrais noms/rôles. Les `description`
 * sont des **données mockées** (mise en scène) — comme l'historique de chat démo, elles
 * NE sont donc PAS i18n-isées (seuls les libellés de structure du panneau le sont,
 * `t("tasks.*")`). `id` stables (clés invariantes → pas de re-render parasite).
 */
import type { AgentTask } from "../hooks/useAgentTasks";

/** Délégations de démo (statuts mêlés running/done), cohérentes avec la team. */
export const DEMO_TASKS: readonly AgentTask[] = [
  {
    id: "demo-task-gandalf",
    agent: "Gandalf",
    description: "Audit des écrans + hiérarchie de l'information",
    status: "running",
    ts: "2026-06-27T09:10:00Z",
  },
  {
    id: "demo-task-gimli",
    agent: "Gimli",
    description: "Porter la direction A — rail + grammaire sans-bord",
    status: "done",
    ts: "2026-06-27T09:20:00Z",
  },
  {
    id: "demo-task-loki",
    agent: "Loki",
    description: "Charte naonedge — vignettes thémées par team",
    status: "done",
    ts: "2026-06-27T09:25:00Z",
  },
  {
    id: "demo-task-legolas",
    agent: "Legolas",
    description: "Gate qualité du lot i18n",
    status: "running",
    ts: "2026-06-27T09:40:00Z",
  },
];
