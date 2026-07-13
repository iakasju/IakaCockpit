/**
 * demoTasks — TÂCHES/délégations préchargées de la DÉMO (vitrine du panneau
 * « Tâches en cours », L-taches ; swimlanes L29).
 *
 * En démo, la conversation est MOCKÉE (`demoConversation`) : aucun vrai `RunnerEvent`
 * `delegation` n'est émis → le panneau « Tâches en cours » resterait vide. Pour que la
 * démo « montre » la mécanique de délégation iakaframe (comme l'historique de chat
 * préchargé), on injecte cette liste de tâches dans `useAgentTasks` pour le SEUL projet
 * `iaka-demo`, bornée par le flag dev (via `useDemoSeed`). Elle ne pollue PAS les vraies
 * conversations (qui se peuplent de vrais `RunnerEvent`).
 *
 * FENÊTRE RELATIVE À « MAINTENANT » (recette L29) : les horodatages sont calculés au
 * moment du seed sur une **fenêtre récente** (~30 dernières minutes) via la factory
 * `demoTasks(now)`. Ainsi les swimlanes affichent des **barres discrètes et bornées**
 * (durées de quelques minutes) quelle que soit la date d'exécution — plus de barres
 * « vieilles de deux semaines » qui s'étirent jusqu'à `Date.now()` (barres `running` non
 * bornées avec des `ts` figés en juin). Ce sont des **données mockées** (mise en scène),
 * comme l'historique de chat démo : les timestamps sont assumés comme telle, pas comme de
 * fausses données de prod (le seed reste borné à `iaka-demo` derrière le flag dev).
 *
 * Cohérence team iakaframe (7 rôles, `DEMO_TEAM`) : vrais noms/rôles. Les `description`
 * sont des **données mockées** — comme l'historique de chat démo, elles NE sont donc PAS
 * i18n-isées (seuls les libellés de structure du panneau le sont, `t("tasks.*")`). `id`
 * stables (clés invariantes → pas de re-render parasite).
 */
import type { AgentTask } from "../hooks/useAgentTasks";

const MIN = 60_000; // 1 minute en ms.

/** Horodatage ISO à `mAgo` minutes avant `now` (ms). */
const at = (now: number, mAgo: number): string =>
  new Date(now - mAgo * MIN).toISOString();

/**
 * Fabrique les délégations de démo ancrées sur `now` (ms). Fenêtre ~28 min : trois tâches
 * `done` (barres discrètes vertes, `doneTs > ts`) et une tâche `running` récente (barre
 * ambre courte, ouverte jusqu'à `now`). Cohérente avec la team iakaframe (roster L11).
 * Renvoie un **nouveau tableau** à chaque appel (aucun état partagé).
 */
export function demoTasks(now: number = Date.now()): AgentTask[] {
  return [
    {
      id: "demo-task-gandalf",
      agent: "Gandalf",
      description: "Audit des écrans + hiérarchie de l'information",
      status: "done",
      ts: at(now, 28),
      doneTs: at(now, 22),
    },
    {
      id: "demo-task-gimli",
      agent: "Gimli",
      description: "Porter la direction A — rail + grammaire sans-bord",
      status: "done",
      ts: at(now, 21),
      doneTs: at(now, 11),
    },
    {
      id: "demo-task-loki",
      agent: "Loki",
      description: "Charte naonedge — vignettes thémées par team",
      status: "done",
      ts: at(now, 19),
      doneTs: at(now, 9),
    },
    {
      id: "demo-task-legolas",
      agent: "Legolas",
      description: "Gate qualité du lot i18n",
      status: "running",
      ts: at(now, 6),
    },
  ];
}
