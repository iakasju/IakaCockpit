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
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ALL_CANAUX, filterFeed, type Canal } from "../mock/feed";
import { useMainCourante } from "../hooks/useMainCourante";

/** Libellé i18n d'un canal. */
function canalLabel(c: Canal, t: TFunction): string {
  const key = {
    adresse: "journal.canalAdresse",
    geste: "journal.canalGeste",
    pensee: "journal.canalPensee",
    agent: "journal.canalAgent",
  }[c];
  return t(key);
}

export function MainCourante(): JSX.Element {
  const { t } = useTranslation();
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
    <aside className="mcleft" aria-label={t("journal.ariaLabel")}>
      <div className="mchead">
        <span className="eyebrow">{t("journal.eyebrow")}</span>
        <h2>{t("journal.title")}</h2>
        <div className="sub">
          <Trans i18nKey="journal.sub" components={[<b />, <b />, <b />]} />
        </div>
        {/* Direction A : UNE rangée — [Tous] [● adresse] [● geste] [● pensée] [● agent]
            + recherche en flex-grow. Le canal est porté par la couleur du point. */}
        <div
          className="chanfilters"
          role="group"
          aria-label={t("journal.filtersAria")}
        >
          <button
            type="button"
            className="cf"
            data-on={active.size === 0 ? "1" : "0"}
            aria-pressed={active.size === 0}
            onClick={() => setActive(new Set())}
          >
            {t("journal.filterAll")}
          </button>
          {ALL_CANAUX.map((c) => (
            <button
              key={c}
              type="button"
              className="cf"
              data-on={active.has(c) ? "1" : "0"}
              aria-pressed={active.has(c)}
              onClick={() => toggle(c)}
            >
              <span className={`cfdot ${c}`} aria-hidden />
              {canalLabel(c, t)}
            </button>
          ))}
          <input
            className="cfsearch"
            type="text"
            placeholder={t("journal.searchPlaceholder")}
            value={agentDraft}
            onChange={(e) => setAgentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyAgent();
            }}
            aria-label={t("journal.searchAria")}
          />
        </div>
      </div>

      {mc.degraded && (
        <div className="mcnote degraded" role="status">
          <b>{t("journal.degradedStrong")}</b>
          {t("journal.degraded")}
          {mc.error ? (
            <span className="why">{t("journal.degradedWhy", { error: mc.error })}</span>
          ) : null}
        </div>
      )}

      {mc.loading && <div className="mcnote">{t("journal.loading")}</div>}

      <div className="feed">
        {!mc.loading && events.length === 0 && (
          <div className="mcnote">{t("journal.empty")}</div>
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
