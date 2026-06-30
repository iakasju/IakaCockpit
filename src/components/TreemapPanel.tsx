/**
 * TreemapPanel — KPI « coût par projet & agent » de l'Étagère (L18 #5b). Présentationnel :
 * une treemap où chaque projet est dimensionné par ses tokens, et segmenté par la part de
 * chaque agent. Aucun I/O. Vide → placeholder honnête (l'agrégation CROSS-PROJET live est
 * un suivi backend ; ici on rend la donnée quand elle est fournie, démo incluse).
 */
import { useTranslation } from "react-i18next";

/** Coût d'un projet + répartition par agent. */
export interface TreemapItem {
  project: string;
  tokens: number;
  segments: { label: string; tokens: number }[];
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

const HUES = [210, 150, 270, 35, 0, 190];

export function TreemapPanel({ items }: { items: readonly TreemapItem[] }): JSX.Element {
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
        <div className="tmap">
          {items.map((it, i) => {
            const segTotal = it.segments.reduce((s, x) => s + x.tokens, 0) || 1;
            return (
              <div
                key={it.project}
                className="tcell"
                style={{
                  width: `${40 + (it.tokens / max) * 60}%`,
                  background: `hsl(${HUES[i % HUES.length]} 60% 55%)`,
                }}
                title={`${it.project} · ${fmtK(it.tokens)}`}
              >
                <span className="tnm">{it.project}</span>
                <span className="tv">
                  {fmtK(it.tokens)} · {Math.round((it.tokens / (total || 1)) * 100)}%
                </span>
                <span className="tseg" aria-hidden>
                  {it.segments.map((s, j) => (
                    <i
                      key={j}
                      style={{
                        width: `${(s.tokens / segTotal) * 100}%`,
                        opacity: 0.9 - j * 0.18,
                      }}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
