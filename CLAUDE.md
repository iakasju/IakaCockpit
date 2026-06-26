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

# Vignettes thémées (L9) — copie un sous-ensemble de PNG iakagraph + manifest :
bash scripts/sync-vignettes.sh                       # défaut : naonedge {dark,light} x {lotr,avengers,starfleet} x 5 rôles
IAKAGRAPH_ROOT=~/work/iakagraph TEAMS="lotr avengers starfleet" bash scripts/sync-vignettes.sh
# Les PNG sont COMMITÉS (src/assets/vignettes/) et servis en 'self' (CSP intacte).
# Relancer seulement pour mettre à jour le casting (nouvelle team / charte).

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
- [ ] **L5** — Traçage MACHINE des délégations (canal geste → iakaboxlogs)
      → `specs/instructions/L5-tracage-machine-delegations.md`
      *(**cadré (BROUILLON), À VALIDER par Stéphane — NON démarré**. Volet machine de la piste « tracer les
      délégations » rattachée à L4 ; trace HUMAINE = chaîne de badges (déjà en place), trace MACHINE = iakaboxlogs.)*
- [x] **L6** — Canal adresse externe (**SORTANT**) via n8n-passerelle unique
      → `specs/instructions/L6-canal-adresse-externe-n8n.md`
      *(implémenté, **gate Legolas PASS** — 93/93 front + 104/104 Rust (dont 12 `notify`), candidate `v0.5.0-rc` ;
      cadré par 🧙 Gandalf. Le Cockpit POSTe **UN** webhook n8n
      (`notify_user` via façade unique) → **n8n route** vers Discord/Slack/MQTT — « on câble, on ne
      route pas », calque L3/L4 (`ureq` + keychain + mock + dégradation). Payload **canal-agnostique**
      `{canal:"adresse",support,cible,message,meta}` ; `n8n_webhook_url` en config non sensible,
      **token webhook au keychain** (write-only), **AUCUN secret de support** (Discord/Slack/MQTT)
      côté app — ils restent dans n8n. Déclencheur testable = bouton « Tester l'envoi » (Réglages).
      Lien vision : PROJET **§4 admin général** + **§5 canal adresse**. **Phase 1 = sortant seul** ;
      **bidirectionnel = Lot 2 différé**. À arbitrer : qui choisit le support actif (reco Cockpit),
      versionner le flow n8n de référence (reco oui). Est. ~2 j-homme.)*
- [x] **L7** — Seed démo dev (projet test + team lancée + config par défaut)
      → `specs/instructions/L7-seed-demo-dev.md`
      *(implémenté, **gate Legolas PASS** — 105/105 front + 118/118 Rust (dont 14 `seed`), candidate `v0.6.0-rc` ;
      arbitrages AR-1..4 tranchés par Stéphane (2026-06-26), cadré par 🧙 Gandalf. Au lancement du **build DEV/TEST uniquement** (derrière flag `cfg!(dev)` OU
      `IAKACOCKPIT_DEMO_SEED=1` — **ZÉRO seed en prod**), l'app s'ouvre **déjà peuplée** : (1) **vrai dossier
      démo** `<chapeau>/iaka-demo` (mini-repo git réel via `git::capture`, `specs/` pour donner du contexte à
      L3), détecté par `scan_portfolio` (L1) ; (2) **team « lancée »** = **5 onglets** PTY titrés
      `[ROYAUME][Agent]` (Odin/Aragorn/Gandalf/Gimli/Legolas — shells nus, **pas** de runner, HORS lot), un
      shell par agent (L2) ; démarrage sur **Portfolio** ; (3) **config par défaut** non sensible : IA =
      **Ollama HÔTE** `http://localhost:11434/v1` + `llama3.1:8b` (« mon Ollama local » — **pas** le conteneur
      `:11435`), CouchDB `:5984/conversations`, n8n `:5678`. **Idempotent & non destructif** : « créer si
      absent », **ne JAMAIS écraser** config/dossier/onglets ; **AUCUN secret seedé** (démo L4 = mock/fallback).
      Réutilise l'existant (scan/PTY/config/git), **aucune** nouvelle commande métier ni dépendance. Façade
      unique `seedDemo()`. Est. ~2 j-homme.)*
      *(**implémenté côté Gimli — REMIS AU GATE LEGOLAS, non auto-validé** : `src-tauri/src/seed.rs`
      (`demo_seed_enabled()` = `cfg!(dev)||IAKACOCKPIT_DEMO_SEED=1`, `seed_demo` idempotente/non destructive,
      `SeedReport`), branché `lib.rs` ; façade `seedDemo()` + `SeedReport` ; `src/mock/demoTeam.ts` (`DEMO_TEAM`
      5 agents) ; hook `src/hooks/useDemoSeed.ts` (onglets team si `tabs.length===0`, exécution unique, reste
      sur Portfolio) câblé dans `App.tsx`. **Front 105/105 + Rust 14 tests seed** (flag, idempotence config/dossier,
      non-écrasement, garde non sensible, no-op prod). Aucun secret keychain (AR-3), aucun appel réseau.)*
- [x] **L8** — Conversation projet (chat/shell + roster team) → `specs/instructions/L8-conversation-projet.md`
      *(implémenté, **gate Legolas PASS** — 125/125 front + 132/132 Rust, candidate `v0.7.0-rc` ; arbitrages AR-1..5 TRANCHÉS par
      Stéphane (2026-06-26), cadré par 🧙 Gandalf. **Livré en un seul bloc** : `shell.rs` login `-l` Unix (D10,
      Windows inchangé) ; `ai.rs` commande `chat(path, agent, messages)` (généralise `call_endpoint`→`post_chat`,
      `build_prompt_chat` persona-aware + table 5 personas, mock/dégradation calque `next_step` **intact**) ;
      façade `chat()` + `ChatMessage`/`ChatReply` ; `useConversations` (1 conv/projet, toggle gardant le PTY,
      `@agent` persona) ; `Chat.tsx` (bulles + saisie) ; `Roster.tsx` (5 agents + statut + clic `@agent`) ;
      `WorkingView` reworké (tabsbar retirée, PTY monté caché jamais démonté) ; `useGridState` slimmé (nav 3-vues) ;
      `useDemoSeed` réconcilié L7 (1 conversation). **132 tests Rust + 125 front verts**, `bash scripts/quality.sh`
      OK ; façade unique + CSP intactes (greps OK). **Prompt persona AR-4 = wording proposé, à confirmer.** PTY réel
      + chat Ollama réel = recette manuelle `tauri dev` (non couverts unitairement, assumés). Cadrage ci-dessous.)
      *(**cadré, arbitrages AR-1..5 TRANCHÉS par Stéphane (2026-06-26)** ;
      cadré par 🧙 Gandalf. Rework de la vue **Working** suite à un **retour terrain** : **1 projet = 1
      conversation active**, avec **toggle Chat↔Shell**. **Shell** = `PtyTerminal` L2 typeable **plein cadre**
      reproduisant le **TERMINAL RÉEL** de Stéphane (AR-2 enrichi → ajustement socle L0 `shell` : **login shell
      interactif `-l`** sourçant `~/.zprofile`/`~/.zshrc` — PATH/alias/prompt identiques) ; fin des 5 onglets
      PTY. **Chat** = bulles WhatsApp **multi-tours persona-aware via Ollama** (client IA L3 réutilisé :
      `call_endpoint` généralisé en `messages[]` long, `chat(path, agent, messages)`, même endpoint/mock/
      dégradation ; `next_step` intact). **Interlocuteur = RESPONSABLE** par défaut (Aragorn projet / Odin
      portefeuille) + **`@agent`** au clic roster (changement de **persona**, un seul appel `chat` — pas
      d'orchestration). **Ouverture en CHAT** (AR-2). **Widget ROSTER** = 5 agents `DEMO_TEAM` (AR-3) + statut
      **attend/travaille** (local MVP). **Réconcilie le seed L7** (`useDemoSeed` ouvre 1 conversation + roster,
      plus 5 onglets ; reste du contrat L7 préservé). Gardes : façade unique (`chat()`), CSP intacte, PTY
      **survit au toggle** (monté caché, pas démonté — garde n°1), pas de god-component, MVP (historique
      **mémoire**, `stream:false`). Différé/tracé : persistance + lien mains courantes (DEP-2), **orchestration
      multi-agent réelle** + statut « vivant » temps réel (DEP-1), streaming, commutateur présentation A/B/C.
      **Livré en UN SEUL BLOC** (AR-5), un seul gate Legolas (structuration P1 enveloppe / P2 chat = guide
      d'implémentation interne). AR-4 = prompt **persona-aware** (wording à confirmer). Est. **~4 j-homme**
      (réévaluée +0,5 j après enrichissement AR-1 `@agent`/roster + terminal réel D10).)*
- [x] **L9** — Démo enrichie : vignettes thémées par team + projet démo dans Working + conversation
      préchargée → `specs/instructions/L9-demo-enrichie.md`
      *(implémenté, **gate Legolas PASS** — 170/170 front + 132/132 Rust, candidate `v0.8.0-rc` ; 3 teams
      (lotr/avengers/starfleet) naonedge dark+light, CSP intacte, 30 PNG en `'self'`. Cadré par 🧙 Gandalf (2026-06-26), suite à un **retour terrain L8**. **Phasé** : **L9-P1** = (B) fix
      `useDemoSeed` ajoute `iaka-demo` au **set de Work** (`workset.add`, idempotent, flag dev — le projet
      apparaît enfin dans Working) + (C) **conversation préchargée cohérente** : historique de **chat** mocké
      (`src/mock/demoConversation.ts`, chaîne de badges délégation Aragorn→Gandalf / rapport / **verbatim**) via
      `openConversation(..., initialHistory?)`, ET **main courante** L4 enrichie (`docker/init-couchdb.sh`,
      séquence cohérente délégation **canal geste** / rapport / verbatim, `conv_id:"iaka-demo"`, docs `demo-1`
      conservés). **L9-P2** = (A) **vignettes iakagraph par charte×team** dans **roster + chat** : résolveur
      `resolveVignette(charte, team, roleIndex)` sur un **manifest** généré depuis `teams.json` (ordre = rôle),
      sous-ensemble de PNG **embarqués dans le bundle front** (`src/assets/vignettes/`, servis en `'self'` →
      **CSP intacte, zéro asset-protocol, zéro scope FS, offline**) via `scripts/sync-vignettes.sh` ; clé config
      `ui_team` persistée + sélecteur dans Réglages ; **fallback pastille `[ROYAUME][Agent]`** si vignette
      absente (jamais d'image cassée). MVP : charte **naonedge** (dark+light) × **3 teams** (lotr défaut /
      avengers / starfleet) × 5 rôles. Réutilisation pure (vignettes Loki, roster/chat/conversations L8, seed L7,
      main courante L4) ; façade unique, pas de god-component. Arbitrages ouverts : **B-1** (libellés royaume vs
      rôle — reco garder + `roleIndex`), **C-1** (3 teams vs 11 — reco 3). Est. **≈ 2–3,5 j-homme** (P1 ~0,5–1 j,
      P2 ~1,5–2,5 j).)*
- [~] **L10** — Ré-architecture conversation/session (**terminal-source + chat-vue**) — **EN COURS : L10a PASS, L10b à venir**
      → `specs/instructions/L10-conversation-session.md`
      *(**cadré par 🧙 Gandalf, re-cadré post-spikes (2026-06-26)**, met l'app en conformité avec la **vision
      gravée** `PROJET.md` **§ 0**. **VIRAGE acté** : après le spike P0 (`stream-json` en pipes, `3ad0ffb`)
      qui marchait MAIS **tuait la TUI native** (réflexes `Shift+Tab`/`esc`), le spike **L10b** (`b7ac879`,
      `specs/mock/spike-l10b/`) a prouvé la cible : **runner en TUI NATIVE dans le PTY** (réflexes intacts)
      **+ vues dérivées du TRANSCRIPT JSONL de session** que Claude Code écrit en direct
      (`~/.claude/projects/<cwd-escaped>/<sid>.jsonl`) — **zéro parsing ANSI**. Couture pipes `runner.rs`
      **parquée au chaud** (`0ddebc7`/`b10b393`, repli `stream-json` documenté). 6 arbitrages tranchés :
      permissions = **allowlist explicite** (`--allowedTools Read,Glob,Grep,Bash` + pré-requis trust), gate
      **fin L10a/L10b**, `ai.rs chat` reframé **source Ollama**, esc = bouton chat + natif, `@agent` verbatim,
      délégations conditionnées à un **run de confirmation live** (`Task`/`isSidechain`). Abstraction
      `ConversationSource` (3 cas : Claude Code ✅ prouvé, Ollama API, **Codex à spiker** — CLI non installé,
      P0bis différé).*
      *(**L10a (P1) — gate Legolas PASS + recette terrain OK** (2026-06-26, candidate `v0.9.0-rc`). 165 Rust
      (+18 `terminal::`) + 194 front verts, `quality.sh` OK. `terminal.rs` étendu (`pty_runner_open`,
      `RunnerSpec` claude-code/shell, session_id uuid pré-généré + `transcript_path`, **scrub env
      `CLAUDE_CODE_*`**, allowlist, `validate_cwd` conservé) ; Working bascule la vue Shell sur la **TUI
      native** (`PtyTerminal runnerKind=claude-code`, auto-lancé hands-off dans le cwd) ; pipes parqué
      débranché. **Recette réelle validée** : transcript écrit dans `iaka-demo` (preuve scrub env + auto-launch
      cwd). Commits `f99cdba`/`5335143`.)*
      *(**L10b (P2+P3) — À DÉMARRER** : tailer `transcript.rs` côté Rust → `runner://event` (parse défensif,
      mapping paroles/gestes/`Task`+`isSidechain`/activité/pensée), vues filtrées (chat = paroles, widget
      délégations, état agents), **entrée partagée** chat↔terminal, bouton esc chat ; puis P3 réglages
      globaux + reframe `ai.rs chat` Ollama. Gate Legolas L10b unique. Délégations à confirmer par un run live
      avant fermeture du widget.)*
- [ ] **(Horizon, non planifié)** **Cible web parallèle (différé)** — UI navigateur servie par un
      **daemon local** réexposant les commandes (FS/git/PTY/SQLite/keychain) en HTTP local via la
      couture `src/api/backend.ts` (transport `fetch()` alternatif à `invoke()`). **Desktop + web
      maintenus en parallèle**, desktop premier. Points durs à cadrer le jour venu : auth, CSP, FS
      sur HTTP local, ports. → `specs/PROJET.md §10.1` *(révision 2026-06-25 ; pas d'instruction
      tant que le lot n'est pas pris).*
- [ ] **(Horizon, non planifié)** **Daemon iaka — com / sandbox / admin de la iakasuite** *(idée Stéphane
      2026-06-25)*. Un service iaka unique offrant : **com** (passerelle des canaux adresse/geste/pensée —
      notifications & dialogue user↔agents, rôle type n8n-passerelle), **sandbox** (exécution isolée des
      runners/agents), **admin** (administration transversale de toute la iakasuite). **Converge probablement
      avec le « daemon local » de la cible web ci-dessus** — même brique backend réexposée. Horizon : à
      explorer/cadrer le moment venu, pas d'instruction tant que le lot n'est pas pris.
