/**
 * NextStepPanel — panneau « prochaine étape » (L3, présentationnel).
 *
 * Remplace le placeholder « convph » de Working (L2). Reçoit l'état du moteur
 * (`useNextStep`) en props + le projet de l'onglet actif ; déclenche `onRequest`
 * sur le clic. Aucun I/O direct (D7) : l'appel vit dans le hook/la façade.
 *
 * Une suggestion par demande (L3) : pas de thread persistant (→ L4).
 */
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="nextstep" aria-label={t("nextStep.ariaLabel")}>
      <div className="nshead">
        <div className="nstitle">
          {t("nextStep.title")}
          <span className="nssub"> · {projectId}</span>
        </div>
        <button
          type="button"
          className="btn accent sm"
          onClick={onRequest}
          disabled={loading}
        >
          {loading ? t("nextStep.analyzing") : t("nextStep.request")}
        </button>
      </div>

      <div className="nsbody">
        {error && (
          <div className="nserror" role="alert">
            {error}
          </div>
        )}

        {!error && !result && !loading && (
          <div className="nsempty">{t("nextStep.empty")}</div>
        )}

        {result && (
          <>
            <pre className="nstext">{result.suggestion}</pre>
            <div className="nsmeta">
              <span
                className={`nsprov${result.provider === "mock" ? " mock" : ""}`}
              >
                {result.provider === "mock"
                  ? t("nextStep.providerMock")
                  : result.provider}
              </span>
              {result.model && <span className="nsmodel">{result.model}</span>}
              {(result.tokens_in != null || result.tokens_out != null) && (
                <span className="nstokens">
                  {t("nextStep.tokens", {
                    in: result.tokens_in ?? "?",
                    out: result.tokens_out ?? "?",
                  })}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
