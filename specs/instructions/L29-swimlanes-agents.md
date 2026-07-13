# L29 — Swimlanes d'agents (arbre de délégation HORIZONTAL, variante B)

> Cadré 🟠 Aragorn (2026-07-13). Suite du chantier IHM (arbre des délégations) : la
> **variante B « Swimlanes d'agents »** du mock d'hypothèses, choisie par Stéphane. Front seul.
> Cible v0.24.0. Mock de référence : `specs/design/redesign/A/concepts/hypotheses/arbre.html`
> (carte **B**) + version aboutie `specs/design/redesign/A/concepts/app/travail.html`
> (« Carte de session · délégations »).

## 1. Besoin
Un rendu **HORIZONTAL COMPACT** des délégations : **un couloir (lane) par agent**, sur un **axe
temps** de gauche à droite, avec des **barres d'activité** par agent et des **flèches de
délégation** (agent → agent), + **ascenseur horizontal** si la session est longue. C'est la
variante B « vue d'ensemble » (montre la simultanéité), par opposition à l'arbre vertical L28.

## 2. État des lieux (données prêtes)
- **`useAgentTasks`** (`reduceAgentTasks`) → `AgentTask { id, agent, status:"running"|"done",
  ts? }` : l'agent délégué, le statut, et **le timestamp `ts`** de la délégation. Manque : le
  **ts de clôture** (à ajouter, petit).
- **`ActivityTimeline.tsx`** : rendu **SVG à axe temps horizontal scrollable** (`x(t)`, ticks,
  lignes/labels, tout le bloc scrolle) — **base à réutiliser** pour les swimlanes.
- **`DelegationTree`** (L28) = variante A (arbre vertical). **GanttPanel** (plan/tâches) reste
  débranché-gardé (`GANTT_ENABLED=false`) — donnée différente (tâches de plan, pas agents).
- `resolveAvatar`/roster pour les avatars ; coordinateur = `activeRunner.coordinator`.

## 3. Périmètre FERMÉ

### F1 — Enrichir `useAgentTasks` : ts de clôture (front)
- Ajouter à `AgentTask` un champ **`doneTs?: string`** : le `ts` de l'`activite` qui clôt la tâche
  (au passage `running → done`, dans `reduceAgentTasks`). Non destructif, tests à compléter.

### F2 — Composant `AgentSwimlanes` (présentationnel pur, calque `ActivityTimeline`)
- Nouveau `src/components/AgentSwimlanes.tsx` (SVG, aucune I/O). Props : `coordinator: string`,
  `tasks: readonly AgentTask[]`, `resolveAvatar?`.
- Rendu (calque mock B) :
  - **Un couloir par agent** (Y) : coordinateur en tête, puis les agents délégués (dédupliqués).
    Label de lane = avatar + nom.
  - **Axe temps horizontal** (X) dérivé des `ts` (min → max des délégations) ; ticks temps.
  - **Barre d'activité** par tâche dans le couloir de son agent : de `ts` (début) à `doneTs`
    (fin) ou à **« maintenant »** si `running` (barre ouverte). Couleur par statut
    (`running` ambre / `done` vert).
  - **Flèches de délégation** : du couloir **coordinateur** vers le couloir de l'agent délégué,
    à l'abscisse `ts` de la délégation (pointillé accent, calque mock). **MVP = 1 niveau**
    (coordinateur → délégué) ; sous-délégations imbriquées (parent réel) = **différé** (AR-2).
  - **Ascenseur horizontal** : tout le bloc scrolle en X (calque `ActivityTimeline`, `overflow-x`),
    **hauteur bornée compacte**. Vide → placeholder honnête.
- **Zéro fausse donnée** : pas d'estimation inventée ; barre « ouverte » si pas de `doneTs`.

### F3 — Travail : toggle « Arbre » (vertical L28) ↔ « Couloirs » (horizontal B)
- Dans `WorkingView`, le bandeau délégations propose **deux rendus** commutables : le
  `DelegationTree` (L28, vertical) **et** `AgentSwimlanes` (L29, horizontal). Un petit **toggle**
  (« Arbre » / « Couloirs », i18n) dans/à côté du bouton de bandeau ; défaut = **Couloirs**
  (variante B demandée) ou dernier choix (MVP : état local, défaut Couloirs).
- Les deux composants sont alimentés par les **mêmes** `tasks` + `coordinator`.

## 4. Gardes (non négociables)
- Front seul ; **Rust non touché** (données déjà dérivées ; enrichissement `useAgentTasks` = front).
- Présentationnel D8 (`AgentSwimlanes` pur), façade non concernée, CSP intacte, **i18n parité
  fr/en**, pas de god-component. **On-brand** (couleurs/grammaire du mock B, direction A).
- **Débrancher-garder** : ne pas supprimer `DelegationTree` (L28) ni `GanttPanel` ; on **ajoute**
  le mode Couloirs et un toggle.
- **Zéro fausse donnée** (barre ouverte si fin inconnue ; flèches 1 niveau honnêtes).

## 5. Critères d'acceptation
1. `AgentSwimlanes` affiche **un couloir par agent** (coordinateur + délégués), un **axe temps
   horizontal**, des **barres** colorées par statut (running ambre / done vert) et des **flèches
   de délégation** coordinateur → délégué ; **scroll horizontal** ; vide → placeholder.
2. `useAgentTasks` expose `doneTs` (ts de clôture) sans régresser `running`/`done`.
3. **Travail** : toggle « Arbre / Couloirs » commute entre `DelegationTree` (L28) et
   `AgentSwimlanes` ; les deux lisent les mêmes délégations. `DelegationTree` et `GanttPanel`
   restent dans le code.
4. `npm run typecheck` + `lint` + `test` verts ; Rust non modifié. Tests : `AgentSwimlanes`
   (couloirs/barres/flèches/vide), `reduceAgentTasks` (`doneTs`), toggle Travail.

## 5bis — Révision recette (2026-07-13, retour terrain Stéphane)
Trois ajustements sur `AgentSwimlanes` (front seul) :
- **R1 — Labels d'agents FIXES** : la **colonne de gauche** (avatar + nom de chaque couloir) doit
  **rester visible** quand on défile horizontalement (colonne gelée / sticky). → Restructurer :
  une **colonne de labels hors du conteneur `overflow-x`** + une **zone scrollable** (axe temps +
  barres) alignée en Y sur les mêmes couloirs (patron « 1ʳᵉ colonne figée » d'un Gantt). Les deux
  restent parfaitement alignés verticalement.
- **R2 — Repères d'heure toujours lisibles** : **jamais** de portion visible **sans indication
  d'heure**. → Ajouter des **lignes de repère verticales** (gridlines) qui traversent les couloirs
  à chaque tick, avec **labels d'heure** ; densité de ticks **adaptée au zoom** pour qu'aucun
  intervalle affiché à l'écran ne soit sans repère. (L'axe reste aligné avec les barres — il
  scrolle avec elles.)
- **R3 — Zoom sur l'axe du temps** : ajouter **deux boutons `+` / `−`** (dans l'en-tête du bandeau
  swimlanes) qui **zooment l'axe temps** (change l'échelle px/minute, état local, borné min/max).
  Le zoom recalcule largeur, barres, flèches et densité des ticks. `title`/`aria-label` i18n.

Gardes inchangées (front seul, présentationnel D8, zéro fausse donnée, i18n parité). Tests :
labels présents hors zone scrollable, ticks/gridlines présents, boutons +/- changent l'échelle.

## 6. Différés / hors-lot
- **Sous-délégations imbriquées** (flèches multi-niveaux via parent réel `parentUuid`/`isSidechain`)
  — MVP = 1 niveau coordinateur → délégué.
- Prévisionnel/baseline/cascade (features du Gantt L20) — hors B « vue d'ensemble ».
- Swimlanes dans le **Journal** (L28 y met déjà l'arbre) — éventuel P2.

## 7. Arbitrages (recommandations — à valider par Stéphane)
- **AR-1** — Cible = variante **B « Swimlanes d'agents »** (couloir par agent + axe temps +
  flèches de délégation). *(confirmé par Stéphane.)*
- **AR-2** — Flèches de délégation **MVP 1 niveau** (coordinateur → délégué) ; imbriqué différé.
- **AR-3** — Barre : `ts` → `doneTs` (fin) ou « maintenant » si `running` (barre ouverte).
- **AR-4** — **Coexistence** arbre L28 (vertical) + swimlanes L29 (horizontal) via **toggle**,
  défaut Couloirs.
