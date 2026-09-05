# Garde de la face en ligne des canaux — la dernière face non exercée du dispositif

> Successeur **inscrit** au gate 🏹 Legolas du lot **« Gardes de la vitrine »** (2026-09-05,
> `specs/instructions/gardes-de-la-vitrine.md`, arbitrage **AR-3 = non** : « hors de ce lot, mais
> l'inscrire EST le geste »). Cadré par 🔵 Gandalf le 2026-09-05, sur ordre de mission de 🟠 Aragorn.
> **Le défaut est confirmé OUVERT par mesure** (§ 1.1), **dans les deux dépôts**, et son étendue
> **n'a pas bougé** depuis la mesure du cadrage précédent.
>
> **Les arbitrages AR-1..AR-3 sont TRANCHÉS par Stéphane le 2026-09-05 : « reco »** — chacun sur la
> recommandation de Gandalf : AR-1 = **(b)**, AR-2 = **(b)**, AR-3 = **(a)**. Gate P1 franchi ; le
> § 4 conserve les options écartées pour mémoire.
>
> **Ce lot est le jumeau de son aîné — mais il n'en est pas la copie.** La forme de la garde se
> transpose intégralement et **n'est pas rouverte** (§ 3.1). Trois choses diffèrent réellement, et
> une seule d'entre elles est une découverte : le classement d'un endpoint qui **répond 2XX avec un
> corps inutilisable** ne compte **pas** comme un écart, alors que le client s'y **arrête** (§ 1.7).

---

## Problème

`scripts/verifier-canaux-en-ligne.mjs` (165 lignes) est la **face 2** de la garde de publication
livrée par L45 : la seule qui confronte au monde réel ce que **chaque endpoint d'update sert**
vraiment. La face 1 (`rendreCompte`, dans le gate) le dit elle-même, noir sur blanc, dans son propre
fichier de garde (`scripts/__tests__/publish-push.test.mjs:142-147`) :

> « Cette face NE PROUVE RIEN sur ce que sert un endpoint, ni sur sa fraîcheur : les deux côtés de
> chaque assertion dérivent du même `resultats` factice. La preuve non circulaire […] est la face 2,
> hors gate. »

Or **aucun test n'exécute la face 2**. Elle est désarmable dans les deux dépôts, avec régénération
du registre de convergence, sans qu'aucune face ne bronche : l'empreinte prouve l'**altération**,
jamais le **comportement**. C'est exactement le défaut F-3 que le lot précédent vient de fermer sur
l'autre face en ligne — et c'est **la dernière** qui reste.

---

## 1. Ce qui a été MESURÉ avant de cadrer

Faits relevés en lecture seule le 2026-09-05, sur `main` (`dd73873`), dans **les deux dépôts**. Ils
**confirment** la mission sur l'essentiel et la **contredisent sur trois points**, dont un qui change
la nature du lot.

### 1.1 Le défaut est ouvert, l'étendue est INCHANGÉE, et elle est symétrique

Recherche du nom du script dans tout le dépôt :

| Dépôt | Occurrences hors script, hors registre, hors doc | Nature |
|---|---|---|
| IakaCockpit | `scripts/__tests__/publish-push.test.mjs:147`, `scripts/__tests__/forge-host-parity.test.mjs:289` | **commentaires seuls** |
| iakaFrameGUI | `scripts/publish-update.test.mjs:598`, `scripts/__tests__/forge-host-parity.test.mjs:289` | **commentaires seuls** |

**Aucun test ne l'exécute, ni ici ni là.** L'étendue est **identique** à la mesure d'il y a quelques
heures (§ 1.4 du cadrage précédent) : rien n'a bougé.

Le script est appelé par exactement **deux** points, tous deux **hors gate** :
`scripts/quality.sh:66` (step [8/8]) et le script npm `canaux:en-ligne`
(`package.json:21` ici, `package.json:29` côté GUI). **⚠️ Le dépôt frère n'a pas de
`scripts/quality.sh`** — vérifié, le fichier n'existe pas : côté GUI, le seul appelant est le script
npm, qu'aucune chaîne n'invoque. La face y est donc **encore plus orpheline** qu'ici.

### 1.2 ⚠️ CONTREDIT LA MISSION — le script NE LIT PAS `fixtures/canaux-publication.json`

L'ordre de mission décrit le script comme mesurant « des endpoints multiples avec trois états et
**un registre de canaux** (`fixtures/canaux-publication.json`) ». **Les deux premiers termes sont
exacts, le troisième est faux.** Le script lit exactement **deux** fichiers
(`verifier-canaux-en-ligne.mjs:46-55`) :

- `package.json` → `version` (le tag local de référence) ;
- `src-tauri/tauri.conf.json` → `plugins.updater.endpoints`, **dans l'ordre**.

`fixtures/canaux-publication.json` est le registre des **canaux d'ÉCRITURE** (les remotes que
`publish-update.mjs` pousse) ; il est lu par `scripts/lib/canaux-publication.mjs`, **jamais** par la
face en ligne. Les deux listes sont **de natures différentes** — des **remotes git** d'un côté, des
**URL de lecture** de l'autre — et rien ne les relie aujourd'hui. **Conséquence directe sur le
cadrage** : c'est ce fait qui commande **AR-1** (où loger la logique extraite), et c'est lui qui
empêche de recopier mécaniquement l'arbitrage AR-5 de l'aîné.

### 1.3 La question du « registre vide » se déplace — et le piège ne se pose PAS ici

La mission demandait de mesurer si le registre est vide ou peuplé. Réponse en deux temps :

- **`fixtures/canaux-publication.json` est PEUPLÉ** — 2 entrées `canaux` (`origin`, `github`, chacune
  avec sa raison) et 1 entrée `HORS_COUVERTURE` (`iakabox`, avec motif **et** condition de levée).
  **Mais il est hors sujet ici** (§ 1.2).
- **La boucle réelle du script porte sur `endpoints`**, et elle est **peuplée des deux côtés** :
  2 endpoints ici (`verifier-canaux-en-ligne.mjs` → `src-tauri/tauri.conf.json:42-45`), 2 endpoints
  côté GUI.

**Donc le piège des entrées vides — I4bis de L41, évité de justesse par l'aîné sur `absents: []` —
NE SE POSE PAS dans ce lot.** Il n'existe ici aucune boucle qui itérerait sur rien. C'est une
différence **favorable**, et elle a une conséquence pratique : le test de sous-processus peut
s'exécuter contre les **fichiers réels** du dépôt sans être vacuous, exactement comme
`canal-mesure.test.mjs`.

**Ce qui reste vrai de la leçon** : le test ne doit **pas** coder en dur le nombre d'endpoints ni
leurs URL (elles **divergent** par dépôt, § 1.5). Il les **dérive** de `tauri.conf.json`, sinon il
cesse d'être convergent.

### 1.4 Contrainte structurelle — le script ne peut pas être importé

`verifier-canaux-en-ligne.mjs:131-165` est **top-level intégral** : lecture des endpoints, garde
`nonMesure`, boucle `await mesurerEndpoint(...)`, impression, `process.exit`. Il n'a **ni `main()`,
ni garde `import.meta.url === argv[1]`**. L'importer depuis un test l'**exécuterait** — le mur que
L45 a heurté sur `publish-update.mjs` (d'où l'extraction de `scripts/lib/publish-push.mjs`) et que
l'aîné a heurté sur `vitrine-en-ligne.mjs`. **Même contrainte, même remède.**

### 1.5 Les entrées sont PAR DÉPÔT — le stub doit se dériver, jamais s'écrire en dur

| Dépôt | `plugins.updater.endpoints` |
|---|---|
| IakaCockpit | `http://192.168.1.139:3001/sjupin/iakacockpit/raw/branch/main/updater/latest.json` · `https://raw.githubusercontent.com/iakasju/IakaCockpit/main/updater/latest.json` |
| iakaFrameGUI | `http://192.168.1.139:3001/sjupin/iakaFrameGUI/raw/branch/main/updater/latest.json` · `https://raw.githubusercontent.com/iakasju/iakaFrameGUI/main/updater/latest.json` |

Les URL **divergent**, le nombre d'endpoints **peut** diverger. Un test byte-identique doit donc
lire `tauri.conf.json` **lui-même** et paramétrer le stub par **URL mesurée**, jamais par constante.
C'est la même mécanique que l'aîné, qui dérive `depot` de `fixtures/vitrine-locale.json`
(`vitrine-en-ligne.test.mjs:222`, `:280`) — mais la **source** n'est pas la même, et le stub doit
matcher sur l'**URL entière**, pas sur un chemin d'API.

### 1.6 La convergence — état mesuré, des DEUX côtés

`scripts/verifier-canaux-en-ligne.mjs` est **déjà inscrit** au registre :
`fixtures/convergence.sha256:57`, sous le cartouche L45 (l. 47-54).

| Grandeur | IakaCockpit | iakaFrameGUI |
|---|---|---|
| Entrées du registre (lignes d'empreinte) | **24** | **24** |
| Cliquet de complétude (`forge-host-parity.test.mjs:307`) | **24** | **24** |
| `scripts/__tests__/` existe | oui | oui |

**Réponse à la question 3 de la mission** : le script **est** au registre ; un fichier de test neuf
byte-identique **doit** y entrer ; le cliquet **doit** monter. **À combien : cela dépend d'AR-1** —
**24 → 25** si la logique extraite loge dans un module déjà inscrit, **24 → 26** si elle loge dans un
module neuf. Contrainte dure, non négociable : **tout se fait dans les deux dépôts au même commit
logique**, empreintes régénérées par la commande en tête du registre, les deux faces rejouées **des
deux côtés**.

### 1.7 ⚠️ LA VRAIE DIFFÉRENCE — un endpoint qui répond 2XX avec un corps inutilisable n'est PAS un écart

C'est la découverte du cadrage, et elle ne se transpose de rien.

`classer()` (`verifier-canaux-en-ligne.mjs:106-120`) rend `ecart: false` **dès que la version est
`null`** (l. 108), quelle qu'en soit la cause. Or `mesurerEndpoint` produit `version: null` dans
**quatre** cas de nature très différente :

| Cas | Ligne | `mesure` | `ecart` | Le client fait quoi ? |
|---|---|---|---|---|
| non-2XX (`404`, `HTTP 5xx`…) | `:86` | `true` | **false** | **passe à l'endpoint suivant** |
| réponse **2XX** non-JSON | `:92` | `true` | **false** | **s'arrête là** |
| **2XX** sans champ `version` | `:95` | `true` | **false** | **s'arrête là** |
| injoignable (timeout, DNS) | `:99` | `false` | **false** | passe au suivant après timeout |

**Fait externe vérifié sur le web** (la décision en dépend, et je ne l'ai pas déduite du code) : la
documentation Tauri de l'updater v2 énonce que, avec plusieurs endpoints, **« Tauri ne continue vers
l'URL suivante que si un code de statut non-2XX est retourné »**. Cela **confirme par une source
externe** la mesure faite dans la source du plugin par L45 (§ 1.4 de son instruction, `:501` : `break`
au premier qui **répond**, pas au premier qui est **frais**).

**Conséquence, et c'est le point** : les lignes 1 et 4 du tableau sont **correctement** classées
`ecart: false` — le client bascule, l'endpoint suivant fait autorité. Les lignes **2 et 3** ne le
sont **pas** : le client **s'arrête** sur un endpoint qui lui sert un manifeste qu'il ne peut pas
lire, et le script rend malgré tout **exit 0 — « OK »** si l'autre endpoint concorde. C'est le
masquage **exact** que L45 existe pour détecter, laissé passer par son propre classifieur.

**Ce que je n'affirme pas** : je n'ai **pas** relu la source du plugin moi-même ; je m'appuie sur la
doc citée et sur la mesure de L45. Et je n'ai **pas** mesuré qu'un endpoint réel ait jamais servi un
2XX inutilisable. C'est un défaut **de classement**, pas un incident observé. **AR-2.**

### 1.8 `quality.sh:70` promet plus que le script ne mesure — la classe F-2, une fois de plus

Le script est honnête : il écrit « chaque endpoint **interrogé** sert la même version que le tag
local » (`verifier-canaux-en-ligne.mjs:160`). Le mot **« interrogé »** porte tout le sens — un
endpoint injoignable n'est **pas** interrogé, et n'empêche pas le code 0.

`scripts/quality.sh:70` **laisse tomber le qualificatif** :

```sh
0) echo "    canaux en ligne : chaque endpoint sert la version publiee." ;;
```

Sachant que l'endpoint n°1 est un **NAS de LAN** (`192.168.1.139`), injoignable hors LAN par
construction, la ligne du gate affirme couramment une chose que la mesure ne porte pas. **C'est le
défaut F-2 mot pour mot** — une prose qui promet plus que ce qui est mesuré — sur le script même que
ce lot vient exercer. `scripts/quality.sh` **n'est pas convergent** (il n'existe pas côté GUI,
§ 1.1) : le rectifier ne touche donc **ni** le registre **ni** le cliquet. **AR-3.**

### 1.9 Les deux backlogs portent bien le successeur — le FAIL de l'aîné est réparé des deux côtés

Vérifié : `CLAUDE.md:1652-1658` ici, `iakaFrameGUI/CLAUDE.md:423-429` là-bas. **Ce lot part donc
d'une base saine**, et c'est le comportement à répéter (CA-10).

**Nit relevé, non traité par ce lot** : la ligne `iakaFrameGUI/CLAUDE.md:427` cite
`scripts/__tests__/publish-push.test.mjs` — un chemin qui **n'existe pas dans ce dépôt-là** (le
fichier correspondant y est `scripts/publish-update.test.mjs:598`, mesuré). C'est une inexactitude de
**recopie**, pas un défaut de garde : elle est **nommée ici** et laissée telle, pour ne pas remuer un
backlog hors périmètre. Si l'exécution touche cette entrée pour une autre raison, elle la corrige au
passage — sinon, non.

---

## 2. Décision retenue

Donner à `scripts/verifier-canaux-en-ligne.mjs` la garde que son jumeau vient de recevoir : **la
logique de verdict est extraite et testée sur entrées fabriquées ; le script lui-même est EXÉCUTÉ en
sous-processus, réseau neutralisé, avec un verrou qui prouve qu'il est passé par le réseau simulé.**

**Ligne directrice, identique à l'aîné** : *une garde ne vaut que ce que sa preuve vaut.* Une face
que rien n'exécute n'est pas une garde : c'est un fichier.

**Et une ligne directrice propre à ce lot** : *on n'épingle pas un classement qu'on vient de mesurer
faux.* Le lot ne peut pas écrire un test vert sur le comportement de § 1.7 sans se prononcer — c'est
l'objet d'**AR-2**, et c'est le seul endroit où ce lot n'est pas un décalque.

Ce lot **ne modifie aucun comportement utilisateur**, et **ne touche pas au gate** : la face en ligne
reste **hors gate**, avec ses trois codes. Sa seule preuve est la mesure — d'où le critère non
négociable **« toute garde touchée est éprouvée par une mutation qui la fait rougir »**, chaque
mutation portant sur le **programme** (jamais sur l'attendu) et **révoquée avec preuve au `sha256`**.

---

## 3. Ce qui se transpose, et ce qui diffère

### 3.1 Se transpose INTÉGRALEMENT — acquis de l'aîné, **NON ROUVERTS**

Réponse franche à la question 1 de la mission : **oui, la forme se transpose entièrement.** Les
arbitrages suivants sont **déjà tranchés** par « Gardes de la vitrine » (2026-09-05, décideur :
« reco ») et **ne sont pas rouverts ici**. Les rouvrir ferait payer deux fois le même débat.

| Acquis | Origine | Ce que ça impose ici |
|---|---|---|
| Extraction **bornée** de la logique de verdict + exécution en **sous-processus**, dans un seul fichier de test | AR-2 = **O3 bornée** | Le script garde ses lectures, son `fetch`, ses messages **à l'octet** et ses codes de sortie ; il perd le **calcul** au profit d'un appel. **Pas** de `main()`, **pas** de garde `import.meta.url`, **pas** de réécriture des messages. |
| Réseau **neutralisé** par un `fetch` de substitution injecté par `node --import` | AR-2 = O3 | Zéro connexion sortante depuis le gate. |
| **Verrou du compteur d'appels** écrit sur disque | CA-3 de l'aîné | Sans lui, un script qui sortirait **avant tout `fetch`** satisferait un test sur le seul code de sortie. |
| Assertions sur le **code** de l'écart et sur le **texte** de sortie, jamais « au moins un écart » | CA-4/CA-5 de l'aîné | Un écart accidentel ne doit pas satisfaire le test. |
| La **limite** de la garde écrite **dans le fichier de garde**, pas seulement au rapport | § 9 de l'aîné | Voir § 10 ci-dessous. |
| Discipline de convergence : deux dépôts, même commit logique, empreintes régénérées, cliquet à la **valeur mesurée** | CA-7 de l'aîné | § 1.6. |

**Ne réinventer rien de tout cela.** Le fichier `scripts/__tests__/vitrine-en-ligne.test.mjs` est le
**patron** : sa structure (bloc unitaire + bloc sous-processus, `STUB` en littéral, helper `lancer`,
cartouche de limite en tête) se recopie **dans sa forme**, jamais dans son contenu.

### 3.2 Diffère RÉELLEMENT — quatre points, dont un seul est une découverte

1. **La source des entrées.** L'aîné dérive `depot` d'une fixture **locale non convergente** ; ici il
   faut dériver **N URL** de `src-tauri/tauri.conf.json`, et le stub matche sur l'**URL entière**
   (§ 1.5). Le nombre d'endpoints ne doit **jamais** être écrit en dur.
2. **La forme du verdict.** L'aîné a **cinq égalités** sur **une** release. Ici : **N endpoints
   indépendants**, chacun classé en **six états** possibles (`concorde`, `injoignable`, motif de
   lecture, `version illisible`, `PERIME OU EN PROPAGATION`, `EN AVANCE SUR LE TAG`), dont **trois
   seulement** produisent un écart. Le test doit couvrir **le classement d'un endpoint**, pas une
   table d'égalités.
3. **Le chemin `NON MESURÉ` est CONDITIONNEL, pas ponctuel.** Chez l'aîné, `nonMesure` est appelé
   depuis `api()` : **une** défaillance suffit à sortir en 3. Ici, `mesurerEndpoint` **n'échoue
   jamais** (l. 79 : « un échec réseau est un état, pas une exception ») et le 3 n'advient que si
   **aucun** endpoint n'a répondu (l. 146) ou si **aucun** n'est déclaré (l. 133). Le stub doit donc
   pouvoir faire échouer **tous** les endpoints, et **un seul**, séparément — deux cas que l'aîné
   n'avait pas.
4. **Le piège du cache CDN**, nommé dans le fichier (l. 31-39). Il **ne change pas** la forme de la
   garde : il est déjà traité **dans** le classement (l'état `PERIME OU EN PROPAGATION` **nomme**
   l'ambiguïté sans la trancher). Le test doit **épingler ce non-tranchement** — qu'un endpoint en
   retard produise cet état-là et **pas** une accusation — sinon quelqu'un « simplifiera » un jour le
   message en « PERIME », et le script se mettra à affirmer ce qu'il ne sait pas.

Et la découverte : **§ 1.7**, le classement `ecart: false` sur un 2XX inutilisable. C'est **AR-2**.

---

## 4. Arbitrages — **TRANCHÉS le 2026-09-05** (décideur : « reco »)

> AR-1 = **(b)** module neuf `scripts/lib/canaux-en-ligne.mjs`, cliquet 24 → **26** ·
> AR-2 = **(b)** corriger le classement 2XX-inutilisable **et** épingler les deux sens ·
> AR-3 = **(a)** rectifier la ligne de `scripts/quality.sh`.
> Options écartées conservées ci-dessous telles qu'elles ont été proposées.

> Les acquis de § 3.1 **ne sont pas des arbitrages** et ne sont pas soumis. Trois questions restent
> ouvertes, et une seule est structurante.

### AR-1 — où loge la logique de verdict extraite ?

- **(a) Dans `scripts/lib/canaux-publication.mjs`** (déjà convergent, déjà « fonctions PURES autant
  que possible », l. 26). Cliquet **24 → 25** (seul le test est neuf).
  *Contre, et c'est mesuré* : le contrat déclaré de ce fichier, écrit dans sa première ligne, est
  « LE REGISTRE DES CANAUX **D'ÉCRITURE**, ET LE FAN-OUT QUI LES POUSSE ». Y ranger le classement des
  canaux de **lecture** rendrait cet en-tête faux — **le défaut F-2 exactement**, réintroduit par le
  lot jumeau de celui qui vient de le corriger.
- **(b) Dans un `scripts/lib/canaux-en-ligne.mjs` neuf.** Cliquet **24 → 26** (module + test).
  *Contre* : un fichier convergent de plus à discipliner.

**🔵 Recommandation : (b).** C'est **le point où ce lot ne recopie pas son aîné**, et pour une raison
mesurée. Chez l'aîné, AR-5 = (a) était juste parce que la fonction relevait **exactement** du contrat
du fichier d'accueil (`scripts/lib/vitrine.mjs`, « pur, zéro I/O, zéro réseau »). Ici elle n'en
relève pas : écriture ≠ lecture, remotes git ≠ URL d'update, `fixtures/canaux-publication.json` ≠
`src-tauri/tauri.conf.json` (§ 1.2). Le coût de (b) est **une ligne de registre** ; le coût de (a)
est **une prose qui ment**, et ce dépôt vient de payer trois fois pour ça (L43, L45-défaut-3,
L33-S1).

### AR-2 — le classement `ecart: false` d'un endpoint qui répond 2XX avec un corps inutilisable (§ 1.7)

- **(a) L'épingler tel quel.** Un test fige le comportement actuel : réponse non-JSON ou manifeste
  sans `version` → **pas** d'écart.
  *Contre* : on inscrirait au dépôt un test **vert et permanent** sur un classement dont ce cadrage
  vient d'établir, source externe à l'appui, qu'il laisse passer le masquage que L45 existe pour
  détecter. Un vert qui atteste le faux — la classe de défaut du corpus.
- **(b) Le corriger, et épingler les DEUX sens.** `mesurerEndpoint` distingue « non-2XX » (le client
  **bascule** → pas d'écart) de « 2XX inutilisable » (le client **s'arrête** → **écart nommé**).
  Deux tests figent la partition. Coût mesuré : un drapeau dans le retour de `mesurerEndpoint`
  (`:86` / `:92` / `:95`) et une branche dans `classer`.
- **(c) Ne pas y toucher, déclarer le hors-couverture, inscrire le successeur.** Aucun test sur ces
  deux branches ; motif et condition de levée écrits dans le fichier de garde.

**🔵 Recommandation : (b).** Trois raisons, dans l'ordre de poids. **(i)** (a) est **exclu** : écrire
un témoin vert sur un classement mesuré défaillant, dans le lot dont le sujet est « une garde qui ne
peut pas rougir n'est pas une garde », serait le lot se contredisant lui-même. **(ii)** Le coût du
faux positif est **nul** : ce script est **hors gate** (`quality.sh` l. 64 le dit, « informe, ne
bloque pas ») — un `exit 1` de plus n'échoue **aucune** chaîne. C'est ce qui distingue radicalement
cet arbitrage d'AR-1 de l'aîné, où élargir la mesure produisait un **échec de gate certain** sur un
geste légitime. **(iii)** L'extraction est écrite de toute façon ; la branche coûte quelques lignes
au moment où on la regarde, et bien plus dans six mois.
**Si (c) est retenu**, la déclaration doit dire le **fait mesuré** — pas « non testé », mais
« classement connu comme laissant passer le cas de masquage, motif § 1.7, levée : le jour où on le
corrige ». Une non-couverture qui tait sa raison est un mensonge poli.

### AR-3 — `scripts/quality.sh:70` (§ 1.8)

- **(a) Rectifier la ligne** pour qu'elle dise ce que le code 0 porte (« chaque endpoint
  **interrogé** … »). Une ligne, fichier **non convergent**, ni registre ni cliquet touchés.
- **(b) Successeur inscrit, non traité.**

**🔵 Recommandation : (a).** C'est littéralement le défaut F-2 sur le script que ce lot exerce, il
coûte une ligne, et il ne peut pas être « en passant » puisqu'il est **nommé, mesuré et cadré ici**.
Le laisser filer alors qu'on le voit serait reproduire la maladie que l'aîné a soignée : un
successeur nommé qui attend six jours. **Réserve honnête** : c'est le seul point du lot qui ne relève
pas de « donner une garde à la garde » ; si le décideur veut un lot strictement mono-sujet, (b) est
défendable — à condition d'inscrire, des **deux** côtés (CA-10).

---

## 5. Périmètre

### Inclus

- **Extraction bornée** de la logique de classement/composition de
  `scripts/verifier-canaux-en-ligne.mjs` *(emplacement selon AR-1)* : le classement d'un endpoint
  contre le tag, la comparaison semver, la composition des lignes et de la liste d'écarts.
- **Fichier de garde neuf** `scripts/__tests__/canaux-en-ligne.test.mjs`, **convergent** :
  unitaires du classement sur entrées **fabriquées** + exécution du script en **sous-processus**,
  **réseau neutralisé, zéro connexion sortante**, **verrou du compteur d'appels**.
- **Épinglage du non-tranchement du cache CDN** (§ 3.2 point 4).
- *(Selon AR-2)* la partition « non-2XX » / « 2XX inutilisable », épinglée **dans les deux sens**.
- *(Selon AR-3)* la rectification de `scripts/quality.sh:70`.
- La discipline de convergence **complète** : deux dépôts au même commit logique, empreintes
  régénérées, **cliquet monté à la valeur mesurée**, les deux faces rejouées **des deux côtés**.
- L'inscription au backlog, **des deux côtés**, de **tout** successeur que ce lot nomme.

### Exclu — explicitement, et rien de ceci ne se fait « en passant »

- **Toute modification de la MESURE elle-même** : le nombre d'endpoints, leur ordre, les timeouts
  (`timeoutMs = 8000`), le caractère séquentiel de la boucle (l. 139-143, dont la raison est écrite),
  l'anonymat. **Non touchés.**
- **Les messages de sortie**, sauf ceux qu'AR-2 = (b) crée. Les textes existants portent des
  rectifications datées de L43/L45 — on ne les remue pas.
- **La forme top-level** du script : pas de `main()`, pas de garde `import.meta.url`.
- **Remettre la face en ligne dans le gate** : interdit. `quality.sh` step [8/8] reste **hors gate**,
  avec ses trois codes ; seule sa ligne de compte rendu bouge, et seulement si AR-3 = (a).
- `fixtures/canaux-publication.json` et `scripts/lib/canaux-publication.mjs` — **hors sujet** (§ 1.2),
  sauf si AR-1 = (a).
- La jonction non couverte de `publish-update.mjs` (L45, **déclarée** telle) — inchangée.
- Le successeur `ENDPOINT-PERIME-FAIT-AUTORITE` (nommé dans le script l. 36) : mesurer la fenêtre de
  propagation réelle du CDN **exige du réseau et du temps** — **hors lot**, reste dû.
- `CONVERGENCE-RELEASE-YML-ALIGNEMENT` (L44), le job `latest:`, CA-5/CA-6/CA-10 de L43/L44.
- **Aucun acte de release** : ni tag, ni release, ni push, ni écriture distante, ni exécution réelle
  de `npm run canaux:en-ligne` **dans le gate**.
- Le nit de `iakaFrameGUI/CLAUDE.md:427` (§ 1.9) — nommé, non traité.
- L'ajout de **toute dépendance** : zéro, comme L33, L41 et l'aîné.

---

## 6. Étapes d'implémentation

**Ordre imposé par une dépendance, pas par le confort.**

1. **Relever l'état de départ** : `sha256` des fichiers en jeu **dans les deux dépôts** ; compte
   d'entrées du registre (**24** attendu) ; `npm run test` vert des deux côtés. Sans point de départ,
   aucune révocation n'est prouvable.
2. **Extraire la logique de verdict** *(AR-1)*. La fonction reçoit **tout en argument** et ne lit
   **rien** : `(mesures, tag) → { lignes, ecarts, mesuresReussies }`. Le script conserve ses
   **lectures**, son `fetch`/`mesurerEndpoint`, ses **deux gardes `nonMesure`**, ses **trois
   `process.exit`** et ses **messages à l'octet**.
3. **Unitaires du classement**, sur entrées fabriquées : `concorde` · `PERIME OU EN PROPAGATION`
   (l'état est **nommé**, l'ambiguïté **non tranchée**) · `EN AVANCE SUR LE TAG` · `version
   illisible` · `injoignable` · les motifs de lecture. Chaque cas assert **l'état attendu** et
   **le drapeau `ecart`**, jamais « au moins un écart ».
4. *(Si AR-2 = (b))* **Partitionner** non-2XX / 2XX-inutilisable dans `mesurerEndpoint`, brancher
   `classer`, **épingler les deux sens** : `404` → **pas** d'écart ; `200` + corps non-JSON →
   **écart nommé**. Justifier dans le code par le fait de § 1.7 **et sa source**.
5. **Test de sous-processus** : stub `fetch` injecté par `node --import`, **paramétré par les URL
   lues dans `tauri.conf.json`** (§ 1.5), **compteur d'appels sur disque** (le verrou).
6. **Les trois codes de sortie**, plus les deux cas propres à ce script (§ 3.2 point 3) :
   **0** concorde · **1** écart, la sortie **nommant l'hôte et l'état** · **3** *tous* injoignables ·
   et le cas **mixte** : un endpoint injoignable + un concordant → **0**, avec la sortie qui
   **nomme** l'endpoint non interrogé. Ce dernier cas est celui que `quality.sh` décrivait mal.
7. **Contrefactuels**, un par garde, chacun **révoqué avec preuve au `sha256`** : neutraliser le
   `fetch` du script ; faire sortir `nonMesure` en 0 ; renvoyer une liste d'écarts vide sans passer
   par la fonction extraite (jonction) ; muter chaque branche du classement **une à une**. Chacun
   doit faire rougir **le test attendu, nommément**.
8. *(Si AR-3 = (a))* rectifier `scripts/quality.sh:70`.
9. **Convergence** : reporter **tout** dans le dépôt frère, `diff` octet à octet, régénérer les
   empreintes, **monter le cliquet à la valeur mesurée**, **motiver et dater** la montée dans le
   commentaire, sur le modèle des l. 269-302 de `forge-host-parity.test.mjs`.
10. **Rejouer** : `npm run test` **et** `npm run test:convergence` dans les **deux** dépôts, puis
    `bash scripts/quality.sh` ici. Rejouer `npm run test` **réseau coupé** (CA-8).
11. **Inscrire au backlog des DEUX dépôts** tout successeur nommé, **et rien d'autre**.

---

## 7. Fichiers concernés

- `scripts/verifier-canaux-en-ligne.mjs` — **convergent, inscrit l. 57** — le calcul laisse place à
  un appel ; lectures, `fetch`, messages et codes de sortie **inchangés** *(sauf AR-2 = (b))*.
- `scripts/lib/canaux-en-ligne.mjs` — **NEUF, convergent** *(si AR-1 = (b))* — la logique pure.
  *(ou `scripts/lib/canaux-publication.mjs`, déjà inscrit, si AR-1 = (a).)*
- `scripts/__tests__/canaux-en-ligne.test.mjs` — **NEUF, convergent** — unitaires + sous-processus,
  **cartouche de limite en tête** (§ 10).
- `fixtures/convergence.sha256` — empreintes régénérées ; **1 ou 2 lignes neuves**.
- `scripts/__tests__/forge-host-parity.test.mjs` — **convergent** — cliquet **24 → 25** *(ou 26)*,
  motivé et **daté**.
- `scripts/quality.sh` — **NON convergent, Cockpit seul** — ligne 70 *(si AR-3 = (a))*.
- `CLAUDE.md` — successeurs inscrits.
- **Et les jumeaux de chacun** dans `/Users/sjupin/work/iakaFrameGUI` (y compris son `CLAUDE.md` —
  il n'a **pas** de `scripts/quality.sh`).

---

## 8. Risques

- **R1 — épingler un défaut.** Si AR-2 = (a), le lot inscrit un test vert et permanent sur un
  classement mesuré défaillant. *Mitigation* : AR-2 = (b), ou une déclaration qui **nomme le fait**,
  jamais un simple « non testé ».
- **R2 — un stub ne prouve pas le monde réel.** Le stub est construit sur ce que le script **lit**
  (`res.ok`, `res.status`, `res.json()`, `body.version`), pas sur ce que les endpoints **servent**.
  *Mitigation* : § 10, écrit **dans le fichier de garde**.
- **R3 — un test qui code en dur les endpoints cesse d'être convergent.** Les URL divergent (§ 1.5).
  *Mitigation* : tout dériver de `tauri.conf.json`, y compris le **nombre** d'endpoints ; la face
  croisée le verra si on triche.
- **R4 — élargir l'extraction en silence.** Si la logique s'avère plus entrelacée avec la boucle
  `await` que la lecture ne le montre, la tentation sera de refondre le script.
  *Mitigation* : **s'arrêter et remonter**, comme l'inconnue n°3 de l'aîné le prévoyait.
- **R5 — dérive de convergence.** Toucher un fichier inscrit d'un seul côté. *Mitigation* : rejouer
  **les deux faces des deux côtés** (étape 10), pas seulement ici.
- **R6 — un témoin qui pourrait être satisfait par autre chose.** La leçon a été payée **six fois**
  (L42-F1, L37-CA6, le FAIL de L46, le verrou de L47, le verrou d'horloge de L48, le compteur de
  l'aîné). *Mitigation* : chaque CA porte un **verrou explicite**, **conservé dans le dépôt**.
- **R7 — remettre la face en ligne dans le gate par la bande.** *Mitigation* : le test exerce le
  **script** contre un réseau **simulé** ; `quality.sh` reste hors gate ; CA-8 le mesure réseau
  coupé.

---

## 9. Critères d'acceptation

Chacun avec **Vérif**, **Contrefactuel** et **Verrou**. Un CA sans contrefactuel rejoué n'est pas
satisfait.

- [ ] **CA-1 — `scripts/verifier-canaux-en-ligne.mjs` est EXÉCUTÉ par le gate, réseau neutralisé.**
      **Vérif** : sous-processus (`node --import <stub>`), **zéro connexion sortante**.
      **Contrefactuel** : neutraliser le corps de `mesurerEndpoint` (retour constant) → le test
      rougit.
      **Verrou** : le stub **écrit un compteur d'appels sur disque** et le test exige
      **compteur > 0** **et** que les **URL demandées soient celles de `tauri.conf.json`**. Sans lui,
      un script qui sortirait avant tout `fetch` satisferait le test — le témoin vide, et le plus
      facile à produire ici.

- [ ] **CA-2 — les TROIS codes de sortie sont exercés, et le CAS MIXTE avec eux.**
      `0` (tous concordent) · `1` (au moins un écart) · `3` (**tous** injoignables) · **et** le cas
      mixte « un injoignable + un concordant → **0** ».
      **Vérif** : quatre lancements, assertions sur le **code** **et** sur la **sortie**.
      **Contrefactuel** : faire sortir `nonMesure` en `0` → le cas 3 rougit. C'est le faux vert que
      ce script existe pour interdire (son en-tête, l. 25-29).
      **Verrou** : le cas `1` assert que la sortie **nomme l'hôte ET son état**, pas seulement que le
      code vaut 1 — sinon n'importe quel écart, y compris accidentel, satisferait le test. Le cas
      mixte assert que la sortie **nomme l'endpoint non interrogé** : c'est ce que le code 0 tait, et
      ce que § 1.8 corrige côté `quality.sh`.

- [ ] **CA-3 — le classement rend le verdict attendu sur entrées FABRIQUÉES, état par état.**
      `concorde` · `PERIME OU EN PROPAGATION` · `EN AVANCE SUR LE TAG` · `version illisible` ·
      `injoignable` · motifs de lecture.
      **Vérif** : table de cas sur la fonction pure ; **aucune** assertion ne dépend du réseau.
      **Contrefactuel** : muter chaque branche **une à une** → chaque cas rougit **individuellement
      et pour la bonne raison**, comme les quatre mutations de L33.
      **Verrou** : chaque cas assert **l'état ET le drapeau `ecart`**, jamais « au moins un écart ».
      En particulier, `EN AVANCE SUR LE TAG` et `PERIME OU EN PROPAGATION` ne doivent **pas** être
      interchangeables : la comparaison semver doit être éprouvée dans **les deux sens**, sur le cas
      de bord `0.9` vs `0.10` (précédent : le tri `sort -V` de L43).

- [ ] **CA-4 — le NON-TRANCHEMENT du cache CDN est épinglé.** Un endpoint qui sert une version
      **antérieure** produit l'état **`PERIME OU EN PROPAGATION`** et la mention **« fenetre de
      propagation NON MESUREE »** — pas une accusation.
      **Vérif** : assertion sur le **texte** de l'état.
      **Contrefactuel** : remplacer l'état par « PERIME » seul → le test rougit nommément.
      **Verrou** : l'assertion porte sur **les deux moitiés** de la formule (l'alternative **et**
      l'aveu de non-mesure). N'asserter que « PERIME » laisserait passer précisément la
      simplification qu'on veut interdire.

- [ ] **CA-5 — la JONCTION est exercée** : le script appelle bien la fonction extraite.
      **Vérif** : le sous-processus de CA-1/CA-2 traverse la fonction.
      **Contrefactuel** : faire rendre au script une liste d'écarts vide sans passer par la fonction
      → **CA-2 cas 1** rougit. Si **aucun** test de sous-processus ne rougit, la jonction n'est
      **pas** couverte et il faut **l'écrire tel quel**, comme L45 l'a fait pour la sienne.
      **Verrou** : ce CA existe parce que **CA-3 seul ne le prouve pas** — la leçon de L42-F1 et la
      non-couverture déclarée de L45.

- [ ] **CA-6 — la partition « le client bascule » / « le client s'arrête » est épinglée**
      *(si AR-2 = (b) ; si AR-2 = (a) ou (c), ce CA devient une **déclaration** de hors-couverture
      portant le fait de § 1.7 et sa source, et rien d'autre)*.
      **Vérif** : `404` et `HTTP 5xx` → **pas** d'écart ; `200` + corps non-JSON et `200` sans champ
      `version` → **écart nommé**.
      **Contrefactuel** : ramener les quatre cas à un seul classement → **deux** tests rougissent
      nommément, un par sens.
      **Verrou** : les **deux** sens sont assertés. N'en asserter qu'un laisserait le classement
      libre de tout collapser vers l'autre — et c'est **exactement** l'état de départ (§ 1.7).

- [ ] **CA-7 — la convergence est tenue, et le cliquet monte.** Les fichiers touchés et créés sont
      **byte-identiques** entre les deux dépôts, **inscrits** au registre, empreintes régénérées ;
      le cliquet est posé **à la valeur mesurée** — **25** si AR-1 = (a) (seul le test est neuf),
      **26** si AR-1 = (b) (module + test) — motivé et **daté**.
      **Vérif** : `diff` octet à octet ; `npm run test` **et** `npm run test:convergence` verts
      **dans les deux dépôts**.
      **Contrefactuel** : muter un octet d'un fichier inscrit **d'un seul côté** → la face locale
      **nomme** le fichier ; retirer une ligne du registre **des deux côtés** → le **cliquet**
      rougit. Révocations prouvées au `sha256`.
      **Verrou** : le cliquet est posé à la valeur **mesurée**, jamais en dessous — un plancher sous
      le compte réel est le trou même qu'il existe pour fermer, et l'erreur **déjà commise** à L44
      (« plancher 17 → 18 » pour trois fichiers inscrits).

- [ ] **CA-8 — le gate reste hors ligne.** `npm run test` est vert **réseau coupé**, dans les deux
      dépôts.
      **Vérif** : rejeu effectif, pas une déduction de lecture. Si la coupure n'est pas possible,
      **le déclarer** — et, mieux, bloquer **au niveau des sockets** comme le gate de l'aîné l'a
      fait.
      **Contrefactuel** : retirer `--import <stub>` du lancement → le test devient dépendant du
      réseau, donc rouge ou non déterministe hors ligne, ce qui prouve que la neutralisation est
      **agissante**.
      **Verrou** : `scripts/quality.sh` step [8/8] reste **hors gate** et ses **trois codes**
      inchangés ; si AR-3 = (a), **seule** la ligne 70 bouge — vérifié au `git diff` du fichier.

- [ ] **CA-9 — aucune régression.** `bash scripts/quality.sh` **exit 0** ici ; comptes de tests
      front et Rust relevés **avant/après** ; **zéro dépendance ajoutée** ; **zéro modification** de
      `fixtures/canaux-publication.json`, de `src-tauri/tauri.conf.json` et des messages existants du
      script.
      **Vérif** : `git diff --stat` du lot.
      **Verrou** : les comptes sont **remesurés**, jamais recopiés d'un rapport — le défaut D3 de
      L34, où un compte annoncé n'avait jamais été recompté.

- [ ] **CA-10 — TOUT successeur nommé par ce lot est INSCRIT au backlog des DEUX dépôts.**
      Au minimum : `ENDPOINT-PERIME-FAIT-AUTORITE` (la fenêtre de propagation du CDN, **non
      mesurée**, déjà nommée dans le script l. 36) ; **et** l'option d'AR-2 non retenue, si (a) ou
      (c) est tranché ; **et** l'option d'AR-3 non retenue, si (b) est tranché ; **et** tout défaut
      découvert en chemin.
      **Vérif** : lecture des deux `CLAUDE.md` **après** le lot.
      **Verrou** : ce CA est écrit parce que **le lot précédent a ÉCHOUÉ au gate exactement là** —
      son successeur (ce lot) n'était inscrit dans aucun backlog. **Un lot qui corrige des
      successeurs oubliés ne peut pas repartir en oubliant le sien.** Un lot livré avec un successeur
      non inscrit est un **refus**, quel que soit l'état du reste.

---

## 10. Ce que cette garde PROUVERA — et ce qu'elle ne prouvera PAS

> **À recopier dans le fichier de garde, pas seulement ici.** Règle du dépôt : une limite se déclare
> **là où elle vit**.

**Réponse à la question 4 de la mission** : la limite de l'aîné s'applique **dans sa structure**,
mais **pas mot pour mot**. Trois des points changent, et un s'ajoute.

**Ce qu'elle prouvera.** Que le script **s'exécute** et **traite correctement ce qu'il reçoit** : que
chaque endpoint est classé selon l'état attendu, que la comparaison semver ordonne juste, que les
trois codes de sortie sont posés aux bons endroits, que le chemin `NON MESURÉ` **sort en 3 et non en
0**, que le cas **mixte** (un endpoint injoignable, un concordant) sort en **0** en le disant, et que
la logique extraite est **réellement branchée** dans le script.

**Ce qu'elle ne prouvera pas, et qu'il ne faut pas laisser croire.**

1. **Que le stub ait la forme d'une réponse réelle.** Il est construit sur ce que le script **lit** —
   `res.ok`, `res.status`, `res.json()`, `body.version` — pas sur ce que Forgejo ou
   `raw.githubusercontent.com` **servent**. Si un endpoint changeait de forme, **tous** ces tests
   resteraient verts et la face en ligne réelle rendrait un verdict faux. *(Différence avec l'aîné :
   là-bas la source était l'API GitHub, dont trois champs sur quatre sont documentés ; ici les deux
   endpoints servent un **fichier statique**, `updater/latest.json`, dont la forme est fixée par
   `scripts/lib/update-manifest.mjs` — donc par **nous**. La forme est **moins** susceptible de
   dériver, et la dérive serait **notre** fait, pas celui d'un tiers.)*
2. **Que les endpoints servent la bonne version.** C'est la question que la face en ligne pose, et
   **seule son exécution réelle** y répond — `npm run canaux:en-ligne`, `quality.sh` step [8/8],
   hors gate, réseau requis, **inchangée** par ce lot.
3. **Que le client se comporte comme on le suppose.** La partition « bascule / s'arrête » (AR-2)
   repose sur la doc de l'updater et sur la lecture de sa source faite par L45 — **pas** sur une
   mesure faite ici, avec ce plugin, sur cette version. Aucun test de ce lot n'exerce le **client**.
4. **⚠️ Spécifique à ce script, et absent chez l'aîné : que le verdict `PERIME OU EN PROPAGATION`
   soit tranchable.** Le script **nomme** l'ambiguïté parce que la fenêtre de propagation du CDN est
   **non mesurée** (l. 31-39). Aucun test ne peut la trancher : la trancher **exige du réseau et du
   temps réel**. Le lot épingle le **non-tranchement** (CA-4), il ne le lève pas.

**Autrement dit** : ce lot donne une garde à la garde, il ne remplace pas la mesure. Le dispositif de
publication garde **trois** niveaux et non deux — la face 1 dans le gate (le message est conditionné
par les résultats de push, et **rien de plus**, elle le dit elle-même), **ce fichier** (le script
traite correctement ce qu'il reçoit), et la face 2 réelle (confrontation au monde). **Aucun ne
subsume les autres.** L'écrire est la condition pour que le vert de ce lot ne soit pas lu, un jour,
comme « les clients voient la bonne version ».

---

## 11. Estimation

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** (spec fermée) | **1 à 1,5 j-homme** — extraction + unitaires ≈ 0,5 j · sous-processus + 5 codes/cas ≈ 0,4 j · convergence, rejeux et contrefactuels ≈ 0,3 j · AR-2 = (b) **+0,25 j** · AR-3 = (a) **+0,05 j** |
| **Complexité** | **Faible.** Aucun algorithme nouveau, aucune dépendance, et **le patron est écrit dans le dépôt depuis quelques heures** (`scripts/__tests__/vitrine-en-ligne.test.mjs`). C'est le lot le plus balisé du corpus récent. |
| **Risque** | **Faible-moyen — de discipline, pas de technique.** Le coût réel est dans les **deux dépôts**, le registre, le cliquet, et **une dizaine de contrefactuels à jouer puis révoquer avec preuve**. C'est là que L42, L44 et L45 ont dérapé. |

**Pourquoi c'est en dessous de l'aîné (2 à 2,5 j)** : ce lot n'a **pas** de volet F-2 à traiter
(l'équivalent, AR-3, est **une ligne** dans un fichier non convergent), le piège des entrées vides
**ne se pose pas** (§ 1.3), et la forme de la garde est **déjà écrite** — elle se recopie dans sa
structure. Le backlog l'estimait « ≈ 1 j-homme » ; **je confirme l'ordre de grandeur** et l'élargis
vers le haut à cause d'AR-2, qui n'était pas connu quand cette ligne a été écrite.

**Inconnues susceptibles de faire glisser l'estimation** :

1. **AR-2 = (b)** touche `mesurerEndpoint` **et** `classer` : si la partition demande de remonter le
   drapeau à travers plus de branches que les trois relevées (`:86`, `:92`, `:95`), compter
   davantage. **S'arrêter et remonter** plutôt qu'élargir en silence.
2. **L'état du dépôt frère** au moment du lot — branche courante, arbre propre. Vérifié aujourd'hui
   sur les seuls fichiers cités (registre à 24, cliquet à 24, `scripts/__tests__/` présent) ; pas
   au-delà.
3. **Le nombre exact de contrefactuels** : six états de classement mutés un à un, plus jonction, plus
   `nonMesure`, plus convergence — **neuf au minimum**, davantage si AR-2 = (b).
4. **Le flake signalé, non reproduit** au gate de l'aîné (S-n, ≈23 exécutions par fichier, zéro
   rouge) : s'il se manifestait sur les fichiers de ce lot, le diagnostic n'est **pas** budgété ici.

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à **rappeler et
confronter au temps réel** à la clôture du lot.
