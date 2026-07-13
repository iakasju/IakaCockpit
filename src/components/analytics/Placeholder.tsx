/**
 * Empty-states HONNÊTES des widgets Analytics sans source réelle (L30-P1, compaction L30-P3).
 * Garde « zéro fausse donnée » : plutôt qu'un chiffre inventé, on signale « à venir ».
 *
 * Trois grains, du plus discret au plus visible :
 *   - `SoonStrip`   : une ligne sobre listant les widgets sans donnée (compaction — remplace
 *                     les grosses cartes skeleton d'un même bloc).
 *   - `EmptyPerspective` : bloc compact centré quand une perspective ENTIÈRE n'a aucune source
 *                     (ex. comparaison bi-période) — pas un empilement de skeletons.
 *   - `Placeholder` : silhouette inerte (débranché-gardé) — conservé pour réapparition dès
 *                     qu'une donnée réelle existe / réutilisation ponctuelle.
 * Présentationnels purs.
 */
import { useTranslation } from "react-i18next";

/** Ligne compacte « à venir : A · B · C » (remplace un empilement de cartes vides). */
export function SoonStrip({ labels }: { labels: readonly string[] }): JSX.Element | null {
  const { t } = useTranslation();
  if (labels.length === 0) return null;
  return (
    <div className="ana-soon">
      <span className="ana-soon-tag">{t("analytics.soonPrefix")}</span>
      <span className="ana-soon-list">{labels.join(" · ")}</span>
    </div>
  );
}

/** Bloc compact centré : perspective entière sans source réelle. */
export function EmptyPerspective({ reason }: { reason?: string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ana-empty">
      <div className="ana-empty-title">{t("analytics.dataComing")}</div>
      <div className="ana-empty-reason">{reason ?? t("analytics.emptyReason")}</div>
    </div>
  );
}

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
