# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-08-28 21:55 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.32.1 |
| Branche | main |
| Dernier commit | cc3348d fix(canal): le cliquet a saute — release v0.32.1 publiee, hors-couverture retire |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 1399 |
| Note | Fin du lot 0 (trois canaux synchrones) + L1 (publication des artefacts) — auto-update reellement telechargeable |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `cc3348d` | 2026-08-28 | fix(canal): le cliquet a saute — release v0.32.1 publiee, hors-couverture retire |
| `80adf82` | 2026-08-28 | fix(canal): manifeste v0.32.1 sur des URL publiques — artefacts construits, signes, PAS publies |
| `5db1240` | 2026-08-28 | fix(canal): le commentaire declarait GitHub prive — c est faux depuis le 2026-08-28 |
| `4ecc2f5` | 2026-08-28 | chore(journal): entrees de pause du checkpoint de reprise |
| `0722ad3` | 2026-08-28 | docs(etat-des-lieux): recit de reprise — lot 0 remis au gate, rien pousse (reseau coupe) |
| `f481ed9` | 2026-08-28 | fix(canal): trois endpoints d update ordonnes, une cible morte ne bloque plus |
| `2f1e7b9` | 2026-08-25 | fix(canal): repointe l auto-update sur le NAS — l ancienne iakabox ne repond plus |
| `8241e14` | 2026-08-23 | docs(backlog): L39 — synchronisation Cockpit / reservoir iakaframe |
| `3225eac` | 2026-08-23 | feat(teams): Charon, Helm et Feanor rejoignent le Cockpit — aligne sur le reservoir |
| `c7443ce` | 2026-08-23 | feat(reservoir): lecture du reservoir iakaframe cote Rust (source de verite des teams) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : l'auto-update de cette app etait **entierement casse** et personne
  ne le savait — le manifeste servi par `main` annoncait des artefacts sur une release **sans asset** (le NAS ne portait aucune release). Mesure au reveil :
  ****0/1** telechargeable**. L'app **voyait** une mise a jour et **ne pouvait la telecharger sur
  aucune plateforme**. Repare, mesure, fusionne dans `main` et pousse sur le NAS et sur GitHub.
- **Architecture retenue** : `FORGEJO_BASE` (ou l'on **LIT** le manifeste : NAS ->
  `raw.githubusercontent.com` -> iakabox en dernier secours) est desormais **distinct** de
  `ARTEFACT_BASE` (ou l'on **TELECHARGE** : les releases GitHub, hote **public**). Un updater Tauri
  ne sait pas s'authentifier : toute URL de LAN ou de depot prive est un **404 garanti** pour
  l'utilisateur final. Les trois depots iaka sont passes **publics** le 2026-08-28 pour cette raison.
- **Garde de parite reecrite** (`scripts/__tests__/forge-host-parity.test.mjs`), invariant
  **remplace** et non affaibli : **I1** un seul hote designe · **I2** cet hote est **PUBLIC**,
  propriete testee (ni RFC1918, ni loopback, ni `.local`), jamais une liste en dur · **I3** l'hote
  mort `192.168.2.11` absent partout · **I4** **aucune plateforme annoncee sans mesure**, la preuve
  etant `updater/mesures.json`, **fichier versionne** · **I5** au moins 2 hotes de lecture distincts.
- **Etat final MESURE en anonyme sur ce que `main` sert** : **`TELECHARGEABLE : 2/2 — le manifeste tient sa promesse.`**.
- **L'artefact de la version annoncee n'existait NULLE PART** : il a fallu **construire** v0.32.1
  (`tauri build --bundles app`, plus `--target x86_64-apple-darwin` pour l'Intel), le **signer**, puis
  creer la release GitHub. Signatures verifiees sur **l'octet retelecharge**, par deux instruments
  independants. **Seules 2 plateformes darwin sont annoncees** : pas de build Linux/Windows depuis un
  Mac, et une entree sans artefact est **interdite** par la garde I4. Le `darwin-x86_64` est **croise,
  non recette sur materiel Intel** — gate humain declare, non couvert.
- **Le cliquet a fonctionne en reel, et sa limite s'est vue le meme jour** : a la publication, la
  suite est restee **VERTE** — I4 ne mesure pas le reseau, il compare le manifeste a `mesures.json`,
  fichier versionne. Le rouge n'est apparu **qu'apres remesure**, en dictant l'ordre exact de sa
  propre levee : *« hors-couverture declare alors que l'artefact repond 200 — retirer l'entree »*.
  Le registre `HORS_COUVERTURE` reste en place, **vide mais arme** (6 reinscriptions tentees, 6
  rejetees) : on ne peut pas y rentrer en silence.
- **Prochaine etape** : lot successeur des residus de garde nommes au gate — **R1** cliquet passif
  sans borne de fraicheur, **R4** `estPrive` manque le nom d'hote nu et casse sur l'IPv6 litteral,
  **R5** signature globale minisign non controlee, **R6** `I4bis` *vacuous* quand le registre est vide.
- **Pieges connus** :
  1. **`release.yml` est `disabled_manually` depuis le 2026-08-28, et doit le rester** tant qu'aucun
     secret de signature n'est pose (`gh secret list -R iakasju/IakaCockpit` rend **vide**, la ou
     iakaFrameGUI a le sien). Le workflow se declenche `on: push: tags: v*` : le rearmer expose a un
     build non signe ou en echec au prochain tag. **Desarmer AVANT de pousser un tag.**
  2. La release `v0.31.2` ne porte **aucun `.sig`** — mais la cause n'est pas l'absence de secrets :
     `createUpdaterArtifacts` a ete introduit **apres** ce tag.
  3. Les tags `v0.32.0` et `v0.32.1` etaient **deja pousses sur le NAS** avant de l'etre sur GitHub.
  4. **Un `200` ne suffit pas** : seul un manifeste **au contrat** compte comme servant.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
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
