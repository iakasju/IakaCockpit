// release-publier-shell.test.mjs — LA JAMBE « EXECUTION » du gate CI, absente jusqu'ici.
//
// CONTEXTE (run REEL 34026373514, tag v0.1.2, 2026-09-06) : `prepare` OK (brouillon cree par
// id), les 4 builds VERTS, 9 assets deposes sur le brouillon, puis l'etape « Publier le
// brouillon (par id, jamais par tag) » du job `publier` a RENDU :
//
//   gh: accepts 1 arg(s), received 4
//
// CAUSE : `gh api "repos/$DEPOT/releases" --paginate --jq --arg tag "$TAG" '[...]'` — `gh api`
// N'A PAS d'option `--arg` (c'est une option de `jq`). `--jq` a avale `--arg` comme SA valeur ;
// les trois tokens suivants (`tag`, la valeur de `$TAG`, le filtre jq) sont alors devenus des
// arguments POSITIONNELS de `gh api`, qui n'en accepte qu'un (l'endpoint) : 1 (l'endpoint) + 3 =
// 4 positionnels -> exactement le message observe. Resultat cote politique
// RELEASE-PARTIELLE-PUBLIEE : la release est restee en BROUILLON, `latest` (job `if: always()`,
// filtre `select(.draft|not)`) a rendu SUCCESS SANS RIEN AVANCER — le fail-safe a tenu (aucune
// release incomplete n'est devenue visible), mais la publication attendue n'a pas eu lieu.
//
// POURQUOI LA GARDE STATIQUE (release-publication.test.mjs / release-publication.mjs) NE
// POUVAIT PAS VOIR CA : elle lit le TEXTE du workflow (jobs, `needs`, `if`, presence de
// `releaseDraft`), jamais son COMPORTEMENT — c'est ecrit noir sur blanc dans sa propre limite
// (CA-R6). Un `gh api --jq --arg ...` syntaxiquement present et bien indente passe cette garde
// EN VERT sans qu'elle puisse deviner que `gh` le refusera a l'execution. Seul un RUN REEL (CA-
// R8/R9, prouve une fois) ou une EXECUTION LOCALE du meme texte, avec un `gh` qui se comporte
// comme le vrai sur ce point precis, peut le voir. C'est cette seconde jambe que ce fichier
// ajoute — jamais un remplacement du run reel, un COMPLEMENT qui tourne sans reseau ni jeton.
//
// METHODE : on EXTRAIT le script shell de chaque etape concernee directement depuis le TEXTE
// ACTUEL de `.github/workflows/release.yml` (extraction PAR MARQUEUR, jamais par numero de
// ligne — meme discipline que `extraireJobs`/`extraireBloc` ailleurs dans ce depot), et on
// l'EXECUTE en `bash -c` avec un FAUX `gh` place en tete de PATH. Ce faux `gh` :
//   - reproduit la meme regle d'arite que le vrai sur `gh api` (un SEUL argument positionnel,
//     l'endpoint — toute option non reconnue, y compris `--arg`, est avalee comme VALEUR de
//     l'option precedente si elle en attend une, exactement le mecanisme du bug reel) ;
//   - simule un petit "monde" de releases (fichier JSON local, jamais de reseau) pour repondre
//     aux lectures/creations/PATCH ;
//   - journalise CHAQUE invocation, pour verifier apres coup CE QUI A ETE APPELE (un seul PATCH
//     par id, aucun appel adresse par tag).
// AUCUN faux `jq` : le VRAI `jq` du poste est utilise (`which jq`) — s'il est absent, les tests
// de ce fichier sont SKIP, EXPLICITEMENT nommes comme tels (jamais un vert silencieux).
//
// CE QUE CE FICHIER NE PROUVE PAS : que le VRAI `gh` de GitHub Actions se comporte exactement
// comme ce double sur CHAQUE detail d'implementation (formats de pagination, codes d'erreur
// HTTP reels, etc.). Il prouve UNE chose precise et suffisante : la meme regle d'arite
// (« un seul argument positionnel pour `gh api`, tout le reste doit passer par une option
// reconnue ») qui a fait rougir le run reel. C'est exactement la meme discipline de limite
// declaree que `release-publication.mjs` (CA-R6) — ecrite ici, pas ailleurs.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extraireJobs } from "../lib/release-publication.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHEMIN_WORKFLOW = ".github/workflows/release.yml";
const WORKFLOW = readFileSync(resolve(ROOT, CHEMIN_WORKFLOW), "utf8");

/**
 * Extrait le corps du `run: |` d'UNE etape, reperee par une ligne d'entete (`- id: x` ou
 * `- name: x`) qui matche `ancreRegex`, a l'interieur d'UN bloc de job deja isole par
 * `extraireJobs`. Borne haute : la prochaine etape du MEME job (ligne a 6 espaces suivie de
 * `- `), ou la fin du bloc. PAR MARQUEUR, jamais par numero de ligne (meme discipline que
 * `extraireBloc` de `scripts/lib/bloc-latest.mjs`).
 * @param {string} blocJob
 * @param {RegExp} ancreRegex
 * @returns {string}
 */
function extraireEtapeRun(blocJob, ancreRegex) {
  const lignes = blocJob.split("\n");
  const iAncre = lignes.findIndex((l) => ancreRegex.test(l));
  if (iAncre === -1) {
    throw new Error(`release-publier-shell : ancre introuvable (${ancreRegex}) — l'etape a-t-elle ete renommee ?`);
  }
  let iFinEtape = lignes.length;
  for (let i = iAncre + 1; i < lignes.length; i++) {
    if (/^ {6}-\s/.test(lignes[i])) {
      iFinEtape = i;
      break;
    }
  }
  const etape = lignes.slice(iAncre, iFinEtape);
  const iRun = etape.findIndex((l) => /^ {8}run:\s*\|\s*$/.test(l));
  if (iRun === -1) {
    throw new Error(`release-publier-shell : aucun "run: |" trouve pour l'etape ${ancreRegex}.`);
  }
  const corps = [];
  for (let i = iRun + 1; i < etape.length; i++) {
    const l = etape[i];
    if (l.trim() === "") {
      corps.push("");
      continue;
    }
    if (/^ {10}/.test(l)) {
      corps.push(l.slice(10));
      continue;
    }
    break;
  }
  return corps.join("\n");
}

const JOBS = extraireJobs(WORKFLOW);
const SCRIPT_PREPARE_ACTUEL = extraireEtapeRun(JOBS.prepare, /^ {6}-\s*id:\s*brouillon\s*$/);
const SCRIPT_PUBLIER_ACTUEL = extraireEtapeRun(JOBS.publier, /^ {6}-\s*name:\s*Publier le brouillon/);
const SCRIPT_LATEST_ACTUEL = extraireEtapeRun(JOBS.latest, /^ {6}-\s*name:\s*Designer explicitement le latest/);

// Copie FIGEE, EN DUR, du script EXACT de l'etape `publier` TEL QUE MESURE au run 34026373514
// (AVANT correctif) — jamais re-extraite depuis le fichier reel (qui, une fois corrige, ne le
// porte plus). Sert de temoin historique PERMANENT : meme si `release.yml` change encore de
// forme demain, ce texte-ci continue de prouver que CE bug precis rougissait bien de cette
// facon. Recopie verbatim des lignes lues au run reel (cf. instruction Aragorn 2026-09-06).
const SCRIPT_PUBLIER_AVANT_CORRECTIF_34026373514 = `set -euo pipefail
BROUILLONS=$(gh api "repos/$DEPOT/releases" --paginate \\
  --jq --arg tag "$TAG" '[.[] | select(.draft == true and .tag_name == $tag)]')
N=$(echo "$BROUILLONS" | jq 'length')

if [ "$N" -eq 0 ]; then
  echo "::error::aucun brouillon trouve pour le tag $TAG sur $DEPOT — rien a publier."
  exit 1
fi

if [ "$N" -gt 1 ]; then
  echo "::error::course F8"
  exit 1
fi

ID=$(echo "$BROUILLONS" | jq -r '.[0].id')
AVANT=$(gh api "repos/$DEPOT/releases/$ID" --jq '{draft,tag_name,n:(.assets|length)}')
echo "avant publication : $AVANT"

gh api -X PATCH "repos/$DEPOT/releases/$ID" -F draft=false > /dev/null

APRES=$(gh api "repos/$DEPOT/releases/$ID" --jq '{draft,tag_name,n:(.assets|length)}')
echo "apres publication: $APRES"
`;

// --- le faux `gh` : un seul fichier, ecrit dans un dossier temporaire, place en tete de PATH.
// Reproduit UNE regle du vrai `gh api` (un seul argument positionnel), simule un petit monde de
// releases en JSON local, et journalise chaque appel. Aucune ecriture ici : ce n'est QUE le
// contenu source ecrit par `beforeAll`, jamais execute par le process de test lui-meme.
const FAKE_GH_SOURCE = [
  "#!/usr/bin/env node",
  'import { readFileSync, writeFileSync, appendFileSync } from "node:fs";',
  'import { execFileSync } from "node:child_process";',
  "",
  "const args = process.argv.slice(2);",
  "const LOG = process.env.GH_FAKE_LOG;",
  "const WORLD_PATH = process.env.GH_FAKE_WORLD;",
  "if (!LOG || !WORLD_PATH) {",
  '  console.error("fake gh : GH_FAKE_LOG et GH_FAKE_WORLD sont requis.");',
  "  process.exit(2);",
  "}",
  'appendFileSync(LOG, JSON.stringify(args) + "\\n");',
  "",
  "function lireMonde() {",
  '  return JSON.parse(readFileSync(WORLD_PATH, "utf8"));',
  "}",
  "function ecrireMonde(m) {",
  "  writeFileSync(WORLD_PATH, JSON.stringify(m, null, 2));",
  "}",
  "function appliquerJq(valeur, expr) {",
  "  if (!expr) return JSON.stringify(valeur);",
  '  return execFileSync("jq", ["-r", expr], { input: JSON.stringify(valeur), encoding: "utf8" }).replace(/\\n$/, "");',
  "}",
  "",
  "const [sous] = args;",
  "",
  'if (sous === "api") {',
  "  const reste = args.slice(1);",
  '  let method = "GET";',
  '  let jqExpr = "";',
  "  const champs = {};",
  "  const positionnels = [];",
  "  for (let i = 0; i < reste.length; i++) {",
  "    const tok = reste[i];",
  '    if (tok === "-X") { method = reste[++i]; continue; }',
  '    if (tok === "--paginate") continue;',
  '    if (tok === "--jq") { jqExpr = reste[++i]; continue; }',
  '    if (tok === "-f" || tok === "-F") {',
  "      const kv = reste[++i];",
  '      const idx = kv.indexOf("=");',
  "      champs[kv.slice(0, idx)] = kv.slice(idx + 1);",
  "      continue;",
  "    }",
  "    positionnels.push(tok);",
  "  }",
  "  if (positionnels.length !== 1) {",
  '    console.error("gh: accepts 1 arg(s), received " + positionnels.length);',
  "    process.exit(1);",
  "  }",
  "  const endpoint = positionnels[0];",
  "  const monde = lireMonde();",
  "",
  '  if (method === "GET" && /\\/releases$/.test(endpoint)) {',
  '    process.stdout.write(appliquerJq(monde.releases, jqExpr) + "\\n");',
  "    process.exit(0);",
  "  }",
  '  if (method === "GET" && /\\/releases\\/latest$/.test(endpoint)) {',
  "    const r = monde.releases.find((x) => x.tag_name === monde.latestTag);",
  "    if (!r) {",
  '      console.error("gh: 404 (aucun latest)");',
  "      process.exit(1);",
  "    }",
  '    process.stdout.write(appliquerJq(r, jqExpr) + "\\n");',
  "    process.exit(0);",
  "  }",
  '  const mId = endpoint.match(/\\/releases\\/(\\d+)$/);',
  '  if (method === "GET" && mId) {',
  "    const id = Number(mId[1]);",
  "    const r = monde.releases.find((x) => x.id === id);",
  "    if (!r) {",
  '      console.error("gh: 404 (id " + id + " introuvable)");',
  "      process.exit(1);",
  "    }",
  '    process.stdout.write(appliquerJq(r, jqExpr) + "\\n");',
  "    process.exit(0);",
  "  }",
  '  if (method === "POST" && /\\/releases$/.test(endpoint)) {',
  "    const id = monde.releases.length ? Math.max(...monde.releases.map((x) => x.id)) + 1 : 1;",
  "    const r = {",
  "      id,",
  "      tag_name: champs.tag_name,",
  "      name: champs.name,",
  "      target_commitish: champs.target_commitish,",
  '      draft: champs.draft === "true",',
  '      prerelease: champs.prerelease === "true",',
  "      assets: [],",
  "    };",
  "    monde.releases.push(r);",
  "    ecrireMonde(monde);",
  '    process.stdout.write(appliquerJq(r, jqExpr) + "\\n");',
  "    process.exit(0);",
  "  }",
  '  if (method === "PATCH" && mId) {',
  "    const id = Number(mId[1]);",
  "    const r = monde.releases.find((x) => x.id === id);",
  "    if (!r) {",
  '      console.error("gh: 404 (id " + id + " introuvable)");',
  "      process.exit(1);",
  "    }",
  '    if ("draft" in champs) r.draft = champs.draft === "true";',
  '    if ("prerelease" in champs) r.prerelease = champs.prerelease === "true";',
  "    ecrireMonde(monde);",
  '    process.stdout.write(appliquerJq(r, jqExpr) + "\\n");',
  "    process.exit(0);",
  "  }",
  '  console.error("fake gh : endpoint/methode non simule : " + method + " " + endpoint);',
  "  process.exit(2);",
  "}",
  "",
  'if (sous === "release") {',
  "  const action = args[1];",
  '  if (action === "edit") {',
  "    const tag = args[2];",
  '    const noop = process.env.GH_FAKE_EDIT_NOOP === "1";',
  "    const monde = lireMonde();",
  "    if (!noop) {",
  "      monde.latestTag = tag;",
  "      ecrireMonde(monde);",
  "    }",
  '    process.stdout.write("https://example.invalid/releases/" + tag + "\\n");',
  "    process.exit(0);",
  "  }",
  "}",
  "",
  'console.error("fake gh : sous-commande non simulee : " + sous);',
  "process.exit(2);",
  "",
].join("\n");

function jqDisponible() {
  const r = spawnSync("which", ["jq"]);
  return r.status === 0;
}
const JQ_OK = jqDisponible();

let binDir;
beforeAll(() => {
  binDir = mkdtempSync(join(tmpdir(), "release-publier-shell-bin-"));
  const cheminGh = join(binDir, "gh");
  writeFileSync(cheminGh, FAKE_GH_SOURCE);
  chmodSync(cheminGh, 0o755);
});
afterAll(() => {
  if (binDir) rmSync(binDir, { recursive: true, force: true });
});

/**
 * Rejoue un script shell d'etape avec le faux `gh` en tete de PATH, un "monde" de releases
 * initial, et rend { status, stdout, stderr, appels, monde, sortieGithubOutput }.
 * @param {string} script
 * @param {{ monde?: object, vars?: Record<string,string>, editNoop?: boolean }} options
 */
function rejouer(script, { monde, vars = {}, editNoop = false } = {}) {
  const scratch = mkdtempSync(join(tmpdir(), "release-publier-shell-run-"));
  const log = join(scratch, "log.jsonl");
  const world = join(scratch, "world.json");
  const sortie = join(scratch, "github-output.txt");
  writeFileSync(log, "");
  writeFileSync(world, JSON.stringify(monde ?? { releases: [], latestTag: null }));
  writeFileSync(sortie, "");

  const resultat = spawnSync("bash", ["-c", script], {
    cwd: scratch,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GH_FAKE_LOG: log,
      GH_FAKE_WORLD: world,
      GH_FAKE_EDIT_NOOP: editNoop ? "1" : "0",
      GITHUB_OUTPUT: sortie,
      ...vars,
    },
  });

  const appels = readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const mondeApres = JSON.parse(readFileSync(world, "utf8"));
  const sortieGithubOutput = readFileSync(sortie, "utf8");
  rmSync(scratch, { recursive: true, force: true });

  return { ...resultat, appels, monde: mondeApres, sortieGithubOutput };
}

/** `true` si un appel journalise adresse la ressource par TAG plutot que par id. */
function contientAppelParTag(appels, tag) {
  return appels.some((a) => a.some((tok) => typeof tok === "string" && tok.includes(`/releases/${tag}`)));
}

describe.skipIf(!JQ_OK)(
  JQ_OK
    ? "release-publier-shell — jambe EXECUTION (jq present)"
    : "release-publier-shell — SKIP EXPLICITE : `jq` absent du PATH, cette jambe ne peut pas tourner",
  () => {
    describe("etape `publier` (job publier, run 34026373514)", () => {
      it("NOMINAL — texte ACTUEL du workflow : exit 0, un seul PATCH par id, aucun appel par tag", () => {
        const monde = {
          releases: [
            {
              id: 42,
              tag_name: "v9.9.9-test",
              name: "v9.9.9-test",
              target_commitish: "deadbeef",
              draft: true,
              prerelease: false,
              assets: new Array(9).fill(0),
            },
          ],
          latestTag: "v0.1.1",
        };
        const r = rejouer(SCRIPT_PUBLIER_ACTUEL, {
          monde,
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9-test" },
        });

        expect(r.status, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`).toBe(0);

        const patches = r.appels.filter(
          (a) => a[0] === "api" && a.includes("PATCH") && a.includes("draft=false"),
        );
        expect(patches.length, JSON.stringify(r.appels)).toBe(1);
        expect(patches[0].some((tok) => tok.includes("releases/42"))).toBe(true);

        expect(contientAppelParTag(r.appels, "v9.9.9-test"), JSON.stringify(r.appels)).toBe(false);
        expect(r.monde.releases[0].draft).toBe(false);
      });

      it("CONTREFACTUEL — le texte D'AVANT LE CORRECTIF (run 34026373514) rougit sur 'accepts 1 arg(s)'", () => {
        const r = rejouer(SCRIPT_PUBLIER_AVANT_CORRECTIF_34026373514, {
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9-test" },
        });
        expect(r.status).toBe(1);
        const sortie = `${r.stdout}${r.stderr}`;
        expect(sortie, sortie).toMatch(/accepts 1 arg\(s\), received 4/);
      });
    });

    describe("etape `prepare` (job prepare, id: brouillon — creation par API, export de l'id)", () => {
      it("NOMINAL — texte ACTUEL du workflow : exit 0, un brouillon cree, id exporte sur $GITHUB_OUTPUT", () => {
        const r = rejouer(SCRIPT_PREPARE_ACTUEL, {
          monde: { releases: [], latestTag: null },
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9-test", SHA: "deadbeef" },
        });

        expect(r.status, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`).toBe(0);
        expect(r.monde.releases.length).toBe(1);
        const cree = r.monde.releases[0];
        expect(cree.tag_name).toBe("v9.9.9-test");
        expect(cree.draft).toBe(true);
        expect(cree.prerelease).toBe(false);
        expect(r.sortieGithubOutput).toMatch(new RegExp(`release_id=${cree.id}$`, "m"));
      });

      it("CONTREFACTUEL (classe du meme defaut, PREVENTIF — jamais observe ici en vrai) — reintroduire `--jq --arg` sur cette etape rougit aussi", () => {
        // `prepare` n'a JAMAIS porte ce defaut au run reel (son `--jq .id` est statique, sans
        // interpolation) : ce contrefactuel ne rejoue pas un incident mesure, il prouve que la
        // MEME classe de defaut (celle du run 34026373514), si elle apparaissait un jour ICI,
        // serait vue par cette jambe d'execution — pas seulement par la garde de texte.
        const mute = SCRIPT_PREPARE_ACTUEL.replace("--jq .id)", '--jq --arg x y .id)');
        expect(mute).not.toBe(SCRIPT_PREPARE_ACTUEL);
        const r = rejouer(mute, {
          monde: { releases: [], latestTag: null },
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9-test", SHA: "deadbeef" },
        });
        expect(r.status).toBe(1);
        expect(`${r.stdout}${r.stderr}`).toMatch(/accepts 1 arg\(s\), received 4/);
      });
    });

    describe("etape `latest` (job latest — referent filtrant les brouillons)", () => {
      // Tag de semver PROPRE (sans suffixe) : le script filtre par
      // `grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$'` avant `sort -V` — un tag "-test" en serait exclu,
      // ce qui fausserait cette caracterisation (pas un bug du script, une contrainte du test).
      const mondeBase = () => ({
        releases: [
          { id: 1, tag_name: "v0.1.1", draft: false, prerelease: false, assets: [] },
          { id: 2, tag_name: "v9.9.9", draft: false, prerelease: false, assets: [] },
        ],
        latestTag: "v0.1.1",
      });

      it("NOMINAL — texte ACTUEL du workflow : le tag publie EST le plus haut semver -> latest maitrise", () => {
        const r = rejouer(SCRIPT_LATEST_ACTUEL, {
          monde: mondeBase(),
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9" },
        });
        expect(r.status, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`).toBe(0);
        expect(r.stdout).toMatch(/latest maitrise/);
        expect(r.monde.latestTag).toBe("v9.9.9");
      });

      it("CONTREFACTUEL — `gh release edit` reussit MAIS ne change rien (derive d'API simulee) : la verification finale du script le rattrape et rougit, nomme", () => {
        const r = rejouer(SCRIPT_LATEST_ACTUEL, {
          monde: mondeBase(),
          vars: { DEPOT: "acme/test-depot", TAG: "v9.9.9" },
          editNoop: true,
        });
        expect(r.status).toBe(1);
        const sortie = `${r.stdout}${r.stderr}`;
        expect(sortie, sortie).toMatch(/latest effectif \(v0\.1\.1\) n'est pas le plus haut semver \(v9\.9\.9\)/);
        // la derive n'est pas maquillee : le monde simule montre bien que rien n'a change.
        expect(r.monde.latestTag).toBe("v0.1.1");
      });
    });
  },
);
