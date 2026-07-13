/**
 * TimeRangeControl — contrôle de plage de temps de la page Analytics (L30-P1, F2).
 * Préréglages `24h / 7j / 30j / Custom` (défaut 7j → now) + libellé de plage lisible +
 * pastille de scope. Présentationnel PUR : reçoit la plage courante + le scope, remonte le
 * changement de préréglage. `now` est fourni par la vue (tické `useNow`, pas `Date.now()`
 * figé). MVP : « Custom » est un préréglage inerte (pas de sélecteur de dates en P1).
 */
import { useTranslation } from "react-i18next";
import type { RangePreset, TimeRange } from "../../hooks/useAnalytics";
import { fmtRangeLabel } from "./format";

const PRESETS: RangePreset[] = ["24h", "7d", "30d", "custom"];

export function TimeRangeControl({
  range,
  scopeLabel,
  locale,
  onPreset,
}: {
  range: TimeRange;
  scopeLabel: string;
  locale: string;
  onPreset: (p: RangePreset) => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="trange">
      <div className="presets" role="tablist" aria-label={t("analytics.range")}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={range.preset === p}
            className={range.preset === p ? "on" : ""}
            onClick={() => onPreset(p)}
          >
            {t(`analytics.preset.${p}`)}
          </button>
        ))}
      </div>
      <span className="daterange">
        {fmtRangeLabel(range.fromMs, range.toMs, locale)}
      </span>
      <span className="tspacer" />
      <span className="scopepill">{scopeLabel}</span>
    </div>
  );
}
