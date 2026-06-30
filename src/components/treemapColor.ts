/**
 * treemapColor — palette de couleur par projet (par index) de la treemap Économie.
 * Module séparé (hors composant) pour que l'anneau de coût des cartes (L21 tranche C)
 * partage EXACTEMENT la teinte du même projet dans la treemap. Pur.
 */

/** Teintes de la treemap (couleur par projet, par index). */
export const TREEMAP_HUES = [210, 150, 270, 35, 0, 190];

/** Couleur d'un projet à l'index `i` (calque exact de la cellule treemap). */
export function treemapColor(i: number): string {
  return `hsl(${TREEMAP_HUES[i % TREEMAP_HUES.length]} 60% 55%)`;
}
