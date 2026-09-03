// canaux-publication.mjs — LE REGISTRE DES CANAUX D'ÉCRITURE, ET LE FAN-OUT QUI LES POUSSE.
//
// Instruction : iakaframe/specs/instructions/dette-de-canal-de-la-publication.md, §§ 3-4, 7, 8.
//
// LE DÉFAUT RÉPARÉ ICI. `publish-update.mjs` poussait `origin` SEUL puis imprimait une phrase que
// le script ne pouvait pas savoir vraie : « la version est visible des clients ». Le second
// endpoint LU par le plugin updater (`github`, `raw.githubusercontent.com`) n'était poussé par
// AUCUN script — une main humaine l'a fait, quatre fois dans la journée du 2026-09-03. Ce module
// ne promet plus rien : il POUSSE ce que le registre DÉCLARE, chaque cible indépendamment (AR-4),
// et REND COMPTE de ce qui a été poussé — jamais de ce que les clients voient (§ 4.3).
//
// LE FICHIER DE DONNÉES EST LOCAL, NON PARTAGÉ (AR-3) : le contenu du registre
// (`fixtures/canaux-publication.json`) diverge PAR NATURE d'un dépôt à l'autre — les URL de
// remote ne sont pas les mêmes ; il n'est donc PAS inscrit à `fixtures/convergence.sha256`.
//
// ⚠️ RECTIFICATION DATÉE (2026-09-03, gate 🏹 Legolas) : cette section affirmait AUSSI que « ce
// module » (au sens du présent FICHIER .mjs) n'était pas inscrit, et que « le cliquet de
// convergence reste à 20 » — LES DEUX étaient FAUX au moment même où le lot a été fusionné : CE
// MODULE-CI est GÉNÉRIQUE (aucun des deux dépôts n'y est nommé) et BYTE-IDENTIQUE entre
// IakaCockpit et iakaFrameGUI, donc INSCRIT à `fixtures/convergence.sha256` avec ses deux
// compagnons `scripts/__tests__/canaux-publication.test.mjs` et
// `scripts/verifier-canaux-en-ligne.mjs` — et le cliquet est passé de 20 à 23 pour les couvrir.
// Seul `fixtures/canaux-publication.json` (le FICHIER DE DONNÉES, distinct de ce module) reste
// non inscrit. Conservé ci-dessus daté, pas effacé (règle 4 du corpus).
//
// Fonctions PURES autant que possible ; la seule E/S est `pousserCanaux` (elle appelle `run`,
// injectable — c'est ce qui rend la face 1 (§ 4.1) mordante sans réseau ni dépôt réel).
import { readFileSync } from "node:fs";

/** Motif d'un secret dans une URL de remote (`http://user:token@hote/...`) — JAMAIS affiché tel
 *  quel. Même forme que `iakaframe/cli/src/lib/canaux.js` `masquerSecrets`. */
const RE_SECRET = /(\w+:\/\/)([^\s/@:]+):([^\s/@]+)@/g;

/** Ne laisse jamais un jeton passer dans un message affiché — défense en profondeur : les
 *  arguments passés à `git push` ne portent jamais le secret (il vit dans `.git/config`), mais un
 *  message d'erreur qui recopierait une URL de remote le porterait. */
export function masquerSecrets(txt) {
  return String(txt ?? "").replace(RE_SECRET, "$1$2:***@");
}

/**
 * Lit le registre des canaux d'écriture. Forme minimale imposée : `canaux` (tableau
 * `{ remote, raison }`) et `HORS_COUVERTURE` (tableau `{ remote, motif, leveePar }`) — l'un et
 * l'autre absents rendent un tableau vide plutôt qu'une exception : un registre mal formé doit
 * être vu par `verifierRegistreCanaux`, pas planter la lecture.
 *
 * @param {string} chemin
 * @returns {{ canaux: Array<{remote:string, raison:string}>, horsCouverture: Array<{remote:string, motif:string, leveePar:string}> }}
 */
export function lireRegistreCanaux(chemin) {
  const brut = JSON.parse(readFileSync(chemin, "utf8"));
  const canaux = Array.isArray(brut?.canaux) ? brut.canaux : [];
  const horsCouverture = Array.isArray(brut?.HORS_COUVERTURE) ? brut.HORS_COUVERTURE : [];
  return { canaux, horsCouverture };
}

/**
 * CA-5 — chaque entrée `HORS_COUVERTURE` porte un `motif` ET une `leveePar` NON VIDES. Une
 * exception qui ne se lit pas est un mensonge (cf. `verifierHorsCouverture` de
 * `verifier-mesures.mjs`, même forme, même raison).
 *
 * @param {Array<{remote:string, motif?:string, leveePar?:string}>} horsCouverture
 * @returns {Array<{remote:string, motif:string}>} violations (vide = tout va bien)
 */
export function verifierHorsCouvertureCanaux(horsCouverture) {
  const violations = [];
  for (const h of horsCouverture) {
    if (!h?.motif) violations.push({ remote: h?.remote, motif: `hors-couverture ${h?.remote} sans motif` });
    if (!h?.leveePar) {
      violations.push({ remote: h?.remote, motif: `hors-couverture ${h?.remote} sans condition de levee` });
    }
  }
  return violations;
}

/**
 * CA-4 — LE CLIQUET DE COUVERTURE. Les canaux effectivement TENTÉS au push doivent être
 * EXACTEMENT ceux DÉCLARÉS au registre — comparaison ENSEMBLISTE, dans les DEUX SENS. Un
 * `declares` non tenté est une entrée MORTE (elle promet un canal qu'on ne pousse plus) ; un
 * `tente` non déclaré est un canal FANTÔME (on pousse quelque chose que le registre ne dit pas).
 * Chacun des deux sens, seul, laisserait passer l'autre.
 *
 * @param {{ declares: string[], tentes: string[] }} input
 * @returns {string[]} violations (vide = couverture exacte)
 */
export function verifierCouvertureCanaux({ declares, tentes }) {
  const d = new Set(declares);
  const t = new Set(tentes);
  const violations = [];
  for (const r of d) {
    if (!t.has(r)) violations.push(`${r} : declare au registre mais AUCUN push n'a ete tente`);
  }
  for (const r of t) {
    if (!d.has(r)) violations.push(`${r} : push TENTE sans etre declare au registre`);
  }
  return violations;
}

/** Prend la première ligne utile d'un message d'erreur, tronquée, secrets masqués. */
function premiereLigne(txt) {
  const l = masquerSecrets(txt)
    .split(/\r?\n/)
    .filter(Boolean);
  return (l[0] ?? "echec").slice(0, 200);
}

/**
 * Nom d'hôte d'un remote, pour l'AFFICHAGE SEUL — jamais l'URL complète (elle porte le jeton dans
 * ce portefeuille, cf. `.git/config`). `null` si le remote est illisible : on affiche alors le nom
 * du remote seul, jamais une supposition.
 */
export function hoteDuRemote(remote, { run, cwd }) {
  try {
    const url = run(["remote", "get-url", remote], { cwd, capture: true });
    return new URL(masquerSecrets(url).trim().replace(/:\*\*\*@/, "@")).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Pousse `HEAD` vers CHAQUE canal du registre, INDÉPENDAMMENT (AR-4 = a) — forme éprouvée par
 * `pousserFanout` (`iakaframe/cli/src/lib/canaux.js:75-83`) : jamais d'exception qui interrompt
 * les suivants, un échec est une LIGNE de résultat. `origin` est poussé EN PREMIER (§ 8 étape 4 :
 * c'est l'endpoint 1, celui qui fait autorité, § 1.4 de l'instruction), puis le reste dans l'ordre
 * du registre. Jamais de `--force`, jamais de tag, jamais de release.
 *
 * @param {string[]} canaux noms de remotes à pousser (= `registre.canaux.map(c => c.remote)`)
 * @param {{ run: Function, cwd: string }} opts
 * @returns {Array<{remote:string, ok:boolean, motif:string}>}
 */
export function pousserCanaux(canaux, { run, cwd }) {
  const ordre = [...canaux.filter((r) => r === "origin"), ...canaux.filter((r) => r !== "origin")];
  const resultats = [];
  for (const remote of ordre) {
    try {
      run(["push", remote, "HEAD"], { cwd });
      resultats.push({ remote, ok: true, motif: "" });
    } catch (e) {
      resultats.push({ remote, ok: false, motif: premiereLigne(e?.message ?? String(e)) });
    }
  }
  return resultats;
}

/**
 * § 4.3 — LE COMPTE RENDU. Ne promet plus rien sur ce que les clients VOIENT : dit ce qui a été
 * POUSSÉ, canal par canal, et NOMME le geste extérieur (hors gate, réseau) qui établit le reste.
 * `run`/`cwd` sont optionnels : sans eux, les lignes portent le nom du remote seul (pas d'hôte).
 *
 * `version` est la version NUE (sans le `v` du tag, cf. `versionOfTag`) — le `v` est ajouté ici,
 * à l'endroit unique où ce compte rendu se compose, pour matcher exactement la forme du § 4.3 de
 * l'instruction (« manifeste v0.32.2 — … »).
 *
 * @param {{ version: string, resultats: Array<{remote:string, ok:boolean, motif:string}>, run?: Function, cwd?: string }} input
 * @returns {string[]} lignes, à imprimer une par une sur STDERR
 */
export function formaterCompteRendu({ version, resultats, run, cwd }) {
  const lignes = [`manifeste v${version} — canaux d'ecriture pousses :`];
  for (const r of resultats) {
    const hote = run && cwd ? hoteDuRemote(r.remote, { run, cwd }) : null;
    const label = hote ? `${r.remote} (${hote})` : r.remote;
    lignes.push(`  ${label.padEnd(28)} ${r.ok ? "pousse" : `ECHEC : ${r.motif}`}`);
  }
  lignes.push("ce script ne sait pas ce que voient les clients. Pour le mesurer :");
  lignes.push("  iakaframe endpoints --app .");
  return lignes;
}

/** AR-4 — vrai dès qu'UNE cible a échoué : c'est ce qui commande le code de sortie non nul. */
export function unEchecAuMoins(resultats) {
  return resultats.some((r) => !r.ok);
}
