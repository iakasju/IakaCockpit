/**
 * Roster — widget TEAM (L8, D6). Présentationnel pur.
 *
 * Liste les 5 agents (`DEMO_TEAM`, AR-3) en pastilles `[ROYAUME][Agent]` (royaume
 * MAJUSCULE) avec un STATUT local MVP : « travaille » (un tour de chat le concerne
 * est en vol) vs « attend » (idle). Le responsable / interlocuteur courant est mis
 * en évidence. Cliquer un agent → callback `onPick(agent)` (insère `@agent:` côté
 * saisie, D3/D6).
 *
 * Statut = état LOCAL MVP (dérivé de `pending` + `currentAgent`), PAS un flux temps
 * réel (DEP-1). Aucun I/O ici (D8).
 */
import { useState } from "react";
import { DEMO_TEAM, teamBadge, type DemoTeamMember } from "../mock/demoTeam";
import type { AvatarResolver } from "../theme/teamAvatar";

export interface RosterProps {
  /** Agents affichés (défaut = DEMO_TEAM, AR-3). */
  members?: readonly DemoTeamMember[];
  /** Interlocuteur courant (mis en évidence). */
  currentAgent: string;
  /** Un tour de chat est en vol (→ l'agent courant « travaille »). */
  pending: boolean;
  /** Clic sur un agent → adresser directement (`@agent:`). */
  onPick: (agent: string) => void;
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
  onPick,
  resolveAvatar,
}: RosterProps): JSX.Element {
  return (
    <aside className="roster" aria-label="Team iakaframe">
      <div className="rosterhead">Team</div>
      <ul className="rosterlist">
        {members.map((m) => {
          const isCurrent = m.agent.toLowerCase() === currentAgent.toLowerCase();
          const working = isCurrent && pending;
          const status = working ? "travaille" : "attend";
          const avatarUrl = resolveAvatar?.(m.agent) ?? null;
          return (
            <li key={m.agent}>
              <button
                type="button"
                className={`rosteritem${isCurrent ? " current" : ""}`}
                aria-pressed={isCurrent}
                title={`S'adresser à ${m.agent} (@${m.agent})`}
                onClick={() => onPick(m.agent)}
              >
                <span
                  className={`rstatus ${working ? "working" : "idle"}`}
                  aria-hidden
                />
                {avatarUrl && <Avatar url={avatarUrl} alt={m.agent} />}
                {/* Pastille [ROYAUME][Agent] CONSERVÉE (identité iakaframe, légende). */}
                <span className="rbadge">{teamBadge(m)}</span>
                <span className="rstate">{status}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
