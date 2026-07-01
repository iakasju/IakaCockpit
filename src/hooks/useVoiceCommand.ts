/**
 * useVoiceCommand — pilotage vocal de la navigation (L16-P1).
 *
 * Un hook par préoccupation (D6/D7) : orchestre le cycle push-to-talk
 * `micro → STT local (façade voiceListen) → dispatcher pur → action IHM`. Le
 * hook ne fait AUCUN `invoke` direct — il passe par `backend` (façade, D7,
 * injectable pour les tests). L'exécution de l'action est déléguée à
 * `onNavigate` (typiquement `useGridState.setActiveView`) : le hook ne connaît
 * pas le rendu, il ne fait que router une `ViewId`.
 *
 * Dégradation propre : hors contexte natif (dev front pur, navigateur, STT non
 * branché) `status` passe à `"unsupported"` — jamais de crash. Aucune donnée
 * vocale ne transite ici (le texte transcrit vient déjà du STT LOCAL Rust).
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { dispatch } from "../voice/dispatcher";
import type { ViewId } from "./useGridState";

/** État de la barre vocale. */
export type VoiceStatus =
  | "idle" // au repos, prêt
  | "listening" // capture + transcription en cours
  | "unsupported"; // STT natif indisponible (dégradé)

export interface UseVoiceCommand {
  status: VoiceStatus;
  /** Dernier texte transcrit (pour retour visuel), ou `null`. */
  lastTranscript: string | null;
  /** Vrai si la dernière transcription n'a résolu AUCUNE action connue. */
  notUnderstood: boolean;
  /** Déclenche une écoute push-to-talk (idempotent : ignore si déjà en cours). */
  listen: () => Promise<void>;
  /** Réinitialise le retour visuel (efface transcript / « pas compris »). */
  reset: () => void;
}

export function useVoiceCommand(
  onNavigate: (view: ViewId) => void,
  api: Backend = backend,
): UseVoiceCommand {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [notUnderstood, setNotUnderstood] = useState(false);

  const reset = useCallback((): void => {
    setLastTranscript(null);
    setNotUnderstood(false);
    setStatus((s) => (s === "unsupported" ? s : "idle"));
  }, []);

  const listen = useCallback(async (): Promise<void> => {
    // Idempotence : une écoute à la fois.
    if (status === "listening") return;
    // Hors natif : pas de STT possible → mode dégradé, sans tenter d'appel.
    if (!api.isTauri()) {
      setStatus("unsupported");
      return;
    }

    setStatus("listening");
    setNotUnderstood(false);
    try {
      const transcript = await api.voiceListen();
      setLastTranscript(transcript);
      const action = dispatch(transcript);
      if (action) {
        onNavigate(action.view);
        setNotUnderstood(false);
      } else {
        setNotUnderstood(true);
      }
      setStatus("idle");
    } catch {
      // STT non branché / permission refusée / erreur native : dégrade sans crash.
      setStatus("unsupported");
    }
  }, [status, api, onNavigate]);

  return { status, lastTranscript, notUnderstood, listen, reset };
}
