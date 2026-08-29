// manifeste-reproductible.test.mjs — LA REPUBLICATION À L'IDENTIQUE, PROUVÉE (L41, défaut D-6).
//
// ┌─ FICHIER NON CONVERGENT — et c'est délibéré ─────────────────────────────────────────────────┐
// │ Les deux applications composent leur manifeste avec un générateur de SIGNATURE DIFFÉRENTE    │
// │ (`scripts/lib/update-manifest.mjs` ici, `buildManifest` exporté de `scripts/publish-update`  │
// │ .mjs chez la jumelle). Un fichier byte-identique exigerait un adaptateur commun, donc un      │
// │ paquet partagé — l'option O1 d'AR-6 de L40, que ce lot n'ouvre pas. Ce fichier n'est donc PAS │
// │ inscrit dans `fixtures/convergence.sha256` : seul son ATTENDU est le même des deux côtés.    │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// CE QUE PROUVAIT CA-14 DE L40, ET CE QU'IL NE PROUVAIT PAS. Il comparait DEUX RUNS entre eux, à
// entrées égales : il établissait le déterminisme du générateur, jamais que le manifeste VERSIONNÉ
// soit reproductible par la chaîne qui prétend l'avoir produit. Or la doctrine du dépôt est nette :
// une preuve se compare à un FICHIER VERSIONNÉ, jamais à la sortie d'une autre commande.
//
// CE QUE PROUVE CETTE GARDE. En repartant des artefacts que le manifeste versionné désigne, et en
// tirant `notes` ET `pub_date` DE CE FICHIER MÊME (AR-4 = O3 : `--notes` reste une entrée, on ne
// détruit pas les vraies notes pour gagner une reproductibilité qu'on obtient autrement), le
// générateur doit reproduire le fichier À L'OCTET. Ce qui est réellement éprouvé : l'attribution
// des NEUF clés (générique vs installeur), l'ordre d'écriture, le rang qui départage NSIS et MSI,
// et la mise en forme. Une modification du générateur qui changerait l'une de ces décisions —
// préférer le MSI au NSIS, par exemple — fait rougir ici, contre un fichier versionné.
//
// ┌─ HORS-COUVERTURE DÉCLARÉ ────────────────────────────────────────────────────────────────────┐
// │ Le jeu d'artefacts d'entrée est RECONSTRUIT depuis le manifeste : un artefact présent sur la │
// │ release mais ABSENT du manifeste (parce que non signé, ou d'un type inconnu) est invisible    │
// │ ici. Cette garde prouve que le manifeste est reproductible à partir de ce qu'il annonce ; que │
// │ ce qu'il annonce soit tout ce que la release porte relève de la MESURE                       │
// │ (`updater/mesures.json`, garde `I4`), pas d'ici. CONDITION DE LEVÉE : le jour où la liste des │
// │ assets de release est elle-même versionnée.                                                   │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest } from "../lib/update-manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = "updater/latest.json";

/** Le fichier versionné, tel qu'il est sur le disque — l'octet, pas l'objet. */
const octets = () => readFileSync(resolve(ROOT, MANIFEST_PATH), "utf8");

/**
 * Reconstruit les ENTRÉES du générateur depuis le manifeste : chaque URL distincte est un artefact
 * (nom = dernier segment), porteur de la signature que le manifeste lui associe.
 */
function entreesDuManifeste(manifest) {
  const base = new Set();
  const parNom = new Map();
  for (const p of Object.values(manifest.platforms ?? {})) {
    const url = new URL(p.url);
    const segments = url.pathname.split("/");
    const name = decodeURIComponent(segments.pop());
    base.add(`${url.origin}${segments.join("/")}`);
    if (!parNom.has(name)) parNom.set(name, { name, signature: p.signature });
  }
  expect(base.size, `plusieurs bases d'URL dans le manifeste : ${[...base].join(", ")}`).toBe(1);
  return { entries: [...parNom.values()], baseUrl: [...base][0] };
}

function regenere(manifest) {
  const { entries, baseUrl } = entreesDuManifeste(manifest);
  const { manifest: refait } = buildManifest({
    version: manifest.version,
    // `notes` ET `pub_date` sont tirés DU FICHIER VERSIONNÉ — c'est le point de la garde.
    notes: manifest.notes,
    pubDate: manifest.pub_date,
    entries,
    baseUrl,
  });
  return `${JSON.stringify(refait, null, 2)}\n`;
}

describe("D-6 — régénérer le manifeste publié reproduit le fichier VERSIONNÉ, à l'octet", () => {
  it("CA-16 — la republication à l'identique est ATTEIGNABLE et PROUVÉE", () => {
    const corps = octets();
    const refait = regenere(JSON.parse(corps));
    expect(refait, `${MANIFEST_PATH} n'est pas reproductible par sa propre chaine`).toBe(corps);
  });

  it("la comparaison est CHARGEUSE : chaque champ du manifeste la fait diverger", () => {
    // CONTREFACTUEL — l'altération est FABRIQUÉE ICI, jamais écrite dans `updater/`. Il prouve
    // que la comparaison ci-dessus n'est pas une égalité de complaisance : quatre champs
    // distincts, quatre divergences. La mutation du FICHIER versionné, elle, est faite hors test
    // (CA-17) et révoquée.
    const casTest = [
      ["notes", (m) => (m.notes = `${m.notes} (altere)`)],
      ["pub_date", (m) => (m.pub_date = "2020-01-01T00:00:00Z")],
    ];
    const cle = Object.keys(JSON.parse(octets()).platforms)[0];
    casTest.push([`platforms.${cle}.url`, (m) => (m.platforms[cle].url += "-altere")]);
    casTest.push([`platforms.${cle}.signature`, (m) => (m.platforms[cle].signature = "sig-alteree")]);

    for (const [champ, alterer] of casTest) {
      const altere = JSON.parse(octets());
      alterer(altere);
      expect(
        regenere(altere),
        `le champ « ${champ} » peut être altéré sans que la régénération ne diverge`,
      ).not.toBe(octets());
    }
  });
});
