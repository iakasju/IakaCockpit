import { describe, it, expect } from "vitest";
import { CHARTES } from "../assets/chartes/manifest";
// CSS embarqué généré, lu via le bundler (?inline → string) — fidèle au build,
// servi en 'self', aucun builtin node requis. (vitest.config : css.include ne
// traite QUE chartes.css pour le rendre lisible ici.)
import chartesCss from "../assets/chartes/chartes.css?inline";

// Les 10 chartes iakagraph attendues (ids data-theme, ordre du catalogue).
const EXPECTED_IDS = [
  "naonedge-dark",
  "naonedge-light",
  "grimoire-dark-fantasy",
  "os-windows",
  "os-ubuntu",
  "os-android",
  "os-macos",
  "cartoon-std",
  "photoreal-modern",
  "studio-clair",
];

describe("Chartes iakagraph — manifest embarqué (L14)", () => {
  it("catalogue les 10 chartes, dans l'ordre", () => {
    expect(CHARTES.map((c) => c.id)).toEqual(EXPECTED_IDS);
  });

  it("chaque charte porte un id, un nom et 3 swatches hex/rgb", () => {
    for (const c of CHARTES) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.swatches).toHaveLength(3);
      for (const sw of c.swatches) expect(sw).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it("garde naonedge-dark/light en tête (compat ascendante)", () => {
    expect(CHARTES[0].id).toBe("naonedge-dark");
    expect(CHARTES[1].id).toBe("naonedge-light");
  });
});

describe("Chartes iakagraph — CSS embarqué (L14)", () => {
  it("contient un bloc data-theme par charte NON-naonedge (pont vers le contrat app)", () => {
    for (const id of EXPECTED_IDS) {
      if (id.startsWith("naonedge")) continue; // hand-written dans tokens.css
      expect(chartesCss).toContain(`html[data-theme="${id}"]`);
    }
  });

  it("chaque bloc traduit le contrat de l'app (--bg/--surf/--accent/--text)", () => {
    // Vérifie sur une charte témoin que le PONT a bien produit les variables app.
    const block = chartesCss.slice(
      chartesCss.indexOf('html[data-theme="os-windows"]'),
    );
    for (const v of ["--bg:", "--surf:", "--accent:", "--text:", "--on-accent:"]) {
      expect(block).toContain(v);
    }
  });

  it("ne régénère PAS naonedge (laissé hand-written dans tokens.css)", () => {
    expect(chartesCss).not.toContain('html[data-theme="naonedge-dark"]');
    expect(chartesCss).not.toContain('html[data-theme="naonedge-light"]');
  });
});
