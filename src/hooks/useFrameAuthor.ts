/**
 * useFrameAuthor — appel au LLM embarqué qui RÉDIGE un artefact du Cadre (L22-P2).
 *
 * IO isolée du frame (D7/D8) : appelle la façade `frameAuthor` (skill = paragraphe,
 * agent = brief), suit l'occupation par cible (`busyId`) et l'erreur. Le résultat (texte)
 * est renvoyé à l'appelant, qui le range dans le `frame.json` via `useFrame`
 * (`authorSkill`/`setAgentBrief`). Dégrade proprement hors natif.
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";

export interface UseFrameAuthor {
  /** Id de la cible en cours de rédaction (carte), ou null. */
  busyId: string | null;
  error: string | null;
  /**
   * Rédige via le LLM. `targetId` = id de la carte (pour l'état d'occupation).
   * Renvoie le texte rédigé, ou `null` si indisponible/erreur.
   */
  author: (
    targetId: string,
    kind: "skill" | "agent",
    name: string,
    instruction: string,
    context?: string,
  ) => Promise<string | null>;
}

export function useFrameAuthor(api: Backend = backend): UseFrameAuthor {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const author = useCallback(
    async (
      targetId: string,
      kind: "skill" | "agent",
      name: string,
      instruction: string,
      context?: string,
    ): Promise<string | null> => {
      if (busyId) return null; // une rédaction à la fois
      if (!api.isTauri()) {
        setError("rédaction indisponible hors application");
        return null;
      }
      setBusyId(targetId);
      setError(null);
      try {
        const reply = await api.frameAuthor(kind, name, instruction, context);
        return reply.content;
      } catch (e) {
        setError(String(e));
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [busyId, api],
  );

  return { busyId, error, author };
}
