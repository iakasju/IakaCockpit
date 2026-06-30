# L20 — Gantt prévisionnel : conformité au mock + remplissage live — CADRAGE

> Cadrage (Gandalf, analyse, 2026-06-30). Suite à la **recette terrain GUI** de Stéphane sur
> L19 #9b (Gantt prévisionnel, commit `54a6ea0`, gate Legolas PASS **sur les données**). La
> recette **données** est verte ; la recette **terrain** échoue sur **deux défauts visuels/
> comportementaux** : (1) le look & feel n'est **pas conforme au mock** ; (2) le Gantt **ne se
> remplit pas en live**. **Statut : cadré, NON implémenté.** Lecture seule ; aucun code touché.

## Sources (fichier:ligne)

- **Mock de référence** : `specs/design/redesign/A/concepts/app/travail.html:207-339` (structure)
  + `specs/design/redesign/A/concepts/app/viz.css:186-281` (grammaire visuelle `.gantt*`).
- **Rendu actuel** : `src/components/GanttPanel.tsx:18-77` + styles `src/theme/app.css:1556-1648`.
- **Donnée dérivée** : `src/hooks/derivePlanTimeline.ts` (PUR, par tâche).
- **Source des snapshots** : `src/hooks/usePlan.ts:8` + `:25-39` (one-shot, « temps réel différé »).
- **Intégration** : `src/App.tsx:208-214` (`derivePlanTimeline(plan.snapshots, Date.now())`) + `:386`.
- **Façade L4** : `src/api/backend.ts:286-290` (`fetchMainCourante`, `invoke` unique D7).
- **Cadres amont** : `L19-gantt-previsionnel.md:67` (« Temps réel : MVP = recharger les snapshots ;
  live `_changes` différé »), `L18-main-courante-par-hook.md`.

## Besoin

Mettre le widget Gantt de la Table **en conformité avec le mock validé** (grammaire visuelle,
axe de temps, curseur « maintenant », bandeau d'estimation, légende) **et** le faire **vivre en
direct** pendant une session (les barres se remplissent au timer, le curseur avance, un
dépassement vire au rouge sans rechargement manuel).

---

## Diagnostic 1 — Look & feel (écarts mock → rendu actuel)

Le rendu livré est un **#9a minimal par tâche** ; le mock est un **objet visuel tout autre**. Écarts
concrets (chaque ligne = un delta à combler) :

| # | Élément mock (`travail.html` / `viz.css`) | Rendu actuel (`GanttPanel.tsx` / `app.css`) | Delta |
|---|---|---|---|
| 1 | **Bandeau d'estimation** `.estban` : « Aragorn estime » + durée par tâche + `total prévu 25 min · lancé 10:25` (`travail.html:209-215`) | absent | **manquant** |
| 2 | **Règle de temps** `.gaxis` graduée en heures (`10:25…10:55`, `viz.css:204-207`) | aucun axe gradué | **manquant** |
| 3 | **Couloirs = par AGENT** avec avatar + nom (`.glane .glabel img`, `travail.html:233-295`) | **couloirs = par TÂCHE** (`glabel` = `b.content`, `GanttPanel.tsx:53`) | **structure différente** (cf. AR-1) |
| 4 | **Curseur « maintenant »** labellisé + pastille pulsée, **au milieu de l'axe** (`.gnow .lab`, `viz.css:212-218`) | `.gnow` = trait 1px **collé au bord droit**, sans label (`app.css:1641-1648`) | **dégradé** |
| 5 | **Axe étendu au-delà de maintenant** jusqu'à la fin projetée (now=63 % à `travail.html:230`) | `range = nowMs − minMs` → now **toujours à 100 %** (`GanttPanel.tsx:21`) : aucun futur visible | **structurel** (cf. AR-4) |
| 6 | **Barre riche** : `.fill` remplissage + `.cap` caption dans la barre + débord rouge `.fill.ovf` + marqueur `prévu` `.planend` (`viz.css:230-240`) | barre pleine `.gbar` mono-couleur, dépassement = bascule rouge (`.ovr`), pas de caption/marqueur | **dégradé** |
| 7 | **Baseline fantôme** `.gghost` (cartouche hachuré à sa place + label) (`viz.css:242-246`) | `.gbase` = simple contour pointillé superposé (`app.css:1632-1640`) | **dégradé** |
| 8 | **Cascade visible** : `.gwait` (case en attente décalée) + `.gslip` (connecteur pointillé `↦ +3 min`) (`viz.css:247-254`) | cascade calculée dans la donnée (`baselineStartMs`) mais **non rendue** comme décalage/connecteur | **manquant au rendu** |
| 9 | **Alerte de retard inline** `.galert` sur la barre (`⚠ retard +3 min`, `travail.html:273`) | alerte = **compteur global** dans le header (`gantt.overrun`, `GanttPanel.tsx:29-31`) | **placement différent** |
| 10 | **Lane user** `.userlane` (Stéphane sollicite / rapport final) (`travail.html:233-239`) | absente | **manquant** (cf. AR-2) |
| 11 | **Flèches de relations** `.grel` : délégation agent→agent (pointillé indigo) + adresse user↔agent (plein bleu) (`travail.html:300-327`) | absentes (différé assumé `GanttPanel.tsx:9`) | **manquant** (cf. AR-2) |
| 12 | **Légende** `.gleg` 7 entrées (réalisé/baseline/dépassement/maintenant/cascade/adresse/délégation) (`travail.html:330-338`) | aucune légende | **manquant** |

**Verrou de fidélité (AR-1)** : le mock organise les couloirs **par agent**, or la donnée actuelle
(`derivePlanTimeline`, clé = `content` de tâche, issue des snapshots `TodoWrite {content,status}`
L18) **ne porte aucune attribution d'agent**. Une fidélité « 1 couloir = 1 agent » exige une
**donnée nouvelle** (les items de plan doivent porter l'agent qui exécute → extension de
l'obligation de rôle coordinateur L19/L18). Ce n'est **pas** un travail de CSS. → arbitrage.

---

## Diagnostic 2 — Live (câblé / différé / trou)

**État réel : NON câblé, et c'est un différé de L19 devenu défaut de recette.** Deux mécanismes
manquent, indépendants :

1. **Le temps `nowMs` est figé.** `App.tsx:211` passe `Date.now()` **capté au render**. Aucun
   ticker ne provoque de re-render → entre deux snapshots, `nowMs` ne bouge pas : les barres
   `in_progress` **ne grandissent pas**, le curseur **n'avance pas**, le dépassement **ne se
   déclenche pas au fil du temps**. Même le *réalisé* est statique.
2. **Les snapshots ne sont rechargés qu'au changement de projet.** `usePlan` (`usePlan.ts:25-43`)
   appelle `fetchMainCourante()` **une fois** (`useEffect` sur `[refresh]`), sans `setInterval`
   ni souscription. Commentaire explicite : *« MVP : (re)chargement au changement de projet +
   `refresh()`. Temps réel différé (L4) »* (`usePlan.ts:8`). Les transitions de statut qui
   arrivent en CouchDB **pendant** la session ne sont **pas** captées sans `refresh()` manuel.

**Constat de périmètre** : L19 § Points durs avait **délibérément différé** le temps réel (« MVP =
recharger les snapshots ; live `_changes` différé », `L19:67`). Le mock, lui, promet
explicitement « rempli au timer / prévisionnel **live** » (`travail.html:152,205`). Donc le « live »
n'est **pas un bug d'implémentation** : c'est un **arbitrage de périmètre** que la recette terrain
vient rouvrir. → AR-3.

**Où brancher (réutilisation de l'existant, zéro nouvelle commande Rust)** :

- **B1 — ticker `nowMs` (front pur, ~zéro risque)** : un hook `useNow(intervalMs)` qui pousse
  `Date.now()` dans l'état à intervalle régulier ; remplacer les deux `Date.now()` de
  `App.tsx:211,214` par la valeur tickée. **C'est ce seul point qui fait « vivre » le Gantt**
  visuellement (fill + curseur + bascule rouge) entre deux snapshots, **sans aucun backend**.
- **B2 — rafraîchissement des snapshots** : ajouter un `setInterval` dans `usePlan` qui rappelle
  `refresh()` (donc `fetchMainCourante`, **façade L4 inchangée**) tant qu'un projet est actif, nettoyé
  au démontage / changement de projet. Capte les **nouvelles transitions**. **MVP = polling** ;
  la souscription **`_changes` CouchDB reste différée** (calque `listen` L4/L10 plus lourd —
  `backend.ts:561-575`), non requise pour la recette.

---

## Décomposition

### Tranche A — Conformité au mock (front pur, donnée inchangée)

Re-skin de `GanttPanel.tsx` + styles, en **portant la grammaire visuelle du mock** sur la donnée
**actuelle (par tâche)**, sans inventer de donnée :

- A1. **Bandeau d'estimation** dérivé de la donnée existante : somme des `estMs` → « total prévu »,
  `minMs` → « lancé HH:MM », durée par tâche estimée. Masqué proprement si **aucune** estimation
  (dégradation honnête, jamais « Aragorn estime 0 »).
- A2. **Axe de temps gradué** (`.gaxis`) : graduations `HH:MM` calculées sur `[minMs … axisMax]`.
- A3. **Axe étendu** (AR-4) : `axisMax = max(nowMs, fin projetée)` où *fin projetée* = dernier
  `baselineStartMs + estMs` (cascade) ; le curseur « maintenant » se positionne alors **à
  `(nowMs−minMs)/range`** (plus au bord). Le futur (ghost/wait) devient visible à droite.
- A4. **Curseur « maintenant » labellisé** (`.gnow .lab`, pastille) traversant tous les couloirs.
- A5. **Barres riches** : remplissage `.fill`, caption `.cap`, **débord rouge** `.fill.ovf` au-delà
  de la baseline + **marqueur `prévu`** `.planend`, à la place de la bascule mono-couleur actuelle.
- A6. **Baseline fantôme** `.gghost` + **rendu de la cascade** : case en attente `.gwait` décalée +
  connecteur `.gslip` (`↦ +N min`) là où `baselineStartMs` projette au-delà du réalisé.
- A7. **Alerte de retard inline** `.galert` sur la barre en dépassement (en plus du compteur header).
- A8. **Légende** `.gleg` (entrées effectivement rendues uniquement — pas d'entrée pour les flèches
  si elles ne sont pas rendues, cf. AR-2).

> Tranche A **n'exige aucune nouvelle donnée** : tout est dérivable de `PlanTimeline`
> (`startMs/endMs/status/estMs/baselineStartMs/overrun` + `minMs/nowMs`). Les **couloirs restent
> par tâche** (AR-1) ; **flèches + lane user = hors tranche A** (AR-2).

### Tranche B — Remplissage live (MVP, réutilise la façade L4)

- B1. **`useNow`** : hook ticker (réf. état de l'art ci-dessous), intervalle raisonnable
  (p. ex. 1 s, à confirmer), **pause quand l'onglet est masqué** (`document.hidden` /
  `visibilitychange`) pour ne pas consommer en arrière-plan. Branché en remplacement des
  `Date.now()` de `App.tsx:211,214`.
- B2. **Polling `usePlan`** : `setInterval(refresh, N)` (p. ex. 10–15 s, à confirmer) tant qu'un
  projet est actif, nettoyage strict (démontage + changement de projet), via `fetchMainCourante`
  **sans toucher au Rust**. **`_changes` reste différé.**

> Garde : ne **jamais** démonter/re-spawn le `PtyTerminal` (garde L10) ni multiplier les
> abonnements (calque anti-fuite `useRunnerViews`/`usePty`). Le polling doit être **idempotent**
> et silencieux en mode dégradé (calque `usePlan` actuel : échec → empty-state, jamais d'erreur dure).

---

## Points durs

- **Axe étendu (A3)** : recalcul de `range` et de la position du curseur. Bien gérer le cas **sans
  estimation** (axisMax = nowMs → comportement #9a actuel, curseur au bord) pour ne pas régresser.
- **Cascade au rendu (A6)** : la donnée `baselineStartMs` existe déjà (cascade calculée) ; le travail
  est **uniquement** de la **rendre** (ghost/wait/slip), pas de la recalculer.
- **Honnêteté** : aucune donnée inventée. Pas d'estimation → pas de bandeau, pas de baseline, pas
  d'axe étendu (réalisé seul). Pas d'agent par tâche → **pas** de couloirs par agent (AR-1).
- **Live sans gaspillage (B1)** : ticker en pause onglet masqué ; intervalle volontairement large
  pour le polling (B2). Pas de re-render coûteux : `GanttPanel` reste présentationnel pur.
- **Test** : `derivePlanTimeline` reste PUR et déjà testé ; tester `useNow` (fake timers vitest) et
  le polling `usePlan` (interval + nettoyage). Le rendu visuel = recette terrain (non unitaire).

## Vérification de clôture (par tranche)

**Tranche A (conformité)** — vérifiable à l'œil contre `travail.html`, **grammaire visuelle**
(couloirs restent **par tâche** par AR-1, PAS par agent ; flèches/lane user hors lot par AR-2) :
- bandeau « estime » + total prévu + heure de lancement présents quand des estimations existent ;
- axe de temps gradué visible ; curseur « maintenant » **labellisé**, positionné **dans** l'axe
  (pas au bord) dès qu'il y a un prévisionnel ; futur (ghost/wait) visible à droite du curseur ;
- barres avec remplissage + caption ; dépassement = **débord rouge + marqueur `prévu`** ; cascade
  rendue (wait + connecteur `↦ +N`) ; alerte inline sur la barre en retard ; légende présente ;
- **aucune régression #9a** sans estimation (réalisé seul, axe borné à maintenant) ;
- `npm run typecheck && npm run lint && npm run test` verts ; CSP intacte ; pas de fausse donnée.

**Tranche B (live)** — vérifiable en session réelle (`tauri dev`, `iaka-demo`) :
- une barre `in_progress` **grandit visiblement** et le curseur « maintenant » **avance** sans
  interaction ; un dépassement **vire au rouge au fil du temps** sans rechargement (preuve B1) ;
- une nouvelle transition de statut écrite en main courante **apparaît** dans le Gantt en ≤ N s
  sans changer de projet (preuve B2) ; ticker **en pause** quand l'onglet est masqué ;
- nettoyage des intervalles prouvé (pas de fuite, pas de double-abonnement) ; mode dégradé
  silencieux ; `PtyTerminal` non démonté.

---

## Arbitrages — TRANCHÉS (Stéphane, 2026-06-30) : paquet recommandé validé

> Les 4 arbitrages sont **fermés**. Périmètre L20 non ambigu, prêt pour Gimli.

- **AR-1 — Couloirs par tâche vs par agent. → TRANCHÉ : couloirs PAR TÂCHE (MVP).** Tranche A se fait
  sur la donnée actuelle (clé = `content`), grammaire visuelle du mock portée **par tâche**. Les
  **couloirs-par-agent sont DIFFÉRÉS** (hors L20) — ils nécessiteraient d'enrichir la donnée d'une
  **attribution d'agent par tâche** (extension de l'obligation de rôle coordinateur L19/L18), travail
  de **données**, pas de front.
- **AR-2 — Flèches de relations + lane user. → TRANCHÉ : DIFFÉRÉ (hors L20).** Dépendent d'AR-1
  (attribution d'agent) + de la position temporelle des délégations/adresses. Restent hors périmètre,
  comme déjà signalé au code (`GanttPanel.tsx:9`). La légende A8 ne mentionne donc **pas** d'entrée
  flèche/adresse tant qu'elles ne sont pas rendues.
- **AR-3 — Live. → TRANCHÉ : OUI, on élargit L19, on livre le LIVE.** Périmètre verrouillé =
  **B1 (ticker `useNow`) ET B2 (polling `usePlan`)** — **les deux**, pas B1 seul. La souscription
  **`_changes` CouchDB reste DIFFÉRÉE** (non requise pour la recette).
- **AR-4 — Axe étendu au-delà de « maintenant ». → TRANCHÉ : OUI.** L'axe va jusqu'à la fin projetée
  (`axisMax = max(nowMs, fin projetée)`), le curseur se positionne **dans** l'axe et le
  futur/prévisionnel (ghost/wait/cascade) devient visible à droite. Garde-fou conservé : **aucune
  régression #9a** sur les sessions sans estimation (axe borné à maintenant, curseur au bord).
- **Réglages d'intervalle** (B1 ticker ~1 s, B2 polling ~10–15 s) : valeurs MVP, ajustables par Gimli
  à l'implémentation (non bloquant).

## État de l'art vérifié (web, 2026-06-30)

Pour le ticker `nowMs` (B1), la voie **React 18** propre est `useSyncExternalStore` avec un
`setInterval` dans la fonction `subscribe` (évite le *tearing* en rendu concurrent) ; la voie
`useEffect + useState + setInterval` (avec `clearInterval` au cleanup) reste un MVP acceptable.
Reco : `useSyncExternalStore` si trivial, sinon `useEffect`+`setState` borné. Sources :
`react.dev/reference/react/useSyncExternalStore`, `overreacted.io` (« Making setInterval
Declarative with React Hooks »).
