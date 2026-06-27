/**
 * demoTeam — TEAM iakaframe (mise en scène + **GRAINE de la team par défaut** L11).
 *
 * `DEMO_TEAM` = les **5 agents** de la team (AR-3) couvrant dispatch → cadrage →
 * dev → qualité. Royaume en MAJUSCULE. Facile à étendre (5→8).
 *
 * L7 : alimentait les **onglets** PTY au boot de démo. **L8 (D6/D7)** : `DEMO_TEAM`
 * alimente le **widget roster** (pastilles `[ROYAUME][Agent]` + statut attend/travaille,
 * clic → `@agent`). **L11** : `DEMO_TEAM` n'est plus un mock figé — il devient la
 * **graine** de la team par défaut éditable (`useTeams` la convertit en `Team` si la
 * clé config `teams` est vide). Il reste un défaut de secours pour le roster hors team.
 *
 * Les helpers `teamTabTitle`/`teamTabProjectId` sont CONSERVÉS (compat, encore
 * utilisés par les tests team) mais ne servent plus à ouvrir 5 onglets en L8.
 */

/**
 * Une entrée team : royaume (MAJUSCULE) + nom d'agent + `roleIndex` (L9).
 *
 * `roleIndex` = index du RÔLE iakagraph (clé invariante de `teams.json`,
 * `~/work/iakagraph/specs/teams-casting.md`) : 0=portefeuille, 1=coordination,
 * 2=cadrage, 3=dev, 4=qualité, 5=production, 6=design, 7=doc. Sert à piquer le
 * bon slug dans la team choisie (résolveur de vignette). Les libellés `royaume`
 * d'affichage (B-1 : `ACCUEIL` etc.) sont CONSERVÉS — pas de bascule vers les
 * libellés de rôle iakagraph.
 */
export interface DemoTeamMember {
  royaume: string;
  agent: string;
  roleIndex: number;
}

/**
 * Les 5 agents team de la démo (ordre = chaîne iakaframe). Constante figée :
 * le périmètre L7 est exactement ces 5 (AR-1). `roleIndex` mappe vers teams.json.
 */
export const DEMO_TEAM: readonly DemoTeamMember[] = [
  { royaume: "PORTEFEUILLE", agent: "Odin", roleIndex: 0 },
  { royaume: "ACCUEIL", agent: "Aragorn", roleIndex: 1 },
  { royaume: "CADRAGE", agent: "Gandalf", roleIndex: 2 },
  { royaume: "DEV", agent: "Gimli", roleIndex: 3 },
  { royaume: "QUALITÉ", agent: "Legolas", roleIndex: 4 },
] as const;

/**
 * Skills (ids de skill-rôles iakaframe) par agent connu (AR-1, L11). Sert à peupler
 * `agent.skills` lors du bootstrap de la team par défaut. `gandalf` → `iakaframe-cadrage`
 * (skill de cadrage) ; `odin` → `iakaframe-odin` ; les autres → `iakaframe-<nom>`. Un
 * agent hors de cette table reçoit `[]` (agent créé / inconnu).
 */
export const SKILL_BY_AGENT: Readonly<Record<string, string[]>> = {
  odin: ["iakaframe-odin"],
  aragorn: ["iakaframe-aragorn"],
  gandalf: ["iakaframe-cadrage"],
  gimli: ["iakaframe-gimli"],
  legolas: ["iakaframe-legolas"],
  loki: ["iakaframe-loki"],
  nathalie: ["iakaframe-nathalie"],
  helm: ["iakaframe-helm"],
};

/** Skills connus d'un agent par nom (insensible à la casse) ; `[]` si inconnu. */
export function skillsForAgent(name: string): string[] {
  return [...(SKILL_BY_AGENT[name.toLowerCase()] ?? [])];
}

/** Pastille `[ROYAUME][Agent]` (royaume MAJUSCULE) d'un membre team (roster L8). */
export function teamBadge(member: DemoTeamMember): string {
  return `[${member.royaume}][${member.agent}]`;
}

/** Titre d'onglet `[ROYAUME][Agent]` (royaume MAJUSCULE) pour un membre team. */
export function teamTabTitle(member: DemoTeamMember): string {
  return teamBadge(member);
}

/** Id de projet logique des onglets team (un par membre, distinct du dossier démo). */
export function teamTabProjectId(member: DemoTeamMember): string {
  return `demo-team-${member.agent.toLowerCase()}`;
}
