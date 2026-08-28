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

  it("la liste porte au moins DEUX hôtes distincts : sans quoi il n'y a rien à basculer", () => {
    // CA-11 : « une app dont le premier endpoint est mort voit quand même la mise à jour ». Une
    // liste d'un seul hôte (ou d'un hôte répété) ne bascule sur rien — elle réessaie la panne.
    // Défaut réparé : au gate du 2026-08-28, la liste comptait trois URL et UN SEUL hôte
    // anonymement résolvable ; les deux replis rendaient 404 (dépôt privé) et 000 (machine
    // éteinte). La redondance était déclarée, pas acquise.
    //
    // ⚠️ Ce que ce test NE prouve PAS : que ces hôtes répondent. Une configuration ne se mesure
    // pas elle-même. La mesure est un geste réseau : `iakaframe endpoints --app .`
    const hosts = UPDATE_ENDPOINTS.map((u) => new URL(u).host);
    expect(new Set(hosts).size, `endpoints en doublon : ${hosts.join(", ")}`).toBe(hosts.length);
    expect(new Set(hosts).size, "un seul hôte : aucune redondance").toBeGreaterThanOrEqual(2);
  });

  it("la config déclare une clé publique : rien ne s'installe sans vérification", () => {
    expect((tauriConf.plugins?.updater?.pubkey ?? "").length).toBeGreaterThan(0);
  });

  it("les artefacts updater sont produits au bundle (sinon aucune version à publier)", () => {
    expect(tauriConf.bundle?.createUpdaterArtifacts).toBe(true);
  });
});
