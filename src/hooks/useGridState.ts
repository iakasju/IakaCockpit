/**
 * useGridState — hook d'état de la grille / dock / onglets.
 *
 * STUB L0 : aucune logique de layout réelle (la grille+dock+onglets arrivent en L2).
 * On pose un état typé minimal et séparé pour empêcher, dès maintenant, que cet état
 * soit absorbé par un god-component (D7). Le contrat de type pourra évoluer en L2.
 */
import { useState } from "react";

export interface GridTab {
  id: string;
  title: string;
}

export interface GridState {
  tabs: GridTab[];
  activeTabId: string | null;
}

export interface UseGridState extends GridState {
  setActiveTab: (id: string) => void;
}

const EMPTY_GRID: GridState = {
  tabs: [],
  activeTabId: null,
};

export function useGridState(): UseGridState {
  const [state, setState] = useState<GridState>(EMPTY_GRID);

  const setActiveTab = (id: string): void => {
    setState((prev) => ({ ...prev, activeTabId: id }));
  };

  return { ...state, setActiveTab };
}
