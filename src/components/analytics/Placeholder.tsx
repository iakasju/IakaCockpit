/**
 * Placeholder — empty-state HONNÊTE d'un widget Analytics sans source réelle (L30-P1).
 * Garde « zéro fausse donnée » : plutôt qu'un chiffre inventé, on montre une silhouette
 * inerte + « donnée à venir » (i18n). Présentationnel pur.
 */
import { useTranslation } from "react-i18next";

export function Placeholder({ lines = 3 }: { lines?: number }): JSX.Element {
  const { t } = useTranslation();
  const widths = ["58%", "39%", "46%", "52%"];
  return (
    <>
      <div className="anaskel" aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <i key={i} style={{ width: widths[i % widths.length] }} />
        ))}
      </div>
      <p className="anahint">{t("analytics.dataComing")}</p>
    </>
  );
}
