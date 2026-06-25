# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-25 21:43 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.3.0-rc |
| Branche | main |
| Dernier commit | adf03f9 chore(L3): stack docker de test ollama+litellm (cibles #2/#4, ports 11435/4020) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 15189 |
| Note | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `adf03f9` | 2026-06-25 | chore(L3): stack docker de test ollama+litellm (cibles #2/#4, ports 11435/4020) |
| `6a9210b` | 2026-06-25 | docs(L3): instruction cadrage moteur prochaine etape (endpoint OpenAI-compat, gate valide) |
| `f481e8e` | 2026-06-25 | feat(L3): panneau prochaine etape (Working) + reglages modele/cle + facade |
| `3d374b1` | 2026-06-25 | feat(L3): moteur prochaine etape Rust (UN endpoint OpenAI-compat, mock, cle keychain) |
| `4fcbdac` | 2026-06-25 | feat(L2): bouton + import projet (dossier existant) dans Working |
| `d02eb85` | 2026-06-25 | docs(L2): checkpoint gate Legolas PASS — backlog L2 + etat des lieux (candidate v0.2.0-rc) |
| `abf9900` | 2026-06-25 | feat(L2): App shell de navigation (3 vues) + montage theme par defaut |
| `a1cca59` | 2026-06-25 | feat(L2): composants + vues Portfolio / Working / Reglages (presentationnels) |
| `ef4f5ca` | 2026-06-25 | feat(L2): feed main courante MOCKE (3 canaux) + filtres (DEP-1) |
| `0e79d2a` | 2026-06-25 | feat(L2): useServices — etat iakabox avec degradation hors box (R-L2-7) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L3 — moteur « prochaine etape »** boucle de bout en bout
  (cadrage Gandalf -> dev Gimli -> gate Legolas **PASS** : 70/70 front + 67/67 Rust). UN endpoint
  OpenAI-compat configurable (LiteLLM / Ollama local-LAN / cloud), « on cable, on ne route pas » ;
  cle optionnelle au keychain (write-only), mock dev implicite. **Teste en reel** : Ollama localhost
  (8B) + LiteLLM->Ollama Docker (1B). Stack Docker de test isolee livree (`docker/`, conteneurs
  `iakacockpit-dev-*`, ports 11435/4020). **MVP v0.1 (L0+L1+L2+L3) techniquement complet.**
- **En cours / a reprendre** : rien en suspens cote dev. Candidate `v0.3.0-rc` commitee **en local**
  (aucun remote configure -> push differe). Stack Docker laissee **up** (pilotable `docker compose up -d`/`down`).
- **Prochaine etape concrete** : (1) confirmer le modele par defaut `ai.rs::DEFAULT_MODEL` + le texte du
  prompt A4 ; (2) test in-app `npm run tauri dev` -> Reglages -> bouton « prochaine etape » ; puis cabler
  le remote Forgejo et pousser, ou enchainer sur **L4** (mains courantes 3-canaux / iakaboxlogs).
- **Pieges connus** : hote 8 Go / VM Docker ~3.8 Go -> un modele 8B est OOM-killed **dans le conteneur**
  (d'ou `llama3.2:1b` cote Docker) ; le 8B ne tourne que sur l'Ollama localhost (RAM hote). Cle de test
  LiteLLM `sk-iaka-test` = locale jetable, pas un vrai secret.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
