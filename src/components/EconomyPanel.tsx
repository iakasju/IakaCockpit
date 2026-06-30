/**
 * EconomyPanel — HUD « économie du tour » (L18 #5, variante sparkline). Présentationnel :
 * une sparkline des tokens de SORTIE par tour + les totaux (entrée/sortie), avec le split
 * coordinateur vs sous-agents délégués (donnée honnête via `sidechain`). Aucun I/O.
 *
 * NB : la « multi-ligne par agent NOMMÉ » du mock demande la corrélation sidechain→agent
 * (différée) ; ici on expose la donnée réellement disponible sans rien inventer.
 */
import { useTranslation } from "react-i18next";
import type { EcoPoint } from "../hooks/useEconomy";

export interface EconomyPanelProps {
  series: readonly EcoPoint[];
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function EconomyPanel({ series }: EconomyPanelProps): JSX.Element {
  const { t } = useTranslation();
  const W = 260;
  const H = 48;

  const outTotal = series.reduce((s, p) => s + p.output, 0);
  const inTotal = series.reduce((s, p) => s + p.input, 0);
  const outMain = series.reduce((s, p) => s + (p.sidechain ? 0 : p.output), 0);
  const outSub = outTotal - outMain;
  const max = series.reduce((m, p) => Math.max(m, p.output), 1);

  // Multi-ligne (décision mock) : UNE courbe par canal d'agent — coordinateur (tours
  // principaux) vs délégués (fils sidechain). Chaque courbe relie ses propres tours, sur
  // l'axe de temps commun (index global). Le « par agent NOMMÉ » complet = corrélation
  // sidechain→agent, différée.
  const lineFor = (sidechain: boolean): string =>
    series.length > 1
      ? series
          .map((p, i) =>
            p.sidechain === sidechain
              ? `${((i / (series.length - 1)) * W).toFixed(1)},${(
                  H -
                  (p.output / max) * (H - 4) -
                  2
                ).toFixed(1)}`
              : null,
          )
          .filter((s): s is string => s !== null)
          .join(" ")
      : "";
  const coordLine = lineFor(false);
  const subLine = lineFor(true);

  return (
    <section className="ecopanel" aria-label={t("economy.ariaLabel")}>
      <div className="ecoph">
        <span className="ecopt">{t("economy.title")}</span>
        {series.length > 0 && (
          <span className="ecopv">{t("economy.turns", { count: series.length })}</span>
        )}
      </div>
      {series.length === 0 ? (
        <p className="ecoempty">{t("economy.empty")}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden>
            {subLine && (
              <polyline
                className="ecoline es-sub"
                fill="none"
                points={subLine}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {coordLine && (
              <polyline
                className="ecoline es-main"
                fill="none"
                points={coordLine}
                strokeWidth={1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="ecostats">
            <span>
              <b>{fmt(outTotal)}</b> {t("economy.out")}
            </span>
            <span>
              <b>{fmt(inTotal)}</b> {t("economy.in")}
            </span>
          </div>
          <div className="ecosplit">
            <span className="es-main">
              {t("economy.coord")} {fmt(outMain)}
            </span>
            <span className="es-sub">
              {t("economy.delegated")} {fmt(outSub)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
