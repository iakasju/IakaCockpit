/**
 * MainCourante — colonne « main courante » de Portfolio (L4, ex-MainCouranteMock).
 *
 * BRANCHÉE sur iakaboxlogs via `useMainCourante` (D7). Présentationnel : consomme
 * l'état du hook (events/loading/error/degraded) ; aucun I/O direct. Conserve les
 * filtres de canaux (UX, `filterFeed`) du mock L2 et ajoute un filtre AGENT (filtre
 * serveur via `refresh({agent})`). En mode dégradé (box injoignable / non
 * configurée), affiche un bandeau explicite et retombe sur le mock (jamais de crash).
 */
import { useMemo, useState } from "react";
import { ALL_CANAUX, filterFeed, type Canal } from "../mock/feed";
import { useMainCourante } from "../hooks/useMainCourante";

const CANAL_LABEL: Record<Canal, string> = {
  adresse: "adresse",
  geste: "geste",
  pensee: "pensée",
  agent: "agent",
};

export function MainCourante(): JSX.Element {
  const mc = useMainCourante();

  // Aucun canal coché = tout visible (filtre OFF, UX testée — feed.test.ts).
  const [active, setActive] = useState<Set<Canal>>(() => new Set());
  // Filtre agent (serveur) : brouillon saisi puis appliqué via refresh.
  const [agentDraft, setAgentDraft] = useState<string>("");

  const toggle = (c: Canal): void => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const applyAgent = (): void => {
    const a = agentDraft.trim();
    void mc.refresh(a ? { agent: a } : undefined);
  };

  const events = useMemo(
    () => filterFeed(mc.events, active),
    [mc.events, active],
  );

  return (
    <aside className="mcleft" aria-label="Main courante">
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
        <div className="agentfilter">
          <input
            className="field sm"
            type="text"
            placeholder="filtrer par agent…"
            value={agentDraft}
            onChange={(e) => setAgentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyAgent();
            }}
            aria-label="Filtre par agent"
          />
          <button
            type="button"
            className="btn sm"
            onClick={applyAgent}
            disabled={mc.loading}
          >
            Filtrer
          </button>
        </div>
      </div>

      {mc.degraded && (
        <div className="mcnote degraded" role="status">
          <b>Mode dégradé</b> — iakaboxlogs injoignable, affichage de données
          simulées.
          {mc.error ? <span className="why"> ({mc.error})</span> : null}
        </div>
      )}

      {mc.loading && <div className="mcnote">Chargement de la main courante…</div>}

      <div className="feed">
        {!mc.loading && events.length === 0 && (
          <div className="mcnote">Aucun événement.</div>
        )}
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
