# CONVERGENCE-RELEASE-YML-ALIGNEMENT — un fichier convergent par convention, divergent en fait

> **Dépôt porteur** : `IakaCockpit` (référence de la convention de publication depuis le lot 1 de
> `CONVERGENCE-TROIS-FRERES` — motif § 3, AR-Y3). **Instruction UNIQUE** : `iakaFrameGUI` et
> `iakaInstall` n'en portent pas de copie, ils sont **nommés** ici (motif § 4 « Exclu »).
>
> Cadrée par 🔵 Gandalf le 2026-09-08, sur ordre de mission portefeuille 🔷 Odin. Successeur
> **nommé depuis le 2026-08-30** (lot L43), redit à chaque lot suivant sans jamais être traité :
> `IakaCockpit/CLAUDE.md:427` et `:550`, `iakaFrameGUI/CLAUDE.md:466` et `:600`,
> `iakaInstall/CLAUDE.md:524`, `fixtures/convergence.sha256:39-40` et `:99-100`,
> `fixtures/bloc-latest.sha256:8-11`, gate lot 1 `docs/qualite/gate-convergence-trois-freres-lot1.md:193`,
> gate lot 2 `docs/qualite/gate-convergence-lot2-et-registre-exclu.md:126`.

---

## 0. Ce qui a été mesuré pour ce cadrage, et comment

### 0.1 — Ce cadrage n'a PAS de shell. Les mesures d'exécution sont l'étape 0 de ⚒️ Gimli.

Tout ce qui suit est établi par **lecture de fichiers** (outil `Read`/`Grep`), jamais par exécution.
En particulier, **aucun `diff`, aucun `sha256`, aucun `npm run test:convergence` n'a été lancé** par
ce cadrage. Les numéros de ligne cités le sont **à l'état du disque au 2026-09-08**, après le lot 1
de `CONVERGENCE-TROIS-FRERES` ; ils sont vérifiables à l'œil, pas mesurés à la machine.

**Conséquence opératoire, non négociable** : l'**étape 0 de l'exécution** (§ 5) rejoue par la machine
ce que ce cadrage a établi par l'œil — `diff` complet des deux fichiers, empreintes, comptes de
registre. **Si une seule divergence de la table § 1 n'est pas retrouvée, ou si une divergence non
listée apparaît, l'exécution s'arrête et remonte** : la table est le référent du lot, pas un décor.

### 0.2 — Les références de ligne du corpus sont PÉRIMÉES, et il faut le dire

Le corpus entier — six fichiers, quatre dépôts — désigne les deux divergences par **« l. 72 »** et
**« l. 96-99 »**. **Ces numéros ne désignent plus rien** : ils dataient de l'état d'avant le lot
`RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE` (2026-09-08), qui a inséré le job `prepare` et son
brouillon en amont. Aux fichiers d'aujourd'hui (427 lignes de part et d'autre), les mêmes deux
divergences vivent aux lignes **123-124** et **164-169**.

Ce n'est pas un détail de forme : une instruction qui reprendrait « l. 72 » enverrait l'exécution
lire la ligne `{"key":"macos-x64",…}` de la matrice et lui ferait chercher un écart qui n'y est pas.
**Rectifier ces références fait partie du lot** (§ 4, geste 5) — en les **datant**, jamais en les
effaçant (règle 4 du corpus).

### 0.3 — Fichiers lus pour ce cadrage

- `IakaCockpit/.github/workflows/release.yml` (427 l.) et `iakaFrameGUI/.github/workflows/release.yml`
  (427 l.) — **lus intégralement, ligne à ligne**, c'est la mesure centrale (§ 1).
- `iakaInstall/.github/workflows/release.yml` (375 l.) — la convention la plus récente (§ 2).
- `IakaCockpit/fixtures/convergence.sha256` et `iakaFrameGUI/fixtures/convergence.sha256` (105 l.
  chacun) — **29 entrées**, `release.yml` **n'y figure pas** (§ 1.3).
- `IakaCockpit/fixtures/bloc-latest.sha256` (30 l.) — la fixture du bloc `latest:`.
- `docs/qualite/gate-convergence-trois-freres-lot1.md`,
  `docs/qualite/gate-convergence-lot2-et-registre-exclu.md`.
- `iakaInstall/specs/instructions/convergence-trois-freres.md` (M-C7, É-3, AR-C6, § 4 Exclu),
  `iakaInstall/CLAUDE.md` (§ Backlog, `RELEASE-PARTIELLE-PUBLIEE`).
- `IakaCockpit/src-tauri/Cargo.toml` et `iakaFrameGUI/src-tauri/Cargo.toml` — **c'est cette lecture
  qui tranche la question centrale du lot** (§ 1.1).
- `scripts/lib/bloc-latest.mjs` (extraction par marqueur, modèle de la garde § 3 AR-Y5),
  `scripts/lib/release-publication.mjs` (garde statique et sa limite déclarée).

---

## 1. Le problème — la nature EXACTE des divergences, mesurée ligne à ligne

Les deux `release.yml` font **427 lignes** chacun. Ils divergent en **quatre familles**, à **dix
emplacements**. Aucune n'est un octet perdu : chacune a une cause identifiable, et **elles ne sont
pas de même nature** — c'est tout l'enjeu du lot.

| # | Emplacement(s) | Contenu | Nature |
|---|---|---|---|
| **D-1** | l. **123-124** | dépendances `apt-get` : le Cockpit ajoute `libasound2-dev cmake pkg-config` (la ligne passe sur 2 lignes chez lui, 1 chez le GUI) | **LÉGITIME PAR PRODUIT — mesurée, § 1.1** |
| **D-2** | l. **164-167** | commentaire des secrets minisign : deux rédactions du **même fond** | **ACCIDENTELLE** sur la forme, **ancrée** sur un point (§ 1.2) |
| **D-3** | l. **27, 77, 171, 209, 329** | nom du lot dans les cartouches : `…-VERTE-COCKPIT` vs `…-VERTE-GUI` | **LOCALE PAR CONSTRUCTION** (deux instructions jumelles) |
| **D-4** | l. **27, 142** | identifiant du critère : `CA-A5` (annexe A) vs `CA-B5` (annexe B) | idem D-3 |

**Tout le reste est identique**, y compris des phrases qui nomment un dépôt dans les DEUX fichiers
(l. 359 « 4 tags sur 29 portent une release sur IakaCockpit », l. 366 « iakaFrameGUI porte aussi des
tags `archive/feat/*` ») : ces phrases sont **déjà convergentes**, et elles le restent. **Un fichier
convergent a le droit de nommer les deux dépôts ; il n'a pas le droit d'en nommer un SEUL et pas
l'autre.** C'est la règle de lecture qui sépare D-3/D-4 du reste.

### 1.1 — D-1 est LÉGITIME, et ce n'est pas une opinion : les `Cargo.toml` le disent

Le corpus a toujours écrit que D-1 était une divergence *« de build »* dont *« la preuve exigerait
un run de CI »* (`scripts/lib/bloc-latest.mjs:16-20`). **La preuve ne demandait pas un run de CI :
elle demandait de lire les deux `Cargo.toml`.** Faite ici :

| Paquet apt en plus chez le Cockpit | Exigé par | Preuve |
|---|---|---|
| `libasound2-dev` (en-têtes ALSA) | **`cpal = "0.15"`** — capture micro (L16-P1) | `IakaCockpit/src-tauri/Cargo.toml:45` |
| `cmake` | **`whisper-rs = "0.12"`** — *« compile whisper.cpp via CMake »*, dit par le commentaire du dépôt lui-même | `IakaCockpit/src-tauri/Cargo.toml:42-46` |
| `pkg-config` | découverte des `*-sys` de la chaîne ALSA | corollaire de la ligne 45 |

`iakaFrameGUI/src-tauri/Cargo.toml` **ne porte ni `cpal`, ni `whisper-rs`** — ses seules dépendances
non partagées sont `tauri-plugin-shell`, `reqwest` (`default-features = false`, HTTP seul, **aucune
pile TLS à compiler**) et `futures-util`, dont **aucune** n'exige de paquet système supplémentaire.

**Conclusion, et elle commande le lot** : la ligne de dépendances Linux **DOIT** différer. L'aligner
« par le haut » (donner les trois paquets au GUI) ferait installer à chaque build Linux du GUI trois
paquets dont **rien** n'a besoin — et, pire, **inscrirait au registre une donnée qui est par nature
propre à chaque produit** : le jour où le Cockpit gagne une dépendance système, le GUI devrait
bouger avec lui *sans raison*, ou la face croisée rougirait *à tort*. **La divergence n'est pas le
défaut ; c'est de l'avoir laissée DANS un fichier qu'on veut convergent.**

⚠️ **Fait mesuré au passage, à ne pas traiter ici** : `iakaInstall/.github/workflows/release.yml:132-133`
porte **les huit paquets**, ceux du Cockpit compris — alors que ce dépôt n'a **ni `cpal` ni
`whisper-rs`**. La copie a propagé la donnée locale avec la convention. C'est la démonstration
pratique du paragraphe ci-dessus ; c'est aussi hors périmètre (§ 4).

### 1.2 — D-2 est accidentelle, sauf sur UN point qui est structurel

Les deux rédactions disent la même chose (sans les deux secrets, pas de `.sig`, la mise à jour ne
peut pas fonctionner, leur pose est un gate humain) ; **les deux lignes `env:` elles-mêmes, l. 168-169,
sont identiques**. Une seule différence n'est pas cosmétique : la **référence documentaire**.

- Cockpit : *« **L34** : signature minisign… »* — numérotation de lot **propre à ce dépôt**.
- GUI : *« …(**auto-update.md, etape 6a**) »* — le GUI **ne numérote pas ses lots**, il le déclare
  lui-même (`iakaFrameGUI/CLAUDE.md` : *« Le dépôt Cockpit numérote ce lot L41 ; celui-ci ne
  numérote pas »*).

Écrire `L34` dans le fichier du GUI serait donc **faux chez lui**. Une rédaction commune doit citer
**les deux repères** ou **aucun** — voir AR-Y1.

### 1.3 — Ce que les gardes actuelles voient, et ce qu'elles ne voient pas

- `release.yml` **n'est PAS** au registre `fixtures/convergence.sha256` (29 entrées de part et
  d'autre, vérifiées par lecture ; le motif est écrit deux fois : `:38-43` et `:98-101`).
- Ce qui converge, c'est **le bloc `latest:`**, via `fixtures/bloc-latest.sha256` — une empreinte
  **byte-identique par construction**, extraite **par marqueur** (`scripts/lib/bloc-latest.mjs`), et
  ce fichier-là, lui, est au registre (`:44`).
- **Le reste du workflow n'est gardé par AUCUNE face de convergence.** Les jobs `prepare`, `build`
  et `publier` — soit **les lignes 1 à 272, dont les deux divergences de contenu D-1 et D-2** —
  peuvent dériver dans un seul dépôt **sans qu'aucune garde ne bronche**.
- Les deux gardes de release (`release-publication.mjs`, statique ; `release-publier-shell.test.mjs`,
  jambe d'exécution) sont **par dépôt** : elles vérifient que *ce* workflow-ci est conforme à la
  convention, **jamais** qu'il est identique à celui de la sœur.

**C'est exactement le défaut mesuré au lot L44 pour le bloc `latest:`** (*« un octet changé laissait
les deux faces vertes »*, `bloc-latest.mjs:12-13`), refermé pour un tiers du fichier et **laissé
ouvert pour les deux autres tiers**. Ce lot ferme le reste.

### 1.4 — Pourquoi ça a duré neuf jours, et pourquoi c'est le vrai sujet

`CONVERGENCE-RELEASE-YML-ALIGNEMENT` est nommé depuis le **2026-08-30** et redit à **six endroits**
sans jamais être traité. Le motif écrit à chaque fois est juste — *« les aligner trancherait EN
PASSANT une question de build »* — et il a **correctement** protégé trois lots successifs. Mais un
successeur qui se répète sans se traiter finit par devenir un **alibi** : c'est nommément la maladie
que le lot « Gardes de la vitrine » a soignée pour F-2/F-3 (six jours) et que le gate de L50 a
sanctionnée deux fois. **Le lot présent solde cette dette-là.**

---

## 2. L'état de l'art — la réponse existe déjà DANS ce portefeuille, quatre fois

La question « comment un fichier partagé porte-t-il une donnée propre à chaque dépôt ? » a déjà
**quatre réponses convergentes** dans ce corpus, toutes de la même forme : **le générique converge,
la donnée locale sort du fichier et vit dans un registre local nommé, hors registre de
convergence, avec son motif écrit.**

| Précédent | Fichier convergent | Registre local, hors convergence | Motif écrit |
|---|---|---|---|
| L42 — vitrine | `scripts/lib/vitrine.mjs`, `fixtures/vitrine-assets.json` | `fixtures/vitrine-locale.json` | `convergence.sha256:27-29` — *« LOCAL a chaque depot et n'a donc PAS sa place ici »* |
| L45 — canaux | `scripts/lib/canaux-publication.mjs` + 2 | `fixtures/canaux-publication.json` | `convergence.sha256:47-49` — *« son contenu diverge PAR NATURE »* |
| Convergence lot 1 | `scripts/test-convergence.mjs` | `fixtures/freres.json` | chaque dépôt y nomme *ses* voisins |
| L40 — clés updater | `fixtures/updater-cles.json` | `updater/latest.json` (sortie) | hors-couverture déclaré (`VERSION_NON_CARRIERS`) |

**`release.yml` est aujourd'hui le SEUL fichier partagé du portefeuille qui garde sa donnée locale
À L'INTÉRIEUR de lui-même.** C'est la raison, et la seule, pour laquelle il ne peut pas entrer au
registre. Le lot ne cherche donc pas une règle neuve : il **applique au workflow la règle que les
quatre autres appliquent déjà**.

**Corollaire sur la nature de la garde croisée** : `scripts/test-convergence.mjs` compare **octet à
octet, fichier entier**. Il ne sait pas — et **ne doit pas apprendre à** — ignorer des zones : c'est
un fichier byte-identique aux **trois** dépôts, et le lot `CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME`
vient de montrer (2026-09-08) ce que coûte une exception ajoutée à ce comparateur. **Toute solution
qui suppose « comparer le fichier en excluant des blocs » est donc écartée d'office** — non parce
qu'elle est inélégante, mais parce qu'elle porte son coût sur l'instrument le plus partagé du
portefeuille.

**Ce que la convention d'`iakaInstall` a déjà tranché, et qui ne se rouvre pas ici** : `iakaInstall`
a copié la convention de publication **du Cockpit** (`iakaInstall/.github/workflows/release.yml:3-7` :
*« COPIE de la convention d'IakaCockpit (M-R6, decidee au cadrage : les deux soeurs divergent deja
entre elles — voir CONVERGENCE-RELEASE-YML-ALIGNEMENT — c'est celle du Cockpit qui est choisie) »*),
puis le lot 1 l'a **fait remonter enrichie** vers les deux sœurs (AR-C6(a)). La **référence de la
convention est donc le Cockpit**, et c'est pourquoi cette instruction vit ici (§ 3 AR-Y3).

---

## 3. Arbitrages — 🔵 Gandalf propose, le décideur tranche

> **Verdicts rendus le 2026-09-08** — autonomie maximale (Stéphane, 2026-09-06), recommandations appliquées
> par 🟡 Odin : **AR-Y1** deps Linux → (b) `.github/deps-linux.txt` local ; minisign → (a) rédaction commune
> citant les deux repères ; cartouches/identifiants → (a) citer la paire. **AR-Y2 → (a)** `release.yml` entre
> au registre, byte-identique intégralement. **AR-Y3 → (a)** le Cockpit est la référence, sans générateur.
> **AR-Y4 → NON** pour `iakaInstall` ; successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES` après
> `UPDATER-DE-LA-FACADE`. **AR-Y5 → (a)** deux faces + garde neuve (aucun apt en dur, fichier local présent et
> non vide, hors registre) + jambe d'exécution avec faux `apt-get`. **AR-Y6 → (b) puis (a)** : dispatch Linux
> sur tag de test puis run nominal — actes du décideur.

### AR-Y1 — Que fait-on de chacune des quatre divergences ?

| Divergence | (a) aligner le texte | (b) sortir la donnée du fichier | (c) déclarer et laisser diverger |
|---|---|---|---|
| **D-1** deps Linux | donne 3 paquets inutiles au GUI **et** inscrit au registre une donnée par produit | `.github/deps-linux.txt` **local**, le workflow le lit | statu quo, `release.yml` reste hors registre |
| **D-2** minisign | rédaction commune, citant **les deux** repères (`L34` **et** `auto-update.md § 6a`) ou aucun | sans objet | statu quo |
| **D-3** nom du lot | citer la **paire** : `RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-COCKPIT/-GUI` | sans objet | statu quo |
| **D-4** `CA-A5`/`CA-B5` | citer la **paire** : `CA-A5/CA-B5` | sans objet | statu quo |

**➜ RECOMMANDATION : D-1 = (b) · D-2 = (a) · D-3 = (a) · D-4 = (a).**

*Motifs.* **D-1** : § 1.1 — la divergence est **nécessaire**, donc l'aligner serait faux ; la
déclarer sans la sortir laisserait le fichier hors registre, donc les deux tiers non gardés (§ 1.3).
**D-2/D-3/D-4** : ces trois-là ne portent **aucune information que l'autre dépôt ne puisse porter
aussi**. Citer la paire ne perd **rien** — le lecteur du GUI trouve encore son annexe B, celui du
Cockpit son annexe A — et supprime **sept** emplacements divergents pour le prix d'une réécriture de
commentaire. **Ne pas** effacer les suffixes au profit d'un nom tronqué : le nom exact est ce qui
permet de retrouver l'instruction jumelle sur disque.

⚠️ **Ce que (a) sur D-2 NE DOIT PAS faire** : choisir la rédaction du Cockpit « parce que c'est la
référence ». La référence du § 2 porte sur la **convention de publication**, pas sur la prose ; et la
rédaction du Cockpit contient `L34`, **faux chez le GUI**. La rédaction commune se **compose**.

### AR-Y2 — La règle : `release.yml` entre-t-il au registre ?

- **(a) OUI, byte-identique intégralement**, la donnée locale sortie dans `.github/deps-linux.txt`
  (hors registre, motif écrit). Le workflow **entre au registre** — soit **+1 entrée**, à quoi
  s'ajoutent les fichiers de la garde neuve (compte total en § 6, à **recalculer** par l'exécution).
  Les deux faces couvrent alors **la totalité** du workflow.
- **(b) NON — on généralise `bloc-latest` à plusieurs blocs nommés** (`prepare`, `publier`,
  `latest`), chacun avec son empreinte.
- **(c) NON — cartouche + registre de blocs locaux déclarés DANS le fichier**, la face croisée
  apprenant à ignorer ces zones.

**➜ RECOMMANDATION : (a).**

*Motifs.* **(c) est écartée d'office** : elle porte son coût sur `scripts/test-convergence.mjs`,
byte-identique aux **trois** dépôts (§ 2, corollaire). **(b) laisse le trou ouvert là où il fait
mal** : le bloc qui contient D-1 est le job **`build`** — celui qu'on ne pourrait justement **pas**
inscrire, puisqu'il porte la divergence légitime. On garderait trois blocs sur quatre et on
laisserait **non gardé exactement celui qui a dérivé**. **(a)** ferme tout, **n'invente aucun
mécanisme** (§ 2 : c'est le quatrième précédent de la même forme), et rend la règle énonçable en une
phrase : *« un fichier convergent ne porte AUCUNE donnée propre à un dépôt ; ce qui est propre à un
dépôt vit dans un registre local nommé, hors convergence, avec son motif. »*

*Prix assumé de (a), écrit ici* : on touche à l'**étape d'installation des dépendances Linux**,
c'est-à-dire au seul endroit du fichier dont une erreur casse un build. C'est le risque R-1 (§ 7),
et il commande le run de preuve (AR-Y6).

### AR-Y3 — Où vit la vérité ?

- **(a) Le Cockpit est la référence**, l'instruction y vit, les deux fichiers sont maintenus
  byte-identiques à la main (avec les deux faces pour l'imposer).
- **(b) Un gabarit + des paramètres par produit**, un générateur produisant les `release.yml`.

**➜ RECOMMANDATION : (a).**

*Motifs.* (b) ajoute un artefact que **GitHub n'exécute pas** : le fichier réel resterait le
`release.yml` généré, donc il faudrait **une garde de plus** pour vérifier que le généré est à jour —
un troisième mécanisme là où (a) n'en ajoute aucun. Et (b) est exactement ce que (a) fait déjà, mais
sans générateur : le « gabarit » **est** le fichier convergent, les « paramètres » **sont**
`.github/deps-linux.txt`. MVP d'abord. *Condition de réouverture, nommée* : le jour où le nombre de
zones paramétrées dépasse **deux** (par exemple si `iakaInstall` entre — AR-Y4), le générateur
redevient une question légitime.

### AR-Y4 — `iakaInstall` entre-t-il au registre pour `release.yml` ?

Mesuré par lecture : sa matrice est **la même à quatre plateformes**, ses jobs `prepare`/`build`/
`publier`/`latest` portent **la même convention** — mais il diverge sur **deux zones structurelles** :
(i) **aucun secret minisign** sous `env:` (il n'a pas d'updater — `UPDATER-DE-LA-FACADE` est un
successeur ouvert), (ii) une **étape supplémentaire** « Notarisation macOS — déclaration »
(l. 166-200, ~35 lignes), (iii) un cartouche d'en-tête de 13 lignes.

- **(a) OUI**, dans ce lot : il faudrait donner aux deux sœurs l'étape de notarisation déclarative
  et sortir le bloc `env:` minisign dans un troisième paramètre local.
- **(b) NON**, dans ce lot ; successeur nommé.

**➜ RECOMMANDATION : (b) — je tranche NON, et je soumets la trancheuse au décideur.**

*Motifs.* (a) ferait exactement ce que ce lot reproche à ses prédécesseurs : trancher **en passant**
deux questions qui ne sont pas la sienne (les sœurs doivent-elles porter une étape de notarisation
qu'elles n'ont jamais eue ? le bloc `env:` de signature devient-il une donnée locale ?). Le lot à
deux dépôts est déjà transverse ; à trois, il devient un lot de refonte. **Successeur nommé,
inscrit aux trois backlogs par ce lot** : **`CONVERGENCE-RELEASE-YML-TROIS-FRERES`**, avec sa
condition d'entrée écrite — *« quand `UPDATER-DE-LA-FACADE` a tranché si `iakaInstall` porte un
updater, puisque c'est cela qui décide si le bloc `env:` minisign est commun ou local »*.

### AR-Y5 — La garde

Ce qui existe déjà et **ne bouge pas** : la garde statique `release-publication.mjs`, la jambe
d'exécution `release-publier-shell.test.mjs`, le cliquet `bloc-latest`.

- **(a)** Les deux faces de convergence suffisent (le fichier est au registre) **+ une garde neuve à
  trois assertions** : (i) le workflow ne contient **aucun nom de paquet apt en dur** ; (ii)
  `.github/deps-linux.txt` existe, est non vide, une entrée par ligne ; (iii) ce fichier n'est **pas**
  au registre de convergence. **+ la jambe d'exécution étendue** à l'étape Linux (faux `apt-get`,
  vérification que les N paquets du fichier lui parviennent).
- **(b)** Les deux faces seules.

**➜ RECOMMANDATION : (a).**

*Motifs.* Sans (i), rien n'empêche de **réintroduire** un paquet en dur dans le fichier convergent —
et il y resterait, byte-identique et **faux pour l'un des deux produits**, parfaitement vert. Sans
(iii), quelqu'un inscrit un jour `deps-linux.txt` au registre « pour bien faire » et fabrique la
divergence qu'on vient de supprimer. Sans la jambe d'exécution, on aurait remplacé une ligne
`apt-get install -y <liste>` — dont la correction est évidente à l'œil — par une commande qui **lit
un fichier**, dont la correction ne l'est pas : c'est précisément le genre de substitution qui a
produit le défaut du run `34026373514` (`gh api --jq --arg`), attrapé, lui, par la jambe
d'exécution. **Une garde statique de texte n'aurait rien vu.**

### AR-Y6 — Le run de preuve

Aucune garde du dépôt ne prouve qu'`apt-get` installe réellement les paquets lus dans le fichier :
la jambe d'exécution rejoue un **faux** `apt-get`, la garde statique lit du **texte**. La limite est
la même que celle déjà déclarée dans `release-publication.mjs:17-24`.

- **(a)** Le **prochain tag** de chaque dépôt (run nominal 4/4), sans run dédié.
- **(b)** Un **`workflow_dispatch` avec `platforms: linux`** sur un tag de test, **avant** le
  prochain vrai tag — une seule plateforme, **aucune minute macOS** (facturée 10×).

**➜ RECOMMANDATION : (b), puis (a).** *Motifs.* Le seul risque du lot est le build **Linux** ; le
vérifier coûte un job sur `ubuntu-22.04`. Attendre le prochain tag ferait découvrir une erreur
d'invocation **pendant une release réelle**. Conséquence assumée : ce dispatch crée un **brouillon**
de release qui **reste** (AR-3 d'`iakaInstall` : un brouillon n'est jamais supprimé par un agent) —
sa suppression est un acte du décideur. **Les deux runs sont des actes de release : ils appartiennent
au décideur, et le lot se clôt « mesuré, non recetté » sur ce point, jamais « PASS ».**

---

## 4. Périmètre

### Inclus — les deux dépôts, un seul commit logique chacun

1. **`.github/deps-linux.txt`** (neuf, **un par dépôt**, **hors** registre de convergence) : un nom
   de paquet par ligne, motif écrit en tête (`#`), citant **la dépendance Rust** qui exige chaque
   paquet spécifique. Cockpit : 8 entrées. GUI : 5 entrées.
2. **`.github/workflows/release.yml`** rendu **byte-identique** entre les deux dépôts :
   - l'étape `Dependances systeme Linux` lit le fichier local au lieu de porter la liste ;
   - le commentaire minisign réécrit en rédaction **commune** (AR-Y1 D-2) ;
   - les 7 emplacements de D-3/D-4 réécrits en **paire** (`…-COCKPIT/-GUI`, `CA-A5/CA-B5`) ;
   - **rien d'autre ne bouge** — en particulier **le bloc `latest:` n'est PAS touché** (les quatre
     divergences vivent toutes **avant** la ligne `  latest:`), donc `fixtures/bloc-latest.sha256`
     reste **inchangé à l'octet** (CA-Y7).
3. **`fixtures/convergence.sha256`** : inscription de `.github/workflows/release.yml` (**+1**) et
   des fichiers de la garde neuve — **compte total en § 6, recalculé et non recopié** —, cliquet de
   complétude monté d'autant, avec un cartouche qui **date** et **rectifie** l'existant (`:35-43` et
   `:91-101`) — lequel affirme aujourd'hui que le workflow *« N'ENTRE PAS ici »*. **Rectifier en
   datant, jamais effacer** (règle 4 du corpus).
4. **La garde neuve** d'AR-Y5 (i/ii/iii) + **l'extension de la jambe d'exécution** à l'étape Linux,
   les deux **byte-identiques** entre les dépôts et **inscrites au registre** (le cliquet monte
   d'autant : voir § 6 pour le compte exact).
5. **Rectification des références périmées « l. 72 » / « l. 96-99 »** (§ 0.2) partout où elles
   vivent, **en les datant** : `scripts/lib/bloc-latest.mjs:16-20`, `fixtures/bloc-latest.sha256:8-11`,
   `fixtures/convergence.sha256:38-43` et `:98-101`, les trois `CLAUDE.md`. Elles deviennent de
   surcroît **sans objet** — le lot supprime les divergences qu'elles désignaient.
6. **`CLAUDE.md`** des deux dépôts : entrée de backlog avec sa preuve mesurée, et **inscription du
   successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES`** (AR-Y4) — dans les **trois** `CLAUDE.md`,
   `iakaInstall` compris (c'est le seul geste d'écriture de ce lot hors des deux sœurs, et il est
   **documentaire**).

### Exclu — décidé, pas oublié

- **`iakaInstall` au registre pour `release.yml`** → AR-Y4(b), successeur nommé.
- **Corriger la ligne de dépendances d'`iakaInstall`** (§ 1.1, ⚠️ : trois paquets probablement
  inutiles chez lui) — c'est une **mesure de build sur un troisième dépôt**, elle appartient au
  successeur, pas à ce lot. **La constater ici est le geste ; la corriger serait un « tant qu'on y
  est ».**
- **Toute autre convergence** : `scripts/vitrine*`, `bloc-latest`, canaux — intacts.
- **Toute modification de `scripts/test-convergence.mjs`** (§ 2, corollaire). Si l'exécution se
  surprend à vouloir y toucher, c'est que la solution retenue a dérivé : **s'arrêter et remonter**.
- **Le run de preuve** (AR-Y6) : acte du décideur.
- **Retirer le cliquet `bloc-latest`** devenu redondant. Il ne l'est pas tout à fait (il asserte en
  plus l'**unicité du marqueur**) et, surtout, on ne retire pas une garde dans le lot qui en ajoute
  une autre. **Conservé, sans un mot de moins.**

---

## 5. Étapes d'implémentation

### Étape 0 — LES MESURES QUE CE CADRAGE N'A PAS PU FAIRE (bloquante)

Ce cadrage n'a pas de shell (§ 0.1). **Avant toute écriture** :

0.1 `diff -u` **complet** des deux `release.yml`. **Attendu : exactement les quatre familles de la
table § 1, à dix emplacements.** Toute divergence non listée ⇒ **arrêt et remontée** (la table est
le référent, pas un décor). Toute divergence listée qui n'apparaît pas ⇒ idem.
0.2 `grep -c '^[0-9a-f]\{64\}'` sur les deux `fixtures/convergence.sha256` ⇒ **29** de part et
d'autre ; `diff` des deux registres ⇒ **vide**.
0.3 Empreinte du bloc `latest:` **avant** travaux, des deux côtés
(`node -e "import('./scripts/lib/bloc-latest.mjs').then(m=>console.log(m.empreinte(m.lireBloc('.'))))"`)
⇒ doit valoir `55b39b01dfe655c28f24f678481a050f75fca16e5e347f54a2b74f071502eaf7` (valeur lue dans
`fixtures/bloc-latest.sha256:30`). **Cette valeur est le témoin de non-régression de CA-Y7** : elle
devra être **identique** en fin de lot.
0.4 `npm run test:convergence` des deux côtés **avant** travaux ⇒ exit `0`, `30 chemin(s)`
(le « 30 » est le compte documenté = 29 entrées + le registre lui-même).
0.5 Relever la liste `apt` exacte des deux fichiers, **mot pour mot**, pour composer les deux
`deps-linux.txt` **sans en perdre un** (l'ordre est repris tel quel).

### Étape 1 — sortir la donnée locale (D-1)

1.1 Écrire `.github/deps-linux.txt` dans **chaque** dépôt, un paquet par ligne, avec un en-tête `#`
qui **nomme la dépendance Rust** justifiant les paquets non partagés (Cockpit : `libasound2-dev` ←
`cpal`, `cmake` ← `whisper-rs`, `pkg-config` ← chaîne `*-sys` ALSA) et qui **déclare** que ce
fichier est **local, hors `fixtures/convergence.sha256`**, sur le modèle exact du motif de
`fixtures/vitrine-locale.json` (`convergence.sha256:27-29`).
1.2 Remplacer l'étape, **à l'identique dans les deux dépôts** :

```yaml
      - name: Dependances systeme Linux
        if: matrix.key == 'linux'
        run: |
          sudo apt-get update
          xargs -r -a .github/deps-linux.txt sudo apt-get install -y
```

`xargs -r -a` (et non `$(cat …)`) : pas de découpage de mot non protégé, et `-r` **n'appelle pas**
`apt-get` sur un fichier vide plutôt que de l'appeler **sans argument** (ce qui réussirait en
silence — un vert muet). Les deux options sont GNU, présentes sur `ubuntu-22.04`.

### Étape 2 — aligner les trois divergences de texte (D-2, D-3, D-4)

2.1 Réécrire le commentaire minisign (l. 164-167) en une rédaction **commune** citant **les deux**
repères documentaires, ou aucun (AR-Y1). Les lignes `env:` **ne bougent pas**.
2.2 Réécrire les 5 cartouches de D-3 et les 2 de D-4 en **paire** citée
(`RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-COCKPIT/-GUI`, `CA-A5/CA-B5`).
2.3 `diff` des deux `release.yml` ⇒ **VIDE**. C'est la mesure charnière du lot ; tant qu'elle ne
l'est pas, ne pas passer à l'étape 3.

### Étape 3 — la garde neuve (AR-Y5), écrite ROUGE d'abord

3.1 `scripts/lib/deps-linux.mjs` — cœur **pur** (on lui passe des textes, il rend des faits ; aucun
accès disque, modèle `release-publication.mjs:1-5`) : `lireDeps(texte)` (lignes utiles, `#` et vides
ignorés), `paquetsEnDurDansWorkflow(texte)` (motif d'un `apt-get install` suivi d'un nom de paquet).
**Sa limite est déclarée dans son propre fichier** : elle lit du texte, jamais un runtime `apt`.
3.2 `scripts/__tests__/deps-linux.test.mjs` : (i) témoin **positif** (le workflow réel, non muté,
passe) ; (ii) contrefactuel « un paquet réintroduit en dur » ⇒ **rouge nommé** ; (iii)
`deps-linux.txt` vide ⇒ rouge nommé ; (iv) `deps-linux.txt` **inscrit au registre** ⇒ rouge nommé.
3.3 Étendre `scripts/__tests__/release-publier-shell.test.mjs` : extraire **par marqueur** l'étape
Linux, la rejouer en `bash` avec un **faux `sudo`/`apt-get`** qui journalise ses arguments, et
asserter que **les N paquets du fichier réel** lui sont passés, dans l'ordre. Contrefactuel : un
paquet ajouté au fichier ⇒ le faux `apt-get` en reçoit **N+1** ; fichier vide ⇒ `apt-get install`
**n'est pas appelé du tout**.
3.4 Chaque garde est éprouvée par une mutation **du programme** (jamais de l'attendu), **révoquée**
avec preuve (`sha256` identique avant/après).

### Étape 4 — inscrire, refixer, rectifier

4.1 Ajouter au registre `.github/workflows/release.yml`, `scripts/lib/deps-linux.mjs`,
`scripts/__tests__/deps-linux.test.mjs` ; monter le cliquet de complétude en conséquence.
4.2 Régénérer les empreintes **avec la commande canonique en tête du registre** (jamais à la main).
4.3 Écrire le cartouche neuf ; **rectifier en les datant** les cartouches et références périmés
(§ 4, gestes 3 et 5).
4.4 `fixtures/bloc-latest.sha256` : **ne pas y toucher** ; **vérifier** qu'il n'a pas bougé (CA-Y7).

### Étape 5 — mesurer les deux dépôts, dans les deux sens

`typecheck`, `lint`, `test` (Cockpit) / `lint:all`, `test:all`, `test:rust` (GUI), `vitrine:check`,
`test:convergence` **depuis chacun des deux dépôts**, `cargo fmt --check`, `cargo clippy`,
`cargo test`. **Aucun `.rs` n'est touché par ce lot** : le prouver par `git diff --stat -- '*.rs'`
vide, plutôt que l'affirmer.

### Étape 6 — remise

Remise au gate 🏹 Legolas, **jamais auto-validée**. Le run de preuve (AR-Y6) est **nommé comme dû au
décideur** dans la remise, et **compté non couvert**.

---

## 6. Fichiers concernés

| Chemin (× **2 dépôts** sauf mention) | Nature |
|---|---|
| `.github/deps-linux.txt` | **NEUF**, **local**, hors registre — la donnée par produit |
| `.github/workflows/release.yml` | modifié → **byte-identique**, **entre au registre** |
| `scripts/lib/deps-linux.mjs` | **NEUF**, convergent, au registre |
| `scripts/__tests__/deps-linux.test.mjs` | **NEUF**, convergent, au registre |
| `scripts/__tests__/release-publier-shell.test.mjs` | modifié (jambe d'exécution étendue), déjà au registre |
| `fixtures/convergence.sha256` | +3 entrées (**29 → 32**), cliquet monté, cartouche neuf + rectification datée |
| `fixtures/bloc-latest.sha256` | **INCHANGÉ** — cartouche `:8-11` rectifié en le datant, empreinte non touchée |
| `scripts/lib/bloc-latest.mjs` | commentaire `:15-21` rectifié en le datant (convergent → les deux dépôts, empreinte régénérée) |
| `CLAUDE.md` (× **3**, `iakaInstall` compris) | backlog + successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES` |
| `specs/instructions/convergence-release-yml-alignement.md` | **cette instruction, copie UNIQUE**, ici |

⚠️ **Le compte du cliquet est à recalculer à l'étape 4, pas à recopier d'ici** : ce cadrage annonce
**29 → 32** (workflow + 2 fichiers de garde) **par déduction, sans l'avoir mesuré**. Si l'exécution
en trouve un autre, c'est **la mesure qui gagne**, et l'écart se déclare.

---

## 7. Risques

- **R-1 — l'étape Linux est le seul endroit du fichier dont une erreur casse un build.** On y
  remplace une liste littérale par une lecture de fichier. *Mitigation* : la jambe d'exécution
  (3.3) rejoue la commande **réelle** avec un faux `apt-get`, et `-r` interdit l'appel à vide ;
  **preuve finale = le run de preuve AR-Y6(b), `platforms: linux`, avant tout vrai tag.** Ce risque
  est **assumé et déclaré**, pas éliminé.
- **R-2 — `xargs -a` n'est pas POSIX.** Il est GNU (findutils), présent sur `ubuntu-22.04` ; l'étape
  est de toute façon gardée par `if: matrix.key == 'linux'` et ne s'exécute **jamais** ailleurs.
  *Mitigation* : le run de preuve le tranche définitivement.
- **R-3 — une sœur bouge seule.** `fixtures/convergence.sha256` **et** `fixtures/bloc-latest.sha256`
  sont convergents (M-C7) : un commit d'un seul côté fait rougir la face croisée. *Mitigation* : ce
  lot est **un seul commit logique à deux dépôts** (§ 9), écrit dans les deux `CLAUDE.md`.
- **R-4 — le compte du cliquet.** Monter le plancher sans monter les entrées, ou l'inverse, se
  rattrape à la régénération. *Mitigation* : commande canonique du registre, jamais d'édition à la
  main ; contrefactuel « une ligne retirée ⇒ cliquet rouge nommé » déjà éprouvé par le lot 1.
- **R-5 — le témoin vide.** Le contrefactuel « paquet réintroduit en dur » doit porter sur un nom de
  paquet **qui n'est dans aucun des deux `deps-linux.txt`**, sinon l'assertion serait satisfaite par
  la lecture du fichier et resterait verte quoi qu'il arrive. *Mitigation* : verrou d'antériorité
  explicite, sur le modèle du `fantome-de-vitrine` de L42-F1 — **ce dépôt a payé ce défaut quatre
  fois**, il ne le rejoue pas.
- **R-6 — la rédaction commune de D-2 appauvrit.** En citant les deux repères, on rallonge ; en n'en
  citant aucun, on perd la piste documentaire. *Mitigation* : AR-Y1 tranche « les deux ou aucun » ;
  **la reco est « les deux »**, le coût étant deux mots.

---

## 8. Critères d'acceptation

> **Règle du dépôt, rappelée** : un critère non mesuré se déclare **non mesuré**, jamais *PASS* ;
> une mesure reprise d'un autre agent n'est pas une mesure ; chaque garde touchée est éprouvée par
> une mutation **du programme** (jamais de l'attendu), **révoquée** avec preuve `sha256`/`diff`.

- [ ] **CA-Y1 — les deux `release.yml` sont byte-identiques.** *Vérif* : `diff` des deux fichiers
      ⇒ **sortie vide**, dans les deux sens. *Contrefactuel* : un octet muté dans l'un ⇒
      `npm run test:convergence` **rougit en nommant `.github/workflows/release.yml`** ; révoqué,
      retour au vert vérifié. **C'est le critère central** : avant ce lot, cette même mutation
      laissait **les deux faces vertes** (mesuré au 2026-08-30, `bloc-latest.mjs:12-13`).
- [ ] **CA-Y2 — le workflow ne porte plus AUCUN nom de paquet apt en dur.** *Vérif* : la garde
      `deps-linux` est verte sur le fichier réel. *Contrefactuel* : réintroduire `libgtk-3-dev`
      dans la commande ⇒ **rouge nommé**, avec le paquet cité. ⚠️ Le contrefactuel emploie un nom
      **absent des deux `deps-linux.txt`** (R-5), et une **première assertion** vérifie qu'il n'est
      pas déjà détecté avant la mutation — verrou anti-témoin-vide.
- [ ] **CA-Y3 — la liste locale est réellement passée à `apt-get`.** *Vérif* : la jambe d'exécution
      rejoue l'étape avec un faux `apt-get` et constate **les N paquets du fichier réel, dans
      l'ordre**. *Contrefactuels* : (i) un paquet ajouté au fichier ⇒ **N+1** reçus ; (ii) fichier
      vide ⇒ `apt-get install` **jamais appelé** (et non appelé sans argument).
- [ ] **CA-Y4 — les deux `deps-linux.txt` diffèrent, et c'est écrit.** *Vérif* : le Cockpit porte
      les 8 paquets, le GUI les 5 ; chaque paquet non partagé est **nommé avec la dépendance Rust
      qui l'exige** dans l'en-tête. *Contrefactuel* : rendre les deux listes identiques ⇒ **aucune
      garde ne rougit** — et c'est **normal** : cette égalité serait une **décision**, pas une
      dérive. **Ce critère se vérifie par LECTURE, et cette limite est déclarée dans le fichier de
      garde** (précédent : la limite de `release-publication.mjs:17-35`).
- [ ] **CA-Y5 — `deps-linux.txt` n'est PAS au registre de convergence.** *Vérif* : absent de
      `fixtures/convergence.sha256`, avec son motif écrit. *Contrefactuel* : l'y inscrire ⇒ la
      garde `deps-linux` **rougit nommément** (assertion iii d'AR-Y5) — sans quoi la face croisée
      rougirait un jour sur une divergence **voulue**, et quelqu'un « réparerait » en alignant les
      listes.
- [ ] **CA-Y6 — le registre monte, et les deux registres restent identiques.** *Vérif* :
      `grep -c '^[0-9a-f]\{64\}'` ⇒ même compte des deux côtés ; `diff` des deux registres ⇒ vide ;
      chaque empreinte **recalculée contre le fichier réel** (jamais recopiée). *Contrefactuel* :
      retirer une ligne du registre ⇒ **cliquet rouge nommé**.
- [ ] **CA-Y7 — le bloc `latest:` n'a pas bougé d'un octet.** *Vérif* : l'empreinte recalculée en
      fin de lot est **identique** à celle relevée à l'étape 0.3
      (`55b39b01dfe655c28f24f678481a050f75fca16e5e347f54a2b74f071502eaf7`), des **deux** côtés, et
      `git diff -- fixtures/bloc-latest.sha256` ne montre que le **cartouche daté**, jamais la ligne
      d'empreinte. *Contrefactuel* : muter un octet du bloc ⇒ la garde `bloc-latest` rougit — elle
      est **conservée**, et ce contrefactuel le prouve.
- [ ] **CA-Y8 — les gardes de release préexistantes sont intactes et vertes.**
      `release-publication.test.mjs` (18/18) et `release-publier-shell.test.mjs` rejoués
      **individuellement**, codes et chiffres cités. *Contrefactuel de non-régression* :
      `releaseDraft: false` sur copie ⇒ rouge nommé (la convention transposée au lot 1 n'a pas été
      abîmée en passant).
- [ ] **CA-Y9 — les références périmées sont rectifiées EN LES DATANT.** *Vérif* : plus aucune
      occurrence de « l. 72 » / « l. 96-99 » **présentée comme actuelle** ; les anciennes phrases
      **conservées et datées**, jamais effacées (règle 4). *Contrefactuel* : `grep` des deux
      motifs ⇒ ne ramène plus que des lignes **explicitement historiques**.
- [ ] **CA-Y10 — le successeur est INSCRIT.** `CONVERGENCE-RELEASE-YML-TROIS-FRERES` figure dans
      les **trois** `CLAUDE.md`, avec sa **condition d'entrée** écrite (AR-Y4). ⚠️ **Ce critère a
      fait échouer le gate deux fois de suite** (lots « Gardes de la vitrine » et « Garde de la face
      en ligne des canaux ») : un lot qui solde un successeur oublié **ne peut pas repartir en
      oubliant le sien**. Corollaire pour 🟠 Aragorn : **l'ordre de mission NE DOIT PAS interdire à
      l'exécution de toucher au backlog** — c'est exactement la contradiction consignée au gate du
      2026-09-05.
- [ ] **CA-Y11 — aucun `.rs`, aucune dépendance, aucun `scripts/test-convergence.mjs` touché.**
      *Vérif* : `git diff --stat` sur chacun ⇒ **vide**. Toucher au comparateur serait le signe que
      la solution a dérivé (§ 4 Exclu).
- [ ] **CA-Y12 — chaîne qualité verte, chiffres cités, une ligne par commande.** Cockpit :
      `typecheck`, `lint`, `test`, `vitrine:check`, `test:convergence`, `cargo fmt --check`,
      `cargo clippy`, `cargo test`. GUI : `lint:all`, `test:all`, **`test:rust` sur sa PROPRE
      ligne** (jamais fondue — règle du dépôt), `vitrine:check`, `test:convergence`. **Aucune
      formule d'ensemble.**
- [ ] **CA-Y13 — NON COUVERT PAR CONSTRUCTION, DÉCLARÉ TEL : le run de preuve.** Qu'`apt-get`
      installe réellement les paquets lus dans le fichier n'est prouvable **que** par un run réel
      (AR-Y6). *Attendu du décideur* : un `workflow_dispatch` `platforms: linux` sur un tag de test
      **par dépôt**, job `build (linux)` **vert**, puis un run nominal 4/4 au prochain tag. **Ce
      critère se rend « non mesuré », jamais PASS**, et le brouillon créé par le dispatch **reste**
      (sa suppression est un acte du décideur).

---

## 9. Estimation, découpage et gate

### Estimation — ordre de grandeur assumé, révisable (pas un engagement ferme)

| Poste | Charge |
|---|---|
| Étape 0 (mesures, `diff`, empreintes, relevés) | **0,3 j** |
| Étapes 1-2 (paramétrage D-1 + alignement D-2/D-3/D-4, jusqu'au `diff` vide) | **0,4 j** |
| Étape 3 (garde neuve + jambe d'exécution + 5 contrefactuels, rouge d'abord) | **0,6 j** |
| Étape 4 (registre, cliquet, cartouches, rectifications datées, 3 backlogs) | **0,4 j** |
| Étape 5-6 (mesures croisées des deux côtés, remise) | **0,3 j** |
| **Total** | **≈ 2 j-homme** |

**Complexité : moyenne-basse.** Aucune logique produit, aucun `.rs`, aucune dépendance ; l'essentiel
est de la discipline de convergence, un domaine où ce portefeuille a **quatre précédents** (§ 2).

**Risque : MOYEN, et entièrement localisé.** Un seul point peut casser quelque chose — l'étape
d'installation des dépendances Linux (R-1) — et il n'est **pas prouvable hors CI**. Tout le reste du
lot est du texte gardé par des empreintes.

**Inconnues susceptibles de faire glisser l'estimation :**

1. **L'étape 0 trouve une cinquième divergence.** Ce cadrage a lu 427 lignes × 2 à l'œil, sans
   `diff`. Une divergence manquée (un espace, une casse) ⇒ **+0,2 à +0,5 j** selon sa nature. **La
   probabilité n'est pas nulle et c'est écrit ici plutôt que découvert au gate.**
2. **`xargs -a` se révèle inadapté** (comportement inattendu du runner) ⇒ repli sur
   `$(cat …)` + re-preuve ⇒ **+0,2 j**, et un aller-retour de run de preuve (délai, pas charge).
3. **Le compte du cliquet** (§ 6, ⚠️) diffère de la déduction 29 → 32 ⇒ **négligeable en charge**,
   mais il faut le **déclarer** plutôt que le forcer.
4. **Le décideur tranche AR-Y2 = (b) ou (c)** au lieu de (a) ⇒ **re-cadrage partiel**, l'estimation
   ci-dessus **ne vaut que pour (a)**. (b) coûterait plus cher pour un résultat moindre (§ 3) ;
   (c) est écartée d'office.
5. **Le run de preuve tarde.** Il n'est pas dans la charge (acte du décideur) mais il retient la
   **clôture** du lot : livré ⇒ gaté ⇒ **puis** recetté, parfois des jours plus tard. **Le lot se
   clôt « mesuré, non recetté » et le dit.**

### Découpage

**UN lot transverse, coordonné par 🔷 Odin, à DEUX dépôts, UN SEUL COMMIT LOGIQUE PAR DÉPÔT.**

Ce n'est pas un confort : `fixtures/convergence.sha256` **et** `fixtures/bloc-latest.sha256` sont
**convergents** (M-C7 de `convergence-trois-freres.md`). Si une sœur bouge seule, son registre
diverge, donc la face croisée rougit — **des deux côtés**. Les deux moitiés sont **indivisibles**,
exactement comme les annexes A et B du lot 1 (É-3 / AR-C6).

- Branche **de même nom dans les deux dépôts** : `feat/convergence-release-yml-alignement`.
- Ordre : étapes 0 → 4 **en parallèle des deux côtés**, puis étape 5 **croisée** (chaque dépôt
  mesure l'autre) avant tout commit final.
- ⚠️ **Piège mesuré du portefeuille, à rappeler à l'exécution** : deux agents en parallèle sur le
  même arbre git partagent index et branche. Si le lot est joué par deux exécutions concurrentes,
  **worktree séparé ou séquence** — jamais « fichiers disjoints donc c'est bon ».
- Le lot précédent a livré une **asymétrie** (une sœur commitée directement sur sa ligne
  principale). **Ici : branche des deux côtés, `main` intact, aucune fusion par l'agent.**

### Gate

Remise au gate **🏹 Legolas**, **jamais auto-validée**, verdict en **tableau contraint** (une ligne
par commande, code de sortie, résumé cité — aucune formule d'ensemble). Le gate **re-mesure**, il ne
reprend aucun chiffre de l'exécution.

**Ce qui reste au décideur, nommément** : trancher AR-Y1 à AR-Y6 ; jouer le run de preuve
(AR-Y6(b) puis (a)) ; supprimer le brouillon de test ; décider si
`CONVERGENCE-RELEASE-YML-TROIS-FRERES` s'ouvre après `UPDATER-DE-LA-FACADE`.
