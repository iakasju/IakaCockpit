/**
 * Roster — widget TEAM (L8, D6). Présentationnel pur.
 *
 * Liste les 5 agents (`DEMO_TEAM`, AR-3) en pastilles `[ROYAUME][Agent]` (royaume
 * MAJUSCULE) avec un STATUT local MVP : « travaille » vs « attend » (idle). Le
 * responsable / interlocuteur courant est mis en évidence. Cliquer un agent →
 * callback `onPick(agent)` (insère `@agent:` côté saisie, D3/D6).
 *
 * Statut VIVANT (L10b/P3, § 6) : dérivé du **transcript** via `workingAgents`
 * (ensemble de noms minuscules issus des délégations — `deriveWorkingAgents`). Repli
 * L8 : à défaut, l'interlocuteur courant « travaille » si `pending`. PAS un flux
 * temps réel persistant (DEP-1). Aucun I/O ici (D8).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEMO_TEAM, type DemoTeamMember } from "../mock/demoTeam";
import type { AvatarResolver } from "../theme/teamAvatar";
import { isCanonicalRole } from "../theme/roles";

export interface RosterProps {
  /** Agents affichés (défaut = DEMO_TEAM, AR-3). */
  members?: readonly DemoTeamMember[];
  /** Interlocuteur courant (mis en évidence). */
  currentAgent: string;
  /** Un tour de chat est en vol (→ l'agent courant « travaille », repli L8). */
  pending: boolean;
  /**
   * Agents « au travail » dérivés du transcript (L10b/P3) — noms en MINUSCULES
   * (`deriveWorkingAgents`). Prime sur la logique `pending`/`currentAgent`. Absent →
   * repli L8 (seul l'agent courant travaille si `pending`).
   */
  workingAgents?: ReadonlySet<string>;
  /** Clic sur un agent → adresser directement (`@agent:`). */
  onPick: (agent: string) => void;
  /**
   * L31-P1 — lancer un agent comme SON runner réel (slot propre au projet), DISTINCT du
   * `@agent` (persona du chat). Absent → aucun bouton « lancer » (rétro-compat L8/tests).
   */
  onLaunch?: (agent: string) => void;
  /**
   * L31-P1 — agents dont le runner est EXÉCUTABLE (codex/claude-code), noms en
   * MINUSCULES. Un agent hors de cet ensemble a un runner **défini mais non câblé** →
   * bouton « lancer » désactivé (honnête). Absent → tous lançables (secours/tests).
   */
  launchableAgents?: ReadonlySet<string>;
  /**
   * Résolveur de vignette par nom d'agent (L9). `null`/absent → pastille seule
   * (rendu L8). JAMAIS d'image cassée : `onError` retombe aussi sur la pastille.
   */
  resolveAvatar?: AvatarResolver;
}

/** Vignette ronde d'un agent + fallback pastille si absente / chargement KO. */
function Avatar({ url, alt }: { url: string; alt: string }): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (broken) return <></>;
  return (
    <img
      className="ravatar"
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
    />
  );
}

export function Roster({
  members = DEMO_TEAM,
  currentAgent,
  pending,
  workingAgents,
  onPick,
  onLaunch,
  launchableAgents,
  resolveAvatar,
}: RosterProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <aside className="roster" aria-label={t("roster.ariaLabel")}>
      <div className="rosterhead">{t("roster.head")}</div>
      <ul className="rosterlist">
        {members.map((m) => {
          const isCurrent = m.agent.toLowerCase() === currentAgent.toLowerCase();
          // Statut vivant du transcript (L10b/P3) ; repli L8 = courant + pending.
          const working = workingAgents
            ? workingAgents.has(m.agent.toLowerCase())
            : isCurrent && pending;
          const status = working
            ? t("roster.statusWorking")
            : t("roster.statusIdle");
          // Rôle traduit s'il est canonique (`roles.*`) ; sinon valeur brute (teams L15).
          const roleText = isCanonicalRole(m.royaume)
            ? t(`roles.${m.royaume.toLowerCase()}`)
            : m.royaume;
          const avatarUrl = resolveAvatar?.(m.agent) ?? null;
          // L31-P1 — un agent est lançable si son runner est exécutable (ensemble fourni
          // par App) ; à défaut d'ensemble, on considère tout lançable (secours/tests).
          const launchable =
            !launchableAgents || launchableAgents.has(m.agent.toLowerCase());
          return (
            <li key={m.agent}>
              {/* L31-P1 — l'item et le bouton « lancer » sont deux boutons FRÈRES
                  (jamais imbriqués : button-in-button invalide). */}
              <button
                type="button"
                className={`rosteritem${isCurrent ? " current" : ""}`}
                aria-pressed={isCurrent}
                title={t("roster.addressTitle", { agent: m.agent })}
                onClick={() => onPick(m.agent)}
              >
                <span
                  className={`rstatus ${working ? "working" : "idle"}`}
                  aria-hidden
                />
                {avatarUrl && <Avatar url={avatarUrl} alt={m.agent} />}
                {/* Direction A : NOM en clair + RÔLE en label discret (petites
                    capitales), au lieu de la pastille [ROYAUME][Agent]. */}
                <span className="rmeta">
                  <span className="rname">{m.agent}</span>
                  <span className="rkingdom">{roleText}</span>
                </span>
                <span className="rstate">{status}</span>
              </button>
              {onLaunch && (
                <button
                  type="button"
                  className="rlaunch"
                  disabled={!launchable}
                  aria-label={
                    launchable
                      ? t("roster.launchTitle", { agent: m.agent })
                      : t("roster.launchDisabledTitle", { agent: m.agent })
                  }
                  title={
                    launchable
                      ? t("roster.launchTitle", { agent: m.agent })
                      : t("roster.launchDisabledTitle", { agent: m.agent })
                  }
                  onClick={() => onLaunch(m.agent)}
                >
                  ▶
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
