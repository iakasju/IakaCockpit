/**
 * useGridState — navigation des 5 vues (portfolio | working | journal | teams |
 * settings).
 *
 * « Grille / dock » du backlog, cadré par v7 (D1). **L8 (D1)** : la responsabilité
 * « onglets PTY » a été RETIRÉE de ce hook — elle est portée par `useConversations`
 * (un projet = une conversation). **L12** : la main courante (iakaboxlogs, L4) sort
 * de Portfolio dans sa propre vue `journal` (Journal). **L13** : la gestion
 * teams/agents/skills sort de Réglages dans sa propre vue `teams` (Teams).
 * `useGridState` ne garde que la **navigation entre vues** (un hook par
 * préoccupation, anti god-component — D8).
 *
 * État pur, séparé : aucun I/O ici. `App.tsx` consomme ce hook ; il ne détient pas
 * l'état lui-même.
 */
import { useCallback, useState } from "react";

export type ViewId =
  | "portfolio"
  | "working"
  | "journal"
  | "teams"
  | "cadre"
  | "settings";

export interface UseGridState {
  activeView: ViewId;
  setActiveView: (v: ViewId) => void;
}

export function useGridState(): UseGridState {
  const [activeView, setActiveViewState] = useState<ViewId>("portfolio");

  const setActiveView = useCallback((v: ViewId): void => {
    setActiveViewState(v);
  }, []);

  return { activeView, setActiveView };
}
