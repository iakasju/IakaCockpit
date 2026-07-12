# L24 — Onglets par projet + fenêtres de travail toujours ouvertes (vue Travail)

> Cadré 🟠 Aragorn (2026-07-12), arbitrages AR-1..2 tranchés par Stéphane. Front seul.
> Cible : version **v0.18.0** (après le seal v0.17.0).

## 1. Besoin
Sur la vue **Travail**, **tous les projets posés sur la Table gardent leur fenêtre de travail
ouverte** (runner/PTY + conversation vivants en parallèle). Un **système d'onglets par nom de
projet** permet de switcher entre eux ; chaque onglet conserve son **toggle Shell ↔ Conversation**.

## 2. État des lieux (code réel — la fondation existe à moitié)
- `WorkingView.tsx` **monte déjà un `PtyTerminal` par conversation** (`conversations.map`, ~l.443) :
  chaque runner reste **vivant en arrière-plan**, seul l'actif est visible (`visible = c.projectId
  === active.projectId && c.mode === "shell"`). Garde L10 : jamais démonté (sinon `pty.close` tue
  le process). **Donc le multi-fenêtres persistant est déjà en place** — pour les conversations
  **ouvertes**.
- **Manque n°1** : une conversation n'est ouverte qu'**à la demande** (`openProject` au clic
  worklist). Un projet sur la Table **sans** conversation ouverte n'a donc pas de fenêtre.
- **Manque n°2** : le **switcher** actuel = la **worklist** gauche (`.workitem` → `onOpenProject`
  → `setActive`). Pas de **barre d'onglets** par projet.
- `useConversations` : `openConversation(projectId,…)`, `setActive(projectId)`, `closeConversation`
  (L23-inc), `active`. `App` : `workset` (set de Work), `openProject` (gère popup TeamPicker si
  non lié + ouvre la conversation), `removeFromWorkAndPrepare` (retrait Table → ferme PTY+conv).

## 3. Périmètre FERMÉ

### F1 — Ouverture EAGER des fenêtres (AR-2)
- **Dès qu'un projet est posé sur la Table** (`workset.add`/`toggle` vers présent), **ouvrir
  automatiquement sa conversation** (donc son runner/PTY), sans attendre un clic.
- Orchestration dans **`App`** (là où vivent `workset` + `conversations`) : un effet réconcilie
  **`workset.ids` → conversations ouvertes** — pour chaque projet du workset **sans** conversation,
  appeler `openProject(project)` (réutilise l'existant). Idempotent : ne ré-ouvre pas une
  conversation déjà ouverte ; ne rouvre pas une conversation fermée par un retrait en cours de tour.
- **Projets non liés à une team** : `openProject` déclenche le popup `TeamPicker`. Pour éviter que
  l'ouverture eager n'empile N popups, **n'auto-ouvrir que les projets déjà liés** (`teams.hasBinding`)
  ; un projet non lié **a quand même son onglet**, mais sa fenêtre reste en attente et n'ouvre le
  picker qu'**au clic** sur son onglet (comportement `openProject` actuel). *(AR-3 implicite, reco ;
  évite le blocage multi-popup — à confirmer si Stéphane veut au contraire lier d'office.)*
- Réconcilier le **seed démo** (`useDemoSeed`) : garder l'ouverture de la conversation d'`iaka-demo`
  (déjà le cas) ; la logique eager d'App couvre le cas général sans double-ouverture.

### F2 — Barre d'onglets par projet
- Ajouter une **barre d'onglets** en tête de la zone conversation (au-dessus de `.convhead`), **un
  onglet par conversation ouverte** (= par projet de la Table ayant une fenêtre), libellé = **nom du
  projet** (`conversation.title`).
- **Onglet actif** mis en évidence (`active.projectId`). Clic sur un onglet → `setActive(projectId)`
  (même effet que cliquer l'item worklist). L'onglet actif et l'item worklist actif restent
  **synchronisés** (même source `active`).
- Chaque onglet porte un **« x » de fermeture** → `onRemoveFromWork(projectId)` (L23-inc : ferme
  PTY + conversation, retire de la Table, lance le job de reprise). Cohérent avec le − de la worklist.
- Composant **présentationnel** dédié (ex. `ProjectTabs`) alimenté par `conversations` + `active` +
  callbacks (`onSelect`, `onClose`) — pas d'I/O, pas de god-component.
- Ordre des onglets = ordre stable (ordre du workset / d'ouverture).

### F3 — Toggle Shell/Conversation par onglet (déjà là, à préserver)
- Le toggle `chat|shell` est **déjà par conversation** (`conversation.mode`, `onSetMode`). Chaque
  onglet garde **son propre mode**. Ne rien casser : le `PtyTerminal` de chaque projet **survit** au
  switch d'onglet ET au toggle (garde L10 / R-L8-1 intacte).

### Coexistence worklist + onglets (AR-1)
- **Garder la worklist gauche** (add via `+`, retrait via `−`, statut git, zone de reprise
  débranchée). Les onglets s'**ajoutent** en tête de la zone conversation. Les deux pilotent le même
  `active` (switch cohérent). Aucun des deux n'est retiré.

## 4. Gardes (non négociables)
- **Garde L10 / R-L8-1** : un `PtyTerminal` n'est JAMAIS démonté au switch d'onglet / au toggle
  (sinon le runner est tué). La fermeture n'a lieu **qu'au retrait explicite** (x onglet / − worklist).
- **Façade unique D7** : aucun `invoke` nouveau ; réutilise `openProject`/`setActive`/
  `removeFromWorkAndPrepare`/`onSetMode` existants. **Rust NON touché.**
- **Présentationnel pur D8** : `WorkingView` + `ProjectTabs` sans I/O.
- **CSP intacte**, **i18n parité fr/en** pour tout libellé nouveau (aria onglets, fermer),
  pas de god-component.
- **Exécution honnête (L11)** : un onglet dont le runner n'est pas exécutable (ollama/litellm/codex
  non câblé) garde la **bannière** existante, pas de faux PTY.

## 5. Critères d'acceptation (vérifiables)
1. Poser un 2ᵉ (et 3ᵉ…) projet **lié** sur la Table ouvre **automatiquement** sa fenêtre : un onglet
   apparaît et son runner/PTY est monté (vivant en arrière-plan) sans clic.
2. Une **barre d'onglets** liste un onglet par projet de la Table (nom du projet) ; l'onglet actif est
   mis en évidence ; cliquer un onglet bascule l'`active` (et met à jour le contenu Shell/Chat de CE
   projet). Worklist et onglets restent synchronisés.
3. Le **« x »** d'un onglet retire le projet de la Table, **ferme son PTY + sa conversation** (L23-inc)
   et fait disparaître l'onglet ; l'`active` bascule proprement (autre onglet ou vide).
4. **Switcher d'onglet ne tue aucun runner** : revenir sur un onglet retrouve son shell **vivant**
   (historique/PTY conservés) ; le mode Shell/Chat de chaque onglet est **indépendant** et persistant.
5. Un projet **non lié** a un onglet mais ouvre le `TeamPicker` au clic (pas d'empilement de popups à
   l'ouverture eager).
6. `npm run typecheck` + `lint` + `test` verts ; **Rust non modifié**. Tests front : ouverture eager
   (workset→conversations), rendu/refactor des onglets (sélection, fermeture appelle le bon callback),
   non-régression du multi-mount PTY.

## 6. Différés / hors-lot
- Réordonnancement des onglets par glisser-déposer.
- Limite/mise en garde si trop de runners simultanés (perf) — **noté** : l'ouverture eager peut lancer
  N runners `claude-code` réels ; acceptable par décision Stéphane, à surveiller.
- Bouton « + » d'ajout de projet **dans** la barre d'onglets (l'add reste sur la worklist en MVP).

## 7. Arbitrages tranchés (Stéphane, 2026-07-12)
- **AR-1** — Onglets **et** worklist **coexistent** (worklist gardée, onglets ajoutés).
- **AR-2** — Ouverture **eager** : la fenêtre s'ouvre **à la pose sur la Table** (tous les runners
  liés vivants d'emblée).
- **AR-3** *(reco, à confirmer)* — Ouverture eager **limitée aux projets déjà liés** à une team ; un
  projet non lié a son onglet mais n'ouvre le `TeamPicker` qu'au clic (anti-empilement de popups).
