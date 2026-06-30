# État des lieux — 2026-06-30

## En une phrase
**v0.15.0 SCELLÉE 2026-06-30.** La branche `fix/portefeuille-recette-terrain` (10 commits)
est **fusionnée dans `main` en fast-forward** puis taguée `v0.15.0` : refonte
Portefeuille/Atelier (L21) + finition Loki + **résolution du bug Économie** (treemap vide :
`project_of` coupe sur `/` ET `\` + plus de troncature top-8 avant le scope ; décision
« tout garder ») + ajustements de recette terrain (Travail récent polices std/interligne
resserré, scrollbar Économie). **Gate Legolas PASS** (232 Rust + 401 front) **et recette
terrain GUI validée par Stéphane**. Doc qualité : `docs/qualite/v0.15.0.md`. Prochaine
étape = **L16 pilotage vocal** (cadré, non démarré).

## Fait récemment (depuis v0.14.0, sur la branche, non scellé)
- **v0.14.0 scellée+poussée** (`00b7004`, tag `v0.14.0`) — clôture du Gantt prévisionnel
  (L19 #9b cascade `54a6ea0` + L20 conformité mock `f14f941` + L20 live `3b1dd51`), recette
  terrain Stéphane OK, gate Legolas PASS.
- **L21 — refonte Portefeuille/Atelier conforme au mock** (`portefeuille.html`) : cartes riches
  « Posés sur la table » (chip statut, description=dernier commit, **vignettes superposées**,
  anneau coût %), section « Rangés dans l'atelier » en lignes + bouton poser, scoping anneau/treemap
  à la table (AR-4), + visu **« Travail récent »** (scatter-timeline d'activité, façade Rust
  `portfolio_activity()`). **AR-5 révisé** : l'activité reflète le **portefeuille réel entier**
  (hors démo). Commits `86544eb`/`856d6cb` (sur main jusqu'à f6713df).
- **Patch Gantt fondu** (`ee4abc6`) : token `--font-mono` (16 usages cassés → monospace) + pilule du
  chip d'en-tête. **Finition Loki** (`f6713df`) : treemap mosaïque + segments pilule + légende,
  anti-collision bulles, ombre hairline lisible en dark, 3ᵉ ligne KPI.
- **Retours de recette terrain** (branche) : activité recâblée portefeuille-réel (`708256a`),
  « Travail récent » **pleine largeur** + rail Économie à droite (`5762fb5`), coût « coordinateur vs
  délégués » ajouté puis **retiré** (redondant avec les segments du treemap, décision « b », `62b284f`),
  rail Économie aligné sur « Posés sur la table » (`a150835`), activité **police ×2 + 5 lignes
  visibles + scroll** (`3167192`). Chaque lot **gate Legolas PASS** (dernier : 401 front + 231 Rust).

## En cours — BUG ÉCONOMIE OUVERT (cause de la pause)
Le treemap Économie (scopé table, AR-4) reste **vide** même en posant un projet sur la table.
**Cause trouvée empiriquement** (rejeu du fold sur `~/.claude/projects`, 59 projets) :
1. **Troncature top-8 AVANT le scope table** : `economy.rs::scan_projects_dir(dir, 8)` ne renvoie
   que les 8 plus gros projets ; les vrais projets de la table (ex. `iaka-demo`, petit) **ne sont
   pas dans le top-8** → absents de `portfolioEco` → le filtre `worksetIds` ne trouve rien → vide.
2. **Clés polluées par d'anciennes sessions Windows** : `project_of(cwd)` coupe sur `/` seulement ;
   les vieux transcripts ont des cwd `C:\iakaVODdash` (sans `/`) → la clé devient le chemin entier
   `C:\…`, qui n'matche aucun id Mac et **écrase le classement** (squatte le top-8).
L'activité (non filtrée, top-12) « marche » mais affiche ces `C:\…` ; l'économie (filtrée table) est vide.

## Décision en attente (Stéphane) — bloque le fix
Pour les vieilles sessions Windows (`C:\iakaVODdash`, `C:\robotimmo`…), vraie donnée passée mais
hors arbo Mac : **(a)** ne montrer que les projets du **portefeuille actuel** *(reco)* / **(b)** tout
garder / **(c)** filtrer par fenêtre de temps. Reco = **(a)** + le fix technique (ci-dessous).

## Jalons (gates)
| Jalon | Statut |
|---|---|
| Instructions cadrées | oui (L18→L21 dans `specs/instructions/`, arbitrages tranchés ; L21 AR-5 révisé) |
| Tests verts | oui (401 front + 231 Rust au dernier gate ; quality.sh OK) |
| Recette stage | PASS sur tous les lots de la branche (Legolas) |
| Recette terrain GUI | **partielle** — Portefeuille recettée sauf le **bug économie** non résolu |
| Seal v0.15.0 | **NON** (bloqué par le bug économie + merge branche→main) |

## Prochaine étape (à la reprise)
1. **Trancher (a)/(b)/(c)** avec Stéphane (reco a).
2. **Fix `economy.rs`** (Rust, donc redémarrage app nécessaire) : (i) **normaliser `project_of`**
   pour couper sur `/` ET `\` ; (ii) **ne pas tronquer avant le scope** (renvoyer tous les projets,
   le front scope à la table puis le treemap prend le top de CE sous-ensemble) ; (iii) selon (a),
   **filtrer aux projets du portefeuille scanné**. Idem pour l'activité si on veut purger les `C:\…`.
3. **Gate Legolas** → **redémarrer `tauri dev`** (Rust) → **recette terrain** Stéphane (économie
   non vide + activité propre).
4. Si OK → **merge `fix/portefeuille-recette-terrain` → `main`** (fast-forward) → **seal v0.15.0**
   (« update iakaframe » : état des lieux + tag + commit global + push).
Ensuite seulement : L16 pilotage vocal (cadré, non démarré).

## Points d'attention
- **BUG ÉCONOMIE (ouvert)** : cf. § « En cours » — top-8 avant scope + `project_of` ne gère pas `\`.
  Le rejeu du fold est dans l'historique de session ; la correction est cadrée, pas codée.
- **État démo gardé sur le seed one-shot** : `useDemoSeed` (l.137,169) n'ajoute `iaka-demo` à la
  table et n'active les widgets démo que si `seedDemo()` renvoie `seeded:true` — **faux sur un env
  déjà seedé**. D'où « table vide » au relancement. À considérer si on veut un état démo dev fiable
  (découpler du seed one-shot, en gardant l'invariant prod). Hors périmètre du fix économie immédiat.
- **Branche non fusionnée** : tout le travail post-v0.14.0 est sur `fix/portefeuille-recette-terrain`
  (poussée à la pause). NE PAS sceller v0.15.0 ni merger avant la résolution du bug économie.
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
