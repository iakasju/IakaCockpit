/**
 * termFont — résolution de la police monospace passée à xterm.
 *
 * ── Le défaut réparé, et pourquoi il était invisible ───────────────────────────────────
 *
 * `PtyTerminal` passait à xterm la chaîne `'var(--mono), "JetBrains Mono", …'` : une
 * variable CSS, pour suivre la charte active. Or xterm ne se contente pas de poser cette
 * chaîne en CSS — il l'utilise pour MESURER la taille d'un caractère, et cette mesure
 * passe par un contexte canvas, où `var()` n'existe pas. L'affectation de police y est
 * donc rejetée en silence, et xterm mesure la police par défaut du canvas.
 *
 * Conséquence, MESURÉE au banc (mêmes réglages, seule la chaîne change) :
 *
 *   | police passée      | taille | hauteur de ligne | attendu | largeur de cellule |
 *   | `var(--mono), …`   |  13 px |            19 px |   24 px |            9.43 px |
 *   | `var(--mono), …`   |  32 px |            19 px |   59 px |            9.43 px |
 *   | littérale          |  13 px |            24 px |   24 px |            7.82 px |
 *   | littérale          |  32 px |            60 px |   59 px |           19.27 px |
 *
 * Avec `var()`, les métriques sont FIGÉES : identiques à 13 px et à 32 px. La grille de
 * caractères ne suit donc pas la police, et les glyphes se chevauchent.
 *
 * Ce défaut est ANTÉRIEUR au réglage de taille : à 13 px la cellule était trop LARGE
 * (9.43 contre 7.82), ce qui espaçait un peu les lettres sans alerter personne. C'est
 * l'agrandissement qui l'a rendu spectaculaire — il ne l'a pas créé.
 */

/**
 * Repli littéral si la variable n'est pas lisible (charte non chargée, environnement de
 * test sans CSS). Miroir de `--mono` de `tokens.css` : jamais de `var()` ici, c'est tout
 * l'objet du module.
 */
export const MONO_FALLBACK =
  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Lecture d'une variable CSS sur `<html>` ; injectable pour les tests. */
export type CssVarReader = (name: string) => string;

function defaultReader(name: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return "";
  try {
    return window.getComputedStyle(document.documentElement).getPropertyValue(name);
  } catch {
    return "";
  }
}

/**
 * Rend la pile de polices monospace de la charte active, RÉSOLUE — donc utilisable par la
 * mesure de xterm. Ne rend JAMAIS une chaîne contenant `var(`.
 */
export function resolveMonoFamily(read: CssVarReader = defaultReader): string {
  const raw = (read("--mono") || "").trim();
  // Une charte pourrait définir `--mono` à partir d'une autre variable : on refuse alors
  // la valeur plutôt que de réintroduire le défaut qu'on répare.
  if (!raw || raw.includes("var(")) return MONO_FALLBACK;
  return raw;
}
