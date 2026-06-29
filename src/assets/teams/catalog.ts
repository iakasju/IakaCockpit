/**
 * catalog.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN.
 *
 * Catalogue des teams thematiques (source: iakagraph teams.json). Chaque team =
 * liste ORDONNEE d'agents ; l'index = roleIndex (0=portefeuille .. 7=doc).
 * Sert de GRAINE au bootstrap des teams par defaut (useTeams, L15-B). Aucun
 * secret : seulement slug + roleIndex + libelle d'affichage.
 */
export interface CatalogAgent {
  /** Slug stable (= cle teams.json, id d'agent). */
  slug: string;
  /** Nom du personnage affiche (= teams.json .name ; fallback slug). */
  name: string;
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
      { slug: "optimus", name: "Optimus Prime", roleIndex: 0 },
      { slug: "bumblebee", name: "Bumblebee", roleIndex: 1 },
      { slug: "ratchet", name: "Ratchet", roleIndex: 2 },
      { slug: "wheeljack", name: "Wheeljack", roleIndex: 3 },
      { slug: "hound", name: "Hound", roleIndex: 4 },
      { slug: "ironhide", name: "Ironhide", roleIndex: 5 },
      { slug: "jazz", name: "Jazz", roleIndex: 6 },
      { slug: "blaster", name: "Blaster", roleIndex: 7 },
    ],
  },
  {
    id: "avengers",
    name: "Avengers",
    agents: [
      { slug: "nickfury", name: "Nick Fury", roleIndex: 0 },
      { slug: "capamerica", name: "Captain America", roleIndex: 1 },
      { slug: "strange", name: "Doctor Strange", roleIndex: 2 },
      { slug: "ironman", name: "Iron Man", roleIndex: 3 },
      { slug: "hawkeye", name: "Hawkeye", roleIndex: 4 },
      { slug: "thor", name: "Thor", roleIndex: 5 },
      { slug: "lokiavg", name: "Loki", roleIndex: 6 },
      { slug: "spiderman", name: "Spider-Man", roleIndex: 7 },
    ],
  },
  {
    id: "dc-justice",
    name: "DC Justice",
    agents: [
      { slug: "superman", name: "Superman", roleIndex: 0 },
      { slug: "batman", name: "Batman", roleIndex: 1 },
      { slug: "wonderwoman", name: "Wonder Woman", roleIndex: 2 },
      { slug: "cyborg", name: "Cyborg", roleIndex: 3 },
      { slug: "greenlantern", name: "Green Lantern", roleIndex: 4 },
      { slug: "aquaman", name: "Aquaman", roleIndex: 5 },
      { slug: "flash", name: "The Flash", roleIndex: 6 },
      { slug: "manhunter", name: "Martian Manhunter", roleIndex: 7 },
    ],
  },
  {
    id: "defenders",
    name: "Defenders",
    agents: [
      { slug: "daredevil", name: "Daredevil", roleIndex: 0 },
      { slug: "lukecage", name: "Luke Cage", roleIndex: 1 },
      { slug: "jessicajones", name: "Jessica Jones", roleIndex: 2 },
      { slug: "ironfist", name: "Iron Fist", roleIndex: 3 },
      { slug: "punisher", name: "The Punisher", roleIndex: 4 },
      { slug: "kingpin", name: "Kingpin", roleIndex: 5 },
      { slug: "elektra", name: "Elektra", roleIndex: 6 },
      { slug: "foggynelson", name: "Foggy Nelson", roleIndex: 7 },
    ],
  },
  {
    id: "harry-potter",
    name: "Harry Potter",
    agents: [
      { slug: "dumbledore", name: "Albus Dumbledore", roleIndex: 0 },
      { slug: "harry", name: "Harry Potter", roleIndex: 1 },
      { slug: "mcgonagall", name: "Minerva McGonagall", roleIndex: 2 },
      { slug: "hagrid", name: "Rubeus Hagrid", roleIndex: 3 },
      { slug: "hermione", name: "Hermione Granger", roleIndex: 4 },
      { slug: "snape", name: "Severus Snape", roleIndex: 5 },
      { slug: "luna", name: "Luna Lovegood", roleIndex: 6 },
      { slug: "ron", name: "Ron Weasley", roleIndex: 7 },
    ],
  },
  {
    id: "lotr",
    name: "LOTR",
    agents: [
      { slug: "galadriel", name: "Galadriel", roleIndex: 0 },
      { slug: "aragorn", name: "Aragorn", roleIndex: 1 },
      { slug: "gandalf", name: "Gandalf", roleIndex: 2 },
      { slug: "gimli", name: "Gimli", roleIndex: 3 },
      { slug: "legolas", name: "Legolas", roleIndex: 4 },
      { slug: "boromir", name: "Boromir", roleIndex: 5 },
      { slug: "bilbo", name: "Bilbo Baggins", roleIndex: 6 },
      { slug: "frodo", name: "Frodo Baggins", roleIndex: 7 },
    ],
  },
  {
    id: "norse",
    name: "Norse",
    agents: [
      { slug: "odin", name: "Odin", roleIndex: 0 },
      { slug: "thornorse", name: "Thor", roleIndex: 1 },
      { slug: "mimir", name: "Mímir", roleIndex: 2 },
      { slug: "brokkr", name: "Brokkr", roleIndex: 3 },
      { slug: "heimdall", name: "Heimdall", roleIndex: 4 },
      { slug: "tyr", name: "Týr", roleIndex: 5 },
      { slug: "loki", name: "Loki", roleIndex: 6 },
      { slug: "bragi", name: "Bragi", roleIndex: 7 },
    ],
  },
  {
    id: "olympians",
    name: "Olympians",
    agents: [
      { slug: "zeus", name: "Zeus", roleIndex: 0 },
      { slug: "ares", name: "Ares", roleIndex: 1 },
      { slug: "athena", name: "Athena", roleIndex: 2 },
      { slug: "hephaestus", name: "Hephaestus", roleIndex: 3 },
      { slug: "apollo", name: "Apollo", roleIndex: 4 },
      { slug: "hades", name: "Hades", roleIndex: 5 },
      { slug: "dionysus", name: "Dionysus", roleIndex: 6 },
      { slug: "hermes", name: "Hermes", roleIndex: 7 },
    ],
  },
  {
    id: "rebels",
    name: "Rebels",
    agents: [
      { slug: "leia", name: "Princess Leia", roleIndex: 0 },
      { slug: "hansolo", name: "Han Solo", roleIndex: 1 },
      { slug: "obiwan", name: "Obi-Wan Kenobi", roleIndex: 2 },
      { slug: "luke", name: "Luke Skywalker", roleIndex: 3 },
      { slug: "chewbacca", name: "Chewbacca", roleIndex: 4 },
      { slug: "lando", name: "Lando Calrissian", roleIndex: 5 },
      { slug: "c3po", name: "C-3PO", roleIndex: 6 },
      { slug: "r2d2", name: "R2-D2", roleIndex: 7 },
    ],
  },
  {
    id: "starfleet",
    name: "Starfleet",
    agents: [
      { slug: "picard", name: "Jean-Luc Picard", roleIndex: 0 },
      { slug: "riker", name: "Will Riker", roleIndex: 1 },
      { slug: "data", name: "Data", roleIndex: 2 },
      { slug: "geordi", name: "Geordi La Forge", roleIndex: 3 },
      { slug: "worf", name: "Worf", roleIndex: 4 },
      { slug: "crusher", name: "Beverly Crusher", roleIndex: 5 },
      { slug: "troi", name: "Deanna Troi", roleIndex: 6 },
      { slug: "wesley", name: "Wesley Crusher", roleIndex: 7 },
    ],
  },
  {
    id: "xmen",
    name: "X-Men",
    agents: [
      { slug: "profx", name: "Professor X", roleIndex: 0 },
      { slug: "cyclops", name: "Cyclops", roleIndex: 1 },
      { slug: "beast", name: "Beast", roleIndex: 2 },
      { slug: "forge", name: "Forge", roleIndex: 3 },
      { slug: "wolverine", name: "Wolverine", roleIndex: 4 },
      { slug: "colossus", name: "Colossus", roleIndex: 5 },
      { slug: "mystique", name: "Mystique", roleIndex: 6 },
      { slug: "nightcrawler", name: "Nightcrawler", roleIndex: 7 },
    ],
  },
] as const;
