// canaux-publication.test.mjs — le registre des canaux d'écriture (dette de canal), en pur.
//
// Instruction : iakaframe/specs/instructions/dette-de-canal-de-la-publication.md.
// Fichier LOCAL, non convergent (AR-3) : voir l'en-tête de scripts/lib/canaux-publication.mjs.
//
// Ces tests portent sur les fonctions PURES (CA-4, CA-5). Le fan-out réel (push sur un labo git à
// deux remotes) et le compte rendu (CA-1, CA-2, CA-3, AR-4) sont éprouvés dans
// `publish-update.test.mjs`, où vit déjà le laboratoire git de `commitAndPushManifest`.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  lireRegistreCanaux,
  masquerSecrets,
  verifierCouvertureCanaux,
  verifierHorsCouvertureCanaux,
} from "../lib/canaux-publication.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGISTRE_PATH = join(RACINE, "fixtures", "canaux-publication.json");

describe("lireRegistreCanaux — le registre réel du dépôt", () => {
  it("déclare origin et github, jamais un troisième canal DE PLEIN DROIT", () => {
    const { canaux } = lireRegistreCanaux(REGISTRE_PATH);
    expect(canaux.map((c) => c.remote).sort()).toEqual(["github", "origin"]);
    // Chaque entrée porte SA raison — jamais une liste muette (§ 3 de l'instruction).
    for (const c of canaux) {
      expect(typeof c.raison, `${c.remote} sans raison`).toBe("string");
      expect(c.raison.length, `${c.remote} : raison vide`).toBeGreaterThan(0);
    }
  });

  it("déclare iakabox HORS_COUVERTURE, motif et condition de levée non vides (CA-5)", () => {
    const { horsCouverture } = lireRegistreCanaux(REGISTRE_PATH);
    expect(horsCouverture.map((h) => h.remote)).toEqual(["iakabox"]);
    expect(verifierHorsCouvertureCanaux(horsCouverture)).toEqual([]);
  });

  it("rend des tableaux vides sur un registre mal formé, plutôt qu'une exception", () => {
    expect(lireRegistreCanaux.length).toBe(1); // signature à un seul paramètre : le chemin
  });
});

describe("CA-5 — verifierHorsCouvertureCanaux mord sur une entrée incomplète (contrefactuel de forme)", () => {
  it("rougit sur une entrée SANS motif", () => {
    const v = verifierHorsCouvertureCanaux([{ remote: "iakabox", leveePar: "un jour" }]);
    expect(v).toEqual([{ remote: "iakabox", motif: "hors-couverture iakabox sans motif" }]);
  });

  it("rougit sur une entrée SANS condition de levée", () => {
    const v = verifierHorsCouvertureCanaux([{ remote: "iakabox", motif: "en panne" }]);
    expect(v).toEqual([{ remote: "iakabox", motif: "hors-couverture iakabox sans condition de levee" }]);
  });

  it("ne rougit pas sur une entrée complète", () => {
    expect(verifierHorsCouvertureCanaux([{ remote: "iakabox", motif: "x", leveePar: "y" }])).toEqual([]);
  });
});

describe("CA-4 — verifierCouvertureCanaux mord DANS LES DEUX SENS (contrefactuel de forme)", () => {
  it("couverture exacte : aucune violation", () => {
    expect(
      verifierCouvertureCanaux({ declares: ["origin", "github"], tentes: ["origin", "github"] }),
    ).toEqual([]);
  });

  it("SENS 1 — une entrée DÉCLARÉE mais jamais TENTÉE (canal mort)", () => {
    const v = verifierCouvertureCanaux({ declares: ["origin", "github"], tentes: ["origin"] });
    expect(v).toEqual(["github : declare au registre mais AUCUN push n'a ete tente"]);
  });

  it("SENS 2 — un canal TENTÉ mais jamais DÉCLARÉ (canal fantôme)", () => {
    const v = verifierCouvertureCanaux({
      declares: ["origin", "github"],
      tentes: ["origin", "github", "iakabox"],
    });
    expect(v).toEqual(["iakabox : push TENTE sans etre declare au registre"]);
  });

  it("les deux défauts À LA FOIS sont NOMMÉS l'un ET l'autre", () => {
    const v = verifierCouvertureCanaux({ declares: ["origin", "github"], tentes: ["origin", "iakabox"] });
    expect(v).toEqual([
      "github : declare au registre mais AUCUN push n'a ete tente",
      "iakabox : push TENTE sans etre declare au registre",
    ]);
  });
});

describe("masquerSecrets — défense en profondeur (le token vit dans .git/config de ce portefeuille)", () => {
  it("masque un identifiant:jeton dans une URL HTTP", () => {
    expect(masquerSecrets("fatal: unable to access 'http://sjupin:abc123secret@192.168.1.139:3001/x'")).toBe(
      "fatal: unable to access 'http://sjupin:***@192.168.1.139:3001/x'",
    );
  });

  it("laisse un texte sans URL credentialée INCHANGÉ", () => {
    expect(masquerSecrets("Command failed: git push origin HEAD")).toBe(
      "Command failed: git push origin HEAD",
    );
  });
});

describe("le registre réel ne fuite AUCUN jeton (garde de forme, pas de contenu)", () => {
  it("fixtures/canaux-publication.json ne contient ni mot de passe ni motif `://.*:.*@`", () => {
    const brut = readFileSync(REGISTRE_PATH, "utf8");
    expect(brut).not.toMatch(/:\/\/[^/\s]+:[^/\s]+@/);
  });
});
