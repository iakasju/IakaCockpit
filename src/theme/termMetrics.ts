/**
 * termMetrics — TOUTE la lisibilité du terminal dérivée d'UNE seule valeur : la taille du
 * texte.
 *
 * Décision produit : l'utilisateur ne règle qu'un curseur. Interligne, espacement des
 * caractères et respiration autour de la grille en découlent, parce que ce sont des
 * grandeurs liées : les régler séparément, c'est offrir des combinaisons illisibles et
 * demander à l'utilisateur de faire le travail de typographie.
 *
 * Module PUR (aucun I/O, aucun React) : c'est ce qui rend la dérivation testable et
 * remplaçable sans toucher au terminal.
 *
 * ── Ce qui a été MESURÉ (banc xterm réel piloté en Chrome headless) ────────────────────
 *
 * 1. Hauteur de cellule ≈ `fontSize × 1.15 × lineHeight`. Relevés : 13 px/1.0 → 15 px ;
 *    22 px/1.0 → 25 px ; 22 px/1.3 → 32 px.
 *
 * 2. `letterSpacing` CASSE les caractères de dessin de boîte. Vérifié en capture d'écran à
 *    0, 1 et 2 px : à 0 les bordures `─` sont continues, dès 1 px elles deviennent des
 *    pointillés. Les runners que l'app lance (Claude Code, Codex) dessinent des boîtes en
 *    permanence : l'espacement inter-caractères est donc DÉRIVÉ À ZÉRO, volontairement.
 *    Ce n'est pas un oubli, c'est une contrainte du rendu.
 *
 * 3. Ouvrir l'interligne DÉTACHE les bordures verticales des boîtes de leurs horizontales
 *    (les `│` ne se touchent plus d'une ligne à l'autre) — symétrique exact du point 2.
 *    Arbitrage retenu, sur retour terrain : la lisibilité du TEXTE prime sur l'intégrité
 *    du CADRE, parce qu'on lit le texte et qu'on ne fait que deviner le cadre.
 */

/** Métriques appliquées au terminal pour une taille de texte donnée. */
export interface TermMetrics {
  /** Taille de police en px (l'entrée, reprise telle quelle). */
  fontSize: number;
  /** Multiplicateur d'interligne xterm (option `lineHeight`). */
  lineHeight: number;
  /**
   * Espacement inter-caractères en px entiers (option `letterSpacing`). Toujours 0 : voir
   * le point 2 de l'en-tête — au-delà, les bordures des TUI se hachent.
   */
  letterSpacing: number;
  /** Respiration autour de la grille, en px (padding vertical / horizontal du montage). */
  padY: number;
  padX: number;
}

/**
 * Interligne : multiplicateur CONSTANT, donc strictement proportionnel à la taille.
 *
 * Point à ne pas manquer — c'est ce qui a été corrigé ici : l'option `lineHeight` de xterm
 * est DÉJÀ un multiplicateur de la hauteur de glyphe. Une valeur constante suffit donc à
 * rendre l'interligne exactement proportionnel au texte. La version précédente faisait
 * DÉCROÎTRE ce multiplicateur avec la taille (1.60 → 1.40, convention typographique de la
 * prose imprimée) — ce qui, loin d'affiner le calcul, CASSAIT la proportionnalité : le gros
 * texte recevait proportionnellement moins d'air que le petit (0.61 contre 0.83 de la
 * hauteur de glyphe). Vérifié en capture : le rythme visuel sautait d'une taille à l'autre.
 *
 * Une constante rend le rythme identique à toutes les tailles — et le calcul lisible.
 */
export const LINE_HEIGHT_RATIO = 1.6;

/**
 * Respiration autour de la grille, en fraction de la taille du texte. Les deux valeurs
 * REPRODUISENT le padding historique (10 px / 14 px) à la taille par défaut de 13 px :
 * à taille inchangée, le rendu ne bouge pas. Proportionnelles, pour la même raison que
 * l'interligne.
 */
const PAD_Y_RATIO = 10 / 13;
const PAD_X_RATIO = 14 / 13;

/** Dérive toutes les métriques de lisibilité d'une taille de texte. */
export function deriveTermMetrics(fontSize: number): TermMetrics {
  return {
    fontSize,
    lineHeight: LINE_HEIGHT_RATIO,
    letterSpacing: 0,
    padY: Math.round(fontSize * PAD_Y_RATIO),
    padX: Math.round(fontSize * PAD_X_RATIO),
  };
}
