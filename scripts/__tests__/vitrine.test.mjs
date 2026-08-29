// vitrine.test.mjs — FACE LOCALE du cliquet de vitrine (L42). DANS le gate, HORS RESEAU,
// deterministe.
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme aucune des deux applications : tout vient des fichiers du depot ou il s'execute.  │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DEFAUT FERME (H-1, H-4). La section « Installation » du README etait recopiee a la main. Le
// 2026-08-29, les trois depots du portefeuille annoncaient une version perimee et TOUTES LES SUITES
// ETAIENT VERTES : IakaCockpit 866 tests verts en annoncant v0.31.2 alors qu'il portait 0.32.1,
// iakaFrameGUI 1242 tests verts en annoncant v0.1.4 alors qu'il portait 0.1.7. C'est ce vert-la que
// ce fichier supprime — la preuve que la garde n'existait pas est le vert lui-meme.
//
// ┌─ CE QUE CETTE FACE NE VOIT PAS, ET POURQUOI C'EST ECRIT ICI ─────────────────────────────────┐
// │ Elle rejoue le generateur EN MEMOIRE et compare au README VERSIONNE. Elle compare donc DEUX   │
// │ DERIVES DE LA MEME TABLE (`fixtures/vitrine-assets.json`). Si le bundler change sa convention │
// │ de nommage, les deux derives bougent ensemble et cette face reste VERTE sur un README qui     │
// │ ment. Ce n'est pas un oubli : aucune mesure hors ligne ne peut savoir ce qu'une release       │
// │ PORTE. CE QUI FERME LE TROU : `scripts/vitrine-en-ligne.mjs` (E-3/E-4), seule face a          │
// │ confronter la table au monde reel — anonyme, hors gate, `SKIP` explicite sans reseau.         │
// │ CONDITION DE LEVEE : aucune. Les deux faces sont complementaires par construction, comme      │
// │ celles de la garde de convergence (L41).                                                      │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  debutZone,
  ecartsDeVitrine,
  ecrireZones,
  estHorsVitrine,
  finZone,
  fichiersCites,
  fichiersTelechargeables,
  lireZones,
  nomsAttendus,
  rendreVitrine,
  substituer,
  versionAnnoncee,
} from "../lib/vitrine.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lire = (rel) => readFileSync(resolve(RACINE, rel), "utf8");
const lireJson = (rel) => JSON.parse(lire(rel));

const TABLE = lireJson("fixtures/vitrine-assets.json");
const LOCALE = lireJson("fixtures/vitrine-locale.json");
const APP = lireJson("src-tauri/tauri.conf.json").productName;
const VERSION = lireJson("package.json").version;
const README = lire("README.md");

const CONTEXTE = {
  app: APP,
  depot: LOCALE.depot,
  version: VERSION,
  plateformes: TABLE.plateformes,
  absents: LOCALE.absents ?? [],
  gabarits: LOCALE.gabarits ?? {},
};

describe("CA-1 — la vitrine est DERIVEE, jamais recopiee", () => {
  it("le README versionne est EXACTEMENT ce que le generateur produit", () => {
    const attendues = rendreVitrine(CONTEXTE);
    const ecarts = ecartsDeVitrine(lireZones(README, Object.keys(attendues)), attendues);
    const detail = ecarts
      .map((e) => `  zone « ${e.zone} », ligne ${e.ligne}\n    lu      : ${e.lu}\n    attendu : ${e.attendu}`)
      .join("\n");
    expect(
      detail,
      "README.md a DERIVE de la version d'autorite (package.json). La section Installation ne " +
        "s'edite plus a la main depuis L42.\nsortie : node scripts/vitrine.mjs --write",
    ).toBe("");
  });

  it("la version ANNONCEE par le README egale la version d'AUTORITE du depot", () => {
    // Redondant avec le test ci-dessus par construction, et garde volontairement : c'est CE
    // critere-la (CA-1) qu'un lecteur vient chercher, et un test NOMME vaut mieux qu'un compte.
    expect(versionAnnoncee(README), `README.md annonce autre chose que package.json (${VERSION})`).toBe(
      VERSION,
    );
  });
});

describe("CA-2 — CONTREFACTUEL : la garde MORD sur un README desaligne", () => {
  // Sur une FIXTURE en memoire, JAMAIS sur le vrai README.
  it("un README fige a une version anterieure fait rougir, en nommant la zone et la ligne", () => {
    const perime = ecrireZones(README, rendreVitrine({ ...CONTEXTE, version: "0.0.1" }));
    expect(perime).not.toBe(README);

    const attendues = rendreVitrine(CONTEXTE);
    const ecarts = ecartsDeVitrine(lireZones(perime, Object.keys(attendues)), attendues);
    expect(ecarts.length, "un README desaligne DOIT produire au moins un ecart").toBeGreaterThan(0);
    expect(ecarts.every((e) => typeof e.zone === "string" && e.ligne > 0)).toBe(true);
    expect(versionAnnoncee(perime)).toBe("0.0.1");
    expect(versionAnnoncee(perime)).not.toBe(VERSION);
  });

  it("RETIRER LES MARQUEURS ne rend pas la garde verte : c'est un refus", () => {
    // Le faux vert le plus facile a produire : supprimer les marqueurs et laisser la zone libre.
    const sansMarqueurs = README.replaceAll(debutZone("binaires"), "");
    expect(() => lireZones(sansMarqueurs, ["binaires"])).toThrow(/introuvable/);
  });
});

describe("CA-11 / CA-12 — la table et les absents disent ce qu'ils font", () => {
  it("chaque plateforme porte un libelle, un motif versionne et SA RAISON d'etre en vitrine", () => {
    expect(TABLE.plateformes.length).toBeGreaterThan(0);
    for (const p of TABLE.plateformes) {
      expect(p.cle, "cle").toMatch(/^[a-z0-9-]+$/);
      expect(p.libelle, `${p.cle}.libelle`).toMatch(/\S/);
      // `{V}` obligatoire : un artefact SANS version dans le nom n'est pas un installeur de cette
      // version — c'est le piege des `.app.tar.gz`, comptes deux fois pour du « macOS couvert ».
      expect(p.motif, `${p.cle}.motif`).toContain("{V}");
      expect(p.motif, `${p.cle}.motif`).toContain("{APP}");
      expect(String(p.raison ?? "").trim().length, `${p.cle}.raison`).toBeGreaterThan(20);
    }
    expect(new Set(TABLE.plateformes.map((p) => p.cle)).size).toBe(TABLE.plateformes.length);
  });

  it("ce qui est HORS vitrine est enumere NOMMEMENT, avec sa raison", () => {
    const cles = Object.keys(TABLE.hors_vitrine).filter((k) => k !== "//");
    expect(cles.length, "l'exclusion doit etre nommee, pas implicite").toBeGreaterThan(0);
    for (const c of cles) {
      expect(String(TABLE.hors_vitrine[c]).trim().length, `hors_vitrine[${c}]`).toBeGreaterThan(20);
    }
    // Le piege de comptage, ferme mecaniquement : une charge d'updater n'est pas un installeur.
    for (const suffixe of ["_aarch64.app.tar.gz", "_x64.app.tar.gz"]) {
      const nom = `${APP}${suffixe}`;
      expect(estHorsVitrine(nom, TABLE.hors_vitrine, { app: APP, version: VERSION })).toBeTruthy();
    }
    expect(estHorsVitrine("latest.json", TABLE.hors_vitrine, { app: APP, version: VERSION })).toBeTruthy();
    expect(
      estHorsVitrine(`${APP}_${VERSION}_amd64.deb.sig`, TABLE.hors_vitrine, {
        app: APP,
        version: VERSION,
      }),
    ).toBeTruthy();
  });

  it("aucune charge d'updater n'est annoncee comme telechargeable dans le README", () => {
    for (const nom of fichiersCites(README)) {
      expect(nom, "un `.app.tar.gz` ne se double-clique pas : il n'a rien a faire en vitrine").not.toMatch(
        /\.app\.tar\.gz$/,
      );
    }
  });

  it("chaque ABSENT declare porte sa cle connue, sa date, son motif ET sa condition de levee", () => {
    const clesTable = new Set(TABLE.plateformes.map((p) => p.cle));
    for (const a of CONTEXTE.absents) {
      expect(clesTable.has(a.cle), `absent « ${a.cle} » : cle inconnue de la table`).toBe(true);
      expect(a.constate_sur, `${a.cle}.constate_sur`).toMatch(/\S/);
      expect(a.depuis, `${a.cle}.depuis`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Un motif telegraphique laisse l'absence muette : c'est le defaut qu'on repare, pas un style.
      expect(String(a.motif_absence ?? "").trim().length, `${a.cle}.motif_absence`).toBeGreaterThan(40);
      expect(
        String(a.condition_de_levee ?? "").trim().length,
        `${a.cle}.condition_de_levee — une absence sans condition de levee est definitive`,
      ).toBeGreaterThan(20);
    }
  });

  it("CONTREFACTUEL — declarer un absent sur une cle INCONNUE de la table est un refus", () => {
    expect(() =>
      rendreVitrine({
        ...CONTEXTE,
        absents: [
          {
            cle: "haiku-ppc",
            constate_sur: "fixture",
            depuis: "2026-08-29",
            motif_absence: "plateforme imaginaire, pour exercer le refus sur une fixture",
            condition_de_levee: "aucune : elle n'existe pas",
          },
        ],
      }),
    ).toThrow(/cle inconnue de la table|clé inconnue de la table/);
  });

  it("un absent N'EST PAS annonce comme telechargeable, et EST nomme comme non fourni", () => {
    const zones = rendreVitrine(CONTEXTE);
    const noms = nomsAttendus(TABLE.plateformes, { app: APP, version: VERSION });
    for (const a of CONTEXTE.absents) {
      const nom = noms[a.cle];
      expect(zones.binaires, `${nom} ne doit plus figurer au tableau des telechargements`).not.toContain(
        `| \`${nom}\` |`,
      );
      expect(zones.binaires, `${nom} doit etre DECLARE absent, pas passe sous silence`).toContain(nom);
      expect(zones.binaires).toContain("Non fourni");
    }
  });

  it("« Tous les systemes sont couverts » n'est ecrit QUE si la liste des absents est vide", () => {
    const avecAbsent = rendreVitrine({
      ...CONTEXTE,
      absents: [
        {
          cle: TABLE.plateformes[0].cle,
          constate_sur: "fixture",
          depuis: "2026-08-29",
          motif_absence: "fixture destinee a verifier que le slogan disparait avec la couverture",
          condition_de_levee: "sans objet, fixture",
        },
      ],
    });
    expect(avecAbsent.binaires).not.toContain("Tous les systèmes sont couverts");
    expect(rendreVitrine({ ...CONTEXTE, absents: [] }).binaires).toContain(
      "Tous les systèmes sont couverts",
    );
  });
});

describe("le generateur est PUR — meme entree, meme sortie", () => {
  it("deux rendus successifs sont identiques, et `--write` est idempotent", () => {
    expect(rendreVitrine(CONTEXTE)).toEqual(rendreVitrine(CONTEXTE));
    const une = ecrireZones(README, rendreVitrine(CONTEXTE));
    expect(ecrireZones(une, rendreVitrine(CONTEXTE))).toBe(une);
  });

  it("substituer ne touche QUE {APP} et {V}", () => {
    expect(substituer("{APP}_{V}_x64.dmg", { app: "A", version: "1.2.3" })).toBe("A_1.2.3_x64.dmg");
    expect(substituer("rien a substituer {AUTRE}", { app: "A", version: "1" })).toBe(
      "rien a substituer {AUTRE}",
    );
  });

  it("E-3 ne porte QUE sur ce qui est PROMIS, pas sur ce qui est mentionne", () => {
    // Le defaut trouve par la face en ligne : un artefact nomme dans le bloc des absents n'est pas
    // annonce comme telechargeable. Confondre les deux faisait rougir la garde sur l'honnetete.
    const telechargeables = fichiersTelechargeables(README);
    const cites = fichiersCites(README);
    const noms = nomsAttendus(TABLE.plateformes, { app: APP, version: VERSION });
    for (const a of CONTEXTE.absents) {
      expect(cites, `${noms[a.cle]} doit etre NOMME (absence declaree)`).toContain(noms[a.cle]);
      expect(
        telechargeables,
        `${noms[a.cle]} est declare absent : il ne doit PAS etre presente comme telechargeable`,
      ).not.toContain(noms[a.cle]);
    }
    // Toute plateforme NON declaree absente est, elle, bien promise.
    const clesAbsentes = new Set(CONTEXTE.absents.map((a) => a.cle));
    for (const p of TABLE.plateformes) {
      if (clesAbsentes.has(p.cle)) continue;
      expect(telechargeables).toContain(noms[p.cle]);
    }
  });

  it("les marqueurs de zone sont stables et distincts", () => {
    for (const nom of Object.keys(rendreVitrine(CONTEXTE))) {
      expect(README).toContain(debutZone(nom));
      expect(README).toContain(finZone(nom));
      expect(debutZone(nom)).not.toBe(finZone(nom));
    }
  });
});
