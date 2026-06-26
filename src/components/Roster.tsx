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
import { DEMO_TEAM, teamBadge, type DemoTeamMember } from "../mock/demoTeam";

export interface RosterProps {
  /** Agents affichés (défaut = DEMO_TEAM, AR-3). */
  members?: readonly DemoTeamMember[];
  /** Interlocuteur courant (mis en évidence). */
  currentAgent: string;
  /** Un tour de chat est en vol (→ l'agent courant « travaille »). */
  pending: boolean;
  /** Clic sur un agent → adresser directement (`@agent:`). */
  onPick: (agent: string) => void;
}

export function Roster({
  members = DEMO_TEAM,
  currentAgent,
  pending,
  onPick,
}: RosterProps): JSX.Element {
  return (
    <aside className="roster" aria-label="Team iakaframe">
      <div className="rosterhead">Team</div>
      <ul className="rosterlist">
        {members.map((m) => {
          const isCurrent = m.agent.toLowerCase() === currentAgent.toLowerCase();
          const working = isCurrent && pending;
          const status = working ? "travaille" : "attend";
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
