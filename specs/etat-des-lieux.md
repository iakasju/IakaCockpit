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

- **Ce qui vient d'etre fait** : Lots **L0->L9 livres** (candidate v0.8.0-rc). Puis **L10 demarre et
  VIRAGE majeur acte** (2026-06-26). Deux spikes : **P0** (`3ad0ffb`) a prouve `claude --print
  --input-format stream-json` en pipes — fiable MAIS **tue la TUI native** (perte des reflexes
  `Shift+Tab`/`esc`) ; **L10b** (`b7ac879`, `specs/mock/spike-l10b/`) a prouve la **CIBLE** : runner en
  **TUI NATIVE dans le PTY** (reflexes intacts) **+ vues derivees du TRANSCRIPT JSONL** de session ecrit
  en direct (`~/.claude/projects/<cwd-escaped>/<sid>.jsonl`), zero parsing ANSI. Gotcha cle : **scrubber
  `CLAUDE_CODE_*`** avant spawn (sinon nested = pas de transcript). Instruction **re-cadree** par Gandalf
  (`4caf3e2`) + 6 arbitrages tranches (`f49e6fc`) : allowlist explicite, gate fin L10a/L10b, `ai.rs chat`
  reframe source Ollama, esc bouton+natif, `@agent` verbatim, delegations sur preuve live. **L10a (P1)
  LIVRE : gate Legolas PASS + recette terrain OK** (candidate `v0.9.0-rc`) — `terminal.rs` etendu
  (`pty_runner_open`, session_id uuid, scrub env, allowlist), Working bascule en TUI native auto-lancee
  hands-off dans le cwd ; recette reelle = transcript ecrit dans `iaka-demo` (preuve). Pipes `runner.rs`
  **parque au chaud**.
- **L10b (P2+P3) LIVRE + recette terrain OK** (2026-06-26, candidate `v0.9.0-rc`). Tailer `transcript.rs`
  cote Rust -> `runner://event` (mapping paroles/gestes/**delegation = tool `Agent`**/activite/pensee), vues
  filtrees (chat = paroles attribuees, gestes, delegations), entree partagee chat<->terminal (`@agent`
  verbatim), bouton esc chat, reglages globaux (modele/allowlist/trust/pensee en config), roster vivant.
  **3 cycles de debogage recette** : (1) args Tauri v2 **camelCase** (le tailer ne demarrait jamais) ; (2)
  double-spawn **StrictMode** (garde spawnRef) ; (3) **plafond d'attente du tailer retire** (Claude cree le
  transcript tard). Recette finale OK avec `iaka-demo` **pre-truste** (`hasTrustDialogAccepted=true` dans
  `~/.claude.json` ; backup `~/.claude.json.bak-iaka`). 234 front + 202 Rust verts. **=> L10 COMPLET.**
- **Differe trace (post-L10, hors lot)** : (a) spike **P0bis Codex/ChatGPT** (CLI non installe, verifier
  `~/.codex/sessions`) ; (b) **rendu xterm TUI** lent + lignes qui se chevauchent (secondaire) ; (c) **modele
  chef nu vs team** (le chef = claude generique, pas la team iakaframe — auto-iakastart ? rapport persona/
  roster ↔ chef ?) ; (d) **Stop hook identity-guard** se declenche sur le chef (herite de `~/.claude`) ;
  (e) `isSidechain` non reconfirme en TUI.
- **Prochaine etape concrete** : avec Stephane, **arbitrer les differes** — le plus structurant = (c) modele
  chef/team (touche la vision §0). Sinon attaquer (b) rendu ou (a) spike Codex. Cf. memoires
  `runner-natif-tail-transcript`, `transcript-delegation-agent-tool`, `vision-terminal-source-chat-vue`,
  `ne-pas-deformer-architecture-via-mvp`.
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
| 2026-06-26 | pause | v0.9.0-rc | main | Pause apres L10 COMPLET (recette terrain OK). REPRISE = arbitrer les 5 differes, le plus structurant = (c) modele chef nu vs team (auto-iakastart ? persona/roster vs chef reel ; touche vision §0) -> cadrage Gandalf. Sinon (d) Stop hook sur le chef, (b) rendu xterm, (a) spike Codex. iaka-demo pre-truste (backup ~/.claude.json.bak-iaka). Relancer services apres reboot/pause. |
| 2026-06-26 | version | v0.9.0-rc | main | L10 COMPLET (L10a+L10b) — gate Legolas PASS + recette terrain OK. VIRAGE : runner en TUI NATIVE dans le PTY (reflexes Shift+Tab/esc) + vues (chat = paroles, gestes, delegations) derivees du transcript JSONL de session ecrit live (zero parsing ANSI). L10a : terminal.rs (pty_runner_open, session_id uuid, scrub env CLAUDE_CODE_*, allowlist, auto-launch hands-off). L10b : tailer transcript.rs -> runner://event, vues filtrees, entree partagee (@agent verbatim), esc chat, reglages globaux, roster vivant. Delegation = tool Agent (pas Task). Pipes runner.rs parque. 3 cycles debug recette (camelCase Tauri, double-spawn StrictMode, plafond tailer). 234 front + 202 Rust. Differe : Codex spike, rendu xterm, modele chef/team, Stop hook. |
| 2026-06-26 14:01 | pause | - | main | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 (stream-json Claude Code) puis P1+. Lots livres jusqu'a L9 (v0.8.0-rc) + fix trace. L10 cadre, valide, a demarrer par le spike. Vision PROJET.md §0 = terminal-source/chat-vue. |
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
