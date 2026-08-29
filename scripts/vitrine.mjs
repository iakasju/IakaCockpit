#!/usr/bin/env node
// vitrine.mjs — APPELANT MINCE du generateur de vitrine. Toute la logique vit dans
// `scripts/lib/vitrine.mjs` (fonction pure) ; ici, uniquement l'I/O et le code de sortie.
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme aucune des deux applications : le nom du produit est lu dans `productName` de     │
// │ `src-tauri/tauri.conf.json` — LA SOURCE QUE LE BUNDLER EMPLOIE POUR NOMMER SES ARTEFACTS —    │
// │ et le reste vient de `fixtures/vitrine-locale.json`.                                          │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// Usage :
//   node scripts/vitrine.mjs --check    # compare le README au rendu, code 1 si ecart
//   node scripts/vitrine.mjs --write    # reecrit les zones du README
//
// L'AUTORITE DE VERSION est `package.json` — le meme referent que `VERSION_CARRIERS` (iakaFrameGUI)
// et que `checkVersionAlignment` (IakaCockpit). Ce script n'en introduit pas un troisieme : c'est
// exactement ce que l'instruction demande (« se rattacher aux gardes existantes plutot que d'en
// creer une troisieme »).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ecartsDeVitrine, ecrireZones, lireZones, rendreVitrine } from "./lib/vitrine.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Rassemble tout ce dont le generateur a besoin. Exporte pour que la garde locale l'exerce sur le
 * VRAI depot sans dupliquer la resolution des chemins.
 */
export function contexteDuDepot(racine = ROOT) {
  const j = (rel) => JSON.parse(readFileSync(resolve(racine, rel), "utf8"));
  const table = j("fixtures/vitrine-assets.json");
  const locale = j("fixtures/vitrine-locale.json");
  return {
    app: j("src-tauri/tauri.conf.json").productName,
    depot: locale.depot,
    version: j("package.json").version,
    plateformes: table.plateformes,
    horsVitrine: table.hors_vitrine,
    absents: locale.absents ?? [],
    gabarits: locale.gabarits ?? {},
    readme: readFileSync(resolve(racine, "README.md"), "utf8"),
  };
}

/**
 * Le geste executable. Isole dans une fonction et appele SEULEMENT quand ce fichier est le module
 * principal : sans ce garde, un `import` du module executerait le parsing d'`argv` et sortirait en
 * code 2, tuant tout processus qui vient chercher `contexteDuDepot`. Un script qui sort a l'import
 * est une mine, pas un outil — defaut rencontre pour de vrai sur le jumeau de ce fichier cote CLI.
 */
export function main(argv) {
  const mode = argv.includes("--write") ? "write" : argv.includes("--check") ? "check" : null;
  if (!mode) {
    console.error("usage : node scripts/vitrine.mjs --check | --write");
    return 2;
  }

  const ctx = contexteDuDepot();
  const attendues = rendreVitrine(ctx);
  const noms = Object.keys(attendues);

  if (mode === "write") {
    const suivant = ecrireZones(ctx.readme, attendues);
    if (suivant === ctx.readme) {
      console.log(`vitrine : README deja a jour (v${ctx.version}, ${noms.length} zone(s)).`);
      return 0;
    }
    writeFileSync(resolve(ROOT, "README.md"), suivant);
    console.log(`vitrine : README reecrit sur v${ctx.version} (${noms.length} zone(s)).`);
    return 0;
  }

  const ecarts = ecartsDeVitrine(lireZones(ctx.readme, noms), attendues);
  if (ecarts.length === 0) {
    console.log(`vitrine : OK — README aligne sur v${ctx.version} (${noms.length} zone(s)).`);
    return 0;
  }
  console.error(
    `vitrine : le README a DERIVE de la version d'autorite (package.json = ${ctx.version}).\n`,
  );
  for (const e of ecarts) {
    console.error(`  zone « ${e.zone} », ligne ${e.ligne} :`);
    console.error(`    lu       : ${e.lu}`);
    console.error(`    attendu  : ${e.attendu}`);
  }
  console.error("\nsortie : node scripts/vitrine.mjs --write");
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
