/**
 * Parité Cockpit ↔ réservoir iakaframe.
 *
 * Raison d'être : la team par défaut du Cockpit avait divergé du roster du réservoir sans
 * que rien ne le signale — `charon`, `helm` et `feanor` y figuraient depuis longtemps et
 * manquaient côté Cockpit. Une divergence silencieuse est le défaut qu'on ferme ici.
 *
 * ÉTENDUE (lot « Pastille du badge du runner », AR-6 = (a)) : au-delà des NOMS, on
 * compare désormais les VALEURS de pastille — `PHASE_PASTILLE_BY_ROLE`
 * (`src/theme/roles.ts`) est une COPIE du frontmatter `pastille:` des personas du
 * réservoir ; sans cette extension, elle dériverait en silence, exactement la dérive que
 * ce script ferme déjà pour les noms.
 *
 * SKIP PROPRE si le réservoir est absent (clone isolé) : ce contrôle dépend d'un dépôt
 * frère, il ne doit pas rougir chez qui ne l'a pas. `IAKAFRAME_HOME` est AUTORITAIRE —
 * posé mais faux, on ÉCHOUE plutôt que de mesurer un autre dépôt (même règle que
 * `test-handoff-parity.mjs`).
 *
 * LIMITES DÉCLARÉES (AR-6, à ne pas oublier en le lisant vert) :
 *   - ce script n'est PAS dans `scripts/quality.sh` (8 étapes, aucune ne l'appelle) —
 *     c'est une commande À PART, volontairement (§ 2.9 de l'instruction) ;
 *   - une ÉDITION COORDONNÉE des deux côtés (réservoir et table Cockpit changés
 *     ensemble, à la même valeur fautive) échapperait à cette garde comme à toute garde
 *     de parité par comparaison de deux copies.
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
/** Valeur scalaire d'une clé de frontmatter — même contrat que `fm_scalar` de
 * `reservoir.rs` : guillemets retirés, `""` si absente ou si c'est une liste. */
function fmScalar(fm, key) {
  for (const line of fm.split("\n")) {
    const l = line.trim();
    if (l.startsWith(`${key}:`)) {
      const v = l.slice(key.length + 1).trim();
      if (v.startsWith("[")) return "";
      return v.replace(/^["']|["']$/g, "");
    }
  }
  return "";
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

// --- Extension AR-6 : parité des VALEURS de pastille (pas seulement des noms). ---------
// On lit la table + l'alias EMBARQUÉS côté Cockpit par regex sur le SOURCE (même geste
// que la lecture de `demoTeam.ts` plus haut : pas de build pour un script).
const rolesSrc = readFileSync(join(cockpitRoot, "src", "theme", "roles.ts"), "utf8");
function extractTable(src, constName) {
  const m = src.match(
    new RegExp(`${constName}[^{]*=\\s*{([\\s\\S]*?)^};`, "m"),
  );
  if (!m) {
    throw new Error(`${NAME} : impossible de lire ${constName} dans src/theme/roles.ts`);
  }
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^\s*([a-zA-Z]+):\s*"([^"]*)"/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}
const cockpitPastilleByRole = extractTable(rolesSrc, "PHASE_PASTILLE_BY_ROLE");
const reservoirAliasToCockpit = extractTable(rolesSrc, "RESERVOIR_ROLE_ALIAS");
const personasDir = join(root, "library", "personas");

const divergences = [];
for (const id of roster) {
  const file = join(personasDir, `${id}.md`);
  if (!existsSync(file)) continue; // absence déjà signalée par la vérif des noms.
  const fm = frontmatter(readFileSync(file, "utf8"));
  const reservoirRoleKey = fmScalar(fm, "roleKey");
  const reservoirPastille = fmScalar(fm, "pastille");
  if (!reservoirRoleKey || !reservoirPastille) continue; // frontmatter incomplet : rien à comparer.
  const cockpitRoleKey = reservoirAliasToCockpit[reservoirRoleKey] ?? reservoirRoleKey;
  const cockpitPastille = cockpitPastilleByRole[cockpitRoleKey];
  if (cockpitPastille !== reservoirPastille) {
    divergences.push(
      `${id} (roleKey réservoir « ${reservoirRoleKey} » → clé Cockpit « ${cockpitRoleKey} ») : ` +
        `réservoir « ${reservoirPastille} », table Cockpit « ${cockpitPastille ?? "(absente)"} »`,
    );
  }
}
if (divergences.length) {
  console.error(
    `${NAME} : ÉCHEC — ${divergences.length} pastille(s) divergente(s) entre le réservoir ` +
      `et PHASE_PASTILLE_BY_ROLE (src/theme/roles.ts) :\n` +
      divergences.map((d) => `  - ${d}`).join("\n") +
      "\n  → aligner src/theme/roles.ts sur le frontmatter du réservoir (jamais l'inverse).",
  );
  process.exit(1);
}

console.log(
  `${NAME} : OK — ${roster.length} personas du réservoir tous présents` +
    (enTrop.length ? ` (+${enTrop.length} propre(s) au Cockpit : ${enTrop.join(", ")})` : "") +
    `, pastilles alignées.`,
);
