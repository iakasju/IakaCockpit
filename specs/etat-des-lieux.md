# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-26 14:01 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | - |
| Branche | main |
| Dernier commit | c400476 docs(L10): instruction re-architecture conversation/session (terminal-source + chat-vue) + backlog |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 19459 |
| Note | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 (stream-json Claude Code) puis P1+. Lots livres jusqu'a L9 (v0.8.0-rc) + fix trace. L10 cadre, valide, a demarrer par le spike. Vision PROJET.md §0 = terminal-source/chat-vue. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `c400476` | 2026-06-26 | docs(L10): instruction re-architecture conversation/session (terminal-source + chat-vue) + backlog |
| `48d722d` | 2026-06-26 | docs(vision): grave le modele produit corrige — terminal-source / chat-vue, chef-runner, agents runner+modele (PROJET.md) |
| `d56af0f` | 2026-06-26 | test(L9): non-regression de la trace — changer d'agent ne change pas les avatars passes |
| `898c4f6` | 2026-06-26 | fix(L9): historique demo — emetteur par tour (Aragorn/Gandalf) |
| `094ead9` | 2026-06-26 | fix(L9): Chat resout l'avatar de chaque bulle depuis turn.agent |
| `60c42db` | 2026-06-26 | fix(L9): avatar par-tour — emetteur fige sur ChatTurn (preserve la trace) |
| `879edb9` | 2026-06-26 | docs(L9): checkpoint gate Legolas PASS — backlog + etat des lieux (candidate v0.8.0-rc) |
| `43f58ff` | 2026-06-26 | docs(L9): instruction demo enrichie (vignettes themees par team, workset, conversation prechargee) |
| `4e2cf74` | 2026-06-26 | test(L9): import du script CouchDB via ?raw (sans dependance @types/node) |
| `703a8fb` | 2026-06-26 | test(L9): coherence chat<->main courante (C4) + doc sync-vignettes (CLAUDE.md) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lots **L0→L4, L6, L7, L8, L9 livres** (gate Legolas PASS, candidate
  **v0.8.0-rc**) + fix trace L9 (avatar par-tour). **Vision PRODUIT corrigee et GRAVEE** dans `PROJET.md §0`
  (revision 2026-06-26) : **le TERMINAL = la conversation** (le chef-runner y tourne, source de verite,
  controle `esc`) ; **le CHAT = une VUE FILTREE** (parole) ; **chat <-> terminal partagent l'entree** (stdin) ;
  agents = runner+modele ; settings par agent ; CIBLE (runners reels par agent, per-projet, skills->frames,
  graph delegation) separee de l'ETAPE ACTUELLE. Ca SUPERSEDE le modele L8. **L10 cadre et VALIDE** par Stephane.
- **En cours / a reprendre** : **L10 — re-architecture conversation/session**, a DEMARRER. Arbitrages tranches :
  un seul lot phase **P0->P3**, **commencer par le SPIKE P0**, **supprimer `ai.rs chat` (L8)** ; recos retenues
  (NDJSON parse cote Rust, `@agent` injecte verbatim au chef, posture decidee par le spike, esc cote terminal).
- **Prochaine etape concrete (PREMIERE ACTION A LA REPRISE)** : **lancer Gimli sur le SPIKE P0 de L10** —
  prouver que `claude` (Claude Code) tourne en PTY avec un flux **stream-json** typé (sortie NDJSON par type,
  ENTREE stream-json, `{"type":"interrupt"}` = esc). Resultat -> trancher posture B (fiable) vs A (degradee),
  puis engager P1 (couture runner `RunnerSpec`/`terminal.rs` + terminal-source) -> P2 (vue filtree + entree
  partagee) -> P3 (reglages). Instruction : `specs/instructions/L10-conversation-session.md`. Cf. memoires
  `vision-terminal-source-chat-vue`, `ne-pas-deformer-architecture-via-mvp`.
- **Pieges connus** : **APRES REBOOT, relancer les services** : `ollama serve` (hote 11434, modele llama3.1:8b) ;
  stack Docker `cd docker && docker compose up -d` (ollama/litellm/couchdb/n8n) ; re-seeder CouchDB si besoin
  (`bash docker/init-couchdb.sh`, admin/iaka-test). L'app : `npm run tauri dev` (port 3020 ; tuer un Vite
  residuel avant). Le **reboot terminal** vise a donner a Claude Code/Tauri les **droits macOS de modif d'apps**
  (necessaire au spike L10 : lancer `claude` runner). NaonEdge = theme par defaut INCIDENT, PAS la cible
  d'identite (produit a part). NE PAS biaiser les briefs d'agents (cf. memoire). L5 (tracage delegations) reste
  en cours (emission a finir). Recette n8n L6 manuelle non faite. Push differe (pas de remote Forgejo branche).

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-26 14:01 | pause | - | main | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 (stream-json Claude Code) puis P1+. Lots livres jusqu'a L9 (v0.8.0-rc) + fix trace. L10 cadre, valide, a demarrer par le spike. Vision PROJET.md §0 = terminal-source/chat-vue. |
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
