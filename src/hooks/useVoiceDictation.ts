/**
 * useVoiceDictation — dictée vocale DANS la conversation d'un projet (L16 reciblé
 * 2026-07-02 : le vocal sert à parler dans le chat, PAS à piloter le cockpit).
 *
 * Réutilise le STT local déjà livré (`voiceListen()` — whisper.cpp, voix jamais au
 * cloud). Au clic micro : capture → transcription → `onTranscript(texte)`. Le
 * parent (WorkingView) branche `onTranscript` sur l'envoi du message (auto-send,
 * décision Stéphane). **Garde anti-vide** : un transcript non parlant (silence →
 * `'...'`, bruit → `'[Musique]'`) n'est PAS transmis (rien n'est envoyé).
 *
 * I/O dans le hook (pas de god-component) ; dégrade proprement hors natif.
 */
import { useCallback, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";

/** État du micro de dictée. */
export type VoiceStatus = "idle" | "listening" | "unsupported";

/**
 * Vrai si la transcription whisper contient de la **vraie parole**. Filtre les
 * annotations non-parlantes entre crochets/parenthèses (`[Musique]`, `(rires)`)
 * et le silence (`...`) : exige au moins 2 caractères dont une lettre/chiffre.
 */
export function isMeaningfulSpeech(text: string): boolean {
  const stripped = text.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim();
  return stripped.length >= 2 && /[\p{L}\p{N}]/u.test(stripped);
}

export interface UseVoiceDictation {
  status: VoiceStatus;
  /** Déclenche une dictée push-to-talk (idempotent : ignore si déjà en cours). */
  listen: () => Promise<void>;
}

export function useVoiceDictation(
  onTranscript: (text: string) => void,
  api: Backend = backend,
): UseVoiceDictation {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  // Ref pour toujours appeler le callback À JOUR (projet/agent actifs) sans
  // recréer `listen` à chaque render ni capturer une closure périmée.
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  const listen = useCallback(async (): Promise<void> => {
    if (status === "listening") return;
    if (!api.isTauri()) {
      setStatus("unsupported");
      return;
    }
    setStatus("listening");
    try {
      const transcript = await api.voiceListen();
      if (isMeaningfulSpeech(transcript)) {
        cbRef.current(transcript.trim());
      }
      setStatus("idle");
    } catch {
      setStatus("unsupported");
    }
  }, [status, api]);

  return { status, listen };
}
