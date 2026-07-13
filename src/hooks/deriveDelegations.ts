/**
 * deriveDelegations — dérive des délégations (`AgentTask[]`) depuis la main courante
 * (feed L4) pour alimenter le même `DelegationTree` que la vue Travail (L28/F3).
 *
 * PUR (aucun I/O/React) → testable directement. Une délégation = un événement du
 * **canal geste** (trace machine L5) ; l'agent = l'émetteur de l'event (le segment
 * cible d'un `A → B`, sinon le nom seul).
 *
 * ZÉRO fausse donnée (garde L28) : le statut `done` n'est posé QUE s'il est réellement
 * déductible du feed — c.-à-d. si `meta` porte un signal explicite de fin
 * (`meta.status`/`meta.state` ∈ {done,completed,terminé…} OU `meta.event: "report"`).
 * En l'absence de tout signal, la délégation reste `running` (« vue ») — jamais un faux
 * « terminé ». Le raffinement (appariement délégation↔rapport fin) est tracé en différé.
 */
import type { FeedEvent } from "../api/backend";
import type { AgentTask, TaskStatus } from "./useAgentTasks";

/** Extrait le nom d'agent délégué depuis `who` (`"Aragorn → Gimli"` → `"Gimli"`). */
function agentFromWho(who: string): string {
  const parts = who.split(/→|->/);
  const last = parts[parts.length - 1]?.trim();
  return last && last.length > 0 ? last : who.trim();
}

/**
 * Statut DÉDUCTIBLE d'un event (sinon `running`). On n'invente rien : seul un signal
 * explicite dans `meta` fait passer `done`.
 */
function statusFromMeta(meta: FeedEvent["meta"]): TaskStatus {
  if (!meta) return "running";
  const raw =
    (typeof meta.status === "string" && meta.status) ||
    (typeof meta.state === "string" && meta.state) ||
    (typeof meta.event === "string" && meta.event) ||
    "";
  const v = raw.toLowerCase();
  if (
    v === "done" ||
    v === "completed" ||
    v === "complete" ||
    v === "terminé" ||
    v === "termine" ||
    v === "report" ||
    v === "rapport"
  ) {
    return "done";
  }
  return "running";
}

/**
 * Dérive les délégations d'une liste d'événements de main courante (PUR).
 * Ne garde que le canal **geste** ; une délégation par event, clé stable = `id`.
 */
export function deriveDelegationsFromFeed(
  events: readonly FeedEvent[],
): AgentTask[] {
  const out: AgentTask[] = [];
  for (const e of events) {
    if (e.canal !== "geste") continue;
    out.push({
      id: e.id,
      agent: agentFromWho(e.who),
      description: e.body,
      status: statusFromMeta(e.meta),
      ts: e.ts,
    });
  }
  return out;
}
