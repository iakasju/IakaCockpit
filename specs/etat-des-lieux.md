# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-29 23:01 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | df35940 docs(backlog): le rouge d'E-5 a eu lieu — et CA-5 n'est PAS prouve |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1419 |
| Note | v0.32.2 publiee par le workflow corrige : matrice complete, CA-12 et CA-13 prouves, absence macOS levee. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `df35940` | 2026-08-29 | docs(backlog): le rouge d'E-5 a eu lieu — et CA-5 n'est PAS prouve |
| `6e72c22` | 2026-08-29 | fix(vitrine): l'absence macOS ne survit pas a sa raison d'etre — E-5 obeie |
| `eceb498` | 2026-08-29 | chore(vitrine): le README DERIVE suit le porteur — v0.32.2, absents macOS conserves |
| `e8b3e91` | 2026-08-29 | fix(version): package-lock.json portait 0.31.2 — un porteur que rien ne gardait |
| `6b84d59` | 2026-08-29 | chore(version): 0.32.1 -> 0.32.2, les quatre porteurs de code alignes |
| `eae19f9` | 2026-08-29 | chore(iakaframe): checkpoint — lot L42 installer depuis rien livre |
| `14b8b96` | 2026-08-29 | fix(vitrine): le temoin de la promesse en PROSE mesure enfin ce qu'il nomme |
| `6b0aea6` | 2026-08-29 | docs(claude): « promis » se lit hors bloc d'absence, pas « ligne de tableau » |
| `04ceb0e` | 2026-08-29 | chore(quality): le code 3 rappelle un STATUT, il ne devine plus une cause |
| `ea1cda6` | 2026-08-29 | fix(vitrine): promis, c'est promis PARTOUT — pas seulement dans un tableau |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait — l'etape 5.1 a enfin eu lieu.** Elle etait due depuis deux jours et
  c'etait **la seule preuve manquante de toute la chaine**. Le decideur a pousse le tag `v0.32.2` ;
  le run **`33273513846`** (`event: push`) a reussi sur **six jobs**, **matrice complete**. Mesure de
  la release : `assets 16 · sig 7 · latest.json 0 · dmg 2` · `releases/latest -> v0.32.2`.
- **La matrice complete est la reparation de H-4.** Les deux `workflow_dispatch` qui avaient garni
  `v0.32.1` ne selectionnaient que `windows` puis `linux` — **aucun ne demandait macOS**, et c'est
  pourquoi la release « Latest » ne portait aucun `.dmg`. Sur un **push de tag**,
  `github.event.inputs.platforms` est vide -> `SEL='toutes'` -> les 4 plateformes. **Ne jamais publier
  par `workflow_dispatch` sans choisir `toutes` a la main.**
- **Ce qui est PROUVE, et ce qui ne l'est pas — la nuance a couté une correction en seance** :
  - **CA-12 : PROUVE**, mais **par le CONTREFACTUEL** (declarer absente une plateforme reellement
    presente doit rougir), **pas** par le couple `sig`/`latest.json`, qui n'a aucun rapport avec lui.
  - **CA-13 : PROUVE ENTIER.** Le critere n'a **qu'une** clause ; parler de « premiere moitie » n'a
    pas de sens. Renforce par une mesure faite au gate : **`v0.32.1` portait encore le `latest.json`
    concurrent** (`assets 15 · sig 7 · latest.json 1`), donc le correctif a atterri **apres** elle et
    **`v0.32.2` est bien la premiere release du workflow corrige**. Son `latest.json = 0` **avec**
    `sig = 7` n'est **pas** explicable par « rien a televerser » — le profil `v0.31.2`
    (`sig 0 / latest.json 0`) l'aurait ete.
  - **CA-5 : NON PROUVE.** Le run publie le **plus haut** tag, donc le job a pris la branche
    `--latest` ; la branche **`--latest=false`** **n'a jamais ete executee sur ce depot**. Acquis :
    **E-1 nominal** seulement. L'instruction le dit elle-meme : « sans ce critere, V3 n'est pas
    prouve, il est **espere** ».
    🛑 **CORRIGE LE 2026-08-30 (L43) — la formule d'origine est REFUTEE, et elle etait la plus forte
    du corpus.** Il etait ecrit ici : *« la branche `--latest=false`, celle qui rend le vol du
    `latest` MECANIQUEMENT IMPOSSIBLE »*. **Elle ne le rend pas.** (1) Elle n'**empeche** rien : la
    release est creee — donc le vol a lieu — **avant** que le job demarre. (2) Elle ne **repare** pas
    davantage : le contrefactuel joue par le decideur le 2026-08-30, croise avec le run
    `33277643229`, **refute huit des neuf regles de repli enumerees** et laisse **le NO-OP seul
    debout** ; sous cette regle, poser `--latest=false` sur la voleuse **ne rend pas** le `latest`.
    Ce que le job fait, et c'est deja beaucoup : il **DETECTE**, **ROUGIT** et **DICTE** le
    rattrapage. **RESIDU** : une regle **non enumeree** reste possible, et rien de ceci n'a ete
    mesure **sur ce depot**. Liste des regles et residu :
    `iakaframe/specs/instructions/contrefactuel-ca5-procedure-decideur.md` § 1.
- **L'absence macOS est levee, et c'est le cliquet qui l'a commande.** Ecrit la veille, declenche le
  jour meme : `E-5 : « …_aarch64.dmg » est declare ABSENT … mais il EST present sur v0.32.2. La
  declaration a survecu a sa raison d'etre`. **Une exception qui ne survit pas a sa raison d'etre.**
  Retrait fonde sur mesure, pas sur l'API seule : les deux `.dmg` ont ete **telecharges** en anonyme,
  tailles egales a l'octet, `hdiutil verify` -> **checksum VALID**. Un bloc `//absents` conserve la
  **memoire** du retrait (date, run, motif, conditions de reouverture) — *« sans lui, une liste vide se
  lit comme un champ oublie »* — et il est **strictement inerte**, prouve en supprimant la vraie cle.
- **Le cliquet discrimine dans les DEUX sens**, mesure au gate : une absence **fausse** rougit ; une
  absence **vraie** (version ramenee a 0.32.1, sans `.dmg`) fait **taire** les E-3 et **E-5 reste
  muet**. **L'honnetete n'est pas punie ; le silence l'est.**
- **Les `.dmg` viennent enfin du CI.** Constat du gate : les 4 assets macOS de `v0.32.1` ne venaient
  d'**aucun run** — ils avaient ete poses **a la main**. Cette etape manuelle disparait.
- **Un porteur de version avait derive sans que rien ne le voie** : `package-lock.json` portait
  **0.31.2** — trois bumps de derive silencieuse. Contrefactuels : `package.json`, `tauri.conf.json`,
  `Cargo.toml`, `README.md` **rougissent en se nommant** ; **`Cargo.lock` et `package-lock.json`
  restent VERTS**. Et les deux verts ne le sont pas pour la meme raison : `Cargo.lock` **s'auto-repare
  en silence** au moindre `cargo` (risque = arbre sali sans un mot), `package-lock.json` **pourrit**
  et **`npm ci` ne le voit pas non plus**. Realigne a la main ; **la garde n'a pas ete elargie** —
  arbitrage reserve a un autre lot.
- **Prochaine etape concrete — REECRITE LE 2026-08-30 (L43).** Ce qui etait ecrit ici est **perime
  sur les deux plans** : *« le contrefactuel de CA-5, qui exige de republier un tag ancien en
  `workflow_dispatch` »*. (a) **Republier ne vole rien** au SHA epingle — c'est la **CREATION** qui
  vole (R-1 de l'instruction L43) ; (b) le contrefactuel **a ete cadre, puis SUSPENDU** : le decideur
  a tranche **(γ)** — re-cadrer la garde d'abord, **aucun geste de release sur ce depot**. La
  repetition en depot jetable a eu lieu, et le contrefactuel a cout nul **a ete joue par le
  decideur** sur le banc.
  👉 **Prochaine etape reelle : re-cadrer la garde**, maintenant qu'on sait qu'elle **detecte** sans
  **reparer**. Voir `iakaframe/specs/instructions/contrefactuel-du-vol-de-latest.md` et
  `…/contrefactuel-ca5-procedure-decideur.md` § 5.
- **Dette de canal, a deux etages** :
  1. **Le NAS `192.168.1.139` est injoignable** (code 000) depuis la fusion de L42. `main` est pousse
     sur **GitHub seulement**, en avance sur `origin`. Rattrapage : `iakaframe canaux --rattraper`,
     **avance rapide seulement**.
  2. **Et meme NAS revenu, ca ne suffira pas.** `publish-update.mjs:418` fait `git push origin HEAD`
     **et rien d'autre**, alors que `tauri.conf.json:43-45` place le NAS en **premier** endpoint et
     **`raw.githubusercontent.com` en second** — l'endpoint que les clients atteignent **reellement**.
     **Rafraichir la vitrine publique de l'updater exige un `git push github main` supplementaire,
     qu'aucun script n'execute et qu'aucune garde ne nomme.** `updater/latest.json` porte encore
     `0.32.1` : **aucun client installe ne passera a 0.32.2** tant que ces deux etages ne sont pas
     traites.
- **Pieges connus** :
  1. **Publier par `workflow_dispatch` prive de plateformes** si l'on ne choisit pas `toutes`.
     Le **push de tag** est la voie sure.
  2. **`latest.json = 0` ne prouve rien seul.** `tauri-action` ne pose son manifeste **que s'il a des
     signatures a y mettre** (`upload-version-json.ts` : `if (!signatureFiles[0]) return;`). Un run
     dont les secrets auraient saute rendrait `sig 0 / latest.json 0` — le profil `v0.31.2` — **sans
     que le correctif y soit pour rien**. **Toujours lire `sig` en face.**
  3. **Deux porteurs de version ne sont pas gardes** (`Cargo.lock`, `package-lock.json`), et `npm ci`
     ne rattrape pas le second.
  4. **Une levee d'absence se fonde sur un TELECHARGEMENT**, pas sur la presence dans l'API.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-08-29 23:01 | version | v0.32.2 | main | v0.32.2 publiee par le workflow corrige : matrice complete, CA-12 et CA-13 prouves, absence macOS levee. |
| 2026-08-29 21:34 | manual | v0.32.1 | main | Lot L42 installer depuis rien livre : la vitrine ne promet plus ce qu elle n a pas. NAS injoignable, push GitHub seul. |
| 2026-08-29 10:51 | manual | v0.32.1 | main | Lot L41 gardes tiedes livre : les gardes qui ne pouvaient pas rougir rougissent. Gate PASS au second passage. |
| 2026-08-29 01:55 | manual | v0.32.1 | main | Lot L40 cles d installeur livre et fusionne : 9 cles par app, 9/9 telechargeables. Gate PASS 16/18 CA. |
| 2026-08-29 00:06 | pause | v0.32.1 | main | Auto-update 4/4 : Windows et Linux ajoutes au manifeste, cle de signature posee, CI de release remis en service |
| 2026-08-28 21:55 | pause | v0.32.1 | main | Fin du lot 0 (trois canaux synchrones) + L1 (publication des artefacts) — auto-update reellement telechargeable |
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
