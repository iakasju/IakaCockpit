/**
 * derivePlan — extraction PURE du « plan vivant » depuis la main courante (L18 #3).
 *
 * Le hook `plan-courante.mjs` émet, à chaque `TodoWrite`/`Task`, un snapshot COMPLET du
 * plan sur la main courante : un doc `meta.event:"plan"` portant `meta.items`
 * (`[{content,status}]`). Le tailer L4 (`fetchMainCourante`) ramène ces docs avec leur
 * `meta` en passthrough. Cette fonction trouve le **dernier** snapshot (par `ts`) pour
 * un projet donné et renvoie ses items. Aucune invention : on lit ce que le hook a écrit.
 */
import type { FeedEvent } from "../api/backend";

export type PlanStatus = "pending" | "in_progress" | "completed";

export interface PlanItem {
  content: string;
  status: PlanStatus;
}

const STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "in_progress",
  "completed",
]);

function normStatus(s: unknown): PlanStatus {
  return typeof s === "string" && STATUSES.has(s) ? (s as PlanStatus) : "pending";
}

/** Vrai si l'événement est un snapshot de plan (`meta.event:"plan"`). */
function isPlanEvent(ev: FeedEvent): boolean {
  const m = ev.meta;
  return !!m && typeof m === "object" && (m as Record<string, unknown>).event === "plan";
}

/**
 * Dernier plan pour `project` (ou tous projets si absent), ou `null` si aucun.
 * Tri par `ts` ISO (lexicographique = chronologique). Items défensivement normalisés.
 */
export function derivePlan(
  events: readonly FeedEvent[],
  project?: string,
): PlanItem[] | null {
  let latest: FeedEvent | null = null;
  for (const ev of events) {
    if (!isPlanEvent(ev)) continue;
    if (project && ev.project !== project) continue;
    if (latest === null || ev.ts > latest.ts) latest = ev;
  }
  if (latest === null) return null;
  const raw = (latest.meta as Record<string, unknown>).items;
  if (!Array.isArray(raw)) return null;
  const items: PlanItem[] = [];
  for (const it of raw) {
    if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      const content = typeof o.content === "string" ? o.content.trim() : "";
      if (content.length > 0) {
        items.push({ content, status: normStatus(o.status) });
      }
    }
  }
  return items;
}
