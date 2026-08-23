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
 *    22 px/1.0 → 25 px ; 22 px/1.3 → 32 px. C'est ce modèle qui fonde la courbe ci-dessous.
 *
 * 2. `letterSpacing` CASSE les caractères de dessin de boîte. Vérifié en capture d'écran à
 *    0, 1 et 2 px : à 0 les bordures `─` sont continues, dès 1 px elles deviennent des
 *    pointillés. Les runners que l'app lance (Claude Code, Codex) dessinent des boîtes en
 *    permanence : l'espacement inter-caractères est donc DÉRIVÉ À ZÉRO, volontairement.
 *    Ce n'est pas un oubli, c'est une contrainte du rendu.
 */

/** Métriques appliquées au terminal pour une taille de texte donnée. */
export interface TermMetrics {
  /** Taille de police en px (l'entrée, reprise telle quelle). */
  fontSize: number;
  /** Multiplicateur d'interligne xterm (option `lineHeight`). */
  lineHeight: number;
  /**
   * Espacement inter-caractères en px entiers (option `letterSpacing`). Toujours 0 : voir
   * l'en-tête — au-delà, les bordures des TUI se hachent.
   */
  letterSpacing: number;
  /** Respiration autour de la grille, en px (padding vertical / horizontal du montage). */
  padY: number;
  padX: number;
}

/**
 * Courbe d'interligne. Convention typographique : plus le texte est GRAND, moins il a
 * besoin d'interligne RELATIF. On interpole donc de 1.60 (petit) à 1.40 (grand), bornes
 * comprises — jamais le 1.0 de xterm, qui colle les lignes les unes aux autres.
 *
 * Ces deux bornes ont été OUVERTES sur retour terrain (« trop serré ») : elles valaient
 * 1.35/1.20, ce qui donnait 8 px d'air à 18 px de police. Elles en donnent 13 maintenant.
 *
 * ── Le COÛT, mesuré et assumé ─────────────────────────────────────────────────────────
 * Aérer les lignes DÉTACHE les bordures verticales des boîtes TUI de leurs horizontales :
 * les glyphes `│` ne se touchent plus d'une ligne à l'autre. C'est l'exact symétrique de
 * ce que fait `letterSpacing` à l'horizontale. Vérifié en capture au banc à 1.26 / 1.50 /
 * 1.70 : le cadre se disjoint visiblement à partir de ~1.5. Arbitrage retenu : la
 * lisibilité du TEXTE prime sur l'intégrité du CADRE, parce qu'on lit le texte et qu'on
 * ne fait que deviner le cadre. C'est le seul endroit où les deux ne peuvent pas être
 * satisfaits ensemble ; monter les bornes davantage aggraverait la disjonction.
 */
export const LH_AT_SMALL = 1.6;
export const LH_AT_LARGE = 1.4;
const SIZE_SMALL = 10;
const SIZE_LARGE = 24;

/**
 * Respiration autour de la grille, en fraction de la taille du texte. Les deux valeurs
 * REPRODUISENT le padding historique (10 px / 14 px) à la taille par défaut de 13 px :
 * à taille inchangée, le rendu ne bouge pas.
 */
const PAD_Y_RATIO = 10 / 13;
const PAD_X_RATIO = 14 / 13;

/** Dérive toutes les métriques de lisibilité d'une taille de texte. */
export function deriveTermMetrics(fontSize: number): TermMetrics {
  const t = (fontSize - SIZE_SMALL) / (SIZE_LARGE - SIZE_SMALL);
  const clampedT = Math.min(1, Math.max(0, t));
  const raw = LH_AT_SMALL + clampedT * (LH_AT_LARGE - LH_AT_SMALL);
  return {
    fontSize,
    // Arrondi à 2 décimales : au-delà, on ferait varier une valeur que le rendu ne
    // distingue pas, et les tests deviendraient sensibles au bruit de virgule flottante.
    lineHeight: Math.round(raw * 100) / 100,
    letterSpacing: 0,
    padY: Math.round(fontSize * PAD_Y_RATIO),
    padX: Math.round(fontSize * PAD_X_RATIO),
  };
}
