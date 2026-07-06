# Instruction : L22 — « Le Cadre », GUI de configuration iakaframe

> Rédigé au cadrage (2026-07-06), à partir d'une demande de Stéphane + 3 itérations de
> mock (artifact « Le Cadre » v1→v3). Consommé comme instruction de travail.
> Statut : **cadré. AR-1 + AR-3 TRANCHÉS (2026-07-06) ; AR-2/4/5/6 à confirmer en cours.**
> AR-1 = `frame.json` versionnable par team. AR-3 = P1 éditeurs seuls, conversation en P2.

---

## Contexte

iakaframe a besoin d'un **GUI de configuration** : définir, pour une équipe, les éléments
de son **cadre de travail** (compétences, autorisations, interdits, obligations, tools,
gestes, chaîne des délégations). Décision de Stéphane : **le loger dans iakacockpit** (5ᵉ/6ᵉ
vue « Cadre »). Le cockpit **édite** un cadre qui sera **consommé par iakaframe** (runners,
gardes, system-prompt).

Idée directrice (Stéphane) : on **définit le cadre en conversant** — une zone de conversation
propose des éléments **structurés**, l'utilisateur valide/édite. « La conversation propose,
l'utilisateur valide » (pas de magie).

## Modèle de données (ontologie — VERROUILLÉE avec Stéphane 2026-07-02)

Modèle à **4 niveaux** + 2 structures à part :

1. **Règle** — brique atomique, **typée**. Types : `interdit`, `autorisation`, `obligation`,
   `tool`, `geste`, `compétence`. *(La `délégation` N'EST PAS un type de règle.)* Réutilisable.
2. **Skill** — un **paquet NOMMÉ de règles** réutilisable (ex. « Git sûr » = autorisation
   `git commit` + interdit `push --force` + obligation « commits atomiques »).
3. **Template d'agent** — un **assemblage de skills + de règles** → définit un **type d'agent**
   (Développeur, Qualité, Coordinateur…).
4. **Agent (dans une team)** — **un template + des skills/règles complémentaires + un nom**
   (« Gimli » basé sur Développeur + 2 règles).

À part :
- **Règles projet** — règles à **portée projet** (s'appliquent au projet, pas à un agent).
- **Chaîne des délégations** — **structure au niveau team** (le graphe qui→qui, un arbre) ;
  PAS des règles posées agent par agent.

Composition : `Règle (typée) → Skill (paquet) → Template (type d'agent) → Agent (nommé)`.

Le mock de référence (3 itérations) illustre : ruban du modèle, onglets par couche
(Règles · Skills · Templates · Team · Règles projet · Délégations), assemblage d'un template
groupé par type, bande Team = instances nommées, graphe de délégations, et la zone de
conversation avec micro de dictée.

## Ce qui existe (à réutiliser — ne pas réimplémenter)

| Élément | Où | État |
|---|---|---|
| Teams/agents (nom, runner, modèle, skills) | `src/hooks/useTeams.ts`, `TeamsView`, `src/mock/catalog.ts` | implémenté (L11/L13) — **base du niveau Team/Agent** |
| Config non sensible (SQLite) | `src-tauri/src/config.rs`, façade `configGet/Set/All` | implémenté (L0) — **candidat persistance** |
| Injection runner (allowlist, system-prompt) | `terminal.rs` `RunnerSpec`, `--allowedTools`, `--append-system-prompt` | implémenté (L10/L11/L19) — **cible d'application des règles** |
| Garde des délégations (hook) | `~/.claude/delegation-guard.mjs` (hors dépôt, L5) | implémenté — **cible d'application de la chaîne** |
| Conversation + persona + dictée vocale | `useConversations`, `Chat.tsx`, `useVoiceDictation`, `ai.rs chat` | implémenté (L8/L16) — **base de la zone de conversation** |
| Nav 5 vues | `useGridState` (`ViewId`) | implémenté — **ajouter `cadre`** |
| Cadre (règles/skills/templates/délégations) | — | **absent → ce lot** |

## Décision (approche + alternatives écartées)

- **Structure = données d'abord, UI ensuite.** Un modèle TS **pur** (`src/frame/model.ts`)
  décrit Règle/Skill/Template/AgentInstance/ProjectRule/DelegationGraph, avec validation.
  Un hook `useFrame` (autorité, calque `useTeams`) porte l'état + le CRUD via la **façade
  unique**. Vues présentationnelles. *(Écarté : tout mettre dans `useTeams` — mélangerait
  deux préoccupations ; le Cadre est plus large que la team.)*
- **Le niveau Team/Agent réutilise `useTeams`** (ne pas dupliquer) : un agent de team = son
  entrée `useTeams` **enrichie** d'un `templateId` + règles/skills propres.
- **Édition structurée en P1, conversation-authoring en P2.** Le MVP livre le **modèle + les
  éditeurs CRUD** (règles, skills, templates, team, règles projet, graphe de délégations) —
  utilisable sans LLM. La **zone de conversation** (qui *propose* des éléments structurés via
  Ollama, sortie JSON contrainte, réutilise `ai.rs chat` + `useVoiceDictation`) vient en P2.
  *Rationale MVP-first ; MAIS la conversation est la signature du produit → P2 doit suivre de
  près, pas être un différé lointain.* **(AR-3 à trancher : P1 sans conversation, ou P1 avec
  conversation sur UNE couche pour prouver la chaîne.)*
- **Application des règles (enforcement) = P3.** Traduire le cadre validé en `--allowedTools`
  (tools + autorisations/interdits), `--append-system-prompt` (obligations + compétences), et
  garde de délégations (chaîne). *En P1/P2 le cadre est édité et persisté mais pas encore
  « branché » aux runners — évite de casser l'exécution avant que le modèle soit stable.*

## Arbitrages à trancher (Stéphane) — recommandations

- **AR-1 · Persistance.** Reco : **un `frame.json` par team, versionnable**, édité par le
  cockpit et **consommable par iakaframe** (source de vérité partagée), persisté via une
  nouvelle façade Rust (fichier sous le chapeau/le projet). Alternative : blob SQLite
  `config` (plus simple, mais non partageable hors cockpit). *Reco = `frame.json`.*
- **AR-2 · Portée / héritage.** Reco : **3 niveaux hérités** `global → team → agent`
  (agent hérite de la team qui hérite du global) ; MVP = **team + agent**, global en réserve.
- **AR-3 · Conversation en P1 ou P2** (cf. Décision). Reco : **P1 = éditeurs seuls**,
  **P2 = conversation-authoring** (mais enchaînée vite).
- **AR-4 · `geste` comme type de règle.** Confirmer la sémantique d'un « geste » (une action
  émise, ex. notifier/déléguer/tracer ?) — sinon le retirer des types en P1.
- **AR-5 · Where the frame lives.** Confirmer : le cockpit **édite** un cadre **consommé par
  iakaframe** (hypothèse retenue), vs brique autonome.
- **AR-6 · Enforcement P3** : ordre de branchement (tools/allowlist d'abord, obligations
  ensuite, chaîne de délégations en dernier).

## Phasage

- **P1 — Modèle + éditeurs (ce lot MVP).** `src/frame/model.ts` (types + validation) ; `useFrame`
  (CRUD via façade) ; persistance AR-1 (nouvelle façade Rust) ; vue `CadreView` (6ᵉ vue, nav) avec
  les couches : **Règles** (bibliothèque typée), **Skills** (paquets), **Templates** (assemblage
  groupé par type), **Team** (instances nommées, réutilise `useTeams`), **Règles projet**,
  **Délégations** (éditeur de graphe). Édition directe (pickers/formulaires), **pas de LLM**.
- **P2 — Conversation-authoring.** Zone de conversation par couche : Ollama (via `ai.rs chat`,
  sortie JSON contrainte) **propose** une règle/skill/assemblage structuré, l'utilisateur
  valide/édite ; micro de dictée (`useVoiceDictation`) branché. Anti-duplication (repérer une
  règle déjà couverte par un skill).
- **P3 — Enforcement.** Traduire le cadre validé → `--allowedTools` / `--append-system-prompt`
  (runner, `terminal.rs`) + garde de délégations (hook L5). Lecture dans le Journal.

## Étapes d'implémentation (P1)

1. `src/frame/model.ts` : types `Rule` (avec `type` ∈ enum), `Skill` (`ruleIds[]`), `AgentTemplate`
   (`skillIds[]` + `ruleIds[]`), `AgentInstance` (`templateId` + extras + `name`), `ProjectRule`,
   `DelegationGraph` (arêtes team). Validation pure + tests.
2. Persistance AR-1 : façade `frameLoad()/frameSave(teamId, frame)` (D7) + commande Rust
   (`frame.rs`, écrit/lit `frame.json`, `pathguard`, dégradation propre). Tests Rust.
3. `useFrame` (hook autorité, CRUD, calque `useTeams`) + réconciliation avec `useTeams` pour la
   couche Team/Agent (pas de duplication).
4. `CadreView` + sous-composants présentationnels par couche (Règles/Skills/Templates/Team/
   Règles projet/Délégations), rendu fidèle au mock v3 (ruban, onglets, assemblage groupé par
   type, bande team, graphe). i18n FR/EN.
5. Ajouter `cadre` à `ViewId` (`useGridState`) + entrée de rail.
6. Seed démo dev : un cadre d'exemple pour `iaka-demo` (dev-gardé, calque L7/L9).

## Fichiers concernés

- `src/frame/model.ts`, `src/frame/*.ts` — modèle + helpers (neuf).
- `src/hooks/useFrame.ts` — autorité/CRUD (neuf).
- `src/views/CadreView.tsx` + `src/components/frame/*` — UI (neuf).
- `src/api/backend.ts` — façade `frameLoad/frameSave` (D7).
- `src-tauri/src/frame.rs` + `lib.rs` — persistance `frame.json` (neuf, AR-1).
- `src/hooks/useGridState.ts` — `ViewId` += `cadre`.
- `src/App.tsx` — rail + montage `CadreView`.
- `src/i18n/locales/{fr,en}.ts` — clés `cadre.*`.
- `src/mock/*` — cadre de démo dev.

## Comportement attendu (P1)

- Une **6ᵉ vue « Cadre »** ; on parcourt Règles/Skills/Templates/Team/Règles projet/Délégations.
- On **crée une règle typée**, on **la range dans un skill**, on **assemble un template** (skills
  + règles), on **instancie un agent** dans la team (template + extras + nom), on **édite le
  graphe de délégations**, on **pose des règles projet**.
- Le cadre **persiste** (AR-1) et **recharge** à froid ; **non destructif** (calque seed).
- Aucun LLM, aucun réseau en P1 ; façade unique ; CSP intacte ; pas de god-component.

## Vérification (P1)

- [ ] `npm run typecheck` + `lint` + `test` verts (tests : modèle/validation, `useFrame`, façade).
- [ ] `cargo fmt`/`clippy`/`test` verts (`frame.rs` : écriture/lecture, pathguard, dégradation).
- [ ] Recette réelle `tauri dev` : créer règle→skill→template→agent, persister, recharger.

## Hors scope (P1)

- Conversation-authoring / LLM (P2), enforcement runner + garde délégations (P3).
- Niveau **global** de portée (réserve, AR-2), multi-team héritage avancé.
- Historique/versioning fin du cadre (au-delà du fichier versionné AR-1).
