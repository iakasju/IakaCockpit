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

  // ── L41 / DÉFAUT C — LA PREUVE A UNE DATE, ET ELLE EST POSTÉRIEURE À CE QU'ELLE PROUVE ──────
  //
  // AVANT : `if (!mesures?.mesureLe)` — n'importe quelle chaîne non vide passait, `"2020-01-01"`
  // comme `"hier matin"`. La preuve « 9/9 telechargeables » pouvait donc vieillir indefiniment :
  // le jour ou un asset de release est supprime ou renomme, la suite restait VERTE.
  //
  // LA BORNE RETENUE (AR-1 = O2) est RELATIVE, jamais calendaire : `mesureLe >= pub_date`. Elle se
  // compare a un FICHIER VERSIONNE (le manifeste), elle est DETERMINISTE — aucune horloge murale,
  // donc aucun rouge un jour ou personne n'a rien touche, sur une machine hors ligne. Elle
  // transpose la protection anti-`freeze` de TUF : non pas une horloge absolue, mais un ORDRE
  // MONOTONE contre une reference. Conjuguee au controle de version ci-dessous, elle impose que la
  // preuve porte sur CETTE version ET apres sa publication.
  //
  // ┌─ HORS-COUVERTURE DECLARE — ce que cette borne NE detecte PAS ─────────────────────────────┐
  // │ (1) une mesure qui VIEILLIT SANS QUE LA VERSION BOUGE : tant que `version` et `pub_date`  │
  // │     ne changent pas, une mesure du jour de la publication reste acceptee indefiniment.    │
  // │ (2) une `pub_date` VOLONTAIREMENT RECULEE via `--pub-date` (entree pilotable, acquis de   │
  // │     L40) : reculer la reference affaiblit la borne d'autant.                              │
  // │ CONDITION DE LEVEE : ces deux trous se ferment le jour ou le depot accepte une alarme     │
  // │ calendaire — ecartee par AR-1, et qui devra vivre HORS de `test:all` (une bombe a          │
  // │ retardement dans le gate rougirait un jour ou personne n'a rien touche).                  │
  // └───────────────────────────────────────────────────────────────────────────────────────────┘
  const pubDate = Date.parse(String(manifeste?.pub_date ?? ""));
  if (Number.isNaN(pubDate)) {
    ajoute(
      null,
      `le manifeste n'a pas de pub_date lisible (« ${manifeste?.pub_date} ») — sans referent, la ` +
        "fraicheur de la preuve n'est bornable par rien",
    );
  }
  if (!mesures?.mesureLe) {
    ajoute(null, "mesures.json sans date de mesure");
  } else {
    const mesureLe = Date.parse(String(mesures.mesureLe));
    if (Number.isNaN(mesureLe)) {
      ajoute(null, `mesures.json : date de mesure illisible (« ${mesures.mesureLe} »)`);
    } else if (!Number.isNaN(pubDate) && mesureLe < pubDate) {
      ajoute(
        null,
        `mesures.json : la preuve est datee du « ${mesures.mesureLe} », ANTERIEURE a la ` +
          `publication de ce qu'elle pretend prouver (pub_date « ${manifeste.pub_date} ») — une ` +
          "mesure faite avant la publication ne prouve rien sur elle",
      );
    }
  }
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

// ══════════════════════════════════════════════════════════════════════════════════════════════
// L41 — VOLET A / DÉFAUT D : LA PUBLICITÉ D'UN HÔTE SE PROUVE, ELLE NE SE PRÉSUME PAS.
//
// D'OÙ VIENT CETTE FONCTION. Elle vivait dans `scripts/__tests__/forge-host-parity.test.mjs`, où
// elle ne pouvait s'exercer que sur les hôtes RÉELS du dépôt — donc jamais sur les cas de bord
// qu'elle est censée trancher. Même geste, même motif que l'extraction d'`I4` en L40.
//
// CE QUI ÉTAIT FAUX, ET POURQUOI C'ÉTAIT PIRE QU'UN TROU. L'ancienne `estPrive` faisait
// `hote.split(":")[0]`. Sur `"[::1]:3001"` cela rend `"["` — ni `127.*`, ni `localhost`, ni
// `.local` : « pas privé », donc PUBLIC. `I2`, qui asserte `.toBe(false)`, CERTIFIAIT donc qu'une
// boucle locale est atteignable depuis n'importe où. La garde ne se taisait pas : elle attestait
// l'inverse de la vérité. Même mécanique pour un nom d'hôte nu (`"nas:3001"` → `"nas"` → public).
//
// LE REMÈDE (AR-2 = O3) — ON INVERSE LA CHARGE DE LA PREUVE. Ajouter des motifs (IPv6, nom sans
// point) aurait rejoué l'énumération qui a DÉJÀ laissé passer trois cas ; une allowlist de TLD
// publics (PSL) serait de la sur-ingénierie. `estPublic` exige une forme qui PROUVE
// l'atteignabilité ; `estPrive` n'est plus que sa négation. Tout le reste — forme inconnue,
// littéral IP, hôte illisible — est PRIVÉ par défaut. C'est ce que le commentaire d'origine
// prétendait déjà faire (« On teste la PROPRIÉTÉ ») : il devient vrai.
//
// ┌─ HORS-COUVERTURE DÉCLARÉ ─────────────────────────────────────────────────────────────────┐
// │ Ce prédicat juge une FORME, jamais une accessibilité réelle : `forge.example.org` a la     │
// │ forme d'un hôte public même si le DNS ne le résout nulle part. Le fait qu'un hôte de forme │
// │ publique réponde est mesuré ailleurs — par `mesurer-artefacts.mjs`, puis par `I4`.         │
// │ Une IP littérale PUBLIQUE (ex. `93.184.216.34`) est ici classée PRIVÉE : c'est un refus    │
// │ ASSUMÉ, pas un oubli — un manifeste distribué à des lecteurs inconnus n'a aucune raison    │
// │ d'annoncer une adresse nue. CONDITION DE LEVÉE : le jour où un canal légitime l'exige.     │
// └────────────────────────────────────────────────────────────────────────────────────────────┘

/** Suffixes réservés à un usage local/privé : leur seule présence disqualifie la publicité. */
const SUFFIXES_NON_PUBLICS = new Set([
  "local",
  "localhost",
  "localdomain",
  "internal",
  "intranet",
  "lan",
  "home",
  "arpa",
  "private",
  "corp",
  "test",
  "example",
  "invalid",
  "onion",
]);

/**
 * Extrait le NOM D'HÔTE d'une autorité (`hote[:port]`) sans jamais découper sur « : ».
 *
 * `new URL(...).hostname` conserve les crochets d'un littéral IPv6 (`"[::1]"`), on les retire
 * explicitement. Une autorité illisible rend `null` — traitée comme non prouvée, donc privée.
 *
 * @param {string} hote
 * @returns {string|null}
 */
function nomDHote(hote) {
  try {
    const brut = new URL(`http://${String(hote)}`).hostname;
    return brut.startsWith("[") && brut.endsWith("]") ? brut.slice(1, -1) : brut;
  } catch {
    return null;
  }
}

/**
 * Un hôte est PUBLIC seulement si sa forme le prouve : un nom DNS pleinement qualifié, dont le
 * dernier label est alphabétique, et dont aucun label n'est un suffixe d'usage local.
 *
 * Tout le reste — littéral IPv4 ou IPv6, nom sans point, autorité illisible — est PRIVÉ.
 *
 * @param {string} hote  autorité de la forme `hote` ou `hote:port`
 * @returns {boolean}
 */
export function estPublic(hote) {
  const h = nomDHote(hote);
  if (!h) return false;
  // Littéral IPv6 : la seule présence d'un « : » dans le nom d'hôte le trahit.
  if (h.includes(":")) return false;
  // Littéral IPv4 (publique ou non) : une adresse nue ne prouve rien pour un lecteur inconnu.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
  const labels = h.toLowerCase().replace(/\.$/, "").split(".");
  // Un nom sans point (`nas`, `forge`) n'est résolvable que sur le réseau qui le déclare.
  if (labels.length < 2) return false;
  if (labels.some((l) => l.length === 0)) return false;
  // Le suffixe d'usage local se teste sur le TLD SEUL, jamais sur un label quelconque : sinon
  // `home.mon-entreprise.com` serait refusé pour un mot qui n'est pas son suffixe.
  const tld = labels[labels.length - 1];
  if (SUFFIXES_NON_PUBLICS.has(tld)) return false;
  if (!/^[a-z]{2,}$/.test(tld)) return false;
  return labels.every((l) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l));
}

/**
 * Négation stricte d'`estPublic` : privé = « rien ne prouve que c'est atteignable de partout ».
 *
 * @param {string} hote
 * @returns {boolean}
 */
export function estPrive(hote) {
  return !estPublic(hote);
}

/**
 * LE NOM D'HÔTE RÉELLEMENT JUGÉ — ce que la garde doit NOMMER quand elle refuse.
 *
 * Une garde qui refuse sans dire sur quoi elle a statué est intestable : c'est précisément ce qui
 * a laissé vivre le défaut D. Avec l'ancien `hote.split(":")[0]`, cette fonction rendrait `"["`
 * pour `"[::1]:3001"` — le message de refus l'exhiberait, et la suite rougirait.
 *
 * @param {string} hote
 * @returns {string}
 */
export function hoteJuge(hote) {
  return nomDHote(hote) ?? "<autorite illisible>";
}
