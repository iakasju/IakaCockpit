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

<!-- vitrine:debut:binaires -->
La version scellée courante est **[v0.33.0](https://github.com/iakasju/IakaCockpit/releases/tag/v0.33.0)** — voir
[toutes les versions](https://github.com/iakasju/IakaCockpit/releases).

### Binaires prêts à l'emploi

Tous les systèmes sont couverts. Prenez le fichier de votre plateforme sur la
[page de la release](https://github.com/iakasju/IakaCockpit/releases/tag/v0.33.0) :

| Système | Fichier à télécharger |
|---|---|
| **Windows (installeur)** | `IakaCockpit_0.33.0_x64-setup.exe` |
| **Windows (MSI)** | `IakaCockpit_0.33.0_x64_en-US.msi` |
| **macOS Apple Silicon** | `IakaCockpit_0.33.0_aarch64.dmg` |
| **macOS Intel** | `IakaCockpit_0.33.0_x64.dmg` |
| **Linux (Debian/Ubuntu)** | `IakaCockpit_0.33.0_amd64.deb` |
| **Linux (Fedora/RHEL)** | `IakaCockpit-0.33.0-1.x86_64.rpm` |
| **Linux (portable)** | `IakaCockpit_0.33.0_amd64.AppImage` |
<!-- vitrine:fin:binaires -->

<!-- vitrine:debut:securite -->
### Sécurité — ce que cette version ne signe pas (encore)

Les binaires ci-dessus **existent** — ce n'est pas une plateforme manquante, c'est une
étape de signature non encore posée. Chaque absence est déclarée, datée et levable :

> **⚠️ Non signé — macOS — notarisation Apple, depuis 2026-09-08.**
> Aucun certificat Apple Developer ID ni adhésion au Apple Developer Program (99 $/an) : les bundles macOS (`.dmg`) ne portent qu'une signature AD HOC. Mesuré STRUCTURELLEMENT le 2026-09-08 (convention CONVERGENCE-TROIS-FRERES) sur les fichiers de fabrication : `.github/workflows/release.yml` ne câble aucun secret `APPLE_*` sur l'étape `tauri-action`, `src-tauri/tauri.conf.json` ne porte aucune section `bundle.macOS`. Cette mesure ne télécharge ni ne monte d'asset réel — à la différence de la mesure faite chez `iakaInstall`, qui a vérifié `codesign`/`spctl` sur le binaire servi.
>
> **Levée :** Adhésion Apple Developer Program acquise ET secrets `APPLE_CERTIFICATE`/`APPLE_CERTIFICATE_PASSWORD` (plus `APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID` ou `APPLE_API_*`) posés par le décideur dans les réglages du dépôt — acte refusé aux agents. Le jour où ce câblage devient ACTIF dans `release.yml`, le cliquet offline de ce fichier force le retrait de CETTE entrée.
>
> **Procédure :** Lancer l'application : macOS affiche « Not Opened ». Aller dans Réglages Système -> Confidentialité et sécurité, trouver l'application dans la section du bas, cliquer « Ouvrir quand même », confirmer, puis s'authentifier avec le mot de passe administrateur. Ce geste doit être fait DANS L'HEURE qui suit le message, et UNE SEULE FOIS par application. Depuis macOS 15 Sequoia, c'est la SEULE voie : aucun autre geste ne contourne ce message.
>
> **⚠️ Non signé — Windows — signature de code, depuis 2026-09-08.**
> Aucun certificat de signature de code n'est posé : le `.msi` et le `.exe` (NSIS) de la release ne sont pas signés. Mesuré STRUCTURELLEMENT le 2026-09-08 : `.github/workflows/release.yml` ne câble aucun secret de signature Windows sur l'étape `tauri-action`, `src-tauri/tauri.conf.json` ne porte aucune section `bundle.windows.certificateThumbprint`.
>
> **Levée :** Certificat de signature de code acquis (idéalement EV) ET posé par le décideur — acte refusé aux agents. À dire sans le farder : un certificat NEUF ne fait PAS disparaître SmartScreen immédiatement, la réputation se construit avec le nombre d'installations dans le temps.
>
> **Procédure :** Au lancement de l'installeur, Windows affiche « Windows a protégé votre ordinateur » (Microsoft Defender SmartScreen). Cliquer « Informations complémentaires », puis « Exécuter quand même ».
<!-- vitrine:fin:securite -->

> **Linux** — l'AppImage se lance sans installation, après `chmod +x`.

### Construire depuis les sources

**Prérequis :** Node.js ≥ 20, Rust stable (avec `cargo`), et les
[dépendances système de Tauri 2](https://v2.tauri.app/start/prerequisites/) pour votre
plateforme (Xcode CLT sur macOS, WebView2 + Build Tools sur Windows, `webkit2gtk` et
`libayatana-appindicator` sur Linux).

<!-- vitrine:debut:sources -->
```bash
# 1. Récupérer l'archive de la version depuis la page des releases
#    (Assets > Source code), puis la décompresser
cd IakaCockpit-0.33.0

# 2. Installer les dépendances
npm ci

# 3. Lancer en développement
npm run tauri dev

# 4. Ou produire l'exécutable de votre plateforme
npm run tauri build
```
<!-- vitrine:fin:sources -->

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
