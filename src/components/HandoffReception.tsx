/**
 * HandoffReception — panneau de RÉCEPTION d'un handoff (H1). Présentationnel : reçoit
 * l'autorité `useHandoff` et déclenche l'import d'une livraison forge, avec **gestion
 * explicite du conflit** (anti-dérive) — jamais d'écrasement silencieux. Le badge « modifié
 * localement » signale une team importée qui a divergé de la forge (§ 5).
 *
 * Aucun I/O direct : tout passe par le hook (façade unique). Autonome et additif — n'altère
 * pas l'éditeur de teams (L11) ni le pilotage (L10/L4/L19/L22).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseHandoff, ConflictResolution } from "../hooks/useHandoff";
import type { HandoffManifest, HandoffProvenance } from "../handoff/receive";

export interface HandoffReceptionProps {
  handoff: UseHandoff;
}

/** Badge « modifié localement » — calque du badge de provenance (diverge de la forge). */
export function HandoffBadge({ provenance }: { provenance: HandoffProvenance | null }): JSX.Element | null {
  const { t } = useTranslation();
  if (!provenance) return null;
  if (provenance.localEdits) {
    return (
      <span className="handoff-badge handoff-badge--local" title={t("handoff.badgeLocalTitle")}>
        {t("handoff.badgeLocal")}
      </span>
    );
  }
  return (
    <span
      className="handoff-badge handoff-badge--forge"
      title={t("handoff.badgeForgeTitle", { version: provenance.sourceVersion, importedAt: provenance.importedAt })}
    >
      {t("handoff.badgeForge", { hash: provenance.sourceVersion.slice(0, 8) })}
    </span>
  );
}

interface ConflictState {
  teamId: string;
  existing: HandoffProvenance;
  incoming: HandoffManifest;
}

export function HandoffReception({ handoff }: HandoffReceptionProps): JSX.Element {
  const { t } = useTranslation();
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function doImport(teamId: string, resolution?: ConflictResolution): Promise<void> {
    setBusy(teamId);
    setMessage(null);
    const outcome = await handoff.importDelivery(teamId, resolution);
    setBusy(null);
    switch (outcome.status) {
      case "imported":
        setConflict(null);
        setMessage(t("handoff.imported", { teamId, version: outcome.provenance.sourceVersion.slice(0, 8) }));
        break;
      case "unchanged":
        setConflict(null);
        setMessage(t("handoff.unchanged", { teamId }));
        break;
      case "conflict":
        setConflict({ teamId: outcome.teamId, existing: outcome.existing, incoming: outcome.incoming });
        setMessage(null);
        break;
      case "invalid":
        setConflict(null);
        setMessage(t("handoff.invalid", { teamId, reason: outcome.reason }));
        break;
    }
  }

  return (
    <section className="handoff-reception panel" aria-label={t("handoff.ariaLabel")}>
      <h3 style={{ marginTop: 0 }}>{t("handoff.title")}</h3>
      <p className="sub">{t("handoff.intro")}</p>

      <div className="row">
        <button className="btn" type="button" onClick={() => void handoff.refresh()} disabled={handoff.loading}>
          {t("handoff.refresh")}
        </button>
        {message && <span className="sub" style={{ margin: 0 }}>{message}</span>}
      </div>

      {handoff.deliveries.length === 0 ? (
        <p className="sub">{t("handoff.empty")}</p>
      ) : (
        <ul className="handoff-list">
          {handoff.deliveries.map((teamId) => {
            const prov = handoff.provenanceFor(teamId);
            return (
              <li key={teamId} className="handoff-item">
                <span className="handoff-item__id">{teamId}</span>
                <HandoffBadge provenance={prov} />
                <button
                  className="btn"
                  type="button"
                  disabled={busy === teamId}
                  onClick={() => void doImport(teamId)}
                >
                  {prov ? t("handoff.reimport") : t("handoff.import")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {conflict && (
        <div className="handoff-conflict" role="alertdialog" aria-label={t("handoff.conflictAriaLabel")}>
          <p>
            <strong>{t("handoff.conflictTitle", { teamId: conflict.teamId })}</strong>
            {t("handoff.conflictBodyPre")}
            <code>{conflict.existing.originHash}</code>
            {t("handoff.conflictBodyMid")}
            <code>{conflict.incoming.originHash}</code>
            {t("handoff.conflictBodyPost")}
          </p>
          <div className="row">
            <button className="btn" type="button" onClick={() => void doImport(conflict.teamId, "keep-local")}>
              {t("handoff.keepLocal")}
            </button>
            <button className="btn" type="button" onClick={() => void doImport(conflict.teamId, "take-forge")}>
              {t("handoff.takeForge")}
            </button>
            <button className="btn" type="button" onClick={() => { setConflict(null); setMessage(t("handoff.deferred")); }}>
              {t("handoff.defer")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
