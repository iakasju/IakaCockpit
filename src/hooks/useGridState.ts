/**
 * useGridState — navigation (3 vues) + onglets de sessions PTY (L2).
 *
 * « Grille / dock / onglets » du backlog, cadrée par v7 (D1) :
 *   - vues commutables (portfolio | working | settings) — une seule active ;
 *   - onglets PTY (Working) : un onglet = une session = un projet du set de Work.
 *
 * État pur, séparé (D6) : aucun I/O ici (le cycle de vie PTY réel est dans
 * `usePty`). `App.tsx` consomme ce hook ; il ne détient pas l'état lui-même.
 */
import { useCallback, useRef, useState } from "react";

export type ViewId = "portfolio" | "working" | "settings";

export interface PtyTab {
  /** Identifiant unique de session/onglet (sert d'id PTY). */
  id: string;
  /** Projet associé (id de `Project`). */
  projectId: string;
  /** Titre d'onglet — en L2 = nom de projet (titrage agent = DEP-2, OUT). */
  title: string;
  /** cwd à passer à `ptyOpen` (chemin du projet sous le chapeau). */
  cwd: string;
}

export interface UseGridState {
  activeView: ViewId;
  setActiveView: (v: ViewId) => void;
  tabs: PtyTab[];
  activeTabId: string | null;
  /** Crée (ou ré-active) un onglet pour un projet et le rend actif. */
  openTab: (projectId: string, title: string, cwd: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

let seq = 0;
/** id de session déterministe-croissant (unicité garantie sans collision). */
function nextTabId(projectId: string): string {
  seq += 1;
  return `pty-${projectId}-${seq}`;
}

export function useGridState(): UseGridState {
  const [activeView, setActiveView] = useState<ViewId>("portfolio");
  const [tabs, setTabs] = useState<PtyTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Réf miroir pour lire la liste courante dans openTab sans la mettre en dep
  // (openTab reste stable, pas de re-render des composants qui le reçoivent).
  const tabsRef = useRef<PtyTab[]>(tabs);
  tabsRef.current = tabs;

  const openTab = useCallback(
    (projectId: string, title: string, cwd: string): string => {
      // Un onglet par projet : si déjà ouvert, on le ré-active.
      const existing = tabsRef.current.find((t) => t.projectId === projectId);
      if (existing) {
        setActiveTabId(existing.id);
        return existing.id;
      }
      const id = nextTabId(projectId);
      setTabs((prev) => [...prev, { id, projectId, title, cwd }]);
      setActiveTabId(id);
      return id;
    },
    [],
  );

  const closeTab = useCallback((id: string): void => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      setActiveTabId((cur) => {
        if (cur !== id) return cur;
        return next.length > 0 ? next[next.length - 1].id : null;
      });
      return next;
    });
  }, []);

  const setActiveTab = useCallback((id: string): void => {
    setActiveTabId(id);
  }, []);

  return {
    activeView,
    setActiveView,
    tabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab,
  };
}
