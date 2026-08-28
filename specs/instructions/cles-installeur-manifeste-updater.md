# Clés d'installeur du manifeste updater — le manifeste dit enfin quel paquet il sert

> **Ce fichier est DUPLIQUÉ VERBATIM dans les deux dépôts** — `IakaCockpit/specs/instructions/` et
> `iakaFrameGUI/specs/instructions/`. Le défaut est le même des deux côtés, les deux générateurs sont
> distincts, et une instruction écrite d'un seul côté est le premier pas de la divergence qu'on répare.
> Une différence entre les deux copies est un défaut : `diff` doit sortir vide (CA-16).
>
> Nomenclature : dans le backlog `IakaCockpit`, ce lot porte le numéro **L40**. Le dépôt `iakaFrameGUI`
> n'utilise pas de numérotation ; il l'inscrit sous son titre.
>
> Cadré par 🔵 Gandalf le 2026-08-29, sur les constats mesurés du 2026-08-28 (deux exécutants,
> quatre gates). Les faits repris ici ont été **contre-vérifiés en lecture** ; ceux qui ont été
> **rectifiés** le sont explicitement (§ Faits établis, § Rectifications).

---

## Problème

Le générateur de manifeste n'émet que les clés génériques `{os}-{arch}`. Or `tauri-plugin-updater`
cherche d'abord `{os}-{arch}-{installer}`. Conséquence chez des utilisateurs réels : un client Windows
installé **par MSI** reçoit l'exe NSIS et s'installe **à côté** de l'enregistrement MSI ; un client Linux
installé **par `.deb` ou `.rpm`** télécharge une AppImage de 92 Mo et échoue en `InvalidUpdaterFormat`
**à chaque tentative**. Le manifeste ne ment pas sur *où* télécharger — il ment sur *quoi* il sert.

Deux dépendances rendent ce lot indivisible :

1. **La garde qui protège tout le reste est trouée.** `I4` indexe les mesures **par URL** sans vérifier
   qu'elles correspondent à la plateforme. Aujourd'hui inoffensif ; demain **structurel**, car émettre
   les clés d'installeur fait que **plusieurs plateformes du manifeste partagent la même URL** (par
   construction : `linux-x86_64` et `linux-x86_64-appimage` pointent le même octet). L'index par URL
   s'effondre exactement au moment où on l'utilise sérieusement. **Corriger la garde est un prérequis
   d'émettre les clés, pas une amélioration jointe.**
2. **Il n'existe pas d'instrument de mesure versionné.** `I4` exige `signature: "valide"` — or l'outil
   déclaré par `iakaFrameGUI/updater/mesures.json` (`iakaframe endpoints`) **ne vérifie aucune
   signature et ne calcule aucun sha256** : il fait un `HEAD` (`iakaframe/cli/src/lib/endpoints.js:176-198`)
   et rend `{plateforme, url, hote, status, octets, ok, motif, ms}`. Les champs `sha256` et
   `signature: "valide"` de ce fichier **ne peuvent pas venir de l'outil qu'il nomme**. Côté Cockpit,
   la mesure a été faite par un script de `scratchpad/`, **hors dépôt, non versionné, non rejouable**.
   On ne peut pas annoncer honnêtement trois fois plus de clés avec un instrument qu'on ne peut ni
   relancer ni relire.

S'y ajoutent deux nuisances du même geste de publication : un **second manifeste contradictoire** posé
par le CI sur la release, et un **`pub_date` non reproductible** qui rend inatteignable le chemin
« republier à l'identique ».

---

## Décision retenue

Un lot **unique et fermé**, portant sur la **chaîne de publication** des deux apps : émettre les clés
d'installeur, et **d'abord** rendre vérifiable ce qu'on annonce.

L'ordre est imposé par la dépendance, pas par le confort :

1. **Mesurer** ce que la release contient réellement (artefacts **et** signatures). Le jeu de clés
   émises est **dérivé de ce qui est signé**, jamais d'une liste souhaitée.
2. **Versionner l'instrument** de mesure (téléchargement anonyme + vérification minisign + témoin
   négatif), et faire dire à `mesures.json` la vérité sur sa provenance.
3. **Réparer `I4`** : l'assertion sort du fichier de test vers une **fonction pure** testable sur
   fixtures — précédent explicite du dépôt (`scripts/lib/update-manifest.mjs:3-7` : *« Les tirer hors
   du script exécutable les rend testables sur des données factices »*). Les deux exploits sont écrits
   **rouges d'abord**.
4. **Émettre les clés d'installeur**, puis re-mesurer, puis publier.

Deux lots successeurs sont **nommés et exclus** ci-dessous (§ Périmètre).

---

## Périmètre

### Inclus

- **A — Clés `{os}-{arch}-{installer}`** dans les deux générateurs, pour les seuls artefacts
  **présents ET signés** sur la release ; les clés génériques sont **conservées** (repli du plugin).
- **B — Réparation de `I4`** : index par **plateforme**, refus des doublons de plateforme, assertion
  que la mesure porte bien **l'URL de cette plateforme**. Extraction en fonction pure + fixtures.
- **J — Instrument de mesure versionné** dans chaque dépôt, et `mesures.json` déclarant sa provenance
  **exacte** (y compris la rectification du fichier GUI, dont la provenance actuelle est fausse).
- **G — Asset `latest.json` du CI** : cesser de poser sur la release un second manifeste qui contredit
  le nôtre.
- **I — `pub_date` reproductible** : devient une **entrée pilotable** du script de publication.
- **Convergence des deux gardes** : la garde du GUI récupère le registre `HORS_COUVERTURE` + `I4bis`
  qu'elle n'a pas, et les deux fichiers convergent (CA-16).
- **Cliquet de version du plugin** : la convention de clés vérifiée ici l'a été contre `2.10.1` ; le
  lot pose une garde qui rougit si la version verrouillée change (CA-15).

### Exclu — explicitement, et sans « tant qu'on y est »

- **Lot successeur n°1 — « gardes tièdes » (défauts C, D, E du relevé du 2026-08-28).** À cadrer
  séparément, aucun effet utilisateur, aucune urgence :
  - **C** — le cliquet de `HORS_COUVERTURE` est **passif** : il ne se lève qu'à la re-mesure, et
    `mesureLe` n'est contraint que par `toBeTruthy()`
    (`scripts/__tests__/forge-host-parity.test.mjs:137`) — `"2020-01-01"` passe au vert. Manque une
    **borne de fraîcheur**.
  - **D** — `estPrive` est incomplet (`:92-102`) : un **nom d'hôte nu** de LAN (`http://nas:3001`)
    est jugé public, et l'**IPv6 littéral** casse (`hote.split(":")[0]` rend `"["` sur `[::1]:3001`).
  - **E** — `I4bis` est **vacuous** quand `HORS_COUVERTURE` est vide : ses quatre assertions peuvent
    être supprimées en silence sans qu'un test tombe.
  *Ces trois défauts sont réels et vérifiés en lecture. Ils ne sont pas dans ce lot parce qu'ils ne
  bloquent aucun utilisateur et qu'aucun d'eux n'est un prérequis de A.*
- **Lot successeur n°2 — « installer depuis rien » (défaut H).** Les **trois** README annoncent une
  version scellée périmée (`iakaFrameGUI/README.md:19` → v0.1.4 contre 0.1.7 publié ;
  `IakaCockpit/README.md:18` → v0.31.2 ; CLI `iakaframe` → v0.20.4 contre 0.39.0 publié), et GitHub
  classe les releases **par date de publication**, ce qui peut faire pointer le `latest` sur une
  version antérieure. **Autre audience, autre artefact, trois dépôts** — un lot à lui seul. Recommandé
  après celui-ci, mais l'ordre appartient au décideur.
- **Le canal de lecture** (`endpoints`, `FORGEJO_BASE`) et le **canal de téléchargement**
  (`ARTEFACT_BASE`) : **inchangés**. La séparation lecture/téléchargement acquise le 2026-08-28 n'est
  pas rouverte.
- **Toute recette réelle.** Aucune installation Windows ni Linux n'a été exercée ; aucune bascule du
  plugin lancée. Ce lot livre une **mesure**, pas une **recette** : la recette est un **gate humain**
  (§ Gate humain).
- **eslint/tsconfig absents du dépôt `iakaframe`** ; **rotation du jeton iakabox** et suppression de la
  branche `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`. Hors cadrage technique.
- **Élargir le CI** à de nouvelles cibles de build. Si `.deb`/`.rpm` s'avèrent non signés, la réponse
  de ce lot est de **déclarer le trou**, pas de changer le CI (cf. AR-2).

---

## Étapes d'implémentation

### Étape 0 — Inventorier, avant de décider quoi émettre

0.1 Pour chaque dépôt, lister **les assets de la dernière release GitHub** et, pour chacun, dire s'il a
un `.sig` apparié. Écrire le résultat brut dans le rapport d'exécution. C'est cette mesure — et rien
d'autre — qui détermine le jeu de clés de l'étape 3.

0.2 Vérifier, sur la source de la version **verrouillée dans `Cargo.lock`** (`2.10.1` dans les deux
dépôts), que `get_urls` construit bien `{os}-{arch}-{installer}` **puis** `{os}-{arch}`, et relever
les valeurs exactes de `Installer::name()`. Ne pas se fier au présent document : le confronter.

> ⚠️ Une plateforme dont l'artefact n'a **pas** de `.sig` **ne doit pas** être émise. Le client refuse
> une charge non signée ; l'annoncer déplacerait l'échec du téléchargement vers l'installation.

### Étape 1 — Versionner l'instrument de mesure (défaut J)

1.1 Créer `scripts/mesurer-artefacts.mjs` dans **chaque** dépôt. Il lit `updater/latest.json`, et pour
**chaque clé de plateforme** (pas pour chaque URL distincte — plusieurs clés partageront la même) :
télécharge l'octet **en anonyme, sans jeton**, calcule `octets` + `sha256`, et **vérifie la signature
du manifeste contre l'octet servi**, avec la clé publique lue dans `src-tauri/tauri.conf.json`
(`plugins.updater.pubkey`).

1.2 La vérification couvre la **signature globale** (`sig || trusted_comment`) et compare le **keyid**
de la signature à celui de la clé publique.

1.3 **Témoin négatif obligatoire** : chaque signature est rejouée contre le même octet avec **un octet
retourné**, et doit rendre `invalide`. *Une vérification qui n'échoue jamais ne prouve rien.*

1.4 Le script **écrit `updater/mesures.json`** avec, en tête, `mesurePar` = la commande **exacte** qui
l'a produit. Reprendre l'existant Cockpit comme forme de référence
(`IakaCockpit/updater/mesures.json:5-7`) : c'est la seule des deux qui dise vrai aujourd'hui.

1.5 **Rectifier `iakaFrameGUI/updater/mesures.json`** : sa provenance actuelle est fausse. Le fichier
sera de toute façon régénéré à l'étape 5 ; la rectification consiste à ne **jamais** le réécrire à la
main ensuite.

### Étape 2 — Réparer `I4` (défaut B) — rouge d'abord

2.1 Extraire l'assertion de `I4` dans **`scripts/lib/verifier-mesures.mjs`**, fonction **pure**
`verifierMesures({ manifeste, mesures, horsCouverture })` → liste de violations `{plateforme, motif}`.
Aucune I/O. Le fichier de garde devient son appelant mince sur les fichiers réels.

2.2 Écrire **d'abord** les deux exploits, sur fixtures, et **constater qu'ils passent** (verts à tort) :
- E-1 : la mesure de `linux-x86_64` porte l'URL de l'exe Windows ;
- E-2 : **deux** mesures pour la même URL, la mauvaise puis la bonne.
Capturer la sortie verte. C'est la preuve que la garde était trouée.

2.3 Corriger : indexer par **`plateforme`** ; **refuser** qu'une plateforme apparaisse deux fois dans
`mesures.json` (violation nommée) ; asserter `mesure.url === manifeste.platforms[nom].url`. Conserver
`200` / `octets > 0` / `signature === "valide"`.

2.4 Rejouer E-1 et E-2 : **rouges**, avec un message qui **nomme la plateforme fautive**.

### Étape 3 — Émettre les clés d'installeur (défaut A)

3.1 **Cockpit** — `scripts/lib/update-manifest.mjs`. `classifyArtifact` (`:72-83`) rend aujourd'hui une
plateforme **générique** ; il doit rendre le couple `{ generique, installeur }`. `buildManifest`
(`:108`) écrit alors, pour chaque artefact retenu, **la clé d'installeur** et, pour le gagnant du rang
générique (`artifactRank`, `:94-96`), **la clé générique**. `UPDATER_PLATFORMS` (`:11-16`) devient une
liste **ordonnée de clés attendues**, dérivée, plus une liste figée de quatre.

3.2 **GUI** — `scripts/publish-update.mjs`. Même geste sur `platformOfArtifact` (`:247-257`) et
`buildManifest` (`:301-329`). ⚠️ **Divergence préexistante à traiter** : le GUI **ignore totalement
`.msi`** (aucune branche), là où le Cockpit le classe. Le GUI ne peut donc pas émettre
`windows-x86_64-msi` sans que cette branche existe.

3.3 Règles dures, dans les deux :
- la clé **générique reste inchangée** (Windows → NSIS, Linux → AppImage) : aucun client existant ne
  change de comportement du seul fait de ce lot ;
- **aucune clé sans artefact ET sans signature** ;
- **pas de clé `darwin-*-app`** (cf. AR-3) ;
- ordre d'écriture **stable** (un `diff` git du manifeste doit rester lisible).

### Étape 4 — Le second manifeste du CI (défaut G) et `pub_date` (défaut I)

4.1 `.github/workflows/release.yml:90-104`, dans les deux dépôts : régler l'entrée de `tauri-action`
retenue par AR-5. **Vérifier explicitement** que les fichiers `.sig` continuent d'être téléversés —
`publish-update.mjs` les récupère depuis la release et sans eux le manifeste est vide.

4.2 `pubDate` devient une **entrée** du script de publication (`--pub-date <ISO>`), défaut =
maintenant. Corollaire à traiter : aujourd'hui le chemin « republication à l'identique = aucun commit »
(`iakaFrameGUI/scripts/publish-update.mjs:510-539`) est **inatteignable**, puisque `pub_date` change à
chaque exécution. Le rendre atteignable, ou dire dans le code qu'il ne l'est pas.

### Étape 5 — Republier, re-mesurer, et seulement alors déclarer

5.1 Bump de version, publication d'une version neuve sur **chaque** app par la chaîne existante.

5.2 Régénérer `updater/mesures.json` par l'instrument de l'étape 1 — **jamais à la main**.

5.3 Faire tourner la garde. Toute clé nouvellement émise et non téléchargeable **fait rougir** : soit
on la retire, soit on l'inscrit dans `HORS_COUVERTURE` avec motif, date et condition de levée.

---

## Fichiers concernés

Les chemins sont donnés relativement à la racine de **chaque** dépôt, sauf mention contraire.

- `scripts/lib/update-manifest.mjs` — **(Cockpit seul)** `classifyArtifact:72-83`, `artifactRank:94-96`,
  `buildManifest:108`, `UPDATER_PLATFORMS:11-16` : émission des clés d'installeur.
- `scripts/publish-update.mjs` — **(GUI)** `platformOfArtifact:247-257`, `buildManifest:301-329`,
  `pub_date:325`, no-op de republication `:510-539` ; **(Cockpit)** `pubDate:313`. Branche `.msi`
  manquante côté GUI.
- `scripts/lib/verifier-mesures.mjs` — **NOUVEAU**, fonction pure de `I4`.
- `scripts/mesurer-artefacts.mjs` — **NOUVEAU**, l'instrument versionné (téléchargement anonyme,
  sha256, minisign avec signature globale + keyid, témoin négatif).
- `scripts/__tests__/forge-host-parity.test.mjs` — `I4` devient appelant mince ; le GUI récupère
  `HORS_COUVERTURE` + `I4bis` (Cockpit `:59` et `:164-177`, absents du GUI) ; convergence des deux
  fichiers.
- `scripts/__tests__/verifier-mesures.test.mjs` — **NOUVEAU**, fixtures + les deux exploits.
- `fixtures/updater-cles.json` — **NOUVEAU** (si AR-6 = O2), table `noms d'artefacts → clés attendues`,
  **byte-identique** entre les deux dépôts.
- `updater/mesures.json` — régénéré ; **provenance rectifiée côté GUI** (aujourd'hui fausse).
- `updater/latest.json` — sortie ; ne se modifie **que** par le script.
- `.github/workflows/release.yml:90-104` — entrée `tauri-action` de AR-5.
- `CLAUDE.md` — backlog + commandes (le geste de mesure devient une commande documentée).

**Ne pas toucher** : `src-tauri/tauri.conf.json` (endpoints, pubkey), `src/` (le front de mise à jour),
`FORGEJO_BASE` / `ARTEFACT_BASE`, la garde d'alignement des versions.

---

## Risques

- **R1 — La convention `-{installer}` n'est pas documentée.** La doc Tauri v2 ne décrit que
  `OS-ARCH` (*« Each platform key is in the `OS-ARCH` format »*) ; les clés d'installeur n'existent que
  dans la **source** de `2.10.1`. Or `Cargo.toml` déclare `tauri-plugin-updater = "2"`
  (Cockpit `:25`, GUI `:55`) : un `cargo update` peut monter la version **sans rien dire**.
  *Mitigation* : CA-15 — cliquet sur la version verrouillée, avec un message qui ordonne de
  re-vérifier `get_urls` en amont.
- **R2 — `.deb`/`.rpm` peut-être non signés.** Le lot bute alors sur l'étape 0. *Mitigation* : la
  réponse est `HORS_COUVERTURE` (motif, date, condition de levée), **pas** une modification du CI
  (AR-2). Le trou est **déclaré**, il n'est pas comblé en douce.
- **R3 — Le mécanisme repose sur un octet patché dans le binaire.** `bundle_type()` lit une chaîne
  statique **patchée au bundling** ; non patchée, elle rend `None` hors macOS, et seule la clé
  générique est essayée. Un binaire portable ou mal bundlé retombe donc sur le comportement actuel —
  ce qui est le bon repli, mais signifie que **le gain n'est pas observable sans une vraie
  installation**. *Mitigation* : § Gate humain ; ne **jamais** déclarer A « recetté » sur la seule
  mesure réseau.
- **R4 — Couper l'asset `latest.json` du CI pourrait couper les `.sig`.** Le doute est levé sur pièce :
  `uploadUpdaterSignatures` est une entrée **distincte** (*« Does not affect the latest.json
  generator »*). *Mitigation* : CA-11 le mesure au lieu de le supposer.
- **R5 — Plus de clés = plus de promesses.** Chaque clé émise est une URL de plus qu'il faut avoir
  ouverte. C'est précisément pourquoi B et J passent avant A.
- **R6 — Divergence entre les deux apps.** Elle est **déjà installée** (`.msi` traité d'un seul côté,
  `HORS_COUVERTURE`/`I4bis` d'un seul côté, `encodeURIComponent` d'un seul côté). Ce lot la creuserait
  s'il n'était pas explicitement gardé. *Mitigation* : AR-6 + CA-16.
- **R7 — Chaque validation coûte une publication réelle** sur deux apps (bump, CI, release). Le lot ne
  se termine pas sans elle : c'est l'étape 5, et elle n'est pas compressible.

---

## Critères d'acceptation

> Discipline appliquée : une garde s'écrit **rouge d'abord** ; une preuve se compare à un **fichier
> versionné**, jamais à la sortie d'une autre commande ; un `200` ne suffit pas ; une exception ne
> survit pas à sa raison d'être. **Chaque critère dit par quelle commande on le vérifie.**
>
> Les commandes diffèrent par dépôt : Cockpit → `npm run test`, `bash scripts/quality.sh` ;
> GUI → `npm run test:all`, `npm run lint:all`. Les deux incluent déjà `scripts/**/*.test.mjs`
> (GUI `vitest.config.ts:14-20`).

### Défaut A — les clés d'installeur

- [ ] **CA-1** — Sur un jeu d'artefacts factices couvrant NSIS, MSI, AppImage, deb, rpm et les deux
      bundles macOS, le générateur émet **la clé d'installeur de chacun** et **conserve** la clé
      générique. *Vérif* : `npx vitest run scripts/__tests__/update-manifest.test.mjs` (Cockpit) /
      `npx vitest run scripts/publish-update.test.mjs` (GUI) — le test **nomme** l'ensemble attendu,
      il ne compte pas les clés.
- [ ] **CA-2** — La clé **générique** `windows-x86_64` désigne toujours le **NSIS**, et
      `linux-x86_64` toujours l'**AppImage**. *Vérif* : même commande ; assertion sur la valeur, pas
      sur la présence.
- [ ] **CA-3** — Un artefact **sans `.sig`** ne produit **aucune** clé, ni générique ni d'installeur,
      et est **signalé** en sortie. *Vérif* : même commande, cas de fixture dédié.
- [ ] **CA-4** — `updater/latest.json` du dépôt, après régénération réelle, porte **exactement**
      l'ensemble de clés dérivé de l'inventaire de l'étape 0 — ni plus, ni moins.
      *Vérif* : `node -e "console.log(Object.keys(require('./updater/latest.json').platforms).sort().join(' '))"`,
      comparé à la liste écrite dans le rapport d'exécution.

### Défaut B — la garde `I4`

- [ ] **CA-5** — **Rouge d'abord, exploit 1.** La fixture où `linux-x86_64` porte l'URL de l'exe
      Windows **passait** avant correctif (sortie verte capturée) et **échoue** après, avec un message
      **nommant la plateforme**. *Vérif* : `npx vitest run scripts/__tests__/verifier-mesures.test.mjs`,
      et la capture avant/après jointe au rapport.
- [ ] **CA-6** — **Rouge d'abord, exploit 2.** Idem pour **deux mesures de la même URL**, la mauvaise
      puis la bonne. *Vérif* : même commande.
- [ ] **CA-7** — Une **plateforme en doublon** dans `mesures.json` est une **violation nommée**, pas un
      écrasement silencieux. *Vérif* : même commande.
- [ ] **CA-8** — Le cas **légitime** — deux clés distinctes partageant la **même URL**
      (`linux-x86_64` et `linux-x86_64-appimage`) — reste **vert**. *Vérif* : même commande. Sans ce
      critère, la correction de CA-7 casserait le résultat de l'étape 3.
- [ ] **CA-9** — La garde du dépôt, exécutée sur les **fichiers réels versionnés**, est verte.
      *Vérif* : `npx vitest run scripts/__tests__/forge-host-parity.test.mjs`.

### Défaut J — l'instrument de mesure

- [ ] **CA-10** — `updater/mesures.json` est **produit par un script versionné du dépôt**, et son champ
      `mesurePar` cite la commande **qui l'a réellement produit**. *Vérif* : relancer
      `node scripts/mesurer-artefacts.mjs` deux fois et constater que le fichier ne diffère que par
      `mesureLe` (`git diff` cité) ; **et** vérifier que `mesurePar` désigne ce script.
      ⚠️ Un `mesures.json` dont la provenance ne se relance pas **échoue** ce critère — c'est
      l'état actuel du fichier GUI.
- [ ] **CA-11** — Le témoin négatif est **exercé** : pour chaque plateforme, la signature rejouée sur
      un octet altéré rend `invalide`, et le fichier le **consigne**. *Vérif* : champ
      `temoinNegatifOctetAltere` présent et à `"invalide"` pour **chaque** entrée de
      `updater/mesures.json`.

### Défaut G — le second manifeste du CI

- [ ] **CA-12** — Après la publication de l'étape 5, la release **ne porte plus** d'asset `latest.json`
      concurrent. *Vérif* : lister les assets de la release et constater son absence.
- [ ] **CA-13** — Les fichiers **`.sig` sont toujours téléversés** sur la release, et
      `publish-update.mjs` les consomme sans `--from`. *Vérif* : liste des assets + exécution réelle de
      la publication (log cité).

### Défaut I — `pub_date`

- [ ] **CA-14** — Deux exécutions de la publication sur le **même tag** avec le **même `--pub-date`**
      produisent un `updater/latest.json` **identique à l'octet**. *Vérif* :
      `node scripts/publish-update.mjs vX.Y.Z --dry-run --pub-date 2026-01-01T00:00:00Z` deux fois,
      sorties comparées par `diff` (vide).

### Non-divergence et durabilité

- [ ] **CA-15** — Une garde échoue si la version de `tauri-plugin-updater` verrouillée dans
      `src-tauri/Cargo.lock` **n'est plus** celle contre laquelle la convention de clés a été vérifiée
      (`2.10.1`), avec un message ordonnant de **re-vérifier `get_urls` en amont** avant de lever la
      garde. *Vérif* : la garde tourne dans la suite ; **contrefactuel obligatoire** — modifier la
      version dans une fixture (jamais dans `Cargo.lock`) et constater le rouge.
- [ ] **CA-16** — Les deux dépôts ne divergent pas :
      `diff IakaCockpit/specs/instructions/cles-installeur-manifeste-updater.md iakaFrameGUI/specs/instructions/cles-installeur-manifeste-updater.md`
      → **vide** ; et le dispositif retenu par **AR-6** est en place et mesuré par sa propre commande
      (si O2 : `diff` des deux `fixtures/updater-cles.json` → vide).
- [ ] **CA-17** — La garde du **GUI** porte désormais `HORS_COUVERTURE` et `I4bis`, avec le **même
      cliquet** que le Cockpit. *Vérif* : `npx vitest run scripts/__tests__/forge-host-parity.test.mjs`
      dans le GUI, plus un contrefactuel : inscrire une plateforme **téléchargeable** dans
      `HORS_COUVERTURE` doit faire **rougir** `I4`.
- [ ] **CA-18** — Les suites complètes sont vertes dans les deux dépôts, **chiffres cités**.
      *Vérif* : Cockpit `bash scripts/quality.sh` ; GUI `npm run lint:all` **et** `npm run test:all`.
      Un « OK » sans chiffre vaut **FAIL** (`iakaFrameGUI/CLAUDE.md` § Rendre un verdict de gate).

---

## Gate humain — ce que ce lot ne peut PAS prouver

Aucune installation Windows ni Linux n'a jamais été exercée sur ces apps, et aucune bascule réelle du
plugin n'a été lancée. Tout ce qui précède est établi par **mesure réseau** et **lecture de source**.

Les deux vérifications suivantes **ne sont pas des tâches de ce lot** ; elles sont des **actes humains**,
à porter au journal quand elles auront lieu :

1. Un client Windows installé **par MSI**, mis à jour, **remplace** son enregistrement MSI au lieu de
   s'installer à côté.
2. Un client Linux installé **par `.deb`**, mis à jour, **installe** le `.deb` au lieu d'échouer en
   `InvalidUpdaterFormat`.

Tant qu'elles ne sont pas faites, le lot se déclare **« mesuré, non recetté »** — jamais « corrigé ».

---

## Arbitrages — TRANCHES par le decideur le 2026-08-29

> **Les huit arbitrages sont TRANCHES : le decideur a valide l'instruction telle qu'ecrite, ce qui
> retient la recommandation de chaque ligne.** Le tableau ci-dessous se lit donc comme la **decision**,
> plus comme une proposition. Aucune ligne n'est laissee ouverte : si l'execution rencontre un cas que
> l'arbitrage ne couvre pas, elle s'arrete et remonte au decideur, elle ne tranche pas a sa place.
>
> Relaye par [PORTEFEUILLE][Odin]. Cadrage inchange par ailleurs : seul l'etat des arbitrages change,
> aucune ligne du perimetre, des etapes ou des criteres d'acceptation n'est modifiee.

| # | Question | Recommandation |
|---|---|---|
| **AR-1** | Un lot ou trois ? | **Trois**, dans cet ordre : celui-ci → « gardes tièdes » (C/D/E) → « installer depuis rien » (H). Critère : l'effet sur l'utilisateur. Seul ce lot en a un. |
| **AR-2** | Si `.deb`/`.rpm` ne sont **pas** signés ? | **Déclarer** le trou dans `HORS_COUVERTURE` (motif, date, condition de levée). Ne **pas** élargir le CI dans ce lot. |
| **AR-3** | Émettre `darwin-aarch64-app` / `darwin-x86_64-app` ? | **Non.** `bundle_type()` rend `App` par défaut sur macOS, donc le plugin demande **toujours** cette clé en premier ; elle est **absente aujourd'hui** et le repli générique fonctionne (mesuré 4/4). L'ajouter serait une promesse de plus sans gain — et un piège si elle se périmait. |
| **AR-4** | La clé générique Windows reste-t-elle NSIS ? | **Oui**, statu quo (`artifactRank`). Le lot ne doit changer le comportement d'**aucun** client déjà installé. |
| **AR-5** | Que faire de l'asset `latest.json` du CI ? | **`uploadUpdaterJson: false`.** ⚠️ Rectification : `tauri-action` **n'a pas** d'entrée pour renommer le fichier — seulement `uploadUpdaterJson`, `updaterJsonPreferNsis`, `uploadUpdaterSignatures`. « Lui faire écrire un nom distinct » **n'est pas une option disponible**. `updaterJsonPreferNsis: true` alignerait l'asset sur notre arbitrage mais **laisserait deux manifestes** côte à côte. |
| **AR-6** | Comment empêcher les deux apps de diverger ? | **O2** — une **table de conformité** `fixtures/updater-cles.json` (noms d'artefacts → clés attendues), **byte-identique** dans les deux dépôts, consommée par le test unitaire de chacun, et un `diff` en CA. *O1 (paquet partagé) crée un couplage inter-dépôts pour un gain MVP nul ; O3 (discipline seule) est ce qui a déjà échoué.* |
| **AR-7** | `pub_date` figé ? | **Oui**, `--pub-date` avec défaut = maintenant. Coût quasi nul, rend atteignable le no-op de republication qui ne l'est pas aujourd'hui. |
| **AR-8** | Où vit l'instruction ? | **Dans les deux dépôts, verbatim.** Le générateur du Cockpit est dans `IakaCockpit`, mais le défaut et la garde vivent des **deux** côtés, avec **deux implémentations distinctes**. Une instruction d'un seul côté ferait exécuter le lot à moitié. |

---

## Faits établis — vérifiés en lecture et sur le web (2026-08-29)

1. **`get_urls` essaie `{os}-{arch}-{installer}` puis `{os}-{arch}`** — confronté à la source, pas à la
   description reçue. Confirmé.
2. **`Installer::name()`** rend exactement : `appimage`, `deb`, `rpm`, `app`, `msi`, `nsis`.
3. **`bundle_type()`** lit une chaîne statique **patchée au bundling**
   (`__TAURI_BUNDLE_TYPE`, valeurs `…_VAR_DEB` / `_RPM` / `_APP` / `_MSI` / `_NSS`) ; **non patchée**,
   elle rend `Some(App)` sur macOS et **`None` ailleurs**.
4. **La doc officielle ne documente que `OS-ARCH`** : les clés d'installeur sont un **détail
   d'implémentation non documenté** de la version verrouillée. D'où R1 et CA-15.
5. **`2.10.1` est la version courante** du plugin (4 avril 2026) et **celle verrouillée** dans les deux
   `Cargo.lock`. Aucune version plus récente ne change la donne.
6. **`tauri-action`** n'expose que trois entrées « updater » : `uploadUpdaterJson` (défaut `true`),
   `updaterJsonPreferNsis` (défaut `false`, donc **préférence MSI** — l'inverse de notre arbitrage),
   `uploadUpdaterSignatures` (défaut `true`, *« Does not affect the latest.json generator »*).
7. **Les deux gardes divergent déjà** : `HORS_COUVERTURE` + `I4bis` existent côté Cockpit
   (`:59`, `:164-177`) et **pas** côté GUI. Les deux générateurs aussi : le GUI **ignore `.msi`**.
8. **`iakaframe endpoints` ne vérifie aucune signature** : `HEAD`, pas de sha256, pas de crypto
   (`iakaframe/cli/src/lib/endpoints.js:176-198`).

## Rectifications au relevé du 2026-08-28

- **Défaut F (« le vérificateur ne contrôle pas la signature globale ») — PÉRIMÉ, remplacé.** Côté
  Cockpit, `updater/mesures.json:6-7` déclare explicitement la couverture de la signature globale, la
  comparaison de keyid **et** un témoin négatif : le défaut décrit n'existe plus. **Le défaut réel qui
  occupe sa place est autre** : l'instrument n'est **pas versionné** (Cockpit : script de `scratchpad/`)
  et, côté GUI, la **provenance déclarée est fausse** — `iakaframe endpoints` ne peut produire ni
  `sha256` ni `signature`. C'est le défaut **J**, et il est **dans ce lot** parce qu'il est un
  **prérequis** de A : on ne peut pas tripler le nombre de clés annoncées avec un instrument qu'on ne
  peut ni relancer ni relire.
- **« Les deux plateformes ne se comportent pas pareil » — imprécis.** Le choix de la **clé du
  manifeste** est **identique** sur Windows et Linux : il passe par `bundle_type()` dans les deux cas.
  Ce qui diffère est le **traitement de l'octet à l'installation** : Windows **route** au magic byte
  (`MZ` → NSIS, CFB → MSI) et **installe quand même** ; Linux **refuse** (`InvalidUpdaterFormat`). D'où
  l'asymétrie des symptômes — Windows s'installe **à côté**, Linux **échoue** — pour une cause unique.
- **« Faire écrire à `tauri-action` un nom distinct » — indisponible.** Aucune entrée de renommage
  n'existe (cf. AR-5).
- **Défauts B, C, D, E, G, H, I : confirmés en lecture**, aux emplacements cités. Le défaut D est même
  un peu pire que décrit : `"["` n'étant ni une IP privée, ni `localhost`, ni `.local`, un endpoint
  IPv6 de boucle locale est déclaré **public** — la garde `I2` conclut l'inverse de la vérité.

## Estimation — obligatoire au jalon P1→P2

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** | **3,5 j** (fourchette **3 – 5**) |
| **Complexité / risque** | **Moyenne-haute.** Peu de lignes, mais **deux dépôts**, **deux implémentations**, de la **cryptographie de vérification**, et un mécanisme qui repose sur un **octet patché** invérifiable sans installation réelle. |

Décomposition : étape 0 ≈ 0,25 j · étape 1 (instrument versionné + témoin négatif) ≈ 0,75 j ·
étape 2 (`I4` pure + exploits rouge d'abord, ×2 dépôts) ≈ 0,75 j · étape 3 (générateurs, ×2 dépôts
distincts) ≈ 0,75 j · étape 4 (CI + `pub_date`) ≈ 0,3 j · étape 5 (publication réelle ×2 + re-mesure)
≈ 0,5 j · gate, doc, backlog ≈ 0,2 j.

**Inconnues susceptibles de faire glisser** :
- **U1** — `.deb`/`.rpm` non signés par le bundler → bascule sur AR-2 (**−0,3 j**) ou, si le décideur
  veut les signer, ouverture du CI (**+1 j**, et ce n'est plus ce lot).
- **U2** — chaque validation demande une **publication réelle** sur deux apps (bump, CI, release,
  minutes macOS facturées 10×). Un aller-retour raté coûte ~0,5 j.
- **U3** — la **recette réelle** Windows/Linux est **hors du lot** (gate humain) ; le lot se clôt en
  « mesuré, non recetté ». Si le décideur exige la recette dans le lot, il faut **des machines** :
  ordre de grandeur **+1 à 2 j**, dépendant de l'accès.
- **U4** — R3 : tout le bénéfice repose sur le patch `bundle_type()`, **vérifié en source, jamais
  observé** sur une installation réelle des deux apps.

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à confronter au temps
réel à la clôture du lot.

## Sources

- [tauri-plugin-updater — crates.io](https://crates.io/crates/tauri-plugin-updater)
- [updater.rs (plugins-workspace, v2)](https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/updater/src/updater.rs)
- [Updater — doc Tauri v2](https://v2.tauri.app/plugin/updater/)
- [tauri_utils::platform — bundle_type()](https://docs.rs/tauri-utils/latest/src/tauri_utils/platform.rs.html)
- [tauri-action — action.yml](https://raw.githubusercontent.com/tauri-apps/tauri-action/dev/action.yml)
