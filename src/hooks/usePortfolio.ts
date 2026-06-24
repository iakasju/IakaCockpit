/**
 * usePortfolio — hook d'état du portefeuille de projets.
 *
 * STUB L0 : aucune découverte de projets ni appel backend (le scan git/portfolio
 * est salvagé en L1, la vue en L2). On pose un état typé, séparé de la grille, pour
 * tenir le principe « un hook par préoccupation » (D7). La vraie alimentation passera
 * par `backend.ts` (jamais d'`invoke` direct ici).
 */
import { useState } from "react";

export interface PortfolioProject {
  id: string;
  name: string;
  path: string;
}

export interface PortfolioState {
  projects: PortfolioProject[];
  loading: boolean;
}

export interface UsePortfolio extends PortfolioState {
  select: (id: string) => void;
  selectedId: string | null;
}

const EMPTY_PORTFOLIO: PortfolioState = {
  projects: [],
  loading: false,
};

export function usePortfolio(): UsePortfolio {
  const [state] = useState<PortfolioState>(EMPTY_PORTFOLIO);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const select = (id: string): void => {
    setSelectedId(id);
  };

  return { ...state, selectedId, select };
}
