// verifier-mesures.test.mjs — LES DEUX EXPLOITS DE `I4`, écrits ROUGE D'ABORD (défaut B).
//
// DISCIPLINE. Ces assertions ont été écrites AVANT le correctif, contre l'extraction FIDÈLE de
// l'ancienne `I4` (index par URL). Dans cet état, les deux fixtures malveillantes PASSAIENT la
// garde — zéro violation — et ces tests étaient donc ROUGES. C'est la preuve que la garde était
// trouée : elle acceptait un `mesures.json` qui ment sur ce qu'il a mesuré.
//
// POURQUOI MAINTENANT, ET PAS PLUS TARD. Émettre les clés d'installeur fait que PLUSIEURS clés du
// manifeste partagent la même URL par construction (`linux-x86_64` et `linux-x86_64-appimage`
// désignent le même octet). Un index par URL s'effondre exactement au moment où on s'en sert.
import { describe, it, expect } from "vitest";
import {
  verifierMesures,
  verifierHorsCouverture,
  estPublic,
  estPrive,
  hoteJuge,
} from "../lib/verifier-mesures.mjs";

const U_LINUX = "https://exemple.test/releases/download/v1.0.0/App_1.0.0_amd64.AppImage";
const U_WIN = "https://exemple.test/releases/download/v1.0.0/App_1.0.0_x64-setup.exe";

/** Manifeste minimal à deux plateformes, chacune sur SON artefact. */
const manifeste = {
  version: "1.0.0",
  pub_date: "2026-08-28T00:00:00.000Z",
  platforms: {
    "linux-x86_64": { signature: "sig-linux", url: U_LINUX },
    "windows-x86_64": { signature: "sig-windows", url: U_WIN },
  },
};

const mesureOk = (plateforme, url) => ({
  plateforme,
  url,
  hote: "exemple.test",
  status: 200,
  octets: 4096,
  motif: "ok",
  sha256: "0".repeat(64),
  signature: "valide",
  temoinNegatifOctetAltere: "invalide",
});

const enveloppe = (artefacts, version = "1.0.0") => ({
  mesureLe: "2026-08-29T00:00:00.000Z",
  version,
  artefacts,
});

/** Toutes les plateformes nommées par au moins une violation. */
const fautives = (violations) => violations.map((v) => v.plateforme);

describe("verifierMesures — la garde I4, extraite et testable sur fixtures", () => {
  it("cas nominal : chaque plateforme mesurée à SON URL, tout est vert", () => {
    const mesures = enveloppe([
      mesureOk("linux-x86_64", U_LINUX),
      mesureOk("windows-x86_64", U_WIN),
    ]);
    expect(verifierMesures({ manifeste, mesures })).toEqual([]);
  });

  it("CA-5 — EXPLOIT 1 : la mesure de `linux-x86_64` porte l'URL de l'exe Windows", () => {
    // Les deux étiquettes sont interverties. Sous l'index PAR URL, les deux URL du manifeste sont
    // présentes dans le fichier et répondent 200 : la garde ne lisait JAMAIS le champ `plateforme`,
    // donc elle voyait tout en vert alors que le fichier affirme avoir mesuré Linux à l'URL de
    // Windows. Sous l'index PAR PLATEFORME, la substitution est nommée.
    const mesures = enveloppe([
      mesureOk("linux-x86_64", U_WIN),
      mesureOk("windows-x86_64", U_LINUX),
    ]);
    const violations = verifierMesures({ manifeste, mesures });
    expect(violations.length, "exploit 1 non detecte — la garde est trouee").toBeGreaterThan(0);
    expect(fautives(violations)).toContain("linux-x86_64");
    expect(violations.map((v) => v.motif).join(" | ")).toMatch(/linux-x86_64/);
  });

  it("CA-6 — EXPLOIT 2 : deux mesures de la MÊME URL, la mauvaise puis la bonne", () => {
    // `new Map(tableau.map(...))` garde la DERNIÈRE. Une mesure 404 suivie d'une mesure 200 sur la
    // même URL était donc écrasée en silence : le fichier consigne un échec, la garde voit un
    // succès. Le fichier ment, et rien ne le dit.
    const mauvaise = {
      ...mesureOk("linux-x86_64", U_LINUX),
      status: 404,
      octets: 0,
      motif: "HTTP 404",
      signature: "non verifiee",
    };
    const mesures = enveloppe([
      mauvaise,
      mesureOk("linux-x86_64", U_LINUX),
      mesureOk("windows-x86_64", U_WIN),
    ]);
    const violations = verifierMesures({ manifeste, mesures });
    expect(violations.length, "exploit 2 non detecte — l'ecrasement reste silencieux").toBeGreaterThan(0);
    expect(fautives(violations)).toContain("linux-x86_64");
  });

  it("CA-7 — une PLATEFORME en doublon est une violation NOMMÉE, pas un écrasement", () => {
    const mesures = enveloppe([
      mesureOk("linux-x86_64", U_LINUX),
      mesureOk("linux-x86_64", U_WIN),
      mesureOk("windows-x86_64", U_WIN),
    ]);
    const violations = verifierMesures({ manifeste, mesures });
    expect(fautives(violations)).toContain("linux-x86_64");
    expect(violations.map((v) => v.motif).join(" | ")).toMatch(/doublon|deux fois/i);
  });

  it("CA-8 — deux CLÉS DISTINCTES partageant la MÊME URL restent vertes (cas légitime)", () => {
    // Le cas que produit l'émission des clés d'installeur : `linux-x86_64` (générique) et
    // `linux-x86_64-appimage` (installeur) pointent le MÊME octet. Sans ce critère, la correction
    // de CA-7 casserait l'étape 3.
    const manifestePartage = {
      version: "1.0.0",
      pub_date: "2026-08-28T00:00:00.000Z",
      platforms: {
        "linux-x86_64": { signature: "sig-linux", url: U_LINUX },
        "linux-x86_64-appimage": { signature: "sig-linux", url: U_LINUX },
        "windows-x86_64": { signature: "sig-windows", url: U_WIN },
      },
    };
    const mesures = enveloppe([
      mesureOk("linux-x86_64", U_LINUX),
      mesureOk("linux-x86_64-appimage", U_LINUX),
      mesureOk("windows-x86_64", U_WIN),
    ]);
    expect(verifierMesures({ manifeste: manifestePartage, mesures })).toEqual([]);
  });

  it("une plateforme annoncée sans aucune mesure est nommée", () => {
    const mesures = enveloppe([mesureOk("linux-x86_64", U_LINUX)]);
    expect(fautives(verifierMesures({ manifeste, mesures }))).toContain("windows-x86_64");
  });

  it("les critères conservés : 200, octets > 0, signature valide", () => {
    const casTest = [
      [{ status: 500 }, /500/],
      [{ octets: 0 }, /vide/],
      [{ signature: "invalide" }, /signature/],
    ];
    for (const [patch, motifAttendu] of casTest) {
      const mesures = enveloppe([
        { ...mesureOk("linux-x86_64", U_LINUX), ...patch },
        mesureOk("windows-x86_64", U_WIN),
      ]);
      const violations = verifierMesures({ manifeste, mesures });
      expect(fautives(violations)).toContain("linux-x86_64");
      expect(violations.map((v) => v.motif).join(" | ")).toMatch(motifAttendu);
    }
  });

  it("l'en-tête est vérifié : date de mesure présente, version alignée sur le manifeste", () => {
    const artefacts = [mesureOk("linux-x86_64", U_LINUX), mesureOk("windows-x86_64", U_WIN)];
    expect(verifierMesures({ manifeste, mesures: { version: "1.0.0", artefacts } }).length).toBeGreaterThan(0);
    expect(verifierMesures({ manifeste, mesures: enveloppe(artefacts, "9.9.9") }).length).toBeGreaterThan(0);
  });

  it("un hors-couverture DÉCLARÉ dispense du 200 — et le cliquet tombe dès qu'il répond 200", () => {
    const horsCouverture = [
      { plateforme: "windows-x86_64", motif: "release non publiee", date: "2026-08-29", leveePar: "publier la release" },
    ];
    const absent = { ...mesureOk("windows-x86_64", U_WIN), status: 404, octets: 0, signature: "non verifiee" };
    expect(
      verifierMesures({ manifeste, mesures: enveloppe([mesureOk("linux-x86_64", U_LINUX), absent]), horsCouverture }),
    ).toEqual([]);
    // CLIQUET : l'artefact redevient téléchargeable → l'exception doit être retirée.
    const violations = verifierMesures({
      manifeste,
      mesures: enveloppe([mesureOk("linux-x86_64", U_LINUX), mesureOk("windows-x86_64", U_WIN)]),
      horsCouverture,
    });
    expect(fautives(violations)).toContain("windows-x86_64");
  });
});

describe("verifierHorsCouverture — une exception ne s'ajoute pas en silence (I4bis)", () => {
  it("motif, date, condition de levée et plateforme réellement annoncée sont exigés", () => {
    const complet = [
      { plateforme: "linux-x86_64", motif: "m", date: "2026-08-29", leveePar: "l" },
    ];
    expect(verifierHorsCouverture({ manifeste, horsCouverture: complet })).toEqual([]);

    const incomplets = [
      { plateforme: "linux-x86_64", date: "2026-08-29", leveePar: "l" },
      { plateforme: "linux-x86_64", motif: "m", date: "hier", leveePar: "l" },
      { plateforme: "linux-x86_64", motif: "m", date: "2026-08-29" },
      { plateforme: "fantome-x86_64", motif: "m", date: "2026-08-29", leveePar: "l" },
    ];
    for (const h of incomplets) {
      expect(
        verifierHorsCouverture({ manifeste, horsCouverture: [h] }).length,
        `exception acceptee en silence : ${JSON.stringify(h)}`,
      ).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// L41 — VOLET A / DÉFAUT D : le prédicat de publicité attestait le FAUX.
//
// DISCIPLINE (rouge d'abord). Ces trois cas ont d'abord été capturés VERTS contre l'ancienne
// implémentation — `hote.split(":")[0]`, qui rend `"["` sur `"[::1]:3001"` : ni `127.*`, ni
// `localhost`, ni `.local`, donc « pas privé », donc PUBLIC. `I2` (`.toBe(false)`) ne se taisait
// pas : elle CERTIFIAIT qu'une boucle locale est atteignable depuis n'importe où.
//
// CE QUI A CHANGÉ (AR-2 = O3). La charge de la preuve est INVERSÉE : `estPublic` doit être
// PROUVÉE par la forme de l'hôte ; `estPrive` en est la négation. Ajouter des motifs (O1) aurait
// rejoué l'énumération qui a déjà laissé passer ces trois cas — la classe entière est supprimée.
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("estPublic / estPrive — la publicité se PROUVE, elle ne se présume pas", () => {
  it("E-3 — la boucle locale IPv6 `[::1]` est PRIVÉE (elle était déclarée publique)", () => {
    expect(estPrive("[::1]:3001"), "boucle locale IPv6 déclarée publique").toBe(true);
    expect(estPublic("[::1]:3001")).toBe(false);
  });

  it("E-4 — le nom d'hôte nu de LAN `nas` est PRIVÉ (il était déclaré public)", () => {
    expect(estPrive("nas:3001"), "nom d'hôte nu de LAN déclaré public").toBe(true);
    expect(estPublic("nas:3001")).toBe(false);
  });

  it("E-5 — l'ULA IPv6 `[fd00::1]` est PRIVÉE (elle était déclarée publique)", () => {
    expect(estPrive("[fd00::1]:3001"), "ULA IPv6 déclarée publique").toBe(true);
    expect(estPublic("[fd00::1]:3001")).toBe(false);
  });

  it("CA-3 — un hôte de forme INCONNUE est privé par DÉFAUT, jamais public", () => {
    // Le renversement de la charge, mesuré : aucune de ces formes ne prouve quoi que ce soit.
    for (const h of ["nas", "forge", "srv1:8080", "", "   ", "..", "a.b c", "http://x"]) {
      expect(estPublic(h), `forme inconnue déclarée publique : ${JSON.stringify(h)}`).toBe(false);
    }
  });

  it("l'extraction d'hôte ne découpe JAMAIS sur « : » — c'est la ligne qui produisait « [ »", () => {
    // Preuve au caractère près du défaut d'origine, figée pour qu'on ne le réintroduise pas.
    expect("[::1]:3001".split(":")[0]).toBe("[");
    // …et la preuve que le nouvel extracteur, lui, voit bien l'adresse.
    expect(estPrive("[::1]")).toBe(true);
  });

  it("§1.4 — le refus NOMME l'hôte jugé, et ce nom n'est jamais « [ »", () => {
    // C'EST ICI QUE L'EXTRACTION EST OBSERVABLE. Le renversement de charge (AR-2) rend à lui seul
    // le `split(":")` inoffensif pour le VERDICT — `"["` n'a pas de point, donc il est privé « par
    // accident ». Mais un message qui accuse `"["` au lieu de `"::1"` est inexploitable, et rien
    // ne ferait plus rougir la réintroduction du défaut. Le nom du jugé est donc ASSERTÉ.
    expect(hoteJuge("[::1]:3001")).toBe("::1");
    expect(hoteJuge("[fd00::1]:3001")).toBe("fd00::1");
    expect(hoteJuge("nas:3001")).toBe("nas");
    expect(hoteJuge("github.com")).toBe("github.com");
    expect(hoteJuge("192.168.2.11:3001")).toBe("192.168.2.11");
  });

  it("les formes RÉELLEMENT publiques restent publiques (le prédicat n'est pas un mur)", () => {
    for (const h of ["github.com", "objects.githubusercontent.com", "forge.example.org:3001"]) {
      expect(estPublic(h), `hôte public refusé : ${h}`).toBe(true);
      expect(estPrive(h)).toBe(false);
    }
  });

  it("les motifs privés HISTORIQUES restent privés (aucune régression du prédicat d'origine)", () => {
    for (const h of [
      "127.0.0.1:3001",
      "10.0.0.5",
      "192.168.2.11:3001",
      "172.16.0.1",
      "172.31.255.254",
      "localhost:3020",
      "imac.local",
    ]) {
      expect(estPrive(h), `hôte privé devenu public : ${h}`).toBe(true);
    }
  });

  it("les suffixes d'usage local et le CGNAT ne passent pas non plus", () => {
    for (const h of ["forge.lan", "srv.internal", "box.home.arpa", "100.64.0.1", "169.254.1.1"]) {
      expect(estPublic(h), `hôte d'usage local déclaré public : ${h}`).toBe(false);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// L41 — VOLET A / DÉFAUT C : la preuve n'avait pas de date.
//
// `mesureLe` n'était contraint que par `if (!mesures?.mesureLe)` : `"2020-01-01"` — et même une
// chaîne quelconque non vide — passait au vert. La borne retenue (AR-1 = O2) est RELATIVE au
// manifeste, jamais au calendrier : `mesureLe ≥ manifeste.pub_date`.
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe("verifierMesures — la preuve porte une date, et elle est POSTÉRIEURE à ce qu'elle prouve", () => {
  const artefactsOk = () => [mesureOk("linux-x86_64", U_LINUX), mesureOk("windows-x86_64", U_WIN)];

  it("CA-4 — `mesureLe: \"2020-01-01\"` passait au VERT ; il est désormais NOMMÉ", () => {
    const mesures = { mesureLe: "2020-01-01", version: "1.0.0", artefacts: artefactsOk() };
    const violations = verifierMesures({ manifeste, mesures });
    expect(violations.length, "une preuve antérieure à la publication passe encore").toBeGreaterThan(0);
    const motifs = violations.map((v) => v.motif).join(" | ");
    expect(motifs, "la date fautive n'est pas citée").toMatch(/2020-01-01/);
    expect(motifs, "la pub_date de référence n'est pas citée").toMatch(/2026-08-28/);
  });

  it("une `mesureLe` NON PARSABLE est refusée (n'importe quelle chaîne non vide passait)", () => {
    const mesures = { mesureLe: "hier matin", version: "1.0.0", artefacts: artefactsOk() };
    const motifs = verifierMesures({ manifeste, mesures })
      .map((v) => v.motif)
      .join(" | ");
    expect(motifs).toMatch(/date de mesure illisible/);
    expect(motifs).toMatch(/hier matin/);
  });

  it("une `mesureLe` ÉGALE à la pub_date est acceptée (la borne est bien ≥, pas >)", () => {
    const mesures = {
      mesureLe: manifeste.pub_date,
      version: "1.0.0",
      artefacts: artefactsOk(),
    };
    expect(verifierMesures({ manifeste, mesures })).toEqual([]);
  });

  it("un manifeste SANS `pub_date` est refusé : sans référent, la borne ne borne rien", () => {
    const sansDate = { version: "1.0.0", platforms: manifeste.platforms };
    const motifs = verifierMesures({ manifeste: sansDate, mesures: enveloppe(artefactsOk()) })
      .map((v) => v.motif)
      .join(" | ");
    expect(motifs).toMatch(/pub_date/);
  });
});
