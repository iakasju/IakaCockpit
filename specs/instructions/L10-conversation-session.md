# Instruction : L10 — Ré-architecture conversation/session (terminal-source + chat-vue)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : RÉVISÉ post-spike P0 (2026-06-26) — posture B ACTÉE par Stéphane.** Le spike a tranché le
> point dur n°2 ; les hypothèses qui restaient ouvertes sont closes (cf. § Journal de décision posture).
> **P1 est désormais codable** sur des faits prouvés (commit `3ad0ffb`, `specs/mock/spike-l10/`).
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
> **Faits techniques PROUVÉS par le spike P0 le 2026-06-26** (commit `3ad0ffb`, captures dans
> `specs/mock/spike-l10/` — ils ne reposent plus sur des suppositions web, ils sont **exécutés sur
> `claude` v2.1.193 / macOS**) :
> - **Commande qui marche** :
>   `claude --print --input-format stream-json --output-format stream-json --verbose [--include-partial-messages]
>   --model <m> --dangerously-skip-permissions --allowedTools <...>`. **`--verbose` est OBLIGATOIRE** avec
>   `--output-format stream-json` (sinon refus). `--include-partial-messages` est **optionnel** (deltas
>   token-par-token via `stream_event` — beaucoup de bruit, à n'activer que si streaming token voulu).
> - **FINDING MAJEUR — stdin ne doit PAS être un TTY.** Dans un vrai PTY, `claude` détecte
>   `isatty(stdin)==true` et **REFUSE** le mode NDJSON (`Error: Input must be provided…`). Le chef-runner
>   doit donc tourner avec **stdin/stdout en PIPES**, xterm devenant une **surface de RENDU** du flux brut
>   (le flux reste la source de vérité — cible § 0 intacte). → **conséquence d'architecture** : une
>   **nouvelle couture pipes** (`runner.rs`), PAS un réemploi direct du PTY de `terminal.rs` (cf. § 4).
> - **Multi-tours** : on enchaîne les tours en **continuant d'écrire des messages `{"type":"user",…}` sur
>   le MÊME stdin d'un seul process long-vécu** — **pas** besoin de `--continue`/`--resume` à chaud (ceux-ci
>   servent à **reprendre une session passée**, pas à chaîner dans une session en cours).
> - **Sortie NDJSON typée** (1 ligne = 1 objet JSON) : `system`(`init`/`status`…), `assistant`(blocs
>   `thinking`/`text`/`tool_use`), `user`(blocs `tool_result`), `result`(`subtype:"success"`),
>   `stream_event` (si partial-messages), `rate_limit_event`/`out_of_credits` (types dédiés → exploitables IHM).
> - **Interrupt** : `{"type":"interrupt"}` sur stdin **avorte l'outil en cours (exit 137), le process
>   survit** = l'`esc` voulu. **Confirmé** par le spike.
> - **Stabilité** : parse défensif léger (try/catch par ligne, ignorer les lignes non-JSON, router stderr
>   à part). **Aucun parseur ANSI.**

---

## 1. CIBLE vs ÉTAPE ACTUELLE (à tenir explicitement — ne jamais confondre)

> **Règle de méthode impérative (Stéphane).** Ce lot tient la **CIBLE** explicite et fait de l'étape
> courante un **sous-ensemble FIDÈLE**, jamais une déviation. Les deux colonnes restent distinctes.

| Dimension | **ÉTAPE ACTUELLE (ce que L10 livre)** | **CIBLE (à tenir, hors L10)** |
|---|---|---|
| Orchestration | **HYBRIDE** : le **chef = UN vrai runner** (défaut **Claude Code** = CLI `claude` lancé en **PIPES** dans le cwd du projet ; xterm = surface de rendu du flux) ; la **team = personas** que le chef incarne. | **Runners RÉELS par agent** (multi-runner/modèle), câblés un par un. |
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
| **xterm réel typeable** | `src/components/PtyTerminal.tsx`, `src/hooks/usePty.ts` | xterm + `write`/`onData`/resize. **Réutilisé comme SURFACE DE RENDU** du flux runner (le finding spike interdit de coller un PTY au chef-runner : xterm affiche le flux brut `runner://raw`, ce n'est plus un PTY shell). La frappe est routée vers `runner_write`. |
| **Backend PTY** | `src-tauri/src/terminal.rs` (`pty_open/write/resize/close`, events `pty://output|closed/{id}`) | **Reste pour le SHELL LEGACY** (repli `shell`, non-runner). **Le chef-runner ne passe PAS par lui** : le spike a prouvé que `claude` refuse le NDJSON quand stdin est un TTY. → couture **pipes** séparée (`runner.rs`, § 4). `validate_cwd` (anti-évasion chapeau) **conservé** des deux côtés. |
| **Résolution shell/login** | `src-tauri/src/shell.rs` (`default_shell`, login `-l` D10) | Modèle à suivre pour **résoudre le binaire `claude`** par OS (résolution PATH, args). Le chef-runner ne lance PAS un login shell : il lance directement le binaire en pipes. |
| **Modèle conversation L8** | `src/hooks/useConversations.ts` (tours, agent par-tour, mode `chat|shell`) | **Migré** : le `mode chat|shell` devient **chat-vue ⇄ terminal-source de la MÊME session** ; `send` ne sera plus un appel `backend.chat` one-shot mais une **écriture stdin** vers le runner. `ChatTurn`/`agent` par-tour **conservés** (la vue filtrée les peuple). |
| **Vue chat** | `src/components/Chat.tsx` (bulles, avatars par-tour) | **Réutilisé** comme **vue filtrée**. La saisie devient l'**entrée partagée**. |
| **Roster team** | `src/components/Roster.tsx`, `src/mock/demoTeam.ts` | **Réutilisé** : personas que le chef incarne ; clic → `@agent`. |
| **Vue Working** | `src/views/WorkingView.tsx` | **Remaniée** : le toggle Chat/Shell devient **deux vues d'une même session-runner**. |
| **Façade** | `src/api/backend.ts` (D7, unique `invoke`/`listen`) | **Étendue** : commandes runner (`runner_open/write/interrupt/close`) + events de flux. **Aucun `invoke` hors façade.** |
| **Client IA L3** | `src-tauri/src/ai.rs` (`chat`, `next_step` OpenAI-compat) | **`next_step` (L3) CONSERVÉ** (moteur prochaine étape, orthogonal). **`chat` L8 = remplacé** (voir § 5) : la conversation n'est plus un appel Ollama one-shot mais la lecture du flux runner. |

---

## 3. Le point dur n°2 — DÉRIVER LE CHAT (vue filtrée) DU FLUX TERMINAL — **RÉSOLU (posture B)**

> C'était LE point dur. Le **spike P0 a tranché** : **posture B = flux structuré `stream-json`**, **actée
> par Stéphane** (2026-06-26, commit `3ad0ffb`). Cette section consigne la décision ; le repli posture A
> n'est plus la voie (cf. § Journal de décision posture pour la trace).

**Le piège évité.** Le flux brut d'un runner lancé **en TUI interactive** (binaire nu dans un PTY) est de
l'**ANSI/TUI** (status line, spinners, repaint). En dériver une vue « parole » par parsing d'écran
dé-ANSI-isé est **fragile** (casse à chaque maj du runner). C'était la posture A.

**Ce que le spike a prouvé (faits, pas web).** Le CLI `claude` offre un **mode flux structuré** émettant
du **NDJSON typé** (un objet/ligne) — exploitable directement, **sans aucun parsing d'écran** :
- `system` (init : `session_id`, `model`, `tools`…) ;
- `assistant` / `user` (messages ; contenu en blocs `thinking` / `text` / `tool_use` / `tool_result`) ;
- `stream_event` (deltas `text_delta`, seulement si `--include-partial-messages`) ;
- `result` (`subtype:"success"` = fin de tour : coût, usage) ; `rate_limit_event`/`out_of_credits`.

**Dérivation de la vue (filtre par TYPE, stable)** — c'est le mécanisme retenu pour le chat :
- **parole** (canal *adresse*) = `assistant` → blocs `text` → bulle ;
- **geste** = `assistant` → `tool_use`, apparié au `user` → `tool_result` ;
- **pensée** = `assistant` → blocs `thinking` (canal **masquable**, cf. § 5 PROJET) ;
- **fin de tour** = `result` (`subtype:"success"`).

**Entrée + contrôle** : l'entrée est aussi du NDJSON (`{"type":"user",…}`), on **enchaîne les tours sur le
même stdin long-vécu** (pas de `--continue` à chaud), et **`{"type":"interrupt"}`** sur stdin = **`esc`**
(abort outil → exit 137, le process survit). **Tout ceci confirmé par le spike.**

**Pourquoi B réalise le modèle gravé sans le trahir** : la vue filtrée naît du **canal** (type de message),
pas d'une heuristique d'écran ; le filtre « adresse / geste / pensée » du § 5 PROJET devient **le même
mécanisme** qui produit le chat. La cible « vue filtrée fiable » est tenue.

**⚠️ Contrainte d'architecture imposée par le spike (TTY).** Le mode NDJSON exige **stdin/stdout en
PIPES** : dans un PTY, `claude` détecte un TTY et **refuse** (`Error: Input must be provided…`). Le
chef-runner ne peut donc **pas** réutiliser le PTY de `terminal.rs` — il faut une **couture pipes**
dédiée (`runner.rs`, § 4). xterm devient une **surface de rendu** du flux brut, pas un PTY shell.

---

## 4. Architecture cible du lot (couture runner = point d'abstraction net)

La couture runner est l'extension critique (PROJET § 2.3) : passer de 1 à N runners réels doit être une
extension, pas une réécriture. On pose donc une abstraction **« runner »** au-dessus du PTY existant.

```
┌──────────────────────── SESSION (1 par travail) ────────────────────────┐
│  CHEF-RUNNER : `claude` lancé en PIPES (PAS un PTY — finding spike TTY)  │
│                                                                          │
│  src-tauri  runner.rs  RunnerSpec{kind, program, args, cwd, env}         │
│     ├─ runner_open(session_id, spec)  → spawn en PIPES (stdin/out/err)   │
│     │      args claude-code = --print --input-format stream-json         │
│     │      --output-format stream-json --verbose --model <m> …           │
│     ├─ runner_write(session_id, data) → écrit {"type":"user",…} sur stdin│
│     │      (entrée partagée chat + frappe xterm ; tours = même stdin)    │
│     ├─ runner_interrupt(session_id)   → {"type":"interrupt"} (= esc)     │
│     └─ runner_close(session_id)                                          │
│  reader thread : 1 ligne stdout = 1 objet JSON (parse défensif côté Rust)│
│  events: runner://raw/{id} (texte rendu→xterm) · runner://event/{id}     │
│          (objets NDJSON typés → vue filtrée) · stderr routé à part       │
│        ▲ stdin partagé              │ projection FILTRÉE (canal adresse)  │
│  ┌─────┴───────────────────────┐    ▼                                    │
│  │ xterm (SURFACE DE RENDU)    │  CHAT bulles (VUE) — Chat.tsx réutilisé  │
│  │ PtyTerminal réutilisé       │  moi ↔ chef + comptes-rendus verbatim    │
│  └─────────────────────────────┘  (saisie commune ─┘)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Le runner abstrait** (`RunnerSpec`) identifie un kind (`claude-code` par défaut ; `shell` = repli /
  legacy L2 via `terminal.rs`) + programme/args/cwd/env. **Résolution du binaire `claude` par OS** sur le
  modèle de `shell.rs` (PATH, jamais de chemin en dur). **`validate_cwd` (chapeau) conservé** : un runner
  reste un vecteur d'exécution.
- **Le chef-runner est une plomberie PIPES NEUVE** (`runner.rs`), **distincte du PTY** de `terminal.rs`
  (lequel reste pour le shell legacy). Raison : le finding spike (stdin TTY ⇒ refus NDJSON). `runner.rs`
  spawn `claude` avec stdin/stdout/stderr en pipes, lit stdout **ligne par ligne** (un thread reader),
  **parse le NDJSON côté Rust** (try/catch par ligne, lignes non-JSON ignorées, stderr routé à part) et
  émet **deux flux** : `runner://raw/{id}` (texte lisible → xterm, source visible) et `runner://event/{id}`
  (objets typés → vue filtrée). **Le parsing NDJSON vit côté Rust** (D7/D2 + CSP : aucune logique de
  format/réseau dans le front). **→ Arbitrage #3 TRANCHÉ par le spike : parse côté Rust, runner en pipes.**

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
  2. **l'injecte en stdin du runner** (`runner_write`) — message NDJSON `{"type":"user",…}` (posture B
     actée).
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
  focus) appelle **`runner_interrupt`** → `{"type":"interrupt"}` (posture B actée ; abort outil → exit
  137, process survit — **confirmé spike**).
  L'IHM **rend visible** l'état « le chef travaille / interruptible » (réutilise le statut roster +
  l'état `pending`/streaming). **→ À arbitrer #6 :** placement de l'affordance esc (barre de session
  recommandée) + faut-il l'exposer aussi depuis la vue chat.

---

## 7. Phasage (la cible tenue à chaque phase)

> Lot gros → phasé. Chaque phase est livrable et **ne déforme pas** la cible.

### P0 — SPIKE de dé-risquage — ✅ **FAIT (2026-06-26, commit `3ad0ffb`)**
Mené hors-app (`specs/mock/spike-l10/`, `claude` v2.1.193). **Verdict : posture B FERMÉE, actée par
Stéphane.** NDJSON stable et parsable par `type` (zéro parsing d'écran), multi-tours sur stdin long-vécu,
interrupt fonctionnel (exit 137, process survit). **Finding majeur** : stdin **ne doit pas être un TTY**
→ chef-runner en **pipes** (`runner.rs`), xterm = surface de rendu (intégré en § 3/§ 4/P1). Détail :
`specs/mock/spike-l10/README.md`.

### P1 — Couture runner PIPES + terminal-source (chef = Claude Code en pipes)
- **Nouveau module `runner.rs`** : `RunnerSpec` + `runner_open/write/interrupt/close`. Le chef-runner
  est spawné **en PIPES** (stdin/stdout/stderr — **PAS** un PTY ; finding spike), `validate_cwd` conservé,
  résolution du binaire `claude` par OS (modèle `shell.rs`). **`terminal.rs` (PTY) reste inchangé** pour
  le **fallback `shell` legacy**.
- **Args du kind `claude-code`** : `--print --input-format stream-json --output-format stream-json
  --verbose --model <m>` (+ `--include-partial-messages` seulement si streaming token voulu ; +
  `--dangerously-skip-permissions`/`--allowedTools` selon politique — à cadrer P3, cf. risque résiduel).
- **Cycle de vie session** : un **seul process `claude` long-vécu** par session ; **enchaîner les tours =
  écrire de nouveaux messages `{"type":"user",…}` sur le MÊME stdin** (NE PAS rouvrir, NE PAS `--continue`
  à chaud — `--continue`/`--resume <session_id>` ne servent qu'à **reprendre une session passée**,
  hors P1). `runner_close` ferme stdin + termine le process.
- **Reader thread** côté Rust : lit stdout ligne par ligne, parse défensif (try/catch, ignore non-JSON,
  stderr à part), émet `runner://raw/{id}` (vers xterm) — le parse→`event` arrive en P2.
- **Façade `backend.ts`** : commandes runner + helper events `onRunnerRaw` (seul endroit `invoke`/`listen`).
- **`PtyTerminal` rebranché** sur `runner://raw` (surface de rendu) ; la frappe xterm → `runner_write`.
- **Critère P1 :** dans Working, ouvrir un projet **lance `claude` en pipes dans son cwd** ; le terminal
  (xterm) **affiche le flux brut** du chef et reste **typeable** (frappe → stdin) ; **un 2ᵉ tour** écrit
  sur le même stdin répond ; **`esc`/interrupt** avorte l'outil en cours et le process survit. (Settings
  globaux + set par défaut.)

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
per-projet ; skills→frames ; volet graph délégation/jalons. (Le découpage P1→P3 peut devenir des lots
L10a/L10b si Stéphane préfère gater plus fin — **À arbitrer #1**.)

---

## 8. Fichiers concernés (prévision — Gimli affine)

- `src-tauri/src/runner.rs` *(nouveau)* — `RunnerSpec`, résolution binaire par OS, `runner_open/write/
  interrupt/close`, **spawn en PIPES** (stdin/stdout/stderr — **PAS** le PTY de `terminal.rs` : finding
  spike TTY), reader thread + parsing NDJSON côté Rust (posture B), émission `runner://raw|event/{id}`.
  Réutilise `validate_cwd` (chapeau) + le modèle de résolution OS de `shell.rs`.
- `src-tauri/src/terminal.rs` — **inchangé sur le fond** : reste la plomberie **PTY du shell legacy**
  (`default_shell`). **Ne PAS y brancher le chef-runner** (il refuse le NDJSON sur un stdin TTY).
  Préserver l'existant PTY/`validate_cwd`.
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
- `specs/PROJET.md` — modèle déjà gravé § 0 (rien à changer au modèle). **À FAIRE (hors périmètre code,
  note de Gandalf)** : ajouter au journal de décision de PROJET.md une ligne actant **posture B (spike
  P0, commit `3ad0ffb`)** + le finding TTY/pipes — pour que la vision porte la trace de la décision.

---

## 9. Comportement attendu (critères observables)

- Ouvrir un projet dans Working **lance le chef-runner** (Claude Code) **en pipes** dans le **cwd du
  projet** (sous le chapeau) ; le terminal (xterm = surface de rendu) affiche le flux brut du chef et
  **reste typeable** (frappe → stdin) ; le chef **survit** au basculement de vue.
- La **même saisie** affiche dans le chat ET pilote le runner (stdin) ; le `@agent` est respecté.
- Les **réponses et comptes-rendus verbatim** du chef remontent dans le chat en **bulles attribuées**
  (agent par-tour préservé), sans reformulation côté cockpit.
- **Chat ⇄ terminal = une seule session** (pas deux univers) ; basculer ne perd pas l'état.
- **`esc`/interrupt** interrompt le chef **uniquement côté terminal-source**, et l'IHM le rend visible.
- **Aucune régression** des gates existants : CSP stricte intacte (aucun client réseau/format dans le
  front — parse NDJSON côté Rust), façade unique D7 respectée (aucun `invoke`/`listen` hors `backend.ts`),
  `validate_cwd` (anti-évasion chapeau) toujours appliqué au runner, pas de god-component.

## 10. Vérification

- [x] Spike P0 mené ; **posture B tranchée et actée par Stéphane** (commit `3ad0ffb`, `specs/mock/spike-l10/`).
- [ ] Typecheck OK · Lint OK (`npm run typecheck`, `npm run lint`)
- [ ] Tests front à jour et verts (`npm run test`) — filtre NDJSON→`ChatTurn` testé (façade mockée) ;
      pas de régression `usePty`/conversations.
- [ ] Rust : `cargo fmt --check` · `cargo clippy -D warnings` · `cargo test` — `validate_cwd` couvert,
      résolution binaire runner testée (cross-OS, sans spawn réel comme `shell.rs`).
- [ ] `bash scripts/quality.sh` vert.
- [ ] **Testé dans l'app réelle par Stéphane** : un vrai `claude` tourne **en pipes** (flux rendu dans
      xterm), chat-vue pilote, `esc` interrompt.

## 11. Hors scope (cible NON régressée — différée)

- Runners réels **par agent** / multi-runner / multi-modèle (étape actuelle = 1 chef réel + personas).
- Settings **per-projet** (étape actuelle = globaux + set par défaut).
- Skills **modifiables** → frames ; volet **graph de délégation / jalons** ; features inter-agents.
- Modes de présentation A (old-school) / C (WhatsApp pur) au-delà de l'existant ; canaux externes.
- Branchement iakaboxlogs/3-canaux du flux runner (L4 reste lecture CouchDB ; le filtre L10 partage la
  *grammaire* de canaux mais ne réécrit pas la main courante).

---

## Risques résiduels (tracés post-spike — à assumer, pas bloquants)

- **(a) Gardes de sécurité internes du CLI** : les commandes composées (`&&`) peuvent être basculées en
  background par `claude` lui-même. Indépendant de `validate_cwd` (chapeau) — **assumé**, à surveiller.
- **(b) Coût / quota réels** : `rate_limit_event` / `out_of_credits` sont émis comme **types NDJSON
  dédiés** → exploitables IHM (afficher l'état, désactiver la saisie). **Renforce le besoin du réglage
  modèle global (P3).**
- **(c) `--include-partial-messages`** génère beaucoup de `stream_event` → **n'activer que** si le
  streaming token-par-token est voulu (sinon bruit inutile dans le flux).

## À ARBITRER (revient à Stéphane — gate)

1. **Granularité du gate** : un seul lot L10 (P1→P3) ou découpage en **L10a (P1)** / **L10b (P2+P3)** ?
   *(P0 fait.)* — **OUVERT.**
2. ~~**Posture du runner**~~ — **RÉSOLU : posture B (flux structuré `stream-json`), actée par Stéphane**
   (spike P0, commit `3ad0ffb`). Repli posture A abandonné (cf. Journal de décision ci-dessous).
3. ~~**Où vit le parse NDJSON / véhicule du chef-runner**~~ — **TRANCHÉ par le spike** : chef-runner en
   **PIPES** (`runner.rs`, pas le PTY) ; **parse NDJSON côté Rust**. (Le finding TTY l'impose.)
4. **`ai.rs chat` L8** : **supprimer** (recommandé, pas de code mort) vs garder inerte pour un futur
   « chat LLM direct » hors-session. — **OUVERT.**
5. **Sémantique `@agent`** : injecté **verbatim** au chef (recommandé) vs traduit en directive cockpit.
   — **OUVERT.**
6. **Affordance `esc`** : barre de session (recommandé) ; l'exposer aussi côté vue chat ou terminal seul ?
   — **OUVERT.**
7. **Politique permissions du chef-runner** *(nouveau, soulevé par le spike)* : le spike a tourné avec
   `--dangerously-skip-permissions` + `--allowedTools` restreint. **Quelle politique en P1/P3 ?** (skip
   total vs allowlist d'outils vs prompts). Touche la sécurité — **à arbitrer** (reco : allowlist explicite,
   pas de skip total par défaut). — **OUVERT.**

---

## Journal de décision posture (post-spike P0)

- **2026-06-26 — Spike P0 mené** (`specs/mock/spike-l10/`, commit `3ad0ffb`, `claude` v2.1.193, macOS).
- **Décision : posture B FERMÉE — actée par Stéphane.** Le flux structuré `--input-format stream-json
  --output-format stream-json --verbose` est **stable, parsable par `type`** (parole/geste/pensée/
  fin-de-tour), multi-tours sur stdin long-vécu, interrupt fonctionnel. La voie ANSI (posture A) est
  **abandonnée** (elle n'est plus le repli : la spec se ferme sur B). Trace conservée pour historique.
- **Finding intégré à l'archi** : stdin TTY ⇒ refus NDJSON → chef-runner en **pipes** (`runner.rs`),
  distinct du PTY (`terminal.rs`, gardé pour le shell legacy) ; xterm = surface de rendu.
- **Corrections d'hypothèses tombées** : (1) le chaînage des tours **n'utilise pas** `--continue`/`--resume`
  (réservés à la reprise d'une session passée) mais le **même stdin** ; (2) `--verbose` est **obligatoire** ;
  (3) le runner **n'est pas spawné dans le PTY**.
- **À répercuter hors code** : ligne au journal de `PROJET.md` (note § 8). Pas de modif du modèle § 0.

## Sources (faits initiaux — désormais confirmés/corrigés par le spike P0, voir Journal ci-dessus)
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
