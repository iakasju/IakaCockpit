/**
 * Garde de non-dérive du miroir d'endpoints (L34).
 *
 * `src/app/updateEndpoints.ts` DUPLIQUE, pour l'affichage, une donnée dont la
 * source de vérité est `src-tauri/tauri.conf.json` (le plugin `updater` n'expose
 * pas à la webview l'URL qu'il interroge : l'appel part du backend Rust). Une
 * duplication non gardée finit toujours par mentir — les Réglages annonceraient
 * alors un flux différent de celui réellement interrogé. Ce test importe la
 * config elle-même et échoue à la première divergence.
 *
 * L'import JSON (plutôt qu'une lecture `fs`) évite d'introduire `@types/node`
 * dans un projet front qui s'en passe aujourd'hui.
 */
import { describe, it, expect } from "vitest";
import tauriConf from "../../src-tauri/tauri.conf.json";
import { UPDATE_ENDPOINTS, primaryUpdateEndpoint } from "../app/updateEndpoints";

describe("L34 — endpoints de mise à jour", () => {
  it("le miroir front est EXACTEMENT la liste de tauri.conf.json, dans le même ordre", () => {
    const configured = tauriConf.plugins?.updater?.endpoints;
    expect(configured).toBeTruthy();
    expect([...UPDATE_ENDPOINTS]).toEqual(configured);
  });

  it("l'endpoint affiché est le premier de la liste (celui qui gagne)", () => {
    expect(primaryUpdateEndpoint()).toBe(UPDATE_ENDPOINTS[0]);
  });

  it("la config déclare une clé publique : rien ne s'installe sans vérification", () => {
    expect((tauriConf.plugins?.updater?.pubkey ?? "").length).toBeGreaterThan(0);
  });

  it("les artefacts updater sont produits au bundle (sinon aucune version à publier)", () => {
    expect(tauriConf.bundle?.createUpdaterArtifacts).toBe(true);
  });
});
