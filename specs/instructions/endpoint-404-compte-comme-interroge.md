# `ENDPOINT-404-COMPTE-COMME-INTERROGE` — la ligne de succès dit ce que la mesure porte

> Successeur **trouvé par le gate 🏹 Legolas du 2026-09-05** et **reproduit en direct par lui**,
> inscrit aux backlogs des **deux** dépôts (`CLAUDE.md:1660-1671` ici,
> `iakaFrameGUI/CLAUDE.md:434-442` là-bas). Il était **explicitement hors périmètre** du lot qui
> l'a révélé — « Garde de la face en ligne des canaux »
> (`specs/instructions/garde-de-la-face-en-ligne-des-canaux.md`), dont le § 5 exclut :
> « **Les messages de sortie**, sauf ceux qu'AR-2 = (b) crée ». C'est pour cela que c'est un
> successeur et non un correctif d'alors.
>
> Cadré par 🔵 Gandalf le 2026-09-06, sur ordre de mission de 🟠 Aragorn, base `main` `c370a47`
> (v0.33.0 scellée). **Le défaut est confirmé ouvert par lecture ligne à ligne** (§ 1.1),
> **dans les deux dépôts, à l'octet près** (§ 1.4).
>
> **⚠️ Ce lot ne corrige AUCUN comportement.** Les codes de sortie, le classement, la partition
> livrée hier et le non-tranchement du cache sont **intacts et hors périmètre**. Ce lot corrige
> **une phrase** — et lui donne la garde qu'elle n'a jamais eue.
>
> **Les arbitrages AR-1..AR-5 sont TRANCHÉS par Stéphane le 2026-09-06 : « reco »** — chacun sur la
> recommandation de Gandalf : AR-1 = **(a)**, AR-2 = **(a) bornée**, AR-3 = **(a)**, AR-4 = **(a)**,
> AR-5 = **(a) bornée**. Gate P1 franchi.

---

## Problème

`scripts/verifier-canaux-en-ligne.mjs:134` imprime, quand aucun écart n'est relevé :

```
verifier-canaux-en-ligne : OK (0) — chaque endpoint interrogé sert la même version que le tag local.
```

Le mot **« interrogé »** porte tout le sens de cette phrase, et il n'a jamais été défini que
**par opposition à « injoignable »**. Or un endpoint qui répond **404** est « interrogé » au sens
que le code emploie partout ailleurs (`mesure: true`) — et il **ne sert rien**. Le cas
**joignable-mais-vide** n'est couvert par **aucune** des deux définitions, et la ligne l'englobe
en silence.

C'est le **défaut F-2 mot pour mot** — une prose qui affirme plus que ce que la mesure porte —
sur le script que le lot précédent venait d'exercer, et **une ligne au-dessus** de celle qu'il
avait déjà rectifiée pour la même raison.

---

## 1. Ce qui a été MESURÉ avant de cadrer

Lecture seule, 2026-09-06, `main` `c370a47`, **dans les deux dépôts**. Trois points **confirment**
la mission, un la **précise**, un la **complète**.

### 1.1 Le défaut est ouvert — reproduction par lecture, ligne à ligne

Entrées : deux endpoints déclarés, le premier rendant `404`, le second servant le tag local.

| Étape | Ligne | Résultat |
|---|---|---|
| `mesurerEndpoint(A)` | `verifier-canaux-en-ligne.mjs:77-80` | `{ mesure:true, motif:"absent (404)", version:null }` — **pas** de `echec2xx` |
| `mesurerEndpoint(B)` | `:92` | `{ mesure:true, motif:"sert", version:"<tag>" }` |
| `classer(A)` | `lib/canaux-en-ligne.mjs:64-71` | `{ etat:"absent (404)", ecart:false }` |
| `classer(B)` | `:75` | `{ etat:"concorde", ecart:false }` |
| `composerVerdict` | `:97-107` | `ecarts = []`, `mesuresReussies = [A, B]` (**A compris**) |
| Verdict | `verifier-canaux-en-ligne.mjs:126` | `mesuresReussies.length === 2` → **pas** de `nonMesure` |
| Sortie | `:133-135` | `ecarts.length === 0` → **`OK (0) — chaque endpoint interrogé sert…`**, `exit 0` |

**Le gate l'avait exécuté ; je le confirme par lecture, et le chemin est celui qu'il a décrit.**

### 1.2 ⚠️ CONFIRMÉ — le classement n'est PAS en cause

Réponse franche à la question de la mission : **tu ne te trompes pas.** `classer()` rend
`ecart: false` sur un non-2XX **à juste titre**, et c'est un acquis **mesuré et sourcé** du lot
précédent (doc Tauri updater v2 : « Tauri ne continue vers l'URL suivante que si un code de statut
non-2XX est retourné ») : le client **bascule**, l'endpoint suivant fait autorité, il n'y a
**aucun** écart. **Le code de sortie `0` est CORRECT** et ne doit pas bouger.

Ce qui est faux, c'est **uniquement la phrase** qui résume ce `0`. **Ce lot ne rouvre donc ni
`classer`, ni la partition `echec2xx`, ni les codes de sortie.**

### 1.3 D'où vient le mot — et pourquoi il ne peut pas être réparé sur place

`composerVerdict` (`lib/canaux-en-ligne.mjs:105`) rend
`mesuresReussies = mesures.filter((m) => m.mesure)`. C'est la **seule** population que la fonction
expose, et **« interrogé » en dérive**. Or cette notion est **correcte pour ce qu'elle sert** :
elle commande le code **3** (`verifier-canaux-en-ligne.mjs:126`), c'est-à-dire *« aucun endpoint
n'a pu être **atteint** »*. **Joignabilité ≠ service rendu.** La ligne de succès a besoin d'une
population que la fonction ne calcule pas : celle des endpoints qui ont **servi une version
lisible** (`m.version !== null`). **AR-2.**

### 1.4 ⚠️ CONFIRMÉ — `quality.sh:70` a recopié l'imprécision, et l'a même AGGRAVÉE

```sh
0) echo "    canaux en ligne : chaque endpoint INTERROGE sert la version publiee." ;;
```

Le lot précédent (AR-3 = a) a **ajouté** le mot `INTERROGE` à cette ligne pour la rendre honnête —
sur la foi de la ligne 134 du script. **Le qualificatif qu'il a ajouté est précisément celui que
ce lot mesure comme faux.** Aggravation mesurée : `quality.sh` **n'a pas accès aux mesures**, il
ne connaît que le **code de sortie** (`:66-73`) ; il ne peut donc affirmer **rien** de plus que
« aucun écart ». **AR-4.**

`scripts/quality.sh` **n'existe pas** dans le dépôt frère (vérifié : `Glob` sur
`iakaFrameGUI/scripts/quality.sh` → aucun fichier). Il n'est **pas** au registre de convergence :
le rectifier ne touche **ni** le registre **ni** le cliquet.

### 1.5 La convergence — état mesuré des deux côtés, et il commande une réponse simple

| Fichier | Registre | Ligne |
|---|---|---|
| `scripts/verifier-canaux-en-ligne.mjs` | **inscrit** | `fixtures/convergence.sha256:57` |
| `scripts/lib/canaux-en-ligne.mjs` | **inscrit** | `:89` |
| `scripts/__tests__/canaux-en-ligne.test.mjs` | **inscrit** | `:90` |
| `scripts/quality.sh` | **non inscrit**, et **absent** chez le frère | — |

Cliquet de complétude : **26** (`forge-host-parity.test.mjs:316`).

**Réponse à la question 4 de la mission** : **les trois fichiers en jeu sont déjà au registre.**
Ce lot **ne crée aucun fichier neuf** — il modifie des fichiers déjà convergents. Donc :
**le cliquet RESTE à 26**, seules les **empreintes** sont régénérées. Le monter serait une
**fausse** montée : le cliquet compte des fichiers **couverts**, pas des commits.

Le frère porte la ligne fautive **à l'identique** : `iakaFrameGUI/scripts/verifier-canaux-en-ligne.mjs:134`,
même texte, même numéro de ligne (mesuré). Le corriger d'un seul côté **casserait la convergence**.

### 1.6 Le cas est DÉJÀ dans le fichier de garde — et il n'assert que le code

`scripts/__tests__/canaux-en-ligne.test.mjs:346-350` :

```js
it("AR-2 = (b) au bout du fil — un 404 ordinaire ne produit PAS d'ecart (le client bascule)", () => {
  const modes = ENDPOINTS.map((_, i) => (i === 0 ? "http-404" : "match"));
  const r = lancer({ modes });
  expect(r.status).toBe(0);
});
```

**Le cas exact du gate est déjà outillé** : le stub connaît le mode `http-404`, le harnais de
sous-processus existe, le compteur d'appels aussi. **Ce test n'assert que le code de sortie** —
il est **muet sur la sortie**, donc il est **vert aujourd'hui et resterait vert** quelle que soit
la phrase imprimée. La réponse à la question 3 de la mission est donc : **oui, le cas s'écrit
directement**, dans le fichier existant, sans nouvelle infrastructure. C'est une **circonstance
favorable**, et elle explique l'essentiel de l'estimation basse.

**Contrainte** : `:305` assert `expect(r.stdout).toContain("OK (0)")`. Le préfixe **`OK (0)` doit
être conservé**, quelle que soit la formulation retenue.

### 1.7 Nit relevé chez le frère — nommé, traité seulement si AR-5 = (a)

`iakaFrameGUI/CLAUDE.md:444` porte l'entrée `FACE-EN-LIGNE-DES-CANAUX-NON-EXERCEE` **toujours
décochée** (`- [ ]`), alors que le lot correspondant est **livré, gaté et fusionné des deux
côtés** le 2026-09-05. Le lot précédent avait par ailleurs **déjà nommé** une inexactitude de
recopie dans cette même entrée (un chemin qui n'existe pas dans ce dépôt-là) en la laissant
telle. **AR-5.**

---

## 2. Décision retenue

**La ligne de succès doit dire ce que le `0` porte, et rien de plus** — et une garde doit rougir
si quelqu'un la ramène à une affirmation globale.

**Ligne directrice** : *un code de sortie ne se résume pas par une promesse.* Le vert de ce script
signifie **« aucun écart »**, pas **« tous les endpoints servent »**. Les deux se ressemblent
exactement assez pour qu'on lise le second en voyant le premier — c'est ce que le gate a fait, et
il a eu raison de le relever.

**Ce lot ne modifie aucun comportement** : mêmes codes, même classement, même mesure. Sa seule
preuve est le **texte imprimé**, d'où le critère non négociable **« toute garde touchée est
éprouvée par une mutation qui la fait rougir »**, chaque mutation portant sur le **programme**
(jamais sur l'attendu) et **révoquée avec preuve au `sha256`**.

---

## 3. Ce qui se transpose sans discussion — **NON ROUVERT**

Réponse à la mission : ces points sont **acquis** des lots des 2026-09-03 et 2026-09-05, tranchés
par le décideur, et **ne sont pas soumis à arbitrage ici**. Les rouvrir ferait payer deux fois le
même débat.

| Acquis | Origine |
|---|---|
| Le script reste **top-level intégral** : pas de `main()`, pas de garde `import.meta.url` | AR-2 = O3 bornée, « Gardes de la vitrine » |
| Le test l'exerce en **sous-processus**, `fetch` de substitution injecté par `node --import`, **zéro connexion sortante** | idem |
| **Verrou du compteur d'appels sur disque** | CA-3 de « Gardes de la vitrine » |
| Les endpoints sont **dérivés de `tauri.conf.json`**, jamais écrits en dur | § 1.5 du lot précédent |
| La face en ligne reste **HORS GATE**, avec ses **trois** codes | AR-6 = a, L45 |
| Le classement `classer()` et la partition `echec2xx` sont **justes et fermés** | AR-2 = b, lot précédent (§ 1.2) |
| Discipline de convergence : deux dépôts, **même commit logique**, empreintes régénérées, deux faces rejouées **des deux côtés** | CA-7 du lot précédent |

---

## 4. Arbitrages — **TRANCHÉS le 2026-09-06** (décideur : « reco »)

> AR-1 = **(a)** ligne comptée qui partitionne servi / atteint-sans-servir / injoignable et **nomme**
> les seconds, préfixe `OK (0)` conservé · AR-2 = **(a) bornée** deux champs dérivés dans
> `composerVerdict`, **zéro renommage** · AR-3 = **(a)** le script formate, garde par sous-processus ·
> AR-4 = **(a)** rectifier `scripts/quality.sh` (Cockpit seul, le frère n'a pas ce fichier) ·
> AR-5 = **(a) bornée** pour le nit du backlog frère.
> Gate P1 franchi ; le § 4 conserve les options écartées pour mémoire.

### AR-1 — quelle est la formulation juste ? *(structurant)*

- **(a) Une ligne COMPTÉE qui partitionne les trois populations et NOMME celles qui n'ont rien
  servi.** Forme visée (clauses optionnelles, présentes seulement si non vides) :

  ```
  verifier-canaux-en-ligne : OK (0) — 1 endpoint sert la version du tag local (v0.33.0).
    1 atteint sans servir de manifeste (le client bascule vers le suivant) : 192.168.1.139:3001.
  ```
  *Pour* : le vert devient **auto-limitant** — il dit ce qu'il couvre **et** ce qu'il ne couvre
  pas. *Contre* : demande une donnée que la fonction pure ne calcule pas encore (**AR-2**).

- **(b) Renoncer à toute affirmation globale** : `OK (0) — aucun ecart entre ce que les endpoints
  servent et le tag local.`
  *Pour* : **strictement vrai** par construction (c'est la définition littérale de
  `ecarts.length === 0`), **une ligne**, aucune donnée nouvelle, aucun risque.
  *Contre* : perd l'information au **niveau du résumé** — c'est justement le niveau qui est lu.

- **(c) Supprimer la ligne globale**, ne laisser que le détail par endpoint.
  *Contre* : `quality.sh` et l'opérateur lisent la dernière ligne ; un `exit 0` muet est une
  régression d'ergonomie, et le préfixe `OK (0)` est asserté (§ 1.6).

**🔵 Recommandation : (a).** Trois raisons, dans l'ordre de poids.
**(i)** Le mode de défaillance mesuré est **humain** : quelqu'un lit la **dernière ligne** et en
tire une conclusion trop large. `quality.sh` fait **littéralement cela** — il ne connaît que le
code de sortie et en fabrique une phrase (§ 1.4). Une ligne comptée rend cette sur-lecture
**impossible** : on ne peut pas conclure « les deux endpoints servent » d'une ligne qui écrit
« 1 sert, 1 atteint sans rien servir ».
**(ii)** L'information **existe déjà** — elle est imprimée par `composerVerdict` sur les lignes
par endpoint. (a) ne la fabrique pas : elle la **remonte au résumé**. Le coût est d'un champ
dérivé, pas d'une mesure nouvelle.
**(iii)** Ce script existe **exactement** pour la classe de défaut « un endpoint qui répond en
masque un autre » (L45, § 1.4). Un résumé qui **tait** qu'un endpoint n'a rien servi est, en
petit, la même cécité.

**Réserve honnête, à peser** : **(b) est défendable et je ne la traite pas de haut.** Elle est
irréprochable en vérité, coûte le dixième, et l'argument « on perd de l'information » est
**partiellement faux** — le détail par endpoint est **déjà à l'écran** juste au-dessus. Si le
décideur veut le lot le plus petit possible, **(b) est le bon choix** ; il faut alors accepter
que la ligne de `quality.sh` (AR-4) devienne, elle aussi, purement négative.

### AR-2 — faut-il une notion NOMMÉE dans le code ?

*(Sans objet si AR-1 = (b) ou (c) : dans ce cas la ligne ne consomme aucune donnée nouvelle, et
la réponse est **non**.)*

- **(a) Ajouter au retour de `composerVerdict` deux listes dérivées** — les endpoints qui ont
  **servi** une version lisible et ceux qui ont été **atteints sans rien servir** —, **sans
  toucher** à `mesuresReussies`.
- **(b) Calculer la partition en ligne dans le script**, hors du module.
  *Contre* : remet du **calcul** dans le fichier top-level que le lot précédent a précisément vidé
  de son calcul, et le soustrait aux unitaires (seul le sous-processus le verrait).
- **(c) Renommer `mesuresReussies`** en quelque chose de plus juste.
  *Contre* : **elle est déjà juste** pour ce qu'elle sert — elle commande le code 3, qui parle de
  **joignabilité** (§ 1.3). La renommer, c'est renommer une notion correcte pour la beauté du
  terme : un coût sans mesure, et le piège inverse que la mission signale.

**🔵 Recommandation : (a), et rien de plus.** La distinction se justifie parce qu'elle est
**load-bearing** : « atteint » et « a servi » sont **deux populations différentes**, et c'est leur
confusion — pas leur nom — qui a produit le défaut. Le test décisif est simple : *la ligne de
sortie a-t-elle besoin d'une donnée que la fonction ne rend pas ?* **Oui.** Ce n'est donc pas un
renommage esthétique, c'est un **calcul manquant**. Et il loge dans la fonction pure parce que
c'est **le seul endroit où le verdict se décide** (acquis CA-5 du lot précédent).
⚠️ **Borne dure** : **deux champs dérivés, zéro renommage, zéro changement de signature d'appel.**

### AR-3 — qui met en forme la ligne ?

- **(a) Le script formate, le module fournit les données.** La garde est le **sous-processus**,
  qui assert le **texte de stdout**.
- **(b) Le module expose une fonction de résumé** (`resumerSucces(...)`) et le script l'imprime.
  *Pour* : la phrase devient **unitairement** testable, en plus du sous-processus.
  *Contre* : élargit l'extraction que le lot précédent avait **bornée** (« le script conserve ses
  messages à l'octet, ses trois `process.exit` »).

**🔵 Recommandation : (a).** Le lot précédent a tranché que **les messages restent dans le
script** ; la seule raison d'y revenir serait « sinon la phrase n'est pas gardée », or **elle
l'est** : le sous-processus lit `stdout` (§ 1.6). Deux niveaux de garde pour une phrase, quand un
suffit et qu'il est déjà là, est de la sur-ingénierie.

### AR-4 — `scripts/quality.sh:70` (§ 1.4)

- **(a) Réécrire la ligne pour qu'elle n'affirme rien au-delà de ce que le code de sortie porte** —
  par exemple : `canaux en ligne : aucun ecart. Detail par endpoint ci-dessus.`
- **(b) Successeur inscrit, non traité.**

**🔵 Recommandation : (a).** Ce n'est **pas** « en passant » : c'est **le même défaut, sur la même
phrase, dans le même souffle**, et il est nommé, mesuré et cadré ici. Le laisser filer
reproduirait exactement la maladie que la série soigne. Coût : **une ligne**, fichier **non
convergent**, ni registre ni cliquet touchés (§ 1.5).
⚠️ **Et il y a une raison de plus** : `quality.sh` ne dispose **que** du code de sortie, donc quel
que soit AR-1, sa ligne ne peut être que **négative**. Elle ne doit **jamais** re-fabriquer une
affirmation que le script, lui, a les moyens de nuancer.

### AR-5 — le nit du backlog frère (§ 1.7)

- **(a) Le corriger, strictement borné** : cocher l'entrée `FACE-EN-LIGNE-DES-CANAUX-NON-EXERCEE`
  (livrée, gatée, fusionnée) et rectifier le chemin de fichier qu'elle cite. **Rien d'autre.**
- **(b) Ne pas y toucher.**

**🔵 Recommandation : (a) bornée.** Le lot précédent avait écrit la règle lui-même : « *si
l'exécution touche cette entrée pour une autre raison, elle la corrige au passage — sinon, non* ».
Ce lot **touche les deux `CLAUDE.md`** (CA-8, obligatoire). La condition est remplie. Un backlog
qui affiche comme dû un lot livré la veille est une **fausse dette** — et ce corpus a déjà payé
deux FAIL sur l'exactitude des backlogs.

---

## 5. Périmètre

### Inclus

- **La ligne de succès** de `scripts/verifier-canaux-en-ligne.mjs:134`, reformulée *(AR-1)*.
- *(Selon AR-2)* **deux champs dérivés** dans `composerVerdict` (`scripts/lib/canaux-en-ligne.mjs`),
  sans renommage ni changement de signature.
- **La garde de cette ligne** dans `scripts/__tests__/canaux-en-ligne.test.mjs` : le cas
  `404 + concordant`, le cas `injoignable + concordant`, et un **témoin positif** `tous servent`.
- *(Selon AR-4)* la rectification de `scripts/quality.sh:70`.
- La **convergence complète** : les trois fichiers restent **byte-identiques**, empreintes
  régénérées, **cliquet inchangé à 26** (§ 1.5), les deux faces rejouées **des deux côtés**.
- **L'inscription au backlog des DEUX dépôts** de tout successeur nommé, et l'entrée de ce lot
  lui-même. *(Voir § 9, CA-8 : **l'exécution DOIT toucher `CLAUDE.md`**.)*
- *(Selon AR-5)* le nit borné du backlog frère.

### Exclu — explicitement, et rien de ceci ne se fait « en passant »

- **Le classement `classer()`** — il est **juste** (§ 1.2). Aucune branche n'est touchée. Diff
  attendu sur cette fonction : **vide**.
- **La partition `echec2xx` (non-2XX / 2XX-inutilisable)** livrée le 2026-09-05, et ses deux
  tests d'épinglage : **intacts**.
- **Le non-tranchement du cache CDN** (`PERIME OU EN PROPAGATION` + « fenetre de propagation NON
  MESUREE ») et son épinglage bidirectionnel : **intacts, dans les deux moitiés de la formule**.
- **Le successeur `ENDPOINT-PERIME-FAIT-AUTORITE`** : mesurer la fenêtre de propagation exige du
  réseau et du temps réel — **hors lot, reste dû**.
- **Les codes de sortie** `0` / `1` / `3` et leurs conditions : **inchangés**. Le préfixe
  `OK (0)` est **conservé** (§ 1.6).
- **Les messages d'écart** (`:137-138`) et **les deux messages `nonMesure`** (`:100-107`) :
  **inchangés à l'octet**. Ils portent des rectifications datées de L43/L45.
- **La MESURE elle-même** : nombre d'endpoints, ordre, `timeoutMs = 8000`, caractère séquentiel de
  la boucle, anonymat. **Non touchés.**
- **La forme top-level** du script : pas de `main()`, pas de garde `import.meta.url`.
- **Remettre la face en ligne dans le gate** : interdit. `quality.sh` step [8/8] reste **hors
  gate**, avec ses trois codes ; seule sa **ligne de compte rendu** bouge, et seulement si
  AR-4 = (a).
- `fixtures/canaux-publication.json`, `scripts/lib/canaux-publication.mjs`,
  `src-tauri/tauri.conf.json` : **hors sujet, non touchés**.
- `CONVERGENCE-RELEASE-YML-ALIGNEMENT` (L44), le job `latest:`, CA-5/CA-6/CA-10 de L43/L44.
- **Aucun acte de release** : ni tag, ni release, ni push distant, ni exécution réelle de
  `npm run canaux:en-ligne` **dans le gate**.
- **Aucune dépendance ajoutée** : zéro, comme L33, L41 et les deux lots précédents.

---

## 6. Étapes d'implémentation

**Ordre imposé par une dépendance, pas par le confort.**

1. **Relever l'état de départ** : `sha256` des quatre fichiers en jeu **dans les deux dépôts** ;
   compte d'entrées du registre et valeur du cliquet (**26** attendu) ; `npm run test` vert des
   deux côtés. Sans point de départ, aucune révocation n'est prouvable.
2. *(Si AR-2 = (a))* **ajouter les deux champs dérivés** à `composerVerdict`, avec leur
   justification écrite dans la docstring : « **atteint ≠ a servi** — `mesuresReussies` commande
   le code 3 (joignabilité) et ne dit rien sur ce qui a été servi ». **Ne pas** toucher
   `mesuresReussies`, **ne pas** toucher `classer`.
3. **Unitaires des deux champs**, sur entrées **fabriquées** : un endpoint qui sert + un `404` + un
   injoignable → chaque endpoint tombe dans **une seule** population, et les trois populations
   **partitionnent** l'ensemble (assertion sur la somme des longueurs).
4. **Reformuler la ligne** `:134` *(AR-1)*, préfixe `OK (0)` **conservé**. Les clauses ne
   s'impriment que si leur population est **non vide** — une ligne qui mentionnerait toujours tout
   serait un témoin vide en puissance (§ 9, verrou de CA-1).
5. **Garde de la ligne**, dans le fichier de test **existant** : trois lancements en
   sous-processus — `404 + concordant`, `injoignable + concordant`, `tous concordants` — avec
   assertions **positives ET négatives**, et **croisées** entre les deux premiers cas.
6. *(Si AR-4 = (a))* rectifier `scripts/quality.sh:70`. **Une ligne**, vérifiée au `git diff` du
   fichier.
7. **Contrefactuels**, un par garde, chacun **révoqué avec preuve au `sha256`** : restaurer
   l'ancienne phrase ; rendre les clauses inconditionnelles ; fusionner les deux populations en
   une seule ; renvoyer des listes vides depuis `composerVerdict`. Chacun doit faire rougir **le
   test attendu, nommément**.
8. **Convergence** : reporter **tout** dans `/Users/sjupin/work/iakaFrameGUI`, `diff` octet à
   octet des trois fichiers, régénérer les empreintes avec la commande en tête du registre,
   **laisser le cliquet à 26** et **écrire pourquoi** dans le cartouche daté (aucun fichier neuf).
   ⚠️ **Le travail vit sur une BRANCHE des deux côtés** — correction d'asymétrie acquise au lot
   précédent.
9. **Rejouer** : `npm run test` **et** `npm run test:convergence` dans les **deux** dépôts, puis
   `bash scripts/quality.sh` ici. Rejouer `npm run test` **réseau coupé** (CA-7).
10. **Inscrire aux backlogs des DEUX dépôts** : l'entrée de ce lot, tout successeur nommé en
    chemin, et l'option non retenue d'AR-1/AR-4 si le décideur a tranché autrement que la reco.
    *(Selon AR-5)* le nit borné du frère.

---

## 7. Fichiers concernés

- `scripts/verifier-canaux-en-ligne.mjs` — **convergent, inscrit** (`fixtures/convergence.sha256:57`)
  — **la ligne 134** *(AR-1)* ; tout le reste **inchangé à l'octet**.
- `scripts/lib/canaux-en-ligne.mjs` — **convergent, inscrit** (`:89`) — deux champs dérivés dans
  `composerVerdict` *(si AR-2 = (a))* ; `classer` et `compareSemver` **non touchés**.
- `scripts/__tests__/canaux-en-ligne.test.mjs` — **convergent, inscrit** (`:90`) — la garde de la
  ligne (§ 6 étape 5) ; les cas existants **conservés**.
- `fixtures/convergence.sha256` — **empreintes régénérées** ; **aucune ligne nouvelle**.
- `scripts/__tests__/forge-host-parity.test.mjs` — **cliquet INCHANGÉ à 26** ; touché **seulement**
  si le cartouche daté est complété d'une note expliquant pourquoi il ne monte pas.
- `scripts/quality.sh` — **NON convergent, Cockpit seul, absent chez le frère** — ligne 70
  *(si AR-4 = (a))*.
- `CLAUDE.md` — entrée du lot + successeurs. **L'exécution DOIT y toucher** (§ 9, CA-8).
- **Et les jumeaux de chacun** dans `/Users/sjupin/work/iakaFrameGUI` (y compris son `CLAUDE.md`).

---

## 8. Risques

- **R1 — la ligne comptée cite la version et des hôtes, donc elle DIVERGE par dépôt.** Un test qui
  l'assert en dur cesserait d'être convergent. *Mitigation* : tout dériver de `package.json` et de
  `tauri.conf.json`, comme le fichier de test le fait **déjà** (`:229-230`) ; asserter des
  **motifs** et des hôtes **dérivés**, jamais un littéral.
- **R2 — le témoin vide, payé SEPT fois par ce dépôt** (L42-F1, L37-CA6, FAIL de L46, verrou de
  L47, verrou d'horloge de L48, compteur de « Gardes de la vitrine », et le test `:346` de § 1.6
  qui n'assert que le code). Une assertion « la sortie ne contient pas *chaque endpoint* » serait
  satisfaite par **n'importe quelle** reformulation, y compris une pire.
  *Mitigation* : chaque CA porte une assertion **positive** sur le texte attendu, **plus** un
  **témoin de contraste** (cas « tous servent ») qui doit **NE PAS** porter la mention — verrou
  conservé dans le dépôt.
- **R3 — élargir en silence.** La tentation de « pendant qu'on y est » sur `classer`, les codes ou
  les timeouts. *Mitigation* : § 5, et un `git diff` de `classer` **attendu vide**.
- **R4 — dérive de convergence.** Toucher un fichier inscrit d'un seul côté. *Mitigation* :
  rejouer **les deux faces des deux côtés** (étape 9), pas seulement ici.
- **R5 — faire monter le cliquet par réflexe.** Les deux derniers lots l'ont monté ; celui-ci ne
  doit **pas** (§ 1.5). Un cliquet gonflé sans fichier couvert est un **faux plancher**.
  *Mitigation* : CA-6, et la note écrite dans le cartouche.
- **R6 — casser le contrat `OK (0)`.** `:305` assert ce préfixe. *Mitigation* : le conserver ;
  le test existant le prouvera.

---

## 9. Critères d'acceptation

Chacun avec **Vérif**, **Contrefactuel** et **Verrou**. Un CA sans contrefactuel rejoué n'est pas
satisfait.

- [ ] **CA-1 — la ligne de succès n'affirme plus rien sur un endpoint qui n'a rien servi.**
      **Vérif** : sous-processus `404 + concordant` → **code 0** (inchangé) **et** la sortie
      **nomme** l'endpoint qui n'a rien servi *(AR-1 = a)*, ou **n'affirme plus rien de global**
      *(AR-1 = b)*. Assertion **positive** sur le texte attendu **et négative** sur l'ancienne
      formule.
      **Contrefactuel** : restaurer la phrase d'origine → **ce test rougit nommément**.
      **Verrou, conservé dans le dépôt** : un **témoin de contraste** « **tous** les endpoints
      servent et concordent » qui doit **NE PAS** contenir la mention introduite. Sans lui, une
      ligne qui mentionnerait *toujours* la clause satisferait le test — le témoin vide, et le
      plus facile à produire ici (§ 1.6 : le test existant est déjà dans ce cas).

- [ ] **CA-2 — « atteint sans rien servir » et « injoignable » restent DEUX états distincts.**
      **Vérif** : deux sous-processus — `404 + concordant` et `injoignable + concordant` — tous
      deux en **code 0**, chacun nommant son hôte **avec son motif propre**.
      **Contrefactuel** : fusionner les deux populations dans le résumé → **l'un des deux**
      rougit.
      **Verrou** : assertions **croisées** — la sortie du cas `404` ne doit **pas** porter le motif
      d'injoignabilité, et réciproquement. C'est la confusion **inverse** de celle qui a produit le
      défaut, et rien ne l'interdirait sinon.

- [ ] **CA-3 — la donnée vit dans la fonction PURE, et le script la BRANCHE** *(si AR-2 = (a))*.
      **Vérif** : unitaires de `composerVerdict` sur entrées **fabriquées** — un servant, un `404`,
      un injoignable ; chaque endpoint dans **une seule** population ; **somme des longueurs =
      nombre d'endpoints** (la partition est **totale**, pas seulement disjointe).
      **Contrefactuel** : faire rendre des listes vides par `composerVerdict` → **CA-1 rougit**
      (la jonction est donc réellement exercée). Si **aucun** test de sous-processus ne rougit, la
      jonction n'est **pas** couverte et il faut **l'écrire tel quel**, comme L45 l'a fait pour la
      sienne.
      **Verrou** : ce CA existe parce que les unitaires **seuls** ne prouvent pas le branchement —
      leçon L42-F1 et non-couverture déclarée de L45.

- [ ] **CA-4 — `scripts/quality.sh` n'affirme plus rien au-delà du code de sortie**
      *(si AR-4 = (a))*.
      **Vérif** : le mot `INTERROGE` (et toute variante affirmant un service rendu) **absent** de
      la ligne du cas `0` ; `git diff scripts/quality.sh` = **une seule ligne**.
      **Contrefactuel** : restaurer la ligne d'avant → le grep du critère la retrouve.
      **Verrou** : les **trois** codes (`0`, `3`, `*`) et le caractère **hors gate** du step [8/8]
      sont vérifiés **inchangés** — ce fichier ne doit pas devenir bloquant par la bande.

- [ ] **CA-5 — AUCUNE régression de comportement.**
      **Vérif** : `classer` et `compareSemver` **inchangés au `git diff`** ; les **trois** codes de
      sortie exercés comme avant ; les messages d'écart et les deux `nonMesure` **inchangés à
      l'octet** ; les épinglages du lot précédent (partition `echec2xx` dans les **deux** sens,
      non-tranchement du cache dans les **deux moitiés** de la formule) **toujours verts** ;
      `toContain("OK (0)")` toujours vert.
      **Contrefactuel** : les mutations de CA-1..CA-3 ne doivent faire rougir **que** les tests
      visés — si un épinglage du lot précédent rougit, l'extraction a débordé (**R3**).
      **Verrou** : les comptes de tests sont **remesurés avant/après**, jamais recopiés d'un
      rapport — défaut D3 de L34.

- [ ] **CA-6 — la convergence est tenue, et le cliquet NE MONTE PAS.**
      **Vérif** : les trois fichiers **byte-identiques** entre les deux dépôts (`diff` octet à
      octet) ; empreintes régénérées ; **cliquet à 26, inchangé**, avec une **note datée**
      expliquant qu'aucun fichier neuf n'est créé ; `npm run test` **et**
      `npm run test:convergence` verts **dans les deux dépôts**.
      **Contrefactuel** : muter un octet d'un fichier inscrit **d'un seul côté** → la face locale
      **nomme** le fichier ; révocation prouvée au `sha256`.
      **Verrou** : le cliquet est posé à la valeur **mesurée**, jamais au-dessus **ni** en dessous.
      Le monter « parce que le lot précédent l'a monté » fabriquerait un plancher que **rien** ne
      couvre — le symétrique de l'erreur de L44.

- [ ] **CA-7 — le gate reste hors ligne.** `npm run test` vert **réseau coupé**, dans les deux
      dépôts.
      **Vérif** : rejeu **effectif**, pas une déduction de lecture ; blocage **au niveau des
      sockets ET du DNS, sous-processus compris**, comme le gate du lot précédent l'a fait.
      **Contrefactuel** : retirer `--import <stub>` du lancement → le test devient dépendant du
      réseau, ce qui prouve que la neutralisation est **agissante**.
      **Verrou** : **zéro** connexion sortante ; le compteur d'appels du stub reste exigé `> 0`.

- [ ] **CA-8 — TOUT successeur nommé par ce lot est INSCRIT au backlog des DEUX dépôts, et
      l'entrée de ce lot y figure.**
      **⚠️ L'EXÉCUTION DOIT TOUCHER `CLAUDE.md` DANS LES DEUX DÉPÔTS. Ce n'est pas une permission,
      c'est une OBLIGATION du lot.** Aucun ordre de mission, aucune consigne de coordination ne
      peut l'en dispenser : si une consigne reçue l'interdit, **elle contredit ce critère** et
      l'exécution doit **s'arrêter et remonter** au lieu de choisir.
      Au minimum : l'entrée de **ce lot** ; l'option non retenue d'**AR-1** et d'**AR-4** si le
      décideur tranche autrement que la reco ; **tout** défaut découvert en chemin.
      **Vérif** : lecture des deux `CLAUDE.md` **après** le lot.
      **Contrefactuel** : sans objet — c'est un critère d'existence, vérifié par lecture.
      **Verrou** : ce CA est écrit parce que **les deux derniers gates ont rendu FAIL exactement
      là**, et que le second FAIL était **causé par une consigne de coordination qui contredisait
      le critère**. Un lot livré avec un successeur non inscrit est un **refus**, quel que soit
      l'état du reste.

---

## 10. Ce que ce lot PROUVERA — et ce qu'il ne prouvera PAS

> **À recopier dans le fichier de garde, pas seulement ici.** Règle du dépôt : une limite se
> déclare **là où elle vit**. Le cartouche de limite existant de
> `scripts/__tests__/canaux-en-ligne.test.mjs` est **complété**, jamais réécrit.

**Ce qu'il prouvera.** Que la **ligne de résumé** imprimée par le script est **conditionnée par ce
qui a réellement été servi**, et non par le seul fait qu'un endpoint ait répondu ; que « atteint
sans rien servir » et « injoignable » restent **distincts** à l'écran ; que la partition des
endpoints est **totale** ; et que la donnée qui porte cette ligne vient de la fonction pure,
**réellement branchée**.

**Ce qu'il ne prouvera pas, et qu'il ne faut pas laisser croire.**

1. **Que la ligne soit BIEN LUE.** C'est une phrase destinée à un humain. Aucun test ne mesure sa
   compréhension — le défaut d'origine était **une sur-lecture**, pas une erreur de calcul. Ce lot
   rend la sur-lecture **plus difficile** ; il ne la rend pas impossible.
2. **Que le client se comporte comme on le suppose.** La raison pour laquelle un `404` **n'est
   pas** un écart repose sur la doc de l'updater et sur la lecture de source faite par L45 —
   **pas** sur une mesure faite ici, avec ce plugin, sur cette version. **Inchangé par ce lot**,
   et rappelé parce que c'est ce qui rend le code `0` correct.
3. **Que les endpoints servent la bonne version.** Seule l'exécution **réelle**
   (`npm run canaux:en-ligne`, `quality.sh` step [8/8], hors gate, réseau requis) y répond.
   **Inchangée par ce lot.**
4. **Que le stub ait la forme d'une réponse réelle.** Limite **déjà déclarée** dans le fichier de
   garde, **inchangée**.

**Autrement dit** : le dispositif garde **trois** niveaux et non deux, et ce lot n'en ajoute
aucun — il rend le **compte rendu** du niveau intermédiaire fidèle à ce qu'il mesure.

---

## 11. Estimation

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** (spec fermée) | **0,5 j-homme** — champs dérivés + unitaires ≈ 0,15 j · reformulation + garde à trois cas ≈ 0,15 j · convergence, contrefactuels et rejeux des deux côtés ≈ 0,2 j · AR-1 = (b) **−0,15 j** · AR-4 = (a) **+0,02 j** · AR-5 = (a) **+0,03 j** |
| **Complexité** | **Très faible.** Aucun algorithme, aucune dépendance, **aucun fichier neuf**, et le harnais de sous-processus — stub, mode `http-404`, compteur, dérivation des endpoints — **existe déjà et couvre exactement ce cas** (§ 1.6). C'est le lot le plus balisé de la série. |
| **Risque** | **Faible — de discipline, pas de technique.** Le coût réel est dans les **deux dépôts**, le registre, le cliquet **qui ne doit PAS monter**, et **quatre contrefactuels à jouer puis révoquer avec preuve**. C'est là que L42, L44 et L45 ont dérapé, jamais dans le code. |

**Inconnues susceptibles de faire glisser l'estimation**

1. **AR-1 = (a)** touche `composerVerdict` **et** la ligne : si la partition demandait de remonter
   une donnée à travers plus de branches que les deux relevées, compter davantage. **S'arrêter et
   remonter** plutôt qu'élargir en silence.
2. **L'état du dépôt frère** au moment du lot — branche courante, arbre propre. Vérifié
   aujourd'hui sur les seuls fichiers cités (ligne 134 identique, registre à 26,
   `scripts/quality.sh` absent) ; pas au-delà.
3. **Le flake signalé, non reproduit** au gate du lot précédent (≈23 exécutions par fichier, zéro
   rouge) : s'il se manifestait sur les fichiers de ce lot, le diagnostic n'est **pas** budgété
   ici.

### Est-ce que ce lot vaut d'être fait ? — réponse franche

**Oui, et sans réserve — mais c'est le plus petit de la série, et il faut le dire.**

Ce lot ne corrige **aucun** comportement : le script fait déjà la bonne chose, il la **raconte**
mal. Un lecteur pressé pourrait juger que « corriger une phrase » ne justifie pas un cycle
complet avec deux dépôts, un registre et quatre contrefactuels.

**Trois raisons de le faire quand même**, dans l'ordre de poids.
**(i)** C'est **la troisième occurrence de la même famille de défaut** (F-2, la ligne de
`quality.sh` du lot précédent, celle-ci). Cette famille se répare vite et se **répète** ; ce qui
la stoppe n'est pas la correction mais la **garde** — et cette phrase n'en a **aucune** aujourd'hui.
**(ii)** Le coût marginal est **exceptionnellement bas** : le cas exact est déjà outillé et
**déjà écrit**, il ne lui manque qu'une assertion (§ 1.6).
**(iii)** Le laisser ouvert coûterait plus cher que le faire : il est **inscrit aux deux
backlogs**, donc il sera relu à chaque revue, et la série montre qu'un successeur nommé qui
attend devient un lot à lui seul (« six jours sans traitement », F-2/F-3).

**Ce que je ne recommande PAS** : le fondre dans un lot plus gros pour « rentabiliser » le cycle.
C'est exactement ce que le § 5 du lot précédent a refusé, et il a eu raison.

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à **rappeler et
confronter au temps réel** à la clôture du lot.
