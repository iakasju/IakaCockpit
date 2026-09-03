# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-03 14:51 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | 70de271 docs: rectifie une affirmation FAUSSE d'Odin sur l'arbitrage A-1 (datee, non effacee) |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1422 |
| Note | Mode guide du CLI livre (lots 0+B) : 33 commandes /iaka-*, registre unique, aide derivee. Amendement A : la garde de vocabulaire echoue. A-1 clos. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `70de271` | 2026-09-02 | docs: rectifie une affirmation FAUSSE d'Odin sur l'arbitrage A-1 (datee, non effacee) |
| `0ed86b4` | 2026-09-02 | chore: checkpoint — L44 clos, iakaframe v0.39.0 publiee, chaine de maj reparee |
| `ca8fd56` | 2026-09-02 | chore(release): publie le manifeste de mise a jour v0.32.2 |
| `5880743` | 2026-09-02 | merge: correctif des ecarts consignes de L44 (gate Legolas PASS) |
| `f919dd5` | 2026-09-02 | fix(L44): retire l'assertion CA-11 dont le role est refute par mutation M4 |
| `c0e7d33` | 2026-09-02 | chore: pause — L44 PASS et fusionne, correctif des ecarts en cours (1/4 fait) |
| `efbd1a2` | 2026-09-02 | fix(L44): le message E-1 cesse de dire NON EPROUVE d'un geste mesure (M1) |
| `0636c15` | 2026-09-01 | fix(L44): le temoin de la fixture FABRIQUE son erreur au lieu de la designer |
| `4f275cc` | 2026-09-01 | docs(L44): l'etat des lieux dit ou en est la garde du latest, date |
| `4682331` | 2026-09-01 | docs(L44): le CLAUDE.md dit ce que le job fait apres L44, mesure et date |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : trois chantiers **clos** depuis le dernier checkpoint — le **mode guide du CLI**
  (lots 0+B), l'**Amendement A** (la garde de vocabulaire echoue), et l'**affectation du modele par
  persona** (A-1 = P-D, lots 1 et 2). Les trois depots sont alignes sur **les trois references**
  (local, NAS, GitHub), arbres propres.

### Le mode guide du CLI — LIVRE (lots 0 et B ; lot A NON lance)

Demande : *« les commandes de iakaframe guidees dans le CLI, avec les propositions selectionnables »*,
declencheur `/iaka`, **deux surfaces**.

⚠️ **CE QUE LA MESURE A RETIRE DU LOT — c'est le plus utile a retenir** :
1. **`/iaka` etait DEJA PRIS** : alias de `/learning`, il pilote la **boucle de consentement du
   reservoir**, et `learning-skill.test.js:54-60` le verrouille. **Le reaffecter aurait detourne une
   garde, pas un raccourci.** -> `/iaka-guide` cree, **`/iaka` intact** (verifie a l'octet par le
   gate, `sha256 7d9ac0ae…`).
2. **Le menu selectionnable EXISTAIT DEJA** : taper `/iaka` filtre nativement les commandes `iaka*`.
   **Ce qui manquait n'etait pas un selecteur mais la COUVERTURE** (10 verbes sur 38). Le lot ne
   construit pas un menu : **il remplit celui que Claude Code dessine.** *« Je ne facture pas un menu
   que Claude Code dessine. »*
3. **« un verbe nu affiche l'aide » : REFUTE.** Trois classes coexistent ; `models` etait deja
   interactif.

**Livre** : registre `cli/src/lib/verbes.js` (**39 verbes**, chaque parametre **nomme son AUTORITE**),
verbe `commands --json`, **`HELP` DERIVE du registre** — plus une constante de prose —, generateur
avec `--check` anti-derive, `/iaka-guide` **aiguilleur qui DELEGUE au CLI**, et **21 commandes
generees**. **Resultat : 33 commandes `/iaka-*` au lieu de 11.**

### La lecon du lot — le troisieme temoin vide de la semaine

⚠️ **Une garde de FRAICHEUR ne peut pas attraper une derive du GENERATEUR lui-meme.** Mesure : echo
retire de `contenu()`, fichiers regeneres -> `--check` reste **VERT** (*« OK : 21 entrees a jour »*)
pendant que **les 21 entrees avaient perdu leur echo**. Elle ne mentait pas : **elle comparait deux
choses qui avaient bouge ensemble.** D'ou le **temoin INDEPENDANT** qui relit les fichiers **sur le
disque**, sans importer le generateur — verifie par le gate : *« pas de chemin detourne »*.

**Et les 18 exclusions portaient un motif FIGE** : le patron de l'**exclusion de confort**. Chacune
porte desormais sa **condition de chute propre**, citant un fait **falsifiable** ; la garde `GC` fait
rougir toute exclusion muette **en nommant le verbe**, pour que **le dix-neuvieme motif ne naisse pas
muet**. Couverture **inchangee : 21/39**. Asymetrie `frame`/`switch` **nommee comme un arbitrage de
grain**.
🛑 **Borne declaree par le gate** : `GC` est **LEXICAL** — il verifie qu'une condition existe, **pas
qu'elle veut dire quelque chose**. La lecture reste dans la boucle, comme pour H-1.

### L'Amendement A — la garde de vocabulaire echoue

`models set` sur une valeur hors grammaire **echoue** (`ok:false`, exit != 0, **rien d'ecrit**),
`--force` ouvre la porte, `best`/`default`/`opusplan` refuses.

⚠️ **CE QUI A RETOURNE LA DECISION** : `KNOWN_MODEL_VALUES` **etait DEJA FAUSSE** — elle ratait le
suffixe `[1m]`. Mesure croisee : `opus[1m]` et `sonnet[1m]` classes **INHABITUELS**. **« Echouer »
pose sur la liste existante aurait refuse, des le premier jour, la forme sous laquelle le runner
nomme le modele du decideur.** Le defaut n'etait pas a venir : **il etait la**, et l'avertissement
etait trop faible pour qu'on le voie.
**D5 n'est pas renverse, il est BORNE** : la projection **verbatim d'une valeur de binding** reste
vraie — sinon **le binding Ollama casse**. Verifie par le gate, mutation RA-2 a l'appui : la grammaire
posee au mauvais endroit produit un contrat **SANS ligne `model`**, la fuite silencieuse redoutee.

### Specifique a ce depot

- `v0.32.2` publiee, **9 cles / 9**, manifeste **regenere et servi** aux clients (verifie sur
  `raw.githubusercontent.com`, le canal que les clients lisent **vraiment**).
- Le referent fautif `release.yml:167` a ete corrige par L44 ; bloc `VERIFICATION` **inchange a
  l'octet**.
- Ce depot **n'est pas touche** par le mode guide du CLI ni par l'Amendement A.

### Prochaine etape concrete

1. **LOT A du mode guide** — le menu a fleches dans le terminal, **~5,25 j**, **NON lance**.
   Arbitrages **A1** (paliers du mode brut), **A2** (declenchement terminal), **A4** (traitement du
   refus) **restent OUVERTS**. ⚠️ Le mode brut **n'est pas testable de bout en bout** (Node n'a pas
   de pty, `node-pty` serait une dependance donc interdite) : sa recette est **manuelle sur deux OS**,
   *« cochee par l'humain, ou le palier n'est pas livre »*.
2. **La dette de canal** : `publish-update.mjs` pousse vers `origin` SEUL et **imprime « la version
   est visible des clients »** — phrase **fausse au moment ou elle s'affiche**. C'est une main
   humaine qui l'a rendue vraie. **Chaque publication future redemandera ce geste, et le script
   continuera de dire que c'est fait.**
3. **`CI-RELEASE-AUCUN-EPINGLAGE`** — successeur legitime : *« aucune mesure de ce lot ne le refute »*.
4. 🛑 **Tourner le jeton iakabox** et supprimer `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`.
   **Verifie** : cette branche **n'est PAS sur GitHub** (on ne pousse jamais `--all`).

### Pieges connus

1. **Une garde de FRAICHEUR compare deux derives de la meme source** : elle ne voit pas une derive de
   la source. Il faut un **controle positif independant**.
2. **Un temoin vide est pire qu'un temoin absent.** Trois trouves cette semaine.
3. **Un motif sans condition de chute est une exclusion de confort** — et une condition **generique**
   en est une deguisee.
4. **`gh release edit --latest` est un drapeau BOOLEEN** ; `legacy` n'est atteignable que par l'API,
   et **`false` ne relache rien**. **M1 a prouve que `true` AGIT.**
5. **La doc de GitHub decrit une regle que l'endpoint NE SUIT PAS.** *Une doc ne se refute pas en la
   relisant, elle se refute en mesurant.*
6. ⚠️ **PUBLIER PERIME LE CORPUS** : v0.39.0 a rendu FAUX **cinq** textes en une heure, dont le
   cartouche de L44 **et** le module que le remede **executait**.
7. **Deux sessions dans le meme arbre = travail perdu.** Parade eprouvee : **worktree isole**,
   **jamais `git add -A`**, chemins nommes, `git status` avant chaque commit.
8. **Verifier la branche courante AVANT de fusionner** : `git merge` depuis la branche elle-meme
   repond **« Already up to date »** pendant que `main` ne bouge pas.
9. ⚠️ **Un etat SAUVEGARDE n'est pas l'etat COURANT.** Erreur commise par Odin le 2026-09-02 :
   affirmer dans trois etats des lieux qu'A-1 n'etait pas tranche, en lisant une copie de midi.
10. **Un agent qui s'enlise deux fois au meme endroit ne se relance pas a l'identique** : **couper le
    lot en deux** l'a debloque en cinq minutes.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
