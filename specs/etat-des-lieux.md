# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-26 09:32 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.7.0-rc |
| Branche | main |
| Dernier commit | eab1684 docs(L8): instruction conversation projet (chat/shell + roster, arbitrages tranches) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 19420 |
| Note | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `eab1684` | 2026-06-26 | docs(L8): instruction conversation projet (chat/shell + roster, arbitrages tranches) |
| `df67cba` | 2026-06-26 | docs(L8): entree backlog L8 — implemente, remis au gate Legolas |
| `0dead5e` | 2026-06-26 | test(L8): facade chat, useConversations, Chat, Roster |
| `2e6a121` | 2026-06-26 | feat(L8): conversation projet (chat/shell + roster) — rework Working (D1/D4/D5/D6/D7) |
| `d7fb2c0` | 2026-06-26 | feat(L8): commande chat(path, agent, messages) persona-aware (Rust, D2) |
| `cd3e9ef` | 2026-06-26 | feat(L0): login shell interactif (-l Unix) sourcant le profil — terminal reel (D10) |
| `1145741` | 2026-06-26 | docs(L7): checkpoint gate Legolas PASS — backlog + etat des lieux (candidate v0.6.0-rc) |
| `10cd7b7` | 2026-06-26 | docs(L7): instruction seed demo dev (arbitrages AR-1..4 tranches) |
| `947fb88` | 2026-06-26 | chore(L7): cargo fmt seed.rs + entree backlog L7 (remise au gate Legolas) |
| `89f8fb6` | 2026-06-26 | feat(L7): facade seedDemo + hook useDemoSeed + onglets team (bootstrap demo) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L8 — Conversation projet** bouclé (cadrage Gandalf -> dev Gimli ->
  gate Legolas **PASS** : 125/125 front + 132/132 Rust). Rework Working suite à un retour terrain : **1 projet
  = 1 conversation active**, **toggle Chat<->Shell** où **le PTY SURVIT** (monté caché, jamais démonté).
  **Shell** = `PtyTerminal` L2 plein cadre ; **terminal réel** = socle L0 `shell.rs` ajusté en **login shell
  `-l`** (Unix) sourçant le profil (D10, Windows inchangé). **Chat** = bulles via Ollama, commande Rust
  `chat(path, agent, messages)` **persona-aware** (généralise `call_endpoint`->`post_chat`, `next_step`
  intact). **Roster 5 agents** (statut attend/travaille, clic -> `@agent:` = UN appel chat, pas
  d'orchestration). Interlocuteur défaut = **responsable** (Aragorn projet / Odin portefeuille). `useDemoSeed`
  réconcilié (1 conversation, plus 5 onglets) sans casser L7.
- **En cours / a reprendre** : candidate `v0.7.0-rc` commitée **en local** (push différé). **L5** (traçage
  délégations) reste **en cours** (émission à finir — cf. mémoire). Stack Docker `iakacockpit` up ; Ollama
  hôte requis pour chat + prochaine étape.
- **Prochaine etape concrete** : (1) **recette `tauri dev` de L8** : ouverture en chat, parler au responsable
  via Ollama, `@agent`, bascule Shell (terminal réel PATH/alias, frappe, survie au toggle) ; **confirmer le
  wording du prompt persona (AR-4)** ; (2) **finir L5** ; (3) recette n8n (L6) ; (4) différés (canal adresse
  bidi, fiche jalon).
- **Pieges connus** : ne jamais démonter le PTY au toggle (le shell mourrait) — garde centrale L8. Terminal =
  login shell `-l` (source le profil). Chat/prochaine étape supposent `ollama serve` hôte lancé (sinon dégrade).
  Seed L7 dev/test only. L5 : POST fire-and-forget avant exit. Mango L4 = tri sur clé d'index complète.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
