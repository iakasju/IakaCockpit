# État des lieux — 2026-07-12

## En une phrase
**`v0.25.0` scellée** : **révision recette des Swimlanes** (L29) — **R1** labels d'agents **fixes**
(colonne gelée au scroll horizontal), **R2** repères d'heure **toujours lisibles** (gridlines + `HH:MM`,
densité adaptée), **R3** **zoom +/−** sur l'axe temps (bornes `[0.25…4]`). Gate PASS, 605 front, Rust
intact. *(Précédent poussé : `v0.24.0` L29 swimlanes.)* **Prochaine étape au choix** : recette
(labels fixes + zoom), passe a11y, flèches multi-niveaux, L22-P3 enforcement, ou nouveaux besoins.

## (archive) En une phrase v0.24.0
**`v0.24.0` scellée** : **L29 — Swimlanes d'agents** (rendu HORIZONTAL des délégations, variante B ;
gate PASS, 600 front, Rust intact). `AgentSwimlanes` (SVG) = **couloir par agent** + axe temps +
barres (🟠 running / 🟢 done) + **flèches de délégation** ; **toggle « Arbre / Couloirs »** en Travail
(L28 vertical ↔ L29 horizontal, défaut Couloirs). Retrouvé avec Stéphane dans le mock d'hypothèses
(variantes A mini-map / **B swimlanes** / C subway). *(Précédent poussé : `v0.23.0` L28 arbre vertical.)*
**Prochaine étape au choix** : recette réelle (toggle Arbre/Couloirs), flèches multi-niveaux, L22-P3
enforcement, ou nouveaux besoins.

## (archive) En une phrase v0.23.0
**`v0.23.0` scellée** : **L28 — arbre des délégations** (chantier IHM B ; gate PASS, 589 front, Rust
intact). Un `DelegationTree` (coordinateur → délégués, coloré 🟠 running / 🟢 done) **remplace le
Gantt** en Travail (Gantt débranché-gardé) + le même arbre du projet au **Journal** (dérivé du feed,
statut `done` best-effort honnête, zéro fausse donnée). **Les deux chantiers IHM (L27 filtres canaux +
L28 arbre délégations) sont bouclés.** *(Précédents poussés : `v0.22.0` L27 filtres canaux chat.)*
**Prochaine étape au choix** : recette réelle L28/L25/L24 (`tauri dev`), L22-P3 enforcement runner, ou
nouveaux besoins.

## (archive) En une phrase v0.22.0
**`v0.22.0` scellée** : **L27 — filtres de canaux au-dessus du chat** (chantier IHM A ; gate PASS,
575 front, Rust intact). Barre de chips **Parole/Geste/Délégation/Activité/Pensée** qui masque/affiche
chaque canal du transcript (généralise le toggle `pensée` persisté ; messages user toujours visibles).
Reste le chantier IHM **B = arbre des délégations** (remplace le Gantt, Travail + Journal) → lot **L28**.
*(Précédent, tous poussés : `v0.21.0` switch plein écran collé à droite.)* **Prochaine étape** : cadrer +
implémenter **L28 arbre des délégations**, ou recette réelle L25/L24.

## (archive) En une phrase v0.21.0
**`v0.21.0` scellée** : itération recette du **contrôle plein écran** de la Table — les 2 feux
macOS (v0.20.0, pas assez explicites) deviennent un **switch coulissant collé à droite** (icône
`⤢` sur la pastille, `role="switch"`, toggle symétrique). Fix structurel (switch sorti du conteneur
`overflow-x:auto`), **vérifié en CDP réel** (`gapRight=0`, collé à droite). Gate PASS, 571 front,
Rust intact. *(Précédents poussés sur Forgejo : `v0.17.0` L16 Portefeuille + fix vignettes ;
`v0.18.0` L24 onglets ; `v0.19.0` L25 session vivante ; `v0.20.0` L26 mode focus plein écran.)*
**Prochaine étape au choix** : recette réelle (L25 session live, L24 multi-projets), L16 vocal,
L22-P3 enforcement, ou chantiers IHM (filtres chat, arbre des délégations).

## Différés / ouverts à la reprise
- **L16 STT** : whisper rend `'...'`/`'[Musique]'` (audio capté non reconnu) ; mesure peak/rms posée,
  à lire au prochain essai (bundle `.app` requis pour le micro — TCC tue le binaire nu de `tauri dev`).
- **L22-P3** (enforcement runner : `--allowedTools`/`--append-system-prompt` + garde délégations L5) ·
  **P2b** hooks/limites en listbox · **AR-2/4/5/6**.
- **Chantiers IHM en file** (décidés avant le Cadre) : filtres de canaux du chat · arbre des délégations
  (Travail + Journal, remplace le Gantt).
- **Env** : cmake via `pip3 --user` (PATH `~/.zshrc`) requis pour builder whisper.cpp. Ollama hôte up
  (`localhost:11434`, llama3.1:8b). Relancer services + `npm run tauri dev` (3020) après reboot.

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
| Instructions cadrées | oui (L0→L26 dans `specs/instructions/` ; L16/L24/L25/L26 LIVRÉS) |
| Tests verts | oui (571 front + 279 Rust au seal v0.20.0 ; typecheck/lint/fmt/clippy OK) |
| Recette stage | PASS (Legolas, gate L26) |
| Recette terrain GUI | partielle (recette réelle L25 session live + L26 feux/fullscreen à faire à l'écran) |
| Seal v0.17.0 → v0.20.0 | **oui** (tags posés, **poussés** sur `origin/main`) |
| Seal v0.21.0 | **oui** (tag posé ; push origin/main en cours) |
| Feu vert prod | n/a (app desktop, pas de bascule stage→prod à ce jour) |

## Prochaine étape
1. **Push** de `v0.20.0` (commit de seal + tag `v0.20.0`) sur `origin/main` — **en attente du feu vert
   de Stéphane**. `v0.17.0`/`v0.18.0`/`v0.19.0` déjà poussées.
2. **Recette réelle à l'écran** (`npm run tauri dev`) : **L26** feux jaune/vert (vert = masque colonnes
   gauche + fullscreen, garde widgets droite + onglets + toggle ; jaune = rétablit colonnes) ; **L25**
   ouvrir IakaCockpit → voir la conversation en cours (lecture seule) ; **L24** plusieurs projets liés →
   onglets + fenêtres vivantes.
3. **Autres au choix** : L16 vocal, L22-P3 enforcement, chantiers IHM (filtres chat, arbre des délégations).

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
| 2026-07-13 | version | v0.25.0 | main | SEAL v0.25.0. **Révision recette des Swimlanes** (L29), front seul, gate Legolas PASS (605 front, aucun `src-tauri/` touché). Retour terrain Stéphane sur `AgentSwimlanes` : **R1** labels d'agents FIXES — le composant est scindé en `.swimbody` (flex) = colonne `.swimlabels` (avatar+nom, **hors** du conteneur `overflow-x`, gelée au scroll horizontal) + scène scrollable `.swimscene` (axe/gridlines/barres/flèches) ; alignement Y par géométrie partagée (`laneY`, `H`). **R2** repères d'heure TOUJOURS lisibles — gridlines verticales `.swimgrid` + labels `HH:MM` `.swimax` par tick, densité dérivée du pixel réel (paliers ronds `STEPS_MS`) qui se resserre au zoom → aucune portion visible sans repère. **R3** ZOOM axe temps — boutons `+`/`−` (`useState(zoom)`, bornes `[0.25…4]` pas ×1.5, `disabled` aux bornes), `pxPerMin=9*zoom` recalcule largeur/barres/flèches/ticks (`data-px-min` exposé). Présentationnel pur D8, zéro fausse donnée conservé, i18n parité (`swimlanes.zoomIn/zoomOut/zoomLevel`). Point a11y non bloquant : colonne labels `aria-hidden` (noms visibles mais non annoncés par lecteur d'écran ; info aussi dans les `<title>` des barres). Commit `946c1af`. Doc qualité `docs/qualite/v0.25.0.md`. Différés : passe a11y, imbrication multi-niveaux, prévisionnel/baseline, swimlanes au Journal. |
| 2026-07-13 | version | v0.24.0 | main | SEAL v0.24.0. **L29 — Swimlanes d'agents** (arbre de délégation HORIZONTAL, variante B), front seul, gate Legolas PASS (600 front, aucun `src-tauri/` touché). Nait d'une recherche « arbre horizontal compact » → retrouvé dans le mock d'hypothèses `A/concepts/hypotheses/arbre.html` (A mini-map / **B swimlanes** / C subway) ; choix Stéphane = B. **F1** `useAgentTasks` gagne `AgentTask.doneTs?` (ts de clôture au `running→done`, non destructif). **F2** `AgentSwimlanes.tsx` (présentationnel pur, SVG, calque `ActivityTimeline`) : un couloir par agent (coordinateur + délégués dédup), axe temps X (min→max ts), barre par tâche `ts`→`doneTs` (ou ouverte jusqu'à `now` si running ; ambre/vert), flèches de délégation coordinateur→délégué (MVP 1 niveau), ascenseur horizontal, placeholder vide. **Zéro fausse donnée** : pas de barre/flèche sans `ts`, aucune fin inventée. **F3** Travail : toggle segmenté « Arbre / Couloirs » (défaut **Couloirs**) commutant `DelegationTree` (L28) ↔ `AgentSwimlanes`, mêmes `coordinator`+`tasks`+`resolveAvatar` ; `DelegationTree`+`GanttPanel` conservés (débranché-gardé). i18n parité fr/en. Commit `135c688`. Doc qualité `docs/qualite/v0.24.0.md`. Loki a aussi produit un mock horizontal `A/concepts/arbre-horizontal.html`. Différés : flèches multi-niveaux (parent réel), prévisionnel/baseline (Gantt L20), swimlanes au Journal. |
| 2026-07-13 | version | v0.23.0 | main | SEAL v0.23.0. **L28 — arbre des délégations** (chantier IHM B), front seul, gate Legolas PASS (589 front, aucun `src-tauri/` touché). `DelegationTree` (présentationnel pur) : racine coordinateur → 1 nœud/tâche (agents délégués), coloré `running` (ambre, pastille pulsée) / `done` (vert + ✓), avatars, compteur, MVP 1 niveau. **Remplace le Gantt** en Travail (bandeau `.treeband`, bouton convhead « Arbre », `showTree`), alimenté par `tasks` (useAgentTasks conv active) + `activeRunner.coordinator`. **Gantt débranché-gardé** : `GanttPanel`/`derivePlanTimeline`/`timeline` conservés+référencés derrière `GANTT_ENABLED=false` (réactivable). **Journal** : même arbre du projet filtré via `deriveDelegationsFromFeed` (helper pur, canal geste) ; statut `done` posé **uniquement sur signal `meta` explicite**, sinon `running` (**zéro fausse donnée**) ; ancienne `sdlist` débranchée-gardée. i18n parité fr/en (9 clés `delegTree.*`). Commit `431a538`. Doc qualité `docs/qualite/v0.23.0.md`. **Les 2 chantiers IHM (L27 + L28) bouclés.** Différés : appariement délégation↔rapport (done fin Journal), imbrication multi-niveaux. |
| 2026-07-13 | version | v0.22.0 | main | SEAL v0.22.0. **L27 — filtres de canaux au-dessus du chat** (chantier IHM A), front seul, gate Legolas PASS (575 front, aucun `src-tauri/` touché). Barre `.chanfilter` dans `Chat.tsx` : un chip par canal PRÉSENT (Parole/Geste/Délégation/Activité/Pensée, ordre stable, barre si >1 canal), toggle de visibilité (`aria-pressed`). Généralise le toggle `pensée` existant : Pensée reste **persistée** (`hidePensee`/`onToggleHidePensee`), 4 autres canaux = état local MVP. `visibleHistory = history.filter(...)` masque par `(kind ?? "parole")` ; **`role:"user"` jamais masqué** ; `firstOfRun`/auto-scroll/rendu sur l'historique filtré. L25 (readOnly) intact. i18n parité fr/en (6 clés). Commit `b382c89`. Doc qualité `docs/qualite/v0.22.0.md`. Reste chantier IHM B = **L28 arbre des délégations** (remplace le Gantt, Travail + Journal). |
| 2026-07-13 | version | v0.21.0 | main | SEAL v0.21.0. **Itération recette du contrôle plein écran** (L26), front seul, gate Legolas PASS (571 front, aucun `src-tauri/` touché). Les 2 feux macOS (v0.20.0, pas assez explicites — retour terrain) → **switch coulissant** (`role="switch"`, `aria-checked`) avec l'icône `⤢` **sur la pastille** (`.fsswitch-knob`, sans libellé), **collé au bord droit**, toggle **symétrique** (activer = focus + fullscreen ; désactiver = normal + sortie fullscreen — AR-1 supersédé). **Fix structurel décisif** : le switch était dans `.projtabs` en `overflow-x:auto` où `margin-left:auto` ne le poussait PAS au bout (mesuré `gapRight=950` à gauche) → restructuration `.projtabs` (non scrollable) = `.projtabs-list` (onglets, `overflow-x:auto`, `flex:1`) + `.fsswitch` (frère, `flex:0 0 auto`) → **collé à droite vérifié en CDP réel** (`gapRight=0`, `swRight=1440`=bord viewport, + capture). Façade unique (`backend.setFullscreen`, aucune nouvelle commande). Commits `3a4f408`/`35465ac`/`0f99442`/`f512f8c`/`4270a34`. Doc qualité `docs/qualite/v0.21.0.md`. Méthode : vérification terrain par pilotage Chrome CDP (mesure rects + screenshot), plus fiable que la lecture CSS. |
| 2026-07-13 | version | v0.20.0 | main | SEAL v0.20.0. **L26 — mode focus plein écran de la Table** (feux macOS jaune/vert), cadré+coordonné par 🟠 Aragorn, 2 commits, gate Legolas PASS (571 front + 279 Rust, fmt/clippy OK). Dans `ProjectTabs`, à droite des onglets, 2 pastilles style feux macOS : **vert** (`enterWorkFocus`) = `workFocus=true` + `backend.setFullscreen(true)` → masque `.rail` (classe `app-shell--focus`) + `.worklist` (classe `wk--focus`), `.workpane` `flex:1` s'agrandit, **garde** `.wkright` (widgets droite) + `ProjectTabs` + `.convhead` (toggle Shell/Conversation) ; **jaune** (`exitWorkFocus`) = `workFocus=false` **seulement** (rétablit les colonnes, **ne touche pas** au fullscreen — AR-1, sortie via feu natif macOS). **Façade unique** : commande Rust `set_fullscreen(window,on)` (`terminal.rs`, enregistrée `lib.rs`), miroir `backend.ts`, aucun plugin window JS. Barre d'onglets rendue **même à 0 onglet**. Présentationnel D8 (appel façade dans callbacks App). Non-régression L24/L25 (props focus requises sur ProjectTabs, optionnelles sur WorkingView). Doc qualité `docs/qualite/v0.20.0.md`. Différés : icône hover, bouton rouge, raccourci clavier, persistance ; recette visuelle manuelle. |
| 2026-07-12 | version | v0.19.0 | main | SEAL v0.19.0. **L25 — s'attacher à la session vivante** d'un projet (vue live lecture seule), cadré+coordonné par 🟠 Aragorn, branche `feat/L25-attacher-session-vivante` fusionnée **ff** dans main, gate Legolas PASS (563 front + 279 Rust, fmt/clippy OK). Ouvrir un projet **tail le transcript le plus récent** du cwd (`latest_transcript(cwd)` Rust, helper `transcript_dir` partagé avec `transcript_path`, échappement `escape_cwd` réutilisé, anti-traversal, cross-OS) et affiche la conversation **en direct SANS PTY**. Modèle : `Conversation.source` **owned** (runner actuel) vs **attached** (tail sans PTY). À l'ouverture : `latestTranscript` Some → attached ; None/hors-Tauri → owned. **Lecture seule STRICTE** (AR-2 : `handleSend` no-op si attached, Chat readOnly → jamais de `pty.write` vers la session externe). **Garde L10** : attached ne monte AUCUN PtyTerminal ; multi-mount owned (L24) non régressé ; `useRunnerViews` tail l'attaché sans `ptySessions`. UI : badge « session vivante · lecture seule », bannière Shell, bouton « démarrer un runner » (`convertToOwned` → spawn). « × » attaché = `transcriptTailStop` (pas de `pty.close`). Façade unique (1 commande), i18n parité (7 clés). Doc qualité `docs/qualite/v0.19.0.md`. Différés : reprise typable `--resume` (P2), sélecteur multi-sessions (écarté), seuil de fraîcheur, **recette réelle manuelle** (ouvrir un projet → voir la session live). |
| 2026-07-12 | version | v0.18.0 | main | SEAL v0.18.0. Jalon **vue Travail — fenêtres toujours ouvertes + onglets par projet** (**L24**), cadré+coordonné par 🟠 Aragorn, 3 commits, gates Legolas PASS (550 front, Rust non touché). **L24** : F1 ouverture **eager** (dès la pose sur la Table, projets liés ; helper pur `reconcileEagerOpen` + effet App convergence anti-boucle, anti-empilement popups AR-3) ; F2 **barre d'onglets par projet** (`ProjectTabs` : un onglet/conversation, actif mis en évidence, « × » = retrait via L23-inc), **worklist gauche conservée** (AR-1, synchronisée) ; F3 toggle Shell/Conversation par onglet, **garde L10 intacte** (PtyTerminal jamais démonté au switch/toggle). + **fix en-tête** conversation (recette) : coordinateur affiché **seulement s'il diffère** de l'interlocuteur (fin du double « Aragorn » empilé) + en-tête sur **une seule ligne** (chip runner tronqué, toggle/esc jamais clipés, `convtitle` `flex-wrap:nowrap`). Front seul, Rust non touché. Doc qualité `docs/qualite/v0.18.0.md`. Cadré et prêt pour la suite : **L25** (s'attacher à la session vivante). Différés : DnD onglets, garde perf N runners, bouton + dans la barre. |
| 2026-07-12 | version | v0.17.0 | main | SEAL v0.17.0. Jalon **IHM Portefeuille + retours terrain**, cadré+coordonné par 🟠 Aragorn, 11 commits, **2 gates Legolas PASS** (538 front + 274 Rust, couverture ~75 %). **L16** (page Étagère) : **F1** toggle Liste/Tuiles de l'Atelier (défaut Liste, table en tuiles) ; **F2** double-clic widget Économie (treemap) → bascule Travail + projet au premier plan (sans mutation workset, scoping AR-4 conservé) ; **F3** tuile enrichie — description **gras** (source `specs/PROJET.md` prioritaire, AR-6=B), ligne `next :` (1er `- [ ]` du backlog), méta version/retard/étapes (étend `portfolio.rs` : `read_description`/`read_backlog` + 3 champs `Project`) ; **F4** pastille d'urgence dérivée de `backlog_remaining` (🔴≥5/🟠1-4/🟢0/gris, AR-7, `read_backlog` renvoie `Some(0)` si tout coché) ; **F4-bis** pastille **partagée identique** liste↔tuile (helper `urgency.ts`). Scellés avec : **L23-inc** (retrait Table ferme PTY+conversation via `closeConversation`+`pty.close`, job reprise conservé, garde L10 intacte) ; **page Cadre débranchée** du rail (code conservé) ; **affichage statut reprise débranché** (job conservé) ; règle Cadre **`obligation oblig-def-projet`** (obligation coordinateur : maintenir la def projet dans `PROJET.md`, aussi mémoire + contrats aragorn/odin) ; **fix vignettes** « Aragorn=Gandalf » — team par défaut legacy (`Aragorn.roleIndex=2`) réalignée au chargement (`reconcileDefaultTeamCasting`, bornée `DEFAULT_TEAM_ID`, non destructif, idempotent) + garde anti-récidive TeamsEditor. Doc qualité `docs/qualite/v0.17.0.md`. Rust confiné à `portfolio.rs`. Différés : persistance toggle, a11y clavier treemap, confirmation retrait, enforcement runner de l'obligation (L22-P3), L16 vocal. |
| 2026-07-07 | version | v0.16.0 | main | SEAL v0.16.0. **L22 « Le Cadre » LIVRÉ P1+P2+P2b**, recette terrain réelle OK. P1 : modèle pur (`src/frame/model.ts`, 4 niveaux) + persistance `frame.json`/team (`frame.rs`, AR-1) + hook `useFrame` + **vue Cadre refondue design Loki** (une page haut→bas, chaîne Règles→Skills→Templates→Agents, décomposition visible, définitions/exemples/légende) + seed démo ; persistance+ergonomie recettées. P2 « définir en conversant » : **prompt LLM par étage** (`ai.rs frame_author`, calque L3/L8, mock/dégradation) rédige paragraphe de skill (versionné) / brief d'agent + dictée `useVoiceDictation` ; **recette réelle llama3.1** (brief persisté) + prompt système durci (fiche autonome 3e pers.). P2b : **export `agent.md`** (front génère md, `frame_export` écrit sous `.iakacockpit/frames/<team>/`) ; recette : 4 agent.md écrits, contenu propre (identité+brief+skills+règles effectives+délégations). Aussi : correctifs `/doctor` (permission fork-bomb, MCP claude.ai, plugin Windows→Mac) ; **L16 reciblé** dictée-chat (STT natif `voice.rs` cpal+whisper-rs livré, prouvé sur bundle .app ; **ouvert** : whisper n'entend pas la voix). 461 front + 247 Rust verts, lint/typecheck/clippy/build OK. Modèle Cadre + arbitrages : voir mémoires `ontologie-cadre-rules-templates-team`, `l22-p2-conversation-authoring`. Différés : L22-P3 enforcement, P2b hooks/limites, chantiers IHM (filtres chat, arbre délégations). |
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
