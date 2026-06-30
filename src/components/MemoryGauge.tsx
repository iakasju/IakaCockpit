/**
 * MemoryGauge — jauge d'occupation du CONTEXTE + frontière de compaction (L18 #6,
 * variante A : « jauge linéaire composée + frontière »). Présentationnel : barre
 * `used / max` (used = `input` du DERNIER tour ≈ contexte courant) + une frise des inputs
 * par tour où l'on MARQUE la/les frontière(s) de compaction (chute brutale d'input).
 * Aucun I/O ; pas de fausse donnée (frontière dérivée de la série réelle).
 */
import { useTranslation } from "react-i18next";
import { compactionFrontiers, type EcoPoint } from "../hooks/useEconomy";

export interface MemoryGaugeProps {
  /** Série d'économie de la session (porte l'`input` par tour). */
  series: readonly EcoPoint[];
  /** Fenêtre de contexte du modèle (défaut 200k). */
  maxTokens?: number;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function MemoryGauge({
  series,
  maxTokens = 200000,
}: MemoryGaugeProps): JSX.Element {
  const { t } = useTranslation();
  const used = series.length > 0 ? series[series.length - 1].input : 0;
  const pct = maxTokens > 0 ? Math.min(100, (used / maxTokens) * 100) : 0;
  const level = pct >= 85 ? "high" : pct >= 60 ? "mid" : "low";
  const frontiers = new Set(compactionFrontiers(series));
  const maxIn = series.reduce((m, p) => Math.max(m, p.input), 1);

  return (
    <section className="memgauge" aria-label={t("memory.ariaLabel")}>
      <div className="memh">
        <span className="memt">{t("memory.title")}</span>
        {used > 0 && (
          <span className="memv">
            {fmtK(used)} / {fmtK(maxTokens)}
          </span>
        )}
      </div>
      {used === 0 ? (
        <p className="memempty">{t("memory.empty")}</p>
      ) : (
        <>
          <div className="membar" role="progressbar" aria-valuenow={Math.round(pct)}>
            <div className={`memfill lvl-${level}`} style={{ width: `${pct}%` }} />
          </div>
          {/* Frise des inputs par tour + frontière(s) de compaction marquées. */}
          {series.length > 1 && (
            <div className="memfrieze" aria-hidden>
              {series.map((p, i) => (
                <span
                  key={i}
                  className={`memcol${frontiers.has(i) ? " frontier" : ""}`}
                  style={{ height: `${(p.input / maxIn) * 100}%` }}
                />
              ))}
            </div>
          )}
          <div className="memsub">
            {t("memory.used", { pct: Math.round(pct) })}
            {frontiers.size > 0 && (
              <span className="memcompact"> · {t("memory.compaction", { count: frontiers.size })}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
