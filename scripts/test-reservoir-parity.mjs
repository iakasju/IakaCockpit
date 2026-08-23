/**
 * Parité Cockpit ↔ réservoir iakaframe.
 *
 * Raison d'être : la team par défaut du Cockpit avait divergé du roster du réservoir sans
 * que rien ne le signale — `charon`, `helm` et `feanor` y figuraient depuis longtemps et
 * manquaient côté Cockpit. Une divergence silencieuse est le défaut qu'on ferme ici.
 *
 * SKIP PROPRE si le réservoir est absent (clone isolé) : ce contrôle dépend d'un dépôt
 * frère, il ne doit pas rougir chez qui ne l'a pas. `IAKAFRAME_HOME` est AUTORITAIRE —
 * posé mais faux, on ÉCHOUE plutôt que de mesurer un autre dépôt (même règle que
 * `test-handoff-parity.mjs`).
 *
 * Usage : npm run test:reservoir-parity
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "test:reservoir-parity";
const cockpitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isReservoir = (c) =>
  existsSync(join(c, "library", "personas")) && existsSync(join(c, "teams"));

const override = process.env.IAKAFRAME_HOME;
let root;
if (override) {
  if (!isReservoir(override)) {
    console.error(
      `${NAME} : IAKAFRAME_HOME pointe « ${override} », qui ne porte pas library/personas + teams. ` +
        "Chemin autoritaire : aucun repli sur un autre dépôt.",
    );
    process.exit(1);
  }
  root = override;
} else {
  const sibling = resolve(cockpitRoot, "..", "iakaframe");
  if (!isReservoir(sibling)) {
    console.log(`${NAME} : réservoir absent (${sibling}) → SKIP.`);
    process.exit(0);
  }
  root = sibling;
}

/** Frontmatter minimal : mêmes deux formes que `reservoir.rs` (scalaire + liste). */
function frontmatter(text) {
  if (!text.startsWith("---")) return "";
  const rest = text.slice(3).replace(/^[\r\n]+/, "");
  const i = rest.indexOf("\n---");
  return i < 0 ? "" : rest.slice(0, i);
}
function fmList(fm, key) {
  for (const line of fm.split("\n")) {
    const l = line.trim();
    if (l.startsWith(`${key}:`)) {
      const v = l.slice(key.length + 1).trim();
      if (v.startsWith("[") && v.endsWith("]")) {
        return v
          .slice(1, -1)
          .split(",")
          .map((x) => x.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
    }
  }
  return [];
}

const teamFile = join(root, "teams", "iakaframe-8.md");
if (!existsSync(teamFile)) {
  console.log(`${NAME} : team iakaframe-8 absente du réservoir → SKIP.`);
  process.exit(0);
}
const roster = fmList(frontmatter(readFileSync(teamFile, "utf8")), "personas");

// Côté Cockpit : on lit le SOURCE plutôt que d'importer du TS (pas de build pour un script).
const demo = readFileSync(join(cockpitRoot, "src", "mock", "demoTeam.ts"), "utf8");
const cockpit = [...demo.matchAll(/agent:\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase());

const manquants = roster.filter((p) => !cockpit.includes(p));
const enTrop = cockpit.filter((p) => !roster.includes(p));

// Les personas du réservoir doivent tous exister côté Cockpit. L'inverse n'est PAS exigé :
// le Cockpit peut porter un agent hors roster sans que ce soit une dérive.
if (manquants.length) {
  console.error(
    `${NAME} : ÉCHEC — ${manquants.length} persona(s) du réservoir absent(s) de la team ` +
      `par défaut du Cockpit : ${manquants.join(", ")}.\n` +
      `  roster réservoir (${roster.length}) : ${roster.join(", ")}\n` +
      `  team Cockpit    (${cockpit.length}) : ${cockpit.join(", ")}\n` +
      "  → aligner src/mock/demoTeam.ts (et src/theme/roles.ts si le rôle manque).",
  );
  process.exit(1);
}
console.log(
  `${NAME} : OK — ${roster.length} personas du réservoir tous présents` +
    (enTrop.length ? ` (+${enTrop.length} propre(s) au Cockpit : ${enTrop.join(", ")})` : "") +
    ".",
);
