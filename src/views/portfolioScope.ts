/**
 * portfolioScope — logique PURE de scoping de l'économie aux projets de la TABLE (L21 tranche
 * C). Le `%` de l'anneau de coût ET la treemap Économie partagent le MÊME dénominateur :
 * Σ tokens des projets PRÉSENTS SUR LA TABLE uniquement (AR-4). Hors table = exclu du calcul
 * et de la treemap. Aucun I/O, testable isolément.
 */
import type { TreemapItem } from "../components/TreemapPanel";

export interface PortfolioScope {
  /** Items d'économie restreints aux projets de la table (alimente la treemap). */
  tableEconomy: TreemapItem[];
  /** Σ tokens des projets de la table (dénominateur partagé anneau % / treemap). */
  tableTotal: number;
  /** Tokens (input+output) par projet, TOUS projets (pour le total affiché des cartes). */
  tokensByProject: Map<string, number>;
}

/** Restreint l'économie aux projets de la table et calcule le dénominateur partagé. */
export function scopePortfolioEconomy(
  economy: readonly TreemapItem[],
  worksetIds: ReadonlySet<string>,
): PortfolioScope {
  const tableEconomy = economy.filter((e) => worksetIds.has(e.project));
  const tableTotal = tableEconomy.reduce((s, e) => s + e.tokens, 0);
  const tokensByProject = new Map(economy.map((e) => [e.project, e.tokens]));
  return { tableEconomy, tableTotal, tokensByProject };
}

/**
 * Part d'un projet dans le total des tokens de la table (0–100), ou `null` si le projet n'a
 * pas de tokens OU si la table est vide (jamais de division par zéro, jamais de faux %).
 */
export function ringPct(scope: PortfolioScope, projectId: string): number | null {
  const tk = scope.tokensByProject.get(projectId);
  if (tk === undefined || scope.tableTotal <= 0) return null;
  return (tk / scope.tableTotal) * 100;
}

/** Total tokens d'un projet (input+output), ou `null` si absent des transcripts. */
export function tokensOf(scope: PortfolioScope, projectId: string): number | null {
  return scope.tokensByProject.get(projectId) ?? null;
}
