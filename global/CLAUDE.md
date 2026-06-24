# Instructions globales — Méthode iakaframe par défaut

> Lu dans **toutes** les sessions Claude Code de Stéphane.
> Référence complète : `C:\work\iakaframe\` (`methode-de-travail.md`, `kit-claude/`).

## Méthode de travail par défaut

Stéphane travaille selon la méthode **iakaframe** : trois acteurs, zéro chevauchement.

- **Stéphane** = décideur (vision, arbitrages, validation, test réel).
- **Cowork** (Claude réflexion) = analyse en lecture seule + rédige les instructions
  dans `specs/instructions/`. **Ne modifie jamais le code.**
- **Claude Code** (Claude exécution) = lit l'instruction AVANT chaque tâche, code,
  build, teste, commite.

Cycle d'une feature : besoin → analyse → discussion → **instruction écrite** →
validation → implémentation → test & feedback → boucle.

## Commande « init iakaframe »

> **Les deux commandes s'auto-détectent** (via l'API Forgejo) : `init iakaframe` sur un
> dépôt **déjà présent sur Forgejo** bascule en `update` ; `update iakaframe` sur un
> dépôt **absent de Forgejo** (ou sans git local) bascule en `init`. On peut donc taper
> indifféremment l'une ou l'autre — le bon comportement est choisi automatiquement.

Quand Stéphane dit **« init iakaframe »** (ou « initialise/lance iakaframe ») dans un
répertoire, regarder le contenu du répertoire et choisir la branche :

### A. Répertoire VIDE → nouveau projet
1. Créer le projet avec le **nom du répertoire** comme nom de dépôt :
   `pwsh C:\work\iakaframe\iakaframe-onboard.ps1` (structure + dépôt Forgejo + 1er commit +
   état des lieux v0.1.0 + push). Token via `$env:FORGEJO_TOKEN`.
2. Remplir avec Stéphane `CLAUDE.md` (stack, commandes, backlog) et `specs/PROJET.md`
   (vision, décisions).
3. Pour chaque feature : rédiger `specs/instructions/<feature>.md` avant de coder.

### B. Répertoire avec DÉJÀ du dev → reprise + lancement de la méthode
1. **Ne rien écraser.** Déployer la structure autour du code existant + brancher
   Forgejo si pas de remote : `pwsh C:\work\iakaframe\iakaframe-onboard.ps1` (init est
   non destructif ; si un `origin` existe déjà, garder celui-ci).
2. Générer l'état des lieux de **reprise** :
   `pwsh C:\work\iakaframe\iakaframe-snapshot.ps1 -Reason reprise`.
3. **Lire `specs/etat-des-lieux.md`**, en faire une synthèse à Stéphane (où on en est,
   commits récents, arbre propre/sale) et **proposer la prochaine étape concrète**.
4. Poursuivre selon la méthode (instructions écrites avant code).

Si un `CLAUDE.md` projet existe déjà, **il prime** — ne pas l'écraser ; compléter ce
qui manque (`specs/`, état des lieux) et appliquer la méthode dans le cadre existant.

## Commande iakastart / bootstrap team

Quand Stéphane dit **`iakastart`**, **`iakaframe`** ou **`odin`** — en **début** ou en
**cours** de session → **invoquer la skill `iakastart`** (bootstrap team). Cette skill
affiche le banner ASCII `IAKAFRAME` (via le CLI existant) + le **roster des 8 agents** (odin,
aragorn, gandalf, gimli, legolas, helm, loki, nathalie) et **rend les agents prêts à
dispatch — sans en spawner aucun**.

- **Sans hook** : le déclenchement repose uniquement sur (a) le champ `description` de la
  skill (mécanisme natif de découverte/invocation de skill) et (b) la présente règle du
  `CLAUDE.md` global. **Aucun hook, watcher, daemon ni commande slash custom.**
- Les alias `iakaframe` et `odin` mènent à la **même** skill `iakastart` ; `odin` conserve
  **en plus** sa posture portefeuille via la skill `iakaframe-odin` (inchangée).

## Dépôt git par défaut : Forgejo (iakabox)

Remote par défaut de tout projet : **Forgejo sur le LAN iakabox**,
`http://192.168.2.11:3001/sjupin/<repo>.git`, **HTTP + token** (SSH inutilisable).
Token jamais en dur ni commité : `$env:FORGEJO_TOKEN`, ou intégré dans le `.git/config`
local. Création de dépôt via l'API (description **ASCII uniquement**). Détails et
usage : `C:\work\iakaframe\iakabox-usage.html`.

## Cycle de documentation (état des lieux)

Régénérer l'état des lieux (MD + HTML) **à chaque changement de version** ET **à chaque
pause de dev / préparation de reprise** :
`pwsh C:\work\iakaframe\iakaframe-snapshot.ps1 -Reason version|pause|reprise -Note "..."`.
Le script capte les faits git ; **Cowork complète le récit de reprise** dans
`specs/etat-des-lieux.md` (ce qui vient d'être fait, ce qui reste, prochaine étape).

### Commande « update iakaframe »

Quand Stéphane dit **« update iakaframe »** (ou « update » dans un projet de la
méthode) : lancer `pwsh C:\work\iakaframe\iakaframe-update.ps1` dans le répertoire. Ça
**régénère l'état des lieux** puis fait un **commit global** (`git add -A` + commit)
et **push**. Options : `-Reason version -Version vX.Y.Z -Note "..."`, `-NoPush`.

## Conventions permanentes (tous projets)

- Échanges et doc **en français** ; code et identifiants en anglais.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** ; cloud seulement en fallback justifié.
- **Réutiliser l'existant** (infra, services, MCP) avant de réimplémenter.
- **Isolation Docker par projet** : chaque projet tourne dans sa **propre stack
  Docker** (réseau, volumes et containers nommés/préfixés par projet, ex.
  `<projet>-dev-*`) **et ses propres ports hôte distincts** (pas de collision avec
  les autres projets de la famille). Jamais de partage de stack/ressources entre projets.
- **Commits atomiques et fréquents** (conventional commits) comme filet de sécurité ;
  jamais de `git reset --hard` ni `git push --force` côté IA.
- En dev, **mocker les API** coûteuses/limitées (`specs/mock/`).
- Vérifier avant de clore une tâche : typecheck + lint + tests.
- Toute action vraiment destructive hors denylist : **demander confirmation par
  message texte avant d'agir.**
- **Identité à l'ouverture et à la clôture (double badge — la POSITION de la pastille porte
  le sens).** Règle non négociable : **tout agent qui commence un travail s'identifie ET
  annonce ce qu'il fait, et tout agent qui rend la main se ré-identifie.** L'**ouverture** =
  pastille **AVANT** le bloc (`<pastille> [ROYAUME][Nom] — <annonce>`), en **toute première
  ligne** (avant tout préambule — jamais « Cadrage terminé… » ou « Voici… » avant le badge) ;
  la **clôture** = pastille **APRÈS** le bloc (`<texte> [ROYAUME][Nom] <pastille>`). Les mots
  « START »/« STOP » (et variantes) sont **bannis** : ils sont redondants avec la position de
  la pastille. Une **délégation produit une chaîne de badges** : A ouvre et annonce qu'il
  délègue → A clôt → B ouvre et parle à la première personne, travaille, puis clôt → A rouvre
  pour restituer/commenter. Chaque agent présente donc **deux badges par intervention**
  (ouverture + clôture). Vaut pour les agents personnifiés ET pour Claude principal (Odin).
  Jamais sur les logs ni les traces.
- **Restitution en relais (verbatim, sans ventriloquie, sans interjection).** Tout
  orchestrateur (y compris **Claude principal** non personnifié) qui **relaie** le travail
  d'un subagent le **restitue SOUS le badge de l'agent émetteur** — bloc identifié, **cité
  VERBATIM** (jamais reformulé, condensé ni synthétisé), **sans le reformuler à la première
  personne** — puis ajoute son propre badge s'il commente. **Interdiction de ventriloquie** :
  on n'écrit jamais le badge d'un agent pour lui faire dire des mots qu'il n'a pas produits.
  **Chaîne sans interjection** : entre l'ouverture et la clôture du subagent B, l'orchestrateur
  ne place **aucune phrase dans sa voix** ; il ne reprend la parole **qu'après** la clôture de
  B. Jamais fondre le travail d'un subagent dans sa voix. Réf. : `methode-de-travail.md`
  § Identité → « Restitution en relais ».
