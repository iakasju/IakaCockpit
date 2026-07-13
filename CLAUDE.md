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
- [x] **L5** — Traçage MACHINE des délégations (canal geste → iakaboxlogs)
      → `specs/instructions/L5-tracage-machine-delegations.md`
      *(**LIVRÉ, gate Legolas PASS** (2026-06-27). Volet machine de la piste « tracer les délégations » rattachée à
      L4 ; trace HUMAINE = chaîne de badges (déjà en place), trace MACHINE = iakaboxlogs. **Hors dépôt Cockpit** :
      vit dans `~/.claude/delegation-guard.mjs` (hook) + `iakaboxlogs` (commit `09e8693`). Une délégation `Task`/
      `Agent` émet un doc `meta.canal:"geste"` qui atterrit en CouchDB (lu par L4/Journal). Fixés : émission
      fire-and-forget + TDZ `EMIT_TIMEOUT_MS` → l'émission **livre** vraiment (doc prouvé en base). Hook **fail-open
      triple-borné 1,5s** (jamais de blocage/pendaison d'une délégation), refus hors-roster (exit 2 + doc refused),
      anti-bruit (sous-agents natifs), borne identité. Différés : MQTT non recetté (box .11 offline), idempotence
      `_id` partielle, parité `.ps1` Windows.)*
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
- [x] **L10** — Ré-architecture conversation/session (**terminal-source + chat-vue**) — **L10a + L10b LIVRÉS (gate PASS + recette terrain OK), candidate `v0.9.0-rc`**
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
      *(**L10b (P2+P3) — gate Legolas PASS + recette terrain OK** (2026-06-26). Tailer `transcript.rs` côté Rust
      → `runner://event` (parse défensif, mapping paroles/gestes/**délégation = tool `Agent`** (pas `Task` !)
      /activité/pensée), vues filtrées (chat = paroles attribuées par badge, gestes, délégations), **entrée
      partagée** chat↔terminal (écho + `pty_write`, `@agent` verbatim), bouton esc chat, réglages globaux
      (modèle/allowlist/trust/pensée en config), roster vivant. **3 cycles de débogage recette** : (1) args
      Tauri v2 **camelCase** pour le tailer (snake_case → commande rejetée silencieusement) ; (2) double-spawn
      **StrictMode** (garde `spawnRef`, PTY ne ferme plus au démontage) ; (3) plafond d'attente du tailer
      **retiré** (Claude crée le transcript tard, après trust + 1er message). Recette finale OK avec `iaka-demo`
      **pré-trusté** (`hasTrustDialogAccepted`). 234 front + 202 Rust verts. Commits `2954314`..`d4d0326`.)*
      *(**Différé tracé (post-L10, hors lot, décidé avec Stéphane)** : (a) **spike P0bis Codex/ChatGPT** (CLI non
      installé — vérifier `~/.codex/sessions`) avant tout runner Codex ; (b) **rendu xterm de la TUI native**
      lent + lignes qui se chevauchent au scroll (gênant, secondaire) ; (c) **modèle « chef nu vs team »** : le
      chef = `claude` générique, pas la team iakaframe (faut-il auto-`iakastart` ? rapport persona/roster ↔ chef
      réel ?) ; (d) **Stop hook `identity-guard`** se déclenche sur le chef (hérité de `~/.claude` global) — à
      neutraliser ou assumer ; (e) `isSidechain:true` non reconfirmé en TUI interactive (mappé/testé sur
      fixtures). Voir mémoires `runner-natif-tail-transcript`, `transcript-delegation-agent-tool`.)*
- [x] **L11** — Teams & agents (définition de premier rang) + liaison projet↔team
      → `specs/instructions/L11-teams-agents-definition.md`
      *(implémenté, **revue de version complète PASS** (2026-06-27), **candidate `v0.10.0`** ; doc qualité
      `docs/qualite/v0.10.0.md`. Remplace le cadre FAUX `L11-runner-par-slot-team-projet.md` (rejeté par
      Stéphane). La **TEAM = objet de premier rang** ; agent = persona + **runner + modèle + skills** ;
      définition team/agents dans Settings (`TeamsEditor`) livrée EN ENTIER ; liaison `project_team:<id>` +
      popup `TeamPicker` (défaut = dernière team / 1ʳᵉ fois = team n°1 ; annulation = team par défaut ; pas
      d'invalidation) ; conversation routée au **coordinateur** ; `@agent` borné à la team ; de-hardcodage
      runner (coordinateur → `pty_runner_open`, **Rust inchangé**) ; **exécution staged honnête** (coordinateur
      `claude-code` réel, bannière pour ollama/litellm/codex définis-mais-non-câblés). `DEMO_TEAM` = team par
      défaut éditable ; seed `project_team:iaka-demo`. Arbitrages AR-1..7 + gate tranchés par Stéphane. Org :
      **Gandalf retiré, le chef de projet (coordinateur) gère cadrage + coordination**. Correctifs d'appoint :
      `a30bf29` (démo → coordinateur résolu), `50f410a` (V1 `is_secret` robuste au namespace `project_team:` —
      liaison silencieusement perdue pour projets au nom piégé). 268 front + 194 Rust verts, couverture
      77 % stmts. Dissout le différé (c) L10. Différés : runners réels par agent / orchestration multi-agent,
      exécution ollama/litellm/codex, allowlist/trust par agent, live-switch coordinateur.)*
- [x] **L12** — **Journal** : main courante (L4) dans une **page dédiée** (4ᵉ vue)
      *(LIVRÉ, gate PASS, scellé **v0.11.0**. `MainCourante` sortie de `PortfolioView` → `JournalView` ;
      `journal` ajouté à `useGridState` + nav ; Portfolio recentré. Renommé Iakajournal→Journal. Composant/hook
      L4 réutilisés inchangés.)*
- [x] **L13** — **Page Teams** : gestion teams/agents/skills en **vue dédiée** (5ᵉ vue)
      *(LIVRÉ, gate PASS, scellé **v0.11.0**. `TeamsEditor` sorti de Réglages → `TeamsView` ; `teams` ajouté à
      `useGridState` + nav ; menu Settings repassé à 9 sections (au passage : menu de gauche rendu fidèle aux
      sections + fonctionnel, fin du double-`active`). `useTeams` reste l'autorité.)*
- [x] **L14** — **Chartes iakagraph** : voir/appliquer les 10 chartes dans Réglages
      *(LIVRÉ, gate PASS, scellé **v0.11.0**. `scripts/sync-chartes.sh` synchronise les `tokens.css` des 10
      chartes via un **pont de 23 variables** (contrat app ← iakagraph) → `src/assets/chartes/chartes.css`
      (`'self'`) + `manifest.ts` ; `SettingsView` liste les 10, sélection repeint l'app. naonedge dark/light
      hand-written (défaut). CSP intacte. Hors lot tracé : **vignettes-par-charte / teams par défaut** (chaque
      charte iakagraph a les vignettes de ~11 teams).)*
- [x] **Runner Codex** — 2ᵉ **runner réel** (multi-runner concret)
      *(LIVRÉ, gate PASS, scellé **v0.11.0** ; spike P0bis fait. `RunnerSpec` codex → TUI native `codex` (binaire
      bundlé `/Applications/Codex.app/Contents/Resources/codex`) en PTY ; `codex.rs` tailer du **rollout JSONL**
      `~/.codex/sessions/…` (jumeau du transcript Claude) avec mapping codex défensif ; refacto `tail_resolved`
      partagée Claude/Codex (non-régression Claude prouvée au code). Bannière levée pour `codex`. Recette réelle :
      session Codex (trust natif, rendu xterm, shapes gestes). Voir mémoire `spike-codex-runner-resultat`.)*
- [x] **v0.12.0 — Refonte UI direction A + i18n + 7 rôles + panneau Tâches** (jalon design/produit)
      *(LIVRÉ, **revue de version PASS** (2026-06-28), candidate `v0.12.0` ; doc qualité `docs/qualite/v0.12.0.md`.
      Bundle : (1) **Refonte UI direction A** (mock Loki) — rail texte (Portefeuille/Travail/Journal/Équipes/
      Réglages), grammaire **sans-bord/aérée**, police **Space Grotesk+Inter bundlées** (`'self'`), **défaut
      studio-clair**, Réglages sans emojis ; Page **Teams liste+fiche** ; (2) **Vignettes WebP 256px** (118 Mo PNG
      → ~9,6 Mo, re-sync iakagraph) ; (3) **7 rôles canoniques** (portefeuille…doc, `roles.ts`) + team iakaframe
      par défaut **7 agents** + champ rôle = menu ; (4) **i18n react-i18next FR/EN** (sélecteur Réglages, deps
      bundlées zéro-distant, parité fr/en testée) + rail FR cohérent ; (5) **Panneau « Tâches en cours »**
      (Working droite, délégations live du transcript `tool_use_id`→running/done, garde L10 PtyTerminal non
      démonté) + vitrine démo. 332 front + 217 Rust verts (Rust **non touché**), couverture 83,6 %. Org : Gandalf
      retiré, chef de projet = cadrage+coordination. Différés : aria-label webhook, noms de chartes i18n, **purge
      historique git 118 Mo avant push**, recette EN + Codex réel + panneau en délégation réelle.)*
- [x] **L15** — **Vignettes-par-charte / teams par défaut** — *(LIVRÉ 2026-06-29, commit `a1fc11f` ;
      amont iakagraph `f952db2`).* Réalisé en deux temps : **L15-B** (déjà en place) bootstrappe les 11
      teams du catalogue iakagraph comme teams par défaut (`ensureDefaultTeams`/`teamFromCatalog`) +
      vignettes suivant la **charte active** (`makeAvatarResolver(settings.theme, …)`, auto-casting
      `vignetteTeam = id team`) ; puis **L15-noms** → chaque agent du catalogue affiche le **nom du
      personnage** de la vignette (Beast, Professor X, Captain America, R2-D2…) au lieu du slug. Source de
      vérité = iakagraph `teams.json` (champ `name` sur 88 entrées) recopié dans `catalog.ts` par
      `sync-vignettes.sh`. 333 front verts, typecheck + lint OK. Instruction
      `specs/instructions/L15-noms-personnages-teams-catalogue.md`. Reste possible (horizon) : faire
      **suivre les vignettes à la charte** au-delà du roster (déjà le cas via `settings.theme`) ; rien de
      bloquant.
- [x] **v0.13.0 — Identité Atelier/Étagère/Table + main courante par hook + widgets de la Table** (jalon)
      *(SCELLÉ 2026-06-30 ; doc qualité `docs/qualite/v0.13.0.md` ; 360 front + 221 Rust verts, `quality.sh` OK).*
      Bundle : (1) **Identité** Atelier/Étagère/Table — relabel d'EXPÉRIENCE (rail, vues, geste prendre→poser→
      ranger), socle technique intact (`specs/design/identite-atelier-etagere-table.md`). (2) **L18 — main
      courante par hook** (fondation « instrumenter, pas gratter ») : hook `~/.claude/plan-courante.mjs` émet le
      plan complet → CouchDB (lu par L4) ; schéma unifié, émetteur par source ; `FeedEvent.meta` passthrough.
      (3) **Widgets de la Table** dérivés du transcript : #1 Étagère (KPIs+3 col responsive-conteneur+économie),
      #2 attribution (gouttière), #3 plan vivant (checklist), #5a économie (multi-ligne coord/délégués), #6
      mémoire (jauge+frontière compaction), #7 effets (heatmap fichiers×tours). (4) **L19 — Gantt** : #9a réalisé
      (snapshots plan→timeline+alerte), #9b prévisionnel (baseline `[~Xmin]` option A+dépassement), **obligation
      coordinateur** injectée au runner (`--append-system-prompt`) → prévisionnel LIVE. (5) **Démo** iaka-demo
      enrichie (tous widgets pertinents, fallback dev-gardé, zéro fausse donnée prod). Instructions
      `specs/instructions/L17/L18/L19`. Différés : recettes live, flèches Gantt, #5b treemap cross-projet,
      widgets Journal, économie par agent nommé.
- [x] **L16** — **Portefeuille : toggle Liste/Tuiles de l'Atelier + navigation Économie + tuile enrichie + pastille d'urgence**
      → `specs/instructions/L16-portefeuille-toggle-tuiles-eco-navigation.md`
      *(**LIVRÉ, scellé `v0.17.0`** 2026-07-12 ; doc qualité `docs/qualite/v0.17.0.md` ; 2 gates Legolas PASS —
      538 front + 274 Rust verts, couverture ~75 %. Cadré + coordonné par 🟠 Aragorn, arbitrages AR-1..7 tranchés
      par Stéphane).* Évolutions IHM de la
      page Portefeuille (Étagère) : **(F1)** un **toggle Liste↔Tuiles**
      sur la section **Atelier** (projets rangés hors table) — mode Tuiles = cartes `.proj` réutilisées, action
      « poser sur la table », tokens « — » + anneau neutre, avatars team ; défaut = Liste ; portée **atelier
      seul** (la table reste en tuiles). **(F2)** **double-clic** sur une cellule du **widget Économie** (treemap)
      ⇒ **bascule sur Travail avec le projet au premier plan** (`openProject` + `setActiveView("working")`),
      **sans** mutation du workset ni élargissement du scoping (**AR-4 conservé**). **(F3, incrément post-gate)**
      contenu enrichi de la **tuile projet** : **description dédiée en gras** (nouvelle donnée Rust
      `portfolio.rs`) + ligne **`next :`** = 1er item non coché `- [ ]` du backlog `CLAUDE.md` + méta
      **version / N commits de retard / N étapes restantes** (chaque item masqué si absent, zéro fausse donnée).
      F1/F2 = pur front ; **F3 étend le scan Rust** (struct `Project` + `read_description`/`read_backlog` +
      tests) et son miroir `backend.ts` ; **AR-6=B** description = `specs/PROJET.md` prioritaire.
      **(F4)** **pastille d'urgence** à gauche du titre dérivée de `backlog_remaining` (🔴≥5 / 🟠1-4 / 🟢0 / gris),
      `read_backlog` renvoie `Some(0)` si tout coché (AR-7, seuil N=5) ; **(F4-bis)** pastille **partagée et
      identique** liste↔tuile (helper `urgency.ts`). Réutilisation (façade D7, `scan_portfolio` existant,
      présentationnel D8, CSP, i18n fr/en). **Scellé avec, dans `v0.17.0`** : **L23-incrément** (retrait de la
      Table ferme PTY+conversation, job de reprise conservé) · **page Cadre débranchée** du rail (code conservé) ·
      **affichage statut de reprise débranché** (job conservé) · règle Cadre **`obligation oblig-def-projet`**
      (obligation coordinateur : maintenir la def projet dans `PROJET.md`, aussi en mémoire + contrats de rôle) ·
      **fix vignettes** (team par défaut legacy `Aragorn.roleIndex=2` → réalignement canonique one-shot
      non destructif + garde anti-récidive TeamsEditor). Différés : persistance du toggle, a11y clavier treemap,
      confirmation au retrait. *(Remplace le contenu vocal de la case L16 — cf. lot vocal ci-dessous, conservé.)*
- [x] **L24** — **Onglets par projet + fenêtres de travail toujours ouvertes** (vue Travail)
      → `specs/instructions/L24-onglets-projet-table-fenetres-ouvertes.md`
      *(**LIVRÉ, scellé `v0.18.0`** 2026-07-12 ; doc qualité `docs/qualite/v0.18.0.md` ; 2 gates Legolas PASS,
      550 front verts, Rust non touché. Cadré+coordonné par 🟠 Aragorn, AR-1..3 tranchés).* Tous les projets
      de la Table gardent leur fenêtre vivante : **(F1)** ouverture **eager** dès la pose sur la Table (projets
      liés ; helper pur `reconcileEagerOpen` + effet App anti-boucle/anti-popup) ; **(F2)** **barre d'onglets
      par projet** (`ProjectTabs`, nom du projet, actif mis en évidence, « × » = retrait via L23-inc), worklist
      gauche conservée (AR-1) ; **(F3)** toggle Shell/Conversation par onglet, **garde L10 intacte** (PtyTerminal
      jamais démonté au switch). + **fix en-tête** conversation (fin du double « Aragorn » : coordinateur affiché
      seulement s'il diffère de l'interlocuteur ; collision bouton esc corrigée, en-tête sur une ligne). Front
      seul. Différés : DnD onglets, garde perf N runners, bouton + dans la barre, **L25** (s'attacher à la session
      vivante — cible v0.19.0).
- [x] **L25** — **S'attacher à la session vivante d'un projet (vue live du transcript)**
      → `specs/instructions/L25-attacher-session-vivante-vue-live.md`
      *(**LIVRÉ, scellé `v0.19.0`** 2026-07-12 ; doc qualité `docs/qualite/v0.19.0.md` ; gate Legolas PASS —
      563 front + 279 Rust verts, fmt/clippy OK. Cadré+coordonné par 🟠 Aragorn, AR-1..3 tranchés ; branche
      `feat/L25-…` fusionnée ff dans main).* Ouvrir un projet **s'attache à sa
      session vivante** (tail du transcript le plus récent du cwd, **vue live lecture seule, sans PTY**) au lieu
      de spawner une session vierge → on voit **la conversation en cours** (ex. celle du terminal). F1 commande
      Rust `latest_transcript(cwd)` ; F2 mode conversation **« attached »** (tail sans PTY) vs **« owned »** ;
      F3 UI attachée (badge « session vivante · lecture seule », saisie désactivée, bouton « démarrer un runner »).
      Réalise la vision terminal-source/chat-vue pour les sessions **externes**. Différés : reprise typable
      `--resume`, sélecteur multi-sessions, seuil de fraîcheur.
- [x] **L26** — **Mode focus plein écran de la Table** (feux macOS jaune/vert)
      → `specs/instructions/L26-mode-focus-plein-ecran-table.md`
      *(**LIVRÉ, scellé `v0.20.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.20.0.md` ; gate Legolas PASS —
      571 front + 279 Rust verts, fmt/clippy OK. Cadré+coordonné par 🟠 Aragorn, AR-1 tranché).* Deux **feux
      macOS** (vert=agrandir, jaune=restaurer) à droite des onglets : **vert** masque le rail + la worklist,
      agrandit `.workpane`, **garde** la colonne widgets droite + onglets + toggle Shell/Conversation, ET passe
      l'app en **fullscreen** (commande façade Rust `set_fullscreen`) ; **jaune** = rétablit les colonnes
      **seulement** (AR-1, sortie fullscreen via feu natif macOS). Front + 1 commande Rust ; barre d'onglets
      rendue même à 0 onglet. Différés : icône hover, bouton rouge, raccourci clavier, persistance.
      **Itération recette → scellé `v0.21.0`** (2026-07-13, gate PASS, 571 front, Rust intact) : les 2 feux
      (pas assez explicites) sont remplacés par un **switch coulissant collé à droite** avec l'icône `⤢` sur
      la pastille (`role="switch"`, toggle **symétrique** : sortie fullscreen incluse — AR-1 supersédé). Fix
      structurel : switch sorti du conteneur `overflow-x:auto` (`.projtabs-list` scrollable + `.fsswitch`
      frère). **Vérifié en CDP réel** : `gapRight=0` (collé à droite). Commits `3a4f408`→`4270a34`.
- [x] **L30** — **Page « Analytics » (remplace le Journal)** → `specs/instructions/L30-page-analytics.md`
      *(**LIVRÉ P1+P2, scellé `v0.26.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.26.0.md` ; gates Legolas PASS
      — Rust 300 + front 657. Cadré+coordonné 🟠 Aragorn, arbitrages tranchés par Stéphane).* 6ᵉ vue **Analytics**
      dans le rail (remplace Journal, **Journal débranché-gardé**) : comprendre en rétrospective la performance de
      la config d'équipe. Colonne **Périmètre** (`ALL` + projets tri tokens desc) + **plage de temps**
      (24h/7j/30j/Custom, défaut 7j→now) + **4 perspectives** (V1 Dashboard, V2 Timeline, V3 Comparaison, V4 Par
      agent). **P1** = enveloppe + 4 perspectives (front). **Débranchement data démo** (`DEMO_DATA_ENABLED=false`,
      mocks conservés) → recette sur du réel. **P2 « Analytics réel »** (Rust) : **coût $** (`pricing.rs` table par
      modèle embarquée + refresh background au démarrage, 4 buckets usage séparés, locaux=0$, modèle inconnu
      signalé ; `analytics_cost` par période/modèle) + **délégations réelles par agent** (`delegations_by_agent`,
      comptes/durées via `tool_use Agent`↔`tool_result`). **Zéro fausse donnée** : tokens/$ **par agent nommé** =
      placeholder (sous-agents hors transcript parent, `isSidechain` toujours false → **spike différé**), + temps
      agent / top délégations $ / callout variation / comparaison V3 = placeholder. Différés : spike per-agent
      tokens/$, V3 bi-période réel, **compaction UI « zones vides »**.
- [x] **L29** — **Swimlanes d'agents** (arbre de délégation HORIZONTAL, variante B) → `specs/instructions/L29-swimlanes-agents.md`
      *(**LIVRÉ, scellé `v0.24.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.24.0.md` ; gate Legolas PASS —
      600 front, Rust intact).* Rendu **horizontal compact** des délégations = **variante B** du mock
      d'hypothèses (`hypotheses/arbre.html`) : `AgentSwimlanes` (SVG, calque `ActivityTimeline`) — **couloir
      par agent** + axe temps + **barres** (`ts`→`doneTs` ou ouvertes si running, 🟠/🟢) + **flèches de
      délégation** coordinateur→délégué (MVP 1 niveau) + ascenseur horizontal. `useAgentTasks` gagne `doneTs`.
      Travail : **toggle « Arbre / Couloirs »** (L28 vertical ↔ L29 horizontal, mêmes données, défaut Couloirs) ;
      `DelegationTree`+`GanttPanel` conservés. Front seul. Commit `135c688`. Zéro fausse donnée (pas de
      barre/flèche sans ts). Différés : flèches multi-niveaux (parent réel), prévisionnel/baseline, swimlanes
      au Journal.
      **Révision recette → scellé `v0.25.0`** (2026-07-13, gate PASS, 605 front) : **R1** labels d'agents
      **fixes** (colonne gelée hors scroll horizontal) ; **R2** repères d'heure **toujours lisibles**
      (gridlines + labels `HH:MM`, densité adaptée) ; **R3** **zoom +/−** sur l'axe temps (bornes `[0.25…4]`).
      Commit `946c1af`.
- [x] **L28** — **Arbre des délégations** (chantier IHM B ; remplace le Gantt) → `specs/instructions/L28-arbre-delegations.md`
      *(**LIVRÉ, scellé `v0.23.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.23.0.md` ; gate Legolas PASS —
      589 front, Rust intact).* Composant `DelegationTree` (coordinateur → délégués, coloré 🟠 running /
      🟢 done, avatars, compteur, MVP 1 niveau) : **remplace le Gantt** en Travail (bouton « Arbre », Gantt
      débranché-gardé via `GANTT_ENABLED=false`) + arbre du projet au **Journal** (`deriveDelegationsFromFeed`,
      canal geste, statut `done` best-effort honnête — **zéro fausse donnée**). Front seul (`DelegationTree`,
      `MainCourante`, `WorkingView`). Commit `431a538`. Différés : statut `done` fin au Journal, imbrication
      multi-niveaux. **Les deux chantiers IHM (L27 filtres + L28 arbre) sont bouclés.**
- [x] **L27** — **Filtres de canaux au-dessus du chat** (chantier IHM A) → `specs/instructions/L27-filtres-canaux-chat.md`
      *(**LIVRÉ, scellé `v0.22.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.22.0.md` ; gate Legolas PASS —
      575 front, Rust intact).* Barre de chips (**Parole/Geste/Délégation/Activité/Pensée**) au-dessus du fil
      du chat : toggle de visibilité par canal, généralise le toggle `pensée` existant (Pensée **persistée**,
      4 autres canaux locaux MVP) ; messages utilisateur toujours visibles. Front seul (`Chat.tsx`). Commit
      `b382c89`. Reste chantier IHM : **L28 arbre des délégations** (remplace le Gantt, Travail + Journal).
- [x] **L22** — **« Le Cadre » : GUI de configuration iakaframe** → `specs/instructions/L22-cadre-config-iakaframe.md`
      *(**LIVRÉ P1+P2+P2b, scellé `v0.16.0`** 2026-07-07 ; recette terrain réelle OK).* GUI dans iakacockpit
      (6ᵉ vue « Cadre ») pour définir le **cadre** d'une équipe, **en conversant**. Modèle à 4 niveaux
      (verrouillé) : **Règle** typée (interdit/autorisation/obligation/tool/geste/compétence) → **Skill**
      (paquet nommé de règles **+ paragraphe LLM versionné**, P2) → **Template** d'agent (assemblage
      skills+règles) → **Agent** nommé (template + extras + nom **+ brief LLM**, P2) ; + **règles projet**
      et **chaîne des délégations** (graphe team, à part).
      **P1 LIVRÉ** : modèle pur (`src/frame/model.ts`) + persistance `frame.json` par team (`frame.rs`, AR-1) +
      hook `useFrame` + **vue Cadre refondue (design Loki)** — une page lue de haut en bas (chaîne
      Règles→Skills→Templates→Agents, décomposition visible) + seed démo. Recette : persistance + ergonomie
      validées. **P2 LIVRÉ** : « définir en conversant » — un **prompt LLM par étage** (commande `ai.rs
      frame_author`, calque L3/L8, mock/dégradation) **RÉDIGE** le paragraphe du skill / le brief de l'agent
      (dictée `useVoiceDictation` branchée). Recette réelle : llama3.1 rédige, persisté. **P2b LIVRÉ** :
      **export `agent.md`** (front génère le markdown, `frame_export` écrit sous `.iakacockpit/frames/<team>/`)
      — la sortie consommée par iakaframe. Recette : 4 agent.md écrits, contenu propre.
      **Différés tracés** : **L22-P3** enforcement runner (`--allowedTools`/`--append-system-prompt` + garde
      délégations L5) ; **P2b** catégories **hooks/limites** en listbox ; arbitrages AR-2/4/5/6. `frame.json`
      reste la source ; le `.md` est un export. 461 front + 247 Rust verts.
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
