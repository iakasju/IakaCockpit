# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-26 10:38 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.8.0-rc |
| Branche | main |
| Dernier commit | 43f58ff docs(L9): instruction demo enrichie (vignettes themees par team, workset, conversation prechargee) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 19501 |
| Note | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `43f58ff` | 2026-06-26 | docs(L9): instruction demo enrichie (vignettes themees par team, workset, conversation prechargee) |
| `4e2cf74` | 2026-06-26 | test(L9): import du script CouchDB via ?raw (sans dependance @types/node) |
| `703a8fb` | 2026-06-26 | test(L9): coherence chat<->main courante (C4) + doc sync-vignettes (CLAUDE.md) |
| `4f5e7df` | 2026-06-26 | feat(L9): rendu vignettes dans le roster + avatars dans le chat (fallback pastille) |
| `9ce110d` | 2026-06-26 | feat(L9): cle config ui_team + selecteur team dans Reglages |
| `366a84a` | 2026-06-26 | feat(L9): resolveur de vignette (charte, team, roleIndex) + roleIndex sur DEMO_TEAM |
| `c48c773` | 2026-06-26 | chore(L9): script sync-vignettes + manifest (sous-ensemble naonedge x 3 teams) |
| `967749b` | 2026-06-26 | feat(L9): main courante CouchDB enrichie (delegation geste / rapport / verbatim) |
| `7f853a2` | 2026-06-26 | feat(L9): historique de chat demo precharge (chaine de badges iakaframe) |
| `5de5610` | 2026-06-26 | feat(L9): openConversation accepte un historique initial (retro-compatible) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L9 — Demo enrichie** boucle (cadrage Gandalf -> dev Gimli -> gate
  Legolas **PASS** : 170/170 front + 132/132 Rust). (B) `useDemoSeed` ajoute `iaka-demo` au **Set de Work**
  (il apparait enfin dans Working). (C) **conversation prechargee coherente** : historique de chat mocke
  (delegation Aragorn->Gandalf / rapport / **verbatim**) + main courante L4 enrichie (`init-couchdb.sh`,
  meme sequence canal geste/rapport/verbatim, `conv_id:"iaka-demo"`). (A) **vignettes themees par team** :
  charte x team x role, 3 teams (lotr/avengers/starfleet) naonedge dark+light, 30 PNG embarques en `'self'`
  (CSP intacte), resolveur sur manifest genere depuis `teams.json`, selecteur `ui_team` en Reglages,
  **fallback pastille** si absente, rendu roster + avatars chat.
- **En cours / a reprendre** : candidate `v0.8.0-rc` commitee **en local** (push differe). **L5** (tracage
  delegations) reste **en cours** (emission a finir — cf. memoire). Stack Docker up ; Ollama hote requis.
- **Prochaine etape concrete** : (1) **recette `tauri dev` de L9** : iaka-demo dans Working, conversation
  prechargee (chat + main courante), changer de **team** en Reglages recaste roster+chat (vignettes) ;
  (2) **finir L5** ; (3) recette n8n (L6) ; (4) differes. **Cosmetique a normaliser** : les PNG embarques
  contiennent des donnees JPEG (sans impact `<img>`, a corriger au prochain `sync-vignettes.sh`).
- **Pieges connus** : vignettes = sous-ensemble embarque (3 teams) ; `ui_team` defaut `lotr` ; fallback
  pastille si vignette absente. Ne jamais demonter le PTY au toggle (L8). Terminal = login shell `-l` (L8/D10).
  Chat/prochaine etape supposent `ollama serve` hote. Seed L7/L9 dev/test only. L5 : POST fire-and-forget avant exit.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
