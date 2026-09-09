// deps-linux.mjs — CONVERGENCE-RELEASE-YML-ALIGNEMENT (2026-09-08) : GARDE STATIQUE (AR-Y5).
//
// Coeur PUR, sur le modele exact de scripts/lib/release-publication.mjs : on lui passe du TEXTE
// (le workflow, ou le fichier `.github/deps-linux.txt`), il rend des faits — jamais un acces
// reseau, jamais un acces disque (le point d'entree qui lit les fichiers reels est le test, pas
// ce module).
//
// CE QUE CETTE GARDE VERIFIE (trois proprietes, AR-Y5(a)) :
//   (i)   le workflow ne contient AUCUN nom de paquet apt EN DUR dans une commande
//         `apt-get install -y ...` (paquetsEnDurDansWorkflow) ;
//   (ii)  `.github/deps-linux.txt` existe, est NON VIDE, une entree par ligne (lireDeps) ;
//   (iii) ce fichier n'est PAS au registre de convergence (verifie par le test, pas ici : cette
//         fonction ne lit ni ne connait `fixtures/convergence.sha256`).
//
// ⚠️ LIMITE DECLAREE ICI, PAS AILLEURS (H-1 du portefeuille : « la completude d'un balayage est
// celle du MOTIF, jamais celle du SENS ») :
//   - `paquetsEnDurDansWorkflow` lit du TEXTE (une regex sur `apt-get install -y`), jamais un AST
//     YAML ni un runtime shell. Elle prouve ce qui est ECRIT, jamais ce qui S'EXECUTE — seule la
//     jambe d'execution (release-publier-shell.test.mjs, etape Linux) prouve que les paquets LUS
//     dans le fichier sont bien ceux PASSES a `apt-get`.
//   - Elle reconnait la forme `apt-get install -y <token> <token> ...` sur une ligne APLATIE
//     (les continuations `\` en fin de ligne sont jointes avant l'analyse). Un token commencant
//     par `$` ou `-` n'est jamais compte comme un nom de paquet (variable ou option). Une forme
//     radicalement differente d'invocation d'apt (ex. `apt install`, `aptitude`) N'EST PAS VUE —
//     ce n'est pas la convention de ce workflow.
//   - `lireDeps` ignore les lignes vides et les lignes de commentaire (`#`) : c'est la MEME regle
//     que le `xargs -r -a` qui consomme ce fichier a l'execution (le motif du fichier, jamais
//     autre chose).

/**
 * Les entrees UTILES d'un fichier `deps-linux.txt` : une par ligne, commentaires (`#`) et lignes
 * vides ignores, ordre conserve.
 * @param {string} texte
 * @returns {string[]}
 */
export function lireDeps(texte) {
  return String(texte)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

/**
 * Les noms de paquets apt EN DUR trouves dans une commande `apt-get install -y ...` du texte du
 * workflow. Rend `[]` sur le texte actuel (qui lit le fichier via `xargs`, sans argument
 * litteral sur la meme ligne). Les continuations de ligne (`\` en fin de ligne) sont aplaties
 * avant l'analyse, pour ne pas manquer un paquet ecrit sur la ligne suivante.
 * @param {string} texte texte integral du workflow
 * @returns {string[]}
 */
export function paquetsEnDurDansWorkflow(texte) {
  const aplati = String(texte).replace(/\\\r?\n[ \t]*/g, " ");
  const paquets = [];
  // [ \t]* (jamais \s*) entre `-y` et la capture : `\s` traverse les retours a la ligne, ce qui
  // aurait fait "deborder" la capture sur la ligne suivante quand `-y` finit sa propre ligne
  // (cas reel du texte actuel, qui lit le fichier via `xargs` sans rien apres `-y`) — bug trouve
  // par le test rouge d'abord de ce lot.
  const re = /apt-get[ \t]+install[ \t]+-y[ \t]*([^\n]*)/g;
  let m;
  while ((m = re.exec(aplati))) {
    const reste = m[1].trim();
    if (!reste) continue;
    for (const tok of reste.split(/\s+/)) {
      if (!tok) continue;
      if (tok.startsWith("$") || tok.startsWith("-")) continue;
      paquets.push(tok);
    }
  }
  return paquets;
}

/**
 * `true` si `chemin` est inscrit au registre de convergence (une ligne `<sha256 64 hex>
 * <chemin>`, espaces multiples tolerees). Sert la troisieme assertion de la garde neuve
 * (AR-Y5-iii) : `.github/deps-linux.txt` ne doit JAMAIS y figurer — c'est une donnee LOCALE,
 * hors convergence par nature (motif ecrit dans le fichier lui-meme).
 * @param {string} texteRegistre texte integral de `fixtures/convergence.sha256`
 * @param {string} chemin chemin relatif tel qu'il apparait dans le registre
 * @returns {boolean}
 */
export function estInscritAuRegistre(texteRegistre, chemin) {
  const echappe = String(chemin).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^[0-9a-f]{64}\\s+${echappe}\\s*$`, "m");
  return re.test(String(texteRegistre));
}
