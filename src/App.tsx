/**
 * App.tsx — shell minimal vide (D7).
 *
 * L0 ne porte AUCUNE vue de la maquette v7 (Portfolio / Working / Réglages arrivent
 * en L2). App.tsx ne détient pas l'état global : les états vivent dans des hooks
 * séparés (`useGridState`, `usePortfolio`), ici simplement câblés pour prouver le
 * découplage. Pas de god-component.
 */
import { useGridState } from "./hooks/useGridState";
import { usePortfolio } from "./hooks/usePortfolio";

export default function App(): JSX.Element {
  const grid = useGridState();
  const portfolio = usePortfolio();

  return (
    <main className="app-shell">
      <header>
        <h1>IakaCockpit</h1>
      </header>
      <section aria-label="zone d'accueil">
        <p>Socle L0 en place. Les vues arrivent dans les lots suivants.</p>
        <p>
          Onglets : {grid.tabs.length} · Projets : {portfolio.projects.length}
        </p>
      </section>
    </main>
  );
}
