// update-manifest.test.mjs — cœur pur de la chaîne de publication (L34, § 6b).
//
// Sur un jeu d'artefacts FACTICES : aucune release, aucun réseau, aucun jeton.
// Ce qui est vérifié ici est précisément ce qu'on ne peut PAS vérifier au moment
// d'une vraie publication sans casser quelque chose — d'où l'extraction du cœur
// pur hors du script exécutable.
import { describe, it, expect } from "vitest";
import {
  buildManifest,
  checkVersionAlignment,
  cargoVersion,
  classifyArtifact,
  UPDATER_PLATFORMS,
} from "../lib/update-manifest.mjs";

const BASE = "http://192.168.2.11:3001/sjupin/iakacockpit/releases/download/v0.31.3";

/** Jeu complet : les 4 plateformes, chacune avec sa signature. */
const FULL = [
  { name: "IakaCockpit_aarch64.app.tar.gz", signature: "SIG-MAC-ARM" },
  { name: "IakaCockpit_x64.app.tar.gz", signature: "SIG-MAC-X64" },
  { name: "iaka-cockpit_0.31.3_amd64.AppImage", signature: "SIG-LINUX" },
  { name: "IakaCockpit_0.31.3_x64-setup.exe", signature: "SIG-WIN" },
];

describe("buildManifest — format attendu par le plugin updater", () => {
  it("porte les 4 plateformes, dans l'ordre, avec des URL ABSOLUES", () => {
    const { manifest, missing } = buildManifest({
      version: "v0.31.3",
      notes: "IakaCockpit 0.31.3",
      pubDate: "2026-08-06T10:00:00Z",
      entries: FULL,
      baseUrl: BASE,
    });

    expect(Object.keys(manifest.platforms)).toEqual(UPDATER_PLATFORMS);
    expect(missing).toEqual([]);
    // `version` SANS le « v » du tag : le plugin compare à la version du bundle.
    expect(manifest.version).toBe("0.31.3");
    expect(manifest.pub_date).toBe("2026-08-06T10:00:00Z");
    for (const p of UPDATER_PLATFORMS) {
      expect(manifest.platforms[p].url.startsWith("http://")).toBe(true);
      expect(manifest.platforms[p].url.startsWith(BASE)).toBe(true);
    }
    // `signature` = le CONTENU du .sig, pas son chemin.
    expect(manifest.platforms["darwin-aarch64"].signature).toBe("SIG-MAC-ARM");
    expect(manifest.platforms["windows-x86_64"].url).toBe(
      `${BASE}/IakaCockpit_0.31.3_x64-setup.exe`,
    );
  });

  it("OMET proprement une plateforme manquante — jamais d'URL fantôme", () => {
    const { manifest, missing } = buildManifest({
      version: "v0.31.3",
      pubDate: "2026-08-06T10:00:00Z",
      entries: FULL.filter((e) => !e.name.endsWith(".AppImage")),
      baseUrl: BASE,
    });
    expect(missing).toEqual(["linux-x86_64"]);
    expect(manifest.platforms["linux-x86_64"]).toBeUndefined();
    expect(Object.keys(manifest.platforms)).toHaveLength(3);
    // Le manifeste reste valide pour les autres : une plateforme absente n'empêche
    // pas les trois autres de se mettre à jour.
    expect(manifest.platforms["darwin-x86_64"].url).toContain("IakaCockpit_x64");
  });

  it("écarte un artefact SANS signature (jamais publié non signé)", () => {
    const { manifest, ignored, missing } = buildManifest({
      version: "v0.31.3",
      pubDate: "2026-08-06T10:00:00Z",
      entries: [{ name: "IakaCockpit_aarch64.app.tar.gz", signature: "" }],
      baseUrl: BASE,
    });
    expect(ignored).toEqual(["IakaCockpit_aarch64.app.tar.gz"]);
    expect(manifest.platforms).toEqual({});
    expect(missing).toEqual(UPDATER_PLATFORMS);
  });

  it("ignore ce qui n'est pas une cible de mise à jour (.deb/.rpm/.dmg)", () => {
    const { manifest, ignored } = buildManifest({
      version: "v0.31.3",
      pubDate: "2026-08-06T10:00:00Z",
      entries: [
        ...FULL,
        { name: "iaka-cockpit_0.31.3_amd64.deb", signature: "X" },
        { name: "iaka-cockpit-0.31.3-1.x86_64.rpm", signature: "X" },
        { name: "IakaCockpit_0.31.3_aarch64.dmg", signature: "X" },
      ],
      baseUrl: BASE,
    });
    expect(ignored).toEqual([
      "iaka-cockpit_0.31.3_amd64.deb",
      "iaka-cockpit-0.31.3-1.x86_64.rpm",
      "IakaCockpit_0.31.3_aarch64.dmg",
    ]);
    expect(Object.keys(manifest.platforms)).toEqual(UPDATER_PLATFORMS);
  });
});

describe("classifyArtifact — aucune supposition d'architecture", () => {
  it("refuse un .app.tar.gz dont le nom ne porte pas d'architecture", () => {
    // Servir un bundle arm64 à un Mac Intel casserait l'installation : on préfère
    // ne rien publier plutôt que ranger au hasard.
    expect(classifyArtifact("IakaCockpit.app.tar.gz")).toBeNull();
    expect(classifyArtifact("IakaCockpit_aarch64.app.tar.gz")).toBe("darwin-aarch64");
    expect(classifyArtifact("IakaCockpit_x64.app.tar.gz")).toBe("darwin-x86_64");
  });

  it("ne prend jamais un .sig pour un artefact", () => {
    expect(classifyArtifact("IakaCockpit_aarch64.app.tar.gz.sig")).toBeNull();
    expect(classifyArtifact("iaka-cockpit_0.31.3_amd64.AppImage.sig")).toBeNull();
  });
});

describe("checkVersionAlignment — garde du § 6b.1 (critère C7)", () => {
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
