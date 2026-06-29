# L17 — Porter les décisions IHM du mock vers le vrai front

> Cadrage (chef de projet, 2026-06-29). Programme : implémenter, dans le vrai front React,
> les décisions IHM validées sur le mock Loki (`specs/design/redesign/A/concepts/app/`).
> L'identité Atelier/Étagère/Table est déjà portée (commits `b56acf1`/`a0ee180`).

## Principe : incréments honnêtes côté DONNÉES

Le tailer transcript (`transcript.rs` → `runner://event`) fournit aujourd'hui :
`EventKind` = Parole · Geste · **Délégation** · Activité · Pensée, avec `agent`, `role`,
`is_sidechain`, `tool_name`, `tool_use_id`, `tool_input`, `ts`.
**Ne sont PAS captés** (à plomber si la viz les exige) : `usage`/tokens, compaction/contexte,
`file-history-snapshot` (explicitement ignoré), et les **estimations de durée** (n'existent pas
— c'est une feature à créer). On découpe donc en incréments selon que la donnée est **prête**
ou **à produire**.

## Échelle d'incréments (ordre recommandé)

| # | Incrément | Données | Effort |
|---|---|---|---|
| 1 | **Étagère — layout** : bandeau KPIs en ligne · tuiles 3 colonnes · colonne économie à droite | front pur (KPIs dispo : nb projets, git ; coût = placeholder) | faible |
| 2 | **Table — délégation + attribution** : flèches délégation agent→agent + user↔agent ; gouttière d'avatars d'attribution | **prêtes** (Délégation + agent/role) | moyen |
| 3 | **Plan vivant** : checklist live des tâches | structurer `TaskCreate`/`TaskUpdate`/TodoWrite du transcript | moyen |
| 4 | **Table — toggle Chat↔Shell** : shell plein cadre (saisie dans le shell, recouvre l'input) | front (PtyTerminal déjà monté) | faible-moyen |
| 5 | **Économie multi-ligne** : tokens par agent au fil des tours | **à plomber** : capter `usage` dans `transcript.rs` | moyen (backend) |
| 6 | **Mémoire / compaction** : jauge contexte + frontière | **à plomber** : capter contexte/compaction | moyen (backend) |
| 7 | **Effets fichiers** : heatmap snapshots × tours | **à plomber** : mapper `file-history-snapshot` | moyen (backend) |
| 8 | **Treemap coût (KPI Étagère)** | dépend de #5 (coût par projet/agent) | moyen |
| 9 | **Gantt prévisionnel + alerte** : estimation Aragorn, remplissage timer, dépassement rouge + cascade | **feature** : le coordinateur doit ÉMETTRE des estimations de durée + suivi temps réel | élevé (produit+backend) |

## Notes de réalité

- **#9 (Gantt prévisionnel)** est la pièce la plus ambitieuse : ce n'est pas un rendu mais un
  **mécanisme** (le coordinateur estime les tâches et leur durée ; on compare prévu/réel au
  timer ; dépassement → alerte + décalage). À cadrer séparément quand on l'attaque (comment
  l'estimation est produite : prompt coordinateur ? heuristique ? saisie ?).
- **Règle widgets** : « enlever un widget » = le **débrancher** (flag/non monté), jamais
  supprimer (cf. mémoire `regle-enlever-widget-debrancher-garder`).
- **Gardes** : façade unique `backend.ts`, pas de god-component, viz en composants
  présentationnels purs, CSP intacte, sans emoji (rail texte), charte direction A.

## Démarrage

Premier incrément à confirmer avec Stéphane. Reco : **#1 (Étagère layout)** comme socle visible
faible-risque, ou **#2 (délégation/attribution)** comme première vraie viz data-ready à fort
impact. Chaque incrément = un cycle (implémentation → typecheck/lint/test → commit).
