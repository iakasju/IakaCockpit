// release-publication.test.mjs — RELEASE-PARTIELLE-PUBLIEE (2026-09-05) : LA GARDE STATIQUE.
//
// CE QU'ELLE PROUVE : le TEXTE du workflow porte les proprietes qui EMPECHENT (par construction,
// via GitHub lui-meme, cf. commentaire du job `publier` dans release.yml) qu'une release
// incomplete devienne publique. CE QU'ELLE NE PROUVE PAS : que le comportement REEL, a
// l'execution, correspond a ce texte — c'est la limite ecrite dans scripts/lib/release-
// publication.mjs (CA-R6), et la seule preuve de comportement est un RUN REEL (§ 5.7, CA-R8/CA-R9,
// hors couverture par construction, jamais declares PASS par un agent).
//
// TEMOIN POSITIF D'ABORD (CA-R4) : sans lui, « ca rougit toujours » satisferait tous les
// contrefactuels — defaut deja paye trois fois dans ce portefeuille (F-1 de L42).
//
// TOUTE MUTATION SE FAIT SUR UNE COPIE DU TEXTE, EN MEMOIRE — jamais sur le fichier versionne
// (§ 5.5 de l'instruction).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  JOB_MATRICE,
  JOB_PUBLICATION,
  JOB_LATEST,
  FORMES_CONDITION_MATRICE_ROUGE,
  extraireJobs,
  needsDe,
  ifDeJob,
  porteConditionMatriceRouge,
  releaseDraftPosee,
  entreeCasserGardeParEvenement,
  etatPublication,
} from "../lib/release-publication.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");

describe("CA-R4 — TEMOIN POSITIF : le workflow reel, NON MUTE, passe la garde", () => {
  const etat = etatPublication(WORKFLOW);

  it("releaseDraft: true est posee, exactement une fois, dans l'etape tauri-action", () => {
    expect(etat.releaseDraft.etapeTrouvee).toBe(true);
    expect(etat.releaseDraft.declaree).toBe(true);
    expect(etat.releaseDraft.poseeUneFois).toBe(true);
    expect(etat.releaseDraft.valeur).toBe("true");
  });

  it("le job `publier` existe, depend de `build`, sans condition de matrice rouge", () => {
    expect(etat.jobPublicationExiste).toBe(true);
    expect(etat.publicationDependDeMatrice).toBe(true);
    expect(etat.publicationPorteConditionMatriceRouge).toBe(false);
    expect(etat.conditionPublication).toBeNull();
  });

  it("le job `latest` depend du job `publier`", () => {
    expect(etat.jobLatestExiste).toBe(true);
    expect(etat.latestDependDePublication).toBe(true);
  });

  it("l'entree `casser` n'a d'effet que sous workflow_dispatch", () => {
    expect(etat.casser.presente).toBe(true);
    expect(etat.casser.gardeeParEvenement).toBe(true);
  });
});

describe("CA-R1 — releaseDraft: true, exactement une fois, SHA inchange", () => {
  it("le SHA epingle de tauri-action n'a pas bouge", () => {
    expect(WORKFLOW).toMatch(/tauri-action@84b9d35b5fc46c1e45415bdb6144030364f7ebc5/);
  });

  it("CONTREFACTUEL — remettre releaseDraft: false sur une COPIE fait rougir, en nommant la valeur", () => {
    const mute = WORKFLOW.replace(/releaseDraft:\s*true/, "releaseDraft: false");
    expect(mute).not.toBe(WORKFLOW);
    const etat = releaseDraftPosee(mute);
    expect(etat.poseeUneFois).toBe(true);
    expect(etat.valeur).toBe("false"); // la garde NOMME la valeur lue : ce n'est plus 'true'
    expect(etat.valeur).not.toBe("true");
  });

  it("CONTREFACTUEL — deux occurrences de releaseDraft: rendent la garde INCAPABLE de choisir", () => {
    const mute = `${WORKFLOW}\n      releaseDraft: false\n`;
    const etat = releaseDraftPosee(mute);
    expect(etat.occurrences).toBe(2);
    expect(etat.poseeUneFois).toBe(false); // la garde REFUSE de choisir plutot que de deviner
  });
});

describe("CA-R2 — le job de publication depend de `build`, sans condition de matrice rouge", () => {
  it("CONTREFACTUEL (i) — `needs: prepare` au lieu de `build` fait rougir, nomme", () => {
    const mute = WORKFLOW.replace(
      /(\n {2}publier:\n {4}needs:\s*)\[build\]/,
      "$1[prepare]",
    );
    expect(mute).not.toBe(WORKFLOW);
    const jobsMutes = extraireJobs(mute);
    const needs = needsDe(jobsMutes[JOB_PUBLICATION]);
    expect(needs).toEqual(["prepare"]);
    expect(needs.includes(JOB_MATRICE)).toBe(false); // NOMME : ne depend plus de la matrice
  });

  it("CONTREFACTUEL (ii) — ajout de `if: always()` au job `publier` fait rougir, nomme", () => {
    const mute = WORKFLOW.replace(
      /(\n {2}publier:\n {4}needs:\s*\[build\]\n)/,
      "$1    if: always()\n",
    );
    expect(mute).not.toBe(WORKFLOW);
    const jobsMutes = extraireJobs(mute);
    const cond = ifDeJob(jobsMutes[JOB_PUBLICATION]);
    expect(cond).toBe("always()");
    expect(porteConditionMatriceRouge(cond)).toBe(true); // NOMME : condition reconnue comme dangereuse
  });

  it("CONTREFACTUEL (iii) — suppression pure et simple du job `publier` fait rougir, nomme", () => {
    const jobsOriginaux = extraireJobs(WORKFLOW);
    expect(jobsOriginaux[JOB_PUBLICATION]).toBeDefined();
    const mute = WORKFLOW.replace(jobsOriginaux[JOB_PUBLICATION], "");
    const jobsMutes = extraireJobs(mute);
    expect(jobsMutes[JOB_PUBLICATION]).toBeUndefined(); // NOMME : le job a disparu
  });

  it("les trois autres formes reconnues de condition matrice-rouge rougissent aussi (liste fermee, § tete de fichier)", () => {
    expect(porteConditionMatriceRouge("!cancelled()")).toBe(true);
    expect(porteConditionMatriceRouge("success() || failure()")).toBe(true);
    expect(porteConditionMatriceRouge("failure() || success()")).toBe(true);
    expect(porteConditionMatriceRouge("success()")).toBe(false); // forme SAINE : non reconnue comme dangereuse
    for (const forme of FORMES_CONDITION_MATRICE_ROUGE) {
      expect(forme).toBeInstanceOf(RegExp);
    }
  });
});

describe("CA-R3 — le job `latest` depend du job `publier`", () => {
  it("CONTREFACTUEL — remettre `needs: build` sur `latest` fait rougir, nomme", () => {
    const mute = WORKFLOW.replace(
      /(\n {2}latest:\n {4}needs:\s*)publier/,
      "$1build",
    );
    expect(mute).not.toBe(WORKFLOW);
    const jobsMutes = extraireJobs(mute);
    const needs = needsDe(jobsMutes[JOB_LATEST]);
    expect(needs).toEqual(["build"]);
    expect(needs.includes(JOB_PUBLICATION)).toBe(false); // NOMME : latest lirait une release encore
    // brouillon (filtree, invisible), puis publier publierait APRES coup sans que personne ne
    // re-affirme le pointeur — c'est exactement le vol de `latest` decrit au § 2.2.
  });
});

describe("CA-R6 — la garde declare sa limite DANS SON PROPRE FICHIER", () => {
  it("le fichier de garde dit qu'il lit du texte, jamais le comportement", () => {
    const source = readFileSync(resolve(ROOT, "scripts/lib/release-publication.mjs"), "utf8");
    expect(source).toMatch(/LIMITE DECLAREE/);
    expect(source).toMatch(/jamais un AST YAML/);
    expect(source).toMatch(/JAMAIS ce qui S'EXECUTE/);
  });

  it("le fichier de garde ENUMERE les formes de condition reconnues, et dit ce qu'il ne couvre pas", () => {
    const source = readFileSync(resolve(ROOT, "scripts/lib/release-publication.mjs"), "utf8");
    expect(source).toMatch(/LISTE FERMEE/);
    expect(source).toMatch(/ELLE NE COUVRE PAS/);
  });
});

describe("CA-R7 — l'entree `casser` est inerte hors workflow_dispatch", () => {
  it("CONTREFACTUEL — retirer la garde d'evenement fait rougir, nomme", () => {
    const mute = WORKFLOW.replace(
      /if: github\.event_name == 'workflow_dispatch' && (github\.event\.inputs\.casser == matrix\.key)/,
      "if: $1",
    );
    expect(mute).not.toBe(WORKFLOW);
    const etat = entreeCasserGardeParEvenement(mute);
    expect(etat.presente).toBe(true);
    expect(etat.gardeeParEvenement).toBe(false); // NOMME : plus aucune garde d'evenement sur `casser`
  });

  it("CONTREFACTUEL — aucune lecture de `inputs.casser` nulle part : declaree ABSENTE, pas ignoree", () => {
    const mute = WORKFLOW.replace(
      /if: github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.casser == matrix\.key\n/,
      "",
    );
    const etat = entreeCasserGardeParEvenement(mute);
    expect(etat.presente).toBe(false);
  });
});

// CA-R10 — CORRECTIF POST-RUN-REEL 34026373514 (2026-09-06, tag v0.1.2). Le run reel a rougi a
// l'etape `publier` sur `gh: accepts 1 arg(s), received 4` : `gh api` n'a PAS d'option `--arg`
// (c'est une option de `jq`), et le motif exact `--jq --arg` sur une invocation `gh api` fait
// avaler "--arg" comme VALEUR de `--jq`, transformant le reste en arguments positionnels en
// trop. La garde par TEXTE ne pouvait pas voir le COMPORTEMENT (CA-R6) ; elle peut en revanche
// desormais INTERDIRE LE MOTIF LUI-MEME, pour qu'il ne revienne jamais silencieusement. La
// preuve de COMPORTEMENT (le bug reproduit puis corrige, en executant le script) vit dans
// scripts/__tests__/release-publier-shell.test.mjs — cette garde-ci reste TEXTUELLE, comme le
// reste du fichier, et se limite a ce qu'un texte peut prouver : l'ABSENCE du motif.
describe("CA-R10 — aucun `gh api ... --jq --arg` dans le fichier (motif exact du run 34026373514)", () => {
  /** Lignes du texte, hors commentaires (un `#` en tete apres indentation) — les commentaires
   * de ce meme fichier CITENT le motif fautif a titre d'historique (cf. l'etape `publier`) : ils
   * ne doivent pas faire rougir cette garde a leur place. */
  function lignesExecutables(texte) {
    return texte.split("\n").filter((l) => !/^\s*#/.test(l));
  }

  it("le motif `--jq --arg` n'apparait dans aucune ligne EXECUTABLE (les commentaires historiques sont exclus)", () => {
    const fautives = lignesExecutables(WORKFLOW).filter((l) => /--jq\s+--arg/.test(l));
    expect(fautives, `lignes fautives : ${JSON.stringify(fautives)}`).toEqual([]);
  });

  it("CONTREFACTUEL — reintroduire le motif exact du bug reel sur une COPIE fait rougir, nomme", () => {
    const CORRIGE = 'BROUILLONS=$(gh api "repos/$DEPOT/releases" --paginate \\\n            | jq --arg tag "$TAG"';
    const CASSE = 'BROUILLONS=$(gh api "repos/$DEPOT/releases" --paginate \\\n            --jq --arg tag "$TAG"';
    expect(WORKFLOW).toContain(CORRIGE); // si ceci echoue, la forme corrigee a change de texte
    const mute = WORKFLOW.replace(CORRIGE, CASSE);
    expect(mute).not.toBe(WORKFLOW);
    const fautives = lignesExecutables(mute).filter((l) => /--jq\s+--arg/.test(l));
    expect(fautives.length, "le motif reintroduit doit etre detecte").toBeGreaterThan(0); // NOMME
  });
});
