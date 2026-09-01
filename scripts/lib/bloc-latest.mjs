// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ BYTE-IDENTIQUE entre IakaCockpit et iakaFrameGUI, inscrit a `fixtures/convergence.sha256`.   │
// │ Toute modification se fait DANS LES DEUX DEPOTS au meme commit logique, puis on regenere les │
// │ empreintes (voir l'en-tete du registre) et on rejoue les DEUX faces.                         │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// bloc-latest.mjs — EXTRACTEUR DU BLOC `latest:` DU WORKFLOW DE RELEASE (lot L44).
//
// POURQUOI IL EXISTE. Le job qui designe le pointeur de release est ECRIT DEUX FOIS, une par
// depot jumeau, et les deux copies doivent rester identiques. Mesure du 2026-08-30 (L43) : le
// bloc l'etait deja — et RIEN NE LE GARDAIT du cote iakaFrameGUI, ou aucune face de convergence
// ne couvre `.github/workflows/release.yml`. La preuve en a ete faite par mutation : un octet
// change dans ce fichier laissait les deux faces VERTES.
//
// POURQUOI PAS LE FICHIER ENTIER AU REGISTRE DE CONVERGENCE (AR-3 = (b), tranche le 2026-08-31).
// Les deux `release.yml` NE SONT PAS byte-identiques : le Cockpit ajoute trois dependances Linux
// (ligne 72) et le commentaire minisign est redige differemment (lignes 96-99). Les aligner
// obligerait a trancher EN PASSANT si le GUI doit gagner trois dependances de build — une
// decision de build, dont la preuve exigerait un run de CI. Successeur nomme :
// CONVERGENCE-RELEASE-YML-ALIGNEMENT. Ce qui doit converger n'est pas le fichier, c'est LE BLOC :
// on inscrit donc une FIXTURE qui porte son empreinte, byte-identique PAR CONSTRUCTION.
//
// EXTRACTION PAR MARQUEUR, JAMAIS PAR NUMERO DE LIGNE — c'est toute la lecon de D-2 (un
// `chemin:ligne` ment des qu'une ligne est inseree au-dessus). Le bloc va de la ligne qui vaut
// EXACTEMENT `  latest:` jusqu'a la fin du fichier, et l'unicite de cette ligne est ASSERTEE :
// si un job venait a suivre, la garde doit ROUGIR plutot que de deviner (R3, CA-11).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** Le marqueur d'ouverture du bloc, ancre a la ligne entiere (deux espaces d'indentation YAML). */
export const MARQUEUR = "  latest:";

/** Chemin du workflow, relatif a la racine du depot. */
export const CHEMIN_WORKFLOW = ".github/workflows/release.yml";

/** Chemin de la fixture qui porte l'empreinte du bloc, relatif a la racine du depot. */
export const CHEMIN_FIXTURE = "fixtures/bloc-latest.sha256";

/**
 * Extrait le bloc du texte d'un workflow. Leve une erreur NOMMEE si le marqueur n'apparait pas
 * exactement une fois — zero (le bloc a disparu ou a ete renomme) comme deux (un second job au
 * meme niveau : la regle « jusqu'a la fin du fichier » deviendrait fausse).
 * @param {string} texte contenu integral du workflow
 * @returns {string} le bloc, du marqueur inclus jusqu'a la fin du fichier
 */
export function extraireBloc(texte) {
  const lignes = texte.split("\n");
  const indices = [];
  lignes.forEach((l, i) => {
    if (l === MARQUEUR) indices.push(i);
  });
  if (indices.length !== 1) {
    throw new Error(
      `bloc-latest : le marqueur ${JSON.stringify(MARQUEUR)} apparait ${indices.length} fois dans ` +
        `${CHEMIN_WORKFLOW}, il en faut EXACTEMENT une. ` +
        (indices.length === 0
          ? "Zero : le bloc a disparu ou a ete renomme — la garde ne peut plus rien mesurer."
          : `Aux lignes ${indices.map((i) => i + 1).join(", ")} : la regle « du marqueur jusqu'a la ` +
            "fin du fichier » ne designe plus un bloc unique. RE-SPECIFIER la borne haute, " +
            "jamais deviner.") +
        " (R3 / CA-11, lot L44)",
    );
  }
  return lignes.slice(indices[0]).join("\n");
}

/** Lit le workflow a `racine` et en extrait le bloc. */
export function lireBloc(racine) {
  return extraireBloc(readFileSync(`${racine}/${CHEMIN_WORKFLOW}`, "utf8"));
}

/** Empreinte sha256 d'un bloc, en hexadecimal minuscule. */
export function empreinte(bloc) {
  return createHash("sha256").update(bloc, "utf8").digest("hex");
}

/**
 * Lit l'empreinte attendue depuis la fixture. Format : lignes `#` ignorees, puis une unique
 * ligne `<sha256>  <libelle>`. Une fixture illisible est une erreur, jamais un vert.
 */
export function empreinteAttendue(racine) {
  const brut = readFileSync(`${racine}/${CHEMIN_FIXTURE}`, "utf8");
  const lignes = brut
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lignes.length !== 1) {
    throw new Error(
      `bloc-latest : ${CHEMIN_FIXTURE} doit porter EXACTEMENT une empreinte, ` +
        `${lignes.length} trouvee(s).`,
    );
  }
  const m = lignes[0].match(/^([0-9a-f]{64})\s+(.+)$/);
  if (!m) {
    throw new Error(`bloc-latest : ligne d'empreinte illisible dans ${CHEMIN_FIXTURE} : ${lignes[0]}`);
  }
  return m[1];
}
