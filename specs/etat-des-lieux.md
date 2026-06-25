# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-25 22:47 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.4.0-rc |
| Branche | main |
| Dernier commit | 1918fb9 chore(L4): harnais recette CouchDB local (service docker couchdb:3 + init/seed) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 17302 |
| Note | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `1918fb9` | 2026-06-25 | chore(L4): harnais recette CouchDB local (service docker couchdb:3 + init/seed) |
| `5c6c80d` | 2026-06-25 | fix(L4): tri Mango sur cle d'index complete (no_usable_index contre idx-maincourante) |
| `3361c00` | 2026-06-25 | docs(L4): instruction validee mains-courantes (cadrage Gandalf) |
| `672e7f8` | 2026-06-25 | style(L4): rustfmt sur le test de parsing fixture disque |
| `765f076` | 2026-06-25 | test(L4): useMainCourante (loading/success/degrade) + facade backend L4 |
| `0d94ded` | 2026-06-25 | feat(L4): reglages CouchDB (URL/base config + identifiants write-only + etat) |
| `4967ac6` | 2026-06-25 | feat(L4): hook useMainCourante + composant MainCourante branche (Portfolio) |
| `11caaea` | 2026-06-25 | feat(L4): facade backend fetchMainCourante + credentials CouchDB ; type FeedEvent unique |
| `598e7fb` | 2026-06-25 | test(L4): fixtures CouchDB _find (specs/mock) + test de parsing sur disque |
| `11af23b` | 2026-06-25 | feat(L4): module Rust maincourante (lecture seule _find iakaboxlogs) + mapping 3-canaux |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L4 — Mains courantes 3-canaux** boucle (cadrage Gandalf ->
  dev Gimli -> gate Legolas **PASS** -> recette reelle -> **fix** Mango -> **re-gate PASS** : 79/79 front +
  92/92 Rust). Lecture seule `POST /_find` cote Rust via facade unique, mapping 3-canaux **sans faux geste**
  (geste uniquement via `meta.canal` reel), identifiants CouchDB au keychain (write-only), mode degrade +
  fallback mock. **Recette reelle** menee sur un **CouchDB local Docker** (`docker/`, conteneur
  `iakacockpit-dev-couchdb` port 5984, base `conversations` + index `idx-maincourante` + seed) : elle a
  **revele ET corrige** un bug Mango `no_usable_index` (tri a faire sur la **cle d'index complete**
  descendante, pas `ts` seul) — verrouille par test mutant. **Socle v0.1 (L0..L4) techniquement complet.**
- **En cours / a reprendre** : rien en suspens cote dev. Candidate `v0.4.0-rc` commitee **en local** (pas de
  remote -> push differe). Stack Docker `iakacockpit` laissee **up** (ollama+litellm L3, couchdb L4).
- **Prochaine etape concrete** : (1) test **in-app** `npm run tauri dev` -> Reglages (CouchDB `http://localhost:5984`,
  base `conversations`, admin/iaka-test) -> verifier la main courante ; (2) cabler le remote Forgejo + pousser
  quand la box est en ligne, et reconfirmer la recette contre la vraie box `.11:5984` ; (3) sortir un differe du
  backlog (volet machine « tracer les delegations », ou la cible web parallele).
- **Pieges connus** : requete Mango = **tri sur la cle d'index complete** desc (NE PAS revenir a `ts` seul ->
  `no_usable_index`, main courante vide en prod). Hote 8 Go / VM Docker ~3.8 Go (8B OOM dans le conteneur, d'ou
  `llama3.2:1b` cote Docker pour L3). Identifiants de test (`sk-iaka-test`, `admin/iaka-test`) = locaux jetables.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
