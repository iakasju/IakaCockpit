/**
 * demoTeam — TEAM iakaframe (mise en scène + **GRAINE de la team par défaut** L11).
 *
 * `DEMO_TEAM` = les **7 agents** de la team, **un par rôle canonique** (`AGENT_ROLES`,
 * décision Stéphane) : portefeuille→Odin, coordination→Aragorn, architecture→Gandalf,
 * fabrication→Gimli, tests→Legolas, graphisme→Loki, doc→Nathalie. Le `royaume` porte
 * la clé de rôle (la fonction), distincte du nom (persona).
 *
 * L7 : alimentait les **onglets** PTY au boot de démo. **L8 (D6/D7)** : `DEMO_TEAM`
 * alimente le **widget roster** (statut attend/travaille, clic → `@agent`). **L11** :
 * `DEMO_TEAM` n'est plus un mock figé — il devient la **graine** de la team par défaut
 * éditable (`useTeams` la convertit en `Team` si la clé config `teams` est vide). Il
 * reste un défaut de secours pour le roster hors team.
 *
 * Les helpers `teamTabTitle`/`teamTabProjectId` sont CONSERVÉS (compat, encore
 * utilisés par les tests team) mais ne servent plus à ouvrir des onglets en L8.
 */
import { AGENT_ROLES } from "../theme/roles";

/**
 * Une entrée team : royaume (= CLÉ DE RÔLE canonique) + nom d'agent + `roleIndex`.
 *
 * `royaume` porte la **clé de rôle** (`AGENT_ROLES` : portefeuille, coordination,
 * architecture, fabrication, tests, graphisme, doc) — le rôle est la FONCTION,
 * distincte du nom (persona). `roleIndex` = position du rôle (0..6), clé invariante
 * qui pioche le slug du casting (résolveur de vignette). L'affichage uppercase le
 * royaume (badge) ou prend le libellé du rôle (menu).
 */
export interface DemoTeamMember {
  royaume: string;
  agent: string;
  roleIndex: number;
}

/**
 * La team iakaframe par défaut : **7 agents, un par rôle canonique** (décision
 * Stéphane). Ordre = `roleIndex` 0..6 ; `royaume` = clé du rôle (AGENT_ROLES).
 * Coordinateur par défaut = Aragorn (coordination, roleIndex 1).
 */
export const DEMO_TEAM: readonly DemoTeamMember[] = [
  { royaume: AGENT_ROLES[0].key, agent: "Odin", roleIndex: 0 }, // portefeuille
  { royaume: AGENT_ROLES[1].key, agent: "Aragorn", roleIndex: 1 }, // coordination
  { royaume: AGENT_ROLES[2].key, agent: "Gandalf", roleIndex: 2 }, // architecture
  { royaume: AGENT_ROLES[3].key, agent: "Gimli", roleIndex: 3 }, // fabrication
  { royaume: AGENT_ROLES[4].key, agent: "Legolas", roleIndex: 4 }, // tests
  { royaume: AGENT_ROLES[5].key, agent: "Loki", roleIndex: 5 }, // graphisme
  { royaume: AGENT_ROLES[6].key, agent: "Nathalie", roleIndex: 6 }, // doc
] as const;

/**
 * Skills (ids de skill-rôles iakaframe) par agent connu. Sert à peupler
 * `agent.skills` lors du bootstrap de la team par défaut. Un agent hors de cette
 * table reçoit `[]`. `gimli` = `[]` (pas de skill-rôle dédié — fabrication générique).
 */
export const SKILL_BY_AGENT: Readonly<Record<string, string[]>> = {
  odin: ["iakaframe-odin"],
  aragorn: ["iakaframe-aragorn"],
  gandalf: ["iakaframe-cadrage"],
  gimli: [],
  legolas: ["iakaframe-qualite"],
  loki: ["iakaframe-naonedge"],
  nathalie: ["iakaframe-nathalie"],
  helm: ["iakaframe-helm"],
};

/** Skills connus d'un agent par nom (insensible à la casse) ; `[]` si inconnu. */
export function skillsForAgent(name: string): string[] {
  return [...(SKILL_BY_AGENT[name.toLowerCase()] ?? [])];
}

/** Pastille `[ROYAUME][Agent]` (royaume MAJUSCULE) d'un membre team (roster L8).
 * Le royaume stocke la clé de rôle (minuscule) → on uppercase pour le badge. */
export function teamBadge(member: DemoTeamMember): string {
  return `[${member.royaume.toUpperCase()}][${member.agent}]`;
}

/** Titre d'onglet `[ROYAUME][Agent]` (royaume MAJUSCULE) pour un membre team. */
export function teamTabTitle(member: DemoTeamMember): string {
  return teamBadge(member);
}

/** Id de projet logique des onglets team (un par membre, distinct du dossier démo). */
export function teamTabProjectId(member: DemoTeamMember): string {
  return `demo-team-${member.agent.toLowerCase()}`;
}
