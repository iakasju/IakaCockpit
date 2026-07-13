# L30 — Page « Analytics » (remplace Journal dans le rail)

> Cadré 🟠 Aragorn (2026-07-13). Chantier produit : une **page Analytics** pour
> **comprendre en rétroactif la performance de la configuration d'une team** (et ses
> **variations**). Remplace la place de **Journal** dans le rail (Journal **débranché-gardé**,
> pas supprimé — règle « enlever un widget = débrancher, garder »). Direction A.
> Mocks de référence (validés par Stéphane, les **4** retenus) :
> `specs/design/redesign/A/analytics/v1.html … v4.html` ; source widgets
> `specs/design/redesign/A/concepts/hypotheses/economie.html`.

## 1. Besoin (verbatim Stéphane, reformulé fermé)
Une page **Analytics** qui permet de **comprendre en rétroactif la performance ou ses
variations** de la **configuration de la team** (agents / runners / modèles). Elle offre :
- une **colonne gauche « Périmètre »** listant **`ALL · portefeuille`** en tête puis les
  **projets triés par volume de tokens décroissant** (avec barres de volume) ;
- un **contrôle de plage de temps** (24 h / 7 j / 30 j / Custom), **défaut = 7 jours en
  arrière → maintenant** ;
- une **collection de widgets** (issus d'`economie.html`), organisée en **4 perspectives**
  (les 4 mocks retenus), commutables par un **sélecteur de perspective** :
  - **V1 — Dashboard KPI-first** : 4 KPIs (tokens / coût / délégations / temps) + treemap
    tokens par agent + part d'activité + tokens/jour (barres) + tendance coût (sparkline)
    + top délégations chères ;
  - **V2 — Timeline / évolution** : callout de variation, courbe d'évolution (aire =
    portefeuille, lignes = agents), coût cumulé, temps agent/jour ;
  - **V3 — Comparaison de config** : DEUX scénarios (sélecteur A/B) —
    - **A · Avant/après constaté** : deux périodes RÉELLES en regard, deltas (tokens / coût /
      coût-par-M-tokens / délégations / temps), tokens par agent A vs B, verdict.
    - **B · Constaté vs hypothèse (« et si… »)** : on prend les **tokens RÉELLEMENT observés**
      du passé et on les **re-tarife** sous un **changement de modèle / de plan** (par un agent
      ou pour toute la config). Coût = tokens × prix(modèle) ⇒ re-tarifer un volume observé sous
      un autre modèle est **exact** en $. **Honnêteté GRAVÉE** : re-tarifer **à volume de tokens
      constant** est une **hypothèse de premier ordre** (changer de modèle changerait la
      verbosité, donc le volume) → **toujours étiqueté « hypothèse · à volume constant »**,
      jamais présenté comme une mesure. Dépendances : hypothèse **par modèle** (« tout le sonnet
      → haiku ») = P2 (volumes par modèle) ; hypothèse **par agent nommé** (« Gimli sonnet →
      codex ») = P3 (attribution par agent) ;
  - **V4 — Drill-down par agent** : classement des agents (runner/modèle, tokens, coût,
    tours, durée moy.) + fiche dépliée (répartition par projet, mix par runner, mix par modèle).

## 2. État des lieux (données réelles disponibles)
Côté façade (D7) / `economy.rs` (transcripts JSONL de session, lecture seule) :
- **`portfolioEconomy()`** → `ProjectEconomy{project,input,output,coord,sub}` : tokens par
  projet, split **coordinateur vs délégués** (sidechain). ✅ réel, cross-projet.
- **`portfolioActivity()`** → `ProjectActivity{project,days:[{date,tokens}]}` : tokens/jour/
  projet. ✅ réel, **dimension temps déjà présente** (bucket jour).
- **`useEconomy`** (live tailer) → série du tour du **projet actif** (input/output, `ts`,
  `is_sidechain`). ✅ réel mais projet actif seulement.
- Le transcript porte AUSSI, par ligne assistant : **`message.model`** (le modèle), le
  **`timestamp`**, `is_sidechain`. → **coût $** et **mix par modèle** sont *dérivables* avec
  une **table de prix par modèle** (à ajouter, P2). L'attribution **par agent nommé**
  (Aragorn/Gimli…) exige de corréler `Agent` tool_use ↔ session sidechain → **plus dur**
  (différé/P3). Le split **coord vs délégués** est, lui, déjà réel.

**Conséquence de cadrage** : on livre **toute l'UX des 4 perspectives** tout de suite, avec
la **donnée réelle là où elle existe** (tokens par projet, tokens/jour, coord vs délégués) et
la **démo dev-gardée** pour montrer la richesse (coût $, par-agent, comparaison) **sans jamais
inventer de donnée en prod** (garde « zéro fausse donnée » : en prod, un widget sans source
réelle affiche un **placeholder honnête**, jamais un chiffre fabriqué). Le backend réel du
coût $/période arrive en **P2**.

## 3. Périmètre — PHASAGE

### L30-P1 — Enveloppe Analytics + 4 perspectives + démo (FRONT, cible v0.26.0)
Livre **toute la page** et **toute l'UX** ; branche la donnée réelle existante ; le reste en
démo dev-gardée + placeholders prod.

- **F1 — Vue `analytics` (rail)** : nouvelle `ViewId "analytics"` dans `useGridState` ;
  `AnalyticsView` (`src/views/AnalyticsView.tsx`) ; **le bouton rail « Journal » est remplacé
  par « Analytics »**. **Journal débranché-gardé** : `JournalView`, `MainCourante`, la route
  `journal` de `ViewId` et le composant restent dans le code (comme `cadre`) — seul le bouton
  du rail change de cible. i18n `nav.analytics` fr/en.
- **F2 — Tronc commun** (présentationnel, calque mocks) :
  - `PerimeterColumn` (`src/components/analytics/PerimeterColumn.tsx`) : `ALL · portefeuille`
    en tête (somme) + projets triés **tokens desc** avec barre de volume ; sélection = scope
    (état local ; défaut `ALL`). Alimenté par `portfolioEconomy()` (réel) ⨯ démo fallback.
  - `TimeRangeControl` (`src/components/analytics/TimeRangeControl.tsx`) : `24h / 7j / 30j /
    Custom`, **défaut 7j → now**, libellé de plage (i18n) ; état local. `now` via `useNow`
    (pas de `Date.now()` figé).
  - `PerspectiveTabs` : sélecteur `V1 Dashboard / V2 Timeline / V3 Comparaison / V4 Par agent`
    (i18n) ; état local, défaut V1.
- **F3 — 4 perspectives** (composants présentationnels purs `src/components/analytics/*`,
  calque strict des mocks, **on-brand** direction A) :
  - `PerspectiveDashboard` (V1), `PerspectiveTimeline` (V2), `PerspectiveCompare` (V3),
    `PerspectiveAgents` (V4). Chacune reçoit `scope`, `range`, et ses données en props.
- **F4 — Données & fallback honnête** :
  - Hook agrégateur front `useAnalytics(scope, range)` (`src/hooks/useAnalytics.ts`) qui
    compose `portfolioEconomy` + `portfolioActivity` (réels) et expose ce qui existe. Ce que
    la donnée réelle ne couvre PAS encore (coût $, par-agent, comparaison bi-période) est
    **`null`/vide** en prod → le widget affiche un **placeholder « donnée à venir »**.
  - **Démo** : `src/mock/demoAnalytics.ts` — jeu cohérent (les chiffres des 4 mocks),
    **dev-gardé** (`import.meta.env.DEV` + flag seed démo, calque `demoWidgetsOn`), substitué
    UNIQUEMENT en démo (jamais en prod). Ancré sur `now` (pas de date figée, calque `demoTasks`).
- **F5 — i18n parité fr/en** : toutes les chaînes (perspectives, KPIs, contrôles, placeholders)
  dans `fr.ts`/`en.ts`, parité testée.

**Gardes P1** : présentationnel D8 (composants purs), **façade unique** D7 (aucun `invoke`
hors `backend.ts` ; on réutilise `portfolioEconomy/Activity`), **CSP intacte**, pas de
god-component, **débrancher-garder** (Journal conservé), **zéro fausse donnée** (placeholder
en prod si pas de source réelle), i18n parité. **Rust non touché** en P1.

### L30-P2 — Coût $ réel + agrégation par période/modèle (RUST + front, cible ultérieure)
- **Table de prix par modèle** (`$/Mtok` : input / output / cache-write / cache-read — les 4
  postes, le cache change le coût réel). **Séparer `cache_read`/`cache_creation`** de l'input
  plein (aujourd'hui `fold_line` les mélange pour les totaux tokens — pour le COÛT il faut les 4
  champs distincts, tous présents dans `message.usage`). Modèles locaux (llama3.1…) = **0 $**.
  Modèle **absent de la table** → coût `null` + placeholder (jamais de coût inventé).
- **Approvisionnement de la table = table par défaut EMBARQUÉE (fallback offline, CSP intacte)
  + rafraîchissement EN TÂCHE DE FOND AU DÉMARRAGE** de l'app (non bloquant : l'app démarre sur
  la table locale ; la MAJ s'applique quand elle arrive ; injoignable → on garde la table
  embarquée). Source = **pricing.json maintenue dans la suite** (Forgejo/iakabox ou endpoint
  contrôlé) — self-hosted-first, traçable (table + date). Cf. AR-5.
- Coût $ dérivé par ligne (`model` + usage) → agrégation **par période** (bornes `from`/`to`),
  **mix par modèle** → alimente V1 coût, V2 coût cumulé, V3 deltas + **hypothèse par modèle**,
  V4 mix modèle **en réel**.
- Le front bascule les widgets « placeholder » sur la donnée réelle dès qu'elle arrive.

### Différé / hors-lot (P3+)
- **Attribution par agent NOMMÉ** (Aragorn/Gimli…) : corréler `Agent` tool_use ↔ session
  sidechain (le split coord/délégués existe déjà ; le NOM du délégué est le cran d'après).
  Débloque V3-B **hypothèse par agent** (« et si Gimli passait sonnet → codex ») et V4 par agent réel.
- Hypothèse de **changement de PLAN** (délégation) et pas seulement de modèle : change les
  volumes → au-delà du re-tarifage à volume constant (P3+, à part).
- Comparaison de config « réelle » adossée à l'historique des `frame.json`/binding (V3-A pousse
  vers ça) — MVP V3-A = deux plages de temps.
- Export CSV/partage, alertes de dérive de coût.

## 4. Critères d'acceptation (P1)
1. Le rail affiche **Analytics** à la place de **Journal** ; cliquer ouvre `AnalyticsView`.
   `JournalView`/`MainCourante`/route `journal` **restent dans le code** (débranché-gardé).
2. La colonne **Périmètre** montre `ALL · portefeuille` en tête puis les projets **triés
   tokens desc** (barres) ; sélectionner un projet change le scope ; **données réelles** via
   `portfolioEconomy()` quand dispo, démo sinon (dev), placeholder si aucune.
3. Le **contrôle de plage** propose 24h/7j/30j/Custom, **défaut 7j → now**, avec libellé.
4. Le **sélecteur de perspective** commute entre **V1/V2/V3/V4**, chacune calquant son mock,
   **on-brand**.
5. En **prod sans source réelle**, les widgets non couverts affichent un **placeholder
   honnête** (aucun chiffre inventé). En **démo dev**, les 4 perspectives sont **pleines**
   (données cohérentes ancrées sur `now`).
6. `npm run typecheck` + `lint` + `test` **verts** ; **Rust non modifié** (P1). Tests :
   `useAnalytics` (compose réel, fallback vide), `PerimeterColumn` (tri + ALL), rendu des 4
   perspectives (présence des widgets clés + placeholder), toggle de vue, parité i18n fr/en.

## 5. Arbitrages (recommandations — à valider par Stéphane)
- **AR-1** — Les **4 perspectives** cohabitent dans **une seule page** via un sélecteur
  (défaut V1). *(déduit du choix « les 4 » ; à confirmer.)*
- **AR-2** — **Phasage P1 (UX complète + démo, front) puis P2 (coût $ réel, Rust)** :
  on montre toute la cible tout de suite (démo), le réel arrive par la donnée. Alternative
  refusée : attendre le backend pour livrer (gèlerait la vue). *(reco P1 d'abord.)*
- **AR-3** — **Journal débranché-gardé** (comme Cadre) — pas supprimé. *(reco.)*
- **AR-4** — **Zéro fausse donnée en prod** : placeholder si pas de source réelle. *(garde
  non négociable.)*
- **AR-5** — Table de prix par modèle (P2) : **table par défaut embarquée + rafraîchissement
  en tâche de fond au démarrage** (non bloquant, fallback offline sur l'embarquée). Source =
  **pricing.json maintenue dans la suite** (Forgejo/iakabox / endpoint contrôlé), self-hosted-first,
  traçable. *(décision Stéphane 2026-07-13.)*
- **AR-6** — V3 gagne le scénario **B « constaté vs hypothèse »** (re-tarifage des tokens
  observés sous un autre modèle/plan), **toujours étiqueté « hypothèse · à volume constant »**.
  MVP par modèle (P2) ; par agent nommé (P3). *(décision Stéphane 2026-07-13.)*
