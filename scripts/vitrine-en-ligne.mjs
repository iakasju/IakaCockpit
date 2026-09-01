#!/usr/bin/env node
// vitrine-en-ligne.mjs — FACE EN LIGNE du cliquet de vitrine (L42, etape 4). HORS gate, ANONYME.
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme aucun des deux depots : `depot` vient de `fixtures/vitrine-locale.json`.          │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// POURQUOI CETTE FACE EXISTE — elle est la SEULE qui ne soit pas circulaire. La face locale
// (`scripts/__tests__/vitrine.test.mjs`) rejoue le generateur et le compare au README : deux
// derives de la MEME table. Si le bundler change sa convention de nommage, elle reste verte sur un
// README qui ment. Seule cette face-ci confronte la table AU MONDE REEL. Sans elle, L42 ne livre
// qu'un mensonge coherent (risque R1 de l'instruction, dit tel quel dans le code comme demande).
//
// ANONYME, DELIBEREMENT. Aucun jeton n'est envoye, meme si `GITHUB_TOKEN` traine dans
// l'environnement : le point de vue a mesurer est celui d'un inconnu qui arrive sur GitHub sans
// compte. Mesurer authentifie repondrait a une autre question que celle qu'on pose.
//
// LES QUATRE EGALITES (etape 4.1) :
//   E-1 : `latest` = le plus haut tag semver publie
//   E-2 : la version annoncee par le README = `latest`
//   E-3 : CHAQUE fichier annonce par le README existe comme asset de cette release
//   E-4 : AUCUN asset installable de la release n'est absent du README
//   E-5 : chaque ABSENT DECLARE est reellement absent  <- le cliquet auto-destructeur (CA-12)
//
// CODES DE SORTIE — 0 : mesure faite, tout concorde · 1 : mesure faite, ecart(s) · 2 : usage
// · 3 : NON MESURE (reseau indisponible ou quota anonyme epuise). Le 3 est DISTINCT du 0 a dessein :
// un controle qui rend « succes » alors qu'il n'a rien mesure est le pire des faux verts — c'est
// exactement le defaut de `test:convergence` releve en L41, et CA-14 l'interdit nommement. Le code
// ET le texte disent « non mesure ».
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  estHorsVitrine,
  fichiersCites,
  fichiersPromis,
  nomsAttendus,
  versionAnnoncee,
} from "./lib/vitrine.mjs";

const NOM = "vitrine:en-ligne";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lireJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));

const TABLE = lireJson("fixtures/vitrine-assets.json");
const LOCALE = lireJson("fixtures/vitrine-locale.json");
const APP = lireJson("src-tauri/tauri.conf.json").productName;
const VERSION = lireJson("package.json").version;
const README = readFileSync(resolve(ROOT, "README.md"), "utf8");
const DEPOT = LOCALE.depot;

/** Motif d'un tag de VERSION. `iakaFrameGUI` porte aussi des tags `archive/feat/*` : les compter
 *  comme des versions ferait dire n'importe quoi a « le plus haut tag ». */
const TAG_VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;
const rangSemver = (tag) => {
  const m = TAG_VERSION.exec(tag);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const compare = (a, b) => {
  const x = rangSemver(a);
  const y = rangSemver(b);
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

/** Sortie « non mesure » — jamais un vert, jamais un rouge. */
function nonMesure(raison) {
  console.log(`${NOM} — SKIP : NON MESURE (${raison}).`);
  console.log(
    "  Aucune verification en ligne n'a ete effectuee : ni la concordance README <-> release, ni " +
      "l'existence des fichiers annonces. Ce n'est PAS un succes.",
  );
  process.exit(3);
}

/** GET anonyme. Distingue « pas de reseau / quota » (non mesure) de « la ressource n'existe pas ». */
async function api(chemin) {
  const url = `https://api.github.com${chemin}`;
  let r;
  try {
    r = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "vitrine-en-ligne" },
    });
  } catch (e) {
    nonMesure(`reseau indisponible — ${e?.message ?? e}`);
  }
  if (r.status === 403 || r.status === 429) {
    nonMesure(`quota de l'API anonyme epuise (HTTP ${r.status}) — reessayer plus tard`);
  }
  if (r.status === 404) return { absent: true };
  if (!r.ok) nonMesure(`reponse inattendue de l'API (HTTP ${r.status}) sur ${chemin}`);
  return { corps: await r.json() };
}

const ecarts = [];
const constats = [];
const ecart = (code, texte) => ecarts.push(`${code} : ${texte}`);

// --- Mesure ---------------------------------------------------------------------------------------
const rLatest = await api(`/repos/${DEPOT}/releases/latest`);
if (rLatest.absent) {
  ecart("E-1", `le depot ${DEPOT} n'expose AUCUNE release « latest » a un visiteur anonyme`);
}
const rTags = await api(`/repos/${DEPOT}/tags?per_page=100`);
const tags = (rTags.corps ?? []).map((t) => t.name).filter((t) => TAG_VERSION.test(t));
const plusHaut = tags.length > 0 ? tags.slice().sort(compare).at(-1) : null;
const latest = rLatest.corps?.tag_name ?? null;

constats.push(`depot          : ${DEPOT}`);
constats.push(`latest (anon)  : ${latest ?? "(aucune)"}`);
constats.push(`plus haut tag  : ${plusHaut ?? "(aucun tag de version)"}`);
constats.push(`README annonce : v${versionAnnoncee(README) ?? "(illisible)"}`);
constats.push(`autorite (pkg) : v${VERSION}`);

// E-1 — le `latest` n'est pas subi : il doit designer le plus haut tag publie.
//
// ⚠️ MESSAGE RECTIFIE LE 2026-08-30 (L43, entree 16 du registre des enonces). Il disait :
// « Republier un tag ancien VOLE le latest (drapeau make_latest, defaut true). Rattrapage :
// gh release edit <plusHaut> --latest ». DEUX inexactitudes, dans le seul endroit du corpus qui
// s'imprime a l'operateur au moment ou il decide quoi faire :
//   (a) republier NE VOLE RIEN au SHA epingle — `getOrCreateRelease` rend la release existante
//       sans aucun `updateRelease` ; c'est la CREATION qui prend le drapeau (R-1) ;
//   (b) le rattrapage etait annonce comme un fait : qu'une ecriture `true` rende le `latest` n'a
//       NI RUN NI LOG. Sur le banc, seule l'ecriture `false` a ete mesuree, et parmi neuf regles
//       de repli enumerees huit sont refutees, le NO-OP survit seul — ce qui ne se transpose pas
//       d'office a `true`, ni dans un sens ni dans l'autre.
//
// ⚠️ RECTIFIE A NOUVEAU LE 2026-09-01 (L44). Le point (b) ci-dessus est DATE, PAS EFFACE : il dit
// l'etat de la connaissance AU 2026-08-30. DEPUIS, le geste a ete JOUE — M1, mesure du decideur
// sur le banc prive : `gh release edit v0.9.0 --latest` a fait passer `releases/latest` de
// `v0.10.0` a `v0.9.0`. L'ECRITURE `true` AGIT, et elle PRIME sur tout calcul, puisqu'elle a pose
// le pointeur sur le plus BAS semver. Le message imprime ci-dessous cessait d'etre vrai le jour
// de cette mesure : il annoncait SANS TRACE un geste desormais joue et observe, et c'est le SEUL
// texte du corpus qui s'imprime a l'operateur AU MOMENT OU IL DECIDE QUOI FAIRE.
// CE QUI RESTE VRAI, ET QUI EST DIT DANS LE MESSAGE : M1 a ete joue SUR LE BANC, jamais sur ce
// depot-ci. « Mesure ailleurs » n'est pas « mesure ici », et le message ne le laisse pas croire.
if (latest && plusHaut && latest !== plusHaut) {
  ecart(
    "E-1",
    `« latest » designe ${latest} alors que ${plusHaut} existe. C'est la CREATION d'une release ` +
      "qui prend le drapeau (make_latest omis, defaut true) ; republier un tag dont la release " +
      "EXISTE n'y touche pas au SHA epingle (R-1, L43). Rattrapage a TENTER : " +
      `gh release edit ${plusHaut} --latest — MESURE le 2026-09-01 (M1, banc prive) : cette ` +
      "ecriture AGIT et PRIME sur tout calcul. Jamais rejouee sur CE depot-ci.",
  );
}

// E-2 — la version annoncee par le README = celle que GitHub presente.
const annoncee = versionAnnoncee(README);
if (latest && annoncee && `v${annoncee}` !== latest) {
  ecart(
    "E-2",
    `le README annonce v${annoncee}, GitHub presente ${latest}. Si l'autorite du depot (v${VERSION}) ` +
      "est en avance, c'est une DETTE DE PUBLICATION : le depot a bumpe sans publier. Ce rouge est " +
      "voulu, il informe et ne bloque aucun lot (il est HORS gate).",
  );
}

// Les assets de la release que le README DESIGNE — pas de `latest`, sinon on mesurerait autre chose
// que ce qu'un visiteur telecharge en suivant la page.
const tagAnnonce = annoncee ? `v${annoncee}` : latest;
let assets = [];
if (tagAnnonce) {
  const r = await api(`/repos/${DEPOT}/releases/tags/${tagAnnonce}`);
  if (r.absent) {
    ecart(
      "E-3",
      `la release ${tagAnnonce}, que le README pointe, N'EXISTE PAS pour un visiteur anonyme : le ` +
        "lien de la page d'accueil mene a une 404",
    );
  } else {
    assets = (r.corps.assets ?? []).map((a) => a.name);
    constats.push(`assets sur ${tagAnnonce} : ${assets.length}`);
  }
}

if (assets.length > 0) {
  const versionAnnoncees = annoncee ?? VERSION;
  const sub = { app: APP, version: versionAnnoncees };

  // E-3 — CHAQUE fichier annonce existe. Un `200` sur une page de release ne suffit pas : on
  // verifie l'EXISTENCE DE L'ASSET PAR SON NOM (etape 4.3).
  //
  // « promis », et promis PARTOUT — pas seulement au tableau. Le README promet des le moment ou il
  // nomme un artefact HORS d'un bloc d'absence declaree : prose, note ou tableau, c'est la meme
  // promesse pour le visiteur. Restreindre E-3 aux lignes de tableau laissait passer une phrase en
  // prose annoncant un `.dmg` inexistant — angle mort mesure, ferme dans `fichiersPromis`.
  for (const nom of fichiersPromis(README)) {
    if (!assets.includes(nom)) {
      ecart("E-3", `le README annonce « ${nom} », qui N'EST PAS un asset de ${tagAnnonce}`);
    }
  }

  // E-4 — aucun asset installable passe sous silence. L'exclusion est NOMMEE (hors_vitrine).
  // « cites », pas « telechargeables » : un artefact nomme dans le bloc des absents n'est pas
  // passe sous silence. S'il reapparait sur la release, c'est E-5 qui le dit — et son message
  // est le seul actionnable des deux.
  const annonces = new Set(fichiersCites(README));
  for (const nom of assets) {
    if (estHorsVitrine(nom, TABLE.hors_vitrine, sub)) continue;
    if (annonces.has(nom)) continue;
    ecart(
      "E-4",
      `l'asset installable « ${nom} » de ${tagAnnonce} n'est annonce NULLE PART dans le README ` +
        "(ni au tableau, ni en absent declare) : la release livre plus que la vitrine ne montre",
    );
  }

  // E-5 — CLIQUET AUTO-DESTRUCTEUR (CA-12). Une absence declaree qui redevient fausse doit
  // ROUGIR, sinon la declaration survivrait a sa raison d'etre — le defaut exact que L41 a ferme
  // ailleurs avec `HORS_COUVERTURE`. C'est ce rouge qui commande de retirer l'entree.
  const noms = nomsAttendus(TABLE.plateformes, sub);
  for (const a of LOCALE.absents ?? []) {
    const attendu = noms[a.cle];
    if (attendu && assets.includes(attendu)) {
      ecart(
        "E-5",
        `« ${attendu} » est declare ABSENT dans fixtures/vitrine-locale.json (depuis ${a.depuis}) ` +
          `mais il EST present sur ${tagAnnonce}. La declaration a survecu a sa raison d'etre : ` +
          `retirer l'entree « ${a.cle} » et rejouer node scripts/vitrine.mjs --write`,
      );
    }
  }

  // CA-13 — CONSTAT, pas correctif : le manifeste concurrent que le CI posait avant L41.
  const concurrents = assets.filter((n) => n === "latest.json").length;
  constats.push(
    `latest.json concurrent sur ${tagAnnonce} : ${concurrents} ` +
      (concurrents === 0
        ? "(conforme au correctif includeUpdaterJson: false de L41)"
        : "(release ANTERIEURE au correctif L41 ; un resultat non nul sur une release POSTERIEURE remonte a L41, il ne se corrige pas ici)"),
  );
}

// --- Verdict ----------------------------------------------------------------------------------------
console.log(`${NOM} — mesure ANONYME (aucun jeton envoye) :`);
for (const c of constats) console.log(`  ${c}`);
if (ecarts.length === 0) {
  console.log(`\n${NOM} : OK — la vitrine et l'etagere concordent.`);
  process.exit(0);
}
console.error(`\n${NOM} : ${ecarts.length} ecart(s) entre ce qu'on montre et ce qu'on porte\n`);
for (const e of ecarts) console.error(`  - ${e}`);
process.exit(1);
