// release-publication.mjs — RELEASE-PARTIELLE-PUBLIEE (2026-09-05) : GARDE STATIQUE.
//
// Coeur PUR, sur le modele exact de scripts/lib/pin-tauri-action.mjs : on lui passe le TEXTE du
// workflow, il rend des faits — jamais un acces reseau, jamais un acces disque (le point d'entree
// qui lit le fichier reel est le test, pas ce module).
//
// CE QUE CETTE GARDE VERIFIE (quatre proprietes + une cinquieme si AR-5 = (a)) :
//   1. `releaseDraft: true` est pose EXACTEMENT une fois, dans l'etape `tauri-action` du job
//      `build` (CA-R1).
//   2. Il existe un job de publication (`publier`) dont le `needs` CONTIENT le job de build de la
//      matrice (`build`) (CA-R2).
//   3. Ce job `publier` NE PORTE AUCUNE condition qui le ferait tourner sur matrice rouge (CA-R2).
//   4. Le job `latest` DEPEND du job `publier` (CA-R3).
//   5. L'entree `casser` du `workflow_dispatch` n'a d'effet QUE sous
//      `github.event_name == 'workflow_dispatch'` (CA-R7, si AR-5 = (a)).
//
// ⚠️ LIMITE DECLAREE ICI, PAS AILLEURS (CA-R6, lecon H-1 du portefeuille : « la completude d'un
// balayage est celle du MOTIF, jamais celle du SENS ») :
//   - Cette garde lit du TEXTE (des lignes, des regex d'indentation), jamais un AST YAML. Elle
//     prouve ce qui est ECRIT, JAMAIS ce qui S'EXECUTE. Un `release.yml` syntaxiquement conforme
//     a ce que la garde attend, mais dont le RUNTIME se comporterait autrement (bug de GitHub
//     Actions, faille dans `gh api`, comportement non documente de `tauri-action`), passerait
//     cette garde EN VERT sans que rien ne le trahisse ici. Seul un RUN REEL (§ 5.7 de
//     l'instruction, CA-R8/CA-R9) prouve le comportement.
//   - Propriete 3, la liste des formes de condition reconnues (`FORMES_CONDITION_MATRICE_ROUGE`)
//     est UNE LISTE FERMEE, PAS UNE COMPREHENSION DU SENS. Elle reconnait `always()`,
//     `!cancelled()`, `success() || failure()` et `failure() || success()` — LES SEULES FORMES
//     EFFECTIVEMENT VUES DANS CE PORTEFEUILLE (le `latest` des trois freres). ELLE NE COUVRE PAS :
//     une expression equivalente ecrite autrement (ex. `cancelled() == false`, un helper YAML
//     personnalise, une negation composee), ni une condition posee au niveau d'une ETAPE plutot
//     que du JOB (qui ne changerait de toute facon rien au fait que le JOB demarre). Si une future
//     mutation invente une forme non listee ici, cette garde NE LA VERRA PAS — c'est le prix du
//     MVP assume, pas une pretention a l'exhaustivite.
//   - Les noms de jobs (`build`, `publier`, `latest`) sont CODES EN DUR : cette garde est PROPRE A
//     CE workflow, pas un verificateur generique de politique de release.

import { etapeAction } from "./pin-tauri-action.mjs";

/** Noms des jobs, codes en dur (cf. limite ci-dessus). */
export const JOB_MATRICE = "build";
export const JOB_PUBLICATION = "publier";
export const JOB_LATEST = "latest";
export const ACTION_TAURI = "tauri-apps/tauri-action";

/**
 * Formes de condition RECONNUES comme laissant un job tourner sur matrice rouge. Liste FERMEE,
 * PAR MOTIF — voir la limite en tete de fichier.
 */
export const FORMES_CONDITION_MATRICE_ROUGE = [
  /always\s*\(\s*\)/,
  /!\s*cancelled\s*\(\s*\)/,
  /success\s*\(\s*\)\s*\|\|\s*failure\s*\(\s*\)/,
  /failure\s*\(\s*\)\s*\|\|\s*success\s*\(\s*\)/,
];

const RE_JOB_TOP = /^ {2}([A-Za-z0-9_-]+):\s*$/;
const RE_NEEDS = /^ {4}needs:\s*(.+)$/m;
const RE_IF = /^ {4}if:\s*(.+)$/m;
const RE_JOBS_KEY = /^jobs:\s*$/m;

/**
 * Decoupe le texte du workflow en blocs par job de premier niveau (indentation exactement deux
 * espaces sous `jobs:`). Chaque bloc va de la ligne d'entete du job jusqu'a la ligne qui precede
 * le job suivant (ou la fin du fichier).
 * @param {string} texte
 * @returns {Record<string,string>}
 */
export function extraireJobs(texte) {
  const lignes = String(texte).split("\n");
  const debutJobs = lignes.findIndex((l) => RE_JOBS_KEY.test(l));
  if (debutJobs === -1) {
    throw new Error("release-publication : aucune cle `jobs:` trouvee dans le workflow.");
  }
  const jobs = {};
  let nomCourant = null;
  let debut = null;
  for (let i = debutJobs + 1; i < lignes.length; i++) {
    const m = RE_JOB_TOP.exec(lignes[i]);
    if (m) {
      if (nomCourant) jobs[nomCourant] = lignes.slice(debut, i).join("\n");
      nomCourant = m[1];
      debut = i;
    }
  }
  if (nomCourant) jobs[nomCourant] = lignes.slice(debut).join("\n");
  return jobs;
}

/**
 * Les noms de jobs listes par un `needs:` (forme scalaire `needs: x` ou liste en flot
 * `needs: [x, y]`), dans l'ordre du fichier. Rend `[]` si le job n'a pas de `needs`.
 * @param {string} blocJob
 * @returns {string[]}
 */
export function needsDe(blocJob) {
  const m = RE_NEEDS.exec(String(blocJob));
  if (!m) return [];
  const val = m[1].trim();
  if (val.startsWith("[")) {
    return val
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [val];
}

/** La valeur du `if:` posee AU NIVEAU DU JOB (pas d'une etape), ou `null` si absente. */
export function ifDeJob(blocJob) {
  const m = RE_IF.exec(String(blocJob));
  return m ? m[1].trim() : null;
}

/**
 * `true` si la valeur d'un `if:` de job correspond a l'une des FORMES RECONNUES de condition
 * laissant tourner un job sur matrice rouge. Liste fermee — voir la limite en tete de fichier.
 * @param {string|null} valeurIf
 */
export function porteConditionMatriceRouge(valeurIf) {
  if (!valeurIf) return false;
  return FORMES_CONDITION_MATRICE_ROUGE.some((re) => re.test(valeurIf));
}

/**
 * `releaseDraft` tel que pose dans l'etape `tauri-action` du workflow : posee exactement une
 * fois (au sens global du fichier) et sa valeur textuelle.
 * @param {string} texte texte integral du workflow
 * @returns {{ etapeTrouvee: boolean, declaree: boolean, poseeUneFois: boolean, occurrences: number, valeur: string|null }}
 */
export function releaseDraftPosee(texte) {
  const etape = etapeAction(texte, ACTION_TAURI);
  const lignes = String(texte)
    .split("\n")
    .filter((l) => /^\s*releaseDraft\s*:/.test(l));
  const m = lignes.length === 1 ? /^\s*releaseDraft\s*:\s*(\S+)/.exec(lignes[0]) : null;
  return {
    etapeTrouvee: Boolean(etape),
    declaree: Boolean(etape) && etape.entrees.includes("releaseDraft"),
    poseeUneFois: lignes.length === 1,
    occurrences: lignes.length,
    valeur: m ? m[1] : null,
  };
}

/**
 * L'entree `casser` (workflow_dispatch) est-elle honoree quelque part dans le workflow avec une
 * garde d'evenement `github.event_name == 'workflow_dispatch'` explicite ? Cherche une ligne `if:`
 * qui combine cette garde d'evenement ET une lecture de `inputs.casser` — c'est la forme exacte
 * requise par § 5.5 point 5 de l'instruction (jamais `inputs.casser` seul, qui est vide sur un
 * `push` mais ne le DIT pas dans le texte du garde).
 * @param {string} texte
 */
export function entreeCasserGardeParEvenement(texte) {
  const lignes = String(texte).split("\n");
  const lignesIfCasser = lignes.filter((l) => /if:.*inputs\.casser/.test(l));
  if (lignesIfCasser.length === 0) {
    return { presente: false, gardeeParEvenement: false, lignes: [] };
  }
  const toutesGardees = lignesIfCasser.every((l) =>
    /github\.event_name\s*==\s*['"]workflow_dispatch['"]/.test(l),
  );
  return { presente: true, gardeeParEvenement: toutesGardees, lignes: lignesIfCasser };
}

/**
 * Rassemble l'ensemble des faits verifies par cette garde, a partir du texte INTEGRAL du
 * workflow. Fonction unique d'entree pour le test — jamais d'acces disque ici.
 * @param {string} texte
 */
export function etatPublication(texte) {
  const jobs = extraireJobs(texte);
  const blocPublication = jobs[JOB_PUBLICATION];
  const blocLatest = jobs[JOB_LATEST];
  const needsPublication = blocPublication ? needsDe(blocPublication) : [];
  const needsLatest = blocLatest ? needsDe(blocLatest) : [];
  const ifPublication = blocPublication ? ifDeJob(blocPublication) : null;

  return {
    releaseDraft: releaseDraftPosee(texte),
    jobPublicationExiste: Boolean(blocPublication),
    jobLatestExiste: Boolean(blocLatest),
    publicationDependDeMatrice: needsPublication.includes(JOB_MATRICE),
    publicationPorteConditionMatriceRouge: porteConditionMatriceRouge(ifPublication),
    conditionPublication: ifPublication,
    latestDependDePublication: needsLatest.includes(JOB_PUBLICATION),
    casser: entreeCasserGardeParEvenement(texte),
  };
}
