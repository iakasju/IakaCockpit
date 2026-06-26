# Instruction L9 — Démo enrichie : vignettes thémées par team + projet démo dans Working + conversation préchargée

> **Cadrage (P1)** par Gandalf (CADRAGE). Issu d'un retour terrain de Stéphane en testant L8.
> Lue par Gimli (DEV) AVANT toute ligne de code. Instruction fermée et vérifiable.
> Réf. méthode : `methode-de-travail.md` (iakaframe). Archi : `CLAUDE.md` (D7 façade unique,
> CSP stricte), `specs/PROJET.md`.

---

## 0. Problème (avant la solution)

En testant L8, trois manques se révèlent à l'usage :

1. **La team est anonyme.** Le roster (L8) et le chat affichent des pastilles texte
   `[ROYAUME][Agent]`. Stéphane veut **incarner** la team : choisir un **thème graphique**
   (charte) puis une **team** (univers : lotr, avengers, starfleet…) et **voir les vignettes
   ordonnées par rôle** — pour « retrouver qui fait quoi » d'un coup d'œil, dans le roster ET
   dans le chat (avatar de l'agent qui parle / `@agent`). Le réservoir de vignettes existe
   déjà (iakagraph, conçu par Loki) : **on ne génère rien, on câble.**
2. **Le projet démo n'apparaît pas dans Working.** `useDemoSeed` ouvre une conversation et
   rafraîchit le portfolio, mais n'ajoute **jamais** `iaka-demo` au **set de Work**
   (`useWorkset`). Résultat : la tuile démo reste dans Portfolio et **Working est vide** au
   boot de démo — la chaîne L2→L8 n'est pas démontrable sans manip manuelle.
3. **La démo ne raconte pas la méthode.** Le chat démarre vide et la main courante (L4) ne
   contient que 5 docs génériques. On ne **voit** pas la mécanique iakaframe (délégation,
   rapport, restitution verbatim, canal *geste*). Stéphane veut une **conversation préchargée**
   qui illustre la chaîne de badges, **cohérente** entre le chat (L8) et les logs 3-canaux (L4).

**Périmètre fermé ici** : on traite les trois, en **réutilisation pure** de l'existant
(thème/charte L2, vignettes Loki, roster/chat/conversations L8, seed L7, main courante L4).
Pas de god-component, pas d'`invoke` hors façade, pas de génération d'images, **CSP intacte**.

---

## 1. Faits vérifiés (état de l'art + existant)

### 1.1 Réservoir de vignettes (iakagraph — Loki)
- `~/work/iakagraph/teams.json` : **11 teams** (`avengers`, `xmen`, `lotr`, `norse`,
  `dc-justice`, `defenders`, `harry-potter`, `autobots`, `olympians`, `rebels`, `starfleet`),
  chacune = **liste ordonnée de 8 entrées** `{slug, seed, desc}`. **L'ordre EST le mapping
  rôle→personnage** : index 0 = portefeuille, 1 = coordination, 2 = cadrage, 3 = dev,
  4 = qualité, 5 = production, 6 = design, 7 = doc (clé invariante,
  `~/work/iakagraph/specs/teams-casting.md` § « clé rôle → archétype »).
- Arbo des PNG (vérifiée) — **deux familles** sous `~/work/iakagraph/theme/<charte>/<variante>/vignettes/` :
  - **rôles à plat** (team historique norse/hybride) : `vignettes/<role>.png` avec
    `<role> ∈ {odin, aragorn, gandalf, gimli, legolas, helm, loki, nathalie}` (8 fichiers) ;
  - **par team** : `vignettes/<team>/<slug>.png` (8 slugs × 11 teams = 88 fichiers).
- Chartes/variantes présentes : `naonedge/{dark,light}`, `cartoon/std`,
  `grimoire/dark-fantasy`, `os/{android,macos,ubuntu,windows}`, `photoreal/modern`.
  Pour `naonedge/dark` : **96 PNG** (8 rôles à plat + 88 team). Total tous thèmes ≈ 952 PNG.
- Thème app par défaut = **`naonedge-dark`** (`src/main.tsx`, `useSettings.DEFAULT_THEME`,
  `tokens.css` n'a que `naonedge-dark` / `naonedge-light`). La charte app actuelle = **naonedge**.

### 1.2 CSP — point dur largement ADOUCI (fait vérifié)
- `src-tauri/tauri.conf.json` : `csp` = `… img-src 'self' asset: data: …`.
- → La CSP autorise **déjà** trois voies pour les images, **sans aucune modification** :
  `'self'` (assets bundlés par Vite), `data:` (base64 inliné), `asset:` (asset-protocol Tauri).
- L'asset-protocol Tauri 2 exige en plus `app.security.assetProtocol.enable=true` + un `scope`
  FS explicite (réf. doc Tauri v2 « Asset protocol scope ») — c'est-à-dire **ouvrir un accès
  disque** au dossier des images. Pour une **démo embarquée**, c'est une surface inutile.
  → **Décision (cf. §3.A)** : embarquer un **sous-ensemble** de PNG dans le **bundle front**
  (`src/assets/vignettes/…`, importés par Vite = servis en `'self'`). **Zéro changement CSP,
  zéro scope FS, 100 % offline.** L'asset-protocol reste l'option d'extension future (toutes
  chartes/teams sans gonfler le bundle) mais n'est **pas** dans ce lot.

### 1.3 Existant L8 / L7 / L4 à réutiliser (lecture faite)
- `src/mock/demoTeam.ts` : `DEMO_TEAM` = **5 membres** `{royaume, agent}` (PORTEFEUILLE/Odin,
  ACCUEIL/Aragorn, CADRAGE/Gandalf, DEV/Gimli, QUALITÉ/Legolas) + `teamBadge()`. C'est le
  modèle de données du roster (`Roster.tsx`) — extensible 5→8.
- `src/components/Roster.tsx` : présentationnel, mappe `members` → pastilles + statut
  attend/travaille. Point d'insertion de la **vignette**.
- `src/components/Chat.tsx` : bulles ; `<span class="bwho">{agent}</span>` en tête de bulle
  assistant. Point d'insertion de l'**avatar**.
- `src/hooks/useConversations.ts` : `Conversation.history: ChatTurn[]` (mémoire MVP) ;
  `openConversation(projectId, title, cwd, agent?)` crée une conv `history: []`. Pas de
  préchargement aujourd'hui. `DEFAULT_RESPONSIBLE = "Aragorn"`.
- `src/hooks/useWorkset.ts` : `add(projectId)` **déjà idempotent** (no-op si présent). Le bug
  B = `useDemoSeed` ne l'appelle pas.
- `src/hooks/useDemoSeed.ts` : reçoit `openConversation` + `refreshPortfolio`, **pas**
  `addToWorkset`. C'est là que se branche le fix B + le préchargement chat C.
- `src/App.tsx` : câble `useDemoSeed({...})` ; `workset.add` existe déjà (utilisé par
  `addProject`). Il suffit de passer `workset.add` à `useDemoSeed`.
- `src/hooks/useSettings.ts` : `theme` persisté (`CONFIG_KEYS.theme`), `setTheme`. Pas de notion
  de **team** ni de **charte** séparée aujourd'hui (le `theme` est une chaîne `naonedge-dark`).
- `src/views/SettingsView.tsx` : sélecteur de thème (point d'ajout du sélecteur **team**).
- `docker/init-couchdb.sh` : seed CouchDB, schéma `{ts,royaume,agent,conv_id,role,content,
  tokens,meta}`, `meta.canal:"geste"` déjà démontré (1 doc). 5 docs `conv_id:"demo-1"`.

---

## 2. Phasage (lot gros → 2 phases livrables indépendamment)

Le lot est découpé pour livrer de la valeur tôt et borner le risque. Chaque phase passe son
propre gate Legolas.

- **L9-P1 — Démo qui marche (B + C).** Faible risque, fort effet « la démo raconte la
  méthode ». `iaka-demo` apparaît dans Working ; chat préchargé + main courante enrichie,
  cohérents. **AUCUNE image.**
- **L9-P2 — Vignettes thémées par team (A).** Le gros morceau : modèle team, sélecteur charte+team,
  embarquement d'un sous-ensemble de PNG, rendu roster + chat, fallback pastille.

> **IN ce lot** : B, C, A (P1 + P2). **DIFFÉRÉ (tracé, hors lot)** : asset-protocol pour
> servir *toutes* les chartes/teams depuis le disque ; teams « robots » (autobots) si rendu
> avatar peu lisible ; sélection de team **par projet** (ce lot = global) ; persistance backend
> du workset ; vraie liaison statut roster ↔ flux temps réel (reste DEP-1).

---

## 3. Décisions arrêtées (fermées) + points À ARBITRER

### A. Stratégie de chargement des vignettes — **DÉCIDÉE**
- **Embarquement dans le bundle front.** Un sous-ensemble de PNG est **copié** depuis
  `~/work/iakagraph/theme/<charte>/<variante>/vignettes/` vers
  `src/assets/vignettes/<charte-app>/<team>/<slug>.png` du dépôt IakaCockpit, **commité**, et
  importé par Vite (servi en `'self'` → CSP intacte). **Aucune** modification de
  `tauri.conf.json`, **aucun** scope FS, **aucun** appel réseau.
- **Script de copie reproductible** : `scripts/sync-vignettes.sh` (bash, idempotent) qui copie
  **uniquement** le sous-ensemble MVP (cf. §3.C) depuis un `IAKAGRAPH_ROOT` paramétrable
  (défaut `~/work/iakagraph`). Le script **n'invente rien** : il lit `teams.json` pour l'ordre
  et copie `<team>/<slug>.png`. Documenté dans `CLAUDE.md`. (Les PNG sont commités → un dev sans
  iakagraph n'a pas besoin de relancer le script ; le script sert aux mises à jour.)
- **Manifest généré** : un `src/assets/vignettes/manifest.ts` (ou `.json` importé) liste, par
  `(charte, team)`, le mapping **rôle (0..7) → {slug, import-url}**. Source de vérité unique
  pour le résolveur (§4). Généré par le script (pas écrit à la main) pour rester aligné sur
  `teams.json`.
- **Fallback obligatoire** : si une vignette est absente du manifest (team non embarquée, slug
  manquant, rôle au-delà des 5 connus), le rendu **retombe sur la pastille texte
  `[ROYAUME][Agent]` actuelle**. **Jamais d'image cassée** (`onError` → pastille, et résolveur
  qui renvoie `null` → pastille).

### B. Modèle de sélection (charte + team) — **DÉCIDÉE (avec 1 arbitrage mineur)**
- **Niveau** : **global**, persisté en config (calque `theme`). La sélection **par projet** est
  **différée** (tracée). Raison : MVP, et la démo est globale.
- **Deux clés de config** (réutilise le mécanisme `useSettings`/`configSet`, non sensibles) :
  - `ui_charte` (ex. `naonedge`) — **dérivée du `theme` existant** par défaut (`naonedge-dark`
    → charte `naonedge`, variante `dark`). Pour le MVP on **NE crée PAS** de sélecteur de charte
    séparé : on **réutilise le `theme` app** (`naonedge-dark`/`naonedge-light`) comme charte.
    Une nouvelle clé `ui_charte` n'est introduite **que si** P2 embarque une charte ≠ naonedge
    (cf. §3.C). **Défaut** : la charte = celle du thème app courant.
  - `ui_team` (ex. `lotr`) — **NOUVELLE** clé. Sélecteur dans Réglages. **Défaut démo = `lotr`**
    (cohérent avec le casting historique iakaframe : Odin/Aragorn/Gandalf/Gimli/Legolas ont des
    homologues directs). Valeur `none`/absente → **pas de vignettes** (pastilles texte), zéro
    régression L8.
- **Mapping rôle → slug** : via `teams.json` (ordre). Le `DEMO_TEAM` (5 rôles) est étendu pour
  porter un **index de rôle iakagraph** (0..7) par membre, afin de piquer le bon slug dans la
  team choisie. Mapping figé (AR) :

  | DEMO_TEAM (royaume/agent) | rôle iakagraph | index `teams.json` |
  |---|---|---|
  | PORTEFEUILLE / Odin | portefeuille | 0 |
  | ACCUEIL / Aragorn | coordination | 1 |
  | CADRAGE / Gandalf | cadrage | 2 |
  | DEV / Gimli | dev | 3 |
  | QUALITÉ / Legolas | qualite | 4 |

  Ex. team `lotr` → index 0..4 = `galadriel, aragorn, gandalf, gimli, legolas`.
  Team `avengers` → `nickfury, capamerica, strange, ironman, hawkeye`.

- **À ARBITRER B-1** (mineur, n'empêche pas P1) : nom des libellés royaume vs rôle iakagraph.
  `DEMO_TEAM` utilise `ACCUEIL` pour la coordination (Aragorn) alors qu'iakagraph dit
  `coordination`. **Reco** : garder les libellés `DEMO_TEAM` (affichage) ET ajouter le champ
  `roleIndex` (résolution vignette) — pas de renommage, zéro régression. → si OK, c'est fermé.

### C. Couverture MVP (chartes × teams embarquées) — **DÉCIDÉE (avec arbitrage d'ampleur)**
- **Charte embarquée** : **naonedge** (dark + light), = la charte app actuelle. Aucune autre
  charte en MVP (extensible via le script + manifest).
- **Teams embarquées (reco)** : **3 teams** couvrant des registres distincts pour la démo :
  `lotr` (défaut, homologue direct), `avengers`, `starfleet`. Soit **5 vignettes utiles × 3
  teams × 2 variantes = 30 PNG** embarqués (on n'embarque que les **5 rôles** du `DEMO_TEAM`,
  pas les 8). Poids attendu négligeable (vignettes = bustes compressés).
- **À ARBITRER C-1** : 3 teams suffisent-elles pour la démo, ou Stéphane veut-il **les 11**
  d'emblée (5 rôles × 11 × 2 = 110 PNG, toujours raisonnable) ? **Reco Gandalf = 3 teams**
  (montre le mécanisme « je change de team → tout le casting change » sans gonfler), extensible
  d'un coup de script. Si Stéphane veut « waow », passer à 11 est un simple paramètre du script.

### D. Rendu (roster + chat) — **DÉCIDÉE**
- **Roster** (`Roster.tsx`) : devant la pastille, une **vignette ronde** (réutilise le token de
  forme `data-shape`) de l'agent, résolue par `(charte, team, roleIndex)`. Conserver la
  pastille `[ROYAUME][Agent]` en **légende sous/à côté** (identité iakaframe préservée) + le
  statut attend/travaille inchangé. Si pas de vignette → pastille seule (rendu L8 actuel).
- **Chat** (`Chat.tsx`) : dans la bulle assistant, **avatar** (même résolveur) à gauche du
  `bwho` (nom de l'agent). User = pas d'avatar (ou avatar générique neutre — **reco : aucun**).
  Si pas de vignette → rendu L8 actuel (juste `bwho`).
- **Styles** : nouveaux sélecteurs dans `app.css`, pilotés par les tokens existants
  (`--radius`, formes). Pas de couleur en dur hors tokens.

### E. Bug B (workset) — **DÉCIDÉE**
- `useDemoSeed` reçoit une nouvelle dep `addToWorkset: (projectId: string) => void` (= `workset.add`).
  Après seed réussi (`seeded && demo_path`), appeler `addToWorkset(DEMO_PROJECT_ID)`
  **idempotent** (l'`add` l'est déjà). `App.tsx` passe `workset.add`.
- **Non-régression** : reste sur la vue **Portfolio** au boot (AR-4 L7 inchangé) ; le projet est
  juste **présent** dans Working quand l'utilisateur y va. Borné par le flag dev (`seeded:false`
  en prod → rien). Zéro secret, non destructif.

### F. Conversation préchargée (C) — **DÉCIDÉE (les DEUX, cohérents)**
- **C.1 — Chat préchargé (L8, front).** Une séquence mockée d'`history` (ChatTurn[]) est
  injectée dans la conversation `iaka-demo` à sa création par `useDemoSeed`. Mécanisme : étendre
  `openConversation` d'un paramètre optionnel `initialHistory?: ChatTurn[]` (rétro-compatible,
  défaut `[]`), OU exposer un `seedHistory(projectId, turns)` dans `useConversations`. **Reco :
  paramètre `initialHistory`** (plus simple, un seul point). La séquence illustre la chaîne de
  badges iakaframe : délégation Aragorn→Gandalf, rapport de Gandalf, restitution **verbatim**
  par Aragorn. Contenu mocké dans `src/mock/demoConversation.ts` (nouveau, à côté de `demoTeam.ts`).
  Borné dev (n'apparaît que si `seeded`).
- **C.2 — Main courante enrichie (L4, CouchDB).** Enrichir `docker/init-couchdb.sh` avec la
  **même séquence** (délégation **canal `geste`** / rapport / verbatim), `conv_id:"iaka-demo"`,
  schéma respecté `{ts,royaume,agent,conv_id,role,content,tokens,meta}`. Les docs existants
  (`demo-1`) restent (non-régression L4). La séquence ajoutée **doit refléter** le chat C.1
  (mêmes agents, même histoire) → ce qu'on voit dans le chat se retrouve dans les logs.
- **Cohérence exigée** : le contenu textuel des tours C.1 et des docs C.2 raconte **la même
  scène** (peut être condensé côté logs). Un test vérifie la correspondance des agents/rôles
  clés (cf. §6).

---

## 4. Conception technique (où vit quoi — façade unique, pas de god-component)

- **`src/assets/vignettes/`** : PNG embarqués + `manifest.ts` (généré). Importé par le résolveur.
- **`src/theme/vignettes.ts`** (NOUVEAU, pur, testable) : le **résolveur**
  `resolveVignette(charte, team, roleIndex): string | null`. Lit le manifest. Renvoie l'URL
  d'asset Vite ou `null` (→ fallback pastille). Aucune I/O, aucun `invoke`.
- **`src/mock/demoTeam.ts`** : ajouter `roleIndex: number` à `DemoTeamMember` (+ valeurs 0..4).
- **`src/mock/demoConversation.ts`** (NOUVEAU) : `DEMO_HISTORY: ChatTurn[]` (séquence iakaframe).
- **`src/hooks/useConversations.ts`** : `openConversation(..., initialHistory?)`.
- **`src/hooks/useDemoSeed.ts`** : dep `addToWorkset` + passage de `DEMO_HISTORY` à l'ouverture.
- **`src/hooks/useSettings.ts`** : clé `ui_team` (+ `ui_charte` si charte ≠ naonedge en P2),
  getter `team` + `setTeam`. Réutilise `configSet`. Dérivation charte depuis `theme`.
- **`src/components/Roster.tsx`** & **`Chat.tsx`** : rendu vignette/avatar via le résolveur ;
  reçoivent `charte`+`team` (ou un résolveur déjà lié) en props depuis les vues (pas d'accès
  config dans le composant présentationnel).
- **`src/views/SettingsView.tsx`** : `<select>` team (liste des teams embarquées + `none`).
- **`scripts/sync-vignettes.sh`** : copie sous-ensemble + génère le manifest.
- **`docker/init-couchdb.sh`** : séquence C.2.
- **Aucun fichier Rust modifié** (le seed Rust reste tel quel ; B/C sont front + CouchDB).
  **`tauri.conf.json` inchangé** (CSP intacte).

---

## 5. Étapes (commits atomiques suggérés)

**Phase L9-P1 (B + C)**
1. `fix(L9): useDemoSeed ajoute iaka-demo au set de Work (idempotent, flag dev)` — dep
   `addToWorkset`, câblage `App.tsx`, test.
2. `feat(L9): openConversation accepte un historique initial (rétro-compatible)` —
   `initialHistory?`, tests.
3. `feat(L9): historique de chat démo préchargé (chaîne de badges iakaframe)` —
   `demoConversation.ts` + branchement dans `useDemoSeed`, tests.
4. `feat(L9): main courante CouchDB enrichie (délégation geste / rapport / verbatim)` —
   `init-couchdb.sh`, cohérent avec le chat.

**Phase L9-P2 (A — vignettes)**
5. `chore(L9): script sync-vignettes + manifest (sous-ensemble naonedge × 3 teams)` —
   `scripts/sync-vignettes.sh`, `src/assets/vignettes/**`, `manifest.ts`.
6. `feat(L9): résolveur de vignette (charte, team, roleIndex) + roleIndex sur DEMO_TEAM` —
   `theme/vignettes.ts`, `demoTeam.ts`, tests (mapping + fallback null).
7. `feat(L9): clé config ui_team + sélecteur team dans Réglages` — `useSettings`, `SettingsView`.
8. `feat(L9): rendu vignettes dans le roster + avatars dans le chat (fallback pastille)` —
   `Roster.tsx`, `Chat.tsx`, `app.css`, vues, tests rendu + fallback.

À chaque phase : `npm run typecheck && npm run lint && npm run test` (+ `bash scripts/quality.sh`
si Rust touché — ici non). Le seed CouchDB se vérifie via `docker/init-couchdb.sh` relancé.

---

## 6. Critères d'acceptation (testables — gate Legolas)

**B — workset**
- [ ] **B1** : avec le flag dev, après boot, `iaka-demo` est dans `workset.ids` (test unitaire
  `useDemoSeed` avec `addToWorkset` mocké + `seeded:true`). En prod (`seeded:false`) →
  `addToWorkset` **jamais** appelé.
- [ ] **B2** : `add` reste idempotent (un 2ᵉ passage ne double pas) — couvert par `useWorkset`,
  re-vérifié.
- [ ] **B3** : non-régression L7 — la vue active au boot reste **Portfolio** ; aucun secret écrit ;
  build prod n'ajoute rien.

**C — conversation préchargée cohérente**
- [ ] **C1** : la conversation `iaka-demo` a un `history` non vide au boot dev, contenant ≥ 1 tour
  de **délégation** (Aragorn→Gandalf), ≥ 1 **rapport** (Gandalf), ≥ 1 **restitution verbatim**
  (Aragorn citant Gandalf). Test sur `DEMO_HISTORY`.
- [ ] **C2** : `openConversation(..., initialHistory)` sans `initialHistory` produit
  `history: []` (rétro-compat L8 stricte).
- [ ] **C3** : `init-couchdb.sh` seede des docs `conv_id:"iaka-demo"` avec **au moins un**
  `meta.canal:"geste"` (délégation), un rapport et un verbatim ; les **docs `demo-1`
  existants restent** (non-régression L4). Schéma `{ts,royaume,agent,conv_id,role,content,tokens,meta}`
  respecté (vérif `jq` ou test bash).
- [ ] **C4** : **cohérence chat↔logs** — les agents/rôles de la séquence verbatim sont les mêmes
  des deux côtés (test : intersection des paires `(royaume,agent)` de `DEMO_HISTORY` et des docs
  `iaka-demo` non vide et cohérente).

**A — vignettes thémées par team**
- [ ] **A1** : `resolveVignette("naonedge","lotr",2)` renvoie l'URL de la vignette **Gandalf**
  (`lotr` index 2 = `gandalf`) ; `resolveVignette(_, "lotr", 0)` = `galadriel` ; mapping conforme
  à `teams.json` (test sur le manifest généré).
- [ ] **A2** : **fallback** — team `none` / team non embarquée / roleIndex inconnu →
  `resolveVignette` renvoie `null` → le composant affiche la **pastille texte** (jamais d'image
  cassée ; test rendu + test `onError`).
- [ ] **A3** : **sélection persistée** — `setTeam("avengers")` écrit `ui_team` via `configSet`
  et, au remontage, `useSettings.team === "avengers"` (test calque `setTheme`).
- [ ] **A4** : **bonne charte/team** — quand `theme=naonedge-dark` + `team=avengers`, le roster
  affiche les vignettes du dossier `naonedge/dark/.../avengers/` (index 0..4 =
  nickfury/capamerica/strange/ironman/hawkeye) ; changer pour `lotr` change tout le casting.
- [ ] **A5** : roster ET chat affichent la vignette de **l'agent qui parle** (avatar bulle
  assistant) ; pastille `[ROYAUME][Agent]` toujours présente comme légende (identité iakaframe).
- [ ] **A6** : **CSP intacte** — `tauri.conf.json` **non modifié** ; les images sont servies en
  `'self'` (bundle Vite) ; aucun `assetProtocol.enable`, aucun scope FS, aucun appel réseau
  (grep : pas de nouvelle entrée CSP, pas de `convertFileSrc`).

**Transverses**
- [ ] **T1** : `npm run typecheck` + `npm run lint` + `npm run test` verts ; suite L8 (50 tests)
  non régressée.
- [ ] **T2** : façade unique respectée — aucun `invoke`/`listen` hors `src/api/backend.ts` ;
  composants `Roster`/`Chat` restent présentationnels (résolveur passé en props).
- [ ] **T3** : `scripts/sync-vignettes.sh` idempotent, paramétrable par `IAKAGRAPH_ROOT`, et son
  manifest reflète l'ordre `teams.json`.

---

## 7. Risques / inconnues

- **R1 (faible)** : poids du bundle si Stéphane veut les 11 teams × toutes chartes — borné par le
  choix MVP (3 teams, 1 charte, 5 rôles). Extensible sans refonte (script + manifest).
- **R2 (faible)** : rendu des bustes « robots » (autobots) en avatar rond — non embarqué en MVP,
  tracé.
- **R3 (moyen)** : tentation d'ajouter une charte ≠ naonedge → introduit `ui_charte` + entrées
  `tokens.css` (hors lot si on s'en tient à naonedge). Garde-fou : §3.C fige naonedge.
- **R4 (faible)** : cohérence chat↔logs maintenue à la main (deux fichiers) — test C4 l'ancre.

---

## 8. Estimation (à l'entrée du jalon de dev)

| Phase | Contenu | Estimation | Complexité / risque | Inconnues |
|---|---|---|---|---|
| **L9-P1** | B (workset) + C (chat préchargé + CouchDB) | **0,5 – 1 j-homme** | Faible | aucune réelle (réutilisation pure) |
| **L9-P2** | A (script+manifest, résolveur, config team, rendu roster+chat) | **1,5 – 2,5 j-homme** | Moyenne | volume teams (arbitrage C-1), ergonomie avatar rond |
| **Total** | L9 complet | **≈ 2 – 3,5 j-homme** | — | — |

Hypothèses : pas de génération d'image (réutilisation Loki) ; CSP non touchée (embarquement
bundle) ; pas de Rust modifié. Si Stéphane tranche « les 11 teams » (C-1), P2 reste dans la
fourchette haute (le coût est dans le script/manifest, pas dans N images).

---

## 9. Sources (faits vérifiés)
- Casting & ordre des rôles : `~/work/iakagraph/specs/teams-casting.md`, `~/work/iakagraph/teams.json`.
- Arbo PNG vérifiée : `~/work/iakagraph/theme/naonedge/dark/vignettes/**` (96 PNG : 8 rôles + 88 team).
- CSP & asset-protocol Tauri 2 : `src-tauri/tauri.conf.json` (`img-src 'self' asset: data:`) ;
  [Asset protocol scope — Tauri v2](https://v2.tauri.app/security/asset-protocol/) ;
  [Display an image using the asset protocol (discussion)](https://github.com/orgs/tauri-apps/discussions/11498).
- Existant L8/L7/L4 : `src/mock/demoTeam.ts`, `src/components/{Roster,Chat}.tsx`,
  `src/hooks/{useConversations,useWorkset,useDemoSeed,useSettings}.ts`, `src/App.tsx`,
  `src-tauri/src/seed.rs`, `docker/init-couchdb.sh`.

---

> **Gate humain** : cette instruction validée par Stéphane déclenche le développement (Gimli),
> phase par phase. Arbitrages ouverts : **B-1** (libellés royaume vs rôle — reco : garder +
> `roleIndex`), **C-1** (3 teams vs 11 — reco : 3). Tout le reste est fermé.
