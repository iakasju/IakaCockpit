/**
 * MemoryGauge — jauge d'occupation du CONTEXTE (L18 #6). Présentationnel : une barre
 * remplie `used / max`. `used` = `input_tokens` du DERNIER tour (≈ taille du contexte
 * courant, capté via l'event économie #5a) — après une compaction, l'input chute, la
 * jauge le montre naturellement. Aucun I/O. La frontière de compaction EXPLICITE
 * (`compact_boundary`) reste un suivi (capture tailer). MVP honnête : pas de fausse donnée.
 */
import { useTranslation } from "react-i18next";

export interface MemoryGaugeProps {
  /** Tokens de contexte courants (input du dernier tour). 0 = pas de mesure. */
  usedTokens: number;
  /** Fenêtre de contexte du modèle (défaut 200k). */
  maxTokens?: number;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function MemoryGauge({
  usedTokens,
  maxTokens = 200000,
}: MemoryGaugeProps): JSX.Element {
  const { t } = useTranslation();
  const pct = maxTokens > 0 ? Math.min(100, (usedTokens / maxTokens) * 100) : 0;
  const level = pct >= 85 ? "high" : pct >= 60 ? "mid" : "low";

  return (
    <section className="memgauge" aria-label={t("memory.ariaLabel")}>
      <div className="memh">
        <span className="memt">{t("memory.title")}</span>
        {usedTokens > 0 && (
          <span className="memv">
            {fmtK(usedTokens)} / {fmtK(maxTokens)}
          </span>
        )}
      </div>
      {usedTokens === 0 ? (
        <p className="memempty">{t("memory.empty")}</p>
      ) : (
        <>
          <div className="membar" role="progressbar" aria-valuenow={Math.round(pct)}>
            <div className={`memfill lvl-${level}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="memsub">{t("memory.used", { pct: Math.round(pct) })}</div>
        </>
      )}
    </section>
  );
}
