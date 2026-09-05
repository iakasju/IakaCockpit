// update-manifest.test.mjs — cœur pur de la chaîne de publication (L34, § 6b ; L40 § 3).
//
// Sur un jeu d'artefacts FACTICES : aucune release, aucun réseau, aucun jeton.
// Ce qui est vérifié ici est précisément ce qu'on ne peut PAS vérifier au moment
// d'une vraie publication sans casser quelque chose — d'où l'extraction du cœur
// pur hors du script exécutable.
//
// L40 — LES CLÉS D'INSTALLEUR. Le plugin cherche `{os}-{arch}-{installer}` PUIS `{os}-{arch}`
// (`get_urls`, tauri-plugin-updater 2.10.1). N'émettre que la seconde faisait qu'un client
// installé par MSI recevait l'exe NSIS et s'installait À CÔTÉ de son enregistrement MSI, et
// qu'un client `.deb`/`.rpm` recevait une AppImage et échouait en `InvalidUpdaterFormat`.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildManifest,
  checkVersionAlignment,
  cargoVersion,
  classifyArtifact,
  artifactRank,
  versionPluginUpdater,
  UPDATER_PLATFORMS,
  VERSION_PLUGIN_UPDATER_VERIFIEE,
} from "../lib/update-manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = "https://github.com/iakasju/IakaCockpit/releases/download/v0.31.3";
const PRODUIT = "IakaCockpit";
const VERSION = "0.31.3";

/**
 * LA TABLE DE CONFORMITÉ (AR-6 = O2) — `fixtures/updater-cles.json`, BYTE-IDENTIQUE dans les deux
 * dépôts. Les deux générateurs sont distincts ; c'est cette table, consommée par le test unitaire
 * de chacun, qui les empêche de diverger en silence.
 */
const TABLE = JSON.parse(readFileSync(resolve(ROOT, "fixtures/updater-cles.json"), "utf8"));
const nomReel = (gabarit) =>
  gabarit.replaceAll("{PRODUIT}", PRODUIT).replaceAll("{VERSION}", VERSION);

/** Le jeu COMPLET d'artefacts de la table, chacun signé. */
const TOUS = TABLE.artefacts.map((a) => ({ name: nomReel(a.nom), signature: `SIG-${a.nom}` }));

/** Le sous-ensemble « une plateforme, un artefact » d'avant les clés d'installeur. */
const FULL = [
  { name: "IakaCockpit_aarch64.app.tar.gz", signature: "SIG-MAC-ARM" },
  { name: "IakaCockpit_x64.app.tar.gz", signature: "SIG-MAC-X64" },
  { name: "iaka-cockpit_0.31.3_amd64.AppImage", signature: "SIG-LINUX" },
  { name: "IakaCockpit_0.31.3_x64-setup.exe", signature: "SIG-WIN" },
];

const construit = (entries, extra = {}) =>
  buildManifest({
    version: "v0.31.3",
    pubDate: "2026-08-06T10:00:00Z",
    entries,
    baseUrl: BASE,
    ...extra,
  });

describe("CA-1/CA-2 — les clés d'installeur, dérivées de la table de conformité", () => {
  it("CA-1 — émet la clé d'installeur de CHAQUE artefact et CONSERVE la générique", () => {
    const { manifest, missing } = construit(TOUS);
    // Le test NOMME l'ensemble attendu ; il ne compte pas les clés.
    expect(Object.keys(manifest.platforms)).toEqual(TABLE.clesAttenduesOrdonnees);
    expect(missing).toEqual([]);
    // Chaque clé d'installeur désigne bien SON artefact.
    for (const a of TABLE.artefacts) {
      if (!a.installeur) continue;
      expect(manifest.platforms[a.installeur].url).toBe(`${BASE}/${nomReel(a.nom)}`);
    }
  });

  it("CA-1 — l'ordre d'écriture est stable et suit UPDATER_PLATFORMS", () => {
    const { manifest } = construit(TOUS);
    expect(Object.keys(manifest.platforms)).toEqual(UPDATER_PLATFORMS);
    expect(TABLE.clesAttenduesOrdonnees).toEqual(UPDATER_PLATFORMS);
  });

  it("CA-2 — `windows-x86_64` désigne le NSIS et `linux-x86_64` l'AppImage (VALEUR, pas présence)", () => {
    const { manifest } = construit(TOUS);
    expect(manifest.platforms["windows-x86_64"].url).toBe(
      `${BASE}/${PRODUIT}_${VERSION}_x64-setup.exe`,
    );
    expect(manifest.platforms["linux-x86_64"].url).toBe(
      `${BASE}/${PRODUIT}_${VERSION}_amd64.AppImage`,
    );
    // Et la clé générique porte EXACTEMENT la même chose que la clé d'installeur du porteur :
    // aucun client existant ne change de comportement du seul fait de ce lot.
    expect(manifest.platforms["windows-x86_64"]).toEqual(manifest.platforms["windows-x86_64-nsis"]);
    expect(manifest.platforms["linux-x86_64"]).toEqual(manifest.platforms["linux-x86_64-appimage"]);
  });

  it("CA-2 — un `.deb` seul ne prend JAMAIS la clé générique Linux", () => {
    // Sans cette règle, une release privée d'AppImage servirait un `.deb` à tous les clients
    // Linux — qui le refuseraient. Mieux vaut aucune clé générique qu'une charge inutilisable.
    const { manifest } = construit([
      { name: `${PRODUIT}_${VERSION}_amd64.deb`, signature: "SIG-DEB" },
      { name: `${PRODUIT}-${VERSION}-1.x86_64.rpm`, signature: "SIG-RPM" },
    ]);
    expect(Object.keys(manifest.platforms)).toEqual(["linux-x86_64-deb", "linux-x86_64-rpm"]);
    expect(manifest.platforms["linux-x86_64"]).toBeUndefined();
  });

  it("AR-3 — AUCUNE clé `darwin-*-app` n'est émise", () => {
    const { manifest } = construit(TOUS);
    for (const cle of Object.keys(manifest.platforms)) {
      expect(cle.endsWith("-app")).toBe(false);
    }
    expect(UPDATER_PLATFORMS.some((p) => p.endsWith("-app"))).toBe(false);
  });
});

describe("CA-3 — un artefact sans signature ne produit AUCUNE clé, et il est signalé", () => {
  it("ni générique ni d'installeur, et remonté dans `nonSignes`", () => {
    const sansSig = TOUS.map((e) =>
      e.name.endsWith(".msi") || e.name.endsWith("-setup.exe") ? { ...e, signature: "" } : e,
    );
    const { manifest, nonSignes, ignored } = construit(sansSig);
    expect(manifest.platforms["windows-x86_64"]).toBeUndefined();
    expect(manifest.platforms["windows-x86_64-nsis"]).toBeUndefined();
    expect(manifest.platforms["windows-x86_64-msi"]).toBeUndefined();
    expect(nonSignes.sort()).toEqual(
      [`${PRODUIT}_${VERSION}_x64-setup.exe`, `${PRODUIT}_${VERSION}_x64_en-US.msi`].sort(),
    );
    for (const n of nonSignes) expect(ignored).toContain(n);
  });

  it("le cas dégénéré : rien de signé, manifeste vide, toutes les clés manquantes", () => {
    const { manifest, ignored, missing } = construit([
      { name: "IakaCockpit_aarch64.app.tar.gz", signature: "" },
    ]);
    expect(ignored).toEqual(["IakaCockpit_aarch64.app.tar.gz"]);
    expect(manifest.platforms).toEqual({});
    expect(missing).toEqual(UPDATER_PLATFORMS);
  });
});

describe("buildManifest — format attendu par le plugin updater", () => {
  it("URL ABSOLUES, version sans le « v », date reprise telle quelle", () => {
    const { manifest } = construit(FULL, { notes: "IakaCockpit 0.31.3" });
    expect(manifest.version).toBe("0.31.3");
    expect(manifest.pub_date).toBe("2026-08-06T10:00:00Z");
    for (const p of Object.keys(manifest.platforms)) {
      expect(manifest.platforms[p].url.startsWith(`${BASE}/`)).toBe(true);
    }
    // `signature` = le CONTENU du .sig, pas son chemin.
    expect(manifest.platforms["darwin-aarch64"].signature).toBe("SIG-MAC-ARM");
  });

  it("OMET proprement une plateforme manquante — jamais d'URL fantôme", () => {
    const { manifest, missing } = construit(FULL.filter((e) => !e.name.endsWith(".AppImage")));
    expect(missing).toContain("linux-x86_64");
    expect(missing).toContain("linux-x86_64-appimage");
    expect(manifest.platforms["linux-x86_64"]).toBeUndefined();
    // Le manifeste reste valide pour les autres : une plateforme absente n'empêche
    // pas les autres de se mettre à jour.
    expect(manifest.platforms["darwin-x86_64"].url).toContain("IakaCockpit_x64");
  });

  it("ignore ce qui n'est PAS une cible de mise à jour (.dmg, bundle sans architecture)", () => {
    const { ignored } = construit(TOUS);
    expect(ignored.sort()).toEqual(
      TABLE.artefacts
        .filter((a) => a.generique === null)
        .map((a) => nomReel(a.nom))
        .sort(),
    );
  });

  it("ne laisse fuiter aucune donnée de travail dans le manifeste publié", () => {
    const { manifest } = construit(TOUS);
    for (const p of Object.keys(manifest.platforms)) {
      expect(Object.keys(manifest.platforms[p]).sort()).toEqual(["signature", "url"]);
    }
  });
});

describe("buildManifest — arbitrage déterministe de la clé GÉNÉRIQUE", () => {
  // Une release Windows porte NSIS *et* MSI. Chacun a désormais SA clé d'installeur ; ce qui
  // reste à arbitrer est la clé GÉNÉRIQUE, et le gagnant ne doit pas dépendre de l'ordre —
  // arbitraire — dans lequel l'API renvoie les assets.
  const nsis = { name: "IakaCockpit_0.31.3_x64-setup.exe", signature: "SIG-NSIS" };
  const msi = { name: "IakaCockpit_0.31.3_x64_en-US.msi", signature: "SIG-MSI" };

  for (const [label, entries] of [
    ["NSIS d'abord", [nsis, msi]],
    ["MSI d'abord", [msi, nsis]],
  ]) {
    it(`la générique reste NSIS quel que soit l'ordre (${label}), et le MSI garde SA clé`, () => {
      const { manifest, duplicates } = construit(entries);
      expect(manifest.platforms["windows-x86_64"].signature).toBe("SIG-NSIS");
      expect(manifest.platforms["windows-x86_64-nsis"].signature).toBe("SIG-NSIS");
      expect(manifest.platforms["windows-x86_64-msi"].signature).toBe("SIG-MSI");
      // Plus de doublon : le MSI n'est plus un perdant, il a sa propre clé.
      expect(duplicates).toEqual([]);
    });
  }

  it("deux artefacts pour la MÊME clé d'installeur : le premier reste, le second est signalé", () => {
    const { manifest, duplicates } = construit([
      { name: "IakaCockpit_0.31.3_amd64.deb", signature: "SIG-A" },
      { name: "IakaCockpit_0.31.3_autre_amd64.deb", signature: "SIG-B" },
    ]);
    expect(manifest.platforms["linux-x86_64-deb"].signature).toBe("SIG-A");
    expect(duplicates).toEqual(["IakaCockpit_0.31.3_autre_amd64.deb"]);
  });
});

describe("classifyArtifact — le COUPLE générique/installeur, sans supposition d'architecture", () => {
  it("chaque nom de la table est classé exactement comme la table le dit", () => {
    for (const a of TABLE.artefacts) {
      const c = classifyArtifact(nomReel(a.nom));
      if (a.generique === null) {
        expect(c, `${a.nom} devrait etre hors perimetre`).toBeNull();
        continue;
      }
      expect(c, `${a.nom} devrait etre classe`).not.toBeNull();
      expect(c.generique, `${a.nom} : generique`).toBe(a.generique);
      expect(c.installeur, `${a.nom} : installeur`).toBe(a.installeur);
      expect(artifactRank(nomReel(a.nom)) > 0, `${a.nom} : porte le generique ?`).toBe(
        a.porteLeGenerique,
      );
    }
  });

  it("refuse un .app.tar.gz dont le nom ne porte pas d'architecture", () => {
    // Cas MESURÉ sur ce poste : un build local produit exactement ce nom-là
    // (c'est `tauri-action` qui injecte l'architecture à l'upload). Servir un
    // bundle arm64 à un Mac Intel casserait l'installation : on préfère ne rien
    // publier plutôt que ranger au hasard.
    expect(classifyArtifact("IakaCockpit.app.tar.gz")).toBeNull();
    expect(classifyArtifact("IakaCockpit_aarch64.app.tar.gz")).toEqual({
      generique: "darwin-aarch64",
      installeur: null,
    });
    expect(classifyArtifact("IakaCockpit_x64.app.tar.gz")).toEqual({
      generique: "darwin-x86_64",
      installeur: null,
    });
  });

  it("ne prend jamais un .sig pour un artefact", () => {
    expect(classifyArtifact("IakaCockpit_aarch64.app.tar.gz.sig")).toBeNull();
    expect(classifyArtifact("iaka-cockpit_0.31.3_amd64.AppImage.sig")).toBeNull();
  });
});

describe("CA-15 — cliquet sur la version du plugin updater", () => {
  // La convention de clés `{os}-{arch}-{installer}` n'est PAS documentée : elle n'existe que dans
  // la SOURCE de la version verrouillée. `Cargo.toml` déclarant `tauri-plugin-updater = "2"`, un
  // `cargo update` peut la faire changer sans un mot. Cette garde le dit.
  const lock = readFileSync(resolve(ROOT, "src-tauri/Cargo.lock"), "utf8");

  it("la version VERROUILLÉE est celle contre laquelle la convention a été vérifiée", () => {
    expect(
      versionPluginUpdater(lock),
      "tauri-plugin-updater a change de version : RE-VERIFIER `get_urls` EN AMONT " +
        "(essaie-t-il toujours {os}-{arch}-{installer} puis {os}-{arch} ? Installer::name() " +
        "rend-il toujours appimage/deb/rpm/app/msi/nsis ?) AVANT de lever cette garde, puis " +
        "mettre a jour VERSION_PLUGIN_UPDATER_VERIFIEE et fixtures/updater-cles.json.",
    ).toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
    expect(TABLE.conventionVerifieeContre.version).toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
  });

  it("CONTREFACTUEL — une fixture qui monte la version fait tomber la garde", () => {
    // Sur une FIXTURE, jamais sur `Cargo.lock`.
    const fixture = lock.replace(
      /(name = "tauri-plugin-updater"\nversion = ")[^"]+/,
      `$12.11.0`,
    );
    expect(fixture).not.toBe(lock);
    expect(versionPluginUpdater(fixture)).toBe("2.11.0");
    expect(versionPluginUpdater(fixture)).not.toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
  });

  it("ne prend pas la version d'un AUTRE paquet pour celle du plugin", () => {
    const piege = [
      "[[package]]",
      'name = "tauri-plugin-process"',
      'version = "9.9.9"',
      "",
      "[[package]]",
      'name = "tauri-plugin-updater"',
      'version = "2.10.1"',
      "",
    ].join("\n");
    expect(versionPluginUpdater(piege)).toBe("2.10.1");
    expect(versionPluginUpdater('[[package]]\nname = "serde"\nversion = "1"\n')).toBeNull();
  });
});

describe("checkVersionAlignment — garde du § 6b.1 (critère C7)", () => {
  // RÉCIDIVE (2026-09-05, revue de version v0.33.0) — `package-lock.json` est le CINQUIÈME porteur.
  // Il a dérivé DEUX FOIS avant d'être gardé : corrigé à la main au bump v0.31.2 (`e8b3e91`) sans
  // que la garde soit étendue, il a re-dérivé au bump v0.33.0 et c'est le gate qui l'a trouvé, pas
  // la chaîne. Ces deux tests éprouvent les DEUX SENS : fourni et désaligné, il est NOMMÉ ; fourni
  // et aligné, il entre dans les sources. Le troisième éprouve le contrat d'omission, identique à
  // celui de `readme` : non fourni n'est PAS aligné, la source est ABSENTE plutôt qu'inventée —
  // c'est le cliquet d'omission de `publish-update.mjs` qui interdit de l'omettre en publication.
  it("package-lock.json désaligné est NOMMÉ dans les écarts", () => {
    const r = checkVersionAlignment({
      tag: "v1.2.3",
      packageJson: { version: "1.2.3" },
      tauriConf: { version: "1.2.3" },
      cargoToml: '[package]\nname = "iakacockpit"\nversion = "1.2.3"\n',
      packageLock: { version: "1.2.2" },
    });
    expect(r.ok).toBe(false);
    expect(r.mismatches.map((m) => m.source)).toContain("package-lock.json");
    expect(r.mismatches.find((m) => m.source === "package-lock.json").found).toBe("1.2.2");
  });

  it("package-lock.json aligné entre dans les sources", () => {
    const r = checkVersionAlignment({
      tag: "v1.2.3",
      packageJson: { version: "1.2.3" },
      tauriConf: { version: "1.2.3" },
      cargoToml: '[package]\nname = "iakacockpit"\nversion = "1.2.3"\n',
      packageLock: { version: "1.2.3" },
    });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.sources)).toContain("package-lock.json");
  });

  it("package-lock.json NON fourni est ABSENT des sources, jamais inventé aligné", () => {
    const r = checkVersionAlignment({
      tag: "v1.2.3",
      packageJson: { version: "1.2.3" },
      tauriConf: { version: "1.2.3" },
      cargoToml: '[package]\nname = "iakacockpit"\nversion = "1.2.3"\n',
    });
    expect(Object.keys(r.sources)).not.toContain("package-lock.json");
  });

  const cargoOk = '[package]\nname = "iakacockpit"\nversion = "0.31.3"\n';

  it("passe quand les quatre sources portent la même version", () => {
    const r = checkVersionAlignment({
      tag: "v0.31.3",
      packageJson: { version: "0.31.3" },
      tauriConf: { version: "0.31.3" },
      cargoToml: cargoOk,
    });
    expect(r.ok).toBe(true);
    expect(r.version).toBe("0.31.3");
    expect(r.mismatches).toEqual([]);
  });

  it("ÉCHOUE explicitement en nommant la source désalignée", () => {
    const r = checkVersionAlignment({
      tag: "v0.31.3",
      packageJson: { version: "0.31.2" },
      tauriConf: { version: "0.31.3" },
      cargoToml: cargoOk,
    });
    expect(r.ok).toBe(false);
    expect(r.mismatches).toEqual([
      { source: "package.json", found: "0.31.2", expected: "0.31.3" },
    ]);
  });

  it("ne prend PAS la version d'une dépendance pour celle du paquet", () => {
    const piege = [
      "[package]",
      'name = "iakacockpit"',
      'version = "0.31.3"',
      "",
      "[dependencies]",
      'tauri = { version = "2.11.2" }',
      'serde = "1"',
    ].join("\n");
    expect(cargoVersion(piege)).toBe("0.31.3");
  });

  it("signale une version de paquet absente plutôt que de l'inventer", () => {
    expect(cargoVersion('[dependencies]\nversion = "9.9.9"\n')).toBeNull();
  });
});
