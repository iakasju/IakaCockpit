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
import type { UseHandoff, ConflictResolution } from "../hooks/useHandoff";
import type { HandoffManifest, HandoffProvenance } from "../handoff/receive";

export interface HandoffReceptionProps {
  handoff: UseHandoff;
}

/** Badge « modifié localement » — calque du badge de provenance (diverge de la forge). */
export function HandoffBadge({ provenance }: { provenance: HandoffProvenance | null }): JSX.Element | null {
  if (!provenance) return null;
  if (provenance.localEdits) {
    return (
      <span className="handoff-badge handoff-badge--local" title="Cette team a été éditée localement et diverge de la version livrée par la forge.">
        modifié localement
      </span>
    );
  }
  return (
    <span className="handoff-badge handoff-badge--forge" title={`Réceptionné de la forge — version ${provenance.sourceVersion}, importé le ${provenance.importedAt}.`}>
      forge · {provenance.sourceVersion.slice(0, 8)}
    </span>
  );
}

interface ConflictState {
  teamId: string;
  existing: HandoffProvenance;
  incoming: HandoffManifest;
}

export function HandoffReception({ handoff }: HandoffReceptionProps): JSX.Element {
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
        setMessage(`« ${teamId} » réceptionnée (forge ${outcome.provenance.sourceVersion.slice(0, 8)}).`);
        break;
      case "unchanged":
        setConflict(null);
        setMessage(`« ${teamId} » inchangée (déjà à jour ou choix local conservé).`);
        break;
      case "conflict":
        setConflict({ teamId: outcome.teamId, existing: outcome.existing, incoming: outcome.incoming });
        setMessage(null);
        break;
      case "invalid":
        setConflict(null);
        setMessage(`Livraison « ${teamId} » illisible : ${outcome.reason}`);
        break;
    }
  }

  return (
    <section className="handoff-reception panel" aria-label="Réception de handoff">
      <h3 style={{ marginTop: 0 }}>Réceptionner une team livrée par la forge</h3>
      <p className="sub">
        Importe une team déposée dans le canal de handoff. La réception est non destructive :
        une édition locale est signalée, et une nouvelle livraison ne remplace jamais vos
        modifications sans votre accord.
      </p>

      <div className="row">
        <button className="btn" type="button" onClick={() => void handoff.refresh()} disabled={handoff.loading}>
          Rafraîchir
        </button>
        {message && <span className="sub" style={{ margin: 0 }}>{message}</span>}
      </div>

      {handoff.deliveries.length === 0 ? (
        <p className="sub">Aucune livraison dans le canal.</p>
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
                  {prov ? "Ré-importer" : "Importer"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {conflict && (
        <div className="handoff-conflict" role="alertdialog" aria-label="Conflit de réception">
          <p>
            <strong>Conflit sur « {conflict.teamId} ».</strong> Vous avez modifié cette team
            localement (empreinte <code>{conflict.existing.originHash}</code>) et la forge propose
            une nouvelle livraison (empreinte <code>{conflict.incoming.originHash}</code>). Que
            faire ?
          </p>
          <div className="row">
            <button className="btn" type="button" onClick={() => void doImport(conflict.teamId, "keep-local")}>
              Garder ma version locale
            </button>
            <button className="btn" type="button" onClick={() => void doImport(conflict.teamId, "take-forge")}>
              Prendre la version forge (écrase mes modifs)
            </button>
            <button className="btn" type="button" onClick={() => { setConflict(null); setMessage("Décision différée."); }}>
              Différer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
