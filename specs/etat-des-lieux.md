# État des lieux — 2026-06-30

## En une phrase
IakaCockpit est **scellé en v0.14.0** : le Gantt prévisionnel est complet (cascade L19 #9b
+ conformité au mock et remplissage live L20), par-dessus l'identité Atelier/Étagère/Table
+ main courante par hook L18 + widgets Table de la v0.13.0 ; recette terrain Stéphane OK,
gate Legolas PASS sur chaque lot.

## Fait récemment
- **v0.14.0 scellée** (2026-06-30) — clôture du Gantt prévisionnel. Trois lots livrés au-dessus
  de v0.13.0, chacun **gate Legolas PASS** :
  - **L19 #9b — cascade** (`54a6ea0`) : quand une tâche estimée dépasse son estimation, les
    baselines prévues des tâches **suivantes** se décalent en cascade (`baselineStartMs`,
    dérivation pure testée) ; dégradation honnête → no-estimate = no-baseline = no-cascade.
  - **L20 A — conformité mock** (`f14f941`) : `GanttPanel` réécrit contre le mock de référence
    (`specs/design/redesign/A/concepts/app/travail.html`) — couloirs **par tâche**, bandeau
    d'estimation, axe gradué **étendu au-delà de « maintenant »**, curseur labellisé, barres
    riches (fill/cap/débord rouge/marqueur prévu), rendu cascade (ghost/wait/connecteur), légende ;
    front pur, donnée inchangée (`derivePlanTimeline.ts` intact).
  - **L20 B — remplissage live** (`3b1dd51`) : hook `useNow` (ticker, pause onglet masqué) +
    polling `usePlan` (12 s, via façade L4 `fetchMainCourante`, anti-fuite d'interval) → les barres
    grandissent, le curseur avance, les nouvelles transitions sont captées. `_changes` CouchDB différé.
- **Recette terrain GUI validée par Stéphane** (look conforme au mock + live à l'œil).
- **Rappel socle v0.13.0** (`8b80087`) : identité Atelier/Étagère/Table, **L18 main courante par
  hook**, widgets Table, agrégation cross-projet des tokens (Étagère), campagne **ui-align v1a→v1c**.

## En cours
- Rien de bloquant. Branche `main`, arbre propre après seal. Différés tracés : couloirs-par-agent,
  flèches de relations + lane user (AR-1/AR-2 de L20), souscription `_changes` CouchDB.

## Jalons (gates)
| Jalon | Statut |
|---|---|
| Instruction cadrée | oui (L18 + L19 + L20 dans `specs/instructions/`, L20 arbitrages tranchés) |
| Tests verts | oui (375/375, typecheck + lint + build verts au gate L20) |
| Recette stage | oui (gate Legolas PASS sur `54a6ea0`, `f14f941`+`3b1dd51` ; recette terrain GUI Stéphane OK) |
| Feu vert prod | non applicable (produit en dev, pas de bascule prod prévue à ce stade) |

## Prochaine étape
**L16 — pilotage vocal d'iakacockpit** (cadré, non démarré) : P1 = barre de commande IHM /
navigation par la voix (STT local whisper.cpp côté Rust, dispatcher d'intent par règles). Sinon,
itérer sur les différés Gantt (couloirs-par-agent, flèches de relations) si Stéphane les repriorise.

## Points d'attention
- **Honnêteté de la baseline (verrou L19)** : ne jamais inventer d'estimation — la dégradation
  vers « réalisé seul » doit être visible et testée. Décision déjà gravée, à ne pas contourner.
- **Hooks globaux L18** (`~/.claude`, hors dépôt) : doivent rester **scopés par cwd/session** et
  **fail-open bornés** (~1,5 s) pour ne jamais bloquer une session non-cockpit. À re-vérifier après
  toute évolution du hook.
- **Live = polling, pas `_changes`** : le remplissage live repose sur un polling à 12 s (L20 B) ;
  la souscription temps réel `_changes` CouchDB reste différée. Latence ≤ 12 s assumée.
- **Pièges environnement (après reboot/pause)** : relancer `ollama serve` (11434, llama3.1:8b) +
  stack Docker (`cd docker && docker compose up -d` : ollama/litellm/couchdb/n8n) ; re-seeder
  CouchDB si besoin (`bash docker/init-couchdb.sh`, admin/iaka-test). App : `npm run tauri dev`
  (port 3020 ; tuer un Vite résiduel avant). NaonEdge = thème par défaut, **pas** la cible d'identité.

## Journal de reprise
| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-30 | version | v0.14.0 | main | Clôture du Gantt prévisionnel. L19 #9b cascade (`54a6ea0`) + L20 conformité mock (`f14f941`) + L20 live (`3b1dd51`), chacun gate Legolas PASS (375/375 tests, typecheck/lint/build verts), recette terrain GUI Stéphane OK. Cycle complet de la méthode : reprise → recette Aragorn (cascade absente) → cadrage Gandalf L20 (4 arbitrages tranchés : par tâche / différé flèches+lane user / live B1+B2 / axe étendu) → Gimli → Legolas → recette terrain. Front pur côté L20 (Rust inchangé). Différés : couloirs-par-agent, flèches de relations, lane user, `_changes` CouchDB. PROCHAINE ÉTAPE = L16 pilotage vocal (cadré, non démarré). |
| 2026-06-30 | reprise | v0.13.0 (+ lot non scellé) | main | Reprise après campagne ui-align. v0.13.0 scellée (L18 main courante par hook + widgets + Gantt). Lot post-seal : L19 Gantt prévisionnel #9a (réalisé data-ready) + #9b (obligation de rôle coordinateur, source des estimations tranchée), Étagère agrégation cross-projet tokens + treemap coût, Journal filtre/délégations, ui-align v1a→v1c (purge emojis, champs papier, casse normalisée). Arbre propre, main=origin/main. PROCHAINE ÉTAPE = recetter L19 #9b terrain (prévu vs réalisé→rouge+cascade ; dégradation honnête) puis sceller v0.14.0 après gate Legolas. |
| 2026-06-26 | pause | v0.9.0-rc | main | Pause après L10 COMPLET (recette terrain OK). REPRISE = arbitrer les 5 différés, le plus structurant = (c) modèle chef nu vs team (auto-iakastart ? persona/roster vs chef réel ; touche vision §0) -> cadrage Gandalf. Sinon (d) Stop hook sur le chef, (b) rendu xterm, (a) spike Codex. iaka-demo pré-trusté (backup ~/.claude.json.bak-iaka). Relancer services après reboot/pause. |
| 2026-06-26 | version | v0.9.0-rc | main | L10 COMPLET (L10a+L10b) — gate Legolas PASS + recette terrain OK. Runner en TUI NATIVE dans le PTY (réflexes Shift+Tab/esc) + vues (chat=paroles, gestes, délégations) dérivées du transcript JSONL de session écrit live. Délégation = tool Agent (pas Task). 234 front + 202 Rust. |
| 2026-06-26 14:01 | pause | - | main | Pause avant reboot terminal (droits modif apps). REPRISE = lancer le SPIKE P0 de L10 puis P1+. Lots livrés jusqu'à L9 (v0.8.0-rc) + fix trace. Vision PROJET.md §0 = terminal-source/chat-vue. |
| 2026-06-26 10:38 | version | v0.8.0-rc | main | L9 demo enrichie — gate Legolas PASS. iaka-demo dans Working, conversation préchargée cohérente, vignettes thémées par team. |
| 2026-06-26 09:32 | version | v0.7.0-rc | main | L8 conversation projet — gate Legolas PASS. 1 conv/projet, toggle Chat<->Shell, chat persona-aware via Ollama, roster 5 agents @agent, terminal login shell réel. |
| 2026-06-26 08:25 | version | v0.6.0-rc | main | L7 seed demo dev — gate Legolas PASS. Build dev/test peuplé (iaka-demo, team 5 onglets, config Ollama/CouchDB/n8n), zéro seed en prod. |
| 2026-06-26 00:01 | version | v0.5.0-rc | main | L6 canal adresse externe sortant via n8n — gate Legolas PASS. Cockpit POST un webhook n8n (Discord/Slack/MQTT). |
| 2026-06-25 22:47 | version | v0.4.0-rc | main | L4 mains courantes 3-canaux (iakaboxlogs, lecture seule) — gate Legolas PASS. Socle v0.1 (L0..L4) complet. |
| 2026-06-25 21:43 | version | v0.3.0-rc | main | L3 moteur prochaine étape via endpoint OpenAI-compat — gate Legolas PASS, testé réel Ollama + LiteLLM->Ollama Docker. |
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
