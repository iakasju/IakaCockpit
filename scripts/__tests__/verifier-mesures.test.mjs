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
import { verifierMesures, verifierHorsCouverture } from "../lib/verifier-mesures.mjs";

const U_LINUX = "https://exemple.test/releases/download/v1.0.0/App_1.0.0_amd64.AppImage";
const U_WIN = "https://exemple.test/releases/download/v1.0.0/App_1.0.0_x64-setup.exe";

/** Manifeste minimal à deux plateformes, chacune sur SON artefact. */
const manifeste = {
  version: "1.0.0",
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
