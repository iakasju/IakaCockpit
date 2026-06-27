/**
 * JournalView — vue dédiée « Journal » (L12). Sort la main courante (iakaboxlogs,
 * L4 — 3 canaux adresse/geste/pensée) de Portfolio et l'héberge en PLEINE PAGE.
 * Présentationnel : aucun I/O ici, le composant `MainCourante` porte son propre
 * hook `useMainCourante` (façade unique, D7).
 */
import { MainCourante } from "../components/MainCourante";

export function JournalView(): JSX.Element {
  return (
    <section className="view journal" aria-label="Journal">
      <MainCourante />
    </section>
  );
}
