/**
 * derivePlanTimeline — RÉALISÉ du plan (L19 #9a). PUR, testable, sans I/O.
 *
 * Le hook L18 émet un snapshot de plan horodaté à chaque `TodoWrite`. En comparant les
 * snapshots successifs, on déduit, par tâche (clé = `content`), QUAND elle est passée
 * `in_progress` (début) puis `completed` (fin) → une barre sur l'axe de temps. Pas
 * d'estimation ici (#9b) : uniquement le réalisé observé + une ALERTE pour une tâche
 * `in_progress` qui dure anormalement longtemps (vs la durée médiane des tâches finies).
 */
import type { PlanItem, PlanStatus } from "./derivePlan";

/** Un snapshot de plan horodaté (issu de la main courante). */
export interface PlanSnapshot {
  ts: string;
  items: PlanItem[];
}

/** Barre de tâche réalisée sur l'axe de temps. */
export interface TaskBar {
  content: string;
  /** Début (ms) = 1er passage à `in_progress`/`completed` ; null si jamais démarrée. */
  startMs: number | null;
  /** Fin (ms) = passage à `completed` ; null si pas encore finie. */
  endMs: number | null;
  status: PlanStatus;
  /** Tâche `in_progress` qui dure anormalement longtemps (alerte de retard). */
  overrun: boolean;
  /** Durée PRÉVISIONNELLE (ms) annoncée par le coordinateur (#9b, option A : `[~5min]`
   *  dans le contenu) ; null si non annoncée → pas de baseline (réalisé seul). */
  estMs: number | null;
}

/**
 * Parse une durée prévisionnelle préfixant le contenu (option A du coordinateur, L19) :
 * `[~5min] …`, `[20m] …`, `[1h] …`. Renvoie les millisecondes, ou null si absente.
 */
export function parseEstimate(content: string): number | null {
  const m = content.match(/^\s*\[\s*~?\s*(\d+)\s*(h|min|m)\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  const unit = m[2].toLowerCase();
  return unit === "h" ? n * 3_600_000 : n * 60_000;
}

export interface PlanTimeline {
  bars: TaskBar[];
  /** Bornes de l'axe (ms). */
  minMs: number;
  nowMs: number;
}

function ms(ts: string): number {
  const v = Date.parse(ts);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Construit la timeline du réalisé depuis les snapshots (triés ou non) à l'instant `nowMs`.
 * L'ordre des tâches suit leur apparition dans le dernier snapshot.
 */
export function derivePlanTimeline(
  snapshots: readonly PlanSnapshot[],
  nowMs: number,
): PlanTimeline {
  const snaps = [...snapshots].sort((a, b) => ms(a.ts) - ms(b.ts));
  // Par tâche : 1er ts non-pending (start), 1er ts completed (end), dernier statut.
  const start = new Map<string, number>();
  const end = new Map<string, number>();
  const status = new Map<string, PlanStatus>();
  const order: string[] = [];
  for (const s of snaps) {
    const t = ms(s.ts);
    for (const it of s.items) {
      const k = it.content;
      if (!status.has(k)) order.push(k);
      status.set(k, it.status);
      if (it.status !== "pending" && !start.has(k)) start.set(k, t);
      if (it.status === "completed" && !end.has(k)) end.set(k, t);
    }
  }
  // L'ordre final = celui du DERNIER snapshot (s'il existe), sinon ordre d'apparition.
  const last = snaps[snaps.length - 1];
  const keys = last ? last.items.map((i) => i.content) : order;

  // Durée médiane des tâches FINIES (pour l'alerte de retard).
  const durations: number[] = [];
  for (const k of keys) {
    const s = start.get(k);
    const e = end.get(k);
    if (s != null && e != null && e >= s) durations.push(e - s);
  }
  durations.sort((a, b) => a - b);
  const median =
    durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

  const bars: TaskBar[] = keys.map((k) => {
    const s = start.get(k) ?? null;
    const e = end.get(k) ?? null;
    const st = status.get(k) ?? "pending";
    const estMs = parseEstimate(k);
    // Dépassement : (a) vs estimation si annoncée (réalisé/écoulé > estimé), sinon
    // (b) heuristique médiane pour une tâche in_progress qui traîne.
    const elapsed = s != null ? (e ?? nowMs) - s : 0;
    const overrun =
      st !== "completed" && s != null
        ? estMs != null
          ? elapsed > estMs
          : median > 0 && nowMs - s > median * 1.5
        : estMs != null && e != null
          ? e - s! > estMs // tâche finie mais au-delà de l'estimation
          : false;
    return { content: k, startMs: s, endMs: e, status: st, overrun, estMs };
  });

  const allStarts = bars
    .map((b) => b.startMs)
    .filter((v): v is number => v != null);
  const minMs = allStarts.length > 0 ? Math.min(...allStarts) : nowMs;
  return { bars, minMs, nowMs };
}
