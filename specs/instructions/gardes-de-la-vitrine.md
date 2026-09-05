# Gardes de la vitrine — la prose dit ce que la mesure mesure, et la face en ligne est exercée

> Successeurs **F-2** et **F-3**, inscrits au gate 🏹 Legolas du lot **L42** (2026-08-29) et jamais
> traités. Cadré par 🔵 Gandalf le 2026-09-05, sur ordre de mission de 🟠 Aragorn.
> **Les deux sont confirmés OUVERTS par mesure** (§ 1). Ils portent le même sujet — les gardes de la
> vitrine — et se traitent ensemble parce qu'ils touchent **les mêmes fichiers convergents**.
> **Les arbitrages AR-1..AR-5 sont TRANCHÉS par Stéphane le 2026-09-05 : « reco »** — chacun sur la
> recommandation de Gandalf, soit AR-1 = **O3** (corriger la prose **et** épingler la limite, ni la
> correction seule ni l'élargissement de la mesure) · AR-2 = **O3 bornée** (extraction + exécution
> en sous-processus) · AR-3 = **non** (la face en ligne des canaux N'entre PAS dans ce lot,
> successeur inscrit) · AR-4 = **entrées fabriquées** (jamais le fichier réel, qui est vide) ·
> AR-5 = **dans `scripts/lib/vitrine.mjs`**.
> Gate P1 franchi ; le § 3 conserve les options écartées pour mémoire.

---

## Problème

Deux défauts de garde, de natures opposées, sur le même dispositif.

**F-2 — une prose qui promet plus que la mesure.** `fichiersPromis` ne voit un artefact que s'il est
écrit **entre backticks** ; le commentaire qui la précède annonce que promettre « prose, note, **lien**,
titre » redevient mesurable « **quel que soit l'endroit** du README ». Un lien markdown dont l'URL porte
le nom du fichier n'est **pas** vu. Ce n'est pas un mensonge présent — les deux README ne citent
aujourd'hui d'artefact qu'en table générée, entre backticks — mais c'est **un commentaire qui affirme
une propriété que rien n'assert**, exactement la classe de défaut que le corpus a rectifiée en datant à
L43 (les deux prose fausses du bloc `latest`), à L45 (défaut 3, « vérifiée par `--check-only` » alors que
`--check-only` ne peut structurellement pas l'atteindre) et à L33 (S1, « le commentaire du code affirme
une propriété que rien n'assert »).

**F-3 — une garde qui n'est exercée par rien.** `scripts/vitrine-en-ligne.mjs` est la **seule face non
circulaire** du dispositif : la face locale compare deux dérivés de la même table et le dit elle-même
(« sans elle, ce fichier n'est qu'un mensonge cohérent »). Or **aucun test ne l'exécute**. Elle est
désarmable dans les deux dépôts avec régénération du registre sans qu'aucune face ne bronche :
l'empreinte de convergence prouve l'**altération**, jamais le **comportement**. C'est la garde dont tout
le reste dépend, et c'est la seule qui n'ait pas de garde.

---

## 1. Ce qui a été MESURÉ avant de cadrer

Faits relevés en lecture seule le 2026-09-05. Ils **confirment**, **précisent** et sur trois points
**contredisent** ce que l'ordre de mission énonçait.

### 1.1 F-2 est ouvert — et le défaut vit dans DEUX fichiers, pas un

`scripts/lib/vitrine.mjs:209` :

```js
const ARTEFACT = /`([A-Za-z0-9._-]+\.(?:exe|msi|dmg|deb|rpm|AppImage|tgz))`/g;
```

Le motif exige un backtick **ouvrant et fermant**. `fichiersPromis` (l. 266-274) et `fichiersCites`
(l. 218-222) l'utilisent tous deux.

Le commentaire de `fichiersPromis`, `scripts/lib/vitrine.mjs:262-264` :

> « Promettre ailleurs — prose, note, **lien**, titre — redevient mesurable, **quel que soit l'endroit**
> du README. »

**⚠️ FAIT NON SIGNALÉ DANS L'ORDRE DE MISSION** : la même surpromesse existe **une seconde fois**, dans
`scripts/__tests__/vitrine.test.mjs:256` :

> « Une promesse écrite ailleurs — prose libre, note, **lien** — n'est dérivée de rien. »

Les **deux** fichiers sont **convergents** (registre, l. 31 et l. 34). Traiter F-2 sans toucher le second
laisserait la moitié du défaut en place, dans le fichier de garde lui-même.

### 1.2 Le détail de l'écart — la mission le décrit un cran trop large

Le partage exact entre ce que la prose promet et ce que la regex mesure :

| Forme de promesse | Mesurée ? |
|---|---|
| Ligne de tableau, `` `nom.dmg` `` | **oui** |
| Prose libre **avec** backticks | **oui** — c'est la fermeture de L42-F1 |
| Note / titre **avec** backticks | **oui** |
| Prose nue, sans backticks | **non** |
| Lien markdown `[texte](…/nom.dmg)` | **non** |
| Ligne de bloc de code (`curl -LO …/nom.deb`) | **non** |

Donc : « **quel que soit l'endroit** » est **vrai** (la mesure balaie toutes les lignes hors bloc
d'absence — `fichiersPromis` itère sur `readme.split("\n")` sans filtre de forme). C'est « **quelle que
soit la FORME** », implicite dans l'énumération « prose, note, lien, titre », qui est **faux** — et le mot
qui le rend faux sans ambiguïté est **« lien »**. La mission écrivait « plus large que ce que la regex
mesure » : c'est exact, mais l'écart porte sur la **forme**, pas sur l'endroit. Rectifier la prose
consiste donc à retirer **« lien »** et à qualifier l'énumération, non à retirer « quel que soit
l'endroit », qui est la conquête de L42-F1 et doit rester écrite.

### 1.3 F-2 est bien un piège FUTUR — vérifié dans les deux dépôts

Recherche de tout suffixe d'artefact (`.exe|.msi|.dmg|.deb|.rpm|.AppImage|.tgz`) :

- `IakaCockpit/README.md` → **7 occurrences**, lignes 29-35, **toutes** des lignes de tableau générées,
  **toutes** entre backticks.
- `iakaFrameGUI/README.md` → **7 occurrences**, lignes 30-36, idem.

Aucune promesse hors backticks nulle part. **Aucun mensonge présent, dans aucun des deux dépôts.**

**Et le fait qui pèse le plus lourd dans l'arbitrage** : le défaut historique que L42-F1 a fermé — la
phrase en prose qui promettait un `.dmg` inexistant — **était écrit avec des backticks**. Le témoin qui
le rejoue le montre (`scripts/__tests__/vitrine.test.mjs:302`) :

```js
const prose = `Les utilisateurs prendront directement \`${FANTOME}\` sur la page de la release.`;
```

**Le seul mode de défaillance jamais observé est donc déjà couvert.** Les formes non couvertes sont
hypothétiques. Ce n'est pas une raison de mentir dans le commentaire ; c'en est une de ne pas élargir la
mesure sans le décider.

### 1.4 F-3 est ouvert — et l'étendue est PLUS LARGE que la mission ne l'écrivait

Recherche des trois scripts « en ligne » dans `scripts/` :

| Script | Exercé par un test ? | Mesure |
|---|---|---|
| `scripts/mesurer-artefacts.mjs` | **OUI** | `scripts/__tests__/canal-mesure.test.mjs:43` l'**exécute** en sous-processus |
| `scripts/vitrine-en-ligne.mjs` | **NON** | 2 occurrences, **commentaires seuls** (`vitrine.test.mjs:20`, `lib/vitrine.mjs:21`) |
| `scripts/verifier-canaux-en-ligne.mjs` | **NON** | 2 occurrences, **commentaires seuls** (`publish-push.test.mjs:147`, `forge-host-parity.test.mjs:289`) |

**Il y a donc DEUX faces en ligne non exercées, pas une.** Celle des canaux (L45) est dans exactement le
même cas que celle de la vitrine. La mission posait la question ; la réponse est oui. Le traitement de la
seconde relève d'**AR-3**.

### 1.5 Contrainte structurelle — le script ne peut pas être importé

`scripts/vitrine-en-ligne.mjs` est **top-level intégral** : il lit ses fichiers en constantes de module
(l. 46-51) puis exécute `await api(...)` **au niveau du module** (l. 101). Il n'a **ni fonction `main()`,
ni garde `import.meta.url === argv[1]`** — contrairement à `scripts/mesurer-artefacts.mjs`, qui porte les
deux (l. 281 et l. 324). **L'importer depuis un test l'exécuterait**, exactement le mur que L45 a heurté
sur `publish-update.mjs` et qui l'a conduit à extraire `scripts/lib/publish-push.mjs`. C'est ce fait qui
commande la forme du test (**AR-2**).

### 1.6 E-5 est VACUOUS aujourd'hui — dans les DEUX dépôts

La boucle E-5 (`vitrine-en-ligne.mjs:214`) itère sur `LOCALE.absents ?? []`. Mesuré :

- `IakaCockpit/fixtures/vitrine-locale.json:27` → `"absents": []`
- `iakaFrameGUI/fixtures/vitrine-locale.json:21` → `"absents": []`

**Zéro entrée des deux côtés.** Un test qui exercerait E-5 en pilotant le vrai `vitrine-locale.json`
**itérerait sur rien** : c'est le défaut **I4bis de L41**, mot pour mot — « le registre est vide,
l'itération portait sur zéro entrée ; supprimer l'appel laissait `54 passed` ». Il n'est pas question de
le réintroduire dans le lot dont c'est le sujet. **AR-4.**

### 1.7 La convergence est une contrainte DURE, et elle mord ici

`fixtures/convergence.sha256` — les **quatre** fichiers en jeu sont **tous inscrits** :

| Ligne | Fichier |
|---|---|
| 31 | `scripts/lib/vitrine.mjs` |
| 33 | `scripts/vitrine-en-ligne.mjs` |
| 34 | `scripts/__tests__/vitrine.test.mjs` |
| 57 | `scripts/verifier-canaux-en-ligne.mjs` |

Le **cliquet de complétude** est à **23** (`scripts/__tests__/forge-host-parity.test.mjs:297`,
`toBeGreaterThanOrEqual(23)`), motivé et daté l. 269-292.

**Conséquence, non négociable** : toute ligne touchée par ce lot se modifie **dans les deux dépôts au
même commit logique** ; les empreintes se régénèrent avec la commande en tête du registre ; tout fichier
neuf byte-identique **s'inscrit** et le cliquet **monte à sa valeur mesurée**. Le précédent est écrit
noir sur blanc dans le backlog : à L45, ne pas inscrire trois fichiers génériques a été **rectifié au
gate** et le cliquet est passé de 20 à 23.

### 1.8 Fait externe vérifié — la forme des réponses de l'API GitHub

Vérifié sur `docs.github.com/en/rest/releases/releases` (API version `2022-11-28`) : « Get the latest
release » et « Get a release by tag name » rendent le même schéma que « Create a release », qui porte
`tag_name` (string, requis), `draft` (bool), `prerelease` (bool) et `assets` (array), chaque asset
portant `name` (string, requis). Ce sont **exactement** les trois champs que le script lit
(`rLatest.corps?.tag_name`, `r.corps.assets ?? []` → `a.name`). La page des releases **ne documente pas**
l'endpoint « List repository tags » ; le champ `t.name` que lit la l. 106 n'est donc **pas** confirmé par
cette source. **Conséquence pour le cadrage** : le stub se construit sur **ce que le script lit**, pas
sur ce que la doc décrit — et c'est précisément pourquoi la limite de § 3.2 doit être écrite.

---

## 2. Décision retenue

Traiter **F-2** et **F-3** dans un lot unique, parce qu'ils touchent les mêmes fichiers convergents et
que les séparer imposerait deux fois la discipline des deux dépôts, du registre et du cliquet.

**Ligne directrice, valable pour les deux** : *une garde ne vaut que ce que sa preuve vaut.* F-2 est une
**preuve écrite qui dépasse la preuve mesurée** — on ramène l'écrit sur la mesure, **et on épingle la
limite** pour qu'elle ne puisse plus se déliter en silence. F-3 est une **garde sans preuve** — on lui en
donne une, **en disant exactement ce qu'elle prouve et ce qu'elle ne prouve pas**.

Ce lot **ne modifie aucun comportement utilisateur**. Comme L41, sa seule preuve est la mesure : d'où le
critère non négociable **« toute garde touchée est éprouvée par une mutation qui la fait rougir »**,
chaque mutation portant sur le **programme** (jamais sur l'attendu) et **révoquée avec preuve au
`sha256`**.

---

## 3. Arbitrages — **TRANCHÉS le 2026-09-05** (décideur : « reco »)

> AR-1 = **O3** · AR-2 = **O3 bornée** · AR-3 = **non** · AR-4 = **entrées fabriquées** ·
> AR-5 = **dans `scripts/lib/vitrine.mjs`**. Options écartées conservées ci-dessous.

### AR-1 — F-2 : corriger la prose, ou élargir la mesure ?

- **O1 — corriger la prose seule.** Retirer « lien » et qualifier l'énumération. Coût quasi nul.
  *Contre* : le piège futur reste entier, et rien n'empêche la prose de re-diverger.
- **O2 — élargir la mesure** aux liens markdown, blocs de code et prose nue.
  *Contre, et c'est mesuré* : `scripts/__tests__/vitrine.test.mjs:251-270` est une **liste blanche
  dure** — tout nom promis qui n'est pas dérivé de la table fait **rougir le gate**. Élargir signifie
  qu'un `curl -LO https://…/IakaCockpit_0.32.2_amd64.deb` écrit dans un guide d'installation devient un
  **échec de gate**. On transformerait « le README ne peut pas mentir » en « le README ne peut pas
  expliquer ». Et le seul mode de défaillance jamais observé est **déjà couvert** (§ 1.3).
- **O3 — corriger la prose ET épingler la limite.** La prose dit le vrai ; la limite devient un
  **hors-couverture déclaré** dans l'idiom du dépôt (motif, condition de levée), à côté des deux blocs
  existants de `forge-host-parity.test.mjs:241-263` ; et un **test la fige dans les deux sens** : un nom
  entre backticks **est** vu, le même nom sans backticks **ne l'est pas**.

**🔵 Recommandation : O3.** O1 laisse une prose libre de re-diverger — c'est la troisième fois que le
corpus paie une prose non gardée (L43, L45-défaut-3, L33-S1). O2 achète un piège hypothétique au prix
d'un faux positif certain sur un geste légitime. O3 rend la limite **mesurée** : le jour où quelqu'un
élargira la regex sans mettre la déclaration à jour, le pin rougira et **forcera la décision** au lieu de
la laisser passer. C'est le mécanisme que L41 a employé pour la partition de D-6, et il a tenu.

### AR-2 — F-3 : quelle forme de test, sachant que le script ne s'importe pas (§ 1.5) ?

- **O1 — sous-processus seul** (précédent `canal-mesure.test.mjs`) : `execFileSync` du script avec un
  `fetch` de substitution injecté par `node --import`. **Prouve** : le script s'exécute, les codes de
  sortie, le câblage complet. **Ne prouve pas** : les cas de bord que les fichiers réels ne contiennent
  pas — **E-5 reste hors d'atteinte** (§ 1.6).
- **O2 — extraction pure seule** (précédent `estPrive` → `scripts/lib/verifier-mesures.mjs`, L41) : la
  logique des cinq égalités devient une fonction pure `(README, table, locale, app, version, latest,
  tags, assets) → écarts`, testée sur entrées fabriquées. **Prouve** : les cinq verdicts, E-5 compris.
  **Ne prouve pas** : les codes de sortie, le chemin SKIP, **ni que la fonction est branchée** — c'est
  exactement la **jonction non exercée** que L42-F1 a payée et que L45 a dû déclarer non couverte.
- **O3 — les deux, dans un seul fichier de test.** Extraction pure pour les verdicts ; sous-processus
  pour les trois codes de sortie et la jonction.

**🔵 Recommandation : O3, bornée.** O2 seul reproduirait, dans le lot dont c'est le sujet, le défaut de
jonction que le corpus a payé cinq fois. O1 seul laisse E-5 vacuous — le défaut I4bis, dans le lot dont
c'est le sujet aussi. **Bornée** veut dire : on extrait la **logique de verdict et rien d'autre** — pas
de refonte du script en `main()`, pas de garde `import.meta.url`, pas de réécriture des messages. Le
script garde sa forme top-level ; il perd seulement le calcul au profit d'un appel.

### AR-3 — la face en ligne des CANAUX (`verifier-canaux-en-ligne.mjs`) entre-t-elle dans ce lot ?

§ 1.4 établit qu'elle a **le même défaut**.

- **(a) Non** — successeur nommé, inscrit au backlog, traité à part.
- **(b) Oui** — les deux faces en ligne dans le même lot, « tant qu'on y est ».

**🔵 Recommandation : (a).** Ce sont deux scripts distincts, aux verdicts distincts (trois états contre
cinq égalités), avec des stubs distincts : (b) double le lot sans rien mutualiser. Et « tant qu'on y
est » est nommément proscrit par la méthode. **Mais l'inscrire est le geste** : le successeur doit être
écrit au backlog dans le même commit que ce cadrage, pas laissé à la mémoire.

### AR-4 — E-5, que fait-on de la boucle vide ?

Dépend d'AR-2.

- **(a) Déclarer E-5 hors couverture**, avec motif (`absents: []` mesuré des deux côtés) et condition de
  levée (« le jour où une absence est déclarée »). Seule option si AR-2 = O1.
- **(b) Piloter E-5 par entrées fabriquées** via la fonction extraite — gratuit si AR-2 = O3.

**🔵 Recommandation : (b) si AR-2 = O3, (a) sinon.** Et dans les **deux** cas : **ne jamais faire porter
une assertion E-5 sur le `vitrine-locale.json` réel**. Il est local à chaque dépôt et son contenu peut
diverger : un test convergent qui en dépendrait deviendrait non déterministe entre les deux dépôts — le
jour où l'un déclare une absence et pas l'autre.

### AR-5 — où loge la fonction extraite (si AR-2 ∈ {O2, O3}) ?

- **(a) Dans `scripts/lib/vitrine.mjs`**, fichier déjà convergent, déjà « pur, zéro I/O, zéro réseau,
  déterministe » (son en-tête l. 1-2). Cliquet **23 → 24** (le seul fichier neuf est le test).
- **(b) Dans un `scripts/lib/vitrine-verdicts.mjs` neuf.** Cliquet **23 → 25**.

**🔵 Recommandation : (a).** La fonction est pure et relève exactement du contrat de ce fichier ; (b)
crée un second module là où un seul suffit et alourdit la discipline de convergence sans contrepartie.
Une seule mécanique, comme le dit `rendreGabarit` (l. 140-148) à propos d'un choix identique.

---

## 4. Périmètre

### Inclus

- **F-2** : rectification des **deux** proses (`scripts/lib/vitrine.mjs`, `scripts/__tests__/vitrine.test.mjs`)
  + hors-couverture déclaré + **pin bidirectionnel** de la limite *(forme selon AR-1)*.
- **F-3** : exercice de `scripts/vitrine-en-ligne.mjs` — extraction du verdict et/ou sous-processus
  *(forme selon AR-2)*, **réseau neutralisé, zéro connexion sortante**.
- La discipline de convergence complète : les deux dépôts au même commit logique, empreintes
  régénérées, **cliquet monté à sa valeur mesurée**, les deux faces rejouées des deux côtés.
- L'inscription au backlog du successeur d'AR-3.

### Exclu — explicitement, et rien de ceci ne se fait « en passant »

- `scripts/verifier-canaux-en-ligne.mjs` *(sauf AR-3 = (b))* — même défaut, autre lot.
- La jonction non couverte de `publish-update.mjs` (L45, **déclarée** telle) et
  `scripts/lib/publish-push.mjs`.
- `CONVERGENCE-RELEASE-YML-ALIGNEMENT` (L44) — les deux `release.yml` divergent l. 72 et 96-99.
- Le job `latest:` du workflow, le pointeur de release, CA-5/CA-6/CA-10 (L43/L44) — **aucun acte de
  release, aucun tag, aucune publication, aucune écriture distante**.
- `fixtures/vitrine-locale.json` : **aucune absence déclarée ni retirée** par ce lot. E-5 se pilote par
  entrées fabriquées (AR-4).
- Le contenu du `README.md` **hors zones générées** — ce lot n'écrit pas une ligne de README.
- `fixtures/vitrine-assets.json` (la table des plateformes) : **non touchée**.
- La forme top-level du script : **pas** de `main()`, **pas** de garde `import.meta.url`, **pas** de
  réécriture des messages d'écart (ils portent des rectifications datées de L43 et L44 qu'on ne remue
  pas).
- L'ajout de toute dépendance : **zéro**, comme L33 et L41.
- Remettre la face en ligne **dans le gate** : interdit. `scripts/quality.sh` steps [7/8] et [8/8]
  restent **inchangés**, hors gate, avec leurs trois codes.

---

## 5. Étapes d'implémentation

**Ordre imposé par une dépendance, pas par le confort** : la limite se prouve avant de s'écrire, et la
jonction se prouve après l'extraction.

1. **Relever l'état de départ** : `sha256` des quatre fichiers convergents en jeu, dans les **deux**
   dépôts ; compte d'entrées du registre ; `npm run test` vert des deux côtés. Sans ce point de départ,
   aucune révocation ne sera prouvable.
2. **F-2 — écrire le pin AVANT la rectification** (CA-2). Il doit être **vert** sur le code actuel : la
   regex mesure déjà le backtick et ignore déjà le reste. Un pin qui rougirait d'emblée signalerait que
   § 1.2 est faux — auquel cas **s'arrêter et remonter**.
3. **F-2 — rectifier les deux proses** : retirer « lien », qualifier l'énumération par la **forme**
   (« entre backticks »), **conserver** « quel que soit l'endroit » qui est vrai, et poser le
   **hors-couverture déclaré** (motif + condition de levée) dans le fichier de garde.
4. **F-2 — contrefactuel** : élargir `ARTEFACT` en retirant l'exigence de backtick → le pin doit rougir
   **nommément** dans son second sens. Révoquer, **prouver au `sha256`**.
5. **F-3 — extraire la logique de verdict** (AR-2/AR-5). La fonction reçoit tout en argument et ne lit
   **rien** ; le script conserve ses lectures de fichiers, son `fetch`, ses codes de sortie et ses
   messages **à l'octet**.
6. **F-3 — tests unitaires des cinq égalités** sur entrées fabriquées, chaque cas assertant le **code**
   de l'écart (`E-1`…`E-5`), jamais « au moins un écart » (CA-5).
7. **F-3 — test de sous-processus** : stub `fetch` injecté par `node --import`, **compteur d'appels
   écrit dans un fichier temporaire** pour que le test puisse prouver que le script est **passé par le
   réseau simulé** et n'a pas court-circuité (CA-3, le verrou). Trois cas : **0**, **1** avec le fichier
   attendu **nommé dans la sortie**, **3** par `fetch` qui jette **et** par HTTP 403 (CA-4).
8. **F-3 — contrefactuels**, un par garde : neutraliser `api()`, faire sortir `nonMesure` en 0, renvoyer
   une liste d'écarts vide depuis le script. Chacun doit faire rougir **le test attendu, nommément**.
   Révoquer chacun, **prouver au `sha256`**.
9. **Convergence** : reporter **tout** dans le dépôt frère, `diff` octet à octet, régénérer les
   empreintes avec la commande en tête du registre, **monter le cliquet à la valeur mesurée**, motiver
   et **dater** la montée dans le commentaire, comme l. 276 et l. 285.
10. **Rejouer** : `npm run test` et `npm run test:convergence` dans les **deux** dépôts, puis
    `bash scripts/quality.sh` ici. Rejouer `npm run test` **réseau coupé** (CA-8).
11. **Inscrire au backlog** le successeur d'AR-3, et **rien d'autre**.

---

## 6. Fichiers concernés

- `scripts/lib/vitrine.mjs` — **convergent** — prose de `fichiersPromis` rectifiée (l. 262-264) ; +
  fonction de verdict extraite *(si AR-5 = (a))*.
- `scripts/__tests__/vitrine.test.mjs` — **convergent** — prose rectifiée (l. 256) ; hors-couverture
  déclaré ; pin bidirectionnel de la limite.
- `scripts/vitrine-en-ligne.mjs` — **convergent** — le calcul des cinq égalités laisse place à un appel.
  Lectures, `fetch`, messages et codes de sortie **inchangés**.
- `scripts/__tests__/vitrine-en-ligne.test.mjs` — **NEUF, convergent** — unitaires des verdicts +
  sous-processus des codes.
- `fixtures/convergence.sha256` — empreintes régénérées ; ligne neuve pour le test.
- `scripts/__tests__/forge-host-parity.test.mjs` — **convergent** — cliquet **23 → 24** *(→ 25 si
  AR-5 = (b))*, motivé et daté.
- `CLAUDE.md` — successeur d'AR-3 inscrit au backlog.
- **Et les jumeaux de chacun** dans `/Users/sjupin/work/iakaFrameGUI`.

---

## 7. Risques

- **R1 — faux positifs de gate**, si AR-1 = O2. **Mesuré** : la liste blanche de
  `vitrine.test.mjs:251-270` fait de tout nom cité et non dérivé de la table un **rouge dur**. Un nom de
  fichier dans un exemple de commande deviendrait un échec. *Mitigation* : AR-1 = O3.
- **R2 — un stub ne prouve pas le monde réel.** Voir § 3.2 : à écrire dans le fichier de garde, jamais
  seulement dans un rapport.
- **R3 — dérive de convergence.** Toucher un fichier inscrit d'un seul côté. *Mitigation* : la face
  locale le nomme et la face croisée le voit — à condition de **rejouer les deux, des deux côtés**
  (étape 10), pas seulement ici.
- **R4 — E-5 non déterministe entre dépôts** si le test lisait `vitrine-locale.json`. *Mitigation* :
  AR-4, entrées fabriquées uniquement.
- **R5 — remettre la face en ligne dans le gate par la bande.** *Mitigation* : le test exerce le
  **script** contre un réseau **simulé** ; `quality.sh` reste inchangé ; CA-8 le mesure réseau coupé.
- **R6 — un témoin qui pourrait être satisfait par autre chose.** La leçon a été payée **cinq fois**
  (L42-F1, L37-CA6, le FAIL de L46, le verrou de L47, le verrou d'horloge de L48). *Mitigation* : chaque
  CA ci-dessous porte un **verrou explicite**, et le verrou est **conservé dans le dépôt**, pas joué puis
  retiré.

---

## 8. Critères d'acceptation

Chacun avec **Vérif**, **Contrefactuel** et **Verrou**. Un CA sans contrefactuel rejoué n'est pas
satisfait.

- [ ] **CA-1 — la prose ne promet plus que la mesure.** Le mot « lien » ne figure plus dans les deux
      énumérations ; l'énumération qualifie la **forme** (« entre backticks ») ; « quel que soit
      l'endroit » est **conservé**.
      **Vérif** : lecture des deux fichiers dans les deux dépôts + CA-2.
      **Contrefactuel** : sans objet seul — c'est CA-2 qui le porte.
      **Verrou** : la rectification est **inutile sans CA-2** ; livrer CA-1 seul est un refus.

- [ ] **CA-2 — la limite est ÉPINGLÉE, et le pin mord dans les DEUX sens.** Un nom d'artefact **entre
      backticks**, hors bloc d'absence, **est** vu par `fichiersPromis` ; **le même nom** sans backticks
      (prose nue, URL de lien markdown, ligne de bloc de code) **ne l'est pas**.
      **Vérif** : un test nommé, sur fixture en mémoire, **jamais** sur le vrai README.
      **Contrefactuel** : retirer l'exigence de backtick de `ARTEFACT` → **ce test-là** rougit,
      nommément, sur le second sens. Révocation prouvée au `sha256` de `scripts/lib/vitrine.mjs`.
      **Verrou** : le nom employé est le **fantôme** déjà en place
      (`{APP}_{V}_fantome-de-vitrine.dmg`, dérivé d'aucune plateforme, absent des deux README), et une
      **première assertion** exige qu'il ne soit **pas déjà promis** par le README. Sans elle, le témoin
      redeviendrait vide en silence le jour où le nom rejoindrait la table — le défaut **exact** de
      L42-F1.

- [ ] **CA-3 — `scripts/vitrine-en-ligne.mjs` est EXÉCUTÉ par le gate, réseau neutralisé.**
      **Vérif** : sous-processus, `fetch` de substitution injecté par `node --import` ; **zéro connexion
      sortante**.
      **Contrefactuel** : neutraliser le corps de `api()` (retour constant) → le test rougit.
      **Verrou** : le stub **écrit un compteur d'appels** et le test exige **compteur > 0** avec les
      chemins demandés. Sans lui, un script qui sortirait **avant tout `fetch`** satisferait le test —
      un témoin vide, et le plus facile à produire ici.

- [ ] **CA-4 — les TROIS codes de sortie sont exercés.** `0` (concorde), `1` (écart), `3` (non mesuré,
      par `fetch` qui jette **et** par HTTP 403).
      **Vérif** : trois stubs, assertions sur le **code** et sur la **sortie**.
      **Contrefactuel** : faire sortir `nonMesure` en `0` → le cas 3 rougit. C'est le faux vert que ce
      script existe pour interdire, écrit dans son en-tête l. 26-30.
      **Verrou** : le cas `1` assert que la sortie **nomme le fichier** attendu, pas seulement que le
      code vaut 1 — sinon **n'importe quel** écart, y compris un écart accidentel, satisferait le test.

- [ ] **CA-5 — les cinq égalités rendent le verdict attendu sur entrées FABRIQUÉES, E-5 comprise**
      *(si AR-2 ∈ {O2, O3} ; sinon E-5 est un hors-couverture déclaré au titre d'AR-4 = (a))*.
      **Vérif** : table de cas sur la fonction pure ; **aucune** assertion ne lit `vitrine-locale.json`.
      **Contrefactuel** : muter chaque comparaison **une à une** → chaque cas rougit
      **individuellement et pour la bonne raison**, comme les quatre mutations de L33.
      **Verrou** : chaque cas assert le **code** de l'écart (`E-1`…`E-5`), jamais « au moins un écart ».
      Et E-5 est piloté par une absence **fabriquée dans le test** : itérer sur le registre réel serait
      **vacuous** (§ 1.6), le défaut I4bis rejoué dans le lot dont c'est le sujet.

- [ ] **CA-6 — la JONCTION est exercée** : le script appelle bien la fonction extraite.
      **Vérif** : le sous-processus de CA-3/CA-4 traverse la fonction.
      **Contrefactuel** : faire rendre au script une liste d'écarts vide sans passer par la fonction →
      **CA-4 cas 1** rougit. Si aucun test de sous-processus ne rougit, la jonction n'est **pas**
      couverte et il faut l'écrire tel quel.
      **Verrou** : ce CA existe parce que **CA-5 seul ne le prouve pas**. C'est la leçon de L42-F1 et la
      non-couverture déclarée de L45.

- [ ] **CA-7 — la convergence est tenue, et le cliquet monte.** Les fichiers touchés et créés sont
      **byte-identiques** entre les deux dépôts, **inscrits** au registre, empreintes régénérées ; le
      cliquet est posé **à la valeur mesurée** du registre, motivé et **daté**.
      **Vérif** : `diff` octet à octet ; `npm run test` **et** `npm run test:convergence` verts **dans
      les deux dépôts**.
      **Contrefactuel** : muter un octet d'un fichier inscrit **d'un seul côté** → la face locale
      **nomme** le fichier ; retirer une ligne du registre **des deux côtés** → le **cliquet** rougit.
      Révocations prouvées au `sha256`.
      **Verrou** : le cliquet est posé à la valeur **mesurée**, jamais en dessous — un plancher sous le
      compte réel est exactement le trou qu'il existe pour fermer (l. 280-281, l. 290-292).

- [ ] **CA-8 — le gate reste hors ligne.** `npm run test` est vert **réseau coupé**, dans les deux
      dépôts.
      **Vérif** : rejeu effectif, pas une déduction de lecture.
      **Contrefactuel** : retirer `--import <stub>` du lancement → le test devient dépendant du réseau,
      donc rouge ou non déterministe hors ligne — ce qui prouve que la neutralisation est **agissante**.
      **Verrou** : `scripts/quality.sh` steps [7/8] et [8/8] sont **inchangés à l'octet** : la face en
      ligne reste **hors gate**, avec ses trois codes. Vérifié au `sha256` du fichier.

- [ ] **CA-9 — aucune régression.** `bash scripts/quality.sh` **exit 0** ici ; comptes de tests front et
      Rust relevés **avant/après** ; **zéro dépendance ajoutée** ; **zéro ligne de `README.md`**, de
      `fixtures/vitrine-assets.json` et de `fixtures/vitrine-locale.json` touchée.
      **Vérif** : `git diff --stat` du lot.
      **Verrou** : les comptes sont **remesurés**, jamais recopiés d'un rapport — le défaut D3 de L34,
      où un compte annoncé n'avait jamais été recompté.

- [ ] **CA-10 — le successeur d'AR-3 est INSCRIT.** La face en ligne des canaux
      (`scripts/verifier-canaux-en-ligne.mjs`) figure au backlog avec sa mesure (§ 1.4), qu'elle soit
      traitée ou non par ce lot.
      **Verrou** : l'inscrire est **le geste** ; la laisser à la mémoire est le défaut que F-2 et F-3
      illustrent — deux successeurs inscrits à L42 et restés **six jours** sans traitement.

---

## 9. Ce qu'un test de la face en ligne PROUVE — et ce qu'il ne prouve PAS

> **À recopier dans le fichier de garde, pas seulement ici.** C'est la règle du dépôt : une limite se
> déclare **là où elle vit** (précédents : les deux hors-couverture de `forge-host-parity.test.mjs`, la
> limite de `publish-push.test.mjs`, celle de `vitrine.test.mjs:15-24`).

**Ce qu'il prouve.** Que le script **s'exécute** et **traite correctement ce qu'il reçoit** : que les
cinq égalités rendent le bon verdict sur des entrées connues, que les trois codes de sortie sont posés
aux bons endroits, que le chemin `SKIP` **sort en 3 et non en 0**, et que la logique de verdict est
réellement **branchée** dans le script.

**Ce qu'il ne prouve pas, et qu'il ne faut pas laisser croire.**

1. **Que le stub ait la forme de l'API réelle.** Le stub est construit sur ce que le script **lit**
   (`tag_name`, `assets[].name`, `t.name`), pas sur ce que GitHub **rend**. Trois de ces champs sont
   confirmés par la doc (§ 1.8) ; `t.name` de l'endpoint des tags **ne l'est pas** par cette source. Si
   l'API changeait de forme, **tous** les tests resteraient verts et la face en ligne rendrait un
   verdict faux.
2. **Que la vitrine dise vrai.** C'est la question que la face en ligne pose, et **seule son exécution
   réelle** y répond — `quality.sh` step [7/8], hors gate, réseau requis, inchangée par ce lot.
3. **Que la release existe.** Un stub sert ce qu'on lui dit de servir.

**Autrement dit** : ce lot donne une garde à la garde, il ne remplace pas la mesure. Le dispositif garde
**trois** niveaux et non deux — la face locale (dérivés de la même table), le test de la face en ligne
(traitement correct de ce qui est reçu), et la face en ligne réelle (confrontation au monde). **Aucun ne
subsume les autres.** L'écrire est la condition pour que le vert de ce lot ne soit pas lu, un jour,
comme « la vitrine est vérifiée ».

---

## 10. Estimation

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** (spec fermée) | **2 à 2,5 j-homme** — F-2 ≈ 0,5 j · F-3 ≈ 1,5 j · convergence + rejeux + contrefactuels ≈ 0,25-0,5 j |
| **Complexité** | **Faible-moyenne** techniquement. Aucun algorithme nouveau, aucune dépendance, deux précédents de forme **déjà écrits dans le dépôt** (`canal-mesure.test.mjs` pour le sous-processus, `verifier-mesures.mjs` pour l'extraction pure). |
| **Risque** | **Moyen — de discipline, pas de technique.** Le coût réel est dans les **deux dépôts**, le registre, le cliquet, et **onze contrefactuels à jouer puis révoquer avec preuve**. C'est exactement là que L42, L44 et L45 ont dérapé. |

**Inconnues susceptibles de faire glisser l'estimation** :

1. **L'état du dépôt frère** au moment du lot — branche courante, arbre propre, écarts préexistants. Non
   vérifié par ce cadrage au-delà des fichiers cités.
2. **Le nombre exact de contrefactuels sur E-1..E-5** : cinq mutations minimum si chaque comparaison est
   mutée une à une (forme L33), davantage si une égalité se révèle porter plusieurs branches.
3. **La forme finale de l'extraction** : si la logique de verdict s'avère plus entrelacée avec les
   `await api(...)` que la lecture ne le laisse voir, l'extraction bornée d'AR-2 = O3 pourrait demander
   un découpage supplémentaire — auquel cas **s'arrêter et remonter** plutôt qu'élargir en silence.
4. **AR-3 = (b)** ajouterait **≈ 1 j-homme** (second script, second stub, second jeu de codes).

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à **rappeler et
confronter au temps réel** à la clôture du lot.
