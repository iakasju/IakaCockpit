# L31 — Orchestration multi-agent / runners réels par agent (CADRAGE)

> Cadré 🟠 Aragorn (2026-07-14). **Cadrage seul, zéro code** — produit les arbitrages à trancher
> par Stéphane avant toute implémentation. Contexte : différé L8/L11 « runners réels par agent /
> orchestration multi-agent réelle ». Vision : [[team-first-class-agents-portent-runner]],
> [[runner-choix-par-slot-conversation]], [[vision-terminal-source-chat-vue]],
> [[runner-natif-tail-transcript]]. Contrainte : [[iakabox-indisponible-pas-de-dependance]] →
> local-first, aucune dépendance box.

## 1. Besoin (vision)
Une **team** = objet de premier rang ; chaque **agent** porte son **runner + modèle + skills**.
Aujourd'hui seul le **coordinateur** est un runner réel ; on veut que **chaque agent tourne sur
SON runner** (ex. Gimli sur Codex, Legolas sur Ollama) et que le Cockpit **orchestre** plusieurs
runners, avec un **statut « vivant » temps réel** par agent.

## 2. État des lieux (mesuré)
- **Runners réels** : `claude-code` (L10) et `codex` (spike P0bis) = TUI native + tailer du
  transcript on-disk. `shell` = repli. **`ollama`/`litellm` = définis mais NON câblés** → bannière
  honnête (pas de spawn).
- **Un seul runner par projet** : la conversation lance le runner du **coordinateur** (`resolveRunner`
  → `pty_runner_open`). Les autres agents de la team ont un runner/modèle **défini** (`useTeams`) mais
  **non lancé** → bannière si on tente de les ouvrir.
- **La délégation EXISTE et est réelle** : le coordinateur (claude-code) délègue via son **Task/Agent
  tool NATIF** → sous-agents **Claude** exécutés dans son propre runtime. C'est cette orchestration
  que l'Analytics attribue (via `outputFile`). **MAIS elle est claude-only** : le Task tool ne peut
  pas déléguer à un process Codex/Ollama.

## 3. Contrainte DURE (déterminante)
Le **Task/Agent tool de Claude Code spawne des sous-agents Claude** dans SON runtime. Il n'existe
**aucun mécanisme natif** pour qu'un runner Claude délègue à un runner Codex/Ollama. Donc :
> **« Gimli tourne sur Codex » ne peut PAS passer par la délégation interne du coordinateur.**
> Pour des runners hétérogènes par agent, c'est **le COCKPIT qui doit orchestrer** (spawner un
> runner par agent + router les échanges entre eux lui-même).

## 4. Options d'architecture
### Option A — Slots multi-runners (PAS de re-routage automatique)
Le Cockpit peut **ouvrir chaque agent comme SON propre runner vivant** (runner/modèle réel :
codex/claude), en **slots parallèles** (onglets / sous-vues), chacun avec son PTY + tailer + vue.
L'utilisateur (ou le coordinateur, manuellement) parle à chaque agent. **Pas d'interception ni de
re-routage** des délégations. C'est « runner par slot » ([[runner-choix-par-slot-conversation]]).
Réutilise l'infra existante (`PtyTerminal` + tailer par slot). **Réaliste, incrémental.**

### Option B — Cockpit orchestrateur hétérogène (RE-ROUTAGE automatique)
Le Cockpit **intercepte** les délégations du coordinateur (tool_use `Agent` du transcript) et les
**route vers le runner réel de l'agent délégué** (codex/ollama) : injecte le prompt, capture la
sortie, la renvoie au coordinateur. = **ré-implémenter le protocole sous-agent à travers des CLIs
hétérogènes** (chacun son I/O, aucun contrat commun, pas de garantie de retour structuré). **Très
complexe, fragile, difficile à recetter.** = HORIZON.

### Option C — Hybride (RECOMMANDÉE)
- **Garder la délégation NATIVE du coordinateur** (claude → sous-agents claude, réelle, déjà
  mesurée) comme moteur d'orchestration par défaut.
- **AJOUTER l'option A** : ouvrir **à la demande** un agent comme runner réel en slot (pour ceux
  qu'on veut piloter directement, ou qui tournent sur un autre backend exécutable = codex).
- Le **re-routage automatique (B) reste horizon** — on ne le promet pas.
→ Rend « les runners par agent RÉELS » (on lance vraiment Gimli sur Codex) **sans** prétendre à une
orchestration hétérogène automatique qu'aucun CLI ne supporte nativement.

## 5. MVP proposé = Option C, phasé
- **P1 — Slots multi-runners réels.** Depuis le roster/la team, **lancer un agent comme runner réel**
  (son runner s'il est EXÉCUTABLE = codex/claude-code) dans un **slot** propre au projet (multi-slots
  par projet). Réutilise `RunnerSpec` (codex déjà là) + `PtyTerminal` + tailer. La bannière « staged »
  ne s'affiche plus que pour les runners **vraiment** non exécutables (voir AR-2).
- **P2 — Statut « vivant » temps réel par agent** dérivé du tailer de chaque slot (le roster montre
  qui tourne / attend, en réel, plus le statut local MVP).
- **P3 (horizon, NON promis)** — re-routage automatique des délégations (Option B).

## 6. Arbitrages (à trancher par Stéphane)
- **AR-1 — Cible.** Option **C hybride** (reco) — délégation native claude + slots multi-runners à la
  demande ? OU vises-tu réellement **B** (re-routage auto hétérogène, horizon, gros et fragile) ?
- **AR-2 — Ollama / LiteLLM.** Ces backends n'ont **pas de TUI native** (donc pas le modèle
  PTY+transcript on-disk de claude-code/codex). Deux voies : (a) les câbler comme **runners « API »**
  (type `ai.rs chat`, sans PTY, vue chat pure — modèle différent de la TUI-source) ; (b) rester en
  **bannière** (seuls claude-code/codex sont des slots réels) pour l'MVP. Reco : **(b)** pour P1,
  (a) en suite.
- **AR-3 — Indépendance des slots.** En MVP, chaque agent-runner est un **slot indépendant** (pas de
  délégation croisée cockpit-orchestrée) — OK ? (C'est ce qui rend P1 réaliste.)
- **AR-4 — UI.** Où lance-t-on un agent comme runner ? (clic sur l'agent dans le **roster** → ouvre un
  slot ; barre d'onglets multi-slots par projet, calque L24 ; le coordinateur reste le slot principal.)
- **AR-5 — Statut vivant.** MVP P2 = dérivé du tailer par slot (running/idle) ; le statut « qui
  délègue à qui » temps réel reste lié à la délégation native (déjà tracée). OK ?

## 7. Hors périmètre
- Toute dépendance **iakabox** (n8n/CouchDB/MQTT) — [[iakabox-indisponible-pas-de-dependance]].
- Option B (re-routage hétérogène) = horizon, pas dans l'MVP.
- Orchestration « chef nu vs team iakaframe » (auto-`iakastart` du chef) = question séparée (différé L10).

## 8. Estimation (indicative, après arbitrages)
- P1 (slots multi-runners codex/claude, UI roster→slot, multi-onglets) : **moyen** (réutilise
  RunnerSpec + PtyTerminal + L24 onglets ; l'essentiel = permettre N slots/projet + lancement par agent).
- P2 (statut vivant par tailer) : **petit**.
- P3 (B) : **gros**, horizon, non chiffré.
