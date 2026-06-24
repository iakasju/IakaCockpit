# Instruction : L0 — Bootstrap cross-OS + socle sécurité

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Lot fondation** de MOVE 3 (dev) — AVANT tout métier. Réf. : `specs/PROJET.md` (périmètre
> v0.1 signé), `specs/roadmap.md` § L0. Faits vérifiés sur le web le 2026-06-24 (cf. § Sources).

---

## Objectif

Créer le **squelette réel** d'IakaCockpit (Tauri 2 + React + TypeScript + Vite + SQLite),
**cross-OS dès le premier commit**, et **graver le socle de sécurité en principes** (la dette
d'iakaIDE devient des règles testées). À la fin de L0, **l'app build et boote sur un shell
minimal vide**, avec CSP stricte, abstraction keychain en place, garde-fou de chemins testé,
archi front propre, et l'outillage qualité (typecheck / ESLint / vitest / clippy / cargo test)
vert. **L0 prépare l'accueil du backend Rust salvagé (L1) sans le salvager.**

---

## Contexte

IakaCockpit est le cockpit chapeau-rooted de l'écosystème iakaProject (cf. `PROJET.md`). On
**réécrit le front propre** et on **salvagera le backend Rust éprouvé d'iakaIDE en L1** (scan
git, portfolio, PTY, services, config — ~27 commandes). **L0 ne salvage rien** : il pose la
fondation saine sur laquelle L1 viendra brancher ces commandes.

**Pourquoi un lot de socle d'abord ?** iakaIDE portait une dette structurelle qu'on refuse de
reproduire. Deux anti-patterns concrets, lus dans son code, sont à **bannir d'emblée** :
- `src-tauri/tauri.conf.json` → `"security": { "csp": null }` (XSS non protégé). **→ CSP stricte.**
- `src-tauri/src/config.rs` → `const DEFAULT_ROOT: &str = "C:\\work";` (Windows en dur).
  **→ résolution du chapeau cross-OS, zéro constante Windows.**
À quoi s'ajoutent (audit iakaIDE 2026-06-21) : secrets en clair en SQLite, garde-fous de chemins
non testés, god-components front, couverture ~2 % maquillée. **L0 inverse chacun de ces points.**

Internet est **disponible** (`npm install` / `cargo` / crates.io OK). Seul le **LAN iakabox /
Forgejo est injoignable** → **push différé** (commits locaux atomiques ; file d'attente au retour
de la box). La CI Forgejo est **différée** : L0 fournit les **scripts qualité locaux**, pas un
pipeline distant.

## Ce qui existe (référence, lecture seule — NE PAS copier)

| Élément | Où | Statut pour L0 |
|---|---|---|
| Stack éprouvée (versions) | `iakaIDE/package.json` (React 18.3, Vite 6, Tauri 2, TS 5.5, vitest 4, dompurify 3) | **Référence de versions** — réutiliser ces lignées |
| Backend Rust (27 cmd) | `iakaIDE/src-tauri/src/*.rs`, `lib.rs` (`invoke_handler![...]`) | **Salvage = L1**, pas L0 |
| Anti-pattern CSP | `iakaIDE/src-tauri/tauri.conf.json:22` (`"csp": null`) | **À NE PAS reproduire** |
| Anti-pattern chemin | `iakaIDE/src-tauri/src/config.rs:9` (`"C:\\work"`) | **À NE PAS reproduire** |
| Maquette UX cible | `IakaCockpit/specs/maquettes/convergence-v7/index.html` | **Cible des lots SUIVANTS** — L0 ne fait pas l'UI |
| Scan projets | `naonedge-dashboard` | Réutilisé en L2, pas L0 |

> **Règle L0** : on **regarde** iakaIDE pour les versions et les pièges, on **n'importe aucun
> fichier**. Le squelette est neuf.

---

## Décisions (numérotées)

### D1 — Stack & versions (alignées sur l'éprouvé iakaIDE)
- **Tauri 2** (Rust) + **React 18.3** + **TypeScript 5.5** + **Vite 6** + **SQLite** (`rusqlite`,
  bundled). Front en `src/`, backend en `src-tauri/`.
- Versions : reprendre les **lignées** de `iakaIDE/package.json` (`@tauri-apps/api ^2`,
  `react 18.3.1`, `typescript 5.5.x`, `vite ^6`, `vitest ^4`, `@vitest/coverage-v8 ^4`,
  `eslint ^9` + `typescript-eslint ^8`). **Raison** : combinaison déjà buildée et stable sur les
  3 OS ; on évite de défricher des incompatibilités de versions.
- **Identifiant** d'app : `com.iakateam.iakacockpit`. **productName** : `IakaCockpit`.

### D2 — CSP stricte (jamais `null`)
- `tauri.conf.json` → `app.security.csp` = **politique restrictive explicite**, **jamais `null`**.
  Base de départ (à ajuster au strict nécessaire) :
  `default-src 'self'; img-src 'self' asset: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ipc: http://ipc.localhost`
  - **Raison** : Tauri n'injecte sa protection (nonces/hash automatiques) **que si une CSP est
    définie** ; `null` = XSS non protégé (la faille d'iakaIDE). On part **strict** et on
    desserre au besoin (plus facile que l'inverse).
  - `connect-src` : prévoir **localhost** pour l'**endpoint LiteLLM local** (L3) — mais **L0
    n'appelle pas LiteLLM**, il prépare seulement la politique. Documenter chaque hôte autorisé.
  - Tout rendu Markdown futur passera par **DOMPurify** (déjà dans la lignée iakaIDE) — noté ici,
    appliqué quand une visionneuse arrive (pas en L0).

### D3 — Chapeau cross-OS (résolution `IAKAFRAME_ROOT`, zéro constante Windows)
- Un module Rust **`paths`** (cf. § Fichiers) expose `resolve_hat_root()` :
  1. variable d'env **`IAKAFRAME_ROOT`** si définie et valide ;
  2. sinon défaut **par OS** : `~/work` (macOS/Linux, via `dirs`/`home`), `C:\work` (Windows) —
     **construit dynamiquement**, jamais une constante `"C:\\work"` en dur.
  - **Raison** : le cockpit est ancré au chapeau ; la racine doit être correcte sur les 3 OS sans
    recompilation ni edit. Reproduit l'intention d'iakaIDE **sans** son hardcoding Windows.
- Le défaut est **surchargeable** et **persisté en SQLite** (table `config`, clé `root`) — comme
  iakaIDE, mais valeur initiale calculée, pas codée en dur.

### D4 — Spawn shell cross-OS (préparé, pas exposé en UI)
- Un module Rust **`shell`** expose `default_shell()` qui retourne la **commande de shell par OS** :
  **PowerShell** (`pwsh` si présent, sinon `powershell`) sur Windows ; **`$SHELL`** sinon
  `/bin/zsh`→`/bin/bash` sur macOS/Linux. Construit via **`portable-pty` `CommandBuilder`**
  (l'API n'a pas de défaut par OS intégré → on choisit explicitement).
  - **Raison** : graver la dé-Windows-isation dès L0 (plus de `cmd /C`). Le **PTY réel** (ouverture
    de session, I/O, resize) est **L1/L2** ; L0 ne fournit que la **résolution du shell + un test
    unitaire** qui vérifie qu'une commande non vide et cohérente avec l'OS courant est renvoyée.
  - **Aucune session PTY n'est ouverte en L0**, aucun terminal dans l'UI.

### D5 — Abstraction keychain OS (secrets jamais en clair)
- Un module Rust **`secrets`** expose une **interface** `SecretStore` :
  `set_secret(service, account, value)`, `get_secret(...) -> Option<String>`, `delete_secret(...)`,
  adossée au **crate `keyring`** (keychain natif : Keychain macOS / Credential Manager Windows /
  Secret Service Linux).
  - **Raison** : le `keyring` crate donne **une API cross-OS** sur le coffre natif ; **stronghold
    est déprécié (retrait Tauri v3)** → on ne l'utilise pas. **Aucun secret en SQLite, ni en
    fichier, ni en commit.** SQLite ne stocke que de la config **non sensible** (chapeau, thème,
    endpoint LiteLLM **sans la clé**).
  - **L0 ne stocke aucun vrai secret** : il pose l'abstraction + un **test** qui vérifie le contrat
    (set→get→delete). **Note environnement** : sur runner Linux headless, le Secret Service peut
    être absent → le test doit **dégrader proprement** (skip explicite documenté, ou backend mock
    en `#[cfg(test)]`) **sans masquer** que l'impl réelle vise le keychain natif. Documenter ce
    choix dans le module.

### D6 — Garde-fou de chemins testé dès le 1er commit (anti-traversal)
- Un module Rust **`pathguard`** expose :
  - `safe_path(base, candidate) -> Result<PathBuf>` : refuse tout chemin qui **s'évade** de `base`
    après normalisation (rejette `..`, chemins absolus injectés, symlinks hors base si vérifiable) ;
  - `safe_project_dir(root, project) -> Result<PathBuf>` : un projet doit rester **sous le chapeau**.
  - **Raison** : c'est la faille la plus sensible d'un cockpit qui lit/écrit sous le chapeau ;
    iakaIDE avait `safe_path`/`safe_project_dir` **non testés**. **Ici : tests AVANT/AVEC le
    premier commit du module** — cas passants ET cas d'attaque (`../../etc/passwd`, `..\\..\\`,
    chemin absolu, base inexistante). Tests **cross-OS** (séparateurs `/` et `\`).
- **Tout futur accès FS sous le chapeau (L1+) DOIT passer par `pathguard`.** L0 le pose et le couvre.

### D7 — Archi front propre (pas de god-component)
- Structure front modulaire d'emblée :
  - `src/api/backend.ts` : **couche d'abstraction unique** vers Tauri (`invoke`). Tout appel Rust
    passe par là (mockable sans Tauri → sert les tests + L2). **Pas de cible web** (annulée), mais
    le découplage reste un principe de propreté (cf. `PROJET.md` § 3.2).
  - `src/hooks/` : **hooks d'état séparés** — au moins `useGridState` (état grille/dock/onglets) et
    `usePortfolio` (état portefeuille), **stubs** en L0 (pas de métier), mais **fichiers réels,
    typés, testés a minima**. **Raison** : prévenir le retour du god-component avant qu'il existe.
  - `src/App.tsx` : **shell minimal vide** (titre + emplacement d'accueil), pas de vues v7.
  - **Aucun composant ne cumule état global + rendu + I/O.** Legolas vérifie ce principe au gate.

### D8 — Outillage qualité (local, CI différée)
- **TS** : `typecheck` (`tsc --noEmit`), **ESLint réel** (`eslint .` avec `typescript-eslint`,
  config non vide, **0 erreur**), **vitest** (front) + `@vitest/coverage-v8`.
- **Rust** : `cargo fmt --check`, **`cargo clippy -- -D warnings`** (warnings = erreurs),
  `cargo test`.
- **Scripts npm** (à fixer, conventions iakaframe) : `dev`, `build`, `typecheck`, `lint`, `test`,
  `test:coverage`, `tauri`. Un script chapeau **`quality`** (ou `bash scripts/quality.sh`)
  enchaîne typecheck + lint + vitest + fmt-check + clippy + cargo test.
- **Couverture honnête** : on **rapporte le chiffre réel** (faible en L0, c'est attendu et
  assumé) ; **interdit** de gonfler artificiellement ou d'exclure du code pour afficher 100 %.
  Les modules sensibles (`pathguard`, `secrets`, `paths`, `shell`) sont **réellement couverts**.

### D9 — LiteLLM : préparé, pas câblé
- L0 **ne contient aucun appel réseau IA**. On **réserve** uniquement : la place dans la CSP
  (`connect-src` localhost), une clé de config SQLite `litellm_endpoint` (URL, **non sensible**),
  et le principe « la **clé** LiteLLM ira au **keychain** » (D5). **Le client LiteLLM est L3.**
  - **Raison** : éviter le scope-creep (R4 roadmap : « on câble, on ne route pas ») et ne pas
    dépendre d'un service indisponible en L0.

### D10 — Cross-OS = critère bloquant, pas une intention
- **Aucun** chemin/constante OS-spécifique en dur dans le code applicatif (hors branche explicite
  `cfg!(windows)` / détection runtime documentée). `grep` Windows-only (`C:\\`, `cmd /C`,
  `\\\\`) **ne doit rien remonter** dans le code de prod. Critère vérifié au gate (§ Critères).

---

## Périmètre

### Inclus (L0 strict)
- Scaffolding Tauri 2 + React + TS + Vite + SQLite qui **build et boote** (fenêtre + shell vide).
- CSP stricte (D2). Modules Rust `paths` (D3), `shell` (D4), `secrets` (D5), `pathguard` (D6).
- Couche front `src/api/backend.ts` + hooks séparés stubs (D7).
- Outillage qualité local + scripts (D8). Tests des 4 modules sensibles.
- `CLAUDE.md` du projet complété (stack + commandes réelles) ; structure de dossiers saine.

### Exclu (explicitement HORS L0 — autres lots)
- **Salvage du backend Rust iakaIDE** (scan git, portfolio, PTY, services, config) → **L1**.
- **Vues** Portfolio / Working / Réglages / grille+dock+onglets réels, et toute UI de la
  maquette v7 → **L2** (L0 = shell vide).
- **PTY réel** (ouverture de session, xterm, I/O) → L1/L2 (L0 = résolution du shell + test seul).
- **Client LiteLLM / moteur « prochaine étape »** → **L3**.
- **Mains courantes 3-canaux / iakaboxlogs** → **L4**.
- **CI Forgejo**, **push** (box offline), **Obot/MCP**, **bureau-OS**, mobile/vocal, multi-target
  → différé / hors-scope (cf. `roadmap.md` garde).

---

## Fichiers concernés (création — arborescence cible indicative)

```
IakaCockpit/
├─ package.json                  # scripts D8, deps lignées iakaIDE
├─ tsconfig.json · vite.config.ts · eslint.config.js · vitest.config.ts
├─ index.html
├─ scripts/quality.sh            # enchaîne typecheck+lint+vitest+fmt+clippy+cargo test
├─ src/
│  ├─ main.tsx · App.tsx         # shell minimal vide
│  ├─ api/backend.ts             # abstraction unique vers Tauri (invoke)
│  ├─ hooks/useGridState.ts      # stub typé + test
│  ├─ hooks/usePortfolio.ts      # stub typé + test
│  └─ __tests__/                 # vitest (backend.ts mock, hooks)
└─ src-tauri/
   ├─ tauri.conf.json            # CSP stricte (PAS null), productName/identifier
   ├─ Cargo.toml                 # rusqlite(bundled), keyring, portable-pty, dirs, serde…
   ├─ capabilities/default.json  # capabilities minimales
   ├─ src/lib.rs · main.rs       # invoke_handler vide ou minimal (prêt pour L1)
   ├─ src/paths.rs   (+ tests)   # resolve_hat_root cross-OS
   ├─ src/shell.rs   (+ tests)   # default_shell par OS (portable-pty CommandBuilder)
   ├─ src/secrets.rs (+ tests)   # SecretStore via keyring
   ├─ src/pathguard.rs (+ tests) # safe_path / safe_project_dir anti-traversal
   └─ src/config.rs  (+ tests)   # SQLite config non sensible (root, thème, litellm_endpoint)
```

> Les noms exacts (fichiers/fonctions) sont à l'appréciation de Gimli **tant que** les contrats
> D2–D8 sont respectés et testés.

---

## Critères d'acceptation (vérifiables)

- [ ] **Build** : `npm run build` (front) **et** `npm run tauri build` réussissent.
- [ ] **Boot** : `npm run tauri dev` ouvre une fenêtre IakaCockpit avec un **shell vide**
      (titre + zone d'accueil), **sans erreur** console/Rust.
- [ ] **CSP non-null vérifiable** : `tauri.conf.json` → `app.security.csp` est une **chaîne de
      politique restrictive** (grep : la valeur **n'est pas** `null`) ; aucun `'unsafe-eval'` ;
      `script-src` limité à `'self'` (+ nonces/hash Tauri auto).
- [ ] **Path-guard couvert** : `pathguard` a des tests **passants ET d'attaque** (`..`, absolu,
      séparateurs `/` et `\`) ; `cargo test` **vert** ; les cas d'évasion **échouent bien** (sont
      rejetés).
- [ ] **Abstraction keychain en place** : module `secrets` exposant `SecretStore` adossé à
      `keyring` ; test set→get→delete vert (ou skip documenté si Secret Service absent sur le
      runner) ; **aucun secret** stocké en SQLite/fichier/commit.
- [ ] **Chapeau cross-OS** : `paths::resolve_hat_root()` testé — `IAKAFRAME_ROOT` respecté ;
      défaut calculé par OS ; **aucune constante `"C:\\work"`** en dur (grep).
- [ ] **Shell cross-OS** : `shell::default_shell()` testé — renvoie une commande non vide
      cohérente avec l'OS courant ; **aucun `cmd /C`** dans le code de prod (grep).
- [ ] **Lint + typecheck verts** : `npm run typecheck` **0 erreur**, `npm run lint` **0 erreur**
      (ESLint config réelle, non vide), `cargo fmt --check` OK, `cargo clippy -- -D warnings` OK.
- [ ] **Pas de god-component** : `App.tsx` ne porte pas l'état global ; hooks `useGridState` /
      `usePortfolio` existent comme modules **séparés et typés** ; `backend.ts` est l'**unique**
      point d'`invoke` (grep : pas d'`invoke` éparpillé dans les composants).
- [ ] **Structure de dossiers saine** : arborescence ci-dessus en place ; `scripts/quality.sh`
      enchaîne toute la chaîne qualité et **se termine en succès**.
- [ ] **Couverture honnête** : `npm run test:coverage` rapporte le chiffre **réel** ; les 4
      modules sensibles (`paths`, `shell`, `secrets`, `pathguard`) sont **réellement couverts** ;
      aucun gonflage/exclusion trompeuse.
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ;
      `pathguard` + ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L0-1 — Secret Service absent (runner Linux headless).** Le test `secrets` peut ne pas
  joindre le coffre natif. *Mitigation* : skip documenté ou backend mock `#[cfg(test)]`, sans
  jamais faire croire que l'impl réelle évite le keychain. Sur macOS (poste de Stéphane), le
  Keychain natif fonctionne.
- **R-L0-2 — `keyring` vs `stronghold`.** Stronghold est **déprécié (retrait v3)** ; on prend
  `keyring`. Si une exigence future impose un coffre chiffré applicatif, on réévaluera — **pas en
  L0**.
- **R-L0-3 — CSP trop stricte casse une ressource.** Démarrer strict peut bloquer un asset
  légitime. *Mitigation* : desserrer **au cas par cas** en documentant chaque hôte ; ne jamais
  repasser à `null`.
- **R-L0-4 — Versions Tauri/Vite/React.** *Mitigation* : aligner sur les lignées **déjà buildées**
  d'iakaIDE (Internet dispo pour `npm install`/`cargo`).
- **R-L0-5 — Scope-creep PTY/UI.** Tentation d'ouvrir un vrai terminal ou une vraie vue.
  *Mitigation* : L0 = shell vide + résolution du shell **seule** ; PTY réel = L1/L2 (garde
  Aragorn).
- **Limite box** : pas de push, pas de CI Forgejo, pas de LiteLLM/iakaboxlogs en L0 — tout est
  **local et offline**, ce qui est exactement le périmètre L0.

---

## Notes pour Gimli

- **Ne salvage RIEN d'iakaIDE en L0.** Tu le **regardes** pour les versions (`package.json`) et
  les deux anti-patterns à ne pas reproduire (`tauri.conf.json:22` CSP null ; `config.rs:9`
  `"C:\\work"`). Le salvage du backend, c'est **L1** — un lot séparé.
- **Commence par `pathguard` + ses tests** (D6) : c'est le module sensible le plus simple à poser
  proprement et il fixe le ton (« tests d'abord sur le code sensible »).
- **`backend.ts` est sacré** : tout appel Tauri passe par lui. Si tu écris `invoke(...)` dans un
  composant, c'est une régression d'archi (god-component qui revient).
- **Crates Rust visés** : `tauri 2`, `rusqlite` (feature `bundled`), `keyring`, `portable-pty`,
  `serde`/`serde_json`, `dirs` (ou `home`) pour le home cross-OS. Pas de dépendance réseau IA.
- **Avant de clore** : lance `scripts/quality.sh` en entier et vérifie chaque case des Critères.
  Rapporte la **couverture réelle** sans la maquiller.
- **Gate Legolas obligatoire** après L0 (anti « Gimli solo ») : il auditera CSP, path-guard,
  keychain, cross-OS (grep Windows-only), archi front. Ne t'auto-valide pas.

---

## Sources (faits vérifiés sur le web, 2026-06-24)
- CSP Tauri 2 (injection seulement si CSP définie ; partir strict) :
  [Content Security Policy — Tauri](https://v2.tauri.app/security/csp/) ·
  [Security — Tauri](https://v2.tauri.app/security/)
- Secrets/keychain (keyring recommandé ; **stronghold déprécié, retrait v3**) :
  [Stronghold — Tauri](https://v2.tauri.app/plugin/stronghold/) ·
  [tauri-plugin-keyring (keyring crate)](https://github.com/HuakunShen/tauri-plugin-keyring) ·
  [Discussion safe storage #7846](https://github.com/orgs/tauri-apps/discussions/7846)
- Spawn shell cross-OS (`CommandBuilder`, shell explicite par OS) :
  [portable_pty — docs.rs](https://docs.rs/portable-pty)
- LiteLLM (proxy OpenAI-compat — préparé en L0, câblé en L3) :
  [LiteLLM Proxy — docs](https://docs.litellm.ai/docs/providers/litellm_proxy) ·
  [BerriAI/litellm](https://github.com/BerriAI/litellm)
