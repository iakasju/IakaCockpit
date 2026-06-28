/**
 * TeamsView — vue dédiée « Teams » (L13). Sort la gestion teams/agents/skills
 * (runner + modèle + skills PAR AGENT, L11) de Réglages et l'héberge en PLEINE PAGE.
 * Présentationnel : reçoit l'autorité `useTeams` en prop (comme SettingsView l'avait)
 * et la transmet à `TeamsEditor`. Aucun I/O direct ici — la persistance reste portée
 * par le hook `useTeams` (façade unique, D7).
 */
import { useTranslation } from "react-i18next";
import type { UseTeams } from "../hooks/useTeams";
import { TeamsEditor } from "../components/TeamsEditor";

export interface TeamsViewProps {
  /** Autorité des teams/agents (L11) — alimente l'éditeur « Teams & agents ». */
  teams: UseTeams;
  /** Charte active (L14) — résout les vignettes liste/fiche selon le casting édité. */
  theme?: string;
}

export function TeamsView({ teams, theme }: TeamsViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="view teams" aria-label={t("teams.ariaLabel")}>
      <div className="teamsmain">
        <TeamsEditor teams={teams} theme={theme} />
      </div>
    </section>
  );
}
