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

# Auto-update (L34) — publication d'une version sur le canal de mise à jour.
# Le build local exige les deux variables de signature depuis que
# `createUpdaterArtifacts` est actif (sinon le bundler refuse de produire un
# artefact updater non signé) ; la clé privée vit HORS DÉPÔT (~/.tauri/iakacockpit.key) :
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/iakacockpit.key)" \
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" npm run tauri build
# La publication REFUSE de tourner ailleurs que sur `main` (le manifeste est un
# fichier de main : publier depuis une branche y pousserait toute la branche) et
# ne commite QUE `updater/latest.json`, jamais le reste de l'index.
node scripts/publish-update.mjs vX.Y.Z              # release GitHub → Forgejo + latest.json
node scripts/publish-update.mjs vX.Y.Z --from ./out # depuis un répertoire local (sans GitHub)
node scripts/publish-update.mjs vX.Y.Z --check-only # garde d'alignement des versions seule
node scripts/publish-update.mjs vX.Y.Z --dry-run    # le manifeste sur stdout, RIEN d'écrit
node scripts/publish-update.mjs vX.Y.Z --pub-date 2026-01-01T00:00:00Z  # date figée (L40)
# `--pub-date` (défaut : maintenant) rend la publication REPRODUCTIBLE : deux exécutions sur le
# même tag avec la même date produisent un `updater/latest.json` identique à l'octet. Les
# messages de progression sortent sur STDERR — stdout ne porte que le manifeste.

# L40 — MESURE des artefacts annoncés. `updater/mesures.json` n'est JAMAIS écrit à la main :
# il est produit par ce script, qui télécharge chaque clé de plateforme EN ANONYME (aucun jeton),
# calcule octets + sha256, vérifie la signature minisign du manifeste contre l'OCTET SERVI
# (signature globale + keyid), et rejoue chaque signature sur un octet altéré (témoin négatif,
# qui doit rendre `invalide`). Le champ `mesurePar` cite cette commande, et elle se relance :
node scripts/mesurer-artefacts.mjs                  # mesure et ÉCRIT updater/mesures.json
node scripts/mesurer-artefacts.mjs --dry-run        # le document sur STDOUT, sans écrire
# Deux exécutions consécutives ne diffèrent QUE par `mesureLe` (vérifié au `git diff`).
# L41 (D-2) — CANAUX SÉPARÉS : tout le journal part sur STDERR, stdout ne porte QUE le document
# (et seulement en `--dry-run`). `... --dry-run > x.json` produit donc un JSON parsable — c'est
# MESURÉ par `scripts/__tests__/canal-mesure.test.mjs`, qui exécute le script, il n'est pas relu.

# Garde de CONVERGENCE avec l'application jumelle (iakaFrameGUI) — L41, défaut CONV.
# Un jeu de fichiers est byte-identique entre les deux dépôts ; le registre d'empreintes qui en fait
# la liste — la seule qui fasse foi, aucun compte n'est recopié ailleurs — vit dans
# `fixtures/convergence.sha256`. La garde a DEUX faces :
#   — LOCALE, dans `npm run test` (scripts/__tests__/forge-host-parity.test.mjs) : elle recalcule
#     les empreintes et NOMME le fichier qui a dérivé. Elle attrape l'édition EN PLACE d'une copie.
#   — CROISÉE, ci-dessous : comparaison octet à octet des deux arbres de travail. HORS gate, car
#     elle dépend du dépôt frère, et SKIP proprement (exit 0) sans lui.
npm run test:convergence     # IAKA_CONVERGENCE_HOME=<dir> pour un frère explicite (autoritaire)
# RÈGLE OPÉRATOIRE : tout fichier du registre se modifie DANS LES DEUX DÉPÔTS au même commit
# logique, puis on régénère les empreintes (commande en tête de fixtures/convergence.sha256).

# Le manifeste porte NEUF clés depuis L40 : les quatre génériques `{os}-{arch}` (inchangées, donc
# aucun client existant ne change de comportement) et cinq clés d'installeur
# `{os}-{arch}-{installer}` — que `tauri-plugin-updater` cherche EN PREMIER. La table de
# conformité `fixtures/updater-cles.json` est BYTE-IDENTIQUE avec celle d'iakaFrameGUI.
# Jetons lus dans l'environnement ($FORGEJO_TOKEN, $GITHUB_TOKEN) ou ~/work/.env.

# Garde de parité du contrat de handoff (forge → cockpit) — HORS gate par défaut,
# car elle dépend du dépôt frère iakaFrameGUI (SKIP propre sur un clone isolé) :
npm run test:handoff-parity  # ForgeTeam/ForgePersona/HandoffManifest vs @iakaframe/core
                             # IAKAFRAMEGUI_HOME=<dir> pour pointer un autre frère (autoritaire)

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
      agent / top délégations $ / callout variation / comparaison V3 = placeholder.
      *(**Recette terrain + Analytics réel scellés `v0.27.0`** 2026-07-13 ; doc qualité `docs/qualite/v0.27.0.md` ;
      gates PASS — Rust 320 + front 670. 9 commits `684b1dd`→`c279ec4`.)* Ajouté : **compaction** des zones vides ;
      **scope par projet** (coût+délégations suivent le Périmètre) ; **attribution par agent RÉELLE** (tokens+coût
      via le lien `toolUseResult.outputFile` — le sous-agent tourne hors du transcript parent ; `unavailable` si
      tmp éphémère expiré, jamais fabriqué) ; **précalcul KPIs** (`AggIndex` en cache, build background → clics
      instantanés, coût calculé à la requête) ; **fix V2** (évolution scopée projet) ; **coordinateur en premier
      rang** attribué **par projet** puis agrégé par nom (Aragorn ≠ Odin en scope ALL, plus de fusion).
      *(Patch `v0.27.1` : **liaisons de l'arbre des délégations rendues visibles** — tronc + branches theme-aware,
      `ac0226b`.)* *(Patch `v0.27.2` : **Périmètre instantané** — build index en 2 phases (tokens rapide / attribution
      différée) + indicateur de construction, `f627938`/`ab8e70b`.)* *(Patch `v0.27.3` : **projet = répertoire
      directement sous le chapeau** `/work` (fin de la fragmentation ; non-projets → `.folder`) + **en-tête Table
      sur 2 lignes**, `5b5d4d4`/`f283265`.)* *(**`v0.28.0`** : **V3 Comparaison RÉELLE** — A avant/après constaté
      + B constaté vs hypothèse (re-tarifage à volume constant, `pricing_table`) → **les 4 perspectives Analytics
      toutes réelles** ; `2dc2c3c`/`141a6dd`, doc `docs/qualite/v0.28.0.md`.)* *(**`v0.29.0`** : 3 différés clos —
      **index incrémental** (mtime, cache par fichier, `15c5e6a`), **arbre de délégations multi-niveaux** (arêtes
      parent→enfant des outputFiles, récursif au Journal, `c8d0601`), **hypothèse V3-B par agent** (`047dd90`) ;
      doc `docs/qualite/v0.29.0.md`. Rust 332 + front 689.)* Différés restants : arbre multi-niveaux **en LIVE**
      (Travail), récursion **au-delà de 2-3 niveaux**.
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
      **Différés tracés** : ~~L22-P3~~ **LIVRÉ `v0.30.0`** (enforcement runner : `--allowedTools` +
      `--append-system-prompt` **dérivés du Cadre** de la team → runner du coordinateur, repli global sans
      régression ; `8db6bf8`/`a632c29`, doc `docs/qualite/v0.30.0.md` ; l'enforcement DUR de la chaîne =
      hook L5 hors dépôt, la chaîne autorisée est exposée en texte dans le system-prompt) ; **P2b** catégories
      **hooks/limites** en listbox ; arbitrages AR-2/4/5/6. `frame.json` reste la source ; le `.md` est un export.
- [ ] **L32** — **Montée LiteLLM → `1.94.0` épinglée (tag + digest), fin du tag flottant `main-latest`**
      → `specs/instructions/L32-montee-litellm-v194.md`
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-07-29), branche
      `feat/L32-litellm-v194`. **Stack Cockpit FAITE** : `docker/docker-compose.yml:33-34` service `litellm`
      → `ghcr.io/berriai/litellm:1.94.0@sha256:65d84a22…3fabe` + commentaire d'ancrage de rollback
      (`1.82.6 = @sha256:7c311546…0186`, digest **vérifié encore récupérable** au registre AVANT toute
      modification — filet en place). `docker/litellm-config.yaml` **inchangé** (schéma valide sous 1.94 :
      démarrage sans erreur/warning de schéma). Recette hôte OK : `Version: 1.94.0` dans le conteneur,
      `GET /v1/models` → `llama3.2:1b`, `POST /v1/chat/completions` (temperature/max_tokens) → 200 + contenu,
      appel sans clé → 401. Port `127.0.0.1:4020` et nom `iakacockpit-dev-litellm` **inchangés** ; 3 autres
      services **non touchés** (épinglage renvoyé en **L33**, AR-3). **Fait mesuré non prévu au cadrage** :
      l'image `main-latest` locale de ce poste n'était **pas** 1.82.6 mais **1.91.0** (build 2026-06-23,
      arm64) — la dérive du tag flottant est **prouvée sur pièce**, deux machines = deux versions.
      **Phase D (VM `192.168.2.12`) — reprise du 2026-07-30, LAN de nouveau joignable** (double rebond
      `root@.20`→`root@.12`). **Étape 13 (inventaire) FAITE**, **étape 14c (surface exposée) FAITE**,
      **étapes 14a/14b ARRÊTÉES AVANT TOUTE ACTION** sur un point de décision qui dépasse le mandat
      d'exécution — **rien n'a été modifié sur `.12`** (conteneur toujours `Exited (0)` sur `main-latest`,
      aucun fichier touché, aucune image pullée).
      **Inventaire réel de `.12` (mesuré, contredit une hypothèse du cadrage)** : le conteneur `litellm`
      n'est **pas** un `docker run` isolé mais le **service `litellm` d'une stack compose de 11 services**
      (`/root/docker-stack-ai/docker-compose.yml`, projet `docker-stack-ai`) ; image `main-latest` digest
      `sha256:7c311546…0186` (= 1.82.6, build 2026-03-22) ; `restart: unless-stopped` ; commande
      `--config /etc/litellm/config.yaml` ; config montée en `ro` depuis
      `/root/docker-stack-ai/config/litellm-config.yaml` ; réseau `vm3_net` ; **aucun volume de données**.
      Sa `model_list` **n'a rien à voir** avec celle du Cockpit : 8 entrées `ollama/` (alias `gpt-4`,
      `gpt-4-turbo`, `gpt-3.5-turbo`, `mistral:7b-instruct-q4_K_M`, `qwen2.5-coder:7b` + 3 embeddings
      `nomic-embed-text`), plus `router_settings` (`least-busy`, `num_retries`) absents côté Cockpit.
      Ce proxy se déclare lui-même « **point unique d'entrée LLM pour tout le homelab** » et **deux
      consommateurs tournent depuis 23 h** en pointant sur `http://litellm:4000/v1` : `open-webui` (8099)
      et `obot` (3009, `depends_on: litellm`) — le rallumer **change leur comportement** (aujourd'hui ils
      échouent sur LiteLLM ; `open-webui` survit via `ENABLE_OLLAMA_API`).
      **⚠️ POINT DE BLOCAGE — ce LiteLLM a une BASE POSTGRES, contrairement au postulat du cadrage.**
      `DATABASE_URL` + `general_settings.database_url` → `postgresql://…@10.10.10.2:5432/litellm`, sur une
      **machine tierce** joignable (TCP ouvert via `eth1`/`10.10.10.3`). Conséquences : (1) l'innocuité des
      ruptures 1.90/1.93/1.94 était démontrée par « le proxy tourne **sans base** » — **ce raisonnement ne
      s'applique pas ici** (partitionnement Postgres des SpendLogs en 1.90, `oauth2_flow` lu en base en 1.93,
      budgets sur clés d'équipe en 1.94) ; (2) rallumer en 1.94.0 déclenche **12 minors de migrations Prisma**
      au boot, donc une **mutation de schéma irréversible** d'une base hors périmètre ; (3) **le filet de
      rollback de L32 ne couvre PAS la base** — revenir au digest 1.82.6 sur un schéma migré en 1.94 n'est
      pas un retour arrière garanti, ce qui contredit frontalement D4/R1 (« ne jamais monter sans filet »).
      Fabriquer le filet manquant (`pg_dump`) exigerait de pull une image Postgres sur `.12` (aucun client
      `psql`/`pg_dump`, aucune image Postgres locale) et de dumper une base hébergée sur une **autre machine**
      — hors mandat. **Décision attendue de Stéphane** : accepter la migration de la base du homelab (avec
      dump préalable) ou rallumer autrement. Rallumer sans base = **modifier la config**, interdit par R6-bis.
      **Étape 14c — surface exposée, ÉCRITE (livrable, aucun changement)** : publication Docker
      `ports: ["4001:4000"]` **sans `HostIp`** ⇒ bind `0.0.0.0:4001` **et** `[::]:4001` = **tout le LAN**
      (et non `127.0.0.1`) ; `ufw` **actif** avec une règle **explicite** `4001/tcp ALLOW Anywhere` (v4 **et**
      v6) — c'est une ouverture **voulue**, pas un oubli. Aujourd'hui **rien n'écoute** sur 4001 (conteneur
      arrêté, port fermé depuis le poste) ; au rallumage, le proxy devient joignable par tout le LAN, protégé
      par le seul `LITELLM_MASTER_KEY` (`sk-iakabox-7074…c782`) écrit **en clair dans le compose ET dans la
      config montée** de `.12` — clé **admin** qui, avec la base, pilote clés/teams/budgets. À titre de
      comparaison, `11434` (Ollama) est déjà **ouvert et joignable** depuis le poste, sans authentification.
      **DETTE-1 et DETTE-2 sont donc plus lourdes sur `.12` que ce que L32 anticipait** ; conformément à R6
      elles sont **constatées ici, non traitées** → **L35**.
      **NON MESURÉ** : recette GUI `npm run tauri dev` (critère Stéphane).)*
- [x] **L33** — **Stabilisation du flake `tail_file_*` (harnais de test calé sur l'horloge murale)**
      → `specs/instructions/L33-flake-tests-tail-file.md`
      *(**GATE 🏹 Legolas PASS — rendu RÉTROACTIVEMENT le 2026-08-10.** Le code était sur `main`
      depuis le 04/08 (`121fb24`) **sans verdict** : le gate de fin juillet n'avait jamais été
      prononcé (LAN tombé, session interrompue), et cette case est restée `[ ]` alors que le
      travail était livré. Portée dite explicitement par le gate : ce PASS **ne débloque aucune
      fusion**, il **atteste** que le lot méritait de passer ; un défaut y aurait ouvert un lot
      correctif, pas bloqué une intégration. **Provenance vérifiée** (reflog + `transcript.rs`
      inchangé depuis `f315441`), **forme vérifiée** (5 hunks tous ≥ 876 donc tous sous
      `#[cfg(test)]` — **zéro ligne de production**, aucune dépendance ajoutée, aucun `#[ignore]`,
      exactement 2 `sleep` légitimes, **assertions des 4 tests identiques avant/après**).
      **Stabilité re-mesurée, aucun chiffre repris de l'exécutant** : **53 passes de suite complète**
      (20 parallèle + 10 séquentiel + 20 sous charge à load 12,6 + quality.sh ×2) et **50 passes du
      test seul** avec le nom **qualifié**, **0 échec** — sous l'hypothèse « le flake persiste au
      taux rapporté de 88 % de rouge », P = **1,4 × 10⁻⁴⁸** ; borne haute 95 % du rouge résiduel
      **≤ 5,5 %/passe**. Durées 1,08–1,35 s, la signature des runs **verts** historiques : le
      plafond de 10 s **n'est jamais payé** sur le chemin nominal. **Le point qui comptait — le
      pouvoir de détection est-il conservé ? — est PROUVÉ par 4 mutations de production écrites par
      le gate lui-même** : chacun des 4 tests a été mis au rouge **individuellement et pour la bonne
      raison** (MA→3 tests, MB/MC/MD→le bon test seul, dont un message explicite « le tailer n'a pas
      abandonné en 10s »), révocation prouvée **au sha256**. Le harnais n'est donc **pas décoratif** :
      le `done` est le prédicat de l'assertion, pas un contournement. **Arène vérifiée à
      l'exécution** (sonde sur `$TMPDIR` pendant les runs) : le transcript vit dans un dossier dédié
      reproduisant `projects/<escaped>/<sid>.jsonl`, plus sous `$TMPDIR` nu (74 740 entrées ce jour).
      **Non re-mesurés, déclarés tels** : le taux historique de 88 % et les 57 819 entrées — faits
      rapportés par l'exécution, la lecture statistique leur est relative.)*
      *(**S1 — signalement non bloquant, à trancher.** `src-tauri/src/transcript.rs:997` : la valeur
      de retour de `wait_until(LINE_GRACE, …)` est **ignorée** — grâce non fatale, **conforme au
      cadrage** (§ 4.3). Mais si l'observation de la ligne *i* expirait, le harnais écrirait la ligne
      *i+1* quand même et le test redeviendrait un « lit deux lignes déjà présentes » — le défaut de
      validité que L33 prétend supprimer. **Le commentaire du code affirme donc une propriété que
      rien n'assert** ; elle a tenu sur 103 passes. Correctif d'très faible ampleur : soit rendre la
      grâce fatale, soit dire le vrai dans le commentaire.)*
      *(**S2 — cosmétique, hors dépôt** : 153 dossiers `iaka-tail-<pid>` **vides** datés du 30/07
      traînent dans `$TMPDIR` — l'ancien harnais ne nettoyait que le fichier. Le nouveau fait
      `remove_dir_all` et n'en laisse **aucun** : dette **éteinte par L33**, trace résiduelle sur ce
      poste seulement.)*
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-07-30), branche
      `feat/L33-flake-tail-file` (issue de `feat/L32-litellm-v194` : les deux se re-gatent ensemble).
      **Aucune ligne de production touchée** — le diff est confiné au module `#[cfg(test)] mod tests` de
      `src-tauri/src/transcript.rs` (un seul fichier, hunks tous ≥ ligne 879, `#[cfg(test)]` = ligne 545).
      Livré : helper `wait_until(deadline, pred)` en `std` (`WAIT_DEADLINE` 10 s, `POLL_STEP` 10 ms,
      `LINE_GRACE` 2 s non fatale, **aucune nouvelle dépendance**) ; la **condition d'arrêt du tailer est
      désormais celle de l'assertion** (`done` fourni par chaque test) ; l'append *i+1* n'est écrit qu'après
      **observation** de la ligne *i* (le test « appends après un premier EOF » exerce enfin réellement la
      mécanique held fd — gain de **validité**, pas seulement de stabilité) ; test négatif refondu
      (`run_tail_abandon` : attente de la terminaison **spontanée** du thread via `JoinHandle::is_finished`,
      bornée, panique explicite, PUIS création du fichier → la course disparaît). **Cause racine mesurée,
      non prévue au cadrage** : le transcript de test vivait directement sous `$TMPDIR`, donc le filet
      `resolve_transcript` balayait le **répertoire temporaire du système** à chaque pas d'attente —
      **57 819 entrées, 5,3 à 6,5 s de scan mesurées par tour** sur ce poste (la production balaye
      `~/.claude/projects/`, quelques dizaines d'entrées). Le harnais reproduit maintenant l'arborescence
      réelle `<arène>/projects/<escaped>/<sid>.jsonl` dans une arène dédiée et jetable. **Contrefactuel
      fait** (M1/M2/M3 appliquées une à une, rouge capturé, révocation prouvée par `git diff` vide).
      **Campagnes** : C1 20/20 vertes (1,61–2,63 s), C2 10/10 séquentielles vertes (4,09–5,62 s), C3 50/50
      vertes sur le test incriminé seul (1,40–2,45 s), C4 20/20 vertes **sous charge** (2,03–3,87 s),
      C5 `quality.sh` **exit 0 deux fois** (749 front + 337 Rust, **0 ignored**). **Défaut relevé dans
      l'instruction** : la commande C3 qui y est écrite (`cargo test <nom> -- --exact`) sélectionne **0 test**
      et verdit à vide — campagne rejouée avec le nom qualifié `transcript::tests::<nom>`. **Non fait** :
      pas de push (LAN iakabox toujours injoignable).)*
- [ ] **L34** — **Auto-update de l'application (flux Forgejo LAN, endpoints extensibles)**
      → `specs/instructions/L34-auto-update.md`
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-06), branche
      `feat/auto-update`. Étapes **1 à 7 livrées** ; les **3 gates humains restent ouverts**.
      **Étape 1** (déléguée par arbitrage d'Odin, la clé se régénère à coût nul tant qu'aucune release
      signée n'existe) : paire minisign générée **hors dépôt** dans `~/.tauri/iakacockpit.key`
      (+ `.pub`), passphrase vide assumée sur cette plateforme de dev ; la **sauvegarde hors dépôt de
      la clé privée reste un gate humain**. **Étapes 2-4** : `tauri-plugin-updater`/`-process` (Rust
      2.10.1/2.3.1) + paquets JS, montage passe-plat dans `run()`, `createUpdaterArtifacts: true`,
      clé publique + endpoint Forgejo en **liste ordonnée** (D2 : un futur flux HTTPS se **préfixe**),
      `dangerousInsecureTransportProtocol` **assumé et borné** (LAN privé, charge utile signée),
      permissions `updater:default` + `process:allow-restart`. **CSP non touchée** (l'appel sort du
      backend). **Étape 5** : `useAppUpdate` (machine à états, contrôle différé 3 s **silencieux** en
      échec, contrôle manuel verbeux, install sur **clic explicite** puis `relaunch`, garde
      anti-double-clic), `UpdateBanner` discret non modal, section **Mises à jour** des Réglages
      (version installée, bouton, endpoint affiché), i18n fr/en, plugins passés par la **façade D7**.
      **Étape 6** : secrets de signature dans `.github/workflows/release.yml` + `scripts/publish-update.mjs`
      (garde d'alignement → artefacts GitHub ou `--from <dir>` → release Forgejo → `updater/latest.json`
      → commit+push sur `main`), cœur pur extrait dans `scripts/lib/update-manifest.mjs`. **Étape 7** :
      **31 tests neufs** (12 hook/bandeau plugins mockés zéro réseau, 4 garde de non-dérive du miroir
      d'endpoints, 13 générateur de manifeste sur artefacts factices, 2 section Réglages) ; vitest couvre
      désormais `scripts/`. `bash scripts/quality.sh` **exit 0** — **780 front + 337 Rust** (mesuré).
      *(Chiffres RECTIFIÉS après le gate : la note annonçait « 25 (11+4+10) / 774 front », la mesure du
      gate donnait **28** dès `1c91ae6` — le compte annoncé n'avait jamais été recompté après coup.)*
      **Écarts signalés** : (a) tests rangés dans `src/__tests__/` (convention du dépôt) et non
      `src/hooks/__tests__/` ; (b) le grep C6 tel qu'écrit ramène **`CLAUDE.md:56`** — la commande de
      build documentée juste au-dessus, où la variable de signature est affectée par un `$(cat …)` qui
      lit un fichier **hors dépôt** : le motif vise une affectation littérale, et le guillemet qui suit
      le `=` (au lieu d'un `$`) suffit à le déclencher.
      **Ce n'est pas un secret, c'est un faux positif du motif**, et il **subsiste** une fois `specs/`
      exclu — contrairement à ce que ce rapport affirmait (il prétendait que le grep ne ramenait plus
      rien hors `specs/`, mesure **fausse**) ; (c) `createUpdaterArtifacts` rend les **deux variables de
      signature obligatoires au build local** — commande mise à jour ci-dessus. **Gates humains
      ouverts** : sauvegarde hors dépôt de la clé, pose des secrets côté GitHub, recette C5 de bout en
      bout.)*
      *(**Lot correctif post-gate** (2026-08-06, commits `620064d` = D1, `3b2b3f1` = D2, présent commit
      = D3) : **D1** `scripts/publish-update.mjs` ne publiait
      **derrière aucune garde de branche** (`git push origin
      HEAD:main` depuis `feat/auto-update` aurait déversé la branche entière sur `main`) et commitait
      **l'index entier** → garde `assertReleaseBranch()` (refus net, vérifiée avant toute écriture
      distante **et** juste avant le push, `HEAD` détachée comprise), ~~push explicite sur `main`~~
      (**corrigé, voir S1 ci-dessous**), commit
      porté par le pathspec `-- updater/latest.json` ; `--check-only` inchangé (contrat C7). **D2** trous
      C3 (le test « `check()` → `null` » **postulait** la comparaison sémantique, qui vit dans le plugin
      Rust : il le **dit** désormais, + test neuf prouvant que le front n'ajoute aucune comparaison) et
      C4 (rendu de `SettingsView` en `error/visible` — le message à l'écran n'était garanti que par
      lecture de code). **D3** ces chiffres et ce constat C6.)*
      *(**Convergence des jumeaux + réserves croisées** (2026-08-06, commits `b603cce` = S1,
      `ee1f65e` = réserve n°1). **S1 — le push converge vers `git push origin HEAD`**
      (`scripts/publish-update.mjs:342`). Le motif du choix précédent (« plus aucune indirection ») était
      **faux, et c'est mesuré** : le script commite sur `HEAD` et poussait `refs/heads/main`, donc hors
      nominal il poussait **une référence qui n'est pas celle qui vient de recevoir le commit**. Labo git
      (origin nu, `main` local en avance d'un commit de travail, garde contournée sur `HEAD` détachée) :
      `git push origin main` → **exit 0**, publie le `main` **local** jamais relu par le run (le manifeste
      tout juste commité **ne part même pas** — le feed ment en silence) ; `git push origin HEAD` → **exit 1**
      (`not a full refname`), origin intact. Sur le chemin nominal les deux formes sont **strictement
      équivalentes** (mesuré). `RELEASE_BRANCH` reste la référence comparée par la garde, plus la cible du
      push. **Réserves croisées, les trois mesurées** : **(1) jonction C4 — S'APPLIQUAIT** : la mutation
      `App.tsx:846` `check(true)` → `check()` laissait **780/780 verts**. Comblée par
      `src/__tests__/updateJunction.test.tsx` (clic réel sur « Vérifier les mises à jour » depuis l'App
      complète, assertion sur ce qui est **à l'écran**) ; contrefactuel rejoué → la mutation fait
      désormais **échouer** la suite, puis révoquée (`git diff` vide). **(2) `--no-push` — NE S'APPLIQUE
      PAS** : ce drapeau **n'existe pas** ici ; les seules options sont `--check-only` (lecture pure,
      sort avant la garde car il n'écrit rien) et `--from` (alimente le chemin **gardé**). Mesuré depuis
      `feat/auto-update` : run complet → refus **exit 1** avant lecture du jeton et avant tout `fetch` —
      le commentaire « avant toute écriture distante » est donc **exact**. **(3) re-publication d'un même
      tag — NE S'APPLIQUE PAS** : la détection scopée `git diff --cached --name-only -- updater/latest.json`
      renvoie vide et le script **sort 0 avant `git commit`** ; contrefactuel au labo : le `git commit`
      qu'elle évite sort bien **1** (`nothing to commit`), et un index bruité ne fabrique **pas** de commit
      de release. **C6** revérifié avec la commande **rectifiée sur `main`** (`ce88623`) : les motifs
      en-tête clair et **préfixe base64** ne ramènent **rien** ; subsiste le **seul** faux positif déjà
      signalé — `CLAUDE.md:56-57`, la commande de build documentée, où la variable est affectée à
      `"$(cat ~/.tauri/…)"` (fichier **hors dépôt**) et à `""` : **aucune matière de clé dans le dépôt**.
      `bash scripts/quality.sh` **exit 0 — 782 front + 337 Rust**. Instruction **non touchée**.)*
- [x] **L38** — **Lisibilité du terminal : taille du texte réglable, tout le reste dérivé**
      *(**LIVRÉ, recette terrain OK** 2026-08-23 ; 8 commits `18b2295`→`f607cfb` ; 803 front + 337 Rust,
      `quality.sh` OK ; Rust **non touché**. Front seul, aucune instruction préalable — lot ouvert sur
      un retour terrain direct, tracé ici a posteriori.)* Un **unique** réglage exposé —
      `ui_term_font_size` (persisté, borné [8, 32], défaut 13) — réglable **à chaud** depuis deux
      points : `A− / A+` dans la barre d'onglets de la Table et un curseur dans Réglages > Police.
      Tous les autres critères de lisibilité en sont **dérivés** (`src/theme/termMetrics.ts`, module
      pur) : interligne, espacement des caractères, respiration autour de la grille.
      **Garde L10 tenue** : un changement de taille ne recrée ni la session PTY (le runner survit) ni
      la surface xterm (scrollback conservé) — effet séparé de l'init, puis refit + `pty.resize` pour
      que la TUI native apprenne la nouvelle grille.
      **Trois faits établis par MESURE** (banc xterm réel piloté en Chrome headless, captures à
      l'appui — `scratchpad/xtermlab/`), chacun ayant corrigé une hypothèse fausse :
      **(1) `var(--mono)` figeait la grille de caractères.** `PtyTerminal` passait une **variable CSS**
      à xterm, qui s'en sert pour **mesurer** un caractère via un contexte **canvas** — où `var()` est
      invalide et l'affectation rejetée en silence. Métriques identiques à 13 px et à 32 px (cellule
      9,43 px, ligne 19 px dans les deux cas) → glyphes chevauchés. **Défaut ANTÉRIEUR au lot** : à
      13 px la cellule était trop *large* (9,43 contre 7,82), donc invisible ; l'agrandissement l'a
      révélé, pas créé. Corrigé par `src/theme/termFont.ts` (résolution en pile **littérale**, refus
      d'une valeur contenant encore `var(`), appliqué à la construction **et** à chaud.
      **(2) L'espacement des caractères est dérivé à ZÉRO**, définitivement : à 1 px comme à 2 px, les
      bordures `─` des boîtes TUI (Claude Code, Codex) se **hachent en pointillés**. Contrainte de
      rendu, pas un oubli.
      **(3) L'interligne est un multiplicateur CONSTANT** (`LINE_HEIGHT_RATIO = 1.2`), donc strictement
      proportionnel — `lineHeight` de xterm étant *déjà* relatif à la hauteur de glyphe. Une courbe
      décroissante essayée en cours de route **cassait** cette proportionnalité (0,61 d'air en grand
      contre 0,83 en petit). Valeur finale abaissée depuis 1.6 : ce 1.6 avait été choisi sur un retour
      « trop serré » émis **alors que la grille était fausse** — jugement biaisé. Bénéfice non cherché :
      descendre **referme** les bordures verticales des boîtes.
      **Deux gardes de test défaillantes, corrigées après contrefactuel** — les deux avaient été écrites
      par l'exécution et validaient à tort : (a) la garde « pas de `var()` » assertait l'état **après**
      montage, que l'effet à chaud repose correctement → le défaut réintroduit laissait **21/21 vertes** ;
      elle porte désormais sur les options de **construction**, là où xterm mesure. (b) Un seuil
      « air ≥ 40 % de la taille » encodait un **goût** (formé sur le rendu cassé) et a **bloqué** la
      réduction ensuite demandée ; abaissé à 25 %, il ne garde plus que l'**invariant** (le 1.0 de xterm
      échoue toujours).
      Différés : la charte n'est re-résolue qu'au prochain changement de taille ou remontage ;
      `minimumContrastRatio` et `fontWeight` non dérivés (non liés à la taille).
- [x] **L39** — **Synchronisation Cockpit ↔ réservoir iakaframe (Charon, Helm, Fëanor)**
      *(**LIVRÉ** 2026-08-23, commits `c7443ce` + `3225eac` ; 804 front + 344 Rust, `quality.sh` OK.
      Ouvert sur une question de Stéphane — « on a rajouté feanor et charon dans les teams, où
      sont-ils ? » — arbitrage : **le réservoir devient la source de vérité**.)*
      **Constat** : côté réservoir ils y étaient depuis longtemps (persona + roster
      `teams/iakaframe-8.md` + agent déployé) ; côté Cockpit **nulle part — et Helm non plus**.
      Le Cockpit ne lisait pas le réservoir : il tenait sa **propre liste de 7**, qui avait
      divergé en silence.
      **Livré** : commande Rust `read_reservoir` (`reservoir.rs`, lecture seule, `IAKAFRAME_HOME`
      autoritaire, `None` — jamais une erreur — si absent, pour qu'un clone isolé fonctionne ;
      parseur de frontmatter minimal, zéro dépendance YAML) + façade `readReservoir()` ;
      `AGENT_ROLES` étendu à 10 (roleIndex 7/8/9 = `deploiement`/`surveillance`/`frame`, clés du
      réservoir **verbatim**) ; `DEMO_TEAM` alignée sur le roster (10 agents, son ordre) ; i18n fr/en ;
      **garde `npm run test:reservoir-parity`** qui échoue en NOMMANT les absents.
      **Fait qui a invalidé le plan initial** : les deux vocabulaires divergent sur **5 des 7**
      rôles historiques (`cadrage`/architecture, `dev`/fabrication, `qualite`/tests,
      `design`/graphisme, `documentation`/doc). D'où `RESERVOIR_ROLE_ALIAS` plutôt qu'un renommage :
      la clé est **persistée** dans `agent.royaume` et pilote la vignette — renommer casserait les deux.
      **Contrainte mesurée** : le casting iakagraph n'a que **8 emplacements** (roleIndex 0..7).
      `deploiement` a une vignette ; `surveillance` et `frame` retombent sur la **pastille** (repli L9).
      Les doter d'une image suppose une mise à jour d'**iakagraph** — hors dépôt, **différé**.
      **11 tests figeaient « 7 rôles / 7 agents / roleIndex 0..6 »** — le modèle fermé qui avait
      *permis* la dérive. Réécrits pour **dériver** du modèle au lieu d'en recopier une image.
      Différés : le Cockpit ne consomme pas encore `readReservoir()` à l'exécution (la team par défaut
      reste embarquée, la garde de parité tient l'alignement) ; vignettes iakagraph des 3 rôles.
- [ ] **L37** — **Persistance de la Table (le « set de Work » survit au redémarrage)**
      *(constaté au terrain le 2026-08-23, pendant la recette du réglage de taille du terminal : après
      chaque relance de l'app, la Table revient **vide** et il faut re-poser ses projets à la main.)*
      **Ce n'est pas une régression** : `src/hooks/useWorkset.ts` est un état **front pur** (un `Set`
      d'ids en `useState`), et son en-tête le dit explicitement — « la persistance backend
      (`configSet("workset", …)`) est un PLUS non bloquant (PO-2) — **non implémentée** en L2 pour
      rester MVP ». Vérifié : **aucune clé `workset` côté Rust** (`config.rs`). Le comportement est
      donc conforme au cadrage L2 d'origine ; c'est le confort d'usage qui a changé d'avis, une fois
      la Table devenue le lieu de travail quotidien (L24 onglets, L25 session vivante, L26 focus).
      **Portée pressentie** (à cadrer) : persister le set d'ids sous une clé de config **non
      sensible** (`workset`, ne matche pas `token|key|secret|password`), relu au montage comme le
      fait déjà `useSettings` ; **projets disparus** du chapeau à ignorer silencieusement au
      rechargement (jamais d'onglet mort) ; interaction à trancher avec l'**ouverture eager** L24-F1
      (poser N projets au démarrage = spawner N runners — cf. le différé « garde perf N runners »
      déjà tracé en L24) et avec le **seed démo** L7/L9 qui ajoute `iaka-demo` au set. Front +
      1 clé de config ; aucune commande Rust nouvelle.*
- [ ] **L40** — **Clés d'installeur du manifeste updater — le manifeste dit enfin quel paquet il sert**
      → `specs/instructions/cles-installeur-manifeste-updater.md` (dupliquée **verbatim** dans
      `iakaFrameGUI/specs/instructions/`, byte-identique — une divergence est un défaut, CA-16).
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-29),
      branche `feat/L40-cles-installeur-manifeste`. Cadré par 🔵 Gandalf, 8 arbitrages TRANCHÉS.)*
      **Problème** : le générateur n'émettait que `{os}-{arch}`, or le plugin cherche d'abord
      `{os}-{arch}-{installer}` — un client Windows installé **par MSI** recevait l'exe NSIS et
      s'installait **à côté** de son enregistrement MSI ; un client Linux installé **par `.deb`**
      téléchargeait une AppImage de 92 Mo et échouait en `InvalidUpdaterFormat` **à chaque
      tentative**. Le manifeste ne mentait pas sur *où* télécharger, mais sur *quoi* il sert.
      **Ordre imposé par une dépendance, pas par le confort** : mesurer → versionner l'instrument
      → réparer `I4` → émettre les clés → re-mesurer.
      **Livré** : (A) **9 clés** émises — 4 génériques **inchangées** (`windows-x86_64` = NSIS,
      `linux-x86_64` = AppImage : aucun client existant ne change de comportement, vérifié clé par
      clé) + 5 clés d'installeur ; `.deb`/`.rpm`/`.msi` obtiennent leur clé d'installeur mais
      **jamais** la générique. (B) `I4` sortie du fichier de test vers la fonction **pure**
      `scripts/lib/verifier-mesures.mjs` : index par **plateforme**, doublon de plateforme =
      violation **nommée**, et la mesure doit porter **l'URL de cette plateforme**. Les **deux
      exploits écrits ROUGES D'ABORD** (`3 failed | 7 passed`) et figés dans l'historique avant
      correctif. (J) instrument **versionné** `scripts/mesurer-artefacts.mjs` (téléchargement
      anonyme, sha256, minisign globale + keyid, **témoin négatif**) — l'ancien vivait dans
      `scratchpad/`, hors dépôt, et **a disparu**. (G) `uploadUpdaterJson: false` (AR-5).
      (I) `--pub-date` pilotable + `--dry-run`. Convergence : **6 fichiers byte-identiques** avec
      le GUI.
      **Fait mesuré contredisant un risque du cadrage** : `.deb` et `.rpm` sont **signés** sur les
      deux releases (`.sig` appariés) — **R2 et AR-2 sans objet**, aucun `HORS_COUVERTURE` ouvert.
      **NON FAIT** : l'**étape 5.1** (bump + publication d'une version neuve) — les actes de
      publication sont **refusés aux agents** et appartiennent au décideur. Le lot se clôt en
      **« mesuré, non recetté »** ; les deux recettes réelles (Windows MSI, Linux `.deb`) restent
      le **gate humain**.
- [ ] **L41** — **Gardes tièdes — une garde qui ne peut pas rougir n'est pas une garde**
      → `specs/instructions/gardes-tiedes.md` (dupliquée **verbatim** dans
      `iakaFrameGUI/specs/instructions/`, byte-identique — une divergence est un défaut, CA-22).
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-29),
      branche `feat/L41-gardes-tiedes`. Cadré par 🔵 Gandalf, 8 arbitrages TRANCHÉS.)*
      **Le fil** : ce lot ne corrige pas des bugs, il corrige des **gardes qui ne peuvent pas
      échouer, ou qui échouent sur la mauvaise chose** — rangées par leur **distance à un
      mensonge qui touchera l'utilisateur**.
      **Volet A — les prédicats qui attestaient le faux (zéro garde de distance).** (D)
      `estPrive` découpait sur `":"` : `"[::1]:3001".split(":")[0]` vaut `"["`, donc ni `127.*`,
      ni `localhost`, ni `.local` → **public**. `I2` (`.toBe(false)`) ne se taisait pas, elle
      **certifiait** qu'une boucle locale est atteignable de partout. Réparé en **deux** temps :
      extraction par `new URL(...).hostname` (crochets IPv6 retirés explicitement) **et**
      renversement de la charge de la preuve (AR-2 = O3) — `estPublic` doit être **prouvée** par
      la forme, tout le reste est privé par défaut. La fonction est **extraite** dans
      `scripts/lib/verifier-mesures.mjs` (pure, testable sur les cas de bord que les fichiers
      réels ne contiennent pas). **Fait mesuré, contraire à l'attendu du cadrage** : le
      renversement rend à lui seul le `split` **inoffensif pour le verdict** (`"["` n'a pas de
      point, donc privé « par accident ») — la mutation CA-2 ne rougissait pas. L'extraction a
      donc été rendue **observable** là où § 1.4 l'exige : le refus **nomme l'hôte jugé**
      (`hoteJuge`), et la mutation rougit alors sur `expected '[' to be '::1'`.
      (C) `mesureLe` n'était contraint que par `if (!mesures?.mesureLe)` — `"2020-01-01"` passait
      au vert. Borne **relative au manifeste** (AR-1 = O2) : date **parsable** ET
      `mesureLe ≥ pub_date`. Déterministe, comparée à un **fichier versionné**, jamais calendaire
      — pas de bombe à retardement dans le gate. Hors-couverture (vieillissement à version
      constante, `--pub-date` reculée) **écrit dans le code**, avec sa condition de levée.
      **Volet B — les jonctions non gardées.** (E) `I4bis` était **vacuous** : le registre
      `HORS_COUVERTURE` est vide, l'itération portait sur zéro entrée. **Mesuré** : supprimer
      l'appel laissait `54 passed`. Réparé par un **contrefactuel de forme** sur le modèle
      d'`I4ter` — exception fabriquée dans le test, quatre exigences violées, quatre refus
      attendus. Le registre versionné **n'est pas peuplé** (il est vide *parce que* 9/9 répondent
      200 : c'est un résultat, le peupler serait une fausse réparation). Le commentaire qui
      renvoyait ce défaut au lot successeur est retiré.
      (CONV — **défaut ajouté au relevé par le cadrage**) la convergence des deux apps n'était
      gardée par **rien** : les fichiers byte-identiques de L40 l'étaient par un `diff` passé une
      fois à la main, soit l'option « discipline seule » qu'AR-6 de L40 avait écartée parce
      qu'« elle est ce qui a déjà échoué ». Registre `fixtures/convergence.sha256` + garde à
      **deux faces** (AR-5 = O2) : **locale** dans le gate (empreintes, nomme le fichier qui a
      dérivé), **croisée** hors gate (`npm run test:convergence`, SKIP propre sans le frère).
      La limite — la face locale ne voit pas une édition **coordonnée** d'un seul côté — est
      **déclarée dans le fichier de garde**, pas seulement dans un rapport.
      **Volet C — référentiels mouvants et canaux.** (D-6) CA-14 de L40 comparait **deux sorties
      entre elles** : il ne prouvait donc pas ce qu'on croyait. La republication à l'identique est
      désormais prouvée **contre le fichier versionné** — régénérer le manifeste en tirant
      `notes` et `pub_date` de `updater/latest.json` **lui-même** le reproduit **à l'octet**
      (AR-4 = O3 : `--notes` reste une entrée, les vraies notes du GUI ne sont pas détruites).
      (D-5) **la prétention est corrigée, pas le script** (AR-6 = O2) : `test:all` du GUI est
      **inchangé**, sa limite est écrite **dans le `package.json`**, `test:rust` est exposé, et
      `cargo test` devient une **ligne de tableau obligatoire** du verdict de gate. Ce qui mentait
      n'était pas la commande mais **CA-18 de L40** (« les suites complètes »).
      (D-2) journal de `mesurer-artefacts.mjs` sur **stderr**, document sur stdout — **mesuré**
      par un test qui **exécute** le script (réseau neutralisé par un `fetch` de substitution),
      pas par un comptage de `console.log`. (D-3) les deux `console.log` du GUI.
      **⛔ D-4 GELÉ ET REMONTÉ — l'étape 0.3 a mordu, U1 s'est matérialisée.** Le tag `v0` de
      `tauri-apps/tauri-action` pointe le commit `84b9d35b5fc46c1e45415bdb6144030364f7ebc5`
      (= `action-v0.6.2`). L'`action.yml` **à ce SHA** déclare **`includeUpdaterJson`** (défaut
      `'true'`) et **ne connaît ni `uploadUpdaterJson` ni `uploadUpdaterSignatures`** — ces deux
      entrées n'existent que sur `dev`, la branche sur laquelle L40 a lu. Le `uploadUpdaterJson:
      false` des **deux** workflows est donc **ignoré en silence** par l'action qui s'exécute :
      **le volet G de L40 est inopérant sur ce qui tourne**. Conformément à l'instruction
      (« s'arrêter et remonter : c'est un défaut de L40, pas de ce lot, et il ne se corrige pas
      en passant »), **aucune ligne de workflow n'a été touchée** — ni pin, ni cliquet. CA-13,
      CA-14 et CA-15 sont donc **non couverts, et déclarés tels**. Décision du décideur attendue.
      **Aucun effet utilisateur, donc aucune recette humaine** : la seule preuve est la mesure —
      d'où le critère non négociable « toute garde touchée est éprouvée par une mutation qui la
      fait rougir », chaque mutation portant sur le **programme** (jamais sur l'attendu) et
      **révoquée** avec preuve.
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
