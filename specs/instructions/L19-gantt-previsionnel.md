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
| **Prévisionnel** (étapes + délégations + durées) | le **rôle coordinateur** DOIT le produire (obligation, cf. § Décision) | **FEATURE — décidée** |
| **Dépassement + cascade + alerte** | comparer réalisé (snapshots) vs estimé | dérivé, dès que l'estimé existe |

**Conséquence clé** : on peut livrer **le réalisé + les flèches + l'alerte-sur-retard** rien
qu'avec L18 (snapshots datés), AVANT même les estimations. Le **prévisionnel** est le seul vrai
nouveau mécanisme.

## Source des estimations — DÉCISION (Stéphane, 2026-06-30) : OBLIGATION DE RÔLE

Ce n'est **pas** un prompt ponctuel : c'est une **obligation portée par le rôle
« coordinateur »** (le chef de projet de la team). Le rôle coordinateur **DOIT**, à chaque
étape :
1. **planifier les étapes** (la liste prévisionnelle),
2. **planifier les délégations** de chaque étape (quel agent fait quoi),
3. **évaluer les temps prévisionnels** (durée par étape/tâche).

**Dégradation honnête (gravée)** : si les étapes **ou** les timings **ne sont pas produits**, on
**retombe en mode SANS prévisionnel** (#9a, réalisé seul) — **jamais de fausse baseline**.

### Matérialisation (couplage L11 ↔ L18)
- **Contrat de rôle (L11)** : l'obligation vit dans la **définition du rôle coordinateur**
  (persona/contrat de l'agent coordinateur). Concrètement, le **runner coordinateur** reçoit au
  lancement une **instruction** qui impose : produire le plan (étapes + délégations) **et** les
  durées estimées (canal structuré — p. ex. `TodoWrite` enrichi d'une durée, ou un doc
  `event:"plan"` portant `minutes` par item).
- **Capture (L18)** : le hook de main courante capte ce plan **complet** (étapes + délégations +
  durées) → la baseline prévisionnelle. Le **réalisé** se dérive des snapshots successifs.
- **Indépendance moteur** : l'obligation est attachée au **rôle**, pas au runner — un coordinateur
  `codex`/`ollama` la porte aussi (chacun l'émet par sa voie, schéma unifié L18).

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
