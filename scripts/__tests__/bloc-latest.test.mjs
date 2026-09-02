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
import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

// UN TEMOIN D'ERREUR SE FABRIQUE, IL NE SE DESIGNE PAS — rectifie le 2026-09-01 (L44).
// Ce fichier portait ici `expect(() => empreinteAttendue(resolve(ROOT, "scripts"))).toThrow()`.
// `empreinteAttendue` LIT UN FICHIER : une racine sans fixture jette `ENOENT` AVANT les deux
// branches que l'assertion pretendait garder, et `toThrow()` s'en satisfait. Le temoin passait
// donc AUSSI quand on supprimait les branches — mesure : les deux branches otees, `npm run test`
// restait vert des deux cotes. C'etait FAIL-F1 de L42, reproduit dans un fichier NEUF.
//
// REGLE DU LOT, desormais : TOUTE assertion `toThrow*` ANCRE LE MESSAGE de la branche qu'elle
// nomme, et cette branche doit etre la SEULE a la satisfaire. On fabrique donc la fixture fautive
// dans une racine jetable, pour que le `readFileSync` reussisse et que l'erreur mesuree soit bien
// celle qu'on garde.
const jetables = [];

/** Ecrit `contenu` en `fixtures/bloc-latest.sha256` dans une racine jetable, et rend la racine. */
function racineAvecFixture(contenu) {
  const racine = mkdtempSync(resolve(tmpdir(), "bloc-latest-"));
  jetables.push(racine);
  const cible = resolve(racine, CHEMIN_FIXTURE);
  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, contenu, "utf8");
  return racine;
}

afterAll(() => {
  for (const racine of jetables) rmSync(racine, { recursive: true, force: true });
});

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
    // RETIRE LE 2026-09-02 (ecart 2, gate PASS de L44) : une assertion `not.toThrow()` suivait
    // ici, commentee comme servant a « faire porter a l'echec un nom lisible dans le rapport de
    // test ». Mutation M4 du gate REFUTE ce role : `lireBloc(ROOT)` ci-dessous appelle DEJA
    // `extraireBloc` et JETTE la premiere si le marqueur n'est pas unique — verifie : une
    // mutation locale (deux marqueurs dans le workflow reel) fait echouer CE TEST a la ligne
    // ci-dessous, avec le message NOMME de `extraireBloc`, avant que la ligne retiree n'ait
    // jamais ete atteinte. `texte` y valait d'ailleurs le bloc DEJA EXTRAIT, pas le texte du
    // workflow : l'assertion ne pouvait pas jouer le role qu'elle s'attribuait.
    const lignes = lireBloc(ROOT).split("\n");
    expect(lignes[0], "le bloc extrait ne commence pas par le marqueur").toBe(MARQUEUR);
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

  // LES QUATRE TEMOINS DE LA FIXTURE. Trois erreurs NOMMEES, une reussite — sans la reussite,
  // « ca jette toujours » satisferait les trois autres. Chacun fabrique sa fixture (cf. plus haut).
  it("une fixture BIEN FORMEE rend l'empreinte, commentaires et blancs ignores", () => {
    const attendue = "a".repeat(64);
    const racine = racineAvecFixture(
      ["# un commentaire", "", `${attendue}  bloc du workflow`, ""].join("\n"),
    );
    expect(empreinteAttendue(racine)).toBe(attendue);
  });

  it("DEUX empreintes dans la fixture : illisible plutot que permissive", () => {
    const racine = racineAvecFixture(
      ["# deux lignes utiles", `${"a".repeat(64)}  bloc`, `${"b".repeat(64)}  bloc`, ""].join("\n"),
    );
    expect(() => empreinteAttendue(racine)).toThrowError(
      /doit porter EXACTEMENT une empreinte, 2 trouvee\(s\)/,
    );
  });

  it("ZERO empreinte (que des commentaires) : illisible plutot que permissive", () => {
    const racine = racineAvecFixture(["# rien que du commentaire", "", ""].join("\n"));
    expect(() => empreinteAttendue(racine)).toThrowError(
      /doit porter EXACTEMENT une empreinte, 0 trouvee\(s\)/,
    );
  });

  it("ligne d'empreinte MALFORMEE : illisible plutot que permissive", () => {
    const racine = racineAvecFixture(["pas-une-empreinte  bloc du workflow", ""].join("\n"));
    expect(() => empreinteAttendue(racine)).toThrowError(
      /ligne d'empreinte illisible dans fixtures\/bloc-latest\.sha256 : pas-une-empreinte {2}bloc du workflow/,
    );
  });
});
