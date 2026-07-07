/**
 * TeamsView — vue dédiée « Teams » (L13). Sort la gestion teams/agents/skills
 * (runner + modèle + skills PAR AGENT, L11) de Réglages et l'héberge en PLEINE PAGE.
 * Présentationnel : reçoit l'autorité `useTeams` en prop (comme SettingsView l'avait)
 * et la transmet à `TeamsEditor`. Aucun I/O direct ici — la persistance reste portée
 * par le hook `useTeams` (façade unique, D7).
 *
 * H1 — RÉCEPTION de handoff : héberge aussi le panneau `HandoffReception` (import d'une team
 * livrée par la forge + anti-dérive). Le hook `useHandoff` reçoit l'`upsertTeam` BRUT (import
 * non destructif). Les écritures d'ÉDITION transmises à `TeamsEditor` sont ENVELOPPÉES pour
 * marquer `localEdits` sur une team réceptionnée (badge « modifié localement ») — sans toucher
 * l'éditeur (L11) : le wrapping vit ici, à la frontière du conteneur.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UseTeams } from "../hooks/useTeams";
import { useHandoff } from "../hooks/useHandoff";
import { TeamsEditor } from "../components/TeamsEditor";
import { HandoffReception } from "../components/HandoffReception";

export interface TeamsViewProps {
  /** Autorité des teams/agents (L11) — alimente l'éditeur « Teams & agents ». */
  teams: UseTeams;
  /** Charte active (L14) — résout les vignettes liste/fiche selon le casting édité. */
  theme?: string;
}

export function TeamsView({ teams, theme }: TeamsViewProps): JSX.Element {
  const { t } = useTranslation();

  // Réception : import NON destructif → `upsertTeam` BRUT (ne marque jamais localEdits).
  const handoff = useHandoff({ importTeam: teams.upsertTeam });

  // Éditeur : écritures enveloppées → toute édition d'une team réceptionnée marque localEdits.
  const editableTeams = useMemo<UseTeams>(() => {
    const mark = (teamId: string) => {
      void handoff.markLocalEdit(teamId);
    };
    return {
      ...teams,
      upsertTeam: async (team) => {
        await teams.upsertTeam(team);
        mark(team.id);
      },
      upsertAgent: async (teamId, agent) => {
        await teams.upsertAgent(teamId, agent);
        mark(teamId);
      },
      removeAgent: async (teamId, agentId) => {
        await teams.removeAgent(teamId, agentId);
        mark(teamId);
      },
      setCoordinator: async (teamId, agentId) => {
        await teams.setCoordinator(teamId, agentId);
        mark(teamId);
      },
    };
  }, [teams, handoff]);

  return (
    <section className="view teams" aria-label={t("teams.ariaLabel")}>
      <div className="teamsmain">
        <TeamsEditor teams={editableTeams} theme={theme} />
        <HandoffReception handoff={handoff} />
      </div>
    </section>
  );
}
