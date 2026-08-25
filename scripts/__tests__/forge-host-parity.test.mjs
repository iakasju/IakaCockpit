// Parité de l'hôte de forge — garde de non-dérive du CANAL de distribution.
//
// Défaut réparé (lot 0) : l'adresse de la forge était déclarée à QUATRE endroits, en
// duplication non gardée. Toute l'infra du portefeuille a migré vers le NAS ; ces quatre-là
// étaient restés sur l'ancienne iakabox, qui ne répond plus du tout (sondé le 2026-08-25).
// Conséquence : le contrôle de mise à jour ne pouvait pas aboutir, et `publish-update` ne
// pouvait ni créer une release ni produire un manifeste téléchargeable.
//
// Ce test ne fige PAS une adresse — elle peut légitimement changer, et un flux HTTPS public
// se PRÉFIXERA un jour à la liste. Il exige que les déclarations soient COHÉRENTES entre
// elles : c'est la divergence qui est le défaut, pas la valeur.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const hostOf = (url) => new URL(url).host;

/** Hôte de l'endpoint qui GAGNE (le premier de la liste), source de vérité. */
function hostFromTauriConf() {
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const eps = conf.plugins?.updater?.endpoints ?? [];
  expect(eps.length).toBeGreaterThan(0);
  return hostOf(eps[0]);
}
function hostFromFrontMirror() {
  const m = read("src/app/updateEndpoints.ts").match(/"(https?:\/\/[^"]+)"/);
  expect(m).toBeTruthy();
  return hostOf(m[1]);
}
function hostFromPublishScript() {
  // Ligne EFFECTIVE seulement : un commentaire peut citer l'ancienne adresse pour l'expliquer.
  const m = read("scripts/publish-update.mjs").match(/^const FORGEJO_BASE = "([^"]+)";/m);
  expect(m).toBeTruthy();
  return hostOf(m[1]);
}
function hostFromManifest() {
  const man = JSON.parse(read("updater/latest.json"));
  const first = Object.values(man.platforms ?? {})[0];
  expect(first?.url).toBeTruthy();
  return hostOf(first.url);
}

describe("lot 0 — cohérence de l'hôte de forge", () => {
  it("endpoint, miroir front, script de publication et manifeste désignent le même hôte", () => {
    const conf = hostFromTauriConf();
    expect(hostFromFrontMirror(), "miroir front ≠ tauri.conf.json").toBe(conf);
    expect(hostFromPublishScript(), "publish-update.mjs ≠ tauri.conf.json").toBe(conf);
    expect(hostFromManifest(), "updater/latest.json ≠ tauri.conf.json").toBe(conf);
  });

  it("l'hôte n'est plus l'ancienne iakabox hors service", () => {
    // Constat du 2026-08-25 : 192.168.2.11 ne rend plus aucune réponse HTTP. La garder
    // comme cible, c'est promettre une mise à jour qui ne peut pas aboutir.
    expect(hostFromTauriConf()).not.toBe("192.168.2.11:3001");
  });
});
