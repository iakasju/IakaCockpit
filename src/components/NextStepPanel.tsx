/**
 * NextStepPanel — panneau « prochaine étape » (L3, présentationnel).
 *
 * Remplace le placeholder « convph » de Working (L2). Reçoit l'état du moteur
 * (`useNextStep`) en props + le projet de l'onglet actif ; déclenche `onRequest`
 * sur le clic. Aucun I/O direct (D7) : l'appel vit dans le hook/la façade.
 *
 * Une suggestion par demande (L3) : pas de thread persistant (→ L4).
 */
import type { NextStep } from "../api/backend";

export interface NextStepPanelProps {
  /** Nom du projet de l'onglet actif (pour le libellé). */
  projectId: string;
  result: NextStep | null;
  loading: boolean;
  error: string | null;
  onRequest: () => void;
}

export function NextStepPanel({
  projectId,
  result,
  loading,
  error,
  onRequest,
}: NextStepPanelProps): JSX.Element {
  return (
    <div className="nextstep" aria-label="Moteur prochaine étape">
      <div className="nshead">
        <div className="nstitle">
          Prochaine étape
          <span className="nssub"> · {projectId}</span>
        </div>
        <button
          type="button"
          className="btn accent sm"
          onClick={onRequest}
          disabled={loading}
        >
          {loading ? "Analyse en cours…" : "Proposer la prochaine étape"}
        </button>
      </div>

      <div className="nsbody">
        {error && (
          <div className="nserror" role="alert">
            {error}
          </div>
        )}

        {!error && !result && !loading && (
          <div className="nsempty">
            Demande au moteur IA la prochaine étape concrète sur ce projet
            (contexte : specs + état des lieux + git). Sans endpoint configuré, une
            suggestion mockée est renvoyée.
          </div>
        )}

        {result && (
          <>
            <pre className="nstext">{result.suggestion}</pre>
            <div className="nsmeta">
              <span
                className={`nsprov${result.provider === "mock" ? " mock" : ""}`}
              >
                {result.provider === "mock" ? "mock (simulé)" : result.provider}
              </span>
              {result.model && <span className="nsmodel">{result.model}</span>}
              {(result.tokens_in != null || result.tokens_out != null) && (
                <span className="nstokens">
                  {result.tokens_in ?? "?"} → {result.tokens_out ?? "?"} tok
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
