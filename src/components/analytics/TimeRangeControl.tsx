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

/** ms epoch → `YYYY-MM-DD` (valeur d'un `<input type="date">`). */
function isoDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function TimeRangeControl({
  range,
  scopeLabel,
  locale,
  onPreset,
  onCustom,
}: {
  range: TimeRange;
  scopeLabel: string;
  locale: string;
  onPreset: (p: RangePreset) => void;
  /** Bornes « Custom » modifiées (dates ISO `YYYY-MM-DD`). */
  onCustom: (from: string, to: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const from = isoDate(range.fromMs);
  const to = isoDate(range.toMs);
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
      {range.preset === "custom" ? (
        <div className="customrange">
          <input
            type="date"
            aria-label={t("analytics.customFrom")}
            value={from}
            max={to}
            onChange={(e) => onCustom(e.target.value, to)}
          />
          <span className="ar">→</span>
          <input
            type="date"
            aria-label={t("analytics.customTo")}
            value={to}
            min={from}
            onChange={(e) => onCustom(from, e.target.value)}
          />
        </div>
      ) : (
        <span className="daterange">{fmtRangeLabel(range.fromMs, range.toMs, locale)}</span>
      )}
      <span className="tspacer" />
      <span className="scopepill">{scopeLabel}</span>
    </div>
  );
}
