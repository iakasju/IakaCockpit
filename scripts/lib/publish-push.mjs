// publish-push.mjs — LE SEUL GESTE EXTRAIT de `publish-update.mjs` (AR-2 bornée, dette de canal).
//
// Instruction : iakaframe/specs/instructions/dette-de-canal-de-la-publication.md, AR-2.
//
// POURQUOI UN MODULE À PART, ET PAS UN EXPORT DANS `publish-update.mjs`. `publish-update.mjs` est
// un script TOP-LEVEL : il lit `process.argv` et peut appeler `process.exit()` dès ses premières
// lignes utiles — l'IMPORTER depuis un test (sous vitest, sans tag en argument) l'exécuterait et le
// ferait sortir immédiatement. `iakaFrameGUI/scripts/publish-update.mjs` évite ce piège en gardant
// son orchestration dans un `main()` appelé seulement en exécution directe ; reproduire cette forme
// ICI aurait dépassé la borne d'AR-2 (« le seul geste commit+push, et rien d'autre — ce n'est PAS
// un pas vers la convergence »). La solution retenue est plus simple : extraire le geste dans un
// fichier SANS effet de bord au chargement, importable sans rien exécuter.
//
// CE QUE CE MODULE NE FAIT PAS, DÉLIBÉRÉMENT (borne d'AR-2) : pas de `parseArgs`, pas de garde de
// branche (elle vit, inchangée, dans `assertReleaseBranch()` de `publish-update.mjs`, appelée par
// le pilote AVANT ce geste), pas de lecture de jeton, pas de release Forgejo. Juste : commit
// conditionnel, fan-out, compte rendu.
import { execFileSync } from "node:child_process";
import { formaterCompteRendu, pousserCanaux, unEchecAuMoins } from "./canaux-publication.mjs";

/**
 * `run` INJECTABLE — même contrat que `gitRun` d'iakaFrameGUI (`capture` rend la sortie au lieu de
 * la laisser filer à l'écran). C'est ce qui rend la face 1 (§ 4.1) mordante sans réseau ni dépôt
 * réel : un test peut fournir un `run` factice, ou un `run` qui pousse vraiment dans un labo git.
 */
export function gitRun(args, { cwd, capture = false } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

/**
 * Commit du manifeste **s'il a changé**, puis fan-out vers CHAQUE canal déclaré (AR-1 = b), chacun
 * INDÉPENDAMMENT (AR-4, forme de `pousserCanaux`). Si le manifeste est INCHANGÉ, RIEN n'est
 * commité NI poussé (`resultats: []`) — c'est le comportement PRÉEXISTANT d'IakaCockpit (le script
 * sortait déjà avant tout push sur un manifeste inchangé) : ce lot ne le rouvre pas, rien dans
 * l'instruction ne le demande. C'est le point de divergence assumé avec `iakaFrameGUI`, qui pousse
 * dans les deux cas (§ 6 de l'instruction : les deux scripts NE sont PAS byte-identiques, et ce
 * lot ne les aligne pas en passant).
 *
 * @param {string} tag
 * @param {string[]} canaux noms de remotes à pousser (= `registre.canaux.map(c => c.remote)`)
 * @param {string} manifestPath chemin relatif du manifeste (seul chemin que le commit prend)
 * @param {{ run?: Function, cwd: string }} opts `cwd` est REQUIS (ce module ignore tout `root`)
 * @returns {{ committed: boolean, resultats: Array<{remote:string, ok:boolean, motif:string}> }}
 */
export function commitAndPushManifest(tag, canaux, manifestPath, { run = gitRun, cwd } = {}) {
  run(["add", manifestPath], { cwd });
  const staged = run(["diff", "--cached", "--name-only", "--", manifestPath], { cwd, capture: true });
  const committed = String(staged ?? "").trim().length > 0;
  if (!committed) return { committed: false, resultats: [] };
  run(
    ["commit", "-m", `chore(release): publie le manifeste de mise a jour ${tag}`, "--", manifestPath],
    { cwd },
  );
  return { committed: true, resultats: pousserCanaux(canaux, { run, cwd }) };
}

/**
 * LA JONCTION (§ 4.1, le couplage) — compose le message final ET le code de sortie à partir des
 * résultats de push, et RIEN D'AUTRE. Extraite pour que la face 1 puisse mordre exactement ici :
 * un pilote qui réimprimerait l'ANCIENNE phrase inconditionnelle de succès (celle que CA-1
 * interdit désormais) resterait invisible à un test qui ne regarde que `formaterCompteRendu` en
 * isolation.
 *
 * @returns {{ lignes: string[], code: 0|1 }} `code` = 1 dès qu'un canal a échoué (AR-4).
 */
export function rendreCompte({ version, resultats }) {
  return { lignes: formaterCompteRendu({ version, resultats }), code: unEchecAuMoins(resultats) ? 1 : 0 };
}
