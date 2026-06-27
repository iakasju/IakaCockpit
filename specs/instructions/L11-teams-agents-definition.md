# Instruction : L11 — Teams & agents (définition de premier rang) + liaison projet↔team

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : CADRÉ — À VALIDER par Stéphane.** Doc en français, code/identifiants en anglais.
> **Lot structurant #11.** Remplace et clôt le **différé (c) « chef nu vs team »** de L10.
> **Renomme et SUPERSEDE** `L11-runner-par-slot-team-projet.md` (cadre FAUX : runner mis au centre,
> team réduite à un casting de vignettes, settings globaux, runner/modèle par agent différé — rejeté
> par Stéphane le 2026-06-27).
>
> **Décision Stéphane (option 2, 2026-06-27).** Ce lot construit **MAINTENANT** la **définition de
> team/agents dans les Settings** : créer/éditer une team, son roster d'agents, et **par agent son
> runner + son modèle (+ skills)**. PROJET.md classe ça Horizon/CIBLE (§ 0.2 « Settings = par agent »,
> § 0.4 colonne CIBLE). Stéphane le **bringe en avant volontairement** : ce n'est PAS du MVP à
> rétrograder. La **définition** est livrée **en entier** ; seule l'**exécution** des runners est
> staged (cf. § 0 et § 8).
>
> **Source de vérité (à relire en premier) :** `specs/PROJET.md` **§ 0 — Modèle produit** (vision
> gravée), notamment **§ 0.1** (portefeuille → projet → **session = TEAM pilotée par un chef**),
> **§ 0.2** (agent = **runner + modèle + skills** ; chef = interlocuteur unique ; Settings PAR AGENT
> = cible), **§ 0.3** (terminal-source / chat-vue), **§ 0.4** (tableau ÉTAPE ACTUELLE vs CIBLE).
> Mémoires : `vision-terminal-source-chat-vue`, `runner-natif-tail-transcript`,
> `ne-pas-deformer-architecture-via-mvp`, `iakacockpit-produit-a-part-identite-propre`.
> `CLAUDE.md` : façade unique D7 (`src/api/backend.ts`), socle L0 (config SQLite non sensible,
> secrets keychain write-only, **CSP stricte jamais null**), conventions (réutiliser l'existant, pas
> de god-component).
>
> **Code inspecté en lecture seule le 2026-06-27 (rien n'est supposé) :** `src/mock/demoTeam.ts`
> (`DEMO_TEAM` = 5 membres `{royaume, agent, roleIndex}`, `teamBadge`), `src/theme/teamAvatar.ts`
> (`makeAvatarResolver(charte, team)` + `ROLE_BY_AGENT` global dérivé de `DEMO_TEAM`),
> `src/theme/vignettes.ts` (`resolveVignette(charte, team, roleIndex)`, `embeddedTeams()`),
> `src/assets/vignettes/manifest.ts` (teams embarquées = `lotr`/`avengers`/`starfleet`),
> `src/hooks/useSettings.ts` (`CONFIG_KEYS.team="ui_team"`, `DEFAULT_TEAM="lotr"`, réglages GLOBAUX
> `chef_runner_kind`/`chef_model`/`chef_allowed_tools`/`chef_trust_mode`, `ChefRunnerKind`,
> `parseRunnerKind`), `src/hooks/useConversations.ts` (1 conv/projet, `DEFAULT_RESPONSIBLE="Aragorn"`
> **en dur**, `parseMention`, `agent` par-tour), `src/views/WorkingView.tsx` (`runnerKind="claude-code"`
> **EN DUR** l.241 ; convhead ; Roster ; Chat), `src/components/Roster.tsx` (`members=DEMO_TEAM`
> **défaut**, statut vivant), `src/views/SettingsView.tsx` (`CHEF_RUNNERS` + `enabled`, bloc
> « Chef-runner / Conversation » GLOBAL l.472+), `src/App.tsx` (`makeAvatarResolver(settings.theme,
> settings.team)` **global** l.67 ; `openProject` ; `openConversation`), `src-tauri/src/config.rs`
> (clé/valeur `config(key,value)`, `is_secret`, `KEY_CHEF_*`, `read_chef_settings`), `src-tauri/src/
> terminal.rs` (`pty_runner_open`, `RunnerSpec`, `resolve_runner_spec`, `chef_args`, scrub env, trust,
> allowlist), `src-tauri/src/seed.rs` (`seed_demo`, `demo_config_targets`, idempotent/non destructif,
> flag dev), `src-tauri/src/ai.rs` (`chat` source Ollama, hors lot ici), `src/api/backend.ts`
> (`ptyRunnerOpen(id, kind, model, cwd…)`, `configGet/Set/All`).

---

## 0. EN UNE PAGE — ce que ce lot grave

**La TEAM devient l'objet de premier rang.** On **sélectionne une team par projet**. Une team =
un **roster d'agents** ; **chaque agent = persona + runner + modèle + skills** ; le runner/modèle
appartient à l'**agent**, **défini DANS la team** — jamais un réglage flottant « par projet » ni
« global ». La conversation = **user ↔ team**, routée par défaut vers l'**agent coordinateur**
(= chef de projet, défaut Aragorn) ; `@autre-agent` désigne cet agent et **SON** runner/modèle.

Aujourd'hui le code matérialise un cadre FAUX (à dissoudre) :
- `DEMO_TEAM` est un **mock figé** `{royaume, agent, roleIndex}` (casting de vignettes), **pas** une
  entité de données éditable avec runner/modèle/skills/coordinateur.
- Le runner est **codé en dur** (`WorkingView.tsx:241 runnerKind="claude-code"`) et le modèle vient
  d'un réglage **GLOBAL** (`chef_runner_kind`/`chef_model`).
- La team de vignettes est **globale** (`ui_team`, `App.tsx:67`), pas une propriété de la team-entité.
- Le coordinateur est **codé en dur** (`DEFAULT_RESPONSIBLE="Aragorn"`).

```
 CE QU'ON DÉFINIT (TOUT, maintenant)              CE QUI TOURNE RÉELLEMENT (étape)
 ────────────────────────────────────            ──────────────────────────────────
 teams[] : N teams éditables                      le COORDINATEUR de la team du projet actif
   chaque team : nom + casting visuel +             spawne UN terminal-source réel SI son
   coordinateur + roster d'agents                   runner = claude-code (prouvé L10a/b)
   chaque agent : persona (nom/royaume/roleIndex)  les AUTRES agents : joignables en @persona
     + RUNNER + MODÈLE + SKILLS                      (préfixe verbatim vers le coordinateur) —
 project_team:<id> : team liée au projet            leur runner/modèle est DÉFINI, pas encore
 coordinateur désigné par team                      SPAWNÉ (multi-runner réel = différé)
                                                    runner ≠ claude-code : DÉFINISSABLE mais
                                                      non exécutable ici → bannière honnête
```

**Ligne de partage non négociable (cf. § 0.4 PROJET.md, mémoire `ne-pas-deformer…`) :**
on **DÉFINIT tout** (team + agents + runner+modèle+skills + coordinateur, éditables dans les
Settings) ; on **n'EXÉCUTE qu'une étape** (le coordinateur en `claude-code`). On **réduit
l'exécution**, on **ne déforme PAS la définition**. Interdiction expresse de rétrograder la
définition à « personas only / vignettes only / settings globaux ».

---

## 1. PROBLÈME (avant la solution)

- Stéphane veut que **chaque projet porte une team** (entité réelle, pas un casting visuel) et que
  ce choix soit **mémorisé**, proposé **une fois** par un popup quand le projet n'a pas de team.
- Stéphane veut **définir ses teams et ses agents** (runner + modèle + skills **par agent**,
  coordinateur désigné) **dans les Settings**, comme objets de premier rang — pas via un mock figé
  ni des réglages globaux.
- Stéphane veut que la conversation parle **au coordinateur** de la team du projet, avec `@agent`
  pour adresser un autre agent (et voir **son** runner/modèle).
- Aujourd'hui rien de tout ça n'existe en **données** : team = mock front, runner en dur, settings
  globaux, coordinateur en dur. Le **modèle de données team/agents manque**.

---

## 2. PÉRIMÈTRE — DANS LE LOT / HORS LOT

### 2.1 DANS LE LOT (définition COMPLÈTE + exécution staged)

**P1 — Modèle de données team/agents + écran Settings « Teams & agents » (définition COMPLÈTE)**
- **Entité team** persistée en config non sensible (clé `teams`, JSON — § 3) : `id`, `name`,
  `vignetteTeam` (casting visuel ∈ `embeddedTeams()`), `coordinator` (id d'agent), `agents[]`.
- **Entité agent** (dans la team) : `id`, `name`, `royaume`, `roleIndex`, **`runner`**, **`model`**,
  **`skills[]`**.
- **Bootstrap team par défaut** (`useTeams`, non-dev, toujours) : si `teams` est vide → écrire une
  **team par défaut éditable** `iakaframe` dérivée de `DEMO_TEAM` (casting `lotr`, coordinateur
  `aragorn`, 5 agents en `runner:"claude-code"`). `DEMO_TEAM` cesse d'être un mock figé : il devient
  **la graine** de cette team par défaut (cf. § 5.6).
- **Écran/volet Settings « Teams & agents »** (§ 5.3) : lister / créer / éditer / supprimer une team ;
  ajouter / éditer / retirer un agent ; **régler runner + modèle + skills par agent** ; **désigner le
  coordinateur** ; choisir le casting visuel. **Toute la définition est éditable ici** (c'est le cœur
  du lot).
- **Supprime les réglages runner/modèle GLOBAUX** (`chef_runner_kind`, `chef_model`) du bloc
  Settings : ils sont **superseded** par la définition **par agent** (§ 5.5).

**P2 — Liaison projet↔team + popup + conversation routée au coordinateur**
- **Donnée par projet** : `project_team:<projectId>` (id de team, config non sensible — § 3).
- **Popup `TeamPicker`** (§ 5.2) quand on ouvre en Working un projet **sans** `project_team` :
  choisir parmi les teams existantes (la team par défaut existe toujours) ; pré-sélection = dernière
  team utilisée (`default_team`) / 1ʳᵉ fois = team par défaut ; **confirmer** persiste + maj
  `default_team` ; **annuler** ne persiste rien et ouvre avec la team par défaut (popup revient).
  Affordance « Gérer les teams… » → ouvre l'écran Settings Teams.
- **Résolveur de vignettes par projet** (§ 5.4) : roster + chat utilisent la team du **projet actif**
  (`team.vignetteTeam` + `agent.roleIndex`), plus la globale `ui_team`.
- **Roster par team** (§ 5.4) : `Roster`/`Chat` affichent le **roster de la team du projet actif**
  (noms/royaumes/roleIndex définis), plus le `DEMO_TEAM` global en dur.
- **Conversation routée au coordinateur** (§ 5.1) : l'interlocuteur par défaut d'une conversation =
  le **coordinateur de la team du projet**, plus `DEFAULT_RESPONSIBLE="Aragorn"` en dur. `@agent`
  bascule la persona vers un autre agent de **cette** team (verbatim, calque L10).

**P3 — Exécution staged : le coordinateur pilote le terminal-source**
- **De-hardcodage du runner** (§ 5.5) : `WorkingView` ne passe plus `runnerKind="claude-code"` en
  dur (l.241) — il reçoit le **runner + modèle RÉSOLUS du coordinateur** de la team du projet.
- **Règle d'exécution honnête** (§ 8) : si `coordinator.runner === "claude-code"` → terminal-source
  spawné via `pty_runner_open` (chemin L10a/b **inchangé**), `model` = `coordinator.model`. Sinon
  (runner défini mais non câblé : `ollama`/`litellm`/`codex`) → **terminal-source non spawné**,
  **bannière honnête** dans la conversation (« runner `<X>` du coordinateur non encore exécutable —
  étape actuelle : claude-code ; définition conservée »). **Jamais de crash, jamais de définition
  perdue.**
- **Réconciliation seed L7/L9** (§ 5.6) : seed `project_team:iaka-demo` = team par défaut → la démo
  s'ouvre **sans popup** ; le reste du contrat L7/L9 préservé.

### 2.2 HORS LOT (différé, tracé — l'archi de ce lot doit le rendre trivial)

- **Runners RÉELS par agent / orchestration multi-agent** : un PTY/process réel **par agent** (chacun
  sur son runner+modèle). **Non câblé ici** : seul le coordinateur spawne. La place est **DÉFINIE**
  (runner+modèle par agent stockés) → l'extension est un branchement, pas une réécriture.
- **Exécution des runners non-`claude-code`** : `ollama`/`litellm` = runners **API** (chemin
  différent du PTY ; `ai.rs chat` existe mais comme source Ollama du chat, pas comme terminal-source
  multi-tours) ; **`codex` = à spiker** (CLI non installé, P0bis L10). **Définissables, non
  exécutables ici.**
- **Skills modifiables / frames modifiés** (PROJET § 0.4 phase 2) : ici les skills sont une **liste
  de chaînes** (ids de skill-rôles) éditable et stockée ; **pas** d'éditeur de frame ni de résolution
  d'exécution de skill.
- **Chef portefeuille** (slot cwd = chapeau, team portefeuille pilotée par Odin) : Portfolio reste un
  tableau de bord muet. Incrément ultérieur via un projet réservé + même mécanique.
- **Allowlist / mode trust par agent** : restent **GLOBAUX** (politique de sécurité d'exécution L10b)
  pour ce lot — cf. arbitrage AR-3 (porter par agent à terme).
- **Live-switch de runner** d'une conversation déjà lancée (changer le coordinateur sans rouvrir) :
  arbitrage AR-4 (reco : appliqué à l'ouverture / au prochain spawn).
- **Teams.json détaillé iakagraph** (rosters riches multi-univers) : non embarqué côté Cockpit ;
  le casting visuel reste les vignettes L9 (`embeddedTeams()`), la **définition de team** vit en config.

---

## 3. MODÈLE DE DONNÉES (config SQLite non sensible — réutilise `config.rs`)

**Principe.** Pas de nouvelle table, pas de nouvelle commande Tauri. On reste sur `config(key, value)`.
La **team est une entité** sérialisée **JSON** sous une clé non sensible. **Justification du JSON-en-
config** : MVP, zéro migration de schéma, zéro commande Rust nouvelle (réutilise
`configGet/Set/All`), parse trivial **côté front** (calque `parseRunnerKind`/`parsePrefs`),
mono-utilisateur mono-instance (pas de contention d'écriture concurrente). La **variante** « table
Rust `teams` + commandes typées » est plus propre mais **sur-ingénierie** ici → à rouvrir quand les
teams gagnent des champs imbriqués/relations (cf. AR-5).

| Clé config | Portée | Contenu | Secret ? |
|---|---|---|---|
| `teams` | globale (**nouvelle**) | **JSON** : tableau de `Team` (cf. ci-dessous) | non (le mot « teams » ne matche pas `token\|key\|secret\|password`) |
| `default_team` | globale (**nouvelle**) | id de la **dernière team utilisée** (graine du popup) | non |
| `project_team:<projectId>` | par projet (**nouvelle**) | id de la team liée au projet | non |
| `ui_team` | globale (existe — L9) | **legacy** : casting de vignettes par défaut, conservé comme valeur de bootstrap de la team par défaut + ultime fallback ; **ne pilote plus** le résolveur (qui lit `team.vignetteTeam`) | non |
| `chef_runner_kind`, `chef_model` | globale (existe — L10b) | **RETIRÉS de l'UI Settings** (superseded par le runner/modèle **par agent**). Clés laissées en base sans usage UI (pas de migration destructive — cf. § 5.5) | non |
| `chef_allowed_tools`, `chef_trust_mode` | globale (existe — L10b) | **CONSERVÉS** (politique de sécurité d'exécution, AR-3) | non |

**Schéma JSON (sérialisé/parsé côté front ; validé défensivement — record invalide ignoré, jamais
d'exception) :**

```ts
// Runner conceptuel d'un agent (§ 0.2). SEUL `claude-code` est EXÉCUTABLE en l'état (P3).
type AgentRunnerKind = "claude-code" | "ollama" | "litellm" | "codex";

interface Agent {
  id: string;          // slug stable, unique dans la team (ex. "aragorn")
  name: string;        // affichage (ex. "Aragorn")
  royaume: string;     // MAJUSCULE (ex. "ACCUEIL") — pastille [ROYAUME][Agent]
  roleIndex: number;   // index vignette (0..N-1), pioche le slug du casting
  runner: AgentRunnerKind;
  model: string;       // alias/modèle transmis au runner (vide = défaut du runner)
  skills: string[];    // ids de skill-rôles iakaframe (ex. "iakaframe-cadrage")
}

interface Team {
  id: string;            // slug stable, unique (ex. "iakaframe")
  name: string;          // affichage (ex. "iakaframe (LOTR)")
  vignetteTeam: string;  // casting visuel ∈ embeddedTeams() (ex. "lotr") ; "none" = pastilles
  coordinator: string;   // id d'agent = chef de projet (doit exister dans agents[])
  agents: Agent[];
}
```

**INVARIANT secret (dur).** Le JSON `teams` **ne contient AUCUN secret** : runner = *kind*, modèle =
alias non sensible, skills = ids. **Aucun identifiant/clé d'API de runner** (Ollama-lan, LiteLLM,
Claude) n'entre dans la définition de team → **les credentials de runner restent au keychain**
(write-only), exactement comme L3/L4/L6. À tracer pour la cible (un agent sur runner distant aura
besoin d'un secret keychain, pas dans `teams`).

**Constante partagée** : `DEFAULT_TEAM_ID = "iakaframe"` (miroir TS + Rust, comme les défauts
chef-runner L10b). La team par défaut porte cet id.

**Résolution (ordre)** :
- *team d'un projet* : `project_team:<id>` non vide **et** l'id existe dans `teams` → cette team ;
  sinon → team par défaut (`teams` contient toujours `DEFAULT_TEAM_ID` après bootstrap).
- *coordinateur d'une conversation* : `team.coordinator` s'il référence un agent existant ; sinon →
  premier agent de la team (garde de cohérence, jamais « sans interlocuteur »).
- *runner/modèle effectifs du terminal-source* : ceux du **coordinateur** (§ 8).
- Valeur vide/blanche = **absente** (calque `read_chef_settings`).

**Où vit la résolution ?** Côté **front**, dans un hook `useTeams` (§ 5.0), via `configGet/Set/All`
(façade). **Aucune nouvelle commande Rust** (réutilisation maximale, MVP).

---

## 4. CONTRATS (gardes d'architecture — à ne PAS violer)

- **Façade unique D7** : tout I/O via `src/api/backend.ts`. Ce lot **n'ajoute aucune** commande
  Tauri (réutilise `configGet/Set/All` + `ptyRunnerOpen`). Si une commande devait apparaître (variante
  écartée § 3), elle s'ajoute **uniquement** dans `backend.ts`.
- **Pas de god-component** : la définition/résolution team vit dans **`useTeams`** (hook) ; l'éditeur
  est un **composant dédié** (`TeamsEditor`), le popup un **composant dédié** (`TeamPicker`). `App`
  câble ; les vues restent présentationnelles.
- **CSP stricte inchangée (jamais null)** : aucune origine, aucun asset distant. Vignettes servies en
  `'self'` (manifest L9 intact). Popup/éditeur n'introduisent ni iframe ni portal externe.
- **Secrets keychain inchangés** : `teams`/`project_team`/`default_team` = non sensibles ; **aucun
  secret dans la définition de team** (invariant § 3). Les credentials runner restent keychain.
- **Runner abstrait, pas « Claude Code en dur »** (§ 2.3 PROJET) : après ce lot, **plus aucune**
  occurrence de `runnerKind="claude-code"` codée en dur dans une vue — la valeur est **résolue** depuis
  le coordinateur de la team. `DEFAULT_RESPONSIBLE="Aragorn"` en dur **disparaît** (→ coordinateur résolu).
- **`pty_runner_open` / `RunnerSpec` / scrub env / trust / allowlist / `session_id` / `validate_cwd`
  INCHANGÉS** (L10a/b) : on lui passe le **kind/model du coordinateur** au lieu de `"claude-code"`/
  `undefined`. La couche P3 est un câblage de valeurs, **pas** une modif du spawn.
- **Non destructif** : aucune suppression de clé config existante (`ui_team`, `chef_*` laissées en
  base) ; pas de migration risquée.

---

## 5. COMPORTEMENTS — front

### 5.0 Hook `useTeams` (nouveau) — autorité de la définition + résolution

```ts
interface UseTeams {
  teams: Team[];                          // depuis config `teams` (bootstrap si vide)
  loaded: boolean;
  // Résolution (lecture).
  teamForProject(projectId: string): Team;     // project_team → existe → sinon défaut
  coordinatorOf(team: Team): Agent;            // team.coordinator → sinon agents[0]
  agentInTeam(team: Team, name: string): Agent | null; // pour @agent (insensible casse)
  hasBinding(projectId: string): boolean;      // y a-t-il un project_team:<id> ? (popup)
  defaultTeamId: string;                       // = default_team (graine popup)
  // Définition (écriture, persiste `teams` JSON puis re-set l'état).
  upsertTeam(team: Team): Promise<void>;
  removeTeam(teamId: string): Promise<void>;   // refuse de retirer la dernière / la team par défaut
  upsertAgent(teamId: string, agent: Agent): Promise<void>;
  removeAgent(teamId: string, agentId: string): Promise<void>; // refuse de retirer le coordinateur
  setCoordinator(teamId: string, agentId: string): Promise<void>;
  // Liaison projet.
  bindProjectTeam(projectId: string, teamId: string): Promise<void>; // + maj default_team
}
```

- **Chargement** : au montage, `configAll()` → parse `teams` (JSON défensif), `default_team`,
  indexe `project_team:*`. Si `teams` absent/vide/illisible → **bootstrap** team par défaut (écrit
  `teams` avec la def dérivée de `DEMO_TEAM`) ; idempotent.
- **Écritures** : sérialisent le tableau `teams` complet sous la clé `teams` (calque `setTeam` L9).
  `bindProjectTeam` écrit `project_team:<id>` **et** `default_team` (dernière utilisée).
- **Gardes de cohérence** (jamais d'état cassé) : on ne retire pas le coordinateur d'une team (il faut
  d'abord en désigner un autre) ; on ne retire pas la team par défaut/ la dernière team ; un agent
  ajouté reçoit un `id` unique ; `coordinator` invalide → repli `agents[0]`.

### 5.1 Conversation routée au coordinateur (modif `useConversations` + `App`)

- `openConversation(projectId, title, cwd, agent?, …)` : l'`agent` par défaut devient le **nom du
  coordinateur** de la team du projet (résolu par `App` via `useTeams.coordinatorOf`), plus
  `DEFAULT_RESPONSIBLE="Aragorn"` en dur. **Compat** : `agent?` reste paramétrable (portefeuille futur).
- `@agent` (clic roster / saisie) : `parseMention` inchangé ; la persona ne bascule **que** vers un
  agent **présent dans la team du projet** (`agentInTeam`) — un `@inconnu` reste sans effet de persona
  (calque borné L10, **aucune orchestration**). Le contenu reste **verbatim** injecté au PTY du
  coordinateur (entrée partagée L10b inchangée).
- **Honnêteté étape** : `@agent` **désigne** l'agent et **affiche son runner/modèle défini** (roster/
  inspecteur), mais **n'instancie PAS** son runner propre — le tour part au **terminal-source du
  coordinateur** avec le préfixe verbatim. (Multi-runner réel = différé § 2.2.)

### 5.2 Popup `TeamPicker` (nouveau composant)

- **Déclencheur EXACT** : `App.openProject(project)` — **avant** `openConversation`, si
  `!teams.hasBinding(project.id)` → afficher le popup. Liaison présente → **pas de popup**, ouverture
  directe.
- **Contenu** : titre (« Relier *<projet>* à une team »), **listbox des teams existantes**
  (`teams[]`, par `name`). Pré-sélection = `defaultTeamId` (dernière utilisée ; 1ʳᵉ fois =
  `DEFAULT_TEAM_ID`). Affordance **« Gérer / créer les teams… »** → ouvre Settings « Teams & agents »
  (sans fermer brutalement : on peut revenir choisir). La team choisie **contient déjà son
  coordinateur** (défini en Settings) → c'est lui qui pilotera la conversation.
- **Confirmer** : `bindProjectTeam(projectId, teamId)` (persiste `project_team` + `default_team`) →
  `openConversation(...)` (interlocuteur = coordinateur de la team) → Working actif.
- **Annuler** : **ne persiste RIEN** → `openConversation` avec la **team par défaut** pour la session ;
  le popup **reviendra** au prochain lancement. Jamais « sans team », jamais bloquant.
- **Pas d'invalidation** : on re-propose le popup **uniquement** quand `!hasBinding`. Une team binée
  supprimée ensuite → `teamForProject` retombe sur la team par défaut (jamais d'erreur).

### 5.3 Écran Settings « Teams & agents » (nouveau composant `TeamsEditor`)

Nouveau bloc/volet dans `SettingsView` (ou onglet dédié si la page sature). **Présentationnel** ;
toute écriture passe par `useTeams` (injecté en prop, comme `settings`). Contenu fermé :

- **Liste des teams** : nom + casting + nb d'agents + badge « par défaut » ; actions : **éditer**,
  **supprimer** (sauf dernière/défaut), **créer une team** (nom + casting via `<select>`
  `embeddedTeams()` + `none`).
- **Édition d'une team** :
  - champ **nom**, **casting visuel** (`<select>` `embeddedTeams()`), **coordinateur** (`<select>`
    parmi les agents de la team) ;
  - **roster d'agents** (liste éditable) ; par agent : **nom**, **royaume**, **roleIndex** (nombre),
    **runner** (`<select>` parmi `AGENT_RUNNERS` — cf. ci-dessous), **modèle** (texte, vide = défaut),
    **skills** (CSV → `string[]`) ; actions **ajouter un agent**, **retirer un agent** (sauf le
    coordinateur courant).
- **`AGENT_RUNNERS`** (liste pour le `<select>` runner, calque `CHEF_RUNNERS`) :
  `claude-code` (label « Claude Code (TUI native) », **executable: true**), `ollama`, `litellm`,
  `codex` (**executable: false**, suffixe « — définissable, exécution à venir »). **Tous
  SÉLECTIONNABLES** (on DÉFINIT tout), mais le flag `executable` **informe** l'UI : un agent
  **coordinateur** sur un runner non exécutable affiche un **avertissement** (« ce runner ne pilotera
  pas encore le terminal-source — étape actuelle : claude-code »). On **ne grise PAS** le choix (ne
  pas réduire la définition) — on **informe** sur l'exécution.
- **Persistance immédiate** par champ (calque des `setChef*` L10b : bouton « Enregistrer » ou onBlur).

### 5.4 Roster + vignettes par team du projet actif (modif `App`, `Roster`, `Chat`, `teamAvatar`)

- `makeAvatarResolver(charte, team)` (`teamAvatar.ts`) **ne dérive plus `ROLE_BY_AGENT` de
  `DEMO_TEAM`** : il prend en entrée le **roster de la team** (agents → `roleIndex`) et le
  `vignetteTeam` de cette team. Signature reframée :
  `makeAvatarResolver(charteKey: string, vignetteTeam: string, roster: {name,roleIndex}[])`.
- `App` construit le résolveur depuis la **team du projet actif** :
  `makeAvatarResolver(settings.theme, team.vignetteTeam, team.agents)` (`useMemo` sur
  `[settings.theme, activeProjectId, teams]`). Hors conversation active → team par défaut.
- `Roster` : `members` n'est plus `DEMO_TEAM` par défaut **dans l'usage Working** — `WorkingView` lui
  passe le **roster de la team du projet actif** (`team.agents` → `DemoTeamMember`-compatibles
  `{royaume, agent:name, roleIndex}`). Le composant reste présentationnel ; `DEMO_TEAM` demeure un
  défaut **de secours** (tests / hors team).
- `resolveVignette`, le manifest, le fallback pastille `[ROYAUME][Agent]` : **intacts** (une team avec
  `vignetteTeam` absent du manifest → pastille, jamais d'image cassée).

### 5.5 De-hardcodage du runner (modif `WorkingView`/`App`) + retrait du bloc runner GLOBAL

- `WorkingView` ne passe plus `runnerKind="claude-code"` en dur (l.241) : il reçoit, **par
  conversation**, le `runnerKind` (mappé) et le `model` **du coordinateur** de la team du projet
  (résolus dans `App`). `PtyTerminal` (props `runnerKind`/`model` déjà présentes) — **inchangé**.
- **Mapping runner → kind PTY** : `claude-code` → `pty_runner_open(kind:"claude-code", model)` ;
  `ollama|litellm|codex` → **pas de spawn PTY** (§ 8, bannière). Le `shell` legacy reste un repli
  interne non exposé au choix d'agent.
- **`convhead`** : afficher (lecture seule) un indicateur « Coordinateur : *<nom>* · *<runner>* ·
  *<modèle|défaut>* » + lien « Éditer dans Réglages → Teams ». **Pas** de sélecteur runner/modèle ici
  (le runner n'est PAS un réglage de conversation : il appartient à l'agent, édité en Settings).
- **`SettingsView`** : le bloc « Chef-runner / Conversation » **retire** les champs **Runner par
  défaut** et **Modèle** GLOBAUX (superseded par la définition par agent — § 2.1/P1) et **renvoie**
  vers « Teams & agents » pour runner/modèle. Les champs **Allowlist** et **Trust** **restent**
  (politique de sécurité globale, AR-3). Les clés `chef_runner_kind`/`chef_model` ne sont plus écrites
  par l'UI (laissées en base, non destructif).

### 5.6 Réconciliation `DEMO_TEAM`, seed L7/L9

- `DEMO_TEAM` (front) **devient la graine** de la team par défaut : `useTeams` la convertit en `Team`
  (`id:"iakaframe"`, `name:"iakaframe"`, `vignetteTeam: ui_team || "lotr"`, `coordinator:"aragorn"`,
  agents en `runner:"claude-code", model:"", skills:[…]`) **si `teams` est vide**. Les helpers
  `teamBadge`/`roleIndex` restent. (Reco AR-1 sur le wording des skills par défaut.)
- **Seed Rust `seed.rs`** : ajouter `project_team:iaka-demo = "iakaframe"` (= `DEFAULT_TEAM_ID`,
  constante miroir) à `seed_config` (créer si absent, jamais d'écrasement), reporté dans
  `SeedReport.config_keys_set`. → la conversation démo s'ouvre **sans popup**. Le reste du contrat
  L7/L9 (dossier, config IA/Couch/n8n, démarrage Portfolio, `DEMO_HISTORY`, set de Work) **préservé**.
  Le seed **ne** sérialise **pas** le JSON `teams` (la graine reste front, source unique de la def) —
  il ne pose que la **liaison** (string).

---

## 6. COMPORTEMENTS — Rust

- **`config.rs`** : aucun changement structurel. **Option documentaire** : constantes de préfixe
  (`KEY_TEAMS="teams"`, `KEY_DEFAULT_TEAM="default_team"`, `PREFIX_PROJECT_TEAM="project_team:"`) +
  test `is_secret` (aucune n'est secrète). `DEFAULT_TEAM_ID="iakaframe"` (const partagée seed).
- **`seed.rs`** : ajouter `project_team:iaka-demo = DEFAULT_TEAM_ID` au seed (idempotent, non
  écrasement), test calque des tests seed existants.
- **`terminal.rs` / `pty_runner_open` / `RunnerSpec`** : **INCHANGÉS**. Reçoivent le kind/model
  résolus (coordinateur). Le scrub env, le trust, l'allowlist, le `session_id`, le `validate_cwd`
  restent **strictement** L10a/b.

---

## 7. FICHIERS TOUCHÉS (prévisionnel — Gimli ajuste)

**Front**
- `src/hooks/useTeams.ts` *(nouveau)* — autorité def + résolution + liaison + bootstrap.
- `src/components/TeamsEditor.tsx` *(nouveau)* — écran Settings « Teams & agents » (CRUD).
- `src/components/TeamPicker.tsx` *(nouveau)* — popup de liaison projet↔team.
- `src/theme/teamAvatar.ts` — `makeAvatarResolver(charte, vignetteTeam, roster)` (plus de `DEMO_TEAM`
  global câblé en dur dans la fabrique).
- `src/App.tsx` — câble `useTeams` ; déclenche `TeamPicker` dans `openProject` ; résolveur d'avatar +
  roster + coordinateur **par team du projet actif** ; passe runner/model du coordinateur à
  `WorkingView`.
- `src/views/WorkingView.tsx` — reçoit roster/coordinateur/runner/model résolus ; `convhead`
  read-only ; plus de `runnerKind="claude-code"` en dur.
- `src/views/SettingsView.tsx` — intègre `TeamsEditor` ; retire les champs runner/modèle GLOBAUX du
  bloc chef-runner (garde allowlist/trust).
- `src/components/Roster.tsx` — reçoit `members` = roster de la team (défaut secours `DEMO_TEAM`).
- `src/hooks/useConversations.ts` — `DEFAULT_RESPONSIBLE` n'est plus l'autorité (coordinateur résolu
  par `App`) ; `openConversation` reçoit le coordinateur.
- `src/hooks/useSettings.ts` — `ui_team` documentée « legacy/fallback » ; runner/modèle globaux non
  écrits par l'UI (champs/states laissés ou marqués deprecated, non destructif).
- `src/mock/demoTeam.ts` — `DEMO_TEAM` documenté « graine de la team par défaut » (+ éventuels
  `skills` par défaut, AR-1).

**Rust**
- `src-tauri/src/config.rs` — constantes de préfixe (optionnel) + test `is_secret`.
- `src-tauri/src/seed.rs` — `project_team:iaka-demo = "iakaframe"`.

**Tests** — § 9.

---

## 8. RÈGLE D'EXÉCUTION (la ligne DÉFINIT vs TOURNE — à graver)

> Cette section est le garde-fou anti-déformation : elle **sépare** ce qu'on définit (tout) de ce
> qui tourne (une étape), conformément à PROJET § 0.4. Gimli ne doit **jamais** réduire la définition
> pour simplifier l'exécution.

- **DÉFINI (toujours, complet)** : chaque team et chaque agent (persona + runner + modèle + skills),
  le coordinateur, le casting, la liaison projet→team. Éditables dans Settings, persistés en config.
- **TOURNE (étape actuelle)** :
  - Le **coordinateur** de la team du projet pilote **UN** terminal-source réel **si et seulement si**
    `coordinator.runner === "claude-code"` → `pty_runner_open(kind:"claude-code", model:coordinator.model)`
    (chemin L10a/b inchangé : TUI native + tailer transcript + chat-vue).
  - Coordinateur sur un runner **non câblé** (`ollama`/`litellm`/`codex`) : terminal-source **non
    spawné** ; conversation ouverte en **chat seul** avec **bannière honnête** (« runner `<X>` non
    encore exécutable — étape : claude-code ; définition conservée, câblage à venir »). Aucune perte
    de définition, aucun crash.
  - Les **autres agents** de la team sont **joignables en `@persona`** (préfixe verbatim → stdin du
    coordinateur), **sans** instancier leur propre runner (multi-runner réel = différé). Leur
    runner/modèle **défini** est **affiché** (roster/convhead) mais **pas exécuté**.
- **Extension future (différée, archi-compatible)** : un PTY/process par agent (chacun son runner)
  est un **branchement** sur `pty_runner_open` (ou un chemin API pour les runners non-PTY), **pas** une
  réécriture du modèle — c'est précisément ce que la définition complète rend trivial.

---

## 9. CRITÈRES D'ACCEPTATION (testables) + ce que Legolas vérifie

### 9.1 Modèle & définition (P1)
- [ ] **A1** — Au 1er montage (config vide), `useTeams` **bootstrap** la team par défaut `iakaframe`
      (coordinateur `aragorn`, 5 agents `runner:"claude-code"`, casting `lotr`) et persiste `teams`.
- [ ] **A2** — `teams`, `default_team`, `project_team:*` **remontent** par `config_all` (non secrets) ;
      `is_secret` faux pour `teams`/`default_team`/`project_team:<id>` (test Rust).
- [ ] **A3** — Créer une team (nom + casting) → persistée dans `teams` (JSON) ; ré-montage → relue.
- [ ] **A4** — Ajouter/éditer un agent (nom, royaume, roleIndex, **runner**, **modèle**, **skills**) →
      persisté ; désigner le **coordinateur** → persisté ; retirer un agent ≠ coordinateur → OK ;
      retirer le coordinateur → **refusé** (garde) ; retirer la dernière team / la team par défaut →
      **refusé**.
- [ ] **A5** — Le JSON `teams` **ne contient aucun secret** (aucun champ credential ; test : grep des
      clés du schéma = `{id,name,royaume,roleIndex,runner,model,skills}` / `{id,name,vignetteTeam,
      coordinator,agents}`, pas de `token/key/secret/password`).
- [ ] **A6** — Parse défensif : un `teams` illisible/partiel → bootstrap/ignore l'invalide, **jamais**
      d'exception (l'app démarre toujours avec ≥ 1 team).

### 9.2 Liaison projet↔team + popup (P2)
- [ ] **B1** — Ouvrir en Working un projet **sans** `project_team` → le popup `TeamPicker` s'affiche,
      listant les teams existantes, pré-sélection = `default_team`.
- [ ] **B2** — **Confirmer** une team → `configSet("project_team:<id>", teamId)` **et**
      `configSet("default_team", teamId)` ; la conversation s'ouvre ; interlocuteur = **coordinateur**
      de la team choisie.
- [ ] **B3** — Ré-ouvrir le **même** projet → **aucun** popup (liaison présente) ; un **autre** projet
      → popup, pré-sélection = **dernière team choisie**.
- [ ] **B4** — **Annuler** → **aucune** écriture ; conversation ouverte avec la team par défaut ;
      ré-ouvrir → popup **revient**.
- [ ] **B5** — Roster + vignettes du projet actif = **roster/casting de SA team** (`team.agents`,
      `team.vignetteTeam`), plus le `DEMO_TEAM`/`ui_team` global ; casting absent du manifest →
      fallback pastille.

### 9.3 Conversation routée au coordinateur + @agent (P2)
- [ ] **C1** — Interlocuteur par défaut d'une conversation = `coordinatorOf(team)` (plus
      `DEFAULT_RESPONSIBLE="Aragorn"` en dur). Changer le coordinateur en Settings → nouvelle
      conversation routée vers le nouveau coordinateur.
- [ ] **C2** — `@agent` bascule la persona **uniquement** vers un agent présent dans la team du projet ;
      contenu injecté **verbatim** au PTY du coordinateur ; un `@inconnu` = sans effet de persona.

### 9.4 Exécution staged (P3)
- [ ] **D1** — **Aucune** occurrence de `runnerKind="claude-code"` **en dur** dans une vue (grep) ;
      `WorkingView` reçoit le runner/modèle **du coordinateur**.
- [ ] **D2** — Coordinateur `runner:"claude-code"` → `ptyRunnerOpen` appelé avec
      `kind:"claude-code", model:coordinator.model` ; terminal-source spawné (test sur les args).
- [ ] **D3** — Coordinateur `runner:"ollama"|"litellm"|"codex"` → **aucun** `ptyRunnerOpen` ; bannière
      honnête affichée ; **définition conservée** (pas de mutation de la team) ; pas de crash.
- [ ] **D4** — `pty_runner_open` (Rust) **inchangé** : scrub env, `session_id`, `validate_cwd`,
      allowlist, trust **identiques** L10 (tests `terminal::` existants verts, non régressés).

### 9.5 Démo & non-régression
- [ ] **E1** — Au seed dev, `project_team:iaka-demo = "iakaframe"` posé (idempotent, non écrasé) → la
      conversation démo s'ouvre **sans popup**.
- [ ] **E2** — Contrats antérieurs verts : façade unique (grep `invoke` hors `backend.ts` = 0), CSP
      intacte (jamais null), vignettes L9 servies en `'self'`, conversation L8/L10 (chat-vue / tailer /
      entrée partagée) intacte.

### 9.6 Répartition test
- **Vitest (front)** : `useTeams` (bootstrap si vide, parse défensif, upsert/remove team+agent, gardes
  coordinateur/dernière team, `teamForProject`, `coordinatorOf`, `bindProjectTeam` maj `default_team`) ;
  `TeamsEditor` (CRUD, sélecteur runner avec flag executable, désignation coordinateur) ; `TeamPicker`
  (liste/pré-sélection/confirm/cancel, accès Settings) ; `App.openProject` (popup si `!hasBinding`) ;
  `makeAvatarResolver` par roster/casting ; args `ptyRunnerOpen` (D2/D3) ; routage coordinateur (C1) ;
  `@agent` borné à la team (C2).
- **cargo test (Rust)** : `is_secret` sur `teams`/`default_team`/`project_team:` (A2) ; seed
  `project_team:iaka-demo` (idempotence/non-écrasement, E1) ; non-régression `terminal::`/`config::`.
- **Recette manuelle `tauri dev`** : créer/éditer une team + agents (runner/modèle/skills) en Settings ;
  popup réel à l'ouverture d'un projet non lié ; bascule visuelle roster/vignettes par team ;
  lancement réel du **coordinateur claude-code** (terminal-source + chat-vue) ; bannière honnête sur un
  coordinateur ollama/codex ; démo sans popup.

---

## 10. GARDES ANTI-DÉRIVE (rappel pour Gimli)

1. **Ne PAS** recentrer sur « runner par projet » : le runner appartient à l'**agent**, défini **dans
   la team**. 2. **Ne PAS** réduire la team à un casting de vignettes : c'est une **entité de données**
   (roster + runner/modèle/skills par agent + coordinateur). 3. **Ne PAS** garder les settings
   runner/modèle **globaux** (superseded par-agent ; allowlist/trust restent globaux = sécurité,
   AR-3). 4. **Ne PAS** différer le runner/modèle **par agent** : il est DÉFINI dans ce lot (seule
   l'**exécution** est staged). 5. **Ne PAS** grise/retirer un runner du sélecteur de définition (on
   DÉFINIT tout ; on **informe** sur l'exécutabilité). 6. **Ne PAS** toucher `pty_runner_open`/scrub/
   trust/allowlist. 7. **Ne PAS** ajouter de commande Tauri (sauf nécessité actée). 8. **Ne PAS**
   mettre de secret dans le JSON `teams` (credentials = keychain). 9. **Ne PAS** régresser CSP /
   façade unique / chat-vue L10. 10. **Ne PAS** toucher `PROJET.md` (la vision appartient à Stéphane —
   cf. AR-6).

---

## 11. ARBITRAGES RÉSIDUELS — À VALIDER par Stéphane (sans rétrécir la cible)

- **AR-1 — Skills par défaut de la team `iakaframe`.** *Reco :* renseigner les ids de skill-rôles
  iakaframe connus (ex. `aragorn`→`iakaframe-aragorn`, `gandalf`→`iakaframe-cadrage`, `odin`→
  `iakaframe-odin`) ; agents sans skill connu = `[]`. → *Confirmer la liste / le format d'id.*
- **AR-2 — Liste des runners `AGENT_RUNNERS`.** *Reco :* `claude-code` (executable),
  `ollama`, `litellm`, `codex` (définissables, non exécutables ici), alignée § 0.2. → *Confirmer (faut-il
  scinder `ollama local`/`ollama lan`, `litellm local`/`litellm lan` dès la définition, ou un champ
  endpoint libre par agent ?).*
- **AR-3 — Allowlist / trust : globaux ou par agent ?** *Reco :* **rester globaux** pour ce lot
  (politique de sécurité d'exécution, inchangée L10b) ; les porter **par agent** quand un runner réel
  par agent sera câblé. → *Confirmer (sinon les remonter dans la def d'agent dès maintenant).*
- **AR-4 — Changer le coordinateur/runner d'une conversation déjà lancée.** *Reco :* appliqué à
  l'**ouverture** / au **prochain spawn** (pas de live-respawn — risque cycle de vie PTY/tailer). →
  *Confirmer « prochain lancement » suffit pour le MVP.*
- **AR-5 — JSON-en-config vs table Rust `teams`.** *Reco :* **JSON-en-config** (MVP, zéro commande
  Tauri). → *Confirmer (ou exiger d'emblée une table + commandes typées si les teams doivent porter
  des relations/concurrence).*
- **AR-6 — Tension avec PROJET § 0.4 (Settings GLOBAUX = étape actuelle).** Ce lot **avance** la
  définition **PER-AGENT** que § 0.4 classe en colonne CIBLE. **Faut-il mettre à jour la vision
  PROJET.md** (déplacer « Settings PAR AGENT » de CIBLE vers étape actuelle, en gardant « runners
  RÉELS par agent » = cible) ? **Je n'ai PAS touché PROJET.md** (la vision t'appartient). → *Décider
  si/quand réviser § 0.4.*
- **AR-7 — Identité visuelle des teams (libellés royaume vs rôle).** Hérité L9 (B-1) : les royaumes
  d'affichage `DEMO_TEAM` (ACCUEIL/CADRAGE…) sont conservés ; un agent créé reçoit un `royaume` libre.
  → *Confirmer (le casting visuel reste piloté par `roleIndex` + `vignetteTeam`).*

---

## 12. PHASAGE & ESTIMATION

| Phase | Contenu | Est. |
|---|---|---|
| **P1** | Modèle `teams` + `useTeams` (bootstrap/CRUD/gardes) + `TeamsEditor` (Settings) + retrait runner/modèle globaux | **~2,5–3 j** |
| **P2** | `project_team` + `TeamPicker` (popup) + résolveur avatar/roster par team + conversation routée coordinateur + `@agent` borné team | **~1,5–2 j** |
| **P3** | De-hardcodage runner (coordinateur → terminal-source) + règle d'exécution honnête (bannière) + seed `project_team:iaka-demo` | **~1 j** |
| **Tests + gate** | unités front + Rust + recette `tauri dev` | **~0,5–1 j** |

**Total ≈ 5,5–7 j-homme.** **Gate** : option par défaut = **un seul gate Legolas** à la fin (P1→P3
livrés ensemble). **Option recommandée à valider** : **gate intermédiaire après P1** (le modèle de
données + l'éditeur sont un livrable autonome, gros et structurant) puis gate final après P3. → AR à
trancher avec Stéphane selon l'appétit de revue.

---

## 13. JOURNAL DE DÉCISION

- **2026-06-27** — Stéphane **rejette** le cadrage `L11-runner-par-slot-team-projet.md` (cadre FAUX :
  runner au centre, team = vignettes, settings globaux, runner/modèle par agent différé).
- **2026-06-27** — Stéphane tranche l'**option 2** : construire **maintenant** la **définition
  team/agents dans les Settings** (runner + modèle + skills **par agent**, coordinateur désigné),
  team = **objet de premier rang**, conversation routée au **coordinateur**, popup de liaison
  projet↔team. La **définition** est complète ; l'**exécution** reste staged (coordinateur
  claude-code). Dissout le différé (c) L10.
- **2026-06-27** — Gandalf re-cadre (lecture seule du code) : entité `Team`/`Agent` en config JSON
  non sensible, `useTeams` autorité, `TeamsEditor` + `TeamPicker`, de-hardcodage runner/coordinateur,
  invariants conservés (façade unique, CSP, keychain, `pty_runner_open` inchangé). Estimation
  ≈ 5,5–7 j. Arbitrages résiduels AR-1..7 (dont AR-6 tension PROJET § 0.4, **PROJET.md non touché**).
