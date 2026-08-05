# IakaCockpit

**Le cockpit de l'écosystème iaka : il réceptionne les équipes d'agents, les lie à des
projets et les fait tourner.**

IakaCockpit est une application de bureau qui se place **au-dessus d'un portefeuille de
projets**. Elle donne une vue d'ensemble des dépôts, ouvre une session de travail par
projet, et pilote l'équipe d'agents affectée à cette session — le terminal restant la
source de vérité, le chat n'étant qu'une vue filtrée avec une entrée partagée.

Frontière avec [iakaFrameGUI](https://github.com/iakasju/iakaFrameGUI) : la forge
**fabrique et livre** les équipes ; le cockpit **réceptionne, lie et exécute**.

---

## Installation

La version scellée courante est **[v0.31.2](https://github.com/iakasju/IakaCockpit/releases/tag/v0.31.2)** — voir
[toutes les versions](https://github.com/iakasju/IakaCockpit/releases).

### macOS (Apple Silicon)

Téléchargez **`IakaCockpit_0.31.2_aarch64.dmg`** depuis la
[page de la release](https://github.com/iakasju/IakaCockpit/releases/tag/v0.31.2),
ouvrez-le et glissez l'application dans `Applications`.

> L'application n'est pas signée par un certificat Apple. Au premier lancement, faites
> **clic droit → Ouvrir** puis confirmez : un double-clic direct serait bloqué par macOS.

Pour les autres plateformes — Windows, Linux, macOS Intel — construisez depuis les sources
comme ci-dessous.

### Construire depuis les sources

**Prérequis :** Node.js ≥ 20, Rust stable (avec `cargo`), et les
[dépendances système de Tauri 2](https://v2.tauri.app/start/prerequisites/) pour votre
plateforme (Xcode CLT sur macOS, WebView2 + Build Tools sur Windows, `webkit2gtk` et
`libayatana-appindicator` sur Linux).

```bash
# 1. Récupérer l'archive de la version depuis la page des releases
#    (Assets > Source code), puis la décompresser
cd IakaCockpit-0.31.2

# 2. Installer les dépendances
npm ci

# 3. Lancer en développement
npm run tauri dev

# 4. Ou produire l'exécutable de votre plateforme
npm run tauri build
```

Le binaire est produit dans `src-tauri/target/release/bundle/`.

**Configuration.** Le cockpit s'ancre sur un dossier chapeau qui contient les projets. Il
est résolu depuis la variable d'environnement `IAKAFRAME_ROOT` (défaut : `~/work`) —
aucun chemin n'est codé en dur, l'application est cross-OS.

---

## Stack

| Couche | Technologie |
|---|---|
| Front | React 18.3 · TypeScript 5.5 · Vite 6 |
| Backend | Tauri 2 · Rust |
| Persistance | SQLite (`rusqlite`, configuration non sensible) |
| Secrets | Trousseau natif de l'OS (`keyring`) — jamais en base, jamais sur disque |

Identifiant applicatif : `com.iakateam.iakacockpit`.

## Architecture

- `src/api/backend.ts` est le **point d'`invoke` unique** vers le backend Rust ; aucun
  appel dispersé dans les composants.
- L'état vit dans des hooks séparés (`useGridState`, `usePortfolio`) ; `App.tsx` n'est
  qu'une coquille — pas de god-component.
- Socle de sécurité Rust : `pathguard` (anti-traversée de chemin, testé), `paths`
  (chapeau cross-OS), `shell` (résolution du shell par OS), `secrets`, `config`.
  La CSP est **stricte** — jamais `null`.

## Développement

```bash
npm run dev          # front seul (Vite)
npm run tauri dev    # application complète
npm run typecheck    # vérification des types
npm run lint         # lint
npm run test         # tests unitaires (Vitest)
npm run quality      # la chaîne complète : typecheck + lint + tests
```

`npm run quality` doit passer avant tout commit.

## Documentation

- [`specs/PROJET.md`](./specs/PROJET.md) — vision, modèle produit, architecture cible.
- [`specs/instructions/`](./specs/instructions/) — les instructions de travail, une par lot.
- [`specs/etat-des-lieux.md`](./specs/etat-des-lieux.md) — où en est le projet.
- [`CLAUDE.md`](./CLAUDE.md) — contrat de travail de l'agent d'exécution sur ce dépôt
  (le nom du fichier dépend du runner ; la méthode, elle, n'en dépend pas).

## Méthode

Ce projet est développé selon la méthode
[**iakaframe**](https://github.com/iakasju/iakaframe) : un décideur au-dessus d'une équipe
de rôles à périmètres étanches, et une instruction écrite et validée avant toute ligne de
code. La frame active du dépôt est déclarée dans `.iakaframe`.
