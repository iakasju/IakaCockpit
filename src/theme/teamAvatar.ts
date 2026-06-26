/**
 * teamAvatar.ts — fabrique le RÉSOLVEUR d'avatar par NOM d'agent (L9-A).
 *
 * Pont entre le nom d'agent affiché (`Aragorn`, `Gandalf`…) et le résolveur de
 * vignette `(charte, team, roleIndex)`. Le mapping nom→roleIndex vient de
 * `DEMO_TEAM` (`roleIndex` figé sur teams.json). Pur, sans I/O.
 *
 * Construit dans `App` à partir de `settings.theme` (charte-app) + `settings.team`,
 * puis passé EN PROP aux composants présentationnels `Roster`/`Chat` (D7/D8 : pas
 * d'accès config dans un composant présentationnel). Renvoie une fonction qui, pour
 * un nom d'agent, donne l'URL d'asset ou `null` (→ fallback pastille).
 */
import { resolveVignette } from "./vignettes";
import { DEMO_TEAM } from "../mock/demoTeam";

/** Résolveur d'avatar par nom d'agent : `(agent) => url | null`. */
export type AvatarResolver = (agent: string) => string | null;

/** Index `nom d'agent (lowercase) → roleIndex` dérivé une fois de DEMO_TEAM. */
const ROLE_BY_AGENT: ReadonlyMap<string, number> = new Map(
  DEMO_TEAM.map((m) => [m.agent.toLowerCase(), m.roleIndex]),
);

/**
 * Fabrique un résolveur lié à `(charte, team)`. Pour un agent inconnu de
 * DEMO_TEAM ou si la vignette est absente → `null` (fallback pastille).
 */
export function makeAvatarResolver(
  charteKey: string,
  team: string,
): AvatarResolver {
  return (agent: string): string | null => {
    const roleIndex = ROLE_BY_AGENT.get(agent.toLowerCase());
    if (roleIndex === undefined) return null;
    return resolveVignette(charteKey, team, roleIndex);
  };
}
