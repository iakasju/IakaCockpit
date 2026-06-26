# Instruction : L7 — Seed démo dev (projet test + team lancée + config par défaut)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : à valider par Stéphane** avant exécution. Doc en français, code/identifiants en anglais.
> **Lot métier #7** de MOVE 3 (dev). Antérieurs : L0 (socle, PASS), L1 (backend salvagé, PASS), L2
> (vues UI, PASS), L3 (moteur prochaine étape, PASS), L4 (mains courantes lecture seule, PASS), L6
> (canal adresse sortant n8n, PASS). L5 = traçage MACHINE des délégations (tooling méthode, hors app).
>
> Réf. vision : `specs/PROJET.md` § 3.1/3.2 (stack, façade unique), § 4 (vues + admin cockpit),
> § 5 (mains courantes), § 9 (scope v0.1) ; `CLAUDE.md` (archi front D7 façade unique ; socle sécurité
> L0 : `paths`/`IAKAFRAME_ROOT`, `pathguard`, config SQLite non sensible, secrets keychain, CSP stricte ;
> convention « mocker les API en dev », « MVP d'abord », « réutiliser l'existant »).
>
> **Code inspecté en lecture seule le 2026-06-26** (le seed s'appuie sur l'existant, rien n'est
> supposé) : `src-tauri/src/{lib.rs,db.rs,config.rs,paths.rs,portfolio.rs,terminal.rs,git.rs,ai.rs,
> maincourante.rs,notify.rs,secrets.rs}` ; `src/api/backend.ts` ; `src/App.tsx` ; `src/main.tsx` ;
> `src/hooks/{usePortfolio,useGridState,usePty,useSettings}.ts` ; `docker/docker-compose.yml` +
> `docker/init-couchdb.sh` + `docker/n8n/README.md` ; `src-tauri/tauri.conf.json`. **Faits techniques
> vérifiés sur le web (2026-06-26, cf. § Sources)** : détection du profil `tauri dev` côté Rust.

---

## Objectif

Au lancement du **build de DEV/TEST**, IakaCockpit doit s'ouvrir **déjà peuplé et configuré** pour
démontrer **toutes les fonctions livrées** (L2 grille/PTY, L3 « prochaine étape », L4 main courante,
L6 canal adresse), **sans aucune configuration manuelle** :

1. un **vrai projet de démo** sur disque (mini-repo git réel sous le chapeau), **détecté par le scan
   portfolio L1** comme un projet normal — pour que L3 ait un **vrai contexte** (`specs/`) à lire ;
2. une **team « lancée »** = des **onglets PTY pré-ouverts** nommés `[ROYAUME][Agent]`, un shell par
   agent (PTY L2), **pointant sur le dossier démo** ;
3. une **config par défaut pré-remplie** (seed) pointant sur la **stack Docker locale** : endpoint IA
   Ollama, modèle défaut, URL CouchDB iakaboxlogs, support n8n — **uniquement les valeurs non sensibles**.

**L7 = on PRÉ-REMPLIT l'état de démo, on ne crée AUCUN métier nouveau.** Tout passe par les commandes
**déjà livrées** (L1 scan/`add_project`, L1/L2 PTY, L1 config) et la **façade unique** `backend.ts`.
**Aucune** nouvelle commande métier, **aucun** runner d'agent autonome, **aucun** seed en prod.

**Garde absolue — ZÉRO seed en prod, ZÉRO destruction.** Le seed est **derrière un flag dev** (D1) et
**non destructif/idempotent** (D2) : il ne s'active jamais en build de prod, ne recrée jamais ce qui
existe, et **n'écrase jamais** une config saisie par l'utilisateur ni un état réel.

---

## Contexte

### Pourquoi ce lot maintenant
Les lots L2→L6 sont livrés et gatés, mais **démontrer la chaîne complète** exige aujourd'hui une
**mise en scène manuelle** à chaque build de test : créer/choisir un projet, ouvrir des terminaux,
saisir l'endpoint IA, le modèle, l'URL CouchDB, le support n8n. C'est **fastidieux et non
reproductible**. L7 automatise cette mise en scène **en dev uniquement**, pour que `npm run tauri dev`
(ou un `.dmg` de démo flaggé) ouvre une app **prête à montrer**.

### Ce que l'existant fournit déjà (à RÉUTILISER, ne RIEN réimplémenter)

| Brique | Où | Ce qu'on en fait en L7 |
|---|---|---|
| `paths::resolve_hat_root()` (+ `IAKAFRAME_ROOT`) | `src-tauri/src/paths.rs` (L0) | calculer la racine du chapeau pour y créer le dossier démo (ex. `<root>/iaka-demo`) |
| `db::open(app)` + `config::{get,set,ensure_root,init_schema}` | `src-tauri/src/{db,config}.rs` (L0/L1) | lire/écrire la config non sensible **uniquement si absente** (seed non destructif) |
| `config::is_secret` (filtre `config_all`) | `src-tauri/src/config.rs` (L1) | garantir que les clés seedées sont **non sensibles** (jamais de secret en SQLite) |
| `git::capture(path, &[args])` | `src-tauri/src/git.rs` (L1) | **git init + add + commit** du dossier démo via le binaire `git` (déjà cross-OS) — **pas de crate git2** |
| `scan_portfolio(root)` | `src-tauri/src/portfolio.rs` (L1) | le dossier démo, créé sous le chapeau, est **détecté automatiquement** (aucun code de détection à écrire) |
| `read_version`/`read_project` (logique portfolio) | `src-tauri/src/portfolio.rs` (L1) | le dossier démo doit contenir `specs/etat-des-lieux.md` (ligne `\| Version \|`) pour afficher une version |
| PTY : `pty_open/write/resize/close` + events `pty://output\|closed/{id}` | `src-tauri/src/terminal.rs` + `src/hooks/usePty.ts` (L1/L2) | ouvrir les onglets « team » (un PTY par agent, `cwd` = dossier démo, **validé sous le chapeau**) |
| `useGridState.openTab(projectId, title, cwd)` + onglets PTY | `src/hooks/useGridState.ts` (L2) | créer les onglets `[ROYAUME][Agent]` côté front (le **title** porte déjà le nom d'onglet) |
| `useSettings` (lecture `configAll` au montage, `configSet` à l'écriture) | `src/hooks/useSettings.ts` (L2/L3/L4/L6) | l'UI relit la config seedée **telle quelle** ; aucune modif de contrat |
| Stack Docker locale | `docker/docker-compose.yml` (+ `init-couchdb.sh`) | **cibles du seed config** : Ollama, LiteLLM, CouchDB, n8n (ports hôte ci-dessous) |
| Patrons `should_mock` / flag d'env (L3/L4/L6) | `ai.rs`/`maincourante.rs`/`notify.rs` | **modèle à calquer** pour la lecture de flag dev (`std::env::var` + `cfg!`) |

### Cibles du seed config (endpoints RÉELS — IA = Ollama HÔTE, services L4/L6 = stack Docker locale)

> ⚠️ **Cible IA = l'Ollama HÔTE de Stéphane (`localhost:11434`), PAS le conteneur Docker (`:11435`)**
> (AR-2 TRANCHÉ). « Mon Ollama local + le LLM défaut » (mots de Stéphane) = l'`ollama serve` qui tourne
> **sur la machine hôte**, où `llama3.1:8b` est déjà `pull`é. Le conteneur `iakacockpit-dev-ollama`
> (`:11435`) existe dans la stack mais **n'est PAS** la cible du seed démo.
>
> ⚠️ **Services L4/L6 = stack Docker locale** : pour CouchDB et n8n, le seed pointe les ports hôte de la
> stack du projet (vérifiés dans `docker-compose.yml`).

| Service | Source réelle | Port hôte | Endpoint à seeder |
|---|---|---|---|
| **Ollama (IA, L3)** | **`ollama serve` HÔTE de Stéphane** | **11434** | **`http://localhost:11434/v1`** *(cible du seed — AR-2)* |
| Ollama conteneur (info) | `iakacockpit-dev-ollama` | 11435 (→ 11434) | *non seedé — existe dans la stack mais n'est PAS la cible démo* |
| LiteLLM (info) | `iakacockpit-dev-litellm` | 4020 (→ 4000) | *non seedé en démo — alternative si on veut router (hors AR-2)* |
| CouchDB (L4) | `iakacockpit-dev-couchdb` | **5984** | `http://localhost:5984` + base `conversations` |
| n8n (L6) | `iakacockpit-dev-n8n` | **5678** | `http://localhost:5678/webhook/iakacockpit-adresse` *(si workflow actif)* |

> **CSP (L0)** : `tauri.conf.json` `connect-src` autorise aujourd'hui `http://localhost:4000`. **Tous
> les appels réseau IA/CouchDB/n8n sortent CÔTÉ RUST** (`ureq`), **pas** depuis le front → la CSP
> `connect-src` (front) **n'est pas concernée** par les endpoints seedés. **Ne pas toucher la CSP**
> (jamais `null`, L0 R-L0-3). *(Le seul `connect-src http://localhost:4000` historique n'a pas besoin
> d'évoluer pour L7 ; si Gimli constate un besoin front, le signaler — ne pas élargir en douce.)*

### Le roster iakaframe (nommage `[ROYAUME][Agent]`)
8 agents : **odin** (PORTEFEUILLE), **aragorn** (ACCUEIL/dispatch), **gandalf** (CADRAGE), **gimli**
(DEV), **legolas** (QUALITÉ), **helm** (OPS/garde), **loki** (UX/maquette), **nathalie** (DOC). Le
royaume est **MAJUSCULE**. Le seed de la team **n'invoque aucun agent réel** : il ouvre des **shells
nus** dont l'**onglet** porte le titre `[ROYAUME][Agent]` (mise en scène visuelle de la team, pas un
runner). *(Mapping royaume↔agent fermé en D3-bis.)*

### Réseau / box
L7 est **faisable hors box** : le dossier démo (FS + git local) et les onglets PTY tournent en **local**.
Le seed config **écrit des URLs** (non sensibles) **sans les contacter** — la joignabilité réelle
(Ollama/CouchDB/n8n) est l'affaire des lots concernés, qui **dégradent déjà proprement** (L3/L4/L6
mock/erreur lisible). **Le seed ne fait AUCUN appel réseau.** Push différé (commits locaux atomiques).

---

## Décisions (numérotées)

### D1 — Flag dev/test : `cfg!(dev)` (build `tauri dev`) + override par variable d'environnement. ZÉRO seed en prod.
Le seed s'active **si et seulement si** l'app tourne en **profil dev** OU si un flag d'env l'autorise
explicitement (pour le `.dmg` de démo). **Fait vérifié (web)** : Tauri 2 expose **`cfg!(dev)`**
(compile-time) = `true` **uniquement** quand l'app a été lancée via `tauri dev` ; `tauri::is_dev()` /
`cfg!(debug_assertions)` couvrent **en plus** `tauri build --debug`. cf. § Sources.

**Règle d'activation (fermée)** — le seed s'exécute si :
- **`cfg!(dev)` est `true`** (lancement `npm run tauri dev`), **OU**
- **la variable d'env `IAKACOCKPIT_DEMO_SEED=1`** est posée au démarrage (permet un **`.dmg` de démo**
  flaggé : `tauri build --debug` + lancement avec la var, ou un wrapper qui la pose).

**Garde anti-prod (NON négociable)** : un **build de prod** (`tauri build` release, **sans** la var
d'env) → **`cfg!(dev)` est `false`** ET la var absente → **le seed ne s'exécute JAMAIS**. Aucun faux
projet, aucune config Docker, aucun onglet team en prod. **Critère grep + test** (§ Critères).

- **Implémentation** : une fonction `fn demo_seed_enabled() -> bool { cfg!(dev) || env_flag() }` (avec
  `env_flag()` = `std::env::var("IAKACOCKPIT_DEMO_SEED") == Ok("1")`), **testable** (la branche env est
  testable sans recompiler ; la branche `cfg!(dev)` est documentée). Calque exact des `should_mock`
  L3/L4/L6.
- **Raison** : `cfg!(dev)` est le signal **le plus sûr** (« pas en prod par construction ») ; l'override
  env donne la **souplesse démo** sans jamais ouvrir la porte en prod release. On **n'invente pas** un
  mécanisme maison (cohérent avec les flags mock existants).

### D2 — Idempotence & non-destructif : règles PRÉCISES par brique (le seed ne détruit jamais l'état réel)
Le seed est un **« créer si absent, ne jamais écraser »** strict. Règles **par brique** :

| Brique | Condition de seed | Garde anti-destruction |
|---|---|---|
| **Dossier démo** | seedé **uniquement si le dossier `<root>/iaka-demo` n'existe pas** | présent (même partiellement) → **on ne touche à rien**, pas de `git init` re-joué, pas d'écrasement de fichier |
| **git du dossier démo** | `git init` + 1 commit **uniquement si** `.git` absent dans le dossier démo | `.git` présent → **aucune** commande git destructive (jamais `reset`/`checkout`/`clean`) |
| **Clé config** (endpoint, modèle, URL CouchDB, support n8n…) | `config::set(k, v)` **uniquement si `config::get(k)` est `None` ou vide** | clé **déjà renseignée par l'utilisateur** → **laissée intacte** (le seed ne la relit ni ne la remplace) |
| **Onglets team** | ouverts **une seule fois par session**, **uniquement si aucun onglet n'est déjà ouvert** (`tabs.length === 0`) | onglets déjà présents (l'utilisateur a ouvert des projets) → **on ne redouble pas**, on n'ouvre rien |
| **Secrets keychain** | **JAMAIS seedés par défaut** (D6) | aucune écriture keychain par le seed (garde la plus stricte) |

- **Garde « actions destructives » (CLAUDE.md)** : le seed **n'efface, ne réinitialise, ne remplace**
  rien. En cas de doute (état ambigu) → **ne rien faire** (no-op silencieux), jamais détruire.
- **Idempotence vérifiable** : relancer l'app dev **deux fois** ne crée pas deux dossiers, ne re-commit
  pas, ne double pas les onglets, n'écrase aucune config. (Critère testable, § Critères.)
- **Raison** : c'est le cœur de la sûreté de ce lot. Un seed qui écrase la config réelle de Stéphane
  ou re-commit un dossier serait pire que pas de seed. « Créer si absent » est la seule sémantique sûre.

### D3 — Dossier démo : VRAI mini-repo git sous le chapeau, détecté par L1 (pas un mock)
- **Emplacement** : `<resolve_hat_root()>/iaka-demo` (le chapeau, surchargé par `IAKAFRAME_ROOT`). Sous
  le chapeau **par construction** → `scan_portfolio(root)` le **détecte comme un projet normal** (zéro
  code de détection à écrire) **et** le `cwd` PTY de la team est **validé** par `validate_cwd` (L1).
- **Contenu minimal** (rend les fonctions démontrables) :
  - `specs/PROJET.md` — vision courte du projet démo (quelques lignes : « projet de démonstration
    IakaCockpit, sert à montrer la chaîne L2→L6 »). **Donne du contexte à L3** (`build_context` lit
    `specs/PROJET.md`).
  - `specs/etat-des-lieux.md` — avec une **ligne `| Version | v0.1.0 |`** (pour que `read_version`
    affiche une version sur la tuile) + un état des lieux court (quelques lignes : ce qui est fait /
    à faire). **Donne du contexte à L3** (`build_context` lit `specs/etat-des-lieux.md`).
  - `README.md` — une phrase (« Dossier de démo généré par IakaCockpit en mode dev — non destructif »).
  - **(option non bloquante)** un fichier `notes.md` modifié-non-commité pour produire un état git
    `dirty`/`work pending` visible sur la tuile (illustre le statut). À l'appréciation de Gimli.
- **git réel** : `git init` puis `git add -A` puis `git commit -m "chore: seed projet de démo"` via le
  helper **`git::capture` existant** (binaire `git`, cross-OS, déjà éprouvé en L1). **Aucune
  dépendance nouvelle** (pas de `git2`). Si `git` est introuvable / l'init échoue → **dégrader
  proprement** (log, le dossier reste « hors git », pas de crash). Le commit a besoin d'une identité
  git : si `user.email`/`user.name` ne sont pas configurés globalement, **passer `-c user.email=... -c
  user.name=...`** à l'appel de commit (valeurs neutres type `demo@iakacockpit.local` / `IakaCockpit
  Demo`) pour ne pas dépendre de la config git globale de la machine.
- **Raison** : « VRAI dossier seedé » (décision arrêtée). Un mock ne donnerait pas de contexte réel à
  L3 ni de tuile portfolio réelle. Réutiliser `git::capture` respecte « réutiliser l'existant, pas de
  nouvelle dépendance ».

### D3-bis — Team : onglets PTY pré-ouverts `[ROYAUME][Agent]` (shells nus, PAS de runner)
- **AR-1 — TRANCHÉ par Stéphane (2026-06-26) : 5 agents** (sous-ensemble représentatif de la chaîne
  iakaframe), dans cet ordre :
  `[PORTEFEUILLE][Odin]`, `[ACCUEIL][Aragorn]`, `[CADRAGE][Gandalf]`, `[DEV][Gimli]`, `[QUALITÉ][Legolas]`.
  *(8 terminaux = lourd/peu lisible pour une démo ; ces 5 couvrent dispatch → cadrage → dev → qualité.)*
  La liste est une **constante** `DEMO_TEAM: &[(royaume, agent)]` (front ou Rust), facile à étendre si
  besoin futur — mais le périmètre L7 est **exactement ces 5**.
- **Un PTY par agent** : pour chaque entrée, ouvrir un **onglet** via `useGridState.openTab(id, title,
  cwd)` avec `title = "[ROYAUME][Agent]"`, `cwd = <dossier démo>`, puis `usePty.open(...)` (shell nu par
  OS, L1/L2). **Aucun agent réel lancé** — c'est un **shell interactif** dont l'onglet est **titré**
  comme un agent (mise en scène). Le titrage `[ROYAUME][Agent]` **réel** (lié au moteur d'agents +
  3-canaux) reste **DEP-2 depuis L2** ; ici on ne fait que **nommer l'onglet** (chaîne libre, déjà
  supporté par `PtyTab.title`).
- **« Linkés à Ollama »** = la **config IA pointe sur l'Ollama local** (D4) ; les shells ne « parlent »
  pas à Ollama eux-mêmes. **Aucun runner autonome** (explicitement hors lot).
- **Idempotence** : la team n'est ouverte **que si `tabs.length === 0`** au démarrage (D2), **une fois**
  par session (un `useRef`/garde de premier rendu). Re-render ≠ ré-ouverture.
- **Raison** : « team lancée = onglets PTY nommés, un shell par agent » (décision arrêtée). On réutilise
  intégralement la mécanique d'onglets PTY de L2. Sous-ensemble = MVP (moins de bruit, démontre quand
  même la team).

### D4 — Config par défaut : seed des clés NON SENSIBLES sur la stack Docker locale (créer si absent)
Seeder **uniquement** ces clés **non sensibles** (via `config::set` **si `get` est `None`/vide**, D2) :

| Clé config (existante) | Valeur seedée | Lot |
|---|---|---|
| `litellm_endpoint` | **`http://localhost:11434/v1`** *(Ollama HÔTE de Stéphane — AR-2 TRANCHÉ, pas le conteneur `:11435`)* | L3 |
| `litellm_model` | **`llama3.1:8b`** *(`DEFAULT_MODEL` existant — déjà `pull`é sur l'hôte, AR-2)* | L3 |
| `couchdb_url` | `http://localhost:5984` | L4 |
| `couchdb_db` | `conversations` | L4 |
| `n8n_webhook_url` | `http://localhost:5678/webhook/iakacockpit-adresse` | L6 |
| `n8n_active_support` | `slack` *(défaut existant `DEFAULT_SUPPORT`)* | L6 |
| `theme` | **non touché** (déjà `naonedge-dark` par défaut, posé par `main.tsx`) | L2 |
| `root` (chapeau) | **non touché** (déjà géré par `ensure_root`) | L1 |

- **Toutes ces clés sont non sensibles** : aucune ne matche `token\|key\|secret\|password` (vérifié —
  `is_secret` les laisse passer ; test de garde). **Aucun secret en SQLite/commit.**
- **AR-2 — TRANCHÉ par Stéphane (2026-06-26) : Ollama HÔTE (`http://localhost:11434/v1`) + `llama3.1:8b`.**
  La cible IA du seed est l'**`ollama serve` qui tourne sur la machine de Stéphane** (port hôte **11434**),
  où le modèle `llama3.1:8b` est **déjà `pull`é**. **PAS** le conteneur Docker `iakacockpit-dev-ollama`
  (`:11435`), **PAS** LiteLLM (`:4020`). C'est « mon Ollama local + le LLM défaut » au sens littéral. Pas
  de clé requise (en-tête `Authorization` omis, L3). **Dépendance** : la démo IA suppose l'Ollama **hôte**
  lancé (`ollama serve`) ; sinon L3 dégrade proprement (mock/erreur lisible) — cf. R-L7-9.
- **Raison** : `useSettings` relit `configAll` au montage → l'UI Réglages **affiche déjà** ces valeurs
  seedées, et L3/L4/L6 les **consomment côté Rust**. Zéro nouveau contrat. « Créer si absent » protège
  la config réelle de Stéphane.

### D5 — Frontière : où vit le seed ? Backend Rust (FS+git+config) + bootstrap front (onglets), via façade
Le seed se décompose en **deux responsabilités**, chacune chez le bon acteur :

- **(a) Backend Rust — `seed.rs` (nouveau module)** : ce qui touche **FS, git, config SQLite** (sous le
  chapeau, accès privilégié) :
  - `seed_demo(app) -> Result<SeedReport, String>` : **commande Tauri** unique, **idempotente**, qui
    (1) crée `<root>/iaka-demo` + fichiers + `git init/add/commit` **si absent** (D3), (2) seede les
    clés config **non sensibles si absentes** (D4). **Ne fait RIEN si `demo_seed_enabled()` est faux**
    (D1) — renvoie un `SeedReport { seeded: false, reason: "disabled" }`.
  - `SeedReport { seeded: bool, demo_path: Option<String>, created_dir: bool, config_keys_set:
    Vec<String> }` (sérialisé, pour que le front sache **quoi** ouvrir et **si** la team doit démarrer).
  - **Appelée au `setup()` de `lib.rs`** (après `ensure_root`) **OU** exposée comme commande appelée par
    le front au boot — **à arbitrer en implémentation** ; **reco** : commande Tauri appelée par le front
    au montage (le front a besoin du `SeedReport` pour ouvrir les onglets ; et une commande est testable
    et n'embarque pas de logique au démarrage silencieux). **Garde** : la commande **vérifie elle-même**
    `demo_seed_enabled()` → même appelée par erreur en prod, elle est **inerte**.
- **(b) Bootstrap front — hook `useDemoSeed` (nouveau)** : ce qui touche **les onglets PTY** (état UI) :
  - au montage de `App.tsx`, **une seule fois** : appelle `backend.seedDemo()` ; si `seeded:true` et
    `demo_path` présent et **`grid.tabs.length === 0`** → ouvre les **onglets team** (D3-bis) via
    `grid.openTab(...)` + `pty.open(...)`, `cwd = demo_path`, et **reste sur la vue Portfolio** (AR-4
    TRANCHÉ : on montre d'abord la **tuile démo**, l'utilisateur clique pour voir Working et ses onglets
    team). **Ne PAS** basculer automatiquement sur Working. Puis **rafraîchit le portfolio**
    (`portfolio.refresh()`) pour que la tuile `iaka-demo` apparaisse.
  - **I/O uniquement via `backend.ts`** : ajouter `seedDemo()` typé (+ type `SeedReport`) à la façade.
    **Aucun `invoke` hors façade** (D7 socle).
- **Raison** : FS/git/config = privilège Rust (cohérent avec `add_project`/`config`) ; onglets = état UI
  (cohérent avec `useGridState`/`usePty`). La façade reste l'unique pont. **Aucune** commande métier
  nouvelle au sens « capacité » — `seed_demo` est une **commande d'orchestration de démo**, bornée par
  le flag.

### D6 — Secrets : AUCUN secret seedé par défaut (le seed n'écrit jamais au keychain). [arbitrage AR-3]
- **Position fermée par défaut** : le seed **n'écrit AUCUN secret** au keychain. Les cibles de la stack
  démo **n'en exigent pas** pour le minimum vital :
  - **Ollama localhost** : **pas de clé** (en-tête `Authorization` omis, L3) → L3 marche sans secret.
  - **n8n** : le webhook peut être **sans Header Auth** en recette (token optionnel, L6) → L6 marche
    sans secret (mode mock si URL vide, sinon POST sans `X-API-Key`).
  - **CouchDB** : **demande** `admin:iaka-test` (Basic auth) → **sans identifiants au keychain, L4
    dégrade proprement** (erreur lisible + fallback mock). La main courante **affichera le mock** tant
    que l'utilisateur n'a pas saisi les identifiants → **acceptable pour une démo** (le mock 3-canaux
    est déjà une démo valable).
- **AR-3 — TRANCHÉ par Stéphane (2026-06-26) : NON.** Le seed **n'écrit AUCUN secret** au keychain, y
  compris **pas** l'identifiant CouchDB de test. La démo L4 passe par le **mock / fallback dégradé** de
  la main courante (déjà une démo valable des 3 canaux). L'utilisateur qui veut la démo CouchDB « réelle »
  saisit lui-même `admin:iaka-test` dans Réglages (write-only, L4) — **acte manuel, hors seed**.
  *(L'option « seeder l'identifiant de test au keychain sous flag » est **abandonnée** — non implémentée.)*
- **Raison** : « jamais de secret en SQLite/commit » + surface d'attaque **nulle**. Le mock 3-canaux
  démontre déjà L4 sans aucun secret. Le seed **n'appelle aucune** commande keychain.

### D7 — Façade & archi front : `seedDemo()` typé, hook dédié, pas de god-component (héritage D6/D7 L0)
- **`backend.ts`** : ajouter `seedDemo(): Promise<SeedReport>` + le type `SeedReport` (miroir snake_case
  de la struct Rust). L'exposer dans l'objet `backend`. **Aucun `invoke` hors façade.**
- **`useDemoSeed` (nouveau hook)** : porte la logique de bootstrap démo (appel `seedDemo`, ouverture des
  onglets si conditions D2/D3-bis réunies, refresh portfolio). **Un seul effet, gardé par un `useRef`**
  (exécution unique par session). I/O **uniquement** via `backend.ts` + les hooks `useGridState`/`usePty`
  reçus en paramètre (ou consommés). `App.tsx` **câble** ce hook, ne porte pas la logique.
- **Constante team** : `DEMO_TEAM` (liste `[ROYAUME, Agent]`) dans un module clair (`src/mock/` ou
  `src/hooks/`), **isolée et marquée** « mise en scène démo — pas un runner ». Facile à étendre (5→8).
- **Raison** : héritage strict L0/L2 (hooks séparés, façade unique, pas d'état métier dans `App.tsx`).

### D8 — Qualité, tests & couverture honnête (héritage L0→L6)
- `scripts/quality.sh` reste la porte : typecheck + ESLint + vitest + `cargo fmt --check` + `cargo
  clippy --all-targets -- -D warnings` + `cargo test`, **tout vert**.
- **Tests Rust** (logique pure + idempotence, **sans réseau, sans dépendre du profil de compilation**) :
  - `demo_seed_enabled()` : branche **env** testable (`IAKACOCKPIT_DEMO_SEED=1` → vrai ; absent + pas
    `cfg!(dev)` → faux). La branche `cfg!(dev)` est documentée (vraie en `tauri dev`).
  - **seed config non destructif** : sur une base SQLite mémoire, une clé **déjà posée** par
    « l'utilisateur » **n'est pas écrasée** ; une clé **absente** est posée à la valeur attendue.
  - **clés seedées non sensibles** : aucune des clés D4 ne matche `is_secret` (test de garde, calque
    L3/L4/L6).
  - **création dossier idempotente** : la fonction de création du dossier démo (logique pure testable
    avec un `tempdir`) **ne recrée rien** si le dossier existe, et **ne re-`git init`** pas si `.git`
    existe (vérifiable via un faux `.git` ou un git réel selon faisabilité ; sinon tester la **garde de
    présence** isolément).
  - `SeedReport` reflète fidèlement ce qui a été fait (created_dir true/false, config_keys_set).
- **Tests front (vitest)** : `useDemoSeed` (avec `backend.seedDemo` mocké) — ouvre les onglets **une
  seule fois**, **ne les ouvre pas** si `tabs.length > 0`, **ne fait rien** si `seeded:false` ; façade
  `seedDemo` appelle la bonne commande. `DEMO_TEAM` produit des titres `[ROYAUME][Agent]` bien formés.
- **Couverture honnête** : le `git init/commit` réel et l'ouverture PTY réelle **ne sont pas couverts
  unitairement** (assumés, testés à la main au gate dans `tauri dev`) ; on teste **la logique de garde,
  l'idempotence config, le non-écrasement, le flag, le bootstrap front**. Rapporter le **chiffre réel**.

---

## Périmètre

### Inclus (L7 strict)
- **Flag dev** : `demo_seed_enabled()` (`cfg!(dev)` OU `IAKACOCKPIT_DEMO_SEED=1`) — **zéro seed en prod**.
- **Backend `seed.rs`** : commande `seed_demo(app)` idempotente/non destructive →
  - crée `<root>/iaka-demo` (`specs/PROJET.md` + `specs/etat-des-lieux.md` avec ligne version + README)
    **si absent**, `git init`/`add`/`commit` via `git::capture` **si `.git` absent** ;
  - seede les clés config **non sensibles** (D4) **si absentes** ;
  - renvoie `SeedReport`. **Inerte si flag off.**
- **Façade** : `seedDemo()` + type `SeedReport` dans `backend.ts` (unique `invoke`).
- **Bootstrap front** : hook `useDemoSeed` — appelle `seedDemo`, ouvre les **onglets team**
  `[ROYAUME][Agent]` (sous-ensemble, AR-1) **si `tabs.length === 0`**, refresh portfolio. Constante
  `DEMO_TEAM`. Exécution **unique** par session.
- **Tests** : Rust (flag, idempotence config, non-écrasement, garde non sensible, idempotence dossier) +
  front (`useDemoSeed`, façade, titres team) ; chaîne qualité verte ; couverture honnête.
- **Backlog** : entrée L7 ajoutée à `CLAUDE.md`.

### Exclu (explicitement HORS L7 — autres lots / horizon)
- **Runner d'agent autonome** (un agent qui exécute réellement dans le shell) → **OUT** (hors lot,
  décision arrêtée). Les onglets team sont des **shells nus titrés**, pas des agents lancés.
- **Seed en PROD** → **interdit** (D1). Aucun faux projet, aucune config, aucun onglet en build release
  sans flag.
- **Écrasement de config / état utilisateur** → **interdit** (D2). « Créer si absent » uniquement.
- **Secrets seedés** → **OUT** (D6, AR-3 TRANCHÉ NON). Le seed **n'écrit aucun secret** au keychain, y
  compris pas l'identifiant CouchDB de test. La démo L4 passe par le mock/fallback.
- **Seed CouchDB / n8n côté serveur** : déjà couvert par `docker/init-couchdb.sh` (docs CouchDB) et
  `docker/n8n/README.md` (import workflow). **L7 ne réécrit pas** ces scripts ; il **pointe** dessus via
  la config. *(Si la démo CouchDB « réelle » est voulue, l'opérateur lance `init-couchdb.sh` — hors
  code Cockpit.)*
- **Titrage `[ROYAUME][Agent]` RÉEL lié au moteur d'agents + 3-canaux** (état working/pending/stopped) →
  reste **DEP-2** depuis L2 ; L7 ne **nomme** que l'onglet (chaîne libre).
- **Nouveau métier / nouvelle commande capacité** → **OUT**. `seed_demo` est une orchestration de démo
  bornée par le flag, pas une capacité produit.
- **Réplique de la box réelle (`.11`)** → hors lot ; le seed pointe sur l'**Ollama HÔTE** (`:11434`) pour
  l'IA et sur la **stack Docker locale** (CouchDB `:5984`, n8n `:5678`) pour L4/L6, pas sur le LAN iakabox.
- **Push / CI Forgejo** → différé (box offline) ; **commits locaux atomiques** uniquement.

> **Garde Aragorn (R1 roadmap)** : tout élément DIFFÉRÉ/ANNULÉ/HORS-SCOPE **ne rentre pas** en L7 par
> effet de bord. En cas de doute, **remonter à Stéphane** avant d'élargir.

---

## Contrats d'API (commande Tauri ↔ façade `backend.ts`)

```rust
// Rust — seed.rs. Orchestration de démo, bornée par demo_seed_enabled() (D1).
// Idempotente, non destructive (D2). AUCUN appel réseau, AUCUN secret écrit (D6).
#[derive(Serialize, Clone, Debug)]
pub struct SeedReport {
    pub seeded: bool,                  // false si flag off (inerte)
    pub demo_path: Option<String>,     // chemin du dossier démo (pour ouvrir la team)
    pub created_dir: bool,             // true si le dossier a été créé ce run (false si déjà là)
    pub config_keys_set: Vec<String>,  // clés config réellement posées ce run (vide si déjà présentes)
}
#[tauri::command]
pub fn seed_demo(app: AppHandle) -> Result<SeedReport, String>
```
```ts
// backend.ts
export interface SeedReport {
  seeded: boolean;
  demo_path: string | null;
  created_dir: boolean;
  config_keys_set: string[];
}
export function seedDemo(): Promise<SeedReport>;
```

> Réutilise **intégralement** les commandes existantes pour la team côté front :
> `grid.openTab(projectId, "[ROYAUME][Agent]", demo_path)` + `pty.open(id, demo_path, cols, rows)`
> (L1/L2). **Aucune** nouvelle commande PTY/portfolio/config.

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src-tauri/src/
│  ├─ seed.rs            # NOUVEAU : demo_seed_enabled() (cfg!(dev)||env), seed_demo (dir+git+config),
│  │                     #           SeedReport, idempotence/non-destructif, tests (#[cfg(test)])
│  ├─ lib.rs             # MODIF : `mod seed;` + seed::seed_demo dans generate_handler!
│  ├─ git.rs · config.rs · db.rs · paths.rs · portfolio.rs · terminal.rs   # RÉUTILISÉS (non modifiés)
│  └─ (PAS de nouvelle dépendance Cargo : git via git::capture, pas de git2)
├─ src/
│  ├─ api/backend.ts     # MODIF : + seedDemo() + type SeedReport (exposé dans `backend`)
│  ├─ hooks/useDemoSeed.ts   # NOUVEAU : bootstrap démo (seedDemo → onglets team si tabs vide → refresh)
│  ├─ App.tsx            # MODIF (léger) : câble useDemoSeed (passe grid/pty/portfolio) — pas de logique inline
│  ├─ mock/demoTeam.ts (ou hooks/)   # NOUVEAU : constante DEMO_TEAM [ROYAUME,Agent] (marquée « mise en scène »)
│  └─ __tests__/         # NOUVEAU/MODIF : useDemoSeed.test.ts + backend.seedDemo mockée + titres team
├─ specs/instructions/L7-seed-demo-dev.md   # CE fichier
└─ CLAUDE.md             # MODIF : entrée L7 au backlog
```

> **Aucune dépendance ajoutée** (Rust : `git::capture` existant ; front : aucune). **Aucune** modif de
> la CSP. Si un crate/commande manque, **le signaler avant** (pas d'ajout silencieux — règle L0→L6).

---

## Critères d'acceptation (vérifiables)

- [ ] **Zéro seed en prod** : un build release (`tauri build`, **sans** `IAKACOCKPIT_DEMO_SEED`) →
      `seed_demo` est **inerte** (`SeedReport { seeded:false, reason disabled }`), **aucun** dossier
      `iaka-demo` créé, **aucune** clé config posée, **aucun** onglet team. Vérifié par test (branche env
      off + pas `cfg!(dev)`) + revue.
- [ ] **Seed actif en dev** : en `npm run tauri dev` (ou `.dmg` avec `IAKACOCKPIT_DEMO_SEED=1`), au 1er
      lancement : le dossier `<root>/iaka-demo` existe (git réel, 1 commit, `specs/PROJET.md` +
      `specs/etat-des-lieux.md` avec ligne version), apparaît comme **tuile portfolio** (détecté par
      `scan_portfolio`), les **clés config D4** sont posées (visibles dans Réglages : `litellm_endpoint`
      = `http://localhost:11434/v1`, `litellm_model` = `llama3.1:8b`), et les **5 onglets team**
      `[ROYAUME][Agent]` (Odin/Aragorn/Gandalf/Gimli/Legolas) sont ouverts (un shell par agent, `cwd` =
      dossier démo). L'app démarre sur **Portfolio** (AR-4).
- [ ] **Idempotent** : relancer l'app dev **une 2ᵉ fois** → **aucun** nouveau dossier, **aucun**
      re-commit, **aucun** doublon d'onglet, **aucune** config réécrite (`created_dir:false`,
      `config_keys_set` vide). Vérifié à la main + test de garde.
- [ ] **Non destructif (config)** : une clé D4 **déjà saisie par l'utilisateur** (ex. `litellm_endpoint`
      modifié) **n'est PAS écrasée** par le seed. Couvert par test (clé présente → `set` non appelé).
- [ ] **Non destructif (dossier/git)** : si `iaka-demo` existe déjà (même partiel), le seed **ne touche
      à rien** ; si `.git` existe, **aucune** commande git destructive n'est jouée.
- [ ] **Aucun secret seedé** (D6, AR-3 TRANCHÉ NON) : grep → le seed **n'appelle AUCUNE** commande
      keychain (`ai_set_key`/`couch_set_credentials`/`n8n_set_token`) ; `config_all` n'expose aucune clé
      secrète ; les clés D4 ne matchent **pas** `is_secret`. La démo L4 repose sur le mock/fallback.
- [ ] **Façade unique** : grep → **aucun** `invoke(` hors `src/api/backend.ts` ; `seedDemo` typée ;
      `SeedReport` miroir. **Aucun** appel réseau ajouté ; CSP **non touchée** (jamais `null`).
- [ ] **Réutilisation (pas de réimplémentation)** : grep → le seed **n'a pas** de scan portfolio maison
      (réutilise `scan_portfolio`), **pas** de PTY maison (réutilise `pty_open`/`openTab`), **pas** de
      schéma SQLite maison (réutilise `config`), **pas** de `git2` (réutilise `git::capture`).
- [ ] **Onglets team (unicité)** : la team n'est ouverte **que si `tabs.length === 0`** et **une seule
      fois** par session (garde `useRef`) ; titres `[ROYAUME][Agent]` bien formés (royaume MAJUSCULE).
- [ ] **Dégradation propre** : si `git` est absent / l'init échoue, le dossier reste « hors git » sans
      crash ; si la stack Docker est down, le seed **écrit quand même** les URLs (non sensibles, sans
      les contacter) et L3/L4/L6 dégradent comme déjà spécifié. Le seed **ne fait aucun appel réseau**.
- [ ] **Tests** : Rust (flag env, idempotence config, non-écrasement, garde non sensible, idempotence
      dossier, `SeedReport`) + front (`useDemoSeed` : ouverture unique / pas si tabs>0 / rien si
      seeded:false ; façade) ; `npm run test` + `cargo test` **verts**.
- [ ] **Build & qualité verts** : `npm run typecheck` 0 err, `npm run lint` 0 err, `npm run build` OK,
      `cargo fmt --check`/`clippy --all-targets -- -D warnings`/`cargo test` verts ;
      `bash scripts/quality.sh` **en succès**. `npm run tauri build` OK (et **prouve** zéro seed en prod).
- [ ] **Couverture honnête** : `cargo test`/`npm run test:coverage` rapportent le **chiffre réel** ;
      git/PTY réels assumés non couverts unitairement (testés à la main au gate), sans gonflage.
- [ ] **Aucun élément OUT livré** : pas de runner d'agent, pas de seed en prod, pas d'écrasement, **aucun**
      secret seedé (AR-3 NON), pas de nouvelle capacité métier. (Revue de scope au gate.)
- [ ] **Backlog** : `CLAUDE.md` porte l'entrée L7.
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ; module +
      ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L7-1 — Seed qui s'active en prod** (CRITIQUE). Un flag mal posé → faux projet/config en build
  release. *Mitigation* : D1 `cfg!(dev)` (faux par construction en release) ; `seed_demo` **revérifie**
  le flag (inerte même si appelée par erreur) ; critère grep + test + revue au gate ; `tauri build`
  prouve l'inertie.
- **R-L7-2 — Seed destructif (écrase la config/le dossier réel de Stéphane)** (CRITIQUE). *Mitigation* :
  D2 « créer si absent » strict, par brique ; aucune commande git destructive ; tests de non-écrasement ;
  garde « actions destructives » CLAUDE.md (en cas d'ambiguïté → no-op).
- **R-L7-3 — Scope-creep vers un runner d'agent**. La « team lancée » pourrait glisser vers « lancer
  vraiment les agents ». *Mitigation* : D3-bis fixe **shells nus titrés** ; runner = OUT explicite ;
  garde Aragorn.
- **R-L7-4 — Réimplémentation de l'existant** (scan/PTY/config/git refaits « pour la démo »).
  *Mitigation* : D5 réutilise `scan_portfolio`/`openTab`/`config`/`git::capture` ; critère grep
  anti-réimplémentation ; pas de `git2`.
- **R-L7-5 — Secret seedé par mégarde**. *Mitigation* : D6 (AR-3 TRANCHÉ NON — **aucun** secret seedé,
  pas même l'identifiant CouchDB de test) ; le seed n'appelle **aucune** commande keychain ; critère
  grep + garde `is_secret` testée.
- **R-L7-6 — Mauvaise cible IA** (pointer le **conteneur Docker `:11435`** au lieu de l'**Ollama HÔTE
  `:11434`** de Stéphane). Pour CE seed, **`localhost:11434/v1` est l'intention** (AR-2 TRANCHÉ) — c'est
  « son Ollama local ». *Mitigation* : table D4 explicite (`litellm_endpoint = http://localhost:11434/v1`,
  `litellm_model = llama3.1:8b`) ; constante documentée ; revue au gate (grep d'un `:11435` erroné dans
  le seed IA). *(CouchDB `:5984` / n8n `:5678` = stack Docker locale, ports vérifiés dans
  `docker-compose.yml`.)*
- **R-L7-7 — Onglets team doublés / fuites PTY** (re-render ouvre N fois). *Mitigation* : D3-bis garde
  `tabs.length === 0` + `useRef` d'exécution unique ; `usePty` gère déjà le nettoyage (R-L2-4).
- **R-L7-8 — Commit git sans identité** (machine sans `user.email`/`user.name` git global). *Mitigation* :
  D3 passe `-c user.email=... -c user.name=...` au commit (valeurs neutres), pas de dépendance à la
  config git globale.
- **R-L7-9 — Ollama hôte non lancé** (`ollama serve` arrêté). Le modèle `llama3.1:8b` est **déjà
  `pull`é côté hôte** (AR-2 confirmé par Stéphane) → le **risque modèle est levé** ; reste la dépendance
  que le **service Ollama hôte tourne** (`ollama serve` sur `:11434`). *Mitigation* : le seed **écrit la
  config** (non bloquant, aucun appel réseau) ; si l'hôte est éteint, **L3 dégrade proprement** (mock /
  erreur lisible) — la démo reste utilisable. Lancer `ollama serve` est un acte d'opérateur, hors code.
- **Limite box / stack** : l'IA pointe l'**Ollama HÔTE** (`:11434`), CouchDB/n8n la **stack Docker
  locale** (pas la box `.11`). La démo « réelle » suppose : Ollama hôte UP (IA réelle), stack UP +
  `init-couchdb.sh` (main courante réelle L4), workflow n8n importé/actif (canal adresse réel L6). À
  défaut, chaque brique **dégrade** (mock/erreur lisible) — la démo reste **utilisable** (tuile démo +
  onglets team + UI configurée).

---

## Points ouverts & dépendances

### Arbitrages — **TOUS TRANCHÉS par Stéphane (2026-06-26)**
- **AR-1 — Agents/onglets team → TRANCHÉ : 5 agents** :
  `[PORTEFEUILLE][Odin]`, `[ACCUEIL][Aragorn]`, `[CADRAGE][Gandalf]`, `[DEV][Gimli]`, `[QUALITÉ][Legolas]`.
  Constante `DEMO_TEAM`. Gravé en D3-bis.
- **AR-2 — Endpoint IA seedé → TRANCHÉ : Ollama HÔTE de Stéphane** (`http://localhost:11434/v1`) +
  modèle **`llama3.1:8b`** (déjà `pull`é sur l'hôte). **PAS** le conteneur Docker `:11435`, **PAS**
  LiteLLM `:4020`. C'est « mon Ollama local + le LLM défaut ». Gravé en D4 + R-L7-6/R-L7-9.
- **AR-3 — Secret CouchDB au keychain → TRANCHÉ : NON.** Le seed n'écrit **aucun** secret ; la démo L4
  passe par le mock/fallback. L'option « seeder l'identifiant de test » est **abandonnée**. Gravé en D6.
- **AR-4 — Vue de démarrage → TRANCHÉ : Portfolio** (montrer la tuile démo d'abord ; pas de bascule auto
  sur Working). Gravé en D5.

### Dépendances ouvertes (signalées, non comblées en L7)
- **DEP-1 — Titrage `[ROYAUME][Agent]` réel + état working/pending/stopped** → suppose le moteur
  d'agents + 3-canaux (DEP-2 depuis L2). L7 ne **nomme** que l'onglet.
- **DEP-2 — Démo « réelle » des services** → suppose des actes d'opérateur : **Ollama hôte lancé**
  (`ollama serve` — modèle `llama3.1:8b` déjà `pull`é) pour l'IA ; `init-couchdb.sh` pour la main
  courante L4 ; import + activation du workflow n8n pour le canal adresse L6. Hors code Cockpit ;
  documenté. À défaut, chaque brique dégrade (mock/erreur lisible).

---

## Notes pour Gimli

- **Réutilise tout, ne réinvente rien.** Le dossier démo devient un projet **parce qu'il est sous le
  chapeau** (`scan_portfolio` le voit) ; la team **réutilise** `openTab` + `pty.open` ; la config
  **réutilise** `config::get/set` ; le git **réutilise** `git::capture`. **Pas de `git2`, pas de scan
  maison, pas de PTY maison.**
- **Le flag est sacré (R-L7-1).** `demo_seed_enabled()` = `cfg!(dev) || env("IAKACOCKPIT_DEMO_SEED")=="1"`.
  `seed_demo` **revérifie** le flag en première ligne → inerte si off. `tauri build` release doit
  **prouver** zéro seed.
- **« Créer si absent » partout (R-L7-2).** Dossier : si présent → no-op. git : si `.git` → no-op.
  Config : si `get(k)` non vide → **ne pas** `set`. Onglets : si `tabs.length>0` → **ne pas** ouvrir.
  Jamais de commande git destructive. En cas de doute → **no-op**, jamais détruire.
- **Aucun secret seedé** (D6, AR-3 TRANCHÉ NON) : le seed **n'appelle aucune** commande keychain
  (`ai_set_key`/`couch_set_credentials`/`n8n_set_token`). La démo L4 passe par le mock/fallback.
- **`backend.ts` est sacré** (D7) : `seedDemo` typée, aucun `invoke` ailleurs, CSP non touchée, aucun
  appel réseau ajouté (le seed n'en fait aucun).
- **Onglets une seule fois** : garde `useRef` dans `useDemoSeed` + condition `tabs.length===0`. Évite
  les doublons au re-render (R-L7-7).
- **Avant de clore** : `bash scripts/quality.sh` en entier ; greps toi-même (`invoke` hors façade,
  `git2`, scan/PTY maison, **commande keychain dans le seed** = doit être absente, **un `:11435`/`:4020`
  erroné dans le seed IA** = la cible est l'Ollama hôte `:11434`) ; vérifie chaque case des Critères.
  Lance `npm run tauri build` pour **prouver** l'inertie en prod. Rapporte la couverture réelle sans la
  maquiller.
- **AR-1..AR-4 sont TRANCHÉS** (5 agents incluant Aragorn ; Ollama hôte `:11434` + `llama3.1:8b` ; aucun
  secret seedé ; démarrage sur Portfolio) : **applique-les tels quels**, ne rouvre pas ces choix.
- **Gate Legolas obligatoire** après L7 (anti « Gimli solo ») : il auditera **zéro seed en prod** (flag),
  **non-destruction/idempotence** (config + dossier + onglets), **aucun secret seedé**, **réutilisation**
  (pas de réimplémentation), façade unique, CSP intacte, couverture honnête. Ne t'auto-valide pas.

---

## Estimation (à l'entrée du jalon de dev — règle de méthode)

- **Charge** : **~1,5 à 2,5 j-homme**. Le code est **petit et très balisé** : le backend `seed.rs`
  réutilise des briques mûres (config/git/paths déjà testés), les patrons de flag (`should_mock` ×3) et
  d'idempotence sont **déjà éprouvés** ; le bootstrap front `useDemoSeed` est un hook simple par-dessus
  `useGridState`/`usePty`/`usePortfolio` existants. ~1 j de code + ~0,5–1,5 j de tests (idempotence,
  non-destruction, flag) + mise au point manuelle en `tauri dev` (la team qui s'ouvre, la tuile démo).
- **Complexité** : **faible côté code** (orchestration de l'existant, zéro nouveau métier, zéro
  dépendance). **Le point délicat est la SÛRETÉ** (non-destruction + zéro prod), pas la difficulté
  technique — d'où la densité des tests de garde.
- **Risque / inconnues** :
  - **Sûreté du flag (R-L7-1)** : critique mais **maîtrisée** (`cfg!(dev)` faux par construction en
    release + revérif dans la commande + preuve par `tauri build`). Inconnue faible.
  - **Identité git du commit (R-L7-8)** : machines sans `user.*` git global → `-c` au commit. Détail
    d'impl, mitigé.
  - **Modèle Ollama démo (R-L7-9)** : config écrite non bloquante ; `ollama pull` = acte opérateur. Hors
    code. Inconnue **côté config**, pas côté app.
  - **Arbitrages AR-1..AR-4** : impact mineur sur le périmètre code (une constante, un endpoint, un
    booléen keychain, une ligne de vue).
- **Verdict** : lot **court et peu risqué côté code**, dont la **valeur de garde** (idempotence,
  non-destruction, zéro prod) justifie l'essentiel de l'effort de test. **Estimation : ~2 j-homme** en
  cible médiane.

---

## Sources (faits vérifiés sur le web, 2026-06-26)
- **Détection du profil dev côté Rust dans Tauri 2** (`cfg!(dev)` = lancé via `tauri dev` ;
  `tauri::is_dev()` / `cfg!(debug_assertions)` = debug, incluant `tauri build --debug`) :
  [Debug — Tauri v2](https://v2.tauri.app/develop/debug/) ·
  [tauri-docs Debug (GitHub, v2)](https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/develop/Debug/index.mdx)
- **git init + premier commit programmatique** (le projet **shell-out** déjà via `git::capture` — pas de
  `git2` introduit ; init crée un dépôt vide → add + commit à la charge de l'appelant) :
  [git-init — git-scm](https://git-scm.com/docs/git-init) ·
  [git2-rs init example (alternative écartée)](https://github.com/rust-lang/git2-rs/blob/master/examples/init.rs)
- **Réfs internes** : `src-tauri/src/{paths,config,db,git,portfolio,terminal,ai,maincourante,notify}.rs`
  (briques réutilisées) ; `src/api/backend.ts` (façade) ; `src/hooks/{useGridState,usePty,useSettings,
  usePortfolio}.ts` ; `docker/docker-compose.yml` (ports stack projet) + `docker/init-couchdb.sh` +
  `docker/n8n/README.md` ; `specs/instructions/{L1,L2,L3,L4,L6}-*.md` (patrons flag/idempotence/façade) ;
  `CLAUDE.md` (archi D7, socle L0, conventions).
```
