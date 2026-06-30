# L21 — Étagère/Atelier : conformité au mock (cartes riches + lignes Atelier + scoping table) + visu « travail passé » — CADRAGE

> Cadrage (Gandalf, analyse lecture seule, 2026-06-30). Suite au constat terrain de Stéphane :
> la vue **Portefeuille/Étagère** de l'app **diverge fortement** du mock Loki (tuiles plates,
> pas d'avatars ni d'anneau de coût, pas de séparation « sur la table » / « rangés dans
> l'atelier », économie non scopée). Plus un **ajout hors mock** : porter la **visualisation du
> travail passé** du `naonedge-dashboard`. **Statut : cadré, arbitrages SCELLÉS (Stéphane,
> 2026-06-30), prêt pour Gimli.** Aucun code touché par ce cadrage.

## Sources (fichier:ligne)

**Mock cible**
- Structure : `specs/design/redesign/A/concepts/app/portefeuille.html:87-172`
  (`.foliolayout` → `.foliomain` [`.cards` 3 col → `.proj` : `.top`/`.desc`/`.foot`/`.avatars`/`.cost .ring`]
  + `.scan`/`.scanrow`/`.add` ; `.folioside` Économie treemap + sparkline).
- Grammaire visuelle inline : `portefeuille.html:27-55` (`.proj`, `.avatars`, `.cost .ring`,
  `.scan`, `.scanrow`, `.add`).

**App actuelle**
- Vue : `src/views/PortfolioView.tsx:46-136` — rend **TOUS** les `projects` dans une seule
  `.tilegrid` (aucune séparation table/atelier), `economy` (treemap) **non scopée**, KPI éco en
  placeholder (`PortfolioView.tsx:74-79`).
- Tuile : `src/components/Tile.tsx:30-66` — header = pastille git + `project.id` ; desc =
  `last_commit_subject ?? path` ; meta = `work_status`/`version`/`branch`/git ; pied = bouton
  `+/−` workset. **Aucun avatar, aucun anneau de coût.**
- Câblage : `src/App.tsx:346-364` (`PortfolioView` reçoit `projects`, `worksetIds`,
  `economy = portfolioEco | DEMO_PORTFOLIO_ECONOMY | []`).
- Workset (« sur la table ») : `src/hooks/useWorkset.ts:18-48` (`ids`, `toggle`, `add`, `has`).
  Intersection projets×workset déjà calculée dans `App.tsx:137-140` (`worksetProjects`).

**Données réutilisables**
- Coût cross-projet : `src/hooks/usePortfolioEconomy.ts:11-40` → `portfolioEconomy()`
  (`src/api/backend.ts:191-193`) → `ProjectEconomy[]` `{project,input,output,coord,sub}`
  (`backend.ts:177-185`). Agrégation Rust `src-tauri/src/economy.rs:81-133` : **totaux par projet,
  PAS de ventilation par jour/horodatage** ; scope = **tous** les transcripts (top 8).
- Vignettes par charte×team : `src/theme/teamAvatar.ts:32-45` (`makeAvatarResolver(charte,
  vignetteTeam, roster) → (agent)=>url|null`, fallback `null` = pastille). Team d'un projet :
  `src/hooks/useTeams.ts:398-407` (`teamForProject`) + `team.agents[]` (`useTeams.ts:59-86`).
- Statut git par projet (scan L1) : `Project` `src/api/backend.ts:43-55`
  (`branch`/`dirty`/`ahead`/`behind`/`last_commit_date`/`last_commit_subject`/`version`/`work_status`).
  Libellé git déjà factorisé : `Tile.tsx:17-23` (`gitLabel`).
- i18n présent : `src/i18n/locales/fr.ts:87-119` (`portfolio.worksetLabel/underHat/openInWorking`,
  `tile.addToWork/inWork/addToWorkAria`).

**Visu « travail passé » (à porter, hors mock)**
- `~/work/naonedge-dashboard/index.html:155-164` (bloc `.chartwrap` « Activité — qui, quand, quel
  projet ») + `index.html:303-360` (`renderChart`) : **SVG scatter-timeline**, 1 ligne = 1 projet,
  X = temps (jours ≤ 45 j, sinon mois), **chaque bulle = un jour d'activité, rayon ∝ tokens du
  jour** (`rad(v)` `index.html:318`), couleur = famille.
- Source de données : `~/work/naonedge-dashboard/scan.js:64-95` (`getTokenStats`) lit
  `~/.claude/projects/**/*.jsonl`, somme `input+output+cache_creation` (**hors cache_read**),
  **bucketé `byDay`** (`scan.js:88-89`) → `tokenActivity = [{date,tokens}]` (`scan.js:245`).

---

## Besoin

Mettre l'**Étagère** en conformité avec le mock Loki et ajouter une visu d'activité :

1. **Cartes riches « posées sur la table »** (`.proj`) : en-tête nom + chemin + **chip statut**
   (`● en cours` / `au repos`), **description**, pied = **vignettes superposées** (agents de la
   team du projet) **+ anneau de coût (% tokens)** + total tokens.
2. **Le % de l'anneau est calculé UNIQUEMENT sur les projets de la table** (pas tout le portefeuille).
3. **Section « Rangés dans l'atelier · N »** : projets non posés en **lignes compactes**
   (nom, chemin, tags, statut git) + bouton **« ↗ Poser sur la table »**.
4. **Le widget Économie (droite) ne porte que sur les projets de la table.**
5. **Ajout hors mock** : au-dessus des cartes de la table, la **visu « travail passé »** du
   naonedge-dashboard, branchée sur une **source de données réelle** du cockpit (ou dégradée
   honnêtement si absente).

**Principe directeur (zéro fausse donnée).** Chaque pixel affiché a une source réelle traçable
ci-dessous ; toute donnée sans source est soit **dégradée honnêtement** (placeholder neutre), soit
**différée** explicitement — jamais inventée. Réutilisation maximale (hooks/résolveur/façade
existants), MVP, pas de god-component, façade `backend.ts` = seul point d'`invoke` (D7).

---

## Décomposition en tranches

### Tranche A — Cartes riches de la table (avatars + anneau de coût)

Remplacer, **pour les seuls projets de la table** (`worksetProjects`), la `Tile` plate par une
carte conforme `.proj` : `.top` (icône + nom + chemin + chip statut), `.desc`, `.foot`
(`.avatars` superposées + `.cost` anneau % + total tokens).

Mapping donnée → source :

| Élément carte | Source réelle | Statut |
|---|---|---|
| nom | `project.id` (`backend.ts:44`) | ✅ direct |
| chemin | `project.path` (`backend.ts:45`) | ✅ direct |
| chip statut `● en cours` / `au repos` | **conversation vivante** = une conversation active existe pour ce projet → `● en cours`, sinon `au repos` (**AR-2 TRANCHÉ (Stéphane, 2026-06-30) = (a)**) | ✅ via `useConversations` |
| description | **sujet du dernier commit** = `last_commit_subject` (`Tile.tsx:40`) en MVP (**AR-1 TRANCHÉ (Stéphane, 2026-06-30) = (a)**) | ✅ direct |
| vignettes (avatars) | `teamForProject(id).agents` (`useTeams.ts:398`) + `makeAvatarResolver(settings.theme, team.vignetteTeam, roster)` (`teamAvatar.ts:32`) ; fallback pastille `[ROYAUME][Agent]` si `null` | ✅ réutilisable |
| total tokens | `portfolioEconomy()` `input+output` du projet (`usePortfolioEconomy.ts:24`) | ✅ direct (dégrade à « — » si projet absent des transcripts) |
| anneau % | `tokens(projet) / Σ tokens(projets de la table)` × 100 | ✅ calcul front (voir Tranche C) |

Notes :
- **Avatars par projet** : aujourd'hui `resolveAvatar` est construit pour la **team ACTIVE**
  seulement (`App.tsx:154-162`). La carte a besoin d'un résolveur **par team de projet**. Réutiliser
  `makeAvatarResolver` en le fabriquant par carte (ou un résolveur `(projectId, agent)` mémoïsé dans
  `App`). Pas de nouvelle donnée.
- **Limiter le nombre d'avatars** affichés (mock en montre 1–3) : MVP = afficher le roster de la
  team, plafonné (ex. 4 + « +N ») pour ne pas déborder ; à confirmer visuellement par Loki (hors
  cadrage donnée).
- **Token absent** = dégradation honnête : pas d'anneau (anneau neutre/gris) + « — tokens », jamais
  un faux pourcentage.
- **Note d'itération (DIFFÉRÉ, hors L21)** : pour les projets iakaframe, préférer plus tard la phrase
  « En une phrase » de `specs/etat-des-lieux.md` (calque `naonedge-dashboard/scan.js:43-61` `parseEtat`)
  comme description, en repli sur le sujet de commit. **Pas dans ce lot.**

**Tranche A = FRONT PUR** (aucune touche backend).

**Clôture A (vérifiable)**
- Chaque carte de la table montre nom, chemin, chip statut, description (= sujet du dernier commit ;
  « — » si pas de commit), ≥1 avatar **ou** pastille de repli, anneau + total tokens.
- **Chip statut** : `● en cours` ssi une conversation est active pour ce projet, `au repos` sinon
  (vérifiable en ouvrant/fermant la conversation d'un projet).
- Un projet sans transcript affiche « — » et un anneau neutre (aucun % inventé).
- Les vignettes suivent la **charte active** (`settings.theme`) et la **team du projet** (changer la
  team d'un projet change ses avatars).
- `npm run typecheck` + `npm run lint` + `npm run test` verts.

### Tranche B — Section « Rangés dans l'atelier · N » (lignes + bouton poser)

Sous les cartes, lister les projets **hors workset** (`projects` ∖ `worksetIds`) en `.scanrow`
compactes, titre « Rangés dans l'atelier · N » (N = nombre hors table).

Mapping donnée → source :

| Élément ligne | Source réelle | Statut |
|---|---|---|
| nom / chemin | `project.id` / `project.path` | ✅ direct |
| statut git `main · propre` / `N fichiers modifiés` | `project.branch` + `gitLabel` (`Tile.tsx:17-23`, `dirty`/`ahead`/`behind`) | ✅ réutilisable |
| tags `infra · docker` | **OMIS en MVP** — aucun champ `type`/`tags` sur `Project` (**AR-3 TRANCHÉ (Stéphane, 2026-06-30) = (a)**) | ⛔ hors lot |
| bouton « ↗ Poser sur la table » | `workset.add(id)` (`useWorkset.ts:33`) ; i18n `portfolio.openInWorking` / `tile.addToWork` | ✅ direct |

**Tranche B = FRONT PUR** (aucune touche backend). Tags volontairement omis (différé possible).

**Clôture B**
- Tous les projets non posés apparaissent en lignes ; le compteur N est exact.
- Chaque ligne montre nom, chemin, statut git réel ; **aucun tag affiché** (omis en MVP, pas de
  placeholder inventé).
- Le bouton « poser » déplace le projet de l'Atelier vers la table (la carte riche apparaît, la ligne
  disparaît) sans rechargement.
- Le statut git de chaque ligne reflète l'état réel du scan L1.

### Tranche C — Scoping % anneau & widget Économie aux projets de la table

- **Base du % (anneau, Tranche A)** : dénominateur = **Σ tokens des projets présents sur la table**
  uniquement (filtrer `portfolioEconomy()` par `worksetIds` **avant** de sommer). Calcul front pur,
  aucun backend.
- **Widget Économie (`.folioside`)** : filtrer les `ProjectEconomy` passés à `TreemapPanel`
  (`PortfolioView.tsx:129`) par `worksetIds` → la treemap ne montre que la table.

**Sémantique (AR-4 TRANCHÉ (Stéphane, 2026-06-30) = OUI)** : « % de l'anneau » = **part du projet
dans le TOTAL des tokens des PROJETS DE LA TABLE** ; treemap Économie et anneau partagent **le même
dénominateur** (Σ tokens des projets de la table).

**Tranche C = FRONT PUR** (filtrage/sommes sur `worksetIds`, aucune touche backend).

**Clôture C**
- Retirer un projet de la table recalcule **tous** les % d'anneau restants et la treemap (somme des
  parts = 100 % sur la table).
- Un seul projet sur la table → son anneau = 100 %.
- Table vide → pas d'anneau, treemap en placeholder honnête (pas de division par zéro).

### Tranche D — Visu « travail passé » au-dessus des cartes de la table

Porter la visu d'activité du dashboard (scatter-timeline tokens/jour/projet) **au-dessus** de la
section « Posés sur la table ».

**Constat source.** La visu dashboard exige une série **tokens par jour et par projet**
(`tokenActivity`, `scan.js:245`). Le cockpit lit déjà les mêmes transcripts (`economy.rs`) mais
n'agrège **que des totaux par projet** — **aucune ventilation temporelle**.

**AR-5 TRANCHÉ (Stéphane, 2026-06-30) = D-RÉELLE.** Pas de commits-sous-libellé-tokens, pas de
différé. Mise en œuvre :

- **Extension Rust (touche backend, Gimli — gate Legolas)** : étendre l'agrégation `economy.rs` pour
  **bucketer les tokens par jour ET par projet**. Algo **calqué sur `naonedge-dashboard/scan.js`
  `getTokenStats` byDay** (`scan.js:64-95`) : par ligne de transcript, somme
  `input_tokens + output_tokens + cache_creation_input_tokens` **HORS `cache_read_input_tokens`**
  (⚠️ écart à corriger vs `economy.rs:57` qui, lui, inclut `cache_read` pour les TOTAUX — la
  ventilation byDay applique la règle dashboard), clé jour = préfixe `YYYY-MM-DD` du `timestamp` du
  JSONL. Nouvelle façade **`portfolioActivity()`** (`backend.ts`, **seul `invoke`** D7) renvoyant
  `[{project, days:[{date, tokens}]}]`.
- **Scope = projets de la TABLE uniquement** (cohérent C) : le filtrage par `worksetIds` peut se
  faire côté front (la commande peut renvoyer tous les projets, le composant ne trace que ceux de la
  table) — au choix d'implémentation, mais **l'affichage ne montre que la table**.
- **Rendu front** : scatter-timeline calqué `renderChart` (`index.html:303-360`) — 1 ligne/projet,
  X = temps (jours ≤ 45 j, sinon mois), bulle = un jour, **rayon ∝ tokens du jour**. SVG (pas de dép).
- **Démo dev-gardée** : série de démo (calque `demoWidgets.ts:1-13`) substituée **uniquement** si
  `demoWidgetsOn` + projet `iaka-demo` + aucune donnée live — **zéro fausse donnée en prod**.

**Tranche D = SEULE tranche qui touche le Rust** (extension `economy.rs` + façade
`portfolioActivity()`). A/B/C restent front pur.

**Clôture D**
- Nouvelle agrégation Rust testée (`economy.rs`) : buckets byDay corrects, **`cache_read` exclu** de
  la ventilation (test dédié calquant la règle dashboard), tri/bornage cohérents.
- La visu affiche une ligne par projet **de la table** avec ses bulles d'activité **réelles** ; un
  projet sans transcript n'affiche aucune bulle (pas de bulle fantôme).
- Hors Tauri / aucune donnée → bloc vide honnête (« Aucune activité mesurée »), pas de crash.
- En démo (`iaka-demo`, dev), la série de démo apparaît ; **inerte en prod**.
- `bash scripts/quality.sh` vert (front + `cargo test`/`clippy`/`fmt` Rust).

---

## Arbitrages (TOUS TRANCHÉS — Stéphane, 2026-06-30)

1. **AR-1 — DESCRIPTION d'une carte. TRANCHÉ = (a)** : description = **sujet du dernier commit**
   (`last_commit_subject`) en MVP. *Note d'itération DIFFÉRÉE (hors L21) :* pour les projets
   iakaframe, préférer plus tard la phrase « En une phrase » de `specs/etat-des-lieux.md` (calque
   `scan.js:43-61`), en repli sur le sujet de commit.
2. **AR-2 — Statut « ● en cours » vs « au repos ». TRANCHÉ = (a)** : « en cours » **ssi une
   conversation vivante existe** pour ce projet (`useConversations`), sinon « au repos ».
3. **AR-3 — Tags « infra · docker » des lignes Atelier. TRANCHÉ = (a)** : **omis en MVP** (aucun tag
   affiché ; on garde nom + chemin + statut git). Dérivation/champ manuel = différé éventuel.
4. **AR-4 — Sémantique du % de l'anneau. TRANCHÉ = OUI** : % = **part du projet dans le TOTAL des
   tokens des PROJETS DE LA TABLE** (dénominateur = Σ table, **partagé** avec la treemap Économie).
5. **AR-5 — Visu « travail passé ». TRANCHÉ = D-RÉELLE** : étendre `economy.rs` avec une **ventilation
   tokens/jour/projet** (façade `portfolioActivity()`, algo calqué `scan.js getTokenStats byDay` :
   `input+output+cache_creation` **hors `cache_read`**, bucket byDay) → scatter-timeline fidèle.
   **Scope = projets de la TABLE uniquement.** Pas de commits-sous-libellé-tokens, pas de différé.

---

## Périmètre fermé / hors périmètre

**Dans L21** : refonte présentationnelle de l'Étagère (cartes riches table, lignes Atelier, scoping
% + éco), réutilisation des hooks/résolveur/façade existants ; visu D selon AR-5.
**Hors L21** : redéfinition du modèle `Team`/casting, nouvelle commande métier hors `portfolioActivity`
(si AR-5=D-réelle), refonte de la treemap elle-même, persistance backend du workset (reste MVP front,
`useWorkset.ts:1-7`), bandeau KPI supérieur (déjà en place, hors écart signalé).

## Réutilisation (anti-réinvention)

`useWorkset`, `usePortfolioEconomy`/`portfolioEconomy()`, `useTeams.teamForProject`,
`makeAvatarResolver`/`resolveVignette`, `gitLabel`, i18n `portfolio.*`/`tile.*`, `TreemapPanel`,
patron de fallback démo (`demoWidgets.ts`). Aucune nouvelle dépendance front. **Backend touché
uniquement par la Tranche D** (AR-5 = D-réelle : extension `economy.rs` + façade
`portfolioActivity()`). **A/B/C = front pur.**

## Gate

Instruction **validée par Stéphane, arbitrages AR-1..5 SCELLÉS (2026-06-30)** = déclencheur du
développement (Gimli), puis gate Legolas. Reco d'implémentation : livrer **A→B→C en front pur**
(commits atomiques) puis **D** (extension Rust + façade + rendu + démo). `bash scripts/quality.sh`
vert exigé avant clôture.
