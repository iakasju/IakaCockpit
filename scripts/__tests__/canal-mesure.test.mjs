// canal-mesure.test.mjs — LE CANAL DE SORTIE DE `mesurer-artefacts.mjs`, MESURÉ (L41, défaut D-2).
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme ni produit, ni hôte, ni version : il ne mesure qu'un canal.                       │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DÉFAUT. Le script écrivait son JOURNAL sur stdout, et son `--dry-run` y écrivait AUSSI le
// document : `node scripts/mesurer-artefacts.mjs --dry-run > x.json` produisait donc un JSON
// INVALIDE. Le défaut exact déjà corrigé dans `publish-update.mjs` au lot L40 — deux scripts
// voisins du même dépôt, deux canaux différents.
//
// PREUVE, PAS RELECTURE. Compter les `console.log` du source serait un constat de LECTURE : on
// EXÉCUTE le script et on parse sa sortie. Le réseau est neutralisé par un `fetch` de substitution
// injecté avant le module (`node --import`) : la mesure est donc DÉTERMINISTE et HORS LIGNE — elle
// n'ouvre aucune connexion et ne dépend d'aucune release. Ce qu'elle éprouve est le CANAL, pas la
// mesure d'artefacts, qui a sa propre preuve (`updater/mesures.json`).
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Un `fetch` de substitution : 200, un corps court et stable. Aucune sortie réseau. */
const STUB = `globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new TextEncoder().encode("octet-de-substitution").buffer,
});
`;

function lancerDryRun() {
  const dir = mkdtempSync(join(tmpdir(), "iaka-canal-"));
  const stub = join(dir, "stub-fetch.mjs");
  writeFileSync(stub, STUB, "utf8");
  try {
    // `stdio[2] = "pipe"` : le journal est capturé À PART, jamais mélangé à stdout.
    const stdout = execFileSync(
      process.execPath,
      ["--import", stub, "scripts/mesurer-artefacts.mjs", "--dry-run"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("mesurer-artefacts --dry-run — le journal sur stderr, le document sur stdout", () => {
  it("D-2 — stdout, SEUL, est un JSON parsable (il ne l'était pas)", () => {
    const stdout = lancerDryRun();
    let doc;
    expect(() => {
      doc = JSON.parse(stdout);
    }, `stdout n'est pas un JSON parsable :\n${stdout.slice(0, 400)}`).not.toThrow();
    // Et c'est bien LE DOCUMENT, pas un fragment : ses champs de tête sont là.
    expect(doc.mesurePar).toBe("node scripts/mesurer-artefacts.mjs");
    expect(typeof doc.etat).toBe("string");
    expect(Array.isArray(doc.artefacts)).toBe(true);
    expect(doc.artefacts.length, "aucune clé mesurée").toBeGreaterThan(0);
  });

  it("D-2 — AUCUNE ligne de journal ne fuit sur stdout", () => {
    const stdout = lancerDryRun();
    // Les marqueurs du journal : la ligne d'en-tête et le tableau par plateforme.
    expect(stdout).not.toMatch(/cle\(s\) de plateforme/);
    expect(stdout).not.toMatch(/temoin=/);
  });
});
