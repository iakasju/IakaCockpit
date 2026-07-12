# L25 — S'attacher à la session vivante d'un projet (vue live du transcript)

> Cadré 🟠 Aragorn (2026-07-12), décision Stéphane = « s'attacher à la session vivante (vue
> live) ». Sert la **vision gravée** `PROJET.md §0` (le terminal possède la conversation ; le
> chat = vue du transcript). Rust + front.

## 1. Besoin
Ouvrir un projet déjà **en cours de travail ailleurs** (ex. une session `claude` dans le
terminal de Stéphane) doit afficher **cette conversation en direct** dans le cockpit — et non
démarrer une session vierge. « Voir notre conversation en cours ».

## 2. Constat (code réel)
- `pty_runner_open` (`terminal.rs`) **pré-génère un nouveau `session_id`** et lance un `claude`
  **neuf** → le tailer lit `~/.claude/projects/<escaped>/<nouveau-sid>.jsonl`, **vierge**. Il ne
  regarde que les sessions **lancées par le cockpit**.
- Or les sessions externes existent sur disque : `~/.claude/projects/<escaped>/*.jsonl`
  (une par session, la plus récemment modifiée = la **vivante**).
- **Fondation déjà là** : `runner_tail_start(session_id, transcript_path)` (`transcript.rs`,
  L10b) **tail un fichier SANS PTY** → on peut afficher une session **sans lancer de runner**.
  Le mapping paroles/gestes/délégations (`runner://event`) est réutilisé tel quel.

## 3. Concept : conversation « attachée » (vue seule) vs « propre » (runner)
Le modèle actuel = 1 conversation = 1 **runner propre** (PTY) + tail de SON transcript. On
ajoute un **mode « attaché »** : conversation qui **tail un transcript EXISTANT** (session
externe), **sans PTY propre**. Deux modes coexistent, portés par la conversation :
- **owned** (actuel) : PTY lancé (`pty_runner_open`), Shell typable, Chat = vue du transcript.
- **attached** (nouveau) : **pas de PTY**, Chat = **vue LIVE** du transcript externe ;
  **lecture seule** (on ne peut pas taper dans un process qui tourne déjà ailleurs).

## 4. Périmètre FERMÉ

### F1 — Détection de la session vivante (Rust, `transcript.rs` ou `terminal.rs`)
- Nouvelle commande façade **`latest_transcript(cwd: String) -> Option<LatestTranscript>`**
  (`{ session_id, path, mtime_epoch }`) : compose `~/.claude/projects/<escaped>/` (réutiliser
  l'échappement de cwd existant), scanne les `*.jsonl`, renvoie le **plus récemment modifié**
  (ou `None` si aucun). Réutilise `pathguard`/la logique d'échappement existante ; aucun I/O
  réseau. Miroir TS + type dans `backend.ts` (façade unique D7).

### F2 — Ouverture en mode attaché (front)
- À l'ouverture d'un projet (clic worklist/onglet **et** ouverture eager L24), l'orchestration
  (`App.openProject`) appelle d'abord `latest_transcript(cwd)` :
  - **si un transcript existe** → ouvrir la conversation en **mode `attached`** : démarrer le
    tailer sur ce `transcript_path` (`runner_tail_start`), **sans** `pty_runner_open`. Le Chat
    affiche la conversation **en direct**.
  - **sinon** (aucune session) → comportement **actuel** : `pty_runner_open` (mode `owned`).
- `useConversations` / `Conversation` : ajouter un champ **`mode`-de-source** (ex.
  `source: "owned" | "attached"`, distinct du toggle `mode: chat|shell`) + le `transcript`/
  `session_id` attaché. Le montage du tailer se fait pour les deux sources ; le montage du
  **PtyTerminal** ne se fait que pour `owned` (attached = pas de PTY).

### F3 — UI d'une conversation attachée (`WorkingView`)
- **Chat** : identique (vue live du transcript). Un **badge « session vivante · lecture seule »**
  (i18n) dans la `convhead`.
- **Saisie Chat désactivée** en mode attaché (view-only) + **bouton « démarrer un runner du
  cockpit »** qui bascule la conversation en `owned` (spawn `pty_runner_open`, nouvelle session)
  → pour interagir. (Le terminal externe reste l'autre voie.)
- **Shell** : en mode attaché, pas de PTY → afficher une **bannière** « session externe, pas de
  shell typable ici » + même bouton « démarrer un runner ». Réutilise le patron bannière L11.
- L'onglet (L24) d'une conversation attachée est un onglet normal (nom du projet) ; son « × »
  ferme la vue (arrête le tailer, pas de `pty.close` puisque pas de PTY propre).

## 5. Gardes (non négociables)
- **Garde L10** : ne pas régresser le multi-mount `owned`. Un tailer attaché **n'ouvre aucun
  PTY** (pas de `pty_runner_open`), donc pas de process externe tué à la fermeture (juste
  `runner_tail_stop`).
- **Lecture seule stricte** en attaché : **aucune écriture** vers la session externe (pas de
  `pty_write`), zéro risque de conflit à deux process sur une session.
- **Façade unique D7** : une seule nouvelle commande (`latest_transcript`) ; le tail réutilise
  `runner_tail_start` existant. Réutiliser l'échappement cwd Rust existant (pas de constante
  chemin en dur, cross-OS, socle L0).
- Présentationnel D8, CSP intacte, **i18n parité fr/en**, exécution honnête (bannière).

## 6. Critères d'acceptation
1. Ouvrir un projet ayant une session récente sur disque affiche **sa conversation en direct**
   dans le Chat (les nouveaux tours apparaissent live) — **sans** lancer de nouveau `claude`.
   *(Recette : ouvrir `IakaCockpit` pendant que cette session tourne → on voit la conversation.)*
2. `latest_transcript(cwd)` renvoie le `*.jsonl` le plus récent du dossier de sessions du cwd,
   `None` si aucun. *(test Rust : tempdir avec plusieurs fichiers → le bon ; vide → None.)*
3. Ouvrir un projet **sans** session existante conserve le comportement actuel (spawn runner
   `owned`).
4. En mode attaché : **saisie Chat désactivée**, badge « lecture seule », **Shell** = bannière ;
   le bouton « démarrer un runner » bascule en `owned` (spawn) et rend l'interaction.
5. Fermer l'onglet d'une conversation attachée **arrête le tailer** sans toucher à un PTY (aucun
   process externe affecté).
6. `npm run typecheck` + `lint` + `test` verts ; `cargo test` vert (F1). Rust confiné à la
   détection de transcript (pas de refactor du tailer).

## 7. Différés / hors-lot
- Reprise **typable** d'une session (`claude --resume`) dans un runner propre du cockpit
  (au-delà du « démarrer un runner » neuf) — piste P2.
- Choix manuel parmi plusieurs sessions (sélecteur) — écarté ici (option « sélecteur » non
  retenue ; on attache à la **plus récente**).
- Seuil de « fraîcheur » (n'attacher que si modifié < X min) — MVP : attacher à la plus récente
  quelle qu'en soit l'ancienneté ; affiner si besoin.

## 8. Arbitrages (Stéphane 2026-07-12 + reco à confirmer)
- **AR-1** — Comportement à l'ouverture = **s'attacher à la session vivante** (plus récente),
  sinon spawn (tranché).
- **AR-2** *(reco)* — Attaché = **lecture seule** ; pour interagir, bouton « démarrer un runner »
  (spawn owned, nouvelle session) OU le terminal. *(à confirmer : veux-tu plutôt tenter un
  `--resume` typable plus tard ?)*
- **AR-3** *(reco)* — On attache à la **plus récente** sans seuil d'ancienneté en MVP.
