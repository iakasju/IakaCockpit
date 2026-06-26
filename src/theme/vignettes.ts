/**
 * vignettes.ts — RÉSOLVEUR de vignette (L9-A). Pur, testable, AUCUN I/O.
 *
 * Source de vérité : `src/assets/vignettes/manifest.ts` (généré par
 * `scripts/sync-vignettes.sh` depuis `teams.json` ; l'ordre des `roleIndex`
 * reflète teams.json : 0=portefeuille, 1=coordination, 2=cadrage, 3=dev,
 * 4=qualité…). Le résolveur renvoie l'URL d'asset Vite (servie en `'self'` →
 * CSP intacte) ou `null` (→ FALLBACK pastille `[ROYAUME][Agent]`, jamais
 * d'image cassée).
 *
 * `resolveVignette(charteKey, team, roleIndex)` :
 *   - `charteKey` = clé charte-app telle qu'embarquée dans le manifest
 *     (ex. `naonedge-dark`, `naonedge-light`) = le `theme` app courant ;
 *   - tolérant : si `charteKey` n'a pas de variante (`naonedge`), retombe sur
 *     `naonedge-dark` (variante par défaut) pour rester pratique côté test/API.
 */
import { VIGNETTES } from "../assets/vignettes/manifest";

/** Variante par défaut quand la clé de charte ne précise pas dark/light. */
const DEFAULT_VARIANT = "dark";

/** Valeur de team « aucune vignette » (pastilles texte seules). */
export const TEAM_NONE = "none";

/**
 * Normalise une clé de charte vers une clé du manifest : si la clé existe telle
 * quelle on la garde ; sinon, si elle ne contient pas de variante, on tente
 * `<charte>-<DEFAULT_VARIANT>`. Renvoie `null` si rien ne matche.
 */
function resolveCharteKey(charteKey: string): string | null {
  if (charteKey in VIGNETTES) return charteKey;
  if (!charteKey.includes("-")) {
    const withVariant = `${charteKey}-${DEFAULT_VARIANT}`;
    if (withVariant in VIGNETTES) return withVariant;
  }
  return null;
}

/**
 * Résout l'URL de la vignette d'un rôle pour `(charte, team, roleIndex)`.
 * Renvoie `null` (→ fallback pastille) si : team `none`/absente, charte non
 * embarquée, roleIndex hors manifest. JAMAIS d'exception.
 */
export function resolveVignette(
  charteKey: string,
  team: string,
  roleIndex: number,
): string | null {
  if (!team || team === TEAM_NONE) return null;
  const key = resolveCharteKey(charteKey);
  if (key === null) return null;
  const url = VIGNETTES[key]?.[team]?.[roleIndex];
  return url ?? null;
}

/** Teams réellement embarquées (présentes dans le manifest), toutes chartes confondues. */
export function embeddedTeams(): string[] {
  const set = new Set<string>();
  for (const charte of Object.keys(VIGNETTES)) {
    for (const team of Object.keys(VIGNETTES[charte])) set.add(team);
  }
  return Array.from(set).sort();
}
