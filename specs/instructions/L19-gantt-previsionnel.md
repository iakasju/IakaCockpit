# L19 — Gantt prévisionnel (estimations × réalisé × alerte) — CADRAGE

> Cadrage (chef de projet, 2026-06-30). Incrément **#9** du portage mock→dev (L17), le
> plus ambitieux : ce n'est **pas un rendu**, c'est une **feature** (le coordinateur doit
> PRODUIRE des estimations). S'appuie sur la fondation main courante par hook (L18).
> **Statut : cadré, NON implémenté.** Un arbitrage reste à trancher (cf. § Arbitrage).

## Besoin (décision IHM du mock, validée par Stéphane)

Dans l'arbre des délégations / la Table : au lancement d'une action, **Aragorn (coordinateur)
évalue les tâches et leur durée** → on affiche le **prévu** (baseline Gantt) ; les barres se
**remplissent au timer** (réalisé) ; une tâche qui **dépasse** son estimation passe **rouge** et
**décale en cascade** les étapes suivantes → **alerte**. Le Gantt porte aussi les **flèches**
délégation agent→agent + user↔agent (déjà mergées dans cette vue côté mock).

## Décomposition (la donnée commande, comme #5/#6/#7)

| Brique | Donnée | Statut |
|---|---|---|
| **Réalisé** (avancement, timer, statuts) | **snapshots de plan L18** : chaque `TodoWrite` émet un snapshot horodaté ; comparer les snapshots donne **quand** chaque tâche passe `pending→in_progress→completed` | **DATA-READY** (via L18) |
| **Flèches relations** | délégations (`kind:"delegation"`, agent) + paroles user↔agent | DATA-READY (transcript) |
| **Prévisionnel** (durée estimée par tâche) | n'existe PAS — le coordinateur doit la **produire** | **FEATURE à concevoir** |
| **Dépassement + cascade + alerte** | comparer réalisé (snapshots) vs estimé | dérivé, dès que l'estimé existe |

**Conséquence clé** : on peut livrer **le réalisé + les flèches + l'alerte-sur-retard** rien
qu'avec L18 (snapshots datés), AVANT même les estimations. Le **prévisionnel** est le seul vrai
nouveau mécanisme.

## Arbitrage à trancher (Stéphane) — comment le coordinateur PRODUIT les estimations

- **Option A — durée dans le plan** : convention sur `TodoWrite` (le coordinateur préfixe/encode
  une durée par item, ex. `"[~5min] Cadrer"`). Le hook L18 la capte (déjà le plan complet). Zéro
  nouvel outil ; dépend du **prompt** du coordinateur (qu'il estime). *Le plus léger.*
- **Option B — étape d'estimation dédiée** : le coordinateur émet, au lancement, un **doc
  d'estimation structuré** (via le hook / main courante, `event:"estimate"`, `[{task,minutes}]`).
  Plus propre/explicite ; demande de **prompter** le coordinateur pour cette étape.
- **Option C — heuristique** (sans LLM) : estimer depuis l'historique (durées réelles passées des
  tâches similaires, via les snapshots accumulés). Aucun changement de prompt ; moins « parlant »
  au 1ᵉʳ run (pas d'historique).

*Reco : **A** pour amorcer (léger, converge avec L18), avec repli **C** (heuristique) quand
l'historique existe ; **B** si on veut une estimation de premier rang plus tard.*

## Tranches proposées

1. **#9a — Réalisé + flèches + alerte-retard (sans estimation)** : dériver des snapshots L18 la
   timeline réelle par tâche (statut + horodatage de transition) ; rendre un Gantt « réalisé »
   (couloirs/agents, axe de temps, curseur « maintenant ») + flèches délégation/user↔agent ;
   alerte si une tâche `in_progress` dure anormalement longtemps. **Data-ready (L18).**
2. **#9b — Prévisionnel** : selon l'arbitrage (A/B/C), capter l'estimation → baseline fantôme ;
   superposer prévu vs réalisé ; **dépassement rouge + décalage cascade**.
3. **#9c — Réglage fenêtre/échelle**, persistance, raffinements.

## Points durs

- **Source des estimations** = l'arbitrage ci-dessus (le vrai verrou).
- **Corrélation snapshot→transition** : déduire l'instant de changement de statut d'une tâche en
  comparant deux snapshots successifs (clé = `content` de l'item, défensif aux renommages).
- **Temps réel** : MVP = recharger les snapshots ; live `_changes` différé (calque L4/L18).
- **Honnêteté** : pas d'estimation inventée — si le coordinateur n'en produit pas (option A non
  respectée), on affiche le **réalisé seul** (pas de fausse baseline).
- Réutilise la fondation L18 (plan snapshots) ; rendu en composant présentationnel pur, charte A.

## Vérification de clôture (par tranche)

#9a : la timeline réelle d'une session (statuts datés) s'affiche, flèches correctes, alerte sur
tâche longue ; #9b : baseline prévue affichée et dépassement→rouge+cascade quand le réalisé excède
l'estimé. Front typecheck/lint/test verts ; pas de fausse donnée.
