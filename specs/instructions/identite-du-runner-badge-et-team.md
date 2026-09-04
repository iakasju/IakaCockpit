# Identité du runner — la team liée pilote l'affichage, elle ne dit rien au runner

> Cadré par 🔵 Gandalf le 2026-09-04, sur un constat de **recette réelle** (`npm run tauri dev`,
> `main`@`1da102d`, pendant la recette de L37). **Aucune ligne de code écrite** : ce document est
> le seul artefact du cadrage. **Les arbitrages AR-1..AR-8 sont TRANCHÉS par Stéphane le
> 2026-09-04 : « reco »** — chacun sur la recommandation de Gandalf, soit
> AR-1 = **(b)** (injection d'identité au runner, avec le volet d'honnêteté de (a) en complément,
> F3) · AR-2 = **(a)** · AR-3 = **(a)** (pas de roster injecté) · AR-4 = **(a)** ·
> AR-5 = **(a)** (pas d'`iakastart` automatique) · AR-6 = **(a)** (royaume = id projet en
> MAJUSCULES) · AR-7 = **(a)** · AR-8 = **(b)** (attendre `teams.loaded`, garde de rendu).
> Gate P1 franchi ; le § 7 conserve les options écartées pour mémoire.

---

## 1. Le constat, verbatim

> « une equipe est affectée à robotimmo mais le badge dis "claude". et aucune trace de work de
> aragorn ou de delegztion. »

Deux symptômes énoncés ensemble : **(S1)** l'agent qui parle s'affiche « claude » au lieu du
persona de la team liée ; **(S2)** aucune trace de travail ni de délégation n'apparaît pour ce
projet.

**Reformulation** : la liaison projet↔team (L11) pilote **tout ce que le Cockpit affiche**
(interlocuteur, avatars, roster, coordinateur, allowlist, Cadre) — mais elle **ne dit rien au
runner lui-même**. Le processus `claude` lancé dans le cwd du projet ignore qu'il est censé être
Aragorn, ignore le royaume, ignore le roster. Sommé de produire un badge par un garde global, il
**en invente un**.

---

## 2. Ce qui a été établi PAR LECTURE (aucun de ces points n'est supposé)

### 2.1 — La chaîne du libellé affiché

| Élément d'écran | Ligne exacte | Ce qu'il rend |
|---|---|---|
| `.ct-agent` (convhead) | `src/views/WorkingView.tsx:473` | `active.agent` = **persona** de la conversation |
| `.ct-runner` (convhead) | `src/views/WorkingView.tsx:476-481` | `coordinateur · kind · modèle` — `kind` vaut `claude-code` |
| bulle assistant `.bwho` | `src/components/Chat.tsx:297,306` | `turn.agent ?? agent` → à défaut, le **persona** |
| ligne d'événement `.evagent` | `src/components/Chat.tsx:273,279` | `turn.agent ?? null` → **rien** si le tour n'est pas attribué |
| Roster | `src/components/Roster.tsx:138` | `m.agent` = noms de la **team liée** |
| Panneau Tâches | `src/components/TasksPanel.tsx:66,79` | `task.agent` = `subagent_type` d'une **délégation** |
| Couloirs / arbre | `src/views/WorkingView.tsx:589-604` | `activeRunner.coordinator` = **coordinateur de la team** |

Le persona vient de `App.tsx:485,501` (`teams.coordinatorOf(team)?.name` passé à
`openConversation`) et de `App.tsx:452` (`coordinator: coord?.name ?? "—"`). **Aucun de ces sept
points de rendu ne peut produire la chaîne « claude »** : la seule occurrence du mot dans le front
est le *kind* de runner `claude-code` (`src/hooks/useTeams.ts:34`) et le nom du binaire côté Rust
(`src-tauri/src/terminal.rs:316`). Un balayage `rg -i claude src/` le confirme : **zéro libellé
d'agent « claude »**.

### 2.2 — D'où vient RÉELLEMENT « claude » : la ligne exacte

Elle **n'est pas dans le dépôt**. Le badge est écrit **par le runner lui-même**, et le Cockpit le
reproduit VERBATIM (c'est son contrat : `src/hooks/runnerView.ts:8-16`, « le badge
`[ROYAUME][Agent]` éventuel est DANS le texte, verbatim, jamais reformulé »).

**Mesure, transcript de la session robotimmo**
`~/.claude/projects/-Users-sjupin-work-robotimmo/816a58e9-c419-4496-9439-ae8399bb8cf3.jsonl`
(claude **2.1.260**, `cwd:/Users/sjupin/work/robotimmo`, `gitBranch:main`, 2026-09-04T18:43) :

- **ligne 28** — `"role":"user","content":"Stop hook feedback:\n[node
  /Users/sjupin/.claude/identity-guard.mjs]: Garde d'identite iakaframe : badge manquant …"` ;
- **ligne 31** — la réponse suivante de l'assistant : `"type":"text","text":"🔵 [PROJET][Claude] —
  État du projet…"` ;
- **ligne 39** — `"🔵 [PROJET][Claude] — Pousser les 26 commits en attente"` ;
- **ligne 44** — clôture `"…[PROJET][Claude] 🔵"`.

**La ligne qui produit « claude » est donc la ligne 31 du transcript, écrite par le runner** — pas
une ligne de `src/`. Le Cockpit n'a fait que l'afficher fidèlement.

Deux erreurs dans ce badge, pas une : le **nom** (`Claude` au lieu du persona) *et* le **royaume**
(`PROJET`, un mot générique, là où la règle de la méthode impose le **nom du projet** —
`[ROBOTIMMO]`). Le runner a rempli un gabarit sans en connaître les valeurs.

### 2.3 — Pourquoi il l'invente : ce que le Cockpit lui dit, exhaustivement

`src-tauri/src/terminal.rs:337-358` (`chef_args`) — les **seuls** arguments passés à `claude` :
`--session-id`, `--model`, `--allowedTools`, `--append-system-prompt`. Ce dernier porte :

1. `COORDINATOR_OBLIGATION` (`terminal.rs:324-327`) : *« En tant que coordinateur de l'équipe :
   AVANT d'exécuter, établis le plan des étapes avec l'outil TodoWrite… »* — **elle nomme une
   fonction, jamais une identité** : ni persona, ni royaume, ni pastille, ni roster ;
2. puis, seulement si un Cadre existe, `systemPromptExtra` dérivé de L22-P3
   (`src/frame/enforcement.ts:96-129` : obligations + paragraphes de skills + brief + chaîne de
   délégations). Sur robotimmo : **vide**, car `App.tsx:444` exige
   `frame.frame.teamId === team.id` et `useFrame` (`App.tsx:116`) ne charge que le Cadre de la
   **team par défaut**.

Conclusion, mesurée et non déduite : **le runner reçoit une obligation de rôle et rien d'autre.**
Il n'a aucun moyen de connaître son nom.

### 2.4 — Le garde d'identité ne contrôle que la FORME

`~/.claude/identity-guard.mjs:41` construit son motif comme
`"\\[[^\\]]+\\]\\s*" + emph + "\\s*\\[[^\\]]+\\]"` : **n'importe quels** crochets font l'affaire. Il
vérifie qu'un badge existe et **où** il est posé ; il ne vérifie **jamais** que le royaume et
l'agent sont réels. `[PROJET][Claude]` passe donc au vert. **Rien, nulle part, ne relie le badge à
la team.**

### 2.5 — Les deux rosters sont deux univers disjoints

- Côté runner : `~/.claude/agents/*.md` = **10 contrats** (odin, aragorn, gandalf, gimli, legolas,
  charon, helm, loki, nathalie, feanor). Ils sont **globaux**, donc déjà disponibles dans
  robotimmo — la ligne 8 du transcript les liste.
- Côté Cockpit : `useTeams` porte la team `iakaframe` (graine `DEMO_TEAM`, 10 agents alignés au
  réservoir depuis L39) **plus les 11 teams du catalogue iakagraph** (`teamFromCatalog`,
  `useTeams.ts:229-250`) dont les agents s'appellent *Optimus Prime*, *Beast*, *Captain America*…
  et **n'ont aucun contrat côté runner**.
- `~/.claude/delegation-guard.mjs:34-44,78-80` **REFUSE** (exit 2) tout `subagent_type` hors du
  roster iakaframe et de la liste des natifs. Une délégation vers *Optimus Prime* serait donc
  **refusée par le hook**, en plus d'être introuvable.

**Conséquence de cadrage** : dire au runner « voici ton équipe » n'est pas anodin — pour 11 des 12
teams sélectionnables, ce serait une **fausse donnée**, et elle serait rejetée par un garde.

### 2.6 — Ce que la session robotimmo contient vraiment (S2)

- `"subagent_type"` : **0 occurrence**. **Aucune délégation n'a eu lieu.**
- `tool_use` : **3** (lignes 16, 17, 40 : `Bash`, `Read`, `Bash`). **Le runner a bien travaillé.**
- L'utilisateur a envoyé deux messages : `"status"` (ligne 6) et `"pousse"` (ligne 35).
- **Aucun `TodoWrite`** malgré l'obligation L19 — le plan n'a pas été posé.

Or `runnerView.ts:54-59` produit un tour `geste` **sans `agent`**, et `Chat.tsx:273` n'affiche
`.evagent` que si `turn.agent` est défini. Le travail du coordinateur apparaît donc dans le fil,
mais **anonyme** ; et les trois vues « qui travaille » (Tâches, Arbre, Couloirs) ne montrent **que
des délégations**. Il n'existe, dans toute l'app, **aucun endroit où le travail propre du
coordinateur soit attribué à son nom**.

### 2.7 — Fait qui **contredit** une lecture naïve du constat

`--allowedTools` **n'est pas** une restriction : c'est une **pré-approbation** de permissions ; les
outils absents de la liste restent disponibles (sources § 12). Donc l'allowlist
`"Read,Glob,Grep,Bash"` (`terminal.rs:52`), qui ne contient ni `Agent`/`Task` ni `TodoWrite`,
**n'explique pas** l'absence de délégation. L'explication est plus simple et plus sévère : **le
runner n'a jamais eu l'idée de déléguer, parce qu'il ne se sait pas coordinateur d'une équipe.**

### 2.8 — Fait de schéma, relevé au passage (claude 2.1.260)

Les tours de sous-agents ne vivent plus dans le transcript parent : ils vivent dans
`<projet>/<session-id>/subagents/agent-*.jsonl`, accompagnés d'un `.meta.json`
(`{"agentType","description","toolUseId","spawnDepth"}`). **Mesure** : le transcript parent
`c6927602-….jsonl` contient **0** `"isSidechain":true`. Le `tool_use` de délégation reste bien
`"name":"Agent"` avec `subagent_type` (vérifié sur `toolu_01Dw5hfe…`), et
`toolUseResult.outputFile` existe toujours — **L10/L30 ne sont pas cassés**.

Conséquence utile ici : **le transcript parent est désormais, à coup sûr, le fil propre du
coordinateur**. Attribuer ses gestes au persona n'est donc pas une supposition — c'est un fait de
structure.

---

## 3. Verdict : UN défaut, UNE conséquence, UN comportement correct

Le mandat demandait de trancher. Réponse en trois lignes, dans cet ordre :

1. **S1 est un vrai défaut**, et c'est le seul défaut de fond : *le Cockpit ne dit jamais au runner
   qui il est*. Preuve : § 2.2 (le badge inventé) + § 2.3 (l'inventaire exhaustif de ce qui est
   injecté).
2. **« aucune délégation » est un comportement CORRECT** : la session ne contient aucune
   délégation (§ 2.6), donc les widgets n'ont rien à montrer, et ils ne montrent rien. **On ne
   fabrique pas un lot pour ça.** Sa *cause* est S1 — un chef nu ne délègue à personne.
3. **« aucune trace de work d'Aragorn » est un petit défaut d'ATTRIBUTION, réel et distinct** : le
   travail a eu lieu (3 gestes) mais n'est attribué à personne (§ 2.6). Il est bon marché à
   corriger — **et il ne se corrige honnêtement qu'APRÈS S1** : attribuer à « Aragorn » les gestes
   d'un runner qui se croit « Claude » serait fabriquer une donnée.

---

## 4. Rapport au différé « chef nu vs team » (L10)

Le backlog trace, depuis L10 : *« modèle chef nu vs team : le chef = `claude` générique, pas la
team iakaframe (faut-il auto-`iakastart` ? rapport persona/roster ↔ chef réel ?) »* (différé (c)),
et *« Stop hook `identity-guard` se déclenche sur le chef — à neutraliser ou assumer »* (différé
(d)).

**Ce lot est la MOITIÉ du différé (c), et il matérialise (d) sur pièce.** Précisément :

- L11 est marqué « **dissout le différé (c) L10** ». La mémoire qui porte cette décision
  (`runner-choix-par-slot-conversation`, 2026-06-27) montre ce qui a été dissous — la **question du
  moteur** : « le runner se choisit par slot, pas attaché au rôle ». Elle écrit aussi, noir sur
  blanc : *« Le rôle/persona devient une **étiquette posée sur le slot**, indépendante du moteur
  qui tourne dessous »*. **C'est exactement l'état actuel — et c'est exactement le défaut** :
  l'étiquette n'existe que du côté Cockpit.
- La **seconde moitié** de (c) — « rapport persona/roster ↔ chef réel » — **n'a jamais été
  traitée**. C'est le présent lot.
- Le différé (d) s'est produit tel quel : le hook global a mordu sur le chef nu (transcript ligne
  28), et le chef a répondu en inventant. **On ne le neutralise pas** : on lui donne enfin de quoi
  répondre juste.
- Ce lot **n'est pas** la troisième moitié — « faut-il auto-`iakastart` ? » et « le chef a-t-il une
  équipe ? » restent ouverts et sont portés par AR-3 et AR-5, **non tranchés**.

**Ce que L11 et L22-P3 ont déjà câblé, et ce qui manque exactement.** L11 résout la team, le
coordinateur, l'allowlist, les avatars, le roster ; L22-P3 ouvre un **canal d'injection vers le
runner** (`systemPromptExtra` → `--append-system-prompt`, `App.tsx:444-448` →
`WorkingView.tsx:703` → `PtyTerminal.tsx:159` → `usePty.openRunner` → `terminal.rs:344-347`). **Le
chemin est donc déjà entièrement câblé.** Ce qui manque tient en une phrase : **personne n'y met
l'identité**. Ce n'est donc **ni** un défaut d'affichage (le persona est parfaitement connu et
affiché côté Cockpit) **ni** un chantier d'architecture : c'est un **défaut de fond à coût de
plomberie nul** — le runner ne sait pas qui il est, et le tuyau pour le lui dire existe.

---

## 5. Décision proposée

**Donner au runner une carte d'identité dérivée de la team liée, par le canal qui existe déjà, et
rien de plus.**

- Un module **pur** compose un préambule d'identité à partir de trois données déjà résolues : le
  **persona** (coordinateur de la team liée, ou nom du slot d'agent), le **royaume** (id du projet
  en MAJUSCULES — cf. AR-6) et la **pastille** du rôle.
- Ce préambule est **préfixé** à `systemPromptExtra` (jamais substitué : L19 et le Cadre L22-P3
  restent intacts, cf. CA-8).
- Les lignes d'événement du fil top-level sont **attribuées au persona** (§ 2.8 le rend sûr), de
  sorte que le travail du coordinateur cesse d'être anonyme.
- **Zéro fausse donnée** : sans team liée, sans coordinateur résolu, ou sur une conversation
  `attached` (le runner n'est pas le nôtre), **on n'injecte rien et on n'attribue rien** — on le
  dit.

Ce que la décision **refuse délibérément** : réécrire le badge côté Cockpit (ce serait de la
ventriloquie — on écrirait un badge que l'agent n'a pas produit), injecter le roster, router quoi
que ce soit.

---

## 6. Périmètre FERMÉ

### F1 — Carte d'identité du runner (cœur du lot)

Module **pur**, sans I/O ni React (modèle `src/frame/enforcement.ts`) :

```
identityPreamble({ persona, royaume, pastille }) : string   // "" si une donnée manque
```

Le texte énonce, en français, dans cet ordre : **qui tu es** (nom + royaume), **la forme du badge**
(pastille AVANT le bloc à l'ouverture, APRÈS à la clôture — la position porte le sens, les mots
« START »/« STOP » sont bannis), et **rien d'autre**. Il ne redit pas l'obligation L19, ne liste
aucun outil, ne nomme aucun autre agent (cf. AR-3).

Branchement : `App.tsx` `resolveRunner` compose `identityPreamble(...) + "\n\n" + extraDuCadre` et
le renvoie dans `ResolvedRunner.systemPromptExtra`. **Rust inchangé.** Le slot d'agent
(`App.tsx:416-431`) reçoit l'identité **de son agent**, pas celle du coordinateur.

Repli : persona absent, team absente, ou `source:"attached"` → `""` (comportement d'aujourd'hui,
zéro régression).

### F2 — Attribution du travail propre du coordinateur *(dépend d'AR-1 = injection)*

`runnerView.ts` : les tours `geste` / `activite` (et `pensee`) issus du fil **top-level** portent
désormais un `agent`. Deux formes possibles selon AR-2 ; la contrainte non négociable est que
l'attribution soit **vraie** — donc conditionnée à F1 (un runner à qui on n'a rien dit ne
« travaille » pas sous le nom d'Aragorn).

### F3 — Honnêteté d'affichage (petit, mais c'est le garde-fou)

Là où le Cockpit affiche déjà le runner (`.ct-runner`, `WorkingView.tsx:476-481`), distinguer
explicitement **« persona demandé »** de **« runner sans identité »** quand F1 n'a rien pu
injecter (attaché, pas de team, runner Codex — cf. § 6 « hors couverture »). i18n fr/en.

### F4 — Tests (cf. § 9 pour les critères et leurs contrefactuels)

Au minimum : une garde de **fonction pure** *et* une garde de **jonction** qui va de la team liée
jusqu'aux **arguments réellement passés à `ptyRunnerOpen`**. La seconde est la seule qui morde —
leçon payée le jour même sur L37-CA6 (une garde qui n'observe pas la jonction laisse passer le
défaut qui vit à la jonction).

### Hors couverture, DÉCLARÉ dans le code (pas seulement ici)

- **Runner `codex`** : `codex_args` (`terminal.rs:387-394`) ne passe **aucun** system-prompt.
  L'identité **ne peut pas** y être injectée. Condition de levée : que le CLI `codex` expose un
  équivalent de `--append-system-prompt`. À écrire dans le module, pas dans un rapport.
- **Conversation `attached` (L25)** : la session n'a pas été lancée par nous ; son identité est
  hors de portée, définitivement.
- **Course au premier spawn** : `PtyTerminal.tsx:179-184` documente que `allowedTools` /
  `systemPromptExtra` ne s'appliquent **qu'au spawn initial** (le spawn est idempotent, l'effet
  rejoue sans respawner). Si l'identité arrive après, elle **ne s'applique jamais**. Voir AR-8 et
  CA-9.

### Explicitement HORS lot

1. **Toute orchestration multi-agent / tout routage** — hors sujet, différé de plus haut niveau.
2. **Injection du roster** ou d'un droit de déléguer (voir AR-3, et le fait bloquant § 2.5).
3. **`--agents` inline** (le CLI le supporte, § 12) : il **prime sur `~/.claude/agents/`** et
   remplacerait donc les contrats du réservoir par des personas de catalogue **sans prompt** →
   fabrication pure. Nommé, non fait.
4. **`iakastart` automatique** dans la TUI (voir AR-5).
5. **Alignement du roster Cockpit ↔ réservoir** : c'est L39, garde de parité en place, on n'y
   touche pas.
6. **Cadre par projet** (`useFrame` reste sur la team par défaut, `App.tsx:116`) — limitation
   préexistante, ce lot ne la rouvre pas.
7. **Le hook `identity-guard.mjs`** (hors dépôt) : on ne le durcit pas, on lui donne de quoi ne
   plus être satisfait par n'importe quoi.
8. **Analytics et le nouveau répertoire `subagents/` de claude 2.1.260** (§ 2.8) : **successeur
   NOMMÉ**, non traité.
9. **`CHEF_ALLOWED_TOOLS`** : ne pas y ajouter `Agent`/`TodoWrite` « tant qu'on y est » — § 2.7
   montre que ce n'est pas la cause, et ce serait un arbitrage de permissions déguisé.

---

## 7. Arbitrages — **TRANCHÉS le 2026-09-04** (décideur : « reco »)

> AR-1 = **(b)** · AR-2 = **(a)** · AR-3 = **(a)** · AR-4 = **(a)** · AR-5 = **(a)** ·
> AR-6 = **(a)** · AR-7 = **(a)** · AR-8 = **(b)**. Les options écartées sont conservées
> ci-dessous telles qu'elles ont été proposées.

### AR-1 — Affichage seul, ou injection d'identité au runner ?

- **(a)** Affichage seul : le Cockpit dit honnêtement « runner générique » à côté du persona. Coût
  quasi nul, mais le badge restera faux **dans le transcript**, donc dans le Journal, dans
  Analytics, et dans toute trace machine. On documenterait un mensonge au lieu de le corriger.
- **(b)** Injection par `--append-system-prompt` (canal L22-P3 existant). Rust inchangé.
- **(c)** Injection par `--agents` (roster complet). Voir § 6 HORS lot n°3.

**Recommandation : (b), avec le volet d'honnêteté de (a) en complément (F3).** C'est la seule
option qui répare la **cause** ; le tuyau existe déjà (§ 4), donc son coût est celui d'une chaîne
de caractères et de deux gardes. (c) fabriquerait des personas sans contrat.

### AR-2 — Portée de l'attribution côté Cockpit

- **(a)** Attribuer uniquement les **lignes d'événement** (`geste`/`activite`) du fil top-level au
  persona ; ne rien changer d'autre.
- **(b)** (a) + faire apparaître le coordinateur dans le panneau **Tâches** et dans les
  **Couloirs**, comme une barre « travail propre » distincte des délégations.
- **(c)** Ne rien attribuer (statu quo) et se contenter de F1.

**Recommandation : (a).** Elle rend visible ce qui manquait, sans inventer une sémantique de
« tâche » là où il n'y a qu'une suite de gestes. (b) est séduisant mais transforme trois widgets
dont le contrat écrit est « délégations » — c'est un autre lot. **Ne pas toucher** au titre des
onglets (`ProjectTabs.tsx:105` = nom du projet), qui est juste.

### AR-3 — Injecte-t-on le roster / le droit de déléguer ?

- **(a)** Non : identité seule.
- **(b)** Oui, mais seulement si **tous** les agents de la team ont un contrat au réservoir.
- **(c)** Oui, systématiquement.

**Recommandation : (a).** Fait bloquant § 2.5 : pour 11 des 12 teams, les noms n'existent pas côté
runner et `delegation-guard.mjs` **refuserait** la délégation (exit 2). (c) fabriquerait des
équipes fantômes ; (b) introduit une règle conditionnelle invisible pour l'utilisateur (« pourquoi
cette team délègue et pas celle-là ? »). Si le décideur veut la délégation réelle, elle mérite son
propre lot, avec la réconciliation des deux rosters comme préalable.

### AR-4 — Projet SANS team liée

- **(a)** Aucune injection, aucun affichage de persona, mention neutre.
- **(b)** Injecter le coordinateur de la **team par défaut**.

**Recommandation : (a).** `teamForProject` (`useTeams.ts:450-459`) retombe **silencieusement** sur
la team par défaut : (b) écrirait donc « tu es Aragorn » à un projet que personne n'a lié. Zéro
fausse donnée. *(Note de lecture : les deux chemins d'ouverture filtrent déjà sur `hasBinding` —
`App.tsx:513` et `App.tsx:558` — donc le cas est rare ; il n'est pas impossible.)*

### AR-5 — `iakastart` automatique au lancement du runner ?

- **(a)** Non.
- **(b)** Oui : écrire `iakastart\r` dans le PTY après le spawn.

**Recommandation : (a).** Trois raisons : c'est une **écriture dans un stdin**, donc un geste à
effet de bord non idempotent (double spawn StrictMode, re-frappe au remontage) ; son contenu est un
**roster**, donc il retombe sur le fait bloquant d'AR-3 ; et il volerait le premier tour de la
conversation à l'utilisateur. À reconsidérer **seulement** si AR-3 devient (b) ou (c).

### AR-6 — Que met-on dans le royaume du badge ?

- **(a)** L'**id du projet en MAJUSCULES** (`[ROBOTIMMO]`).
- **(b)** `agent.royaume` tel que stocké.
- **(c)** Le nom de la team.

**Recommandation : (a), fermement.** La règle de la méthode est *royaume = contexte = nom du
projet ou PORTEFEUILLE* (mémoire `badge-royaume-egale-contexte-projet-ou-portefeuille`, 2026-07-13,
« ne jamais inventer de royaume de personnage »). Or **(b) produirait un badge faux** : côté
Cockpit `agent.royaume` porte la **clé de rôle** (`demoTeam.ts:46-55` : `coordination`,
`architecture`…), et `teamBadge()` (`demoTeam.ts:85-87`) rend donc `[COORDINATION][Aragorn]` —
c'est déjà un écart avec la méthode, hérité et **non traité par ce lot**, mais qu'il ne faut
surtout pas propager jusqu'au runner.

### AR-7 — Que dit-on sur une conversation `attached` (L25) ?

- **(a)** Badge « session vivante · lecture seule » enrichi d'une mention « identité non garantie
  (session externe) ».
- **(b)** Rien de plus qu'aujourd'hui.

**Recommandation : (a).** C'est exactement le cas où l'utilisateur verra un badge étranger sans
comprendre pourquoi ; une mention coûte une clé i18n.

### AR-8 — Comment ferme-t-on la course au premier spawn ?

- **(a)** Ne rien faire : accepter que l'identité manque si la team n'est pas encore chargée
  (limitation identique à celle de L22-P3, déjà documentée).
- **(b)** Retarder le montage du `PtyTerminal` tant que `teams.loaded` est faux.
- **(c)** Respawner si l'identité arrive après (**exclu d'office** : casse la garde L10, tue le
  process `claude`).

**Recommandation : (b).** Le coût est une garde de rendu ; le bénéfice est qu'une identité arrivée
en retard n'est pas silencieusement perdue **pour toute la vie de la session** — précisément le
genre de faux vert que ce dépôt refuse. (a) est tolérable mais reconduit un défaut connu ; si (a)
est retenu, la limitation doit être **écrite dans le code**, avec sa condition de levée.

---

## 8. Risques

| Risque | Mitigation |
|---|---|
| **Le préambule contredit l'obligation L19 ou le Cadre** (deux voix dans le même prompt) | Ordre imposé : L19 (Rust) → identité → Cadre. Le préambule ne parle **que** d'identité. CA-8 le mesure. |
| **Le runner reçoit une identité mais ne la respecte pas** (le LLM n'est pas déterministe) | Le lot ne peut pas le garantir, et **ne le prétendra pas** : les CA hors ligne mesurent ce qui est **envoyé** ; ce qui est **écrit** par le runner est une **recette réelle**, gate humain (CA-10). Ne jamais écrire « le badge est correct » sur la foi d'un test unitaire. |
| **Identité arrivée après le spawn → jamais appliquée** | AR-8 ; CA-9. |
| **Attribution mensongère** (F2 sans F1) | F2 est **conditionné** à AR-1 = (b). CA-6. |
| **Régression de la garde L10** (un respawn tuerait la session) | CA-9 : aucun démontage, aucun second `ptyRunnerOpen` pour un même `sessionId`. |
| **Propagation du royaume faux** (`[COORDINATION][…]`) | AR-6 = (a) ; CA-5 avec contrefactuel explicite. |
| **Le préambule fuit un secret** | Il ne lit que `name`, `id de projet`, `roleIndex` — aucune clé, aucun chemin. Invariant L11 § 3 préservé. |

---

## 9. Critères d'acceptation

> Règle du dépôt, rappelée : **toute garde doit pouvoir rougir**. Chaque CA porte son
> **contrefactuel** — la mutation, faite **dans le programme** (jamais dans l'attendu), qui doit le
> faire échouer **nommément**, puis être **révoquée avec preuve** (`git diff` vide ou `sha256`
> identique).

- [ ] **CA-1 — Le préambule est une fonction pure et déterministe.** Mêmes entrées → même
      chaîne, à l'octet. *Vérif* : test unitaire. *Contrefactuel* : y introduire une date /
      `Math.random` → le test rougit.
- [ ] **CA-2 — JONCTION : une team liée aboutit aux arguments réellement passés au spawn.**
      *Vérif* : monter le front avec une façade de substitution, ouvrir un projet lié, et asserter
      que **`ptyRunnerOpen` a reçu** un `systemPromptExtra` contenant le nom du persona **et**
      `[<PROJET-EN-MAJUSCULES>]`. *Contrefactuel* : retirer la composition dans `resolveRunner`
      (`App.tsx`) → **ce test-là, et lui seul, rougit nommément**. **C'est le CA qui compte** :
      CA-1 seul serait exactement le témoin vide de L42-F1.
- [ ] **CA-3 — Rust : l'ordre du system-prompt est L19 PUIS l'extra.** *Vérif* : test sur
      `chef_args` — l'obligation L19 précède l'identité, séparées par une ligne vide, aucun
      caractère perdu. *Contrefactuel* : inverser l'ordre → rouge.
- [ ] **CA-4 — Slot d'agent : c'est l'identité DE L'AGENT, pas celle du coordinateur.** *Vérif* :
      un slot lancé pour Gimli reçoit « Gimli ». *Contrefactuel* : faire retomber la branche `slot`
      sur le coordinateur → rouge.
- [ ] **CA-5 — Le royaume est l'id du projet en MAJUSCULES.** *Vérif* : `robotimmo` →
      `[ROBOTIMMO]`. *Contrefactuel* : utiliser `agent.royaume` → rouge, **en montrant la valeur
      fautive** (`COORDINATION`) dans le message d'échec.
- [ ] **CA-6 — Zéro fabrication.** Sans team liée / sans coordinateur / conversation `attached`
      → `systemPromptExtra` **inchangé** (aucune identité) **et** aucune attribution de geste.
      *Contrefactuel* : injecter un nom par défaut → rouge.
- [ ] **CA-7 — Non-régression L22-P3.** Avec un Cadre applicable, le texte du Cadre est **toujours
      présent, intégralement**, après l'identité. *Contrefactuel* : remplacer au lieu de préfixer →
      rouge (le brief du Cadre disparaît).
- [ ] **CA-8 — Attribution honnête (F2).** Un event `geste` du fil top-level produit un tour porté
      par le persona ; le rendu l'affiche (`.evagent`). *Contrefactuel* : retirer l'attribution →
      rouge. **Second contrefactuel** : neutraliser F1 (aucune identité injectée) → l'attribution
      **doit** disparaître aussi, sinon on affiche un nom que le runner ne porte pas.
- [ ] **CA-9 — Garde L10 intacte.** Aucun `PtyTerminal` démonté, **un seul** `ptyRunnerOpen` par
      `sessionId`, y compris quand `systemPromptExtra` change après coup. *Contrefactuel* : retirer
      l'idempotence de `usePty.spawnRef` → rouge (double spawn observé).
- [ ] **CA-10 — RECETTE RÉELLE (gate humain, NON mesurable hors ligne).** Sur un projet lié, dans
      `npm run tauri dev` : poser une question, puis **relire le transcript sur disque** et
      constater que le badge écrit est `[<PROJET>][<Persona>]` et non `[PROJET][Claude]`.
      **Ce critère n'est pas couvert par les tests, et ne sera jamais annoncé comme couvert** : ce
      qu'un LLM écrit ne se prouve pas par un test unitaire.
- [ ] **CA-11 — Hors couverture écrit dans le code.** `codex` (pas de system-prompt) et `attached`
      (runner externe) portent, **dans le fichier concerné**, leur motif et leur condition de
      levée. *Vérif* : lecture. *Contrefactuel* : aucun — c'est une exigence de forme, assumée
      comme telle.
- [ ] **CA-12 — `bash scripts/quality.sh` exit 0**, front + Rust, chiffres **recomptés** (jamais
      recopiés d'un rapport antérieur).

---

## 10. Fichiers concernés

| Chemin | Ce qui change |
|---|---|
| `src/frame/identity.ts` *(neuf)* | Module **pur** : composition du préambule d'identité + bornes déclarées (codex, attached). |
| `src/App.tsx` (`resolveRunner`, ~411-458) | Compose identité + extra du Cadre ; branche coordinateur **et** slot d'agent. |
| `src/hooks/runnerView.ts` (~54-72) | F2 : attribution des tours `geste`/`activite` du fil top-level *(dépend d'AR-1/AR-2)*. |
| `src/views/WorkingView.tsx` (~476-481) | F3 : mention honnête quand aucune identité n'a pu être injectée. |
| `src/i18n/locales/{fr,en}.ts` | Libellés F3/AR-7 (parité fr/en testée). |
| `src/__tests__/…` | CA-1, CA-2 (jonction), CA-4..CA-9. |
| `src-tauri/src/terminal.rs` | **Aucun changement de comportement** ; au plus un test CA-3 sur `chef_args`. |
| `CLAUDE.md` | Entrée de backlog du lot + rectification **datée** si un énoncé antérieur est contredit. |

---

## 11. Estimation — jalon P1→P2

- **Équivalent jour-homme (spec fermée)** : **1 à 1,5 j-homme**.
  Répartition : F1 + branchement ≈ 0,3 j ; F2 ≈ 0,2 j ; F3 + i18n ≈ 0,1 j ; **tests + les onze
  contrefactuels ≈ 0,5 à 0,7 j** (c'est le poste principal, et c'est normal dans ce dépôt) ;
  rédaction du hors-couverture + backlog ≈ 0,2 j.
- **Complexité / risque** : **faible en code, moyen en vérification.** Le tuyau existe (§ 4), Rust
  n'est pas touché, aucune dépendance ajoutée. Le risque n'est pas de casser : il est d'écrire une
  garde tiède (CA-1 sans CA-2) et de croire le lot couvert.
- **Inconnues susceptibles de faire glisser l'estimation** :
  1. **AR-1** — si (c) est choisi, ce n'est plus le même lot (+3 à 5 j, et il faut d'abord
     réconcilier les deux rosters) ;
  2. **AR-3** — si le roster est injecté, il faut trancher le sort des 11 teams catalogue (+1 j
     minimum, plus un arbitrage produit) ;
  3. **AR-8 = (b)** — retarder le spawn touche à la garde L10, la plus sensible du dépôt : compter
     +0,3 j de vérification, pas de code ;
  4. **CA-2** — si la jonction s'avère non exerçable sans monter l'App entière, il faudra un
     harnais (cf. `src/__tests__/updateJunction.test.tsx`, précédent utile) : +0,2 j ;
  5. **CA-10** — recette réelle : dépend d'une session du décideur, hors du temps agent.

*Ce n'est pas un engagement ferme : un ordre de grandeur assumé et révisable, à confronter au temps
réel à la clôture du lot.*

---

## 12. Sources externes citées (vérifiées le 2026-09-04)

- **`--allowedTools` pré-approuve, il ne restreint pas** (fonde § 2.7) —
  [ClaudeLog, « What is --allowedTools »](https://claudelog.com/faqs/what-is-allowed-tools-in-claude-code/) ·
  [anthropics/claude-code#62608, demande d'un mode allowlist exclusif](https://github.com/anthropics/claude-code/issues/62608) ·
  [anthropics/claude-code#18973](https://github.com/anthropics/claude-code/issues/18973)
- **`--agents` (JSON inline) existe et PRIME sur `~/.claude/agents/`** (fonde le refus § 6 HORS lot
  n°3) — [Claude Code Docs, « Create custom subagents »](https://code.claude.com/docs/en/sub-agents) ·
  [The Prompt Shelf, référence subagents 2026](https://thepromptshelf.dev/blog/claude-code-subagents-complete-reference-2026/)

**Faits internes, mesurés et non sourcés sur le web** (§ 2.2, 2.5, 2.6, 2.8) : transcripts
`~/.claude/projects/`, hooks `~/.claude/{identity-guard,delegation-guard}.mjs`, contrats
`~/.claude/agents/*.md`. Claude Code **2.1.260** (valeur lue dans le transcript). Toute conclusion
de ce document liée au schéma du transcript est **relative à cette version**.
