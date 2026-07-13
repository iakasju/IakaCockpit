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

### ⚠️ Constat transcript (investigation Aragorn 2026-07-13) — RECADRE P2/P3
Sur **66 transcripts réels** : `isSidechain` est **TOUJOURS `false`** (0 fil de sous-agent
inline). Les délégations (gimli/legolas/loki, présentes comme `tool_use "Agent"` +
`subagent_type`) tournent comme **agents séparés** → **leurs tokens ne sont PAS dans le
transcript parent**. Le split coord/sub d'`economy.rs` est en pratique « tout coordinateur ».
Le `subagent_tokens` vu dans les notifications est du **texte de message** (rapports relayés),
**pas** un champ structuré. **Conséquence** : les **tokens/coût PAR AGENT NOMMÉ n'ont pas de
source réelle** propre → **différés** (spike). Ce qui EST réel : coût $ (modèle+usage du
coordinateur) et **délégations par agent en COMPTES/DURÉES** (via `tool_use "Agent"`).

### L30-P2 — « Analytics réel » = Coût $ réel + délégations réelles par agent (RUST + front)
Scope tranché par Stéphane (2026-07-13, option « B + délégations réelles ») :

**B — Coût $ réel (economy.rs + façade + front)**
- **Table de prix par modèle** (`$/Mtok` : input / output / cache-write / cache-read — 4 postes ;
  le cache change le coût réel). **Séparer les 4 buckets** de `message.usage` (aujourd'hui
  `fold_line` les mélange). Modèles locaux (llama3.1/ollama…) = **0 $**. Modèle **absent de la
  table** → coût `null` + placeholder (jamais de coût inventé) + marqueur « modèle sans tarif ».
- **Approvisionnement** : table **EMBARQUÉE par défaut** (bootstrap, valeurs publiques courantes,
  commentée « défaut, rafraîchie au démarrage ») **+ rafraîchissement EN TÂCHE DE FOND AU
  DÉMARRAGE** depuis `pricing_url` (config non sensible ; **non bloquant** ; injoignable/absent →
  on garde l'embarquée). Traçable (table + date de MAJ). Cf. AR-5.
- Coût $ dérivé **par ligne** (`model` + usage) → agrégation **par période** (bornes `from`/`to`
  passées depuis le sélecteur de plage) + **mix par modèle** → alimente KPI coût, tendance,
  coût cumulé (V2), deltas coût (V3-A single-période), mix modèle (V4) **en réel**.

**Délégations réelles par agent (transcript)**
- Depuis les transcripts (déjà lus par `economy.rs`), extraire les `tool_use "Agent"`
  (`subagent_type` = nom d'agent) + apparier le `tool_result` (durée = ts result − ts use) →
  agrégat **par agent nommé** : **nombre de délégations** + **durée totale/moyenne**, filtré par
  période. Alimente le **KPI délégations** (réel) et une **vue « par agent » en comptes/durées**
  (V4 : classement par nombre de délégations, PAS par tokens — honnête).
- **Zéro fausse donnée** : per-agent en tokens/$ reste **placeholder** (pas de source) ; on
  n'affiche que comptes/durées réels.

**Front** : `useAnalytics` consomme les nouvelles données réelles (coût, délégations/agent),
range-aware ; les widgets « placeholder » basculent au réel là où la source existe désormais.
Le reste (per-agent tokens/$, hypothèse V3-B par agent) reste placeholder.

### Différé / hors-lot (P3+)
- **SPIKE per-agent tokens/$** : où vivent les transcripts des sous-agents délégués ? portent-ils
  `usage` ? — préalable à toute attribution tokens/$ par agent nommé. `isSidechain` étant
  toujours `false`, la voie « sidechain inline » est **écartée** ; voie à explorer = transcripts
  séparés des sous-agents. Débloque V3-B **hypothèse par agent** et le « qui coûte quoi » en $.
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
