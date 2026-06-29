# Note de synthèse — Concepts LLM structurants lisibles dans les transcripts JSONL

> Auteur : chef de projet (analyse portefeuille Odin), 2026-06-29.
> Source : analyse empirique de **15 transcripts** (~42 000 lignes, 9 projets, runners
> **Claude Code** + **Codex**) dans `~/.claude/projects/` et `~/.codex/sessions/`.
> Objet : recenser les concepts LLM sous-jacents que iakacockpit peut **mettre en IHM**
> en relisant le transcript de session (ligne directrice produit § PROJET.md §0 :
> *terminal-source / chat-vue*).

## Thèse

Un transcript de session d'agent LLM n'est pas un log : c'est un **flux d'événements
typés** qui matérialise des concepts structurants. iakacockpit en surface aujourd'hui 5
(les canaux L10). La donnée en porte **une douzaine de plus**, déjà présents, prêts à
devenir de l'IHM. Le fait que ces concepts **ré-émergent à l'identique sous deux moteurs
indépendants** (Claude / Codex) prouve que ce sont des *invariants d'un agent au travail*,
pas des détails d'implémentation.

## 1. Déjà segmenté par le Cockpit (canaux L10)

| Concept | Donnée transcript | Volume mesuré |
|---|---|---|
| **Parole** | bloc `text` (role user/assistant) | 5 029 |
| **Geste** | `tool_use` (Bash/Edit/Read/Write…) | 8 209 |
| **Activité** | `tool_result`, corrélé par `tool_use_id` | 8 286 |
| **Pensée** | bloc `thinking` (masquable) | 5 014 |
| **Délégation** | `tool_use:"Agent"` + lignes `isSidechain` | 78 / 1 137 |

## 2. Concepts présents dans la donnée, pas encore en IHM (le gisement)

1. **Arbre de conversation** — `uuid`/`parentUuid`/`logicalParentUuid` : la conversation
   est un **arbre** (branches, retours arrière, sidechains), pas une liste. → vue graphe.
2. **Attribution multi-agent (machine)** — `attributionAgent` (ex. `gimli`), `agentName`
   (sous-agents nommés), `attributionSkill` (`iakastart`…), `sourceToolAssistantUUID` :
   QUI a produit chaque ligne = la chaîne de badges iakaframe, **émise par la machine**.
3. **Plan vivant** — `TaskCreate`/`TaskUpdate`/`TaskList` (~400) : la todo que l'agent se
   donne et coche en direct. → panneau plan.
4. **Mode d'autonomie / permissions** — `permissionMode`, `mode`, `EnterPlanMode`/
   `ExitPlanMode` : **planifie vs exécute**, et jusqu'où l'agent agit seul.
5. **Garde-fous / hooks** — `hookInfos`/`hookErrors`/`preventedContinuation`/`stopReason` +
   `system/stop_hook_summary` : les gardes qui interceptent l'agent (ex. garde d'identité).
6. **Points d'arbitrage** — `AskUserQuestion` (111) : les moments où l'agent rend la main.
7. **Mémoire glissante / compaction** — `compact_boundary`, `compactMetadata`,
   `isCompactSummary`, `summary`, `away_summary` : la conversation **se résume** au-delà de
   l'horizon de contexte. → frontières de mémoire visibles.
8. **Versionnement des effets** — `file-history-snapshot`/`snapshot`/`isSnapshotUpdate`
   (1 374) : l'état des fichiers capturé par tour → **diff / rollback**.
9. **Asynchronisme & fond** — `ScheduleWakeup`, `scheduled_task_fire`,
   `pendingBackgroundAgentCount`, `Monitor` : agents en tâche de fond, réveils programmés.
10. **Dialogue inter-agents** — `SendMessage` (63) : reprendre un sous-agent avec son
    contexte ; les agents **se parlent**.
11. **Économie du tour** — `usage` (tokens), `durationMs`/`turn_duration` (784),
    `messageCount` : coût/effort par tour → HUD de consommation.
12. **Résilience** — `api_error`/`retryAttempt`/`maxRetries`/`interruptedMessageId` :
    reprises sur erreur, interruptions encaissées.
13. **Découverte d'outils & titrage** — `ToolSearch` (l'agent élargit sa boîte à outils),
    `ai-title`/`aiTitle` (le LLM **nomme** la conversation).

## 3. Méta-concept : convergence inter-moteurs

Codex écrit un JSONL **jumeau** : `event_msg`=paroles, `response_item/function_call`=gestes
(+`function_call_output`=activité), `reasoning`=pensée, `session_meta`=projet/cwd,
`token_count`=économie. Les mêmes concepts ré-émergent → l'abstraction `ConversationSource`
du Cockpit est la bonne couture. Tout nouveau runner (ollama, autre CLI) se mappe sur le
**même vocabulaire de concepts**.

## 4. Pistes IHM (non engageantes — matière à cadrage)

- **Vue « plan vivant »** (todos cochés en direct) — surface la plus immédiate.
- **Vue « arbre / délégations »** (sidechains, attribution multi-agent) — colle à la chaîne
  de badges iakaframe.
- **Bandeau d'état d'autonomie** (mode plan/exécution + gardes-fous actifs).
- **HUD d'économie** (tokens/durée par tour, frontières de compaction).
- **Timeline des effets fichiers** (snapshots → diff/rollback par tour).
- **Bandeau async** (tâches de fond, réveils programmés, file d'attente).

Chaque piste est un lot potentiel ; aucune n'est engagée par cette note.
