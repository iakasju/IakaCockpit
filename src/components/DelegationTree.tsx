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
import type { DelegEdge } from "../api/backend";

export interface DelegationTreeProps {
  /** Nom du coordinateur = racine de l'arbre (nœud actif). */
  coordinator: string;
  /** Délégations de niveau 1 (une par tâche). Vide → placeholder. */
  tasks: readonly AgentTask[];
  /** Résolveur de vignette par nom d'agent (réutilise celui du Roster). */
  resolveAvatar?: AvatarResolver;
  /** Sous-délégations (arêtes parent→enfant) pour l'arbre MULTI-NIVEAUX (Journal). Absent/[] =
   *  arbre 1 niveau (Travail live). Les enfants sont greffés sous le nœud dont `parent` == agent. */
  edges?: readonly DelegEdge[];
}

/** Profondeur max de récursion (anti-explosion) — coordinateur → délégué → sous-délégué → … */
const MAX_DEPTH = 4;

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

/** Un nœud de l'arbre (récursif) : agent + statut + éventuels sous-délégués (arêtes). Anti-boucle
 *  (chemin `seen`) + profondeur bornée (`MAX_DEPTH`). Le statut colore comme aujourd'hui. */
function DelegNode({
  agent,
  status,
  description,
  childrenByParent,
  resolveAvatar,
  depth,
  seen,
}: {
  agent: string;
  status: string;
  description?: string;
  childrenByParent: Map<string, { child: string; status: string }[]>;
  resolveAvatar?: AvatarResolver;
  depth: number;
  seen: ReadonlySet<string>;
}): JSX.Element {
  const { t } = useTranslation();
  const name = displayName(agent);
  const isRunning = status !== "done";
  // Enfants : arêtes dont le parent == cet agent, si on n'a pas bouclé et sous la profondeur max.
  const kids =
    depth < MAX_DEPTH && !seen.has(agent)
      ? (childrenByParent.get(agent) ?? [])
      : [];
  const nextSeen = new Set(seen);
  nextSeen.add(agent);

  return (
    <li className={`dtnode ${isRunning ? "running" : "done"}`}>
      <span className="dtedge" aria-hidden />
      <NodeAvatar url={resolveAvatar?.(agent) ?? null} alt={name} />
      <span className="dtbody">
        <span className="dtname">{name}</span>
        {description && <span className="dtdesc">{description}</span>}
      </span>
      <span
        className={`dtstatus ${isRunning ? "running" : "done"}`}
        title={isRunning ? t("delegTree.statusRunning") : t("delegTree.statusDone")}
        aria-label={isRunning ? t("delegTree.statusRunning") : t("delegTree.statusDone")}
      >
        {isRunning ? "" : "✓"}
      </span>
      {kids.length > 0 && (
        <ul className="dtkids nested">
          {kids.map((k, i) => (
            <DelegNode
              key={`${k.child}-${i}`}
              agent={k.child}
              status={k.status}
              childrenByParent={childrenByParent}
              resolveAvatar={resolveAvatar}
              depth={depth + 1}
              seen={nextSeen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DelegationTree({
  coordinator,
  tasks,
  resolveAvatar,
  edges = [],
}: DelegationTreeProps): JSX.Element {
  const { t } = useTranslation();
  const total = tasks.length;
  const running = tasks.filter((task) => task.status === "running").length;
  const coordName = displayName(coordinator);

  // Map parent → enfants (arêtes de sous-délégation). Agrégées par nom (MVP index rétrospectif).
  const childrenByParent = new Map<string, { child: string; status: string }[]>();
  for (const e of edges) {
    const list = childrenByParent.get(e.parent) ?? [];
    list.push({ child: e.child, status: e.status });
    childrenByParent.set(e.parent, list);
  }

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

          {/* Niveau 1 = délégués du coordinateur ; niveaux ≥ 2 = sous-délégations (arêtes). */}
          <ul className="dtkids">
            {tasks.map((task) => (
              <DelegNode
                key={task.id}
                agent={task.agent}
                status={task.status}
                description={task.description}
                childrenByParent={childrenByParent}
                resolveAvatar={resolveAvatar}
                depth={1}
                seen={new Set([coordinator])}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
