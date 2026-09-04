# Pastille du badge du runner — la source existe, le Cockpit ne la lit pas

> Cadré par 🔵 Gandalf le 2026-09-04, sur un constat de **recette réelle** du lot précédent
> (`specs/instructions/identite-du-runner-badge-et-team.md`, L46, livré et fusionné `main`@`b376516`).
> **Aucune ligne de code écrite** : ce document est le seul artefact du cadrage. **Les arbitrages
> AR-1..AR-7 sont TRANCHÉS par Stéphane le 2026-09-04 : « reco »** — chacun sur la recommandation
> de Gandalf, soit AR-1 = **(a)** table embarquée indexée par rôle + garde de parité ·
> AR-2 = **(a)** défaut explicite · AR-3 = **(a)** pastille du RÔLE, **(b)** rien si le rôle est
> inconnu · AR-4 = **(a)** montrer le badge assemblé · AR-5 = **(a)** corriger, pas se taire ·
> AR-6 = **(a)** étendre la garde de parité du réservoir · AR-7 = **(a)** nommer `phasePastille`.
> Gate P1 franchi ; le § 6 conserve les options écartées pour mémoire.

---

## 1. Le constat, verbatim

> « le badge affiche bien [ROBOTIMMO][Aragorn] mais la pastille est remplaxcéée par un icone de
> deux épées »

**Reformulation** : le lot précédent a réussi sur l'essentiel — le runner écrit désormais le bon
**nom** et le bon **royaume**, et il respecte la **position** de la pastille. Il échoue sur le seul
point où le Cockpit lui a fourni une donnée **de remplissage** au lieu d'une donnée **vraie** : la
pastille. Le Cockpit injecte `•` (`src/frame/identity.ts:40`, `DEFAULT_IDENTITY_PASTILLE`) ; le
runner rend `⚔️`.

---

## 2. Ce qui a été établi PAR LECTURE (aucun de ces points n'est supposé)

### 2.1 — La mesure du symptôme, sur pièce

Transcript `~/.claude/projects/-Users-sjupin-work-robotimmo/9a3a2dbc-e87c-4fbf-b21d-5345c7a6ba4d.jsonl`,
**ligne 24**, claude **2.1.261** (valeur lue dans le transcript — le lot précédent mesurait 2.1.260) :

```
"text":"⚔️ [ROBOTIMMO][Aragorn] — Je suis prêt à t'aider\n\n…"
…"\n\n[ROBOTIMMO][Aragorn] ⚔️"
```

**Trois choses sur quatre sont justes**, et il faut le dire avant de parler du défaut :

| Élément du badge | Injecté par le Cockpit | Rendu par le runner | Verdict |
|---|---|---|---|
| Nom (persona) | `Aragorn` | `Aragorn` | ✅ |
| Royaume | `ROBOTIMMO` | `ROBOTIMMO` | ✅ |
| **Position** de la pastille | AVANT à l'ouverture, APRÈS à la clôture | AVANT puis APRÈS | ✅ |
| **Symbole** de la pastille | `•` | `⚔️` | ❌ |

Le lot précédent a donc **fonctionné**. Ce lot-ci corrige **une donnée**, pas un mécanisme.

### 2.2 — `⚔️` ne vient d'aucune source lisible par le runner

Balayages, **résultat nul dans les trois cas** :

- `⚔` dans `/Users/sjupin/work/robotimmo` → **0 fichier** ;
- `⚔` dans `~/.claude/**/*.md` (dont les 10 contrats d'agent) → **0 fichier** ;
- `⚔` dans `~/work/iakaframe/library/personas/` → **0 fichier**.

Le seul emblème que le corpus associe à Aragorn est **🛡️** (titre de `library/personas/aragorn.md:14`,
`# 🛡️ Aragorn — Coordinateur`). **`⚔️` n'existe nulle part dans le corpus** : le runner ne l'a pas
lu, il l'a **choisi**.

### 2.3 — Une source canonique de pastille EXISTE, et elle est complète

`~/work/iakaframe/library/personas/` : **36 fichiers `.md`**, **36 portent `pastille:` en
frontmatter**. Le champ n'est pas au même **numéro de ligne** partout (ligne 7 pour les 26 personas
de méthodes tierces, ligne 8 pour les 10 personas iakaframe, ligne 6 pour `_TEMPLATE.md`) — un parse
positionnel serait faux ; `fm_scalar` (`src-tauri/src/reservoir.rs:107-119`) est indexé par **clé**,
donc immunisé, et retire déjà les guillemets (`pastille: "🟠"` → `🟠`).

**Précision qui compte pour la couverture** : `_TEMPLATE.md` est un **gabarit**, exclu par
`md_ids` (`reservoir.rs:151-153`, `stem.starts_with('_')`). La population réelle est donc de
**35 personas, 35 pastilles**.

**Fait mesuré qui rend une indexation par rôle possible sans rien inventer** : les 35 personas
portent **35 `roleKey` deux à deux distincts**. `roleKey → pastille` est donc une **fonction**, pas
une heuristique : aucun rôle ne porte deux pastilles contradictoires.

Les 10 personas iakaframe :

| persona | `roleKey` | pastille |
|---|---|---|
| `odin` | `portefeuille` | 🟡 |
| `aragorn` | `coordination` | 🟠 |
| `gandalf` | `cadrage` | 🔵 |
| `gimli` | `dev` | 🔴 |
| `legolas` | `qualite` | 🔴 |
| `loki` | `design` | 🟠 |
| `nathalie` | `documentation` | 🟠 |
| `charon` | `deploiement` | 🟣 |
| `helm` | `surveillance` | 🟣 |
| `feanor` | `frame` | 🟠 |

(Les 25 autres personas servent d'autres méthodes — scrum, waterfall, kanban, design thinking,
lean startup, shape up, GTD — et portent des pastilles hors palette iakaframe : ⚫ pour `crowe`,
🟤 pour `faste`. Ils n'entrent pas dans ce lot, mais ils interdisent de coder une palette fermée.)

### 2.4 — `pastille` n'est PAS parsé côté Cockpit

`struct ReservoirPersona` (`src-tauri/src/reservoir.rs:33-38`) ne porte que `id` et `role_key` ;
son miroir TS (`src/api/backend.ts:858-861`) non plus. **Le champ n'a jamais été lu.** Le parseur,
lui, existe et le lirait sans modification (§ 2.3).

**Le mot « pastille » n'apparaît nulle part dans `src/` au sens du badge de phase.** Ce qu'on y
trouve porte **trois autres sens** — `.pastille` en CSS = **repli texte d'une vignette absente**
(`src/theme/app.css:907`, `src/theme/vignettes.ts:8`), « pastille d'urgence » = **L16** (`app.css:3183`),
« pastilles » en i18n = **casting `none`** (`src/i18n/locales/fr.ts:649`). Le nommage est un point
de cadrage, pas un détail (AR-7).

### 2.5 — Le Cockpit ne consomme toujours pas le réservoir à l'exécution

`readReservoir()` est exposé (`src/api/backend.ts:885`, `backend.ts:1170`) et **n'est appelé par
aucun composant, aucun hook, aucun test de `src/`** (balayage : les seules occurrences sont la
déclaration et l'export). L'entrée L39 de `CLAUDE.md` le disait ; c'est vérifié.

Le fait remonté par l'ordre de mission est confirmé : `read_reservoir` rend **`None`, jamais une
erreur**, quand aucun réservoir n'est trouvé (`reservoir.rs:86-92` + test
`racine_absente_rend_none_jamais_une_erreur`, `reservoir.rs:304-309`). **Sauf** si `IAKAFRAME_HOME`
est posé et faux — alors c'est un `Err` délibéré, « aucun repli sur un autre dépôt ».

**Conséquence de cadrage** : brancher ce lot sur `readReservoir()` ferait de lui le **premier
consommateur runtime** du réservoir, et introduirait une **lecture asynchrone dans le chemin du
spawn**. Voir § 2.7 — c'est le point technique le plus dur du lot.

### 2.6 — Les 11 teams du catalogue : le cas MAJORITAIRE, et il est traitable

`src/assets/teams/catalog.ts` (généré par `scripts/sync-vignettes.sh`) : 11 teams, **8 agents
chacune**, `roleIndex` 0..7. Leurs personas (`Optimus Prime`, `Captain America`, `Frodo Baggins`…)
**n'existent pas au réservoir** — une indexation par **nom** ne les couvrirait pas.

Mais leur `roleIndex` **porte le même sens** que celui d'`AGENT_ROLES` (`src/theme/roles.ts:38-49`),
et c'est déjà une convention **sur laquelle le code s'appuie** : `teamFromCatalog`
(`useTeams.ts:239-242`) désigne le coordinateur comme « l'agent à `roleIndex 1` ». Vérification sur
la team `lotr` (`catalog.ts:98-110`) : Galadriel 0 (portefeuille), **Aragorn 1 (coordination)**,
Gandalf 2 (architecture), Gimli 3 (fabrication), Legolas 4 (tests) — l'alignement est exact.

**Une indexation par RÔLE couvre donc 12 teams sur 12** ; une indexation par nom en couvre 1.

> ⚠️ **Défaut mineur relevé au passage, NON traité** : l'en-tête généré de `catalog.ts:5` écrit
> « l'index = roleIndex (0=portefeuille .. 7=doc) », alors que `roles.ts` place `doc` en **6** et
> `deploiement` en **7**. C'est un **commentaire de fichier généré**, sans effet d'exécution ; il
> se corrige dans `scripts/sync-vignettes.sh`, pas ici. Inscrit, pas fait.

### 2.7 — La contrainte technique dure : le spawn ne rejoue pas

`PtyTerminal.tsx:179-184` documente — et le lot précédent l'a repris en hors-couverture — que
`allowedTools` / `systemPromptExtra` **ne s'appliquent qu'au spawn initial** : le spawn est
idempotent, l'effet rejoue **sans respawner**. Une pastille qui arriverait **après** le spawn ne
s'appliquerait **jamais**, pour toute la vie de la session, **et rien ne rougirait**. C'est
exactement le faux vert qu'AR-8 du lot précédent a fermé côté teams (= (b), garde de rendu sur
`teams.loaded`).

`resolveRunner` (`App.tsx:455-524`) est aujourd'hui **entièrement synchrone**. Toute solution qui
y introduit une lecture `await` rouvre ce risque et devra le refermer explicitement.

### 2.8 — Rapport à AR-3 du lot précédent (« pas de roster injecté »)

AR-3 = (a) interdisait d'**injecter le roster** — de nommer d'autres agents au runner — pour un
motif mesuré (§ 2.5 du lot précédent) : pour 11 des 12 teams, ces noms n'existent pas côté runner
et `delegation-guard.mjs` **refuserait** (exit 2) toute délégation vers eux.

**Ce lot n'y touche pas, et ce n'est pas une réouverture déguisée** — trois raisons, dans l'ordre
de force :

1. Le texte injecté continue de **ne nommer aucun autre agent** (CA-5 du lot précédent est
   conservé et rejoué) ; on modifie **un caractère**, pas la liste des noms.
2. Ce qu'AR-3 refusait, c'est de **fabriquer une capacité** (déléguer vers des agents inexistants).
   Une pastille ne fabrique aucune capacité : c'est une marque de phase à l'écran.
3. Sous AR-1 = (a) — la recommandation ci-dessous — **le réservoir n'est même pas lu à
   l'exécution** : la table embarquée est une donnée du Cockpit, gardée par parité. Il n'y a
   littéralement rien de nouveau qui traverse vers le runner.

**Réponse nette** : compatible, et sans zone grise sous AR-1 = (a).

### 2.9 — Rapport à la garde de parité L39

`scripts/test-reservoir-parity.mjs` compare **les NOMS** du roster `teams/iakaframe-8.md` à ceux de
`src/mock/demoTeam.ts` (`test-reservoir-parity.mjs:73-93`). Elle **SKIP proprement** sans réservoir
(`exit 0`, ligne 38) et **échoue** si `IAKAFRAME_HOME` est posé mais faux (ligne 32). Elle n'est
**pas** dans `scripts/quality.sh` (8 étapes, aucune ne l'appelle) — c'est une commande à part.

Elle ne compare **aucune valeur**. Si ce lot embarque une table de pastilles sans l'étendre, cette
table devient **une copie non gardée** — précisément la dérive silencieuse que L39 a fermée pour les
noms. Voir AR-6.

### 2.10 — Pourquoi `•` n'a pas été repris : ce qui est FAIT, ce qui est HYPOTHÈSE

**FAIT** (mesuré) : le texte injecté est, mot pour mot (`src/frame/identity.ts:76-79`) :

> « Le badge attendu à chaque prise de parole adressée est [ROBOTIMMO][Aragorn]. La pastille •
> porte le sens par sa POSITION, jamais par un mot : • AVANT le bloc à l'OUVERTURE, • APRÈS le bloc
> à sa CLÔTURE. […] »

**FAIT** : cette phrase énonce une **règle sur la position** dont `•` est le *sujet*. Elle ne
demande **jamais** de reproduire ce caractère. Le badge complet **n'est jamais montré assemblé** :
`[ROBOTIMMO][Aragorn]` est donné sans pastille, et `•` est donné sans badge.

**FAIT** : le runner a suivi **tout ce qui était formulé comme une consigne** (nom, royaume,
position) et n'a pas suivi **la seule chose qui n'en était pas une** (le caractère).

**HYPOTHÈSES**, énoncées comme telles — l'intérieur du modèle n'est pas mesurable :

- **H1** — `•` se lit comme un **exemple** ou un espace réservé, pas comme une valeur. C'est
  l'hypothèse la mieux soutenue par le fait ci-dessus.
- **H2** — un **point médian typographique** n'est pas de la même famille que les pastilles du
  corpus (cercles colorés) ; le modèle, qui connaît la convention, aurait « corrigé » vers un
  glyphe qu'il juge du bon registre.
- **H3** — **association libre** Aragorn → épées. Soutenue négativement par § 2.2 : `⚔️` n'est
  lisible nulle part, donc il ne peut venir que du modèle.

**Aucune de ces hypothèses ne se tranche par une garde.** Ce qui se tranche, c'est ce que le
Cockpit **envoie** : une valeur vraie, présentée comme une valeur.

### 2.11 — Fait externe vérifié, qui oriente la formulation

La documentation de prompt engineering d'Anthropic (2026) énonce que les modèles récents
« suivent les instructions **littéralement** au lieu d'inférer l'intention » et recommande
**2 à 5 exemples concrets** plutôt que des explications, en énonçant explicitement le format de
sortie. Sources § 12. Conséquence directe : **montrer le badge assemblé** est plus fiable que
décrire une règle dont la pastille est le sujet (AR-4).

---

## 3. Verdict : le lot vaut la peine, et il est PETIT

Le mandat demande de dire si le lot vaut la peine. Réponse en trois lignes :

1. **C'est un défaut réel, pas cosmétique.** La pastille est le **seul** élément du badge qui
   encode la **phase**. Un symbole inventé ne dit rien de la phase — il informe donc **faussement**
   l'humain qui lit la trace, et il le fait dans **toutes** les traces machine (transcript,
   Journal, Analytics).
2. **La cause est identifiée et bon marché** : le Cockpit injecte une valeur de remplissage
   (`•`) « faute de source établie », alors que la source existe et est **complète à 35/35**.
   Le lot précédent a posé ce repli de bonne foi ; le gate l'a accepté comme honnête. Il était
   **faux**, et ce lot le rectifie.
3. **Il ne vaut PAS un chantier.** Rien à changer côté Rust sous la recommandation, aucune
   dépendance, aucune nouvelle commande. Ce qui coûte, c'est la **vérification** — comme toujours
   dans ce dépôt.

**Et la limite doit être écrite noir sur blanc** : on **n'oriente** pas un modèle, on ne le
**contraint** pas. La preuve en est le constat lui-même — `•` injecté, `⚔️` rendu. Toute garde
automatisable de ce lot porte donc sur **ce que le Cockpit ENVOIE**, jamais sur ce que le runner
**rend**. La fidélité du rendu est une **recette humaine** (CA-9), et elle ne sera **jamais**
présentée comme couverte : une garde qui prétendrait vérifier le rendu serait exactement le faux
vert que ce dépôt refuse.

---

## 4. Décision proposée

**Donner au préambule une pastille VRAIE, dérivée du rôle de l'agent, et montrer le badge
assemblé plutôt que d'en décrire les pièces.**

- La pastille est résolue **par la clé de rôle** de l'agent (`agent.royaume` / `roleIndex`), depuis
  une **table embarquée** alignée sur le réservoir et **gardée par parité** (AR-1, AR-6).
- Le préambule **montre** le badge d'ouverture et de clôture **complets**, pastille incluse (AR-4).
- Il présente la pastille comme la **valeur par défaut** de l'agent, en réservant le cas de la
  phase servie (AR-2) — la doctrine du corpus, et la seule formulation vraie pour les 35 personas.
- **Zéro fabrication** : rôle inconnu ⇒ **aucune pastille**, et la phrase qui la porte est
  **omise** — jamais un symbole de remplissage (AR-3 repli, CA-5).

Ce que la décision **refuse délibérément** : lire le réservoir à l'exécution dans le chemin du
spawn (§ 2.7), réécrire le badge côté Cockpit (ventriloquie), injecter la palette complète des
phases (seconde source de vérité non gardée), toucher au roster.

---

## 5. Périmètre FERMÉ

### F1 — Table de pastilles par rôle (cœur du lot)

Donnée **pure**, sans I/O, dans `src/theme/roles.ts` (là où vit déjà le vocabulaire des rôles) ou
un module voisin : `PHASE_PASTILLE_BY_ROLE: Readonly<Record<string, string>>`, indexée par
`AGENT_ROLES[].key`, valeurs **recopiées du réservoir** (§ 2.3, via `roleKeyFromReservoir` pour les
5 rôles au vocabulaire divergent). Un rôle absent de la table ⇒ **`undefined`**, jamais une valeur
de secours.

Résolveur pur : `phasePastilleFor(royaume: string, roleIndex: number): string | undefined` —
`royaume` d'abord (c'est la donnée **persistée**), `roleIndex` en repli (c'est ce que portent les
teams du catalogue dont le `royaume` est un slug MAJUSCULE, cf. `useTeams.ts:233`).

### F2 — Le préambule montre le badge assemblé

`src/frame/identity.ts` : `IdentityPreambleInput.pastille` devient `string | undefined`.

- **Définie** → le texte montre `<pastille> [ROYAUME][Persona] — <annonce>` (ouverture) et
  `<texte> [ROYAUME][Persona] <pastille>` (clôture), en disant que c'est la pastille **par défaut**
  de l'agent (AR-2).
- **Absente** → la phrase de pastille est **entièrement omise** ; le préambule conserve nom,
  royaume et **règle de position** (mesurée comme suivie, § 2.1), sans nommer aucun symbole.

`DEFAULT_IDENTITY_PASTILLE = "•"` est **supprimée** : c'est la valeur dont ce lot prouve qu'elle
n'est pas reprise, et la garder « au cas où » réintroduirait la fabrication.

### F3 — Branchement dans `resolveRunner`, SANS asynchrone

`src/App.tsx:455-524`, les **deux branches** :

- branche **coordinateur** : `coord` est déjà un `Agent` (`royaume` + `roleIndex` en main) ;
- branche **slot** : `team` est déjà résolu (`App.tsx:461`) → retrouver l'`Agent` par son nom dans
  `team.agents` pour obtenir son `royaume`/`roleIndex`. Un agent introuvable ⇒ pas de pastille
  (CA-5), jamais celle du coordinateur.

`resolveRunnerIdentity` reçoit la pastille **déjà résolue** et reste **pure et synchrone**.
**Aucun `await` n'entre dans ce chemin** (CA-8).

### F4 — Extension de la garde de parité L39 *(dépend d'AR-6)*

`scripts/test-reservoir-parity.mjs` : en plus des noms, comparer les **valeurs** — pour chaque
persona du roster `iakaframe-8`, lire `pastille` au frontmatter, traduire sa `roleKey` par
l'équivalent de `roleKeyFromReservoir`, et échouer en **nommant le rôle et les deux valeurs** si la
table embarquée diverge. SKIP propre conservé, `IAKAFRAME_HOME` autoritaire conservé.

### F5 — Tests (cf. § 9)

Une garde de **fonction pure** *et* une garde de **jonction** allant jusqu'aux arguments réellement
passés à `pty_runner_open`, avec **verrou anti-témoin-vide**. La jonction est le seul niveau qui
morde — c'est la leçon L37-CA6, puis le FAIL du lot précédent, puis L42-F1.

### Hors couverture, DÉCLARÉ dans le code (pas seulement ici)

- **Rôle sans pastille connue** (team hors réservoir dont le `roleIndex` sort de la table, royaume
  libre saisi dans `TeamsEditor`) : **aucune pastille injectée**, phrase omise. Condition de levée :
  que le rôle entre dans `AGENT_ROLES` **et** qu'un persona du réservoir le porte.
- **Teams du catalogue** : la pastille est celle du **RÔLE**, pas du persona — ces personas
  n'existent pas au réservoir. C'est **conforme** à la doctrine (la pastille marque la phase), et
  ça doit être **écrit** là où la table est définie, pour qu'on ne la lise pas comme une propriété
  du personnage.
- **Runner `codex`** et **conversation `attached`** : hors couverture **structurelle**, déjà
  déclarée par le lot précédent (`src/frame/identity.ts:24-33`). Inchangé.
- **Le symbole réellement rendu par le runner** : hors de portée de toute garde automatisée
  (§ 3). Recette humaine, CA-9.

### Explicitement HORS lot

1. **Lecture du réservoir à l'exécution** (`readReservoir()` restant inutilisé) — c'est un lot en
   soi, avec son arbitrage de course au spawn (§ 2.7) et son repli sur clone isolé.
2. **Parse de `pastille` côté Rust** (`ReservoirPersona`) : inutile sous AR-1 = (a), la garde de
   parité étant un script Node qui lit les fichiers directement. À faire **le jour où** (1) est pris.
3. **Le champ `royaume:` du frontmatter des personas** (`aragorn.md:7` = `IAKAFRAME`) : non utilisé,
   et il ne doit pas l'être — AR-6 du lot précédent a tranché « royaume = id du projet ». Nommé
   pour qu'on ne le découvre pas comme une source alternative.
4. **La palette complète des phases** (🟠/🔵/🔴/🟢/🟣/🟡) : elle n'est écrite **que** dans
   `library/personas/aragorn.md:176-181`, en prose, et n'est **pas** une donnée structurée du
   réservoir. La recopier dans le Cockpit créerait une seconde source de vérité non gardée.
5. **Les `output styles` de Claude Code** comme canal alternatif (§ 12) : ils persistent dans
   `.claude/output-styles/` + `.claude/settings.local.json` **du projet de l'utilisateur** et
   affecteraient ses sessions hors Cockpit. Ce serait rouvrir AR-1 du lot précédent. Nommé, non fait.
6. **Le durcissement du hook `identity-guard.mjs`** (hors dépôt) : il ne contrôle que la **forme**
   (`identity-guard.mjs:41`, n'importe quels crochets passent). On ne le touche pas.
7. **L'emblème de persona** (🛡️ Aragorn, 🧙 Gandalf…) : il vit dans le **titre H1** des fichiers,
   n'est **pas** un champ de frontmatter, et n'est **pas** une pastille. Ne pas le confondre, ne pas
   l'injecter.
8. **Le commentaire périmé de `catalog.ts:5`** (« 7=doc ») : § 2.6, se corrige dans
   `sync-vignettes.sh`. Inscrit, pas fait.
9. **Toute orchestration, tout roster, tout routage.** Inchangé.

---

## 6. Arbitrages — **TRANCHÉS le 2026-09-04** (décideur : « reco »)

> AR-1 = **(a)** · AR-2 = **(a)** · AR-3 = **(a)** avec **(b)** en repli · AR-4 = **(a)** ·
> AR-5 = **(a)** · AR-6 = **(a)** · AR-7 = **(a)**. Options écartées conservées ci-dessous.

### AR-1 — D'où vient la pastille ?

- **(a)** **Table embarquée dans le Cockpit, indexée par clé de RÔLE**, alignée sur le réservoir et
  gardée par extension de `test:reservoir-parity` (AR-6).
- **(b)** **Lecture runtime du réservoir** (`readReservoir()`), indexée par **id de persona**.
- **(c)** Lecture runtime du réservoir, indexée par **rôle** (cumule (b) et la dérivation de (a)).
- **(d)** Champ `pastille` **éditable par agent** dans `TeamsEditor` (donnée saisie par l'utilisateur).

**Recommandation : (a).** Quatre motifs, du plus fort au plus faible :

1. **Synchronicité.** (b) et (c) introduisent un `await` dans le chemin du spawn, qui **ne rejoue
   pas** (§ 2.7) : une pastille arrivée en retard serait perdue **pour toute la session, en
   silence**. C'est le faux vert qu'AR-8 du lot précédent a dû fermer par une garde de rendu ; le
   rouvrir pour un caractère serait disproportionné.
2. **Couverture.** (b) couvre **1 team sur 12** (§ 2.6). (a) et (c) les couvrent toutes.
3. **Précédent exact.** L39 a déjà tranché ce motif : `DEMO_TEAM` est **embarquée** et la
   **parité** tient l'alignement — un clone isolé fonctionne, le réservoir reste la source de
   vérité. Reproduire ce geste, c'est appliquer une décision prise, pas en prendre une nouvelle.
4. **Coût.** (a) ne touche **ni Rust ni la façade** : table front + résolveur + script Node.

(d) est écarté : la pastille n'est pas un goût, c'est une donnée de méthode ; l'exposer à la saisie
garantit qu'elle divergera, et ce serait la première donnée du Cockpit à contredire le réservoir
**par conception**.

⚠️ **Ce que (a) ne fera pas, et qui doit être dit** : la table est une **copie**. Sans AR-6, elle
dérive en silence. La recommandation (a) n'a de sens qu'accompagnée d'AR-6 = (a).

### AR-2 — Pastille de l'AGENT ou de la PHASE ?

> **Position tranchée de Gandalf (demandée par le mandat) : c'est celle de la PHASE.** Et le champ
> de frontmatter est **la pastille de la phase que ce persona sert par défaut** — les deux énoncés
> ne s'opposent pas, ils se composent.

**Ce que la mesure dit exactement**, et qui **nuance** l'énoncé du mandat :

- **3 personas sur 35** écrivent une pastille **variable** : `aragorn.md:173`, `nathalie.md:114`,
  `loki.md:136` — « pastille = la **phase servie**, **🟠 par défaut** ». Ce sont les trois
  transverses, et tous trois portent **🟠** en frontmatter.
- **32 personas sur 35** écrivent une pastille **fixe** en prose : `gandalf.md:118` « pastille
  **🔵 (cadrage)** », `helm.md:110` « pastille **🟣 (prod)** », `crowe.md:62` « pastille **⚫** »…
- **Le contrat déployé de Legolas l'écrit lui-même** (`~/.claude/agents/legolas.md:103-104`) :
  « Le frontmatter ne porte **qu'une** valeur (`pastille: "🔴"`) — c'est la **pastille par
  défaut**. »

Donc : « pastille = phase » est **la doctrine** (et elle justifie l'indexation par rôle) ; « la
valeur du frontmatter est un défaut » est **le fait**. Formulations possibles :

- **(a)** Injecter comme **défaut explicite** : « ta pastille par défaut est 🟠 ; si tu sers
  explicitement une autre phase, adopte la sienne. » **Vrai pour les 35.**
- **(b)** Injecter comme **valeur fixe** : « ta pastille est 🟠. » **Faux pour 3 sur 35** — dont
  **Aragorn**, coordinateur par défaut, donc le cas le plus fréquent en pratique.
- **(c)** Injecter le **défaut + la palette complète** des phases.

**Recommandation : (a).** (b) est plus court mais ment sur le cas majoritaire. (c) suppose de
recopier une palette qui n'existe qu'en prose dans un seul fichier (§ 5 HORS lot n°4) et rallonge
le préambule là où le lot précédent a pris soin qu'il ne dise **que** l'identité.

### AR-3 — Teams hors réservoir (11 sur 12 — le cas MAJORITAIRE)

- **(a)** Pastille du **RÔLE** (`roleIndex`/`royaume` → table AR-1). Couvre 12/12.
- **(b)** **Aucune pastille** : la phrase est omise pour ces teams (nom + royaume + position seuls).
- **(c)** Pastille **neutre unique** pour tous.

**Recommandation : (a) pour tout rôle connu, (b) en repli pour tout rôle inconnu.** Motif : sous
AR-2, la pastille marque la **phase**, et un `Captain America` en `roleIndex 1` sert bien la
coordination — lui donner 🟠 n'est pas une extrapolation sur le personnage, c'est la lecture de son
rôle. Le repli (b) couvre le royaume libre saisi à la main dans `TeamsEditor`, où **aucun rôle
n'est déductible**.

**(c) est écarté formellement** : c'est exactement `•`, la valeur que ce lot mesure comme **non
reprise**. Le refaire avec un autre glyphe serait reproduire le défaut en changeant d'octet.

### AR-4 — Formulation du préambule

- **(a)** **Montrer le badge assemblé**, ouverture et clôture, avec la pastille dedans, comme un
  **exemple à reproduire tel quel**.
- **(b)** Garder la formulation actuelle (règle de position) en ajoutant « reproduis ce caractère
  exactement ».
- **(c)** Inchangée (seule la valeur de la pastille change).

**Recommandation : (a).** La mesure § 2.1 est un contrefactuel naturel : le runner a suivi
**tout ce qui était formulé comme consigne** et rien de ce qui ne l'était pas ; la position, décrite
comme une règle, a été suivie — le caractère, sujet de la règle, ne l'a pas été. Et la
recommandation externe (§ 2.11, § 12) est explicite : exemples concrets et format de sortie énoncé
plutôt qu'explication. (c) ne change rien à la cause probable (H1) : on remplacerait un symbole non
repris par un autre symbole non repris.

⚠️ **Aucune de ces options ne garantit le résultat** — voir § 3. (a) est **l'option la plus
probable**, pas une garantie, et l'instruction ne l'écrira jamais autrement.

### AR-5 — Et si on SUPPRIMAIT la mention de pastille, au lieu de la corriger ?

L'ordre de mission demande de prendre cette option au sérieux. Elle l'est.

- **(a)** Corriger (AR-1..AR-4).
- **(b)** **Retirer** toute mention de pastille : le préambule ne dit plus que nom, royaume, et
  règle de position — sans nommer aucun symbole.
- **(c)** Retirer aussi la règle de position.

**Recommandation : (a), et voici pourquoi (b) ne résout rien.** L'argument de (b) est solide en
apparence : « moins dire vaut mieux que mal dire », et le runner a bien rendu nom + royaume +
position **sans** qu'on lui donne une pastille juste. Mais le garde d'identité **exige un badge** —
donc le runner **produira un symbole de toute façon**. Se taire ne supprime pas le symbole inventé :
**ça supprime seulement notre responsabilité de l'avoir suggéré.** Le résultat à l'écran est
identique, et l'information de phase reste fausse. (b) n'est donc pas « moins dire », c'est
« assumer le défaut ».

**(b) redevient le bon choix dans un cas précis, et c'est pourquoi il est retenu en repli** : quand
la pastille est **inconnue** (AR-3 (b)). Là, se taire est la seule option honnête.

**(c) est écarté** : la position est le **seul** élément du préambule dont on ait la **preuve
mesurée** qu'il est suivi (§ 2.1). On ne retire pas ce qui marche.

### AR-6 — Étend-on la garde de parité L39 ?

- **(a)** Oui : `test:reservoir-parity` vérifie **en plus** que chaque persona du roster porte une
  `pastille` au réservoir, et que la table embarquée porte **la même valeur** pour son rôle. Échec
  en **nommant** le rôle et les deux valeurs.
- **(b)** Non : la table embarquée reste libre.

**Recommandation : (a), fermement.** Sans elle, AR-1 = (a) crée une **copie non gardée** — la
dérive exacte que L39 a fermée pour les noms, rouverte pour les valeurs. Le coût est d'une
vingtaine de lignes dans un script qui lit **déjà** le frontmatter du réservoir.

⚠️ **Sa limite, à déclarer dans le fichier de garde** : la garde **SKIP** sans réservoir, donc elle
ne protège **pas** un poste qui n'en a pas — et elle n'est **pas** dans `quality.sh` (§ 2.9). Une
édition coordonnée des deux côtés lui échapperait aussi. Ces deux bornes s'écrivent dans le script,
pas seulement ici.

### AR-7 — Nommage (le mot « pastille » est déjà pris trois fois)

- **(a)** Nommer explicitement la phase : `phasePastille`, `PHASE_PASTILLE_BY_ROLE`,
  `phasePastilleFor`.
- **(b)** `pastille` nu.

**Recommandation : (a).** § 2.4 : `.pastille` = repli texte d'une vignette, « pastille d'urgence »
= L16, « pastilles » = casting `none`. Un quatrième sens homonyme dans le même dépôt est une dette
gratuite.

---

## 7. Risques

| Risque | Mitigation |
|---|---|
| **La pastille arrive après le spawn → jamais appliquée, en silence** | AR-1 = (a) : résolution **synchrone**, aucune lecture réservoir dans ce chemin. **CA-8** le mesure sur le **premier** appel à `pty_runner_open`. |
| **La table embarquée dérive du réservoir** | AR-6 = (a), garde de parité étendue, échec nommé. **CA-6**. Limites de la garde déclarées **dans le script**. |
| **Fabrication d'une pastille pour un rôle inconnu** | AR-3 repli (b) : phrase **omise**, `DEFAULT_IDENTITY_PASTILLE` **supprimée**. **CA-5**. |
| **Témoin vide** (un test qui passerait même si la pastille n'était pas injectée) | **CA-3** : verrou explicite — la valeur attendue doit être prouvée **absente** avant l'injection. Leçon L42-F1, payée deux fois. |
| **Régression du lot précédent** (nom, royaume, ordre L19→identité→Cadre) | **CA-7** : les CA-2/CA-5/CA-7 du lot précédent sont **rejoués tels quels**, pas réécrits. |
| **Croire le rendu couvert** | § 3 + **CA-9** : la fidélité du symbole rendu est une **recette humaine**, déclarée non couverte, jamais annoncée autrement. |
| **Confusion emblème / pastille** (🛡️ vs 🟠) | § 5 HORS lot n°7 + AR-7 : l'emblème n'est pas un champ structuré, il n'entre nulle part. |

---

## 8. Fichiers concernés

| Chemin | Ce qui change |
|---|---|
| `src/theme/roles.ts` | F1 : `PHASE_PASTILLE_BY_ROLE` + `phasePastilleFor` (pur) ; hors-couverture écrit sur place. |
| `src/frame/identity.ts` | F2 : `pastille` devient optionnelle ; badge **assemblé** ; `DEFAULT_IDENTITY_PASTILLE` **supprimée**. |
| `src/App.tsx` (`resolveRunner`, ~455-524) | F3 : résolution de la pastille dans les **deux** branches (coordinateur / slot), **sans `await`**. |
| `scripts/test-reservoir-parity.mjs` | F4 : parité des **valeurs** de pastille, échec nommé ; limites déclarées. |
| `src/__tests__/frameIdentity.test.ts` | CA-1, CA-2, CA-5 ; le test « pastille par défaut » (l. 67-77) est à **réécrire** — il assertait `DEFAULT_IDENTITY_PASTILLE`. |
| `src/__tests__/identityJunction.test.tsx` | CA-3, CA-4, CA-8 : la jonction porte désormais **le badge complet**. |
| `CLAUDE.md` | Entrée de backlog + **rectification datée** de la mention « faute de source établie » de L46. |
| `src-tauri/**` | **Aucun changement.** |

---

## 9. Critères d'acceptation

> Règle du dépôt, rappelée : **toute garde doit pouvoir rougir**. Chaque CA porte son
> **contrefactuel** — la mutation, faite **dans le programme** (jamais dans l'attendu), qui doit le
> faire échouer **nommément**, puis être **révoquée avec preuve** (`git diff` vide ou `sha256`
> identique).

- [ ] **CA-1 — La résolution de pastille est pure et déterministe.** `phasePastilleFor` rend la
      même valeur pour les mêmes entrées, et `coordination → 🟠`, `cadrage/architecture → 🔵`,
      `dev/fabrication → 🔴`, `deploiement → 🟣`. *Contrefactuel* : muter une valeur de la table
      → le test rougit **en nommant le rôle**.
- [ ] **CA-2 — Fonction pure : le préambule montre le badge ASSEMBLÉ.** Pour
      `{persona:"Aragorn", royaume:"ROBOTIMMO", pastille:"🟠"}`, la sortie contient la chaîne
      **exacte** `🟠 [ROBOTIMMO][Aragorn]`, à l'octet, **et** la forme de clôture
      `[ROBOTIMMO][Aragorn] 🟠`. *Contrefactuel* : revenir à la formulation « la pastille X porte le
      sens par sa position » (badge et pastille disjoints) → rouge.
- [ ] **CA-3 — JONCTION, ET LE VERROU ANTI-TÉMOIN-VIDE.** Sur l'App montée (calque
      `identityJunction.test.tsx`), un projet lié à une team dont le coordinateur porte
      `royaume:"coordination"` aboutit à un `pty_runner_open` **dont l'argument
      `systemPromptExtra` contient `🟠 [ROBOTIMMO][Boromir]`**. **Verrou obligatoire** : une
      première assertion prouve que cette chaîne **n'est PAS** présente si la pastille n'est pas
      résolue — sinon le test serait satisfait par le badge sans pastille déjà produit par le lot
      précédent, et resterait vert quoi qu'il arrive. *Contrefactuel* : retirer la résolution de
      pastille dans `resolveRunner` → **ce test-là, et lui seul, rougit nommément**.
      **C'est le CA qui compte** : le défaut vit à la jonction, une garde de fonction pure ne le
      voit pas (L37-CA6, puis le FAIL du lot précédent).
- [ ] **CA-4 — Team hors réservoir : la pastille vient du RÔLE.** Une team du catalogue
      (`lotr`, coordinateur `roleIndex 1`, `royaume` = slug MAJUSCULE) reçoit **🟠**.
      *Contrefactuel* : indexer par **nom de persona** au lieu du rôle → rouge (aucune entrée pour
      ce personnage), **en montrant le nom cherché** dans le message d'échec.
- [ ] **CA-5 — Zéro fabrication.** Rôle inconnu (royaume libre, `roleIndex` hors table, agent
      introuvable dans la team) → **aucune pastille**, phrase **omise**, et le préambule ne contient
      **ni `•` ni aucun autre symbole**. *Contrefactuel* : réintroduire une valeur de secours →
      rouge. *Second contrefactuel* : vérifier qu'aucune occurrence de
      `DEFAULT_IDENTITY_PASTILLE` ne subsiste dans `src/`.
- [ ] **CA-6 — La garde de parité rougit sur une valeur divergente.** `npm run test:reservoir-parity`
      échoue en **nommant le rôle et les deux valeurs** quand la table embarquée s'écarte du
      réservoir. *Contrefactuel* : muter **une valeur de la table du Cockpit** (jamais le réservoir,
      qui est un dépôt tiers) → rouge nommé ; révocation prouvée au `sha256`. *Limite déclarée* :
      la garde **SKIP** sans réservoir et n'est pas dans `quality.sh` — à écrire **dans le script**.
- [ ] **CA-7 — Non-régression intégrale du lot précédent.** Nom, royaume `[<PROJET>]`, ordre
      L19 → identité → Cadre, absence de tout autre nom d'agent, repli `attached`/`codex` : les CA
      correspondants du lot L46 **passent sans modification de leur attendu**. *Contrefactuel* :
      substituer au lieu de préfixer → rouge (le texte du Cadre disparaît).
- [ ] **CA-8 — Aucun asynchrone n'entre dans le chemin du spawn.** La pastille est présente dans le
      **premier** appel à `pty_runner_open` (`runnerOpenCalls[0]`), pas dans un appel ultérieur.
      *Contrefactuel* : résoudre la pastille via une lecture `await` (par ex. `readReservoir()`) →
      le premier appel ne la porte plus → rouge. Ce CA est ce qui empêche de rouvrir le faux vert
      d'AR-8 du lot précédent.
- [ ] **CA-9 — RECETTE RÉELLE (gate humain, NON mesurable hors ligne).** Sur un projet lié, dans
      `npm run tauri dev` : poser une question, puis **relire le transcript sur disque** et
      constater `🟠 [ROBOTIMMO][Aragorn]` (ouverture) et `[ROBOTIMMO][Aragorn] 🟠` (clôture).
      **Ce critère n'est pas couvert par les tests et ne sera jamais annoncé comme couvert.**
      *Fait mesuré à retenir pour la recette* : le system-prompt injecté **n'apparaît pas** dans le
      transcript (balayage de `9a3a2dbc-…jsonl` : **0 occurrence** de la phrase injectée) — la
      recette observe donc **la sortie**, jamais l'entrée ; observer l'entrée demanderait
      d'instrumenter le Cockpit, ce qui est **hors lot**.
- [ ] **CA-10 — Hors couverture écrit dans le code.** Rôle sans pastille, teams du catalogue
      (pastille = rôle et non personnage), `codex`, `attached` : chacun porte **dans le fichier
      concerné** son motif et sa condition de levée. *Vérif* : lecture. *Contrefactuel* : aucun —
      exigence de forme, assumée comme telle.
- [ ] **CA-11 — `bash scripts/quality.sh` exit 0**, front + Rust, chiffres **recomptés** (jamais
      recopiés d'un rapport antérieur), **plus** `npm run test:reservoir-parity` exécuté et son
      verdict cité.

---

## 10. Estimation — jalon P1→P2

- **Équivalent jour-homme (spec fermée)** : **0,5 à 0,8 j-homme**.
  Répartition : F1 table + résolveur ≈ 0,1 j ; F2 reformulation du préambule ≈ 0,1 j ; F3
  branchement des deux branches ≈ 0,1 j ; F4 garde de parité ≈ 0,1 j ; **tests + les dix
  contrefactuels ≈ 0,2 à 0,4 j** (poste principal, comme toujours ici) ; backlog + rectification
  datée ≈ 0,05 j.
- **Complexité / risque** : **très faible en code, moyen en vérification.** Aucun Rust, aucune
  façade, aucune dépendance, aucun asynchrone. Le seul vrai risque est d'écrire une garde tiède —
  un CA-3 sans son verrou serait **vert quoi qu'il arrive**, puisque le badge nom+royaume est déjà
  produit par le lot précédent.
- **Inconnues susceptibles de faire glisser l'estimation** :
  1. **AR-1** — si (b) ou (c) est choisi, il faut refermer la course au spawn (§ 2.7) : **+0,4 j**
     de vérification, et le lot devient le premier consommateur runtime du réservoir (§ 5 HORS
     lot n°1), avec son repli sur clone isolé à cadrer ;
  2. **AR-5 = (b)** — ne rien dire : **−0,3 j**, mais le défaut visible reste (§ 6 AR-5) ;
  3. **AR-6 = (b)** — pas de garde de parité : **−0,1 j**, contre une copie non gardée ;
  4. **CA-3** — si le verrou anti-témoin-vide s'avère non exprimable dans le harnais existant, il
     faut un second cas de test avec une team sans rôle connu : **+0,1 j** ;
  5. **CA-9** — recette réelle : dépend d'une session du décideur, **hors du temps agent**.

*Ce n'est pas un engagement ferme : un ordre de grandeur assumé et révisable, à confronter au temps
réel à la clôture du lot.*

---

## 11. Ce que ce cadrage CONTREDIT dans l'ordre de mission

Par honnêteté de lecture, et parce que ces points changent des décisions :

1. **« 36 fichiers sur 36 »** est exact au sens du **fichier**, mais la population **exploitable**
   est de **35** : `_TEMPLATE.md` est un gabarit, exclu par `md_ids` (`reservoir.rs:151-153`).
   Compter 36 personas serait faux.
2. **« le champ est-il toujours au même endroit ? »** — **non** : ligne 6, 7 ou 8 selon les
   fichiers (§ 2.3). Sans conséquence, parce que le parseur est indexé par clé — mais un futur
   parseur positionnel serait faux.
3. **« La pastille n'est PAS une propriété de l'agent, c'est celle de la PHASE »** — vrai **comme
   doctrine**, trop absolu **comme description**. **32 personas sur 35** fixent leur pastille en
   prose ; seuls **3** (aragorn, nathalie, loki, tous 🟠) la déclarent variable. Le contrat déployé
   de Legolas tranche la lecture : le frontmatter porte **la pastille par défaut**
   (`~/.claude/agents/legolas.md:103-104`). D'où AR-2 = (a), « défaut explicite », et non « valeur
   fixe ».
4. **« quelles valeurs prend-il ? »** — **au-delà de la palette iakaframe** : ⚫ (`crowe`) et
   🟤 (`faste`), sur des personas d'autres méthodes. Une palette fermée codée en dur serait fausse
   dès qu'une autre méthode entrerait.
5. **La version mesurée est 2.1.261**, pas 2.1.260 : toute conclusion liée au schéma du transcript
   est relative à cette version.
6. **`⚔️` n'est lisible nulle part** (§ 2.2) — ni dans robotimmo, ni dans `~/.claude`, ni dans le
   réservoir. Le seul emblème du corpus pour Aragorn est **🛡️**. Ce n'est donc pas une lecture
   erronée d'une source : c'est une invention.

**Et un point où le lot précédent s'est trompé, à rectifier en le datant** : `identity.ts:36-40`
justifie `•` comme « symbole neutre, PAS une donnée de team […] faute de source établie ». La
source **était** établie, complète à 35/35, et lisible par un parseur **déjà écrit**. Le gate l'a
accepté comme repli honnête ; il était honnête, et faux. La rectification s'écrit **datée**, pas
en effaçant (règle 4 du corpus).

---

## 12. Sources externes citées (vérifiées le 2026-09-04)

- **Les modèles récents suivent les instructions littéralement ; exemples concrets > explications**
  (fonde § 2.11 et AR-4) —
  [Anthropic, « Prompt engineering best practices for 2026 »](https://claude.com/blog/best-practices-for-prompt-engineering) ·
  [Anthropic, « Effective context engineering for AI agents »](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **`--append-system-prompt` (ajout ponctuel) vs `output styles` (persistants, `.claude/output-styles/`
  + `outputStyle` dans `.claude/settings.local.json`)** (fonde § 5 HORS lot n°5) —
  [Claude Code Docs, « Modifying system prompts »](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts) ·
  [Claude Code Docs, « Output styles »](https://cld-docs.onlinetool.cc/en/docs/claude-code/output-styles.html)

**Faits internes, mesurés et non sourcés sur le web** (§ 2.1 à 2.10) : transcripts
`~/.claude/projects/`, contrats `~/.claude/agents/*.md`, réservoir
`~/work/iakaframe/library/personas/`, sources `src/` et `scripts/` de ce dépôt. Claude Code
**2.1.261** (valeur lue dans le transcript).
