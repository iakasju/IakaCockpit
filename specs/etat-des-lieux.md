# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-29 01:55 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | cd0849b docs(claude): le geste de mesure devient une commande documentee, + le lot au backlog |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1404 |
| Note | Lot L40 cles d installeur livre et fusionne : 9 cles par app, 9/9 telechargeables. Gate PASS 16/18 CA. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `cd0849b` | 2026-08-29 | docs(claude): le geste de mesure devient une commande documentee, + le lot au backlog |
| `d49f692` | 2026-08-29 | chore(updater): manifeste a 9 cles, et mesure regeneree par l instrument versionne |
| `5010941` | 2026-08-29 | test(garde): les deux gardes convergent, et I4 devient un appelant mince |
| `3608aff` | 2026-08-29 | ci(release): le CI cesse de poser un SECOND manifeste concurrent sur la release |
| `4b0cdc9` | 2026-08-29 | fix(garde): I4 indexe par PLATEFORME, refuse les doublons, exige l URL de la plateforme |
| `397cf86` | 2026-08-29 | test(garde): les deux exploits de I4, ECRITS ROUGES D'ABORD |
| `b9df4bb` | 2026-08-29 | feat(mesure): instrument de mesure versionne des artefacts annonces |
| `9833b94` | 2026-08-29 | docs(instruction): les 8 arbitrages tranches — instruction validee par le decideur |
| `5b5713d` | 2026-08-29 | chore(iakaframe): checkpoint de pause — auto-update 4/4 telechargeable |
| `e246812` | 2026-08-28 | fix(canal): linux-x86_64 annonce, et mesure — l AppImage, pas le .deb |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L40 « cles d'installeur du manifeste updater »** est livre,
  gate **PASS** (16/18 CA verts), fusionne dans `main` et pousse sur les deux canaux. Le manifeste
  emet desormais **9 cles** au lieu de 4 : les 4 generiques **inchangees** + `linux-x86_64-{appimage,
  deb,rpm}` + `windows-x86_64-{msi,nsis}`. Mesure anonyme sur ce que `main` sert : **9/9
  telechargeables**.
- **Le defaut repare, en une phrase** : le manifeste ne mentait pas sur *ou* telecharger, il mentait
  sur *quoi* il sert. `tauri-plugin-updater` cherche `{os}-{arch}-{installer}` **puis**
  `{os}-{arch}` ; n'emettre que le generique faisait qu'un client Windows installe **par MSI**
  recevait l'exe NSIS et s'installait **a cote** de son enregistrement, et qu'un client Linux installe
  **par .deb/.rpm** telechargeait 92 Mo pour echouer en `InvalidUpdaterFormat` **a chaque tentative**.
- **Deux prerequis, decouverts au cadrage et traites en premier** :
  1. **La garde qui protege tout le reste etait trouee.** `I4` indexait les mesures **par URL** sans
     verifier la plateforme. Or emettre les cles d'installeur fait que **plusieurs plateformes
     partagent la meme URL par construction** (`linux-x86_64` et `-appimage` = le meme octet) :
     l'index s'effondrait **exactement au moment de s'en servir**. Repare : index **par plateforme**,
     refus des doublons de plateforme, et assertion que la mesure porte bien l'URL de cette plateforme.
  2. **Il n'existait aucun instrument de mesure versionne**, alors que `I4` asserte
     `signature: "valide"`. Le script d'origine vivait dans `scratchpad/` — **le repertoire n'existe
     meme plus**, la provenance etait irrecuperable. Cote GUI, la provenance declaree etait **fausse**
     (`iakaframe endpoints` fait un `HEAD`, ne calcule ni sha256 ni signature). Livre :
     `scripts/mesurer-artefacts.mjs` (telechargement anonyme, sha256, minisign Ed25519/blake2b-512,
     signature globale, keyid, temoin negatif, zero dependance), **byte-identique dans les deux depots**.
- **Regle de derivation** : le jeu de cles est **derive de ce qui est SIGNE**, jamais d'une liste
  souhaitee. Prouve sur 5 fixtures adverses, les deux generateurs d'accord : AppImage sans `.sig` ->
  `linux-x86_64` **disparait** · aucune signature -> **aucune cle** · un `.deb` seul ne prend
  **jamais** la generique Linux.
- **Non-regression des clients deja installes, verifiee cle par cle** : les 4 cles preexistantes
  gardent **url ET signature identiques**, generique Windows = **NSIS**, generique Linux = **AppImage**.
  Un client dont `bundle_type()` rend `None` retombe sur la generique : **meme octet qu'avant le lot**.
- **Ce qui reste ouvert, et qui appartient au decideur** :
  1. **Un bump + tag + run CI** sur chaque app. C'est la **seule** facon de clore **CA-12** (mesure
     **ROUGE** aujourd'hui : l'asset `latest.json` concurrent est **toujours** sur les deux releases,
     `uploadUpdaterJson: false` n'agit qu'au prochain build) et la premiere moitie de **CA-13**.
  2. **Les deux recettes reelles** (gate humain, ecrit dans l'instruction) : un client Windows **MSI**
     qui **remplace** son enregistrement au lieu de doubler ; un client Linux **`.deb`** qui
     **installe** au lieu d'echouer. **Personne ne les a jamais observees** — tout le benefice repose
     sur `bundle_type()`, lu dans la source, **jamais vu tourner**. Le lot se declare donc
     **« mesure, non recette »**, jamais « corrige ».
- **Prochaine etape concrete** : le successeur **« gardes tiedes »** — **C** cliquet passif sans borne
  de fraicheur · **D** `estPrive` manque le nom d'hote nu et **casse sur l'IPv6 litteral** (`[::1]` ->
  `split(":")[0]` rend `"["`, donc une boucle locale est declaree **publique** : I2 conclut l'inverse
  de la verite) · **E** `I4bis` **vacuous** sur registre vide, mesure ouvert au gate. Puis le
  successeur **« installer depuis rien »** (les 3 README annoncent une version scellee perimee, et
  GitHub designe **v0.1.6** comme `latest` du GUI alors que **v0.1.7** existe — il classe par date de
  publication).
- **Specifique a ce depot** : `release.yml` est **actif** et sa cle de signature **posee**
  (`TAURI_SIGNING_PRIVATE_KEY`, 2026-08-28) — c'etait la cause racine de l'absence de tout artefact
  signe ; la v0.31.2 ne porte aucun `.sig`. Le generateur de manifeste (`scripts/lib/update-manifest.mjs`)
  vit ici et fait autorite ; `HORS_COUVERTURE` + `I4bis` n'existaient qu'ici avant le lot.
- **Sept defauts non bloquants nommes au gate** : **D-1** un commit non atomique, plus large que
  l'auto-denonciation de l'executant · **D-2** `mesurer-artefacts.mjs` mele journal et document sur
  stdout — le defaut meme corrige dans `publish-update.mjs` · **D-3** deux `console.log` residuels ·
  **D-4** les workflows epinglent **`tauri-action@v0`, tag flottant** : la preuve du comportement de
  `uploadUpdaterJson` porte sur la branche `dev`, elle peut deriver en silence · **D-5** le `test:all`
  du GUI **ne couvre pas le Rust** alors que le CA le laisse croire · **D-6** le dry-run rend
  `notes: ""` : le chemin « republication a l'identique » reste **non prouve de bout en bout** ·
  **D-7** defaut E confirme ouvert.
- **Pieges connus** :
  1. **CA-8 protege le cas LEGITIME** — deux **cles distinctes** partageant la **meme URL** doit rester
     **vert**, alors que **CA-7** (une **plateforme** en doublon) doit rougir. Le gate a montre que
     CA-8 etait vert avant comme apres, donc qu'il ne prouvait rien ; il a invente la mutation
     manquante (dedupliquer par URL) et **CA-8 seul l'a tuee**. Ne jamais confondre les deux.
  2. **Les actes de publication sont refuses aux agents** par le classifieur de permissions
     (`gh workflow disable/run`, push de tag, `gh release create`, `gh secret set` selon le contexte).
     Le decideur les tape lui-meme avec le prefixe `!`.
  3. **Une garde s'ecrit ROUGE D'ABORD**, et l'etat rouge se **fige dans l'historique** pour etre
     rejouable au gate. C'est ce qui a permis de prouver, et pas seulement d'affirmer, que les deux
     exploits d'`I4` etaient verts a tort.
  4. **Verifier une signature sans minisign** (absent du Mac) : format `"ED"` = Ed25519 sur
     **blake2b-512 prehashe**. Verifier la signature **du manifeste** (celle que l'updater utilise),
     sur **l'octet retelecharge**, et **valider l'instrument sur un temoin negatif** avant de conclure.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
