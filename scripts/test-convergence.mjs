// test-convergence.mjs — FACE CROISÉE de la garde de convergence (L41, défaut CONV).
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Ce fichier est BYTE-IDENTIQUE dans IakaCockpit et iakaFrameGUI, et il est lui-même inscrit    │
// │ dans `fixtures/convergence.sha256`. Il ne nomme aucun des deux dépôts en dur : il désigne     │
// │ « l'autre », quel qu'il soit — c'est ce qui le rend convergent.                               │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DÉFAUT FERMÉ ICI. L40 a rendu six fichiers byte-identiques entre les deux applications, par
// un `diff` passé UNE FOIS à la main au gate. Aucun test, aucun script, aucune entrée de suite ne
// le rejouait : la convergence était gardée par la seule discipline — très exactement l'option
// « discipline seule » que l'arbitrage AR-6 de L40 avait écartée au motif qu'elle « est ce qui a
// déjà échoué ». C'est ainsi qu'un registre de hors-couverture et son contrôle de forme avaient
// disparu d'un seul côté, sans que rien ne le signale.
//
// LES DEUX FACES, ET POURQUOI IL EN FAUT DEUX (AR-5 = O2) :
//   — FACE LOCALE (`forge-host-parity.test.mjs`, DANS le gate) : empreintes versionnées. Elle
//     attrape l'édition EN PLACE d'une copie — le chemin réel par lequel la divergence est
//     arrivée. Elle ne voit PAS une modification coordonnée fichier + empreinte d'un seul côté.
//   — FACE CROISÉE (ce script, HORS gate) : comparaison octet à octet des deux arbres de travail.
//     Elle voit tout, y compris la modification coordonnée — mais seulement quand le frère est là.
//
// AUCUNE COMBINAISON OFFLINE N'EST SUFFISANTE : un dépôt ne peut pas voir ce qu'un autre dépôt
// fait. Le prétendre serait exactement la garde tiède que ce lot corrige. CE QUI EST ACQUIS : la
// divergence ne peut plus être silencieuse ET accidentelle ; elle exige désormais un geste
// délibéré sur deux fichiers, dans un dépôt, en ignorant une face de garde documentée.
//
// HORS `test:all` par défaut : la mesure dépend d'un dépôt frère, donc faillible sur un clone
// isolé. Tolérante à son absence : SKIP propre (exit 0), jamais un faux rouge. Même posture, même
// précédent que `test:handoff-parity` (IakaCockpit).
//
// Usage : npm run test:convergence   (IAKA_CONVERGENCE_HOME pour pointer un frère explicite)
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOM = "test:convergence";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMPREINTES = "fixtures/convergence.sha256";

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

// --- Résolution du frère -------------------------------------------------------------------------
// IAKA_CONVERGENCE_HOME est AUTORITAIRE : s'il est posé et ne porte pas le registre, on ÉCHOUE au
// lieu de se rabattre sur un voisin. Un repli silencieux mesurerait un autre dépôt que celui
// demandé et rendrait un « OK » qui ne veut rien dire (même règle que `test:handoff-parity`).
const override = process.env.IAKA_CONVERGENCE_HOME;
let frere;
if (override) {
  if (!estFrere(override)) {
    console.error(
      `${NOM} : IAKA_CONVERGENCE_HOME pointe « ${override} », qui ne porte pas ${EMPREINTES} ` +
        "(ou designe ce depot meme). Chemin autoritaire : aucun repli sur un autre depot.",
    );
    process.exit(2);
  }
  frere = resolve(override);
} else {
  // On ne nomme aucun dépôt : on énumère les emplacements où un frère peut se trouver, et on
  // retient le premier qui porte le registre — en s'excluant soi-même.
  const candidats = [];
  // Cas courant : les deux dépôts sont côte à côte. Cas agrégat : ils sont deux sous-modules de
  // `projects/`. On énumère, on ne devine pas de nom.
  for (const racine of [resolve(ROOT, ".."), resolve(ROOT, "..", "..", "projects")]) {
    try {
      for (const e of readdirSync(racine)) candidats.push(resolve(racine, e));
    } catch {
      /* racine illisible ou absente : zéro candidat de ce côté */
    }
  }
  frere = candidats.find(estFrere);
}

if (!frere) {
  console.log(
    `${NOM} — SKIP : aucun depot frere portant ${EMPREINTES} (clone isole). Aucune mesure de ` +
      "convergence croisee effectuee (definir IAKA_CONVERGENCE_HOME pour l'activer).",
  );
  process.exit(0);
}

// --- Mesure ---------------------------------------------------------------------------------------
// Le registre d'empreintes est lui-même comparé : c'est ce qui distingue la face croisée de la
// face locale. Une modification COORDONNÉE fichier + empreinte, d'un seul côté, fait diverger le
// registre — et c'est le seul endroit d'où on peut la voir.
const lignes = readFileSync(resolve(ROOT, EMPREINTES), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"));

const chemins = [EMPREINTES, ...lignes.map((l) => l.replace(/^[0-9a-f]{64}\s+/, ""))];
const ecarts = [];

for (const rel of chemins) {
  const ici = resolve(ROOT, rel);
  const la = resolve(frere, rel);
  if (!existsSync(ici)) {
    ecarts.push(`${rel} : ABSENT ici (${ROOT})`);
    continue;
  }
  if (!existsSync(la)) {
    ecarts.push(`${rel} : ABSENT chez le frere (${frere})`);
    continue;
  }
  const a = readFileSync(ici);
  const b = readFileSync(la);
  if (!a.equals(b)) {
    ecarts.push(`${rel} : DIVERGENT (${a.length} o ici, ${b.length} o chez le frere)`);
  }
}

if (ecarts.length > 0) {
  console.error(`${NOM} : ${ecarts.length} fichier(s) convergent(s) ont DIVERGE\n`);
  for (const e of ecarts) console.error(`  - ${e}`);
  console.error(
    `\nFrere mesure : ${frere}\n` +
      "Tout fichier de ce registre se modifie DANS LES DEUX DEPOTS au meme commit logique.",
  );
  process.exit(1);
}

console.log(`${NOM} : OK — ${chemins.length} fichier(s) byte-identiques avec ${frere}`);
process.exit(0);
