// publish-update.mjs — RECOPIE d'une release vers le canal de mise à jour (L34).
//
// POURQUOI CE SCRIPT EXISTE. Le builder (GitHub Actions) et le canal de
// distribution (Forgejo sur le LAN iakabox) sont deux mondes disjoints : GitHub
// ne peut pas atteindre le LAN. Il faut donc un pas de recopie exécuté depuis le
// poste de Stéphane, box en ligne. Ce n'est pas un défaut du montage, c'est le
// prix du choix « flux servi par Forgejo » — et il disparaîtra le jour où le flux
// passera sur un site public.
//
// Usage :
//   node scripts/publish-update.mjs v0.31.3               (depuis la release GitHub)
//   node scripts/publish-update.mjs v0.31.3 --from ./out   (depuis un répertoire local)
//   node scripts/publish-update.mjs v0.31.3 --check-only   (garde d'alignement seule)
//
// Jetons : `$FORGEJO_TOKEN` (ou `~/work/.env`) et `$GITHUB_TOKEN`/`$GH_TOKEN`.
// JAMAIS en dur, jamais affichés, jamais écrits dans un fichier suivi.
//
// Le script s'arrête NET à la première anomalie : mieux vaut aucun feed qu'un feed
// à moitié juste, qui enverrait les clients télécharger un binaire absent.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  buildManifest,
  checkVersionAlignment,
  classifyArtifact,
  UPDATER_PLATFORMS,
} from "./lib/update-manifest.mjs";

// --- Constantes de CE projet (cf. § Annexe de l'instruction) -------------------------------------
const FORGEJO_BASE = "http://192.168.2.11:3001";
const FORGEJO_OWNER = "sjupin";
const FORGEJO_REPO = "iakacockpit";
const GITHUB_REPO = "iakasju/IakaCockpit";
const MANIFEST_PATH = "updater/latest.json";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`publish-update : ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`publish-update : ${message}`);
}

// --- Arguments ------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const tag = argv.find((a) => !a.startsWith("--"));
const checkOnly = argv.includes("--check-only");
const fromIndex = argv.indexOf("--from");
const fromDir = fromIndex >= 0 ? argv[fromIndex + 1] : null;

if (!tag) {
  fail("tag manquant. Usage : node scripts/publish-update.mjs v0.31.3 [--from <dir>] [--check-only]");
}
if (fromIndex >= 0 && !fromDir) fail("--from attend un répertoire.");

// --- 1. Garde d'alignement des versions ------------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const conf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const cargo = readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8");

const alignment = checkVersionAlignment({
  tag,
  packageJson: pkg,
  tauriConf: conf,
  cargoToml: cargo,
});
if (!alignment.ok) {
  for (const m of alignment.mismatches) {
    console.error(
      `  ${m.source} porte « ${m.found ?? "(absent)"} », attendu « ${m.expected} »`,
    );
  }
  fail("versions désalignées — publication refusée (l'updater mentirait sur la version).");
}
info(`versions alignées sur ${alignment.version} (tag, package.json, tauri.conf.json, Cargo.toml).`);
if (checkOnly) process.exit(0);

// --- Jetons ----------------------------------------------------------------------------------------
function readDotEnvToken(name) {
  const candidates = [
    process.env.HOME ? join(process.env.HOME, "work", ".env") : null,
    join(root, "..", ".env"),
  ].filter(Boolean);
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.+)\\s*$`).exec(line);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const forgejoToken = process.env.FORGEJO_TOKEN || readDotEnvToken("FORGEJO_TOKEN");
if (!forgejoToken) {
  fail("FORGEJO_TOKEN introuvable (variable d'environnement ou ~/work/.env). Aucun jeton inventé.");
}

// --- 2. Récupération des artefacts -----------------------------------------------------------------
// Deux sources, même contrat de sortie : `[{ name, bytes }]`. Le repli `--from`
// existe pour ne pas dépendre de GitHub le jour où on n'en veut plus.

async function assetsFromGithub() {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!ghToken) {
    fail("GITHUB_TOKEN/GH_TOKEN introuvable — ou utilisez --from <dir> pour publier depuis un répertoire local.");
  }
  const headers = { Authorization: `Bearer ${ghToken}`, "User-Agent": "iakacockpit-publish-update" };
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`,
    { headers: { ...headers, Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) fail(`release GitHub ${tag} illisible (HTTP ${res.status}).`);
  const release = await res.json();
  const assets = release.assets ?? [];
  if (assets.length === 0) fail(`la release GitHub ${tag} ne porte aucun artefact.`);
  return assets.map((a) => ({
    name: a.name,
    fetch: async () => {
      const r = await fetch(a.url, {
        headers: { ...headers, Accept: "application/octet-stream" },
      });
      if (!r.ok) fail(`téléchargement de ${a.name} impossible (HTTP ${r.status}).`);
      return new Uint8Array(await r.arrayBuffer());
    },
  }));
}

function assetsFromDir(dir) {
  const abs = resolve(dir);
  if (!existsSync(abs)) fail(`répertoire introuvable : ${abs}`);
  const names = readdirSync(abs).filter((n) => !n.startsWith("."));
  if (names.length === 0) fail(`aucun fichier dans ${abs}.`);
  return names.map((name) => ({
    name,
    fetch: async () => new Uint8Array(readFileSync(join(abs, name))),
  }));
}

// --- 3. Release Forgejo + téléversement -------------------------------------------------------------
const api = `${FORGEJO_BASE}/api/v1/repos/${FORGEJO_OWNER}/${FORGEJO_REPO}`;
const forgejoHeaders = { Authorization: `token ${forgejoToken}` };

async function ensureForgejoRelease() {
  const existing = await fetch(`${api}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: forgejoHeaders,
  });
  if (existing.ok) {
    const r = await existing.json();
    info(`release Forgejo ${tag} déjà présente (id ${r.id}) — réutilisée.`);
    return r;
  }
  const created = await fetch(`${api}/releases`, {
    method: "POST",
    headers: { ...forgejoHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ tag_name: tag, name: tag, draft: false, prerelease: false }),
  });
  if (!created.ok) {
    fail(`création de la release Forgejo ${tag} refusée (HTTP ${created.status}).`);
  }
  const r = await created.json();
  info(`release Forgejo ${tag} créée (id ${r.id}).`);
  return r;
}

async function uploadAsset(releaseId, name, bytes, existingNames) {
  if (existingNames.has(name)) {
    info(`  ${name} : déjà attaché, téléversement sauté.`);
    return;
  }
  const form = new FormData();
  form.append("attachment", new Blob([bytes]), name);
  const res = await fetch(
    `${api}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
    { method: "POST", headers: forgejoHeaders, body: form },
  );
  if (!res.ok) fail(`téléversement de ${name} refusé (HTTP ${res.status}).`);
  info(`  ${name} : téléversé (${bytes.length} octets).`);
}

// --- Orchestration ----------------------------------------------------------------------------------
const assets = fromDir ? assetsFromDir(fromDir) : await assetsFromGithub();
info(`${assets.length} artefact(s) trouvé(s) sur la source ${fromDir ? `locale ${fromDir}` : "GitHub"}.`);

const release = await ensureForgejoRelease();
const existingNames = new Set((release.assets ?? []).map((a) => a.name));

// Passe 1 : les signatures (petits fichiers texte, indispensables au manifeste).
const signatures = new Map();
for (const asset of assets) {
  if (!asset.name.endsWith(".sig")) continue;
  const bytes = await asset.fetch();
  signatures.set(asset.name.slice(0, -4), new TextDecoder().decode(bytes).trim());
  await uploadAsset(release.id, asset.name, bytes, existingNames);
}
if (signatures.size === 0) {
  fail(
    "aucun fichier .sig dans la release — le build n'a pas signé. " +
      "Vérifiez les secrets TAURI_SIGNING_PRIVATE_KEY côté CI (gate humain).",
  );
}

// Passe 2 : les binaires updater, un à la fois (téléchargé puis relâché).
const entries = [];
for (const asset of assets) {
  if (asset.name.endsWith(".sig")) continue;
  const platform = classifyArtifact(asset.name);
  if (!platform) {
    info(`  ${asset.name} : hors périmètre updater, ignoré.`);
    continue;
  }
  const signature = signatures.get(asset.name);
  if (!signature) {
    info(`  ${asset.name} : aucune signature associée, ignoré (jamais publié non signé).`);
    continue;
  }
  const bytes = await asset.fetch();
  await uploadAsset(release.id, asset.name, bytes, existingNames);
  entries.push({ name: asset.name, signature });
}

// --- 4. Manifeste ------------------------------------------------------------------------------------
const { manifest, missing, duplicates } = buildManifest({
  version: tag,
  notes: `IakaCockpit ${alignment.version}`,
  pubDate: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  entries,
  baseUrl: `${FORGEJO_BASE}/${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/download/${tag}`,
});

if (Object.keys(manifest.platforms).length === 0) {
  fail("aucune plateforme publiable — manifeste non écrit.");
}
for (const p of missing) {
  console.warn(`publish-update : plateforme ${p} ABSENTE du manifeste (artefact manquant).`);
}
for (const d of duplicates) {
  console.warn(`publish-update : ${d} ignoré (plateforme déjà pourvue).`);
}
info(
  `manifeste : ${Object.keys(manifest.platforms).length}/${UPDATER_PLATFORMS.length} plateforme(s).`,
);

mkdirSync(join(root, dirname(MANIFEST_PATH)), { recursive: true });
writeFileSync(join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
info(`${MANIFEST_PATH} écrit.`);

// --- 5. Commit + push : c'est CE push qui ouvre le robinet -------------------------------------------
// Tant qu'il n'a pas eu lieu, rien ne bouge chez les clients — propriété utile :
// on peut publier les binaires, vérifier, PUIS rendre la version visible.
function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

git("add", MANIFEST_PATH);
const staged = git("diff", "--cached", "--name-only");
if (!staged) {
  info("manifeste inchangé — aucun commit, rien à ouvrir.");
  process.exit(0);
}
git("commit", "-m", `chore(release): publie le manifeste de mise a jour ${tag}`);
git("push", "origin", "HEAD:main");
info(`manifeste poussé sur main — la version ${alignment.version} est visible des clients.`);
