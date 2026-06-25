/**
 * feed.ts — main courante 3-canaux MOCKÉE (DEP-1).
 *
 * ⚠️ DONNÉES SIMULÉES — branchées en L4 (iakaboxlogs MQTT/CouchDB + mapping
 * `meta.canal`). Aucune commande backend n'est appelée pour ce feed (R-L2-2) :
 * c'est un mock explicite, statique, marqué comme tel dans l'UI. Le FILTRAGE par
 * canal (adresse/geste/pensée/agent) est de l'UX et reste testable sans backend.
 */

/** Les 3 canaux de la main courante + le canal "agent" (relais inter-agents). */
export type Canal = "adresse" | "geste" | "pensee" | "agent";

export interface FeedEvent {
  id: string;
  canal: Canal;
  /** Émetteur affiché (agent ou utilisateur). */
  who: string;
  /** Projet concerné (nom court). */
  project: string;
  /** Corps de l'événement. */
  body: string;
  /** Horodatage simulé (mono). */
  ts: string;
}

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
