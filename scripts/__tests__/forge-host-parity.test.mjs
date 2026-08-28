// Cohérence du CANAL de distribution — garde de non-dérive.
//
// ┌─ CE QUI CHANGE ICI, ET POURQUOI (révision du 2026-08-28, décision du décideur) ──────────────┐
// │                                                                                              │
// │ INVARIANT RETIRÉ — « endpoint, miroir front, script de publication et manifeste désignent le │
// │ MÊME hôte ». Il présumait ce qui est faux : qu'il y aurait UN manifeste PAR canal, chacun    │
// │ renvoyant vers son propre hôte. Il n'y en a qu'UN, recopié, et ses URL sont ABSOLUES : le    │
// │ même document est lu par un poste du LAN et par une machine qui n'y sera jamais. Faire       │
// │ pointer ses URL vers une adresse de LAN, c'est promettre un téléchargement à des lecteurs    │
// │ qui ne peuvent pas l'atteindre. L'ancien invariant ne l'interdisait pas — il l'EXIGEAIT.     │
// │                                                                                              │
// │ INVARIANT QUI LE REMPLACE — « le manifeste annonce un hôte de téléchargement PUBLIC, le même │
// │ pour tous ses lecteurs, quel que soit le canal qui l'a servi » (I1 + I2). La séparation est  │
// │ assumée : l'hôte de LECTURE reste la forge du LAN (la plus proche), l'hôte de TÉLÉCHARGEMENT │
// │ est public. Ce que la forge du LAN reçoit encore est un MIROIR.                              │
// │                                                                                              │
// │ CE QUE LA GARDE CONTINUE D'INTERDIRE, sans rien céder :                                      │
// │   — qu'un hôte MORT apparaisse là où il ferait échouer quelque chose (I3) ;                  │
// │   — qu'on ANNONCE une URL que personne n'a ouverte (I4) — le défaut exact du 2026-08-28.     │
// │                                                                                              │
// │ La parité `tauri.conf.json` ↔ miroir front n'est PAS abandonnée : elle est déjà tenue, liste │
// │ complète et ordre compris, par `src/__tests__/updateEndpoints.test.ts`. On ne la duplique pas.│
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const hostOf = (url) => new URL(url).host;

/** Hôte mesuré hors service : machine éteinte, elle ne reviendra pas (constat du 2026-08-28). */
const HOTE_MORT = "192.168.2.11:3001";

/**
 * LE REGISTRE DES HORS-COUVERTURE — motivé, daté, et porteur de sa condition de levée.
 *
 * Une garde qui se tait sur ce qu'elle ne couvre pas est pire qu'absente. Celle-ci NOMME le trou :
 * les deux plateformes de `v0.32.1` sont construites, signées et vérifiées localement, mais la
 * release GitHub qui les portera **n'existe pas encore** — la créer est un acte de PUBLICATION,
 * qui appartient au gate humain. Les URL annoncées sont donc mesurées `404` à cette date.
 *
 * CLIQUET — ce registre se DÉTRUIT tout seul : I4 exige qu'une plateforme inscrite ici soit
 * encore mesurée NON téléchargeable. Le jour où la release existe et où `updater/mesures.json`
 * est régénéré, l'entrée devient fausse, le test tombe, et il faut la RETIRER. Une exception ne
 * peut donc pas survivre à sa raison d'être.
 */
const HORS_COUVERTURE = [
  {
    plateforme: "darwin-aarch64",
    motif: "release GitHub v0.32.1 non creee — artefact construit, signe et verifie localement",
    date: "2026-08-28",
    leveePar: "creation de la release GitHub v0.32.1 + televersement des artefacts (acte humain)",
  },
  {
    plateforme: "darwin-x86_64",
    motif: "release GitHub v0.32.1 non creee — artefact construit, signe et verifie localement",
    date: "2026-08-28",
    leveePar: "creation de la release GitHub v0.32.1 + televersement des artefacts (acte humain)",
  },
];

/** La liste ORDONNÉE d'endpoints de l'updater — source de vérité du canal de LECTURE. */
function endpoints() {
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const eps = conf.plugins?.updater?.endpoints ?? [];
  expect(eps.length, "aucun endpoint d'update déclaré").toBeGreaterThan(0);
  return eps;
}

/** Hôte de TÉLÉCHARGEMENT déclaré par `publish-update.mjs` — celui qu'écrira le manifeste. */
function hostFromArtefactBase() {
  const m = read("scripts/publish-update.mjs").match(/^const ARTEFACT_BASE = "([^"]+)";/m);
  expect(m, "publish-update.mjs doit déclarer ARTEFACT_BASE").toBeTruthy();
  return hostOf(m[1]);
}

function manifeste() {
  return JSON.parse(read("updater/latest.json"));
}
function plateformesDuManifeste() {
  const plats = Object.entries(manifeste().platforms ?? {});
  expect(plats.length, "manifeste sans plateforme").toBeGreaterThan(0);
  return plats.map(([nom, p]) => {
    expect(p?.url, `plateforme ${nom} sans url`).toBeTruthy();
    return [nom, p];
  });
}

/**
 * Un hôte PUBLIC : ni adresse de LAN, ni boucle locale, ni nom non résolvable hors du réseau.
 * On teste la PROPRIÉTÉ (« atteignable depuis n'importe où »), jamais une valeur.
 */
function estPrive(hote) {
  const h = hote.split(":")[0];
  return (
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "localhost" ||
    h.endsWith(".local")
  );
}

/** Le REGISTRE DE MESURE : ce qui a réellement été ouvert, quand, et avec quel résultat. */
function mesures() {
  return JSON.parse(read("updater/mesures.json"));
}

describe("canal de distribution (Cockpit) — cohérence, publicité, mesure", () => {
  it("I1 — le manifeste désigne l'hôte de téléchargement déclaré, et un SEUL", () => {
    const base = hostFromArtefactBase();
    for (const [nom, p] of plateformesDuManifeste()) {
      expect(hostOf(p.url), `manifeste[${nom}] ≠ ARTEFACT_BASE`).toBe(base);
    }
  });

  it("I2 — cet hôte est PUBLIC : un manifeste unique est lu par des machines hors du LAN", () => {
    const base = hostFromArtefactBase();
    expect(estPrive(base), `hôte de téléchargement privé : ${base}`).toBe(false);
    for (const [nom, p] of plateformesDuManifeste()) {
      expect(estPrive(hostOf(p.url)), `manifeste[${nom}] pointe une adresse privée`).toBe(false);
    }
  });

  it("I3 — l'hôte mort n'est ni la cible de téléchargement, ni le premier endpoint lu", () => {
    // Le garder EN TÊTE, c'est promettre une mise à jour qui ne peut pas aboutir. Le garder en
    // DERNIER secours est légitime : il ne coûte qu'un essai, au cas où la machine revienne.
    expect(hostOf(endpoints()[0]), "endpoint primaire mort").not.toBe(HOTE_MORT);
    expect(hostFromArtefactBase(), "téléchargement vers un hôte mort").not.toBe(HOTE_MORT);
    for (const [nom, p] of plateformesDuManifeste()) {
      expect(hostOf(p.url), `manifeste[${nom}] pointe l'hôte mort`).not.toBe(HOTE_MORT);
    }
  });

  it("I4 — aucune plateforme annoncée sans MESURE, et tout trou est DÉCLARÉ", () => {
    const m = mesures();
    expect(m.mesureLe, "mesures.json sans date de mesure").toBeTruthy();
    expect(m.version, "mesures.json doit dire de quelle version il parle").toBe(manifeste().version);

    const parUrl = new Map((m.artefacts ?? []).map((a) => [a.url, a]));
    const declarees = new Map(HORS_COUVERTURE.map((h) => [h.plateforme, h]));

    for (const [nom, p] of plateformesDuManifeste()) {
      const mesure = parUrl.get(p.url);
      expect(mesure, `plateforme ${nom} ANNONCÉE sans mesure de ${p.url}`).toBeTruthy();

      const trou = declarees.get(nom);
      if (!trou) {
        expect(mesure.status, `${nom} : mesuré ${mesure.status}, pas 200`).toBe(200);
        expect(mesure.octets, `${nom} : mesuré vide`).toBeGreaterThan(0);
        expect(mesure.signature, `${nom} : signature non vérifiée`).toBe("valide");
        continue;
      }
      // CLIQUET : l'exception doit encore correspondre à la réalité mesurée. Dès que l'artefact
      // devient téléchargeable, cette ligne tombe — et l'exception DOIT être retirée.
      expect(
        mesure.status,
        `${nom} : hors-couverture déclaré alors que l'artefact répond ${mesure.status} — ` +
          `retirer l'entrée de HORS_COUVERTURE (${trou.leveePar})`,
      ).not.toBe(200);
    }
  });

  it("I4bis — une exception ne peut pas être ajoutée en silence : motif, date, condition", () => {
    // Ce qui distingue un hors-couverture d'un mensonge : il se lit, il se date, et il dit à
    // quelle condition il disparaît.
    const plats = new Set(Object.keys(manifeste().platforms ?? {}));
    for (const h of HORS_COUVERTURE) {
      expect(h.motif, `exception ${h.plateforme} sans motif`).toBeTruthy();
      expect(h.date, `exception ${h.plateforme} sans date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.leveePar, `exception ${h.plateforme} sans condition de levée`).toBeTruthy();
      expect(
        plats.has(h.plateforme),
        `exception ${h.plateforme} : plateforme absente du manifeste — exception fantôme`,
      ).toBe(true);
    }
  });

  it("I5 — la liste de lecture porte au moins DEUX hôtes distincts, sinon rien ne bascule", () => {
    // CA-11 : « une app dont le premier endpoint est mort voit quand même la mise à jour ». Une
    // liste d'un seul hôte (ou d'un hôte répété) ne bascule sur rien — elle réessaie la panne.
    const hotes = endpoints().map(hostOf);
    expect(new Set(hotes).size, `endpoints en doublon : ${hotes.join(", ")}`).toBe(hotes.length);
    expect(new Set(hotes).size, "un seul hôte : aucune redondance").toBeGreaterThanOrEqual(2);
  });
});
