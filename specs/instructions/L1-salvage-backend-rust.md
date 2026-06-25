# Instruction : L1 — Salvage du backend Rust iakaIDE (dé-Windows-isé)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Lot métier #1** de MOVE 3 (dev), juste après le socle L0 (PASS Legolas, 27/27 tests Rust).
> Réf. : `specs/PROJET.md` § 3.4 (salvage) + § 9 (scope v0.1 signé), `specs/roadmap.md` § L1,
> `specs/instructions/L0-bootstrap-securite.md` (socle posé). Code source iakaIDE inspecté en
> lecture seule le 2026-06-25 (cf. § « Ce qui existe »). Faits vérifiés sur le web (cf. § Sources).

---

## Objectif

**Récupérer et dé-Windows-iser** les commandes Rust **saines et éprouvées** d'iakaIDE qui
constituent le socle métier du Cockpit — **scan git, portfolio, services, config, PTY cross-OS** —
en les **branchant sur le socle L0 déjà posé** (`paths`, `shell`, `pathguard`, `secrets`,
`config`) plutôt qu'en recopiant la dette. À la fin de L1, **le backend Tauri expose un jeu de
commandes `invoke` métier testées et cross-OS**, la façade front `src/api/backend.ts` les déclare
avec leurs types TypeScript, et la chaîne qualité (`scripts/quality.sh`) est verte.

**L1 = salvage, PAS réécriture from scratch.** La logique métier d'iakaIDE est neutre et a tourné
en réel ; on la **transpose** en corrigeant deux choses seulement : (a) la **dé-Windows-isation**
(plus de `cmd /C`, plus de `powershell.exe` en dur, plus de `"C:\\work"`), (b) le **branchement
sur les modules L0** (résolution du chapeau, shell par OS, garde-fou de chemins, config SQLite
non sensible). **Aucune UI** en L1 (le front réel est L2). **Aucun moteur IA** (L3), **aucune
main courante** (L4).

---

## Contexte

iakaIDE (`/Users/sjupin/work/iakaIDE`) porte un backend Rust de **27 commandes Tauri**. La
roadmap (§ L1) ne salvage **qu'un sous-ensemble** en L1 — celui qui sert le MVP chapeau-rooted :
**scan git, portfolio, PTY, services, config**. Le reste est soit reporté à un lot ultérieur
(L2/L3/L4), soit relève de l'horizon (cf. § Périmètre OUT pour le tri commande par commande).

**Le socle L0 est déjà en place** dans `src-tauri/src/` et **doit être réutilisé**, pas
réinventé :

| Module L0 | Ce qu'il fournit | À utiliser en L1 pour… |
|---|---|---|
| `paths::resolve_hat_root()` | racine chapeau cross-OS (`IAKAFRAME_ROOT` → `<home>/work`) | remplacer `const DEFAULT_ROOT = "C:\\work"` |
| `shell::default_shell() -> ShellSpec` + `to_command()` | shell par OS (pwsh/powershell ; `$SHELL`/zsh/bash) en `portable_pty::CommandBuilder` | remplacer `CommandBuilder::new("powershell.exe")` |
| `pathguard::safe_path` / `safe_project_dir` | anti-traversal testé | sécuriser tout accès FS sous le chapeau |
| `secrets::SecretStore` / `KeyringStore` | coffre natif (keychain) | (réservé L3 ; pas de secret manipulé en L1) |
| `config::{init_schema,get,set,ensure_root}` + `KEY_*` | SQLite clé/valeur **non sensible** | remplacer le `open()/set_kv()` ad-hoc d'iakaIDE |

**Réseau / box.** L1 est **faisable hors box** (roadmap § Plan offline) : le salvage lit le code
iakaIDE **local**, les tests de portabilité tournent en local, **aucune dépendance réseau IA**.
`services::check_services` fait des connexions TCP au LAN iakabox — **injoignables hors box** ;
le test associé doit **dégrader proprement** (cf. R-L1-5). Push différé (commits locaux atomiques).

---

## Ce qui existe (référence iakaIDE, lecture seule — TRANSPOSER, ne pas copier la dette)

Chemins relatifs à `/Users/sjupin/work/iakaIDE/src-tauri/src/`. Les `invoke_handler!` d'iakaIDE
listent les 27 commandes (`lib.rs:22-48`).

| Fichier iakaIDE | Commande(s) | Statut L1 | Dette à corriger |
|---|---|---|---|
| `portfolio.rs` | `scan_portfolio(root)` | **SALVAGE L1** | aucune (déjà cross-OS ; chemins via `Path`) — brancher sur `paths` pour le défaut |
| `git.rs` | helper `capture` / `run` (pas une commande) | **SALVAGE L1** | aucune — déjà neutre (`git -C <dir>`) ; pierre angulaire de portfolio/recent/commits |
| `services.rs` | `check_services()` | **SALVAGE L1** | endpoints `.11/.12` codés en dur (MVP toléré ; à laisser configurable plus tard) |
| `config.rs` | `get_root`, `set_root`, `config_get`, `config_set`, `config_all` | **SALVAGE L1 (refactor)** | `const DEFAULT_ROOT = "C:\\work"` (l.9) → `paths::resolve_hat_root()` ; `open()`/`set_kv()` ad-hoc → réutiliser le module L0 `config` |
| `terminal.rs` | `pty_open`, `pty_write`, `pty_resize`, `pty_close` | **SALVAGE L1** | `CommandBuilder::new("powershell.exe")` (l.37) → `shell::default_shell()` ; `cwd` à valider sous le chapeau |
| `recent.rs` | `recent_work(root, days)` | **OUT → L2** (alimente le dashboard « travail récent ») | — |
| `commits.rs` | `commit_all(path, message)` | **OUT → L2** (action depuis le dashboard) | — |
| `gates.rs` | `pending_gates(root)` | **OUT → L2** (widget jalons) | — |
| `ai.rs` | `next_step(path, provider, model)` | **OUT → L3** (via LiteLLM, jamais `cmd /C claude`) | `cmd /C` Windows (l.67-68), endpoints en dur |
| `teams.rs`, `method_docs.rs`, `themes.rs`, `project_config.rs`, `agents_assets.rs`, `iakaframe.rs`, `voice.rs` | divers | **OUT → horizon / autre lot** | hors scope v0.1 (suite admin, portraits, CLI, vocal) |

> **Règle L1** : on **regarde** iakaIDE pour la logique métier, on **transpose proprement** sur le
> socle L0. On **n'importe aucun fichier tel quel** (chaque fichier salvagé doit être relu et
> rebranché). La logique pure éprouvée (parsing `ahead/behind`, lecture version, tri portefeuille)
> est conservée **avec ses tests** (les tests d'iakaIDE sont un bon point de départ à reprendre).

---

## Décisions (numérotées)

### D1 — Périmètre des commandes salvagées en L1 (exactement 10)
Salvager **exactement** ces commandes, et pas d'autres :
- **Portfolio / git** : `scan_portfolio(root) -> Vec<Project>` (+ helper interne `git::capture`).
- **Services** : `check_services() -> Vec<ServiceStatus>`.
- **Config** : `get_root`, `set_root`, `config_get`, `config_set`, `config_all`.
- **PTY** : `pty_open`, `pty_write`, `pty_resize`, `pty_close` (+ état `TermState` managé).

**Raison** : c'est le sous-ensemble exact « scan git / portfolio / PTY / services / config » signé
en roadmap § L1. Tout le reste (recent, commits, gates, next_step, teams…) est tenu **dehors** pour
éviter le scope-creep (R1 roadmap) et garder L1 court et gatable.

### D2 — Config : un seul module SQLite (réutiliser L0, supprimer le doublon)
- Les commandes `get_root/set_root/config_get/config_set/config_all` s'appuient sur le **module L0
  `config`** (`init_schema`, `get`, `set`, `ensure_root`, `KEY_ROOT/KEY_THEME/KEY_LITELLM_ENDPOINT`).
  **Ne pas** recréer le `open()`/`db_path()`/`set_kv()` ad-hoc d'iakaIDE.
- `get_root` retourne `config::ensure_root(&conn)` (défaut **calculé** par OS via `paths`, jamais
  `"C:\\work"`). `set_root` écrit via `config::set(conn, KEY_ROOT, ...)`.
- `config_all` **exclut les secrets** : reprendre le filtre `is_secret(key)` d'iakaIDE
  (`config.rs:68`) — clés contenant `token|key|secret|password` jamais renvoyées en bloc.
  **Raison** : cloisonnement déjà relevé par l'audit iakaIDE ; aucun secret ne transite par la
  config de toute façon (les secrets vont au keychain, L3).
- **Nom de fichier DB** : `iakacockpit.sqlite` (pas `iakaide.sqlite`), sous `app_data_dir`.
- **Ouverture de connexion** : un helper d'app (ex. `db::open(app) -> Connection`) qui appelle
  `config::init_schema`. À l'initialisation de l'app (`run()`), appeler `ensure_root` une fois
  pour garantir une racine persistée.

### D3 — PTY : shell par OS via le socle L0, plus jamais `powershell.exe` en dur
- `pty_open` **remplace** `CommandBuilder::new("powershell.exe")` par
  `shell::default_shell().to_command()` (socle L0). Le shell est ainsi **pwsh/powershell** sur
  Windows, **`$SHELL`/zsh/bash** sur macOS/Linux — la dé-Windows-isation est gravée.
- **`cwd` sécurisé** : si `cwd` est fourni, il **doit rester sous le chapeau**. Valider avec
  `pathguard`/`paths` avant de le passer à `CommandBuilder::cwd` ; un `cwd` qui s'évade → `Err`.
  **Raison** : un PTY est un vecteur d'exécution arbitraire ; on n'ouvre pas une session hors du
  périmètre chapeau. (iakaIDE ne validait pas le `cwd` — dette corrigée.)
- **Contrats d'événements conservés** : streaming via `app.emit("pty://output/{id}", String)` et
  fermeture via `app.emit("pty://closed/{id}", ())`. **Documenter ces noms d'événements** (le front
  L2 s'y abonnera).
- **État** : `TermState(Mutex<HashMap<String, Session>>)` managé par `tauri::Builder::manage(...)`
  (comme iakaIDE `lib.rs:21`). Une session = un onglet ; `id` fourni par l'appelant.
- **Pas d'UI, pas de xterm.js en L1.** L1 fournit les **commandes** PTY + leur câblage ; la
  visionneuse terminal (xterm) et le titrage `[ROYAUME][Agent]` sont **L2**.

### D4 — Portfolio & git : conserver la logique pure + ses tests
- Salvager `git::capture` / `git::run` (helper `git -C <dir> <args>`, neutre et déjà cross-OS) — il
  est la dépendance de `scan_portfolio`.
- Salvager `scan_portfolio` **avec sa logique pure testée** : `parse_ahead_behind`, `read_version`
  (lecture de la ligne `| Version |` de `specs/etat-des-lieux.md`), tri
  `work pending → stable → hors git`. **Reprendre les tests unitaires** d'iakaIDE
  (`portfolio.rs:150-193`) — ils valident le parsing sans toucher au réseau.
- **Défaut de racine** : `scan_portfolio` reçoit `root` du front ; le front l'obtient via
  `get_root` (donc via `paths`/`config` L0). Aucun chemin Windows en dur.

### D5 — Services : salvage tel quel, endpoints en dur tolérés (MVP)
- `check_services()` reste un MVP : la liste `SERVICES` (Forgejo `.11:3001`, Ollama/ComfyUI/Obot
  `.12`, AppFlowy `.14`) est **codée en dur** comme iakaIDE — **toléré en L1** (MVP d'abord). La
  rendre configurable est un raffinement ultérieur, **hors L1**.
- **Raison** : le check est un simple `TcpStream::connect_timeout` ; pas de dette OS, logique
  neutre. On évite la sur-ingénierie d'une config services au socle.

### D6 — `invoke_handler` & modules : étendre le `lib.rs` L0 sans god-file
- Étendre `src-tauri/src/lib.rs` (actuellement `ping` seul) : déclarer les nouveaux **modules
  métier** et enregistrer les **10 commandes** dans `tauri::generate_handler![...]`.
- **Un module Rust par domaine** (pas de god-file) : `portfolio`, `git`, `services`, `terminal`
  (PTY), et les commandes `config_*`/`*_root` regroupées dans un module commande (ex. `cmd_config`
  ou directement dans `config` si ça reste lisible — au choix de Gimli, **tant que** le module L0
  `config` reste le seul propriétaire du schéma SQLite).
- Conserver `ping` (santé). `manage(TermState::default())` ajouté au builder.

### D7 — Façade front : déclarer les commandes typées dans `backend.ts` (unique point d'invoke)
- Étendre `src/api/backend.ts` : ajouter, **au-dessus de `call`**, des **fonctions typées** (une
  par commande) + les **types TypeScript** des structures de retour (`Project`, `ServiceStatus`).
  Règle D7 du socle : **aucun `invoke` ailleurs** que dans `backend.ts`.
- Types front à miroir des `Serialize` Rust (cf. § Contrats d'API). Camel/snake : Tauri sérialise
  les champs Rust **tels quels** (snake_case ici) — les types TS reprennent le snake_case des
  structs, sauf si Gimli pose un `#[serde(rename_all = "camelCase")]` (alors le documenter et
  aligner les deux côtés). **Choix par défaut : garder snake_case** (zéro rename, moins de risque).
- **Stubs PTY côté front** : exposer `ptyOpen/ptyWrite/ptyResize/ptyClose` typés ; l'abonnement aux
  événements `pty://output/*` (via `@tauri-apps/api/event`) est **préparé mais consommé en L2**.
- Ajouter/compléter les **tests vitest** de `backend.ts` (mock de `call`) : vérifier que chaque
  fonction appelle la bonne commande avec les bons args (pas d'appel réseau réel).

### D8 — Cross-OS = critère bloquant (héritage L0)
- **Aucune** constante/chemin OS-spécifique en dur dans le code salvagé : `grep` de `C:\\`,
  `powershell.exe`, `cmd /C`, `cmd.exe`, `iakaide.sqlite` **ne doit rien remonter** dans le code de
  prod L1. Branches OS uniquement via le socle L0 (`shell`/`paths`) ou `cfg!(...)` documenté.
- Tests de portabilité : les tests de logique pure (parsing portfolio, validation cwd) tournent
  **indépendamment de l'OS courant** ; le test PTY réel peut être `cfg`/skippé proprement
  (cf. R-L1-4).

### D9 — Qualité & couverture honnête (héritage L0)
- `scripts/quality.sh` reste la porte : typecheck + ESLint + vitest + `cargo fmt --check` +
  `cargo clippy -- -D warnings` + `cargo test`, **tout vert**.
- **Couverture honnête** : la logique pure salvagée (`parse_ahead_behind`, `read_version`, tri,
  validation `cwd` PTY, filtre `is_secret`) est **réellement testée**. Le PTY interactif et les
  I/O réseau (`check_services`) ne sont pas faciles à couvrir unitairement → on **assume et on dit
  la vérité** sur ce qui est testé (pas de gonflage, pas d'exclusion trompeuse).

---

## Périmètre

### Inclus (L1 strict — 10 commandes)
- **Portfolio/git** : module `git` (helper `capture`/`run`) + `scan_portfolio` (+ logique pure
  testée) branchés sur `paths`.
- **Services** : `check_services` (salvage MVP).
- **Config** : `get_root`, `set_root`, `config_get`, `config_set`, `config_all` — **branchés sur le
  module L0 `config`**, défaut racine calculé par OS, secrets exclus de `config_all`.
- **PTY** : `pty_open` (shell par OS via `shell` L0, `cwd` validé sous chapeau), `pty_write`,
  `pty_resize`, `pty_close` + état `TermState` managé + événements `pty://output|closed/{id}`.
- **Câblage** : `lib.rs` étendu (modules + `generate_handler!` + `manage`), DB `iakacockpit.sqlite`.
- **Front** : `backend.ts` étend la façade (fonctions + types TS) ; tests vitest de la façade.

### Exclu (explicitement HORS L1 — autres lots)
- **UI / vues / xterm.js / grille-dock-onglets / titrage `[ROYAUME][Agent]`** → **L2** (front réel).
- **`recent_work`, `commit_all`, `pending_gates`** → **L2** (widgets dashboard : travail récent,
  commit, jalons). *(Salvageables, mais hors du sous-ensemble L1 signé.)*
- **`next_step` / moteur IA / LiteLLM / `cmd /C claude`** → **L3** (jamais `cmd /C` ; via LiteLLM).
- **Mains courantes 3-canaux / iakaboxlogs** → **L4**.
- **`teams`, `method_docs`, `themes`, `project_config`, `agents_assets`, `iakaframe` (CLI),
  `voice`** → horizon / suite admin / hors-scope v0.1 (cf. `PROJET.md` § 4 ADMIN, § 9 OUT).
- **Secrets manipulés** (clé LiteLLM au keychain) → L3 (le module `secrets` L0 reste dormant en L1).
- **Config services rendue dynamique** → raffinement ultérieur (endpoints en dur tolérés, D5).
- **Push / CI Forgejo** → différé (box offline) ; **commits locaux atomiques** uniquement.

---

## Contrats d'API (commandes Tauri ↔ façade `backend.ts`)

> Signatures Rust = celles d'iakaIDE, **transposées sur le socle L0**. Types TS = miroir des
> structs `Serialize` (snake_case par défaut, cf. D7). Toute commande renvoyant `Result<T, String>`
> → côté front, rejet de promesse avec le message d'erreur.

### Portfolio / git
```rust
// Rust
#[derive(Serialize)] pub struct Project {
  pub id: String, pub path: String, pub is_git: bool,
  pub branch: Option<String>, pub dirty: bool, pub ahead: u32, pub behind: u32,
  pub last_commit_date: Option<String>, pub last_commit_subject: Option<String>,
  pub version: Option<String>, pub work_status: String, // "work pending" | "stable" | "hors git"
}
#[tauri::command] pub fn scan_portfolio(root: String) -> Result<Vec<Project>, String>
```
```ts
// backend.ts
export interface Project {
  id: string; path: string; is_git: boolean;
  branch: string | null; dirty: boolean; ahead: number; behind: number;
  last_commit_date: string | null; last_commit_subject: string | null;
  version: string | null; work_status: "work pending" | "stable" | "hors git";
}
export function scanPortfolio(root: string): Promise<Project[]>;
```

### Services
```rust
#[derive(Serialize)] pub struct ServiceStatus {
  pub name: String, pub host: String, pub port: u16, pub url: String,
  pub reachable: bool, pub latency_ms: Option<u64>,
}
#[tauri::command] pub fn check_services() -> Vec<ServiceStatus>   // pas de Result : jamais d'échec
```
```ts
export interface ServiceStatus {
  name: string; host: string; port: number; url: string;
  reachable: boolean; latency_ms: number | null;
}
export function checkServices(): Promise<ServiceStatus[]>;
```

### Config
```rust
#[tauri::command] pub fn get_root(app: AppHandle) -> Result<String, String>          // défaut via paths L0
#[tauri::command] pub fn set_root(app: AppHandle, root: String) -> Result<(), String>
#[tauri::command] pub fn config_get(app: AppHandle, key: String) -> Result<Option<String>, String>
#[tauri::command] pub fn config_set(app: AppHandle, key: String, value: String) -> Result<(), String>
#[tauri::command] pub fn config_all(app: AppHandle) -> Result<HashMap<String, String>, String> // secrets exclus
```
```ts
export function getRoot(): Promise<string>;
export function setRoot(root: string): Promise<void>;
export function configGet(key: string): Promise<string | null>;
export function configSet(key: string, value: string): Promise<void>;
export function configAll(): Promise<Record<string, string>>;
```

### PTY (sessions terminal cross-OS)
```rust
// shell par OS via shell::default_shell() ; cwd validé sous le chapeau (pathguard)
#[tauri::command] pub fn pty_open(app: AppHandle, state: State<TermState>, id: String,
                                  cwd: Option<String>, cols: Option<u16>, rows: Option<u16>) -> Result<(), String>
#[tauri::command] pub fn pty_write(state: State<TermState>, id: String, data: String) -> Result<(), String>
#[tauri::command] pub fn pty_resize(state: State<TermState>, id: String, cols: u16, rows: u16) -> Result<(), String>
#[tauri::command] pub fn pty_close(state: State<TermState>, id: String) -> Result<(), String>
// Événements émis : "pty://output/{id}" -> String ; "pty://closed/{id}" -> ()
```
```ts
export function ptyOpen(id: string, cwd?: string, cols?: number, rows?: number): Promise<void>;
export function ptyWrite(id: string, data: string): Promise<void>;
export function ptyResize(id: string, cols: number, rows: number): Promise<void>;
export function ptyClose(id: string): Promise<void>;
// L'abonnement aux événements pty://output|closed est préparé en L1, consommé en L2 (xterm).
```

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src-tauri/src/
│  ├─ lib.rs            # MODIF : modules métier + generate_handler![10 cmd + ping] + manage(TermState)
│  ├─ config.rs         # MODIF/EXTENSION : commandes get_root/set_root/config_* sur le module L0
│  ├─ git.rs            # NOUVEAU : helper capture/run (salvage neutre)
│  ├─ portfolio.rs      # NOUVEAU : scan_portfolio + logique pure testée (salvage)
│  ├─ services.rs       # NOUVEAU : check_services (salvage MVP)
│  ├─ terminal.rs       # NOUVEAU : pty_open/write/resize/close, shell L0, cwd validé, TermState
│  ├─ db.rs (option)    # NOUVEAU (option) : open(app) -> Connection (init_schema L0), iakacockpit.sqlite
│  ├─ paths.rs · shell.rs · pathguard.rs · secrets.rs   # L0 (réutilisés, non modifiés sauf besoin)
│  └─ (tests dans chaque module : #[cfg(test)] mod tests)
├─ src-tauri/Cargo.toml # vérifier deps (portable-pty, rusqlite/bundled, serde — déjà présents L0)
├─ src/api/backend.ts   # MODIF : fonctions typées + interfaces Project/ServiceStatus + PTY
└─ src/api/__tests__/   # MODIF/AJOUT : tests vitest de la façade (mock de call)
```

> `Cargo.toml` L0 contient déjà `portable-pty 0.8`, `rusqlite bundled`, `serde`, `serde_json`,
> `dirs`, `keyring`, `tauri 2`. **Aucune nouvelle dépendance réseau IA en L1.** Si un crate manque
> pour le salvage, le signaler avant d'ajouter (pas d'ajout silencieux).

---

## Critères d'acceptation (vérifiables)

- [ ] **10 commandes enregistrées** : `scan_portfolio`, `check_services`, `get_root`, `set_root`,
      `config_get`, `config_set`, `config_all`, `pty_open`, `pty_write`, `pty_resize`, `pty_close`
      figurent dans `generate_handler!` (lib.rs), + `ping` conservé, + `manage(TermState)`.
- [ ] **Config branchée sur L0** : `get_root` retourne le défaut **calculé** (`paths`/`ensure_root`)
      quand la DB est vide ; **aucun** `open()`/`set_kv()` ad-hoc dupliqué ; DB = `iakacockpit.sqlite`.
      `config_all` **n'expose pas** les clés secrètes (`token|key|secret|password`).
- [ ] **PTY dé-Windows-isé** : `pty_open` utilise `shell::default_shell()` (grep : **aucun**
      `powershell.exe` ni `cmd /C` ni `cmd.exe` dans le code de prod) ; un `cwd` qui s'évade du
      chapeau est **rejeté** (`Err`) — couvert par un test.
- [ ] **Portfolio testé** : tests de `parse_ahead_behind` (behind↔ahead), `read_version`
      (ligne `| Version |`, `-`/absent → `None`), et tri `work pending → stable → hors git`
      **passants** ; `cargo test` vert.
- [ ] **Cross-OS** (grep code de prod) : **aucun** `C:\\`, `powershell.exe`, `cmd /C`, `cmd.exe`,
      `iakaide.sqlite`, `DEFAULT_ROOT = "C:` ; branches OS uniquement via `shell`/`paths`/`cfg!`.
- [ ] **Façade front unique** : `backend.ts` expose `scanPortfolio`, `checkServices`, `getRoot`,
      `setRoot`, `configGet`, `configSet`, `configAll`, `ptyOpen/Write/Resize/Close` typées ;
      `Project` et `ServiceStatus` typés ; **grep** : aucun `invoke(` hors `backend.ts`.
- [ ] **Tests façade** : vitest vérifie (mock de `call`) que chaque fonction invoque la bonne
      commande avec les bons arguments.
- [ ] **Build** : `npm run build` **et** `npm run tauri build` réussissent. `npm run tauri dev`
      boote **sans erreur** (l'UI reste le shell vide L0 ; aucune vue n'est exigée en L1).
- [ ] **Qualité verte** : `npm run typecheck` 0 erreur, `npm run lint` 0 erreur,
      `cargo fmt --check` OK, `cargo clippy --all-targets -- -D warnings` OK, `cargo test` vert ;
      `bash scripts/quality.sh` se termine **en succès**.
- [ ] **Couverture honnête** : `npm run test:coverage` rapporte le chiffre **réel** ; la logique
      pure salvagée est réellement couverte ; PTY interactif / `check_services` réseau assumés
      non couverts unitairement (documenté, sans gonflage).
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline). Un
      module salvagé + ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L1-1 — Salvage qui retraîne la dette** (R2 roadmap). Le PTY ou la config recopiés avec
  `powershell.exe`/`C:\\work`. *Mitigation* : critère grep bloquant (D8) ; brancher sur `shell`/
  `paths` L0 ; Legolas vérifie la portabilité au gate.
- **R-L1-2 — Scope-creep** (R1 roadmap). Tentation de salvager aussi `recent`/`commits`/`gates`/
  `next_step` « tant qu'on y est ». *Mitigation* : D1 fixe **exactement 10 commandes** ; tout le
  reste est explicitement OUT (→ L2/L3/L4). Garde Aragorn : hors-IN refusé sans feu vert.
- **R-L1-3 — `cwd` PTY non validé = exécution hors chapeau.** *Mitigation* : valider `cwd` via
  `pathguard`/`paths` avant spawn (D3) ; test d'évasion.
- **R-L1-4 — PTY difficile à tester en CI headless.** *Mitigation* : tester la **logique pure**
  (résolution du shell est déjà couverte par L0 ; validation `cwd`) ; le spawn réel d'une session
  peut être `cfg`/skippé proprement, documenté, sans masquer que l'impl réelle ouvre un vrai PTY.
- **R-L1-5 — `check_services` injoignable hors box.** Les TCP `.11/.12/.14` échouent hors LAN.
  *Mitigation* : `check_services` ne **renvoie jamais d'erreur** (chaque service → `reachable:false`
  si timeout) ; le test ne dépend pas de la joignabilité réelle (teste la **forme** du résultat, pas
  la connectivité). C'est le comportement nominal — pas un bug.
- **R-L1-6 — Sérialisation snake_case vs camelCase.** Désalignement Rust↔TS. *Mitigation* : choix
  par défaut **snake_case partout** (D7), zéro `rename`. Si camelCase préféré, le faire des deux
  côtés et le documenter.
- **R-L1-7 — Doublon de schéma config (L0 vs salvage).** *Mitigation* : un **seul** propriétaire du
  schéma SQLite = le module L0 `config` (D2) ; le helper d'ouverture appelle `config::init_schema`.
- **Limite box** : pas de push, pas de CI, pas de services joignables — L1 est **local et offline**,
  ce qui est exactement son périmètre (roadmap § Plan offline).

---

## Notes pour Gimli

- **Réutilise le socle L0, ne le réinvente pas.** `paths`, `shell`, `pathguard`, `config` sont déjà
  là et testés (27/27). Le salvage **se branche dessus** — c'est la moitié du travail de L1.
- **Commence par `git` + `portfolio`** : logique pure, tests fournis par iakaIDE à reprendre, zéro
  dette OS — ça pose le ton et donne un premier livrable testable rapidement.
- **Puis `config`** (refactor sur L0, c'est là que meurt `"C:\\work"`), **puis `services`** (salvage
  direct), **finis par `terminal` (PTY)** — le plus subtil (shell L0 + validation `cwd` + events).
- **`backend.ts` est sacré** (règle D7 du socle) : si tu écris `invoke(...)` dans un composant ou un
  hook, c'est une régression d'archi. Toute commande passe par une fonction typée de la façade.
- **Ne salvage RIEN hors des 10 commandes de D1.** `recent`/`commits`/`gates` sont tentants mais
  c'est **L2**. `next_step` est **L3** (et surtout : jamais `cmd /C claude` — ce sera LiteLLM).
- **DB** : `iakacockpit.sqlite` (pas `iakaide`). Un seul propriétaire de schéma : le module `config`.
- **Avant de clore** : lance `scripts/quality.sh` en entier, vérifie chaque case des Critères, fais
  les greps cross-OS toi-même. Rapporte la **couverture réelle** sans la maquiller.
- **Gate Legolas obligatoire** après L1 (anti « Gimli solo ») : il auditera la dé-Windows-isation
  (grep), la validation `cwd` PTY, le branchement sur L0 (pas de doublon config), l'unicité de la
  façade `invoke`, et la couverture honnête. Ne t'auto-valide pas.

---

## Sources (faits vérifiés sur le web, 2026-06-25)
- PTY cross-OS Tauri 2 (`portable-pty` `CommandBuilder`, shell explicite par OS, ConPTY/Unix) :
  [portable_pty — docs.rs](https://docs.rs/portable-pty) ·
  [tauri-plugin-pty](https://crates.io/crates/tauri-plugin-pty)
- Commandes & événements Tauri 2 (`invoke_handler`, `Manager`/`manage`, `Emitter::emit`) :
  [Calling Rust from the Frontend — Tauri](https://v2.tauri.app/develop/calling-rust/) ·
  [Events — Tauri](https://v2.tauri.app/develop/calling-frontend/)
- Sérialisation serde des retours de commande (snake_case par défaut, `rename_all` si besoin) :
  [serde — Attributes](https://serde.rs/attributes.html)
- Rappel L3 (le routage multi-modèle reste hors backend — LiteLLM, pas `cmd /C claude`) :
  [LiteLLM Proxy — docs](https://docs.litellm.ai/docs/providers/litellm_proxy)
