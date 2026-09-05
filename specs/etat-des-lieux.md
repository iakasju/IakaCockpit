# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-05 21:59 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | 74cc99a chore(claude): autorise WebFetch sur testing-library.com et docs.github.com |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1444 |
| Note | Pause apres scellement v0.33.0. Tout est pousse sur GitHub (NAS et iakabox injoignables toute la journee). Reprise : voir le recit ci-dessous. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `74cc99a` | 2026-09-05 | chore(claude): autorise WebFetch sur testing-library.com et docs.github.com |
| `e0d1104` | 2026-09-05 | docs(version): scelle v0.33.0 — note de qualite + etat des lieux |
| `5487457` | 2026-09-05 | docs(backlog): L50 — le lot des canaux n'avait aucune entree a son nom |
| `f3bcac0` | 2026-09-05 | fix(version): package-lock.json etait un CINQUIEME porteur que rien ne gardait |
| `b57bac3` | 2026-09-05 | chore(version): 0.32.2 -> 0.33.0 sur les quatre porteurs |
| `4adfcdc` | 2026-09-05 | merge: garde de la face en ligne des canaux — et un defaut de classement corrige (gate PASS) |
| `6c43818` | 2026-09-05 | docs(backlog): inscrit les deux successeurs de la face en ligne des canaux (CA-10) |
| `2179370` | 2026-09-05 | fix(quality): rectifie la ligne canaux en ligne — chaque endpoint INTERROGE (AR-3) |
| `556a5d5` | 2026-09-05 | chore(convergence): inscrit canaux-en-ligne au registre, cliquet 24 -> 26 |
| `adf81df` | 2026-09-05 | test(canaux-en-ligne): garde la face en ligne des canaux (20 tests, unitaires + sous-processus) |

## Reprise du travail (a completer par Cowork)

> Recit reecrit a la **pause du 2026-09-05**, apres le scellement de **v0.33.0**. Le recit
> precedent portait sur le mode guide du terminal et **n'avait plus rien a voir** avec l'etat
> courant : il est remplace, pas complete. Les lecons generales qu'il portait restent valables et
> sont conservees plus bas.

- **Ou on en est** : **v0.33.0 est SCELLEE et POUSSEE** (`e0d1104`), plus un dernier commit
  d'outillage (`74cc99a`). **96 commits depuis v0.32.2**, **sept lots gates**. Arbre propre.
  Note de qualite : `docs/qualite/v0.33.0.md` — elle porte le detail et les lecons.
- ⚠️ **AUCUN ACTE DE PUBLICATION N'A ETE FAIT** : ni tag, ni release, ni manifeste regenere. Le
  canal public sert donc encore **v0.32.2**, et la face en ligne le DIT (ecart nomme, hors gate).
  **C'est voulu** : ces gestes appartiennent au decideur.
- **Canaux** : **GitHub a tout recu**, dans les DEUX depots. **Le NAS (`192.168.1.139`) et iakabox
  (`192.168.2.11`) n'ont pas repondu au ping de toute la journee** — ce n'est ni un refus
  d'authentification ni un desaccord de depot, ce sont deux machines injoignables. Elles se
  rattraperont d'un `iakaframe update`, sans rien a reparer.

### Les sept lots de v0.33.0

Dette de canal de la publication · persistance de la Table (+ correctif de course au boot) ·
identite du runner · pastille du badge · statut vivant en session attachee · gardes de la vitrine ·
garde de la face en ligne des canaux (+ un defaut de classement corrige).

### Ce que cette serie a enseigne — le coeur du recit

1. **LA RECETTE DU DECIDEUR A TROUVE CE QUE LES GATES AVAIENT LAISSE PASSER**, trois fois :
   l'ouverture sur la mauvaise vue, le badge invente, la pastille aux deux epees. **Aucune n'aurait
   ete vue sans lancer l'app.**
2. ⚠️ **LE DEFAUT VIT A LA JONCTION** — quatre fois cette version. A chaque fois les **fonctions
   pures etaient correctes et leurs tests verts** : le defaut vivait ENTRE les fonctions, dans un
   ecran qu'un module declarait « non montable ». Il l'etait. **Une garde de fonction pure ne suffit
   pas quand le defaut vit a la jonction.**
3. **Un temoin satisfiable par autre chose doit porter un VERROU**, conserve dans le depot. Defaut
   paye **cinq fois**. Deux verrous poses cette version : celui de la pastille, celui du temps.
4. **On ne CONTRAINT pas un modele par une phrase, on l'ORIENTE.** Les gardes portent sur ce que le
   Cockpit **ENVOIE**, jamais sur ce que le runner **REND**. Critere declare **non couvert,
   definitivement** — c'est une conclusion, pas une dette.
5. **Elargir une mesure n'est pas toujours l'ameliorer** : cela aurait transforme « le README ne
   peut pas mentir » en « le README ne peut pas expliquer ».
6. **On n'etend pas une limite declaree qui parle d'AUTRE CHOSE.** « Est-ce que ca tourne » et « a
   qui l'imputer » sont deux axes : sur une session attachee, le premier est satisfait pendant que
   le second est viole. L'etendre aurait ete ecrire une chose fausse.
7. **Un lot qui corrige des successeurs oublies ne peut pas repartir en oubliant le sien** — dit par
   le gate **deux fois**. La seconde, la cause etait **une consigne du coordinateur qui contredisait
   le critere de l'instruction**.
8. **Un porteur de version corrige A LA MAIN sans etendre sa garde re-derive** : `package-lock.json`
   l'a fait deux fois. Garde etendue et cliquet pose.

### Prochaine etape concrete, dans l'ordre

1. **Publier v0.33.0** si les clients doivent la voir : tag, workflow, puis
   `node scripts/publish-update.mjs v0.33.0`. **C'est aussi l'occasion des recettes dues** :
   installeurs Windows MSI et Linux `.deb`, contrefactuel du vol de `latest` (CA-5/CA-6/CA-10).
2. **Successeur pret a cadrer, petit et hors ligne** : `ENDPOINT-404-COMPTE-COMME-INTERROGE` — la
   ligne de sortie affirme « chaque endpoint **interroge** sert la version » alors qu'un endpoint en
   404 **est** interroge et ne sert rien. Mesure et reproduit par le gate. ⚠️ **Le cadrage de ce lot
   a ete REFUSE par le decideur le 2026-09-05** : ne pas le relancer sans son feu vert.
3. **Deux decisions qui appartiennent au decideur** : la base Postgres du homelab (bloque L32 depuis
   fin juillet), et `CONVERGENCE-RELEASE-YML-ALIGNEMENT` (un des deux ecarts est FONCTIONNEL, donc
   l'aligner est une decision, pas un nettoyage).
4. **Dette documentaire tranchee a moitie** : `docs/qualite/` reprend a v0.33.0, mais **quatre
   versions restent sans note** (v0.31.2, v0.32.0, v0.32.1, v0.32.2). A combler ou a declarer
   abandonne.

### Signalements ouverts, non traites

Le cas d'erreur du scan du portefeuille (correct en code, garde par aucun test) · deux bornes de
hors-couverture non ecrites dans le code · le residu d'un critere non teste · un contrefactuel
declaratif plutot qu'execute · une extraction par regex qui suppose des cles alphabetiques ·
**un flake rapporte puis NON REPRODUIT** sur les gardes d'identite (~23 executions par fichier,
zero rouge) — ni confirme ni infirme, **a surveiller**.

⚠️ **Deux gates de scellement n'ont rendu AUCUN rapport** (badge seul, apres avoir travaille). Les
mesures de la note de qualite sont donc **celles du coordinateur**, et elles le disent. **Un verdict
sans rapport ne vaut rien.**

### Recettes RESTEES DUES des series precedentes (conservees, non traitees)

1. **Recette du palier 2 du mode guide** — `specs/recettes/mode-guide-palier-2-manuelle.md`,
   **8 scenarios, macOS ET Windows**, dont **Ctrl-C et la restauration du terminal**. Le palier 2 est
   **LIVRE MAIS NON RECETTE**, et c'est ecrit tel quel partout. *(Vit dans `iakaframe`, pas ici.)*
2. **M-1** — sur une machine **hors LAN**, chronometrer un controle de mise a jour. Le NAS est en
   **position 1**, adresse **privee**, **sans delai configure**.
3. **M-4** — faire servir volontairement un **manifeste PERIME** par le NAS : **l'app dit-elle « a
   jour » ?** C'est **la seule preuve du risque central**, celui que le lot de la dette de canal
   contourne **sans l'avoir jamais vu**.

⚠️ **La jonction reste NON GARDEE** : `publish-update.mjs` est **top-level**, donc non importable
sans execution — `canauxDeclares()` vers `commitAndPushManifest` n'est mordue par **aucun test**,
**declaree telle**. Divergence **preexistante** avec le GUI, qui peut la tester.

### Lecons generales conservees des recits precedents

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
| 2026-09-05 21:59 | pause | v0.32.2 | main | Pause apres scellement v0.33.0. Tout est pousse sur GitHub (NAS et iakabox injoignables toute la journee). Reprise : voir le recit ci-dessous. |
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
