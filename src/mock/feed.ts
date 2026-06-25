/**
 * feed.ts — main courante 3-canaux : MOCK de FALLBACK + filtres UX (DEP-1 → L4).
 *
 * En L4, ce mock DEVIENT le fallback du mode dégradé (D5) : quand iakaboxlogs est
 * injoignable / non configuré, `useMainCourante` substitue ce `MOCK_FEED` aux
 * événements réels et affiche un bandeau « mode dégradé ». Le FILTRAGE par canal
 * (adresse/geste/pensée/agent) reste de l'UX, testable sans backend.
 *
 * Le type `FeedEvent`/`Canal` est désormais DÉFINI dans `backend.ts` (miroir de la
 * struct Rust `maincourante::FeedEvent`) et RÉUTILISÉ ici — un seul type partagé,
 * pas de duplication (D6).
 */
import type { Canal, FeedEvent } from "../api/backend";

export type { Canal, FeedEvent };

/** Feed simulé — fixe, sans réseau. Représentatif des 4 canaux. */
export const MOCK_FEED: FeedEvent[] = [
  {
    id: "f1",
    canal: "adresse",
    who: "Stéphane",
    project: "IakaCockpit",
    body: "Lance le gate Legolas sur L2 quand c'est prêt.",
    ts: "10:42",
  },
  {
    id: "f2",
    canal: "geste",
    who: "Gimli",
    project: "IakaCockpit",
    body: "feat(L2): vues Portfolio/Working/Réglages + terminal PTY",
    ts: "10:40",
  },
  {
    id: "f3",
    canal: "pensee",
    who: "Gandalf",
    project: "iakaframe",
    body: "Le scope v7 « horizon » ne doit pas fuir en L2…",
    ts: "10:31",
  },
  {
    id: "f4",
    canal: "agent",
    who: "Aragorn → Gimli",
    project: "IakaCockpit",
    body: "Délégation L2 (instruction validée).",
    ts: "10:28",
  },
  {
    id: "f5",
    canal: "geste",
    who: "Legolas",
    project: "iakaIDE",
    body: "PASS — L1 (10 commandes, façade unique).",
    ts: "09:58",
  },
  {
    id: "f6",
    canal: "pensee",
    who: "Loki",
    project: "IakaCockpit",
    body: "Onglets qualité : encore à maquetter, hors L2.",
    ts: "09:40",
  },
];

/** Filtre le feed sur l'ensemble des canaux actifs (UX testable, sans backend). */
export function filterFeed(
  feed: FeedEvent[],
  active: ReadonlySet<Canal>,
): FeedEvent[] {
  if (active.size === 0) return feed;
  return feed.filter((e) => active.has(e.canal));
}

export const ALL_CANAUX: Canal[] = ["adresse", "geste", "pensee", "agent"];
