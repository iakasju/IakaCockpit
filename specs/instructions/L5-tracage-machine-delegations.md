# Instruction : L5 — Traçage MACHINE des délégations (canal geste → iakaboxlogs)

> Émetteur : 🧙 Gandalf (cadrage, P1). Récepteur : ⚒️ Gimli (dev, P2).
> Statut : **à valider par Stéphane** avant exécution. Doc en français, code/identifiants en anglais.
> Périmètre : **volet MACHINE** de la piste « Tracer les délégations » rattachée à L4
> (`specs/roadmap.md` § 2). Réf. concept : `specs/PROJET.md` § 5 (canal geste), frontière gravée § 5.
>
> ⚠️ **Cette instruction ne vit PAS dans l'app IakaCockpit.** L'émission est du **tooling méthode**
> (hooks iakaframe, niveau `~/.claude/`). Le Cockpit reste **lecteur** (L4 déjà livré). Voir § 2.

---

## 1. Objectif

Rendre les **délégations entre agents** (un agent passe la main à un autre via l'outil `Task`)
**traçables côté MACHINE** dans la main courante iakaboxlogs, sur le **canal geste**
(`meta.canal: "geste"`), pour qu'elles soient **lisibles dans la main courante 3-canaux du Cockpit**
(L4) **sans aucun changement côté Cockpit**.

Distinction structurante (à ne jamais confondre — `roadmap.md` § 2 / `PROJET.md` § 5) :
- **Trace HUMAINE** = la **chaîne de badges** (`[ROYAUME][Agent] 🔵`) — **déjà en place** dans la
  méthode (rituel d'identité). **Hors périmètre ici.**
- **Trace MACHINE** = un **document iakaboxlogs** émis pour chaque délégation. **C'est CE lot.**

---

## 2. Ce qui existe DÉJÀ (cartographie gap — lecture obligatoire avant de coder)

> **Beaucoup d'existant.** Ce lot est volontairement **réduit au gap réel** : on **branche**, on ne
> réinvente rien.

| Brique | Où | État | Ce qu'elle fait / ne fait pas |
|---|---|---|---|
| **Garde du canal gestes** `delegation-guard.mjs` | `/Users/sjupin/.claude/delegation-guard.mjs` | **implémenté** (cf. instruction iakaframe `gardes-fous-canal-gestes-hooks.md`) | Câblé `PreToolUse`+`PostToolUse` matcher `Task`. **Journalise déjà l'ALLER/REFUS/RETOUR verbatim** + valide le roster + bloque hors roster. **MAIS** journal **fichier local** (`~/.claude/iakaframe-delegations.log`), append-only JSON. **N'émet RIEN vers MQTT/CouchDB.** ← **c'est le point de branchement.** |
| **Publisher** `iakalog.mjs` | `~/.claude/skills/iakaframe-log-conversation/iakalog.mjs` + `iakaboxlogs/bin/` | **implémenté** | Pousse `{role,content,ts,tokens,meta}` sur MQTT `iakaboxlogs/<royaume>/<agent>/<conv_id>`. **Zéro-dép.** **Limite** : écrit **`meta: {}` EN DUR** (ligne 39) → **ne sait PAS porter `meta.canal:"geste"`**. ← **gap n°1.** Échec propre (exit 1) si broker injoignable. |
| **Bridge** MQTT→CouchDB | `iakaboxlogs/bridge/index.js` | **implémenté** | `POST /{db}` (Basic auth, fetch) ; **propage `body.meta` tel quel** (ligne 41). Donc si `meta.canal` arrive côté push, il **arrive intact** en CouchDB. **Aucune modif nécessaire.** |
| **Auto-capture** (hooks `UserPromptSubmit`/`Stop`) | iakaboxlogs `specs/instructions/03-auto-capture-iakaframe.md` | **spécifié** | Logge user/assistant (canal **adresse**). **Déclare explicitement « Conversations agent↔agent (Tasks) : phase ultérieure »** (§ Hors scope). ← **CE lot EST cette phase ultérieure.** |
| **Lecteur Cockpit** `maincourante.rs` | `IakaCockpit/src-tauri/src/maincourante.rs` | **implémenté (L4 livré)** | **Honore déjà `meta.canal:"geste"`** (`derive_canal`, test `map_doc_honore_meta_canal_geste`). **N'émet rien.** **Aucune modif Cockpit dans ce lot.** |
| **Banc CouchDB local** | `IakaCockpit/docker/docker-compose.yml` + `docker/init-couchdb.sh` | **implémenté** | CouchDB 3 local `127.0.0.1:5984`, base `conversations`, index `idx-maincourante`, seed avec **un doc `geste`** réel. Identifiants de **test** `admin/iaka-test`. ← **cible de recette de ce lot** (box `.11` hors-ligne). |

### Verdict du gap (ce qui MANQUE réellement)

1. **`iakalog.mjs` ne sait pas porter un `meta` arbitraire** (toujours `{}`). → **gap n°1.**
2. **Rien ne relie le `delegation-guard.mjs` (qui voit les délégations) à une émission iakaboxlogs.**
   Le garde journalise en **fichier local seulement**. → **gap n°2 (le cœur du lot).**
3. **Aucun mapping délégation → document canal geste** n'est défini (qui→qui, quoi, verdict, ts). → **gap n°3.**

**Tout le reste existe et est réutilisé tel quel.** Ce lot = **3 gaps précis**, pas une refonte.

---

## 3. Décision (l'approche retenue + pourquoi)

### D1 — Où vit l'émission : dans le **garde des gestes** (hook `PostToolUse`), PAS dans le Cockpit

Le mécanisme de délégation est l'outil `Task` au niveau **orchestration** (Claude Code). Le Cockpit
**ne spawne pas d'agents** : il ne voit jamais passer une délégation. **Seul le hook `Task` la voit.**
Donc l'émission est posée **là où l'information existe** : dans `delegation-guard.mjs`, qui est **déjà
câblé** sur `PreToolUse`/`PostToolUse[Task]` et journalise déjà l'événement.

- **Pourquoi le garde et pas un nouveau hook ?** Le garde **a déjà** le payload (agent ciblé, prompt,
  réponse) et la logique fail-open. Ajouter un hook séparé dupliquerait le parsing et le risque. On
  **étend** le garde existant (réutilisation > nouvelle brique).
- **Pourquoi `PostToolUse` (le RETOUR) comme moment d'émission de référence ?** À ce moment la
  délégation est **complète** : on connaît l'agent ciblé ET le résultat (donc on peut tenter d'en
  extraire un **verdict** PASS/FAIL le cas échéant). On émet **UN** document « délégation » par cycle
  `Task` (voir D4 sur l'aller/retour).
- **Fail-open préservé** : l'émission est **best-effort et non bloquante** (comme tout le garde).
  Un échec d'émission (broker/CouchDB down) **n'interrompt jamais** la session ni le garde.

### D2 — Transport en mode dégradé : **écriture CouchDB directe** (HTTP `POST /{db}`), pas de MQTT local

La voie nominale est **MQTT → bridge → CouchDB** (box `.11`). Mais **la box `.11` est hors-ligne** et
**on ne remonte pas un bus** (frontière roadmap § 4 « ne PAS réimplémenter le bus »). Le banc local
IakaCockpit (`docker-compose.yml`) **n'expose QUE CouchDB** (5984), **pas** Mosquitto.

**Décision : le hook écrit en CouchDB par un transport sélectionnable, MQTT par défaut, HTTP direct en
fallback/recette.**

- **Transport `mqtt`** (défaut, voie nominale box) : réutilise la logique d'`iakalog.mjs` (publie sur
  le topic ; le bridge persiste). **Aucune régression** : c'est le chemin existant.
- **Transport `couchdb`** (fallback recette, box offline) : **`POST {COUCHDB_URL}/{db}`** en Basic
  auth (exactement ce que fait déjà `bridge/index.js` — pattern **éprouvé en code**, confirmé par la
  doc CouchDB bulk/write). Cible le banc local `127.0.0.1:5984` / base `conversations`.
- **Sélection** par variable d'env `IAKALOG_TRANSPORT` (`mqtt` | `couchdb`), défaut `mqtt`. En recette
  offline, Stéphane pose `IAKALOG_TRANSPORT=couchdb` + `COUCHDB_URL`/creds de test.
- **Pas de mock à écrire** : le banc CouchDB local **EST** la cible de recette réelle (un vrai CouchDB
  qui reçoit un vrai document). Le mode dégradé du Cockpit (L4) reste géré côté Cockpit, inchangé.

> **Idempotence (évite les doublons).** Le document délégation porte un **`_id` déterministe** dérivé
> de `session_id` + horodatage ALLER + agent ciblé (ex. `deleg-<session>-<tsAller>-<agent>`). En
> `POST /{db}` avec `_id` fixé, un second envoi du même événement renvoie `409 Conflict` → **traité
> comme succès silencieux** (le doc existe déjà). Évite qu'un re-déclenchement de hook crée des
> doublons. (En transport MQTT, l'`_id` voyage dans le payload ; le bridge l'honore s'il est présent —
> sinon CouchDB en génère un, comportement actuel inchangé.)

### D3 — Enrichir `iakalog.mjs` pour porter un `meta` arbitraire (gap n°1)

Ajouter un argument **`--meta '<json>'`** (et/ou `--canal <valeur>`) à `iakalog.mjs` : si fourni et
JSON valide, il **remplace** le `meta: {}` en dur. Rétro-compatible (absent → `{}` comme aujourd'hui).
Permet d'émettre `meta: { "canal": "geste", "event": "delegation", ... }`.

- **Pourquoi étendre `iakalog.mjs` plutôt qu'un nouveau publisher ?** Une seule brique de push
  (zéro-dép, déjà éprouvée). On ne duplique pas l'encodage MQTT.
- **Parité** : si le garde inline sa propre logique d'émission (pour rester autonome côté `~/.claude/`,
  cf. `03-auto-capture` qui inline pour la distribution), la **forme du document reste identique** à
  celle d'`iakalog.mjs` enrichi (même schéma `{ts,royaume,agent,conv_id,role,content,tokens,meta}`).

### D4 — Ce qu'on trace exactement : la délégation comme acte (canal geste)

**UN document par délégation** (cycle `Task` complet), schéma iakaboxlogs standard, avec :

| Champ | Valeur | Source |
|---|---|---|
| `royaume` | royaume de l'agent **émetteur** (celui qui délègue) | `IAKALOG_ROYAUME` du contexte (défaut nom repo) |
| `agent` | nom de l'agent **émetteur** | `IAKALOG_AGENT` |
| `conv_id` | `session_id` de la délégation | payload hook (`session_id`) |
| `role` | `"system"` (acte, pas une parole adressée) | constant |
| `content` | résumé lisible : `Délégation <émetteur> → <cible> : <description>` | `tool_input.subagent_type` + `description` |
| `ts` | horodatage de l'ALLER (`PreToolUse`) | garde |
| `meta.canal` | `"geste"` | constant — **clé qui fait apparaître la ligne dans le canal geste du Cockpit** |
| `meta.event` | `"delegation"` | constant (prépare le **filtre par event**, piste L4) |
| `meta.from` | agent émetteur | contexte |
| `meta.to` | agent ciblé (`subagent_type`) | `tool_input` |
| `meta.verdict` | `"PASS"` / `"FAIL"` / absent | **dérivé best-effort** du `tool_response` (RETOUR) — voir ci-dessous |
| `meta.refused` | `true` si délégation hors roster refusée (exit 2) | garde |

**Verdict (best-effort, MVP honnête).** Si la réponse de la délégation (`tool_response`) contient un
marqueur explicite (`PASS` / `FAIL` / « gate … PASS ») → `meta.verdict` renseigné. **Sinon champ
absent** — on **ne fabrique pas** de verdict. (La fiche jalon, piste L4, exploitera ce champ quand il
est présent ; son affichage **reste différé**, cf. § 6.)

**Frontière gravée respectée (`PROJET.md` § 5 / roadmap § 5) :**
- ✅ On trace **les délégations entre agents** (acte métier de l'orchestration).
- ❌ On ne trace **PAS** la plomberie de dev : **MCP/Obot**, appels d'outils techniques (`Read`,
  `Bash`, `Edit`, `WebFetch`…). **Matcher = `Task` UNIQUEMENT** — le garde est déjà scopé `Task`, donc
  cette frontière est **structurellement tenue** (aucun autre outil ne déclenche l'émission).
- ❌ On ne re-trace **PAS** ce que **git** trace déjà (commits/diffs/tags).

### D5 — Ce qu'on N'émet PAS (anti-bruit)

- **Sous-agents natifs Claude Code** (`Explore`, `Plan`, `general-purpose`, etc. — la liste `BUILTINS`
  du garde) : **PAS d'émission** (ce ne sont pas des agents-royaume de la méthode → bruit). On n'émet
  que pour les délégations vers un **agent du ROSTER iakaframe** (`odin…nathalie`).
- **Délégations refusées** (hors roster, exit 2) : émission **optionnelle**, `meta.refused:true`,
  `meta.event:"delegation_refused"`. **Décision par défaut : OUI on émet** (une tentative hors roster
  est un signal méthode utile). *À confirmer par Stéphane — voir § 7 arbitrages.*

### D6 — Borné aux projets iakaframe (cohérent avec l'auto-capture)

Comme `03-auto-capture` : l'émission ne se fait **que si l'identité iakaboxlogs est configurée**
(`IAKALOG_USER`/`IAKALOG_PASS` en MQTT, ou `COUCHDB_*` en transport couchdb). **Absente → exit 0
silencieux**, aucune émission. Garantit qu'une session « perso » hors méthode ne pollue pas la base.

---

## 4. Périmètre

### Inclus (le gap réel — 3 points)
1. **Enrichir `iakalog.mjs`** : argument `--meta`/`--canal` portant un `meta` arbitraire (gap n°1, D3).
2. **Étendre `delegation-guard.mjs`** : émettre **UN document délégation** (canal geste) par cycle
   `Task` vers un agent du roster, transport `mqtt`|`couchdb` sélectionnable, best-effort non bloquant,
   `_id` déterministe idempotent (gaps n°2 et n°3, D1/D2/D4).
3. **Recette sur le banc CouchDB local** d'IakaCockpit (D2) : la délégation apparaît en base
   `conversations` avec `meta.canal:"geste"`, lisible par L4 **sans toucher au Cockpit**.

### Exclu (différé / hors scope)
- **Toute modification du Cockpit** (`maincourante.rs`, front L4) : il **lit déjà** `meta.canal:"geste"`.
- **Affichage « fiche jalon »** et **filtre par event** côté Cockpit : **pistes L4 distinctes,
  DIFFÉRÉES** (roadmap § 2). Ce lot **prépare la donnée** (`meta.event`, `meta.verdict`) ; il **n'ouvre
  aucun écran**.
- **Traçage des outils métier autres que `Task`** (appels d'outils produit) : autre type d'event, **pas
  ce lot** (frontière `Task`-only de D4).
- **Plomberie de dev** : MCP/Obot, `Read`/`Bash`/`Edit`/git — **jamais** (frontière § 5).
- **Remontée d'un bus MQTT local** : on réutilise CouchDB direct en offline (D2).
- **Job de rétention/purge** CouchDB (déjà tracé hors-socle côté iakaboxlogs).

---

## 5. Fichiers concernés (chemins précis + action)

| # | Fichier | Action | Contenu |
|---|---|---|---|
| 1 | `/Users/sjupin/.claude/skills/iakaframe-log-conversation/iakalog.mjs` | **éditer** | Ajouter `--meta '<json>'` (+ `--canal`) → remplit `meta` au lieu de `{}`. Rétro-compatible. Optionnel : `--id <id>` pour l'`_id` déterministe. (Répliquer dans `iakaboxlogs/bin/iakalog.mjs` pour la parité — voir note.) |
| 2 | `/Users/sjupin/.claude/delegation-guard.mjs` | **éditer** | À `PostToolUse` (RETOUR), si agent ∈ ROSTER : construire le document délégation (D4) et l'**émettre** (best-effort) via le transport `IAKALOG_TRANSPORT`. Inline l'émission (MQTT minimal déjà connu d'`iakalog.mjs` + branche `POST /{db}` calquée sur `bridge/index.js`). **Fail-open total.** Le journal fichier local **reste** (inchangé). |
| 3 | `/Users/sjupin/work/iakaboxlogs/bin/iakalog.mjs` | **éditer (parité)** | Même évolution `--meta` que #1 (les deux copies doivent rester miroir). |
| 4 | `/Users/sjupin/work/iakaboxlogs/specs/instructions/03-auto-capture-iakaframe.md` | **éditer (note)** | Lever la mention « Conversations agent↔agent (Tasks) : phase ultérieure » → renvoyer vers CETTE instruction (la phase ultérieure est traitée). |

> **Parité Windows.** Le garde a une famille `.ps1` (Windows) et `.mjs` (macOS) — cf.
> `gardes-fous-canal-gestes-hooks.md` § 6. **Toute évolution de comportement doit être répliquée dans
> les deux** sous peine de divergence. Au minimum : documenter que l'émission est ajoutée côté `.mjs`
> et **tracer le portage `.ps1` comme suite** si l'environnement Windows est actif.
> **Aucun fichier IakaCockpit n'est modifié.**

---

## 6. Comportement attendu

- Un agent du roster délègue à un autre agent du roster (`Task` `subagent_type` ∈ roster) → à la fin du
  cycle, **UN document** apparaît dans `conversations` avec `meta.canal:"geste"`, `meta.event:"delegation"`,
  `meta.from`/`meta.to`, `content` lisible « Délégation X → Y : … », `role:"system"`.
- Ce document est **lu par le Cockpit (L4) sans aucune modification** : il s'affiche dans le **canal
  geste** de la main courante (la dérivation `derive_canal` l'honore déjà — test existant).
- Une délégation vers un **sous-agent natif** (`Explore`…) → **aucun document** (anti-bruit, D5).
- Une délégation **hors roster** (refus exit 2) → comportement de refus inchangé ; **un document
  `delegation_refused`** est émis (D5, par défaut OUI — à confirmer § 7).
- **Broker/CouchDB injoignable** → la délégation et la session **continuent normalement** ; **aucun
  blocage**, l'émission échoue en silence (fail-open).
- **Box offline** → en `IAKALOG_TRANSPORT=couchdb` + banc local, le document atterrit dans le CouchDB
  `127.0.0.1:5984` ; `npm run` du Cockpit pointé sur ce banc l'affiche.
- **Double déclenchement** du même événement → **un seul** document (idempotence par `_id`, `409`
  traité comme succès).

---

## 7. Points à ARBITRER (Stéphane tranche — ne pas trancher seul)

1. **Frontière d'émission — confirmer que c'est bien du tooling MÉTHODE (hook `~/.claude/`), pas l'app.**
   Cadrage propose : **émission dans `delegation-guard.mjs`** (le seul endroit qui voit les `Task`), le
   Cockpit restant pur lecteur. *Recommandation Gandalf : oui — c'est là que vit l'information.*
2. **Émettre les délégations REFUSÉES (hors roster) ?** Par défaut **OUI** (`meta.refused`,
   `event:"delegation_refused"`) — signal méthode. *À confirmer : si Stéphane préfère ne tracer que les
   délégations valides, on retire ce cas.*
3. **Transport par défaut.** Cadrage propose `mqtt` par défaut (voie nominale box) + `couchdb` en
   fallback recette offline. *Si Stéphane veut figer `couchdb` tant que la box est down, c'est un
   simple défaut d'env.*
4. **`meta.verdict` best-effort.** Cadrage propose extraction **opportuniste** (marqueur PASS/FAIL dans
   la réponse), **absent sinon**. *À confirmer qu'on n'attend pas un parsing « intelligent » du verdict
   (hors MVP, non fiable).*

---

## 8. Critères d'acceptation (gate Legolas — vérifiables)

> Tests d'émission par **stdin JSON** sur le garde, et **vérification réelle** en base CouchDB locale.
> `echo '<payload>' | node /Users/sjupin/.claude/delegation-guard.mjs ; echo "exit=$?"`

### `iakalog.mjs` enrichi (D3)
- [ ] `--meta '{"canal":"geste","event":"delegation"}'` → le document publié porte ce `meta` (plus `{}`).
- [ ] **Sans** `--meta` → `meta: {}` (rétro-compatibilité stricte, comportement actuel inchangé).
- [ ] `--meta '<json invalide>'` → **n'échoue pas durement** : retombe sur `{}` (ou message clair, sans crash).
- [ ] Les deux copies (`~/.claude/...` et `iakaboxlogs/bin/`) sont **identiques** sur cette évolution.

### `delegation-guard.mjs` — émission (D1/D2/D4)
- [ ] **Délégation roster → émission** : `PostToolUse` avec `subagent_type:"gimli"` produit **un**
      document délégation portant `meta.canal:"geste"`, `meta.event:"delegation"`, `meta.from`/`meta.to`,
      `role:"system"`, `content` lisible.
- [ ] **Sous-agent natif → PAS d'émission** : `subagent_type:"Explore"` → aucun document émis (le journal
      fichier local, lui, peut rester).
- [ ] **Refus hors roster → comportement de refus inchangé** (exit 2, stderr roster) ; émission
      `delegation_refused` conforme à l'arbitrage § 7.2.
- [ ] **Fail-open** : transport injoignable (broker/CouchDB down) → la délégation passe, **exit 0**,
      **aucun blocage**, **aucune exception** propagée.
- [ ] **Borné iakaframe** : identité iakaboxlogs absente (`IAKALOG_*`/`COUCHDB_*` non posés) → **aucune
      émission**, exit 0 (D6).
- [ ] **Idempotence** : émettre deux fois le même événement (même `session_id`+`ts`+`to`) → **un seul**
      document en base (le `409` est traité comme succès).
- [ ] **Journal fichier local préservé** : `~/.claude/iakaframe-delegations.log` continue de recevoir
      ALLER/REFUS/RETOUR comme avant (non-régression du garde existant).

### Recette bout-en-bout sur banc CouchDB local (D2)
- [ ] `docker compose -f IakaCockpit/docker/docker-compose.yml up -d couchdb` + `init-couchdb.sh` →
      base `conversations` prête.
- [ ] Avec `IAKALOG_TRANSPORT=couchdb` + `COUCHDB_URL=http://127.0.0.1:5984` + creds test, une
      délégation roster simulée → **un document visible dans Fauxton** avec `meta.canal:"geste"`.
- [ ] **Le Cockpit (L4), pointé sur ce banc local, affiche cette ligne dans le canal geste** —
      **sans aucune modification de code Cockpit** (preuve que la donnée est conforme au lecteur existant).

### Frontière (anti-scope-creep)
- [ ] **Aucun fichier IakaCockpit modifié** (le diff du lot ne touche que `~/.claude/` et `iakaboxlogs/`).
- [ ] **Seul `Task` déclenche l'émission** : un appel `Read`/`Bash`/`Edit`/`WebFetch` ne produit **aucun**
      document (frontière « pas la plomberie de dev » structurellement tenue par le matcher).

---

## 9. Risques & limites (assumés)

- **Fail-open partout** : un bug d'émission **ne casse jamais** une session, mais **un acte peut ne pas
  être tracé silencieusement**. Acceptable (la trace humaine = badges reste la garantie première).
- **Parité `.ps1`/`.mjs`** : l'émission ajoutée côté `.mjs` doit être **répliquée** côté Windows pour
  éviter une divergence de comportement de traçage selon l'OS (cf. § 5 note).
- **Dépendance box** : la voie nominale (MQTT `.11`) reste **indisponible tant que la box est offline**.
  Le fallback `couchdb` local **lève le blocage pour la recette**, mais en prod la box devra être en
  ligne (ou le transport `couchdb` pointé vers le CouchDB réel `.11`).
- **Verdict best-effort** : `meta.verdict` n'est renseigné que si un marqueur explicite existe ; ne pas
  bâtir la fiche jalon en supposant qu'il est **toujours** présent.
- **Auto-modification du harnais** : éditer `delegation-guard.mjs` ne touche **pas** `settings.json`
  (le câblage du hook existe déjà) → **pas d'étape humaine `settings.json`** dans ce lot, contrairement
  au lot gardes-fous. Vérifier seulement que `node` est dans le `PATH` du runtime au hook.

---

## 10. Notes pour Gimli (exécution)
- **Lire d'abord** `gardes-fous-canal-gestes-hooks.md` (le garde que tu étends) et `maincourante.rs`
  (le lecteur que tu **ne touches pas** mais dont la donnée doit être conforme).
- **Ne modifie AUCUN fichier IakaCockpit.** Le lot vit dans `~/.claude/` + `iakaboxlogs/`.
- **N'altère pas** le comportement de **refus** ni le **journal fichier local** du garde (non-régression).
- **Réplique** l'évolution `iakalog.mjs` dans les deux copies (parité).
- Recette : monte le banc CouchDB local d'IakaCockpit (`docker/`), pas la box.
- Clôture : commit conventional (`feat(L5): émission machine des délégations canal geste`) ;
  régénérer l'état des lieux d'iakaboxlogs/iakaframe selon la procédure `update`. Pas de version
  IakaCockpit bumpée (aucun code Cockpit touché).

---

## Sources (faits vérifiés)
- Écriture CouchDB `POST /{db}` / `_bulk_docs`, Basic auth, conflits `_rev`/idempotence (confirme D2) :
  [CouchDB 3.5 — bulk API](https://docs.couchdb.org/en/stable/api/database/bulk-api.html) ·
  [CouchDB 3.5 — Authentication](https://docs.couchdb.org/en/latest/api/server/authn.html) ·
  [CouchDB Writes: Piecemeal, Bulk, or Batch?](https://medium.com/codait/couchdb-writes-piecemeal-bulk-or-batch-8bf8ef9314e0)
- Pattern d'écriture déjà éprouvé dans le code : `iakaboxlogs/bridge/index.js` (`POST /{db}` fetch + Basic auth).
- Schéma message/topic iakaboxlogs : `iakaboxlogs/README.md` + skill `iakaframe-log-conversation`.
```
