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
//   node scripts/publish-update.mjs v0.31.3 --dry-run      (tout sauf ecrire/televerser/pousser)
//   node scripts/publish-update.mjs v0.31.3 --pub-date 2026-01-01T00:00:00Z
//
// `--pub-date` (defaut : maintenant) rend la publication REPRODUCTIBLE. Sans elle, `pub_date`
// changeait a chaque execution, ce qui rendait INATTEIGNABLE le chemin « republier a l'identique
// = aucun commit » : le manifeste differait toujours, ne serait-ce que par sa date.
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
// HÔTE DE LA FORGE : NAS Synology. L'ancienne iakabox (192.168.2.11) est HORS SERVICE et ne
// répond plus (sonde du 2026-08-25) ; l'infra du portefeuille y a été rejouée. Tant que ce
// constante pointait la box morte, `publish-update` ne pouvait NI créer une release NI produire
// un manifeste téléchargeable — le canal d'auto-update était rompu des deux côtés.
const FORGEJO_BASE = "http://192.168.1.139:3001";

/**
 * LA BASE DE TELECHARGEMENT ANNONCEE PAR LE MANIFESTE — les releases GitHub.
 *
 * Distincte de `FORGEJO_BASE`, et c'est le point qui manquait. Le manifeste est un fichier
 * UNIQUE, recopie sur plusieurs canaux, dont les URL sont ABSOLUES : le meme document est lu par
 * un poste du LAN et par une machine qui n'y sera jamais. Faire pointer ses URL vers une adresse
 * de LAN, c'est promettre un telechargement a des lecteurs qui ne peuvent pas l'atteindre — etat
 * mesure le 2026-08-28 : manifeste servi sur deux canaux, URL d'artefact a 404, mise a jour VUE
 * et telechargeable NULLE PART.
 *
 * L'hote de LECTURE (les `endpoints`) reste la forge du LAN, la plus proche ; l'hote de
 * TELECHARGEMENT doit etre PUBLIC. Decision du decideur, 2026-08-28 : « les manifestes pointent
 * sur GitHub ». Ce que la forge du LAN continue de recevoir est un MIROIR, pas la cible annoncee.
 */
const ARTEFACT_BASE = "https://github.com/iakasju/IakaCockpit/releases/download";
const FORGEJO_OWNER = "sjupin";
const FORGEJO_REPO = "iakacockpit";
const GITHUB_REPO = "iakasju/IakaCockpit";
const MANIFEST_PATH = "updater/latest.json";
// Seule branche depuis laquelle ce script a le droit de publier. Le feed EST un
// fichier de `main` : publier depuis une autre branche pousserait son contenu
// entier sur `main` — cf. `assertReleaseBranch`.
//
// C'est la RÉFÉRENCE COMPARÉE par la garde, et rien d'autre : la cible du push
// est `HEAD`, pas cette constante (cf. § 5, fait mesuré au labo git).
const RELEASE_BRANCH = "main";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`publish-update : ${message}`);
  process.exit(1);
}

// Les messages de progression vont sur STDERR : la sortie standard du script peut porter un
// DOCUMENT (le manifeste, en `--dry-run`), et un document mele de journal ne se compare pas.
function info(message) {
  console.error(`publish-update : ${message}`);
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

// --- Garde de branche ------------------------------------------------------------------------------
// La seule écriture sur `main` de tout le lot est le push final de ce script.
// Lancé depuis une branche de feature, il y déverserait TOUT le contenu de cette
// branche, pas seulement le manifeste. On refuse net, tôt (avant la moindre
// écriture distante — jeton compris) et de nouveau juste avant le push.
//
// La garde est la PREMIÈRE ligne de défense, la forme du push est la seconde :
// `git push origin HEAD` échoue fermé si jamais la garde était contournée, là où
// `git push origin main` publierait silencieusement le `main` local (cf. § 5).
function assertReleaseBranch() {
  let branch;
  try {
    branch = git("rev-parse", "--abbrev-ref", "HEAD");
  } catch {
    fail("branche courante illisible (dépôt git absent ?) — publication refusée.");
  }
  if (branch !== RELEASE_BRANCH) {
    fail(
      `branche courante « ${branch === "HEAD" ? "HEAD détachée" : branch} », attendue ` +
        `« ${RELEASE_BRANCH} » — publication refusée. Le manifeste est un fichier de ` +
        `${RELEASE_BRANCH} : publier d'ici pousserait tout le contenu de cette branche sur ` +
        `${RELEASE_BRANCH}. Fusionnez d'abord, basculez (git switch ${RELEASE_BRANCH}) et relancez.`,
    );
  }
  return branch;
}

// --- Arguments ------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const tag = argv.find((a) => !a.startsWith("--"));
const checkOnly = argv.includes("--check-only");
const dryRun = argv.includes("--dry-run");
const fromIndex = argv.indexOf("--from");
const fromDir = fromIndex >= 0 ? argv[fromIndex + 1] : null;
const pubDateIndex = argv.indexOf("--pub-date");
const pubDateArg = pubDateIndex >= 0 ? argv[pubDateIndex + 1] : null;

if (!tag) {
  fail(
    "tag manquant. Usage : node scripts/publish-update.mjs v0.31.3 " +
      "[--from <dir>] [--check-only] [--dry-run] [--pub-date <ISO>]",
  );
}
if (fromIndex >= 0 && !fromDir) fail("--from attend un répertoire.");
if (pubDateIndex >= 0 && !pubDateArg) fail("--pub-date attend une date ISO 8601.");
if (pubDateArg && Number.isNaN(Date.parse(pubDateArg))) {
  fail(`--pub-date : « ${pubDateArg} » n'est pas une date ISO 8601 lisible.`);
}
// Date de publication : PILOTABLE, defaut = maintenant, normalisee a la seconde.
const pubDate = pubDateArg ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

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
// `--check-only` reste STRICTEMENT la garde d'alignement (son contrat, critère C7) :
// il ne touche à rien, donc la garde de branche ne le concerne pas.
if (checkOnly) process.exit(0);

// Vérifié AVANT toute écriture, locale ou distante : mieux vaut refuser avant
// d'avoir créé une release Forgejo à moitié remplie. `--dry-run` n'écrit RIEN — ni fichier, ni
// release, ni commit : la garde de branche n'a rien à protéger, et l'exiger empêcherait
// justement de vérifier le manifeste depuis une branche de travail.
if (!dryRun) info(`branche de publication : ${assertReleaseBranch()}.`);

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
if (!forgejoToken && !dryRun) {
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

// Pré-vol : tout ce qui peut se vérifier sur les NOMS SEULS se vérifie AVANT la
// moindre écriture distante. Échouer après avoir créé une release à moitié
// remplie laisserait un état sale à nettoyer à la main.
if (!assets.some((a) => a.name.endsWith(".sig"))) {
  fail(
    "aucun fichier .sig parmi les artefacts — le build n'a pas signé. " +
      "Vérifiez les secrets TAURI_SIGNING_PRIVATE_KEY côté CI (gate humain).",
  );
}
for (const asset of assets) {
  // Cas MESURÉ : un build LOCAL nomme le bundle `IakaCockpit.app.tar.gz`, sans
  // architecture — c'est `tauri-action` qui injecte `_aarch64`/`_x64` au moment
  // de l'upload. Publier ce fichier tel quel servirait un binaire arm64 à un
  // Mac Intel : on refuse, en disant quoi faire.
  const n = asset.name.toLowerCase();
  if (n.endsWith(".app.tar.gz") && !classifyArtifact(asset.name)) {
    fail(
      `${asset.name} ne porte pas d'architecture. Renommez-le en ` +
        "« IakaCockpit_aarch64.app.tar.gz » ou « IakaCockpit_x64.app.tar.gz » " +
        "(avec son .sig) avant de republier — aucune architecture n'est devinée.",
    );
  }
}

const release = dryRun ? null : await ensureForgejoRelease();
const existingNames = new Set((release?.assets ?? []).map((a) => a.name));

// Passe 1 : les signatures (petits fichiers texte, indispensables au manifeste).
const signatures = new Map();
for (const asset of assets) {
  if (!asset.name.endsWith(".sig")) continue;
  const bytes = await asset.fetch();
  signatures.set(asset.name.slice(0, -4), new TextDecoder().decode(bytes).trim());
  if (!dryRun) await uploadAsset(release.id, asset.name, bytes, existingNames);
}

// Passe 2 : les binaires updater, un à la fois (téléchargé puis relâché).
// `classifyArtifact` rend désormais le COUPLE `{ generique, installeur }` ; ici seule sa
// VÉRITÉ compte (cet artefact est-il une cible de mise à jour ?), le détail des clés est
// l'affaire de `buildManifest`.
const entries = [];
for (const asset of assets) {
  if (asset.name.endsWith(".sig")) continue;
  const classe = classifyArtifact(asset.name);
  if (!classe) {
    info(`  ${asset.name} : hors périmètre updater, ignoré.`);
    continue;
  }
  const signature = signatures.get(asset.name);
  if (!signature) {
    info(`  ${asset.name} : aucune signature associée, ignoré (jamais publié non signé).`);
    continue;
  }
  if (!dryRun) {
    const bytes = await asset.fetch();
    await uploadAsset(release.id, asset.name, bytes, existingNames);
  }
  entries.push({ name: asset.name, signature });
}

// --- 4. Manifeste ------------------------------------------------------------------------------------
const { manifest, missing, duplicates, nonSignes } = buildManifest({
  version: tag,
  notes: `IakaCockpit ${alignment.version}`,
  pubDate,
  entries,
  baseUrl: `${ARTEFACT_BASE}/${tag}`,
});

if (Object.keys(manifest.platforms).length === 0) {
  fail("aucune plateforme publiable — manifeste non écrit.");
}
for (const p of missing) {
  console.warn(`publish-update : plateforme ${p} ABSENTE du manifeste (artefact manquant).`);
}
for (const d of duplicates) {
  console.warn(`publish-update : ${d} ignoré (clé déjà pourvue).`);
}
for (const n of nonSignes) {
  // CA-3 : sans `.sig`, AUCUNE clé — ni générique, ni d'installeur. Le client refuserait la
  // charge : l'annoncer déplacerait l'échec du téléchargement vers l'installation.
  console.warn(`publish-update : ${n} NON SIGNÉ — aucune clé émise pour cet artefact.`);
}
info(
  `manifeste : ${Object.keys(manifest.platforms).length}/${UPDATER_PLATFORMS.length} plateforme(s).`,
);

if (dryRun) {
  // `--dry-run` : le manifeste sur la sortie standard, RIEN sur le disque ni sur le réseau.
  // C'est la forme sous laquelle deux exécutions se comparent à l'octet (CA-14).
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(0);
}

mkdirSync(join(root, dirname(MANIFEST_PATH)), { recursive: true });
writeFileSync(join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
info(`${MANIFEST_PATH} écrit.`);

// --- 5. Commit + push : c'est CE push qui ouvre le robinet -------------------------------------------
// Tant qu'il n'a pas eu lieu, rien ne bouge chez les clients — propriété utile :
// on peut publier les binaires, vérifier, PUIS rendre la version visible.

// Deuxième contrôle : la ligne qui suit est la seule écriture sur `main` du lot
// entier. Elle ne s'exécute que sur `main`, vérifié à l'instant de l'exécuter.
assertReleaseBranch();

git("add", MANIFEST_PATH);
// Portée au SEUL manifeste : un `git diff --cached` nu verrait aussi les fichiers
// déjà indexés par ailleurs et déclencherait un commit de release pour rien.
const staged = git("diff", "--cached", "--name-only", "--", MANIFEST_PATH);
if (!staged) {
  info("manifeste inchangé — aucun commit, rien à ouvrir.");
  process.exit(0);
}
// `-- <path>` : le commit ne prend QUE le manifeste. Sans ce pathspec, tout ce qui
// traîne dans l'index partirait dans le commit de release.
git("commit", "-m", `chore(release): publie le manifeste de mise a jour ${tag}`, "--", MANIFEST_PATH);
// On pousse `HEAD` — LA référence qui vient de recevoir le commit — et non le nom
// `main`. Mesuré au labo git : garde contournée (HEAD détachée, `main` local en
// avance d'un commit de travail), `git push origin main` publie le `main` LOCAL,
// jamais relu par ce run, avec exit 0 et en silence : le manifeste tout juste
// commité ne part même pas, et le contenu de la branche part à sa place.
// `git push origin HEAD` échoue net dans la même situation (« not a full refname »),
// et sur le chemin nominal — sur `main` — les deux formes sont équivalentes.
// Échouer fermé plutôt qu'ouvert : c'est la seule différence, elle décide.
git("push", "origin", "HEAD");
info(`manifeste poussé sur main — la version ${alignment.version} est visible des clients.`);
