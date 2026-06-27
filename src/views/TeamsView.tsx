/**
 * TeamsView — vue dédiée « Teams » (L13). Sort la gestion teams/agents/skills
 * (runner + modèle + skills PAR AGENT, L11) de Réglages et l'héberge en PLEINE PAGE.
 * Présentationnel : reçoit l'autorité `useTeams` en prop (comme SettingsView l'avait)
 * et la transmet à `TeamsEditor`. Aucun I/O direct ici — la persistance reste portée
 * par le hook `useTeams` (façade unique, D7).
 */
import type { UseTeams } from "../hooks/useTeams";
import { TeamsEditor } from "../components/TeamsEditor";

export interface TeamsViewProps {
  /** Autorité des teams/agents (L11) — alimente l'éditeur « Teams & agents ». */
  teams: UseTeams;
}

export function TeamsView({ teams }: TeamsViewProps): JSX.Element {
  return (
    <section className="view teams" aria-label="Teams">
      <div className="teamsmain">
        <TeamsEditor teams={teams} />
      </div>
    </section>
  );
}
