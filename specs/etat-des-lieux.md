# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-29 00:06 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | e246812 fix(canal): linux-x86_64 annonce, et mesure — l AppImage, pas le .deb |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1399 |
| Note | Auto-update 4/4 : Windows et Linux ajoutes au manifeste, cle de signature posee, CI de release remis en service |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `e246812` | 2026-08-28 | fix(canal): linux-x86_64 annonce, et mesure — l AppImage, pas le .deb |
| `08efcc6` | 2026-08-28 | fix(canal): windows-x86_64 annonce, et mesure — le NSIS, pas le MSI |
| `1aca3cc` | 2026-08-28 | chore(iakaframe): checkpoint de pause — etat des lieux + recit de reprise (lot 0 + L1) |
| `cc3348d` | 2026-08-28 | fix(canal): le cliquet a saute — release v0.32.1 publiee, hors-couverture retire |
| `80adf82` | 2026-08-28 | fix(canal): manifeste v0.32.1 sur des URL publiques — artefacts construits, signes, PAS publies |
| `5db1240` | 2026-08-28 | fix(canal): le commentaire declarait GitHub prive — c est faux depuis le 2026-08-28 |
| `4ecc2f5` | 2026-08-28 | chore(journal): entrees de pause du checkpoint de reprise |
| `0722ad3` | 2026-08-28 | docs(etat-des-lieux): recit de reprise — lot 0 remis au gate, rien pousse (reseau coupe) |
| `f481ed9` | 2026-08-28 | fix(canal): trois endpoints d update ordonnes, une cible morte ne bloque plus |
| `2f1e7b9` | 2026-08-25 | fix(canal): repointe l auto-update sur le NAS — l ancienne iakabox ne repond plus |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : l'auto-update est passe de **casse** a **4 plateformes sur 4
  telechargeables**. Au reveil, le manifeste servi par `main` annoncait **une seule** plateforme
  (`darwin-aarch64`) vers une release **sans asset** : mesure `0/1`. L'app **voyait** une mise a jour
  et **ne pouvait pas la telecharger**. Etat final mesure en anonyme sur ce que `main` sert :
  **`TELECHARGEABLE : 4/4 — le manifeste tient sa promesse.`**
- **Architecture** : `FORGEJO_BASE` (ou l'on **LIT** le manifeste : NAS `192.168.1.139` ->
  `raw.githubusercontent.com` -> iakabox en dernier secours) est **distinct** de `ARTEFACT_BASE`
  (ou l'on **TELECHARGE** : les releases GitHub, hote **public**). Un updater Tauri ne sait pas
  s'authentifier : toute URL de LAN ou de depot prive est un **404 garanti** pour l'utilisateur final.
  Le depot est **public** depuis le 2026-08-28, pour cette raison.
- **La chaine complete de la journee**, quatre lots, quatre gates independants, **aucun auto-valide** :
  1. **Levee du hors-couverture** (apres publication manuelle de la release v0.32.1, artefacts darwin
     construits et signes a la main). Le **cliquet** de `HORS_COUVERTURE` a fonctionne **en reel** et a
     dicte l'ordre exact de sa propre levee.
  2. **`windows-x86_64`** ajoute au manifeste, apres pose de la cle de signature et build CI.
  3. **`linux-x86_64`** ajoute, apres build CI Linux.
  4. Chaque lot : diff **strictement additif**, prouve a l'octet ; manifeste **regenere par
     `buildManifest()`**, jamais ecrit a la main ; mesures refaites sur **l'octet retelecharge**.
- **La cle de signature est posee** (`TAURI_SIGNING_PRIVATE_KEY`, 2026-08-28) et **`release.yml` est
  reactive**. C'etait la cause racine : `gh secret list` rendait **vide**, le depot ne pouvait produire
  aucun artefact signe. Les deux builds CI (Windows puis Linux) sont les **premieres releases signees
  du Cockpit produites par son CI** — la v0.31.2 ne porte aucun `.sig`.
- **Arbitrages tranches, avec leur raison** :
  - **Windows -> le `-setup.exe` (NSIS), pas le `.msi`.** L'arbitrage etait **deja ecrit** dans
    `scripts/lib/update-manifest.mjs` (`artifactRank`) depuis le 2026-08-06 et n'avait **jamais ete
    exerce**, faute de build Windows. La voie d'installation suit le **magic byte** (`4d5a9000` MZ ->
    NSIS ; `d0cf11e0` CFB -> MSI) : le choix du binaire **est** le choix du mecanisme.
  - **Linux -> l'AppImage**, et **pas** parce que le plugin ignorerait `.deb`/`.rpm` — **il sait les
    installer** (`dpkg -i`, `rpm -U`). La vraie raison : le choix de l'installeur vient de
    `bundle_type()`, le type du **binaire qui tourne**, jamais de l'octet telecharge. Sous la cle
    generique, l'AppImage est **le seul octet qui n'endommage personne** : client AppImage ou bundle
    inconnu -> installe ; client deb/rpm -> `InvalidUpdaterFormat`, refus en **premiere instruction**
    de `install_deb`, **avant tout acces disque**.
- **Prochaine etape concrete — un seul lot successeur, deux defauts jumeaux** :
  1. **Les cles specifiques que le generateur n'emet pas** (`windows-x86_64-msi`, `-nsis`,
     `linux-x86_64-deb`, `-rpm`). Consequences reelles et symetriques : un utilisateur Windows installe
     **par MSI** recevra l'exe NSIS, qui s'installera **a cote** de l'enregistrement MSI au lieu de le
     remplacer ; un utilisateur Linux installe **par `.deb` ou `.rpm`** telechargera **92 Mo a chaque
     tentative** pour echouer proprement. **Le CI produit deja ces cles** (son `latest.json` en porte
     sept) — c'est notre `buildManifest()` qui ne les emet pas.
  2. **Le trou `parUrl` d'I4** : la garde indexe les mesures **par URL** sans verifier que la
     plateforme correspond. Exerce au gate : mettre l'URL de l'exe Windows dans l'entree Linux passe
     **au VERT**. A durcir (dedupliquer, ou refuser les doublons, ou croiser plateforme + URL).
- **Pieges connus** :
  1. **`release.yml` se declenche `on: push: tags: v*`.** Desarmer AVANT de pousser un tag si l'on
     veut proteger des artefacts deja publies (`gh workflow disable release.yml`). La cle etant
     desormais posee, le risque d'un build **non signe** a disparu — le risque d'**ecrasement** d'un
     artefact construit a la main, lui, demeure.
  2. **Le `latest.json` depose par `tauri-action` sur la release est FAUX mais INERTE.** Il accumule
     les runs (7 cles) et ne portera **jamais** les deux darwin, construits hors CI ; il pointe encore
     `windows-x86_64` sur le **`.msi`**, l'inverse de notre arbitrage. **Aucun endpoint ne le lit** —
     verifie par mesure sur les trois. A supprimer ou a faire renommer, avant qu'il ne trompe quelqu'un.
  3. **`pub_date` est une ENTREE, pas une sortie** (`new Date()` dans `publish-update.mjs`). La
     reproductibilite du manifeste a l'octet n'existe qu'a `pub_date` fige.
  4. **Verifier une signature sans minisign** (absent du Mac, LibreSSL d'Apple incapable d'Ed25519
     brut) : format `"ED"` = Ed25519 sur **blake2b-512 prehashe**. Verifier la signature **ecrite dans
     le manifeste** (celle que l'updater utilise), sur **l'octet retelecharge**, et **valider
     l'instrument sur un temoin negatif** avant de conclure.
  5. **Les actes de publication sont refuses aux agents** par le classifieur de permissions
     (`gh workflow disable/run`, push de tag, `gh release create`). Le decideur les tape lui-meme avec
     le prefixe `!`. Mode operatoire a retenir.
  6. **Aucune recette reelle n'a ete faite** : pas d'installation Windows ni Linux exercee, pas de
     bascule du plugin Tauri app lancee. Tout ce qui precede est etabli par **mesure reseau et lecture
     de source**, pas par un essai sur machine. La recette terrain reste due.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
