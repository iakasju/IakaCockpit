# RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-COCKPIT + convergence (jumelle déposée)

> **Déposée par 🔷 Odin depuis `iakaInstall` (canal d'écriture d'un agent d'iakaInstall borné à ce dépôt, CA-R11) — copie des Annexes A et C de `specs/instructions/convergence-trois-freres.md` (iakaInstall), lot `CONVERGENCE-TROIS-FRERES`. Jouée le 2026-09-08 par ⚒️ Gimli (posture portefeuille), branche `feat/convergence-trois-freres`, REMISE AU GATE 🏹 Legolas, non auto-validée.**
>
> Rappel de cadrage (§ 0 à § 3 du corps de l'instruction, non recopiés ici, lire la source) :
> verdicts AR-C1(a), AR-C2(a), AR-C3(b), AR-C4(a), AR-C5(a), AR-C6(a). Lot 2 (`iakaInstall` lui-même,
> registre à trois entrées) est un successeur SÉPARÉ, hors périmètre de ce dépôt.

---


## ANNEXE A — `RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-COCKPIT`

> **Instruction rédigée ici, à déposer par 🔷 Odin dans `IakaCockpit/specs/instructions/`.**
> Un agent d'`iakaInstall` ne peut pas écrire dans le dépôt d'une sœur (CA-R11) : ce texte est
> **le mandat**, pas le fichier final.
> ⚠️ **Jumelle de l'annexe B : UN SEUL COMMIT LOGIQUE dans les deux dépôts** (M-C7).

### A.1 Problème

`IakaCockpit/.github/workflows/release.yml:105` porte **`releaseDraft: false`** : chaque job de la
matrice publie ce qu'il produit **au fur et à mesure**. Une matrice partiellement rouge laisse donc
une release **publique et incomplète**, et `latest` (`:185-190`, `needs: build`, `if: always()`) la
**désigne**. De plus, `tagName`/`releaseName` (`:103-104`) laissent **chaque job** chercher ou créer
la release : la course F8 (`tauri-apps/tauri-action#914`) est **ouverte**.

Ce n'est pas une hypothèse : `iakaInstall` a vécu le cas (tag `v0.1.0`, 7 assets sur 9, ni `.msi` ni
`.exe`, **publiée**), l'a corrigé, et son **fail-safe a été prouvé en run réel** (`34026373514`).

### A.2 Décision (sous réserve d'AR-C6)

Transposer **la convention entière** d'`iakaInstall` : brouillon créé **une seule fois** dans
`prepare`, `releaseId` passé à la matrice, `releaseDraft: true`, job `publier` `needs: [build]`
**strict et sans `if:`**, `latest` en `needs: publier` avec **`if: always()` conservé**, plus **les
deux gardes** — statique **et** d'exécution.

### A.3 Périmètre

**Inclus** : `.github/workflows/release.yml` (les 4 jobs) · `scripts/lib/release-publication.mjs` +
`scripts/__tests__/release-publication.test.mjs` (garde statique, **limite déclarée dans le
fichier**) · `scripts/__tests__/release-publier-shell.test.mjs` (**jambe d'exécution** : extraction
par marqueur, `bash`, faux `gh` à l'arité du vrai, **vrai `jq`**, SKIP explicite si `jq` absent,
zéro réseau, zéro jeton) · **refixation de `fixtures/bloc-latest.sha256`** · régénération de
`fixtures/convergence.sha256` · `CLAUDE.md` (backlog + preuve).
**Exclu** : **aligner les deux `release.yml`** (→ `CONVERGENCE-RELEASE-YML-ALIGNEMENT`) · toucher à
`prerelease` · toucher à `includeUpdaterJson` · **tout acte de release**.

### A.4 Étapes

0. **Mesurer** : lire `release.yml` au SHA épinglé de `tauri-action` et **confirmer** que
   `releaseId` court-circuite la recherche/création (`src/index.ts:178`) et attache par id
   (`:211`) — **relire à la source, ne pas croire ce cadrage** ; empreinte du bloc `latest:` avant
   modification ; état de départ (`quality.sh`).
1. `prepare` : créer le brouillon par `gh api "repos/$DEPOT/releases" -X POST … -F draft=true`,
   sortir `release_id`.
2. `build` : remplacer `tagName`/`releaseName` par `releaseId`, poser `releaseDraft: true`.
   ⚠️ **Ne pas toucher** aux dépendances Linux (l. 72) ni au commentaire minisign (l. 96-99).
3. `publier` : `needs: [build]` **strict**, adressage **par id, jamais par tag**, zéro brouillon =
   échec nommé, **deux** brouillons = échec nommé (jamais de choix à l'aveugle).
   ⚠️ **`gh api` n'a PAS d'option `--arg`** : `--paginate` rend le JSON brut, **seul `jq`** reçoit
   `--arg`. C'est le défaut réel du run `34026373514`.
4. `latest` : `needs: publier`, **`if: always()` conservé** (il doit tourner quand `publier` est
   *skippé*).
5. Gardes : statique **et** d'exécution, avec un **rouge préalable capturé** avant le correctif.
6. **Refixer `fixtures/bloc-latest.sha256`** en **datant** le motif ; régénérer
   `fixtures/convergence.sha256` ; **au même commit logique que l'annexe B**.

### A.5 Critères d'acceptation

- [ ] **CA-A1** — `releaseDraft: true` et `releaseId` posés ; plus aucun `tagName`/`releaseName` sous
      le `with:`. *Contrefactuel* : remettre `releaseDraft: false` sur une **copie en mémoire** ⇒ la
      garde statique **rougit en nommant la valeur**.
- [ ] **CA-A2** — `publier` en `needs: [build]` **sans `if:`**. *Contrefactuel* : ajouter un `if:` ⇒
      rouge nommé.
- [ ] **CA-A3** — `latest` en `needs: publier` **avec** `if: always()`. *Contrefactuel* : retirer
      `always()` ⇒ rouge nommé.
- [ ] **CA-A4** — **aucun** `gh api … --jq --arg` dans le fichier. *Contrefactuel* : réintroduire le
      motif sur une copie ⇒ détecté.
- [ ] **CA-A5** — la **jambe d'exécution** exécute réellement le script du job `publier` (faux `gh`
      à l'arité du vrai, vrai `jq`) et **rougissait** sur le texte bogué. *Vérif* : rouge préalable
      capturé, puis vert.
- [ ] **CA-A6** — `fixtures/bloc-latest.sha256` refixé, **motif daté**, ancien texte **conservé**.
- [ ] **CA-A7** — `fixtures/convergence.sha256` régénéré et **byte-identique avec `iakaFrameGUI`**.
      *Vérif* : `diff` vide. **Ce critère échoue si l'annexe B n'est pas jouée au même commit.**
- [ ] **CA-A8 — NON COUVERT, DÉCLARÉ** : la preuve de bout en bout est **le prochain tag** (run 4/4
      vert ⇒ `isDraft: false`, assets complets, `latest` = ce tag ; run sabotée ⇒ brouillon conservé,
      `latest` **inchangé**, `publier` *skipped*). **Acte du décideur.**
- [ ] **CA-A9** — `bash scripts/quality.sh` **exit 0**, chiffres cités ligne par ligne.

### A.6 Successeurs à inscrire là-bas

`PUBLICATION-VERIFIE-LES-ASSETS` (un build **vert et vide** passerait la règle) ;
`CONVERGENCE-RELEASE-YML-ALIGNEMENT` (rappelé, non traité).

---

## ANNEXE B — `RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-GUI`

> **Même mandat que l'annexe A, dans `iakaFrameGUI`.** Les deux `release.yml` portent, au 2026-09-08,
> **les mêmes numéros de ligne** pour les points en cause (`:103-105`, `:127`, `:185-190`) : le geste
> est **identique**, le fichier est **différent**.

**Ce qui change par rapport à l'annexe A, et rien d'autre :**

1. **`scripts/quality.sh` n'existe pas dans ce dépôt** — la chaîne qualité s'y rend en **lignes
   séparées** : `npm run lint:all`, `npm run test:all`, **`npm run test:rust` sur une ligne
   distincte et obligatoire** (arbitrage écrit dans le `package.json` lui-même ; une formule
   d'ensemble vaut **FAIL**).
2. Les **écarts connus** avec le Cockpit — dépendances Linux l. 72, commentaire minisign l. 96-99 —
   **ne sont pas corrigés en passant**.
3. Les critères deviennent **CA-B1..CA-B9**, mot pour mot ceux d'A.5, avec **CA-B7** miroir :
   `fixtures/convergence.sha256` byte-identique avec `IakaCockpit`.

⚠️ **A et B sont UN SEUL commit logique.** `fixtures/bloc-latest.sha256` est un fichier
**convergent** (`convergence.sha256:44`) : jouer A sans B fait diverger le registre et rougir la
face croisée des deux côtés. **Aucune des deux ne se fusionne seule.**

---


## ANNEXE C — LOT 1, la part CONVERGENCE des deux sœurs

> **À déposer par 🔷 Odin dans les deux dépôts** — un seul commit logique. **Précède le lot 2**
> (AR-C4).

### C.1 Ce qui est livré (sous réserve d'AR-C1, AR-C2, AR-C5)

1. **`fixtures/freres.json`** dans chaque sœur — **local**, hors registre, nommant **les deux
   autres** dépôts (`iakaInstall` **compris**, bien qu'absent : AR-C2(a) le rend inoffensif), avec
   chemin relatif attendu et **une raison par entrée**.
2. **`scripts/test-convergence.mjs`** réécrit, **byte-identique entre les deux sœurs** :
   - résolution **par `freres.json`**, plus aucune énumération de voisins ;
   - `IAKA_CONVERGENCE_HOME` **conservé et autoritaire** (exit 2 inchangé) ;
   - mesure **N-1** : chaque frère nommé et présent est comparé ;
   - **SKIP NOMMÉ** pour un frère nommé et absent (exit 0), la ligne de succès **énumérant** mesurés
     et sautés — **forme reprise de `verifier-canaux-en-ligne.mjs:134`**, jamais réinventée ;
   - comparaison sur l'**INTERSECTION des deux registres** (AR-C3(b)), avec le compte **hors
     comparaison** dit ;
   - le hors-couverture `:59-68` **retiré en le datant** — il est **fermé**, c'est le lot.
3. **Remontée de `rendreSecurite()`** (AR-C5(a)) : la fonction, la zone `securite`, les deux
   fonctions du **cliquet offline**, et la clé `absences_de_signature` dans le
   `fixtures/vitrine-locale.json` **local** de chaque sœur — avec **son** motif, **sa** date, **sa**
   condition de levée. Les 5 fichiers de vitrine redeviennent alors byte-identiques **avec
   `iakaInstall`** et deviennent inscriptibles au registre à trois.
4. **README des deux sœurs régénérés** (`vitrine -- --write`), `vitrine:check` **0**,
   `vitrine:en-ligne` **rejoué et son code cité** (un `3` n'est jamais un succès).
5. **`fixtures/convergence.sha256` régénéré** des deux côtés, cliquet **relevé si et seulement si**
   un fichier **neuf** est inscrit ; `CLAUDE.md` des deux sœurs mis à jour (§ Convergence : la règle
   à trois).

**⚠️ AJOUT DATÉ (2026-09-08, gate 🏹 Legolas FAIL sur `iakaInstall`,
`docs/qualite/gate-garde-face-en-ligne-vitrine.md`, `f97835a`) — un bloc à REMONTER, candidat pour
ce lot 1.** `scripts/__tests__/vitrine-en-ligne.test.mjs` (successeur `GARDE-FACE-EN-LIGNE-
VITRINE-INSTALL`) porte, chez `iakaInstall` seul, un bloc `describe("Contrefactuel — un SKIP
travesti en succès…")` (2 `it`) **absent des deux sœurs** — ajouté sur exigence explicite d'🟠
Aragorn, pas par le cadrage d'origine du F-3. Il verrouille que le code `3`/« NON MESURE » ne
puisse jamais se travestir en succès (`0` + `OK —`), avec un témoin de contraste anti-vide.
**Candidat à porter dans le `vitrine-en-ligne.test.mjs` des deux sœurs** dans ce lot 1, pour que
les trois dépôts restent alignés sur la même garde — **non tranché ici**, décision du décideur/du
cadrage qui jouera ce lot.

### C.2 Critères

- [ ] **CA-D1** — plus aucun `readdirSync` de voisin dans `test-convergence.mjs`.
      *Contrefactuel* : `freres.json` vidé ⇒ SKIP global nommé, **jamais** un repli deviné.
- [ ] **CA-D2** — un frère nommé absent ⇒ **SKIP nommé**, exit 0, ligne de succès honnête, **avec
      témoin de contraste** (verrou anti-témoin-vide).
- [ ] **CA-D3** — `IAKA_CONVERGENCE_HOME` **inchangé dans son comportement** : chemin sans registre
      ⇒ exit **2**, aucun repli. *Contrefactuel* : rétablir un repli ⇒ rouge nommé.
- [ ] **CA-D4** — les deux `test-convergence.mjs` et les deux `convergence.sha256` sont
      byte-identiques **entre sœurs**. *Vérif* : `diff` vide.
- [ ] **CA-D5** — `rendreSecurite` remonté : les 5 fichiers de vitrine sont byte-identiques **entre
      les trois dépôts**. *Vérif* : empreintes des trois côtés, citées.
- [ ] **CA-D6** — le **cliquet offline** rougit sur chaque sœur si son `release.yml` câble un `env:`
      `APPLE_*`/`WINDOWS_*` actif. *Contrefactuel* : injecter le câblage sur une **copie en
      mémoire** ⇒ rouge nommé ; révoquer, `sha256` inchangé.
- [ ] **CA-D7** — chaîne qualité verte des deux côtés, **une ligne par commande** (`quality.sh` côté
      Cockpit ; `lint:all` + `test:all` + **`test:rust`** côté GUI).

---

