# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-09-02 12:33 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.2 |
| Branche | main |
| Dernier commit | efbd1a2 fix(L44): le message E-1 cesse de dire NON EPROUVE d'un geste mesure (M1) |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1422 |
| Note | L44 PASS au 8e passage, fusionne et pousse. Correctif des ecarts consignes en cours : ecart 1 fait, 2-4 restants. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `efbd1a2` | 2026-09-02 | fix(L44): le message E-1 cesse de dire NON EPROUVE d'un geste mesure (M1) |
| `0636c15` | 2026-09-01 | fix(L44): le temoin de la fixture FABRIQUE son erreur au lieu de la designer |
| `4f275cc` | 2026-09-01 | docs(L44): l'etat des lieux dit ou en est la garde du latest, date |
| `4682331` | 2026-09-01 | docs(L44): le CLAUDE.md dit ce que le job fait apres L44, mesure et date |
| `8ed1e1a` | 2026-09-01 | docs(L44): le cartouche du job latest dit ce que le job fait, mesure et date |
| `c13a512` | 2026-09-01 | feat(L44): la garde locale du bloc `latest:`, dans le gate des DEUX depots |
| `aeab3af` | 2026-09-01 | fix(L44): le job latest lit les RELEASES, et la branche du vol re-affirme --latest |
| `628d25f` | 2026-09-01 | chore: checkpoint — L43 livre (6e passage) + re-cadrage amende des trois mesures du banc |
| `da2dfa4` | 2026-08-30 | fix(L43): la vitrine imprimait a l'operateur la phrase refutee — aux trois depots |
| `0044a79` | 2026-08-30 | fix(L43): l'etat des lieux cesse de promettre un vol "mecaniquement impossible" |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : le lot **L44 « re-cadrage de la garde `latest` »** est **PASS au HUITIEME
  passage**, **fusionne et pousse** sur les deux canaux. Un **correctif des ecarts consignes** est
  **en cours, non termine** : ecart 1 fait, ecarts 2 a 4 restants.
- **Ce qui vient d'etre fait** :
  1. **Trois mesures du banc jouees par le decideur** (2026-08-31), qui ont renverse une premisse :

     | Ecriture | Effet | Mesure |
     |---|---|---|
     | `--latest` (`true`) via `gh` | **AGIT** | M1 |
     | `--latest=false` via `gh` | **inerte** | 29/08 |
     | `make_latest=false` via `PATCH` brut | **inerte** | M2 |
     | **`make_latest=legacy` via `PATCH`** | **AGIT** | M3 |

     ⚠️ **`gh` REFUSE la valeur `legacy`** (`--latest` est un drapeau **booleen**,
     `strconv.ParseBool`) : elle n'est atteignable **que par l'API**. **`false` et `legacy` ne sont
     PAS equivalents** — seul `legacy` rend le drapeau au calcul automatique.
  2. **Deux arbitrages tranches** (2026-09-01) : **AR-7 = (a)** re-affirmer `--latest` —
     **`legacy` N'ENTRE PAS dans le programme**, il entre dans les cartouches comme une
     **connaissance** ; **AR-8 = (a)** pas de quatrieme mesure avant de coder.
  3. **Le vrai defaut de code corrige — R-2** : `release.yml:203` derive desormais `PLUS_HAUT` de
     `repos/<depot>/releases` et non de `/tags`. Sur build rouge, un tag de version sans release
     faisait rougir `VERIFICATION` **A TORT** et dictait un rattrapage **sur une release
     inexistante**. ⚠️ Cette ligne **ne portait aucun mot du motif** : **aucune empreinte ne la
     tenait, elle a ete trouvee A LA LECTURE**. C'est la meilleure demonstration de la borne H-1.
  4. **Le trou du GUI est ferme** : son `release.yml` n'etait garde par **aucune** face de
     convergence (prouve par mutation). Extracteur + fixture `bloc-latest.sha256`, garde a deux
     faces, **plancher de convergence a 20** — valeur **mesuree necessaire** : a 18, la suppression
     d'une entree passait inapercue.
- **Prochaine etape concrete** : **reprendre le correctif** sur la branche
  `fix/L44-ecarts-consignes` (les trois depots). **Ecart 1 est fait et commite** (`iakaframe
  3f98e32`) ; **restent les ecarts 2, 3 et 4** :
  - **(2)** le commentaire `bloc-latest.test.mjs:82-83` justifie l'assertion l. 85 par un role que
    la mutation **M4** du gate **refute** (l'echec sort **l. 80**). **Dater ou retirer, pas les deux
    textes en contradiction.** ⚠️ **Fichier convergent : les deux cotes au meme commit logique.**
  - **(3)** le motif de balayage F2 est **sensible a la casse** : 9/2 declares, **14/7** avec casse
    et accents. **Aucun enonce faux ne s'y cache** (verifie a la main) — c'est la **couverture** qui
    manque. Rendre le motif insensible **et l'ecrire dans le corpus**.
  - **(4)** portee sur-annoncee : « 6 assertions, toutes dans `bloc-latest.test.mjs` » vaut pour ce
    fichier, pas pour le corpus. **Conclusion inchangee** (zero assertion positive non ancree).
  Puis **gate Legolas**, puis fusion.
- **Specifique a ce depot** : `v0.32.2` publiee, `latest` mesure a `v0.32.2`, **9 cles / 9
  telechargeables**. C'est ici que vivait `release.yml:167`, le referent fautif — desormais corrige
  en `:203`. Le bloc `VERIFICATION` est **inchange a l'octet** (`sha256 1a69fc1a…`).
- **CE QUI RESTE DU AU DECIDEUR, et que rien ici n'avance** : **CA-5, CA-6, CA-7 et CA-10**. Le lot
  se clot en **« cable et prouve HORS LIGNE »** — verdict du gate : *« il n'y a **aucune ligne de log
  opposable** sur le comportement reel du job ; la seule garde qui pese sur le code shell est une
  **fixture d'octets** : elle atteste qu'il **n'a pas change**, jamais qu'il **fonctionne** »*. Tous
  passent par un **run que le decideur seul peut declencher**.
- **Pieges connus** :
  1. **`gh release edit --latest` est un drapeau BOOLEEN.** `legacy` est **inatteignable par le
     client** ; seule l'API l'ecrit. Et **`false` ne relache rien**.
  2. **La doc de GitHub decrit une regle que l'endpoint NE SUIT PAS** : `releases/latest` est
     documente comme trie par `created_at`, **refute deux fois par le banc**. *Une doc ne se refute
     pas en la relisant, elle se refute en mesurant.* C'est l'explication retrospective du chantier.
  3. **Un critere qui ne peut se fermer qu'en falsifiant n'est pas un critere.** Le gate a **retire
     le sien** (« le sous-ensemble est vide ») quand l'execution a montre qu'aller a zero exigeait
     d'effacer une phrase **vraie** ou une **archive datee**. Forme close arretee : balayage
     **rejouable**, survivants **non muets**, et **chaque motif nomme sa condition de chute**.
  4. **Une mutation SYMETRIQUE est structurellement invisible a la face croisee.** Son vert ne
     confirme rien — **il ne dit rien**. Seuls les rouges nommes de la garde locale le disent.
  5. **Un temoin vide est pire qu'un temoin absent.** `toThrow()` nu etait satisfait par un `ENOENT`
     leve **avant** la branche gardee. **Ancrer le message**, et garder **un temoin de REUSSITE** —
     sans lui, « ca jette toujours » satisfait tous les autres.
  6. **Le banc `iakasju/latest-contrefactuel`** (prive, restaure a `latest = v0.10.0`) est la piece
     a conviction. Sa topologie adverse est ce qui rend l'elimination possible — **ne pas la casser**.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
