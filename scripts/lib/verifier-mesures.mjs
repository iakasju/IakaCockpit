// verifier-mesures.mjs — L'ASSERTION `I4`, SORTIE DU FICHIER DE TEST (défaut B).
//
// POURQUOI CE FICHIER. L'assertion vivait dans `scripts/__tests__/forge-host-parity.test.mjs`,
// où elle ne pouvait s'exercer que sur les fichiers RÉELS du dépôt — donc jamais sur le cas
// qu'elle est censée interdire. Précédent explicite du dépôt
// (`scripts/lib/update-manifest.mjs:3-7`) : « Les tirer hors du script exécutable les rend
// testables sur des données factices ». Le fichier de garde en devient l'appelant mince.
//
// CE QUI ÉTAIT TROUÉ, ET POURQUOI ÇA DEVENAIT STRUCTUREL. L'ancienne assertion indexait les
// mesures PAR URL (`new Map(artefacts.map((a) => [a.url, a]))`). Deux conséquences, toutes deux
// vérifiées vertes à tort avant ce correctif :
//   — le champ `plateforme` des mesures n'était JAMAIS lu : un `mesures.json` dont les étiquettes
//     sont interverties (Linux mesuré à l'URL de l'exe Windows) passait sans un mot ;
//   — `new Map` garde la DERNIÈRE entrée : une mesure 404 suivie d'une mesure 200 sur la même URL
//     était écrasée en silence. Le fichier consigne un échec, la garde voit un succès.
//
// Aujourd'hui inoffensif, demain structurel : émettre les clés d'installeur fait que PLUSIEURS
// clés du manifeste partagent la même URL par construction (`linux-x86_64` et
// `linux-x86_64-appimage` désignent le même octet). Un index par URL s'effondre exactement au
// moment où on commence à s'en servir. D'où l'ordre : réparer la garde AVANT d'émettre les clés.
//
// CE QUI REMPLACE. Index par PLATEFORME ; une plateforme mesurée deux fois est une violation
// NOMMÉE (jamais un écrasement) ; et la mesure doit porter l'URL DE CETTE plateforme. Les
// critères d'origine — `200`, `octets > 0`, `signature === "valide"` — sont conservés tels quels.
//
// Fonction PURE : aucune I/O, testable sur fixtures.

/**
 * Vérifie qu'un `mesures.json` prouve réellement ce que le manifeste annonce.
 *
 * @param {{ manifeste: object, mesures: object, horsCouverture?: Array }} input
 * @returns {Array<{ plateforme: string|null, motif: string }>} violations (tableau vide = tout va bien)
 */
export function verifierMesures({ manifeste, mesures, horsCouverture = [] }) {
  const violations = [];
  const ajoute = (plateforme, motif) => violations.push({ plateforme, motif });

  if (!mesures?.mesureLe) ajoute(null, "mesures.json sans date de mesure");
  if (mesures?.version !== manifeste?.version) {
    ajoute(
      null,
      `mesures.json parle de la version « ${mesures?.version} », le manifeste de ` +
        `« ${manifeste?.version} » — la preuve ne porte pas sur ce qui est annonce`,
    );
  }

  // INDEX PAR PLATEFORME. Un doublon de plateforme est REFUSÉ et nommé : la première mesure est
  // conservée, la suivante ne l'écrase pas en silence. C'est le contraire exact de l'index par URL.
  const parPlateforme = new Map();
  for (const a of mesures?.artefacts ?? []) {
    const nom = a?.plateforme;
    if (!nom) {
      ajoute(null, "mesure sans champ `plateforme` — inattribuable, elle ne prouve rien");
      continue;
    }
    if (parPlateforme.has(nom)) {
      ajoute(
        nom,
        `${nom} : plateforme en DOUBLON dans mesures.json — mesuree deux fois, la seconde ` +
          "entree n'ecrase pas la premiere ; retirer la mesure perimee",
      );
      continue;
    }
    parPlateforme.set(nom, a);
  }

  const declarees = new Map(horsCouverture.map((h) => [h.plateforme, h]));

  for (const [nom, p] of Object.entries(manifeste?.platforms ?? {})) {
    if (!p?.url) {
      ajoute(nom, `plateforme ${nom} sans url`);
      continue;
    }
    const mesure = parPlateforme.get(nom);
    if (!mesure) {
      ajoute(nom, `plateforme ${nom} ANNONCEE sans mesure de ${p.url}`);
      continue;
    }
    // LA MESURE DOIT PORTER L'URL DE CETTE PLATEFORME. Sans cette ligne, un fichier dont les
    // etiquettes sont interverties prouve quelque chose — mais pas ce qu'il pretend.
    if (mesure.url !== p.url) {
      ajoute(
        nom,
        `${nom} : la mesure porte l'URL « ${mesure.url} », le manifeste annonce « ${p.url} » — ` +
          `cette mesure ne prouve rien sur ${nom}`,
      );
      continue;
    }

    const trou = declarees.get(nom);
    if (!trou) {
      if (mesure.status !== 200) ajoute(nom, `${nom} : mesure ${mesure.status}, pas 200`);
      if (!(mesure.octets > 0)) ajoute(nom, `${nom} : mesure vide`);
      if (mesure.signature !== "valide") {
        ajoute(nom, `${nom} : signature non verifiee contre l'artefact servi`);
      }
      continue;
    }
    // CLIQUET : l'exception doit encore correspondre à la réalité mesurée. Dès que l'artefact
    // devient téléchargeable, cette violation tombe — et l'exception DOIT être retirée.
    if (mesure.status === 200) {
      ajoute(
        nom,
        `${nom} : hors-couverture declare alors que l'artefact repond 200 — retirer l'entree de ` +
          `HORS_COUVERTURE (${trou.leveePar})`,
      );
    }
  }
  return violations;
}

/**
 * Contrôle de forme d'un registre de hors-couverture (`I4bis`) : motif, date, condition de levée,
 * et plateforme réellement annoncée. Une exception qui ne se lit pas est un mensonge ; une
 * exception qui désigne une plateforme absente du manifeste est un fantôme.
 */
export function verifierHorsCouverture({ manifeste, horsCouverture = [] }) {
  const violations = [];
  const plats = new Set(Object.keys(manifeste?.platforms ?? {}));
  for (const h of horsCouverture) {
    if (!h.motif) {
      violations.push({ plateforme: h.plateforme, motif: `exception ${h.plateforme} sans motif` });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(h.date ?? ""))) {
      violations.push({
        plateforme: h.plateforme,
        motif: `exception ${h.plateforme} sans date valide`,
      });
    }
    if (!h.leveePar) {
      violations.push({
        plateforme: h.plateforme,
        motif: `exception ${h.plateforme} sans condition de levee`,
      });
    }
    if (!plats.has(h.plateforme)) {
      violations.push({
        plateforme: h.plateforme,
        motif: `exception ${h.plateforme} : plateforme absente du manifeste — exception fantome`,
      });
    }
  }
  return violations;
}
