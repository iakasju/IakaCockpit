// update-manifest.mjs — CŒUR PUR de la chaîne de publication L34.
//
// Deux responsabilités, sans aucune I/O : (1) la GARDE D'ALIGNEMENT des versions
// déclarées, (2) la CONSTRUCTION du manifeste `updater/latest.json`. Les tirer
// hors du script exécutable les rend testables sur des données factices, sans
// réseau, sans dépôt et sans release — ce que ni GitHub ni Forgejo ne permettent.
//
// Zéro dépendance externe (esprit des scripts existants du dépôt). Le seul import est INTERNE :
// `vitrine.mjs`, fichier convergent partagé avec le dépôt frère, qui sait extraire d'un README la
// version qu'il ANNONCE. Le réimplémenter ici aurait créé une seconde lecture du même format —
// donc la première à diverger.
import { versionAnnoncee } from "./vitrine.mjs";

/**
 * LA VERSION DU PLUGIN CONTRE LAQUELLE LA CONVENTION DE CLÉS A ÉTÉ VÉRIFIÉE.
 *
 * Les clés `{os}-{arch}-{installer}` ne sont PAS documentées par Tauri : la doc officielle ne
 * décrit que `OS-ARCH`. Elles n'existent que dans la SOURCE de la version verrouillée
 * (`get_urls`, `updater.rs:568-598`). Or `Cargo.toml` déclare `tauri-plugin-updater = "2"` : un
 * `cargo update` peut monter la version sans rien dire, et emporter la convention avec.
 * D'où le cliquet — cf. `versionPluginUpdater` et la garde qui la compare.
 */
export const VERSION_PLUGIN_UPDATER_VERIFIEE = "2.10.1";

/**
 * Les plateformes GÉNÉRIQUES `{os}-{arch}` — le REPLI du plugin, et le comportement historique.
 * Elles restent émises telles quelles : aucun client déjà installé ne change de comportement du
 * seul fait de ce lot.
 */
export const PLATEFORMES_GENERIQUES = [
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-x86_64",
  "windows-x86_64",
];

/**
 * Les installeurs émis PAR plateforme générique, dans l'ordre d'écriture.
 *
 * Valeurs prises de `Installer::name()` (`updater.rs:59-68`) : `appimage`, `deb`, `rpm`, `app`,
 * `msi`, `nsis`. `app` est délibérément ABSENT (AR-3) : `bundle_type()` rend `Some(App)` par
 * défaut sur macOS, donc le plugin demande toujours `darwin-*-app` en premier ; elle est absente
 * aujourd'hui et le repli générique fonctionne, mesuré. L'ajouter serait une promesse de plus
 * sans gain — et un piège le jour où elle se périmerait.
 */
export const INSTALLEURS_PAR_PLATEFORME = {
  "darwin-aarch64": [],
  "darwin-x86_64": [],
  "linux-x86_64": ["appimage", "deb", "rpm"],
  "windows-x86_64": ["msi", "nsis"],
};

/**
 * La liste ORDONNÉE des clés que le manifeste peut porter — DÉRIVÉE des deux tables ci-dessus,
 * et non plus une liste figée de quatre. Ajouter un installeur se fait à UN endroit.
 *
 * L'ordre est l'ordre d'écriture du manifeste : un `diff` git du feed doit rester lisible.
 */
export const UPDATER_PLATFORMS = PLATEFORMES_GENERIQUES.flatMap((g) => [
  g,
  ...INSTALLEURS_PAR_PLATEFORME[g].map((i) => `${g}-${i}`),
]);

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
 * Lit la version VERROUILLÉE de `tauri-plugin-updater` dans un `Cargo.lock`.
 *
 * Fonction pure : la garde peut donc l'exercer sur une FIXTURE (contrefactuel de CA-15) sans
 * jamais toucher au `Cargo.lock` réel.
 */
export function versionPluginUpdater(cargoLock) {
  const blocs = String(cargoLock).split(/\n\[\[package\]\]\n/);
  for (const bloc of blocs) {
    if (!/^name = "tauri-plugin-updater"$/m.test(bloc)) continue;
    const m = /^version = "([^"]+)"$/m.exec(bloc);
    if (m) return m[1];
  }
  return null;
}

/**
 * GARDE D'ALIGNEMENT (§ 6b.1). `package.json`, `tauri.conf.json`, `Cargo.toml`, le README et
 * le tag doivent porter la MÊME version. Une dérive ici et l'updater annonce une
 * version qui n'est pas celle du binaire : le client se croit à jour, ou boucle.
 *
 * L42 — LE README REJOINT LES SOURCES GARDÉES. Il est un porteur de version de plein droit : la
 * page que voit un inconnu arrivant sur GitHub annonce un numéro et un tableau de noms de fichiers
 * versionnés. Mesuré le 2026-08-29 : il annonçait v0.31.2 quand le dépôt portait 0.32.1, et rien ne
 * rougissait. Le `readme` est OPTIONNEL dans la signature : les appels existants (et les tests du
 * § 6b.1) restent valables sans lui, et n'acquièrent pas silencieusement un cinquième contrôle.
 *
 * ⚠️ DIVERGENCE PRÉEXISTANTE, DITE PLUTÔT QUE MASQUÉE. Le dépôt frère (iakaFrameGUI) garde ses
 * porteurs de version par un dispositif PLUS RICHE : registre `VERSION_CARRIERS` avec la raison de
 * chaque entrée, registre `VERSION_NON_CARRIERS` de ce qui est hors couverture, et un cliquet
 * comparant les clés LUES aux clés DÉCLARÉES. Cette fonction-ci n'a rien de tout cela : elle
 * énumère quatre sources en dur, sans raisons ni cliquet. L42 y ajoute le README SANS importer le
 * dispositif du frère — ce serait un autre lot, et le faire en passant le trancherait par accident.
 * CE QUE ÇA COÛTE : ajouter ici un porteur sans câbler sa lecture dans `publish-update.mjs` ne fait
 * rougir personne, là où le frère mordrait. CONDITION DE LEVÉE : un lot qui aligne les deux
 * dispositifs de garde de version, ou qui les fait converger dans le registre partagé.
 *
 * Renvoie `{ ok, version, sources, mismatches }` — jamais d'exception : c'est
 * l'appelant qui décide d'échouer (le mode `--check-only` veut le détail).
 */
export function checkVersionAlignment({ tag, packageJson, tauriConf, cargoToml, readme, packageLock }) {
  const version = versionFromTag(tag);
  const sources = {
    tag: version,
    "package.json": packageJson?.version ?? null,
    "tauri.conf.json": tauriConf?.version ?? null,
    "Cargo.toml": cargoVersion(cargoToml ?? ""),
  };
  // Un README non fourni n'est PAS un README aligné : on n'ajoute la source que si l'appelant l'a
  // lue. L'inscrire à `null` par défaut ferait échouer tous les appels existants ; l'inscrire à
  // `version` par défaut serait un faux vert. On l'omet, et le cliquet de `publish-update.mjs`
  // (ci-dessous) est ce qui garantit qu'elle est bien fournie en publication réelle.
  if (readme !== undefined) sources["README.md"] = versionAnnoncee(readme);
  // RÉCIDIVE MESURÉE (2026-09-05, revue de version v0.33.0) — `package-lock.json` est un CINQUIÈME
  // porteur, et il a dérivé DEUX FOIS : `e8b3e91` l'avait corrigé À LA MAIN au bump v0.31.2 sans
  // étendre cette garde, donc le trou est resté ouvert et il a re-mordu au bump v0.33.0. Rien
  // d'autre ne l'attrape : `npm ci` ne bronche pas sur ce champ, ce n'est pas un défaut de
  // résolution de dépendances. Même contrat que `readme` : un lockfile NON FOURNI n'est pas un
  // lockfile aligné — on omet la source plutôt que d'inventer un vert, et le cliquet d'omission
  // de `publish-update.mjs` est ce qui garantit qu'il est bien fourni en publication réelle.
  if (packageLock !== undefined) sources["package-lock.json"] = packageLock?.version ?? null;
  const mismatches = Object.entries(sources)
    .filter(([, v]) => v !== version)
    .map(([source, found]) => ({ source, found, expected: version }));
  return { ok: mismatches.length === 0 && version !== "", version, sources, mismatches };
}

/**
 * Classe un artefact de release, ou `null` s'il n'est pas une cible de mise à jour.
 *
 * Rend le COUPLE `{ generique, installeur }` — c'est le changement du lot. Le plugin cherche
 * d'abord `{os}-{arch}-{installer}`, PUIS `{os}-{arch}` (`get_urls`) ; n'émettre que la seconde
 * fait qu'un client installé par MSI reçoit l'exe NSIS et s'installe À CÔTÉ de son enregistrement
 * MSI, et qu'un client installé par `.deb` reçoit une AppImage et échoue en `InvalidUpdaterFormat`
 * à chaque tentative. Le manifeste ne mentait pas sur OÙ télécharger — il mentait sur QUOI il sert.
 *
 * Aucune supposition d'architecture : un `.app.tar.gz` dont le nom ne porte pas d'architecture
 * reconnaissable est REFUSÉ plutôt que rangé au hasard (un binaire arm64 servi à un Mac Intel
 * casserait l'installation).
 */
export function classifyArtifact(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith(".sig")) return null;
  if (n.endsWith(".app.tar.gz")) {
    // Pas de clé `darwin-*-app` (AR-3) : `installeur` reste `null`, le générique suffit.
    if (/aarch64|arm64/.test(n)) return { generique: "darwin-aarch64", installeur: null };
    if (/x64|x86_64|amd64|intel/.test(n)) return { generique: "darwin-x86_64", installeur: null };
    return null;
  }
  if (n.endsWith(".appimage")) {
    return { generique: "linux-x86_64", installeur: "linux-x86_64-appimage" };
  }
  if (n.endsWith(".deb")) return { generique: "linux-x86_64", installeur: "linux-x86_64-deb" };
  if (n.endsWith(".rpm")) return { generique: "linux-x86_64", installeur: "linux-x86_64-rpm" };
  if (n.endsWith("-setup.exe")) {
    return { generique: "windows-x86_64", installeur: "windows-x86_64-nsis" };
  }
  if (n.endsWith(".msi")) return { generique: "windows-x86_64", installeur: "windows-x86_64-msi" };
  return null;
}

/**
 * Rang de préférence pour la clé GÉNÉRIQUE de la plateforme.
 *
 * Un rang > 0 signifie « cet artefact a le droit de PORTER la clé générique ». C'est ce qui fige
 * le statu quo : Windows générique = NSIS (cohérent avec `"windows": { "installMode": "passive" }`),
 * Linux générique = AppImage, macOS = son unique bundle updater. Le `.msi`, le `.deb` et le `.rpm`
 * rendent 0 : ils obtiennent leur clé d'INSTALLEUR, jamais la générique — sans quoi une release
 * privée d'AppImage servirait un `.deb` à tous les clients Linux, qui le refuseraient.
 *
 * À rang égal sur une même clé, le premier arrivé reste (stabilité, indépendante de l'ordre
 * — arbitraire — dans lequel l'API renvoie les assets).
 */
export function artifactRank(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith("-setup.exe")) return 1;
  if (n.endsWith(".appimage")) return 1;
  if (n.endsWith(".app.tar.gz")) return 1;
  return 0;
}

/**
 * Construit le manifeste attendu par le plugin `updater`.
 *
 * `entries` = `[{ name, signature }]` — `signature` est le CONTENU du `.sig`, jamais un chemin.
 * `baseUrl` sert à produire des URL ABSOLUES (le manifeste est lu depuis un autre chemin que les
 * binaires : une URL relative ne résoudrait pas).
 *
 * Un artefact SANS signature ne produit AUCUNE clé — ni générique, ni d'installeur — et est
 * remonté dans `nonSignes` : le client refuse une charge non signée, l'annoncer déplacerait
 * l'échec du téléchargement vers l'installation.
 *
 * Une clé sans artefact est OMISE et remontée dans `missing` — jamais écrite avec une URL fantôme.
 */
export function buildManifest({ version, notes, pubDate, entries, baseUrl }) {
  const platforms = {};
  const ignored = [];
  const duplicates = [];
  const nonSignes = [];
  const base = String(baseUrl).replace(/\/$/, "");

  const poser = (cle, candidat) => {
    const tenant = platforms[cle];
    if (!tenant) {
      platforms[cle] = candidat;
      return;
    }
    if (candidat.rank > tenant.rank) {
      duplicates.push(tenant.name);
      platforms[cle] = candidat;
    } else {
      duplicates.push(candidat.name);
    }
  };

  for (const entry of entries ?? []) {
    const cls = classifyArtifact(entry.name);
    if (!cls) {
      ignored.push(entry.name);
      continue;
    }
    if (!entry.signature) {
      nonSignes.push(entry.name);
      ignored.push(entry.name);
      continue;
    }
    const candidat = {
      signature: entry.signature,
      url: `${base}/${entry.name}`,
      rank: artifactRank(entry.name),
      name: entry.name,
    };
    // La clé d'INSTALLEUR — ce que le plugin cherche EN PREMIER.
    if (cls.installeur) poser(cls.installeur, candidat);
    // La clé GÉNÉRIQUE — le repli, réservé au porteur historique de la plateforme.
    if (candidat.rank > 0) poser(cls.generique, candidat);
  }

  // Ordre stable des clés (un diff git du feed reste lisible) + projection au format du plugin
  // (le rang et le nom sont des données de travail, ils n'ont rien à faire dans le manifeste).
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
  return { manifest, missing, ignored, duplicates, nonSignes };
}
