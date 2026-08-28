// Cohérence du CANAL de distribution — garde de non-dérive.
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Ce fichier est BYTE-IDENTIQUE dans IakaCockpit et iakaFrameGUI. Il ne l'était pas : le       │
// │ registre `HORS_COUVERTURE` et son contrôle de forme `I4bis` n'existaient QUE côté Cockpit,   │
// │ et rien ne signalait ce trou côté GUI. Deux gardes qui divergent, c'est une garde et demie.  │
// │ Ce qui les rendait différentes — le nom du produit, la forme de la déclaration               │
// │ d'`ARTEFACT_BASE` — est désormais LU, plus écrit en dur.                                     │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
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
// │ L'ASSERTION D'I4 N'EST PLUS ÉCRITE ICI (L40, défaut B) : elle vit dans la fonction PURE      │
// │ `scripts/lib/verifier-mesures.mjs`, testable sur fixtures — donc sur les cas qu'elle est     │
// │ censée interdire, ce qu'un test sur les fichiers réels du dépôt ne peut pas faire. Ce        │
// │ fichier en est l'APPELANT MINCE sur les fichiers réels.                                      │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifierMesures, verifierHorsCouverture } from "../lib/verifier-mesures.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const hostOf = (url) => new URL(url).host;

/** Le nom du produit — LU, jamais écrit en dur : c'est ce qui rend ce fichier convergent. */
const PRODUIT = JSON.parse(read("package.json")).name;

/** Hôte mesuré hors service : machine éteinte, elle ne reviendra pas (constat du 2026-08-28). */
const HOTE_MORT = "192.168.2.11:3001";

/**
 * LE REGISTRE DES HORS-COUVERTURE — motivé, daté, et porteur de sa condition de levée.
 *
 * Une garde qui se tait sur ce qu'elle ne couvre pas est pire qu'absente. Celle-ci NOMME ses trous.
 *
 * IL EST VIDE, ET C'EST UN RÉSULTAT — pas un oubli. Au 2026-08-29, les NEUF clés du manifeste
 * (les quatre génériques et les cinq clés d'installeur) répondent `200`, servent un octet non
 * vide, et leur signature vérifie l'octet SERVI — y compris `.deb` et `.rpm`, qui se sont avérés
 * SIGNÉS sur les deux releases : le risque « installeurs non signés » ne s'est pas matérialisé,
 * et aucune exception n'a eu à être ouverte pour lui.
 *
 * CLIQUET — ce registre se DÉTRUIT tout seul : `I4` exige qu'une plateforme inscrite ici soit
 * encore mesurée NON téléchargeable. Une exception ne peut pas survivre à sa raison d'être.
 *
 * CE QUE LE VIDE RALLUME — toute clé du manifeste passe par la branche STRICTE de `I4` : `200`,
 * non vide, ET `signature: "valide"`. Une plateforme hors-couverture ne voyait sa signature
 * assertée par rien ; plus aucune n'échappe à cette assertion.
 *
 * Y RÉINSCRIRE UNE PLATEFORME reste possible — c'est le point du registre — mais jamais en
 * silence : `I4bis` exige motif, date, condition de levée, et une plateforme réellement annoncée.
 */
const HORS_COUVERTURE = [];

/** La liste ORDONNÉE d'endpoints de l'updater — source de vérité du canal de LECTURE. */
function endpoints() {
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const eps = conf.plugins?.updater?.endpoints ?? [];
  expect(eps.length, "aucun endpoint d'update déclaré").toBeGreaterThan(0);
  return eps;
}

/**
 * Hôte de TÉLÉCHARGEMENT déclaré par `publish-update.mjs` — celui qu'écrira le manifeste.
 * Le `export` est optionnel : un dépôt exporte la constante pour ses tests, l'autre non, et ce
 * détail de forme n'a jamais eu à faire diverger deux gardes.
 */
function hostFromArtefactBase() {
  const m = read("scripts/publish-update.mjs").match(
    /^(?:export )?const ARTEFACT_BASE = "([^"]+)";/m,
  );
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
 * On teste la PROPRIÉTÉ (« atteignable depuis n'importe où »), jamais une valeur : demain
 * l'hébergeur peut changer, le critère ne bouge pas.
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

describe(`canal de distribution (${PRODUIT}) — cohérence, publicité, mesure`, () => {
  it("I1 — le manifeste désigne l'hôte de téléchargement déclaré, et un SEUL", () => {
    // Deux hôtes dans un même manifeste signifieraient deux publications mélangées : on refuse.
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
    // APPELANT MINCE : l'assertion vit dans `verifierMesures`, où elle est exercée sur les cas
    // qu'elle interdit. Ici on ne fait que la brancher sur les fichiers RÉELS et VERSIONNÉS.
    const violations = verifierMesures({
      manifeste: manifeste(),
      mesures: mesures(),
      horsCouverture: HORS_COUVERTURE,
    });
    expect(violations.map((v) => v.motif).join("\n"), "manifeste non prouvé par la mesure").toBe("");
  });

  it("I4bis — une exception ne peut pas être ajoutée en silence : motif, date, condition", () => {
    // Ce qui distingue un hors-couverture d'un mensonge : il se lit, il se date, et il dit à
    // quelle condition il disparaît.
    const violations = verifierHorsCouverture({
      manifeste: manifeste(),
      horsCouverture: HORS_COUVERTURE,
    });
    expect(violations.map((v) => v.motif).join("\n")).toBe("");
  });

  it("I4ter — CONTREFACTUEL : inscrire une plateforme TÉLÉCHARGEABLE fait rougir I4", () => {
    // CE QUE CE TEST PROUVE, EXACTEMENT : que le CLIQUET d'`I4` mord sur les fichiers RÉELS —
    // une exception ouverte pour une plateforme téléchargeable est refusée. Il porte sur une
    // exception FABRIQUÉE ICI, jamais sur le registre versionné, qui reste vide.
    // CE QU'IL NE PROUVE PAS : que `I4bis` cesse d'être vacuous quand le registre est vide. La
    // LOGIQUE d'`I4bis` est exercée non vacuously ailleurs, sur fixtures
    // (`verifier-mesures.test.mjs`, describe « verifierHorsCouverture ») ; le fait que son
    // appel ci-dessus ne teste rien tant que le registre est vide reste un défaut CONNU et
    // NON TRAITÉ ici (défaut E du relevé, renvoyé au lot successeur « gardes tièdes »).
    const m = manifeste();
    const [premiere] = Object.keys(m.platforms);
    const violations = verifierMesures({
      manifeste: m,
      mesures: mesures(),
      horsCouverture: [
        { plateforme: premiere, motif: "contrefactuel", date: "2026-08-29", leveePar: "n/a" },
      ],
    });
    expect(
      violations.some((v) => v.plateforme === premiere && /hors-couverture/.test(v.motif)),
      `le cliquet ne mord pas : ${premiere} est téléchargeable et l'exception survit`,
    ).toBe(true);
  });

  it("I5 — la liste de lecture porte au moins DEUX hôtes distincts, sinon rien ne bascule", () => {
    // « une app dont le premier endpoint est mort voit quand même la mise à jour ». Une liste
    // d'un seul hôte (ou d'un hôte répété) ne bascule sur rien — elle réessaie la panne.
    const hotes = endpoints().map(hostOf);
    expect(new Set(hotes).size, `endpoints en doublon : ${hotes.join(", ")}`).toBe(hotes.length);
    expect(new Set(hotes).size, "un seul hôte : aucune redondance").toBeGreaterThanOrEqual(2);
  });
});
