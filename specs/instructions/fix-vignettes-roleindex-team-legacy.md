# Fix — Vignettes : collision `roleIndex` sur la team par défaut legacy (« Aragorn = Gandalf »)

> Cadré 🟠 Aragorn (2026-07-12), après diagnostic Gimli (lecture seule). Décision Stéphane :
> **auto-réparer au chargement** (option 1). Bugfix front seul.

## Cause racine (prouvée)
La team persistée `iakaframe` (SQLite `config.teams`, liée à `iaka-demo`) est un **artefact
legacy** : `Aragorn.roleIndex = 2` (dupliqué avec Gandalf), `Aragorn.royaume = "doc"`,
`coordinator = gandalf`. Le résolveur d'avatar mappe `name → roleIndex → vignette` ; avec deux
agents en `roleIndex 2`, **Aragorn ET Gandalf** résolvent tous deux `lotr/gandalf.webp`. Le
manifest et le code de résolution sont **sains** (audit complet : aucune autre collision, ni
dans les 11 teams catalogue, ni dans `DEMO_TEAM`, ni dans le manifest). Le bootstrap actuel
`reconcileDefaultTeamCasting` est **additif-only** : il n'ajoute que les agents manquants par
`id`, ne répare jamais une valeur corrompue d'un agent existant → la collision survit à chaque
lancement.

## Correctif (décision : auto-réparer au chargement)

### A. Réparation one-shot au chargement — `src/hooks/useTeams.ts`
Étendre `reconcileDefaultTeamCasting` (~l.261-286) : **pour la seule team `DEFAULT_TEAM_ID`**,
en plus d'ajouter les agents manquants, **réaligner chaque agent canonique existant (par `id`
présent dans `DEMO_TEAM`) sur sa valeur canonique** :
- `roleIndex` ← valeur `DEMO_TEAM` (ex. `aragorn → 1`, `gandalf → 2`) ;
- `royaume` ← valeur `DEMO_TEAM` (ex. `aragorn → "coordination"`) ;
- **`coordinator`** de la team ← coordinateur canonique (`aragorn`, roleIndex 1) **s'il pointe
  sur un agent réaligné et diffère** (répare `gandalf` → `aragorn`).
Contraintes :
- **Non destructif** pour les agents dont l'`id` n'est **pas** dans `DEMO_TEAM` (agents ajoutés
  par l'utilisateur) : on n'y touche pas.
- **Ne touche PAS** les 11 teams catalogue ni les teams custom (seulement `DEFAULT_TEAM_ID`).
- **Idempotent** : `changed = true` seulement si une valeur diffère → déclenche la persistance
  existante (`load`, ~l.370-376). Au prochain lancement, la config de Stéphane est réparée sans
  reset manuel ; répare aussi toute future install corrompue.
- Ne pas réintroduire les skills legacy ; laisser la logique skills existante inchangée.

### B. Garde anti-récidive — `src/components/TeamsEditor.tsx`
Faire **piloter `roleIndex` par le menu de rôle canonique** : sélectionner un rôle (portefeuille…
doc) fixe le `roleIndex` correspondant, au lieu d'un champ numérique libre découplé (l.459-476).
Objectif : rendre impossible, à l'édition, deux agents sur le même `roleIndex` par erreur. (Si le
champ numérique libre est conservé pour un cas avancé, ajouter au minimum un contrôle/warning
d'unicité ; mais l'approche menu-piloté est préférée.)

## Tests
- `src/__tests__/useTeams.test.ts` : partir d'une team `iakaframe` stale (`Aragorn.roleIndex=2`,
  `royaume="doc"`, `coordinator="gandalf"`), appeler le reconcile → asserter (1) `changed===true` ;
  (2) `aragorn.roleIndex===1`, `royaume` canonique, aucun `roleIndex` dupliqué parmi les agents
  canoniques ; (3) `coordinator==="aragorn"` ; (4) un agent custom (id hors `DEMO_TEAM`) **inchangé** ;
  (5) une team catalogue (ex. `lotr`) **non touchée**.
- `src/__tests__/teamAvatar.test.ts` : figer le contrat — `makeAvatarResolver("studio-clair","lotr",
  agents)` : deux agents à `roleIndex` distincts → **URLs distinctes** ; même `roleIndex` → mêmes
  URLs ; après réalignement, `resolve("Aragorn")` finit par `lotr/aragorn.webp` ≠ `resolve("Gandalf")`.
- `TeamsEditor` : sélectionner un rôle met à jour `roleIndex` (garde B).

## Gardes
Front seul (aucun Rust). Façade unique D7, présentationnel D8, i18n parité si libellé UI nouveau
(garde B), CSP intacte. Réparation strictement bornée à `DEFAULT_TEAM_ID` + agents canoniques.

## Vérification
`npm run typecheck` + `lint` + `test` verts. Recette : au relancement, Aragorn affiche
`lotr/aragorn.webp`, Gandalf `lotr/gandalf.webp` (distincts) dans roster + chat.
