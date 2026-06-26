/**
 * manifest.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN.
 *
 * Mapping (charte-app -> team -> roleIndex 0..N-1 -> URL d'asset Vite servie en 'self').
 * L'ordre des roleIndex reflete teams.json (0=portefeuille, 1=coordination,
 * 2=cadrage, 3=dev, 4=qualite...). Source: naonedge / [dark light] / [lotr avengers starfleet].
 */
import v0 from "./naonedge-dark/lotr/galadriel.png";
import v1 from "./naonedge-dark/lotr/aragorn.png";
import v2 from "./naonedge-dark/lotr/gandalf.png";
import v3 from "./naonedge-dark/lotr/gimli.png";
import v4 from "./naonedge-dark/lotr/legolas.png";
import v5 from "./naonedge-dark/avengers/nickfury.png";
import v6 from "./naonedge-dark/avengers/capamerica.png";
import v7 from "./naonedge-dark/avengers/strange.png";
import v8 from "./naonedge-dark/avengers/ironman.png";
import v9 from "./naonedge-dark/avengers/hawkeye.png";
import v10 from "./naonedge-dark/starfleet/picard.png";
import v11 from "./naonedge-dark/starfleet/riker.png";
import v12 from "./naonedge-dark/starfleet/data.png";
import v13 from "./naonedge-dark/starfleet/geordi.png";
import v14 from "./naonedge-dark/starfleet/worf.png";
import v15 from "./naonedge-light/lotr/galadriel.png";
import v16 from "./naonedge-light/lotr/aragorn.png";
import v17 from "./naonedge-light/lotr/gandalf.png";
import v18 from "./naonedge-light/lotr/gimli.png";
import v19 from "./naonedge-light/lotr/legolas.png";
import v20 from "./naonedge-light/avengers/nickfury.png";
import v21 from "./naonedge-light/avengers/capamerica.png";
import v22 from "./naonedge-light/avengers/strange.png";
import v23 from "./naonedge-light/avengers/ironman.png";
import v24 from "./naonedge-light/avengers/hawkeye.png";
import v25 from "./naonedge-light/starfleet/picard.png";
import v26 from "./naonedge-light/starfleet/riker.png";
import v27 from "./naonedge-light/starfleet/data.png";
import v28 from "./naonedge-light/starfleet/geordi.png";
import v29 from "./naonedge-light/starfleet/worf.png";

export type VignetteManifest = Record<
  string,
  Record<string, Record<number, string>>
>;

export const VIGNETTES: VignetteManifest = {
  "naonedge-dark": {
    "lotr": {
      0: v0,
      1: v1,
      2: v2,
      3: v3,
      4: v4,
    },
    "avengers": {
      0: v5,
      1: v6,
      2: v7,
      3: v8,
      4: v9,
    },
    "starfleet": {
      0: v10,
      1: v11,
      2: v12,
      3: v13,
      4: v14,
    },
  },
  "naonedge-light": {
    "lotr": {
      0: v15,
      1: v16,
      2: v17,
      3: v18,
      4: v19,
    },
    "avengers": {
      0: v20,
      1: v21,
      2: v22,
      3: v23,
      4: v24,
    },
    "starfleet": {
      0: v25,
      1: v26,
      2: v27,
      3: v28,
      4: v29,
    },
  },
};
