// canaux-en-ligne.test.mjs — la garde de la face en ligne des CANAUX (jumelle de
// `vitrine-en-ligne.test.mjs`, gardes de la vitrine, 2026-09-05).
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.   │
// │ Il ne nomme aucune des deux applications : tout vient des fichiers du depot ou il s'execute    │
// │ (`package.json`, `src-tauri/tauri.conf.json`), jamais d'une URL ecrite en dur — les deux       │
// │ depots N'ONT PAS les memes endpoints (§ 1.5 de l'instruction).                                 │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DEFAUT FERME. `scripts/verifier-canaux-en-ligne.mjs` est la FACE 2 de la garde de publication
// livree par L45 — la seule qui confronte au monde reel ce que CHAQUE endpoint d'update sert. La
// face 1 (`rendreCompte`, dans le gate) le dit elle-meme : elle NE PROUVE RIEN sur ce qu'un
// endpoint sert ni sur sa fraicheur, les deux cotes de son assertion derivant du meme `resultats`
// factice. Or AUCUN test n'executait la face 2 : desarmable dans les deux depots, avec
// regeneration du registre de convergence, sans qu'aucune face ne bronche — l'empreinte prouvait
// l'ALTERATION, jamais le COMPORTEMENT. C'est le meme defaut que F-3 a ferme sur l'autre face en
// ligne (`vitrine-en-ligne.mjs`), et c'etait la DERNIERE qui restait.
//
// LA VRAIE DECOUVERTE DE CE LOT (§ 1.7 de l'instruction, AR-2 = b) : le classement rendait
// `ecart: false` pour QUATRE cas de nature differente. Un endpoint qui repond en NON-2XX (404,
// 5xx) fait BASCULER le client vers l'endpoint suivant (doc Tauri updater v2) — CE N'EST PAS un
// ecart. Un endpoint qui repond en 2XX avec un corps INUTILISABLE (non-JSON, ou sans champ
// `version`) fait S'ARRETER le client LA, sans bascule — c'est un ECART NOMME, et l'ancien
// classement le laissait passer. C'est le masquage EXACT que ce script existe pour detecter,
// laisse passer par son propre classifieur. La logique de verdict est desormais EXTRAITE dans
// `scripts/lib/canaux-en-ligne.mjs` (module NEUF — AR-1 = b, § 1.2 de l'instruction : le fichier
// deja convergent `canaux-publication.mjs` porte le contrat DECLARE « canaux d'ECRITURE », ce
// classement porte sur des canaux de LECTURE, nature differente).
//
// ┌─ CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS — a lire ICI, PAS SEULEMENT au rapport ──┐
// │                                                                                                │
// │ CE QU'IL PROUVE. Que `scripts/verifier-canaux-en-ligne.mjs` S'EXECUTE et TRAITE CORRECTEMENT   │
// │ ce qu'il RECOIT : que chaque endpoint est classe selon l'etat attendu, que la comparaison      │
// │ semver ordonne juste (y compris le cas de bord 0.9 vs 0.10, precedent L43), que les TROIS      │
// │ codes de sortie sont poses aux bons endroits, que le chemin NON MESURE sort en 3 et non en 0   │
// │ — que ce soit parce qu'AUCUN endpoint n'est declare ou parce que TOUS sont injoignables —, que  │
// │ le cas MIXTE (un endpoint injoignable, un concordant) sort en 0 EN LE DISANT, et que la logique │
// │ extraite dans `scripts/lib/canaux-en-ligne.mjs` (`composerVerdict`) est REELLEMENT BRANCHEE     │
// │ dans le script.                                                                                 │
// │                                                                                                  │
// │ CE QU'IL NE PROUVE PAS, ET QU'IL NE FAUT PAS LAISSER CROIRE.                                    │
// │  1. Que le STUB ait la FORME d'une reponse reelle. Il est construit sur ce que le script LIT     │
// │     (`res.ok`, `res.status`, `res.json()`, `body.version`), pas sur ce que Forgejo ou            │
// │     `raw.githubusercontent.com` SERVENT. Si un endpoint changeait de forme, TOUS ces tests       │
// │     resteraient verts et la face en ligne REELLE rendrait un verdict FAUX. Difference avec       │
// │     l'aine (vitrine) : les deux endpoints ici servent un FICHIER STATIQUE                        │
// │     (`updater/latest.json`) dont la forme est fixee par NOUS (`scripts/lib/update-manifest.mjs`) │
// │     — la forme est MOINS susceptible de deriver, et la derive serait NOTRE fait, pas celui       │
// │     d'un tiers.                                                                                  │
// │  2. Que les endpoints SERVENT la bonne version. Seule l'execution REELLE de                      │
// │     `scripts/verifier-canaux-en-ligne.mjs` (`npm run canaux:en-ligne`, `quality.sh` step [8/8],   │
// │     HORS gate, reseau requis, INCHANGEE par ce lot) repond a cette question.                      │
// │  3. Que le CLIENT se comporte comme on le suppose. La partition « bascule / s'arrete » (AR-2)     │
// │     repose sur la doc de l'updater et sur la lecture de sa source faite par L45 — PAS sur une     │
// │     mesure faite ICI, avec CE plugin, sur CETTE version. Aucun test de ce fichier n'exerce le     │
// │     client.                                                                                       │
// │  4. Que le verdict `PERIME OU EN PROPAGATION` soit TRANCHABLE. Le script NOMME l'ambiguite        │
// │     parce que la fenetre de propagation du CDN est NON MESUREE. Aucun test ne peut la trancher :  │
// │     la trancher exige du reseau et du temps reel. Ce fichier epingle le NON-TRANCHEMENT (CA-4),   │
// │     il ne le leve pas.                                                                            │
// │                                                                                                    │
// │ Le dispositif de publication garde donc TROIS niveaux, et non deux : la face 1 dans le gate (le   │
// │ message est conditionne par les resultats de push, rien de plus), CE fichier (le script traite    │
// │ correctement ce qu'il recoit), et la face 2 reelle (confrontation au monde). AUCUN ne subsume     │
// │ les autres.                                                                                        │
// └────────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classer, compareSemver, composerVerdict } from "../lib/canaux-en-ligne.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lireJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-3 — le classement rend le verdict attendu, ETAT PAR ETAT, sur entrees FABRIQUEES.
// Chaque cas assert L'ETAT ET LE DRAPEAU `ecart` — jamais « au moins un ecart ».
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("CA-3 — classer() : le verdict attendu, etat par etat", () => {
  const TAG = "1.2.3";

  it("concorde : la version servie EGALE le tag", () => {
    const v = classer({ mesure: true, version: "1.2.3", motif: "sert" }, TAG);
    expect(v).toEqual({ etat: "concorde", ecart: false });
  });

  it("injoignable : `mesure.mesure` est false, jamais un ecart", () => {
    const v = classer({ mesure: false, version: null, motif: "injoignable — timeout" }, TAG);
    expect(v).toEqual({ etat: "injoignable", ecart: false });
  });

  it("version illisible : ni semver ni comparable, ECART NOMME avec la version en cause", () => {
    const v = classer({ mesure: true, version: "pas-une-version", motif: "sert" }, TAG);
    expect(v.ecart).toBe(true);
    expect(v.etat).toMatch(/version illisible/);
    expect(v.etat).toContain("pas-une-version");
  });

  it("EN AVANCE SUR LE TAG : la version servie est PLUS RECENTE que le tag local", () => {
    const v = classer({ mesure: true, version: "9.9.9", motif: "sert" }, TAG);
    expect(v.ecart).toBe(true);
    expect(v.etat).toMatch(/EN AVANCE SUR LE TAG/);
    expect(v.etat).toContain("9.9.9");
    expect(v.etat).toContain(TAG);
  });

  it("cas de bord semver « 0.9 » vs « 0.10 » — DANS LES DEUX SENS (precedent L43 : sort -V)", () => {
    // 0.9.0 sert, tag = 0.10.0 : 0.9 < 0.10, donc PERIME (jamais EN AVANCE).
    const perime = classer({ mesure: true, version: "0.9.0", motif: "sert" }, "0.10.0");
    expect(perime.ecart).toBe(true);
    expect(perime.etat).toMatch(/PERIME OU EN PROPAGATION/);
    // 0.10.0 sert, tag = 0.9.0 : 0.10 > 0.9, donc EN AVANCE (jamais PERIME).
    const avance = classer({ mesure: true, version: "0.10.0", motif: "sert" }, "0.9.0");
    expect(avance.ecart).toBe(true);
    expect(avance.etat).toMatch(/EN AVANCE SUR LE TAG/);
  });

  it("compareSemver — comparateur pur, les deux sens et l'egalite", () => {
    expect(compareSemver("0.9.0", "0.10.0")).toBe(-1);
    expect(compareSemver("0.10.0", "0.9.0")).toBe(1);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("pas-une-version", "1.2.3")).toBe(null);
  });

  it("motifs de lecture — un manifeste ABSENT (404) est un motif, pas un ecart", () => {
    const v = classer({ mesure: true, version: null, motif: "absent (404)" }, TAG);
    expect(v).toEqual({ etat: "absent (404)", ecart: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-4 — le NON-TRANCHEMENT du cache CDN est EPINGLE, sur les DEUX MOITIES de la formule.
// N'asserter qu'une moitie laisserait passer exactement la simplification qu'on veut interdire
// (§ 3.2 point 4 de l'instruction : « PERIME » seul, sans l'aveu de non-mesure).
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("CA-4 — le cache CDN : l'ambiguite est NOMMEE, jamais tranchee", () => {
  it("une version ANTERIEURE au tag produit l'etat ET l'aveu de non-mesure, ensemble", () => {
    const v = classer({ mesure: true, version: "1.0.0", motif: "sert" }, "1.2.3");
    expect(v.ecart).toBe(true);
    // Moitie 1 : l'alternative (ni MENTEUR ni EN PROPAGATION tranches l'un contre l'autre).
    expect(v.etat).toMatch(/PERIME OU EN PROPAGATION/);
    // Moitie 2 : l'aveu explicite que la fenetre n'est pas mesuree — sans lui, l'etat deviendrait
    // une ACCUSATION plutot qu'un constat.
    expect(v.etat).toMatch(/NON MESUREE/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-6 — AR-2 = (b) : la PARTITION non-2XX (le client bascule) / 2XX-inutilisable (le client
// s'arrete) est EPINGLEE DANS LES DEUX SENS. N'en asserter qu'un laisserait le classement libre de
// tout collapser vers l'autre — exactement l'etat de depart (§ 1.7).
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("CA-6 — la partition « bascule » / « s'arrete » (AR-2 = b)", () => {
  it("SENS 1 — non-2XX (404, 5xx) : le client BASCULE, PAS d'ecart", () => {
    const c404 = classer({ mesure: true, version: null, motif: "absent (404)" }, "1.2.3");
    expect(c404.ecart).toBe(false);
    const c500 = classer({ mesure: true, version: null, motif: "HTTP 500" }, "1.2.3");
    expect(c500.ecart).toBe(false);
  });

  it("SENS 2 — 2XX corps non-JSON : le client S'ARRETE ici, ECART NOMME", () => {
    const v = classer({ mesure: true, version: null, motif: "reponse non-JSON", echec2xx: true }, "1.2.3");
    expect(v.ecart).toBe(true);
    expect(v.etat).toContain("reponse non-JSON");
    expect(v.etat).toMatch(/S'ARRETE/);
  });

  it("SENS 2 — 2XX sans champ `version` : le client S'ARRETE ici, ECART NOMME", () => {
    const v = classer(
      { mesure: true, version: null, motif: "manifeste sans champ version", echec2xx: true },
      "1.2.3",
    );
    expect(v.ecart).toBe(true);
    expect(v.etat).toContain("manifeste sans champ version");
    expect(v.etat).toMatch(/S'ARRETE/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// composerVerdict — la JONCTION pure : lignes + ecarts + mesuresReussies, sur un jeu d'endpoints.
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("composerVerdict — compose lignes, ecarts et mesuresReussies", () => {
  it("aucun ecart : `ecarts` est vide, `mesuresReussies` compte les endpoints mesures", () => {
    const mesures = [
      { hote: "a.test", mesure: true, version: "1.0.0", motif: "sert" },
      { hote: "b.test", mesure: true, version: "1.0.0", motif: "sert" },
    ];
    const r = composerVerdict(mesures, "1.0.0");
    expect(r.ecarts).toEqual([]);
    expect(r.mesuresReussies).toHaveLength(2);
    expect(r.lignes).toHaveLength(2);
  });

  it("un ecart nomme porte L'HOTE ET L'ETAT, jamais juste « il y a un ecart »", () => {
    const mesures = [
      { hote: "a.test", mesure: true, version: "1.0.0", motif: "sert" },
      { hote: "b.test", mesure: true, version: "9.9.9", motif: "sert" },
    ];
    const r = composerVerdict(mesures, "1.0.0");
    expect(r.ecarts).toHaveLength(1);
    expect(r.ecarts[0]).toContain("b.test");
    expect(r.ecarts[0]).toMatch(/EN AVANCE SUR LE TAG/);
  });

  it("mesuresReussies EXCLUT les endpoints injoignables — c'est ce qui commande le code 3", () => {
    const mesures = [
      { hote: "a.test", mesure: false, version: null, motif: "injoignable — timeout" },
      { hote: "b.test", mesure: false, version: null, motif: "injoignable — timeout" },
    ];
    const r = composerVerdict(mesures, "1.0.0");
    expect(r.mesuresReussies).toHaveLength(0);
    expect(r.ecarts).toEqual([]); // injoignable N'EST PAS un ecart (§ 1.7, ligne 4 du tableau).
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-1/CA-2/CA-5 — LE SCRIPT s'execute, en SOUS-PROCESSUS, reseau NEUTRALISE (§ 1.4 de
// l'instruction : `verifier-canaux-en-ligne.mjs` est TOP-LEVEL INTEGRAL, l'IMPORTER l'executerait
// — precedent de forme : `scripts/__tests__/vitrine-en-ligne.test.mjs`).
//
// Les endpoints sont DERIVES de `src-tauri/tauri.conf.json` — JAMAIS ecrits en dur : les deux
// depots n'ont pas les memes URL (§ 1.5 de l'instruction), et un nombre fige romprait la
// convergence.
// ══════════════════════════════════════════════════════════════════════════════════════════════
const ENDPOINTS = lireJson("src-tauri/tauri.conf.json")?.plugins?.updater?.endpoints ?? [];
const PKG_VERSION = lireJson("package.json").version;

/** Un `fetch` de substitution PARAMETRABLE par endpoint (mode par index, meme ordre que
 *  `ENDPOINTS`) : jamais de connexion sortante. Il ECRIT UN COMPTEUR D'APPELS dans un fichier —
 *  c'est le VERROU (CA-1) : sans lui, un script qui sortirait AVANT tout `fetch` satisferait un
 *  test sur le seul code de sortie. */
const STUB = `
import { writeFileSync, existsSync, readFileSync } from "node:fs";
const COUNTER_FILE = process.env.IAKA_STUB_COUNTER_FILE;
const ENDPOINTS = JSON.parse(process.env.IAKA_STUB_ENDPOINTS);
const MODES = JSON.parse(process.env.IAKA_STUB_MODES);
const TAG = process.env.IAKA_STUB_TAG;
function record(url) {
  const etat = existsSync(COUNTER_FILE)
    ? JSON.parse(readFileSync(COUNTER_FILE, "utf8"))
    : { count: 0, urls: [] };
  etat.count += 1;
  etat.urls.push(url);
  writeFileSync(COUNTER_FILE, JSON.stringify(etat));
}
globalThis.fetch = async (url) => {
  const u = String(url);
  record(u);
  const i = ENDPOINTS.indexOf(u);
  const mode = i >= 0 ? MODES[i] : "inconnu";
  if (mode === "network-error") throw new Error("stub : reseau indisponible (fixture)");
  if (mode === "http-404") return { status: 404, ok: false, json: async () => ({}) };
  if (mode === "http-500") return { status: 500, ok: false, json: async () => ({}) };
  if (mode === "nonjson") {
    return { status: 200, ok: true, json: async () => { throw new Error("stub : pas du JSON"); } };
  }
  if (mode === "noversion") return { status: 200, ok: true, json: async () => ({}) };
  if (mode === "illisible") return { status: 200, ok: true, json: async () => ({ version: "abc" }) };
  if (mode === "match") return { status: 200, ok: true, json: async () => ({ version: TAG }) };
  if (mode === "lower") return { status: 200, ok: true, json: async () => ({ version: "0.0.1" }) };
  if (mode === "higher") return { status: 200, ok: true, json: async () => ({ version: "999.0.0" }) };
  return { status: 404, ok: false, json: async () => ({}) };
};
`;

function lancer({ modes }) {
  const dir = mkdtempSync(join(tmpdir(), "iaka-canaux-en-ligne-"));
  const stub = join(dir, "stub-fetch.mjs");
  const compteur = join(dir, "compteur.json");
  writeFileSync(stub, STUB, "utf8");
  try {
    const r = spawnSync(process.execPath, ["--import", stub, "scripts/verifier-canaux-en-ligne.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        IAKA_STUB_COUNTER_FILE: compteur,
        IAKA_STUB_ENDPOINTS: JSON.stringify(ENDPOINTS),
        IAKA_STUB_MODES: JSON.stringify(modes),
        IAKA_STUB_TAG: PKG_VERSION,
      },
    });
    const compte = existsSync(compteur) ? JSON.parse(readFileSync(compteur, "utf8")) : { count: 0, urls: [] };
    return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", compte };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("verifier-canaux-en-ligne.mjs — le script S'EXECUTE, reseau neutralise", () => {
  it("CA-1 — cas CONCORDE (code 0) : le stub A ETE APPELE sur les URL de tauri.conf.json", () => {
    expect(ENDPOINTS.length, "aucun endpoint declare — verifier tauri.conf.json").toBeGreaterThan(0);
    const r = lancer({ modes: ENDPOINTS.map(() => "match") });
    expect(r.status, `sortie inattendue :\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`).toBe(0);
    // LE VERROU : sans le compteur, un script qui sortirait avant tout `fetch` satisferait deja le
    // code 0 si `ecarts` restait vide par defaut.
    expect(r.compte.count, "le script n'est jamais passe par le fetch simule").toBeGreaterThan(0);
    // Les URL DEMANDEES sont EXACTEMENT celles de `tauri.conf.json`, dans le meme ensemble — pas
    // une constante ecrite dans ce test.
    expect(new Set(r.compte.urls)).toEqual(new Set(ENDPOINTS));
    expect(r.stdout).toContain("OK (0)");
  });

  it("CA-2 cas 1 — ECART (code 1) : la sortie NOMME l'hote ET l'etat, pas seulement le code", () => {
    const modes = ENDPOINTS.map((_, i) => (i === ENDPOINTS.length - 1 ? "lower" : "match"));
    const r = lancer({ modes });
    expect(r.status).toBe(1);
    const hoteEcart = new URL(ENDPOINTS[ENDPOINTS.length - 1]).host;
    expect(r.stderr, "l'hote en ecart n'est pas nomme").toContain(hoteEcart);
    expect(r.stderr).toMatch(/PERIME OU EN PROPAGATION/);
  });

  it("CA-2 cas 3 — TOUS injoignables : NON MESURE (code 3), jamais un succes", () => {
    const r = lancer({ modes: ENDPOINTS.map(() => "network-error") });
    expect(r.status).toBe(3);
    expect(r.stdout).toMatch(/NON MESURE/);
    expect(r.stdout).not.toMatch(/OK \(0\)/);
  });

  it.skipIf(ENDPOINTS.length < 2)(
    "CA-2 cas MIXTE — un injoignable + un concordant : code 0, et la sortie NOMME l'endpoint non interrogé",
    () => {
      const modes = ENDPOINTS.map((_, i) => (i === 0 ? "network-error" : "match"));
      const r = lancer({ modes });
      expect(r.status).toBe(0);
      const hoteInjoignable = new URL(ENDPOINTS[0]).host;
      // Le code 0 ne tait pas l'endpoint non interroge : il est NOMME dans la sortie, avec son etat.
      expect(r.stdout).toContain(hoteInjoignable);
      expect(r.stdout).toMatch(/injoignable/);
    },
  );

  it("AR-2 = (b) au bout du fil — 2XX corps non-JSON produit un ECART, la sortie le NOMME", () => {
    const modes = ENDPOINTS.map((_, i) => (i === 0 ? "nonjson" : "match"));
    const r = lancer({ modes });
    expect(r.status).toBe(1);
    const hote = new URL(ENDPOINTS[0]).host;
    expect(r.stderr).toContain(hote);
    expect(r.stderr).toMatch(/reponse non-JSON/);
  });

  it("AR-2 = (b) au bout du fil — un 404 ordinaire ne produit PAS d'ecart (le client bascule)", () => {
    const modes = ENDPOINTS.map((_, i) => (i === 0 ? "http-404" : "match"));
    const r = lancer({ modes });
    expect(r.status).toBe(0);
  });
});
