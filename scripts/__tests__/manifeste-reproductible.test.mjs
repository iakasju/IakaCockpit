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
// │ (`updater/mesures.json`, garde `I4`), pas d'ici.                                              │
// │ CONDITION DE LEVÉE : le jour où la liste des assets de release est elle-même versionnée.      │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// ┌─ HORS-COUVERTURE DÉCLARÉ nº2 — LES CHAMPS QUE LA GARDE NE PEUT PAS VOIR ─────────────────────┐
// │ Défaut relevé au gate : CA-17 promettait qu'« altérer un octet de `updater/latest.json` fait │
// │ rougir la garde en nommant le champ ». C'est FAUX pour une partie des champs, et la cause    │
// │ est STRUCTURELLE — imposée par AR-4 = O3, l'arbitrage du décideur : `--notes` reste une       │
// │ ENTRÉE, donc la garde la tire du fichier même. Un champ qui est une ENTRÉE tirée du fichier   │
// │ le TRAVERSE par construction : altéré, il ressort altéré des deux côtés de la comparaison,    │
// │ qui reste verte. La garde ne ment pas — elle ne voit rien, et jusqu'ici elle ne le disait     │
// │ pas. Une garde qui se tait sur ce qu'elle ne couvre pas est pire qu'absente.                  │
// │                                                                                              │
// │ CE QUI TRAVERSE (MESURÉ, pas supposé — le test « HORS-COUVERTURE nº2 » ci-dessous le         │
// │ REJOUE et rougit si la partition change) :                                                    │
// │   — `version`, `notes`, `pub_date` : passés tels quels au générateur ;                        │
// │   — la `signature` d'un artefact désigné par UNE SEULE clé de plateforme. Quand deux clés     │
// │     partagent un artefact (`linux-x86_64` / `-appimage`, `windows-x86_64` / `-nsis`), altérer │
// │     l'une des deux DIVERGE — le générateur réécrit la même signature aux deux.                │
// │                                                                                              │
// │ CE QUI RESTE COUVERT, ET C'EST L'ESSENTIEL : l'ATTRIBUTION des neuf clés, le rang qui         │
// │ départage NSIS et MSI, l'ordre d'écriture, la mise en forme, et les NEUF `url`.               │
// │                                                                                              │
// │ CE QUI COUVRE LES TROUS AILLEURS, quand quelque chose les couvre :                            │
// │   — `version` : `I4` (`forge-host-parity.test.mjs`) refuse que `mesures.json` parle d'une     │
// │     autre version que le manifeste. MESURÉ : altérer `version` fait rougir `I4`.              │
// │   — `pub_date` : `I4` la borne DANS UN SEUL SENS (`mesureLe >= pub_date`). MESURÉ : avancée   │
// │     au-delà de la mesure elle rougit ; RECULÉE, elle passe partout.                           │
// │   — `notes` et les signatures solo : RIEN. Aucun fichier versionné ne les contredit.          │
// │                                                                                              │
// │ CONDITION DE LEVÉE : ces trous se ferment le jour où la source de ces entrées est elle-même   │
// │ VERSIONNÉE et distincte du manifeste — `updater/notes/<version>.md` pour les notes (option    │
// │ O2 d'AR-4, écartée comme sur-ingénierie pour un fichier), et la valeur de signature inscrite  │
// │ dans `updater/mesures.json` pour les signatures (elle n'y porte aujourd'hui que le VERDICT    │
// │ « valide », pas l'octet signé). Les deux exigent de rouvrir un arbitrage : ce lot ne le fait  │
// │ pas, il le NOMME.                                                                             │
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

/**
 * NOMME les champs qui divergent entre le fichier et sa régénération. Un refus qui rend un diff de
 * chaîne entière sur un document de 9 plateformes est inexploitable : on veut le CHEMIN du champ.
 * Quand un côté n'a pas l'objet, on descend quand même dedans — c'est ainsi qu'une plateforme
 * perdue se nomme `platforms.<clé>.url` et pas seulement `platforms.<clé>`.
 * NE VOIT PAS l'ordre des clés (la comparaison d'objets l'ignore) : c'est l'assertion à l'OCTET,
 * second niveau de la garde, qui s'en charge.
 */
function champsDivergents(attendu, obtenu, prefixe = "") {
  const ecarts = [];
  for (const c of new Set([...Object.keys(attendu ?? {}), ...Object.keys(obtenu ?? {})])) {
    const chemin = prefixe ? `${prefixe}.${c}` : c;
    const a = attendu?.[c];
    const b = obtenu?.[c];
    const objet = (v) => v !== null && typeof v === "object";
    if (objet(a) || objet(b)) {
      ecarts.push(...champsDivergents(objet(a) ? a : {}, objet(b) ? b : {}, chemin));
    } else if (a !== b) {
      const rendu = (v) => (v === undefined ? "ABSENT" : `« ${String(v).slice(0, 48)} »`);
      ecarts.push(`${chemin} : ${rendu(a)} ≠ ${rendu(b)}`);
    }
  }
  return ecarts;
}

/** Écrit une valeur au bout d'un chemin pointé (`platforms.darwin-x86_64.url`). */
function alterer(doc, chemin, valeur) {
  const parts = chemin.split(".");
  let o = doc;
  for (const k of parts.slice(0, -1)) o = o[k];
  o[parts[parts.length - 1]] = valeur;
}

/**
 * Simule EXACTEMENT la mutation du fichier versionné — sans jamais écrire dans `updater/`. On
 * alt��re le document, on le sérialise comme le ferait un éditeur, et on régénère DEPUIS l'altéré.
 * Si le résultat lui est identique, l'altération a TRAVERSÉ la garde : c'est un trou, il se déclare.
 */
function muter(chemin) {
  const doc = JSON.parse(octets());
  const parts = chemin.split(".");
  let cible = doc;
  for (const k of parts.slice(0, -1)) cible = cible[k];
  alterer(doc, chemin, `${cible[parts[parts.length - 1]]}-ALTERE`);
  const corps = `${JSON.stringify(doc, null, 2)}\n`;
  const refait = regenere(doc);
  return { traverse: refait === corps, champs: champsDivergents(doc, JSON.parse(refait)) };
}

/**
 * LA PARTITION DÉCLARÉE, sous forme de RÈGLE et non de liste figée — une liste de clés en dur
 * rougirait à chaque publication pour une raison qui n'est pas celle qu'on garde.
 * `CHAMPS_SCALAIRES` : l'univers des champs de tête, identique dans les deux dépôts.
 * `CHAMPS_PORTES` : ceux que CE générateur reçoit tels quels en entrée (AR-4 = O3) — la liste
 * diffère d'un dépôt à l'autre, et c'est mesuré, pas supposé.
 */
const CHAMPS_SCALAIRES = ["version", "notes", "pub_date"];
const CHAMPS_PORTES = ["version", "notes", "pub_date"];

/** Les champs déclarés HORS-COUVERTURE : les entrées portées + les signatures d'artefact SOLO. */
function champsPortes(doc) {
  const clesParArtefact = new Map();
  for (const [cle, p] of Object.entries(doc.platforms)) {
    const nom = decodeURIComponent(new URL(p.url).pathname.split("/").pop());
    clesParArtefact.set(nom, [...(clesParArtefact.get(nom) ?? []), cle]);
  }
  const portes = [...CHAMPS_PORTES];
  for (const cles of clesParArtefact.values()) {
    if (cles.length === 1) portes.push(`platforms.${cles[0]}.signature`);
  }
  return portes.sort();
}

/**
 * Les chemins qui désignent LE MÊME champ du MÊME artefact : la clé altérée et ses clés sœurs
 * (deux clés de plateforme peuvent pointer un seul fichier — `linux-x86_64` et `-appimage`).
 */
function soeurs(doc, chemin) {
  const [, cle, champ] = chemin.split(".");
  if (!cle || !champ) return [chemin];
  const nom = (k) => decodeURIComponent(new URL(doc.platforms[k].url).pathname.split("/").pop());
  return Object.keys(doc.platforms)
    .filter((k) => nom(k) === nom(cle))
    .map((k) => `platforms.${k}.${champ}`);
}

/** Tous les champs scalaires du manifeste — l'univers sur lequel la partition est mesurée. */
function tousLesChamps(doc) {
  const champs = [...CHAMPS_SCALAIRES];
  for (const cle of Object.keys(doc.platforms)) {
    champs.push(`platforms.${cle}.url`, `platforms.${cle}.signature`);
  }
  return champs.sort();
}

describe("D-6 — régénérer le manifeste publié reproduit le fichier VERSIONNÉ, à l'octet", () => {
  it("CA-16 — la republication à l'identique est ATTEIGNABLE et PROUVÉE", () => {
    const corps = octets();
    const refait = regenere(JSON.parse(corps));
    // DEUX NIVEAUX. D'abord le CHAMP — un refus qui rend un diff de chaîne entière sur neuf
    // plateformes n'est pas exploitable ; ensuite l'OCTET, qui seul voit l'ordre et la mise en
    // forme. Le premier nomme, le second ne laisse rien passer.
    expect(
      champsDivergents(JSON.parse(corps), JSON.parse(refait)).join("\n"),
      `${MANIFEST_PATH} n'est pas reproductible par sa propre chaine`,
    ).toBe("");
    expect(refait, `${MANIFEST_PATH} : ordre des clés ou mise en forme non reproduits`).toBe(corps);
  });

  it("la comparaison est CHARGEUSE : chaque champ du manifeste la fait diverger", () => {
    // CONTREFACTUEL — l'altération est FABRIQUÉE ICI, jamais écrite dans `updater/`. Il prouve
    // que la comparaison ci-dessus n'est pas une égalité de complaisance : quatre champs
    // distincts, quatre divergences. La mutation du FICHIER versionné, elle, est faite hors test
    // (CA-17) et révoquée.
    // FIXTURES DÉRIVÉES, JAMAIS FIGÉES. Une valeur d'altération écrite en dur (`"2020-01-01T00:
    // 00:00Z"`) devient ÉGALE au fichier le jour où le fichier la porte : le contrefactuel tombe
    // alors pour une raison qui n'a rien à voir avec ce qu'il prouve. Relevé au gate ; chaque
    // altération est donc dérivée de la valeur courante, donc différente par construction.
    const casTest = [
      ["notes", (m) => (m.notes = `${m.notes} (altere)`)],
      ["pub_date", (m) => (m.pub_date += "-altere")],
    ];
    const cle = Object.keys(JSON.parse(octets()).platforms)[0];
    casTest.push([`platforms.${cle}.url`, (m) => (m.platforms[cle].url += "-altere")]);
    casTest.push([`platforms.${cle}.signature`, (m) => (m.platforms[cle].signature += "-altere")]);

    for (const [champ, alterer] of casTest) {
      const altere = JSON.parse(octets());
      alterer(altere);
      expect(
        regenere(altere),
        `le champ « ${champ} » peut être altéré sans que la régénération ne diverge`,
      ).not.toBe(octets());
    }
  });

  it("CA-17 — muter le FICHIER versionné : tout champ COUVERT fait rougir, et le refus le NOMME", () => {
    // LA FORME HONNÊTE DE CA-17. Le critère d'origine promettait cette propriété pour TOUT octet du
    // fichier ; elle ne vaut que pour les champs que le GÉNÉRATEUR DÉCIDE (hors-couverture nº2 en
    // tête de fichier). Ici on l'éprouve sur ces champs-là, un par un, en simulant la mutation du
    // fichier — jamais en écrivant dans `updater/`.
    const doc = JSON.parse(octets());
    const portes = new Set(champsPortes(doc));
    const couverts = tousLesChamps(doc).filter((c) => !portes.has(c));
    expect(couverts.length, "aucun champ couvert : la garde ne verrait plus rien").toBeGreaterThan(0);
    for (const chemin of couverts) {
      const { traverse, champs } = muter(chemin);
      expect(traverse, `« ${chemin} » est réputé COUVERT, et il traverse la garde`).toBe(false);
      // CE QUI EST NOMMÉ, EXACTEMENT : le champ altéré, OU le même champ d'une clé SŒUR — les deux
      // désignent le même artefact. Quand deux clés partagent un artefact, le générateur réécrit la
      // signature vue EN PREMIER aux deux : altérer la première fait donc diverger la seconde. Le
      // refus reste exploitable (il nomme un champ du même fichier téléchargé), et prétendre qu'il
      // nomme toujours la clé altérée serait faux.
      const attendus = soeurs(doc, chemin);
      expect(
        attendus.some((a) => champs.some((c) => c.startsWith(`${a} `))),
        `la garde rougit sans nommer aucun de ${attendus.join(", ")} — refus obtenu : ` +
          `${champs.join(" | ") || "(aucun champ nommé)"}`,
      ).toBe(true);
    }
  });

  it("HORS-COUVERTURE nº2 — les champs PORTÉS traversent, et ce sont EXACTEMENT ceux déclarés", () => {
    // LA DÉCLARATION EST MESURÉE, PAS SEULEMENT ÉCRITE — c'est ce qui la distingue d'une prose qui
    // vieillit. Ce test est un CLIQUET À DOUBLE SENS : le jour où quelqu'un FERME un de ces trous,
    // il rougit et force à retirer la ligne du hors-couverture ; le jour où quelqu'un en OUVRE un
    // nouveau, il rougit aussi. Aucune des deux dérives ne peut être silencieuse.
    const doc = JSON.parse(octets());
    const attendu = champsPortes(doc);
    const mesure = tousLesChamps(doc).filter((c) => muter(c).traverse);
    expect(
      mesure.join("\n"),
      "la partition MESURÉE ne correspond plus au hors-couverture nº2 DÉCLARÉ en tête de ce " +
        "fichier : mettre la déclaration à jour (ou reconnaître le trou), jamais ce test seul",
    ).toBe(attendu.join("\n"));
  });
});
