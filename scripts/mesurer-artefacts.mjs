#!/usr/bin/env node
// mesurer-artefacts.mjs — L'INSTRUMENT DE MESURE, VERSIONNÉ (défaut J).
//
// POURQUOI CE FICHIER EXISTE. `updater/mesures.json` est la PREUVE que chaque URL annoncée par
// `updater/latest.json` a réellement été ouverte, et que l'octet servi vérifie bien la signature
// annoncée. Cette preuve ne valait rien tant que l'instrument qui la produit n'était pas dans le
// dépôt : côté Cockpit la mesure venait d'un script de `scratchpad/` (hors dépôt, non rejouable —
// il a d'ailleurs disparu), côté GUI le fichier DÉCLARAIT une provenance FAUSSE (`iakaframe
// endpoints`, qui fait un HEAD et ne calcule ni sha256 ni signature : il ne pouvait pas produire
// les champs qu'on lui attribuait). Une preuve qu'on ne peut ni relancer ni relire n'est pas une
// preuve.
//
// CE QU'IL FAIT, pour CHAQUE CLÉ DE PLATEFORME du manifeste (pas pour chaque URL distincte :
// depuis les clés d'installeur, plusieurs clés partagent le même octet par construction) :
//   1. télécharge l'octet EN ANONYME (aucun jeton, aucun en-tête d'autorisation) ;
//   2. calcule `octets` + `sha256` ;
//   3. vérifie la signature DU MANIFESTE contre l'OCTET SERVI, avec la clé publique lue dans
//      `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) — jamais contre le fichier local ;
//   4. couvre la SIGNATURE GLOBALE (`sig || trusted_comment`) et compare le KEYID de la signature
//      à celui de la clé publique ;
//   5. rejoue chaque signature contre le MÊME octet avec UN octet retourné : elle DOIT rendre
//      `invalide`. Une vérification qui n'échoue jamais ne prouve rien.
//
// Zéro dépendance externe : minisign se vérifie avec `node:crypto` seul (Ed25519 + blake2b-512).
//
// Usage :
//   node scripts/mesurer-artefacts.mjs              # mesure et ÉCRIT updater/mesures.json
//   node scripts/mesurer-artefacts.mjs --dry-run    # mesure et affiche, sans écrire
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** La commande qui produit le fichier — recopiée telle quelle dans `mesurePar` (CA-10). */
export const COMMANDE = "node scripts/mesurer-artefacts.mjs";

const MANIFEST_PATH = "updater/latest.json";
const MESURES_PATH = "updater/mesures.json";
const CONF_PATH = "src-tauri/tauri.conf.json";

// --- minisign, en `node:crypto` pur ------------------------------------------------------------

/** Préfixe DER SPKI d'une clé publique Ed25519 brute (32 octets). */
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Décode le bloc `pubkey` de `tauri.conf.json` : c'est un FICHIER minisign entier, encodé en
 * base64. Sa dernière ligne non vide porte `algo(2) || keyid(8) || cle(32)` = 42 octets.
 */
export function parsePublicKey(pubkeyB64) {
  const texte = Buffer.from(String(pubkeyB64), "base64").toString("utf8");
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const brut = Buffer.from(lignes[lignes.length - 1], "base64");
  if (brut.length !== 42) {
    throw new Error(`cle publique minisign invalide : ${brut.length} octets, 42 attendus`);
  }
  return {
    algo: brut.subarray(0, 2).toString("utf8"),
    keyId: brut.subarray(2, 10).toString("hex"),
    cle: createPublicKey({
      key: Buffer.concat([SPKI_ED25519, brut.subarray(10)]),
      format: "der",
      type: "spki",
    }),
  };
}

/**
 * Décode une signature minisign (le champ `signature` du manifeste est ce fichier, en base64).
 *
 * Format : 4 lignes — commentaire non fiable, `algo(2)||keyid(8)||sig(64)`, `trusted comment: …`,
 * signature GLOBALE (64 octets) sur `sig || trusted_comment`.
 */
export function parseSignature(signatureB64) {
  const texte = Buffer.from(String(signatureB64), "base64").toString("utf8");
  const lignes = texte.split(/\r?\n/);
  const brut = Buffer.from(lignes[1] ?? "", "base64");
  if (brut.length !== 74) {
    throw new Error(`signature minisign invalide : ${brut.length} octets, 74 attendus`);
  }
  const ligneTrusted = lignes[2] ?? "";
  const prefixe = "trusted comment: ";
  if (!ligneTrusted.startsWith(prefixe)) {
    throw new Error("signature minisign sans `trusted comment` — signature globale invérifiable");
  }
  const trustedComment = ligneTrusted.slice(prefixe.length);
  const globale = Buffer.from(lignes[3] ?? "", "base64");
  if (globale.length !== 64) {
    throw new Error(`signature globale invalide : ${globale.length} octets, 64 attendus`);
  }
  return {
    algo: brut.subarray(0, 2).toString("utf8"),
    keyId: brut.subarray(2, 10).toString("hex"),
    signature: brut.subarray(10),
    trustedComment,
    globale,
  };
}

/** Le fichier que la signature prétend signer, lu dans son `trusted comment` (`file:<nom>`). */
export function fichierSigne(trustedComment) {
  const m = /(?:^|\s)file:(.+?)(?:\s|$)/.exec(String(trustedComment));
  return m ? m[1] : null;
}

/**
 * Vérifie une signature minisign contre des OCTETS.
 *
 * `"ED"` = pré-hachage blake2b-512 (ce que produit Tauri) ; `"Ed"` = signature directe (legacy).
 * Renvoie `{ valide, globaleValide, keyIdConcorde, algo, motif }` — jamais d'exception sur un
 * échec de vérification : un échec est une MESURE, pas un incident.
 */
export function verifierMinisign({ octets, signature, clePublique }) {
  const sig = parseSignature(signature);
  const keyIdConcorde = sig.keyId === clePublique.keyId;
  let message;
  if (sig.algo === "ED") message = createHash("blake2b512").update(octets).digest();
  else if (sig.algo === "Ed") message = octets;
  else {
    return {
      valide: false,
      globaleValide: false,
      keyIdConcorde,
      algo: sig.algo,
      trustedComment: sig.trustedComment,
      motif: `algorithme minisign inconnu : ${sig.algo}`,
    };
  }
  const valide = cryptoVerify(null, message, clePublique.cle, sig.signature);
  const globaleValide = cryptoVerify(
    null,
    Buffer.concat([sig.signature, Buffer.from(sig.trustedComment, "utf8")]),
    clePublique.cle,
    sig.globale,
  );
  return {
    valide,
    globaleValide,
    keyIdConcorde,
    algo: sig.algo,
    trustedComment: sig.trustedComment,
    motif: valide && globaleValide && keyIdConcorde ? "ok" : "verification en echec",
  };
}

/**
 * Retourne UN octet au milieu du tampon — le témoin négatif (§ 1.3). On travaille sur une COPIE :
 * l'octet mesuré ne doit jamais être altéré par sa propre vérification.
 */
export function octetRetourne(octets) {
  const copie = Buffer.from(octets);
  if (copie.length === 0) return copie;
  const i = Math.floor(copie.length / 2);
  copie[i] ^= 0xff;
  return copie;
}

// --- Téléchargement ANONYME --------------------------------------------------------------------

/**
 * Télécharge une URL SANS aucun jeton : c'est le point du test — un client de mise à jour n'a
 * aucune autorisation, et une URL qui n'ouvre qu'authentifiée est une promesse intenable.
 */
async function telecharger(url) {
  const rep = await fetch(url, { redirect: "follow" });
  if (!rep.ok) return { status: rep.status, octets: null };
  const buf = Buffer.from(await rep.arrayBuffer());
  return { status: rep.status, octets: buf };
}

// --- Mesure ------------------------------------------------------------------------------------

/**
 * Mesure toutes les clés du manifeste. `telecharge` est injectable pour les tests (aucun réseau).
 *
 * Le cache est indexé par URL parce que PLUSIEURS CLÉS partagent le même octet depuis les clés
 * d'installeur (`linux-x86_64` et `linux-x86_64-appimage` désignent le même fichier). L'octet est
 * donc téléchargé une fois, mais VÉRIFIÉ pour chaque clé, avec la signature de CETTE clé.
 */
export async function mesurer({ manifeste, pubkey, telecharge = telecharger }) {
  const clePublique = parsePublicKey(pubkey);
  const cache = new Map();
  const artefacts = [];

  for (const [plateforme, p] of Object.entries(manifeste.platforms ?? {})) {
    const url = p.url;
    if (!cache.has(url)) cache.set(url, await telecharge(url));
    const { status, octets } = cache.get(url);
    const hote = new URL(url).host;

    if (octets === null) {
      artefacts.push({
        plateforme,
        url,
        hote,
        status,
        octets: 0,
        motif: `HTTP ${status}`,
        sha256: null,
        signature: "non verifiee",
        temoinNegatifOctetAltere: "non exerce",
      });
      continue;
    }

    const sha256 = createHash("sha256").update(octets).digest("hex");
    let v;
    try {
      v = verifierMinisign({ octets, signature: p.signature, clePublique });
    } catch (e) {
      artefacts.push({
        plateforme,
        url,
        hote,
        status,
        octets: octets.length,
        motif: e.message,
        sha256,
        signature: "invalide",
        temoinNegatifOctetAltere: "non exerce",
      });
      continue;
    }

    // TÉMOIN NÉGATIF — la même signature, le même octet, UN octet retourné. Doit rendre invalide.
    const vNeg = verifierMinisign({
      octets: octetRetourne(octets),
      signature: p.signature,
      clePublique,
    });
    const bonne = v.valide && v.globaleValide && v.keyIdConcorde;

    artefacts.push({
      plateforme,
      url,
      hote,
      status,
      octets: octets.length,
      motif: bonne ? "ok" : v.motif,
      sha256,
      signature: bonne ? "valide" : "invalide",
      signatureAlgo:
        v.algo === "ED"
          ? `minisign "ED" (Ed25519 sur blake2b-512), keyid ${clePublique.keyId}`
          : `minisign "${v.algo}" (Ed25519 direct), keyid ${clePublique.keyId}`,
      signatureGlobale: v.globaleValide ? "valide" : "invalide",
      keyIdConcorde: v.keyIdConcorde,
      fichierSigneParLaSignature: fichierSigne(v.trustedComment),
      temoinNegatifOctetAltere: vNeg.valide ? "VALIDE — TEMOIN CASSE" : "invalide",
    });
  }
  return artefacts;
}

/** Assemble le document `updater/mesures.json` — même forme que la référence Cockpit. */
export function composerMesures({ version, artefacts, mesureLe }) {
  const ok = artefacts.filter((a) => a.status === 200 && a.octets > 0 && a.signature === "valide");
  return {
    objet:
      "mesure des artefacts annonces par updater/latest.json — aucune URL n'est annoncee sans avoir ete ouverte",
    version,
    mesureLe,
    mesurePar: COMMANDE,
    signatureVerifieePar:
      "minisign Ed25519 sur blake2b-512, contre la cle publique declaree dans src-tauri/tauri.conf.json " +
      "(plugins.updater.pubkey) — sur l'OCTET RETELECHARGE depuis l'URL annoncee, pas sur le fichier local. " +
      "La verification couvre AUSSI la signature globale (sig || trusted comment), et le keyid de la " +
      "signature est compare a celui de la cle publique.",
    temoinNegatif:
      "chaque signature a ete rejouee contre le MEME octet avec UN octet retourne (xor 0xff au milieu) : " +
      "elle doit rendre INVALIDE. Une verification qui n'echoue jamais ne prouve rien.",
    etat: `TELECHARGEABLE : ${ok.length}/${artefacts.length} — chaque cle listee ci-dessous a ete ouverte en anonyme, son octet hache, et sa signature de manifeste verifiee contre l'octet SERVI.`,
    artefacts,
  };
}

// --- Pilote ------------------------------------------------------------------------------------

async function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const manifeste = JSON.parse(readFileSync(join(ROOT, MANIFEST_PATH), "utf8"));
  const conf = JSON.parse(readFileSync(join(ROOT, CONF_PATH), "utf8"));
  const pubkey = conf.plugins?.updater?.pubkey;
  if (!pubkey) throw new Error(`${CONF_PATH} : plugins.updater.pubkey absent`);

  const cles = Object.keys(manifeste.platforms ?? {});
  if (cles.length === 0) throw new Error(`${MANIFEST_PATH} : aucune plateforme a mesurer`);
  // ── L41 / DÉFAUT D-2 — SÉPARATION DES CANAUX ────────────────────────────────────────────────
  // TOUT le journal part sur STDERR ; STDOUT ne porte QUE le document, et seulement en `--dry-run`.
  // Avant : le journal sortait sur stdout ET le document aussi, si bien que
  // `node scripts/mesurer-artefacts.mjs --dry-run > x.json` produisait un JSON INVALIDE — la
  // sortie n'etait pas redirigeable, donc pas chainable. C'est le defaut exact deja corrige dans
  // `publish-update.mjs` au meme lot L40 (ce dernier ne contient aucun `console.log`) : le canal
  // n'etait pas uniforme entre deux scripts voisins du meme depot.
  console.error(`mesure de ${cles.length} cle(s) de plateforme, en anonyme :`);

  const artefacts = await mesurer({ manifeste, pubkey });
  for (const a of artefacts) {
    console.error(
      `  ${a.plateforme.padEnd(26)} ${String(a.status).padEnd(4)} ${String(a.octets).padStart(9)} o  ` +
        `signature=${a.signature}  temoin=${a.temoinNegatifOctetAltere}`,
    );
  }

  const doc = composerMesures({
    version: manifeste.version,
    artefacts,
    mesureLe: new Date().toISOString(),
  });
  const corps = `${JSON.stringify(doc, null, 2)}\n`;
  if (dryRun) {
    // LE DOCUMENT, seul sur stdout et sans retour a la ligne surnumeraire : `> x.json` doit
    // produire un JSON parsable. C'est mesure (`npm run test:canal-mesure`), pas relu.
    process.stdout.write(corps);
    return 0;
  }
  writeFileSync(join(ROOT, MESURES_PATH), corps, "utf8");
  console.error(`${MESURES_PATH} ecrit — ${doc.etat}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`mesurer-artefacts : ${e.message}`);
      process.exit(1);
    });
}
