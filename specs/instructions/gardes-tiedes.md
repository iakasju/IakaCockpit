# Gardes tièdes — une garde qui ne peut pas rougir n'est pas une garde

> **Ce fichier est DUPLIQUÉ VERBATIM dans les deux dépôts** — `IakaCockpit/specs/instructions/` et
> `iakaFrameGUI/specs/instructions/`. Même raison qu'en L40 (AR-8) : les défauts vivent des **deux**
> côtés, dans des fichiers **convergents**, et une instruction écrite d'un seul côté ferait exécuter
> le lot à moitié. Une différence entre les deux copies est un défaut (CA-16).
>
> Nomenclature : dans le backlog `IakaCockpit`, ce lot porte le numéro **L41**. Le dépôt
> `iakaFrameGUI` n'utilise pas de numérotation ; il l'inscrit sous son titre.
>
> Successeur **nommé et explicitement exclu** par L40
> (`cles-installeur-manifeste-updater.md` § Périmètre → Exclu → *Lot successeur n°1*).
>
> Cadré par 🔵 Gandalf le 2026-08-29, sur relevé du décideur. **Tous les faits repris ici ont été
> contre-vérifiés en lecture sur les fichiers du disque** ; ceux qui **rectifient** le relevé reçu
> sont signalés (§ Rectifications au relevé). Les faits externes sont sourcés (§ Sources).

---

## Problème

Le fil conducteur proposé par le décideur — *« des gardes qui ne peuvent pas échouer, ou qui
échouent sur la mauvaise chose »* — **tient**, mais il est trop large d'un cran : il mélange trois
mécaniques de défaillance qui n'ont **pas le même remède**, et il ramasse deux défauts qui ne sont
pas des gardes du tout. Le voici découpé, chaque famille avec son remède propre :

**Famille 1 — le PRÉDICAT est faux ou trop faible.** La garde tourne, elle est bien branchée, mais
ce qu'elle demande n'est pas ce qu'elle prétend demander.
- **D** — `estPrive` (`scripts/__tests__/forge-host-parity.test.mjs:111-121`) conclut **l'inverse de
  la vérité** sur une boucle locale IPv6. Vérifié au caractère près : `"[::1]:3001".split(":")[0]`
  vaut `"["`, qui n'est ni `127.*`, ni `localhost`, ni `.local` — donc `estPrive` rend `false`, et
  `I2` (`:137-143`, qui asserte `.toBe(false)`) **certifie qu'une boucle locale est publique**. Même
  mécanique pour un nom d'hôte nu de LAN : `"nas:3001".split(":")[0]` vaut `"nas"` → *public*.
- **C** — la date de la preuve n'est contrainte **par rien** : `verifierMesures` teste
  `if (!mesures?.mesureLe)` (`scripts/lib/verifier-mesures.mjs:38`). `"2020-01-01"` passe au vert,
  et même une chaîne quelconque non vide. L40 a **déplacé** cette assertion dans la fonction pure
  sans la renforcer.

**Famille 2 — la JONCTION n'est pas gardée.** La logique est éprouvée sur fixtures ; rien ne prouve
que la garde est **branchée** sur les fichiers réels. On peut donc retirer le branchement en silence.
- **E** — `I4bis` (`forge-host-parity.test.mjs:166-174`) appelle `verifierHorsCouverture` sur un
  registre `HORS_COUVERTURE` **vide** (`:71`). Il itère sur zéro entrée : supprimer les quatre
  assertions ne fait tomber aucun test. Le fichier le **dit lui-même** (`:180-184`), et le renvoie à
  ce lot. La logique, elle, est couverte sur fixtures (`verifier-mesures.test.mjs:169-…`) — c'est
  bien la **jonction** qui manque, pas le prédicat.
- **La convergence des deux apps n'est gardée par RIEN.** C'est le même défaut, un étage au-dessus,
  et il n'était pas dans le relevé reçu : les **six** fichiers rendus byte-identiques par L40 le
  sont par un `diff` **passé une fois à la main au gate** (CA-16). Aucun test, aucun script, aucune
  entrée de `test:all` ne le rejoue. C'est très exactement l'option **O3 (« discipline seule »)** que
  l'arbitrage **AR-6 de L40 a écartée** au motif qu'elle *« est ce qui a déjà échoué »* — et c'est
  ainsi que `HORS_COUVERTURE` + `I4bis` avaient disparu d'un seul côté.

**Famille 3 — la preuve est adossée à un RÉFÉRENTIEL MOUVANT.** La garde a raison aujourd'hui, sur
un référent qui peut changer sans le dire.
- **D-4** — les deux workflows épinglent `tauri-apps/tauri-action@v0` (`release.yml:90`, identique
  dans les deux dépôts). `v0` est une **étiquette déplaçable**, et la preuve du comportement de
  `uploadUpdaterJson` — sur laquelle repose le volet **G de L40** — a été lue sur la branche `dev`.
  Trois refs, aucune n'étant celle qui s'exécute. Même classe de risque que le cliquet de version du
  plugin, qui, lui, **est** gardé (CA-15 de L40).
- **D-6** — le chemin « republication à l'identique » n'est **pas prouvé de bout en bout**. Vérifié :
  le manifeste versionné du GUI porte de vraies notes (`updater/latest.json:3`, un paragraphe entier),
  alors que `--notes` est une **entrée** dont le défaut est `""`
  (`scripts/publish-update.mjs:389,681,694`). CA-14 de L40 prouve seulement que *deux runs à entrées
  égales* coïncident — jamais que **régénérer le manifeste publié reproduit le fichier versionné**.

**Et deux défauts qui NE SONT PAS des gardes** — à traiter quand même, parce qu'ils touchent les
mêmes quatre fichiers et que les séparer coûterait plus cher que de les faire :
- **D-2** — `scripts/mesurer-artefacts.mjs` écrit son **journal sur stdout** (`:290,294,311`) et son
  `--dry-run` y écrit **aussi le document** (`:307`). Conséquence mesurable :
  `node scripts/mesurer-artefacts.mjs --dry-run > x.json` produit un JSON **invalide**. Le défaut
  exact corrigé dans `publish-update.mjs` au même lot L40 — vérifié : ce dernier ne contient
  **aucun** `console.log` côté Cockpit, tout son journal est sur stderr. Le canal n'est pas uniforme
  entre deux scripts voisins du même dépôt.
- **D-3** — `iakaFrameGUI/scripts/publish-update.mjs:557,654` : deux `console.log` résiduels, sur le
  chemin non-`--dry-run`. Cosmétique, confirmé, une ligne chacun.

**Le critère retenu, faute d'effet utilisateur.** Aucun de ces défauts ne touche un utilisateur
aujourd'hui, et il serait malhonnête de prétendre le contraire. Le critère que je retiens à la place
est la **distance à un mensonge qui, lui, touchera l'utilisateur** — combien de gardes séparent le
défaut d'une panne réelle :
- **D est à zéro garde** : le jour où l'hôte de téléchargement devient un nom de LAN ou une adresse
  IPv6, `I2` **certifie** la publicité d'un hôte que personne n'atteint, et le manifeste promet un
  téléchargement impossible. La garde ne se tait pas — elle **atteste le faux**.
- **C est à zéro garde** : la preuve « 9/9 téléchargeables » peut vieillir indéfiniment ; le jour où
  un asset de release est supprimé ou renommé, la suite reste **verte** et l'app échoue à se mettre
  à jour.
- **La convergence est à une garde** : sa perte fait disparaître une garde d'un seul côté — le
  scénario déjà survenu, réparé par L40, et que rien n'empêche de recommencer.
- **E, D-4, D-6, D-2, D-3 sont à une garde ou plus** : ils n'attestent pas le faux, ils rendent
  seulement un futur mensonge **indétectable** ou une preuve **impossible à faire**.

C'est ce classement — et non l'ordre du relevé — qui donne l'ordre d'exécution.

---

## Décision retenue

**Un lot unique**, en **trois volets** ordonnés par le critère ci-dessus, portant sur les fichiers de
garde et de publication des **deux** apps.

Pourquoi **un** lot et non trois : les huit défauts touchent **quatre fichiers**, dont **trois sont
convergents**. Découper, c'est refaire trois fois la danse de la byte-identité sur les mêmes fichiers
— le coût de la convergence dominerait largement le coût du contenu, et chaque passage est une
occasion de la perdre. Le lot est petit ; c'est la coordination qui est chère.

L'ordre est imposé par le critère, pas par le confort :

1. **Volet A — les prédicats qui attestent le faux** (D, puis C). Ce sont les seuls à zéro garde de
   distance. Chacun est écrit **rouge d'abord** : la fixture qui exhibe le mensonge est capturée
   verte **avant** correctif.
2. **Volet B — les jonctions non gardées** (E, puis la convergence). Le remède n'est pas un test de
   plus : c'est une **mutation par suppression** qui doit faire rougir. Une garde dont on peut
   retirer l'appel sans qu'un test tombe n'est pas branchée.
3. **Volet C — référentiels mouvants et canaux** (D-4, D-6, D-5, D-2, D-3). Épingler ce qui bouge,
   rendre atteignable la preuve qui ne l'est pas, faire dire vrai à ce qui ment sur son périmètre.

**Le critère d'acceptation générique du lot**, tel que proposé par le décideur et adopté :
> **Toute garde touchée par ce lot est éprouvée par une mutation qui la fait rougir.**

Avec deux précisions qui en font une règle utilisable :
- la mutation porte sur le **programme**, **jamais** sur l'attendu — *un test qu'on rend vert sans le
  modifier prouve qu'on a corrigé le programme et non l'attendu* (précédent `AC-4` de
  `gate-de-phase-optionnel.md`) ;
- pour une **jonction**, la mutation est la **suppression de l'appel**. C'est la mutation que `E`
  échoue aujourd'hui, et c'est la même qui avait laissé `780/780` verts en L34 quand `check(true)`
  devenait `check()`. **Ce dépôt a déjà rencontré cette classe deux fois.**

Toute mutation est **révoquée** en fin de lot, et la révocation **prouvée** (`git diff` vide cité).

---

## Périmètre

### Inclus

- **D** — `estPrive` : correction de l'extraction d'hôte (IPv6 littéral) **et** renversement de la
  charge de la preuve (AR-2).
- **C** — borne de fraîcheur de `mesureLe`, **relative au manifeste** et non au calendrier (AR-1).
- **E** — `I4bis` cesse d'être vacuous : sa **jonction** aux fichiers réels devient éprouvée.
- **CONV** — garde de **convergence** des fichiers partagés entre les deux dépôts (AR-5). Défaut
  **ajouté au relevé** par ce cadrage.
- **D-4** — épinglage de `tauri-action` sur un référent immuable + **cliquet** (AR-3).
- **D-6** — la republication à l'identique devient **prouvée contre le fichier versionné** (AR-4).
- **D-5** — la **prétention** de la commande de gate est mise en accord avec ce qu'elle couvre (AR-6).
- **D-2** — canal du journal de `mesurer-artefacts.mjs` : journal sur **stderr**, document sur stdout.
- **D-3** — les deux `console.log` résiduels du GUI.
- La **mise à jour de la documentation** de commandes (`CLAUDE.md` des deux dépôts) et du backlog,
  dans **le même lot** que le changement de commande.

### Exclu — explicitement, et sans « tant qu'on y est »

- **D-1 — le commit non atomique (`git add -A`), plus large que l'auto-dénonciation de l'exécutant.**
  Le décideur a raison : **hors lot**. C'est un fait d'**historique**, non rattrapable sans réécrire
  l'historique — ce que la méthode interdit côté IA (*« jamais de `reset --hard` ni de
  `push --force`»*). Le corriger *a posteriori* coûterait un risque bien supérieur au défaut. Reste
  à sa place : une ligne au journal, pas un lot. **Ne pas réécrire.**
- **Le défaut `iakaframe jalon`** — autre dépôt, autre audience, **et description à rectifier**
  (§ Rectifications, point 3). **Lot propre**, à cadrer séparément. L'avis du décideur — « mon avis
  penche pour le second » — est confirmé, mais pour une raison de plus que celles qu'il donne.
- **Le successeur « installer depuis rien »** (README aux versions périmées ; `latest` GitHub classé
  par date de publication). Autre lot, autre audience, **trois** dépôts. Inchangé depuis L40.
- **CA-12 et CA-13 de L40**, et les **deux recettes réelles** (Windows MSI, Linux `.deb`). Actes du
  décideur, pas du cadrage. Ce lot **ne les rouvre pas** et **ne les prétend pas faits**.
- **L'étape 5.1 de L40** (bump + publication d'une version neuve). Toujours due, toujours au
  décideur. Ce lot travaille sur les fichiers **tels qu'ils sont versionnés aujourd'hui**.
- **La rotation du jeton iakabox** et la suppression de
  `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`.
- **L'absence d'eslint et de tsconfig** sur le dépôt `iakaframe`.
- **Monter `tauri-action` de major** (`v0` → `v1`). Épingler ≠ monter. Épingler fige **ce qui tourne
  aujourd'hui** ; monter change le comportement du CI et se recette. → successeur nommé (AR-3).
- **Mettre `cargo test` dans le `test:all` du GUI.** Ce serait rouvrir un arbitrage **écrit et
  motivé** du dépôt (`iakaFrameGUI/CLAUDE.md` : *« Volontairement hors de `test:all` : en dépendre
  rendrait la mesure faillible sur toute machine sans toolchain Rust »*). Voir AR-6.
- **Une borne de fraîcheur calendaire dans le gate.** Écartée par AR-1 ; si le décideur la veut, elle
  vit **hors** de `test:all`.
- Le **canal de lecture** (`endpoints`, `FORGEJO_BASE`) et le **canal de téléchargement**
  (`ARTEFACT_BASE`) : **inchangés**. Acquis du 2026-08-28, non rouvert.

---

## Étapes d'implémentation

### Étape 0 — Établir la liste des fichiers convergents (avant tout le reste)

0.1 **Ne pas se fier au présent document : le confronter.** Établir par `diff`, dépôt contre dépôt,
la liste **exacte** des fichiers actuellement byte-identiques, et l'écrire dans le rapport
d'exécution. Liste attendue au 2026-08-29, à vérifier :
`scripts/__tests__/forge-host-parity.test.mjs`, `scripts/__tests__/verifier-mesures.test.mjs`,
`scripts/lib/verifier-mesures.mjs`, `scripts/mesurer-artefacts.mjs`, `fixtures/updater-cles.json`,
`specs/instructions/cles-installeur-manifeste-updater.md`. **Ce fichier-ci devient le septième.**

0.2 Tout écart constaté à l'étape 0 est **signalé et réparé avant** le volet A : ce lot part d'une
convergence acquise, il ne la reconstruit pas en cours de route.

0.3 Relever le **SHA de `tauri-apps/tauri-action`** vers lequel pointe aujourd'hui l'étiquette `v0`,
**et** lire l'`action.yml` **à ce SHA** (pas sur `dev`) pour reconfirmer les trois entrées `updater`
sur lesquelles repose le volet G de L40. Écrire le SHA et le constat dans le rapport.

> ⚠️ Si l'`action.yml` **au SHA** contredit ce que L40 a lu sur `dev`, **s'arrêter et remonter** :
> c'est un défaut de L40, pas de ce lot, et il ne se corrige pas en passant.

### Étape 1 — Volet A / défaut D : `estPrive` atteste le faux

1.1 **Rouge d'abord.** Ajouter à `verifier-mesures.test.mjs` — ou au fichier de test qui accueillera
la fonction extraite (cf. 1.3) — trois cas qui **passent au vert à tort** aujourd'hui, et capturer
cette sortie verte :
- **E-3** : `http://[::1]:3001` est déclaré **public** ;
- **E-4** : `http://nas:3001` (nom d'hôte nu de LAN) est déclaré **public** ;
- **E-5** : `http://[fd00::1]:3001` (ULA IPv6, l'équivalent v6 du RFC1918) est déclaré **public**.

1.2 Corriger **l'extraction d'hôte** : passer par `new URL(u).hostname` et **retirer explicitement**
les crochets d'un littéral IPv6. Ne **jamais** découper sur `":"` — c'est la ligne qui produit `"["`.

1.3 Corriger **la propriété**, selon AR-2 : la fonction devient `estPublic(hote)`, et `estPrive` sa
**négation**. Un hôte n'est public que si sa forme le **prouve** ; tout le reste est privé par
défaut. La fonction est **extraite** dans `scripts/lib/verifier-mesures.mjs` (fonction pure, aucun
I/O) pour être exercée sur des cas de bord que les fichiers réels ne contiennent pas — même geste,
même motif que l'extraction d'`I4` en L40.

1.4 Rejouer E-3, E-4, E-5 : **rouges**, avec un message qui **cite l'hôte** jugé non public.

1.5 **Mutation obligatoire** : rétablir le `split(":")` d'origine et constater que **la suite du
dépôt** rougit. Puis révoquer, `git diff` vide cité.

### Étape 2 — Volet A / défaut C : la preuve n'a pas de date

2.1 **Rouge d'abord.** Fixture où `mesureLe` vaut `"2020-01-01"` et où tout le reste est nominal :
elle passe **verte** aujourd'hui. Capturer.

2.2 Ajouter à `verifierMesures` **deux** contraintes, selon AR-1 :
- `mesureLe` est une **date valide** (parsable) — aujourd'hui, n'importe quelle chaîne non vide passe ;
- `mesureLe` est **postérieure ou égale à `manifeste.pub_date`**. Une preuve antérieure à la
  publication de ce qu'elle prétend prouver ne prouve rien.

> **Pourquoi cette borne-là et pas une durée.** Elle se compare à un **fichier versionné** (le
> manifeste), elle est **déterministe** (aucune horloge murale, donc aucun rouge un jour où personne
> n'a rien touché), et elle est **déjà vérifiée verte** sur les deux dépôts au moment de ce cadrage :
> Cockpit `pub_date` `2026-08-28T16:21:01Z` < `mesureLe` `2026-08-28T23:04:08.301Z` ; GUI `pub_date`
> `2026-08-15T13:10:01.947Z` < `mesureLe` `2026-08-28T23:04:38.998Z`. Elle transpose la protection
> anti-*freeze* de TUF : non pas une horloge absolue, mais un **ordre monotone contre une référence
> signée** (§ Sources). Le contrôle de version déjà présent (`verifier-mesures.mjs:39`) l'ancre :
> ensemble, ils imposent que la preuve porte sur **cette** version et **après** sa publication.

2.3 Rejouer 2.1 : **rouge**, message nommant la date fautive et la `pub_date` de référence.

2.4 **Hors-couverture à DÉCLARER dans le code**, pas à taire : cette borne ne détecte pas une mesure
qui **vieillit sans que la version bouge**, ni une `pub_date` volontairement reculée via
`--pub-date`. L'écrire en commentaire au-dessus de l'assertion, avec sa condition de levée. *Une
garde qui se tait sur ce qu'elle ne couvre pas est pire qu'absente* — c'est déjà la doctrine du
registre `HORS_COUVERTURE`, elle vaut aussi pour les prédicats.

### Étape 3 — Volet B / défaut E : la jonction d'`I4bis`

3.1 **Mutation d'abord** : supprimer l'appel à `verifierHorsCouverture` dans
`forge-host-parity.test.mjs` et constater que la suite reste **verte**. Capturer. C'est la preuve du
défaut, et elle est **mesurable en une commande**.

3.2 Rendre la jonction éprouvée. La forme retenue **ne doit pas** consister à peupler le registre
versionné (il est vide **et c'est un résultat** — L40 l'a établi : les 9 clés répondent 200). Elle
consiste à ajouter, sur le modèle exact d'`I4ter` (`:176-198`), un **contrefactuel de forme** :
sur une exception **fabriquée dans le test** et volontairement mal formée (motif absent, date
invalide, condition de levée absente, plateforme fantôme), `verifierHorsCouverture` **appelé
depuis ce fichier** doit rendre une violation. Le registre versionné n'est pas touché.

3.3 Rejouer 3.1 : la suppression de l'appel fait désormais **rougir**. Révoquer, `git diff` vide.

3.4 Retirer du fichier le commentaire `:180-184` qui renvoie ce défaut au lot successeur — **il vient
d'être traité ici**. Le remplacer par ce que le contrefactuel prouve, exactement.

### Étape 4 — Volet B / la convergence n'est gardée par rien

4.1 Poser, dans **chaque** dépôt, un fichier `fixtures/convergence.sha256` : la liste
`sha256  chemin` des fichiers convergents établis à l'étape 0 (lui-même exclu, self-référence
impossible). Ce fichier est **lui-même convergent**.

4.2 **Face locale, dans le gate** : une garde qui recalcule les sha256 et échoue en **nommant** le
fichier qui a dérivé. Elle attrape la dérive **accidentelle** — quelqu'un patche une copie en place —
qui est le chemin par lequel la divergence est réellement arrivée la première fois.

4.3 **Face croisée, hors gate par défaut** (AR-5) : `npm run test:convergence`, qui compare les deux
arbres de travail quand le dépôt frère est présent, et **SKIP proprement** sinon. Précédent exact
dans ce dépôt : `test:handoff-parity` (Cockpit), *« HORS gate par défaut, car elle dépend du dépôt
frère »*, avec sa variable d'environnement autoritaire.

4.4 **Déclarer le hors-couverture, en toutes lettres** : la face locale **ne détecte pas** une
modification **coordonnée** d'un fichier convergent et de son empreinte d'un seul côté. Seule la face
croisée la voit, et elle n'est pas dans le gate. Écrire cette limite là où on la lira — pas dans un
rapport, dans le fichier de garde.

4.5 **Mutation obligatoire, les deux faces** : altérer un octet d'un fichier convergent → la face
locale rougit en le nommant ; altérer un octet d'un seul côté → la face croisée rougit. Révoquer.

### Étape 5 — Volet C / défaut D-4 : épingler ce qui bouge

5.1 Remplacer `tauri-apps/tauri-action@v0` par le **SHA complet de 40 caractères** relevé à l'étape
0.3, suivi d'un commentaire portant **le nom de version correspondant** — c'est la seule forme qui
reste lisible par un humain sans perdre l'immuabilité (état de l'art 2026, § Sources).

5.2 Poser le **cliquet**, jumeau de CA-15 : une garde qui rougit si le SHA épinglé n'est plus celui
contre lequel le comportement de `uploadUpdaterJson` a été **lu**, avec un message qui **ordonne de
relire `action.yml` au nouveau SHA** avant de lever la garde. Le pin sans cliquet ne fait que déplacer
le silence : il rend le référent immuable, il ne force pas à re-prouver quand on le change.

5.3 **Mutation** : modifier le SHA dans une **fixture** (jamais dans le workflow) → rouge.

### Étape 6 — Volet C / défaut D-6 : rendre la preuve atteignable

6.1 Ajouter une garde qui **régénère le manifeste de la version publiée** et le compare **au fichier
`updater/latest.json` versionné**, en tirant `--pub-date` **et** `--notes` de **ce fichier même**.
C'est la forme exigée par la doctrine du dépôt : *une preuve se compare à un fichier versionné,
jamais à la sortie d'une autre commande.* CA-14 de L40 comparait deux sorties entre elles ; il ne
prouvait donc pas ce qu'on croyait.

6.2 Si la comparaison **échoue**, ne pas ajuster l'attendu : **le dire**. Un écart ici signifie que le
manifeste versionné n'est pas reproductible par la chaîne qui prétend l'avoir produit — c'est un
défaut à remonter, pas une fixture à recalibrer.

6.3 **Mutation** : altérer un octet du manifeste versionné → la garde rougit en nommant le champ.

### Étape 7 — Volet C / défaut D-5 : une commande de gate qui dit vrai

7.1 **Ne pas** toucher au contenu de `test:all` (AR-6, arbitrage du dépôt non rouvert). Exposer un
script **`test:rust`** nommé, et inscrire **dans le `package.json` lui-même** — pas seulement dans
`CLAUDE.md` — que `test:all` **exclut le Rust** et pourquoi.

7.2 Amender le **format de verdict de gate** (`iakaFrameGUI/CLAUDE.md` § *Rendre un verdict de gate*)
pour que `cargo test` soit une **ligne de tableau distincte et obligatoire** : c'est là que la
prétention est née, c'est là qu'elle se corrige.

7.3 Dans **ce** fichier d'instruction et dans toute formulation de CA, **ne plus écrire** « les
suites complètes » : nommer les commandes, une par une.

### Étape 8 — Volet C / défauts D-2 et D-3 : le canal

8.1 `scripts/mesurer-artefacts.mjs` (les deux dépôts, fichier convergent) : tout le **journal** part
sur **stderr** ; **stdout ne porte que le document** en `--dry-run`, et **rien** hors `--dry-run`.
Référence de forme : `IakaCockpit/scripts/publish-update.mjs`, qui ne contient aucun `console.log`.

8.2 `iakaFrameGUI/scripts/publish-update.mjs:557,654` : les deux `console.log` passent sur stderr.

8.3 **Preuve, pas relecture** : `node scripts/mesurer-artefacts.mjs --dry-run 2>/dev/null` doit
produire un JSON **parsable**. C'est un test, pas un constat de lecture.

### Étape 9 — Refermer

9.1 Révoquer **toutes** les mutations, prouver par `git diff` vide.

9.2 Mettre à jour `CLAUDE.md` (commandes + backlog) dans **les deux** dépôts, **dans ce lot**.

9.3 Rejouer l'étape 0.1 : les fichiers convergents le sont **toujours**, ce fichier d'instruction
compris.

---

## Fichiers concernés

Chemins relatifs à la racine de **chaque** dépôt, sauf mention contraire.

- `scripts/__tests__/forge-host-parity.test.mjs` — **convergent**. `estPrive:111-121` (extrait vers
  la lib), `I2:137-143`, `I4bis:166-174` (jonction éprouvée), `HORS_COUVERTURE:71` (**non touché** —
  il reste vide), commentaire `:180-184` (retiré, § 3.4), garde de convergence.
- `scripts/lib/verifier-mesures.mjs` — **convergent**. `mesureLe:38` (borne de fraîcheur),
  accueille `estPublic`/`estPrive`.
- `scripts/__tests__/verifier-mesures.test.mjs` — **convergent**. E-3/E-4/E-5, fixture de fraîcheur,
  cas de bord d'`estPublic`.
- `scripts/mesurer-artefacts.mjs` — **convergent**. Journal `:290,294,311` et document `:307` :
  séparation des canaux.
- `fixtures/updater-cles.json` — **convergent**, **non touché**.
- `fixtures/convergence.sha256` — **NOUVEAU**, **convergent**.
- `.github/workflows/release.yml:90` — pin SHA + commentaire de version.
- `package.json` — **(GUI)** `test:all:18` **inchangé**, `test:rust` **ajouté**,
  `test:convergence` ajouté ; **(Cockpit)** `test:convergence` ajouté. `scripts/quality.sh`
  **(Cockpit)** couvre déjà le Rust — **non touché**.
- `scripts/publish-update.mjs` — **(GUI seul)** `:557,654` deux `console.log`.
- `CLAUDE.md` — **(les deux)** commandes + backlog ; **(GUI)** § *Rendre un verdict de gate*.
- `specs/instructions/gardes-tiedes.md` — ce fichier, **convergent**.

**Ne pas toucher** : `updater/latest.json`, `updater/mesures.json` (sorties, régénérées par leurs
scripts et par eux seuls), `src-tauri/tauri.conf.json`, `src/`, `ARTEFACT_BASE`, `FORGEJO_BASE`,
`scripts/lib/update-manifest.mjs` (générateur du Cockpit — hors périmètre de ce lot), l'historique
git.

---

## Comment les deux apps restent byte-identiques

Question posée explicitement par le décideur, et **elle n'a pas de réponse dans l'état actuel** :
L40 a **acquis** la convergence, il ne l'a pas **gardée**. Le dispositif retenu (AR-5) est à deux
faces, et sa deuxième face est **hors du gate** — c'est une limite, elle est déclarée :

| Face | Où elle tourne | Ce qu'elle attrape | Ce qu'elle ne peut pas attraper |
|---|---|---|---|
| **Locale** — empreintes versionnées (`fixtures/convergence.sha256`) | dans `test:all`, **sans** le dépôt frère | l'édition **en place** d'une copie (le chemin réel de la divergence de L40) | une édition **coordonnée** fichier + empreinte d'un seul côté |
| **Croisée** — `npm run test:convergence` | hors gate, **SKIP propre** sans le frère | toute divergence, y compris coordonnée | rien — mais elle ne tourne que si le frère est là |

Aucune des deux n'est suffisante seule, et **aucune combinaison offline ne l'est** : un dépôt ne peut
pas voir ce qu'un autre dépôt fait. Le prétendre serait exactement la garde tiède que ce lot corrige.
Ce qui est **acquis** avec ce dispositif : la divergence ne peut plus être **silencieuse et
accidentelle** ; elle exige un geste délibéré sur deux fichiers, dans un dépôt, en ignorant une face
de garde documentée.

**Pendant l'exécution de ce lot**, la règle opératoire est plus simple : tout fichier de la liste de
l'étape 0 se modifie **dans les deux dépôts au même commit logique**, et l'étape 9.3 le revérifie.

---

## Risques

- **R1 — Renforcer `estPublic` peut faire rougir un fichier RÉEL.** Si un hôte du manifeste ne
  correspond plus à la forme publique exigée, la suite rougit. Aujourd'hui `github.com` la satisfait
  (vérifié), mais ce n'est pas une garantie de forme. *Mitigation* : mesurer **avant** de conclure ;
  un rouge ici est un **vrai défaut découvert**, pas une régression — le traiter comme tel et le
  remonter, jamais assouplir le prédicat pour reverdir.
- **R2 — La borne de fraîcheur dépend de `pub_date`, qui est une entrée pilotable** (`--pub-date`,
  acquis de L40). Une date reculée affaiblirait la borne. *Mitigation* : le hors-couverture de
  § 2.4, écrit dans le code ; la protection réelle vient de la **conjonction** avec le contrôle de
  version.
- **R3 — Le pin par SHA crée une dette de maintenance** : plus de montée automatique de correctifs.
  C'est le prix assumé de l'immuabilité, et c'est le sens de l'état de l'art 2026. *Mitigation* : le
  cliquet (§ 5.2) rend la montée **visible** au lieu de la rendre facile.
- **R4 — La garde de convergence peut devenir un frein.** Toute modification d'un fichier convergent
  coûte désormais deux dépôts et une empreinte. *C'est l'effet recherché* — mais il faut l'assumer :
  si le coût devient prohibitif, la vraie réponse est **O1 de l'AR-6 de L40** (paquet partagé), que
  ce lot n'ouvre pas.
- **R5 — Ce lot ne produit AUCUN effet observable par un utilisateur.** Il n'a donc **aucune recette
  humaine**, et sa seule preuve est la mesure. C'est assumé, et c'est pourquoi le critère générique
  (mutation qui fait rougir) n'est pas négociable : sans lui, ce lot serait invérifiable.
- **R6 — L'étape 5.1 de L40 reste due.** Publier une version neuve **régénérera** `latest.json` et
  `mesures.json`. Si la publication a lieu **après** ce lot, ses gardes s'appliqueront à la nouvelle
  mesure — c'est le comportement voulu. Si elle a lieu **pendant**, les fixtures de l'étape 6 sont à
  refaire. *Mitigation* : ne pas entrelacer ; l'ordre appartient au décideur.

---

## Critères d'acceptation

> Discipline appliquée, héritée de L40 et de ce lot : une garde s'écrit **rouge d'abord** ; une
> preuve se compare à un **fichier versionné**, jamais à la sortie d'une autre commande ; une
> exception ne survit pas à sa raison d'être ; **toute garde touchée est éprouvée par une mutation
> qui la fait rougir**, et la mutation est **révoquée** avec preuve. **Chaque critère dit par quelle
> commande on le vérifie.**
>
> Commandes, par dépôt — **nommées une par une, jamais « les suites complètes »** :
> Cockpit → `npm run test`, `bash scripts/quality.sh` (qui inclut `cargo test`) ;
> GUI → `npm run lint:all`, `npm run test:all`, **et** `cargo test` depuis `src-tauri/`, en **ligne
> de tableau distincte**.

### Volet A — les prédicats qui attestent le faux

- [ ] **CA-1 — D, rouge d'abord.** Les trois cas E-3 (`[::1]`), E-4 (`nas`), E-5 (`[fd00::1]`)
      **passaient au vert** avant correctif (sortie verte capturée et jointe au rapport) et
      **échouent** après, avec un message **citant l'hôte**. *Vérif* :
      `npx vitest run scripts/__tests__/verifier-mesures.test.mjs`, captures avant/après.
- [ ] **CA-2 — D, mutation.** Rétablir `hote.split(":")[0]` fait **rougir** la suite du dépôt ;
      révoqué, `git diff` **vide** cité. *Vérif* : `npx vitest run scripts/__tests__/` puis
      `git diff`.
- [ ] **CA-3 — D, la propriété est renversée.** Un hôte de forme **inconnue** est classé **privé**
      par défaut (et non public). *Vérif* : cas de fixture dédié — un hôte arbitraire sans point.
- [ ] **CA-4 — C, rouge d'abord.** La fixture `mesureLe: "2020-01-01"` **passait au vert** et
      **échoue** après, avec un message citant la date et la `pub_date` de référence. *Vérif* : même
      commande, captures avant/après.
- [ ] **CA-5 — C, sur les fichiers RÉELS et VERSIONNÉS, la garde est verte** dans les deux dépôts —
      c'est-à-dire que la borne retenue n'invalide pas la mesure existante. *Vérif* :
      `npx vitest run scripts/__tests__/forge-host-parity.test.mjs`.
- [ ] **CA-6 — C, le hors-couverture est ÉCRIT dans le code**, avec sa condition de levée : la borne
      ne détecte ni le vieillissement à version constante, ni une `pub_date` reculée. *Vérif* :
      lecture du commentaire au-dessus de l'assertion, cité dans le rapport.

### Volet B — les jonctions non gardées

- [ ] **CA-7 — E, la mutation d'abord.** Supprimer l'appel à `verifierHorsCouverture` dans
      `forge-host-parity.test.mjs` laissait la suite **verte** (sortie capturée) et la fait
      **rougir** après. *Vérif* :
      `npx vitest run scripts/__tests__/forge-host-parity.test.mjs`, captures avant/après, puis
      `git diff` **vide**.
- [ ] **CA-8 — E, le registre versionné n'a PAS été peuplé** pour rendre le test non vacuous : il
      reste `[]`. *Vérif* : `git diff` sur `HORS_COUVERTURE` → **aucune ligne**.
- [ ] **CA-9 — E, le commentaire qui renvoyait ce défaut au successeur a disparu**, remplacé par ce
      que le contrefactuel prouve. *Vérif* : `grep -n "gardes tièdes\|défaut E" scripts/__tests__/forge-host-parity.test.mjs`
      → plus aucune mention de renvoi.
- [ ] **CA-10 — CONV, face locale.** Altérer **un octet** d'un fichier convergent fait rougir la
      garde locale, **en nommant le fichier**. *Vérif* : mutation, commande du gate, révocation
      prouvée.
- [ ] **CA-11 — CONV, face croisée.** Altérer un octet **d'un seul côté** fait rougir
      `npm run test:convergence` ; **sans** dépôt frère, la même commande **SKIP proprement** (sortie
      citée, code de sortie `0`). *Vérif* : les deux exécutions, sorties citées.
- [ ] **CA-12 — CONV, la limite est déclarée dans le fichier de garde**, pas seulement dans ce
      cadrage : la face locale ne voit pas une modification coordonnée d'un seul côté. *Vérif* :
      commentaire cité.

### Volet C — référentiels mouvants et canaux

- [ ] **CA-13 — D-4, le pin est un SHA de 40 caractères** dans les deux workflows, avec le nom de
      version en commentaire. *Vérif* : `grep -n "tauri-action@" .github/workflows/release.yml` dans
      les deux dépôts → aucune occurrence de `@v0`.
- [ ] **CA-14 — D-4, le cliquet mord.** Modifier le SHA **dans une fixture** (jamais dans le
      workflow) fait rougir, avec un message **ordonnant de relire `action.yml` au nouveau SHA**.
      *Vérif* : contrefactuel, puis révocation.
- [ ] **CA-15 — D-4, la preuve est datée de sa source.** Le rapport d'exécution cite le SHA relevé,
      **et** le constat de lecture de l'`action.yml` **à ce SHA** sur les trois entrées `updater`.
      Une lecture faite sur `dev` vaut **FAIL**.
- [ ] **CA-16 — D-6, la republication est prouvée CONTRE le fichier versionné.** Régénérer le
      manifeste de la version publiée, avec `--pub-date` et `--notes` **tirés de
      `updater/latest.json`**, produit un document **identique à l'octet** à ce fichier. *Vérif* :
      la commande et le `diff` **vide** cités, dans les **deux** dépôts.
- [ ] **CA-17 — D-6, la mutation.** Altérer un octet de `updater/latest.json` fait rougir la garde
      **en nommant le champ**. Révoqué, `git diff` vide.
- [ ] **CA-18 — D-5, `test:all` du GUI est INCHANGÉ** et sa limite est écrite **dans le
      `package.json`**. *Vérif* : `git diff package.json` — la valeur de `test:all` n'a pas bougé ;
      `test:rust` existe et s'exécute.
- [ ] **CA-19 — D-5, le format de verdict exige `cargo test` en ligne distincte.** *Vérif* : le
      paragraphe amendé de `CLAUDE.md` cité.
- [ ] **CA-20 — D-2, le canal est propre et c'est MESURÉ.**
      `node scripts/mesurer-artefacts.mjs --dry-run 2>/dev/null | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"`
      sort `0` dans les **deux** dépôts. Un constat de lecture vaut **FAIL**.
- [ ] **CA-21 — D-3, plus aucun `console.log`** dans `scripts/publish-update.mjs` du GUI. *Vérif* :
      `grep -c "console\.log" scripts/publish-update.mjs` → `0`.

### Non-divergence, honnêteté, clôture

- [ ] **CA-22 — les fichiers convergents le sont TOUJOURS**, ce fichier d'instruction compris.
      *Vérif* : le `diff` de chaque paire → **vide**, liste citée in extenso.
- [ ] **CA-23 — toutes les mutations sont révoquées.** *Vérif* : `git status --porcelain` et
      `git diff` → **vides** ; chaque mutation nommée dans le rapport avec sa révocation.
- [ ] **CA-24 — les commandes de gate sont vertes, CHIFFRES CITÉS, une ligne par commande.**
      *Vérif* : Cockpit `bash scripts/quality.sh` ; GUI `npm run lint:all`, `npm run test:all`,
      **et** `cargo test`. Un « OK » sans chiffre vaut **FAIL**
      (`iakaFrameGUI/CLAUDE.md` § *Rendre un verdict de gate*).
- [ ] **CA-25 — le nombre de tests a AUGMENTÉ et aucun n'a été supprimé.** *Vérif* : compte avant /
      compte après, cités ; toute suppression est nommée et justifiée.
- [ ] **CA-26 — aucun périmètre exclu n'a été touché.** *Vérif* : `git diff --name-only` confronté à
      la liste § Fichiers concernés — en particulier **aucune** ligne d'historique réécrite, **aucun**
      changement de `test:all`, **aucune** montée de major de `tauri-action`, **aucune** écriture
      manuelle dans `updater/`.

---

## Arbitrages — TRANCHES par le decideur le 2026-08-29

> **Les huit arbitrages sont TRANCHES : le decideur a valide l'instruction sur ses recommandations.**
> Le tableau ci-dessous se lit donc comme la **decision**, plus comme une proposition. Si l'execution
> rencontre un cas que l'arbitrage ne couvre pas, elle **s'arrete et remonte** au decideur ; elle ne
> tranche pas a sa place.
>
> Relaye par [PORTEFEUILLE][Odin]. Cadrage inchange par ailleurs : seul l'etat des arbitrages change,
> aucune ligne du perimetre, des etapes ou des criteres d'acceptation n'est modifiee.
>
> Note : la **byte-identite** des deux copies, que le cadrage declarait honnetement **non prouvee**
> faute de shell, a ete **mesuree** au moment de cette validation : `cmp` -> identiques, 664 lignes,
> 49 490 octets. CA-22 reste a rejouer par l'execution apres ses propres ecritures.

> **Gandalf propose, le décideur tranche.** Aucune de ces lignes n'est décidée. Si l'exécution
> rencontre un cas qu'un arbitrage ne couvre pas, elle **s'arrête et remonte** — elle ne tranche pas
> à sa place.

| # | Question | Options | Recommandation |
|---|---|---|---|
| **AR-1** | **Quelle borne de fraîcheur pour `mesureLe` ?** *(l'arbitrage annoncé)* | **O1** durée calendaire fixe (30/90 j…) · **O2** `mesureLe ≥ manifeste.pub_date` · **O3** O2 + alarme calendaire **hors** gate | **O2.** O1 est *« un chiffre qu'il faudra défendre »* — et pire : une **bombe à retardement**, un rouge un jour où personne n'a rien touché, sur une machine hors ligne, accusant le changement qu'on teste au lieu du temps qui passe. O2 se compare à un **fichier versionné**, est **déterministe**, et est **déjà vérifiée verte** sur les deux dépôts (§ 2.2). O3 reste ouvert si le décideur veut l'alarme — **+0,2 j**, et **jamais dans `test:all`**. |
| **AR-2** | **Jusqu'où renforcer `estPrive` ?** | **O1** ajouter des motifs (IPv6, nom sans point) · **O2** allowlist de TLD publics · **O3** **inverser la charge** : `estPublic` explicite, privé par défaut | **O3.** La correction IPv6 n'est pas un arbitrage — c'est un bug. Mais O1 rejoue la logique d'énumération qui a **déjà** laissé passer trois cas ; O2 est de la sur-ingénierie (liste PSL à maintenir). O3 supprime la **classe** : « atteignable depuis n'importe où » doit être **prouvé**, jamais présumé. C'est aussi ce que le commentaire du code prétend déjà faire (*« On teste la PROPRIÉTÉ »*) — O3 le rend vrai. |
| **AR-3** | **Comment épingler `tauri-action` ?** | **O1** SHA 40 car. + commentaire de version · **O2** tag de version exacte (`action-v0.6.2`) · **O3** statu quo + cliquet seul | **O1 + le cliquet d'O3.** O2 n'immunise pas : un tag reste déplaçable, et l'attaque de mars 2026 sur `trivy-action` a force-pushé **75 tags sur 76** (§ Sources). O3 seul garde un référent mouvant. ⚠️ **Fait relevé, à confronter à l'étape 0.3** : `v0` existe comme objet de tag **déplaçable**, et un `action-v1.0.0` existe — l'épinglage doit figer **ce qui tourne**, la **montée de major est un autre lot**. |
| **AR-4** | **D-6 : d'où viennent les `notes` du GUI ?** | **O1** dériver comme le Cockpit (`<Produit> <version>`) · **O2** source versionnée (`updater/notes/<version>.md`) · **O3** garder `--notes` en entrée, et **prouver** la reproduction contre le fichier versionné | **O3.** O1 **détruirait** les vraies notes du GUI (`latest.json:3` porte un paragraphe entier) pour gagner une reproductibilité qu'O3 obtient sans rien perdre. O2 invente un stockage pour un besoin d'un fichier — sur-ingénierie MVP. O3 rend le chemin **atteignable et prouvé** (CA-16), ce qui était l'objectif. Si le décideur veut O2 quand même : **+0,25 j**. |
| **AR-5** | **La garde de convergence : locale seule, ou deux faces ?** | **O1** locale seule (dans le gate) · **O2** locale **+** croisée hors gate | **O2.** O1 seule reproduirait exactement la garde muette que la doctrine du projet interdit (*registre motivé + hors-couverture déclaré + cliquet*). O2 a un **précédent dans le dépôt** : `test:handoff-parity` (Cockpit), hors gate, SKIP propre sans le frère. Coût du deuxième volet : **~0,2 j**. |
| **AR-6** | **D-5 : corriger la commande ou la prétention ?** | **O1** mettre `cargo test` dans `test:all` du GUI · **O2** laisser `test:all`, corriger la **prétention** (script `test:rust` + limite écrite + verdict à ligne distincte) · **O3** O2 **+** un `quality.sh` côté GUI, par symétrie avec le Cockpit | **O2.** O1 **rouvre un arbitrage écrit et motivé** du dépôt (`CLAUDE.md` : *« Volontairement hors de `test:all` »*) — ce n'est pas au cadrage de le renverser. ⚠️ **Le relevé est ici à rectifier** : la commande n'est pas menteuse, c'est le **critère** de L40 (*« les suites complètes »*) qui a promis plus qu'elle. O3 est raisonnable et **peu cher (+0,15 j)** si le décideur veut la symétrie des deux dépôts. |
| **AR-7** | **Le défaut `iakaframe jalon` entre-t-il ici ?** | **O1** ici · **O2** lot propre | **O2**, comme le pressent le décideur — **et pour une raison de plus** : la description reçue est **fausse sur ses deux points** (§ Rectifications, point 3). Un lot ne se cadre pas sur un constat à corriger. Autre dépôt, autre audience, autre rythme. |
| **AR-8** | **Où vit cette instruction ?** | **O1** un seul dépôt · **O2** les deux, verbatim | **O2**, identique à AR-8 de L40 : les défauts et les fichiers sont des **deux** côtés. Cette instruction devient elle-même un **fichier convergent**, et l'étape 0.1 l'y inscrit. |

---

## Rectifications au relevé reçu

Chaque maillon de ce chantier a corrigé le précédent au moins une fois. Voici ce que la lecture
contredit.

1. **D-5 — « une commande de gate qui ne couvre pas ce qu'elle laisse croire » : à moitié vrai, et
   le remède visé serait faux.** Le fait est exact (`iakaFrameGUI/package.json:18` — `test:all` vaut
   `npm run test`, donc `vitest run`, sans Rust). Mais ce n'est **pas** un oubli : le `CLAUDE.md` du
   dépôt le déclare, motif à l'appui — *« Côté Rust, dans `src-tauri/` : `cargo test`. Volontairement
   hors de `test:all` : en dépendre rendrait la mesure faillible sur toute machine sans toolchain
   Rust. »* Ce qui ment n'est donc pas la commande : c'est **CA-18 de L40**, qui a écrit *« les suites
   complètes sont vertes »* en la nommant. **Le défaut est dans le critère, pas dans le script** — et
   corriger le script renverserait un arbitrage du dépôt. D'où AR-6 = O2.

2. **E — « ses quatre assertions peuvent être supprimées en silence » : exact, et le fichier le dit
   lui-même.** `forge-host-parity.test.mjs:180-184` déclare le défaut, le nomme *défaut E*, et le
   renvoie explicitement à ce lot. Ce n'est donc pas un défaut **découvert** : c'est un défaut
   **déclaré et assumé** par L40 — ce qui est la bonne conduite, et ce qui rend son traitement ici
   simplement dû. Nuance qui change le remède : la **logique** d'`I4bis` **est** couverte, sur
   fixtures (`verifier-mesures.test.mjs:169`). Seule la **jonction** manque. Peupler le registre
   versionné pour « rendre le test non vacuous » serait donc une **fausse réparation** — et
   détruirait un résultat mesuré (le registre est vide parce que 9/9 répondent 200).

3. **`iakaframe jalon` — les deux moitiés du constat sont fausses telles qu'énoncées.** Lecture de
   `/Users/sjupin/work/iakaframe/cli/src/commands/jalon.js` :
   - *« ignore l'argument de titre »* — **non** : `--name` est lu (`:42`) et rendu dans le titre
     FIGlet (`:51`). Le défaut réel est **voisin mais différent** : `parseArgs` est appelé avec
     `allowPositionals: true` (`:30`) et les positionnels ne sont **jamais lus**. Donc
     `iakaframe jalon "MON TITRE"` **accepte l'argument et le jette en silence**, rendant
     `PROJET - JALON :` avec un nom vide. C'est bien une garde tiède — mais **d'acceptation
     d'entrée**, pas de titre ignoré.
   - *« code en dur `Utilisateur` comme récepteur »* — **non** : `--to` existe (`:33`) et prime
     (`:59`) ; `Utilisateur` n'est qu'un **défaut**. Le contrat de rôle n'est donc pas contredit par
     le code, il l'est par **l'usage** : un jalon dev→qualité posé sans `--to` affiche le mauvais
     récepteur. Le remède n'est pas le même — c'est un défaut à **rendre impossible** (exiger `--to`,
     ou le dériver du type de jalon), pas une constante à retirer.
   Deux corrections de forme, un défaut réel de moins et un autre à sa place : **le lot doit être
   re-cadré sur pièce**, pas exécuté sur ce constat.

4. **Le fil conducteur — il tient, mais pas d'un seul tenant.** *« Des gardes qui ne peuvent pas
   échouer, ou qui échouent sur la mauvaise chose »* couvre C, D, E et la convergence. Il **ne couvre
   pas** D-2 ni D-3, qui ne sont pas des gardes mais des **canaux** ; et il couvre mal D-4 et D-6, qui
   sont des **référentiels**, où la garde est juste et c'est son **point d'appui** qui bouge. D'où les
   trois familles, chacune avec **son** remède : renforcer le prédicat / éprouver la jonction /
   immobiliser le référent. Le critère générique proposé — *toute garde éprouvée par une mutation qui
   la fait rougir* — est **adopté**, et précisé : pour une jonction, la mutation est la **suppression
   de l'appel**.

5. **Défauts confirmés sans réserve, aux emplacements cités** : **C** (`verifier-mesures.mjs:38`),
   **D** (`forge-host-parity.test.mjs:111-121`, `"["` reproduit au caractère près), **E**
   (`:166-174`, `:71`), **D-2** (`mesurer-artefacts.mjs:290,294,307,311`), **D-3**
   (`publish-update.mjs:557,654`), **D-4** (`release.yml:90` dans les deux dépôts), **D-6**
   (`latest.json:3` vs `publish-update.mjs:389,681,694`).

6. **Le trou `parUrl` d'I4 est bien réparé** — vérifié : `verifier-mesures.mjs:49-65` indexe par
   plateforme et nomme le doublon. **Non recadré**, comme demandé.

7. **Les six fichiers convergents le sont** — vérifié par lecture intégrale pour
   `forge-host-parity.test.mjs` (identique ligne à ligne dans les deux dépôts). **Un défaut non
   relevé par le décideur** : rien ne le garde. Ajouté au lot (CONV).

---

## Estimation — obligatoire au jalon P1→P2

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** | **2,5 j** (fourchette **2 – 4**) |
| **Complexité / risque** | **Moyenne.** Peu de code, aucune cryptographie neuve, aucune publication réelle requise — mais **deux dépôts**, **des fichiers convergents** dont la moindre édition doit être jumelée, et **une mutation à écrire, exécuter et révoquer pour chaque garde**, ce qui double mécaniquement le temps de chaque assertion. |

Décomposition : étape 0 (convergence + SHA + lecture d'`action.yml`) ≈ 0,25 j · étape 1 (D,
`estPublic` + extraction + 3 exploits + mutation) ≈ 0,4 j · étape 2 (C, borne + fixture + mutation)
≈ 0,3 j · étape 3 (E, jonction + contrefactuel de forme) ≈ 0,25 j · étape 4 (CONV, deux faces +
deux mutations) ≈ 0,5 j · étape 5 (D-4, pin + cliquet + fixture) ≈ 0,4 j · étape 6 (D-6, preuve
contre le fichier versionné ×2) ≈ 0,3 j · étapes 7-8 (D-5, D-2, D-3) ≈ 0,25 j · étape 9 + doc +
backlog ≈ 0,25 j. *(Somme brute ≈ 2,9 j ; l'estimation retenue table sur le fait que les fichiers
convergents s'écrivent **une fois** et se copient.)*

**Inconnues susceptibles de faire glisser** :
- **U1** — l'`action.yml` lu **au SHA** peut **contredire** ce que L40 a lu sur `dev`. Le lot
  s'arrête alors et remonte : c'est un défaut de L40. **+0,3 j**, voire un lot correctif.
- **U2** — le renforcement d'`estPublic` peut faire **rougir un fichier réel** (R1). Si oui, le lot
  a découvert un vrai défaut et s'allonge de **+0,3 j** — et ce serait la meilleure nouvelle du lot.
- **U3** — la face croisée de la garde de convergence n'a de précédent que **côté Cockpit**
  (`test:handoff-parity`) ; le GUI n'a pas le harnais. **+0,25 j**.
- **U4** — la comparaison de l'étape 6 peut **échouer d'emblée** : si le manifeste versionné n'est
  pas reproductible par sa propre chaîne, ce n'est plus un critère, c'est un défaut à cadrer.
  **+0,3 j** et remontée.
- **U5** — si le décideur publie (étape 5.1 de L40) **pendant** ce lot, les fixtures de l'étape 6
  sont à refaire. **+0,2 j**. Ordre à ne pas entrelacer.
- **U6** — si le décideur retient O3 sur AR-1 (**+0,2 j**), O2 sur AR-4 (**+0,25 j**) ou O3 sur AR-6
  (**+0,15 j**), l'estimation monte d'autant.

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à confronter au
temps réel à la clôture du lot.

---

## Sources

- [Pinning GitHub Actions for Enhanced Security — StepSecurity](https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide)
- [Hardening GitHub Actions: Lessons from Recent Attacks — Wiz](https://www.wiz.io/blog/github-actions-security-guide)
- [GitHub Actions policy now supports blocking and SHA pinning actions — GitHub Changelog](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/)
- [github-actions-ensure-sha-pinned-actions — StepSecurity](https://github.com/step-security/github-actions-ensure-sha-pinned-actions)
- [tauri-action — releases](https://github.com/tauri-apps/tauri-action/releases)
- [The Update Framework — spécification (rôle `timestamp`, champ `expires`, freeze attack)](https://theupdateframework.github.io/specification/latest/)
- [TUF — Security (métadonnées expirantes et re-signature)](https://theupdateframework.io/docs/security/)
- [TUF — Roles and metadata](https://theupdateframework.io/docs/metadata/)
