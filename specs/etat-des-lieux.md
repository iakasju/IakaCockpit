# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-28 14:31 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | feat/L0-trois-canaux-synchrones |
| Dernier commit | f481ed9 fix(canal): trois endpoints d update ordonnes, une cible morte ne bloque plus |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (suivis + non ignores) | 1398 |
| Note | Recit de reprise redige (lot 0 - part 0.b). |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `f481ed9` | 2026-08-28 | fix(canal): trois endpoints d update ordonnes, une cible morte ne bloque plus |
| `2f1e7b9` | 2026-08-25 | fix(canal): repointe l auto-update sur le NAS — l ancienne iakabox ne repond plus |
| `8241e14` | 2026-08-23 | docs(backlog): L39 — synchronisation Cockpit / reservoir iakaframe |
| `3225eac` | 2026-08-23 | feat(teams): Charon, Helm et Feanor rejoignent le Cockpit — aligne sur le reservoir |
| `c7443ce` | 2026-08-23 | feat(reservoir): lecture du reservoir iakaframe cote Rust (source de verite des teams) |
| `65ccbf3` | 2026-08-23 | docs(backlog): L38 — lisibilite du terminal (livre, recette OK) |
| `f607cfb` | 2026-08-23 | fix(terminal): interligne 1.6 -> 1.2 — la valeur avait ete choisie sur un rendu casse |
| `d041268` | 2026-08-23 | docs(backlog): L37 — persistance de la Table (set de Work) |
| `9313f11` | 2026-08-23 | fix(terminal): police resolue avant xterm — var(--mono) figeait la grille |
| `3e28c3b` | 2026-08-23 | fix(terminal): interligne STRICTEMENT proportionnel — la courbe cassait le relatif |

## Reprise du travail (a completer par Cowork)

> **Le recit complet de cette session vit dans `~/work/iakaframe/specs/etat-des-lieux.md`** : le
> travail est un lot **portefeuille** qui traverse trois depots, et le Cockpit n'en porte qu'une
> part. Ce qui suit est ce qui concerne CE depot.

- **Ce qui vient d'etre fait ici** : **un seul commit**, `f481ed9`
  (`fix(canal): trois endpoints d update ordonnes, une cible morte ne bloque plus`), sur la branche
  **`feat/L0-trois-canaux-synchrones`**, **non poussee**. C'est la part **0.b (failover de lecture)**
  du lot 0 « trois canaux synchrones », decide par le decideur le 2026-08-28 : *iakabox, NAS et
  GitHub synchrones, chacun le secours des autres*.
- **Contenu du commit** : `src-tauri/tauri.conf.json:42` — les `endpoints` de l'updater passent de
  **une** URL a **trois, ordonnees** (`NAS -> GitHub -> iakabox`) ; l'updater Tauri les essaie dans
  l'ordre, donc une cible morte ne bloque plus la mise a jour. Et
  `src/app/updateEndpoints.ts:16` — **fichier que le mandat n'avait pas prevu** : c'est un **miroir
  front** de la liste, et `src/__tests__/updateEndpoints.test.ts` exige l'egalite **exacte** des deux
  ; ne pas le toucher aurait mis le depot au rouge. **Aucune ligne Rust touchee.**
- **L'ordre des endpoints n'etait PAS libre** : `scripts/__tests__/forge-host-parity.test.mjs` exige
  que l'hote de `endpoints[0]` soit celui de `publish-update.mjs` **et** de `updater/latest.json`.
  Mettre GitHub en tete aurait oblige a toucher ces deux fichiers — **hors mandat**. D'ou le NAS en
  tete.
- **Mesure faite** : front **806 / 806** vert (84 fichiers, `npx vitest run`). **Rust non execute**
  et **aucun chiffre `cargo` rapporte** — aucune ligne Rust n'a ete modifiee.
- **Rappel de l'avant-lot** : `main` est a `2f1e7b9`, et il a ete **rattrape sur GitHub** au debut de
  la session — il y accusait **15 commits de retard**, pousses en avance rapide et verifies en direct.
- **En cours / a reprendre** : **le gate 🏹 Legolas n'est pas passe** sur ce lot (remise Gimli, pas
  d'auto-validation). Rien n'est pousse : **tout le TCP sortant du poste est coupe**, loopback compris.
- **Prochaine etape concrete** : gate Legolas hors ligne, puis — au retour d'un canal — poussee de la
  branche et **recette reelle de la bascule** : rendre le premier endpoint injoignable et verifier que
  l'app voit **quand meme** la mise a jour (**CA-11**).
- **Pieges connus** :
  1. ⚠️ **La 3e entree (GitHub) est aujourd'hui decorative.** Les depots GitHub sont **prives** :
     `raw.githubusercontent.com` repondra **404** a l'updater Tauri, qui ne sait pas s'authentifier.
     **CA-11 n'est donc pas atteignable par la voie GitHub** tant que le depot reste prive — a
     trancher (rendre public, ou designer un autre 3e canal). *Deduction documentaire, **non verifiee
     en direct** : le reseau etait coupe.*
  2. **Ne pas toucher `updater/latest.json` ni `scripts/publish-update.mjs`** en croyant completer le
     lot : ils sont **produits** par la chaine de publication et etaient **hors mandat**. Le meme trou
     existe, plus grave, cote `iakaFrameGUI` (4 URL de telechargement sur l'iakabox morte).
  3. **Le miroir front est contraint** : toute modification de la liste d'endpoints doit etre faite
     **dans les deux fichiers**, sinon `updateEndpoints.test.ts` rougit.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-08-28 14:31 | pause | v0.32.1 | feat/L0-trois-canaux-synchrones | Recit de reprise redige (lot 0 - part 0.b). |
| 2026-08-28 14:29 | pause | v0.32.1 | feat/L0-trois-canaux-synchrones | Lot 0 (0.b failover de lecture) : 3 endpoints ordonnes + miroir front. Branche feat/L0-trois-canaux-synchrones, non poussee (reseau coupe). |
| 2026-08-23 11:21 | pause | v0.32.1 | main | checkpoint : cadrage L36 (backend distant / mode serveur) depose, en attente d arbitrage AR-1..AR-8 |
| 2026-08-10 20:15 | version | v0.32.1 | main | Auto-update de l'application livre, gate PASS, publie sur le canal Forgejo LAN et bascule recettee (0.32.0 -> 0.32.1) |
| 2026-07-30 11:54 | pause | v0.31.1 | feat/L33-flake-tail-file | L33 : harnais tail_file de-flake (rendez-vous explicites), remis au gate Legolas |
| 2026-07-29 17:40 | manual | v0.31.1 | feat/L32-litellm-v194 | L32 - montee LiteLLM 1.94.0 epinglee (stack Cockpit) ; VM .12 bloquee (LAN iakabox injoignable) |
| 2026-06-26 14:01 | pause | - | main | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 (stream-json Claude Code) puis P1+. Lots livres jusqu'a L9 (v0.8.0-rc) + fix trace. L10 cadre, valide, a demarrer par le spike. Vision PROJET.md §0 = terminal-source/chat-vue. |
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation prechargee (chat + main courante coherents: delegation/rapport/verbatim), vignettes themees par team (charte x team, 3 teams, fallback pastille, CSP intacte). |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell (PTY survit), chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell reel (D10), seed L7 reconcilie (1 conversation). |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
