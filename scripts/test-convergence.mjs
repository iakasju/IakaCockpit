// test-convergence.mjs — FACE CROISÉE de la garde de convergence, version N-AIRE (2026-09-08).
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Ce fichier est BYTE-IDENTIQUE dans IakaCockpit et iakaFrameGUI, et il est lui-même inscrit    │
// │ dans `fixtures/convergence.sha256`. Il ne nomme aucun dépôt en dur : il lit la liste NOMMÉE   │
// │ de `fixtures/freres.json` — fichier LOCAL à chaque dépôt, hors registre (même raison que      │
// │ `fixtures/canaux-publication.json` : le contenu diverge par nature) — c'est ce qui le rend    │
// │ convergent.                                                                                    │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DÉFAUT FERMÉ ICI (successeur CONVERGENCE-TROIS-FRERES, AR-C1/AR-C2/AR-C3 = a/a/b, cadré
// 2026-09-08). L'ancienne version RÉSOLVAIT le frère par ÉNUMÉRATION (`readdirSync` des
// répertoires voisins, premier trouvé qui porte le registre) — hors-couverture déclaré :
// « un TROISIÈME dépôt le portant changerait la cible SANS RIEN DIRE ». À la seconde où
// `iakaInstall` pose son propre `fixtures/convergence.sha256` (son lot 2), il devenait un frère
// CANDIDAT pour les deux sœurs, dans un ordre que rien ne spécifiait. La convergence « à deux »
// (une ÉGALITÉ sur une liste unique) et la convergence « à trois » (une INTERSECTION déclarée,
// AR-C3=b) ne sont PAS la même relation : une garde qui traiterait la seconde comme la première
// serait, au choix, MUETTE (la cible change sans le dire) ou MENTEUSE (15 chemins normalement
// absents chez un tiers deviendraient des « écarts » à tort).
//
// CE QUI CHANGE :
//   — RÉSOLUTION NOMMÉE (AR-C1=a). Plus aucune énumération : `fixtures/freres.json` NOMME les
//     autres dépôts (chemin relatif attendu + raison). Ce script reste NEUTRE : il ne nomme
//     toujours aucun dépôt en dur, toute la topologie vit dans le fichier local.
//   — N-1 AVEC SKIP NOMMÉ (AR-C2=a). Chaque frère NOMMÉ et PRÉSENT (répertoire existant, portant
//     lui-même `fixtures/convergence.sha256`) est MESURÉ ; un frère NOMMÉ mais ABSENT DU DISQUE
//     produit un SKIP EXPLICITE QUI LE NOMME, jamais un rouge. Zéro frère présent ⇒ SKIP global,
//     exit 0 en le disant (comportement historique, conservé). La ligne de succès NE PEUT PAS
//     être lue comme « tous les frères sont d'accord » quand l'un a été sauté : elle nomme les
//     comptes des deux catégories. Forme reprise de `verifier-canaux-en-ligne.mjs:134` (le
//     préfixe `OK` ne ment jamais à vide), jamais réinventée.
//   — INTERSECTION DES REGISTRES (AR-C3=b). Chaque dépôt porte SON registre — la seule liste qui
//     fasse foi POUR LUI. La face croisée compare, pour une paire donnée, l'INTERSECTION des deux
//     registres : un chemin présent dans un seul est HORS COMPARAISON et DÉCLARÉ tel dans la
//     sortie (jamais un écart). C'est ce qui rend `iakaInstall` mesurable un jour sans faire
//     rougir la garde sur les 15 chemins qu'il ne porte pas par décision écrite (AR-V3=a).
//
// CE QUI NE BOUGE PAS D'UN OCTET : les deux faces et leur répartition (locale dans le gate,
// croisée hors gate) ; `IAKA_CONVERGENCE_HOME` AUTORITAIRE (exit 2 si le chemin ne porte pas le
// registre, aucun repli) ; la règle *« tout fichier de ce registre se modifie DANS LES DEUX
// DÉPÔTS au même commit logique »*, qui devient *« dans TOUS les dépôts qui l'inscrivent »*.
//
// CORRECTIF — LE REGISTRE EXCLU DE LUI-MÊME (successeur CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME,
// découvert au passage par le lot 2 ci-dessus, corrigé le 2026-09-08, matière à trois dépôts —
// IakaCockpit, iakaFrameGUI, iakaInstall). `fixtures/convergence.sha256` est l'INSTRUMENT de la
// comparaison de cette face, jamais un OBJET qu'elle doit comparer : deux registres de tailles
// différentes PAR CONSTRUCTION (29 entrées chez une sœur, 7 chez `iakaInstall`, AR-C3=b) ne
// peuvent JAMAIS être byte-identiques entre eux, même quand l'intersection réelle qu'ils décrivent
// l'est. Avant ce correctif, `lireRegistre()` préfixait `EMPREINTES` aux DEUX listes AVANT de
// calculer l'intersection : le fichier-registre se retrouvait donc TOUJOURS dans l'ensemble
// comparé, jamais dans le « hors comparaison », quel que soit son contenu réel — un écart nommé
// GARANTI dès qu'un troisième dépôt au registre plus petit entrait en scène (mesuré : `iakaInstall`
// contre chaque sœur rendait `exit 1`, 1 écart, sur ce seul fichier). Le registre est désormais
// EXCLU de l'intersection ET du hors comparaison — la sortie le DIT explicitement, jamais un
// silence (voir la ligne de mesure par frère, plus bas).
//
// HORS `test:all` par défaut : la mesure dépend d'un dépôt frère, donc faillible sur un clone
// isolé. Tolérante à son absence : SKIP propre (exit 0), jamais un faux rouge.
//
// Usage : npm run test:convergence   (IAKA_CONVERGENCE_HOME pour pointer un frère EXPLICITE,
// UNIQUE, hors de `freres.json` — reste le remède autoritaire pour un clone jetable/CI.)
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOM = "test:convergence";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMPREINTES = "fixtures/convergence.sha256";
const CHEMIN_FRERES = "fixtures/freres.json";

/** Un frère valable est un dépôt qui porte, lui aussi, le registre d'empreintes. */
const estFrere = (c) => {
  try {
    return (
      existsSync(resolve(c, EMPREINTES)) &&
      statSync(resolve(c, EMPREINTES)).isFile() &&
      realpathSync(c) !== realpathSync(ROOT)
    );
  } catch {
    return false;
  }
};

/** Lit et parse le registre d'empreintes d'un dépôt : [EMPREINTES, ...chemins listés]. */
function lireRegistre(racine) {
  const lignes = readFileSync(resolve(racine, EMPREINTES), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  return [EMPREINTES, ...lignes.map((l) => l.replace(/^[0-9a-f]{64}\s+/, ""))];
}

// --- Résolution du frère (ou des frères) --------------------------------------------------------
// IAKA_CONVERGENCE_HOME reste AUTORITAIRE et bypasse `freres.json` : il désigne UN frère
// EXPLICITE, hors nommage, pour un clone jetable ou un banc de CI. S'il est posé et ne porte pas
// le registre, on ÉCHOUE au lieu de se rabattre sur un voisin — un repli silencieux mesurerait un
// autre dépôt que celui demandé et rendrait un « OK » qui ne veut rien dire.
const override = process.env.IAKA_CONVERGENCE_HOME;

let mesures = [];
let sautes = [];

if (override) {
  if (!estFrere(override)) {
    console.error(
      `${NOM} : IAKA_CONVERGENCE_HOME pointe « ${override} », qui ne porte pas ${EMPREINTES} ` +
        "(ou designe ce depot meme). Chemin autoritaire : aucun repli sur un autre depot.",
    );
    process.exit(2);
  }
  mesures = [{ nom: `IAKA_CONVERGENCE_HOME=${override}`, chemin: resolve(override) }];
} else {
  // CA-D1 — AUCUNE ÉNUMÉRATION : la topologie vient ENTIÈREMENT de `fixtures/freres.json`.
  let declaration;
  try {
    declaration = JSON.parse(readFileSync(resolve(ROOT, CHEMIN_FRERES), "utf8"));
  } catch (e) {
    console.error(
      `${NOM} : ${CHEMIN_FRERES} absent ou illisible (${e?.message ?? e}) — ce fichier doit ` +
        "toujours etre present dans un checkout normal (il est versionne). Aucun repli sur une " +
        "enumeration de voisins.",
    );
    process.exit(2);
  }
  const freres = Array.isArray(declaration?.freres) ? declaration.freres : null;
  if (!freres) {
    console.error(`${NOM} : ${CHEMIN_FRERES} ne porte pas de tableau "freres" lisible.`);
    process.exit(2);
  }

  // CONTREFACTUEL (CA-C2/CA-D1) — un tableau VIDE est un SKIP GLOBAL nommé, jamais une erreur et
  // jamais un repli sur un voisin deviné : « vider freres.json » est un état valide (clone qui ne
  // déclare aucun frère), pas une panne.
  for (const f of freres) {
    const chemin = resolve(ROOT, f.chemin);
    if (estFrere(chemin)) {
      mesures.push({ nom: f.nom, chemin });
    } else {
      const motif = !existsSync(chemin)
        ? "repertoire absent du disque"
        : `ne porte pas (encore) ${EMPREINTES}`;
      sautes.push({ nom: f.nom, chemin: f.chemin, motif });
    }
  }
}

function ligneSautes() {
  return sautes.map((s) => `${s.nom} (${s.chemin}) : ${s.motif}`).join(", ");
}

if (mesures.length === 0) {
  if (sautes.length === 0) {
    console.log(`${NOM} — SKIP : aucun frere declare dans ${CHEMIN_FRERES} (tableau vide).`);
  } else {
    console.log(
      `${NOM} — SKIP GLOBAL : ${sautes.length} frere(s) nomme(s), AUCUN present sur ce disque ` +
        `(clone isole) : ${ligneSautes()}. Aucune mesure de convergence croisee effectuee.`,
    );
  }
  process.exit(0);
}

// --- Mesure, PAR FRÈRE, sur l'INTERSECTION des deux registres (AR-C3 = b) -----------------------
const cheminsLocaux = lireRegistre(ROOT);
const ecarts = [];
const lignesRapport = [];
let totalCompares = 0;
let totalHorsComparaison = 0;

for (const frere of mesures) {
  let cheminsFrere;
  try {
    cheminsFrere = lireRegistre(frere.chemin);
  } catch (e) {
    ecarts.push(`${frere.nom} : registre illisible chez le frere (${e?.message ?? e})`);
    lignesRapport.push(`  ${frere.nom} : ERREUR — registre illisible chez le frere`);
    continue;
  }
  const ensembleFrere = new Set(cheminsFrere);
  // Le registre est l'INSTRUMENT de cette comparaison, pas un OBJET qu'elle compare (correctif
  // CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME, 2026-09-08) : exclu ici de l'intersection ET du hors
  // comparaison, quel que soit son contenu chez le frère.
  const compares = cheminsLocaux.filter((c) => c !== EMPREINTES && ensembleFrere.has(c));
  const horsComparaison = cheminsLocaux.filter((c) => c !== EMPREINTES && !ensembleFrere.has(c));
  totalCompares += compares.length;
  totalHorsComparaison += horsComparaison.length;

  const ecartsFrere = [];
  for (const rel of compares) {
    const ici = resolve(ROOT, rel);
    const la = resolve(frere.chemin, rel);
    if (!existsSync(ici)) {
      ecartsFrere.push(`${rel} : ABSENT ici (${ROOT})`);
      continue;
    }
    if (!existsSync(la)) {
      ecartsFrere.push(`${rel} : ABSENT chez le frere (${frere.chemin})`);
      continue;
    }
    const a = readFileSync(ici);
    const b = readFileSync(la);
    if (!a.equals(b)) {
      ecartsFrere.push(`${rel} : DIVERGENT (${a.length} o ici, ${b.length} o chez le frere)`);
    }
  }

  for (const e of ecartsFrere) ecarts.push(`${frere.nom} : ${e}`);
  lignesRapport.push(
    `  ${frere.nom} (${frere.chemin}) : mesure — ${compares.length} chemin(s) compare(s), ` +
      `${horsComparaison.length} hors comparaison` +
      (horsComparaison.length > 0 ? ` [${horsComparaison.join(", ")}]` : "") +
      ` (${EMPREINTES} exclu de la comparaison par construction — instrument, pas objet)` +
      (ecartsFrere.length > 0 ? `, ${ecartsFrere.length} ECART(S)` : ""),
  );
}
for (const s of sautes) {
  lignesRapport.push(`  ${s.nom} (${s.chemin}) : SKIP NOMME — ${s.motif}`);
}

for (const l of lignesRapport) console.log(l);

if (ecarts.length > 0) {
  console.error(`\n${NOM} : ${ecarts.length} ecart(s) — fichier(s) convergent(s) ont DIVERGE\n`);
  for (const e of ecarts) console.error(`  - ${e}`);
  console.error(
    "\nTout fichier inscrit dans PLUSIEURS registres se modifie DANS TOUS CES DEPOTS au meme " +
      "commit logique.",
  );
  process.exit(1);
}

// CA-C4 — LA LIGNE DE SUCCÈS NE PEUT PAS ÊTRE VRAIE À VIDE : on est ici uniquement si
// `mesures.length > 0` (le cas zéro-mesuré sort plus haut, AVANT ce point, avec un préfixe SKIP —
// jamais OK). CA-C7 — L'ASYMÉTRIE EST DÉCLARÉE : la ligne distingue explicitement le compte de
// frères MESURÉS et le compte de frères NOMMÉS-MAIS-SAUTÉS ; elle ne peut donc jamais être lue
// comme « tous les frères nommés sont d'accord ».
console.log(
  `\n${NOM} : OK — ${mesures.length} frere(s) mesure(s) [${mesures.map((m) => m.nom).join(", ")}], ` +
    `${totalCompares} chemin(s) compare(s), ${totalHorsComparaison} hors comparaison, ` +
    `${sautes.length} frere(s) nomme(s) SKIP` +
    (sautes.length > 0 ? ` [${sautes.map((s) => s.nom).join(", ")}]` : "") +
    ".",
);
process.exit(0);
