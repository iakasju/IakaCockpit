# Etat des lieux - iakacockpit

> Genere par iakaframe (CLI) le 2026-07-29 17:40 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.31.1 |
| Branche | feat/L32-litellm-v194 |
| Dernier commit | e1a7c1f docs(backlog): L32 - etat de la montee litellm 1.94.0 (stack faite, VM .12 bloquee LAN) |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 9635 |
| Note | L32 - montee LiteLLM 1.94.0 epinglee (stack Cockpit) ; VM .12 bloquee (LAN iakabox injoignable) |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `e1a7c1f` | 2026-07-29 | docs(backlog): L32 - etat de la montee litellm 1.94.0 (stack faite, VM .12 bloquee LAN) |
| `5ddd485` | 2026-07-29 | chore(docker): epingle litellm sur 1.94.0 (tag + digest), fin du tag flottant main-latest |
| `f4063dd` | 2026-07-29 | docs(instructions): ajoute L32 - montee LiteLLM 1.82.6 -> 1.94.0 epinglee |
| `a247ffe` | 2026-07-15 | docs(reprise): état des lieux v0.31.1 (Analytics complet + programme fais-tout ; reprise) |
| `4906935` | 2026-07-14 | docs(orchestration): sceau v0.31.1 (L31-P2 statut vivant par slot + cascade-close) |
| `053dce2` | 2026-07-14 | fix(orchestration): fermeture en cascade des slots au retrait du projet |
| `ee8f71b` | 2026-07-14 | feat(orchestration): statut vivant par slot (L31-P2) |
| `ca177bd` | 2026-07-14 | docs(orchestration): sceau v0.31.0 (L31-P1 slots multi-runners réels) |
| `82e003f` | 2026-07-14 | feat(orchestration): slots multi-runners reels par projet (L31-P1) |
| `2ac8ecd` | 2026-07-14 | docs(cadrage): L31 orchestration multi-agent / runners réels par agent (cadrage, arbitrages) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : <!-- ... -->
- **En cours / a reprendre** : <!-- ... -->
- **Prochaine etape concrete** : <!-- premiere action a faire en reprenant -->
- **Pieges connus** : <!-- ... -->

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-29 17:40 | manual | v0.31.1 | feat/L32-litellm-v194 | L32 - montee LiteLLM 1.94.0 epinglee (stack Cockpit) ; VM .12 bloquee (LAN iakabox injoignable) |
| 2026-06-26 14:01 | pause | - | main | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 (stream-json Claude Code) puis P1+. Lots livres jusqu'a L9 (v0.8.0-rc) + fix trace. L10 cadre, valide, a demarrer par le spike. Vision PROJET.md §0 = terminal-source/chat-vue. |
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
