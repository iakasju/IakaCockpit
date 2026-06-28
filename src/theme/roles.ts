/**
 * roles.ts — LISTE CANONIQUE FERMÉE des 7 rôles d'agent (décision Stéphane).
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

/** Les 7 rôles canoniques, dans l'ordre des `roleIndex` (0→6). */
export const AGENT_ROLES: readonly AgentRole[] = [
  { key: "portefeuille", label: "Portefeuille", roleIndex: 0 },
  { key: "coordination", label: "Coordination", roleIndex: 1 },
  { key: "architecture", label: "Architecture", roleIndex: 2 },
  { key: "fabrication", label: "Fabrication", roleIndex: 3 },
  { key: "tests", label: "Tests", roleIndex: 4 },
  { key: "graphisme", label: "Graphisme", roleIndex: 5 },
  { key: "doc", label: "Doc", roleIndex: 6 },
] as const;

/** Clés des 7 rôles canoniques (ordre `roleIndex`). */
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
