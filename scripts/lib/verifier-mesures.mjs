// verifier-mesures.mjs — L'ASSERTION `I4`, SORTIE DU FICHIER DE TEST (défaut B).
//
// ÉTAT : EXTRACTION FIDÈLE, NON CORRIGÉE. Ce fichier reproduit à l'identique la logique qui
// vivait dans `scripts/__tests__/forge-host-parity.test.mjs` — index par URL compris. Il est
// commité DANS CET ÉTAT pour que les deux exploits puissent être constatés VERTS À TORT avant
// tout correctif : une garde se prouve rouge d'abord, sinon on ne sait pas si elle garde.
//
// Précédent explicite du dépôt (`scripts/lib/update-manifest.mjs:3-7`) : « Les tirer hors du
// script exécutable les rend testables sur des données factices ».
//
// Fonction PURE : aucune I/O. Le fichier de garde devient son appelant mince sur les fichiers
// réels du dépôt.

/**
 * @param {{ manifeste: object, mesures: object, horsCouverture?: Array }} input
 * @returns {Array<{ plateforme: string|null, motif: string }>} la liste des violations (vide = ok)
 */
export function verifierMesures({ manifeste, mesures, horsCouverture = [] }) {
  const violations = [];
  const ajoute = (plateforme, motif) => violations.push({ plateforme, motif });

  if (!mesures?.mesureLe) ajoute(null, "mesures.json sans date de mesure");
  if (mesures?.version !== manifeste?.version) {
    ajoute(
      null,
      `mesures.json parle de la version « ${mesures?.version} », le manifeste de « ${manifeste?.version} »`,
    );
  }

  // ⚠️ INDEX PAR URL — c'est le trou. Le champ `plateforme` des mesures n'est jamais lu, donc
  // rien ne vérifie que la mesure porte bien l'URL DE CETTE plateforme, et une seconde mesure de
  // la même URL écrase silencieusement la première.
  const parUrl = new Map((mesures?.artefacts ?? []).map((a) => [a.url, a]));
  const declarees = new Map(horsCouverture.map((h) => [h.plateforme, h]));

  for (const [nom, p] of Object.entries(manifeste?.platforms ?? {})) {
    if (!p?.url) {
      ajoute(nom, `plateforme ${nom} sans url`);
      continue;
    }
    const mesure = parUrl.get(p.url);
    if (!mesure) {
      ajoute(nom, `plateforme ${nom} ANNONCEE sans mesure de ${p.url}`);
      continue;
    }
    const trou = declarees.get(nom);
    if (!trou) {
      if (mesure.status !== 200) ajoute(nom, `${nom} : mesure ${mesure.status}, pas 200`);
      if (!(mesure.octets > 0)) ajoute(nom, `${nom} : mesure vide`);
      if (mesure.signature !== "valide") ajoute(nom, `${nom} : signature non verifiee`);
      continue;
    }
    // CLIQUET : l'exception doit encore correspondre à la réalité mesurée.
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
 * et plateforme réellement annoncée. Une exception qui ne se lit pas est un mensonge.
 */
export function verifierHorsCouverture({ manifeste, horsCouverture = [] }) {
  const violations = [];
  const plats = new Set(Object.keys(manifeste?.platforms ?? {}));
  for (const h of horsCouverture) {
    if (!h.motif) violations.push({ plateforme: h.plateforme, motif: `exception ${h.plateforme} sans motif` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(h.date ?? ""))) {
      violations.push({ plateforme: h.plateforme, motif: `exception ${h.plateforme} sans date valide` });
    }
    if (!h.leveePar) {
      violations.push({ plateforme: h.plateforme, motif: `exception ${h.plateforme} sans condition de levee` });
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
