#!/usr/bin/env node
// verifier-canaux-en-ligne.mjs — FACE 2 de la garde de publication (§ 4.2 de l'instruction).
// HORS GATE, DÉLIBÉRÉMENT (AR-6 = a) : ce script n'est appelé par AUCUN autre script de ce dépôt.
// `publish-update.mjs` se contente de NOMMER ce geste dans son compte rendu final — il ne
// l'exécute jamais lui-même (contrainte zéro dépendance, cache CDN, une panne réseau ne doit pas
// devenir un échec de PUBLICATION). C'est un geste séparé, que l'opérateur lance QUAND il veut
// savoir si les clients voient réellement la version publiée.
//
// Instruction : iakaframe/specs/instructions/dette-de-canal-de-la-publication.md, §§ 4.2, 8 (étape
// 9), critère CA-7.
//
// CE QUE LA FACE 1 (dans le gate) NE PROUVE PAS, ET QUE CETTE FACE-CI PROUVE. La face 1
// (`rendreCompte`/`pousserCanaux`, dans `publish-update.test.mjs`) prouve que le message est
// CONDITIONNÉ par le résultat d'un `git push` — elle ne prouve RIEN sur ce qu'un endpoint SERT ni
// sur sa FRAÎCHEUR : les deux côtés de son assertion dérivent du même `run` factice. La seule
// preuve non circulaire est une LECTURE RÉSEAU qui revient d'un tiers — c'est celle-ci.
//
// CE QUE CE SCRIPT AJOUTE PAR RAPPORT À `iakaframe endpoints --app .` (§ 1.4 l'impose) : mesurer
// « au moins un endpoint sert un manifeste » ne suffit plus, parce qu'un endpoint FRAIS en
// position 2 ne rachète PAS un endpoint PÉRIMÉ en position 1 — il est MASQUÉ par lui (`:501` du
// plugin fait `break` au premier qui RÉPOND, pas au premier qui est à jour). Il faut donc mesurer
// TOUS les endpoints (jamais `--premier`) et comparer la VERSION servie par CHACUN au tag publié
// — ici, la version que porte `package.json`, l'autorité du dépôt (VERSION_CARRIERS.pkg).
//
// TROIS ÉTATS, JAMAIS DEUX (modèle `vitrine:en-ligne`, L42) :
//   0 = MESURÉ, tout concorde.
//   1 = MESURÉ, au moins un écart nommé.
//   3 = NON MESURÉ (aucun endpoint n'a pu être interrogé — réseau indisponible). Un contrôle qui
//       rend « succès » alors qu'il n'a rien mesuré est le pire des faux verts (§ 1.4).
//
// ⚠️ LE PIÈGE DU CACHE, ÉCRIT ICI (comme l'exige § 4.2) : `raw.githubusercontent.com` sert
// derrière un CDN. Une mesure lancée IMMÉDIATEMENT après un push peut rendre l'ANCIEN contenu —
// un endpoint qui sert une version ANTÉRIEURE au tag local n'est donc pas nécessairement MENTEUR :
// il peut être EN PROPAGATION. Ce script NOMME cette ambiguïté (`PERIME OU EN PROPAGATION`) plutôt
// que de trancher à sa place — trancher exigerait de connaître la fenêtre de propagation réelle,
// et elle est NON MESURÉE à ce jour (successeur nommé : ENDPOINT-PERIME-FAIT-AUTORITE, § 12 de
// l'instruction). Un endpoint dont la version est PLUS RÉCENTE que le local (cas impossible en
// publication normale, mais mesuré tel quel) est nommé séparément — pas confondu avec le cas
// périmé.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOM = "verifier-canaux-en-ligne";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lireJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));

const PKG_VERSION = lireJson("package.json").version;

/** Endpoints déclarés (`plugins.updater.endpoints`), DANS L'ORDRE — c'est la substance du failover. */
function lireEndpoints() {
  const conf = lireJson("src-tauri/tauri.conf.json");
  const eps = conf?.plugins?.updater?.endpoints;
  return Array.isArray(eps) ? eps.filter((u) => typeof u === "string" && u.length > 0) : [];
}

function hoteDe(url) {
  try {
    return new URL(url).host;
  } catch {
    return String(url);
  }
}

/** Comparaison semver simple (aucune dépendance) : -1 si a<b, 0 si égal, 1 si a>b, null si illisible. */
function compareSemver(a, b) {
  const ra = /^(\d+)\.(\d+)\.(\d+)/.exec(String(a ?? ""));
  const rb = /^(\d+)\.(\d+)\.(\d+)/.exec(String(b ?? ""));
  if (!ra || !rb) return null;
  for (let i = 1; i <= 3; i += 1) {
    const x = Number(ra[i]);
    const y = Number(rb[i]);
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Mesure UN endpoint. N'échoue jamais : un échec réseau est un état, pas une exception. */
async function mesurerEndpoint(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const base = { url, hote: hoteDe(url) };
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      return { ...base, mesure: true, motif: res.status === 404 ? "absent (404)" : `HTTP ${res.status}`, version: null };
    }
    let body = null;
    try {
      body = await res.json();
    } catch {
      return { ...base, mesure: true, motif: "reponse non-JSON", version: null };
    }
    if (typeof body?.version !== "string" || !body.version) {
      return { ...base, mesure: true, motif: "manifeste sans champ version", version: null };
    }
    return { ...base, mesure: true, motif: "sert", version: body.version };
  } catch (e) {
    return { ...base, mesure: false, motif: `injoignable — ${e?.message ?? e}`, version: null };
  } finally {
    clearTimeout(t);
  }
}

/** Classe le VERDICT d'un endpoint contre le tag publié. Jamais tranché sur le cas ambigu. */
function classer(mesure, tag) {
  if (!mesure.mesure) return { etat: "injoignable", ecart: false };
  if (mesure.version === null) return { etat: mesure.motif, ecart: false };
  const cmp = compareSemver(mesure.version, tag);
  if (cmp === null) return { etat: `version illisible (« ${mesure.version} »)`, ecart: true };
  if (cmp === 0) return { etat: "concorde", ecart: false };
  if (cmp < 0) {
    // ⚠️ LE PIÈGE DU CACHE : on NOMME l'ambiguïté, on ne la tranche pas (cf. en-tête du fichier).
    return {
      etat: `PERIME OU EN PROPAGATION (sert v${mesure.version}, tag v${tag}) — fenetre de propagation NON MESUREE`,
      ecart: true,
    };
  }
  return { etat: `EN AVANCE SUR LE TAG (sert v${mesure.version}, tag v${tag})`, ecart: true };
}

function nonMesure(raison) {
  console.log(`${NOM} — SKIP : NON MESURE (${raison}).`);
  console.log(
    "  Aucun endpoint n'a pu etre interroge : ce script ne dit RIEN sur ce que les clients " +
      "voient. Ce n'est PAS un succes.",
  );
  process.exit(3);
}

// --- Mesure ------------------------------------------------------------------------------------
const endpoints = lireEndpoints();
if (endpoints.length === 0) {
  nonMesure("aucun endpoint declare dans src-tauri/tauri.conf.json");
}

console.log(`${NOM} — mesure EN DIRECT de ${endpoints.length} endpoint(s), tag local v${PKG_VERSION} :`);
const mesures = [];
// L'ordre est la substance du failover : on mesure EN SÉQUENCE, jamais en parallèle, pour que
// chaque endpoint soit nommé dans l'ordre où le client les essaierait.
for (const url of endpoints) {
  mesures.push(await mesurerEndpoint(url));
}

const reussis = mesures.filter((m) => m.mesure);
if (reussis.length === 0) {
  nonMesure("tous les endpoints sont injoignables — reseau indisponible, ou tous hors service");
}

const ecarts = [];
for (const m of mesures) {
  const v = classer(m, PKG_VERSION);
  const ligne = `  ${m.hote.padEnd(30)} ${v.etat}`;
  console.log(ligne);
  if (v.ecart) ecarts.push(`${m.hote} : ${v.etat}`);
}

console.log("");
if (ecarts.length === 0) {
  console.log(`${NOM} : OK (0) — chaque endpoint interrogé sert la même version que le tag local.`);
  process.exit(0);
}
console.error(`${NOM} : ${ecarts.length} ecart(s) (1) entre ce que les endpoints servent et le tag local :\n`);
for (const e of ecarts) console.error(`  - ${e}`);
process.exit(1);
