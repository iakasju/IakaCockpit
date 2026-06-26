# Instruction : L10 — Ré-architecture conversation/session (terminal-source + chat-vue)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : à valider par Stéphane** avant exécution (gate humain + 6 « À arbitrer » ci-dessous).
> Doc en français, code/identifiants en anglais. **Lot structurant #10** de MOVE 3.
>
> **Source de vérité (à relire en premier) :** `specs/PROJET.md` **§ 0 — Modèle produit** (révision
> 2026-06-26), notamment **§ 0.3** (terminal = source / chat = vue filtrée + entrée partagée) et
> **§ 0.4** (séparation ÉTAPE ACTUELLE vs CIBLE — anti-déformation). Aussi : § 2.3 (runner = CŒUR),
> § 4 (vues Work/Terminal/Chat/Roster), § 5 (canaux : chat = vue filtrée du canal « adresse »).
> `CLAUDE.md` : façade unique D7, socle sécurité L0 (`pathguard`, `paths`/`IAKAFRAME_ROOT`, config
> SQLite non sensible, secrets keychain, **CSP stricte**), conventions (MVP d'abord, réutiliser
> l'existant, pas de god-component, mocker les API en dev).
>
> **Code inspecté en lecture seule le 2026-06-26** (rien n'est supposé) : `src/views/WorkingView.tsx`,
> `src/components/{PtyTerminal,Chat,Roster,NextStepPanel}.tsx`, `src/hooks/{usePty,useConversations}.ts`,
> `src/api/backend.ts`, `src-tauri/src/{terminal,shell,ai}.rs`.
>
> **Faits techniques vérifiés sur le web le 2026-06-26** (cf. § Sources — ils conditionnent le point
> dur de ce lot, donc ne reposent PAS sur des suppositions) : le CLI `claude` (Claude Code) propose un
> **mode flux structuré bidirectionnel** `--print --input-format stream-json --output-format stream-json
> --verbose --include-partial-messages` : sortie **NDJSON** (un objet JSON par ligne, types
> `system`/`assistant`/`user`/`result`, deltas via `stream_event`/`text_delta`) et **entrée NDJSON**
> (`{"type":"user",...}`), avec **`--continue`/`--resume <session_id>`** pour enchaîner les tours et un
> message **`{"type":"interrupt"}`** sur stdin = **équivalent `esc`** (abort l'outil courant, garde la
> session vivante). **Réserve honnête :** `--input-format stream-json` est **sous-documenté**
> (issue Anthropic #24594) → la voie structurée doit être **dérisquée par un spike** avant d'être fermée
> (cf. P0 ci-dessous).

---

## 1. CIBLE vs ÉTAPE ACTUELLE (à tenir explicitement — ne jamais confondre)

> **Règle de méthode impérative (Stéphane).** Ce lot tient la **CIBLE** explicite et fait de l'étape
> courante un **sous-ensemble FIDÈLE**, jamais une déviation. Les deux colonnes restent distinctes.

| Dimension | **ÉTAPE ACTUELLE (ce que L10 livre)** | **CIBLE (à tenir, hors L10)** |
|---|---|---|
| Orchestration | **HYBRIDE** : le **chef = UN vrai runner** (défaut **Claude Code** = CLI `claude` lancé dans le **PTY du projet**) ; la **team = personas** que le chef incarne. | **Runners RÉELS par agent** (multi-runner/modèle), câblés un par un. |
| Conversation | **1 session = 1 terminal-chef = TOUTE la conversation** ; le **chat = vue filtrée** de ce flux ; **entrée partagée** chat→stdin. | Idem, inchangé (c'est le modèle gravé). |
| Settings | **GLOBAUX** au cockpit + set par défaut : runner Claude Code + team iakaframe (odin/aragorn/gandalf/gimli/legolas…). | **PER-PROJET** : runner+modèle+skills **par agent**. |
| Couche vue | **RÉUTILISE l'existant** : bulles `Chat.tsx`, vignettes thémées (L9), personas, trace par-tour, `Roster.tsx`, `PtyTerminal.tsx` (L2). | Idem enrichie (statuts vivants depuis le flux). |
| Graph délégation / jalons | **Hors L10.** | Volet de création du graph de délégation / jalons (+ variantes). |

**Ce qui ne doit JAMAIS régresser** (garde-fou § 0.4) : terminal = source de vérité unique ; chat = vue
filtrée + entrée partagée ; conversation = Stéphane ↔ chef ; comptes-rendus **verbatim** ; agent =
runner+modèle+skills. **L10 est une réduction assumée (1 runner réel au lieu de N), pas une
déformation** : passer à N runners réels devra être une **extension** de la couture posée ici.

---

## 2. Ce qui existe (à réutiliser/migrer — pas réinventer)

| Élément | Où | État / rôle pour L10 |
|---|---|---|
| **PTY réel typeable** | `src/components/PtyTerminal.tsx`, `src/hooks/usePty.ts` | xterm + `pty.write`/`onData`/resize/close. **Réutilisé tel quel** comme surface terminal-source. |
| **Backend PTY** | `src-tauri/src/terminal.rs` (`pty_open/write/resize/close`, events `pty://output|closed/{id}`) | Spawne **`default_shell()`** (shell nu). **À étendre** pour lancer un **programme runner** (le CLI `claude`) au lieu/au-dessus du shell. `validate_cwd` (anti-évasion chapeau) **conservé**. |
| **Résolution shell/login** | `src-tauri/src/shell.rs` (`default_shell`, login `-l` D10) | Modèle à suivre pour **résoudre le binaire runner** par OS (résolution PATH, args). |
| **Modèle conversation L8** | `src/hooks/useConversations.ts` (tours, agent par-tour, mode `chat|shell`) | **Migré** : le `mode chat|shell` devient **chat-vue ⇄ terminal-source de la MÊME session** ; `send` ne sera plus un appel `backend.chat` one-shot mais une **écriture stdin** vers le runner. `ChatTurn`/`agent` par-tour **conservés** (la vue filtrée les peuple). |
| **Vue chat** | `src/components/Chat.tsx` (bulles, avatars par-tour) | **Réutilisé** comme **vue filtrée**. La saisie devient l'**entrée partagée**. |
| **Roster team** | `src/components/Roster.tsx`, `src/mock/demoTeam.ts` | **Réutilisé** : personas que le chef incarne ; clic → `@agent`. |
| **Vue Working** | `src/views/WorkingView.tsx` | **Remaniée** : le toggle Chat/Shell devient **deux vues d'une même session-runner**. |
| **Façade** | `src/api/backend.ts` (D7, unique `invoke`/`listen`) | **Étendue** : commandes runner (`runner_open/write/interrupt/close`) + events de flux. **Aucun `invoke` hors façade.** |
| **Client IA L3** | `src-tauri/src/ai.rs` (`chat`, `next_step` OpenAI-compat) | **`next_step` (L3) CONSERVÉ** (moteur prochaine étape, orthogonal). **`chat` L8 = remplacé** (voir § 5) : la conversation n'est plus un appel Ollama one-shot mais la lecture du flux runner. |

---

## 3. Le point dur n°2 — DÉRIVER LE CHAT (vue filtrée) DU FLUX TERMINAL

> C'est le LE point dur. Honnêteté demandée : on dit ce qui est faisable maintenant vs ce qui reste
> à explorer, **sans rétrécir la cible**.

**Le problème.** Le flux brut d'un runner comme Claude Code lancé **en TUI interactive** (binaire nu
dans le PTY) est de l'**ANSI/TUI** (status line, spinners, repaint, couleurs). En dériver une vue
« parole » propre par parsing de l'écran dé-ANSI-isé est **fragile** (dépend du rendu, casse à chaque
maj du runner). C'est le piège à éviter.

**Le fait vérifié qui débloque (web 2026-06-26).** Le CLI `claude` offre un **mode flux structuré** :
`claude --print --input-format stream-json --output-format stream-json --verbose
--include-partial-messages`. La sortie est du **NDJSON typé** (un objet/ligne) :
- `system` (init : session_id, model, tools…) ;
- `assistant` / `user` (messages, contenu en blocs `text` / `tool_use` / `tool_result`) ;
- `stream_event` (deltas `text_delta` pour le streaming token-par-token) ;
- `result` (fin de tour : coût, usage).

L'**entrée** est aussi du NDJSON (`{"type":"user","message":{...}}`), `--continue`/`--resume` enchaînent
les tours, et **`{"type":"interrupt"}`** sur stdin = **équivalent `esc`** (abort outil, session vivante).

**Conséquence de cadrage : deux postures possibles, à arbitrer.**

| Posture | Terminal-source | Vue filtrée (chat) | `esc`/contrôle | Risque |
|---|---|---|---|---|
| **A. TUI nue** (`claude` interactif dans le PTY) | Vraie TUI typeable, indiscernable du terminal réel | **Parsing ANSI + marqueurs** `[ROYAUME][Agent]`/pastilles — **fragile** | `esc` natif du terminal | Vue filtrée peu fiable ; déformation probable |
| **B. Flux structuré** (`stream-json` bidirectionnel, rendu xterm en parallèle) | Flux NDJSON **rendu lisible** dans xterm (par le cockpit) ; toujours « la source » | **Filtre par TYPE de message** (propre, stable) : `assistant.text` → bulle parole ; `tool_use` → canal geste ; `result` → fin de tour | `{"type":"interrupt"}` injecté = `esc` | NDJSON **sous-documenté** (#24594) → **spike requis** |

**Recommandation de Gandalf : posture B**, parce qu'elle **réalise le modèle gravé sans le trahir** —
la vue filtrée naît du **canal** (type de message), pas d'une heuristique d'écran ; le filtre « adresse /
geste / pensée » du § 5 PROJET devient **le même mécanisme** qui produit le chat. La fragilité du
parsing ANSI (posture A) trahirait la cible « vue filtrée fiable ». **MAIS** la posture B repose sur un
flag sous-documenté → **elle n'est pas fermable les yeux fermés** : on impose un **spike P0** (§ 7) qui
décide. Si le spike échoue, **repli explicite** : posture A en **mode dégradé honnête** (chat = sous-flux
marqué par badges, le reste reste dans le terminal) — **sans** prétendre filtrer ce qu'on ne sait pas
filtrer. **→ À arbitrer #2.**

---

## 4. Architecture cible du lot (couture runner = point d'abstraction net)

La couture runner est l'extension critique (PROJET § 2.3) : passer de 1 à N runners réels doit être une
extension, pas une réécriture. On pose donc une abstraction **« runner »** au-dessus du PTY existant.

```
┌──────────────────────── SESSION (1 par travail) ────────────────────────┐
│  CHEF-RUNNER (étape actuelle : Claude Code = CLI `claude` dans le PTY)   │
│                                                                          │
│  src-tauri  RunnerSpec{kind, program, args, cwd, env}                    │
│     ├─ runner_open(session_id, spec)  → spawn dans le PTY (terminal.rs)  │
│     ├─ runner_write(session_id, data) → stdin partagé (chat + terminal)  │
│     ├─ runner_interrupt(session_id)   → {"type":"interrupt"} (= esc)     │
│     └─ runner_close(session_id)                                          │
│  events: runner://raw/{id} (flux brut→xterm) · runner://event/{id}       │
│          (NDJSON parsé→vue filtrée, posture B)                           │
│        ▲ stdin partagé              │ projection FILTRÉE (canal adresse)  │
│  ┌─────┴───────────────────────┐    ▼                                    │
│  │ TERMINAL xterm (SOURCE)     │  CHAT bulles (VUE) — Chat.tsx réutilisé  │
│  │ PtyTerminal réutilisé       │  moi ↔ chef + comptes-rendus verbatim    │
│  └─────────────────────────────┘  (saisie commune ─┘)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Le runner abstrait** (`RunnerSpec`) identifie un kind (`claude-code` par défaut ; `shell` = repli /
  legacy L2) + programme/args/cwd/env. **Résolution par OS** sur le modèle de `shell.rs` (PATH, jamais
  de chemin en dur). **`validate_cwd` (chapeau) conservé** : un runner reste un vecteur d'exécution.
- **Le PTY reste la plomberie** (`terminal.rs`) ; `runner_*` est une **couche au-dessus** qui choisit le
  programme spawné (au lieu du shell nu) et, en posture B, **parse le NDJSON** côté Rust pour émettre
  deux flux : `runner://raw/{id}` (vers xterm, la source visible) et `runner://event/{id}` (objets typés
  vers la vue filtrée). **Le parsing NDJSON vit côté Rust** (D7/D2 : pas de logique réseau/format dans le
  front). **→ À arbitrer #3** (où vit le parse : Rust recommandé).

---

## 5. Migration depuis L8 (ce qu'on garde / remplace)

- **`useConversations` — migré, pas jeté.** Le modèle « 1 conversation par projet », `ChatTurn` (avec
  `agent` figé par-tour, fix L9), l'historique et le roster **restent**. Ce qui change :
  - le champ `mode: "chat" | "shell"` devient **`view: "chat" | "terminal"`** sur **la MÊME session-runner**
    (plus deux univers : une source, deux surfaces — cf. point n°7) ;
  - `send(projectId, agent, content)` **ne fait plus** `backend.chat(...)` (appel Ollama one-shot). Il
    **écrit dans le stdin du runner** (`runner_write`) et **écho dans le chat** (tour `user`). La réponse
    du chef **n'est plus** une valeur de retour : elle **arrive par le flux** `runner://event` et peuple
    l'historique (tours `assistant`, agent par-tour préservé).
- **`Chat.tsx` — réutilisé** comme vue filtrée (présentationnel inchangé ; il reçoit des `ChatTurn`
  produits par le filtre, plus par `backend.chat`).
- **`src-tauri/src/ai.rs` `chat` — retiré du chemin conversation.** La commande `chat` L8 n'est plus le
  moteur de la conversation. **→ À arbitrer #4 :** soit on la **supprime** (et le type TS `ChatReply` +
  `backend.chat`), soit on la **garde inerte** derrière un flag pour un éventuel « mode chat LLM direct »
  hors-session. Recommandation : **la retirer** (MVP, pas de code mort), en notant la décision.
- **`next_step` (L3) — CONSERVÉ tel quel.** Orthogonal à la conversation (suggestion de prochaine étape).
  Le panneau `NextStepPanel` reste disponible dans la vue session.

---

## 6. Sémantique de l'entrée partagée + comptes-rendus + contrôle

- **Entrée partagée (point n°3 du brief).** Une **seule zone de saisie** par session. Taper :
  1. **affiche le texte dans le chat** (tour `user`, écho immédiat) ;
  2. **l'injecte en stdin du runner** (`runner_write`). En posture B, l'injection est un message NDJSON
     `{"type":"user",...}` ; en posture A, le texte brut + `\r`.
  - Le **`@agent`** (parsing `parseMention` existant) est **conservé comme convention d'adresse** : il
    **préfixe le texte injecté** (le chef lit « @Gimli : … » et délègue/incarne), **et** fixe la persona
    d'écho côté chat. Il **n'orchestre rien côté cockpit** (le chef orchestre). **→ À arbitrer #5 :**
    `@agent` injecté **verbatim** (recommandé, le chef gère) vs traduit en directive.
  - Le **terminal xterm reste typeable directement** (frappe → `runner_write` aussi) : c'est la source et
    le point de contrôle. Taper dans le terminal **n'écho pas** forcément dans le chat (c'est du flux
    brut ; seul le filtre décide ce qui remonte en bulle).
- **Comptes-rendus verbatim du chef (point n°5).** Quand le chef restitue le travail d'un agent de la
  team (méthode iakaframe : restitution en relais, badges `[ROYAUME][Agent]`, sans ventriloquie), ces
  lignes apparaissent dans le chat **comme bulles attribuées à l'agent émetteur** (l'`agent` du `ChatTurn`
  = l'émetteur du compte-rendu). En posture B, le filtre s'appuie sur les **badges** présents dans le
  texte du chef pour attribuer la bulle ; **aucune reformulation** côté cockpit (verbatim).
- **Contrôle `esc` / interruption (point n°6).** L'interruption est **seulement côté terminal-source** :
  un bouton/affordance **« Interrompre (esc) »** dans l'IHM (et la touche `Esc` quand le terminal a le
  focus) appelle **`runner_interrupt`** → `{"type":"interrupt"}` (posture B) ou `\x1b` (posture A).
  L'IHM **rend visible** l'état « le chef travaille / interruptible » (réutilise le statut roster +
  l'état `pending`/streaming). **→ À arbitrer #6 :** placement de l'affordance esc (barre de session
  recommandée) + faut-il l'exposer aussi depuis la vue chat.

---

## 7. Phasage (la cible tenue à chaque phase)

> Lot gros → phasé. Chaque phase est livrable et **ne déforme pas** la cible.

### P0 — SPIKE de dé-risquage (bloquant, court) — *décide la posture*
But : lever l'incertitude du point dur n°2 **avant** d'écrire l'archi. Hors-app, jetable.
1. Lancer `claude --print --input-format stream-json --output-format stream-json --verbose
   --include-partial-messages` dans un PTY (cwd projet), **envoyer 2 tours** via stdin NDJSON +
   `--continue`/session, **capturer** le NDJSON, **injecter `{"type":"interrupt"}`** et constater l'abort.
2. **Livrable du spike** : un mini-rapport (dans le commit/PR) : le NDJSON est-il **stable et parsable**
   pour dériver la vue (oui → **posture B fermée**) ? l'interrupt marche-t-il ? sinon → **posture A
   dégradée** documentée. **Gate de décision posture (A/B) avec Stéphane.**

### P1 — Couture runner + terminal-source (chef = Claude Code dans le PTY)
- `RunnerSpec` + `runner_open/write/interrupt/close` (Rust, au-dessus de `terminal.rs`, `validate_cwd`
  conservé) ; résolution du binaire `claude` par OS (modèle `shell.rs`) ; **fallback `shell` legacy**.
- Façade `backend.ts` : commandes runner + events `runner://raw|event/{id}` (seul endroit `invoke`/`listen`).
- `PtyTerminal` rebranché sur le flux runner (raw) ; le chef **tourne réellement** dans le PTY du projet ;
  cycle de vie session (ouvrir / continuer-relancer via `--continue`/`--resume <session_id>`).
- **Critère P1 :** dans Working, ouvrir un projet lance `claude` dans son cwd ; le terminal montre le
  flux du chef et reste **typeable** ; `esc`/interrupt fonctionne. (Settings globaux + set par défaut.)

### P2 — Vue filtrée (chat) + entrée partagée
- Parse NDJSON (posture B) côté Rust → `runner://event` ; filtre type→canal ; peuplement des `ChatTurn`
  (parole = `assistant.text` ; comptes-rendus verbatim attribués par badge).
- Saisie unique → écho chat (`user`) + `runner_write` ; `@agent` injecté ; toggle **chat-vue ⇄
  terminal-source** de la **même** session (fin du « deux univers » L8 — point n°7).
- Migration `useConversations`/`Chat` (§ 5) ; retrait `ai.rs chat` (selon arbitrage #4).
- **Critère P2 :** taper dans le chat l'affiche ET pilote le chef ; les réponses/ comptes-rendus du chef
  remontent en bulles attribuées ; basculer chat↔terminal montre la **même** session.

### P3 — Réglages globaux (set par défaut) + finitions
- Réglage **global** : runner par défaut (Claude Code) + endpoint/binaire, team iakaframe par défaut
  (réutilise `config_*` L0/keychain si clé requise). **PER-PROJET = hors L10 (cible).**
- Statut roster vivant dérivé du flux ; affordance esc visible ; doc état des lieux + backlog `CLAUDE.md`.

**Différé explicite (cible, NON régressée) :** runners réels par agent / multi-runner ; settings
per-projet ; skills→frames ; volet graph délégation/jalons. (Le découpage P0→P3 peut devenir des lots
L10a/L10b si Stéphane préfère gater plus fin — **À arbitrer #1**.)

---

## 8. Fichiers concernés (prévision — Gimli affine)

- `src-tauri/src/runner.rs` *(nouveau)* — `RunnerSpec`, résolution binaire par OS, `runner_open/write/
  interrupt/close`, parsing NDJSON (posture B), émission `runner://raw|event/{id}`. Réutilise
  `terminal.rs` (PTY) + `validate_cwd`.
- `src-tauri/src/terminal.rs` — exposer le spawn d'un **programme** (pas seulement `default_shell`) ; ne
  rien casser de l'existant PTY/`validate_cwd`.
- `src-tauri/src/shell.rs` — modèle de résolution par OS réutilisé (pas de régression).
- `src-tauri/src/lib.rs` — enregistrer les nouvelles commandes/état.
- `src/api/backend.ts` — commandes runner + helpers events `onRunnerRaw`/`onRunnerEvent` (seul endroit
  `invoke`/`listen`).
- `src/hooks/useRunnerSession.ts` *(nouveau, ou évolution de `useConversations`)* — état session-runner,
  filtre→`ChatTurn`, entrée partagée. **Pas de god-component.**
- `src/components/{PtyTerminal,Chat,Roster}.tsx` — réutilisés (PtyTerminal rebranché sur le flux runner).
- `src/views/WorkingView.tsx` — toggle chat-vue ⇄ terminal-source d'une même session ; affordance esc.
- `src-tauri/src/ai.rs` + `src/api/backend.ts` — retrait `chat` L8 (selon #4) ; `next_step` conservé.
- `CLAUDE.md` — entrée backlog L10 (ci-dessous).
- `specs/PROJET.md` — rien à modifier (déjà gravé § 0) ; journal de décision posture A/B à ajouter après P0.

---

## 9. Comportement attendu (critères observables)

- Ouvrir un projet dans Working **lance le chef-runner** (Claude Code) dans le **PTY du projet** (cwd =
  projet, sous le chapeau) ; le terminal affiche le flux du chef et **reste typeable** ; le chef
  **survit** au basculement de vue.
- La **même saisie** affiche dans le chat ET pilote le runner (stdin) ; le `@agent` est respecté.
- Les **réponses et comptes-rendus verbatim** du chef remontent dans le chat en **bulles attribuées**
  (agent par-tour préservé), sans reformulation côté cockpit.
- **Chat ⇄ terminal = une seule session** (pas deux univers) ; basculer ne perd pas l'état.
- **`esc`/interrupt** interrompt le chef **uniquement côté terminal-source**, et l'IHM le rend visible.
- **Aucune régression** des gates existants : CSP stricte intacte (aucun client réseau/format dans le
  front — parse NDJSON côté Rust), façade unique D7 respectée (aucun `invoke`/`listen` hors `backend.ts`),
  `validate_cwd` (anti-évasion chapeau) toujours appliqué au runner, pas de god-component.

## 10. Vérification

- [ ] Spike P0 mené ; **posture A/B tranchée avec Stéphane** ; rapport joint.
- [ ] Typecheck OK · Lint OK (`npm run typecheck`, `npm run lint`)
- [ ] Tests front à jour et verts (`npm run test`) — filtre NDJSON→`ChatTurn` testé (façade mockée) ;
      pas de régression `usePty`/conversations.
- [ ] Rust : `cargo fmt --check` · `cargo clippy -D warnings` · `cargo test` — `validate_cwd` couvert,
      résolution binaire runner testée (cross-OS, sans spawn réel comme `shell.rs`).
- [ ] `bash scripts/quality.sh` vert.
- [ ] **Testé dans l'app réelle par Stéphane** : un vrai `claude` tourne dans le PTY, chat-vue pilote,
      `esc` interrompt.

## 11. Hors scope (cible NON régressée — différée)

- Runners réels **par agent** / multi-runner / multi-modèle (étape actuelle = 1 chef réel + personas).
- Settings **per-projet** (étape actuelle = globaux + set par défaut).
- Skills **modifiables** → frames ; volet **graph de délégation / jalons** ; features inter-agents.
- Modes de présentation A (old-school) / C (WhatsApp pur) au-delà de l'existant ; canaux externes.
- Branchement iakaboxlogs/3-canaux du flux runner (L4 reste lecture CouchDB ; le filtre L10 partage la
  *grammaire* de canaux mais ne réécrit pas la main courante).

---

## À ARBITRER (revient à Stéphane — gate)

1. **Granularité du gate** : un seul lot L10 (P0→P3) ou découpage en **L10a (P0+P1)** / **L10b (P2+P3)** ?
2. **Posture du runner** (LE choix) : **B (flux structuré stream-json)** recommandée pour une vue filtrée
   *fiable* — mais flag sous-documenté → décision **après spike P0**. Repli = **A (TUI nue)** en mode
   dégradé honnête. Stéphane valide le principe « B si le spike confirme, sinon A dégradée ».
3. **Où vit le parse NDJSON** : **Rust** (recommandé, cohérent D7/CSP) vs front.
4. **`ai.rs chat` L8** : **supprimer** (recommandé, pas de code mort) vs garder inerte pour un futur
   « chat LLM direct » hors-session.
5. **Sémantique `@agent`** : injecté **verbatim** au chef (recommandé) vs traduit en directive cockpit.
6. **Affordance `esc`** : barre de session (recommandé) ; l'exposer aussi côté vue chat ou terminal seul ?

---

## Sources (faits vérifiés sur le web, 2026-06-26)
- Claude Code — mode headless / `-p`, `--output-format` (text/json/stream-json), `--continue`/`--resume`,
  `--append-system-prompt`, schéma d'événements : [Run Claude Code programmatically](https://code.claude.com/docs/en/headless) ·
  [CLI reference](https://code.claude.com/docs/en/cli-reference)
- `--input-format stream-json` (bidirectionnel) **sous-documenté** (justifie le spike P0) :
  [issue #24594](https://github.com/anthropics/claude-code/issues/24594)
- Message **`{"type":"interrupt"}`** sur stdin = équivalent **esc** (abort outil, session vivante) :
  [issue #41665](https://github.com/anthropics/claude-code/issues/41665)
- Format NDJSON / types de messages (assistant/user/result/system, deltas) :
  [Claude stream-json event cheatsheet (takopi)](https://takopi.dev/reference/runners/claude/stream-json-cheatsheet/) ·
  [Parsing stream-json with jq (ytyng)](https://www.ytyng.com/en/blog/claude-stream-json-jq)
- Stack PTY (rappel, déjà gravé) : `portable-pty` + xterm sur Tauri 2 (PROJET § 10.5).
