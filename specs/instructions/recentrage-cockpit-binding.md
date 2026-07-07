# Instruction : Recentrage du Cockpit — réception d'une team livrée + Binding (override) + pilotage

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : CADRÉ — RÉVISÉ 2026-07-07 — À VALIDER par Stéphane (gate humain obligatoire).** Doc en français,
> code/identifiants en anglais ; **rôles jamais désignés par un nom de code**.
> **Lot conséquence d'une évolution d'architecture validée au portefeuille** (modèle 3 couches E1) **+ décision
> portefeuille « deux logiciels séparés » (2026-07-07)**.

> ## ⚠️ RÉVISION 2026-07-07 — ce qui change vs la version précédente
>
> **Décision portefeuille (Stéphane) :** Forge = **crée & livre** ; Cockpit = **réceptionne, MODIFIE si besoin, et
> run**. **Le Cockpit N'EST PAS en lecture seule sur la définition.** Conséquences sur cette instruction :
> - **RETIRÉ** : la mise en **lecture seule** de la composition (ancienne § 3.C + ancienne Phase 2). Le Cockpit
>   **conserve « Le Cadre » (L22)** et **garde le droit d'éditer** personas/rôles/skills localement.
> - **GARDÉ** : (a) runner/modèle → couche **Binding** (run-time, override cockpit) ; (b) le **pilotage** inchangé.
> - **AJOUTÉ** : la **réception** d'une team/kit livrée par la forge, via le **handoff** (nouvelle instruction
>   `iakaFrameGUI/specs/instructions/H1-handoff-forge-cockpit.md`) — pivot **`team.json`**, provenance + anti-dérive.
> - **VOCABULAIRE** : on parle désormais de « **réceptionne + modifie si besoin + run** » (plus de « consomme en
>   lecture seule »). L'ancien wording « composition lecture seule » est **caduc**.
> - Le détail des sections révisées est marqué **[RÉVISÉ 2026-07-07]** ci-dessous.
>
> **Source de vérité (à relire EN PREMIER) :**
> - `/Users/sjupin/work/iakaFrameGUI/specs/instructions/H1-handoff-forge-cockpit.md` **(NOUVEAU, 2026-07-07)** —
>   le **format d'échange** forge→cockpit (pivot `team.json`, provenance, anti-dérive). Ce lot en est le pendant
>   côté réception/pilotage.
> - `/Users/sjupin/work/iakaFrameGUI/specs/contrat-concepts.md` **§ 0.3, § 1.1, § 2.8, § 2.9, § 5**
>   (modèle 3 couches, Team PURE, Binding, liaison forge↔cockpit).
> - `/Users/sjupin/work/iakaFrameGUI/specs/instructions/E1-evolution-binding-ar1.md` **§ 2, § 5, § 8, § 10**
>   (le Binding, la répartition forge/cockpit, le lot « recentrage Cockpit » nommé, les questions Q-1→Q-6).
> - `specs/PROJET.md` **§ 0.2** (« agent = runner + modèle + skills ») — **CE LOT AMENDE cette vision gravée**
>   (voir § 9 RISQUE).
> - `specs/instructions/L11-teams-agents-definition.md` (le modèle actuel « définition de premier rang »
>   que ce lot recadre).
>
> **Code inspecté en lecture seule le 2026-07-07 (rien n'est supposé) :**
> - `src/hooks/useTeams.ts:59-86` (schéma `Agent`/`Team` — `Agent` porte `runner`+`model`, à retirer),
>   `:34-42` (`AgentRunnerKind`, `AGENT_RUNNER_KINDS`), `:199-250` (`defaultTeamFromDemo`/`teamFromCatalog`
>   posent `runner:"claude-code", model:""` en dur), `:454-496` (`upsertAgent`/`setCoordinator`).
> - `src/components/TeamsEditor.tsx:478-518` (édition **runner** + **modèle** par agent — à déplacer),
>   `:412-537` (édition composition : nom/rôle/roleIndex/skills — à figer côté Cockpit à terme),
>   `:318-325` (bannière coordinateur non exécutable).
> - `src/App.tsx:278-282` (**point de pilotage** : `coord.runner`/`coord.model` → `ptyRunnerOpen` — DOIT
>   lire le Binding après refactor), `:156, :180, :201, :294-296` (résolution team/coordinateur).
> - `src/views/WorkingView.tsx:265-267, :375-398` (affichage + consommation runner/modèle du coordinateur).
> - `src/theme/roles.ts:22-30` (7 rôles canoniques — **définition**, reste dans la Team pure).

---

## 0. EN UNE PAGE — ce que ce lot change **[RÉVISÉ 2026-07-07]**

Le Cockpit passe de **« il définit TOUT »** (composition **+** runner/modèle, L11) à **« il RÉCEPTIONNE une
définition livrée, il la MODIFIE si besoin, il la LIE et il PILOTE »**, conformément au **modèle 3 couches** (E1)
**et** à la décision **« deux logiciels séparés »** (Forge crée & livre / Cockpit réceptionne, modifie, run) :

```
 AVANT (L11 — cadre à recentrer)          APRÈS (recentrage révisé 2026-07-07)
 ───────────────────────────────         ────────────────────────────────────
 Team (Cockpit)                           1. TEAM (DÉFINITION, PURE) ── ORIGINE = FORGE
   agent = persona                           personas · rôles · skills · gardes · workflow
     + RUNNER + MODÈLE  ◄── dans la déf       le Cockpit la RÉCEPTIONNE (H1) et PEUT la MODIFIER
     + skills                                 localement (Le Cadre L22 conservé), provenance tracée
   coordinateur                            2. BINDING (LIAISON) ── override = COCKPIT
 Le Cockpit édite la composition ET          persona → runner + modèle (par nœud)
 le runner/modèle.                           origin: "forge-default" | "cockpit-override"
                                           3. KIT = Team + (Binding?) = exécutable
                                           Le Cockpit : RÉCEPTIONNE + MODIFIE + LIE + PILOTE.
```

**Répartition cible [RÉVISÉE] :**
- **La FORGE = origine canonique** : elle **crée** rôles/skills/gardes/workflow/composition et **livre** un
  artefact (handoff, pivot `team.json` — cf. H1).
- **Le COCKPIT** : (a) **RÉCEPTIONNE** la team/kit livrée (H1, provenance tracée) ; (b) **MODIFIE si besoin** —
  il **conserve « Le Cadre » (L22)** et garde le droit d'éditer personas/rôles/skills **localement** (avec badge
  « modifié localement », anti-dérive H1 § 5) ; (c) **applique/édite un BINDING** — override `runner + modèle`
  **par persona**, désignation du coordinateur ; (d) **PILOTE** (terminal source, chat filtré, main courante,
  prochaine étape, délégations).
- **Ce que le Cockpit NE FAIT PLUS d'office** : il n'est plus la **seule origine** de la définition — l'origine
  canonique est la **forge**. **MAIS il n'est PAS en lecture seule** : la ré-édition locale reste permise et
  tracée. *(L'ancienne formulation « composition = lecture seule côté Cockpit » est **RETIRÉE**.)*

**Ligne rouge (non régression).** Le **pilotage déjà livré** (L10 terminal-source, L4/L18 main courante,
L8 chat-vue, L19 Gantt) **et « Le Cadre » (L22)** **ne doivent pas casser**. Le refactor est un **déplacement de
données** (runner/modèle sortent de la définition → couche Binding) **+ un ajout de réception** (H1), **pas** une
réécriture du spawn (`pty_runner_open` Rust **inchangé**, L10a/b) ni du Cadre (`frame.rs`/`frame.json` **inchangés**).

**⚠️ Ce lot AMENDE `PROJET.md § 0.2`** (« Settings = par agent : runner + modèle + skills se règlent agent
par agent »). Le runner+modèle **restent réglables par persona**, mais **dans une couche Binding séparée**,
plus dans la **définition** de team. → **Gate humain de Stéphane obligatoire** (§ 9) avant tout code.

---

## 1. LE MODÈLE 3 COUCHES (rappel — source `contrat-concepts.md` § 1.1, E1 § 2)

| Couche | Contenu | Propriétaire | Pureté |
|---|---|---|---|
| **1. Team (définition)** | personas · rôles · skills · gardes · workflow · connecteurs | **Forge** (foyer unique) ; **Cockpit consomme** | **PURE** — jamais de runner/modèle |
| **2. Binding (liaison)** | `persona → runner + modèle`, par nœud ; optionnel | **Forge** (défaut au déploiement) / **Cockpit** (override) | environnement-spécifique |
| **3. Kit déployé** | Team + (Binding ?) → **exécutable** | Forge (génère) | pur **sans** Binding ; standalone-runnable **avec** |

**Point de bascule** : la **pureté est une propriété de la Team, pas du Kit**. La Team reste portable ; le Kit
peut être **lié** (bound) pour tourner seul. Le **Binding est le pont** entre la définition portable et un
environnement d'exécution concret. Schéma partagé (E1 § 3) :

```ts
interface PersonaBinding { personaId: string; runner: RunnerKind; model: string; } // "" = défaut du runner
interface Binding {
  id: string;
  node: NodeKind;                                 // le Binding est PAR NŒUD
  teamId: string;
  bindings: PersonaBinding[];
  origin: "forge-default" | "cockpit-override";   // provenance (traçabilité)
}
```

---

## 2. AUDIT DU MODÈLE ACTUEL (Cockpit, L11) — ce qui viole le modèle 3 couches

**La violation unique et centrale :** `runner` et `model` vivent **dans la définition de l'agent**, donc
dans la **Team** — ce que le modèle cible interdit (la Team doit être **PURE**).

- **`src/hooks/useTeams.ts:59-74`** — `interface Agent` porte `runner: AgentRunnerKind` (l.69) et
  `model: string` (l.71) **à côté** de `id/name/royaume/roleIndex/skills`. → runner+modèle sont **dans la
  définition**. **À sortir** vers le Binding.
- **`useTeams.ts:76-86`** — `interface Team` = `{ id, name, vignetteTeam, coordinator, agents }`. Le reste
  (personas, coordinateur, casting) est **de la composition** = **définition forge**. Reste **pur** une fois
  runner/model retirés d'`Agent`.
- **`useTeams.ts:199-215` (`defaultTeamFromDemo`)** et **`:229-250` (`teamFromCatalog`)** — posent
  `runner:"claude-code", model:""` **en dur** sur chaque agent. → doivent poser un **Binding par défaut**
  (`origin:"forge-default"`), pas des champs de définition.
- **`useTeams.ts:127-155` (`parseAgent`)** — parse `runner`/`model` dans l'agent. → parse à migrer vers le
  Binding (§ 4).
- **`src/components/TeamsEditor.tsx:478-518`** — l'éditeur règle **runner** (l.481) et **modèle** (l.508)
  **par agent, dans la fiche de composition**. → ces deux champs **migrent** vers un volet **Liaison**
  (Binding). Le reste de la fiche (nom l.419, rôle l.434, roleIndex l.466, skills l.526) = **composition**.
- **`src/App.tsx:278-282`** — **point de pilotage** : `kind: coord?.runner`, `model: coord?.model` passés à
  `ptyRunnerOpen`. → après refactor, ces valeurs sont **résolues via le Binding** de la team (pour le nœud
  `claude`), plus lues sur l'agent. **C'est LE point sensible à ne pas casser.**
- **`src/views/WorkingView.tsx:265-267, :375-398`** — affichent le runner/modèle du coordinateur (convhead +
  panneau). → même source de vérité : le Binding.

**Conclusion d'audit.** Le refactor est **chirurgical et localisé** : un seul couple de champs
(`runner`/`model`) migre d'`Agent` (définition) vers une couche `Binding`. La **composition** (personas,
rôles via `roles.ts`, skills, casting, coordinateur) est déjà propre — elle **reste**, mais son **autorité
d'édition** bascule (forge définit ; Cockpit consomme → lecture seule à terme, § 3.C).

---

## 3. LE DELTA — ce qui bouge, ce qui reste

### 3.A Ce qui SORT de la définition → couche Binding
- **`Agent.runner` et `Agent.model`** quittent `interface Agent` (`useTeams.ts:69,71`).
- Ils deviennent un **`PersonaBinding { personaId, runner, model }`** dans un objet **`Binding`** par team
  (nœud `claude` au MVP), persisté **séparément** (§ 4).
- L'**édition** runner/modèle quitte la fiche de composition (`TeamsEditor.tsx:478-518`) → **volet Liaison**
  dédié (override de Binding). Le sélecteur runner (`AGENT_RUNNER_KINDS`) et le flag `isExecutableRunner`
  **restent** (ils décrivent la couche Binding, pas la définition).

### 3.B Ce qui RESTE côté Cockpit (son pouvoir/sa limite) — **RÉCEPTION + SÉLECTION + MODIF + OVERRIDE + PILOTAGE** **[RÉVISÉ 2026-07-07]**
- **RÉCEPTION** (nouveau, H1) : réceptionner une team/kit livrée par la forge (pivot `team.json`), enregistrer sa
  **provenance** ; la ré-édition locale reste permise (§ 3.C).
- **SÉLECTION** : choisir une team/kit pour un projet — `TeamPicker`, `project_team:<id>`, `default_team`
  (L11 § 5.2) **inchangés**. *(NB : « binding » du sens projet↔team ≠ « Binding » E1 runner/modèle — collision de
  vocabulaire à lever, cf. H1 § 6.)*
- **OVERRIDE du Binding** : changer **runner + modèle par persona** (`origin:"cockpit-override"`) ; **désigner
  le coordinateur/chef** (`setCoordinator` — c'est une décision de liaison/pilotage, pas de composition ;
  **reste éditable**).
- **PILOTAGE** (inchangé) : terminal source de vérité (L10), chat filtré (L8/L10b), main courante (L4/L18),
  prochaine étape (L3), Gantt (L19), délégations (L5). La résolution runner/modèle du coordinateur **lit le
  Binding** au lieu de l'agent (`App.tsx:278-282`).

### 3.C Ce qui est RÉCEPTIONNÉ de la forge et MODIFIABLE localement (définition = origine forge, édition permise) **[RÉVISÉ 2026-07-07]**
> **La mise en « lecture seule » de la composition est RETIRÉE.** Décision portefeuille : le Cockpit **réceptionne**
> la définition livrée par la forge **et peut la modifier si besoin** — il **conserve « Le Cadre » (L22)**.
- **Composition** (personas : nom/rôle/roleIndex, **skills**, **casting visuel**, création/suppression) : la forge
  en est l'**origine canonique**, mais le Cockpit **garde le droit d'éditer** ces éléments **localement**.
- **Traçabilité (anti-dérive, H1 § 5)** : toute édition locale d'une team **reçue** de la forge est **marquée**
  (`localEdits=true` + badge « modifié localement, diverge de la forge »). Une team **créée localement** (sans
  provenance forge) reste **pleinement éditable** sans marquage particulier.
- **Réconciliation au ré-import** : si la forge re-livre une version alors que le Cockpit a des éditions locales →
  **conflit explicite** (garder local / prendre forge / différer), **jamais d'écrasement silencieux** (H1 § 5).
- **« Le Cadre » (L22)** — règles/skills/templates/agents (`frame.json`) — **reste une capacité d'authoring
  cockpit à part entière**, joint à la définition par `teamId` + ids de skills (H1 § 4). **Inchangé par ce lot.**

---

## 4. MODÈLE DE DONNÉES — où vit le Binding côté Cockpit (réutilise `config.rs`)

**Principe (calque L11 § 3).** Pas de nouvelle table, pas de nouvelle commande Tauri. Le Binding est
sérialisé **JSON** en **config non sensible**, comme `teams`. `useTeams` reste l'autorité front
(`configGet/Set/All` via la façade unique `backend.ts`, D7).

| Clé config | Portée | Contenu | Secret ? |
|---|---|---|---|
| `teams` | globale (**existe**) | JSON `Team[]` — **purifié** : agents **sans** `runner`/`model` | non |
| `binding:<teamId>` | par team (**nouvelle**) | JSON `Binding` (nœud `claude` au MVP) : `{ teamId, node, bindings[], origin }` | non |
| `default_team`, `project_team:<id>`, `ui_team` | (existent — L11/L9) | inchangés | non |

**Résolution runner/modèle (nouvel ordre)** — remplace `App.tsx:278-282` :
1. `coord = coordinatorOf(teamForProject(projectId))` (inchangé) ;
2. `pb = bindingFor(team.id, "claude").bindings.find(b => b.personaId === coord.id)` ;
3. runner effectif = `pb?.runner ?? "claude-code"` ; modèle = `pb?.model ?? ""` (défaut runner) ;
4. valeur absente → défaut runner (jamais de crash, calque garde L11).

**INVARIANT secret (dur, inchangé).** Le Binding **ne contient AUCUN secret** (runner = *kind*, modèle =
alias). Credentials runner distants (Ollama-lan, LiteLLM, Claude) = **keychain write-only**, jamais dans
`binding:*` ni `teams`.

**`useTeams` — API ajoutée (autorité du Binding, calque `upsertTeam`/`bindProjectTeam`) :**
```ts
bindingFor(teamId: string, node?: NodeKind): Binding;                 // défaut node = "claude" ; jamais null
setPersonaBinding(teamId, personaId, runner, model): Promise<void>;   // override → origin:"cockpit-override"
resolveRunnerModel(team, agent): { runner: AgentRunnerKind; model: string }; // pilotage (App.tsx)
```
Les writes de composition (`upsertAgent`, `removeAgent`, `upsertTeam`, `removeTeam`) restent **présents** en
phase 1 (édition tolérée) et passent en **no-op/masqués** en phase 2 (lecture seule — § 5).

---

## 5. PHASAGE DOUX (ne casse ni le pilotage livré, ni la capacité de travailler)

> **Contrainte cardinale [RÉVISÉE 2026-07-07]** : la forge est désormais **codée** (`@iakaframe/core` produit des
> `team.json` pures + des kits ; cf. H1 § 1.A), **mais** le **canal de handoff** (dépôt/réception) et le **Binding**
> partagé (E1, lot forge P7) **ne sont pas encore branchés**. Surtout, la décision portefeuille impose que le
> Cockpit **puisse toujours modifier** — donc **aucune** phase ne met la composition en lecture seule. D'où un
> phasage en **3 temps**, chacun livrable et gaté, **sans jamais casser** L10/L4/L8/L19 ni « Le Cadre » (L22).

### Phase 1 — Introduire la couche Binding (refactor de données, comportement pilotage IDENTIQUE)
- Retirer `runner`/`model` d'`interface Agent` (`useTeams.ts:69,71`).
- Créer `interface Binding`/`PersonaBinding` + clé `binding:<teamId>` + API `useTeams` (§ 4).
- **Migration non destructive** au chargement (`load`, `useTeams.ts:356-382`) : pour chaque team du `teams`
  existant qui porte encore `runner`/`model` sur ses agents → **construire un `binding:<teamId>`**
  (`origin:"forge-default"`) à partir de ces valeurs, **puis** réécrire `teams` purifié. **Idempotent** (si
  `binding:<teamId>` existe déjà, ne rien écraser). `defaultTeamFromDemo`/`teamFromCatalog` posent le Binding
  par défaut au lieu des champs d'agent.
- **Pilotage** : `App.tsx:278-282` lit `resolveRunnerModel` (Binding) → **le PTY spawne exactement comme
  avant** (mêmes args, `pty_runner_open` Rust **inchangé**). `WorkingView` convhead/panneau lisent le Binding.
- **Éditeur** : `TeamsEditor.tsx:478-518` — les champs runner/modèle **changent de source** (écrivent
  `setPersonaBinding` au lieu de `upsertAgent`) mais **restent au même endroit visuellement** (0 régression
  UX). Le reste de la fiche (composition) **reste éditable** en phase 1.
- **Gate Legolas** : pilotage réel (coordinateur claude-code) + bannière runner non exécutable + démo
  **identiques** à L11 ; aucun secret dans `binding:*`.

### Phase 2 — Réception d'une team livrée + provenance (volet « Liaison » distinct) **[RÉVISÉ 2026-07-07 — plus de lecture seule]**
> **La bascule en lecture seule de la composition est SUPPRIMÉE.** Cette phase apporte la **réception** (H1) et la
> **traçabilité**, **sans jamais retirer** le droit d'édition locale (le Cockpit **modifie si besoin**).
- Séparer visuellement, dans la page Teams (`TeamsView`/`TeamsEditor`), **deux zones** : **Définition**
  (composition — **éditable**, avec badge de provenance « reçue de la forge » **ou** « locale », et « modifiée
  localement » si divergence) et **Liaison** (override runner/modèle par persona + coordinateur, **éditable**).
- Brancher la **réception H1** : façade `handoffImport(dir)` → crée/met à jour une team dans `useTeams` +
  enregistre la provenance (`handoff.json` : source/version/teamId/originHash). Édition locale ⇒ `localEdits=true`.
- **Réconciliation au ré-import** : conflit explicite si `localEdits` + `originHash` changé (garder/prendre/différer)
  — **jamais d'écrasement silencieux** (parade à la dérive `CLAUDE.md`/skills).
- **Déclencheur** : cette phase s'ouvre avec le **canal de handoff** (H1) et le lot forge **P7**. Tant qu'ils
  n'existent pas, le magasin local `teams` tient la définition (phase 1 suffit). **Aucune capacité d'édition
  n'est retirée** entre-temps.

### Phase 3 — Override cockpit persistant + traçabilité `origin` (raffinement)
- Distinguer visuellement un Binding `forge-default` d'un `cockpit-override` (badge provenance, E1 Q-5) ;
  « réinitialiser au défaut forge » (efface l'override, revient au `forge-default`).
- **Différable** : n'est utile qu'une fois le handoff forge réel en place.

> **MVP = Phase 1 seule.** Elle honore le modèle 3 couches **au niveau des données** (Team pure + Binding
> séparé) **sans** rien casser du pilotage, **sans** retirer « Le Cadre » (L22), et **sans** priver Stéphane
> d'éditer sa composition. Phase 2 (réception H1 + provenance) et Phase 3 (traçabilité `origin`) = **différées,
> tracées**, ouvertes par l'arrivée du handoff forge. **Aucune phase ne met la composition en lecture seule.**

---

## 6. COMMENT LE COCKPIT RÉCEPTIONNE UNE TEAM LIVRÉE PAR LA FORGE **[RÉVISÉ 2026-07-07]**

**État de l'art (vérifié 2026-07-07).** La forge (iakaFrameGUI) est **codée** : `@iakaframe/core` produit des
**`team.json` pures** (`serializeTeam`) et des **kits** déployables (`generateClaudeCodeKit`/`generateAgentsMdKit`
→ `kit_deploy`). **MAIS** le **canal de handoff** (dépôt/réception d'un artefact) et le **Binding partagé** (E1)
**ne sont pas encore codés**. Le **format d'échange** est cadré dans l'instruction dédiée
**`iakaFrameGUI/specs/instructions/H1-handoff-forge-cockpit.md`** (pivot **`team.json`**, pas `agent.md`).

**Cible (H1 + E1 § 5).**
1. **Forge** crée une **Team PURE** → la **livre** (paquet de handoff : `team.json` + provenance ; `binding.json`
   et `kit/` quand P7 arrive).
2. **Cockpit** **réceptionne** (H1) la team livrée → la **modifie si besoin** (composition locale + « Le Cadre »
   L22, provenance tracée) → **override** le Binding (`origin:"cockpit-override"`) → **pilote**.

**Au MVP de ce lot (Phase 1), le magasin local `teams`** (déjà en place) tient la définition et reçoit la couche
Binding. La **réception H1** (façade `handoffImport`) est la **Phase 2**, branchée sur ce **même magasin** — la
Phase 1 la rend triviale (Team déjà pure, Binding déjà séparé). **Contrainte de forme** : le schéma `Team` du
Cockpit doit **rester aligné** sur `contrat-concepts.md § 2.8` et sur `@iakaframe/core` (H1 § 3.4) pour qu'un
`team.json` forge se déverse **sans transformation** (renommage `Agent`→`Persona` : voir Q d'arbitrage § 8).
**Le Cockpit conserve « Le Cadre » (L22)** : la réception n'est **pas** en lecture seule (§ 3.C).

---

## 7. CRITÈRES D'ACCEPTATION (testables) + ce que Legolas vérifie

### 7.1 Modèle de données — Team pure + Binding (Phase 1)
- [ ] **A1** — `interface Agent` **ne contient plus** `runner` ni `model` (grep : 0 occurrence de `runner`/
      `model` dans `interface Agent`) ; le schéma `teams` sérialisé n'a plus ces champs sur les agents.
- [ ] **A2** — `interface Binding`/`PersonaBinding` existent (schéma E1 § 3 : `{teamId, node, bindings[],
      origin}`) ; `bindingFor(teamId, "claude")` renvoie **toujours** un Binding (jamais null).
- [ ] **A3** — `binding:<teamId>` est **non secret** (`is_secret` faux — test Rust, calque `project_team:`).
- [ ] **A4** — **Migration idempotente** : au 1er chargement d'un `teams` legacy (agents avec runner/model),
      un `binding:<teamId>` `origin:"forge-default"` est créé depuis ces valeurs **et** `teams` est réécrit
      purifié ; 2ᵉ chargement → **aucune** réécriture (idempotent) ; un `binding:<teamId>` déjà présent
      **n'est jamais écrasé**.
- [ ] **A5** — **Aucun secret** dans `binding:*` ni `teams` (grep des clés du schéma ; credentials = keychain).

### 7.2 Pilotage — non-régression (Phase 1)
- [ ] **B1** — `App` résout le runner/modèle du coordinateur **via le Binding** (`resolveRunnerModel`), plus
      via `coord.runner`/`coord.model` ; `ptyRunnerOpen` reçoit **les mêmes args qu'avant** pour un Binding
      `claude-code` (test sur les args).
- [ ] **B2** — `pty_runner_open` / `RunnerSpec` / scrub env / trust / allowlist / `validate_cwd` **Rust
      INCHANGÉS** (tests `terminal::` verts, non régressés).
- [ ] **B3** — Coordinateur lié à un runner non exécutable (`ollama`/`litellm`) → **bannière honnête**
      (calque L11 § 8), **aucun** `ptyRunnerOpen`, définition + Binding conservés, pas de crash.
- [ ] **B4** — Main courante (L4/L18), chat-vue (L8/L10b), Gantt (L19), démo `iaka-demo` : **intacts**
      (ouvre sans popup, coordinateur claude-code réel, transcript alimenté).

### 7.3 Édition Binding (Phase 1)
- [ ] **C1** — Régler runner/modèle d'une persona dans l'éditeur → écrit `binding:<teamId>` via
      `setPersonaBinding` (**pas** `upsertAgent`) ; `origin` passe à `"cockpit-override"` ; relecture OK.
- [ ] **C2** — Désigner le coordinateur (`setCoordinator`) **reste** possible (liaison/pilotage).

### 7.4 Réception & provenance (Phase 2 — vérifié SI ouverte) **[RÉVISÉ 2026-07-07 — plus de lecture seule]**
- [ ] **D1** — Zone **Définition** (personas/rôles/skills/casting/création-suppression) **reste ÉDITABLE** ;
      elle porte un **badge de provenance** (« reçue de la forge » / « locale ») et « **modifiée localement** » si
      divergence. Zone **Liaison** (runner/modèle + coordinateur) **éditable**. **Aucune** mise en lecture seule.
- [ ] **D2** — `handoffImport(dir)` (H1) crée/met à jour une team **sans** perdre les champs additifs
      (`roleKey`/`guardrails`/`methodId` en passthrough) ; **idempotent** ; provenance enregistrée.
- [ ] **D3** — Ré-import d'une nouvelle livraison avec éditions locales → **conflit explicite** (garder/prendre/
      différer), **aucun écrasement silencieux**. (Différé tant que le handoff forge n'existe pas — tracé.)
- [ ] **D4** — « Le Cadre » (L22 — `frame.rs`/`frame.json`) **intact** : aucune régression de l'authoring de
      règles/skills/templates ; jointure au roster par `teamId` + ids de skills opérante.

**Répartition test.** Vitest (front) : schéma pur `Agent`/`Team` ; `Binding` + `bindingFor`/
`setPersonaBinding`/`resolveRunnerModel` ; migration idempotente ; args `ptyRunnerOpen` (B1) ; bannière (B3).
cargo test (Rust) : `is_secret` sur `binding:` (A3) ; non-régression `terminal::`/`config::`. Recette
`tauri dev` : pilotage réel coordinateur claude-code ; override runner/modèle ; démo sans popup.

---

## 8. QUESTIONS D'ARBITRAGE — À TRANCHER par Stéphane (prose)

**Q-A — Où est persisté le Binding côté Cockpit ?** *Reco : une clé `binding:<teamId>` par team, JSON non
sensible, nœud `claude` implicite au MVP (champ `node` présent pour la compat multi-nœud E1 Q-2). Alternative :
`binding:<teamId>:<node>` d'emblée si tu veux préparer plusieurs nœuds tout de suite.* La reco reste au plus
simple (un nœud aujourd'hui), le champ `node` gardant la porte ouverte.

**Q-B — Import d'une team forge = quel canal ?** *Reco : au MVP (Phase 1), aucun import réel — le magasin
local `teams` tient la définition purifiée ; le vrai import (fichier `team.json` déposé, ou dépôt/dossier
partagé lu par le Cockpit) est un lot ultérieur, ouvert par l'authoring forge (P7).* → **À trancher** : veux-tu
un **fichier partagé** (ex. la forge écrit un `team.json` que le Cockpit lit) ou un **dépôt/dossier commun**
(les deux apps pointent le même emplacement) ? Cela conditionne la Phase 2.

**Q-C — Migration des `teams.json` existantes.** *Reco : migration **automatique, non destructive,
idempotente** au chargement (§ 5 Phase 1) — on splitte runner/model vers `binding:<teamId>`
(`origin:"forge-default"`) et on purifie `teams`, sans perte ni écrasement.* → **Confirmer** qu'une migration
silencieuse au démarrage te convient (vs un bouton explicite « migrer »).

**Q-D — Renommer `Agent` → `Persona` côté Cockpit ?** Le contrat de concepts nomme la définition **Persona**
(`contrat-concepts.md § 2.8`). *Reco : **différer le renommage** (touche `useTeams`, `TeamsEditor`, `Roster`,
tests — bruit important) ; garder `Agent` en Phase 1, renommer quand l'import forge arrive (Phase 2), pour que
le schéma se déverse sans friction.* → **Confirmer** (ou renommer tout de suite si tu préfères aligner le
vocabulaire dès maintenant).

**Q-E — Réception d'une team livrée : provenance + anti-dérive (Phase 2) [RÉVISÉ 2026-07-07].** *La question
n'est PLUS « quand passer en lecture seule » (décision portefeuille : le Cockpit **modifie si besoin**, jamais
de lecture seule). Elle devient : **quel niveau de traçabilité** à la réception ?* Reco : au minimum **provenance
+ badge « modifié localement » + refus d'écrasement silencieux au ré-import** (H1 § 5) ; la **fusion assistée
3-way** est différée. → **Confirmer** que Phase 1 seule = le périmètre de CE lot, et que Phase 2 (réception H1 +
provenance) attend le canal de handoff.

**Q-F — Le sélecteur de runners `AGENT_RUNNER_KINDS` reste-t-il tel quel ?** *Reco : oui — il décrit désormais
la couche **Binding** (pas la définition) ; `claude-code`/`codex` exécutables, `ollama`/`litellm` définissables
(bannière). Aligne le vocabulaire runner sur `contrat-concepts.md § 4.1` (AR-2).*

---

## 9. RISQUE + GATE HUMAIN (obligatoire)

**Ce lot AMENDE la vision gravée `PROJET.md § 0.2`.** Le texte actuel dit : *« Settings = par agent : runner +
modèle + skills se règlent **agent par agent** »* et *« agent = runner + modèle + skills »*. Après ce lot :
- **skills** restent une propriété de la **définition** (Team pure) ;
- **runner + modèle** deviennent une propriété de la **couche Binding** (liaison), **séparée** de la
  définition — toujours réglables **par persona**, mais **plus dans la définition d'agent**.

C'est une **modification de la vision** du produit (la répartition définition/liaison change), motivée par une
**décision de niveau portefeuille** (E1, modèle 3 couches). **Gandalf ne touche PAS `PROJET.md`** — la vision
appartient à Stéphane. **Deux décisions humaines requises avant tout code :**
1. **Valider l'amendement de `PROJET.md § 0.2`** (déplacer runner/modèle de « définition d'agent » vers
   « couche Binding / liaison », en gardant « réglable par persona ») — ou refuser/ajuster.
2. **Valider le périmètre de ce lot** = **Phase 1 seule** (couche Binding + migration + pilotage inchangé),
   Phases 2–3 différées jusqu'à l'authoring forge.

**Autres risques tracés :**
- **Régression pilotage** (le point le plus sensible) : `App.tsx:278-282` change de source de vérité →
  couvert par B1/B2/B4 (args PTY identiques, Rust inchangé, démo intacte).
- **Perte de capacité de composition** → **écartée par principe** [RÉVISÉ 2026-07-07] : la décision portefeuille
  interdit la lecture seule ; le Cockpit **conserve** l'édition locale + « Le Cadre » (L22). La seule contrainte
  ajoutée est la **traçabilité** (provenance + anti-dérive, H1 § 5), pas une restriction.
- **Dérive silencieuse** (édition locale qui diverge de l'origine forge sans trace, fléau `CLAUDE.md`/skills) →
  neutralisée par la provenance + le badge « modifié localement » + le refus d'écrasement au ré-import (H1 § 5).
- **Divergence de schéma** Cockpit ↔ contrat de concepts → maîtrisée par l'alignement `Persona` (Q-D) et le
  gel du schéma `Team` pur sur `contrat-concepts.md § 2.8`.

> **Tant que le gate humain n'est pas franchi, aucune implémentation.** Ce lot ne produit que du cadrage.

---

## 10. JALON (gate humain)

```
   ___    _    _____ _____
  / __|  /_\  |_   _| ____|
 | (_ | / _ \   | | |  _|
  \___|/_/ \_\  |_| |_____|
```

| | |
|---|---|
| **Émetteur** | 🧙 Gandalf — [IAKACOCKPIT] (P1, cadrage) |
| **Contenu** | Instruction « Recentrage du Cockpit » **[RÉVISÉE 2026-07-07]** : réception d'une team livrée (H1) + **Binding** (override cockpit) + pilotage, **Cockpit qui MODIFIE si besoin (PAS lecture seule) + conserve « Le Cadre » (L22)**. Amende `PROJET.md § 0.2`. Périmètre = Phase 1 (couche Binding + migration + pilotage inchangé) ; Phase 2 = réception H1 + provenance/anti-dérive (différée, canal de handoff) ; Phase 3 différée. |
| **Récepteur** | Stéphane (décideur) → validation → déclenche 🪓 Gimli (P2) |

**Fichiers à vérifier (chemin:ligne) :**
- `src/hooks/useTeams.ts:59-86` — `Agent`/`Team` (runner/model à retirer de `Agent`).
- `src/hooks/useTeams.ts:199-215, :229-250` — bootstrap posant runner/model en dur → Binding défaut.
- `src/components/TeamsEditor.tsx:478-518` — édition runner/modèle → volet Liaison.
- `src/App.tsx:278-282` — pilotage (résolution runner/modèle → via Binding, à ne pas casser).
- `src/views/WorkingView.tsx:265-267, :375-398` — affichage runner/modèle du coordinateur.
- `specs/PROJET.md:42-52` (§ 0.2) — vision amendée (décision humaine).
- Réf. amont : `/Users/sjupin/work/iakaFrameGUI/specs/contrat-concepts.md:57-67, :185-205` +
  `/Users/sjupin/work/iakaFrameGUI/specs/instructions/E1-evolution-binding-ar1.md:28-115`.

À la validation : « JALON VALIDÉ » + Gimli lit cette instruction avant de coder la **Phase 1**.

---

## 11. JOURNAL DE DÉCISION

- **2026-07-07** — E1 (niveau portefeuille) grave le modèle **3 couches** : Team PURE (forge) + Binding
  (forge défaut / cockpit override) = Kit exécutable. Nomme le lot aval **« recentrage Cockpit »**.
- **2026-07-07** — Gandalf cadre le recentrage (lecture seule du code) : audit → la seule violation est
  `Agent.runner`/`Agent.model` dans la définition (`useTeams.ts:69,71`). Delta = sortir runner/modèle vers une
  couche **Binding** (clé `binding:<teamId>`, JSON non sensible) ; Cockpit = **sélection + override + pilotage**
  ; composition = **lecture seule à terme** (forge définit). **Phasage doux** (Phase 1 = données + pilotage
  inchangé ; Phases 2–3 différées jusqu'à l'authoring forge). **Amende `PROJET.md § 0.2` → gate humain
  obligatoire.** Arbitrages Q-A→Q-F. `PROJET.md` **non touché**.
- **2026-07-07 (RÉVISION)** — Décision portefeuille **« deux logiciels séparés »** (Forge crée & livre / Cockpit
  réceptionne, MODIFIE si besoin, run). **RETRAIT de la lecture seule de la composition** (ancienne § 3.C +
  ancienne Phase 2). Le Cockpit **conserve « Le Cadre » (L22)** et **garde le droit d'éditer** localement.
  **AJOUT de la réception** d'une team livrée par la forge via le **handoff H1**
  (`iakaFrameGUI/specs/instructions/H1-handoff-forge-cockpit.md`, pivot **`team.json`**, pas `agent.md`), avec
  **provenance + anti-dérive** (badge « modifié localement », refus d'écrasement silencieux). Vocabulaire aligné
  sur « réceptionne + modifie + run ». Signalé : **collision « binding »** projet↔team (L11) vs runner/modèle (E1)
  → cf. H1 § 6. Constat : la forge est désormais **codée** (`@iakaframe/core` produit `team.json` + kits), mais
  le **canal de handoff** et le **Binding partagé** ne sont pas branchés (Phase 2 différée). **Aucune phase ne met
  la composition en lecture seule.**
