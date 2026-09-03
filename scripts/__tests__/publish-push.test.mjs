// publish-push.test.mjs — LE SEUL GESTE EXTRAIT (AR-2 bornée), sur un labo git réel.
//
// Instruction : iakaframe/specs/instructions/dette-de-canal-de-la-publication.md.
//
// ⚠️ CE QUE CE FICHIER NE COUVRE PAS, DÉCLARÉ ET NON CACHÉ. `publish-update.mjs` est un script
// TOP-LEVEL (il lit `process.argv` dès ses premières lignes utiles) : il ne peut pas être importé
// depuis un test sans s'exécuter et sortir immédiatement (contrairement à `iakaFrameGUI`, dont
// l'orchestration vit dans un `main()` gardé — voir son test « 1. première publication », qui EST
// une preuve d'intégration bout en bout). Le point de câblage réel — l'appel, dans
// `publish-update.mjs`, de `commitAndPushManifest(tag, canauxDeclares(), MANIFEST_PATH, { cwd:
// root })` — n'est donc PAS exercé automatiquement ici. Ce qui EST prouvé : (a) que
// `commitAndPushManifest`/`rendreCompte` se comportent correctement sur un labo git réel à deux
// remotes (ci-dessous) ; (b) que `canauxDeclares()` (testé dans `canaux-publication.test.mjs` via
// `lireRegistreCanaux` sur le VRAI fichier) rend exactement `["origin", "github"]`. La JONCTION
// entre les deux — que le pilote appelle bien l'un avec la sortie de l'autre — est vérifiée par
// LECTURE DE CODE (une ligne, `commitAndPushManifest(tag, canauxDeclares(), …)`) et par le smoke
// test manuel `node scripts/publish-update.mjs vX.Y.Z --check-only` (qui exerce tout le pilote
// jusqu'à la garde d'alignement). Dit tel quel : ce n'est PAS annoncé comme couvert par un test.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { commitAndPushManifest, rendreCompte } from "../lib/publish-push.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = "updater/latest.json";

describe("commitAndPushManifest — labo git réel, DEUX remotes (dette de canal)", () => {
  /** Même forme que le labo d'iakaFrameGUI : DEUX bare remotes, aucun réseau, aucun dépôt réel. */
  function labRepo() {
    const root = mkdtempSync(join(tmpdir(), "iakacockpit-lab-"));
    const bareOrigin = join(root, "origin.git");
    const bareGithub = join(root, "github.git");
    const work = join(root, "work");
    execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", bareOrigin]);
    execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", bareGithub]);
    execFileSync("git", ["init", "--quiet", "-b", "main", work]);
    const git = (...args) => execFileSync("git", args, { cwd: work, encoding: "utf8" });
    git("config", "user.email", "lab@example.invalid");
    git("config", "user.name", "lab");
    git("remote", "add", "origin", bareOrigin);
    git("remote", "add", "github", bareGithub);
    writeFileSync(join(work, "README.md"), "lab\n");
    git("add", "-A");
    git("commit", "--quiet", "-m", "seed");
    git("push", "--quiet", "-u", "origin", "HEAD");
    git("push", "--quiet", "-u", "github", "HEAD");
    return {
      work,
      git,
      count: () => Number(git("rev-list", "--count", "HEAD").trim()),
      countOn: (bare) =>
        Number(execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: bare, encoding: "utf8" }).trim()),
      bareOrigin,
      bareGithub,
    };
  }

  function writeManifest(work, body) {
    mkdirSync(join(work, "updater"), { recursive: true });
    writeFileSync(join(work, MANIFEST_PATH), body);
  }

  const quiet = (args, { cwd }) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const lab = labRepo();

  it("1. première publication : commit + fan-out vers LES DEUX remotes", () => {
    const before = lab.count();
    writeManifest(lab.work, '{"version":"0.30.1"}\n');

    const res = commitAndPushManifest("v0.30.1", ["origin", "github"], MANIFEST_PATH, {
      run: quiet,
      cwd: lab.work,
    });
    expect(res.committed).toBe(true);
    expect(res.resultats.map((r) => r.remote)).toEqual(["origin", "github"]);
    expect(res.resultats.every((r) => r.ok)).toBe(true);
    expect(lab.count()).toBe(before + 1);
    expect(lab.git("log", "-1", "--pretty=%s").trim()).toBe(
      "chore(release): publie le manifeste de mise a jour v0.30.1",
    );
    expect(lab.git("show", "--name-only", "--pretty=", "HEAD").trim()).toBe(MANIFEST_PATH);
    expect(lab.countOn(lab.bareOrigin)).toBe(before + 1);
    expect(lab.countOn(lab.bareGithub)).toBe(before + 1);
  });

  it("2. rejeu à l'identique : AUCUN commit, AUCUN push tenté (comportement PRÉEXISTANT du dépôt)", () => {
    const after = lab.count();
    const res = commitAndPushManifest("v0.30.1", ["origin", "github"], MANIFEST_PATH, {
      run: quiet,
      cwd: lab.work,
    });
    expect(res).toEqual({ committed: false, resultats: [] });
    expect(lab.count()).toBe(after);
    expect(lab.git("status", "--porcelain").trim()).toBe("");
  });

  it("3. manifeste modifié après un rejeu : le commit + le fan-out repartent", () => {
    const after = lab.count();
    writeManifest(lab.work, '{"version":"0.30.2"}\n');
    const res = commitAndPushManifest("v0.30.2", ["origin", "github"], MANIFEST_PATH, {
      run: quiet,
      cwd: lab.work,
    });
    expect(res.committed).toBe(true);
    expect(res.resultats.every((r) => r.ok)).toBe(true);
    expect(lab.count()).toBe(after + 1);
  });

  it("4. UN SEUL canal (origin) échoue : le fan-out CONTINUE, github reçoit quand même (AR-4, forme)", () => {
    writeManifest(lab.work, '{"version":"0.30.3"}\n');
    const echecOrigin = (args, opts) => {
      if (args[0] === "push" && args[1] === "origin") {
        throw new Error("Command failed: git push origin HEAD — injoignable (simulation)");
      }
      return quiet(args, opts);
    };
    const before = lab.countOn(lab.bareGithub);
    const res = commitAndPushManifest("v0.30.3", ["origin", "github"], MANIFEST_PATH, {
      run: echecOrigin,
      cwd: lab.work,
    });
    const origin = res.resultats.find((r) => r.remote === "origin");
    const github = res.resultats.find((r) => r.remote === "github");
    expect(origin.ok).toBe(false);
    expect(origin.motif).toMatch(/injoignable/);
    expect(github.ok).toBe(true);
    expect(lab.countOn(lab.bareGithub)).toBe(before + 1);
  });
});

describe("rendreCompte — LA JONCTION (§ 4.1) entre les résultats de push et l'écran (CA-1, CA-2, CA-3)", () => {
  it("CA-1 — aucune des lignes rendues ne promet ce que le script ignore", () => {
    const { lignes } = rendreCompte({
      version: "0.32.2",
      resultats: [
        { remote: "origin", ok: true, motif: "" },
        { remote: "github", ok: true, motif: "" },
      ],
    });
    const texte = lignes.join("\n");
    expect(texte).not.toMatch(/visible des clients/i);
    expect(texte).toContain("manifeste v0.32.2");
    expect(texte).toContain("origin");
    expect(texte).toContain("github");
    expect(texte).toContain("iakaframe endpoints --app .");
  });

  it("CA-2 — le CODE DE SORTIE est 0 quand TOUS les canaux ont réussi", () => {
    expect(
      rendreCompte({
        version: "0.32.2",
        resultats: [
          { remote: "origin", ok: true, motif: "" },
          { remote: "github", ok: true, motif: "" },
        ],
      }).code,
    ).toBe(0);
  });

  it("CA-3 — UN SEUL canal en échec (origin) : le message le NOMME, nomme github comme poussé, exit ≠ 0", () => {
    const { lignes, code } = rendreCompte({
      version: "0.32.2",
      resultats: [
        { remote: "origin", ok: false, motif: "injoignable" },
        { remote: "github", ok: true, motif: "" },
      ],
    });
    const texte = lignes.join("\n");
    expect(texte).toMatch(/origin.*ECHEC.*injoignable/s);
    expect(texte).toMatch(/github\s+pousse/);
    expect(code).toBe(1);
  });

  it("AR-4 — un SEUL échec suffit à rendre le code de sortie NON NUL, quel que soit le nombre de canaux", () => {
    expect(
      rendreCompte({
        version: "0.30.0",
        resultats: [
          { remote: "origin", ok: true, motif: "" },
          { remote: "github", ok: false, motif: "refus" },
        ],
      }).code,
    ).toBe(1);
  });

  // ── CONTREFACTUEL (§ 4.1, règle 1 du chantier) — TRACÉ, PAS AUTOMATISÉ ──────────────────────
  // Voir le commentaire jumeau dans `iakaFrameGUI/scripts/publish-update.test.mjs` : la preuve que
  // cette jonction MORD est apportée par une mutation manuelle de `rendreCompte`
  // (`scripts/lib/publish-push.mjs`) qui ignore `resultats` et rend la phrase inconditionnelle —
  // les quatre tests ci-dessus rougissent, révocation prouvée au `sha256` (`git checkout --`).
});

describe("le registre réel de CE dépôt correspond à ce que le pilote pousserait", () => {
  it("fixtures/canaux-publication.json déclare origin et github, comme dans le labo ci-dessus", () => {
    const brut = JSON.parse(readFileSync(join(RACINE, "fixtures", "canaux-publication.json"), "utf8"));
    expect(brut.canaux.map((c) => c.remote)).toEqual(["origin", "github"]);
  });
});
