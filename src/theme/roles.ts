/**
 * roles.ts — LISTE CANONIQUE des rôles d'agent, ALIGNÉE sur le réservoir iakaframe.
 *
 * Le **rôle** d'un agent = sa fonction (portefeuille, coordination, …), DISTINCT de
 * son **nom** (persona : Odin, Aragorn…). L'ordre = `roleIndex` (0→6), invariant qui
 * pioche la vignette du casting (résolveur `resolveVignette`). Le champ « Royaume » de
 * l'éditeur Teams stocke la **clé** de rôle ; l'affichage uppercase (badge) ou le
 * libellé capitalisé (menu) en découlent. Source unique réutilisée partout (éditeur +
 * casting démo).
 */

export interface AgentRole {
  /** Clé canonique, stockée dans `agent.royaume` (ex. "portefeuille"). */
  key: string;
  /** Libellé d'affichage capitalisé (menu de l'éditeur). */
  label: string;
  /** Index de rôle (0..6) = position dans la liste = clé vignette. */
  roleIndex: number;
}

/**
 * Les rôles canoniques, dans l'ordre des `roleIndex`.
 *
 * Les 7 premiers (0→6) sont INCHANGÉS : leur `roleIndex` pioche la vignette du casting et
 * leur `key` est PERSISTÉE dans les teams de l'utilisateur — les renommer casserait les
 * deux. Les 3 derniers (7→9) comblent l'écart constaté avec le réservoir, qui compte
 * 10 personas là où le Cockpit n'en portait que 7 (`charon`, `helm`, `feanor` manquaient).
 *
 * Ils prennent la clé du réservoir VERBATIM (`deploiement`, `surveillance`, `frame`) : pour
 * des rôles neufs, aucune raison d'inventer un second vocabulaire — c'est justement ce qui
 * a produit la divergence sur les 5 autres (cf. `RESERVOIR_ROLE_ALIAS`).
 *
 * Vignettes : le casting iakagraph n'a que 8 emplacements (0..7). `deploiement` en a donc
 * une, `surveillance` et `frame` retombent sur la **pastille** — repli documenté de L9,
 * jamais d'image cassée. Les doter d'une vignette suppose une mise à jour d'iakagraph,
 * hors de ce dépôt.
 */
export const AGENT_ROLES: readonly AgentRole[] = [
  { key: "portefeuille", label: "Portefeuille", roleIndex: 0 },
  { key: "coordination", label: "Coordination", roleIndex: 1 },
  { key: "architecture", label: "Architecture", roleIndex: 2 },
  { key: "fabrication", label: "Fabrication", roleIndex: 3 },
  { key: "tests", label: "Tests", roleIndex: 4 },
  { key: "graphisme", label: "Graphisme", roleIndex: 5 },
  { key: "doc", label: "Doc", roleIndex: 6 },
  { key: "deploiement", label: "Déploiement", roleIndex: 7 },
  { key: "surveillance", label: "Surveillance", roleIndex: 8 },
  { key: "frame", label: "Frame", roleIndex: 9 },
] as const;

/**
 * Correspondance `roleKey` du réservoir → clé de rôle du Cockpit.
 *
 * Pourquoi une table plutôt qu'un renommage : les deux vocabulaires ont divergé sur
 * **5 des 7** rôles historiques (`cadrage`/architecture, `dev`/fabrication,
 * `qualite`/tests, `design`/graphisme, `documentation`/doc). Renommer côté Cockpit
 * casserait les teams déjà persistées (la clé est stockée dans `agent.royaume`) et la
 * résolution des vignettes. La table absorbe l'écart sans migration ; les 3 rôles neufs
 * n'y figurent pas puisqu'ils portent déjà la clé du réservoir.
 */
export const RESERVOIR_ROLE_ALIAS: Readonly<Record<string, string>> = {
  cadrage: "architecture",
  dev: "fabrication",
  qualite: "tests",
  design: "graphisme",
  documentation: "doc",
};

/**
 * Traduit une `roleKey` du réservoir en clé de rôle du Cockpit. Une clé inconnue est
 * rendue TELLE QUELLE : `roleLabel` est tolérant, et un rôle non prévu doit rester
 * visible plutôt que disparaître silencieusement.
 */
export function roleKeyFromReservoir(reservoirKey: string): string {
  const k = (reservoirKey || "").toLowerCase();
  return RESERVOIR_ROLE_ALIAS[k] ?? k;
}

/** Clés des rôles canoniques (ordre `roleIndex`). */
export const AGENT_ROLE_KEYS: readonly string[] = AGENT_ROLES.map((r) => r.key);

/** Un royaume correspond-il à un rôle canonique ? (insensible à la casse). */
export function isCanonicalRole(royaume: string): boolean {
  const k = royaume.toLowerCase();
  return AGENT_ROLES.some((r) => r.key === k);
}

/**
 * Libellé d'affichage d'un royaume : le label du rôle canonique s'il en est un,
 * sinon la valeur telle quelle (tolérant : royaumes hors-liste des teams L15).
 */
export function roleLabel(royaume: string): string {
  const k = royaume.toLowerCase();
  return AGENT_ROLES.find((r) => r.key === k)?.label ?? royaume;
}
