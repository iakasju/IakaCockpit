# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-29 21:34 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | 14b8b96 fix(vitrine): le temoin de la promesse en PROSE mesure enfin ce qu'il nomme |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1419 |
| Note | Lot L42 installer depuis rien livre : la vitrine ne promet plus ce qu elle n a pas. NAS injoignable, push GitHub seul. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `14b8b96` | 2026-08-29 | fix(vitrine): le temoin de la promesse en PROSE mesure enfin ce qu'il nomme |
| `6b0aea6` | 2026-08-29 | docs(claude): « promis » se lit hors bloc d'absence, pas « ligne de tableau » |
| `04ceb0e` | 2026-08-29 | chore(quality): le code 3 rappelle un STATUT, il ne devine plus une cause |
| `ea1cda6` | 2026-08-29 | fix(vitrine): promis, c'est promis PARTOUT — pas seulement dans un tableau |
| `19e04f1` | 2026-08-29 | chore(quality): la face en ligne de la vitrine, jouee HORS GATE et sans pouvoir le bloquer |
| `fe61e10` | 2026-08-29 | docs: la regle du latest, les deux faces de la vitrine, et L42 au backlog |
| `715cfcb` | 2026-08-29 | ci(release): le latest est DESIGNE, plus subi — sans toucher au SHA epingle |
| `9ddb936` | 2026-08-29 | chore(convergence): cinq fichiers de vitrine au registre, plancher 12 -> 17 |
| `f107afc` | 2026-08-29 | feat(vitrine): le README rejoint checkVersionAlignment, avec un cliquet d'omission |
| `feedfd3` | 2026-08-29 | feat(vitrine): face EN LIGNE du cliquet — anonyme, hors gate, SKIP explicite |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L42 « Installer depuis rien »** est livre, gate **PASS au
  troisieme passage**, fusionne dans `main` et pousse. Son critere n'etait pas technique : **ce qu'un
  inconnu obtient en suivant ce qu'on lui montre**. Il ne construit aucun installeur — **il rend vraie
  la page qu'on montre**.
- **Quatre defauts, pas trois** (le 4e trouve au cadrage) : **H-1** les 3 README annoncaient une
  version perimee (jusqu'a **dix-neuf mineures** d'ecart pour la CLI) · **H-2** GitHub ne classe pas
  par numero mais par un drapeau **`make_latest`** que personne n'avait jamais touche — republier une
  version ancienne **vole** le latest, et c'est ce qui s'etait passe · **H-3** la ligne de publication
  d'`iakaframe` s'etait tue depuis le 2026-08-04 · **H-4** la vitrine promettait des fichiers
  **inexistants** : la release « Latest » du Cockpit ne porte **aucun `.dmg`** alors que le README en
  promettait deux. **Un visiteur macOS repartait les mains vides.**
- **La cause de H-4, MESUREE et non intuitee** : `v0.32.1` a ete publiee par **deux
  `workflow_dispatch` successifs** (`platforms: windows` puis `platforms: linux`) — **aucun ne
  selectionnait macOS**. Le dernier run a matrice complete (`v0.31.2`) avait produit les deux `.dmg`
  sans difficulte. **Ce n'est pas un echec de build : l'artefact n'a jamais ete demande.**
- **Trois gates, deux FAIL, et le second est le plus instructif de la journee** : le lot qui supprime
  les gardes muettes contenait **un temoin vide** — un test nomme *« une promesse en PROSE est VUE »*
  qui **ne pouvait pas rougir**, parce qu'il visait un artefact **deja promis par le tableau**. Il
  aurait verdi meme si la fonction ignorait entierement la prose. Repare **et verrouille** : la
  premiere assertion exige desormais que le nom ne soit **pas** deja promis avant la prose. Le temoin
  ne peut plus redevenir creux en silence.
- **Ce qu'un inconnu obtient aujourd'hui** : **iakaFrameGUI** installable **de bout en bout sur les
  trois OS** (7 fichiers promis, 7 presents) · **IakaCockpit** Windows et Linux, l'absence macOS
  **declaree, datee et levable** au lieu d'etre promise · **la CLI** installable par
  `git clone && npm install -g ./cli` — **voie eprouvee deux fois**, dont sur un clone reel du depot
  public — avec ses deux impasses (`.tgz` et « Source code », toutes deux dependantes d'une release
  **absente**) nommees comme telles.
- **Specifique a ce depot** : il porte les deux entrees **« Non fourni pour v0.32.1 »** (macOS ARM et
  Intel), avec motif mesure, date et condition de levee — leve des que la matrice macOS sera relancee.
  Il porte aussi le registre de convergence (**17 entrees**, plancher **17**) et le generateur de
  manifeste qui fait autorite.
- **Etat des canaux — DETTE A RATTRAPER** : le **NAS `192.168.1.139` est tombe pendant la fusion**
  (timeout 75 s, code 000). **`main` est pousse sur GitHub, en avance sur `origin`.** Rien n'est
  perdu ; le verbe livre la veille est fait pour ca : **`iakaframe canaux --rattraper`** au retour du
  NAS, **en avance rapide seulement**.
- **Prochaine etape concrete** : **l'etape 5.1 de L40** — bump + tag + run CI. C'est **la seule preuve
  manquante de toute la chaine** : on sait par lecture du bundle execute que `includeUpdaterJson: false`
  supprimera le manifeste concurrent, **personne ne l'a vu**. Elle clot aussi CA-12 et la moitie de
  CA-13 de L40. ⚠️ **Pour `iakaframe`, ce serait la PREMIERE execution de son workflow** : mesure
  `actions/runs` -> **`total_count: 0`**, et le commit qui ajoute le workflow **n'est meme pas un
  ancetre du tag `v0.20.4`** (douze jours d'ecart). **Le premier essai sera un essai.**
- **Cinq successeurs inscrits, aucun bloquant** :
  1. **F-2** — une promesse n'est mesurable qu'**entre backticks**. Un lien markdown dont l'URL porte
     le nom, un `curl -LO` en bloc de code, une prose nue : **verts**. Pre-existant, aucun README
     actuel n'en contient — *« pas un mensonge present, un piege futur »*. Mais le commentaire du code
     promet plus que la mesure.
  2. **F-3** — la **face en ligne n'est exercee par aucun test**. Desarmee **symetriquement dans les
     deux depots**, tout reste vert : l'empreinte de convergence prouve l'**alteration**, pas le
     **comportement**.
  3. **Couverture asymetrique** — sous une meme mutation, le Cockpit rougit sur **3** tests et le GUI
     sur **1**, parce que `absents: []` cote GUI. **Le fichier est convergent, sa couverture ne l'est
     pas.**
  4. **`D3-OBSERVABLE-ENREGISTREMENT`** — une phrase dit « avant que le workflow n'existe » la ou la
     mesure dit « son enregistrement ».
  5. **`CI-RELEASE-AUCUN-EPINGLAGE`** — le workflow d'`iakaframe` **n'epingle rien** (`checkout@v4`,
     `setup-node@v4`, `action-gh-release@v2`, trois **tags flottants**). C'est le depot dont le CI n'a
     jamais tourne, et le seul a ne pas avoir l'acquis de L41.
- **Pieges connus** :
  1. **GitHub ne classe pas les releases par numero.** Le `latest` suit **`make_latest`** (defaut
     `true`, reecrit a chaque creation/mise a jour). **Publier une version ancienne vole le latest.**
     Remede : `gh release edit &lt;tag&gt; --latest`, ou le job conditionne au plus haut semver.
  2. **Les `.app.tar.gz` ne sont PAS des installeurs macOS** — ce sont des charges d'updater, on ne
     les double-clique pas. Ce piege a fait compter de faux installeurs **deux fois** dans la journee.
  3. **Un temoin qui vise un cas deja couvert par ailleurs ne prouve rien.** Verifier qu'il rougit
     **quand on restaure le defaut**, pas seulement qu'il est vert.
  4. **Une mutation de gate peut survivre a une interruption d'agent.** Un agent coupe a laisse
     `npm install -g ./CLI` dans un README. **Muter et revoquer une par une**, en verifiant la
     revocation immediatement — jamais en fin de campagne.
  5. **Le quota de l'API GitHub anonyme est de 60/h** et s'epuise vite en recette. Un `SKIP` doit
     rendre un **code distinct** (ici **3**), jamais 0.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
