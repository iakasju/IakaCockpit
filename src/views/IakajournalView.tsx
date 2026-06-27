/**
 * IakajournalView — vue dédiée « Iakajournal » (L12). Sort la main courante
 * (iakaboxlogs, L4 — 3 canaux adresse/geste/pensée) de Portfolio et l'héberge en
 * PLEINE PAGE. Présentationnel : aucun I/O ici, le composant `MainCourante` porte
 * son propre hook `useMainCourante` (façade unique, D7).
 */
import { MainCourante } from "../components/MainCourante";

export function IakajournalView(): JSX.Element {
  return (
    <section className="view iakajournal" aria-label="Iakajournal">
      <MainCourante />
    </section>
  );
}
