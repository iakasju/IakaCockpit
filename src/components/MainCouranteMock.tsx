/**
 * MainCouranteMock — colonne "main courante" de Portfolio (DEP-1).
 *
 * ⚠️ DONNÉES SIMULÉES — branchées en L4. Présentationnel : feed mocké
 * (`src/mock/feed.ts`) + filtres de canaux FONCTIONNELS sur le mock (UX testée
 * via `filterFeed`). Aucune commande backend appelée. Marqué « simulé · L4 ».
 */
import { useMemo, useState } from "react";
import {
  ALL_CANAUX,
  MOCK_FEED,
  filterFeed,
  type Canal,
} from "../mock/feed";

const CANAL_LABEL: Record<Canal, string> = {
  adresse: "adresse",
  geste: "geste",
  pensee: "pensée",
  agent: "agent",
};

export function MainCouranteMock(): JSX.Element {
  // Aucun canal coché = tout visible (filtre OFF).
  const [active, setActive] = useState<Set<Canal>>(() => new Set());

  const toggle = (c: Canal): void => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const events = useMemo(() => filterFeed(MOCK_FEED, active), [active]);

  return (
    <aside className="mcleft" aria-label="Main courante (simulée)">
      <div className="mchead">
        <h2>Main courante</h2>
        <div className="sub">3 canaux · adresse / geste / pensée</div>
        <div className="chanfilters" role="group" aria-label="Filtres de canaux">
          {ALL_CANAUX.map((c) => (
            <button
              key={c}
              type="button"
              className="cf"
              data-on={active.has(c) ? "1" : "0"}
              aria-pressed={active.has(c)}
              onClick={() => toggle(c)}
            >
              {CANAL_LABEL[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="mcnote">
        <b>Données simulées</b> — feed 3-canaux branché en L4 (iakaboxlogs).
      </div>
      <div className="feed">
        {events.map((e) => (
          <div key={e.id} className={`ev ${e.canal}`}>
            <span className="marker" aria-hidden />
            <div>
              <div className="top">
                <span className="who">{e.who}</span>
                <span className="pj">{e.project}</span>
                <span>{e.ts}</span>
              </div>
              <div className="bd">{e.body}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
