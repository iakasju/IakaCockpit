/**
 * TasksPanel — panneau « Tâches en cours » (colonne droite de Working, sous le Roster).
 *
 * Façon Claude Code : liste les délégations d'agents dérivées du transcript L10
 * (`useAgentTasks`). Présentationnel pur (aucun I/O) : reçoit la liste de tâches + le
 * résolveur d'avatar (réutilisé du Roster). Chaque ligne = badge agent (vignette +
 * nom) + description + indicateur de statut (pulse « en cours » / ✓ « terminé »).
 * État vide i18n quand aucune délégation (normal en démo : conversation mockée).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentTask } from "../hooks/useAgentTasks";
import type { AvatarResolver } from "../theme/teamAvatar";

export interface TasksPanelProps {
  /** Tâches de la conversation active (accumulées par `useAgentTasks`). */
  tasks: readonly AgentTask[];
  /** Résolveur de vignette par nom d'agent (réutilise celui du Roster). */
  resolveAvatar?: AvatarResolver;
}

/** Capitalise un nom de sous-agent (`gandalf` → `Gandalf`) pour l'affichage. */
function displayName(agent: string): string {
  return agent.length > 0 ? agent[0].toUpperCase() + agent.slice(1) : agent;
}

/** Vignette ronde d'un agent + fallback initiale si absente / chargement KO. */
function TaskAvatar({ url, alt }: { url: string; alt: string }): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="tavatar ph" aria-hidden>
        {alt.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className="tavatar"
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
    />
  );
}

export function TasksPanel({
  tasks,
  resolveAvatar,
}: TasksPanelProps): JSX.Element {
  const { t } = useTranslation();
  const runningCount = tasks.filter((task) => task.status === "running").length;

  return (
    <section className="tasks" aria-label={t("tasks.ariaLabel")}>
      <div className="taskshead">
        <span>{t("tasks.title")}</span>
        {runningCount > 0 && <span className="taskscount">{runningCount}</span>}
      </div>

      {tasks.length === 0 ? (
        <div className="tasksempty">{t("tasks.empty")}</div>
      ) : (
        <ul className="taskslist">
          {tasks.map((task) => {
            const name = displayName(task.agent);
            const url = resolveAvatar?.(task.agent) ?? null;
            const running = task.status === "running";
            return (
              <li key={task.id} className={`taskitem ${task.status}`}>
                {url ? (
                  <TaskAvatar url={url} alt={name} />
                ) : (
                  <span className="tavatar ph" aria-hidden>
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="taskmeta">
                  <span className="taskagent">{name}</span>
                  {task.description && (
                    <span className="taskdesc">{task.description}</span>
                  )}
                </span>
                <span
                  className={`tstatus ${task.status}`}
                  title={
                    running
                      ? t("tasks.statusRunning")
                      : t("tasks.statusDone")
                  }
                  aria-label={
                    running
                      ? t("tasks.statusRunning")
                      : t("tasks.statusDone")
                  }
                >
                  {running ? "" : "✓"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
