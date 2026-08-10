/**
 * UpdateBanner — bandeau discret « une version est disponible » (L34).
 *
 * Présentationnel pur : aucune I/O, aucun `invoke`. Il reçoit l'état de la machine
 * `useAppUpdate` et remonte deux intentions — installer, fermer. Non modal : il ne
 * bloque rien et ne s'impose pas ; l'installation reste un CLIC EXPLICITE (D3).
 *
 * Il ne s'affiche QUE pour `available` / `downloading` / `ready`. En particulier,
 * l'état `error` n'est jamais rendu ici : au démarrage l'échec doit rester
 * invisible (box éteinte = rien à l'écran), et en contrôle manuel c'est l'écran
 * des Réglages qui parle.
 */
import { useTranslation } from "react-i18next";
import type { UpdateState } from "../hooks/useAppUpdate";

export interface UpdateBannerProps {
  state: UpdateState;
  /** Fermé par l'utilisateur : le bandeau disparaît sans rien installer. */
  dismissed: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({
  state,
  dismissed,
  onInstall,
  onDismiss,
}: UpdateBannerProps): JSX.Element | null {
  const { t } = useTranslation();
  if (dismissed) return null;
  if (
    state.status !== "available" &&
    state.status !== "downloading" &&
    state.status !== "ready"
  ) {
    return null;
  }

  const busy = state.status === "downloading" || state.status === "ready";

  return (
    <div className="updbanner" role="status" aria-live="polite">
      <span className="updbanner-txt">
        {t("update.available", { version: state.version })}
      </span>

      {state.status === "downloading" && (
        <span className="updbanner-prog">
          {state.pct === null
            ? t("update.downloading")
            : t("update.downloadingPct", { pct: state.pct })}
        </span>
      )}
      {state.status === "ready" && (
        <span className="updbanner-prog">{t("update.restarting")}</span>
      )}

      {state.status === "available" && (
        <button type="button" className="btn accent sm" onClick={onInstall}>
          {t("update.install")}
        </button>
      )}
      <button
        type="button"
        className="updbanner-x"
        aria-label={t("update.dismiss")}
        onClick={onDismiss}
        disabled={busy}
      >
        ×
      </button>
    </div>
  );
}
