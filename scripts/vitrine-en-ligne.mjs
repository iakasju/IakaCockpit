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
import { evaluerCanalEnLigne, tagAnnonceDe } from "./lib/vitrine.mjs";

const NOM = "vitrine:en-ligne";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lireJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));

const TABLE = lireJson("fixtures/vitrine-assets.json");
const LOCALE = lireJson("fixtures/vitrine-locale.json");
const APP = lireJson("src-tauri/tauri.conf.json").productName;
const VERSION = lireJson("package.json").version;
const README = readFileSync(resolve(ROOT, "README.md"), "utf8");
const DEPOT = LOCALE.depot;

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

// --- Mesure ---------------------------------------------------------------------------------------
// LA LOGIQUE DES CINQ EGALITES EST EXTRAITE dans `scripts/lib/vitrine.mjs`
// (`evaluerCanalEnLigne`) — F-3, gardes de la vitrine, 2026-09-05. Ce script reste seul
// responsable des LECTURES, du `fetch`, des CODES DE SORTIE et de l'IMPRESSION ; les MESSAGES
// n'ont pas bouge d'un caractere (ils sont VERBATIM ceux d'avant l'extraction, rectifies a L43 et
// L44 — non reecrits ici, cf. le fichier de garde `scripts/__tests__/vitrine-en-ligne.test.mjs`
// pour ce que cette extraction PROUVE et ne prouve PAS).
const rLatest = await api(`/repos/${DEPOT}/releases/latest`);
const rTags = await api(`/repos/${DEPOT}/tags?per_page=100`);
const latest = rLatest.corps?.tag_name ?? null;

const tagAnnonce = tagAnnonceDe(README, latest);
const releaseAnnoncee = tagAnnonce ? await api(`/repos/${DEPOT}/releases/tags/${tagAnnonce}`) : null;

const { ecarts, constats } = evaluerCanalEnLigne({
  depot: DEPOT,
  app: APP,
  version: VERSION,
  table: TABLE,
  absentsLocaux: LOCALE.absents,
  readme: README,
  latest,
  latestAbsent: rLatest.absent === true,
  tagsBruts: (rTags.corps ?? []).map((t) => t.name),
  releaseAnnoncee,
});

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
