// convergence-croisee.test.mjs — FACE CROISÉE, cas à TROIS frères (successeur
// CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME, inscrit au backlog par le lot 2 de
// CONVERGENCE-TROIS-FRERES, 2026-09-08, traité dans le lot qui ajoute ce fichier).
//
// ┌─ CE QUE CE FICHIER TESTE, ET POURQUOI ────────────────────────────────────────────────────────┐
// │ `scripts/test-convergence.mjs` compare, pour un frère donné, l'INTERSECTION des deux registres │
// │ (AR-C3=b). Le registre lui-même (`fixtures/convergence.sha256`) est l'INSTRUMENT de cette      │
// │ comparaison, pas un OBJET qu'elle doit comparer : deux registres de tailles différentes PAR    │
// │ CONSTRUCTION (29 entrées chez une sœur, 7 chez `iakaInstall`, AR-C3=b) ne peuvent JAMAIS être  │
// │ byte-identiques entre eux, même quand l'intersection réelle qu'ils décrivent l'est. Avant       │
// │ correctif, `lireRegistre()` préfixait `EMPREINTES` aux deux listes AVANT de calculer            │
// │ l'intersection : le fichier-registre se retrouvait donc TOUJOURS dans l'ensemble comparé,      │
// │ jamais dans le « hors comparaison », quel que soit son contenu — un écart nommé GARANTI dès    │
// │ qu'un troisième dépôt au registre plus petit entre en scène.                                    │
// │                                                                                                  │
// │ Ce fichier, byte-identique dans les trois dépôts (comme `test-convergence.mjs` lui-même), rejoue │
// │ ce cas avec un frère SYNTHÉTIQUE et hermétique (répertoire temporaire, aucune dépendance à un   │
// │ dépôt voisin réel) : un registre SOUS-ENSEMBLE STRICT du nôtre, dont TOUS les fichiers de       │
// │ l'intersection sont identiques. Attendu : 0 écart, exit 0. AVANT le correctif de                │
// │ `test-convergence.mjs`, ce test est ROUGE (le registre lui-même est nommé DIVERGENT).           │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = resolve(ROOT, "scripts/test-convergence.mjs");
const EMPREINTES = "fixtures/convergence.sha256";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Les chemins réellement listés (hors EMPREINTES lui-même) dans NOTRE registre. */
function cheminsDuRegistreLocal() {
  return readFileSync(resolve(ROOT, EMPREINTES), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l) => l.replace(/^[0-9a-f]{64}\s+/, ""));
}

/** Lance la face croisée contre `frereDir`, sans jamais laisser un exit non nul remonter. */
function jouerFaceCroisee(frereDir) {
  try {
    const sortie = execFileSync(process.execPath, [SCRIPT], {
      cwd: ROOT,
      env: { ...process.env, IAKA_CONVERGENCE_HOME: frereDir },
      encoding: "utf8",
    });
    return { code: 0, sortie };
  } catch (e) {
    return { code: e.status ?? -1, sortie: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("test-convergence.mjs — face croisée, frère au registre SOUS-ENSEMBLE STRICT", () => {
  it("intersection byte-identique, registres de tailles différentes → 0 écart, exit 0", () => {
    const cheminsLocaux = cheminsDuRegistreLocal();
    expect(
      cheminsLocaux.length,
      "il faut au moins 2 entrées dans le registre local pour construire un sous-ensemble strict",
    ).toBeGreaterThanOrEqual(2);
    // Sous-ensemble STRICT : on ne reprend qu'une partie des chemins locaux, jamais tous — c'est
    // précisément la forme du registre d'iakaInstall (7) vu depuis une sœur (29), ou l'inverse.
    const echantillon = cheminsLocaux.slice(0, Math.max(1, cheminsLocaux.length - 1));

    const frere = mkdtempSync(join(tmpdir(), "convergence-sous-ensemble-"));
    try {
      let registreFrere = "# registre synthetique, SOUS-ENSEMBLE STRICT du registre local (test)\n";
      for (const chemin of echantillon) {
        const contenu = readFileSync(resolve(ROOT, chemin));
        const cible = resolve(frere, chemin);
        mkdirSync(dirname(cible), { recursive: true });
        writeFileSync(cible, contenu);
        registreFrere += `${sha256(contenu)}  ${chemin}\n`;
      }
      writeFileSync(resolve(frere, EMPREINTES), registreFrere);

      const { code, sortie } = jouerFaceCroisee(frere);
      expect(code, `sortie complete :\n${sortie}`).toBe(0);
      expect(sortie, `sortie complete :\n${sortie}`).not.toMatch(/ECART/);
      expect(sortie, `sortie complete :\n${sortie}`).toMatch(/OK —/);
    } finally {
      rmSync(frere, { recursive: true, force: true });
    }
  });
});
