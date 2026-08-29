// publish-readme-jonction.test.mjs — LA JONCTION README <-> GARDE D'ALIGNEMENT, gardee.
//
// ┌─ FICHIER LOCAL, PAS CONVERGENT ──────────────────────────────────────────────────────────────┐
// │ Il n'existe QUE dans IakaCockpit, et c'est la consequence d'une divergence PREEXISTANTE entre │
// │ les deux applications jumelles, dite plutot que masquee. Le depot frere (iakaFrameGUI) garde  │
// │ ses porteurs de version par un dispositif RICHE — registre `VERSION_CARRIERS` avec la raison  │
// │ de chaque entree, registre `VERSION_NON_CARRIERS`, et un CLIQUET comparant les cles LUES aux  │
// │ cles DECLAREES : chez lui, retirer le cablage du README fait rougir la suite sans une ligne   │
// │ de plus. Ici, `checkVersionAlignment` enumere ses sources EN DUR, sans registre ni cliquet :  │
// │ retirer `readme` de l'appel ferait retomber la garde a quatre sources SANS QUE RIEN NE LE     │
// │ DISE. Ce fichier est ce qui manque pour egaler le frere sur ce point PRECIS — il n'importe    │
// │ PAS tout son dispositif, ce serait un autre lot.                                             │
// │ CONDITION DE LEVEE : le jour ou les deux gardes de version convergent, ce test devient        │
// │ redondant avec le cliquet du frere et se retire.                                             │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// POURQUOI IL EXECUTE LE SCRIPT AU LIEU DE LE RELIRE. Une jonction ne se prouve pas en cherchant
// une chaine de caracteres dans un fichier source : c'est le meme genre de preuve que le
// `.toBe(false)` qui certifiait le faux. On LANCE `publish-update.mjs --check-only` et on lit CE
// QU'IL DIT AVOIR GARDE. Supprimer `readme` de l'appel fait disparaitre `README.md` de cette
// ligne — et ce test rougit.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSION = JSON.parse(readFileSync(resolve(RACINE, "package.json"), "utf8")).version;

describe("jonction — le README est REELLEMENT soumis a la garde d'alignement", () => {
  it("`publish-update.mjs --check-only` compte README.md parmi ses sources gardees", () => {
    // `--check-only` ne touche a rien, n'ouvre aucun reseau et sort avant la garde de branche :
    // c'est le contrat C7 du script, et il en fait un point d'observation sur.
    // Le JOURNAL du script sort sur STDERR — separation des canaux posee par L41 (D-2), stdout
    // n'etant reserve qu'au document. Lire stdout ici rendrait ce test vert a vide sur une chaine
    // vide : c'est exactement le faux vert qu'on chasse.
    const r = spawnSync(
      process.execPath,
      ["scripts/publish-update.mjs", `v${VERSION}`, "--check-only"],
      { cwd: RACINE, encoding: "utf8" },
    );
    expect(r.status, `--check-only doit sortir 0 sur un depot aligne\n${r.stderr}`).toBe(0);
    const sortie = r.stderr;
    expect(sortie.trim().length, "le script doit AVOIR PARLE : une sortie vide n'est pas une preuve").toBeGreaterThan(0);
    expect(
      sortie,
      "README.md a disparu des sources d'alignement : le cablage a ete retire de l'appel a " +
        "checkVersionAlignment, et la vitrine peut de nouveau annoncer une version que le depot " +
        "ne porte pas (defaut H-1 de L42).",
    ).toContain("README.md");
    expect(sortie).toContain(`versions alignées sur ${VERSION}`);
  });
});
