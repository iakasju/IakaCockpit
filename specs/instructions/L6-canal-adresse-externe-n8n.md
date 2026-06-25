# Instruction : L6 — Canal adresse externe (SORTANT) via n8n-passerelle

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par ⚒️ Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : à valider par Stéphane** avant exécution. Doc en français, code/identifiants en anglais.
> **Lot métier #6** de MOVE 3. Antérieurs : L0 (socle, PASS), L1 (backend salvagé, PASS), L2 (vues UI,
> PASS), L3 (moteur prochaine étape), L4 (mains courantes, lecture seule). L5 = traçage MACHINE des
> délégations (tooling méthode, hors app). **Ce lot L6 est le PREMIER canal SORTANT depuis l'app.**
>
> Réf. vision : `specs/PROJET.md` § 4 (**Admin cockpit** = réglages globaux, là où vit l'« admin
> général » ; 3-canaux adresse/geste/pensée), § 5 (mains courantes ; *« l'engagement de l'humain passe
> par un agent qui vient demander sur le canal adresse »* — c'est ce que ce lot OUTILLE en sortant),
> § 3.2 (façade unique `src/api/backend.ts`), § 7 (**canaux externes = HORS SCOPE v0.1** — voir note de
> scope ci-dessous : Stéphane a donné le go pour ce lot SORTANT via passerelle unique).
> `specs/roadmap.md` § 0 (garde anti scope-creep), § 4 (réutilisation : **n8n existant détient les
> secrets Slack** ; *« câbler n8n, plutôt que des SDK côté app »*), R7 (couplage infra box → mode
> dégradé). `CLAUDE.md` (archi front D7 façade unique ; socle sécurité L0 : keychain, CSP, pathguard).
>
> **Patron à CALQUER (inspecté en lecture seule le 2026-06-25)** : `src-tauri/src/ai.rs` (L3 : `ureq`
> POST sans TLS, clé keychain write-only / présence seule exposée, parsing & dégradation défensifs,
> bascule mock par flag d'env / config vide) et `src-tauri/src/maincourante.rs` (L4 : config SQLite non
> sensible + identifiants keychain via commandes write-only, `should_degrade`, parsing défensif). Le
> client webhook n8n = **même patron** (`ureq::post`, un seul point d'appel, zéro panique).
> Façade : `src/api/backend.ts` (forme exacte des wrappers typés à imiter).
>
> **Faits n8n vérifiés sur le web (2026-06-25, cf. § Sources)** — fondent le contrat, pas des
> suppositions :
> - Le **Webhook node** expose **deux URLs** : test (`/webhook-test/…`, ne répond que workflow inactif
>   + écoute manuelle dans l'éditeur) et **production** (`/webhook/…`, répond quand le workflow est
>   **Active**). C'est la **production URL** que le Cockpit configure.
> - Réponse **par défaut 200** `{"success":true}` ; mode **« Respond Immediately »** = ack instantané
>   (« Workflow got started ») avant l'exécution des nœuds aval ; mode **« Respond to Webhook node »**
>   = la réponse (code/headers/body) est décidée par un nœud aval. **Reco : Respond Immediately** (le
>   Cockpit veut un ACK de PRISE EN CHARGE, pas d'attendre la diffusion réelle).
> - **Header Auth** = token statique attendu dans un header (ex. `X-API-Key: <secret>`), recommandé
>   pour l'intégration service-à-service. C'est l'option d'auth retenue **si** le webhook est protégé.
> - **Export/import de workflow JSON** : un workflow s'exporte en `.json` portable (UI → Download, ou
>   CLI `n8n export:workflow`), **versionnable en git**. **Les credentials sont volontairement EXCLUS
>   de l'export** (séparés pour raison de sécurité) → versionner un flow de référence **n'exporte
>   aucun secret de support**. ⇒ fonde la reco de versionner un workflow de référence (§ D7).

---

## Objectif

Permettre au Cockpit d'**émettre** les messages du **canal « adresse »** (demandes/notifications
adressées à l'humain) vers **UN seul point sortant configurable** : un **webhook n8n**. **n8n route**
ensuite vers le support actif (**Discord / Slack / MQTT**). Le Cockpit **n'implémente AUCUN support
nativement** : il POSTe un payload **canal-agnostique** et **n8n diffuse**. Même patron que L3 (un
endpoint LiteLLM qui route les modèles) : **« on câble, on ne route pas »**.

**Phase 1 = SORTANT uniquement.** Le Cockpit POSTe, n8n diffuse. Le **bidirectionnel** (entrant : Slack
events / bot Discord / topic MQTT relayés vers le Cockpit) est **Lot 2 différé** — tracé § Périmètre
exclu, **non cadré ici**.

À la fin de L6 : une **commande de façade unique** (`notify_user`) construit et POSTe le payload vers le
webhook n8n configuré, avec un **déclencheur minimal testable** côté UI (bouton dans Réglages), un
**mode mock dev** (aucun POST réel) et une **dégradation propre** (n8n injoignable → erreur lisible,
zéro crash), **sans aucun `fetch` direct depuis le front**, **sans aucun secret de support dans le
Cockpit**, **typecheck/lint/tests/clippy verts**.

---

## Contexte

### Note de SCOPE (lever l'apparente contradiction avec PROJET.md § 7)
`PROJET.md` § 7 classe les **« canaux externes de conversation »** (Slack/Discord/MQTT bidirectionnels,
mobile, vocal) **HORS SCOPE v0.1**. **Ce lot n'y contrevient pas** : Stéphane a donné un **go explicite
(2026-06-25)** pour un **SORTANT minimal via passerelle UNIQUE n8n**, qui est précisément la forme
« on câble l'existant plutôt que rebâtir » prônée § 1.1 et roadmap § 4 (*« n8n existant détient les
secrets Slack »*). On n'ouvre **NI** le bidirectionnel, **NI** le mobile/vocal, **NI** un SDK de
support. La mise à jour de `PROJET.md` § 7 (passage de ce sortant en IN) est une tâche de doc rattachée
(Nathalie), hors code.

### Ce que la vision impose / autorise
- **§ 4 — Admin cockpit** : les réglages globaux (chapeau, endpoint LiteLLM, thème, et maintenant
  l'URL du webhook n8n + support actif) vivent au **niveau chapeau**, dans la vue **Réglages**. C'est
  **l'« admin général »** du besoin. Une seule instance pilote tout le portefeuille.
- **§ 5 — engagement humain par le canal adresse** : *« si une action réelle de Stéphane est attendue,
  c'est le rôle d'un agent de venir la solliciter explicitement sur le canal adresse »*. Ce lot fournit
  le **tuyau sortant** de cette sollicitation (l'agent demande → ça sort sur Discord/Slack/MQTT).
- **§ 3.2 / D7 — façade unique** : tout `invoke` passe par `src/api/backend.ts`. Aucun `fetch` HTTP
  vers n8n dans le front (CSP stricte L0). L'appel réseau vit **uniquement côté Rust**.

### Ce qui EXISTE déjà (cartographie — lecture obligatoire avant de coder)

| Brique | Où | État | Ce qu'elle fait / ne fait pas |
|---|---|---|---|
| **n8n local (recette)** | `docker/docker-compose.yml` svc `n8n` (`iakacockpit-dev-n8n`) | **UP** `http://localhost:5678` | Conteneur prêt, volume persistant, `WEBHOOK_URL=http://localhost:5678/`. **Compte propriétaire + workflow à créer en UI par Stéphane** (acte de config, pas de code). |
| **Patron client HTTP sortant** | `src-tauri/src/ai.rs` (L3) | **implémenté, PASS** | `ureq::post` un seul point, timeout borné, `Authorization` omis si pas de clé, parsing défensif, `should_mock`, mock déterministe. **À calquer pour le notifier.** |
| **Patron config + secret keychain** | `src-tauri/src/maincourante.rs` (L4) | **implémenté, PASS** | Clés config non sensibles (`KEY_COUCHDB_URL`…), token au keychain write-only (`couch_set_credentials` / `couch_has_credentials`), `should_degrade`. **À calquer pour `n8n_webhook_url` + token webhook.** |
| **Façade front** | `src/api/backend.ts` | **implémenté** | Wrappers typés au-dessus de `call`. **Y ajouter** `notifyUser` + `n8nSetToken`/`n8nHasToken` (miroir des commandes Rust). |
| **Vue Réglages** | `src/views/` (Réglages, L2) | **implémenté** | Champs config + boutons write-only existants (clé IA, identifiants CouchDB). **Y ajouter** champ URL webhook, sélecteur support actif, champ token (write-only), **bouton « Tester l'envoi »**. |
| **n8n parle déjà Slack (méthode)** | flow/skill iakaframe côté `~/.claude` (Aragorn → Slack via n8n) | **existant** | **Point d'appui** : n8n sait déjà parler aux supports et détient les secrets. **NE PAS réimplémenter.** Côté recette locale, Stéphane construit le routage dans l'UI n8n. |

### Ce qui MANQUE (le gap réel de ce lot)
1. **Aucun client webhook n8n côté Rust** (module `notify.rs` à créer, calque `ai.rs`).
2. **Aucune commande `notify_user`** exposée + son token au keychain.
3. **Aucun champ de réglage** URL webhook / support actif / token côté front + façade + UI.
4. **Aucun contrat de payload** figé (forme exacte, ack, codes d'erreur) — défini § D1.

---

## Décisions (l'approche retenue + POURQUOI)

### D1 — Contrat Cockpit→n8n : UN `POST {n8n_webhook_url}`, payload canal-agnostique
**UN seul** appel `POST {n8n_webhook_url}` (Content-Type `application/json`). Corps :

```json
{
  "canal":   "adresse",
  "support": "slack",
  "cible":   "#iakaframe",
  "message": "Gandalf demande une validation du jalon L6.",
  "meta": {
    "royaume": "IAKACOCKPIT",
    "agent":   "Gandalf",
    "project": "iakacockpit",
    "ts":      "2026-06-25T14:30:00Z",
    "source":  "iakacockpit"
  }
}
```

- **`canal`** : porté **explicitement** (ici toujours `"adresse"` pour ce lot) pour que **geste/pensée**
  réutilisent **la même passerelle** plus tard sans rouvrir le contrat (lien futur traçage machine /
  3-canaux). **Le contrat ne se ferme PAS sur le seul `adresse`** : le champ existe, seul `adresse` est
  implémenté/testé ici.
- **`support`** : `"slack" | "discord" | "mqtt"` — porté dans le payload (cf. **D2 : le Cockpit choisit
  le support actif**). n8n route dessus.
- **`cible`** : destination logique **côté support** (canal Slack, salon Discord, topic MQTT). **Optionnel**
  (peut être vide → n8n applique sa cible par défaut). Le Cockpit ne connaît PAS la topologie des supports ;
  `cible` est une **chaîne opaque** transmise telle quelle.
- **`message`** : le texte adressé. Obligatoire, non vide (refus côté Rust si vide).
- **`meta`** : contexte d'émission (émetteur `[ROYAUME][Agent]`, projet, ts ISO-8601, source). **Aucun
  secret.** Forward-compatible (n8n peut ignorer les champs inconnus).

**Réponse attendue (ack)** : le Cockpit considère l'envoi **réussi sur HTTP 2xx** (n8n « Respond
Immediately » renvoie **200** `{"success":true}` = *« pris en charge par la passerelle »*). **L'ack
signifie « n8n a reçu et va router »**, **PAS** « le message est arrivé sur Discord/Slack/MQTT » (la
diffusion réelle est asynchrone côté n8n, hors visibilité du Cockpit en phase 1). Le Cockpit **n'attend
pas** la confirmation de diffusion.

**Codes d'erreur (dégradation, calque L3/L4)** — tout chemin renvoie `Err(String)` **lisible**, jamais
de panique :
- réseau / n8n injoignable → `"passerelle n8n injoignable : <détail>"` ;
- HTTP non-2xx → `"n8n a refusé l'envoi (HTTP <code>) : <corps tronqué>"` ;
- `message` vide → `"message vide : rien à envoyer"` (refus **avant** tout réseau) ;
- URL webhook absente / flag mock → bascule **mock** (D5), pas une erreur.

### D2 — Le support actif est choisi par le COCKPIT (Réglages → payload). [RECO — à confirmer]
**Reco retenue** : le **Cockpit** porte le réglage « support actif » dans l'**admin général** (Réglages,
clé config non sensible `n8n_active_support`) et le **passe dans le payload** (`support`). n8n route
**sur la valeur reçue**. Raison : la vision (§ 4) place l'admin général **côté Cockpit** ; Stéphane veut
choisir le support **depuis le cockpit**, pas en éditant le flow n8n. n8n reste un **routeur bête** (un
`Switch` sur `support`), reproductible et versionnable (D7).

> **À ARBITRER (Stéphane tranche)** : l'alternative est que **n8n décide** du support (le Cockpit
> n'envoie que `{canal, message, cible, meta}` sans `support`, n8n applique sa propre logique). *Écartée
> par défaut* car elle déporte un réglage « admin général » hors du Cockpit et rend le choix opaque à
> l'UI. **Reco = D2 ci-dessus (Cockpit choisit).** Si Stéphane préfère l'inverse, retirer `support` du
> payload et le sélecteur de Réglages — le reste du lot est inchangé.

### D3 — Config & secrets : URL en SQLite non sensible, token (optionnel) au keychain
Calque **strict** L4 :
- `KEY_N8N_WEBHOOK_URL = "n8n_webhook_url"` → **SQLite non sensible** (URL locale/LAN, pas un secret ;
  défaut **vide** → mode mock tant que non configurée). Vérifie qu'elle **ne matche pas** le filtre
  `is_secret` (`token|key|secret|password`) — test de garde comme L3/L4.
- `KEY_N8N_ACTIVE_SUPPORT = "n8n_active_support"` → SQLite non sensible (`slack` par défaut, ou vide).
- **Token webhook (optionnel)** : si le webhook n8n est protégé par **Header Auth**, le token vit **au
  keychain** (account neutre `n8n_webhook_token`), commandes **write-only** (`n8n_set_token` /
  `n8n_has_token`), **jamais relu vers le front**, en-tête `X-API-Key` **omis** si absent (calque exact
  du `Authorization` optionnel d'`ai.rs`). Header par défaut `X-API-Key` (constante, ajustable).
- **AUCUN secret de support (Discord/Slack/MQTT) dans le Cockpit.** Ils restent **dans n8n**. Le Cockpit
  ne connaît qu'**une** URL + **un** token de passerelle.

### D4 — Frontière émetteur (périmètre Lot 1) : commande de façade + déclencheur minimal testable
Ce lot livre :
- la **commande Rust `notify_user(message, support?, cible?, meta?)`** exposée par la **façade unique**
  (`notifyUser` dans `backend.ts`) ;
- un **déclencheur minimal testable** : **bouton « Tester l'envoi »** dans Réglages (champ message libre
  → `notifyUser`), qui affiche l'ack ou l'erreur lisible.

**HORS de ce lot (différé, tracé)** : le **câblage automatique** des messages « adresse » des agents
(niveau orchestration : un agent qui sollicite Stéphane déclenche `notify_user` automatiquement). Ça
relève du **volet 3-canaux / orchestration** (parent d'un futur lot, parent conceptuel de L5). Ici on
fournit **le tuyau et un robinet manuel testable**, pas le branchement automatique amont.

### D5 — Mock dev + mode dégradé (calque L3/L4)
- **Bascule mock** : flag d'env `IAKACOCKPIT_NOTIFY_MOCK=1` **OU** `n8n_webhook_url` vide → `notify_user`
  **ne POSTe rien**, renvoie un ack **simulé déterministe** (`provider: "mock"`, écho du payload
  construit). Permet de tester la construction du payload **sans n8n**.
- **Dégradation** : n8n configuré mais injoignable / non-2xx → `Err(String)` **lisible** (D1), **zéro
  crash**, l'UI affiche l'erreur. Aucun retry agressif (un seul POST, timeout borné ~15 s comme L4).

### D6 — L'appel réseau vit UNIQUEMENT côté Rust (D7 + CSP L0)
Aucun `fetch` vers n8n dans le front. Le front `invoke('notify_user', …)` via la façade. Le token ne
transite **jamais** par le front (write-only keychain, présence seule exposée via `n8n_has_token`).

### D7 — Versionner un workflow n8n de référence dans le repo. [RECO]
**Reco : OUI**, versionner un **export JSON** du workflow de référence (ex.
`docker/n8n/iakacockpit-adresse-sortant.workflow.json`) + un court `docker/n8n/README.md` (procédure
d'import UI : *Settings → Import from File*, activer le workflow, copier la **production URL** dans
Réglages). Raisons : (a) **reproductibilité** de la recette (re-monter la passerelle = importer le JSON)
et **documentation vivante** du contrat de routage (le `Switch` sur `support` → Slack/Discord/MQTT) ;
(b) **fait vérifié** : l'export JSON n8n **exclut les credentials** → **aucun secret de support n'entre
dans le repo**. **Construire/peaufiner le flow dans l'UI reste un acte de config** (Stéphane/recette) ;
le repo n'héberge qu'un **artefact de référence** (idéalement nettoyé des IDs/timestamps volatils pour
limiter le bruit de diff). *Si Stéphane juge l'export prématuré (flow encore mouvant), reporter ce
fichier — le code Cockpit n'en dépend pas ; seul le `README.md` de procédure devient alors le minimum.*

---

## Étapes d'implémentation

1. **Module Rust `src-tauri/src/notify.rs`** (calque `ai.rs`/`maincourante.rs`) :
   - constantes : `KEY_N8N_WEBHOOK_URL`, `KEY_N8N_ACTIVE_SUPPORT`, `SECRET_SERVICE="iakacockpit"`,
     `SECRET_ACCOUNT_TOKEN="n8n_webhook_token"`, header `X-API-Key`, `ENV_MOCK_FLAG`, timeout borné ;
   - `struct NotifyPayload` (canal/support/cible/message/meta) `Serialize` ;
   - `struct NotifyAck { ok: bool, provider: String /* "n8n" | "mock" */, http_status: Option<u16> }`
     (miroir TS) ;
   - `fn build_payload(message, support, cible, meta) -> Value` (fonction **pure testée** : `canal`
     toujours `"adresse"`, refus message vide en amont) ;
   - `fn should_mock(url)` (flag env OU url vide) — calque `should_mock` L3 ;
   - `fn read_token(store)` (présence/absence, vide = absent) — calque `read_api_key` L4 ;
   - `fn call_webhook(url, token?, payload) -> Result<NotifyAck,String>` : **UN** `ureq::post`,
     `X-API-Key` omis si pas de token, succès sur 2xx, parsing/erreurs défensifs (D1) ;
   - `fn mock_ack(payload)` déterministe ;
   - **commandes Tauri** : `notify_user(app, message, support, cible, meta)`, `n8n_set_token(value)`
     (write-only, vide = supprime), `n8n_has_token() -> bool`.
2. **Enregistrer** le module + les 3 commandes dans `src-tauri/src/lib.rs` (`mod notify;` + handler).
3. **Façade `src/api/backend.ts`** : ajouter `notifyUser(message, support?, cible?, meta?)`,
   `n8nSetToken(value)`, `n8nHasToken()` (+ types `NotifyAck` miroir), et les exposer dans l'objet
   `backend`. **Aucun `fetch` ajouté.**
4. **Vue Réglages** : champ **URL webhook** (config non sensible via `configSet`), **sélecteur support
   actif** (`slack`/`discord`/`mqtt`, via `configSet`), champ **token** (write-only → `n8nSetToken`,
   indicateur présence via `n8nHasToken`), champ **message de test** + **bouton « Tester l'envoi »**
   (→ `notifyUser`) affichant l'ack ou l'erreur.
5. **Tests Rust** (calque la densité L3/L4) : `build_payload` (canal=adresse, support porté, cible
   optionnelle, message vide refusé), `should_mock` (vrai si url vide), `read_token`
   (présence/absence/vide), garde `is_secret` sur les clés config, `mock_ack` déterministe, parsing
   d'erreur HTTP non-2xx lisible. **Mock store** réutilisé (même pattern que L3/L4).
6. **Tests front** (vitest) : façade `notifyUser`/`n8nSetToken`/`n8nHasToken` appellent `call` avec les
   bons noms d'arguments ; bouton « Tester l'envoi » de Réglages déclenche `notifyUser` et rend l'ack/erreur.
7. **(Reco D7)** Déposer `docker/n8n/iakacockpit-adresse-sortant.workflow.json` (export de référence) +
   `docker/n8n/README.md` (import UI, activer, copier la production URL). *Si reporté : au minimum le
   `README.md` de procédure.*
8. **Chaîne qualité** : `npm run typecheck && npm run lint && npm run test` + (src-tauri) `cargo fmt
   --check && cargo clippy --all-targets -- -D warnings && cargo test`. Tout vert.

## Fichiers concernés

- `src-tauri/src/notify.rs` — **nouveau** : client webhook n8n + commandes (calque `ai.rs`/`maincourante.rs`).
- `src-tauri/src/lib.rs` — `mod notify;` + enregistrement des 3 commandes dans le handler.
- `src/api/backend.ts` — `notifyUser` / `n8nSetToken` / `n8nHasToken` + types miroir, exposés dans `backend`.
- `src/views/…` (Réglages) — champs URL webhook / support actif / token + bouton « Tester l'envoi ».
- `docker/n8n/iakacockpit-adresse-sortant.workflow.json` + `docker/n8n/README.md` — **(reco D7)** flow de
  référence versionné + procédure d'import.
- `specs/PROJET.md` § 7 (doc, Nathalie) — acter le SORTANT via passerelle unique en IN (hors code).

## Comportement attendu (critères observables)

- Avec `n8n_webhook_url` configurée + n8n UP + workflow actif : « Tester l'envoi » POSTe le payload
  `{canal:"adresse", support, cible, message, meta}` et reçoit un **ack 2xx** (`provider:"n8n"`).
- Le **payload est correct** : `canal` toujours `"adresse"`, `support` = valeur de Réglages, `message`
  = saisie, `meta` porte émetteur/projet/ts ; message vide **refusé avant tout réseau**.
- `n8n_webhook_url` **vide** OU flag mock → ack **simulé** (`provider:"mock"`), **aucun POST réel**.
- n8n **injoignable** ou HTTP non-2xx → **erreur lisible**, **aucun crash**.
- **Aucun `fetch` HTTP** vers n8n dans le front ; **tout l'appel réseau est côté Rust**.
- **Token** webhook **jamais relu** vers le front (write-only ; seule la **présence** est exposée).
- **Aucun secret de support** (Discord/Slack/MQTT) présent dans le Cockpit (code/SQLite/commit).

## Vérification (gate Legolas)

- [ ] **Payload** : `build_payload` testé (canal=adresse, support porté/omis selon D2, cible optionnelle,
      message vide refusé).
- [ ] **Façade unique** : `notify_user` appelée **uniquement** via `src/api/backend.ts` ; zéro `invoke`/
      `fetch` ailleurs (grep).
- [ ] **Cloisonnement token** : keychain write-only, présence seule exposée ; clés config non sensibles
      ne matchent pas `is_secret` (test de garde).
- [ ] **Mock** : `IAKACOCKPIT_NOTIFY_MOCK=1` ou URL vide → aucun POST, ack simulé déterministe.
- [ ] **Dégradation** : n8n down / non-2xx → `Err(String)` lisible, zéro panique.
- [ ] **Qualité verte** : typecheck + lint + vitest (front) ; `cargo fmt --check` + clippy `-D warnings`
      + `cargo test` (Rust).
- [ ] Testé **dans l'app réelle** par Stéphane contre le n8n local (workflow importé, support Slack).

## Périmètre exclu (différé / tracé — NE PAS faire dans ce lot)

- **Bidirectionnel (entrant) = Lot 2 différé** : n8n tiendra l'entrant (Slack events / bot Discord /
  topic MQTT) et relaiera au Cockpit. **Non cadré ici** — instruction dédiée le moment venu.
- **Canaux `geste` / `pensee` sortants** : le contrat les **prévoit** (champ `canal`) mais **seul
  `adresse` est implémenté/testé**. Pas de code spécifique geste/pensée ici.
- **Câblage automatique** des sollicitations d'agents vers `notify_user` (niveau orchestration) :
  différé, relié au volet 3-canaux / au traçage machine (L5).
- **Aucun SDK de support** (Discord/Slack/MQTT) dans le Cockpit ; **aucun secret de support** côté app.
- **Mobile / vocal / CarPlay** (PROJET.md § 7) : hors scope, inchangé.

## À ARBITRER par Stéphane (avant exécution)

1. **D2 — qui choisit le support actif ?** Reco = **Cockpit** (Réglages → `support` dans le payload ;
   n8n route bête). Alternative = **n8n décide** (retirer `support`). *Trancher.*
2. **D7 — versionner le workflow n8n de référence dès ce lot ?** Reco = **oui** (export JSON sans
   secrets + README d'import). Alternative = **reporter** le JSON, ne garder que le README de procédure
   si le flow est jugé encore mouvant. *Trancher.*
3. **Header d'auth webhook** : `X-API-Key` par défaut (Header Auth n8n). Confirmer ou imposer un autre
   nom de header / un autre schéma (Basic). *Confirmer.*

---

## Estimation (à l'entrée du jalon de dev — règle de méthode)

- **Charge** : **~1,5 à 2,5 j-homme** (dev L6). Le **code Cockpit est petit et très balisé** (≈ 1 j) :
  `notify.rs` est un **calque presque mécanique** d'`ai.rs`/`maincourante.rs` (patron ureq + keychain +
  mock + dégradation déjà éprouvé et testé deux fois). Le reste (≈ 0,5–1,5 j) = façade + UI Réglages +
  tests + **mise au point du flow n8n en recette** (création compte, import/build du `Switch` support,
  copie de la production URL, test bout-en-bout Slack).
- **Complexité** : **faible côté code** (réutilisation d'un patron mûr, un seul POST). **Moyenne côté
  intégration** (la valeur du lot dépend d'un flow n8n correctement construit/actif).
- **Risque / inconnues** :
  - **Dépendance n8n (R7)** : le go/no-go bout-en-bout suppose n8n UP + compte créé + workflow **actif**
    (production URL, pas test URL). Mitigation : **mode mock** rend le dev/test du Cockpit indépendant
    de n8n ; la dégradation propre couvre n8n down.
  - **Forme du flow** : le routage `support → Slack/Discord/MQTT` est construit **en UI** par Stéphane ;
    seul Slack est éprouvé côté méthode (Discord/MQTT à brancher en recette). **MQTT côté n8n** peut
    demander un nœud/credential MQTT à configurer (hors code Cockpit). Inconnue **côté config**, pas
    côté app.
  - **Arbitrages D2/D7 ouverts** : impact mineur sur le périmètre code (un champ payload + un fichier
    de repo en plus ou en moins).
- **Verdict** : lot **court et peu risqué côté code** ; le risque résiduel est **opérationnel** (recette
  n8n), absorbé par mock + dégradation. **Estimation : ~2 j-homme** en cible médiane.

---

## Sources (faits n8n vérifiés sur le web, 2026-06-25)
- Webhook node (URLs test/prod, réponse 200 par défaut, modes de réponse, Header Auth) :
  [Webhook | n8n Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook) ·
  [Respond to Webhook | n8n Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook) ·
  [n8n Webhook Node: Complete Guide 2026](https://ryanandmattdatascience.com/n8n-webhook/)
- Export/import de workflow JSON, credentials exclus de l'export :
  [Export and import workflows | n8n Docs](https://docs.n8n.io/workflows/export-import/) ·
  [n8n-docs export-import.md (GitHub)](https://github.com/n8n-io/n8n-docs/blob/main/docs/workflows/export-import.md)
