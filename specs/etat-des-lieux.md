# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-02 18:06 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | ca8fd56 chore(release): publie le manifeste de mise a jour v0.32.2 |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1422 |
| Note | L44 clos. iakaframe v0.39.0 publiee (1er run du CI). Chaine de maj reparee sur les 3 canaux. Contrefactuel du latest joue sur depot reel. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `ca8fd56` | 2026-09-02 | chore(release): publie le manifeste de mise a jour v0.32.2 |
| `5880743` | 2026-09-02 | merge: correctif des ecarts consignes de L44 (gate Legolas PASS) |
| `f919dd5` | 2026-09-02 | fix(L44): retire l'assertion CA-11 dont le role est refute par mutation M4 |
| `c0e7d33` | 2026-09-02 | chore: pause — L44 PASS et fusionne, correctif des ecarts en cours (1/4 fait) |
| `efbd1a2` | 2026-09-02 | fix(L44): le message E-1 cesse de dire NON EPROUVE d'un geste mesure (M1) |
| `0636c15` | 2026-09-01 | fix(L44): le temoin de la fixture FABRIQUE son erreur au lieu de la designer |
| `4f275cc` | 2026-09-01 | docs(L44): l'etat des lieux dit ou en est la garde du latest, date |
| `4682331` | 2026-09-01 | docs(L44): le CLAUDE.md dit ce que le job fait apres L44, mesure et date |
| `8ed1e1a` | 2026-09-01 | docs(L44): le cartouche du job latest dit ce que le job fait, mesure et date |
| `c13a512` | 2026-09-01 | feat(L44): la garde locale du bloc `latest:`, dans le gate des DEUX depots |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : **L44 est CLOS** (PASS au 8e passage, plus le correctif de ses 4 ecarts, PASS
  lui aussi), **`iakaframe v0.39.0` est PUBLIEE**, **la chaine de mise a jour est REPAREE** sur les
  deux apps, et le **contrefactuel du `latest` a ete joue sur un depot REEL**. Les trois depots sont
  alignes sur **les trois references** (local, NAS, GitHub).

### Installer depuis rien — mesure ANONYME du 2026-09-02

| | `IakaCockpit` | `iakaFrameGUI` | `iakaframe` |
|---|---|---|---|
| publiee | **v0.32.2** | **v0.1.8** | **v0.39.0** |
| assets | 16 | 16 | 1 (tarball npm) |
| vitrine <-> etagere | **concordent** | **concordent** | **concordent** |

Les deux apps s'installent **sur les 3 OS** (NSIS + MSI, les deux `.dmg`, AppImage + `.deb` + `.rpm`).

### La mise a jour automatique — REPAREE le 2026-09-02

⚠️ **Elle etait CASSEE et personne ne le voyait** : le manifeste servi aux clients annoncait encore
**0.32.1** et **0.1.7** alors que 0.32.2 et 0.1.8 etaient publiees. **Un utilisateur deja installe
n'aurait JAMAIS vu la version courante.** Les deux manifestes ont ete regeneres (9 cles / 9), et
**verifies sur le canal que les clients lisent vraiment** (`raw.githubusercontent.com`) : 0.32.2 et
0.1.8 y sont servis.
🛑 **LA CAUSE N'EST PAS CORRIGEE, et c'est la dette la plus vicieuse du portefeuille** :
`publish-update.mjs` pousse vers **`origin` SEUL**, alors que les clients lisent **GitHub**. Et les
deux scripts **impriment « la version est visible des clients »** — une phrase **FAUSSE au moment ou
elle s'affiche**. C'est une main humaine qui l'a rendue vraie, deux fois, ce jour-la. **Toute
publication future redemandera ce geste, et le script continuera de dire que c'est fait.**

### iakaframe v0.39.0 — le PREMIER run de son CI

`actions/runs` est passe de **`total_count: 0` a 1** : ce workflow n'avait **jamais** tourne.
Run **`33635520511`**, vert, release portant `naonedge-iakaframe-0.39.0.tgz` (624 390 o),
`latest = v0.39.0` mesure en anonyme. **Dette de 19 versions fermee** (v0.20.4 -> v0.39.0).
Le job a imprime — **premiere trace d'execution reelle de cette garde dans les trois depots** :
`DECISION : v0.39.0 EST le plus haut -> make_latest=true` · `VERIFICATION : latest effectif =
v0.39.0 (attendu : v0.39.0)`.

### Le contrefactuel du `latest` — joue sur le DEPOT REEL le 2026-09-02

Run **`33652524885`**, `workflow_dispatch` sur **`v0.20.4`** (un tag ANTERIEUR), vert :
`DECISION : v0.20.4 n'est PAS le plus haut (v0.39.0) -> make_latest=false.` ·
`VERIFICATION : latest effectif = v0.39.0 (attendu : v0.39.0)`.
**Premiere execution de la branche `make_latest=false` sur un depot reel**, avec son acteur et ses
droits. `latest` mesure en anonyme **immediatement PUIS 30 s plus tard** : `v0.39.0` les deux fois
(le repli DIFFERE ne se rouvre pas). **Aucune restauration n'a ete necessaire.**

> 🛑 **CE QUE CE RUN NE PROUVE PAS — et la nuance est decisive.** La release de `v0.20.4` **EXISTAIT
> DEJA** : l'action n'a rien cree, donc le defaut par defaut de l'API (`make_latest=true` A LA
> CREATION) **n'a jamais eu l'occasion de s'appliquer**. Or `make_latest=false` est un **NO-OP
> mesure**. **Les deux explications sont CONFONDUES** : soit `false` a empeche le vol, soit **aucun
> vol n'etait possible** — la seconde etant de loin la plus probable. **CA-6 et CA-10 ne sont PAS
> fermes.** Les separer exige de republier un tag ancien **qui ne porte AUCUNE release** : c'est la
> que la creation a lieu, et **c'est le geste reellement dangereux**. **CA-7** (sortie « aucune
> release ») n'est pas exerce non plus. **CA-5 est PARTIELLEMENT ferme** : la transposition au depot
> reel est acquise **pour la topologie « le tag ancien porte deja sa release »**, pas au-dela.

**Effet de bord nomme** : le run a **remplace l'artefact de `v0.20.4`** (asset desormais
`cree = 2026-09-02T16:03:42Z`, `par = github-actions[bot]`, la ou l'ancien avait ete depose a la
main). La provenance devient tracable — mais **c'est une modification d'une release publiee**.
**Fait a noter** : `softprops/action-gh-release@v2` s'est resolu au SHA
`3bb12739c298aeb8a4eeaf626c5b8d85266b0e65`. **Ce workflow n'epingle rien** : le prochain run peut en
prendre un autre **sans que personne ne le sache**.

### Specifique a ce depot

- `v0.32.2` publiee, **9 cles / 9 telechargeables**, manifeste **regenere et servi** aux clients.
- C'est ici que vivait `release.yml:167`, le referent fautif — corrige par L44. Le bloc
  `VERIFICATION` est **inchange a l'octet** (`sha256 1a69fc1a...`).
- Release Forgejo **id 70** creee le 2026-09-02 (14 artefacts updater televerses).

### Prochaine etape concrete

1. ~~**Arbitrage A-1** (decideur) — l'affectation du modele d'IA par persona. ⚠️ **Le dev a ete
   FAIT sans cette decision**, par une autre session, et une posture **P-D** a ete **inventee par
   l'execution** (Gandalf n'avait propose que P-A / P-B / P-C). Le cadrage disait pourtant : *« le
   dev NE DEMARRE PAS sans le choix du decideur sur A-1 »*.~~
   🛑 **RECTIFIE LE 2026-09-02 — CE PARAGRAPHE ETAIT FAUX, ET IL ETAIT DE MA MAIN (Odin).** Il est
   **date, pas efface** (regle 4), parce que c'est exactement la classe de defaut que L44 corrige
   ailleurs. **Les faits** : **A-1 EST TRANCHE** — encart de `specs/instructions/affectation-modele-par-acteur.md`,
   *« ✅ DECISION : P-D. Decideur : Stephane. Date : 2026-09-02. Enonce : "P-D […] ok" »*,
   **confirme de vive voix par le decideur**. Et **P-D n'a PAS ete inventee par l'execution** :
   A-1 avait ete **REFORMULE** avant la decision, sur **deux mesures** — (1) *G-5 contraint
   l'ADAPTATEUR, pas le SERIALISEUR ; une **capacite** n'est pas une **politique*** ; (2) le test
   de parite GUI **recompose** les contrats et la GUI **possede deja** `modelForPersona`
   (`binding.ts:199`), ecrite et non branchee. P-D a donc ete **proposee, argumentee, retenue**.
   **MA CAUSE, mesuree** : j'ai lu la copie du cadrage sauvegardee a midi et **je n'ai pas relu
   celle qui l'avait remplacee**. Un etat sauvegarde n'est pas l'etat courant.
   ✅ **ACQUIS ET MESURE le 2026-09-02** : les **10** contrats deployes `~/.claude/agents/*.md`
   portent une ligne `model:` — **4 `opus`, 6 `sonnet`**. L'affectation du binding **n'est plus
   decorative**. C'etait tout le sujet.
   **RESTE DU** : le **lot 2**, `specs/instructions/surcharge-modele-par-projet.md` (surcharge du
   modele par projet), **non valide par le decideur**.
2. **La dette de canal** : faire que `publish-update.mjs` pousse les deux canaux, **ou** qu'il cesse
   de promettre ce qu'il ne fait pas.
3. **`CI-RELEASE-AUCUN-EPINGLAGE`** — successeur legitime declare par le gate : *« aucune mesure de
   ce lot ne le refute »*.
4. 🛑 **Tourner le jeton iakabox** et supprimer `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`.
   **Verifie le 2026-09-02** : cette branche **n'est PAS sur GitHub** (on ne pousse jamais `--all`).

### Pieges connus

1. **`gh release edit --latest` est un drapeau BOOLEEN.** `legacy` est **inatteignable par le
   client** ; seule l'API l'ecrit. **`false` ne relache rien** — seul `legacy` rend le drapeau au
   calcul. **M1 a prouve que l'ecriture `true` AGIT** : le rattrapage fonctionne.
2. **La doc de GitHub decrit une regle que l'endpoint NE SUIT PAS** (`releases/latest` documente
   comme trie par `created_at`, **refute deux fois par le banc**). *Une doc ne se refute pas en la
   relisant, elle se refute en mesurant.*
3. **Un critere qui ne peut se fermer qu'en falsifiant n'est pas un critere.** Le gate a **retire le
   sien** quand aller a zero exigeait d'effacer une phrase **vraie** ou une **archive datee**.
4. **Une mutation SYMETRIQUE est invisible a la face croisee** : son vert **ne dit rien**.
5. **Un temoin vide est pire qu'un temoin absent.** Ancrer le message, **et garder un temoin de
   REUSSITE** — sans lui, « ca jette toujours » satisfait tous les autres.
6. ⚠️ **PUBLIER PERIME LE CORPUS.** La publication de v0.39.0 a rendu FAUX **cinq** textes en une
   heure — dont **le cartouche de L44 lui-meme** et le module que le remede **executait**. Regle 1 :
   *on sort de la liste quand un texte AFFIRME ce que le lot REFUTE* — c'est un **« ON SORT
   OBLIGATOIREMENT »**, et *« le perimetre d'une regle qui porte sur les ENONCES ne se retrecit pas
   a la liste des fichiers du diff »*.
7. **Deux sessions dans le meme arbre = travail perdu.** Parade eprouvee : **worktree isole**
   (`.worktrees/`), **jamais `git add -A`**, chemins nommes, `git status` avant chaque commit.
8. **Verifier la branche courante AVANT de fusionner** : `git merge` depuis la branche elle-meme
   repond **« Already up to date »** pendant que `main` ne bouge pas. Piege rencontre ce jour-la.
9. **Le banc `iakasju/latest-contrefactuel`** (prive, `latest = v0.10.0`) reste la piece a
   conviction : **ne pas casser sa topologie adverse**.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
