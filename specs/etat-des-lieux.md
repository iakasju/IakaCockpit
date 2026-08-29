# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-29 10:51 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | 391100c docs(claude): la doc disait D-4 GELE alors que le workflow est epingle depuis deux commits |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1412 |
| Note | Lot L41 gardes tiedes livre : les gardes qui ne pouvaient pas rougir rougissent. Gate PASS au second passage. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `391100c` | 2026-08-29 | docs(claude): la doc disait D-4 GELE alors que le workflow est epingle depuis deux commits |
| `2fa9d82` | 2026-08-29 | docs(instruction): CA-17 disait ce que AR-4 rend impossible — rectifie, et la limite est nommee |
| `62a22b2` | 2026-08-29 | test(convergence): le registre cesse de pouvoir MAIGRIR en silence — et ce qu il ne couvre pas est ECRIT |
| `d71f5ec` | 2026-08-29 | test(gardes): un test qui ne pouvait pas rougir cesse d etre une garde tiede |
| `9a2792a` | 2026-08-29 | test(updater): CA-17 dans sa forme honnete — la garde nomme ce qu elle voit, et DECLARE ce qu elle ne voit pas |
| `2c79f6d` | 2026-08-29 | docs(instruction): la byte-identite tient, ses chiffres non — et le registre s elargit |
| `127c752` | 2026-08-29 | ci(release): tauri-action epingle sur un SHA, et l entree que ce SHA connait |
| `f3b54e3` | 2026-08-29 | docs(gate): une commande de gate qui dit vrai — et D-4 GELE, remonte au decideur |
| `e6c635e` | 2026-08-29 | test(updater): la republication a l identique se prouve CONTRE le fichier versionne |
| `db24433` | 2026-08-29 | test(gardes): les jonctions cessent d etre libres — I4bis et la convergence |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L41 « Gardes tiedes »** est livre, **gate PASS au second
  passage**, fusionne dans `main` et pousse. En une phrase : **les gardes qui ne pouvaient pas rougir
  rougissent maintenant.** Il fait suite a **L40** (cles d'installeur), livre le meme jour, qui a porte
  les manifestes de 4 a **9 cles, 9/9 telechargeables**.
- **Le fil du lot** : trois mecaniques distinctes, trois remedes distincts.
  1. **Predicats qui attestaient le faux** — `estPrive` cassait sur l'IPv6 litteral
     (`hote.split(":")[0]` rend `"["` sur `[::1]:3001`), au point de declarer **PUBLIQUE une boucle
     locale** : l'invariant `I2` concluait **l'inverse de la verite**. Repare par
     `new URL().hostname` + retrait des crochets, **et renversement de la charge** (prive par defaut,
     public a prouver). Et `mesureLe` n'etait contraint par rien : `"2020-01-01"` passait au vert.
  2. **Jonctions non gardees** — `I4bis` etait **vacuous** sur registre vide : ses assertions
     pouvaient etre **supprimees en silence**. Et la convergence des deux apps, acquise par L40,
     **n'etait gardee par rien** : un `diff` passe une fois a la main. C'est le defaut que le cadrage
     a **ajoute** au releve.
  3. **Referentiels mouvants** — le tag flottant `tauri-action@v0`.
- **Le fait le plus lourd, decouvert en cours de lot : L40 avait livre une correction qui ne
  s'executait pas.** `uploadUpdaterJson: false` est une entree **INCONNUE** de l'action reellement
  epinglee — a `84b9d35b` (= `action-v0.6.2`) elle s'appelle **`includeUpdaterJson`**. GitHub Actions
  ignore une entree inconnue **en silence**. Le volet G de L40 etait donc **inoperant**, et **CA-12
  n'aurait jamais pu se clore** dans cette configuration. C'etait exactement le risque que le gate L40
  avait nomme (**D-4**, *« ma preuve porte sur la branche `dev` »*) et que le tag flottant rendait
  invérifiable. **Le gate a nomme le doute, le lot suivant l'a converti en fait.**
- **Le remede : deux gardes, et il en fallait deux.** Le pin seul aurait **fige le referent en laissant
  l'entree inerte**. La seconde compare les entrees **posees** aux entrees **declarees** par le SHA.
  Preuve la plus parlante : remettre le workflow dans l'etat **exact** que L40 avait laisse fait rougir
  **7 tests sur 13** — la garde aurait attrape le defaut le jour meme.
- **Le critere generique du lot**, adopte du decideur : *toute garde touchee est eprouvee par une
  mutation qui la fait rougir* — la mutation portant sur le **programme**, jamais sur l'attendu, et
  pour une **jonction**, la mutation etant la **suppression de l'appel**.
- **Specifique a ce depot** : il porte le generateur de manifeste (`scripts/lib/update-manifest.mjs`)
  qui fait autorite, et le registre de convergence `fixtures/convergence.sha256` (**13 fichiers**,
  cliquet de completude). `version` **traverse** ici la garde de reproductibilite — c'est la fermeture
  manquee n°1 ci-dessus.
- **Ce qui reste ouvert, et qui appartient au decideur** :
  1. **Etape 5.1 de L40 : bump + tag + run CI.** C'est la **seule** facon de constater que
     `includeUpdaterJson: false` supprime reellement le `latest.json` concurrent des releases —
     aujourd'hui c'est **prouve par lecture du bundle `dist/index.js` execute**, pas par observation.
     Clot aussi **CA-12** et la premiere moitie de **CA-13** de L40.
  2. **Les deux recettes reelles** : un client Windows **MSI** qui **remplace** son enregistrement au
     lieu de doubler ; un client Linux **`.deb`** qui **installe** au lieu d'echouer en
     `InvalidUpdaterFormat`. **Jamais observees.**
- **Cinq defauts au registre, tous declares, aucun bloquant** :
  1. **Fermeture manquee de `version`** cote IakaCockpit. Le motif retenu (« la seule fermeture
     disponible est une empreinte versionnee ») est **faux sur ce champ** : deriver la version du tag
     lu dans l'URL — ce que le generateur du GUI fait deja — la ferme **en une ligne de test**,
     byte-identite preservee. **Mesure au gate.** `I4` l'attrape par ailleurs.
  2. **`notes` n'est couvert par rien**, et **`pub_date` reculee** non plus. La borne est
     **asymetrique** : avancee au-dela de `mesureLe` -> rouge ; reculee -> vert. Declares avec
     condition de levee. Cause structurelle : **CA-16 prescrit lui-meme** de tirer `--notes` et
     `--pub-date` du fichier — un champ tire du fichier ne peut pas rougir en y revenant.
  3. **L'echange de lignes du registre de convergence passe au vert** — le compte est preserve, un
     fichier quitte silencieusement la couverture. Limite **declaree et prouvee vraie** au gate.
  4. **Resolution du depot frere par enumeration** : un 3e depot portant le registre changerait la
     cible. Remede autoritaire `IAKA_CONVERGENCE_HOME` (dossier sans registre -> `exit 2`, aucun repli).
  5. **Un rouge observe une fois puis perdu** (`1 failed | 1239 passed` cote GUI), non reproduit en
     **11 passes**. Le verificateur refuse de le declarer inexistant.
- **Prochaine etape concrete** : le successeur **« installer depuis rien »** — les 3 README annoncent
  une version scellee perimee, et GitHub designe **v0.1.6** comme `latest` du GUI alors que **v0.1.7**
  existe (il classe par **date de publication**, pas par numero). Autre audience, **trois** depots.
- **Pieges connus** :
  1. **Une entree inconnue d'une GitHub Action est ignoree EN SILENCE.** Ne jamais lire l'`action.yml`
     de `dev` pour une action epinglee sur un tag : lire **au SHA**, et verifier jusque dans le bundle
     `dist/index.js` si l'enjeu le merite.
  2. **`tauri-action` est epingle sur `84b9d35b5fc46c1e45415bdb6144030364f7ebc5` (`action-v0.6.2`)**,
     avec cliquet. **Epingler n'est pas monter** : passer en `v1` change le comportement du CI et se
     recette. La mutation du cliquet se fait **dans la fixture**, jamais dans le workflow.
  3. **Une prose de declaration vieillit sans que rien ne le signale.** Le lot y repond par un
     **cliquet a double sens** : la declaration rougit si le trou se referme **comme** s'il s'en ouvre
     un nouveau. Une limite ecrite mais non mesuree est une garde tiede de plus.
  4. **La partition des champs n'est pas la meme dans les deux depots** (le generateur du GUI derive
     `version` du tag, celui du Cockpit non). **Ne jamais dupliquer une declaration : la mesurer des
     deux cotes.**
  5. **Les actes de publication sont refuses aux agents** par le classifieur de permissions. Le
     decideur les tape lui-meme avec le prefixe `!`.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
