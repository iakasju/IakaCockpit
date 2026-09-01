// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ BYTE-IDENTIQUE entre IakaCockpit et iakaFrameGUI, inscrit a `fixtures/convergence.sha256`.   │
// │ Toute modification se fait DANS LES DEUX DEPOTS au meme commit logique, puis on regenere les │
// │ empreintes (voir l'en-tete du registre) et on rejoue les DEUX faces.                         │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LA GARDE LOCALE DU BLOC `latest:` (lot L44, AR-3 = (b)).
//
// CE QU'ELLE FERME, ET C'ETAIT MESURE. Le job qui designe le pointeur de release existe en deux
// copies, une par depot jumeau, byte-identiques au 2026-08-30. Cote iakaFrameGUI, AUCUNE face de
// convergence ne couvrait `.github/workflows/release.yml` : la preuve en avait ete faite par
// mutation — un octet change laissait les deux faces VERTES. Cette garde-ci tourne DANS LE GATE
// DES DEUX DEPOTS, hors reseau et sans dependance, et compare le bloc a une fixture partagee.
//
// LA CHAINE, ET POURQUOI ELLE NE TRICHE PAS :
//   bloc(Cockpit) -- garde locale --> fixture == convergence == fixture <-- garde locale -- bloc(GUI)
// La fixture est byte-identique PAR CONSTRUCTION (c'est une empreinte, rien d'autre) : elle est
// alignee DELIBEREMENT, la ou aligner les deux `release.yml` entiers obligerait a trancher EN
// PASSANT une question de build (successeur CONVERGENCE-RELEASE-YML-ALIGNEMENT).
//
// CE QU'ELLE NE FAIT PAS : juger le CONTENU du bloc. Elle compare des octets a une empreinte. Que
// le job fasse ce qu'il pretend faire ne se prouve pas ici — ca se mesure sur un banc.
import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHEMIN_FIXTURE,
  CHEMIN_WORKFLOW,
  MARQUEUR,
  empreinte,
  empreinteAttendue,
  extraireBloc,
  lireBloc,
} from "../lib/bloc-latest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("bloc `latest:` du workflow de release — garde locale (L44)", () => {
  it("CA-12 — le bloc du depot porte EXACTEMENT l'empreinte de la fixture partagee", () => {
    const obtenue = empreinte(lireBloc(ROOT));
    expect(
      obtenue,
      `le bloc extrait de ${CHEMIN_WORKFLOW} ne porte plus l'empreinte inscrite a ` +
        `${CHEMIN_FIXTURE}. Ce bloc CONVERGE : il se modifie DANS LES DEUX DEPOTS au meme commit ` +
        "logique, puis on re-mesure l'empreinte et on met la fixture a jour DES DEUX COTES. " +
        "Si un seul cote a bouge, c'est la derive que cette garde existe pour dire.",
    ).toBe(empreinteAttendue(ROOT));
  });

  it("CA-11 — le marqueur est unique dans le workflow reel", () => {
    const lignes = lireBloc(ROOT).split("\n");
    expect(lignes[0], "le bloc extrait ne commence pas par le marqueur").toBe(MARQUEUR);
    // `lireBloc` a deja asserte l'unicite ; on la re-affirme ici pour que l'echec porte un nom
    // lisible dans le rapport de test, et pas seulement dans la pile d'une exception.
    const texte = lireBloc(ROOT);
    expect(() => extraireBloc(texte)).not.toThrow();
  });

  it("CA-11 — ZERO marqueur : la garde ROUGIT, elle ne devine pas", () => {
    expect(() => extraireBloc("jobs:\n  build:\n    runs-on: ubuntu-latest\n")).toThrowError(
      /apparait 0 fois/,
    );
  });

  it("CA-11 — DEUX marqueurs : la garde ROUGIT, la borne « jusqu'a la fin » n'est plus vraie", () => {
    const faux = [MARQUEUR, "    a: 1", MARQUEUR, "    b: 2", ""].join("\n");
    expect(() => extraireBloc(faux)).toThrowError(/apparait 2 fois/);
  });

  it("le bloc va du marqueur JUSQU'A LA FIN du fichier, verbatim", () => {
    const texte = ["name: x", "jobs:", "  build:", MARQUEUR, "    needs: build", ""].join("\n");
    expect(extraireBloc(texte)).toBe([MARQUEUR, "    needs: build", ""].join("\n"));
  });

  it("la fixture est illisible plutot que permissive quand elle ne porte pas UNE empreinte", () => {
    expect(() => empreinteAttendue(resolve(ROOT, "scripts"))).toThrow();
  });
});
