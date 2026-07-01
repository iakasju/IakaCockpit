# État des lieux — 2026-07-01

## En une phrase
**v0.15.0 scellée et poussée** (`main` = `cdb9204`, tag `v0.15.0`, `origin/main` sync) : refonte
Portefeuille/Atelier (L21) + finition Loki + résolution du bug Économie (treemap vide) + recette
terrain GUI validée. Rien en cours côté dev ; **prochaine étape = L16 pilotage vocal** (cadré, non
démarré). Seul mouvement de la session courante : correctifs de santé `/doctor` (config, hors dépôt
pour l'essentiel) — voir « En cours ».

## Fait récemment
- **v0.15.0 scellée** (`cdb9204`, tag `v0.15.0`) — L21 refonte Portefeuille/Atelier conforme au mock
  (cartes « Posés sur la table » riches, vignettes superposées, anneau coût %, lignes « Rangés dans
  l'atelier », scoping table AR-4, visu « Travail récent » portefeuille-réel) + finition Loki (treemap
  mosaïque/pilule/légende, ombre hairline dark, KPI `.kd`) + **résolution du bug Économie** : `economy.rs::project_of`
  coupe désormais sur `/` **et** `\` (clés Windows `C:\…` nettoyées, décision « tout garder ») et
  `portfolio_economy()` ne tronque plus au top-8 **avant** le scope table → les petits projets (iaka-demo)
  ne sont plus jetés. Gate Legolas PASS (232 Rust + 401 front, `quality.sh` OK), recette terrain GUI OK.
  Doc qualité `docs/qualite/v0.15.0.md`.
- **v0.14.0** (`00b7004`, tag) — clôture du Gantt prévisionnel (L19 #9b + L20 conformité mock + L20 live).

## En cours
- **Aucun développement en cours.** Session courante = maintenance de santé **`/doctor`** :
  - ✅ Retiré de `.claude/settings.local.json` la règle deny inexprimable `Bash(:(){ :|:& };:)`
    (parenthèses imbriquées non encodables → règle ignorée par le parseur). **Modif non commitée** dans
    l'arbre (`M .claude/settings.local.json`).
  - ✅ Déconnecté les connecteurs MCP claude.ai inutilisés (Gmail / Google Drive / Google Calendar) — via
    `/mcp`, côté compte, **hors dépôt**.
  - ✅ Réparé le plugin `rust-analyzer-lsp` (marketplace « cache-miss ») : `~/.claude/plugins/known_marketplaces.json`
    pointait encore un chemin **Windows** `C:\Users\sjupi\…` → repointé sur le chemin macOS réel. **Hors dépôt.**
  - `/doctor` **retourne une liste vide** après correctifs (confirmé par Stéphane).

## Jalons (gates)
| Jalon | Statut |
|---|---|
| Instructions cadrées | oui (L0→L21 dans `specs/instructions/` ; L16 cadré, non démarré) |
| Tests verts | oui (401 front + 232 Rust au seal v0.15.0 ; `quality.sh` OK) |
| Recette stage | PASS (Legolas, v0.15.0) |
| Recette terrain GUI | PASS (Portefeuille/Atelier + économie non vide, validé Stéphane) |
| Seal v0.15.0 | **oui** (tag posé, poussé sur `origin/main`) |
| Feu vert prod | n/a (app desktop, pas de bascule stage→prod à ce jour) |

## Prochaine étape
1. **(Optionnel, propreté)** Commiter la modif `.claude/settings.local.json` (`chore(config): retirer la
   règle deny fork-bomb inexprimable signalée par /doctor`) — sinon elle reste dans l'arbre. Petit,
   sans risque ; à faire quand Stéphane veut.
2. **Démarrer L16 — pilotage vocal d'iakacockpit** (`specs/instructions/L16-pilotage-vocal-iakacockpit.md`) :
   P1 = barre de commande IHM / navigation (STT local Rust whisper.cpp, push-to-talk, dispatcher règles
   pur, façade `voiceListen()`, `useVoiceCommand`, UI micro). P2/P3 différés. Cadré, arbitrages tranchés.

## Points d'attention
- **Config `~/.claude` migrée depuis Windows** : origine des deux soucis `/doctor` (plugin + chemins en
  dur `C:\Users\sjupi\…`). Vérifié : plus aucun chemin Windows dans `~/.claude/plugins/`. Réflexe à garder
  si d'autres bizarreries de config surgissent — c'est la première piste. **Hors dépôt** (poste, pas projet).
- **Modif non commitée** : `.claude/settings.local.json` (fix `/doctor`) en attente de commit — voir Prochaine étape.
- **Branche `fix/portefeuille-recette-terrain`** : fusionnée en fast-forward dans `main` (branche à `ff20df3`,
  `main` a 3 commits de plus). Elle est **obsolète** et peut être supprimée (`git branch -d`) quand Stéphane veut.
- **État démo gardé sur le seed one-shot** : `useDemoSeed` n'ajoute `iaka-demo` à la table / n'active les widgets
  démo que si `seedDemo()` renvoie `seeded:true` (faux sur env déjà seedé). D'où « table vide » au relancement.
  À traiter si on veut un état démo dev fiable (découpler du seed, garder l'invariant prod). Hors L16.
- **Live = polling, pas `_changes`** : remplissage live sur polling 12 s (L20 B) ; souscription temps réel
  CouchDB `_changes` différée. Latence ≤ 12 s assumée.
- **Honnêteté de la baseline (verrou L19)** : ne jamais inventer d'estimation ; la dégradation vers
  « réalisé seul » doit rester visible et testée. Décision gravée, à ne pas contourner.
- **Hooks globaux L18** (`~/.claude`, hors dépôt) : rester scopés par cwd/session et fail-open bornés
  (~1,5 s) pour ne jamais bloquer une session non-cockpit. À re-vérifier après toute évolution du hook.
- **Pièges environnement (après reboot/pause)** : relancer `ollama serve` (11434, llama3.1:8b) + stack Docker
  (`cd docker && docker compose up -d` : ollama/litellm/couchdb/n8n) ; re-seeder CouchDB si besoin
  (`bash docker/init-couchdb.sh`, admin/iaka-test). App : `npm run tauri dev` (port 3020 ; tuer un Vite
  résiduel avant). NaonEdge = thème par défaut, **pas** la cible d'identité.

## Journal de reprise
| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-01 | reprise | v0.15.0 | main | Reprise après seal v0.15.0. Aucun dev en cours. Session = maintenance santé `/doctor` : (1) retiré de `.claude/settings.local.json` la règle deny fork-bomb inexprimable `Bash(:(){ :\|:& };:)` (parenthèses imbriquées, règle ignorée) — **modif non commitée dans l'arbre** ; (2) déconnecté les MCP claude.ai inutilisés (Gmail/Drive/Calendar) via `/mcp`, hors dépôt ; (3) réparé le plugin `rust-analyzer-lsp` « cache-miss » — `~/.claude/plugins/known_marketplaces.json` pointait un chemin Windows `C:\Users\sjupi\…`, repointé sur le chemin macOS réel, hors dépôt. `/doctor` liste vide confirmée. Fil rouge : config `~/.claude` migrée de Windows (chemins en dur). PROCHAINE ÉTAPE = commiter le fix settings (optionnel) puis démarrer L16 pilotage vocal (cadré, non démarré). |
| 2026-06-30 | version | v0.15.0 | main | SEAL v0.15.0. Branche `fix/portefeuille-recette-terrain` (10 commits) fusionnée en fast-forward dans `main`. Résolution du BUG ÉCONOMIE (treemap vide) : `economy.rs::project_of` coupe sur `/` ET `\` (clés Windows `C:\…` nettoyées, décision Stéphane « tout garder ») + `portfolio_economy()` ne tronque plus à top-8 avant le scope front (`scan_projects_dir(usize::MAX)`) → les petits projets de la table (iaka-demo) ne sont plus jetés. Ajustements recette terrain (front) : Travail récent revenu aux polices std + interligne resserré (rowH 26, anti-collision OK) + 5 visibles/scroll ; corps treemap Économie borné 390px + scrollbar (donnée non tronquée). Gate Legolas PASS (232 Rust + 401 front, fmt/clippy/lint/typecheck OK) ; recette terrain GUI validée (tauri dev recompilé). Doc qualité `docs/qualite/v0.15.0.md`. PROCHAINE ÉTAPE = L16 pilotage vocal. |
| 2026-06-30 | pause | v0.14.0 (+ branche non scellée) | fix/portefeuille-recette-terrain | PAUSE sur BUG ÉCONOMIE OUVERT. La branche (6 commits sur main=f6713df, tout gate Legolas PASS) porte L21 (refonte Portefeuille/Atelier conforme mock : cartes riches + vignettes superposées + anneau %, lignes Atelier, scoping table, visu « Travail récent » réelle portefeuille-entier) + patch Gantt (--font-mono + chip) + finition Loki (treemap mosaïque/pilule/légende, ombre dark, KPI .kd) + retours terrain (travail récent pleine largeur police×2 cap-5+scroll, rail Économie aligné, EconomyShare retiré=redondant). BUG : treemap Économie vide = top-8 tronqué AVANT scope table (iaka-demo petit hors top-8) + project_of ne coupe pas sur `\` (clés Windows `C:\…` polluent). REPRISE = trancher (a/b/c) reco a → fix economy.rs (normaliser séparateurs + ne pas tronquer avant scope + filtrer portefeuille) → gate → restart app → recette → merge branche→main → seal v0.15.0. Relancer services (ollama/Docker) + `npm run tauri dev` (3020) après reboot. |
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
