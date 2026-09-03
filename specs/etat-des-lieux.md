# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-03 18:54 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | 910257f merge: la dette de canal de la publication (gate Legolas PASS) |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1428 |
| Note | Dette de canal fermee : fan-out sur les deux canaux, exit non nul si une cible echoue, face 2 hors gate. Endpoint iakabox retire. Cliquet 20->23. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `910257f` | 2026-09-03 | merge: la dette de canal de la publication (gate Legolas PASS) |
| `a574046` | 2026-09-03 | fix(docs): rectifie EN DATANT les deux dernieres traces d'un cliquet a 20 |
| `f2f8c80` | 2026-09-03 | fix(convergence): cliquet 20 -> 23 — les trois fichiers de la dette de canal etaient inscrits SOUS le plancher |
| `3fefba8` | 2026-09-03 | fix(convergence): inscrit les 3 fichiers generiques de la dette de canal (cliquet 20 -> 23) |
| `69a8c1b` | 2026-09-03 | docs(tests): CA-6 — ecrit la limite de la face 1 DANS le fichier de garde |
| `f48819d` | 2026-09-03 | fix(docs): rectifie une declaration de couverture impossible sur la jonction (defaut 3, gate) |
| `4c657e4` | 2026-09-03 | fix(update): reformule le commentaire de rendreCompte — CA-1 zero occurrence stricte du fichier |
| `a7d680a` | 2026-09-03 | docs: rectifie la promesse de visibilite (datee) et inscrit L45 (dette de canal) |
| `fb58908` | 2026-09-03 | feat(update): face 2 hors gate — verifie ce que chaque endpoint sert reellement |
| `fd31a56` | 2026-09-03 | fix(update): pousse les DEUX canaux d'ecriture et cesse de promettre la visibilite |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : la **dette de canal de la publication est FERMEE** — c'etait la plus vicieuse du
  portefeuille, celle qui **mentait a l'operateur au moment ou il croyait avoir fini**. Les trois
  depots sont alignes sur **les trois references** (local, NAS, GitHub), arbres propres.

### La dette de canal — ce qu'elle etait, et pourquoi elle etait vicieuse

Le script poussait vers **`origin` SEUL** puis imprimait *« la version est visible des clients »*.
Les clients lisent **deux** endpoints : le **NAS** (= `origin`, pousse) puis **GitHub** (**jamais
pousse par aucun script**). **La phrase etait FAUSSE pour tout client hors LAN** — et c'est **une
main humaine** qui l'a rendue vraie, **quatre fois en une journee**.

**Trois faits etablis PAR LECTURE DE LA SOURCE, pas par deduction** :
1. **Le plugin fait `break` au premier endpoint qui REPOND — pas au premier qui est FRAIS.**
2. Le dommage est un **« vous etes a jour » FAUX ET SILENCIEUX**, pas une panne visible. **Personne
   ne remonte un bug pour ca.**
3. Le cout d'un endpoint injoignable n'est pas en queue de liste mais **EN TETE** — le NAS, **adresse
   privee en position 1, sans delai configure**.

**Livre** : fan-out sur **chaque canal du registre local, INDEPENDAMMENT**, compte rendu **DERIVE des
resultats**, et **exit NON NUL des qu'une cible echoue**. ⚠️ **L'enjeu d'AR-4 n'etait pas
ergonomique** : un `exit 0` apres un push manque **fabrique EXACTEMENT la configuration qu'on
repare** — un endpoint en tete, joignable et en retard, qui **FAIT AUTORITE** et dit « a jour » a
tout le LAN. Plus une **face 2 hors gate** qui verifie ce que chaque endpoint **SERT** reellement,
**jamais appelee** par la publication (AR-6 : zero dependance · cache CDN · une panne reseau ne doit
pas devenir un echec de publication).

**L'endpoint iakabox a ete RETIRE** (decision du decideur, apres un aller-retour assume : « on
garde » puis « on enleve »). 🛑 **Le motif n'est PAS qu'elle soit morte** — elle est en panne
**temporaire** et sera reparee. C'est **LE PIEGE DU RETOUR** : rien ne pousse vers elle, donc elle
**reviendrait en servant un manifeste PERIME**, et comme le plugin s'arrete au premier endpoint qui
**REPOND**, un client du LAN recevrait **une vieille version**. **Un canal qui revient en servant du
perime est PIRE qu'un canal absent : absent il est ignore, present et perime IL FAIT AUTORITE.**
👤 **Le retour en grace de iakabox est un geste du decideur.**

### Quatre FAIL, AUCUN sur du code — tout etait vert et faux par endroits

1. ⚠️ **LE LOT INSTALLAIT LE DEFAUT QU'IL REPARE** : trois fichiers **neufs** byte-identiques et
   **non inscrits** au registre, donc capables de **diverger en silence**. L'instruction n'interdisait
   d'aligner **que** `publish-update.mjs` ; l'execution a **respecte la lettre** et reproduit le
   defaut sur des fichiers **que l'interdiction ne nommait pas**. *Encore une interdiction par
   pointeur.*
2. **CA-6** : la limite de la face 1 n'etait ecrite **que dans le fichier de la face 2**.
3. **Une declaration FAUSSE** : `CLAUDE.md` citait le smoke test `--check-only` comme preuve, or
   `--check-only` sort en `process.exit(0)` **ligne 194**, **235 lignes AVANT** l'appel qu'il
   pretendait couvrir. **Honnete sur le trou, faux sur ce qui le comblait.**
4. **Les trois fichiers inscrits, mais LE CLIQUET RESTE A 20** — plancher **sous** le compte reel.
   **Prouve par contrefactuel** : regresser le registre a 20 laissait `CONV` **VERT**. Les trois
   fichiers pouvaient **quitter le registre sans un rouge**.

**Et une phrase devenue fausse dans le lot lui-meme** (« le cliquet reste a 20 ») : le balayage en a
trouve **QUATRE**, deux par depot, la ou **un seul pointeur** etait signale.

**Cliquet de convergence : 20 -> 23.** **AR-2 reste INCHANGE** (decision du decideur) : la jonction
`canauxDeclares()` -> `commitAndPushManifest` reste **NON GARDEE et DECLAREE TELLE** — la garder
aurait exige de rendre `publish-update.mjs` importable, soit **la convergence de forme qu'AR-2
refuse**.

### Specifique a ce depot

- `v0.32.2` publiee, **9 cles / 9**, manifeste **regenere et servi** aux clients.
- ⚠️ **C'est ici que la jonction reste NON GARDEE** : `publish-update.mjs` est **top-level** (il lit
  `process.argv` en portee module), donc **non importable** sans execution — la jonction
  `canauxDeclares()` -> `commitAndPushManifest` **n'est mordue par aucun test**. **Declaree telle**
  dans `CLAUDE.md`. **AR-2 borne la couture au seul geste de push** ; la combler exigerait la
  convergence de forme qu'AR-2 refuse. **Divergence PREEXISTANTE avec le GUI**, qui teste
  `commitAndPushManifest` (`publish-update.test.mjs:530-534`).
- ⚠️ **Une declaration fausse y a ete corrigee** : `--check-only` etait cite comme preuve de
  couverture, or il sort **ligne 194**, **235 lignes avant** l'appel vise.

### Prochaine etape concrete

1. 👤 **LES DEUX MESURES DUES AU DECIDEUR** — elles ne sont pas symboliques :
   - **M-1** : sur une machine **hors LAN**, chronometrer un controle de mise a jour. Le NAS est en
     **position 1**, adresse **privee**, **sans delai configure** — combien de temps avant que GitHub
     reponde ?
   - **M-4** : faire servir volontairement un **manifeste PERIME** par le NAS et lancer un controle —
     **l'app dit-elle « a jour » ?** C'est **« la seule preuve du risque central »**, celui que tout
     ce lot contourne **sans l'avoir jamais vu**.
2. 👤 **Retirer l'endpoint iakabox** est **FAIT** (2026-09-03) ; **son retour en grace** reste au
   decideur.
3. **LOT A du mode guide** — menu a fleches dans le terminal, **~5,25 j**, **NON lance** ; arbitrages
   **A1/A2/A4** ouverts. ⚠️ Le mode brut **n'est pas testable de bout en bout** : recette **manuelle
   sur deux OS**.
4. **`CI-RELEASE-AUCUN-EPINGLAGE`** — successeur legitime : *« aucune mesure de ce lot ne le refute »*.
5. 🛑 **Tourner le jeton iakabox** et supprimer `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`
   (**verifie** : cette branche **n'est PAS sur GitHub**).

### Pieges connus

1. ⚠️ **Le plugin s'arrete au premier endpoint qui REPOND, pas au premier qui est FRAIS.** Donc **un
   endpoint joignable et perime FAIT AUTORITE** sur un endpoint frais place apres lui. **Vaut pour le
   NAS**, position 1 et seul canal historiquement pousse.
2. **Une garde de FRAICHEUR compare deux derives de la meme source** : elle ne voit pas une derive de
   la source. Il faut un **controle positif independant**.
3. **Un temoin vide est pire qu'un temoin absent.** Quatre trouves cette semaine.
4. **Un plancher de cliquet SOUS le compte reel ne rougit jamais** — il laisse une entree disparaitre
   en silence. **Un plancher AU-DESSUS rougit en permanence.** Se mesure, ne se suppose pas.
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
14. ⚠️ **Regenerer un manifeste SANS relancer l'instrument de mesure fait rougir I4** (« la preuve est
    datee d'AVANT la publication qu'elle pretend prouver »). Erreur d'Odin, attrapee par la garde.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
