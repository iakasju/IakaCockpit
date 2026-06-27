/**
 * catalog.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN.
 *
 * Catalogue des teams thematiques (source: iakagraph teams.json). Chaque team =
 * liste ORDONNEE d'agents ; l'index = roleIndex (0=portefeuille .. 7=doc).
 * Sert de GRAINE au bootstrap des teams par defaut (useTeams, L15-B). Aucun
 * secret : seulement slug + roleIndex + libelle d'affichage.
 */
export interface CatalogAgent {
  /** Slug stable (= nom affiche par defaut). */
  slug: string;
  /** Index de role (0..7) = ordre dans teams.json. */
  roleIndex: number;
}

export interface CatalogTeam {
  /** Cle stable (= cle teams.json, ex. "lotr"). Sert aussi de vignetteTeam. */
  id: string;
  /** Libelle d'affichage (ex. "LOTR"). */
  name: string;
  agents: CatalogAgent[];
}

export const TEAM_CATALOG: readonly CatalogTeam[] = [
  {
    id: "autobots",
    name: "Autobots",
    agents: [
      { slug: "optimus", roleIndex: 0 },
      { slug: "bumblebee", roleIndex: 1 },
      { slug: "ratchet", roleIndex: 2 },
      { slug: "wheeljack", roleIndex: 3 },
      { slug: "hound", roleIndex: 4 },
      { slug: "ironhide", roleIndex: 5 },
      { slug: "jazz", roleIndex: 6 },
      { slug: "blaster", roleIndex: 7 },
    ],
  },
  {
    id: "avengers",
    name: "Avengers",
    agents: [
      { slug: "nickfury", roleIndex: 0 },
      { slug: "capamerica", roleIndex: 1 },
      { slug: "strange", roleIndex: 2 },
      { slug: "ironman", roleIndex: 3 },
      { slug: "hawkeye", roleIndex: 4 },
      { slug: "thor", roleIndex: 5 },
      { slug: "lokiavg", roleIndex: 6 },
      { slug: "spiderman", roleIndex: 7 },
    ],
  },
  {
    id: "dc-justice",
    name: "DC Justice",
    agents: [
      { slug: "superman", roleIndex: 0 },
      { slug: "batman", roleIndex: 1 },
      { slug: "wonderwoman", roleIndex: 2 },
      { slug: "cyborg", roleIndex: 3 },
      { slug: "greenlantern", roleIndex: 4 },
      { slug: "aquaman", roleIndex: 5 },
      { slug: "flash", roleIndex: 6 },
      { slug: "manhunter", roleIndex: 7 },
    ],
  },
  {
    id: "defenders",
    name: "Defenders",
    agents: [
      { slug: "daredevil", roleIndex: 0 },
      { slug: "lukecage", roleIndex: 1 },
      { slug: "jessicajones", roleIndex: 2 },
      { slug: "ironfist", roleIndex: 3 },
      { slug: "punisher", roleIndex: 4 },
      { slug: "kingpin", roleIndex: 5 },
      { slug: "elektra", roleIndex: 6 },
      { slug: "foggynelson", roleIndex: 7 },
    ],
  },
  {
    id: "harry-potter",
    name: "Harry Potter",
    agents: [
      { slug: "dumbledore", roleIndex: 0 },
      { slug: "harry", roleIndex: 1 },
      { slug: "mcgonagall", roleIndex: 2 },
      { slug: "hagrid", roleIndex: 3 },
      { slug: "hermione", roleIndex: 4 },
      { slug: "snape", roleIndex: 5 },
      { slug: "luna", roleIndex: 6 },
      { slug: "ron", roleIndex: 7 },
    ],
  },
  {
    id: "lotr",
    name: "LOTR",
    agents: [
      { slug: "galadriel", roleIndex: 0 },
      { slug: "aragorn", roleIndex: 1 },
      { slug: "gandalf", roleIndex: 2 },
      { slug: "gimli", roleIndex: 3 },
      { slug: "legolas", roleIndex: 4 },
      { slug: "boromir", roleIndex: 5 },
      { slug: "bilbo", roleIndex: 6 },
      { slug: "frodo", roleIndex: 7 },
    ],
  },
  {
    id: "norse",
    name: "Norse",
    agents: [
      { slug: "odin", roleIndex: 0 },
      { slug: "thornorse", roleIndex: 1 },
      { slug: "mimir", roleIndex: 2 },
      { slug: "brokkr", roleIndex: 3 },
      { slug: "heimdall", roleIndex: 4 },
      { slug: "tyr", roleIndex: 5 },
      { slug: "loki", roleIndex: 6 },
      { slug: "bragi", roleIndex: 7 },
    ],
  },
  {
    id: "olympians",
    name: "Olympians",
    agents: [
      { slug: "zeus", roleIndex: 0 },
      { slug: "ares", roleIndex: 1 },
      { slug: "athena", roleIndex: 2 },
      { slug: "hephaestus", roleIndex: 3 },
      { slug: "apollo", roleIndex: 4 },
      { slug: "hades", roleIndex: 5 },
      { slug: "dionysus", roleIndex: 6 },
      { slug: "hermes", roleIndex: 7 },
    ],
  },
  {
    id: "rebels",
    name: "Rebels",
    agents: [
      { slug: "leia", roleIndex: 0 },
      { slug: "hansolo", roleIndex: 1 },
      { slug: "obiwan", roleIndex: 2 },
      { slug: "luke", roleIndex: 3 },
      { slug: "chewbacca", roleIndex: 4 },
      { slug: "lando", roleIndex: 5 },
      { slug: "c3po", roleIndex: 6 },
      { slug: "r2d2", roleIndex: 7 },
    ],
  },
  {
    id: "starfleet",
    name: "Starfleet",
    agents: [
      { slug: "picard", roleIndex: 0 },
      { slug: "riker", roleIndex: 1 },
      { slug: "data", roleIndex: 2 },
      { slug: "geordi", roleIndex: 3 },
      { slug: "worf", roleIndex: 4 },
      { slug: "crusher", roleIndex: 5 },
      { slug: "troi", roleIndex: 6 },
      { slug: "wesley", roleIndex: 7 },
    ],
  },
  {
    id: "xmen",
    name: "X-Men",
    agents: [
      { slug: "profx", roleIndex: 0 },
      { slug: "cyclops", roleIndex: 1 },
      { slug: "beast", roleIndex: 2 },
      { slug: "forge", roleIndex: 3 },
      { slug: "wolverine", roleIndex: 4 },
      { slug: "colossus", roleIndex: 5 },
      { slug: "mystique", roleIndex: 6 },
      { slug: "nightcrawler", roleIndex: 7 },
    ],
  },
] as const;
