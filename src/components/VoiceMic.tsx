/**
 * VoiceMic — bouton micro du rail + retour visuel (L16-P1).
 *
 * Présentationnel PUR : reçoit l'état du hook `useVoiceCommand` et un `onListen`.
 * Aucun I/O ici. États : repos (« Commande vocale »), écoute (pulse), dégradé
 * (désactivé si STT natif indisponible). Après une écoute : « Entendu : … » ou,
 * si rien n'est reconnu, la liste d'exemples de commandes.
 */
import { useTranslation } from "react-i18next";
import { VOICE_COMMAND_EXAMPLES } from "../voice/dispatcher";
import type { VoiceStatus } from "../hooks/useVoiceCommand";

interface VoiceMicProps {
  status: VoiceStatus;
  notUnderstood: boolean;
  lastTranscript: string | null;
  onListen: () => void;
}

export function VoiceMic({
  status,
  notUnderstood,
  lastTranscript,
  onListen,
}: VoiceMicProps): JSX.Element {
  const { t } = useTranslation();
  const unsupported = status === "unsupported";
  const listening = status === "listening";
  const label = unsupported
    ? t("voice.unsupported")
    : listening
      ? t("voice.listening")
      : t("voice.idle");

  return (
    <div className="voicemic" data-status={status}>
      <button
        type="button"
        className={`railitem voicebtn${listening ? " on" : ""}`}
        aria-label={t("voice.listen")}
        aria-pressed={listening}
        disabled={unsupported}
        onClick={onListen}
      >
        <span className="vico" aria-hidden>
          ◉
        </span>
        <span className="rlabel">{label}</span>
      </button>

      {notUnderstood && (
        <div className="voicehint" role="status">
          <span>{t("voice.notUnderstood")}</span>
          <ul>
            {VOICE_COMMAND_EXAMPLES.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {!notUnderstood && lastTranscript && status === "idle" && (
        <div className="voicehint" role="status">
          {t("voice.heard", { transcript: lastTranscript })}
        </div>
      )}
    </div>
  );
}
