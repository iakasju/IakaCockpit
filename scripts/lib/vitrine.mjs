// vitrine.mjs — LE GENERATEUR DE LA SECTION « Installation » DU README. Fonction pure, zero I/O,
// zero reseau, deterministe.
//
// ┌─ FICHIER CONVERGENT ─────────────────────────────────────────────────────────────────────────┐
// │ Byte-identique dans IakaCockpit et iakaFrameGUI, inscrit dans `fixtures/convergence.sha256`.  │
// │ Il ne nomme aucune des deux applications : tout ce qui les distingue arrive en ARGUMENT,      │
// │ depuis `fixtures/vitrine-locale.json`. C'est ce qui le rend convergent.                       │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// LE DEFAUT FERME ICI (L42, defauts H-1 et H-4). La section « Installation » des trois README du
// portefeuille etait de la PROSE RECOPIEE A LA MAIN : un numero de version en quatre endroits et un
// tableau de noms de fichiers versionnes. Elle se perimait en silence, et rien ne rougissait. Le
// 2026-08-29, mesure en anonyme : IakaCockpit annoncait v0.31.2 en portant 0.32.1, iakaFrameGUI
// annoncait v0.1.4 en portant 0.1.7, et la CLI annoncait v0.20.4 en portant 0.39.0. La regle posee
// ici est une seule phrase : LA VERSION ANNONCEE EST DERIVEE, JAMAIS RECOPIEE.
//
// LA LIMITE DE CE FICHIER, DITE ICI PLUTOT QUE DECOUVERTE PLUS TARD (risque R1 de l'instruction).
// Ce generateur produit des noms A PARTIR D'UNE TABLE. La garde LOCALE qui le rejoue compare donc
// DEUX DERIVES DE LA MEME TABLE : si le bundler change sa convention de nommage, le README ment de
// nouveau et la face locale reste VERTE. Elle n'est pas fausse, elle est incomplete par
// construction. CE QUI FERME LE TROU : `scripts/vitrine-en-ligne.mjs`, seule face a confronter la
// table au monde reel (E-3/E-4). Sans elle, ce fichier n'est qu'un mensonge coherent.
//
// AR-1 = (a) : LE README EST UN PORTEUR. Il annonce la version que LE DEPOT PORTE, pas la derniere
// publiee. C'est la seule option verifiable HORS LIGNE, donc la seule detectable dans le gate. Prix
// assume et declare : entre le bump et la fin du run CI, le README annonce une version dont la
// release n'a pas encore ses binaires (risque R4). La fenetre se ferme a la fin du run.

/** Marqueurs de zone. Une zone NOMMEE : un seul mecanisme, plusieurs endroits du README. */
export const debutZone = (nom) => `<!-- vitrine:debut:${nom} -->`;
export const finZone = (nom) => `<!-- vitrine:fin:${nom} -->`;

/**
 * L'OUVERTURE d'un bloc d'ABSENCE DECLAREE, ecrite par le generateur ET relue par les gardes.
 *
 * UNE SEULE SOURCE POUR LES DEUX GESTES, deliberement : si la lecture recopiait cette phrase, elle
 * deviendrait la deuxieme source de verite — donc la premiere a diverger, et le jour ou elle
 * divergerait, TOUT le README redeviendrait « promesse » ou plus rien ne le serait. Modifier ce
 * texte deplace les deux cotes ensemble.
 */
export const SENTINELLE_ABSENTS = "> **⚠️ Non fourni pour ";

/**
 * Substitue `{APP}` et `{V}` dans un motif. Rien d'autre n'est interprete : un motif est une
 * chaine, pas un gabarit generaliste — moins il en fait, moins il peut mentir.
 */
export function substituer(motif, { app, version }) {
  return String(motif).replaceAll("{APP}", app).replaceAll("{V}", version);
}

/**
 * Les noms d'artefacts ATTENDUS pour une version, par cle de plateforme.
 * @returns {Record<string,string>} cle -> nom de fichier
 */
export function nomsAttendus(plateformes, { app, version }) {
  const out = {};
  for (const p of plateformes) out[p.cle] = substituer(p.motif, { app, version });
  return out;
}

/**
 * Les motifs HORS VITRINE, substitues. Sert a la face en ligne (E-4) : ce qu'elle a le droit de ne
 * pas trouver dans le README sans rougir. Enumere NOMMEMENT dans `fixtures/vitrine-assets.json` —
 * un `*` en tete vaut suffixe (`*.sig`).
 */
export function estHorsVitrine(nom, horsVitrine, { app, version }) {
  for (const cle of Object.keys(horsVitrine)) {
    if (cle === "//") continue;
    if (cle.startsWith("*")) {
      if (nom.endsWith(cle.slice(1))) return cle;
    } else if (nom === substituer(cle, { app, version })) {
      return cle;
    }
  }
  return null;
}

/**
 * Rend la ZONE « binaires » : la version scellee, le tableau des telechargements, et — c'est le
 * coeur du lot — le bloc des ABSENTS DECLARES.
 *
 * `absents` est le champ qui EMPECHE DE MENTIR. Une plateforme de la table dont l'artefact n'existe
 * pas sur la release n'est pas affichee comme telechargeable : elle apparait en clair comme NON
 * FOURNIE, avec son motif et sa condition de levee. C'est ainsi que le DMG manquant d'IakaCockpit
 * devient VISIBLE au lieu d'etre promis. La phrase « Tous les systemes sont couverts » n'est emise
 * QUE lorsque la liste des absents est vide : elle cesse d'etre un slogan pour devenir un constat.
 */
export function rendreBinaires({ app, depot, version, plateformes, absents = [] }) {
  const tag = `v${version}`;
  const urlTag = `https://github.com/${depot}/releases/tag/${tag}`;
  const urlToutes = `https://github.com/${depot}/releases`;
  const absentsParCle = new Map(absents.map((a) => [a.cle, a]));
  const fournies = plateformes.filter((p) => !absentsParCle.has(p.cle));

  const l = [];
  l.push(`La version scellée courante est **[${tag}](${urlTag})** — voir`);
  l.push(`[toutes les versions](${urlToutes}).`);
  l.push("");
  l.push("### Binaires prêts à l'emploi");
  l.push("");
  if (absents.length === 0) {
    l.push("Tous les systèmes sont couverts. Prenez le fichier de votre plateforme sur la");
  } else {
    l.push("Prenez le fichier de votre plateforme sur la");
  }
  l.push(`[page de la release](${urlTag}) :`);
  l.push("");
  l.push("| Système | Fichier à télécharger |");
  l.push("|---|---|");
  for (const p of fournies) {
    l.push(`| **${p.libelle}** | \`${substituer(p.motif, { app, version })}\` |`);
  }
  if (absents.length > 0) {
    // Le libelle ET le motif de fichier sont DERIVES de la table : une declaration d'absence ne
    // recopie jamais un nom de fichier, sans quoi elle deviendrait la deuxieme source de verite —
    // et la premiere a diverger. Une cle inconnue de la table est un REFUS, pas une ligne muette.
    const parCle = new Map(plateformes.map((p) => [p.cle, p]));
    l.push("");
    l.push(`${SENTINELLE_ABSENTS}${tag}** — les plateformes ci-dessous ne sont **pas** livrées par`);
    l.push("> cette version. L'absence est déclarée, datée et levable ; elle n'est pas un oubli, et");
    l.push("> rien ci-dessus ne la promet.");
    l.push(">");
    for (const a of absents) {
      const p = parCle.get(a.cle);
      if (!p) {
        throw new Error(
          `absent déclaré sur une clé inconnue de la table : « ${a.cle} ». Les clés valides sont ` +
            `${[...parCle.keys()].join(", ")}. Déclarer l'absence d'une plateforme qui n'existe pas ` +
            "rendrait la vitrine muette sur une vraie plateforme.",
        );
      }
      l.push(`> - **${p.libelle}** (\`${substituer(p.motif, { app, version })}\`)`);
      l.push(`>   — *constaté sur ${a.constate_sur}, le ${a.depuis}.* ${a.motif_absence}`);
      l.push(`>   **Levée :** ${a.condition_de_levee}`);
    }
  }
  return l.join("\n");
}

/**
 * Rend une zone LIBRE a partir d'un gabarit de lignes porte par `fixtures/vitrine-locale.json`.
 *
 * POURQUOI UN GABARIT ET PAS DU TEXTE EN DUR ICI. Le bloc « Construire depuis les sources » porte
 * lui aussi la version (`cd {APP}-{V}`) et DIFFERE entre les deux applications (le monorepo du GUI
 * mentionne ses workspaces). Le traiter par une seconde mecanique aurait recree, a cote de la
 * premiere, exactement le defaut qu'on repare. Il passe donc par LE MEME geste de substitution :
 * une seule mecanique, une donnee par depot.
 */
export function rendreGabarit(lignes, { app, version }) {
  return lignes.map((ligne) => substituer(ligne, { app, version })).join("\n");
}

/** Rend TOUTES les zones d'un coup. Point d'entree unique du generateur. */
export function rendreVitrine({ app, depot, version, plateformes, absents = [], gabarits = {} }) {
  const zones = { binaires: rendreBinaires({ app, depot, version, plateformes, absents }) };
  for (const [nom, lignes] of Object.entries(gabarits)) {
    zones[nom] = rendreGabarit(lignes, { app, version });
  }
  return zones;
}

/**
 * Lit le contenu actuel des zones d'un README.
 *
 * Un marqueur MANQUANT est une ERREUR, pas une zone vide : sans cela, supprimer les marqueurs
 * rendrait la garde verte sur un README entierement libre — le faux vert le plus facile a produire.
 * @returns {Record<string,string>}
 */
export function lireZones(readme, noms) {
  const out = {};
  for (const nom of noms) {
    const d = readme.indexOf(debutZone(nom));
    const f = readme.indexOf(finZone(nom));
    if (d === -1 || f === -1 || f < d) {
      throw new Error(
        `zone de vitrine « ${nom} » introuvable dans le README : marqueurs ${debutZone(nom)} / ` +
          `${finZone(nom)} absents ou inverses. Les marqueurs ne se retirent pas — les retirer ` +
          "desactiverait la garde en silence.",
      );
    }
    out[nom] = readme.slice(d + debutZone(nom).length, f).replace(/^\n/, "").replace(/\n$/, "");
  }
  return out;
}

/** Reecrit les zones d'un README. Tout ce qui est hors marqueurs est rendu tel quel. */
export function ecrireZones(readme, zones) {
  let out = readme;
  for (const [nom, contenu] of Object.entries(zones)) {
    const d = out.indexOf(debutZone(nom));
    const f = out.indexOf(finZone(nom));
    if (d === -1 || f === -1 || f < d) {
      throw new Error(`zone de vitrine « ${nom} » introuvable : impossible de reecrire.`);
    }
    out = out.slice(0, d + debutZone(nom).length) + "\n" + contenu + "\n" + out.slice(f);
  }
  return out;
}

/**
 * Extrait la version ANNONCEE par un README (le `vX.Y.Z` de la ligne « version scellée courante »).
 * Rend `null` plutot qu'une supposition : un README illisible est un REFUS, jamais un vert.
 */
export function versionAnnoncee(readme) {
  const m = readme.match(/La version scellée courante est \*\*\[v(\d+\.\d+\.\d+)\]/);
  return m ? m[1] : null;
}

const ARTEFACT = /`([A-Za-z0-9._-]+\.(?:exe|msi|dmg|deb|rpm|AppImage|tgz))`/g;

/**
 * TOUS les noms d'artefacts CITES par un README, quel qu'en soit l'endroit — tableau des
 * telechargements ET bloc des absents declares.
 *
 * Sert a la face en ligne pour E-4 (« aucun asset installable passe sous silence ») : un artefact
 * NOMME quelque part n'est pas passe sous silence, meme s'il l'est pour dire qu'il n'existe pas.
 */
export function fichiersCites(readme) {
  const noms = new Set();
  for (const m of readme.matchAll(ARTEFACT)) noms.add(m[1]);
  return [...noms];
}

/**
 * Les index des lignes qui appartiennent a un BLOC D'ABSENCE DECLAREE. Y citer un nom de fichier
 * vaut « ce fichier N'EXISTE PAS » — l'exact inverse d'une promesse.
 *
 * Le bloc s'ouvre sur `SENTINELLE_ABSENTS` (que le generateur ecrit lui-meme) et court tant que la
 * citation Markdown `>` continue. Il se referme donc a la premiere ligne qui n'est plus citee : une
 * phrase rendue au fil du texte n'herite jamais de l'exemption.
 */
export function lignesDAbsenceDeclaree(readme) {
  const dedans = new Set();
  let ouvert = false;
  readme.split("\n").forEach((ligne, i) => {
    if (ligne.startsWith(SENTINELLE_ABSENTS)) ouvert = true;
    else if (ouvert && !ligne.startsWith(">")) ouvert = false;
    if (ouvert) dedans.add(i);
  });
  return dedans;
}

/**
 * Les fichiers que le README PROMET : tout artefact cite, SAUF ceux cites dans un bloc d'absence
 * declaree. C'est l'entree d'E-3.
 *
 * DEUX DEFAUTS FERMES ICI, DANS L'ORDRE OU ILS ONT ETE TROUVES.
 *
 * 1. NE PAS PUNIR L'HONNETETE — trouve par la face en ligne elle-meme. Une premiere version ne
 *    connaissait que « cite quelque part » : E-3 reprochait alors au README d'annoncer
 *    `<app>_<v>_aarch64.dmg`, un nom qui ne figure QUE dans le bloc des absents, c'est-a-dire a
 *    l'endroit meme ou le README dit qu'il N'EXISTE PAS. La garde rougissait sur la declaration.
 *
 * 2. NE PAS LAISSER D'ANGLE MORT — trouve par le gate. La deuxieme version a pris « promis » =
 *    « ligne de tableau », et ce raccourci ouvrait un trou MESURE : une phrase en prose, hors
 *    marqueurs et hors tableau (« Les utilisateurs macOS prendront directement
 *    `<app>_<v>_aarch64.dmg` sur la page de la release. ») promettait un fichier inexistant et
 *    passait les DEUX faces plus la suite entiere. CA-10 dit « CHAQUE fichier annonce par chaque
 *    README », pas « chaque ligne de tableau » : l'implementation etait plus etroite que le
 *    critere, et l'ecart etait muet.
 *
 * LA REGLE RETENUE TIENT LES DEUX : la PROMESSE est le defaut, l'ABSENCE DECLAREE est la seule
 * exception, et elle n'est reconnue que la ou le generateur l'ecrit. Promettre ailleurs — prose,
 * note, lien, titre — redevient mesurable, quel que soit l'endroit du README.
 */
export function fichiersPromis(readme) {
  const declarees = lignesDAbsenceDeclaree(readme);
  const noms = new Set();
  readme.split("\n").forEach((ligne, i) => {
    if (declarees.has(i)) return;
    for (const m of ligne.matchAll(ARTEFACT)) noms.add(m[1]);
  });
  return [...noms];
}

/**
 * Compare les zones LUES aux zones ATTENDUES et rend la liste des ecarts, chacun NOMMANT sa zone.
 * Ne leve pas : c'est l'appelant qui decide d'echouer (le mode `--check` veut le detail).
 */
export function ecartsDeVitrine(luës, attendues) {
  const ecarts = [];
  for (const [nom, attendu] of Object.entries(attendues)) {
    const lu = luës[nom];
    if (lu === attendu) continue;
    const ligneLue = (lu ?? "").split("\n");
    const ligneAtt = attendu.split("\n");
    const i = ligneLue.findIndex((l, k) => l !== ligneAtt[k]);
    const rang = i === -1 ? Math.min(ligneLue.length, ligneAtt.length) : i;
    ecarts.push({
      zone: nom,
      ligne: rang + 1,
      lu: ligneLue[rang] ?? "(fin de zone)",
      attendu: ligneAtt[rang] ?? "(fin de zone)",
    });
  }
  return ecarts;
}
