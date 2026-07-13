# L28 — Arbre des délégations (remplace le Gantt) — Travail + Journal

> Cadré 🟠 Aragorn (2026-07-13). Chantier IHM (B), 2ᵉ moitié du cap
> `ihm-gantt-vers-arbre-delegations`. Front seul. Cible v0.23.0.

## 1. Besoin
Remplacer le **Gantt** (jugé trop complexe) par un **arbre des délégations coloré par avancement**
(coordinateur → agents délégués), en vue **Travail** et **Journal**.

## 2. État des lieux (code réel)
- **Données délégations prêtes** : `useAgentTasks` (`reduceAgentTasks`) dérive du transcript une
  liste `AgentTask[] { id: tool_use_id, agent (subagent_type), status: "running"|"done" }` — une
  délégation (`kind:"delegation"`) ouvre `running` (clé `tool_use_id`), l'`activite` du même
  `tool_use_id` la passe `done`. Déjà alimente le panneau « Tâches en cours ».
- **Gantt** : `WorkingView` — bouton convhead « Gantt » (`showGantt`, défaut ouvert) + bandeau
  central `GanttPanel` (données `timeline: PlanTimeline` de `derivePlanTimeline`). Le **Journal**
  (`JournalView` → `MainCourante`) n'a **pas** de Gantt.
- Résolveur d'avatars par agent dispo (`resolveAvatar`, roster).
- Feed Journal (L4, `MainCourante`/`useMainCourante`) : événements 3-canaux ; le canal **geste**
  porte les délégations machine (L5).

## 3. Périmètre FERMÉ

### F1 — Composant présentationnel `DelegationTree`
- Nouveau `src/components/DelegationTree.tsx` (pur, aucune I/O ; reçoit ses données en props).
- Rendu : **racine = coordinateur** (nom + avatar, nœud « actif ») → **enfants = agents délégués**
  (depuis les tâches), **coloré par avancement** : `running` = ambre/en cours, `done` = vert.
  Avatar/pastille par agent (`resolveAvatar`). Compteur (N délégations, N en cours).
- **MVP : 1 niveau** (coordinateur → délégués). **Sous-délégations imbriquées = différé** (nécessite
  le lien parent, non tracé par `useAgentTasks` aujourd'hui — cf. § 6).
- Vide → placeholder honnête (« aucune délégation »).
- i18n parité fr/en pour les libellés (titre, statuts, vide).

### F2 — Travail : l'arbre REMPLACE le bandeau Gantt
- Dans `WorkingView`, remplacer le bandeau Gantt par `DelegationTree` alimenté par les
  **délégations de la conversation active** (`tasks` / `useAgentTasks`, déjà passées en prop
  `tasks`). Le coordinateur = `activeRunner.coordinator`.
- Le bouton convhead « Gantt » devient « **Arbre** » (ou « Délégations »), pilotant l'affichage de
  l'arbre (défaut ouvert).
- **GanttPanel DÉBRANCHÉ-GARDÉ** (règle « débrancher, garder ») : `GanttPanel`, `derivePlanTimeline`,
  la prop `timeline` restent dans le code, **non affichés** (import/route conservés pour éviter
  l'unused, ou commentés proprement). Aucune suppression.

### F3 — Journal : arbre des délégations du projet
- Dans `JournalView`/`MainCourante`, ajouter le `DelegationTree` des délégations, **dérivé de la
  main courante** (événements du **canal geste** = délégations L5 ; agent = émetteur, statut selon
  la présence d'un rapport/retour si disponible, sinon `running` par défaut).
- Un petit **hook dérivé pur** `deriveDelegationsFromFeed(events)` → `AgentTask[]`-compatible pour
  réutiliser le même `DelegationTree`. Scope au projet filtré du Journal (filtre projet existant).
- **Si la dérivation feed→délégations n'est pas fiable** (statut done non déductible du feed) :
  livrer un arbre **best-effort** (tous `running`/« vus ») et tracer le raffinement en différé —
  NE PAS inventer de statut (zéro fausse donnée).

## 4. Gardes (non négociables)
- Front seul ; **Rust non touché** (données déjà dérivées : transcript via `useAgentTasks`,
  feed via `useMainCourante`). Présentationnel D8 (`DelegationTree` pur). Façade unique non
  concernée. CSP intacte, i18n parité fr/en, pas de god-component.
- **Débrancher-garder le Gantt** (jamais supprimer `GanttPanel`/`derivePlanTimeline`).
- **Zéro fausse donnée** : statut `done` seulement s'il est réellement déductible ; sinon `running`
  ou « vu », jamais un faux « terminé ».

## 5. Critères d'acceptation
1. Un composant `DelegationTree` affiche coordinateur → agents délégués, chaque nœud **coloré**
   selon `running` (ambre) / `done` (vert), avec avatar/pastille ; vide → placeholder.
2. **Travail** : le bandeau Gantt est remplacé par l'arbre (bouton convhead « Arbre »), alimenté
   par les délégations de la conversation active ; **le Gantt reste dans le code** (débranché).
3. **Journal** : l'arbre des délégations du projet apparaît, dérivé du feed (canal geste), sans
   fausse donnée de statut.
4. `npm run typecheck` + `lint` + `test` verts ; Rust non modifié. Tests : `DelegationTree` (rendu
   racine→enfants, couleur par statut, vide), dérivation feed→délégations (Journal).

## 6. Différés / hors-lot
- **Sous-délégations imbriquées** (arbre multi-niveaux) — nécessite le lien parent
  (`parentUuid`/`isSidechain`) dans `useAgentTasks` ; MVP = 1 niveau.
- Filtres de canaux au-dessus du chat = **L27 (livré)**.
- Statut `done` fin dans le Journal si le feed ne le porte pas (raffinement).
- Le Gantt reste disponible en code (réactivable) mais non affiché.

## 7. Arbitrages (recommandations — à valider par Stéphane)
- **AR-1** — L'arbre **remplace** le Gantt (Gantt débranché-gardé). *(conforme au cap gravé.)*
- **AR-2** — MVP **1 niveau** (coordinateur → délégués) ; imbrication différée.
- **AR-3** — **Travail + Journal** dans ce lot ; Journal en **best-effort** si le statut `done` n'est
  pas déductible du feed (pas de fausse donnée).
