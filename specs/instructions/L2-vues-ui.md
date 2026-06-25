# Instruction : L2 — Vues Portfolio / Working / Réglages + grille / dock / onglets (UI front)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Lot métier #2** de MOVE 3 (dev), après L0 (socle, PASS) et L1 (backend salvagé, 10 commandes).
> Réf. : `specs/PROJET.md` § 4 (vues), § 5 (3-canaux), § 6 (présentation), § 9 (scope v0.1 IN/OUT) ;
> `specs/roadmap.md` § L2 + pistes rattachées ; maquette **référence = `specs/maquettes/convergence-v7/`** ;
> socle front L0/L1 : `src/api/backend.ts`, `src/App.tsx`, `src/hooks/`. Faits techniques vérifiés sur
> le web le 2026-06-25 (cf. § Sources).

---

## Note de numérotation (à lire d'abord)

Le **backlog `CLAUDE.md`** nomme **L2 = « Vues Portfolio / Working / Réglages + grille/dock/onglets »** —
c'est **le périmètre de cette instruction**. La **roadmap** (`specs/roadmap.md` § 2) découpe autrement
(son « L2 » = Dashboard+PTY, son « L4 » = mains courantes). **Cette instruction suit le backlog
`CLAUDE.md`** : elle cadre **les vues UI v0.1** par-dessus le backend L1, **sans** le moteur IA
(roadmap L3 / backlog L3) ni les mains courantes branchées sur iakaboxlogs (roadmap L4 / backlog L4).
Tout ce qui dépend de ces deux lots est **mocké en place** ou tenu **OUT** (cf. § Périmètre).

---

## Objectif

Donner à IakaCockpit son **premier front réel** : remplacer le shell vide L0 par les **trois vues
v0.1** de la maquette v7 — **Portfolio**, **Working**, **Réglages** — habillées par l'**iakacharte**
(mode de présentation **B** seul), navigables, et **branchées sur les 10 commandes L1** quand la donnée
existe. À la fin de L2, l'app **boote sur la vue Portfolio**, scanne le chapeau et affiche les projets
réels (cartes git), permet d'ouvrir **Working** sur un projet (avec un **terminal PTY réel** via xterm),
et expose une vue **Réglages** minimale (chapeau, endpoint LiteLLM, thème). Le tout **sans god-component**
(état dans des hooks séparés), **sans `invoke` hors `backend.ts`**, **typecheck/lint/tests/build verts**.

**L2 = UI propre par-dessus L1, PAS de nouveau métier.** On consomme les commandes déjà livrées ; toute
donnée non fournie par L1 est soit **mockée explicitement** (clairement marquée, sans appel réseau),
soit **signalée comme dépendance ouverte** vers L3/L4 — **jamais improvisée en élargissant le backend**.

---

## Contexte

### Ce que L1 fournit déjà (façade `src/api/backend.ts`)
Les **10 commandes** sont typées et prêtes à consommer (cf. `backend.ts` lu en L2) :

| Domaine | Fonctions façade | Type de retour |
|---|---|---|
| Portfolio | `scanPortfolio(root)` | `Project[]` (git propre/sale, ahead/behind, version, dernier commit, `work_status`) |
| Services | `checkServices()` | `ServiceStatus[]` (name/host/port/url/reachable/latency) |
| Config | `getRoot()` / `setRoot(root)` / `configGet(key)` / `configSet(key,value)` / `configAll()` | racine chapeau + clé/valeur non sensible (secrets exclus) |
| PTY | `ptyOpen(id,cwd?,cols?,rows?)` / `ptyWrite(id,data)` / `ptyResize(id,cols,rows)` / `ptyClose(id)` | sessions terminal cross-OS |
| Santé | `call("ping")` | (présent depuis L0) |

**Événements PTY** (émis par Rust, à consommer en L2 via `@tauri-apps/api/event`) :
`pty://output/{id}` → `string` (flux à écrire dans xterm) ; `pty://closed/{id}` → `()` (fin de session).
L1 a **préparé** l'abonnement côté front sans le consommer ; **L2 le consomme**.

### Ce que la maquette v7 montre (et ce qu'on en garde)
v7 (`specs/maquettes/convergence-v7/index.html`, FAKE JETABLE — **interdit de portage**, R9 roadmap)
réalise **trois vues en navigation top-bar** : `Portfolio` · `Work` · `Réglages`. **C'est la référence
de structure et d'UX.** ⚠️ **v7 montre BEAUCOUP plus que le périmètre v0.1** : sa vue Réglages contient
des panneaux **explicitement tagués « horizon »** (méthode iakaframe, fiches agents + admin-par-prompt,
matrice target/modèle, assemblage team, multi-target Docker, graphe de délégation). **Ces panneaux NE
SONT PAS du périmètre L2** (cf. § Périmètre OUT). On garde de v7 : la **structure 3 vues**, le **layout
Portfolio** (main courante à gauche + grille de tuiles projets à droite), le **layout Working**
(liste projets du « set de Work » + panneau central messages/terminal + toggle), et **Réglages
GÉNÉRAUX uniquement** (navigation, interface, police, charte/thème) **plus** un bloc **Cockpit minimal**
(chapeau + endpoint LiteLLM) conforme `PROJET.md` § 4 (« Admin cockpit — partiel v0.1 »).

### Réseau / box
L2 est **faisable hors box** : le scan portfolio, le PTY et la config tournent en **local**.
`checkServices()` interroge le LAN iakabox (injoignable hors box) → la vue **dégrade proprement**
(services affichés `reachable:false`, jamais d'erreur bloquante, cf. R-L2-7). **Aucune** dépendance
iakaboxlogs/LiteLLM en L2 (ces branchements sont L3/L4). Push différé (commits locaux atomiques).

---

## Décisions (numérotées)

### D1 — Modèle d'UI v0.1 : **3 vues en navigation top-bar** (comme v7), grille/dock = **interne à Portfolio**
Le backlog dit « grille / dock / onglets ». **Interprétation cadrée, alignée v7 et MVP-d'abord** :
- La **navigation principale** = **3 vues** commutables par la top-bar : **Portfolio**, **Working**,
  **Réglages** (exactement v7). Une seule vue active à la fois.
- La **« grille »** = la **grille de tuiles projets** de Portfolio (`tilegrid` v7 : `repeat(3,1fr)`,
  cartes redimensionnées par CSS responsive). Le **« dock »** = la **colonne main courante** à gauche
  de Portfolio (filtres de canaux) **+** la liste « set de Work » à gauche de Working. Les **« onglets »**
  = (a) la **bascule de vues** top-bar et (b) les **onglets de sessions PTY** dans Working (un onglet
  = une session PTY = un projet).
- **PAS de grille de widgets librement déplaçables/dockables au drag-and-drop (façon IDE) en L2.**
  C'est une **option structurante** présentée en § Points ouverts (PO-1) : v7 — la référence validée
  en MOVE 2 — ne propose **pas** ce drag-drop ; l'introduire serait du scope au-delà de v7. **Choix par
  défaut : on suit v7.** Si Stéphane veut le drag-drop dockable, c'est un **lot séparé** (lib dédiée,
  cf. PO-1), pas L2.
- **Raison** : v7 est la maquette **validée** ; on n'invente pas une UX non maquettée. La « grille +
  dock + onglets » du backlog est **satisfaite** par la structure v7 (tuiles + colonnes + onglets PTY).

### D2 — Vue **Portfolio** : grille de tuiles projets réelle (branchée `scanPortfolio`)
- **Donnée réelle** : `scanPortfolio(root)` (root via `getRoot()`). Chaque `Project` → une **tuile**
  (nom, statut, version, état git `clean/dirty/ahead/behind`, `work_status`). Tri **conservé de L1**
  (work pending → stable → hors git).
- **Colonne « main courante » de gauche (v7) = MOCKÉE en L2.** Le feed 3-canaux réel est **L4**
  (iakaboxlogs). En L2, la colonne affiche un **feed mocké explicite** (données en dur, marqué
  « données simulées — branchées en L4 »), avec les **filtres de canaux** (adresse/geste/pensée/agent)
  **fonctionnels sur le mock** (l'interaction filtre→tuiles est de l'UX, testable sans backend).
  **Ne PAS** appeler de commande inexistante pour ce feed. (Dépendance ouverte → DEP-1.)
- **« Set de Work »** : sélection de projets à ouvrir dans Working (bouton `+` par tuile). État **front
  pur** (un `Set` d'ids), porté par `usePortfolio` ou un hook dédié `useWorkset` — **pas** de persistance
  backend exigée en L2 (option : persister via `configSet("workset", …)` — **PO-2**, non bloquant).
- **Exception filtre v7** (raffinement validé) : un projet « en attente d'avis » reste toujours visible.
  En L2, « en attente d'avis » **n'a pas de source réelle** (vient de L4) → **comportement porté sur le
  mock uniquement**, marqué comme tel. Ne pas inventer un champ backend pour ça.

### D3 — Vue **Working** : terminal PTY **réel** (xterm) + zone conversation **mockée**
- **Le terminal est RÉEL en L2** (c'est le livrable technique fort) : intégration **xterm.js**
  (`@xterm/xterm` + `@xterm/addon-fit`, option `@xterm/addon-webgl`) câblée sur les **commandes PTY L1** :
  - ouverture : `ptyOpen(id, cwd, cols, rows)` avec `cwd` = chemin du projet (sous le chapeau, validé
    côté Rust) ; `id` unique par session/onglet ;
  - flux : abonnement `pty://output/{id}` → `term.write(data)` ; saisie xterm → `ptyWrite(id, data)` ;
  - resize : `addon-fit` → `ptyResize(id, cols, rows)` ; fermeture : `pty://closed/{id}` → nettoyage +
    `ptyClose(id)` à la fermeture d'onglet.
  - **Hook dédié `usePty`** (un par préoccupation, D7) : gère le cycle de vie des sessions + l'abonnement
    aux événements. **Aucun `invoke`/`listen` hors `backend.ts`** : si l'abonnement `listen` doit être
    centralisé, l'exposer comme helper dans `backend.ts` (ex. `onPtyOutput(id, cb)`), **pas** d'import
    direct de `@tauri-apps/api/event` dans un hook/composant.
- **Onglets PTY** : un onglet = une session = un projet du set de Work ; titre d'onglet **provisoire**
  = nom du projet. Le **titrage `[ROYAUME][Agent]` + état working/pending/stopped** (v7) **suppose le
  moteur d'agents (L3) et les mains courantes (L4)** → en L2, titre = **nom de projet** ; le titrage
  agent est **OUT** (DEP-2). **Ne pas inventer** d'état d'agent.
- **La zone « conversation » (messages/thread, bulles, relais agents) de v7 = PLACEHOLDER (PO-3
  TRANCHÉ).** Elle dépend du moteur IA (L3) et des mains courantes (L4). En L2 : un **placeholder
  propre explicite** (« conversation — branchée en L3/L4 »), **PAS** un mock statique reproduisant v7
  (décision Stéphane : moins de mock à maintenir, le terminal réel est le cœur). Le **toggle
  `messages ⇄ terminal`** de v7 **n'est pas requis** en L2 (un seul contenu réel : le terminal) ; s'il
  est posé pour préfigurer L3/L4, le côté « messages » reste un **placeholder**, jamais interactif.

### D4 — Vue **Réglages** : **généraux + cockpit minimal SEULEMENT** (le reste de v7 est OUT)
- **Réglages généraux (UX, front + persistance — PO-2 TRANCHÉ)** : disposition de la navigation
  (gauche/droite/éclatés), densité, **forme** (arrondi/carré), **police** (famille + échelle),
  **charte/thème** (sélection d'une iakacharte → repeint l'app en live ; **mode B charté seul**,
  cf. § D5). Le **rendu** est piloté par variables CSS / état UI, mais **ces préférences sont
  PERSISTÉES** (décision Stéphane : elles **survivent au redémarrage**), stockées en SQLite **non
  sensible** via les commandes config L1 — `configGet`/`configAll` **au démarrage**, `configSet`
  **à chaque changement**. Clés documentées en **D4-bis**.
- **Réglages cockpit minimal (branché backend L1)** — conforme `PROJET.md` § 4 (« partiel v0.1 :
  chapeau, endpoint LiteLLM, thème ») :
  - **Chapeau (racine)** : afficher `getRoot()` ; modifier via `setRoot(root)`. (Un changement de racine
    re-déclenche `scanPortfolio`.)
  - **Endpoint LiteLLM** : lire/écrire `configGet("litellm_endpoint")` / `configSet(...)`. **URL non
    sensible uniquement** (la **clé** LiteLLM va au keychain, **L3** — **ne PAS** la manipuler ici).
  - **Thème** : persister le choix via `configSet("theme", …)` (clé `KEY_THEME` existe côté L0/L1).
  - **Services** (optionnel, recommandé) : un bloc lisant `checkServices()` pour montrer l'état iakabox
    (dégrade proprement hors box).

### D4-bis — Persistance des préférences UI (PO-2 tranché) : clés de config & contrat
- **Stockage** : SQLite **non sensible** (module `config` L0/L1), via `configGet`/`configSet`/`configAll`.
  **Aucun secret** parmi ces clés → elles **ne tombent pas** sous le filtre `is_secret` de `configAll`
  (le filtre exclut `token|key|secret|password` ; les clés UI ci-dessous n'en contiennent pas — vérifier
  qu'aucune clé UI ne matche ce filtre, sinon la renommer).
- **Clés de préférences UI (snake_case, namespacées `ui_`)** — proposition fermée, à respecter :
  `ui_nav_pos` (`left|right|split`), `ui_density` (`comfort|standard|compact`), `ui_shape`
  (`round|square`), `ui_font_family` (`system|serif|mono-ui`), `ui_font_scale` (entier %, ex. `100`).
  Plus les clés cockpit déjà existantes : `theme` (`KEY_THEME`), `litellm_endpoint`, racine via
  `get_root/set_root`.
- **Contrat de cycle** : `useSettings` **lit au montage** (`configAll` en un appel, ou `configGet`
  ciblés) et **applique** les valeurs au DOM (variables CSS / `data-*`) ; **écrit** via `configSet` à
  chaque changement utilisateur. **Défauts** : si une clé est absente (`configGet` → `null`), appliquer
  la valeur par défaut documentée ci-dessus (et **ne pas** échouer). Un réglage modifié puis
  l'app **rechargée** doit **retrouver** la valeur persistée (critère vérifiable, cf. § Critères).
- **OUT de la vue Réglages L2** (tagués « horizon » dans v7, hors scope `PROJET.md` § 9) : **Méthode
  iakaframe** (hooks/deny/jalons/graphe), **Assistant du projet**, **Assemblage team**, **Fiche &
  settings agents** + **admin-par-prompt** + édition `agent.md`, **Settings skills**, **Settings target**
  (multi-Docker). **Ne pas les implémenter.** (cf. § Périmètre OUT.)

### D5 — Présentation : **mode B (charté) seul** ; thème = variables CSS ; portraits hors L2
- **Un seul mode de présentation : B (terminal/contenu dans la charte iaka)** — `PROJET.md` § 6.
  Les modes A (old-school) et C (WhatsApp) sont **OUT**. **Pas de commutateur de présentation** en L2.
- **Thème = jeu de variables CSS** (iakachartes), appliqué via attribut sur `<html>` (modèle v7 :
  `data-theme`). Le **thème ne touche jamais la logique** (`PROJET.md` § 4). **Source des tokens** :
  les iakachartes (`iakagraph/theme/` — réf. roadmap § 4) ; en L2, **au moins la charte NaonEdge
  (dark) par défaut** doit être livrée. Les autres chartes/thèmes sont un **plus** (non bloquant).
- **Portraits/bustes d'agents = OUT** (`PROJET.md` § 4.2, horizon). Pas de génération ni d'upload.

### D6 — Archi front : hooks séparés, `backend.ts` unique point d'I/O (héritage L0/D7)
- **Un hook par préoccupation**, pas de god-component (`App.tsx` = shell de navigation, ne porte pas
  l'état métier global) :
  - `usePortfolio` (déjà stub L0) : **enrichi** — appelle `scanPortfolio` via `backend.ts`, expose
    `projects: Project[]`, `loading`, `error`, `refresh()`, racine courante. (Le type stub L0 évolue
    vers `Project` de `backend.ts`.)
  - `useGridState` (déjà stub L0) : **enrichi** — vue active (`portfolio|working|settings`), onglets PTY
    (liste + onglet actif), état de layout. (Le type stub L0 évolue.)
  - `usePty` (**nouveau**) : sessions PTY (cycle de vie + abonnement événements via helper `backend.ts`).
  - `useSettings` (**nouveau**, ou intégré à un hook config) : chapeau, endpoint LiteLLM, thème, réglages
    UI ; lecture/écriture via `backend.ts` (config) + état CSS.
  - `useServices` (**optionnel**) : `checkServices()` + état dégradé.
  - Un hook/util de **feed mocké** pour la main courante (clairement isolé, marqué « mock L4 »).
- **Règle d'or (héritée L0/L1)** : **aucun `invoke` ni `listen` hors `src/api/backend.ts`**. Tout accès
  Tauri (commandes ET événements) passe par la façade. Si un nouvel accès est requis (ex. abonnement
  PTY), il est **ajouté à `backend.ts`** comme fonction typée, pas importé ailleurs.
- **Composants de vue** (`src/views/` ou `src/components/`, au choix de Gimli) : présentationnels,
  reçoivent état + callbacks en props depuis les hooks ; **pas d'I/O dans les composants**.

### D7 — xterm.js : versions et intégration cross-OS (faits vérifiés)
- **Paquets** (scope `@xterm/*`, l'ancien `xterm` non scopé est legacy) : **`@xterm/xterm` 6.x**
  (6.0.0, déc. 2025) + **`@xterm/addon-fit`** (resize) (+ option **`@xterm/addon-webgl`** pour le rendu).
  Stack **xterm + portable-pty + Tauri 2** confirmée **éprouvée en 2026** (Terax, Terminon,
  `tauri-terminal`). cf. § Sources.
- **Cross-OS** : aucune hypothèse de shell côté front — le shell est résolu **côté Rust** (`shell` L0,
  déjà câblé en L1). Le front n'écrit/ne lit que des **octets** (`ptyWrite`/`pty://output`).
- **CSP** : xterm est local (bundlé) → pas de CDN, compatible CSP stricte L0. Le **WebGL addon**
  (`canvas`/`webgl2`) doit rester compatible CSP (`script-src 'self'`) ; si un souci CSP apparaît,
  **fallback rendu DOM/canvas** (ne **jamais** repasser la CSP à `null`, cf. L0 R-L0-3).

### D8 — Qualité & tests : logique des hooks/états testée, couverture honnête (héritage L0/L1)
- `scripts/quality.sh` reste la porte (typecheck + ESLint + vitest + `cargo fmt/clippy/test` — la part
  Rust ne devrait pas bouger en L2, **front-only**, sauf si un événement/commande manque → alors DEP).
- **Tests vitest sur la LOGIQUE** (pas le pixel) : réducteurs/états des hooks (`usePortfolio` :
  loading→success→error sur `scanPortfolio` mocké ; `useGridState` : commutation de vue, ajout/retrait
  d'onglet PTY ; `useWorkset` : ajout/retrait projet ; filtres de canaux du feed mocké : entrée→tuiles
  visibles ; `useSettings` : **persistance des préférences UI** — un réglage modifié est écrit via
  `configSet` puis **relu** via `configGet`/`configAll` au remontage et **réappliqué** (PO-2, D4-bis) ;
  défauts appliqués si clé absente). **`backend.ts` reste mockable** (les tests ne touchent ni Tauri ni
  réseau).
- **Le rendu xterm interactif n'est pas trivial à tester unitairement** → on **assume** (couverture
  honnête) : on teste la **logique du hook `usePty`** (mapping événement→write, resize→`ptyResize`,
  close→nettoyage) avec un `backend.ts` mocké ; le rendu visuel réel est validé **à la main / au gate**.
- **Couverture honnête** : on rapporte le **chiffre réel** ; pas de gonflage, pas d'exclusion trompeuse.

---

## Périmètre

### Inclus (L2 strict)
- **Vue Portfolio** : grille de tuiles **réelle** (`scanPortfolio` via `getRoot`), état git/version/
  `work_status` par tuile ; colonne main courante **mockée** (feed simulé + filtres de canaux
  fonctionnels) ; « set de Work » (sélection front) ; navigation vers Working.
- **Vue Working** : **terminal PTY réel** (xterm câblé sur les commandes + événements PTY L1),
  **onglets de sessions** (un par projet du set de Work), titre = nom de projet ; zone conversation =
  **placeholder propre** (PO-3 tranché, branchée L3/L4 ; pas de mock statique).
- **Vue Réglages** : **généraux** (navigation, densité, forme, police, charte/thème — mode B, live) **et
  PERSISTÉS** via config (PO-2 tranché, clés `ui_*`/`theme`, cf. D4-bis) + **cockpit minimal** (chapeau
  via `getRoot`/`setRoot`, endpoint LiteLLM via `configGet`/`configSet`, thème persisté ; bloc services
  optionnel via `checkServices`).
- **Charte** : **NaonEdge dark** par défaut (variables CSS), thème = tokens, ne touche pas la logique.
- **Archi** : hooks séparés (`usePortfolio`, `useGridState`, `usePty`, `useSettings`, +mock feed) ;
  `App.tsx` = shell de navigation ; **`backend.ts` seul point d'`invoke`/`listen`**.
- **Tests** : vitest sur la logique des hooks/états + filtres ; build front vert ; app boote sur
  Portfolio et scanne le chapeau.

### Exclu (explicitement HORS L2 — autres lots / horizon)
- **Moteur « prochaine étape » IA / LiteLLM** (au-delà de l'URL d'endpoint en réglages) → **L3**
  (backlog). Pas d'appel IA en L2.
- **Mains courantes 3-canaux réelles** (iakaboxlogs MQTT/CouchDB), feed réel, mapping `meta.canal` →
  **L4** (backlog). En L2 le feed est **mocké**. (DEP-1.)
- **Titrage d'onglet PTY `[ROYAUME][Agent]` + état working/pending/stopped** → suppose agents (L3) +
  3-canaux (L4). L2 = titre **nom de projet**. (DEP-2.)
- **Zone conversation/thread agents** (bulles, relais inter-agents, composeur destinataire) de v7 →
  L3/L4. L2 = **placeholder propre** (PO-3 tranché : pas de mock statique reproduisant v7).
- **Réglages « horizon » de v7** (tous tagués hors v0.1 en `PROJET.md` § 9 / v7) : **Méthode iakaframe**
  (hooks/deny/jalons/graphe de délégation), **Assistant du projet**, **Assemblage team**, **Fiche &
  settings agents** + **admin-par-prompt** + édition `agent.md`, **Settings skills**, **Settings
  target** (multi-Docker / preview embarqué). **Non implémentés.**
- **« Onglets qualité »** → **EN RÉSERVE / HORS L2 — débat ouvert NON CLOS** (roadmap § L2 :
  *« que doit afficher un onglet qualité ? »*, à trancher **Stéphane + Loki** avant tout cadrage). **Ne
  pas spécifier ni implémenter.** Tenu dehors par garde Aragorn. (cf. § Points ouverts, RES-1.)
- **« Vue liste des jalons d'un projet »** (frise L0/L1/L2 + état) → **HORS L2.** *Justification* :
  elle **dépend d'une commande backend dédiée** non livrée par L1 (`scan_portfolio` donne la liste des
  projets, **pas** le détail des jalons — roadmap § L2). MVP-d'abord : ne pas l'introduire sans son
  backend. → futur lot, après décision. (DEP-3.)
- **« Main courante filtrable par *event* + fiche jalon »** (dimension event sur le canal geste, fiche
  jalon auteur/input/rapport/verdict) → **HORS L2.** *Justification* : elle **suppose le traçage machine
  des délégations**, prévu en **L4** (roadmap § L4), et la fiche jalon **n'a pas de source de données**
  en L2. Le **filtrage par canal** (adresse/geste/pensée/agent) est, lui, **IN** mais **sur le feed
  mocké** seulement. → la dimension *event* + fiche jalon viennent **avec L4**. (DEP-4.)
- **Grille de widgets librement dockable au drag-and-drop (façon IDE)** → **HORS L2** (non maquetté en
  v7). Option à trancher séparément (PO-1).
- **Modes de présentation A & C** + commutateur ; **portraits d'agents** ; **bureau-OS** ; **lien Obot** ;
  **multi-target Docker** → horizon (`PROJET.md` § 9).
- **Push / CI Forgejo** → différé (box offline) ; **commits locaux atomiques** uniquement.

> **Garde Aragorn (R1 roadmap)** : tout élément des listes DIFFÉRÉ/ANNULÉ/HORS-SCOPE **ne rentre pas**
> en L2 par effet de bord. En cas de doute, **remonter à Stéphane** avant d'élargir.

---

## Contrats d'interface front (hooks ↔ `backend.ts`)

> Les noms exacts (fichiers, signatures fines) sont à l'appréciation de Gimli **tant que** les principes
> D6/D7 tiennent : **un hook par préoccupation**, **I/O uniquement via `backend.ts`**, **types miroir L1**.

### `usePortfolio` (enrichit le stub L0)
```ts
interface UsePortfolio {
  projects: Project[];          // type de backend.ts (L1)
  loading: boolean;
  error: string | null;
  root: string | null;          // racine courante (getRoot)
  refresh: () => Promise<void>; // re-scanPortfolio(root)
}
// I/O : backend.getRoot(), backend.scanPortfolio(root). AUCUN invoke direct.
```

### `useGridState` (enrichit le stub L0) — vues + onglets PTY
```ts
type ViewId = "portfolio" | "working" | "settings";
interface PtyTab { id: string; projectId: string; title: string } // title = nom projet en L2
interface UseGridState {
  activeView: ViewId;
  setActiveView: (v: ViewId) => void;
  tabs: PtyTab[];               // onglets de sessions PTY (Working)
  activeTabId: string | null;
  openTab: (projectId: string) => void;   // crée/active un onglet
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}
```

### `useWorkset` (nouveau, ou porté par usePortfolio) — set de Work
```ts
interface UseWorkset {
  ids: Set<string>;             // projets ajoutés au set de Work
  toggle: (projectId: string) => void;
  has: (projectId: string) => boolean;
}
// Persistance OPTIONNELLE via backend.configSet("workset", JSON) — PO-2, non bloquant.
```

### `usePty` (nouveau) — sessions terminal réelles
```ts
interface UsePtySession { id: string; ready: boolean; closed: boolean }
interface UsePty {
  sessions: Record<string, UsePtySession>;
  open: (id: string, cwd: string, cols: number, rows: number) => Promise<void>; // backend.ptyOpen
  write: (id: string, data: string) => Promise<void>;                            // backend.ptyWrite
  resize: (id: string, cols: number, rows: number) => Promise<void>;             // backend.ptyResize
  close: (id: string) => Promise<void>;                                          // backend.ptyClose
  // abonnement output/closed via un helper EXPOSÉ par backend.ts (pas d'import @tauri-apps/api/event ici)
}
```
> **À ajouter à `backend.ts`** (dépendance front, pas backend Rust) : un helper d'abonnement typé, ex.
> `onPtyOutput(id: string, cb: (data: string) => void): Promise<UnlistenFn>` et
> `onPtyClosed(id: string, cb: () => void): Promise<UnlistenFn>`, encapsulant `listen()` de
> `@tauri-apps/api/event`. **C'est le seul endroit autorisé à importer `@tauri-apps/api/event`.**
> Si ce helper s'avère manquant côté contrat L1, **le signaler** (DEP) plutôt que d'importer `listen`
> dans un hook.

### `useSettings` (nouveau) — cockpit minimal + UI **persistée** (PO-2 tranché)
```ts
interface UiPrefs {                              // miroir des clés ui_* (D4-bis), persistées en config
  navPos: "left" | "right" | "split";           // ui_nav_pos
  density: "comfort" | "standard" | "compact";  // ui_density
  shape: "round" | "square";                     // ui_shape
  fontFamily: "system" | "serif" | "mono-ui";   // ui_font_family
  fontScale: number;                            // ui_font_scale (%, ex. 100)
}
interface UseSettings {
  root: string | null;                          // getRoot / setRoot
  litellmEndpoint: string | null;               // configGet/Set("litellm_endpoint") — URL non sensible
  theme: string;                                // configGet/Set("theme")
  ui: UiPrefs;                                  // préférences UI persistées (D4-bis)
  loaded: boolean;                              // true après lecture initiale (configAll/configGet)
  setRoot: (root: string) => Promise<void>;
  setLitellmEndpoint: (url: string) => Promise<void>;
  setTheme: (id: string) => Promise<void>;      // applique data-theme + PERSISTE (configSet "theme")
  setUiPref: <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => Promise<void>; // applique CSS/data-* + PERSISTE (configSet ui_*)
}
// Cycle (D4-bis) : au montage → configAll (ou configGet ciblés) → applique au DOM ; défauts si clé null.
// À chaque changement → configSet(clé, valeur). AUCUN invoke direct ; tout via backend.ts.
// Les clés ui_* ne contiennent PAS token|key|secret|password → non filtrées par configAll (vérifier).
```

### Quelles commandes chaque vue consomme (récap)
| Vue | Commandes `backend.ts` consommées | Mock / différé |
|---|---|---|
| **Portfolio** | `getRoot`, `scanPortfolio` | feed main courante = **mock** (L4) ; « en attente d'avis » = mock |
| **Working** | `ptyOpen/Write/Resize/Close` + helper `onPtyOutput/onPtyClosed` | zone conversation/thread = **placeholder/mock** (L3/L4) ; titre agent = différé |
| **Réglages** | `getRoot/setRoot`, `configGet/configSet/configAll` (litellm_endpoint, theme, **`ui_*`** D4-bis), `checkServices` (option) | réglages UI = **persistés** via config (PO-2) ; panneaux « horizon » = **OUT** |

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src/
│  ├─ App.tsx                    # MODIF : shell de NAVIGATION (3 vues), pas d'état métier global
│  ├─ main.tsx                   # MODIF (si besoin) : montage thème par défaut
│  ├─ api/backend.ts             # MODIF : + helpers d'abonnement PTY (onPtyOutput/onPtyClosed) —
│  │                             #         seul endroit autorisé à importer @tauri-apps/api/event
│  ├─ hooks/
│  │  ├─ usePortfolio.ts         # MODIF : branché scanPortfolio (enrichit le stub L0)
│  │  ├─ useGridState.ts         # MODIF : vues + onglets PTY (enrichit le stub L0)
│  │  ├─ useWorkset.ts           # NOUVEAU (ou intégré usePortfolio) : set de Work
│  │  ├─ usePty.ts               # NOUVEAU : sessions terminal réelles (xterm ↔ PTY L1)
│  │  ├─ useSettings.ts          # NOUVEAU : chapeau / litellm_endpoint / thème / UI
│  │  └─ useServices.ts          # NOUVEAU (option) : checkServices + dégradé
│  ├─ views/  (ou components/)   # NOUVEAU : PortfolioView, WorkingView, SettingsView (présentationnels)
│  ├─ components/                # NOUVEAU : Tile, MainCouranteMock, PtyTerminal (xterm), Tabs, ThemeSwitch…
│  ├─ mock/feed.ts               # NOUVEAU : feed 3-canaux MOCKÉ (marqué « simulé — L4 »)
│  ├─ theme/                     # NOUVEAU : tokens iakacharte (NaonEdge dark min.) en CSS variables
│  └─ __tests__/ (ou *.test.ts)  # NOUVEAU/MODIF : vitest logique des hooks/états/filtres
├─ package.json                  # MODIF : + @xterm/xterm, @xterm/addon-fit (+ webgl option) ; lib grille si retenue
└─ src-tauri/                    # NORMALEMENT INCHANGÉ en L2 (front-only). Toute commande/événement
                                 # manquant → DEP signalée, PAS d'ajout silencieux.
```

> **Dépendances npm à ajouter** (versions vérifiées 2026-06-25) : `@xterm/xterm@^6`, `@xterm/addon-fit@^0.x`
> (aligné xterm 6), option `@xterm/addon-webgl`. **PAS de lib de layout dockable en L2** (PO-1 tranché
> NON ; `dockview-react@^7` / `react-grid-layout` = lot séparé ultérieur). **Aucune dépendance config
> nouvelle** : la persistance UI (PO-2) réutilise les commandes config L1 (`configGet/configSet/configAll`).
> **Ne rien ajouter de réseau IA.** Si un crate/commande backend manque, **le signaler avant** (pas
> d'ajout silencieux — règle L0/L1).

---

## Critères d'acceptation (vérifiables)

- [ ] **Boot sur Portfolio** : `npm run tauri dev` ouvre l'app **sur la vue Portfolio** ; la grille de
      tuiles affiche les **projets réels** du chapeau (`getRoot` + `scanPortfolio`), avec état git/version/
      `work_status` — **sans erreur** console/Rust.
- [ ] **Navigation 3 vues** : la top-bar bascule **Portfolio ⇄ Working ⇄ Réglages** ; une seule vue
      active ; l'état de vue vit dans `useGridState` (pas dans `App.tsx`).
- [ ] **PTY réel dans Working** : ouvrir un projet du set de Work crée un **onglet xterm** ; la session
      `ptyOpen` démarre le shell par OS (cwd = projet) ; la **saisie** part en `ptyWrite`, le **flux**
      `pty://output/{id}` s'affiche, le **resize** appelle `ptyResize`, la **fermeture** d'onglet appelle
      `ptyClose` et nettoie l'abonnement. (Validé à la main au gate.)
- [ ] **Réglages cockpit minimal branché** : la racine s'affiche (`getRoot`) et se modifie (`setRoot`,
      re-scan) ; l'endpoint LiteLLM se lit/écrit (`configGet/configSet("litellm_endpoint")`, **URL non
      sensible** — aucune clé manipulée) ; le thème se persiste (`configSet("theme")`).
- [ ] **Préférences UI persistées (PO-2)** : modifier nav/densité/forme/police/échelle écrit en config
      (`configSet ui_*`) ; **après redémarrage de l'app, les valeurs sont relues** (`configGet`/`configAll`)
      et **réappliquées** au DOM (le réglage choisi est retrouvé, pas le défaut). Si une clé est absente,
      le **défaut documenté** (D4-bis) s'applique sans échec.
- [ ] **`configAll` ne fuit aucun secret** : les clés `ui_*` (et `theme`, `litellm_endpoint`) ne matchent
      **pas** le filtre `is_secret` (`token|key|secret|password`) → elles **apparaissent** dans `configAll`
      (preuve qu'elles sont bien non sensibles et persistées), tandis qu'aucune clé secrète ne transite.
- [ ] **Mode B charté seul** : au moins la charte **NaonEdge dark** est livrée en variables CSS ;
      changer de thème repeint l'app **en live** sans toucher la logique ; **aucun** commutateur de
      présentation A/C ; **aucun** portrait d'agent.
- [ ] **Mock explicite, zéro métier improvisé** : la main courante de Portfolio et la zone conversation
      de Working sont **clairement marquées « simulées / branchées en L3-L4 »** ; **aucune** commande
      backend inexistante n'est appelée ; **aucun** champ backend inventé.
- [ ] **Façade unique** : **grep** → **aucun** `invoke(` hors `src/api/backend.ts` ; **aucun** import de
      `@tauri-apps/api/event` (`listen`) hors `backend.ts` ; les hooks/composants passent **tous** par la
      façade.
- [ ] **Pas de god-component** : `App.tsx` = shell de navigation sans état métier global ; les états
      vivent dans des **hooks séparés** (`usePortfolio`, `useGridState`, `usePty`, `useSettings`, +mock) ;
      les composants de vue sont **présentationnels** (pas d'I/O).
- [ ] **Tests vitest (logique)** : réducteurs/états des hooks couverts (loading/success/error de
      `usePortfolio` ; commutation vue + open/close onglet de `useGridState` ; toggle de `useWorkset` ;
      mapping output/resize/close de `usePty` avec `backend.ts` mocké ; filtres canaux du feed mocké ;
      **persistance `useSettings`** — écriture `configSet` puis relecture/réapplication au remontage, +
      défaut si clé absente) ; `npm run test` **vert**.
- [ ] **Build & qualité verts** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur, `npm run build`
      OK, `npm run tauri build` OK ; `cargo fmt --check`/`clippy`/`test` **inchangés et verts** (L2 est
      front-only) ; `bash scripts/quality.sh` se termine **en succès**.
- [ ] **Dégradation hors box** : la vue Réglages (bloc services, si présent) **n'échoue pas** quand le
      LAN iakabox est injoignable (`checkServices` → `reachable:false`, jamais d'erreur bloquante).
- [ ] **Couverture honnête** : `npm run test:coverage` rapporte le **chiffre réel** ; le rendu xterm
      interactif est assumé non couvert unitairement (testé à la main), sans gonflage.
- [ ] **Aucun élément OUT livré** : pas d'« onglets qualité », pas de « liste des jalons », pas de
      « fiche jalon / event », pas des panneaux Réglages « horizon », pas de drag-drop dockable. (Revue
      de scope au gate.)
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ; un hook +
      ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L2-1 — Scope-creep par la maquette v7** (CRITIQUE). v7 montre tout l'horizon (panneaux Réglages
  « horizon », thread agents, titrage agent). *Mitigation* : D4 fixe Réglages = **généraux + cockpit
  minimal** ; la zone conversation et le titrage agent sont **OUT/mock** ; revue de scope au gate ;
  garde Aragorn sur tout panneau « horizon ».
- **R-L2-2 — Improviser du backend pour combler un mock**. Tentation de créer une commande pour le feed
  3-canaux, la fiche jalon ou l'état d'agent. *Mitigation* : tout ce qui n'est pas dans les 10 commandes
  L1 est **mock explicite** ou **DEP** signalée ; **interdit** d'élargir `src-tauri` en douce (critère
  grep « front-only » + DEP-1..4).
- **R-L2-3 — God-component / `invoke` éparpillé** (R3 roadmap). *Mitigation* : D6 (hooks séparés,
  composants présentationnels) ; critère grep `invoke`/`listen` hors `backend.ts` ; audit Legolas.
- **R-L2-4 — xterm ↔ PTY : fuites d'abonnement / sessions orphelines**. Un onglet fermé sans
  `ptyClose`/`unlisten` fuit. *Mitigation* : `usePty` gère le cycle de vie (close → `ptyClose` +
  `unlisten`) ; test de la logique de nettoyage avec `backend.ts` mocké.
- **R-L2-5 — CSP casse xterm/WebGL**. Le rendu WebGL ou un asset pourrait heurter la CSP stricte L0.
  *Mitigation* : xterm bundlé local (pas de CDN) ; si WebGL pose souci CSP, **fallback rendu DOM/canvas** ;
  **jamais** repasser la CSP à `null` (L0 R-L0-3).
- **R-L2-6 — « grille/dock/onglets » mal interprété** comme un IDE drag-drop. *Mitigation* : D1 cadre la
  grille/dock/onglets **selon v7** (tuiles + colonnes + onglets PTY) ; le drag-drop dockable est **PO-1
  hors L2**.
- **R-L2-7 — `checkServices` injoignable hors box**. *Mitigation* : héritée L1 (jamais d'erreur ;
  `reachable:false`) ; la vue Réglages affiche l'état dégradé sans bloquer.
- **R-L2-8 — Maquette jetable « adoptée »** (R9 roadmap). v7 est **interdite de portage** : L2 réécrit
  propre (hooks + composants typés + tests), **pas** d'extraction du HTML fake.
- **Limite box** : pas de push, pas de CI, pas d'iakaboxlogs/LiteLLM — L2 est **local et offline**, ce
  qui est exactement son périmètre (feed/conversation mockés, L3/L4 plus tard).

---

## Points ouverts & dépendances (à signaler, pas à improviser)

### Points ouverts — **TRANCHÉS par Stéphane (2026-06-25)**
- **PO-1 — Grille de widgets dockable au drag-and-drop ?** → **TRANCHÉ : NON en L2** (on suit v7).
  Le **dock dynamique** (lib **dockview-react 7** — MIT, React ≥16.8, zéro-dép côté core ; ou
  **react-grid-layout**) reste un **lot séparé ultérieur** (réserve/horizon), à maquetter avec Loki
  d'abord. Aucune lib de layout dockable n'est ajoutée en L2.
- **PO-2 — Persistance des réglages UI** (nav/densité/forme/police/échelle + thème) → **TRANCHÉ :
  PERSISTER via `configSet`** (les préférences **survivent au redémarrage**). Implémenté dans
  `useSettings` (lecture `configGet`/`configAll` au démarrage, écriture `configSet` à chaque
  changement), clés `ui_*` documentées en **D4-bis**, critères vérifiables en § Critères. **Non
  sensible** → cohérent avec le filtre `is_secret` de `configAll`. *(Le **workset** reste, lui, un état
  front ; sa persistance est un plus non bloquant.)*
- **PO-3 — Zone conversation de Working en L2** → **TRANCHÉ : placeholder propre** (pas de mock statique
  reproduisant v7). Le terminal réel est le cœur ; le thread agents est branché plus tard sur **L3/L4**.

### Réserve (débat ouvert non clos — NE PAS cadrer)
- **RES-1 — « Onglets qualité »** : *que doit afficher un onglet qualité ?* **Débat ouvert**, à trancher
  **Stéphane + Loki** (maquette UX) avant tout cadrage (roadmap § L2). Piste évoquée non arrêtée : verdict
  Legolas le plus récent par projet/jalon (PASS/FAIL par étape). **Tenu HORS L2.** Quand le débat sera
  clos, instruction dédiée.

### Dépendances ouvertes (vers d'autres lots — signalées, non comblées en L2)
- **DEP-1 — Feed mains courantes 3-canaux réel** → **L4** (iakaboxlogs MQTT/CouchDB + mapping
  `meta.canal`). En L2 : **mock**. Aucune commande backend à créer en L2.
- **DEP-2 — Titrage d'onglet PTY `[ROYAUME][Agent]` + état working/pending/stopped** → suppose le
  moteur d'agents (**L3**) + 3-canaux (**L4**). En L2 : titre = **nom de projet**.
- **DEP-3 — « Liste des jalons d'un projet »** → nécessite une **commande backend dédiée** (lire le
  backlog/`specs/instructions` d'un projet) **non livrée par L1**. Hors L2 ; à cadrer avec son backend.
- **DEP-4 — « Filtre par event + fiche jalon »** → suppose le **traçage machine des délégations** (**L4**)
  et une source pour la fiche jalon (auteur/input/rapport/verdict). Hors L2 ; vient avec L4. Le filtrage
  **par canal** (pas par event) est IN, **sur le mock**.
- **DEP-5 — Helper d'abonnement PTY dans `backend.ts`** (`onPtyOutput`/`onPtyClosed`) : à **ajouter
  côté front** (encapsule `listen`). Si le contrat d'événements L1 (`pty://output|closed/{id}`) ne suffit
  pas, **le signaler** plutôt que d'importer `@tauri-apps/api/event` dans un hook.

---

## Notes pour Gimli

- **v7 est la RÉFÉRENCE de structure, pas un livrable à copier** (R9 : interdit de portage). Tu réécris
  **propre** : hooks séparés + composants typés + tests. Tu **gardes** de v7 : les 3 vues, le layout
  Portfolio (main courante gauche + tuiles droite), le layout Working (set de Work gauche + terminal),
  Réglages **généraux + cockpit minimal**. Tu **jettes** tout panneau « horizon ».
- **Le cœur technique de L2 = le terminal PTY réel** (xterm `@xterm/*` 6 + addon-fit, câblé sur les
  commandes/événements PTY de L1). Commence par là après le squelette de navigation : c'est ce qui
  prouve que L1 et L2 s'emboîtent.
- **`backend.ts` est sacré** (D6/D7 hérités) : aucun `invoke` **ni `listen`** hors façade. Ajoute les
  helpers d'abonnement PTY **dans** `backend.ts` ; c'est le **seul** endroit autorisé à toucher
  `@tauri-apps/api/event`.
- **Mocke explicitement** la main courante (Portfolio) et la conversation (Working) — marque-les
  « simulé · L3/L4 ». **N'invente aucune commande backend.** Tout manque = **DEP signalée**, pas un
  ajout silencieux dans `src-tauri`.
- **Tiens le scope** : pas d'« onglets qualité » (réserve), pas de « liste des jalons » / « fiche jalon »
  (DEP), pas des panneaux Réglages « horizon », pas de drag-drop dockable. En cas de doute → **remonte**.
- **CSP** : xterm local, pas de CDN ; si WebGL heurte la CSP, fallback DOM/canvas — **jamais** `null`.
- **Avant de clore** : `bash scripts/quality.sh` en entier, fais les greps toi-même (`invoke`/`listen`
  hors façade), vérifie chaque case des Critères. Rapporte la **couverture réelle** sans la maquiller.
- **Gate Legolas obligatoire** après L2 (anti « Gimli solo ») : il auditera l'unicité de la façade
  (invoke + listen), l'absence de god-component, le cycle de vie PTY (pas de fuite), le respect du scope
  (rien d'OUT livré), le mode B charté, et la couverture honnête. Ne t'auto-valide pas.

---

## Sources (faits vérifiés sur le web, 2026-06-25)
- **xterm.js** (scope `@xterm/*`, **v6.0.0** déc. 2025 ; addons fit/web-links/webgl ; migration depuis
  l'ancien `xterm`) : [xterm.js — GitHub](https://github.com/xtermjs/xterm.js/) ·
  [xtermjs.org](https://xtermjs.org/)
- **xterm + portable-pty + Tauri 2** (stack éprouvée 2026, PTY→Channel→xterm→WebGL) :
  [tauri-terminal (marc2332)](https://github.com/marc2332/tauri-terminal) ·
  [Terminon (Tauri 2 + React + xterm)](https://github.com/Shabari-K-S/terminon) ·
  [Terax — terminal Tauri 2/Rust (Better Stack)](https://betterstack.com/community/guides/ai/terax-ai/) ·
  [react-xtermjs (Qovery)](https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals)
- **Grille/dock (option PO-1)** : [Dockview 7.x — MIT, React ≥16.8, zéro-dép core](https://dockview.dev/) ·
  [dockview — GitHub](https://github.com/mathuo/dockview) ·
  [react-grid-layout (maintenu)](https://github.com/react-grid-layout/react-grid-layout)
- **Réfs internes** : maquette `specs/maquettes/convergence-v7/index.html` (structure 3 vues) ;
  `specs/instructions/L1-salvage-backend-rust.md` (contrats des 10 commandes + événements PTY) ;
  `specs/PROJET.md` § 4/5/6/9 ; `specs/roadmap.md` § L2/L4 (pistes + débat onglets qualité).
