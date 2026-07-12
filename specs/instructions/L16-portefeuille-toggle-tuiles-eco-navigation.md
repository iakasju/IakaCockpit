# L16 — Portefeuille : toggle Liste/Tuiles de l'Atelier + navigation depuis le widget Économie

> **Statut** : cadré (2026-07-12), arbitrages AR-1..3 tranchés par Stéphane. Prêt pour Gimli.
> **Remplace** le contenu vocal de la case L16 du backlog (cf. § 7). L'ancienne instruction
> `L16-pilotage-vocal-iakacockpit.md` **reste intacte** et est re-tracée comme lot distinct.
> **Cadré par** 🟠 Aragorn (chef de projet — cadrage + coordination).

---

## 1. Besoin (verbatim reformulé)

Dans la **page Portefeuille** (Étagère) :

1. Les projets **rangés dans l'atelier** sont aujourd'hui présentés **en liste**. Ajouter un
   **toggle** qui bascule leur affichage en **tuiles**, identiques aux tuiles d'un projet
   **posé sur la table**.
2. Dans le **widget Économie** (colonne droite, treemap), un **double-clic** sur un projet
   **bascule sur la page Travail avec ce projet mis au premier plan** (conversation active).

---

## 2. État des lieux (code réel, ancrage)

- `src/views/PortfolioView.tsx` — vue Étagère. Partitionne les projets :
  - **table** (`worksetIds`) → `ProjectCard` (tuiles riches `.proj`) dans `.cards` ;
  - **atelier** (hors workset) → `ShelfRow` (lignes-liste `.scanrow`) dans `.scan` ;
  - **widget Économie** = `aside.folioside` → `TreemapPanel`, alimenté par
    `scope.tableEconomy` (**filtré aux projets de la table**, AR-4 historique).
- `src/components/ProjectCard.tsx` — carte `.proj` : gère déjà `tokens=null` (« — ») et
  `ringPct=null` (anneau neutre) → **zéro fausse donnée** pour un projet sans transcript.
  Action actuelle = bouton **« retirer »** (`onRemove` → `onToggleWork`).
- `src/components/ShelfRow.tsx` — ligne `.scanrow` : action = bouton **« poser »**
  (`onPut` → `onToggleWork`).
- `src/components/TreemapPanel.tsx` — cellules `.tcell` portant `it.project`.
- `src/App.tsx` :
  - `openProject(project)` (l.314) → gère le popup de liaison team puis ouvre/active la
    conversation du projet (le met **au premier plan**) ;
  - `grid.setActiveView("working")` → bascule sur la page Travail ;
  - `useConversations` : `active` = conversation au premier plan ; `openConversation` /
    `setActive` rendent un projet actif.

---

## 3. Périmètre FERMÉ

### F1 — Toggle Liste ↔ Tuiles de l'Atelier

- Ajouter un **toggle segmenté 2 états** (« Liste » / « Tuiles ») dans l'entête de la section
  **Atelier** (`.rowhead` de `portfolio.shelfHead`), à droite du titre.
- **Défaut = Liste** (comportement actuel `ShelfRow`, aucune régression visuelle par défaut).
- État = **état local UI** de `PortfolioView` (`useState`), MVP **sans persistance**
  (persistance config = différé § 6).
- Portée = **Atelier SEUL** (AR-1). La **table reste toujours en tuiles** `ProjectCard`,
  jamais affectée par le toggle.
- **Mode « Tuiles »** : rendre les projets de l'atelier en tuiles `.proj` **dans la grille
  `.cards`** (réutilisée), avec :
  - **tokens « — » + anneau neutre** (projet hors table → pas de coût scopé table ;
    `ProjectCard` gère déjà `null`/`null`) ;
  - **avatars** de la team via `avatarsForProject(p.id)` (comme la table) ;
  - **action = « poser sur la table »** (et NON « retirer ») → appelle `onToggleWork(p.id)` ;
  - chip statut : « au repos » (un projet rangé n'a pas de conversation vivante) — acceptable
    de réutiliser le rendu carte avec `live=false`.
- **Réutilisation vs duplication** (reco d'implémentation, tranchable par Gimli) :
  étendre `ProjectCard` d'un prop **`variant: "table" | "shelf"`** (défaut `"table"`) qui
  échange l'action (`−` retirer ↔ `+` poser) plutôt que dupliquer la grammaire `.proj`.
  Alternative acceptée : petit composant `ShelfCard` réutilisant les classes `.proj`.
  **Interdit** : recopier le JSON de la carte en dur / diverger de la grammaire `.proj`.

### F2 — Double-clic Économie → Travail + projet au premier plan

- `TreemapPanel` : ajouter un **`onDoubleClick`** sur chaque cellule `.tcell` → nouveau
  callback prop `onOpenInWork(project: string)`.
- `PortfolioView` : nouveau prop `onOpenInWork(projectId)` transmis à `TreemapPanel`.
- `App.tsx` : implémenter `onOpenInWork` = retrouver le projet
  (`worksetProjects.find(p => p.id === id)`, la treemap étant scopée table) **puis**
  `openProject(project)` (ouvre/active la conversation = **premier plan**) **puis**
  `grid.setActiveView("working")`.
- **AUCUNE mutation du workset** (le projet est déjà sur la table) : c'est de la
  **navigation + focus**, pas un ajout.
- Affordance : `.tcell` reçoit `cursor: pointer` + `title`/hint « double-clic → ouvrir dans
  Travail ». (a11y clavier = différé § 6.)

### F3 — Contenu enrichi de la tuile projet (incrément post-gate, 2026-07-12)

> Ajouté après le PASS F1/F2, à la demande de Stéphane. **Touche le Rust** (scan enrichi)
> + le miroir front + `ProjectCard`. Vaut pour les **deux variantes** de la tuile (`table`
> ET `shelf`) puisque c'est le même composant `ProjectCard`.

**Nouvelle grammaire du corps de la carte (`ProjectCard`) :**
- **En GRAS** : le **sujet du projet** = **description dédiée** du projet (AR-4).
  - Source (AR-6 **TRANCHÉ = option B**, 2026-07-12) : lue par le scan Rust, dans l'ordre —
    (1) la **1ʳᵉ ligne significative de `specs/PROJET.md`** (hors frontmatter `---`, hors
    titres `#`, hors citations `>`, hors lignes vides) — **SOURCE PRIORITAIRE** ;
    (2) à défaut, la 1ʳᵉ ligne de texte de la section `## Ce qu'est ce projet` de `CLAUDE.md` ;
    (3) à défaut **`None`**.
  - **Contrat de rôle lié** : cette ligne de `PROJET.md` est **maintenue par le coordinateur**
    (pose à la création + mise à jour si la def évolue en conversation, **validée par le
    user**). Cf. mémoire `coordinateur-obligation-maintenir-def-projet`.
  - **Fallback d'affichage** si `description == null` : `last_commit_subject` (comportement
    actuel), puis `card.noCommit`. **Jamais** de fausse donnée.
- **En dessous, en NORMAL** : `next : <prochaine étape>` (AR-5).
  - Source : **1er item non coché `- [ ]`** du backlog de `CLAUDE.md` (le texte de la ligne,
    nettoyé du `- [ ]` et du markdown de tête). Si aucun backlog / aucun `- [ ]` restant →
    **ligne masquée** (pas de « next : — » inventé).
- **Ligne méta** (petits chips/points, discrète) — chaque item n'apparaît QUE si la donnée
  existe (zéro fausse donnée) :
  - **version** : `project.version` (déjà capté depuis `specs/etat-des-lieux.md`) → ex.
    `v0.16.0`. Absent → masqué.
  - **commits de retard** : `project.behind` (déjà capté, `git rev-list @{u}...HEAD`) → ex.
    `3 en retard` ; `behind == 0` → masqué (ou « à jour », au choix d'implémentation).
    NB : `behind` reflète le dernier état git connu (pas de `fetch` automatique).
  - **étapes restantes** : nombre de `- [ ]` non cochés du backlog `CLAUDE.md` → ex.
    `2 étapes restantes`. `0` / pas de backlog → masqué.

**Ajouts backend (Rust, `portfolio.rs` → struct `Project`) :**
- `description: Option<String>` — via un lecteur `read_description(dir)` (ordre AR-6 ci-dessus).
- `backlog_remaining: Option<u32>` — nb de `- [ ]` dans le backlog `CLAUDE.md`.
- `backlog_next: Option<String>` — texte du 1er `- [ ]` (nettoyé). **Nom distinct** de la
  `NextStep` LLM (L3) pour éviter toute confusion : ce n'est PAS le moteur IA.
- Un seul lecteur `read_backlog(dir)` calcule `backlog_remaining` + `backlog_next` d'un
  passage sur `CLAUDE.md` (parse tolérant : `- [ ]` / `- [x]`, insensible à la casse de `x`).
- Miroir : `src/api/backend.ts` interface `Project` (mêmes 3 champs), tests Rust
  (`portfolio.rs`) pour `read_description` + `read_backlog` (cas présents/absents/vides).

### F4 — Pastille d'urgence à gauche du titre de la tuile (incrément, 2026-07-12)

> Retour terrain de Stéphane : « à gauche du titre il y a une **icône vide** ; on la remplace
> par une **pastille symbolisant l'urgence de travailler dessus** ». Urgence **dérivée du
> backlog** (AR-7). Touche `ProjectCard` + un **petit ajustement `portfolio.rs`** (cf. infra).

- Remplacer le placeholder décoratif `<div className="ic" aria-hidden />` de `ProjectCard`
  (dans `.top`) par une **pastille colorée** dérivée de `project.backlog_remaining`.
- **Mapping (AR-7)** — 3 niveaux + neutre, seuil `N = 5` (constante, tunable) :
  - `backlog_remaining == null` (pas de backlog du tout) → **gris / neutre** ;
  - `Some(0)` (backlog présent, **tout coché**) → **🟢 vert** (fini) ;
  - `Some(1..=N-1)` → **🟠 ambre** (en cours) ;
  - `Some(n) où n >= N` → **🔴 rouge** (urgent, beaucoup d'étapes restantes).
- La pastille **n'est plus décorative** → retirer `aria-hidden`, ajouter un **`title` +
  `aria-label` i18n** décrivant le niveau (ex. « Urgence : N étape(s) restante(s) » /
  « rien en attente » / « pas de backlog »).
- Vaut pour les **deux variantes** (`table` ET `shelf`) — même composant.
- **F4-bis — cohérence liste ↔ tuile (retour terrain 2026-07-12)** : la **même pastille
  d'urgence** doit apparaître, **identique** (mêmes couleurs, même tooltip i18n, même mapping),
  dans la **liste** (`ShelfRow`, aujourd'hui un point de **statut git** `dirty`/idle) **et**
  dans la tuile (`ProjectCard`). → **Extraire** `urgencyLevel(remaining)` + libellés dans un
  **helper partagé** (ex. `src/components/urgency.ts`) importé par `ProjectCard` ET `ShelfRow` ;
  remplacer le `.dot o/i` de `ShelfRow` par la pastille d'urgence. Le **statut git reste**
  visible dans le texte `.meta` de la ligne (rien de perdu). Un seul mapping, une seule source
  de vérité, zéro divergence visuelle.

**Ajustement backend REQUIS (`portfolio.rs`, `read_backlog`)** — sinon le vert « fini » est
indistinguable du gris « pas de backlog » (les deux valent `None` aujourd'hui) :
- `backlog_remaining` = `Some(count_unchecked)` **dès qu'au moins UNE case** (`- [ ]`/`- [x]`)
  existe dans `CLAUDE.md` → **`Some(0)` devient possible** (backlog tout coché).
- `None` **uniquement** si **aucune case** du tout / pas de `CLAUDE.md`.
- `backlog_next` **inchangé** (1er `- [ ]`, ou `None` si tout coché/absent).
- Tests Rust `read_backlog` à mettre à jour : « toutes cochées » → `Some(0)` + `next = None`
  (avant : `None`) ; « aucune case » → `None` ; « mix » → `Some(k)` + `next` = 1er non coché.
- **Impact front méta F3 inchangé** : « N étapes restantes » se masque déjà quand
  `remaining` vaut `null` **ou 0** → `Some(0)` reste masqué côté méta (seule la pastille
  distingue 0 vs absent).

---

## 4. Gardes (non négociables)

- **Scoping Économie AR-4 CONSERVÉ** : la treemap reste scopée à la table
  (`scope.tableEconomy`). **NE PAS** l'élargir au portefeuille entier (option écartée par
  Stéphane).
- **Façade unique (D7)** : aucun `invoke` nouveau. F1/F2 = callbacks remontés à `App` qui
  réutilise `openProject` + `grid.setActiveView` **existants**. **F3 réutilise le `invoke`
  EXISTANT** `scan_portfolio` (on ajoute seulement des champs à `Project`) — **aucune
  nouvelle commande Tauri**.
- **Rust** : F1/F2 ne touchent pas le Rust ; **F3 étend `portfolio.rs`** (struct + 2 lecteurs
  + tests). Rester dans `portfolio.rs`, ne pas toucher aux autres modules.
- **Présentationnel pur (D8)** : `PortfolioView`, `TreemapPanel`, `ProjectCard` restent sans
  I/O (la nouvelle donnée arrive par le scan, via les props).
- **CSP intacte** : aucun asset externe, aucune nouvelle dépendance.
- **i18n** : tout libellé nouveau (« Liste », « Tuiles », hint double-clic, `next :`, méta
  version/retard/étapes) passe par `react-i18next` avec parité **fr/en** (`src/i18n`), jamais
  de chaîne en dur. (Les valeurs interpolées `{{count}}`, texte de description/next restent
  des données, pas des libellés.)
- **Zéro fausse donnée** : tuiles atelier → « — » tokens + anneau neutre ; méta F3 → chaque
  item masqué si sa donnée est absente ; description → fallback honnête ; next masqué si vide.

---

## 5. Critères d'acceptation (vérifiables)

1. Un toggle « Liste / Tuiles » est visible dans l'entête de la section Atelier ; **défaut =
   Liste** ; la section table est **inchangée**.
2. Basculer sur « Tuiles » rend les projets rangés en cartes `.proj` (grille `.cards`) avec
   un bouton **« poser sur la table »** qui appelle `onToggleWork` ; revenir sur « Liste »
   rétablit les `ShelfRow`.
3. Une tuile d'atelier affiche **« — » tokens**, un **anneau neutre**, les **avatars** de la
   team du projet.
4. **Double-clic** sur une cellule de la treemap Économie ⇒ la vue **bascule sur Travail**
   ET la **conversation du projet devient active** (premier plan) — vérifiable via
   `conversations.active.projectId === id` après le geste.
5. Aucun projet n'est **ajouté/retiré** du workset par le double-clic (navigation seule).
6. **(F3)** La tuile projet affiche : la **description en gras** (fallback `last_commit_subject`
   puis `card.noCommit` si absente) ; une ligne **`next : <1er item non coché>`** (masquée si
   pas de backlog) ; une ligne méta **version / N en retard / N étapes restantes**, chaque
   item **masqué quand sa donnée est absente**. Vrai pour les tuiles **table ET atelier**.
7. **(F3)** `scan_portfolio` renvoie les 3 nouveaux champs `description` / `backlog_remaining`
   / `backlog_next` ; le miroir `Project` (`backend.ts`) les porte ; tests Rust couvrant
   `read_description` et `read_backlog` (présent / absent / vide) **verts**.
8. **(F4)** La tuile affiche **à gauche du titre une pastille d'urgence** (remplace `.ic`)
   colorée selon `backlog_remaining` : **rouge** `>= 5`, **ambre** `1..4`, **vert** `0`
   (Some(0)), **gris** `null`. Elle porte un `title`/`aria-label` i18n. Vrai pour table ET
   atelier.
9. **(F4)** `read_backlog` distingue **`Some(0)`** (backlog présent, tout coché) de **`None`**
   (aucune case / pas de `CLAUDE.md`) — test Rust explicite ; `backlog_next` reste `None` si
   tout coché.
10. `npm run typecheck` + `npm run lint` + `npm run test` **verts** ; `cargo test` (dans
   `src-tauri/`) **vert** (F3/F4 touchent le Rust). Nouveaux tests front : (a) toggle
   Liste↔Tuiles change le rendu ; (b) double-clic cellule appelle `onOpenInWork` ; (c) rendu
   F3 (description gras, `next :`, méta conditionnelle) ; (d) pastille F4 = bonne couleur selon
   `backlog_remaining` (les 4 cas rouge/ambre/vert/gris).

---

## 6. Différés / hors-lot (tracés)

- **Persistance** du mode toggle (clé config `ui_portfolio_atelier_view`) — MVP = local.
- **a11y clavier** des cellules treemap (focus + `Enter` = même effet que double-clic).
- **Élargissement** du widget Économie au portefeuille entier — **écarté** (AR-4 conservé).
- **Toggle sur la table** — écarté (AR-1 : atelier seul).

---

## 7. Backlog / bookkeeping (AR-3)

- Cette évolution **devient le nouveau contenu de la case L16** du backlog (`CLAUDE.md`).
- L'ancien contenu **pilotage/dictée vocale** (`L16-pilotage-vocal-iakacockpit.md`) est
  **conservé intact** et **re-tracé** comme lot distinct (à renuméroter, ex. lot vocal
  ultérieur) — rien n'est supprimé.

---

## 8. Arbitrages tranchés (Stéphane, 2026-07-12)

- **AR-1** — Portée du toggle : **Atelier seul** (table toujours en tuiles).
- **AR-2** — Double-clic Économie : **basculer sur Travail avec le projet au premier plan**
  (navigation + focus), **pas** d'ajout au workset, **pas** d'élargissement du widget.
- **AR-3** — Backlog : cette feature **= nouveau L16** (le vocal est re-tracé).
- **AR-4** — Sujet en gras de la tuile = **description dédiée** du projet (nouvelle donnée
  Rust), **pas** le nom ni le sujet de commit (ce dernier reste en fallback).
- **AR-5** — `next :` = **1er item non coché `- [ ]` du backlog `CLAUDE.md`** (statique,
  gratuit), **pas** le moteur LLM L3.
- **AR-6** — **TRANCHÉ (option B, 2026-07-12)** : source de la description = **`specs/PROJET.md`
  PRIORITAIRE** (1ʳᵉ ligne significative) → sinon `CLAUDE.md §« Ce qu'est ce projet »` →
  sinon `None`. **Inverse** l'ordre initialement implémenté (CLAUDE.md-first). Contrat de rôle
  associé : le **coordinateur** maintient cette ligne dans `PROJET.md` (création + évolution,
  validée par le user) — cf. mémoire `coordinateur-obligation-maintenir-def-projet`.
- **AR-7** — **TRANCHÉ (2026-07-12)** : la **pastille d'urgence** (F4) dérive de
  **`backlog_remaining`** (étapes de backlog restantes), 3 niveaux + neutre — **rouge** `>= N`,
  **ambre** `1..N-1`, **vert** `0`, **gris** si absent. **Seuil `N = 5`** (défaut tunable,
  confirmable). Nécessite que `read_backlog` renvoie `Some(0)` quand le backlog est tout coché.
