/**
 * demoTeam — TEAM iakaframe (mise en scène, PAS un runner d'agents).
 *
 * `DEMO_TEAM` = les **5 agents** de la team (AR-3) couvrant dispatch → cadrage →
 * dev → qualité. Royaume en MAJUSCULE. Facile à étendre (5→8).
 *
 * L7 : alimentait les **onglets** PTY au boot de démo. **L8 (D6/D7)** : `DEMO_TEAM`
 * alimente désormais le **widget roster** (pastilles `[ROYAUME][Agent]` + statut
 * attend/travaille, clic → `@agent`), plus les onglets. **Aucun agent réel n'est
 * lancé** : la mise en scène est visuelle ; le moteur d'agents 3-canaux reste DEP-1.
 *
 * Les helpers `teamTabTitle`/`teamTabProjectId` sont CONSERVÉS (compat, encore
 * utilisés par les tests team) mais ne servent plus à ouvrir 5 onglets en L8.
 */

/** Une entrée team : royaume (MAJUSCULE) + nom d'agent. */
export interface DemoTeamMember {
  royaume: string;
  agent: string;
}

/**
 * Les 5 onglets team de la démo (ordre = chaîne iakaframe). Constante figée :
 * le périmètre L7 est exactement ces 5 (AR-1).
 */
export const DEMO_TEAM: readonly DemoTeamMember[] = [
  { royaume: "PORTEFEUILLE", agent: "Odin" },
  { royaume: "ACCUEIL", agent: "Aragorn" },
  { royaume: "CADRAGE", agent: "Gandalf" },
  { royaume: "DEV", agent: "Gimli" },
  { royaume: "QUALITÉ", agent: "Legolas" },
] as const;

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
