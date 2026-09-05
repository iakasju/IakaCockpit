// vitrine-en-ligne.test.mjs — F-3 : `scripts/vitrine-en-ligne.mjs` EST EXERCE (gardes de la
// vitrine, 2026-09-05).
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme aucune des deux applications : tout vient des fichiers du depot ou il s'execute,  │
// │ ou d'entrees FABRIQUEES pour les cas que ces fichiers ne peuvent pas produire (E-5, § plus     │
// │ bas).                                                                                          │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DEFAUT FERME (F-3). `scripts/vitrine-en-ligne.mjs` etait la SEULE face non circulaire du
// dispositif de vitrine — la face locale compare deux derives de la MEME table, elle dit
// elle-meme « sans elle, ce fichier n'est qu'un mensonge coherent ». Or AUCUN test ne
// l'executait : elle etait desarmable dans les deux depots, avec regeneration du registre de
// convergence, sans qu'aucune face ne bronge. C'est la garde dont tout le reste depend, et
// c'etait la seule qui n'avait pas de garde.
//
// ┌─ CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS — a lire ICI, PAS SEULEMENT au rapport ──┐
// │                                                                                                │
// │ CE QU'IL PROUVE. Que `scripts/vitrine-en-ligne.mjs` S'EXECUTE et TRAITE CORRECTEMENT ce qu'il  │
// │ RECOIT : que les cinq egalites (E-1..E-5) rendent le bon verdict sur des entrees CONNUES —     │
// │ E-5 comprise, meme si le registre REEL (`fixtures/vitrine-locale.json`) est vide des deux      │
// │ cotes (§ 1.6 du cadrage) — que les TROIS codes de sortie sont poses aux bons endroits, que le  │
// │ chemin SKIP sort en 3 et non en 0, et que la logique de verdict extraite dans                  │
// │ `scripts/lib/vitrine.mjs` (`evaluerCanalEnLigne`) est REELLEMENT BRANCHEE dans le script.      │
// │                                                                                                │
// │ CE QU'IL NE PROUVE PAS, ET QU'IL NE FAUT PAS LAISSER CROIRE.                                   │
// │  1. Que le STUB ait la FORME de l'API reelle. Il est construit sur ce que le script LIT        │
// │     (`tag_name`, `assets[].name`, `t.name`), pas sur ce que GitHub REND. Trois de ces champs   │
// │     sont confirmes par `docs.github.com/en/rest/releases/releases` (API version 2022-11-28) ;  │
// │     `t.name` de l'endpoint des tags NE L'EST PAS par cette source (§ 1.8 du cadrage). Si l'API  │
// │     changeait de forme, TOUS ces tests resteraient verts et la face en ligne REELLE rendrait   │
// │     un verdict FAUX.                                                                            │
// │  2. Que la vitrine dise VRAI. Seule l'execution REELLE de `scripts/vitrine-en-ligne.mjs`        │
// │     (`npm run vitrine:en-ligne`, HORS gate, reseau requis, INCHANGEE par ce lot) repond a       │
// │     cette question.                                                                             │
// │  3. Que la release EXISTE. Un stub sert ce qu'on lui dit de servir.                             │
// │                                                                                                  │
// │ Le dispositif garde donc TROIS niveaux, et non deux : la face locale (deux derives de la meme  │
// │ table), CE fichier (traitement correct de ce qui est recu), et la face en ligne reelle          │
// │ (confrontation au monde). AUCUN ne subsume les autres.                                          │
// └──────────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluerCanalEnLigne, tagAnnonceDe, nomsAttendus } from "../lib/vitrine.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lireJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));

/** Chaque ecart porte son CODE en tete (« E-3 : ... ») : on ne teste jamais « au moins un ecart »,
 *  toujours LE code attendu (CA-5, verrou). */
const codes = (ecarts) => ecarts.map((e) => e.split(" : ")[0]);

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-5 — les CINQ EGALITES, sur des entrees FABRIQUEES.
//
// AR-4 — E-5 SANS ETRE VACUOUS. `absentsLocaux` est ici un litteral ecrit DANS ce test, JAMAIS une
// lecture de `fixtures/vitrine-locale.json` (qui est VIDE des deux cotes, § 1.6 du cadrage —
// l'y piloter itererait sur RIEN, le defaut I4bis de L41 rejoue dans le lot dont c'est le sujet).
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("CA-5/CA-6 — evaluerCanalEnLigne : les cinq egalites rendent le verdict attendu", () => {
  const APP_T = "AcmeApp";
  const VERSION_T = "1.2.3";
  const TABLE_T = {
    plateformes: [
      { cle: "win", libelle: "Windows", motif: "{APP}_{V}_win.exe" },
      { cle: "mac", libelle: "macOS", motif: "{APP}_{V}_mac.dmg" },
    ],
    hors_vitrine: { "*.sig": "signature minisign, pas un installeur" },
  };
  const NOMS_T = nomsAttendus(TABLE_T.plateformes, { app: APP_T, version: VERSION_T });

  const README_OK = [
    "<!-- vitrine:debut:binaires -->",
    `La version scellée courante est **[v${VERSION_T}](https://example.test/tag)** — voir`,
    "[toutes les versions](https://example.test/releases).",
    "",
    "| Système | Fichier à télécharger |",
    "|---|---|",
    `| **Windows** | \`${NOMS_T.win}\` |`,
    `| **macOS** | \`${NOMS_T.mac}\` |`,
    "<!-- vitrine:fin:binaires -->",
  ].join("\n");

  /** Base NOMINALE : les cinq egalites concordent. Chaque cas ci-dessous s'ecarte d'UN seul champ. */
  const BASE = {
    depot: "acme/test",
    app: APP_T,
    version: VERSION_T,
    table: TABLE_T,
    absentsLocaux: [],
    readme: README_OK,
    latest: `v${VERSION_T}`,
    latestAbsent: false,
    tagsBruts: [`v${VERSION_T}`, "v1.0.0", "archive/feat/x"],
    releaseAnnoncee: { corps: { assets: [{ name: NOMS_T.win }, { name: NOMS_T.mac }] } },
  };

  it("cas nominal : ZERO ecart, les cinq egalites concordent", () => {
    const { ecarts } = evaluerCanalEnLigne(BASE);
    expect(ecarts).toEqual([]);
  });

  it("E-1 — `latest` n'expose AUCUNE release pour un visiteur anonyme", () => {
    const { ecarts } = evaluerCanalEnLigne({ ...BASE, latest: null, latestAbsent: true });
    expect(codes(ecarts)).toContain("E-1");
    const e1 = ecarts.find((e) => e.startsWith("E-1"));
    expect(e1).toMatch(/AUCUNE release/);
  });

  it("E-1 — `latest` ne designe PAS le plus haut tag semver publie", () => {
    const { ecarts } = evaluerCanalEnLigne({ ...BASE, tagsBruts: [...BASE.tagsBruts, "v9.9.9"] });
    expect(codes(ecarts)).toContain("E-1");
    const e1 = ecarts.find((e) => e.startsWith("E-1"));
    expect(e1).toMatch(/v9\.9\.9/);
    // Les tags NON-semver (`archive/feat/x`) ne comptent pas comme un tag de version plus haut.
    expect(e1).not.toMatch(/archive/);
  });

  it("E-2 — le README annonce une version differente de celle que GitHub presente", () => {
    const readmeDesaligne = README_OK.replace(`v${VERSION_T}`, "v9.9.9");
    const { ecarts } = evaluerCanalEnLigne({ ...BASE, readme: readmeDesaligne, releaseAnnoncee: null });
    expect(codes(ecarts)).toContain("E-2");
    const e2 = ecarts.find((e) => e.startsWith("E-2"));
    expect(e2).toMatch(/v9\.9\.9/);
    expect(e2).toMatch(new RegExp(`v${VERSION_T}`));
  });

  it("E-3 — un fichier PROMIS par le README n'est PAS un asset de la release", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      releaseAnnoncee: { corps: { assets: [{ name: NOMS_T.win }] } }, // le .dmg manque
    });
    expect(codes(ecarts)).toContain("E-3");
    const e3 = ecarts.find((e) => e.startsWith("E-3"));
    expect(e3).toContain(NOMS_T.mac);
  });

  it("E-3 — la release ANNONCEE par le README N'EXISTE PAS (404 anonyme)", () => {
    const { ecarts } = evaluerCanalEnLigne({ ...BASE, releaseAnnoncee: { absent: true } });
    expect(codes(ecarts)).toContain("E-3");
    const e3 = ecarts.find((e) => e.startsWith("E-3"));
    expect(e3).toMatch(/N'EXISTE PAS/);
  });

  it("E-4 — un asset INSTALLABLE de la release n'est annonce NULLE PART dans le README", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      releaseAnnoncee: {
        corps: { assets: [{ name: NOMS_T.win }, { name: NOMS_T.mac }, { name: "extra.exe" }] },
      },
    });
    expect(codes(ecarts)).toContain("E-4");
    const e4 = ecarts.find((e) => e.startsWith("E-4"));
    expect(e4).toContain("extra.exe");
  });

  it("E-4 — un asset HORS VITRINE (signature) n'est PAS exige au README", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      releaseAnnoncee: {
        corps: {
          assets: [{ name: NOMS_T.win }, { name: NOMS_T.mac }, { name: `${NOMS_T.win}.sig` }],
        },
      },
    });
    expect(ecarts).toEqual([]);
  });

  it("E-5 — une absence declaree FABRIQUEE redevient fausse : l'artefact EST present", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      absentsLocaux: [{ cle: "mac", depuis: "2026-01-01" }],
    });
    expect(codes(ecarts)).toContain("E-5");
    const e5 = ecarts.find((e) => e.startsWith("E-5"));
    expect(e5).toContain(NOMS_T.mac);
    expect(e5).toMatch(/survecu a sa raison d'etre/);
  });

  it("E-5 — une absence declaree TOUJOURS VRAIE (l'asset manque bien) ne rougit PAS", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      absentsLocaux: [{ cle: "mac", depuis: "2026-01-01" }],
      releaseAnnoncee: { corps: { assets: [{ name: NOMS_T.win }] } },
    });
    expect(codes(ecarts)).not.toContain("E-5");
  });

  it("tagAnnonce introuvable (README illisible, latest absent) : aucun crash, aucun E-3/E-4/E-5", () => {
    const { ecarts } = evaluerCanalEnLigne({
      ...BASE,
      readme: "# rien de lisible ici",
      latest: null,
      releaseAnnoncee: null,
    });
    expect(codes(ecarts).some((c) => ["E-3", "E-4", "E-5"].includes(c))).toBe(false);
  });

  it("tagAnnonceDe — le README prime sur `latest` quand il annonce une version lisible", () => {
    expect(tagAnnonceDe(README_OK, "v9.9.9")).toBe(`v${VERSION_T}`);
    expect(tagAnnonceDe("# illisible", "v9.9.9")).toBe("v9.9.9");
    expect(tagAnnonceDe("# illisible", null)).toBe(null);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CA-3/CA-4/CA-6 — LE SCRIPT s'execute, en SOUS-PROCESSUS, reseau NEUTRALISE (§ 1.5 du cadrage :
// `scripts/vitrine-en-ligne.mjs` est TOP-LEVEL INTEGRAL, l'IMPORTER l'executerait — precedent de
// forme : `scripts/__tests__/canal-mesure.test.mjs`).
//
// Ces tests s'executent contre les fichiers REELS de CE depot (README.md, package.json,
// tauri.conf.json, fixtures/vitrine-assets.json) : seul le RESEAU est simule. C'est le meme choix
// que `canal-mesure.test.mjs` pour `mesurer-artefacts.mjs`.
// ══════════════════════════════════════════════════════════════════════════════════════════════
const README = readFileSync(resolve(ROOT, "README.md"), "utf8");
const TABLE = lireJson("fixtures/vitrine-assets.json");
const LOCALE = lireJson("fixtures/vitrine-locale.json");
const APP = lireJson("src-tauri/tauri.conf.json").productName;
const VERSION = lireJson("package.json").version;
const TAG = tagAnnonceDe(README, `v${VERSION}`);
const NOMS = nomsAttendus(TABLE.plateformes, { app: APP, version: VERSION });
const TOUS_LES_NOMS = Object.values(NOMS);

/** Un `fetch` de substitution PARAMETRABLE par variables d'environnement : jamais de connexion
 *  sortante. Il ECRIT UN COMPTEUR D'APPELS dans un fichier — c'est le VERROU (CA-3) : sans lui, un
 *  script qui sortirait AVANT tout `fetch` satisferait un test sur le seul code de sortie. */
const STUB = `
import { writeFileSync, existsSync, readFileSync } from "node:fs";
const MODE = process.env.IAKA_STUB_MODE;
const COUNTER_FILE = process.env.IAKA_STUB_COUNTER_FILE;
const DEPOT = process.env.IAKA_STUB_DEPOT;
const TAG = process.env.IAKA_STUB_TAG;
const ASSETS = JSON.parse(process.env.IAKA_STUB_ASSETS);
const TAGS = JSON.parse(process.env.IAKA_STUB_TAGS);
function record(chemin) {
  const etat = existsSync(COUNTER_FILE)
    ? JSON.parse(readFileSync(COUNTER_FILE, "utf8"))
    : { count: 0, chemins: [] };
  etat.count += 1;
  etat.chemins.push(chemin);
  writeFileSync(COUNTER_FILE, JSON.stringify(etat));
}
globalThis.fetch = async (url) => {
  const u = new URL(url);
  const chemin = u.pathname + u.search;
  record(chemin);
  if (MODE === "network-error") throw new Error("stub : reseau indisponible (fixture)");
  if (MODE === "http-403") return { status: 403, ok: false, json: async () => ({}) };
  if (chemin === \`/repos/\${DEPOT}/releases/latest\`) {
    return { status: 200, ok: true, json: async () => ({ tag_name: TAG }) };
  }
  if (chemin.startsWith(\`/repos/\${DEPOT}/tags\`)) {
    return { status: 200, ok: true, json: async () => TAGS.map((name) => ({ name })) };
  }
  if (chemin === \`/repos/\${DEPOT}/releases/tags/\${TAG}\`) {
    return { status: 200, ok: true, json: async () => ({ assets: ASSETS.map((name) => ({ name })) }) };
  }
  return { status: 404, ok: false, json: async () => ({}) };
};
`;

function lancer({ mode, assets, tags }) {
  const dir = mkdtempSync(join(tmpdir(), "iaka-vitrine-en-ligne-"));
  const stub = join(dir, "stub-fetch.mjs");
  const compteur = join(dir, "compteur.json");
  writeFileSync(stub, STUB, "utf8");
  try {
    const r = spawnSync(process.execPath, ["--import", stub, "scripts/vitrine-en-ligne.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        IAKA_STUB_MODE: mode,
        IAKA_STUB_COUNTER_FILE: compteur,
        IAKA_STUB_DEPOT: LOCALE.depot,
        IAKA_STUB_TAG: TAG,
        IAKA_STUB_ASSETS: JSON.stringify(assets ?? []),
        IAKA_STUB_TAGS: JSON.stringify(tags ?? []),
      },
    });
    const compte = existsSync(compteur) ? JSON.parse(readFileSync(compteur, "utf8")) : { count: 0, chemins: [] };
    return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", compte };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("vitrine-en-ligne.mjs — le script S'EXECUTE, reseau neutralise", () => {
  it("CA-3/CA-6 — cas CONCORDE (code 0) : le stub A ETE APPELE, sur les TROIS chemins attendus", () => {
    const r = lancer({ mode: "match", assets: TOUS_LES_NOMS, tags: [TAG, "v0.0.1"] });
    expect(r.status, `sortie inattendue :\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`).toBe(0);
    // LE VERROU : sans le compteur, un script qui sortirait avant tout `fetch` satisferait déjà le
    // code 0 si `ecarts` restait vide par défaut — ce test-ci prouve que le réseau simulé a été
    // TRAVERSÉ, pas seulement que le code de sortie tombe juste.
    expect(r.compte.count, "le script n'est jamais passe par le fetch simule").toBeGreaterThan(0);
    expect(r.compte.chemins.some((c) => c.includes("releases/latest"))).toBe(true);
    expect(r.compte.chemins.some((c) => c.includes("/tags"))).toBe(true);
    expect(r.compte.chemins.some((c) => c.includes(`releases/tags/${TAG}`))).toBe(true);
    expect(r.stdout).toContain("OK — la vitrine et l'etagere concordent");
  });

  it("CA-4 — cas ECART (code 1) : la sortie NOMME le fichier manquant, pas seulement le code", () => {
    const manquant = TOUS_LES_NOMS[0];
    const incomplet = TOUS_LES_NOMS.filter((n) => n !== manquant);
    const r = lancer({ mode: "match", assets: incomplet, tags: [TAG] });
    expect(r.status).toBe(1);
    expect(r.stderr, "le fichier manquant n'est pas nomme dans la sortie").toContain(manquant);
    expect(r.stderr).toMatch(/E-3/);
  });

  it("CA-4 — cas NON MESURE (code 3), par un `fetch` qui JETTE", () => {
    const r = lancer({ mode: "network-error", assets: TOUS_LES_NOMS, tags: [TAG] });
    expect(r.status).toBe(3);
    expect(r.stdout).toMatch(/NON MESURE/);
    expect(r.stdout).not.toMatch(/OK —/);
  });

  it("CA-4 — cas NON MESURE (code 3), par un HTTP 403 (quota anonyme)", () => {
    const r = lancer({ mode: "http-403", assets: TOUS_LES_NOMS, tags: [TAG] });
    expect(r.status).toBe(3);
    expect(r.stdout).toMatch(/NON MESURE/);
  });
});
