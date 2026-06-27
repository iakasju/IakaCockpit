/**
 * teamAvatar.ts — fabrique le RÉSOLVEUR d'avatar par NOM d'agent (L9-A, reframé L11).
 *
 * Pont entre le nom d'agent affiché (`Aragorn`, `Gandalf`…) et le résolveur de
 * vignette `(charte, team, roleIndex)`. **L11** : le mapping nom→roleIndex ne dérive
 * plus de `DEMO_TEAM` global — il vient du **roster de la team du projet actif**
 * (agents → `roleIndex`), et le casting (`vignetteTeam`) est celui **de cette team**.
 * Pur, sans I/O.
 *
 * Construit dans `App` à partir de `settings.theme` (charte-app) + de la **team du
 * projet actif** (`team.vignetteTeam` + `team.agents`), puis passé EN PROP aux
 * composants présentationnels `Roster`/`Chat` (D7/D8 : pas d'accès config dans un
 * composant présentationnel). Renvoie une fonction qui, pour un nom d'agent, donne
 * l'URL d'asset ou `null` (→ fallback pastille `[ROYAUME][Agent]`).
 */
import { resolveVignette } from "./vignettes";

/** Résolveur d'avatar par nom d'agent : `(agent) => url | null`. */
export type AvatarResolver = (agent: string) => string | null;

/** Entrée minimale de roster pour le résolveur (nom + index de rôle/casting). */
export interface RosterEntry {
  name: string;
  roleIndex: number;
}

/**
 * Fabrique un résolveur lié à `(charte, vignetteTeam, roster)`. Le `roster` mappe
 * nom d'agent (lowercase) → `roleIndex`. Pour un agent absent du roster ou si la
 * vignette est absente (casting `none`/hors manifest) → `null` (fallback pastille).
 */
export function makeAvatarResolver(
  charteKey: string,
  vignetteTeam: string,
  roster: readonly RosterEntry[],
): AvatarResolver {
  const roleByAgent = new Map<string, number>(
    roster.map((m) => [m.name.toLowerCase(), m.roleIndex]),
  );
  return (agent: string): string | null => {
    const roleIndex = roleByAgent.get(agent.toLowerCase());
    if (roleIndex === undefined) return null;
    return resolveVignette(charteKey, vignetteTeam, roleIndex);
  };
}
