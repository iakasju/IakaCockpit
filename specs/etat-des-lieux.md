# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-26 00:01 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.5.0-rc |
| Branche | main |
| Dernier commit | 338f48e docs(L5): instruction tracage machine des delegations (BROUILLON, a valider) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 17734 |
| Note | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `338f48e` | 2026-06-26 | docs(L5): instruction tracage machine des delegations (BROUILLON, a valider) |
| `21daabe` | 2026-06-26 | docs(L6): instruction canal adresse externe via n8n-passerelle (validee Stephane) |
| `2e10620` | 2026-06-26 | chore(L6): service n8n local dans la stack docker (recette canal adresse) |
| `ad73377` | 2026-06-25 | docs(L6): workflow n8n de reference (JSON sans credentials) + README import + fixtures mock |
| `a56dde3` | 2026-06-25 | feat(L6): facade notifyUser/n8nSetToken/n8nHasToken + Reglages canal adresse n8n |
| `7275f1e` | 2026-06-25 | feat(L6): module notify Rust — canal adresse sortant via webhook n8n |
| `6cf7a5b` | 2026-06-25 | docs(L4): checkpoint gate Legolas PASS (+re-gate) — backlog + etat des lieux (candidate v0.4.0-rc) |
| `1918fb9` | 2026-06-25 | chore(L4): harnais recette CouchDB local (service docker couchdb:3 + init/seed) |
| `5c6c80d` | 2026-06-25 | fix(L4): tri Mango sur cle d'index complete (no_usable_index contre idx-maincourante) |
| `3361c00` | 2026-06-25 | docs(L4): instruction validee mains-courantes (cadrage Gandalf) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L6 — Canal adresse externe (SORTANT)** boucle (cadrage Gandalf ->
  dev Gimli -> gate Legolas **PASS** : 93/93 front + 104/104 Rust dont 12 `notify`). Le Cockpit POSTe **UN**
  webhook n8n (`notify_user` via facade unique, header `X-API-Key`, token keychain write-only, payload
  canal-agnostique `{canal:"adresse",support,cible,message,meta}`) ; **n8n route** vers Discord/Slack/MQTT
  (« on cable, on ne route pas »). **AUCUN secret de support cote app** (ils restent dans n8n). Workflow n8n
  de reference versionne **sans credentials** (`docker/n8n/`). n8n local Docker monte pour la recette
  (`iakacockpit-dev-n8n`, port 5678). Mock + degradation propres.
- **En cours / a reprendre** : candidate `v0.5.0-rc` commitee **en local** (pas de remote -> push differe).
  **Brouillon L5** (tracage machine des delegations) sur le disque, **A VALIDER par Stephane, non demarre**.
  Stack Docker `iakacockpit` up (ollama+litellm L3, couchdb L4, n8n L6).
- **Prochaine etape concrete** : (1) **recette n8n manuelle** : creer le compte proprietaire n8n (UI
  localhost:5678), importer `docker/n8n/canal-adresse.workflow.json`, completer les credentials Discord/Slack/MQTT,
  activer, puis Reglages Cockpit (URL production webhook + token X-API-Key + support) -> bouton « Tester l'envoi » ;
  (2) decider du sort de **L5** (valider/prendre ou jeter) ; (3) ou attaquer le **Lot 2 bidirectionnel** du canal adresse.
- **Pieges connus** : webhook n8n inactif -> 404 (degrade proprement) tant que le workflow n'est pas importe+active
  en UI. Meme token `X-API-Key` cote n8n ET cote Cockpit. Requete Mango L4 = tri sur cle d'index complete.
  Hote 8 Go / VM Docker ~3.8 Go (8B OOM en conteneur). Identifiants de test (`sk-iaka-test`, `admin/iaka-test`) jetables.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
