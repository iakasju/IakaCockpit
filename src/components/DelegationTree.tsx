/**
 * DelegationTree — arbre des délégations coloré par avancement (L28).
 *
 * Remplace le Gantt (jugé trop complexe) par une lecture directe « coordinateur →
 * agents délégués », chaque nœud délégué COLORÉ par son statut :
 *   - `running` = ambre (« en cours ») ;
 *   - `done`    = vert (« terminé »).
 *
 * Présentationnel PUR (D8) : aucun I/O, reçoit ses données en props (coordinateur +
 * tâches déjà dérivées via `useAgentTasks` en Travail, ou `deriveDelegationsFromFeed`
 * au Journal). MVP = **1 niveau** (racine = coordinateur, enfants = délégués) ; les
 * sous-délégations imbriquées sont différées (lien parent non tracé aujourd'hui).
 * Vide → placeholder honnête. Libellés i18n (parité fr/en).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentTask } from "../hooks/useAgentTasks";
import type { AvatarResolver } from "../theme/teamAvatar";

export interface DelegationTreeProps {
  /** Nom du coordinateur = racine de l'arbre (nœud actif). */
  coordinator: string;
  /** Délégations à afficher (une par tâche). Vide → placeholder. */
  tasks: readonly AgentTask[];
  /** Résolveur de vignette par nom d'agent (réutilise celui du Roster). */
  resolveAvatar?: AvatarResolver;
}

/** Capitalise un nom d'agent (`gandalf` → `Gandalf`) pour l'affichage. */
function displayName(agent: string): string {
  return agent.length > 0 ? agent[0].toUpperCase() + agent.slice(1) : agent;
}

/** Vignette ronde d'un agent + fallback initiale si absente / chargement KO. */
function NodeAvatar({
  url,
  alt,
}: {
  url: string | null;
  alt: string;
}): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className="dtav ph" aria-hidden>
        {alt.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className="dtav"
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
    />
  );
}

export function DelegationTree({
  coordinator,
  tasks,
  resolveAvatar,
}: DelegationTreeProps): JSX.Element {
  const { t } = useTranslation();
  const total = tasks.length;
  const running = tasks.filter((task) => task.status === "running").length;
  const coordName = displayName(coordinator);

  return (
    <section className="dtree" aria-label={t("delegTree.ariaLabel")}>
      <div className="dth">
        <span className="dtt">{t("delegTree.title")}</span>
        {total > 0 && (
          <span className="dtcount">
            {t("delegTree.count", { count: total })}
            {running > 0
              ? ` · ${t("delegTree.running", { count: running })}`
              : ""}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="dtempty">{t("delegTree.empty")}</div>
      ) : (
        <div className="dtgraph">
          {/* Racine = coordinateur (nœud actif). */}
          <div className="dtroot">
            <NodeAvatar url={resolveAvatar?.(coordinator) ?? null} alt={coordName} />
            <span className="dtname">{coordName}</span>
            <span className="dtrole">{t("delegTree.coordinator")}</span>
          </div>

          {/* Enfants = agents délégués, colorés par statut (MVP 1 niveau). */}
          <ul className="dtkids">
            {tasks.map((task) => {
              const name = displayName(task.agent);
              const isRunning = task.status === "running";
              return (
                <li
                  key={task.id}
                  className={`dtnode ${task.status}`}
                >
                  <span className="dtedge" aria-hidden />
                  <NodeAvatar
                    url={resolveAvatar?.(task.agent) ?? null}
                    alt={name}
                  />
                  <span className="dtbody">
                    <span className="dtname">{name}</span>
                    {task.description && (
                      <span className="dtdesc">{task.description}</span>
                    )}
                  </span>
                  <span
                    className={`dtstatus ${task.status}`}
                    title={
                      isRunning
                        ? t("delegTree.statusRunning")
                        : t("delegTree.statusDone")
                    }
                    aria-label={
                      isRunning
                        ? t("delegTree.statusRunning")
                        : t("delegTree.statusDone")
                    }
                  >
                    {isRunning ? "" : "✓"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
