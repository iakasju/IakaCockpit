# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-01 22:20 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | da2dfa4 fix(L43): la vitrine imprimait a l'operateur la phrase refutee — aux trois depots |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1419 |
| Note | L43 livre au 6e passage : balayage de completude. Trois mesures du banc jouees : --latest agit, false inerte, legacy AGIT. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `da2dfa4` | 2026-08-30 | fix(L43): la vitrine imprimait a l'operateur la phrase refutee — aux trois depots |
| `0044a79` | 2026-08-30 | fix(L43): l'etat des lieux cesse de promettre un vol "mecaniquement impossible" |
| `b22643e` | 2026-08-30 | fix(L43): le cartouche cesse d'annoncer une reparation par une regle refutee |
| `a156439` | 2026-08-30 | fix(L43): le bloc latest et le backlog disent la mesure, sa liste de regles et son residu |
| `faee550` | 2026-08-30 | fix(L43): le bloc latest et le backlog cessent de promouvoir le banc en propriete generale |
| `0b3e21c` | 2026-08-30 | fix(L43): le cartouche borne sa conclusion a la topologie du banc |
| `83a2ec9` | 2026-08-30 | fix(L43): l'entree de backlog cesse de citer une empreinte inventee et un compte faux |
| `d4a9e2c` | 2026-08-30 | fix(L43): le bloc `latest` du CLAUDE.md separe ce qui est mesure de ce qui est deduit |
| `6784b4b` | 2026-08-30 | fix(L43): le cartouche cesse d'affirmer un MECANISME qu'aucune trace n'etablit |
| `58f4e6f` | 2026-08-30 | docs(L43): backlog — la repetition est faite, le contrefactuel reel est suspendu |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L43 « contrefactuel du vol de `latest` »** est livre, gate
  **PASS au SIXIEME passage**, fusionne et pousse. Puis le decideur a joue **trois mesures** sur le
  banc prive, qui ont **renverse une premisse** du re-cadrage en cours.
- **Le fait etabli, et il a coute cher** : `make_latest=false` **est un NO-OP**. Deux mesures croisees
  refutent **8 regles de repli sur 9** — `created_at` (avec et sans exclusion), `published_at` (idem),
  **semver**, plus grand **`id`**, et le **repli differe** (refute par relecture ~13 h apres). Seul le
  NO-OP survit **parmi les regles enumerees**.
- **Les trois mesures du 2026-08-31, qui changent la lecture** :

  | Ecriture | Effet | Mesure |
  |---|---|---|
  | `--latest` (`true`) via `gh` | **AGIT** | M1 |
  | `--latest=false` via `gh` | **inerte** | 29/08 |
  | `make_latest=false` via `PATCH` brut | **inerte** | M2 |
  | **`make_latest=legacy` via `PATCH`** | **AGIT** | M3 |

  **M1** sauve le lot : le rattrapage que le job imprime **fonctionne**, ce n'est pas un mensonge.
  **M2** : le `PATCH` **brut** est accepte et sans effet -> **le NO-OP n'est PAS dans `gh`**, il siege
  dans l'API ou la lecture. **M3** : ⚠️ **`gh` REFUSE la valeur `legacy`** (`--latest` est un drapeau
  **booleen**, `strconv.ParseBool`) — elle n'est atteignable que par l'API ; et par l'API elle **AGIT**,
  le `latest` passant de `v0.9.0` a `v0.10.0`.
- **Ce que M3 etablit — et rien de plus** : `false` et `legacy` **ne sont pas equivalents**. Ecrire
  `false` **n'abandonne pas** la designation explicite ; **seul `legacy` la rend au calcul**. Et le
  `latest` est alle sur le **plus haut semver**, qui etait **le plus ancien sur les deux dates** :
  **la date la plus recente NE GAGNE PAS**. ⚠️ **Avec deux releases on ne separe pas « semver domine »
  d'une combinaison date+semver avec departage — on sait que la date ne dirige pas, pas la formule.**
- **Le job ecrit `--latest=false` en croyant relacher la designation ; il ne la relache pas.** C'est
  une **piste** de remede (ecrire `legacy`), **pas une conclusion** : `legacy` est inatteignable par
  `gh`, et rien n'est mesure sur son comportement **a la creation** par `tauri-action`.
- **Specifique a ce depot** : `v0.32.2` est publiee, `latest` mesure a `v0.32.2`, **9 cles / 9
  telechargeables**, `.dmg` produits par le CI. C'est ici que vit `release.yml:167`, le referent
  fautif. Le registre tient **12 lignes** de ce fichier — dont **6 du bloc `latest:` (147-199)**,
  declarees sans que le fichier soit modifie : *« declarer n'est pas modifier »*, valide au gate.
- **Le vrai defaut de code, trouve A LA LECTURE et non par l'outil** : `release.yml:167` derive
  `PLUS_HAUT` de `repos/<depot>/tags`, alors que `GET /releases/latest` ne peut rendre qu'un tag
  **PORTEUR d'une release** — **4 sur 29** au Cockpit. Sur build rouge (le cas que `if: always()`
  couvre expres), un tag de version reste sans release, **`VERIFICATION` rougit A TORT**, et le
  rattrapage dicte **s'adresse a une release qui n'existe pas**. Cette ligne **ne porte aucun mot du
  motif** : aucune empreinte ne la tenait. **C'est la meilleure demonstration disponible de la borne
  de l'instrument.**
- **L'instrument livre par L43** : un **registre d'enonces** (442 entrees) et un **balayage de
  completude** (D-5/D-6/D-7 + cliquet) — dans un fichier couvert, toute ligne du motif doit etre
  **tenue par une empreinte** : inscrite, ou **declaree hors couverture avec motif ET empreinte du
  texte exclu**. **Sa preuve** : relance sur l'etat que le gate venait de declarer `CONFORME` ->
  **253 lignes NON TENUES**. *« C'est ca, l'ecart entre une liste et un critere. »*
- **Sa borne, demontree et declaree — H-1** : *« la completude est celle du **MOTIF**, jamais celle du
  **SENS** »*. **173 des 442 entrees** sont ancrees sur des lignes que le balayage **ne verrait
  jamais** ; **7 enonces du coeur du residu ont ete trouves a la lecture** ; et on peut ajouter
  **70 lignes affirmant le contraire de tout le lot** sans qu'aucun compteur ne bouge. **La lecture
  reste dans la boucle.**
- **Pourquoi six passages** : le gate a diagnostique un **front qui recule** — le mecanisme, puis la
  portee, puis la propagation, puis la couverture de l'instrument. *« Les corrections sont pilotees
  par le pointeur, et les pointeurs d'un gate sont des **exemples**, pas une enumeration. **On ne
  `grep` pas une implication.** »* Le 6e passage a reussi parce que le **critere de cloture** a change :
  un balayage auto-verifiable, pas une liste.
- **Prochaine etape concrete** : Gandalf **amende** le re-cadrage avec M1/M2/M3 — la decision (2b)
  etait « re-affirmer `--latest` », **M3 ouvre « ecrire `legacy` »**, qui n'etait pas sur la table. Il
  dira aussi **s'il faut une 4e mesure** (une 3e release au banc casserait la correlation semver/date).
- **Pieges connus** :
  1. **`gh release edit --latest` est un drapeau BOOLEEN.** `legacy` — une des trois valeurs
     documentees — est **inatteignable par le client**. Seule l'API l'ecrit.
  2. **`false` n'est pas `legacy`.** Le premier ne relache rien, le second rend le drapeau au calcul.
  3. **Une liste de pointeurs n'est jamais une cloture.** Cinq listes successives ont ete des
     echantillons — y compris celles du gate, et **celle du gate omettait les cibles de sa propre
     mutation**.
  4. **Un registre muet est un defaut.** Le hors-couverture se declare **ligne a ligne, avec motif et
     empreinte du texte exclu** — sinon exclure ouvre un trou neuf.
  5. **Le banc `iakasju/latest-contrefactuel`** (prive, conserve) est la piece a conviction :
     `v0.10.0` plus haut semver et plus **ancien**, `v0.9.0` plus recente sur les deux dates. **Cette
     topologie adverse est ce qui rend l'elimination possible** — ne pas la casser.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-09-01 22:20 | manual | v0.32.2 | main | L43 livre au 6e passage : balayage de completude. Trois mesures du banc jouees : --latest agit, false inerte, legacy AGIT. |
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
