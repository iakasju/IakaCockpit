// canaux-en-ligne.mjs — LA LOGIQUE DE VERDICT DE `verifier-canaux-en-ligne.mjs`, EXTRAITE ET PURE.
//
// Instruction : specs/instructions/garde-de-la-face-en-ligne-des-canaux.md, §§ 1.7, 2, 6 (étape 2).
//
// POURQUOI UN MODULE NEUF ET NON `canaux-publication.mjs` (AR-1 = b, § 1.2/AR-1 de l'instruction).
// `canaux-publication.mjs` porte, dans sa toute première ligne, un contrat déclaré : « LE REGISTRE
// DES CANAUX D'ÉCRITURE, ET LE FAN-OUT QUI LES POUSSE » — les remotes git que `publish-update.mjs`
// pousse. Le classement ci-dessous porte sur des canaux de LECTURE (`plugins.updater.endpoints` de
// `src-tauri/tauri.conf.json`) : nature différente, fichier différent
// (`fixtures/canaux-publication.json` n'est JAMAIS lu ici). Y loger ce classement aurait rendu cet
// en-tête FAUX — la classe de défaut F-2 (une prose qui promet plus que ce qu'elle fait), déjà
// payée trois fois par ce dépôt (L43, L45-défaut-3, L33-S1).
//
// LA PARTITION AR-2 = (b) — LE SEUL POINT OÙ CE LOT NE RECOPIE PAS SON AÎNÉ (§ 1.7 de
// l'instruction, confirmé par la documentation Tauri de l'updater v2 : « Tauri ne continue vers
// l'URL suivante que si un code de statut non-2XX est retourné », et par la lecture de source
// faite par L45, § 1.4 de son instruction). Un endpoint qui répond avec un code NON-2XX (404,
// 5xx…) fait BASCULER le client vers l'endpoint suivant : ce n'est PAS un écart, l'endpoint
// suivant fait autorité. Un endpoint qui répond en 2XX avec un CORPS INUTILISABLE (non-JSON, ou
// sans champ `version`) fait S'ARRÊTER le client LÀ, sans bascule : c'est un ÉCART NOMMÉ — c'est
// exactement le masquage que ce script existe pour détecter. Le classement d'avant ce lot rendait
// `ecart: false` dans les DEUX cas. La partition repose sur le drapeau `echec2xx`, posé par
// `mesurerEndpoint` (seul endroit qui connaît le code de statut HTTP).
//
// Fonctions PURES, zéro I/O, zéro réseau : elles reçoivent tout en argument, ne lisent rien.

/** Nom d'hôte d'une URL, pour l'AFFICHAGE seul. `String(url)` si l'URL est illisible. */
export function hoteDe(url) {
  try {
    return new URL(url).host;
  } catch {
    return String(url);
  }
}

/** Comparaison semver simple (aucune dépendance) : -1 si a<b, 0 si égal, 1 si a>b, null si illisible. */
export function compareSemver(a, b) {
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

/**
 * Classe le VERDICT d'UN endpoint contre le tag publié. Jamais tranché sur le cas ambigu du cache
 * CDN (§ 1.7) : la fenêtre de propagation réelle n'est pas mesurée (successeur
 * `ENDPOINT-PERIME-FAIT-AUTORITE`, déjà nommé dans `verifier-canaux-en-ligne.mjs`).
 *
 * AR-2 = (b) : quand `mesure.version` est `null`, le drapeau `mesure.echec2xx` décide seul —
 * `true` = 2XX inutilisable = le client S'ARRÊTE = écart nommé ; absent/`false` = non-2XX = le
 * client BASCULE = pas d'écart.
 *
 * @param {{mesure:boolean, version:string|null, motif:string, echec2xx?:boolean}} mesure
 * @param {string} tag
 * @returns {{etat:string, ecart:boolean}}
 */
export function classer(mesure, tag) {
  if (!mesure.mesure) return { etat: "injoignable", ecart: false };
  if (mesure.version === null) {
    if (mesure.echec2xx) {
      return {
        etat: `${mesure.motif} — 2XX inutilisable, le client S'ARRETE ici (ne bascule PAS)`,
        ecart: true,
      };
    }
    return { etat: mesure.motif, ecart: false };
  }
  const cmp = compareSemver(mesure.version, tag);
  if (cmp === null) return { etat: `version illisible (« ${mesure.version} »)`, ecart: true };
  if (cmp === 0) return { etat: "concorde", ecart: false };
  if (cmp < 0) {
    // ⚠️ LE PIÈGE DU CACHE : on NOMME l'ambiguïté, on ne la tranche pas (cf. en-tête du fichier
    // appelant). L'assertion des DEUX moitiés de cette formule est le sujet de CA-4.
    return {
      etat: `PERIME OU EN PROPAGATION (sert v${mesure.version}, tag v${tag}) — fenetre de propagation NON MESUREE`,
      ecart: true,
    };
  }
  return { etat: `EN AVANCE SUR LE TAG (sert v${mesure.version}, tag v${tag})`, ecart: true };
}

/**
 * CA-5 — LA JONCTION. Compose le verdict de TOUS les endpoints déjà mesurés : classe chacun,
 * produit les lignes à imprimer (une par endpoint, hôte + état) et la liste des écarts nommés
 * (« hote : etat »). Ne lit rien, n'écrit rien, ne fait aucun réseau : c'est le SEUL endroit où
 * `verifier-canaux-en-ligne.mjs` décide de son verdict.
 *
 * @param {Array<{hote:string, mesure:boolean, version:string|null, motif:string, echec2xx?:boolean}>} mesures
 * @param {string} tag
 * @returns {{lignes:string[], ecarts:string[], mesuresReussies:Array}}
 */
export function composerVerdict(mesures, tag) {
  const lignes = [];
  const ecarts = [];
  for (const m of mesures) {
    const v = classer(m, tag);
    lignes.push(`  ${m.hote.padEnd(30)} ${v.etat}`);
    if (v.ecart) ecarts.push(`${m.hote} : ${v.etat}`);
  }
  const mesuresReussies = mesures.filter((m) => m.mesure);
  return { lignes, ecarts, mesuresReussies };
}
