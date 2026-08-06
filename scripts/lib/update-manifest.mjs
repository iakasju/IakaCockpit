// update-manifest.mjs — CŒUR PUR de la chaîne de publication L34.
//
// Deux responsabilités, sans aucune I/O : (1) la GARDE D'ALIGNEMENT des versions
// déclarées, (2) la CONSTRUCTION du manifeste `updater/latest.json`. Les tirer
// hors du script exécutable les rend testables sur des données factices, sans
// réseau, sans dépôt et sans release — ce que ni GitHub ni Forgejo ne permettent.
//
// Zéro dépendance externe (esprit des scripts existants du dépôt).

/** Les quatre cibles de mise à jour, dans l'ordre d'écriture du manifeste. */
export const UPDATER_PLATFORMS = [
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-x86_64",
  "windows-x86_64",
];

/** Normalise un tag (`v0.31.3`) en version de manifeste (`0.31.3`). */
export function versionFromTag(tag) {
  return String(tag ?? "").replace(/^v/, "");
}

/**
 * Extrait la version du `[package]` d'un `Cargo.toml`. On s'arrête à la première
 * table suivante : une `version` de dépendance ne doit JAMAIS être prise pour la
 * version du paquet (elle mentirait en silence).
 */
export function cargoVersion(cargoToml) {
  const lines = String(cargoToml).split(/\r?\n/);
  let inPackage = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("[")) {
      inPackage = line === "[package]";
      continue;
    }
    if (!inPackage) continue;
    const m = /^version\s*=\s*"([^"]+)"/.exec(line);
    if (m) return m[1];
  }
  return null;
}

/**
 * GARDE D'ALIGNEMENT (§ 6b.1). `package.json`, `tauri.conf.json`, `Cargo.toml` et
 * le tag doivent porter la MÊME version. Une dérive ici et l'updater annonce une
 * version qui n'est pas celle du binaire : le client se croit à jour, ou boucle.
 *
 * Renvoie `{ ok, version, sources, mismatches }` — jamais d'exception : c'est
 * l'appelant qui décide d'échouer (le mode `--check-only` veut le détail).
 */
export function checkVersionAlignment({ tag, packageJson, tauriConf, cargoToml }) {
  const version = versionFromTag(tag);
  const sources = {
    tag: version,
    "package.json": packageJson?.version ?? null,
    "tauri.conf.json": tauriConf?.version ?? null,
    "Cargo.toml": cargoVersion(cargoToml ?? ""),
  };
  const mismatches = Object.entries(sources)
    .filter(([, v]) => v !== version)
    .map(([source, found]) => ({ source, found, expected: version }));
  return { ok: mismatches.length === 0 && version !== "", version, sources, mismatches };
}

/**
 * Classe un artefact de release en plateforme updater, ou `null` s'il n'en est
 * pas un. Aucune supposition d'architecture : un `.app.tar.gz` dont le nom ne
 * porte pas d'architecture reconnaissable est REFUSÉ plutôt que rangé au hasard
 * (un binaire arm64 servi à un Mac Intel casserait l'installation).
 */
export function classifyArtifact(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith(".sig")) return null;
  if (n.endsWith(".app.tar.gz")) {
    if (/aarch64|arm64/.test(n)) return "darwin-aarch64";
    if (/x64|x86_64|amd64|intel/.test(n)) return "darwin-x86_64";
    return null;
  }
  if (n.endsWith(".appimage")) return "linux-x86_64";
  if (n.endsWith("-setup.exe") || n.endsWith(".msi")) return "windows-x86_64";
  return null;
}

/**
 * Rang de préférence quand DEUX artefacts revendiquent la même plateforme.
 *
 * Le cas réel : une release Windows porte à la fois l'installeur NSIS
 * (`-setup.exe`) et le MSI. Sans arbitrage, le gagnant dépendrait de l'ordre —
 * arbitraire — dans lequel l'API renvoie les assets, et deux publications
 * successives pourraient servir des installeurs différents. On tranche : NSIS
 * d'abord, cohérent avec `"windows": { "installMode": "passive" }` de la config.
 */
export function artifactRank(name) {
  return String(name).toLowerCase().endsWith("-setup.exe") ? 1 : 0;
}

/**
 * Construit le manifeste attendu par le plugin `updater`.
 *
 * `entries` = `[{ name, signature }]` — `signature` est le CONTENU du `.sig`,
 * jamais un chemin. `baseUrl` sert à produire des URL ABSOLUES (le manifeste est
 * lu depuis un autre chemin que les binaires : une URL relative ne résoudrait
 * pas). Une plateforme sans artefact est OMISE du manifeste et remontée dans
 * `missing` — jamais écrite avec une URL fantôme, qui ferait échouer les clients
 * de cette plateforme au téléchargement au lieu de les laisser à jour.
 */
export function buildManifest({ version, notes, pubDate, entries, baseUrl }) {
  const platforms = {};
  const ignored = [];
  const duplicates = [];

  for (const entry of entries ?? []) {
    const platform = classifyArtifact(entry.name);
    if (!platform) {
      ignored.push(entry.name);
      continue;
    }
    if (!entry.signature) {
      // Sans signature, le client refusera la charge utile : mieux vaut l'omettre
      // (et le dire) que publier une entrée qui échouera à l'installation.
      ignored.push(entry.name);
      continue;
    }
    const candidate = {
      signature: entry.signature,
      url: `${String(baseUrl).replace(/\/$/, "")}/${entry.name}`,
      rank: artifactRank(entry.name),
      name: entry.name,
    };
    const held = platforms[platform];
    if (held) {
      // Arbitrage déterministe : le mieux classé gagne, quel que soit l'ordre
      // d'arrivée. À rang égal, le premier reste (stabilité).
      if (candidate.rank > held.rank) {
        duplicates.push(held.name);
        platforms[platform] = candidate;
      } else {
        duplicates.push(entry.name);
      }
      continue;
    }
    platforms[platform] = candidate;
  }

  // Ordre stable des plateformes (un diff git du feed reste lisible) + projection
  // au format du plugin (le rang et le
  // nom sont des données de travail, ils n'ont rien à faire dans le manifeste).
  const ordered = {};
  for (const p of UPDATER_PLATFORMS) {
    if (platforms[p]) {
      ordered[p] = { signature: platforms[p].signature, url: platforms[p].url };
    }
  }

  const manifest = {
    version: versionFromTag(version),
    notes: notes ?? "",
    pub_date: pubDate,
    platforms: ordered,
  };
  const missing = UPDATER_PLATFORMS.filter((p) => !ordered[p]);
  return { manifest, missing, ignored, duplicates };
}
