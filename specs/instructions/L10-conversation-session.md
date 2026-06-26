# Instruction : L10 — Ré-architecture conversation/session (terminal-source + chat-vue)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : RE-CADRÉ EN PROFONDEUR (2026-06-26) — VIRAGE D'ARCHITECTURE acté par Stéphane et PROUVÉ
> par deux spikes.** L'approche `stream-json` en **pipes** (P0/P1, `runner.rs`) est **abandonnée comme
> voie principale** ; la cible — désormais **prouvée end-to-end (spike L10b)** — est **le runner en TUI
> NATIVE interactive dans un PTY**, et **les vues dérivent du TRANSCRIPT JSONL** que Claude Code écrit
> en direct sur disque. Voir le **§ Journal de décision** (le virage, ses raisons, les commits).
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
> **Code inspecté en lecture seule le 2026-06-26** (rien n'est supposé) : `src-tauri/src/terminal.rs`
> (PTY + `validate_cwd`), `src-tauri/src/{shell,runner,ai}.rs`, `src/components/{PtyTerminal,Chat,
> Roster,NextStepPanel}.tsx`, `src/hooks/{usePty,useConversations}.ts`, `src/api/backend.ts`,
> `src/views/WorkingView.tsx`.

---

## 0. LE VIRAGE EN UNE PAGE (à lire avant tout)

**Ce qui change.** Le P0/P1 visait à lancer `claude --print --input-format stream-json` **en pipes**,
xterm devenant une **surface de rendu du NDJSON brut**. Cette voie **fonctionne** (spike P0 `3ad0ffb`,
code `runner.rs` `0ddebc7`/`b10b393`, gate Legolas PASS) **mais elle TUE la TUI native interactive** :
plus de **box Claude Code**, plus de **`Shift+Tab` automode**, plus de **`esc` natif**, plus des
**réflexes** que Stéphane utilise au quotidien. Le mode `stream-json` exige `stdin` en pipe (pas un
TTY) → le runner n'est **plus** une vraie TUI. C'est inacceptable pour la cible « le terminal est la
source de vérité **et** le poste de pilotage de Stéphane ».

**La nouvelle cible — PROUVÉE de bout en bout (spike L10b `b7ac879`).** On lance `claude` **en TUI
native interactive dans un PTY** (la couture PTY existante `terminal.rs`/`PtyTerminal`/`usePty`, login
shell L8) — c'est le **vrai** `claude`, tous les réflexes marchent. **Les vues (chat, gestes,
délégations) ne dérivent PLUS de l'écran ANSI** : elles dérivent du **transcript JSONL que Claude Code
écrit EN DIRECT sur disque**, qu'on **tail**e en parallèle pendant que la TUI tourne. Le terminal reste
la source de vérité **littérale** ; le transcript en est la **projection structurée** ; le chat est une
**vue filtrée** de ce transcript.

```
┌──────────────────── SESSION (1 par travail) ──────────────────────────────┐
│  CHEF-RUNNER : `claude` en TUI NATIVE INTERACTIVE dans un PTY              │
│    (terminal.rs réutilisé — PtyTerminal = la vraie box Claude Code :       │
│     Shift+Tab automode, esc natif, dialogues de permission… INTACTS)       │
│    spawn : current_dir = <cwd projet> (validate_cwd) · --session-id <uuid> │
│            · ENV SCRUBBÉ (CLAUDE_CODE_* / CLAUDECODE — sinon AUCUN          │
│              transcript : gotcha dur du spike) · ZÉRO manip humaine         │
│                          │ écrit EN DIRECT                                  │
│                          ▼                                                  │
│  TRANSCRIPT JSONL : ~/.claude/projects/<cwd-escaped>/<session_id>.jsonl     │
│    (escaping : chemin absolu, chaque '/' ET '.' → '-')                     │
│                          │ tail -f (Rust : FS + CSP/D7)                     │
│                          ▼                                                  │
│  TAILER côté Rust → parse records → events typés runner://event/{id}       │
│    assistant.text / user.text → PAROLES (chat)                             │
│    assistant.tool_use        → GESTES                                      │
│    tool_use name=="Task" (+isSidechain) → DÉLÉGATIONS                      │
│    tool_result (record user) → ACTIVITÉ des agents                         │
│    thinking                  → canal PENSÉE (masquable)                    │
│        ▲ stdin partagé              │ projection FILTRÉE (canal adresse)    │
│  ┌─────┴───────────────────────┐    ▼                                      │
│  │ Widget SHELL = PtyTerminal  │  CHAT bulles (VUE) — Chat.tsx réutilisé    │
│  │ = TUI native (source+esc)   │  moi ↔ chef + comptes-rendus verbatim      │
│  └─────────────────────────────┘  (saisie commune ─┘)                      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Pourquoi c'est FIDÈLE à la vision (et meilleur)** : (1) le terminal redevient la **vraie** source de
vérité ET le **vrai** point de contrôle (`esc` natif), § 0.3 PROJET tenu **à la lettre** ; (2) la vue
filtrée naît d'un **canal structuré** (le type de record du transcript), pas d'une heuristique d'écran
fragile — le filtre « adresse / geste / pensée » du § 5 PROJET devient le **même mécanisme** ; (3) on
**réutilise PLUS de code** (la couture PTY entière) que la voie pipes.

---

## 1. CIBLE vs ÉTAPE ACTUELLE (à tenir explicitement — ne jamais confondre)

> **Règle de méthode impérative (Stéphane).** Ce lot tient la **CIBLE** explicite et fait de l'étape
> courante un **sous-ensemble FIDÈLE**, jamais une déviation. Les deux colonnes restent distinctes.

| Dimension | **ÉTAPE ACTUELLE (ce que L10 livre)** | **CIBLE (à tenir, hors L10)** |
|---|---|---|
| Orchestration | **HYBRIDE** : le **chef = UN vrai runner** (défaut **Claude Code** = CLI `claude` lancé en **TUI native dans le PTY** du cwd projet) ; la **team = personas** que le chef incarne (et délègue via `Task`). | **Runners RÉELS par agent** (multi-runner/modèle), câblés un par un. |
| Conversation | **1 session = 1 terminal-chef = TOUTE la conversation** ; le **chat = vue filtrée du transcript** ; **entrée partagée** chat→PTY. | Idem, inchangé (c'est le modèle gravé). |
| Settings | **GLOBAUX** au cockpit + set par défaut : runner Claude Code + team iakaframe (odin/aragorn/gandalf/gimli/legolas…). | **PER-PROJET** : runner+modèle+skills **par agent**. |
| Couche vue | **RÉUTILISE l'existant** : bulles `Chat.tsx`, vignettes thémées (L9), personas, trace par-tour, `Roster.tsx`, `PtyTerminal.tsx` (L2). | Idem enrichie (statuts vivants depuis le transcript). |
| Source des vues | **TRANSCRIPT JSONL de Claude Code** (tail live). | **Une « source de vues » abstraite par runner** (§ 4) : transcript pour Claude Code, **appels API** pour Ollama, format de session **à spiker** pour Codex. |
| Graph délégation / jalons | **Hors L10** (mais la trace `Task`/`isSidechain` est **captée** dès P2). | Volet de création du graph de délégation / jalons (+ variantes). |

**Ce qui ne doit JAMAIS régresser** (garde-fou § 0.4) : terminal = source de vérité unique ; chat = vue
filtrée + entrée partagée ; conversation = Stéphane ↔ chef ; comptes-rendus **verbatim** ; agent =
runner+modèle+skills. **L10 est une réduction assumée (1 runner réel au lieu de N), pas une
déformation** : passer à N runners réels devra être une **extension** de la couture posée ici.

---

## 2. FAITS PROUVÉS par les spikes (acquis — ne reposent plus sur des suppositions)

### 2.1 Spike P0 — `stream-json` en pipes (commit `3ad0ffb`, `specs/mock/spike-l10/`)
- Le mode `claude --print --input-format stream-json --output-format stream-json --verbose` **fonctionne**
  (NDJSON typé, multi-tours sur stdin long-vécu, `{"type":"interrupt"}` = abort `exit 137`).
- **MAIS** : `stdin` doit être un **pipe**, **pas un TTY** (sinon `Error: Input must be provided…`).
  Conséquence : **plus de TUI native** → **réflexes perdus**. **C'est ce qui motive le virage.**

### 2.2 Spike L10b — TUI native + transcript JSONL (commit `b7ac879`, `specs/mock/spike-l10b/`)
> **C'est LA preuve de la cible.** Référence exécutable : `spike_l10b.py` (+ `probe_*.py`). Le
> `pty_raw.log` capté montre la TUI native rendue : box Claude Code, `⏵⏵ bypass permissions on
> (shift+tab to cycle)`, `esc to interrupt`, spinner « thinking », un `ls -1` (geste), un transcript
> résumable (`claude --resume <sid>`).

- **Auto-lancement hands-off en PTY ✓** : `pty.openpty`, `os.chdir(cwd)`, `execvpe(claude …)` →
  **réflexes natifs visibles**. **Zéro manip** : pas de `cd`, pas de taper `claude`.
- **`--session-id <uuid>` pré-généré rend le fichier de transcript DÉTERMINISTE** (pas de glob à
  deviner) — on connaît **d'avance** quel fichier tailer.
- **Le transcript est créé LIVE** (~6 s après le 1er tour) et écrit **incrémentalement** → un simple
  **`tail -f` suffit** (pas besoin d'attendre l'exit du process). Confirmé par `probe_persistence.py`
  (« FICHIER APPARU LIVE a t+… ») et `probe_graceful.py`.
- **GOTCHA DUR n°1 (bloquant si oublié) — SCRUB ENV.** Le `claude` enfant **hérite** des variables
  `CLAUDECODE=1` / `CLAUDE_CODE_*` du parent → il se croit **nested** et **n'écrit AUCUN transcript
  top-level**. **`runner_open` DOIT scrubber ces variables avant le spawn** (cf. `spike_l10b.py` l.62-71 :
  on retire `CLAUDE_CODE_*`, `CLAUDECODE`, et par prudence `CLAUDE_EFFORT`/`AI_AGENT`). **Exigence gravée.**
  *(En prod, le process Tauri n'est pas lui-même une session Claude Code, donc l'env est souvent propre ;
  mais le scrub DÉFENSIF est obligatoire — robustesse, et le cockpit peut être lancé depuis une session
  `claude` en dev.)*
- **Règle d'escaping du chemin CONFIRMÉE par observation du vrai fichier** : chemin **absolu**, chaque
  `/` **ET** `.` remplacé par `-` (ex. `/Users/sjupin/work/iaka-demo` → `-Users-sjupin-work-iaka-demo` ;
  `IakaCockpit` → `-Users-sjupin-work-IakaCockpit`). Dossier : `~/.claude/projects/<escaped>/`.
- **Schéma transcript ≠ schéma stdout `stream-json`** : **plus riche**. Chaque record porte `timestamp`,
  `uuid`/`parentUuid` (arbre **threadé**), `cwd`, `version`, `gitBranch`, `sessionId`, `userType`,
  et le `message` avec blocs `thinking` / `text` / `tool_use` / `tool_result`. Records additionnels
  observés/attendus : `system`, `attachment`, `file-history-snapshot`, `ai-title`, `last-prompt`, `mode`,
  `permission-mode`, `queue-operation`. **Le parse vit côté Rust** (D7/CSP : aucune logique de
  format/réseau dans le front).
- **Délégations** : un `tool_use` `name=="Task"` (+ records `isSidechain:true` pour le fil du sous-agent)
  matérialise une délégation. ⚠️ **NON prouvé live** : aucun sous-agent `Task` n'a été spawné pendant le
  spike (les tours testés = parole + `ls`). **À confirmer par un run dédié** avant de fermer le widget
  délégations (cf. § 9 Risques + § 10 À arbitrer).
- **Trust** : un cwd **sous un dossier trusté** hérite la confiance. Cas **non-trusté** : le spike
  auto-acceptait le dialogue (Enter) ; **en prod, la TUI étant interactive, le dialogue de confiance
  peut simplement s'afficher dans le PTY** et Stéphane répond nativement (cohérent « terminal = seul
  point de contrôle »).

---

## 3. Ce qui existe (à réutiliser/migrer — pas réinventer)

| Élément | Où | État / rôle pour L10 (cible TUI-native) |
|---|---|---|
| **PTY cross-OS + xterm typeable** | `src-tauri/src/terminal.rs` (`pty_open/write/resize/close`, events `pty://output|closed/{id}`, `validate_cwd`) · `src/components/PtyTerminal.tsx` · `src/hooks/usePty.ts` | **CŒUR RÉUTILISÉ.** Le widget Shell = la **vraie TUI** `claude` dans ce PTY. On **étend `pty_open`** pour spawner un **runner** (`claude …`) au lieu de `default_shell()` ; **tout le reste du PTY est inchangé** (output→xterm, frappe→stdin, resize, close). **`validate_cwd` (anti-évasion chapeau) conservé et appliqué au cwd du runner.** |
| **Résolution shell/login** | `src-tauri/src/shell.rs` (`default_shell`, login `-l` D10) | Modèle à suivre pour **résoudre le binaire `claude`** par OS (PATH, jamais de chemin en dur). |
| **Couture pipes `stream-json`** | `src-tauri/src/runner.rs` (`RunnerSpec`, `PermissionPolicy`, `runner_open/write/interrupt/close`, events `runner://raw|stderr|closed`) — commits `0ddebc7`/`b10b393`, **gate Legolas PASS** | **PARQUÉ « au chaud » (décision Stéphane).** **Pas la voie principale** (tue la TUI), **mais pas jeté** : code testé, conservé comme **transport `stream-json` alternatif documenté** (usages non-interactifs/programmatiques, ou runner sans TUI). Voir § 5.3. **Ne pas le brancher dans le chemin conversation.** |
| **Modèle conversation L8** | `src/hooks/useConversations.ts` (tours, agent par-tour, mode `chat|shell`) | **Migré** : `mode chat|shell` → **chat-vue ⇄ terminal-source de la MÊME session** ; `send` n'est plus `backend.chat` one-shot mais **écriture stdin PTY** (`pty_write`) ; les tours `assistant` sont peuplés par le **tailer** (pas par une valeur de retour). `ChatTurn`/`agent` par-tour **conservés**. |
| **Vue chat** | `src/components/Chat.tsx` (bulles, avatars par-tour, vignettes L9) | **Réutilisé** comme **vue filtrée**. La saisie devient l'**entrée partagée**. |
| **Roster team** | `src/components/Roster.tsx`, `src/mock/demoTeam.ts` | **Réutilisé** : personas que le chef incarne ; clic → `@agent` ; **statut « travaille/attend » dérivable du transcript** (tool_use sans tool_result = en cours). |
| **Vue Working** | `src/views/WorkingView.tsx` | **Remaniée** : toggle Chat/Shell = **deux vues d'une même session-runner**. |
| **Façade** | `src/api/backend.ts` (D7, unique `invoke`/`listen`) | **Étendue** : commande d'ouverture runner-PTY + abonnement `runner://event` (vue filtrée). **Aucun `invoke`/`listen` hors façade.** |
| **Client IA L3/L8** | `src-tauri/src/ai.rs` (`next_step`, `chat`) | **`next_step` (L3) CONSERVÉ** (moteur prochaine étape, orthogonal). **`chat` L8** : sort à clarifier (§ 5.4 + À arbitrer #3) — candidat à **devenir la « source de vues » du runner Ollama**, pas forcément à supprimer. |

---

## 4. Architecture cible du lot (couture runner = point d'abstraction net)

La couture runner est l'extension critique (PROJET § 2.3) : passer de 1 à N runners réels doit être une
**extension**, pas une réécriture. On pose donc deux abstractions complémentaires.

### 4.1 Le runner-PTY (exécution) — réutilise `terminal.rs`
- Un **`RunnerSpec`** identifie : `kind` (`claude-code` par défaut ; `shell` = repli legacy L2),
  `program`, `args`, `cwd`, `session_id`, `env_scrub`. **Résolution du binaire `claude` par OS** sur le
  modèle de `shell.rs` (PATH, jamais de chemin en dur).
- **`pty_open` étendu** (ou variante `runner_open` au-dessus du même PTY) : si `kind==claude-code`, spawn
  `claude --session-id <uuid> --model <m> [politique permissions]` avec **`current_dir = validate_cwd(cwd)`**
  et **env SCRUBBÉ** (`CLAUDE_CODE_*`, `CLAUDECODE`, …). Sinon `default_shell()` (legacy). **Le reste du
  PTY est inchangé** (output→`pty://output`, frappe→stdin, resize, close).
- **`session_id` est pré-généré côté Rust** (uuid) **avant** le spawn, **passé au runner** ET **renvoyé
  au front** : il est la clé qui relie le PTY, le transcript à tailer, et la session côté `useConversations`.

### 4.2 La « source de vues » (projection) — abstraction multi-runner
> **C'est ici que se joue le 1→N.** Une **vue** (parole/geste/délégation/activité/pensée) ne dépend PAS
> du runner : seul **d'où on lit** ces events change. On définit une **`ConversationSource`** qui émet des
> **events typés homogènes** quel que soit le runner.

| Runner | Source de vues | État |
|---|---|---|
| **Claude Code** | **Tailer du transcript JSONL** (`~/.claude/projects/<escaped>/<sid>.jsonl`), parse records → events. | **✓ PROUVÉ (L10b).** Implémenté en L10 (P2). |
| **Ollama** (local/LAN) | **Nos propres appels API** : c'est NOUS qui émettons les messages (request/response) — la source de vues est le **log de nos appels** (réemploi possible de `ai.rs chat`, reframé). **Pas de fichier à tailer.** | **Connu** (mécanique L8). Branché **hors L10** (cible) ; l'interface est posée en L10. |
| **Codex / ChatGPT** | Format de session **inconnu** : CLI **non installé** ⇒ **SPIKE REQUIS** (vérifier p.ex. `~/.codex/sessions`, schéma, écriture live). | **NON prouvé.** Spike préalable au branchement (cf. § 6 P0bis). **Hors L10.** |

- L'interface commune (à poser dès P2, même si seul Claude Code est branché) : `ConversationSource` →
  produit un flux d'events `{kind: parole|geste|delegation|activite|pensee, agent, payload, ts}`. Le
  filtre chat, le roster et (plus tard) le graph délégation consomment **ce flux**, **pas** le format
  natif du runner. **Passer à Ollama/Codex = ajouter une implémentation de `ConversationSource`**, sans
  toucher aux vues.

### 4.3 Le tailer de transcript (Claude Code) — côté Rust
- Entrée : `(session_id, cwd)`. Calcule `escaped = cwd` avec `/` **et** `.` → `-`, chemin
  `~/.claude/projects/<escaped>/<session_id>.jsonl`.
- **Attend la création** du fichier (heartbeat, ~quelques s), puis **tail live** (lecture incrémentale,
  gestion des lignes partielles : ne traiter qu'une ligne complète terminée par `\n`).
- **Parse défensif** par record (try/catch par ligne, lignes non-JSON ignorées) → mappe vers events
  typés et **émet `runner://event/{session_id}`**. **Tout le parse vit côté Rust** (D7/CSP).
- **Mapping** (cf. `spike_l10b.py` `render_block`/`handle_record`) :
  - `assistant.text` / `user.text` (record `user` saisi) → **parole** ;
  - `assistant.tool_use` → **geste** (apparié au `tool_result` par `tool_use_id`) ;
  - `tool_use name=="Task"` (+ fil `isSidechain:true`) → **délégation** (`subagent_type`, `description`) ;
  - `tool_result` (record `user`) → **activité** (fin de geste / agent au travail) ;
  - `thinking` → **pensée** (canal **masquable**, § 5 PROJET).

### 4.4 Garde-fous d'architecture (non négociables)
- **Façade unique D7** : la commande runner et l'abonnement `runner://event` passent **exclusivement**
  par `src/api/backend.ts`. **Aucun `invoke`/`listen` ailleurs.**
- **CSP stricte intacte** : aucun client réseau/format dans le front ; le tailer et le parse sont **Rust**.
- **`validate_cwd`** (anti-évasion chapeau) appliqué au cwd du runner (un runner = vecteur d'exécution).
- **Pas de god-component** : un hook dédié (`useRunnerSession` ou évolution de `useConversations`).
- **MVP d'abord** : historique en mémoire (persistance différée) ; un seul runner réel (le chef).

---

## 5. Migration depuis L8 (ce qu'on garde / remplace)

### 5.1 `useConversations` — migré, pas jeté
- « 1 conversation par projet », `ChatTurn` (`agent` figé par-tour, fix L9), historique, roster **restent**.
- `mode: "chat" | "shell"` → **`view: "chat" | "terminal"`** sur **la MÊME session-runner** (une source,
  deux surfaces).
- `send(projectId, agent, content)` **ne fait plus** `backend.chat(...)`. Il **écrit dans le PTY du
  runner** (`pty_write`, terminé par `\r` pour soumettre la TUI) **et écho dans le chat** (tour `user`).
  La réponse du chef **arrive par le tailer** (`runner://event` → tours `assistant`, agent par-tour
  préservé).

### 5.2 `Chat.tsx` / `Roster.tsx` — réutilisés
- `Chat.tsx` = vue filtrée (présentationnel inchangé ; reçoit des `ChatTurn` produits par le filtre).
- `Roster.tsx` = personas + statut **attend/travaille** dérivé du transcript (`tool_use` sans
  `tool_result` apparié = en cours).

### 5.3 `runner.rs` (pipes `stream-json`) — PARQUÉ, pas supprimé
- Décision Stéphane : **« garder au chaud »**. C'est du code **testé** (gate Legolas PASS) qui prouve le
  transport `stream-json`. **Rôle retenu** : **transport alternatif documenté** (option non-interactive /
  programmatique / futur runner sans TUI), **hors du chemin conversation principal**. **Ne pas le brancher**
  dans la vue ; **ne pas le jeter**. Une note dans son en-tête doit pointer vers ce virage (L10b).

### 5.4 `ai.rs chat` (L8) — sort à clarifier (À arbitrer #3)
- Sous la cible **Claude Code**, le chat = projection du **transcript** : `ai.rs chat` n'est **plus** le
  moteur de la conversation Claude Code.
- **MAIS** le cas **Ollama** garde des **appels API** : `ai.rs chat` est le **candidat naturel** pour être
  la **« source de vues » du runner Ollama** (§ 4.2). → **Recommandation Gandalf : ne PAS supprimer `chat`
  maintenant** ; le **reframer/parquer** comme adaptateur Ollama de `ConversationSource` (branché hors
  L10). Décision à Stéphane.
- **`next_step` (L3) — CONSERVÉ tel quel.** `NextStepPanel` reste disponible dans la vue session.

---

## 6. Phasage (la cible tenue à chaque phase)

> Lot gros → phasé. Chaque phase est livrable et **ne déforme pas** la cible. **Les spikes P0 sont FAITS.**

### P0 — SPIKES de dé-risquage — ✅ **FAITS (2026-06-26)**
- **P0-a** : `stream-json` en pipes — `3ad0ffb` (`specs/mock/spike-l10/`). Conclusion : marche **mais tue
  la TUI** → écarté comme voie principale (le code `runner.rs` est parqué, § 5.3).
- **P0-b (L10b)** : TUI native + transcript JSONL — `b7ac879` (`specs/mock/spike-l10b/`). **Verdict :
  CIBLE PROUVÉE end-to-end** (auto-lancement hands-off, transcript live, escaping, scrub env). **C'est la
  voie retenue.**

### P0bis — SPIKE Codex/ChatGPT (PRÉALABLE au runner Codex — hors étape actuelle)
- CLI **non installé** : installer/évaluer, vérifier l'existence et le schéma d'un **fichier de session**
  (p.ex. `~/.codex/sessions/...`), son écriture **live**, sa parsabilité. **Bloque uniquement** le
  branchement du runner Codex (cible) — **ne bloque pas** P1/P2 (chef = Claude Code). À programmer quand
  Stéphane prend le runner Codex.

### P1 — Couture runner-PTY + AUTO-LANCEMENT hands-off (chef = Claude Code en TUI native)
- **Étendre `terminal.rs`** : `RunnerSpec` (kind `claude-code`/`shell`) ; `pty_open` (ou `runner_open`)
  spawne `claude --session-id <uuid pré-généré> --model <m> [permissions]` avec **`current_dir =
  validate_cwd(cwd)`** et **ENV SCRUBBÉ** (`CLAUDE_CODE_*`, `CLAUDECODE`, …). Résolution `claude` par OS
  (modèle `shell.rs`). **PTY inchangé pour le reste** ; `default_shell()` reste le repli `shell`.
- **Façade `backend.ts`** : commande d'ouverture runner (renvoie le `session_id`) + helpers existants PTY.
- **`PtyTerminal`** : **inchangé sur le fond** — il rend la **TUI native** (`pty://output`), la frappe va
  au stdin. (C'est le **vrai** `claude` : `Shift+Tab`, `esc`, dialogues de permission/confiance marchent.)
- **Critère P1 (observable) :** ouvrir un projet dans Working **lance `claude` en TUI native dans son cwd**,
  **sans aucune manip** (pas de `cd`, pas de taper `claude`) ; les **réflexes natifs** fonctionnent
  (`Shift+Tab` automode, `esc`, la box) ; **un transcript apparaît** sous `~/.claude/projects/<escaped>/
  <session_id>.jsonl` (preuve du scrub env). (Settings globaux + set par défaut.)

### P2 — Tailer transcript + vues filtrées (paroles / gestes / délégations / activité) + entrée partagée
- **Tailer côté Rust** (§ 4.3) : escaping, attente création, tail live, parse défensif → events typés,
  émission `runner://event/{session_id}`. **Interface `ConversationSource`** posée (§ 4.2), implémentation
  **Claude Code** branchée (Ollama/Codex = adaptateurs futurs, non branchés).
- **Vue filtrée** : `runner://event` → `ChatTurn` (parole = `assistant.text` ; comptes-rendus **verbatim**
  attribués par badge `[ROYAUME][Agent]`) ; **gestes** et **délégations** (`Task`/`isSidechain`) captés et
  rendus (au minimum tracés ; widget délégation = MVP). **Pensée** masquable.
- **Entrée partagée** : saisie unique → écho chat (`user`) + `pty_write` (frappe + `\r`) ; `@agent`
  préfixe le texte injecté ; toggle **chat-vue ⇄ terminal-source** de la **même** session.
- **Migration** `useConversations`/`Chat` (§ 5) ; `ai.rs chat` reframé/parqué (selon #3).
- **Critère P2 (observable) :** taper dans le chat l'affiche ET pilote le chef (le transcript reflète la
  saisie) ; les **réponses et comptes-rendus verbatim** du chef remontent en bulles **attribuées** ; les
  **gestes** (et **délégations** si confirmées live, cf. risque) apparaissent ; basculer chat↔terminal
  montre la **même** session.

### P3 — Réglages globaux (set par défaut) + finitions
- Réglage **global** : runner par défaut (Claude Code) + **modèle** (clé config non sensible, réutilise
  `config_*` L0 ; keychain si une clé devient requise) + **politique de permissions** (cf. À arbitrer #2).
- Statut roster vivant dérivé du transcript ; affordance `esc` (cf. #4) ; canal **pensée** masquable ;
  doc état des lieux + backlog `CLAUDE.md`. **PER-PROJET = hors L10 (cible).**

**Différé explicite (cible, NON régressée) :** runners réels par agent / multi-runner (Ollama branché,
Codex après P0bis) ; settings per-projet ; skills→frames ; volet graph délégation/jalons. (Découpage
P1→P3 → lots L10a/L10b possible si Stéphane préfère gater plus fin — **À arbitrer #5**.)

---

## 7. Fichiers concernés (prévision — Gimli affine)

- `src-tauri/src/terminal.rs` — **étendu** : `RunnerSpec` + spawn runner (`claude --session-id … --model …`)
  au lieu de `default_shell()` quand `kind==claude-code` ; **`current_dir = validate_cwd(cwd)`** ; **ENV
  SCRUBBÉ** (`CLAUDE_CODE_*`/`CLAUDECODE`). PTY/`validate_cwd`/events `pty://*` **conservés**. `session_id`
  pré-généré renvoyé au front. *(Naming : tension possible avec `runner.rs` parqué — Gimli tranche
  `runner_open` dans `terminal.rs` vs réemploi `pty_open` étendu ; ne PAS toucher `runner.rs` parqué.)*
- `src-tauri/src/transcript.rs` *(nouveau)* — tailer JSONL : escaping path, attente création, tail live,
  parse défensif des records → events typés, émission `runner://event/{id}`. **Parse côté Rust.**
- `src-tauri/src/runner.rs` — **PARQUÉ, inchangé fonctionnellement** ; ajouter une **note d'en-tête** :
  voie `stream-json`/pipes écartée comme principale (virage L10b), conservée comme transport alternatif.
- `src-tauri/src/shell.rs` — modèle de résolution par OS réutilisé pour localiser `claude` (pas de régression).
- `src-tauri/src/lib.rs` — enregistrer la commande runner + l'état du tailer.
- `src/api/backend.ts` — commande d'ouverture runner (renvoie `session_id`) + helper `onRunnerEvent`
  (seul endroit `invoke`/`listen`).
- `src/hooks/useRunnerSession.ts` *(nouveau, ou évolution de `useConversations`)* — état session-runner,
  filtre `runner://event`→`ChatTurn`, entrée partagée. **Pas de god-component.**
- `src/components/{PtyTerminal,Chat,Roster}.tsx` — réutilisés (PtyTerminal **inchangé sur le fond** : il
  rend la TUI native).
- `src/views/WorkingView.tsx` — toggle chat-vue ⇄ terminal-source d'une même session ; affordance esc.
- `src-tauri/src/ai.rs` + `src/api/backend.ts` — `chat` L8 reframé/parqué (selon #3) ; `next_step` conservé.
- `CLAUDE.md` — entrée backlog L10 (à mettre à jour après gate).
- `specs/PROJET.md` — modèle déjà gravé § 0 (rien à changer au modèle). **À FAIRE (hors périmètre code,
  note de Gandalf)** : ajouter au **journal de décision de PROJET.md** une ligne actant le **virage**
  (P0 `stream-json` pipes → cible **TUI-native + transcript JSONL**, spike L10b `b7ac879`) — pour que la
  vision porte la trace de la décision. *(Gandalf ne touche pas PROJET.md dans ce lot.)*

---

## 8. Comportement attendu (critères observables)

- Ouvrir un projet dans Working **lance le chef-runner** (Claude Code) **en TUI native** dans le **cwd du
  projet** (sous le chapeau), **sans aucune manip humaine** ; les **réflexes natifs** marchent (`Shift+Tab`,
  `esc`, box, dialogues) ; le chef **survit** au basculement de vue.
- Un **transcript JSONL** est écrit **live** sous `~/.claude/projects/<escaped>/<session_id>.jsonl`
  (preuve du **scrub env**) ; le **tailer** en dérive les vues **sans parser l'écran ANSI**.
- La **même saisie** affiche dans le chat ET pilote le runner (stdin PTY) ; le `@agent` est respecté.
- Les **réponses et comptes-rendus verbatim** du chef remontent dans le chat en **bulles attribuées**
  (agent par-tour préservé), sans reformulation côté cockpit. Les **gestes** (et **délégations** `Task`,
  si confirmées live) sont captés.
- **Chat ⇄ terminal = une seule session** ; basculer ne perd pas l'état.
- **`esc`/interruption** se fait **nativement dans la TUI** (terminal = seul point de contrôle) ; l'IHM
  peut exposer une affordance qui envoie `esc` au PTY (cf. #4).
- **Aucune régression** des gates existants : CSP stricte intacte (parse/tailer **côté Rust**), façade
  unique D7 respectée (aucun `invoke`/`listen` hors `backend.ts`), `validate_cwd` toujours appliqué au
  runner, pas de god-component.

## 9. Vérification

- [x] Spikes P0 menés ; **virage acté par Stéphane** (P0-a `3ad0ffb` écarté ; **P0-b/L10b `b7ac879` =
      cible prouvée**).
- [ ] Typecheck OK · Lint OK (`npm run typecheck`, `npm run lint`)
- [ ] Tests front à jour et verts (`npm run test`) — filtre `runner://event`→`ChatTurn` testé (façade
      mockée) ; pas de régression `usePty`/conversations.
- [ ] Rust : `cargo fmt --check` · `cargo clippy -D warnings` · `cargo test` — `validate_cwd` couvert,
      **escaping du chemin** testé (pur, cross-OS), parse défensif du transcript testé (échantillons JSONL
      du spike L10b comme fixtures), **scrub env** vérifié, résolution binaire `claude` par OS (sans spawn
      réel, comme `shell.rs`).
- [ ] `bash scripts/quality.sh` vert.
- [ ] **Testé dans l'app réelle par Stéphane** : un vrai `claude` se lance **en TUI native** dans le cwd
      **sans manip**, réflexes natifs OK, le chat-vue se peuple depuis le transcript, `esc` interrompt.

## 10. Hors scope (cible NON régressée — différée)

- Runners réels **par agent** / multi-runner (Ollama branché hors L10, Codex après P0bis) / multi-modèle.
- Settings **per-projet** (étape actuelle = globaux + set par défaut).
- Skills **modifiables** → frames ; volet **graph de délégation / jalons** (la **trace** `Task`/`isSidechain`
  est captée en P2, mais le **volet d'édition** du graph est hors L10).
- Modes de présentation A/C au-delà de l'existant ; canaux externes.
- Branchement iakaboxlogs/3-canaux du flux runner (L4 reste lecture CouchDB ; le filtre L10 partage la
  *grammaire* de canaux mais ne réécrit pas la main courante).

---

## 11. Risques résiduels (tracés — à assumer / à lever)

- **(a) Délégations non prouvées LIVE.** `Task`/`isSidechain` est **dans le schéma** mais **aucun sous-agent
  `Task` n'a été spawné** pendant L10b. **À lever par un run dédié** (faire déléguer le chef) **avant de
  fermer** le widget délégations en P2. **Bloquant pour le widget délégation seulement**, pas pour P1.
- **(b) Latence transcript.** ~6 s avant la 1ʳᵉ écriture observée → l'IHM doit gérer le **délai** (état
  « en cours », pas de bulle figée). Le `tail` doit gérer **lignes partielles** et **flush tardif**.
- **(c) Scrub env incomplet.** Si une variable `CLAUDE_CODE_*` est oubliée → **aucun transcript**. **Scrub
  large + test de présence du fichier** en garde-fou (cf. critère P1).
- **(d) Stabilité du schéma transcript.** Format **interne** non documenté/contractuel → parse **défensif**
  (records inconnus ignorés, jamais de panique), fixtures issues du spike, tolérance aux nouveaux types de
  records.
- **(e) Coût/quota réels** (le chef = vrai modèle) → renforce le réglage **modèle global** (P3) ; afficher
  l'état si le runner signale une limite (la TUI le montre nativement de toute façon).
- **(f) Cas non-trusté** : en prod la TUI **affiche** le dialogue de confiance (interactif) — vérifier que
  ça ne **bloque pas** silencieusement l'auto-lancement (l'utilisateur répond dans le PTY).

## 12. À ARBITRER (revient à Stéphane — gate)

1. **Délégations** : fermer le **widget délégation** en P2 (sous réserve du run de confirmation, risque (a))
   ou le **différer** (capter/tracer seulement en P2, widget plus tard) ? — **OUVERT.**
2. **Politique de permissions du chef-runner** : trois options —
   (i) **laisser le prompt de permission remonter DANS la TUI** (le plus cohérent avec « terminal = seul
   point de contrôle », et possible car la TUI est interactive — **reco Gandalf**) ;
   (ii) `--permission-mode`/allowlist explicite (`--allowedTools`) sans bypass ;
   (iii) `--dangerously-skip-permissions` (hands-off total — utilisé par le spike, **risqué** par défaut).
   Touche la sécurité. — **OUVERT.**
3. **Sort de `ai.rs chat` (L8) + Ollama** : **reframer/parquer** `chat` comme **source de vues du runner
   Ollama** (reco — pas de suppression, prépare le multi-runner) vs **supprimer** (MVP, pas de code mort)
   vs garder inerte. Clarifie aussi si le **chat Ollama** survit comme runner alternatif. — **OUVERT.**
4. **Affordance `esc`** : la TUI a **déjà** `esc` natif. Faut-il **aussi** exposer un bouton « Interrompre »
   côté vue chat (qui enverrait `esc` au PTY) — reco **oui, discret**, pour l'ergonomie chat — ou s'en
   tenir au natif ? — **OUVERT.**
5. **Sémantique `@agent`** : préfixe **verbatim** injecté au chef (reco — le chef délègue/incarne) vs
   directive traduite côté cockpit. — **OUVERT.**
6. **Granularité du gate** : un seul lot L10 (P1→P3) ou découpage **L10a (P1)** / **L10b (P2+P3)** ?
   *(spikes faits.)* — **OUVERT.**

---

## Journal de décision (le VIRAGE)

- **2026-06-26 — Spike P0-a** (`stream-json` en pipes, `specs/mock/spike-l10/`, commit `3ad0ffb`,
  `claude` v2.1.193). Conclusion : le mode `--input-format stream-json` **fonctionne** (NDJSON typé,
  multi-tours, interrupt) **mais impose `stdin` en pipe (pas un TTY)** ⇒ **plus de TUI native** ⇒
  **réflexes perdus** (`Shift+Tab`, `esc`, box). Le code `runner.rs` (commits `0ddebc7`/`b10b393`, gate
  Legolas PASS) est **conservé PARQUÉ** comme transport alternatif documenté (décision Stéphane : « garder
  au chaud »), **pas comme voie principale**.
- **2026-06-26 — Spike P0-b / L10b** (`specs/mock/spike-l10b/`, commit `b7ac879`). **VIRAGE acté par
  Stéphane** : la cible est le **runner en TUI NATIVE dans un PTY** (réflexes intacts), **vues dérivées
  du TRANSCRIPT JSONL** écrit live par Claude Code (`~/.claude/projects/<escaped>/<sid>.jsonl`), **PAS**
  du parsing d'écran ANSI. **Prouvé end-to-end** : auto-lancement hands-off (cwd + `--session-id`),
  transcript live (~6 s), escaping (`/` et `.` → `-`), **scrub env obligatoire** (`CLAUDE_CODE_*`/
  `CLAUDECODE`, sinon aucun transcript), schéma transcript riche (arbre threadé `uuid`/`parentUuid`,
  `isSidechain`, blocs `thinking/text/tool_use/tool_result`).
- **Conséquences d'architecture** : (1) **réutiliser la couture PTY** (`terminal.rs`/`PtyTerminal`/`usePty`)
  en y lançant `claude` au lieu d'un shell — PAS la couture pipes ; (2) **nouveau tailer** `transcript.rs`
  (parse **côté Rust**, CSP/D7) ; (3) abstraction **`ConversationSource`** (transcript pour Claude Code,
  appels API pour Ollama, format à spiker pour Codex) pour que 1→N runners soit une **extension** ;
  (4) `runner.rs` parqué (§ 5.3) ; (5) `ai.rs chat` L8 candidat à devenir la **source Ollama** (§ 5.4).
- **À répercuter hors code** : ligne au journal de `PROJET.md` (note § 7). Pas de modif du modèle § 0
  (la cible TUI-native + transcript **réalise** § 0.3 plus fidèlement que la voie pipes).

## Sources (faits — désormais PROUVÉS par les spikes ci-dessus)
- **Spike L10b (preuve de la cible)** : `specs/mock/spike-l10b/spike_l10b.py` + `probe_persistence.py`
  (transcript live), `probe_graceful.py`, `probe_forensic.py`, capture `pty_raw.log` (TUI native rendue).
- **Spike P0-a** : `specs/mock/spike-l10/README.md` (+ `pipe_interrupt.py`/`pty_interrupt.py`).
- Claude Code — transcript de session JSONL sous `~/.claude/projects/<cwd-escaped>/`, `--session-id`,
  `--resume`, `--model`, modes de permission : [CLI reference](https://code.claude.com/docs/en/cli-reference) ·
  [Run Claude Code programmatically](https://code.claude.com/docs/en/headless).
- Stack PTY (rappel, déjà gravé) : `portable-pty` + xterm sur Tauri 2 (PROJET § 10.5 / § 3.1).
