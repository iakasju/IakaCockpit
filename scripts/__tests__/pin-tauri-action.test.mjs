// pin-tauri-action.test.mjs — L41 / D-4 : LE CLIQUET SUR `tauri-apps/tauri-action`.
//
// Jumeau de CA-15 de L40 (cliquet sur la version du plugin updater), à une différence près : ce
// défaut-ci n'était PAS hypothétique. Le workflow épinglait `@v0` — un tag déplaçable — et posait
// `uploadUpdaterJson: false`, une entrée que la version réellement exécutée NE DÉCLARE PAS.
// GitHub Actions ignore en silence une entrée inconnue : le volet G de L40 était inopérant sur ce
// qui s'exécute, tout en ayant passé un gate.
//
// Deux gardes distinctes, et il en faut deux :
//   1. LE PIN — la référence est un SHA de 40 caractères, et c'est CELUI contre lequel on a lu.
//   2. LA DÉRIVE — chaque entrée posée est DÉCLARÉE par la version épinglée. C'est cette seconde
//      garde, et elle seule, qui aurait attrapé `uploadUpdaterJson`.
//
// HORS COUVERTURE, dit ici : ces gardes lisent le workflow et une fixture, tous deux dans le dépôt.
// Elles ne vont pas relire `action.yml` chez l'hébergeur (pas de réseau dans le gate). Elles ne
// peuvent donc PAS voir qu'on a menti dans la fixture. Elles forcent seulement à re-lire quand le
// SHA bouge — c'est exactement ce qu'un cliquet fait, et rien de plus.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { etapeAction, estSha40, entreesInertes } from "../lib/pin-tauri-action.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ACTION = "tauri-apps/tauri-action";

const PIN = JSON.parse(readFileSync(resolve(ROOT, "fixtures/tauri-action-pin.json"), "utf8"));
const WORKFLOW = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");

const ORDRE_RELECTURE =
  "Le SHA epingle de tauri-action n'est plus celui contre lequel on a LU. " +
  "RE-LIRE `action.yml` AU NOUVEAU SHA (les entrees `updater`), et RE-LIRE `src/index.ts` " +
  "pour verifier que le televersement des `.sig` reste HORS du garde `includeUpdaterJson`, " +
  "AVANT de lever cette garde — puis mettre a jour fixtures/tauri-action-pin.json.";

describe("CA-13 — le workflow epingle un referent IMMUABLE", () => {
  const etape = etapeAction(WORKFLOW, ACTION);

  it("l'etape existe et est trouvee par le lecteur", () => {
    expect(etape, `aucune etape \`uses: ${ACTION}@...\` dans le workflow`).not.toBeNull();
  });

  it("la reference est un SHA de 40 caracteres — pas un tag deplacable", () => {
    expect(
      estSha40(etape.ref),
      `\`${ACTION}@${etape.ref}\` : un tag ou une branche est DEPLACABLE. ` +
        "Epingler le SHA complet de 40 caracteres (AR-3).",
    ).toBe(true);
  });

  it("le SHA porte le nom de version en commentaire — lisible sans perdre l'immuabilite", () => {
    expect(etape.commentaire).toBe(PIN.version);
  });
});

describe("CA-14 — le cliquet : le SHA epingle est celui contre lequel on a lu", () => {
  const etape = etapeAction(WORKFLOW, ACTION);

  it("workflow et fixture designent le MEME commit", () => {
    expect(etape.ref, ORDRE_RELECTURE).toBe(PIN.sha);
  });

  it("CONTREFACTUEL — un SHA different dans la FIXTURE fait tomber la garde", () => {
    // Sur une copie de la fixture, jamais sur le workflow ni sur le fichier versionne.
    const mute = { ...PIN, sha: "0".repeat(40) };
    expect(mute.sha).not.toBe(etape.ref);
    expect(estSha40(mute.sha)).toBe(true); // bien forme, et pourtant refuse : c'est le PIN qui parle
  });
});

describe("CA-14 — le cliquet : le jeu d'entrees declare n'a pas derive", () => {
  const etape = etapeAction(WORKFLOW, ACTION);

  it("AUCUNE entree posee n'est inconnue de la version epinglee", () => {
    const inertes = entreesInertes(etape.entrees, PIN.entreesDeclarees);
    expect(
      inertes,
      `entrees IGNOREES EN SILENCE par ${ACTION}@${PIN.version} : ${inertes.join(", ")}. ` +
        "Une entree non declaree ne gouverne RIEN. " +
        ORDRE_RELECTURE,
    ).toEqual([]);
  });

  it("CONTREFACTUEL — l'entree exacte du defaut D-4 est detectee comme inerte", () => {
    // `uploadUpdaterJson` est ce que L40 avait posé. La garde le nomme.
    expect(entreesInertes(["uploadUpdaterJson"], PIN.entreesDeclarees)).toEqual([
      "uploadUpdaterJson",
    ]);
    expect(entreesInertes(["uploadUpdaterSignatures"], PIN.entreesDeclarees)).toEqual([
      "uploadUpdaterSignatures",
    ]);
  });

  it("CONTREFACTUEL — retirer une entree de la FIXTURE fait rougir sur l'entree reelle", () => {
    const mute = PIN.entreesDeclarees.filter((e) => e !== "includeUpdaterJson");
    expect(entreesInertes(etape.entrees, mute)).toEqual(["includeUpdaterJson"]);
  });
});

describe("CA-15 — la preuve est datee de sa source", () => {
  it("la fixture porte le SHA, le nom de version, l'empreinte de l'action.yml et la date de lecture", () => {
    expect(estSha40(PIN.sha)).toBe(true);
    expect(PIN.version).toMatch(/^action-v\d+\.\d+\.\d+$/);
    expect(PIN.actionYmlSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(PIN.luLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PIN.tagsPointantSurCeSha).toContain("v0"); // le tag mouvant d'où l'on vient
  });

  it("les trois entrees `updater` sont TRANCHEES : deux declarees, deux absentes", () => {
    expect(PIN.entreesDeclarees).toContain("includeUpdaterJson");
    expect(PIN.entreesDeclarees).toContain("updaterJsonKeepUniversal");
    expect(PIN.entreesDeclarees).toContain("updaterJsonPreferNsis");
    for (const absente of PIN.entreesAbsentesVerifiees) {
      expect(PIN.entreesDeclarees).not.toContain(absente);
    }
    expect(PIN.entreesAbsentesVerifiees).toEqual(["uploadUpdaterJson", "uploadUpdaterSignatures"]);
  });

  it("le constat sur les `.sig` est ecrit, et il est lie a la source — pas a un defaut d'entree", () => {
    expect(PIN.constatsLusDansLaSourceDuSha.sig).toMatch(/src\/index\.ts:212/);
    expect(PIN.constatsLusDansLaSourceDuSha.sig).toMatch(/HORS du `?if \(includeUpdaterJson\)`?/);
  });
});

describe("D-4 — le workflow pose l'entree que la version epinglee CONNAIT", () => {
  const etape = etapeAction(WORKFLOW, ACTION);

  it("`includeUpdaterJson` est posee, `uploadUpdaterJson` ne l'est plus", () => {
    expect(etape.entrees).toContain("includeUpdaterJson");
    expect(etape.entrees).not.toContain("uploadUpdaterJson");
  });

  it("le manifeste concurrent est bien coupe : la valeur posee est `false`", () => {
    expect(WORKFLOW).toMatch(/^\s*includeUpdaterJson:\s*false\s*$/m);
  });
});
