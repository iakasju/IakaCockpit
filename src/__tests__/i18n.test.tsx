import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import i18n, { parseLang, DEFAULT_LANG } from "../i18n";
import { Roster } from "../components/Roster";
import { fr } from "../i18n/locales/fr";
import { en } from "../i18n/locales/en";

/**
 * Vérifie l'infra i18n : FR par défaut, bascule EN effective, parité des clés
 * fr/en (aucune clé manquante d'un côté). Le setup global initialise i18n en FR ;
 * on bascule EN le temps d'un test puis on restaure (isolation des autres suites).
 */
describe("i18n — moteur FR/EN", () => {
  it("FR est la langue par défaut", () => {
    expect(DEFAULT_LANG).toBe("fr");
    expect(parseLang(undefined)).toBe("fr");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("xx")).toBe("fr");
  });

  it("parité des clés : fr et en ont exactement le même arbre", () => {
    const flatten = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" && v !== null
          ? flatten(v as object, `${p}${k}.`)
          : [`${p}${k}`],
      );
    expect(flatten(en).sort()).toEqual(flatten(fr).sort());
  });
});

describe("i18n — rendu EN", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });
  afterAll(async () => {
    await i18n.changeLanguage("fr");
    cleanup();
  });

  it("le roster rend les libellés EN (statut + rôle traduits)", () => {
    render(<Roster currentAgent="Aragorn" pending={false} onPick={() => {}} />);
    // Statut « idle » (EN) au lieu de « attend » (FR).
    expect(screen.getAllByText("idle").length).toBeGreaterThan(0);
    expect(screen.queryByText("attend")).toBeNull();
    // Rôle « Build » (EN) pour Gimli (fabrication) au lieu de « Fabrication ».
    expect(screen.getByText("Build")).toBeTruthy();
  });
});
