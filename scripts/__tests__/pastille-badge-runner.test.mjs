/**
 * Lot « Pastille du badge du runner » (2026-09-04) — CA-5, second contrefactuel.
 *
 * `src/__tests__/frameIdentity.test.ts` (sous `tsconfig` STRICT, sans `@types/node`) ne
 * peut pas importer `node:fs`/`node:child_process` — ce contrôle transversal, calqué sur
 * les autres gardes de `scripts/__tests__/`, vit donc ici, en `.mjs` non typechecké mais
 * bien exécuté par vitest (`vitest.config.ts` inclut `scripts/**\/*.{test,spec}.mjs`).
 *
 * Preuve que l'ancienne pastille de secours (`•`, ex-constante d'export, désormais retirée
 * — cf. `src/frame/identity.ts`, rectification datée du 2026-09-04) ne subsiste NULLE PART
 * dans le code de PRODUCTION du dépôt : sa réintroduction, même en dead code, serait un
 * retour de la fabrication que ce lot ferme (§ 2.10 / CA-5 de l'instruction).
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(HERE, "..", "..", "src");

function grepOccurrences(needle, excludeGlobs) {
  try {
    const args = ["-rl"];
    for (const g of excludeGlobs) args.push(`--exclude=${g}`);
    args.push(needle, SRC_ROOT);
    return execFileSync("grep", args, { encoding: "utf8" }).trim();
  } catch (e) {
    // grep sort en 1 quand rien n'est trouvé — c'est le résultat ATTENDU dans ce test.
    if (e.status === 1) return (e.stdout ?? "").trim();
    throw e;
  }
}

describe("CA-5 — l'ancienne constante de secours de pastille a disparu de src/", () => {
  it(
    "aucune occurrence dans src/ (hors la présente désignation, dans CE fichier) — " +
      "CONTREFACTUEL joué manuellement : réintroduire l'export dans " +
      "src/frame/identity.ts fait rougir CE test nommément, révoqué au sha256 " +
      "(cf. rapport de livraison)",
    () => {
      const nomAncienneConstante = ["DEFAULT", "IDENTITY", "PASTILLE"].join("_");
      expect(grepOccurrences(nomAncienneConstante, [])).toBe("");
    },
  );
});
