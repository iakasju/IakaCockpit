/**
 * format — helpers d'affichage PURS pour les widgets Analytics (L30-P1). Formats FR
 * (séparateur virgule) calqués sur les mocks `analytics/v1..v4.html`. Aucun I/O.
 */

/** Tokens : `1,42 M` / `984 k` / `312`. */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

/** Coût $ : `$11,64`. `0` = local gratuit → `$0`. */
export function fmtCost(n: number): string {
  return `$${n.toFixed(2).replace(".", ",")}`;
}

/** Pourcentage entier depuis une part 0..1 : `31 %`. */
export function fmtPct(share: number): string {
  return `${Math.round(share * 100)} %`;
}

/** Étiquette de plage lisible depuis deux bornes ms (ex. `6 juil. → 13 juil.`). */
export function fmtRangeLabel(fromMs: number, toMs: number, locale: string): string {
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const f = new Intl.DateTimeFormat(locale, opt).format(new Date(fromMs));
  const t = new Intl.DateTimeFormat(locale, opt).format(new Date(toMs));
  return `${f} → ${t}`;
}
