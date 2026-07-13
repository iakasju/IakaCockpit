/**
 * AnalyticsView — page « Analytics » (L30-P1, F1). Remplace la place de Journal dans le rail
 * (Journal débranché-gardé). Comprend en rétroactif la performance de la configuration d'une
 * team : colonne Périmètre (scope) + contrôle de plage + 4 perspectives commutables.
 *
 * Cette vue tient l'état LOCAL de la page (scope · plage · perspective) et compose la donnée :
 * `useAnalytics` dérive le modèle RÉEL depuis la façade (economy/activity passés par App) ;
 * la démo dev-gardée (`makeDemoAnalytics`, substituée UNIQUEMENT si `demoWidgetsOn` et aucune
 * donnée réelle) montre la richesse des 4 perspectives sans jamais inventer de donnée en prod.
 * `now` est tické (`useNow`) — pas de `Date.now()` figé. Les widgets eux-mêmes sont purs (D8).
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TreemapItem } from "../components/TreemapPanel";
import type { ProjectActivity } from "../api/backend";
import { useNow } from "../hooks/useNow";
import {
  useAnalytics,
  rangeFromPreset,
  ALL_SCOPE,
  type RangePreset,
} from "../hooks/useAnalytics";
import { makeDemoAnalytics } from "../mock/demoAnalytics";
import { PerimeterColumn } from "../components/analytics/PerimeterColumn";
import { TimeRangeControl } from "../components/analytics/TimeRangeControl";
import {
  PerspectiveTabs,
  type Perspective,
} from "../components/analytics/PerspectiveTabs";
import { PerspectiveDashboard } from "../components/analytics/PerspectiveDashboard";
import { PerspectiveTimeline } from "../components/analytics/PerspectiveTimeline";
import { PerspectiveCompare } from "../components/analytics/PerspectiveCompare";
import { PerspectiveAgents } from "../components/analytics/PerspectiveAgents";

export function AnalyticsView({
  economy,
  activity,
  demoOn,
}: {
  economy: readonly TreemapItem[];
  activity: readonly ProjectActivity[];
  /** Vitrine dev-gardée (calque `demoWidgetsOn`) : substitue la démo si AUCUNE donnée réelle. */
  demoOn: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const now = useNow(60_000); // pas besoin d'un tick fin ici (rétrospective jour)

  const [scope, setScope] = useState<string>(ALL_SCOPE);
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [perspective, setPerspective] = useState<Perspective>("dashboard");

  const range = useMemo(() => rangeFromPreset(preset, now), [preset, now]);
  const real = useAnalytics(economy, activity, scope, range);
  const demo = useMemo(() => makeDemoAnalytics(now), [now]);

  // Substitution démo : uniquement si activée ET aucune donnée réelle (garde prod).
  const base = real.hasRealData ? real : demoOn ? demo : real;

  // Le scope/pill reflètent TOUJOURS la sélection courante (même en démo, dont les valeurs
  // agrégées restent celles du portefeuille — vitrine P1).
  const scopeLabel =
    base.perimeter.find((e) => e.id === scope)?.label ??
    (scope === ALL_SCOPE ? t("analytics.allPortfolio") : scope);
  const model = { ...base, scopeId: scope, scopeLabel };

  return (
    <section className="view analytics alayout" aria-label={t("nav.analytics")}>
      <PerimeterColumn entries={model.perimeter} scope={scope} onSelect={setScope} />

      <main className="amain">
        <div className="apad">
          <div className="eyebrow">{t("analytics.eyebrow")}</div>
          <h1 className="title">{t("analytics.title")}</h1>
          <p className="lede">{t("analytics.lede")}</p>

          <TimeRangeControl
            range={range}
            scopeLabel={model.scopeLabel}
            locale={i18n.language}
            onPreset={setPreset}
          />
          <PerspectiveTabs active={perspective} onSelect={setPerspective} />

          {perspective === "dashboard" && <PerspectiveDashboard model={model} />}
          {perspective === "timeline" && <PerspectiveTimeline model={model} />}
          {perspective === "compare" && <PerspectiveCompare model={model} />}
          {perspective === "agents" && <PerspectiveAgents model={model} />}
        </div>
      </main>
    </section>
  );
}
