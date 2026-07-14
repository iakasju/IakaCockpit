/**
 * TreemapPanel — KPI « coût par projet & agent » de l'Étagère (L18 #5b). Présentationnel :
 * une treemap où chaque projet est dimensionné par ses tokens, et segmenté par la part de
 * chaque agent. Aucun I/O. Vide → placeholder honnête (l'agrégation CROSS-PROJET live est
 * un suivi backend ; ici on rend la donnée quand elle est fournie, démo incluse).
 */
import { useTranslation } from "react-i18next";
import { treemapColor } from "./treemapColor";

/** Coût d'un projet + répartition par agent. */
export interface TreemapItem {
  project: string;
  tokens: number;
  segments: { label: string; tokens: number }[];
  /** Tokens de SORTIE du coordinateur (tours non-sidechain) — porté par `ProjectEconomy.coord`
   *  (economy.rs). Optionnel : alimente le panneau « Coordinateur vs délégués » (la treemap
   *  elle-même n'en a pas besoin et l'ignore). */
  coord?: number;
  /** Tokens de SORTIE des délégués (fils sidechain) — `ProjectEconomy.sub`. */
  sub?: number;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function TreemapPanel({
  items,
  onOpenInWork,
}: {
  items: readonly TreemapItem[];
  /**
   * L16-F2 — double-clic sur une cellule : ouvre le projet dans Travail (au premier plan).
   * Présentationnel PUR : le composant se contente de REMONTER le geste ; App fait l'I/O.
   */
  onOpenInWork?: (project: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const total = items.reduce((s, it) => s + it.tokens, 0);
  const max = items.reduce((m, it) => Math.max(m, it.tokens), 1);

  return (
    <div className="ecocard">
      <div className="ecoh">
        {t("portfolio.economyCardTitle")}
        {total > 0 && <span className="ecoht"> · {fmtK(total)}</span>}
      </div>
      {items.length === 0 ? (
        <>
          <div className="ecoskel" aria-hidden>
            <i style={{ width: "58%" }} />
            <i style={{ width: "39%" }} />
            <i style={{ width: "46%" }} />
          </div>
          <p className="ecohint">{t("portfolio.economyPlaceholder")}</p>
        </>
      ) : (
        // Corps scrollable (retour terrain) : depuis le « tout garder » (plus de troncature
        // top-8), la mosaïque peut s'allonger et pousser le rail. On borne sa hauteur visible
        // et on scrolle pour voir le surplus — la donnée n'est JAMAIS tronquée.
        <div className="ecobody">
          {/* SILHOUETTE MOSAÏQUE 2D (calque mock `portefeuille.html` + `viz.css` .tmap) :
              cellules en flex-wrap, largeur % ∝ part de tokens (surface ∝ tokens). */}
          <div className="tmap">
            {items.map((it, i) => {
              const segTotal = it.segments.reduce((s, x) => s + x.tokens, 0) || 1;
              return (
                <div
                  key={it.project}
                  className="tcell"
                  style={{
                    // ∝ tokens (borné 34–64 % pour rester lisible ET wrapper en mosaïque).
                    width: `${34 + (it.tokens / max) * 30}%`,
                    background: treemapColor(i),
                    ...(onOpenInWork ? { cursor: "pointer" } : {}),
                  }}
                  title={
                    onOpenInWork
                      ? `${it.project} · ${fmtK(it.tokens)} · ${t("portfolio.treemapOpenHint")}`
                      : `${it.project} · ${fmtK(it.tokens)}`
                  }
                  // L16-F2 + a11y clavier (polish P3) : quand la cellule est activable,
                  // elle devient un contrôle focusable/déclenchable au clavier (Enter/Espace
                  // = même geste que le double-clic). Le comportement souris est inchangé.
                  role={onOpenInWork ? "button" : undefined}
                  tabIndex={onOpenInWork ? 0 : undefined}
                  aria-label={
                    onOpenInWork
                      ? t("portfolio.treemapCellAria", {
                          project: it.project,
                          value: fmtK(it.tokens),
                        })
                      : undefined
                  }
                  onDoubleClick={
                    onOpenInWork ? () => onOpenInWork(it.project) : undefined
                  }
                  onKeyDown={
                    onOpenInWork
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenInWork(it.project);
                          }
                        }
                      : undefined
                  }
                >
                  <span className="tnm">{it.project}</span>
                  <span className="tv">
                    {fmtK(it.tokens)} · {Math.round((it.tokens / (total || 1)) * 100)}%
                  </span>
                  {/* Segments en PILULE (Loki P1-2) : butés bord-à-bord, part par agent. */}
                  <span className="tseg" aria-hidden>
                    {it.segments.map((s, j) => (
                      <i
                        key={j}
                        style={{
                          width: `${(s.tokens / segTotal) * 100}%`,
                          background: `color-mix(in srgb, #fff ${Math.round(
                            (0.9 - j * 0.18) * 100,
                          )}%, transparent)`,
                        }}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Légende treemap (Loki P1-3) : pastille couleur + nom projet + note de lecture. */}
          <div className="legend2">
            {items.map((it, i) => (
              <span key={it.project}>
                <i style={{ background: treemapColor(i) }} />
                {it.project}
              </span>
            ))}
            <span className="legend2note">{t("portfolio.treemapLegendNote")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
