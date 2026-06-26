/**
 * demoTeam — MISE EN SCÈNE DÉMO (L7), PAS un runner d'agents.
 *
 * Liste des onglets « team » ouverts au boot de démo (build dev uniquement, gardé
 * par le flag côté Rust + `useDemoSeed`). Chaque entrée donne un **onglet PTY = un
 * shell nu** dont le TITRE porte `[ROYAUME][Agent]` — une mise en scène visuelle de
 * la team iakaframe, **aucun agent réel n'est lancé** (le runner autonome est
 * explicitement HORS lot L7 ; le titrage `[ROYAUME][Agent]` lié au moteur d'agents
 * 3-canaux reste DEP-2 depuis L2).
 *
 * AR-1 (TRANCHÉ par Stéphane) : **5 agents** couvrant dispatch → cadrage → dev →
 * qualité. Royaume en MAJUSCULE. Facile à étendre (5→8) si besoin futur.
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

/** Titre d'onglet `[ROYAUME][Agent]` (royaume MAJUSCULE) pour un membre team. */
export function teamTabTitle(member: DemoTeamMember): string {
  return `[${member.royaume}][${member.agent}]`;
}

/** Id de projet logique des onglets team (un par membre, distinct du dossier démo). */
export function teamTabProjectId(member: DemoTeamMember): string {
  return `demo-team-${member.agent.toLowerCase()}`;
}
