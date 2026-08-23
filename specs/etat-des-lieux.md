# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-23 11:21 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | 17f13de docs(backlog): L33 coche — gate Legolas PASS rendu retroactivement |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 7591 |
| Note | checkpoint : cadrage L36 (backend distant / mode serveur) depose, en attente d arbitrage AR-1..AR-8 |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `17f13de` | 2026-08-10 | docs(backlog): L33 coche — gate Legolas PASS rendu retroactivement |
| `f8587e6` | 2026-08-10 | docs(etat-des-lieux): recit de reprise du lot auto-update |
| `ed85bcd` | 2026-08-10 | chore(iakaframe): update etat des lieux + commit global (version v0.32.1) |
| `4904f2b` | 2026-08-10 | chore(release): publie le manifeste de mise a jour v0.32.1 |
| `5f08655` | 2026-08-10 | chore(release): v0.32.1 — version de recette pour la bascule auto-update |
| `5b179da` | 2026-08-10 | chore(release): publie le manifeste de mise a jour v0.32.0 |
| `6994f6e` | 2026-08-10 | chore(release): v0.32.0 — auto-update de l'application |
| `ef3ca20` | 2026-08-10 | Merge branch 'feat/auto-update' — L34 auto-update (gate Legolas PASS) |
| `e4511b1` | 2026-08-06 | docs(claude): corrige la note de push et consigne les 3 reserves croisees |
| `ee1f65e` | 2026-08-06 | test(update): exerce la jonction C4 entre le hook et la vue |

## Reprise du travail (a completer par Cowork)

> Le tableau *Etat courant* ci-dessus a ete fige par le snapshot **juste avant** le commit
> global du checkpoint : il annonce `17f13de` et un arbre sale. A la lecture, le point de
> sauvegarde est `5c91066` et l'arbre est **propre**, aligne avec `origin/main`.

- **Ce qui vient d'etre fait** : depuis le scellement de **v0.32.1** (10/08), une seule
  chose est entree au depot, et c'est un **cadrage, pas du code** :
  `specs/instructions/L36-backend-distant-mode-serveur.md` (563 lignes, cadre par Gandalf
  le **18/08**, versionne aujourd'hui par ce checkpoint). Treize jours separent les deux
  commits : la periode a produit de la reflexion, aucune ligne de production.
  Rappel du dernier lot livre : **L34 auto-update**, 2 gates Legolas PASS, merge `ef3ca20`,
  bascule reelle 0.32.0 -> 0.32.1 recettee sur le canal Forgejo LAN.
- **En cours / a reprendre** : quatre chantiers ouverts, aucun n'avance sans une decision
  de Stephane.
  1. **L36 — EN ATTENTE D'ARBITRAGE.** 8 arbitrages (AR-1..AR-8) poses avec recommandation.
     Le motif n'est plus « avoir une version web » mais **decharger le Mac**. Le cadrage
     chiffre **~9 j** pour sortir la chauffe (lots 0+A+D) contre **~18,5 j** pour le mode
     serveur complet — c'est ce rapport qui fonde le phasage recommande. **Aucune case au
     backlog `CLAUDE.md` pour l'instant** : elle ne s'ouvrira qu'une fois les arbitrages
     tranches.
  2. **L34 — gates humains toujours ouverts, verifie ce jour** : `git ls-remote --tags
     github` s'arrete a **v0.31.2**. Ni v0.32.0 ni v0.32.1 ne sont sur GitHub, donc les
     secrets de signature ne sont pas poses et le manifeste ne couvre toujours que
     **macOS arm64** (1 plateforme sur 4). La sauvegarde hors depot de
     `~/.tauri/iakacockpit.key` reste elle aussi un gate humain.
  3. **L32 — case `[ ]`.** La stack Cockpit est faite et son historique est raccroche a
     `main` (`ac55c23`) ; c'est la **phase D sur la VM `.12`** qui est arretee **avant
     toute action**, sur un point de blocage : ce LiteLLM a une **base Postgres sur une
     machine tierce**, donc rallumer en 1.94.0 declencherait 12 minors de migrations
     Prisma **irreversibles**, hors du filet de rollback du lot. Rien n'a ete modifie
     sur `.12`.
  4. **L35 (dette securite `.12`)** et la **purge de l'historique git (~118 Mo)** :
     tracees, non traitees. La purge attend un **feu vert explicite** (reecriture
     d'historique).
- **Prochaine etape concrete** : **trancher les arbitrages de L36**, en commencant par les
  deux qui commandent tous les autres — **AR-1** (phasage : lot A « lecture seule +
  travail deplace » puis mesure, plutot que le mode serveur complet d'un bloc) et **AR-2**
  (ou vit le chapeau `~/work`). AR-2 n'est pas un choix technique : le retenir, c'est
  acter que **la box devient la machine de travail et que le Mac ne fait plus que
  regarder**. Une fois tranche, lancer le **lot 0 (mesure, 0,5 j, zero code)**, dont la
  sortie est un GO/NO-GO argumente : un `cargo build` plus de ~2x plus lent sur la box
  est un **NO-GO** a remonter, pas a absorber.
- **Pieges connus** :
  1. **`iakaframe update` reecrit `specs/etat-des-lieux.md`** : le recit de reprise
     precedent est **ecrase** a chaque checkpoint. Celui du lot auto-update n'est plus
     lisible que via `git show f8587e6:specs/etat-des-lieux.md`. Relire l'ancien avant
     d'ecrire le nouveau.
  2. **Trois remotes, deux Forgejo.** `origin` = `192.168.1.139:3001` (celui que suit
     `main`, joignable) ; `iakabox` = `192.168.2.11:3001` (**injoignable**, cf. la
     direction « ne pas dependre de iakabox ») ; `github` = miroir en retard de **deux** tags (v0.32.0, v0.32.1).
     Ne pas les confondre au moment de publier.
  3. **Chaine de publication L34**, toujours valable : tout build local d'artefact signe
     exige **`--bundles app`** (l'echec DMG du Finder avorte le bundle avant la passe
     updater) ; le bundler local **ne suffixe pas** le nom par l'architecture — renommer
     l'artefact **et son `.sig`** en `_aarch64` avant `--from` ; `publish-update.mjs`
     **refuse de publier hors de `main`** ; le controle de version au demarrage est
     **differe de 3 s et silencieux** en echec — passer par le bouton verbeux des Reglages
     avant de conclure a un defaut.
  4. **L36 ne se lit pas en diagonale** : son § 1.1 conditionne tout le reste. Une lecture
     seule a distance **ne refroidit rien** tant que les projets et les runners sont restes
     sur le Mac — le serveur lirait un `~/work` vide.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
