# L37 — Persistance de la Table (le « set de Work » survit au redémarrage)

> Cadré 🔵 Gandalf (2026-09-04), sur le constat terrain du décideur du 2026-08-23 (entrée L37 du
> backlog). Front + **une clé de config non sensible**. Aucune commande Rust nouvelle.
> **Six arbitrages (AR-1..AR-6) TRANCHÉS par Stéphane le 2026-09-04 : « tout reco »** —
> AR-1 = (c), AR-2 = (a), AR-3 = (a), AR-4 = (a), AR-5 = (a), AR-6 = (a). Gate P1 franchi ;
> le § 5 conserve les options écartées pour mémoire.

---

## 1. Besoin

À chaque relance de l'application, la **Table** revient **vide** : il faut re-poser ses projets à
la main. Or la Table est devenue le lieu de travail quotidien (L24 onglets par projet, L25 session
vivante, L26 focus plein écran). Le geste « poser sur la table » doit survivre au redémarrage.

**Ce n'est pas une régression.** `src/hooks/useWorkset.ts:1-7` le dit lui-même : le hook est un
état front pur, et « la persistance backend (`configSet("workset", …)`) est un PLUS non bloquant
(PO-2) — **non implémentée** en L2 pour rester MVP ». Le comportement actuel est **conforme au
cadrage d'origine** ; c'est l'usage qui a changé d'avis.

---

## 2. Ce qui existe (constat de LECTURE, chaque point vérifié dans le code)

| Élément | Où | État |
|---|---|---|
| Set de Work | `src/hooks/useWorkset.ts:19` — `useState<Set<string>>(() => new Set())` | **front pur**, zéro I/O, trois mutateurs : `toggle`, `add`, `has` |
| Modèle de persistance à réutiliser | `src/hooks/useSettings.ts:339-409` (lecture au montage) + `:419-433` (écriture **dans le mutateur**, pas dans un effet) | implémenté, éprouvé |
| Façade config | `src/api/backend.ts:724` (`configGet`) et `:729` (`configSet`) | implémenté — **aucune commande Rust à ajouter** |
| Précédent « tableau JSON en config » | `src-tauri/src/config.rs:23` (`KEY_EXTRA_PROJECTS`) + `src-tauri/src/portfolio.rs:333-347` (`read_extra_paths`, parse **tolérant** : JSON corrompu → liste vide) | implémenté, avec son test (`portfolio.rs:470-475`) |
| Garde des clés sensibles | `src-tauri/src/config.rs:160-167` — `is_secret` = sous-chaîne `token\|key\|secret\|password`, avec **exemption explicite** du préfixe `project_team:` | implémenté ; incident L11 (commit `50f410a`) documenté en commentaire `config.rs:148-159` |
| Ouverture eager | `src/App.tsx:532-539` + `src/app/reconcileEagerOpen.ts:26-30` | implémenté — ouvre tout projet **lié** de la Table **sans conversation** |
| Chemin d'ouverture | `src/App.tsx:468-505` (`openConversationFor`) | il **se termine par `grid.setActiveView("working")`** — ouvrir **navigue** |
| Vue par défaut | `src/hooks/useGridState.ts:33` — `useState<ViewId>("portfolio")` | non persistée |
| Montage des PTY | `src/App.tsx:788` (`activeView === "working" && <WorkingView …>`) puis `src/views/WorkingView.tsx:626-708` | un `PtyTerminal` **par conversation `owned`**, monté même masqué — **mais seulement si la vue Travail est rendue** |
| Conversation attachée (L25) | `src/views/WorkingView.tsx:632-655` | `source === "attached"` → **aucun PTY** (bannière) |
| Seed démo | `src/hooks/useDemoSeed.ts:189` (`addWorkRef.current?.(DEMO_PROJECT_ID)`), branché `src/App.tsx:191` | dev seulement (`seeded:true`), **asynchrone**, idempotent |
| Retrait de la Table | `src/App.tsx:633-667` → `src/app/removeFromWork.ts:70-96` | appelle `toggleWork` (= `workset.toggle`) puis ferme PTY/tailer + conversation |
| Dérivation « projets de la Table » | `src/App.tsx:208-211` — `portfolio.projects.filter(p => workset.ids.has(p.id))` | **intersection** : un id sans projet ne produit rien |
| Identité d'un projet | `src-tauri/src/portfolio.rs:222-225` — `id` = **nom du dossier** | même espace de noms que les liaisons `project_team:<id>`, qui **persistent déjà** |
| Tests existants | `src/__tests__/useWorkset.test.ts` (4 tests, tous sur l'état pur), `src/__tests__/reconcileEagerOpen.test.ts` (5 tests, fonction pure) | à étendre, pas à réécrire |
| StrictMode | `src/main.tsx:20-22` — `<React.StrictMode>` **actif** | les effets sont montés/démontés/remontés une fois de plus en dev ([react.dev](https://react.dev/reference/react/StrictMode)) ; le dépôt a déjà payé ce piège (double-spawn PTY, L10b, garde `spawnRef`) |

### 2.1 Trois faits qui **contredisent ou précisent** le périmètre pressenti du backlog

1. **« Projets disparus à ignorer silencieusement » est DÉJÀ le comportement, par construction.**
   `worksetProjects` est une **intersection** (`App.tsx:209`) : un id persisté sans projet
   correspondant ne produit ni tuile, ni onglet, ni conversation, donc **aucun onglet mort** — sans
   qu'aucune ligne de code ne soit écrite pour ça. Ce qui reste à décider n'est pas « ignorer »
   (acquis) mais « **purger ou non** » l'id de la config (AR-4) — et purger est un **piège**, cf. R-3.
2. **« Poser N projets au démarrage = spawner N runners » est INEXACT tel quel.** Le
   `PtyTerminal` n'est monté que si `WorkingView` est rendu, donc **seulement si la vue active est
   `working`** (`App.tsx:788`). Restaurer le set **sans naviguer** ne spawne **rien** tant que
   l'utilisateur ne va pas sur Travail. De plus, une conversation **`attached`** (L25) n'ouvre
   **aucun PTY** (`WorkingView.tsx:632`) : le coût réel dépend de l'existence d'une session externe
   par projet. La vraie question n'est donc pas « combien de runners » mais « **le démarrage
   a-t-il le droit de voler la navigation ?** » (AR-1).
3. **Le risque de la restauration n'est pas la lecture, c'est l'ÉCRITURE.** Persister par un
   `useEffect` sur `ids` — la forme la plus naturelle — écrit le **set vide initial** avant que la
   lecture asynchrone n'ait répondu, et **efface la valeur persistée**. Sous StrictMode (actif,
   `main.tsx:20`) l'effet est en plus rejoué. C'est le défaut central de ce lot ; il est traité en
   AR-5 et gardé par CA-4.

---

## 3. Décision proposée

Rendre `useWorkset` **persistant**, en **calquant `useSettings`** — et surtout **pas** en
réinventant :

- **lecture au montage** via `backend.configGet("workset")`, tolérante (absent / illisible / hors
  Tauri → set vide, jamais d'échec), calquée sur `read_extra_paths` (`portfolio.rs:333-337`) ;
- **écriture DANS LES MUTATEURS** (`toggle`, `add`), jamais dans un effet sur `ids` — exactement
  comme `useSettings.setUiPref` (`useSettings.ts:561-584`) écrit puis met l'état à jour ;
- **une seule clé**, `workset`, valeur = **tableau JSON d'ids** (précédent `extra_projects`).

Le hook reste **l'autorité unique** du set : tous les points d'appel passent déjà par lui
(`PortfolioView` pose/retire via `onToggleWork` = `workset.toggle`, `App.addProject:626`,
`removeFromWork:72`, `useDemoSeed:189`). Persister **dans** le hook couvre donc tous les gestes
sans toucher à `App`, et sans nourrir un god-component (D6/D8).

**Aucune commande Rust nouvelle.** `config_get`/`config_set` existent (`config.rs:186-197`) et la
façade les expose déjà. Le seul contact Rust proposé est **documentaire et défensif** : une
constante `KEY_WORKSET` + un test `is_secret` (cf. AR-6 / CA-7).

---

## 4. Périmètre FERMÉ

### F1 — `useWorkset` devient persistant (cœur du lot)

- Signature : `useWorkset(api: Backend = backend): UseWorkset` (injection pour les tests, calque
  `usePortfolio(api)` — `usePortfolio.ts:32`).
- **Restauration** : au montage, `api.configGet(WORKSET_KEY)` → `JSON.parse` → filtre : ne garder
  que des **chaînes non vides** ; toute erreur (rejet de la façade, JSON invalide, valeur non
  tableau) → **liste vide**, silencieuse.
- **Fusion, pas remplacement** : la restauration fait l'**union** avec l'état courant. Motif
  mesuré : `useDemoSeed` appelle `addToWorkset` de façon **asynchrone** (`useDemoSeed.ts:140-197`),
  et l'utilisateur peut cliquer avant la fin de la lecture — un `setIds(new Set(persisted))`
  perdrait ces ajouts (cf. CA-3).
- **Persistance** : dans `toggle` et `add`, calculer le set suivant **hors de l'updater React**
  (via une réf miroir `idsRef`, l'updater devant rester pur — il est rejoué sous StrictMode), puis
  `setIds(next)` et `void api.configSet(WORKSET_KEY, JSON.stringify([...next]))` en
  fire-and-forget, erreur avalée (hors Tauri / backend indisponible ≠ crash).
- **Aucune écriture avant la fin de la restauration** : garde explicite (`loadedRef`), pour que le
  set vide initial n'écrase jamais la valeur persistée (CA-4).
- Ordre de sérialisation : **ordre d'insertion du `Set`** (déterministe, pas de tri — un tri
  détruirait l'information d'ordre si AR-2 évolue plus tard).
- Le hook expose en plus `loaded: boolean` (restauration terminée), consommé par F2.

### F2 — Le démarrage n'ouvre pas de fenêtre à la place de l'utilisateur *(dépend d'AR-1)*

Sous la recommandation AR-1 = **(c)** : l'ouverture eager reste **exactement** celle de L24 pour
les gestes de l'utilisateur (poser un projet, cliquer), mais le **chemin de restauration** ouvre
les conversations **sans changer de vue**.

- `openConversationFor` (`App.tsx:468`) prend un paramètre explicite (ex. `focus: boolean`,
  défaut `true`) ; les deux `grid.setActiveView("working")` (`:476` et `:502`) deviennent
  conditionnels.
- L'effet eager (`App.tsx:532-539`) passe `focus = false` **uniquement** pendant la fenêtre de
  restauration (premier passage après `workset.loaded`, avant toute interaction) ; ensuite,
  comportement L24 inchangé.
- La décision « faut-il donner le focus ? » est extraite en **fonction pure** testable
  (`src/app/reconcileEagerOpen.ts`, à côté de `projectsToEagerOpen`) — le dépôt ne teste pas `App`
  monté (cf. l'en-tête de `reconcileEagerOpen.ts:4-6`).

### F3 — Clé de config déclarée côté Rust (documentaire + garde)

- `src-tauri/src/config.rs` : `pub const KEY_WORKSET: &str = "workset";` avec le commentaire qui
  dit **pourquoi la valeur est un tableau JSON et la clé un littéral** (les ids sont contrôlés par
  l'utilisateur ; les mettre **dans la clé** rejouerait l'incident L11 — cf. AR-6).
- Un test dans le module `tests` existant : `is_secret("workset")` est **faux**, et un roundtrip
  `set`/`get` de la valeur JSON. **Aucune commande, aucun comportement Rust modifié.**

### F4 — Tests

- `src/__tests__/useWorkset.test.ts` **étendu** (les 4 tests existants restent valides tels quels
  avec une façade mockée neutre) : restauration, fusion, écriture par geste, non-écrasement,
  tolérance, hors-Tauri.
- `src/__tests__/reconcileEagerOpen.test.ts` **étendu** pour la décision de focus (F2).
- `src-tauri/src/config.rs` : les deux tests de F3.

### Explicitement HORS lot

- Persister l'**onglet actif**, l'**ordre** des onglets, la **vue active**, le **mode**
  chat/shell, le **focus plein écran** L26 (sauf si AR-2 en décide autrement).
- **Purger** les ids obsolètes de la config (AR-4 = (a) recommandé) — et *a fortiori* toute
  « garbage collection » périodique.
- Toute **garde de perf sur N runners** (différé déjà tracé en L24) : ce lot ne l'ouvre pas, il en
  **rapproche l'échéance** et le redit.
- Modifier `scan_portfolio`, `usePortfolio`, `useConversations`, `removeFromWork`,
  `WorkingView`, `PtyTerminal`, ou la garde L10.
- Le **workset par projet / par espace de travail**, la synchro multi-fenêtres, l'export/import
  de la Table.
- Corriger l'ambiguïté **pré-existante** des ids (deux dossiers homonymes — un sous le chapeau, un
  importé hors chapeau — partagent le même `id`, `portfolio.rs:222` ; `usePortfolio` dédoublonne
  par **chemin**, pas par id). Constaté, **non traité** : la persistance ne l'aggrave pas (elle
  hérite du même espace de noms que `project_team:<id>`, déjà persisté depuis L11).

---

## 5. Arbitrages — TRANCHÉS le 2026-09-04 (décideur : « tout reco »)

> AR-1 = **(c)** · AR-2 = **(a)** · AR-3 = **(a)** · AR-4 = **(a)** · AR-5 = **(a)** · AR-6 = **(a)**.
> Les tableaux ci-dessous sont conservés tels qu'ils ont été proposés, options écartées comprises.

### AR-1 — Que fait le démarrage d'un set restauré non vide ?

| Option | Comportement | Coût / effet de bord |
|---|---|---|
| (a) rejouer L24 tel quel | eager open → **l'app saute sur Travail** au lancement et monte N `PtyTerminal` | fidèle à L24 à la lettre, mais **vole la navigation** (la vue par défaut `portfolio` de `useGridState.ts:33` devient inatteignable au boot) et casse la promesse « reste sur Portfolio » du seed (AR-4 de L7) |
| (b) restaurer sans ouvrir | les onglets n'existent qu'au premier passage sur Travail / au clic | le plus sobre, mais **rétrécit L24** : « les fenêtres de travail sont toujours ouvertes » redevient « à la demande » |
| **(c) ouvrir sans focaliser** *(reco)* | les conversations sont créées au boot ; **la vue reste `portfolio`** ; les PTY ne se montent qu'à l'entrée sur Travail (`App.tsx:788`) | tient la cible L24 **sans** voler la navigation ; coût = un paramètre `focus` sur `openConversationFor` |

**Recommandation : (c).** Elle est la seule qui serve la cible sans la déformer. Elle s'appuie sur
un fait mesuré : `WorkingView` étant monté conditionnellement, **aucun runner ne démarre tant que
l'utilisateur n'ouvre pas Travail** — donc (c) n'a *pas* le coût qu'on lui prête. Réserve
honnête : (c) déclenche N appels `latestTranscript` au boot (`App.tsx:486`), best-effort et déjà
tolérants à l'échec.

### AR-2 — Que persiste-t-on exactement ?

| Option | Contenu |
|---|---|
| **(a) ids seuls** *(reco)* | `workset` = `["alpha","beta"]` |
| (b) ids + onglet actif | + une clé `workset_active` |
| (c) ids + ordre + onglet actif | suppose de faire **porter** l'ordre à l'affichage |

**Recommandation : (a).** Motif de code, pas de goût : l'ordre des onglets **ne vient pas** de
l'ordre de pose — il vient de `worksetProjects` (`App.tsx:209`), donc de l'ordre du **scan
portfolio**. Persister un ordre sans l'honorer serait une donnée morte ; l'honorer est un autre
lot (et le différé « DnD onglets » de L24 vit déjà là). **(b) est bon marché** (+ ~0,25 j) si le
décideur veut retrouver son onglet actif — c'est le seul ajout que je recommanderais d'accepter.

### AR-3 — Interaction avec le seed démo (dev)

| Option | Effet |
|---|---|
| **(a) aucun traitement particulier** *(reco)* | `iaka-demo` entre dans le set persisté ; en dev, le seed le ré-ajoute de toute façon à chaque lancement |
| (b) exclure `iaka-demo` de la persistance | une exception nommée dans un hook générique |

**Recommandation : (a).** Le seed est **dev-only** (`useDemoSeed.ts:150`, `seeded:false` en prod →
le hook ne fait rien) : en production, la question n'existe pas. En dev, retirer `iaka-demo` de la
Table puis relancer le fait revenir — ce qui est **déjà le comportement actuel**. (b) introduirait
une exception démo dans un hook de production pour un inconfort de dev.
**Non négociable quelle que soit l'option** : la restauration doit **fusionner** (F1), sinon la
course seed↔restauration perd des entrées dans un sens ou dans l'autre (CA-3).

### AR-4 — Un id persisté sans projet correspondant

| Option | Effet |
|---|---|
| **(a) inerte, jamais purgé** *(reco)* | l'id dort dans la config ; si le dossier réapparaît, le projet **revient** sur la Table |
| (b) purger au premier scan | la config reste propre |

**Recommandation : (a).** (b) est un **piège mesurable** : au boot, `portfolio.projects` vaut `[]`
tant que `scan_portfolio` n'a pas répondu, **et aussi** quand le scan échoue
(`usePortfolio.ts:55-58` remet `projects` à `[]` sur erreur). Purger sur cet instantané **viderait
toute la Table** — précisément le défaut que ce lot corrige. (a) est en outre le comportement
souhaitable pour un dossier temporairement absent (disque externe, dépôt en cours de clonage).

### AR-5 — Où vit l'I/O ?

| Option | Effet |
|---|---|
| **(a) dans `useWorkset`** *(reco)* | le hook cesse d'être « front pur » ; un seul point d'autorité |
| (b) un effet de persistance dans `App` | `App` grossit ; **et** c'est la forme qui écrase la valeur persistée (R-1) |
| (c) module pur + hook mince | plus de fichiers pour le même geste |

**Recommandation : (a)**, avec la **forme de `useSettings`** : écriture **dans les mutateurs**,
jamais dans un `useEffect([ids])`. L'en-tête du hook (`useWorkset.ts:4-6`) doit être **réécrit**
pour dire le nouveau contrat — il affirme aujourd'hui « Aucun I/O ici », ce qui deviendrait faux.

### AR-6 — Forme de la clé de config

| Option | Effet |
|---|---|
| **(a) une clé `workset`, valeur = tableau JSON** *(reco)* | les ids utilisateur sont dans la **valeur** |
| (b) une clé par projet, `workset:<projectId>` | les ids utilisateur sont dans la **clé** |

**Recommandation : (a) — et (b) est un défaut connu, pas une préférence.** `is_secret`
(`config.rs:160-167`) teste la **sous-chaîne** `token|key|secret|password` sur la clé : `workset:monkey-app`,
`workset:token-service`, `workset:my-passwords` seraient classés **secrets**, exclus de
`config_all`, et la Table ne se restaurerait jamais pour ces projets — **exactement l'incident
L11** (documenté `config.rs:148-159`, corrigé par `50f410a`). (a) est immunisé **par
construction**. Vérifié : la clé littérale `"workset"` ne contient aucun des quatre motifs (CA-7).
Lecture par `configGet` (clé unique) plutôt que `configAll` : le filtre n'est même pas sur le
chemin.

---

## 6. Risques

- **R-1 — l'écrasement au boot (le risque principal).** Persister via un effet sur `ids` écrit
  `[]` avant la fin de la lecture et **détruit la Table** — un bug pire que le défaut corrigé.
  *Mitigation* : écriture dans les mutateurs + garde `loadedRef` (F1) ; **CA-4 avec contrefactuel**.
- **R-2 — la course seed / clic / restauration.** Trois écrivains asynchrones sur le même set.
  *Mitigation* : union (jamais remplacement), mutateurs idempotents (`add` l'est déjà,
  `useWorkset.ts:33-40`) ; **CA-3**.
- **R-3 — la purge des ids obsolètes sur un scan vide.** Cf. AR-4. *Mitigation* : ne pas purger ;
  **CA-5** garde l'absence de purge, y compris scan en erreur.
- **R-4 — StrictMode.** Effets et updaters rejoués en dev ([react.dev](https://react.dev/reference/react/StrictMode)) ;
  le dépôt a déjà été mordu (double-spawn PTY, L10b). *Mitigation* : aucun effet de bord dans
  l'updater `setIds` ; restauration idempotente (union) ; **CA-4** s'exécute sous le rendu de test
  standard du dépôt.
- **R-5 — N runners au premier passage sur Travail.** Non créé par ce lot, mais **rendu quotidien**
  par lui (avant, il fallait poser N projets à la main). *Mitigation* : rien dans ce lot — le
  différé « garde perf N runners » de L24 est **redit** au décideur, avec la précision qu'il
  devient probable.
- **R-6 — croissance silencieuse de la valeur.** Corollaire d'AR-4 = (a) : la liste ne décroît que
  par retrait explicite. *Mitigation* : aucune (une liste de noms de dossiers est négligeable) ;
  **déclaré**, pas masqué.

---

## 7. Critères d'acceptation

> Règle du dépôt depuis L41 : **une garde qui ne peut pas rougir n'est pas une garde**. Chaque CA
> automatisé porte donc son **contrefactuel** — la mutation à appliquer **au programme** (jamais à
> l'attendu), à jouer, à capturer, puis à **révoquer avec preuve** (`git diff` vide ou `sha256`
> identique avant/après).

- **CA-1 — La Table survit au redémarrage.**
  *Vérif (test)* : façade mockée, `configGet("workset")` → `'["alpha","beta"]'` → après flush,
  `ids` contient `alpha` et `beta`.
  *Vérif (recette)* : poser 2 projets, quitter l'app, relancer → les 2 projets sont sur la Table.
  *Contrefactuel* : faire renvoyer `null` en dur par la lecture → le test rougit en nommant `alpha`.

- **CA-2 — Chaque geste est persisté, et le retrait aussi.**
  *Vérif (test)* : `add("a")` → `configSet` appelé avec `'["a"]'` ; `toggle("b")` → `'["a","b"]'` ;
  `toggle("a")` → `'["b"]'` (l'id retiré **n'est plus** dans la valeur écrite).
  *Contrefactuel* : ne persister que dans `add` → le cas du retrait rougit nommément.

- **CA-3 — La restauration FUSIONNE, elle n'écrase pas.**
  *Vérif (test)* : `configGet` renvoie une promesse **non encore résolue** ; appeler `add("seed")` ;
  résoudre avec `'["alpha"]'` → l'état final contient **`seed` ET `alpha`**.
  *Contrefactuel* : remplacer l'union par `setIds(new Set(persisted))` → le test rougit en nommant
  `seed` manquant.

- **CA-4 — Aucune écriture avant la fin de la restauration.**
  *Vérif (test)* : monter le hook, **ne rien faire**, résoudre `configGet` avec `'["alpha"]'` →
  `configSet` n'a **jamais** été appelé (`expect(api.configSet).not.toHaveBeenCalled()`).
  *Contrefactuel* : remplacer la persistance par un `useEffect(() => persist(ids), [ids])` → le
  test rougit (`configSet` appelé avec `[]`). **C'est le contrefactuel le plus important du lot** :
  il reproduit R-1, la forme naturelle et fausse.

- **CA-5 — Un id sans projet ne produit rien, et n'est pas purgé.**
  *Vérif (test A)* : `ids = {alpha, fantome}`, `projects = [alpha]` → la dérivation
  (`portfolio.projects.filter(...)`, exercée au niveau atteignable) rend **un seul** projet.
  *Vérif (test B)* : après restauration, aucun scan ne déclenche de `configSet` — y compris quand
  `portfolio` est vide ou en erreur.
  *Contrefactuel* : introduire une purge alignée sur `portfolio.projects` → le test B rougit, et un
  test « scan vide → le set reste intact » rougit aussi.

- **CA-6 — Le démarrage ne vole pas la navigation** *(sous AR-1 = (c) ; à réécrire si (a) ou (b))*.
  *Vérif (test)* : la fonction pure de décision rend `focus:false` sur le passage de restauration
  et `focus:true` sur une pose utilisateur.
  *Vérif (recette)* : relancer avec 3 projets sur la Table → l'app s'ouvre sur **Portefeuille**, la
  Table montre les 3 projets, aucune fenêtre volée.
  *Contrefactuel* : rebrancher `setActiveView("working")` inconditionnellement → le test rougit.

- **CA-7 — La clé est non sensible, et ça se prouve côté Rust.**
  *Vérif (test Rust)* : `assert!(!is_secret(KEY_WORKSET))` + roundtrip `set`/`get` de la valeur JSON.
  *Contrefactuel* : renommer la constante en `"workset_key"` → le test rougit — c'est **la
  reproduction exacte** de l'incident L11.

- **CA-8 — Valeur illisible → set vide, jamais un crash.**
  *Vérif (test)* : `configGet` → `"pas du json"`, puis `'{"a":1}'` (non tableau), puis `'[1,2]'`
  (éléments non-chaînes) → dans les trois cas, `ids.size === 0`, aucune exception.
  *Contrefactuel* : retirer le `try/catch` du parse → le premier cas rougit.

- **CA-9 — Hors Tauri, rien ne casse.**
  *Vérif (test)* : `configGet` **rejette** → `ids` vide, `loaded` passe à `true`, aucune exception
  non capturée ; `add` reste fonctionnel en mémoire (et son `configSet` en échec est avalé).

- **CA-10 — Chaîne qualité.** `npm run typecheck`, `npm run lint`, `npm run test` et `cargo test`
  **verts** ; `bash scripts/quality.sh` **exit 0**. Aucun `invoke` hors `src/api/backend.ts`
  (D7, à re-grepper). CSP **non touchée**.

- **CA-11 — Recette terrain (décideur).** Poser 3 projets, quitter, relancer : les 3 sont sur la
  Table ; entrer sur Travail → 3 onglets, chaque runner (ou vue attachée L25) vivant ; basculer
  Shell↔Conversation → **garde L10 tenue** (le PTY n'est ni fermé ni re-spawné) ; retirer un
  projet, quitter, relancer → il n'est **plus** là.

---

## 8. Fichiers concernés

- `src/hooks/useWorkset.ts` — **cœur** : façade injectable, restauration fusionnante au montage,
  écriture dans les mutateurs, garde `loadedRef`, `loaded` exposé, **en-tête réécrit** (la phrase
  « Aucun I/O ici » devient fausse et doit être remplacée par le nouveau contrat + le renvoi à L37).
- `src/App.tsx` — F2 seulement : paramètre `focus` sur `openConversationFor`, effet eager câblé sur
  la décision pure. **Aucune autre modification.**
- `src/app/reconcileEagerOpen.ts` — décision de focus, en fonction **pure** à côté de
  `projectsToEagerOpen` (qui reste inchangée).
- `src-tauri/src/config.rs` — `KEY_WORKSET` + commentaire de justification + 2 tests. **Aucune
  commande, aucun comportement modifié.**
- `src/__tests__/useWorkset.test.ts`, `src/__tests__/reconcileEagerOpen.test.ts` — étendus.
- `src/api/backend.ts` — **INCHANGÉ** (`configGet:724` / `configSet:729` suffisent).
- `CLAUDE.md` — case L37 mise à jour à la clôture (par l'exécutant, pas par le cadrage).

---

## 9. Estimation (jalon P1→P2)

| Grandeur | Valeur |
|---|---|
| **Équivalent jour-homme** | **≈ 1 j** (0,75 j si AR-1 = (b) ; ≈ 1,25 j si AR-2 = (b) s'ajoute) |
| **Complexité** | **faible** — ~60 lignes de production, un patron déjà éprouvé deux fois dans le dépôt (`useSettings`, `extra_projects`) |
| **Risque** | **moyen** — non pas dans le code, mais dans l'**ordonnancement du boot** (R-1/R-2) : la forme naïve détruit la donnée qu'elle prétend sauver. C'est le contrefactuel CA-4 qui achète ce risque. |
| **Inconnues susceptibles de faire glisser** | (i) l'arbitrage AR-1 : (c) demande de toucher `openConversationFor`, chemin partagé par la pose, le clic, la treemap L16-F2 et le seed — une non-régression à vérifier sur les quatre ; (ii) le comportement réel au premier passage sur Travail avec N ≥ 4 projets (R-5) — **non mesuré**, il peut ouvrir un lot de perf qui n'est pas celui-ci ; (iii) la recette terrain CA-11 appartient au décideur (l'agent ne peut pas relancer l'app installée à sa place). |

Ce n'est **pas** un engagement ferme : un ordre de grandeur assumé et révisable, à confronter au
temps réel à la clôture du lot.

---

## 10. Sources externes citées

- Comportement de `<StrictMode>` en développement (double montage / effets rejoués), qui motive la
  garde de F1 et le contrefactuel CA-4 : <https://react.dev/reference/react/StrictMode>.
