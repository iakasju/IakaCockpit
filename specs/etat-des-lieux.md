# Etat des lieux - IakaCockpit

> Genere par iakaframe (CLI) le 2026-06-26 08:25 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.6.0-rc |
| Branche | main |
| Dernier commit | 10cd7b7 docs(L7): instruction seed demo dev (arbitrages AR-1..4 tranches) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 18778 |
| Note | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `10cd7b7` | 2026-06-26 | docs(L7): instruction seed demo dev (arbitrages AR-1..4 tranches) |
| `947fb88` | 2026-06-26 | chore(L7): cargo fmt seed.rs + entree backlog L7 (remise au gate Legolas) |
| `89f8fb6` | 2026-06-26 | feat(L7): facade seedDemo + hook useDemoSeed + onglets team (bootstrap demo) |
| `2307d1b` | 2026-06-26 | feat(L7): backend seed.rs — seed demo dev (dossier git + config) borne par flag dev |
| `1352f09` | 2026-06-26 | feat(ui): slider taille de police jusqu'a 200% (max 140 -> 200) |
| `09dd850` | 2026-06-26 | docs(L6): checkpoint gate Legolas PASS — backlog + etat des lieux (candidate v0.5.0-rc) |
| `338f48e` | 2026-06-26 | docs(L5): instruction tracage machine des delegations (BROUILLON, a valider) |
| `21daabe` | 2026-06-26 | docs(L6): instruction canal adresse externe via n8n-passerelle (validee Stephane) |
| `2e10620` | 2026-06-26 | chore(L6): service n8n local dans la stack docker (recette canal adresse) |
| `ad73377` | 2026-06-25 | docs(L6): workflow n8n de reference (JSON sans credentials) + README import + fixtures mock |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : Lot **L7 — Seed démo dev** bouclé (cadrage Gandalf -> dev Gimli -> gate
  Legolas **PASS** : 105/105 front + 118/118 Rust dont 14 `seed`). Au lancement du build **DEV/TEST
  uniquement** (flag `cfg!(dev)` OU `IAKACOCKPIT_DEMO_SEED=1`, **zéro seed en prod**), l'app s'ouvre déjà
  peuplée : vrai dossier `<chapeau>/iaka-demo` (git réel, détecté par scan L1), **team = 5 onglets PTY**
  `[ROYAUME][Agent]` (Odin/Aragorn/Gandalf/Gimli/Legolas, shells nus), démarrage Portfolio, config seedée
  **si absente** (IA = **Ollama hôte** `localhost:11434`/`llama3.1:8b`, CouchDB `:5984`, n8n `:5678`).
  **Idempotent + non destructif + zéro secret seedé.** Aussi : **slider taille de police porté à 200 %**.
- **En cours / a reprendre** : candidate `v0.6.0-rc` commitée **en local** (push différé, pas de remote).
  **L5** (traçage délégations) reste **en cours** (garde réparé ; émission à finir — fire-and-forget avant
  exit ; iakaboxlogs non commité). Stack Docker `iakacockpit` up. Ollama hôte (`ollama serve`) requis pour
  la démo IA.
- **Prochaine etape concrete** : (1) **recette `tauri dev`** de L7 (projet iaka-demo détecté, 5 onglets
  team, « prochaine étape » via Ollama hôte) ; (2) **finir L5** (cf. mémoire `l5-tracage-delegations-en-cours`) ;
  (3) recettes manuelles n8n (L6) ; (4) ou attaquer un différé (canal adresse bidi, fiche jalon).
- **Pieges connus** : seed L7 **dev/test only** (jamais prod — `cfg!(dev)` faux en release). Démo IA suppose
  `ollama serve` lancé côté hôte (sinon L3 dégrade). L5 : POST fire-and-forget avant `process.exit`. Requête
  Mango L4 = tri sur clé d'index complète. Identifiants de test (`admin/iaka-test`, `sk-iaka-test`) jetables.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test s'ouvre deja peuple : dossier iaka-demo, team 5 onglets, config Ollama hote/CouchDB/n8n, zero seed en prod. Slider police jusqu'a 200%. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe SORTANT via n8n-passerelle — gate Legolas PASS. Cockpit POSTe un webhook n8n qui route Discord/Slack/MQTT. n8n local Docker pour recette. Aussi: brouillon L5 (tracage machine delegations) a valider. |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS + re-gate apres fix Mango. Recette reelle sur CouchDB local Docker. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine etape via endpoint OpenAI-compat configurable — gate Legolas PASS, teste reel Ollama localhost + LiteLLM->Ollama Docker. MVP v0.1 (L0+L1+L2+L3) complet. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
