# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-05 17:14 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.33.0 |
| Branche | main |
| Dernier commit | 5487457 docs(backlog): L50 — le lot des canaux n'avait aucune entree a son nom |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (suivis + non ignores) | 1444 |
| Note | Scellement v0.33.0 : 7 lots gates. 1030 front / 346 Rust, couverture 81,01 %. Note de qualite : docs/qualite/v0.33.0.md. AUCUN acte de publication : tag et release appartiennent au decideur. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `5487457` | 2026-09-05 | docs(backlog): L50 — le lot des canaux n'avait aucune entree a son nom |
| `f3bcac0` | 2026-09-05 | fix(version): package-lock.json etait un CINQUIEME porteur que rien ne gardait |
| `b57bac3` | 2026-09-05 | chore(version): 0.32.2 -> 0.33.0 sur les quatre porteurs |
| `4adfcdc` | 2026-09-05 | merge: garde de la face en ligne des canaux — et un defaut de classement corrige (gate PASS) |
| `6c43818` | 2026-09-05 | docs(backlog): inscrit les deux successeurs de la face en ligne des canaux (CA-10) |
| `2179370` | 2026-09-05 | fix(quality): rectifie la ligne canaux en ligne — chaque endpoint INTERROGE (AR-3) |
| `556a5d5` | 2026-09-05 | chore(convergence): inscrit canaux-en-ligne au registre, cliquet 24 -> 26 |
| `adf81df` | 2026-09-05 | test(canaux-en-ligne): garde la face en ligne des canaux (20 tests, unitaires + sous-processus) |
| `afee867` | 2026-09-05 | refactor(canaux-en-ligne): extrait le classement de verifier-canaux-en-ligne.mjs et corrige le 2XX-inutilisable |
| `b258bee` | 2026-09-05 | docs(specs): cadrage garde de la face en ligne des canaux — 3 arbitrages tranches (reco) |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : le **LOT A du mode guide** est livre et fusionne — c'etait le plus gros lot de
  la serie (~5,25 j), **PASS au PREMIER passage**. Les trois depots sont alignes sur **les trois
  references** (local, NAS, GitHub), arbres propres.

### Le mode guide du terminal — LIVRE (lots 0, B et A ; la serie est complete)

**Trois paliers**, cables sur **10 cibles** — le critere etant *« le parametre a-t-il une autorite
enumerable en place ? »*, jamais « les plus utilisees » (non mesure, donc invérifiable) :

| Palier | Contenu |
|---|---|
| **0** | **refus loquaces** — chaque refus sur vocabulaire ferme **LISTE les valeurs derivees de l'autorite** |
| **1** | **listes numerotees**, patron `models` deja eprouve en production |
| **2** | **fleches, surbrillance, filtre a la frappe** — mode brut, **MEME couture que 1** |

⚠️ **Le palier 1 n'est PAS un brouillon du 2 : il en est le REPLI AUTOMATIQUE** quand le mode brut
n'est pas disponible (terminal exotique, Windows ancien).

**Declenchement : `--guide`**, drapeau **opt-in**, **invisible des appelants existants**. Le verbe nu
est ecarte — il **casse la classe A** (`list` rend l'inventaire, `show` sort en `exit 1`).

**UNE REGLE UNIQUE de non-interactivite** (`peutDemander`) remplace **les DEUX regles divergentes** :
`models` **ne regardait PAS `CI`**, donc sur un runner avec pseudo-terminal **il prompterait et ferait
pendre le job**. ⚠️ **Changement de comportement OBSERVABLE, signale et documente aux deux endroits,
jamais glisse.**

🛑 **L'INTERDIT D'A4 TIENT, verifie par le gate qui a cherche le contournement** : aucune liste de
menu ne peut produire `--force` / `--yes` / `--cascade` / `--autoriser-creation-depot` **comme item**,
et un **test statique** double le filet runtime. **Un guidage qui proposerait `--force` aurait annule
la garde de l'Amendement A.** En valeur libre, **c'est `validateModelValue()` qui tranche, JAMAIS le
moteur** — mesure, pas lecture.

**Un VRAI bug trouve et corrige en route (CA-10)** : les trois points d'entree ne rendaient `'vide'`
que si `permettreLibre` etait faux — or **les 10 cibles passent toutes `true`**. Une autorite vide
affichait *« saisir un id »* au lieu de *« rien a guider »*. **Reproduit par le gate sur l'etat
d'avant**, remede verifie.

### 🛑 CE QUI RESTE DU AU DECIDEUR — trois gestes, et personne ne peut les faire a sa place

1. **La recette du palier 2** — `specs/recettes/mode-guide-palier-2-manuelle.md`, **8 scenarios, sur
   macOS ET Windows**, dont **Ctrl-C et la restauration du terminal**. **CA-13 N'EST PAS COCHEE** :
   le palier 2 est **LIVRE MAIS NON RECETTE**, et c'est ecrit tel quel partout. Le mode brut **n'est
   pas testable de bout en bout** — Node n'a pas de pty, `node-pty` serait **une dependance donc
   interdite**. Le gate a juge la recette **JOUABLE** : *« gestes precis, verdict binaire par ligne,
   pas vague »*.
2. **M-1** — sur une machine **hors LAN**, chronometrer un controle de mise a jour. Le NAS est en
   **position 1**, adresse **privee**, **sans delai configure**.
3. **M-4** — faire servir volontairement un **manifeste PERIME** par le NAS : **l'app dit-elle « a
   jour » ?** C'est **« la seule preuve du risque central »**, celui que le lot de la dette de canal
   contourne **sans l'avoir jamais vu**.

### Specifique a ce depot

- `v0.32.2` publiee, **9 cles / 9**, manifeste **regenere et servi** aux clients.
- **Non touche par le LOT A** (mode guide) : il vit dans `iakaframe` seul.
- ⚠️ **La jonction reste NON GARDEE** : `publish-update.mjs` est **top-level**, donc **non
  importable** sans execution — `canauxDeclares()` -> `commitAndPushManifest` **n'est mordue par
  aucun test**, **declaree telle**. **AR-2 borne la couture au seul geste de push.** Divergence
  **preexistante** avec le GUI, qui peut la tester.

### Prochaine etape concrete

1. 👤 **Les trois gestes ci-dessus.**
2. **`RESERVOIR-REDECLENCHE`** *(inscrit au backlog le 2026-09-03)* — le seuil du reservoir compte
   des **occurrences**, pas des **observations neuves**. Mesure : **8 propositions pour 2 sujets**,
   quatre cycles, sur **les memes deux lignes du 17 juillet**. Trois pistes inscrites, **aucune
   tranchee, aucune gratuite** — *« c'est un cadrage, pas un correctif »*.
3. **`CI-RELEASE-AUCUN-EPINGLAGE`** — le `release.yml` d'`iakaframe` **n'epingle rien** (trois tags
   flottants). Successeur legitime : *« aucune mesure de ce lot ne le refute »*.
4. **Ecart doc/code signale, non bloquant** : `docs/commandes.md` **sous-declare** le nombre
   d'exceptions a la regle A4.1 — **4 selections sur 10** n'offrent pas d'entree libre, **une seule
   est nommee**.
5. 🛑 **Tourner le jeton iakabox** et supprimer `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`
   (**verifie** : cette branche **n'est PAS sur GitHub** — on ne pousse jamais `--all`).

### Pieges connus

1. ⚠️ **Le plugin updater s'arrete au premier endpoint qui REPOND, pas au premier qui est FRAIS.**
   Donc **un endpoint joignable et perime FAIT AUTORITE** sur un endpoint frais place apres lui.
   **Vaut pour le NAS**, position 1.
2. **Une garde de FRAICHEUR compare deux derives de la meme source** : elle ne voit pas une derive de
   la source. Il faut un **controle positif independant**.
3. **Un temoin vide est pire qu'un temoin absent.** Quatre trouves cette semaine. ⚠️ **Un test
   d'interactivite est NOTOIREMENT facile a ecrire a vide** : *« pas de prompt en non-TTY » est vert
   sur un CLI ou rien n'est branche*.
4. **Un plancher de cliquet SOUS le compte reel ne rougit jamais** ; **AU-DESSUS il rougit en
   permanence**. Se mesure, ne se suppose pas.
5. **Une interdiction par POINTEUR ne ferme pas une classe** : interdire d'aligner UN fichier laisse
   creer trois fichiers neufs non gardes. *On ne `grep` pas une implication.*
6. **Un motif sans condition de chute est une exclusion de confort** — et une condition **generique**
   en est une deguisee.
7. **`gh release edit --latest` est un drapeau BOOLEEN** ; `legacy` n'est atteignable que par l'API,
   et **`false` ne relache rien**. **M1 a prouve que `true` AGIT.**
8. **La doc de GitHub decrit une regle que l'endpoint NE SUIT PAS.** *Une doc ne se refute pas en la
   relisant, elle se refute en mesurant.*
9. ⚠️ **PUBLIER PERIME LE CORPUS** : `v0.39.0` a rendu FAUX **cinq** textes en une heure.
10. **Deux sessions dans le meme arbre = travail perdu.** Parade : **worktree isole**, **jamais
    `git add -A`**, chemins nommes, `git status` avant chaque commit.
11. **Verifier la branche courante AVANT de fusionner** : `git merge` depuis la branche elle-meme
    repond **« Already up to date »** pendant que `main` ne bouge pas.
12. ⚠️ **Un etat SAUVEGARDE n'est pas l'etat COURANT** (erreur d'Odin, 2026-09-02).
13. **Un agent qui s'enlise deux fois au meme endroit ne se relance pas a l'identique** : **couper le
    lot en deux** l'a debloque en cinq minutes.
14. ⚠️ **Regenerer un manifeste SANS relancer l'instrument de mesure fait rougir I4** (erreur d'Odin,
    attrapee par la garde).
15. **`node-pty` est INTERDIT** (zero dependance) : tout ce qui exige un vrai pty se recette **a la
    main**, et se declare **NON COUVERT** plutot que teste a vide.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-09-05 17:14 | version | v0.33.0 | main | Scellement v0.33.0 : 7 lots gates. 1030 front / 346 Rust, couverture 81,01 %. Note de qualite : docs/qualite/v0.33.0.md. AUCUN acte de publication : tag et release appartiennent au decideur. |
| 2026-09-04 22:59 | pause | v0.32.2 | main | L37 persistance de la Table (+ correctif CA-6 course boot) et L46 identite du runner : livres, gates PASS, recette CA-11 verte. Reste : recette CA-10 du badge, S-1 statut vivant du roster (preexistant). |
| 2026-09-03 21:26 | manual | v0.32.2 | main | LOT A livre : mode guide du terminal, 3 paliers, --guide sur 10 cibles, regle unique de non-interactivite. Palier 2 NON RECETTE (geste humain, 2 OS). |
| 2026-09-03 18:54 | manual | v0.32.2 | main | Dette de canal fermee : fan-out sur les deux canaux, exit non nul si une cible echoue, face 2 hors gate. Endpoint iakabox retire. Cliquet 20->23. |
| 2026-09-03 14:51 | manual | v0.32.2 | main | Mode guide du CLI livre (lots 0+B) : 33 commandes /iaka-*, registre unique, aide derivee. Amendement A : la garde de vocabulaire echoue. A-1 clos. |
| 2026-09-02 18:06 | manual | v0.32.2 | main | L44 clos. iakaframe v0.39.0 publiee (1er run du CI). Chaine de maj reparee sur les 3 canaux. Contrefactuel du latest joue sur depot reel. |
| 2026-09-02 12:33 | pause | v0.32.2 | main | L44 PASS au 8e passage, fusionne et pousse. Correctif des ecarts consignes en cours : ecart 1 fait, 2-4 restants. |
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
