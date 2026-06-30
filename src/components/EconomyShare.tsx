/**
 * EconomyShare — « Coordinateur vs délégués » (option a MVP, L18 #5b suite / retour terrain).
 * Présentationnel PUR : une barre segmentée + les chiffres de la part COORDINATEUR (tours
 * non-sidechain) vs DÉLÉGUÉS (fils sidechain), AGRÉGÉS sur les projets de la table (scope
 * partagé avec la treemap, AR-4). Donnée RÉELLE (`ProjectEconomy.coord/sub`, economy.rs) —
 * jamais inventée : si `coord+sub === 0`, empty-state honnête.
 *
 * Différé tracé : le coût par agent NOMMÉ (Aragorn/Gandalf… séparément) suppose la corrélation
 * sidechain→agent — c'est un incrément ULTÉRIEUR, NON implémenté ici.
 */
import { useTranslation } from "react-i18next";

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export interface EconomyShareProps {
  /** Tokens de sortie coordinateur (agrégé table). */
  coord: number;
  /** Tokens de sortie délégués (agrégé table). */
  sub: number;
}

export function EconomyShare({ coord, sub }: EconomyShareProps): JSX.Element {
  const { t } = useTranslation();
  const total = coord + sub;

  return (
    <div className="ecocard">
      <div className="ecoh">
        {t("portfolio.shareTitle")}
        {total > 0 && <span className="ecoht"> · {fmtK(total)}</span>}
      </div>
      {total === 0 ? (
        <p className="ecohint">{t("portfolio.shareEmpty")}</p>
      ) : (
        <>
          <div className="esbar" aria-hidden>
            <i className="es-main" style={{ width: `${(coord / total) * 100}%` }} />
            <i className="es-sub" style={{ width: `${(sub / total) * 100}%` }} />
          </div>
          <div className="ecosplit">
            <span className="es-main">
              {t("portfolio.shareCoord")} {fmtK(coord)} ·{" "}
              {Math.round((coord / total) * 100)}%
            </span>
            <span className="es-sub">
              {t("portfolio.shareDelegated")} {fmtK(sub)} ·{" "}
              {Math.round((sub / total) * 100)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
