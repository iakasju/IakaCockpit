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
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifierMesures,
  verifierHorsCouverture,
  estPrive,
  hoteJuge,
} from "../lib/verifier-mesures.mjs";

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

// LE PRÉDICAT DE PUBLICITÉ N'EST PLUS ÉCRIT ICI (L41, défaut D). Il vivait dans ce fichier, où il
// ne pouvait s'exercer que sur les hôtes RÉELS — donc jamais sur les cas de bord qu'il tranche. Il
// découpait sur « : », ce qui rend `"["` sur `"[::1]:3001"` : `I2` CERTIFIAIT alors qu'une boucle
// locale est publique. Il vit désormais dans `scripts/lib/verifier-mesures.mjs`, testé sur
// fixtures (E-3/E-4/E-5), et la charge de la preuve y est INVERSÉE (`estPublic` explicite).
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
    // Le message NOMME l'hôte réellement jugé (L41, § 1.4) : sans cela, un refus est inexploitable
    // et la réintroduction du découpage sur « : » redeviendrait indétectable.
    const base = hostFromArtefactBase();
    expect(
      estPrive(base),
      `hôte de téléchargement non public : ${base} (hôte jugé : ${hoteJuge(base)})`,
    ).toBe(false);
    for (const [nom, p] of plateformesDuManifeste()) {
      const h = hostOf(p.url);
      expect(
        estPrive(h),
        `manifeste[${nom}] annonce un hôte non public : ${h} (hôte jugé : ${hoteJuge(h)})`,
      ).toBe(false);
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
    //
    // ┌─ CE TEST ÉTAIT VACUOUS, ET IL LE DISAIT (L41 — la jonction non gardée) ─────────────────────────────────┐
    // │ Le registre versionné est VIDE — et c'est un résultat, pas un oubli. `verifierHorsCouver-│
    // │ ture` itérait donc sur zéro entrée : supprimer l'appel ci-dessous ne faisait tomber AUCUN │
    // │ test (mesuré : la suite restait à 54 verts). La LOGIQUE était pourtant couverte, sur     │
    // │ fixtures (`verifier-mesures.test.mjs`) — c'est la JONCTION aux fichiers réels qui        │
    // │ manquait : rien ne prouvait que la garde était encore BRANCHÉE ici.                      │
    // │                                                                                          │
    // │ CE QUI RÉPARE, ET CE QUI NE RÉPARE PAS. Peupler le registre versionné serait une FAUSSE  │
    // │ réparation : elle détruirait un résultat mesuré (les 9 clés répondent 200). On ajoute à   │
    // │ la place un CONTREFACTUEL DE FORME, sur le modèle exact d'`I4ter` — une exception         │
    // │ fabriquée ICI, volontairement mal formée, que la garde appelée DEPUIS CE FICHIER doit     │
    // │ refuser. Le registre versionné n'est pas touché.                                         │
    // └──────────────────────────────────────────────────────────────────────────────────────────┘
    const m = manifeste();
    expect(
      verifierHorsCouverture({ manifeste: m, horsCouverture: HORS_COUVERTURE })
        .map((v) => v.motif)
        .join("\n"),
      "le registre versionné lui-même est mal formé",
    ).toBe("");

    // CONTREFACTUEL DE FORME : les quatre exigences violées d'un coup — motif absent, date
    // invalide, condition de levée absente, plateforme jamais annoncée par le manifeste.
    const malFormee = { plateforme: "plateforme-fantome-x86_64", date: "un jour de ces jours-ci" };
    const refus = verifierHorsCouverture({ manifeste: m, horsCouverture: [malFormee] });
    const motifs = refus.map((v) => v.motif).join(" | ");
    expect(refus.length, `exception mal formée acceptée : ${JSON.stringify(malFormee)}`).toBe(4);
    expect(motifs, "le motif absent n'est pas refusé").toMatch(/sans motif/);
    expect(motifs, "la date invalide n'est pas refusée").toMatch(/sans date valide/);
    expect(motifs, "la condition de levée absente n'est pas refusée").toMatch(/sans condition/);
    expect(motifs, "la plateforme fantôme n'est pas refusée").toMatch(/exception fantome/);
    expect(
      refus.every((v) => v.plateforme === malFormee.plateforme),
      "les refus ne nomment pas la plateforme fautive",
    ).toBe(true);
  });

  it("I4ter — CONTREFACTUEL : inscrire une plateforme TÉLÉCHARGEABLE fait rougir I4", () => {
    // CE QUE CE TEST PROUVE, EXACTEMENT : que le CLIQUET d'`I4` mord sur les fichiers RÉELS —
    // une exception ouverte pour une plateforme téléchargeable est refusée. Il porte sur une
    // exception FABRIQUÉE ICI, jamais sur le registre versionné, qui reste vide.
    // CE QU'IL NE PROUVE PAS : la forme d'une exception — c'est le contrefactuel de forme
    // d'`I4bis` ci-dessus qui s'en charge, et qui rend cet appel-là non vacuous à son tour.
    // Les deux sont complémentaires : celui-ci éprouve le CLIQUET (une exception ne survit pas à
    // sa raison d'être), celui-là éprouve la FORME (une exception ne s'ajoute pas en silence).
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

  it("CONV — les fichiers PARTAGÉS avec l'app jumelle n'ont pas dérivé (face LOCALE)", () => {
    // ┌─ POURQUOI CETTE GARDE EXISTE (L41, défaut CONV) ─────────────────────────────────────────┐
    // │ L40 a rendu six fichiers byte-identiques entre les deux applications — par un `diff`      │
    // │ passé UNE FOIS à la main au gate. Rien ne le rejouait : la convergence n'était gardée que │
    // │ par la discipline, l'option exacte qu'AR-6 de L40 avait écartée parce qu'« elle est ce    │
    // │ qui a déjà échoué ». C'est ainsi que le registre `HORS_COUVERTURE` et son contrôle de     │
    // │ forme avaient disparu d'un seul côté, en silence.                                        │
    // │                                                                                          │
    // │ ┌─ HORS-COUVERTURE DÉCLARÉ — ce que cette face NE PEUT PAS voir ───────────────────────┐ │
    // │ │ Elle attrape l'édition EN PLACE d'un fichier partagé (le chemin réel par lequel la   │ │
    // │ │ divergence est arrivée). Elle NE DÉTECTE PAS une modification COORDONNÉE du fichier  │ │
    // │ │ ET de son empreinte, faite d'un seul côté : les deux bougent ensemble, l'empreinte   │ │
    // │ │ reste juste ici, et ce dépôt n'a aucun moyen de voir l'autre. Seule la FACE CROISÉE  │ │
    // │ │ (`npm run test:convergence`) la voit — et elle est HORS de cette suite, parce        │ │
    // │ │ qu'elle dépend du dépôt frère (SKIP propre sur un clone isolé).                      │ │
    // │ │ CONDITION DE LEVÉE : le jour où les fichiers partagés vivent dans un paquet publié    │ │
    // │ │ (option O1 d'AR-6 de L40), les deux faces deviennent inutiles d'un coup.             │ │
    // │ └──────────────────────────────────────────────────────────────────────────────────────┘ │
    // │                                                                                          │
    // │ ┌─ HORS-COUVERTURE nº2 — LA COMPLÉTUDE DU REGISTRE (relevé au gate) ───────────────────┐ │
    // │ │ Les deux faces gardent le CONTENU des fichiers INSCRITS. Rien n'attestait que le     │ │
    // │ │ registre les liste TOUS : retirer une ligne DANS LES DEUX DÉPÔTS rétrécissait la     │ │
    // │ │ couverture sans qu'aucune face ne bronche — la garde perdait un fichier de vue en    │ │
    // │ │ restant verte. Même classe que le trou ci-dessus, et il n'était pas écrit.           │ │
    // │ │ CE QUI LE FERME MAINTENANT : le CLIQUET ci-dessous. Le nombre d'entrées ne descend    │ │
    // │ │ jamais tout seul ; le faire descendre est un geste DÉLIBÉRÉ, qui touche cette ligne. │ │
    // │ │ CE QU'IL NE FERME PAS : un ÉCHANGE (retirer une ligne, en ajouter une autre) garde le │ │
    // │ │ compte. Aucun test ne peut dire quels fichiers DEVRAIENT converger — cette liste est  │ │
    // │ │ une décision, pas un fait mesurable dans un seul dépôt.                               │ │
    // │ │ CONDITION DE LEVÉE : la même que ci-dessus — un paquet publié rend la question vide.  │ │
    // │ └──────────────────────────────────────────────────────────────────────────────────────┘ │
    // └──────────────────────────────────────────────────────────────────────────────────────────┘
    const registre = read("fixtures/convergence.sha256")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
    // CLIQUET DE COMPLÉTUDE — motivé, daté, et il ne descend que sur décision. Au 2026-08-29 le
    // registre portait DIX-SEPT entrées : les douze de L41, plus les CINQ de L42 (la vitrine —
    // `fixtures/vitrine-assets.json`, `scripts/lib/vitrine.mjs`, `scripts/vitrine.mjs`,
    // `scripts/vitrine-en-ligne.mjs`, `scripts/__tests__/vitrine.test.mjs`). Ajouter un fichier
    // partagé le fait monter, et ce nombre monte avec lui. Le baisser signifie qu'un fichier CESSE
    // d'être partagé : ça se décide et ça se justifie dans le commit, ça ne se constate pas.
    //
    // 2026-09-01, lot L44 — DIX-SEPT → VINGT. Trois fichiers neufs, byte-identiques, qui ferment
    // le trou mesuré de L43 (rien ne gardait le bloc `latest:` du workflow côté iakaFrameGUI) :
    // `fixtures/bloc-latest.sha256` (le référent), `scripts/lib/bloc-latest.mjs` (l'extracteur par
    // marqueur) et `scripts/__tests__/bloc-latest.test.mjs` (la garde locale). Le cliquet est posé
    // à la valeur MESURÉE du registre, pas en dessous : un plancher sous le compte réel laisserait
    // une entrée disparaître en silence, ce qui est exactement le trou qu'il existe pour fermer.
    // (L'instruction du lot écrivait « plancher 17 → 18 » ; elle inscrivait deux lignes sur les
    // trois. L'écart est écrit dans le rapport du lot, pas résolu en silence.)
    //
    // 2026-09-03, lot « dette de canal de la publication » — VINGT → VINGT-TROIS. Trois fichiers
    // neufs, byte-identiques, GÉNÉRIQUES par construction (aucun des deux dépôts n'y est nommé) :
    // `scripts/lib/canaux-publication.mjs` (registre + fan-out des canaux d'écriture),
    // `scripts/__tests__/canaux-publication.test.mjs` (sa garde locale) et
    // `scripts/verifier-canaux-en-ligne.mjs` (face 2, hors gate). Mesuré au gate : inscrits au
    // registre SANS que ce plancher ne monte laissait les trois fichiers libres de quitter le
    // registre sans qu'aucun rouge ne le signale — un plancher SOUS le compte réel est exactement
    // le trou que ce cliquet existe pour fermer, une couche plus haut que le registre lui-même.
    //
    // 2026-09-05, lot « gardes de la vitrine » (F-2/F-3) — VINGT-TROIS → VINGT-QUATRE. UN seul
    // fichier NEUF, byte-identique : `scripts/__tests__/vitrine-en-ligne.test.mjs`, qui exerce
    // enfin `scripts/vitrine-en-ligne.mjs` (jusque-là la SEULE face du dispositif de vitrine que
    // rien n'exécutait — désarmable dans les deux dépôts avec régénération du registre sans
    // qu'aucune face ne bronge). Les trois fichiers déjà inscrits ci-dessus
    // (`fixtures/vitrine-assets.json`, `scripts/lib/vitrine.mjs`, `scripts/vitrine-en-ligne.mjs`,
    // `scripts/__tests__/vitrine.test.mjs`, lignes 30-34) ont eux aussi été modifiés — F-2, la
    // prose de `fichiersPromis` ne promet plus que ce qu'elle mesure — mais restent inscrits SANS
    // faire monter ce plancher, puisqu'ils l'étaient déjà.
    expect(
      registre.length,
      "le registre de convergence a PERDU des entrées : un fichier a cessé d'être gardé sans que " +
        "rien ne le dise. Si le retrait est délibéré, baisser ce plancher DANS LE MÊME COMMIT.",
    ).toBeGreaterThanOrEqual(24);

    const derives = [];
    for (const ligne of registre) {
      const m = ligne.match(/^([0-9a-f]{64})\s+(.+)$/);
      expect(m, `ligne illisible dans le registre d'empreintes : « ${ligne} »`).toBeTruthy();
      const [, attendu, chemin] = m;
      let obtenu;
      try {
        obtenu = createHash("sha256").update(readFileSync(resolve(ROOT, chemin))).digest("hex");
      } catch {
        derives.push(`${chemin} : ABSENT`);
        continue;
      }
      if (obtenu !== attendu) derives.push(`${chemin} : ${attendu.slice(0, 12)}… → ${obtenu.slice(0, 12)}…`);
    }
    expect(
      derives.join("\n"),
      "fichier(s) PARTAGÉ(S) modifié(s) d'un seul côté. Tout fichier de ce registre se modifie " +
        "DANS LES DEUX DÉPÔTS au même commit logique ; puis on régénère les empreintes " +
        "(voir CLAUDE.md § convergence) et on rejoue `npm run test:convergence`.",
    ).toBe("");
  });

  it("I5 — la liste de lecture porte au moins DEUX hôtes distincts, sinon rien ne bascule", () => {
    // « une app dont le premier endpoint est mort voit quand même la mise à jour ». Une liste
    // d'un seul hôte (ou d'un hôte répété) ne bascule sur rien — elle réessaie la panne.
    const hotes = endpoints().map(hostOf);
    expect(new Set(hotes).size, `endpoints en doublon : ${hotes.join(", ")}`).toBe(hotes.length);
    expect(new Set(hotes).size, "un seul hôte : aucune redondance").toBeGreaterThanOrEqual(2);
  });
});
