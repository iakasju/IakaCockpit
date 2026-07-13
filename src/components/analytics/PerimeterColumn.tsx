/**
 * PerimeterColumn — colonne gauche « Périmètre » de la page Analytics (L30-P1, F2).
 * `ALL · portefeuille` en tête (somme) puis projets triés tokens desc avec barre de volume.
 * La sélection = scope de TOUTE la page. Présentationnel PUR : reçoit les entrées + le scope
 * courant, remonte le geste de sélection (aucun I/O ni tri ici — la dérivation est faite en
 * amont par `deriveAnalytics`).
 */
import { useTranslation } from "react-i18next";
import type { PerimeterEntry } from "../../hooks/useAnalytics";
import { fmtTokens } from "./format";

export function PerimeterColumn({
  entries,
  scope,
  onSelect,
}: {
  entries: readonly PerimeterEntry[];
  scope: string;
  onSelect: (id: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <aside className="projcol" aria-label={t("analytics.perimeter")}>
      <div className="pch">{t("analytics.perimeter")}</div>
      <div className="psub">{t("analytics.perimeterHint")}</div>
      {entries.map((e, i) => (
        <div key={e.id}>
          <button
            type="button"
            className={`pitem${e.isAll ? " all" : ""}${scope === e.id ? " on" : ""}`}
            aria-current={scope === e.id ? "true" : undefined}
            onClick={() => onSelect(e.id)}
          >
            <span className="pr1">
              <span className="pnm">{e.label}</span>
              <span className="ptok">{fmtTokens(e.tokens)}</span>
            </span>
            <span className="pbar" aria-hidden>
              <i style={{ width: `${e.barPct}%` }} />
            </span>
          </button>
          {/* Séparateur entre ALL et le 1ᵉʳ projet (calque mock `.psep`). */}
          {i === 0 && entries.length > 1 && <div className="psep" aria-hidden />}
        </div>
      ))}
    </aside>
  );
}
