// pin-tauri-action.mjs — L41 / D-4 : lire ce que le workflow EPINGLE, et ce qu'il POSE.
//
// Coeur pur, sans réseau et sans système de fichiers : on lui passe le texte du workflow, il rend
// la référence de l'action et les entrées réellement écrites sous son `with:`. Le test s'en sert
// pour deux choses distinctes :
//   1. la référence est-elle un SHA de 40 caractères, et EST-CE LE NÔTRE (cliquet) ;
//   2. chaque entrée posée est-elle DÉCLARÉE par la version épinglée (dérive du jeu d'entrées).
//
// Le point 2 est celui qui manquait : GitHub Actions ignore en SILENCE une entrée inconnue. C'est
// par ce silence que `uploadUpdaterJson: false` a survécu à un gate en L40 sans rien gouverner.

/** Une référence immuable : 40 caractères hexadécimaux, et rien d'autre. */
export const estSha40 = (ref) => typeof ref === "string" && /^[0-9a-f]{40}$/.test(ref);

const RE_USES = /^(\s*)-\s+uses:\s*([^@\s]+)@(\S+)\s*(?:#\s*(.*?))?\s*$/;

/**
 * Extrait l'étape qui utilise `action` dans un workflow.
 *
 * @returns {null | { ref: string, commentaire: string|null, entrees: string[], ligne: number }}
 *   `ref` = ce qui suit le `@` ; `commentaire` = le commentaire de fin de ligne (le nom de version,
 *   par convention d'épinglage) ; `entrees` = les clés posées sous `with:`, dans l'ordre du fichier.
 */
export function etapeAction(workflowText, action) {
  const lignes = String(workflowText).split("\n");

  for (let i = 0; i < lignes.length; i++) {
    const m = RE_USES.exec(lignes[i]);
    if (!m || m[2] !== action) continue;

    const indentTiret = m[1].length;
    const res = { ref: m[3], commentaire: m[4] ?? null, entrees: [], ligne: i + 1 };

    // Le corps de l'étape : tout ce qui est PLUS indenté que le tiret, jusqu'à la prochaine étape.
    let dansWith = false;
    let indentWith = null;

    for (let j = i + 1; j < lignes.length; j++) {
      const ligne = lignes[j];
      if (ligne.trim() === "" || /^\s*#/.test(ligne)) continue; // blanc ou commentaire plein
      const indent = ligne.length - ligne.trimStart().length;
      if (indent <= indentTiret) break; // étape suivante (ou fin du bloc)

      if (!dansWith) {
        if (/^\s*with:\s*$/.test(ligne)) {
          dansWith = true;
          indentWith = indent;
        }
        continue;
      }

      if (indent <= indentWith) break; // on est sorti du `with:` (autre clé de l'étape)
      if (indent !== indentWith + 2) continue; // valeur multi-ligne d'une entrée : pas une clé

      const cle = /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:/.exec(ligne);
      if (cle) res.entrees.push(cle[1]);
    }

    return res;
  }

  return null;
}

/**
 * Les entrées posées qui ne sont PAS déclarées par la version épinglée. Une entrée qui figure ici
 * est INERTE : elle est ignorée sans un mot au moment de l'exécution.
 */
export function entreesInertes(entreesPosees, entreesDeclarees) {
  const declarees = new Set(entreesDeclarees);
  return entreesPosees.filter((e) => !declarees.has(e));
}
