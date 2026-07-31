// test-handoff-parity.mjs — GARDE DE PARITÉ du contrat de handoff (forge → cockpit).
//
// PROBLÈME FERMÉ ICI. Le cockpit ne peut pas importer `@iakaframe/core` d'un autre dépôt
// (contrainte Q-C, cf. `src/handoff/receive.ts`) : il REDÉCLARE donc à la main la forme que la
// forge sérialise (`ForgeTeam`, `ForgePersona`, `HandoffManifest`). Un contrat dupliqué à la main
// dérive en silence — exactement ce qui est arrivé : la forge a retiré `methodId` et `workflowId`
// (commentaire « E2 » dans `packages/core/src/team.ts`) sans que rien ne le signale ici, parce que
// le parse est tolérant et remplace l'absence par un défaut plausible.
//
// La garde CONSTATE, elle ne corrige jamais — même posture que `vendor-check` côté iakaframe.
// Elle compare les NOMS DE CHAMPS des interfaces des deux côtés et échoue sur tout écart NOUVEAU.
//
// HORS `npm test` par défaut : la mesure dépend d'un dépôt frère, donc faillible sur un clone
// isolé. Tolérante à son absence : SKIP propre (exit 0), jamais un faux rouge.
//
// Usage : npm run test:handoff-parity   (IAKAFRAMEGUI_HOME pour pointer un autre chemin)
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cockpitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- Résolution du frère ------------------------------------------------------------------------
// IAKAFRAMEGUI_HOME est AUTORITAIRE : s'il est posé et ne porte pas le core, on ÉCHOUE au lieu de
// se rabattre sur un voisin. Un repli silencieux mesurerait un autre dépôt que celui demandé et
// rendrait un « OK » qui ne veut rien dire (même règle que IAKAFRAME_GUI_ROOT pour vendor-check).
const hasCore = (c) => existsSync(resolve(c, "packages", "core", "src", "team.ts"));
const override = process.env.IAKAFRAMEGUI_HOME;
let forgeRoot;

if (override) {
  if (!hasCore(override)) {
    console.error(
      `${"test:handoff-parity"} : IAKAFRAMEGUI_HOME pointe « ${override} », qui ne porte pas ` +
        "packages/core/src/team.ts. Chemin autoritaire : aucun repli sur un autre dépôt.",
    );
    process.exit(2);
  }
  forgeRoot = override;
} else {
  forgeRoot = [
    resolve(cockpitRoot, "..", "iakaFrameGUI"),
    resolve(cockpitRoot, "..", "iakaframegui"),
    // Cas agrégat : cockpit monté en sous-module de IakaProject, le GUI est un sous-module frère.
    resolve(cockpitRoot, "..", "..", "projects", "iakaFrameGUI"),
  ].find(hasCore);
}

if (!forgeRoot) {
  console.log(
    "test:handoff-parity — SKIP : dépôt frère iakaFrameGUI introuvable (clone isolé). " +
      "Aucune mesure de parité effectuée (définir IAKAFRAMEGUI_HOME pour l'activer).",
  );
  process.exit(0);
}

// --- Extraction des champs d'une interface TS (noms seuls ; le typage reste au compilateur) ------
// Volontairement textuel : lire le source du frère sans l'importer ni le compiler, c'est tout
// l'intérêt (Q-C). On ignore les lignes de commentaire — les fiches du core sont très commentées.
function interfaceFields(source, name) {
  const start = source.indexOf(`export interface ${name} {`);
  if (start < 0) return null;
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const body = source.slice(open + 1, end);
  const fields = [];
  let inBlockComment = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      continue;
    }
    if (line.startsWith("//") || line.startsWith("*") || line.length === 0) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\??)\s*:/);
    if (m) fields.push({ name: m[1], optional: m[2] === "?" });
  }
  return fields;
}

function read(...parts) {
  return readFileSync(resolve(...parts), "utf8");
}

const forgeTeamSrc = read(forgeRoot, "packages", "core", "src", "team.ts");
const forgePersonaSrc = read(forgeRoot, "packages", "core", "src", "persona.ts");
const forgeHandoffSrc = read(forgeRoot, "packages", "core", "src", "handoff.ts");
const cockpitSrc = read(cockpitRoot, "src", "handoff", "receive.ts");

// --- Écarts CONNUS et tolérés ------------------------------------------------------------------
// Chaque entrée est une DETTE NOMMÉE, pas un blanc-seing : elle éteint UN écart précis et rien
// d'autre. Tout écart non listé fait échouer la garde. À vider au fur et à mesure des arbitrages.
const KNOWN_GAPS = [
  {
    pair: "Team",
    field: "methodId",
    side: "cockpit-seulement",
    since: "2026-08-01",
    why:
      "La forge l'a retiré (E2 : methodId → Kit). Le cockpit le déclare encore ET, à la réception, " +
      "remplace l'absence par le défaut codé en dur \"iakaframe\" (receive.ts) — une valeur INVENTÉE, " +
      "indiscernable d'une vraie. Inoffensif tant que toutes les teams relèvent d'iakaframe ; devient " +
      "un faux étiquetage dès l'import de méthodes tierces (BMAD/MetaGPT/SPARC, backlog GUI). " +
      "ARBITRAGE DÉCIDEUR EN ATTENTE : retirer le champ, ou le garder en marquant explicitement " +
      "« non renseigné » plutôt qu'en inventant.",
  },
  {
    pair: "Team",
    field: "workflowId",
    side: "cockpit-seulement",
    since: "2026-08-01",
    why:
      "Retiré côté forge au même titre (E2 : workflowId → Méthode). Optionnel côté cockpit et copié " +
      "seulement s'il est présent : sans effet observable aujourd'hui. Même arbitrage que methodId.",
  },
  {
    pair: "Persona",
    field: "pastille",
    side: "forge-seulement",
    since: "2026-08-01",
    why:
      "Trouvé PAR CETTE GARDE, jamais vu à l'œil. La forge émet l'emoji de badge explicite d'une " +
      "persona (ex. \"🟠\" pour Fëanor) ; ni ForgePersona ni le roster Agent ne le portent. Le cockpit " +
      "affiche donc une pastille dérivée de son propre casting visuel, qui peut CONTREDIRE celle que " +
      "la forge a déclarée. Le brut reste dans originTeamJson : rien n'est perdu, rien n'est exploité. " +
      "ARBITRAGE DÉCIDEUR : la pastille étant l'identité visible d'un agent dans la méthode, elle " +
      "mérite probablement d'être portée jusqu'au roster.",
  },
  {
    pair: "Persona",
    field: "mission",
    side: "forge-seulement",
    since: "2026-08-01",
    why:
      "Trouvé PAR CETTE GARDE. Ligne de mission d'affichage (libellé court du réservoir), émise par " +
      "la forge, non portée par le cockpit. Même nature que pastille, enjeu moindre : confort " +
      "d'affichage plutôt qu'identité.",
  },
];

function gapKey(pair, field, side) {
  return `${pair}|${field}|${side}`;
}
const known = new Set(KNOWN_GAPS.map((g) => gapKey(g.pair, g.field, g.side)));
const usedKnown = new Set();

// --- Comparaison -------------------------------------------------------------------------------
const PAIRS = [
  { pair: "Team", forge: interfaceFields(forgeTeamSrc, "Team"), cockpit: interfaceFields(cockpitSrc, "ForgeTeam") },
  { pair: "Persona", forge: interfaceFields(forgePersonaSrc, "Persona"), cockpit: interfaceFields(cockpitSrc, "ForgePersona") },
  { pair: "Manifest", forge: interfaceFields(forgeHandoffSrc, "HandoffManifest"), cockpit: interfaceFields(cockpitSrc, "HandoffManifest") },
];

const drifts = [];
for (const { pair, forge, cockpit } of PAIRS) {
  if (!forge || !cockpit) {
    drifts.push({ pair, field: "(interface)", side: "introuvable", detail: `interface absente d'un des deux côtés (forge=${!!forge}, cockpit=${!!cockpit}) — un renommage suffit à casser la lecture` });
    continue;
  }
  const fNames = new Set(forge.map((f) => f.name));
  const cNames = new Set(cockpit.map((f) => f.name));

  for (const f of forge) {
    if (cNames.has(f.name)) continue;
    const k = gapKey(pair, f.name, "forge-seulement");
    if (known.has(k)) { usedKnown.add(k); continue; }
    drifts.push({ pair, field: f.name, side: "forge-seulement", detail: "la forge émet ce champ, le cockpit ne le déclare pas → non porté par le roster (le brut reste lisible dans originTeamJson, mais rien ne l'exploite)" });
  }
  for (const c of cockpit) {
    if (fNames.has(c.name)) continue;
    const k = gapKey(pair, c.name, "cockpit-seulement");
    if (known.has(k)) { usedKnown.add(k); continue; }
    drifts.push({ pair, field: c.name, side: "cockpit-seulement", detail: "le cockpit attend ce champ, la forge ne l'émet plus → défaut appliqué, potentiellement inventé" });
  }
}

// Une dette éteinte doit être RETIRÉE de la liste : sinon la liste ment à son tour.
const stale = KNOWN_GAPS.filter((g) => !usedKnown.has(gapKey(g.pair, g.field, g.side)));

// --- Verdict -----------------------------------------------------------------------------------
const label = "test:handoff-parity";
if (drifts.length === 0 && stale.length === 0) {
  const total = PAIRS.reduce((n, p) => n + (p.cockpit?.length ?? 0), 0);
  console.log(`${label} : OK - ${total} champs conformes au canon @iakaframe/core sur 3 interfaces.`);
  if (KNOWN_GAPS.length > 0) {
    console.log(`  ${KNOWN_GAPS.length} écart(s) CONNU(S) et tolérés (arbitrage décideur en attente) :`);
    for (const g of KNOWN_GAPS) console.log(`    - ${g.pair}.${g.field} (${g.side}, depuis ${g.since})`);
  }
  console.log(`  forge : ${forgeRoot}`);
  process.exit(0);
}

console.error(`${label} : DÉRIVE - le contrat de handoff a bougé côté forge.`);
for (const d of drifts) {
  console.error(`  ✗ ${d.pair}.${d.field} — ${d.side}`);
  console.error(`      ${d.detail}`);
}
for (const g of stale) {
  console.error(`  ✗ dette périmée : ${g.pair}.${g.field} (${g.side}) est déclarée connue mais n'existe plus`);
  console.error("      → la retirer de KNOWN_GAPS : une liste de dettes qui ment est pire que pas de liste");
}
console.error("\n  Le cockpit REDÉCLARE le contrat à la main (Q-C) : c'est à lui de suivre la forge.");
console.error(`  forge : ${forgeRoot}`);
process.exit(1);
