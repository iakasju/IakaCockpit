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
//
// RECTIFICATION DATEE (2026-09-05, garde de la face en ligne des canaux) : le classement rendait
// `ecart: false` pour QUATRE cas de nature differente (§ 1.7 de l'instruction) — dont un endpoint
// qui repond en 2XX avec un corps INUTILISABLE (non-JSON, ou sans champ `version`). Or un tel
// endpoint fait S'ARRETER le client LA (doc Tauri updater v2 : « Tauri ne continue vers l'URL
// suivante que si un code de statut non-2XX est retourne », confirmee par la lecture de source de
// L45) — masquage EXACT que ce script existe pour detecter, laisse passer par son propre
// classifieur. Le classement (`classer`) est desormais EXTRAIT dans `scripts/lib/canaux-en-ligne.mjs`
// (module NEUF, AR-1 = b : `canaux-publication.mjs` porte le contrat DECLARE « canaux d'ECRITURE »,
// ce classement porte sur des canaux de LECTURE, nature differente), exerce par
// `scripts/__tests__/canaux-en-ligne.test.mjs`, et PARTITIONNE : non-2XX (le client bascule) != 2XX
// inutilisable (le client s'arrete, ecart nomme). Voir l'en-tete de ce module pour le detail.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hoteDe, composerVerdict } from "./lib/canaux-en-ligne.mjs";

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

/** Mesure UN endpoint. N'échoue jamais : un échec réseau est un état, pas une exception. */
async function mesurerEndpoint(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const base = { url, hote: hoteDe(url) };
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      // Non-2XX : le CLIENT BASCULE vers l'endpoint suivant (§ 1.7) — PAS un `echec2xx`,
      // `classer` n'en fait donc pas un ecart.
      return { ...base, mesure: true, motif: res.status === 404 ? "absent (404)" : `HTTP ${res.status}`, version: null };
    }
    let body = null;
    try {
      body = await res.json();
    } catch {
      // 2XX mais corps INUTILISABLE : le client S'ARRETE ici, rien ne le rachete (§ 1.7).
      return { ...base, mesure: true, motif: "reponse non-JSON", version: null, echec2xx: true };
    }
    if (typeof body?.version !== "string" || !body.version) {
      return { ...base, mesure: true, motif: "manifeste sans champ version", version: null, echec2xx: true };
    }
    return { ...base, mesure: true, motif: "sert", version: body.version };
  } catch (e) {
    return { ...base, mesure: false, motif: `injoignable — ${e?.message ?? e}`, version: null };
  } finally {
    clearTimeout(t);
  }
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

// CA-5 — LA JONCTION : la logique de verdict est EXTRAITE (`scripts/lib/canaux-en-ligne.mjs`),
// ce script ne fait plus que la BRANCHER sur ce qu'il a mesuré.
const { lignes, ecarts, mesuresReussies } = composerVerdict(mesures, PKG_VERSION);
if (mesuresReussies.length === 0) {
  nonMesure("tous les endpoints sont injoignables — reseau indisponible, ou tous hors service");
}

for (const ligne of lignes) console.log(ligne);

console.log("");
if (ecarts.length === 0) {
  console.log(`${NOM} : OK (0) — chaque endpoint interrogé sert la même version que le tag local.`);
  process.exit(0);
}
console.error(`${NOM} : ${ecarts.length} ecart(s) (1) entre ce que les endpoints servent et le tag local :\n`);
for (const e of ecarts) console.error(`  - ${e}`);
process.exit(1);
