/**
 * urgency — source de vérité UNIQUE de la pastille d'urgence (L16-F4 / F4-bis).
 *
 * L'urgence de travailler sur un projet est dérivée du backlog restant (AR-7). Le même
 * mapping (niveau + libellé i18n) est partagé par la **tuile** (`ProjectCard`, slot `.ic`)
 * ET la **liste** (`ShelfRow`, position du `.dot`) → une seule pastille, identique partout,
 * zéro divergence visuelle ni sémantique.
 *
 * Présentationnel pur (D8) : fonctions pures, aucune donnée inventée (`null` → gris neutre).
 */

/** Fonction de traduction (sous-ensemble de la `TFunction` react-i18next). */
type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Seuil (AR-7) au-delà duquel le backlog restant est jugé « urgent » (pastille rouge).
 * `>= URGENCY_HIGH` étapes restantes → rouge ; `1..URGENCY_HIGH-1` → ambre. Tunable.
 */
export const URGENCY_HIGH = 5;

/** Niveau d'urgence, dérivé du backlog restant (donnée pure). */
export type UrgencyLevel = "none" | "done" | "mid" | "high";

/**
 * Niveau d'urgence pur dérivé de `backlog_remaining` (AR-7) :
 *  - `null` (pas de backlog du tout) → `"none"` (gris/neutre) ;
 *  - `0` (backlog présent, tout coché) → `"done"` (vert, fini) ;
 *  - `1..URGENCY_HIGH-1` → `"mid"` (ambre, en cours) ;
 *  - `>= URGENCY_HIGH` → `"high"` (rouge, urgent).
 */
export function urgencyLevel(remaining: number | null): UrgencyLevel {
  if (remaining === null) return "none";
  if (remaining === 0) return "done";
  if (remaining >= URGENCY_HIGH) return "high";
  return "mid";
}

/**
 * Libellé i18n du niveau (utilisé identiquement en `title` + `aria-label` par la tuile et
 * la liste) : mêmes clés `card.urgency*`, même interpolation `{{count}}` (aucun doublon).
 */
export function urgencyLabel(
  level: UrgencyLevel,
  remaining: number | null,
  t: TFn,
): string {
  switch (level) {
    case "high":
      return t("card.urgencyHigh", { count: remaining ?? 0 });
    case "mid":
      return t("card.urgencyMid", { count: remaining ?? 0 });
    case "done":
      return t("card.urgencyDone");
    default:
      return t("card.urgencyNone");
  }
}
