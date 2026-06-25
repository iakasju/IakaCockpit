# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu en priorité par Claude Code à chaque session.
> Pour la vision complète du projet, lire `specs/PROJET.md`.
> Pour la méthode de collaboration, voir `methode-de-travail.md` (iakaframe).

---

## Rôles (rappel)

- **Cowork** (réflexion) rédige les instructions dans `specs/instructions/`. Il ne
  modifie jamais le code.
- **Claude Code** (toi) lis l'instruction correspondante AVANT chaque tâche, puis
  implémentes, builds, testes et commites.

---

## Ce qu'est ce projet

<!-- 2-4 lignes : à quoi sert le projet, pour qui, le résultat produit. -->

IakaCockpit — cockpit chapeau-rooted de l'écosystème iakaProject (cf. `specs/PROJET.md`).

Stack : **React 18.3 + TypeScript 5.5 + Vite 6** (front, `src/`) · **Tauri 2 / Rust**
(backend, `src-tauri/`) · **SQLite** (`rusqlite` bundled, config non sensible) ·
secrets au **keychain natif** (`keyring`). App id `com.iakateam.iakacockpit`.

Architecture front (D7) : `src/api/backend.ts` = **unique point d'`invoke`** vers Rust ;
état dans des hooks séparés (`useGridState`, `usePortfolio`) ; `App.tsx` = shell. Jamais
de god-component, jamais d'`invoke` éparpillé dans les composants.

Socle sécurité Rust (L0) : `pathguard` (anti-traversal testé), `paths` (chapeau cross-OS
via `IAKAFRAME_ROOT`, zéro constante Windows), `shell` (résolution shell par OS), `secrets`
(SecretStore/keyring), `config` (SQLite non sensible). CSP **stricte** (jamais `null`).

---

## Commandes à utiliser

```bash
npm install                  # installer les deps front
npm run dev                  # front Vite (port 3020)
npm run tauri dev            # app desktop Tauri en dev (GUI)
npm run build                # build front (tsc + vite)
npm run tauri build          # bundle desktop
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm run test                 # vitest
npm run test:coverage        # vitest + couverture v8
bash scripts/quality.sh      # chaîne qualité complète (front + Rust)

# Côté Rust (depuis src-tauri/) :
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

---

## Conventions

- **Langue du code** : anglais (identifiants, commits techniques).
- **Langue de la doc et des échanges** : français.
- **Commits** : *conventional commits* (`feat:`, `fix:`, `docs:`, `chore:`, `wip:`).
- **Commits atomiques et fréquents** : après chaque étape logique (filet de
  sécurité pour pouvoir revenir en arrière). Jamais de `reset --hard` ni de
  `push --force` de ton côté.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** pour tout choix de backend ; cloud en
  fallback justifié seulement.
- **Réutiliser l'existant** (infra, services, MCP) avant de réimplémenter.
- En dev, **mocker les appels API** coûteux/limités (voir `specs/mock/`).

---

## Dépôt git : Forgejo (iakabox)

Remote par défaut : **Forgejo LAN** `http://192.168.2.11:3001/sjupin/<repo>.git`,
**HTTP + token** (SSH inutilisable). Token via `$env:FORGEJO_TOKEN` ou `.git/config`
local — **jamais commité**. Voir `iakabox-usage.html` (iakaframe) pour clone/push,
création de dépôt (API, description **ASCII**) et rotation de token.

## Cycle de documentation (état des lieux)

Régénérer l'état des lieux **à chaque changement de version** et **à chaque pause /
préparation de reprise** :

```powershell
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason version -Version vX.Y.Z -Note "..."
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason pause   -Note "où on s'arrête, quoi reprendre"
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason reprise -Note "reprise"
```

Génère `specs/etat-des-lieux.md` + `.html` (faits git auto). **Compléter le récit de
reprise** dans le `.md` (ce qui vient d'être fait, ce qui reste, prochaine étape).

---

## Avant toute tâche non triviale

1. Lire l'instruction correspondante dans `specs/instructions/`.
2. Si elle n'existe pas → le signaler ; ne pas improviser une feature lourde sans
   spec. Proposer un plan court d'abord.
3. Implémenter étape par étape, avec commits intermédiaires.
4. Lancer typecheck + lint + tests avant de considérer la tâche finie.
5. Pour toute action vraiment destructive hors denylist : **demander confirmation
   par message texte avant d'agir.**

---

## Backlog

<!-- Liste des lots priorisés. Chaque entrée pointe vers son instruction. -->

- [x] **L0** — Bootstrap cross-OS + socle sécurité → `specs/instructions/L0-bootstrap-securite.md`
      *(implémenté, **gate Legolas PASS** — 27/27 tests Rust, front vert ; candidate `v0.1.0-rc`).*
- [x] **L1** — Salvage du backend Rust iakaIDE (scan git, portfolio, PTY, services, config)
      → `specs/instructions/L1-salvage-backend-rust.md`
      *(implémenté, **gate Legolas PASS** — 44/44 tests Rust + 21/21 front, dé-Windows-isé sur socle L0 ; candidate `v0.1.0-rc`).*
- [x] **L2** — Vues Portfolio / Working / Réglages + grille/dock/onglets (maquette v7)
      → `specs/instructions/L2-vues-ui.md`
      *(implémenté, **gate Legolas PASS** — 50/50 tests front, terminal PTY xterm réel, réglages persistés ; candidate `v0.2.0-rc`).*
      *En réserve : onglets qualité (débat ouvert), vue « liste des jalons » + fiche jalon (dépend L4).*
- [x] **L3** — Client LiteLLM / moteur « prochaine étape » via UN endpoint OpenAI-compat configurable
      → `specs/instructions/L3-moteur-prochaine-etape.md`
      *(implémenté, **gate Legolas PASS** — 70/70 tests front + 67/67 Rust (dont 20 `ai.rs`) ; UN endpoint OpenAI-compat
      configurable (LiteLLM / Ollama local-LAN / cloud), « on câble, on ne route pas » ; clé optionnelle au keychain
      (write-only), mock dev implicite ; **testé en réel** : Ollama localhost + LiteLLM→Ollama Docker (stack `docker/`) ;
      candidate `v0.3.0-rc`).*
- [x] **L4** — Mains courantes 3-canaux / iakaboxlogs (lecture seule) → `specs/instructions/L4-mains-courantes.md`
      *(implémenté, **gate Legolas PASS** (+ re-gate après fix) — 79/79 front + 92/92 Rust (dont `maincourante`) ;
      lecture seule `POST /_find` Mango côté Rust via façade unique, mapping 3-canaux **sans faux geste** (geste
      uniquement via `meta.canal` réel), identifiants CouchDB au keychain (write-only), mode dégradé + fallback mock ;
      **recette réelle** sur CouchDB local Docker (harnais `docker/`) — a révélé+corrigé un bug Mango `no_usable_index`
      (tri sur clé d'index complète) ; candidate `v0.4.0-rc`. Différé tracé : volet machine « tracer les délégations »,
      filtre event/fiche jalon, temps réel `_changes`, corrélation projet.)*
- [ ] **(Horizon, non planifié)** **Cible web parallèle (différé)** — UI navigateur servie par un
      **daemon local** réexposant les commandes (FS/git/PTY/SQLite/keychain) en HTTP local via la
      couture `src/api/backend.ts` (transport `fetch()` alternatif à `invoke()`). **Desktop + web
      maintenus en parallèle**, desktop premier. Points durs à cadrer le jour venu : auth, CSP, FS
      sur HTTP local, ports. → `specs/PROJET.md §10.1` *(révision 2026-06-25 ; pas d'instruction
      tant que le lot n'est pas pris).*
