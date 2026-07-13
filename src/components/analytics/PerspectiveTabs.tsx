/**
 * PerspectiveTabs — sélecteur de perspective de la page Analytics (L30-P1, F2).
 * `V1 Dashboard / V2 Timeline / V3 Comparaison / V4 Par agent` (défaut V1). Présentationnel
 * PUR : reçoit la perspective active, remonte le changement.
 */
import { useTranslation } from "react-i18next";

export type Perspective = "dashboard" | "timeline" | "compare" | "agents";

const PERSPECTIVES: Perspective[] = ["dashboard", "timeline", "compare", "agents"];

export function PerspectiveTabs({
  active,
  onSelect,
}: {
  active: Perspective;
  onSelect: (p: Perspective) => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="perstabs" role="tablist" aria-label={t("analytics.perspective")}>
      {PERSPECTIVES.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={active === p}
          className={active === p ? "on" : ""}
          onClick={() => onSelect(p)}
        >
          {t(`analytics.view.${p}`)}
        </button>
      ))}
    </div>
  );
}
