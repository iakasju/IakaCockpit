# L18 — Main courante complète par hook (instrumenter, pas gratter)

> Cadrage (chef de projet, 2026-06-29). Fondation. Hypothèse de Stéphane validée.
> Mémoire : `main-courante-par-hook-source-aware`. Reprend/généralise L5, alimente L4.

## Problème

Gratter le transcript JSONL est **lossy** : `tool_input` tronqué à 200 chars (`transcript.rs`),
`TodoWrite` parfois absent, schéma dépendant de la version de Claude Code. Les viz structurées
(plan vivant #3, économie #5, mémoire #6, timings Gantt #9) en souffrent.

## Solution : émetteur de main courante par HOOK

On **instrumente** la session (hooks Claude Code) pour écrire NOTRE log structuré complet, comme
le fait déjà **L5** (`~/.claude/delegation-guard.mjs` capte le payload ENTIER d'une `Task` et émet
un doc `meta.canal:"geste"` vers **iakaboxlogs**). **L4** lit déjà cette main courante
(`fetchMainCourante`). On **généralise** :

| Hook | Émet (canal · événement) |
|---|---|
| `UserPromptSubmit` | parole user (adresse) |
| `PreToolUse` (`*`) | geste (début) ; si `TodoWrite`/`Task` → **plan** (liste COMPLÈTE) |
| `PostToolUse` | activité (résultat verbatim) |
| `Stop` / `SubagentStop` | borne de tour ; parole agent ; tokens si `usage` exposé |
| `PreCompact` | compaction (mémoire) |

Le **tailer transcript reste** pour le live chat ; la **main courante (hook → CouchDB)** devient
la **source structurée de vérité** des viz.

## Schéma unifié, émetteur PAR SOURCE (remarque Stéphane)

La main courante est « vraie » **selon la source** : les hooks = mécanisme **Claude Code** (fidélité
max). Les autres sources (**Codex** rollout, **Ollama**) écrivent dans le **MÊME schéma** par leur
propre voie (mapping rollout Codex → doc main courante). Cohérent avec `ConversationSource` : un
schéma commun, un émetteur par source, dégradation gracieuse là où la source n'est pas instrumentée.

**Schéma doc (calque iakaboxlogs L4/L5)** :
`{ role, content, at, session, project(cwd), agent, meta:{ canal:"adresse|geste|pensee",
event:"parole|geste|activite|delegation|plan|compaction", tool?, status?, payload? } }`.

## Gardes & points durs

- **Hooks globaux** (`~/.claude`, hors dépôt) → **scoper par cwd/session** (ne pas polluer la main
  courante des sessions non-cockpit) ; versionner la parité (comme L5).
- **Fail-open borné** obligatoire (calque delegation-guard : triple-borné ~1,5 s, ne jamais
  bloquer/pendre une session).
- **Tokens** : VÉRIFIER si un hook (`Stop`) expose `usage`. Sinon #5 lit les tokens dans le
  transcript + la structure dans la main courante (mixte assumé).
- **Idempotence** : `_id` déterministe (session+seq) pour ne pas dédoubler.
- Réutiliser le transport L5 (`IAKALOG_TRANSPORT` mqtt|couchdb) + le bridge existant.

## Tranches

1. **Plan vivant (#3) — première tranche** : hook `PreToolUse` matcher `TodoWrite`/`Task` →
   émet le **plan complet** (`event:"plan"`, liste d'items {content,status}) ; le cockpit lit via
   la façade L4 (`fetchMainCourante` filtré `event:"plan"`, dernier snapshot = plan courant) →
   **panneau checklist** (variante A) dans la Table. Empty-state honnête si aucun plan.
2. **Paroles/gestes/activité** : généraliser le hook (UserPromptSubmit, PreToolUse `*`,
   PostToolUse) → enrichit le Journal (L4) et l'attribution.
3. **Économie / mémoire / timings** : selon la dispo de `usage`/compaction côté hook.
4. **Source Codex** : mapper le rollout dans le même schéma de main courante.

## Vérification de clôture (tranche 1)

Hook émet un doc `event:"plan"` complet (prouvé en CouchDB) sur un `TodoWrite`/`Task` réel ;
cockpit affiche la checklist depuis la main courante ; fail-open borné ; scope cwd respecté ;
front typecheck/lint/test verts.
