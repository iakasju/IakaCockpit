# Instruction : L4 — Mains courantes 3-canaux branchées sur iakaboxlogs (CouchDB, lecture seule)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Lot métier #4** de MOVE 3 (dev), après L0 (socle, PASS), L1 (backend salvagé, PASS), L2
> (vues UI, PASS) et L3 (moteur prochaine étape, implémenté). Réf. : `specs/PROJET.md` § 5 (mains
> courantes 3-canaux), § 3.1/3.2 (façade unique `backend.ts`, stack), § 4 (vue mains courantes),
> § 10.4 (RÉSERVE : schéma `role` ≠ 3 canaux → mapping/`meta.canal` à cadrer) ; `specs/roadmap.md`
> § 2 L4 + sa piste « tracer les délégations » (volet MACHINE), § 0 (garde anti scope-creep),
> § 4 (réutilisation : iakaboxlogs déployé — NE PAS remonter un bus), § 5 (rythme box offline :
> L4 dépend de la box), R7 (mode dégradé) ; `CLAUDE.md` (archi front D7, socle sécurité L0).
>
> **Matériau réel inspecté en lecture seule le 2026-06-25** (le schéma iakaboxlogs n'est PAS une
> supposition — il est lu dans le dépôt local `/Users/sjupin/work/iakaboxlogs/`) :
> `bridge/index.js` (pont MQTT→CouchDB, forme exacte du doc), `bin/iakalog.mjs` (pusher, ce que
> `meta` contient aujourd'hui), `skills/log-conversation/SKILL.md`, `scripts/init-couchdb.sh`
> (base, index Mango), `specs/PROJET.md` iakaboxlogs (schéma), `.env.example` (auth CouchDB).
> Côté Cockpit : `src/mock/feed.ts`, `src/components/MainCouranteMock.tsx`, `src/__tests__/feed.test.ts`,
> `src/views/PortfolioView.tsx`, `src/api/backend.ts`, `src-tauri/src/{ai.rs,config.rs,secrets.rs,
> services.rs,lib.rs}`, `src-tauri/Cargo.toml`. Faits techniques vérifiés sur le web (cf. § Sources).

---

## Objectif

Brancher la **main courante 3-canaux** du Cockpit (aujourd'hui **MOCKÉE**, livrée en L2 sous DEP-1)
sur le **vrai iakaboxlogs** : lire la base **CouchDB** `conversations` (HTTP/JSON, `.11:5984`) **côté
Rust**, en **lecture seule**, exposer le flux via l'**unique** façade `src/api/backend.ts`, dériver les
**3 canaux (adresse / geste / pensée) + dimension agent** à partir du schéma existant, et alimenter le
feed + les filtres déjà codés. **Réutilisation pure** : on **ne réimplémente NI le bus MQTT, NI le pont
n8n/bridge, NI le stockage** — iakaboxlogs est déjà déployé et validé. À la fin de L4, la colonne
« Main courante » de Portfolio affiche des **événements réels** (ou le **mock en mode dégradé** si la
box est indisponible), filtrables par canal et par agent, **sans aucun `fetch` direct depuis le front**,
**sans identifiant CouchDB en SQLite/commit**, **typecheck/lint/tests/clippy verts**.

**L4 = on LIT iakaboxlogs, on ne le rebâtit pas (R7 + § 4 roadmap).** Le périmètre reste **v0.1 MVP** :
pas de remontée de bus, pas d'écriture, pas de filtre *event*/fiche jalon, pas de traçage machine des
délégations (ces deux derniers = **pistes rattachées différées**, cf. § Périmètre exclu).

---

## Contexte

### Ce que la vision impose (PROJET.md / roadmap.md)
- **§ 5** : une main courante **par projet**, journal **filtrable par canal** adossé aux **3 canaux d'un
  agent LLM** : **adresse** (parole publique adressée à l'humain), **geste** (actes : appels d'outils,
  **délégations**, résultats), **pensée** (délibération privée si exposée), + **agent** (filtre par
  émetteur `[ROYAUME][Agent]`). Le Cockpit **lit** cette main courante (CouchDB HTTP/JSON) plutôt que de
  réimplémenter le stockage. **Frontières gravées** (§ 5) : on **ne trace pas** les composants de dev
  (MCP/Obot) ; on **ne re-trace pas** ce que git trace déjà (commits/diffs) ; l'engagement humain passe
  par un agent qui vient demander sur le canal **adresse**, pas par la surveillance du journal.
- **§ 10.4 — RÉSERVE (LE point dur)** : le schéma CouchDB porte `role` (user/assistant/system), **PAS**
  explicitement les 3 canaux. Un **mapping** ou un enrichissement `meta.canal` est à cadrer. → **tranché
  ici en D3.**
- **§ 3.1/3.2** : mains courantes = **iakaboxlogs (MQTT/CouchDB `.11`)** ; tout accès aux capacités
  passe par `src/api/backend.ts` → `invoke()`. **Aucun appel réseau direct depuis le front** (CSP stricte).
- **§ 4** : la vue **Mains courantes 3-canaux** est un **journal filtrable par projet**, branché sur
  iakaboxlogs ; les filtres s'appliquent aussi au PTY (le PTY reste **hors L4**, cf. exclus).
- **roadmap § 4** : réutiliser **iakaboxlogs déployé** (Mosquitto MQTT → CouchDB, pont n8n) **plutôt que
  monter un nouveau bus**. **roadmap § 5 / R7** : box offline → mains courantes en **mode dégradé**, pas
  de crash. **roadmap § 0** : garde anti scope-creep (DIFFÉRÉ/ANNULÉ ne rentrent pas par effet de bord).

### Le schéma RÉEL d'iakaboxlogs (lu dans le dépôt, pas supposé)
La base CouchDB `conversations` (créée par `scripts/init-couchdb.sh`) contient **un document par
message**, écrit par le pont (`bridge/index.js`) à partir du topic `iakaboxlogs/<royaume>/<agent>/<conv_id>` :

```json
{
  "_id": "<uuid CouchDB>",
  "ts":      "2026-06-21T17:30:00Z",   // ISO-8601, horodatage du message
  "royaume": "iakaide",                // dérivé du topic (segment 2)
  "agent":   "Aragorn",                // dérivé du topic (segment 3)
  "conv_id": "conv-2026-06-21-001",    // dérivé du topic (segment 4)
  "role":    "user | assistant | system | unknown",
  "content": "…",                      // corps du message
  "tokens":  0,
  "meta":    {}                        // OBJET LIBRE — vide chez les pushers actuels
}
```

**Faits durs à retenir** (vérifiés dans le code, déterminent D2/D3/D4) :
- **Base** : `conversations`. **Hôte** : `http://192.168.2.11:5984` (cf. `init-couchdb.sh`). **HTTP en
  clair** (LAN de confiance — aligné `ureq` sans TLS déjà présent, A3 de L3).
- **Auth** : **HTTP Basic** `admin:<password>` (cf. `.env.example` : `COUCHDB_USER`/`COUCHDB_PASSWORD`).
  → identifiant **sensible** : keychain (D4).
- **Index Mango disponible** : `idx-maincourante` sur les champs `["ts","royaume","agent","conv_id"]`
  → on peut **trier par `ts` desc** et **filtrer par royaume/agent** efficacement via `POST /{db}/_find`.
- **`meta` est aujourd'hui `{}`** : ni `iakalog.mjs` ni le bridge ne posent `meta.canal`. Le bridge
  **préserverait** un `meta` reçu (`meta: body.meta || {}`) → `meta.canal` est un **point d'extension
  futur côté pushers**, pas une donnée présente aujourd'hui. **Conséquence directe** : au socle L4, le
  canal se **dérive de `role`** ; `meta.canal` est lu **quand présent** (forward-compatible). → **D3.**
- **`role` ≠ 3 canaux** : `user/assistant/system` ne porte ni « geste » ni « pensée ». La dérivation est
  donc **imparfaite par nature** (réserve § 10.4) — on l'assume et on la documente (D3).

### Ce que L0/L1/L2/L3 fournissent déjà (à réutiliser, NE PAS réinventer)

| Brique | Où | Ce qu'on en fait en L4 |
|---|---|---|
| **Patron client HTTP côté Rust** (`ureq` POST JSON bloquant, parsing défensif `serde_json`, dégradation `Err(String)` lisible, timeout borné) | `src-tauri/src/ai.rs` (L3) | **CALQUER** : `POST {couchdb}/conversations/_find` au lieu de `/chat/completions`. Même structure, même gestion d'erreur. |
| `ureq` (sans TLS, http LAN) | `src-tauri/Cargo.toml` | **déjà présent** — `http://192.168.2.11:5984` fonctionne tel quel. **Aucune** nouvelle dépendance attendue. |
| `secrets::{SecretStore, KeyringStore}` + son `MockStore` de test | `src-tauri/src/secrets.rs` (L0) | stocker/lire **user + password CouchDB** au keychain (account neutre, cf. D4). Tester le cloisonnement via `MockStore`. |
| `config::{get,set}` + `is_secret` (filtre `config_all`) | `src-tauri/src/config.rs` (L1) | persister l'**URL CouchDB** + la **base** (non sensibles) en SQLite. Vérifier qu'aucune clé introduite ne matche `key|token|secret|password`. |
| `db::open(app)` | `src-tauri/src/db.rs` (L1) | ouvrir la connexion config. |
| Façade `backend.ts` (unique `invoke`) | `src/api/backend.ts` | **unique** point d'`invoke` ; on y ajoute la commande L4 typée + les types miroir. |
| **Feed mocké + filtres + test** (DEP-1) | `src/mock/feed.ts`, `src/components/MainCouranteMock.tsx`, `src/__tests__/feed.test.ts` | **POINT D'ANCRAGE** : on **branche** ce feed sur la source réelle ; le **mock devient le fallback** dégradé ; `filterFeed`/`ALL_CANAUX`/`Canal` sont **réutilisés** (contrat UX déjà testé). |
| Montage du composant | `src/views/PortfolioView.tsx` (`<MainCouranteMock/>`) | remplacer/renommer le composant mock par le composant branché (cf. D6). |
| Patron config UI (endpoint + clé write-only + état) | `src/views/SettingsView.tsx`, `src/hooks/useSettings.ts` (L2/L3) | **CALQUER** pour les réglages CouchDB (URL/base en config, user/pass write-only). |
| `services.rs` (check TCP, liste codée en dur) | `src-tauri/src/services.rs` (L1) | **option** : ajouter CouchDB `.11:5984` à la liste des services vérifiés (cf. D5, non bloquant). |

### Contrat de données ACTUEL du mock (à faire évoluer)
`src/mock/feed.ts` définit `type Canal = "adresse"|"geste"|"pensee"|"agent"` et
`interface FeedEvent { id, canal, who, project, body, ts }`, avec `filterFeed(feed, activeSet)` et
`ALL_CANAUX`. Le test `feed.test.ts` couvre : filtre OFF = tout visible, un canal isolé, union de
canaux, présence des 4 canaux. **L4 conserve ce contrat UX** (le mapping CouchDB→`FeedEvent` est la
nouvelle pièce ; cf. D3/D6).

### Réseau / box (R7)
La box (CouchDB `.11`) est **indispensable pour les données réelles** mais **pas pour développer/tester
L4**. Hors box / CouchDB injoignable / auth manquante → le moteur **dégrade proprement** : `Err(String)`
lisible côté Rust, le front affiche un **bandeau « mode dégradé »** et **retombe sur le mock** (D5/D7).
Le **test réel box** est une **étape manuelle au gate** (cf. § Limite box). Push différé (commits locaux).

---

## Décisions (numérotées)

### D1 — Lecture seule via `POST /{db}/_find` (Mango), UN appel, on ne rebâtit pas le bus
- Le backend Rust expose **une** commande métier : `fetch_main_courante(filter) -> Result<Vec<FeedEvent>, String>`.
  Elle fait **un seul** `POST {couchdb_url}/{base}/_find` (Mango), en-tête `Content-Type: application/json`
  + `Authorization: Basic <base64(user:pass)>`. **Lecture seule** : **jamais** de `PUT`/`POST` document,
  **jamais** de création de base/index (l'index `idx-maincourante` existe déjà ; le créer serait de
  l'écriture → **OUT**).
- **Corps Mango** (tri `ts` desc + limite) :
  ```json
  { "selector": { "ts": { "$gt": null } },
    "sort": [ { "ts": "desc" } ],
    "limit": 200 }
  ```
  `selector` non vide requis (`ts > null` = tous les docs ayant un `ts`) ; `sort` desc s'appuie sur
  l'index `idx-maincourante`. **Limite bornée** (ex. 200, valeur fixée par Gimli, documentée) : on ne
  charge pas toute la base — c'est un **journal récent**, pas un export.
- **Filtres serveur** (quand fournis) : un filtre **agent** (et/ou **royaume**) ajoute au `selector`
  `{"agent": "<x>"}` / `{"royaume": "<x>"}` (champs indexés). Le filtre **canal** reste **côté front/UX**
  (le canal est **dérivé**, cf. D3 — il n'existe pas tel quel dans le doc, donc pas filtrable serveur au
  socle). Le filtre **projet** : cf. D3-bis (mapping projet, attention — pas trivial).
- **Pagination** : MVP = **une page** (limite 200, plus récents d'abord). La pagination `bookmark`
  CouchDB est un **raffinement différé** (cf. exclus) — on ne l'implémente pas au socle.
- **Raison** : `_find` + l'index existant donnent tri/filtre efficaces sans toucher la base ; **un seul
  appel** borne la surface (R4-like, cf. L3). Le bus MQTT et le pont **ne sont jamais touchés** (§ 4).
- **OUT explicite** : pas de souscription MQTT temps réel, pas de `_changes` feed continu, pas d'écriture,
  pas de création d'index/base, pas de design document/vue maison (l'index Mango suffit).

### D2 — Frontière backend/front : l'accès CouchDB est **côté Rust**, exposé via la façade unique
- L'appel HTTP CouchDB sort **depuis Rust** (commande Tauri), **jamais** depuis le front. Le front appelle
  `backend.fetchMainCourante(filter)` ; la fonction typée + les types miroir sont ajoutés à
  `src/api/backend.ts` (D7 socle).
- **Aucun `invoke` hors `backend.ts`**, **aucun `fetch`/client HTTP CouchDB dans le front** (CSP stricte
  L0 — un appel réseau direct depuis le front est interdit et inutile : les identifiants et le réseau
  vivent côté Rust). Critère grep en § Critères.
- **Raison** : héritage D7 (façade unique, mockable) + sécurité (les identifiants CouchDB ne transitent
  jamais par le front). **Identique au patron L3.**

### D3 — Mapping 3-canaux : dérivation depuis `role`, lecture de `meta.canal` quand présent, dégradation documentée
> **LE point dur de L4 (réserve § 10.4) — tranché ici.** Le schéma porte `role`, pas les 3 canaux.
- **Règle de dérivation du canal** (appliquée **côté Rust** dans le mapping doc→`FeedEvent`) :
  1. **Si `meta.canal` est présent et vaut une valeur connue** (`adresse|geste|pensee|agent`) → on
     l'utilise **tel quel** (forward-compatible : le jour où les pushers enrichissent `meta.canal`, le
     Cockpit l'honore sans changer de code).
  2. **Sinon, dérivation depuis `role`** (table de correspondance MVP, **assumée imparfaite**) :
     - `role: "assistant"` → **`adresse`** (parole de l'agent adressée à l'humain).
     - `role: "user"` → **`adresse`** (parole de l'humain — visible sur le canal engageant).
     - `role: "system"` → **`pensee`** (consignes/délibération non adressées).
     - `role: "unknown"` / autre → **`pensee`** (dépose par défaut, jamais d'échec).
  3. Le canal **`geste`** (actes : délégations, appels d'outils, résultats) **n'est PAS dérivable de
     `role`** au socle : il **n'apparaîtra** que via `meta.canal: "geste"` **quand les pushers
     l'émettront** (volet machine, différé). Au socle, sans `meta.canal`, le feed réel ne contient
     **pas** de canal `geste` — c'est **attendu et documenté** (pas un bug).
- **La table de mapping vit côté Rust**, dans une fonction pure **testée** (entrée `(role, meta)` → canal).
- **Raison** : on lit **ce qui existe** (§ 10.4 : « au socle, on lit ce qui existe et on enrichit
  `meta.canal` au besoin ») ; la dérivation rend les 3 canaux **présentables dès maintenant** sans
  bloquer sur un enrichissement des pushers (hors périmètre Cockpit) ; `meta.canal` est honoré **pour
  l'avenir**. La frontière § 5 est respectée : on ne fabrique pas de faux gestes.
- **À ARBITRER (Stéphane)** : la **table `role`→canal exacte** ci-dessus est une **proposition de
  cadrage** (notamment `user`→`adresse` vs un canal dédié, et `system`→`pensee`). C'est un choix de
  **sens méthodologique** → Stéphane confirme/ajuste (cf. § Points ouverts A1). Gimli implémente la table
  validée ; **la changer = éditer une seule fonction pure**, pas le reste du lot.

### D3-bis — Mapping `royaume/agent/conv_id` → champs `FeedEvent`, et la question « projet »
- **`who`** (émetteur affiché) = composé de `royaume` + `agent`, présenté **`[ROYAUME][Agent]`** (cohérent
  méthode/§ 5 ; ex. `[IAKAIDE][Aragorn]`). La **dimension agent** (filtre) porte sur `agent` (et
  optionnellement `royaume`).
- **`body`** = `content`. **`ts`** = `ts` (ISO ; l'affichage joli — heure/relatif — est de l'UX front,
  pas du backend). **`id`** = `_id` CouchDB.
- **`project`** : ⚠️ **point d'attention** — le doc iakaboxlogs **ne porte PAS de champ projet**. Il porte
  `royaume`, `agent`, `conv_id`. Au socle L4, le mapping projet est **imparfait** :
  - **Décision MVP** : `project` = **`conv_id`** (ou `royaume` à défaut) — affiché tel quel comme
    **provenance**, **sans** prétendre à un lien fort « projet du portfolio ». La main courante L4 est
    une **vue GLOBALE multi-agents** (cf. « une main courante par projet » de § 5 = **cible**, pas
    socle : la corrélation fine projet↔conversation **n'existe pas** dans le schéma actuel).
  - **À ARBITRER (Stéphane)** : faut-il, au socle, une main courante **globale** (tout le flux récent,
    MVP retenu ici) ou tenter une corrélation projet via `conv_id`/`royaume` ? La corrélation forte
    suppose une **convention de nommage** (conv_id ↔ projet) **non garantie aujourd'hui** → proposée
    **différée** (cf. A2). Le composant est aujourd'hui monté dans **Portfolio** (vue globale) — cohérent
    avec « global » au socle.
- **Raison** : on **n'invente pas** un champ projet absent du schéma (frontière § 5 : on lit ce qui
  existe). La main courante globale est **livrable immédiatement** et **utile** (dogfooding du flux réel).

### D4 — Config & secrets : URL/base CouchDB en SQLite non sensible, identifiants au keychain
- **Config SQLite non sensible** (module `config` L1) — nouvelles clés :
  - `couchdb_url` — URL HTTP (défaut documenté : `http://192.168.2.11:5984`). **Non sensible.**
  - `couchdb_db` — nom de base (défaut `conversations`). **Non sensible.**
  - **Vérifier** qu'aucune de ces clés ne matche le filtre `is_secret` (`key|token|secret|password`) —
    `couchdb_url`/`couchdb_db` passent (OK, remontent par `config_all`).
- **Identifiants CouchDB (sensibles)** : **user + password** stockés **au keychain** via
  `secrets::KeyringStore` (L0), **jamais** en SQLite, **jamais** commités, **jamais** renvoyés au front.
  Service keychain `"iakacockpit"` (cohérent L3) ; accounts **neutres** dédiés (ex. `couchdb_user`,
  `couchdb_password`). Commandes : **écrire** les identifiants (`couch_set_credentials(user, password)`)
  et **savoir si des identifiants existent** (`couch_has_credentials() -> bool`) — **jamais** de commande
  qui **lit** le mot de passe vers le front. Les identifiants ne sont lus **que** côté Rust, à l'appel.
  - *Note* : un mot de passe **vide** retire les identifiants (UX « déconnecter »), cf. patron `ai_set_key`.
- **Raison** : § 10.4 + R6/R7 (sécurité) ; **strictement le patron L3** (URL en config, secret au
  keychain, write-only côté front, présence seule exposée). CouchDB single-node exige une auth admin
  Basic → c'est un secret, traité comme tel.

### D5 — Mode dégradé obligatoire (R7) : box/CouchDB indispo → mock fallback + message clair, jamais de crash
- **Déclenchement du dégradé** (côté Rust, `fetch_main_courante` renvoie alors `Err(String)` lisible ;
  ou un flag, au choix d'implémentation — voir D7 pour le rendu front) si :
  - `couchdb_url` **vide/non configurée**, **OU**
  - identifiants **absents** (pas de credentials keychain — CouchDB admin exige l'auth), **OU**
  - CouchDB **injoignable** (timeout/refus réseau — hors box), **OU**
  - réponse **illisible** (JSON invalide / structure inattendue).
- **Comportement front** (D7) : en cas d'erreur, le composant affiche un **bandeau explicite** (ex.
  « Main courante en mode dégradé — iakaboxlogs injoignable, affichage de données simulées ») **et
  retombe sur le `MOCK_FEED`** existant (le feed n'est jamais vide/cassé). **Aucun crash**, aucune page
  blanche.
- **Flag de dev** : une variable d'environnement (ex. `IAKACOCKPIT_MC_MOCK=1`) **force** le mock (calque
  de `IAKACOCKPIT_AI_MOCK` en L3) — un dev sans box voit la main courante fonctionner.
- **Raison** : R7 (« tout fonctionne offline ; mains courantes en mode dégradé si CouchDB down ») ;
  convention `CLAUDE.md` « mocker les API en dev » ; le mock DEP-1 **devient** ce fallback (réutilisation,
  pas de code jetable).

### D6 — Mapping doc CouchDB → `FeedEvent` : fonction pure testée, contrat UX L2 préservé
- Le mapping **document CouchDB → `FeedEvent`** (D3 + D3-bis) est une **fonction pure** (Rust si le
  mapping se fait côté Rust avant sérialisation — **recommandé** ; le front reçoit déjà des `FeedEvent`
  prêts). Le type `FeedEvent` exposé au front **conserve** le contrat L2 (`id, canal, who, project, body,
  ts`), pour que `filterFeed`/`ALL_CANAUX`/`Canal` et le composant **fonctionnent sans réécriture**.
- **Recommandation forte** : faire le mapping **côté Rust** (struct `FeedEvent` sérialisée, miroir du
  type TS) → le front reste purement présentationnel, le mapping est **testé en Rust** (langage du
  parsing). Le `type Canal`/`FeedEvent` côté TS devient le **miroir** de la struct Rust (snake_case si
  champs simples — ici tous les champs sont des chaînes, pas de friction de casse).
- Le `src/mock/feed.ts` est **conservé** comme **source du fallback** (D5) et des **tests UX** (le test
  `feed.test.ts` reste vert). Si le mapping passe côté Rust, le `FeedEvent` TS est **réconcilié** entre
  `backend.ts` (type réel) et `mock/feed.ts` (même forme) — **un seul** type partagé (éviter la
  duplication : `mock/feed.ts` **importe** le type depuis `backend.ts`).
- **Raison** : on **branche** l'existant (DEP-1) au lieu de repartir de zéro ; le contrat UX testé en L2
  est préservé ; le mapping (la pièce nouvelle, risquée) est **testé** là où il vit.

### D7 — Façade front & hook : `fetchMainCourante` typé + `useMainCourante` (hooks séparés, pas de god-component)
- **`backend.ts`** : ajouter `fetchMainCourante(filter?): Promise<FeedEvent[]>` + le type `FeedEvent`
  (miroir struct Rust) + le type `MainCouranteFilter` (`{ agent?: string; royaume?: string }` — le filtre
  **canal** reste UX). Ajouter `couchSetCredentials(user, password): Promise<void>`,
  `couchHasCredentials(): Promise<boolean>`, et réutiliser `configGet/Set("couchdb_url"|"couchdb_db")`.
  **Aucun** `invoke` hors façade.
- **Hook `useMainCourante` (nouveau)** : porte l'état `{ events, loading, error, degraded }` + une action
  `refresh(filter?)`. I/O **uniquement** via `backend.ts`. En cas d'`Err`, pose `degraded: true` et
  **substitue** `MOCK_FEED` aux `events` (D5). Pas d'état métier dans `App.tsx` ni dans la vue.
- **UI** : faire évoluer `MainCouranteMock.tsx` → composant branché (renommer en `MainCourante.tsx` ou
  garder le nom, au choix Gimli — mais **plus « Mock »** par défaut) : consomme `useMainCourante`,
  conserve **les filtres de canaux** (toggle adresse/geste/pensée/agent via `filterFeed`), ajoute un
  **filtre agent** (alimente `refresh({agent})`), affiche un **bandeau « mode dégradé »** quand
  `degraded`, et l'état loading/error. Le note « Données simulées » devient **conditionnel** (visible
  uniquement en dégradé/mock).
- **Réglages** : étendre `SettingsView` avec : champ **URL CouchDB** (`couchdb_url`, non sensible, via
  `configSet`), champ **base** (`couchdb_db`, non sensible — optionnel, défaut `conversations`), et un
  bloc **identifiants CouchDB** write-only (user + password → `couchSetCredentials` ; affichage d'un
  **état** « identifiants enregistrés ✓ / aucun » via `couchHasCredentials`, **jamais** la valeur).
- **Raison** : D7 socle (façade unique) + § 4 (vue mains courantes) + cloisonnement secret (D4). **Calque
  exact** du hook/réglages L3 (`useNextStep`, champ clé write-only).

### D8 — Qualité, tests & couverture honnête (héritage L0/L1/L2/L3)
- `scripts/quality.sh` reste la porte : typecheck + ESLint + vitest + `cargo fmt --check` + `cargo clippy
  --all-targets -- -D warnings` + `cargo test`, **tout vert**.
- **Tests Rust** (logique pure + parsing, **sans réseau réel**) :
  - **mapping canal** (D3) : `(role, meta)` → canal pour `assistant/user/system/unknown` ; `meta.canal`
    présent **prime** sur `role` ; valeur `meta.canal` inconnue → retombe sur la dérivation `role`.
  - **mapping doc→`FeedEvent`** (D6) : un doc CouchDB type → `FeedEvent` correct (`who` = `[ROYAUME][Agent]`,
    `body` = `content`, `id` = `_id`, `project` = `conv_id`/fallback) ; champ manquant → valeur de
    remplacement, **jamais** de panique.
  - **parsing réponse `_find`** : sur **fixtures JSON** (`specs/mock/couchdb-find.json`), extraire le
    tableau `docs[]` → `Vec<FeedEvent>` ; réponse vide → `Vec` vide (pas une erreur) ; JSON invalide /
    structure inattendue → `Err` **lisible**. **Jamais** d'appel réseau réel en test.
  - **mode dégradé** : URL vide → `Err` lisible (ou flag dégradé) ; identifiants absents → `Err` lisible.
  - **cloisonnement identifiants** : aucune commande ne renvoie le password ; `couch_has_credentials`
    reflète présence/absence (testable via le `MockStore` de `secrets`).
- **Tests front (vitest)** : `useMainCourante` (loading→success→error/degraded sur `fetchMainCourante`
  mocké ; en `error`, `events` = `MOCK_FEED` et `degraded: true`) ; `backend.ts` appelle bien
  `fetch_main_courante`/`couch_set_credentials`/`couch_has_credentials` avec les bons args (mock de
  `call`) ; **le test `feed.test.ts` existant reste vert** (contrat `filterFeed` inchangé).
- **Couverture honnête** : l'appel réel à CouchDB **n'est pas** couvert unitairement (assumé, testé à la
  main au gate, **box requise**) ; on teste **mapping, parsing fixtures, dégradé, cloisonnement, filtres**.
  Rapporter le **chiffre réel**, sans gonflage.

---

## Périmètre

### Inclus (L4 strict)
- **Backend Rust** : module main courante (ex. `maincourante.rs`) avec : **un** appel
  `POST {couchdb_url}/{base}/_find` (Mango, tri `ts` desc, limite bornée, lecture seule, auth Basic) ;
  **mapping canal** (D3, fonction pure testée) ; **mapping doc→`FeedEvent`** (D6) ; **parsing défensif**
  `docs[]` ; **mode dégradé** (D5, `Err` lisible / flag) ; struct `FeedEvent` sérialisée.
- **Config & secrets** : clés config `couchdb_url`, `couchdb_db` (non sensibles) ; **identifiants CouchDB
  au keychain** (accounts neutres) ; commandes `couch_set_credentials`, `couch_has_credentials` (jamais de
  lecture password→front).
- **Commande Tauri** : `fetch_main_courante(filter) -> Result<Vec<FeedEvent>, String>` enregistrée dans
  `lib.rs` (`generate_handler!`). **Aucune** nouvelle dépendance Rust (`ureq` déjà présent).
- **Façade front** : `fetchMainCourante`, `couchSetCredentials`, `couchHasCredentials` typées + types
  `FeedEvent`, `MainCouranteFilter`. **Aucun `invoke`/`fetch` hors façade.**
- **Front** : hook `useMainCourante` (events/loading/error/degraded + fallback mock) ; composant main
  courante **branché** (filtres canaux conservés + **filtre agent** + bandeau dégradé) ; réglages CouchDB
  (URL/base + identifiants write-only + état). Montage dans Portfolio mis à jour.
- **Mock dégradé** : `MOCK_FEED` (DEP-1) **réutilisé** comme fallback (D5) ; fixtures `_find` dans
  `specs/mock/`. Flag dev `IAKACOCKPIT_MC_MOCK=1`.
- **Tests** : Rust (mapping canal, mapping doc, parsing fixtures, dégradé, cloisonnement) + front
  (`useMainCourante`, façade, `feed.test.ts` toujours vert) ; chaîne qualité verte ; couverture honnête.
- **(Option non bloquante)** : ajouter CouchDB `.11:5984` à la liste `services.rs` (visibilité « box
  joignable ? » dans Réglages). Cf. D5.

### Exclu (explicitement HORS L4 — autres lots / horizon / différé)
- **Remonter/réimplémenter le bus** : MQTT/Mosquitto, pont n8n/bridge, stockage CouchDB → **OUT
  absolu** (§ 4 : réutilisation pure). On **lit** seulement.
- **Écriture CouchDB** (PUT/POST doc, création base/index, design documents/vues) → **OUT** (lecture
  seule ; l'index `idx-maincourante` existe déjà).
- **Souscription temps réel** (`_changes` feed continu, live MQTT, websocket, polling auto agressif) →
  **OUT v0.1** (MVP = `refresh` sur demande / au montage ; un éventuel rafraîchissement périodique léger
  est un raffinement, pas le socle).
- **Pagination `bookmark` / infinite scroll** → **OUT v0.1** (une page récente, limite bornée).
- **Filtre *event* + fiche jalon** (vue transversale « geste » : jalon/délégations/tools ; fiche jalon
  auteur/input/rapport/verdict) → **DIFFÉRÉ** (piste rattachée L2/L4, roadmap § 2). **Dépend du traçage
  machine** (ci-dessous) : pas de données `geste` structurées tant que les pushers n'émettent pas
  `meta.canal`/`meta.event`. **Ne pas l'amorcer en L4.**
- **Volet MACHINE « tracer les délégations »** (logger chaque délégation agent→agent sur MQTT/CouchDB via
  `iakaframe-log-conversation`) → **DIFFÉRÉ** (roadmap § 2, piste rattachée). C'est de l'**émission** côté
  méthode/agents, **pas** de la lecture côté Cockpit — **hors** du périmètre lecture de L4. Le Cockpit est
  **prêt à l'afficher** (D3 honore `meta.canal: "geste"` quand il arrivera), mais **ne le produit pas**.
- **Application des filtres au PTY** (§ 5 : « filtres applicables au PTY ») → **DIFFÉRÉ** (le PTY est une
  autre source ; L4 traite la main courante CouchDB). Pas en L4.
- **« Une main courante par projet » (corrélation forte projet↔conversation)** → **DIFFÉRÉ** (le schéma ne
  porte pas de champ projet ; corrélation `conv_id`↔projet non garantie). Socle = main courante **globale**
  (D3-bis). Cf. A2.
- **Mode présentation A/C** (old-school / WhatsApp), portraits, admin-par-prompt, Obot/MCP → horizon
  (PROJET.md § 9). Aucun en L4.
- **Push / CI Forgejo** → différé (box offline) ; **commits locaux atomiques** uniquement.

> **Garde Aragorn (R1 roadmap)** : tout élément des listes DIFFÉRÉ/ANNULÉ/HORS-SCOPE **ne rentre pas** en
> L4 par effet de bord. En cas de doute, **remonter à Stéphane** avant d'élargir.

---

## Contrats d'API (commande Tauri ↔ façade `backend.ts`)

> Signatures Rust calquées sur le patron L3 (`ai.rs`). Types TS = miroir des structs `Serialize`
> (champs chaînes → pas de friction snake_case). `Result<T, String>` → côté front, rejet de promesse
> avec le message d'erreur lisible (consommé par `useMainCourante` pour basculer en dégradé).

### Main courante (lecture)
```rust
// Rust — UN appel POST /{db}/_find (Mango), lecture seule, auth Basic. Mapping canal + doc→FeedEvent
// côté Rust (D3/D6). Dégrade en Err lisible si URL/identifiants absents ou CouchDB injoignable (D5).
#[derive(Serialize, Clone)]
pub struct FeedEvent {
    pub id: String,        // _id CouchDB
    pub canal: String,     // "adresse" | "geste" | "pensee" | "agent" (dérivé, D3)
    pub who: String,       // "[ROYAUME][Agent]" (D3-bis)
    pub project: String,   // conv_id (ou royaume) — provenance, pas lien fort projet (D3-bis)
    pub body: String,      // content
    pub ts: String,        // ISO-8601 (mise en forme = UX front)
}
#[derive(Deserialize, Default)]
pub struct MainCouranteFilter {
    pub agent: Option<String>,    // filtre serveur (champ indexé)
    pub royaume: Option<String>,  // filtre serveur (champ indexé)
}
#[tauri::command]
pub fn fetch_main_courante(app: AppHandle, filter: MainCouranteFilter)
    -> Result<Vec<FeedEvent>, String>
```
```ts
// backend.ts — FeedEvent partagé avec mock/feed.ts (un seul type, pas de duplication, D6).
export interface FeedEvent {
  id: string; canal: "adresse" | "geste" | "pensee" | "agent";
  who: string; project: string; body: string; ts: string;
}
export interface MainCouranteFilter { agent?: string; royaume?: string }
export function fetchMainCourante(filter?: MainCouranteFilter): Promise<FeedEvent[]>;
```

### Identifiants CouchDB (keychain — write-only côté front, accounts neutres)
```rust
#[tauri::command] pub fn couch_set_credentials(user: String, password: String) -> Result<(), String>
#[tauri::command] pub fn couch_has_credentials() -> Result<bool, String>  // présence, jamais la valeur
// AUCUNE commande ne LIT le password vers le front. Lu seulement en interne, à l'appel /_find.
// password vide → retire les identifiants (UX « déconnecter »).
```
```ts
export function couchSetCredentials(user: string, password: string): Promise<void>;
export function couchHasCredentials(): Promise<boolean>;
```

### URL & base (config non sensible — déjà via configGet/configSet)
```ts
backend.configGet("couchdb_url");  backend.configSet("couchdb_url", "http://192.168.2.11:5984");
backend.configGet("couchdb_db");   backend.configSet("couchdb_db", "conversations");
```

### Forme de l'appel (CouchDB Mango `_find` — interne Rust, lecture seule)
```
POST {couchdb_url}/{couchdb_db}/_find
Authorization: Basic base64(user:password)
Content-Type: application/json
{ "selector": { "ts": { "$gt": null } },          // + {"agent":…} / {"royaume":…} si filtre
  "sort":     [ { "ts": "desc" } ],               // s'appuie sur l'index idx-maincourante
  "limit":    200 }

→ réponse : { "docs": [ { _id, ts, royaume, agent, conv_id, role, content, tokens, meta }, … ] }
  → mapping (D3 canal + D6 doc→FeedEvent) → Vec<FeedEvent>
```

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src-tauri/
│  ├─ Cargo.toml                # INCHANGÉ (ureq déjà présent, http LAN sans TLS) — vérifier, ne rien ajouter
│  ├─ src/
│  │  ├─ lib.rs                 # MODIF : + module maincourante ; generate_handler![ … fetch_main_courante,
│  │  │                         #          couch_set_credentials, couch_has_credentials ]
│  │  ├─ maincourante.rs        # NOUVEAU : appel UNIQUE /_find (auth Basic) + mapping canal (D3) +
│  │  │                         #          mapping doc→FeedEvent (D6) + parsing défensif + dégradé (D5)
│  │  ├─ config.rs              # MODIF (léger) : doc/usage clés couchdb_url, couchdb_db (réutilise get/set)
│  │  ├─ secrets.rs             # RÉUTILISÉ : KeyringStore pour user+password CouchDB (accounts neutres)
│  │  ├─ services.rs            # MODIF (option, non bloquant) : + CouchDB 192.168.2.11:5984 dans SERVICES
│  │  ├─ ai.rs                  # RÉFÉRENCE (patron ureq/keychain/dégradation à CALQUER) — non modifié
│  │  └─ db.rs · pathguard.rs · paths.rs   # RÉUTILISÉS (L0/L1), non modifiés
├─ src/
│  ├─ api/backend.ts            # MODIF : + fetchMainCourante, couchSetCredentials, couchHasCredentials +
│  │                            #         types FeedEvent, MainCouranteFilter
│  ├─ hooks/useMainCourante.ts  # NOUVEAU : events/loading/error/degraded + refresh(filter) (I/O via backend.ts ;
│  │                            #          fallback MOCK_FEED en dégradé)
│  ├─ mock/feed.ts              # MODIF : FeedEvent importé depuis backend.ts (type unique) ; MOCK_FEED gardé
│  │                            #         comme fallback ; filterFeed/ALL_CANAUX/Canal conservés
│  ├─ components/MainCourante.tsx  # MODIF (ex-MainCouranteMock) : branché sur useMainCourante, filtres canaux +
│  │                            #         filtre agent + bandeau « mode dégradé »
│  ├─ views/PortfolioView.tsx   # MODIF : montage du composant branché (remplace <MainCouranteMock/>)
│  ├─ views/SettingsView.tsx    # MODIF : URL/base CouchDB (config) + identifiants write-only + état
│  └─ __tests__/                # MODIF/AJOUT : useMainCourante.test.ts + backend.ts (fetch_main_courante/
│                               #         credentials) mockés ; feed.test.ts conservé vert
└─ specs/mock/                  # AJOUT : couchdb-find.json (fixtures réponse _find pour les tests parsing)
```

> **Aucune** dépendance Rust ni front nouvelle attendue (`ureq` déjà là). Si un crate manque, **le
> signaler avant** (pas d'ajout silencieux — règle L0/L1).

---

## Critères d'acceptation (vérifiables)

- [ ] **Lecture seule, UN appel, bus intact** : le code n'effectue **aucune** écriture CouchDB (pas de
      `PUT`, pas de création base/index/design doc) ; **un seul** `POST …/_find` ; **aucune** ligne MQTT,
      Mosquitto, n8n, bridge (grep : pas de `PUT`, pas de `mqtt`, pas de `_index` créé). Le bus iakaboxlogs
      n'est jamais touché.
- [ ] **Frontière respectée** : grep → **aucun** `invoke(` hors `src/api/backend.ts` ; **aucun** `fetch(`/
      client HTTP CouchDB dans `src/` (front) ; l'appel réseau est **uniquement** côté Rust. CSP **non
      touchée** (jamais `null`).
- [ ] **Identifiants au keychain, jamais ailleurs** : user/password CouchDB stockés via `secrets`/keychain ;
      grep → **aucune** trace du password en SQLite, fichier, commit, ni renvoyé au front. `config_all`
      n'expose **pas** d'identifiant. Aucune commande ne **lit** le password ; `couch_has_credentials`
      reflète seulement présence/absence.
- [ ] **URL & base en config non sensible** : `couchdb_url`/`couchdb_db` se lisent/écrivent via
      `config_get/config_set` ; ne matchent **pas** `is_secret` ; défauts documentés (`.11:5984`,
      `conversations`).
- [ ] **Mapping canal testé (D3)** : `(role, meta)` → canal pour `assistant/user/system/unknown` selon la
      table validée ; `meta.canal` présent **prime** sur `role` ; `meta.canal` inconnu → retombe sur
      `role`. Couvert par tests. **Documenté** : `geste` n'apparaît qu'avec `meta.canal` (réserve § 10.4).
- [ ] **Mapping doc→FeedEvent testé (D6)** : `who` = `[ROYAUME][Agent]`, `body` = `content`, `id` = `_id`,
      `project` = `conv_id`/fallback ; champ manquant → valeur de remplacement, **jamais** de panique.
- [ ] **Parsing `_find` testé sur fixtures** : `docs[]` → `Vec<FeedEvent>` ; réponse vide → `Vec` vide
      (pas une erreur) ; JSON invalide/structure inattendue → `Err` **lisible** ; **aucun** réseau réel en
      test.
- [ ] **Mode dégradé (R7)** : URL vide / identifiants absents / CouchDB injoignable → message lisible +
      bandeau « mode dégradé » + **fallback `MOCK_FEED`** affiché, **sans crash** ni page blanche.
      Flag `IAKACOCKPIT_MC_MOCK=1` force le mock. Timeout borné documenté.
- [ ] **UI main courante** : le composant ex-mock est **branché** sur `useMainCourante` ; filtres de
      canaux (adresse/geste/pensée/agent) **conservés et fonctionnels** (`feed.test.ts` vert) ; **filtre
      agent** alimente `refresh({agent})` ; bandeau dégradé conditionnel ; loading/error visibles. Le note
      « Données simulées » n'apparaît **qu'**en dégradé/mock.
- [ ] **UI Réglages** : champ **URL CouchDB** + champ **base** (config) ; bloc **identifiants** write-only
      (user+password → `couchSetCredentials`) ; **état** « identifiants enregistrés ✓ / aucun » via
      `couchHasCredentials` — **jamais** la valeur affichée.
- [ ] **Type FeedEvent unique** : `mock/feed.ts` **importe** `FeedEvent` depuis `backend.ts` (pas de
      duplication de type) ; le contrat L2 (`filterFeed`/`ALL_CANAUX`/`Canal`) reste intact.
- [ ] **Pas de god-component** : état main courante dans `useMainCourante` (pas dans `App.tsx`/la vue) ;
      composants présentationnels ; I/O uniquement via `backend.ts`.
- [ ] **Tests** : Rust (mapping canal, mapping doc, parsing fixtures, dégradé, cloisonnement identifiants) +
      front (`useMainCourante` loading/success/error/degraded ; façade ; `feed.test.ts` toujours vert) ;
      `npm run test` + `cargo test` **verts**.
- [ ] **Build & qualité verts** : `npm run typecheck` 0 err, `npm run lint` 0 err, `npm run build` OK,
      `cargo fmt --check`/`clippy --all-targets -- -D warnings`/`cargo test` verts ; `bash scripts/quality.sh`
      **en succès**. `npm run tauri build` OK.
- [ ] **Couverture honnête** : `cargo test`/`npm run test:coverage` rapportent le **chiffre réel** ;
      l'appel réel à CouchDB est assumé non couvert unitairement (testé à la main au gate, **box requise**),
      sans gonflage.
- [ ] **Aucun élément OUT livré** : pas d'écriture, pas de `_changes`/temps réel, pas de pagination
      bookmark, pas de filtre event/fiche jalon, pas de traçage machine, pas de filtres-au-PTY, pas de
      corrélation forte projet. (Revue de scope au gate.)
- [ ] **Test réel box (manuel, au gate)** : avec la box, identifiants renseignés en Réglages, la main
      courante affiche des **documents réels** de `conversations`, triés récents d'abord, filtrables par
      agent. (Étape **manuelle** — non couverte par les tests automatiques, cf. § Limite box.)
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ; un module +
      ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L4-1 — Réimplémenter/toucher le bus** (§ 4 roadmap, CRITIQUE). Tentation d'écrire dans CouchDB,
  créer un index, souscrire MQTT, « améliorer » le pont. *Mitigation* : D1 (lecture seule, UN `_find`,
  index existant réutilisé) ; critères grep (`PUT`, `mqtt`, `_index`) ; audit Legolas. **On lit, on ne
  produit rien.**
- **R-L4-2 — Fuite d'identifiant CouchDB** (R6, Élevé). Password en SQLite, log, ou renvoyé au front.
  *Mitigation* : D4 (keychain only, write-only côté front, aucune commande de lecture password) ; critère
  grep ; `config_all` filtre déjà `key|token|secret|password`. **Calque L3.**
- **R-L4-3 — Appel réseau direct depuis le front** (CSP/archi). *Mitigation* : D2 (appel côté Rust, façade
  unique) ; critère grep `invoke`/`fetch` ; CSP jamais touchée. **Calque L3.**
- **R-L4-4 — Mapping canal trompeur** (réserve § 10.4). `role`→canal est imparfait ; risque d'afficher un
  canal faux ou de fabriquer de faux « gestes ». *Mitigation* : D3 (table simple validée par Stéphane,
  fonction pure testée ; `geste` **uniquement** via `meta.canal` réel — pas de fabrication ; dégradation
  documentée). Frontière § 5 respectée.
- **R-L4-5 — CouchDB injoignable hors box = écran cassé** (R7). *Mitigation* : D5 (mode dégradé : `Err`
  lisible + bandeau + fallback `MOCK_FEED`, jamais de crash) + flag dev. Le dev avance hors box via le mock.
- **R-L4-6 — Réponse `_find` non standard / champ absent.** *Mitigation* : parsing défensif (`Option`,
  fallbacks), tests sur fixtures invalides ; un doc sans `meta`/`royaume` → valeurs de remplacement.
- **R-L4-7 — Scope-creep par les pistes rattachées** (filtre event/fiche jalon, traçage délégations).
  Tentation d'amorcer la fiche jalon ou de logger des délégations. *Mitigation* : ces pistes **dépendent
  du traçage machine** (émission côté agents) et sont **différées** (roadmap § 2) ; L4 = **lecture** du
  flux existant. D3 rend le Cockpit **prêt** (`meta.canal` honoré) sans rien produire. Remonter avant
  d'élargir.
- **R-L4-8 — Mauvaise attente « une main courante par projet ».** Le schéma n'a pas de champ projet.
  *Mitigation* : D3-bis (main courante **globale** au socle, `project` = `conv_id`/provenance ;
  corrélation forte différée — A2). Documenté pour éviter la déception au gate.
- **Limite box** : pas de push, pas de CI, CouchDB `.11` injoignable hors box → l'appel **réel** se valide
  **avec la box** (étape manuelle au gate) ; le reste (mapping, parsing, dégradé, cloisonnement, UI) est
  **local et offline** via fixtures/mock. **L4 dépend de la box** (roadmap § 5) : le dev se fait hors box,
  la **recette finale** suppose la box disponible.

---

## Points ouverts & dépendances

### Arbitrages — **À TRANCHER par Stéphane**
- **A1 — Table de mapping `role`→canal (D3, LE point dur).** Proposition de cadrage :
  `assistant`→`adresse`, `user`→`adresse`, `system`→`pensee`, `unknown/autre`→`pensee` ; `geste`
  uniquement via `meta.canal: "geste"` (pas dérivable de `role`). **Question à Stéphane** : valide-t-on
  cette table, ou `user` mérite-t-il un traitement distinct (canal dédié « humain ») ? `system`→`pensee`
  vs masqué ? *(Changer la table = éditer une seule fonction pure ; pas un re-cadrage du lot.)*
- **A2 — Portée socle : main courante GLOBALE vs corrélation projet (D3-bis).** Proposition : **globale**
  au socle (tout le flux récent, montée dans Portfolio), corrélation forte projet↔`conv_id` **différée**
  (suppose une convention de nommage non garantie). **Question à Stéphane** : OK pour global au socle, ou
  faut-il tenter dès L4 un filtre projet best-effort par `royaume`/`conv_id` ? *(Le filtre serveur
  `royaume`/`agent` est déjà inclus ; un filtre projet « fort » est ce qui est différé.)*
- **A3 — Volume / limite de page (D1).** Proposition : `limit: 200`, page unique, plus récents d'abord
  (volume cible iakaboxlogs ≈ 2000 msg/jour). **Question à Stéphane** : 200 suffit-il pour le dogfooding,
  ou prévoir un « charger plus » (pagination = différée par défaut) ? *(Détail réglable, pas un re-cadrage.)*

> Ces arbitrages **ne bloquent pas le cadrage** : le périmètre L4 est fermé. A1/A2/A3 sont des **réglages
> de sens** que Gimli applique une fois validés (chacun = une fonction pure / une constante), sans rouvrir
> le lot. En l'absence de réponse, Gimli implémente les **propositions par défaut** ci-dessus et les
> signale à la recette.

### Dépendances ouvertes (vers d'autres lots — signalées, non comblées en L4)
- **DEP-L4-1 — Canal `geste` réel / filtre event / fiche jalon** → suppose que les **pushers** émettent
  `meta.canal`/`meta.event` (volet machine, **différé**, roadmap § 2). L4 **honore** `meta.canal` quand
  présent (D3) mais ne le **produit** pas. La fiche jalon (auteur/input/rapport/verdict) = **différée**.
- **DEP-L4-2 — Traçage MACHINE des délégations** → **émission** côté méthode/agents via
  `iakaframe-log-conversation`, **hors** lecture L4. Quand il existera, il alimentera le canal `geste`
  **sans changement de code Cockpit** (D3 prêt).
- **DEP-L4-3 — Filtres appliqués au PTY** (§ 5) → **différé** (autre source que CouchDB). Pas en L4.
- **DEP-L4-4 — Temps réel / `_changes`** → différé (MVP = `refresh` sur demande/au montage).

---

## Notes pour Gimli

- **iakaboxlogs est en LECTURE SEULE.** Tu lis la base `conversations` via **un** `POST …/_find`. Tu
  **ne** touches **jamais** le bus MQTT, le pont, ni la base en écriture. Si l'envie te vient de créer un
  index ou de souscrire MQTT, **c'est hors scope** — remonte (garde § 4 roadmap). L'index `idx-maincourante`
  **existe déjà** (`scripts/init-couchdb.sh`).
- **CALQUE le patron L3 (`src-tauri/src/ai.rs`).** Même `ureq` (déjà présent, http LAN sans TLS), même
  parsing défensif `serde_json`, même dégradation `Err(String)` lisible, même cloisonnement keychain
  (réutilise le `MockStore` de `secrets` pour tester). Le password CouchDB est traité **exactement** comme
  la clé IA de L3 (write-only, présence seule exposée, jamais lu vers le front).
- **Le mapping canal (D3) est LE point dur et il est BORNÉ.** Une **fonction pure testée** `(role, meta)`
  → canal. `meta.canal` **prime** quand présent ; sinon table `role`→canal (valide-la avec Stéphane, A1).
  **Ne fabrique pas** de canal `geste` à partir de `role` : `geste` n'arrive que via `meta.canal` réel
  (sinon tu inventes des actes qui n'existent pas — interdit par § 5).
- **BRANCHE l'existant, ne repars pas de zéro.** `MOCK_FEED`/`filterFeed`/`ALL_CANAUX`/`Canal` (DEP-1)
  sont **réutilisés** : le mock **devient** le fallback dégradé (D5), `feed.test.ts` **reste vert**. Le
  type `FeedEvent` devient **unique** (défini côté `backend.ts`, importé par `mock/feed.ts`).
- **Mode dégradé obligatoire (R7), pas optionnel** : URL vide / pas d'identifiants / CouchDB down → bandeau
  + fallback mock, **jamais** de crash. Flag `IAKACOCKPIT_MC_MOCK=1` pour développer sans box.
- **`backend.ts` est sacré** (D7) : aucun `invoke` ni `fetch` CouchDB hors façade/Rust. L'appel HTTP vit
  **côté Rust**.
- **Recette = box requise.** L'appel réel se teste **à la main** avec la box (identifiants en Réglages) ;
  documente-le. Tout le reste (mapping, parsing, dégradé, cloisonnement, UI) se valide **hors box** via
  fixtures (`specs/mock/couchdb-find.json`) et le mock.
- **Avant de clore** : `bash scripts/quality.sh` en entier ; fais les greps toi-même (`invoke`/`fetch`
  hors façade, `PUT`, `mqtt`, `_index`, trace de password) ; vérifie chaque case des Critères. Rapporte la
  **couverture réelle** sans la maquiller.
- **Arbitrages A1–A3** (table canal ; global vs projet ; limite page) : implémente les **propositions par
  défaut**, **signale-les** à Stéphane à la recette pour ajustement — **sans** rouvrir le périmètre.
- **Gate Legolas obligatoire** après L4 (anti « Gimli solo ») : il auditera la lecture seule (pas
  d'écriture, bus intact), le cloisonnement des identifiants (keychain, jamais front/SQLite), l'appel côté
  Rust (façade unique), le mapping canal (fonction pure testée, pas de faux geste), le mode dégradé (mock
  fallback, jamais de crash), et la couverture honnête. Ne t'auto-valide pas.

---

## Estimation de temps (règle de méthode — ordre de grandeur révisable, pas un engagement)

> Posée à l'entrée du jalon de dev. **Spec fermée.**

- **Charge équivalent jour-homme** : **~1,5 à 2,5 j-h.**
  - Backend Rust (`maincourante.rs` : appel `_find` + mappings + parsing + dégradé + tests) : ~0,75–1 j-h
    — **fortement accéléré** car le patron `ai.rs` (ureq/keychain/dégradation) est **directement calquable**.
  - Config/secrets (clés couchdb + commandes credentials + tests cloisonnement) : ~0,25 j-h — calque L3.
  - Front (`useMainCourante` + composant branché + filtre agent + bandeau dégradé + réglages CouchDB +
    tests) : ~0,5–1 j-h — le composant et les filtres **existent déjà** (DEP-1), on les branche.
  - Recette manuelle box + ajustements A1–A3 : ~0,25 j-h.
- **Complexité / risque** : **MOYEN.** La plomberie (HTTP/keychain/façade/dégradé) est **éprouvée et
  réutilisable** (faible risque). Le **risque réside dans le mapping 3-canaux** (D3, sémantique imparfaite
  — réserve § 10.4) et la **recette réelle** (dépend de la box). Pas de risque architectural (façade,
  lecture seule, secrets : patrons déjà validés en gate).
- **Inconnues** (à lever) :
  1. **Disponibilité de la box** pour la recette réelle (CouchDB `.11` joignable + identifiants valides).
     Hors box → dev/recette sur fixtures + mock, test réel **reporté** au retour de la box (roadmap § 5).
  2. **Forme réelle des documents en base** : le schéma est **confirmé par le code** du pont/pusher, mais
     les **valeurs réelles** de `royaume`/`agent`/`conv_id` (et l'éventuelle présence future de
     `meta.canal`) ne se vérifient qu'**en lisant la vraie base** — à confirmer en recette.
  3. **Arbitrages A1–A3** (table canal, global vs projet, limite) : propositions par défaut posées ;
     l'ajustement par Stéphane peut faire varier marginalement la charge front (libellés/filtres).

---

## Sources (faits vérifiés le 2026-06-25)
- **Schéma & infra iakaboxlogs RÉELS (dépôt local, lecture seule)** : `/Users/sjupin/work/iakaboxlogs/`
  → `bridge/index.js` (forme exacte du doc CouchDB, `meta: body.meta || {}`), `bin/iakalog.mjs` (pusher,
  `meta: {}`), `skills/log-conversation/SKILL.md` (topic + document), `scripts/init-couchdb.sh` (base
  `conversations`, hôte `http://192.168.2.11:5984`, index Mango `idx-maincourante` sur
  `[ts,royaume,agent,conv_id]`), `specs/PROJET.md` iakaboxlogs (schéma), `.env.example` (auth Basic
  `COUCHDB_USER`/`COUCHDB_PASSWORD`).
- **CouchDB Mango `/{db}/_find`** (corps `selector`/`sort` desc/`limit`/`bookmark`, `Content-Type:
  application/json`, réponse `docs[]`) :
  [/{db}/_find — Apache CouchDB 3.5](https://docs.couchdb.org/en/stable/api/database/find.html) ·
  [Query in CouchDB: Mango Query (DEV)](https://dev.to/yenyih/query-in-apache-couchdb-mango-query-lfd) ·
  [Mango queries (PouchDB)](https://pouchdb.com/guides/mango-queries.html)
- **Réfs internes Cockpit (patrons réutilisés)** : `src-tauri/src/ai.rs` (L3 — patron `ureq`/keychain/
  dégradation/parsing à CALQUER), `src-tauri/src/{config.rs,secrets.rs,services.rs,lib.rs}`,
  `src-tauri/Cargo.toml` (`ureq` déjà présent, sans TLS), `src/api/backend.ts` (façade D7),
  `src/{mock/feed.ts,components/MainCouranteMock.tsx,views/PortfolioView.tsx}` + `src/__tests__/feed.test.ts`
  (feed DEP-1 à brancher) ; `specs/PROJET.md` § 5/3.1/3.2/4/10.4 ; `specs/roadmap.md` § 2 (L4) / § 0 / § 4 /
  § 5 / R7 ; `specs/instructions/L3-moteur-prochaine-etape.md` (patron d'instruction + arbitrages).
