# Instruction : L3 — Moteur « prochaine étape » IA via UN endpoint OpenAI-compat configurable (LiteLLM recommandé)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Lot métier #3** de MOVE 3 (dev), après L0 (socle, PASS), L1 (backend salvagé, PASS) et L2
> (vues UI, PASS). Réf. : `specs/PROJET.md` § 2.2 (agnostique modèle via LiteLLM), § 3.1 (stack :
> moteur IA = LiteLLM proxy OpenAI-compat + mock dev), § 3.2 (façade `src/api/backend.ts`),
> § 4 (vue Work : moteur prochaine étape = cœur), § 9 S5/S8, § 10.6 (LiteLLM à câbler) ;
> `specs/roadmap.md` § 2 (L3) + § 0 (garde « on câble, on ne route pas ») + R4/R5/R6 ;
> `CLAUDE.md` (archi front D7, socle sécurité L0). Code inspecté en lecture seule le 2026-06-25 :
> `src/api/backend.ts`, `src-tauri/src/{config.rs,secrets.rs,lib.rs}`, `src/hooks/useSettings.ts`,
> `src/views/WorkingView.tsx`, et **matériau de référence** `iakaIDE/src-tauri/src/ai.rs` (logique
> F2 à TRANSPOSER, pas à copier). Faits techniques vérifiés sur le web (cf. § Sources).
>
> **MISE À JOUR 2026-06-25 — arbitrages A1–A4 tranchés par Stéphane + précision d'archi.** Le
> « provider unique » du Cockpit **n'est pas LiteLLM en dur** : c'est **UN endpoint OpenAI-compat
> configurable** (endpoint + modèle + clé optionnelle), dont la cible peut être (1) un **compte
> cloud** (Claude/OpenAI… en OpenAI-compat ou via LiteLLM), (2) un **Ollama localhost**, (3) un
> **Ollama LAN**, (4) un **LiteLLM LAN** (passerelle canonique recommandée pour router/multi-modèle).
> Citation Stéphane : « les ia des agents sont soit un compte cloud, un ollama localhost soit lan un
> ollama ou un lan litellm ». Le principe **« on câble, on ne route pas » TIENT et se renforce** : le
> Cockpit pointe vers **UN** endpoint configuré et **ne route JAMAIS** lui-même ; si du multi-modèle
> est voulu, c'est **LiteLLM (cible 4)** qui s'en charge — pas le Cockpit. **LiteLLM reste la valeur
> recommandée/canonique** ; Ollama direct et cloud sont des cibles **légitimes du MÊME client
> OpenAI-compat**, par pure config.

---

## Objectif

Donner à IakaCockpit son **cœur de valeur** (vision F2) : un **moteur « prochaine étape »** qui,
pour un projet donné, **lit l'état réel du projet** (specs + état des lieux + état git), **assemble
un contexte**, **interroge UN modèle via UN endpoint OpenAI-compat configurable** (LiteLLM LAN
recommandé, ou Ollama localhost/LAN, ou compte cloud — au choix par config) et **rend une suggestion
d'étape lisible**. À la fin de L3, depuis la vue **Working**, on peut demander « la prochaine étape »
sur le projet de l'onglet actif et voir s'afficher une suggestion réelle (ou **mockée en dev**),
**sans aucun appel réseau direct depuis le front**, **sans secret en SQLite/commit**,
**typecheck/lint/tests/clippy verts**.

**L3 = on CÂBLE UN endpoint, on ne ROUTE pas (R4 roadmap).** Côté Cockpit, il existe **UN seul
provider abstrait : un endpoint OpenAI-compat configurable** (endpoint + modèle + clé optionnelle).
Sa cible est au choix de la config : **LiteLLM LAN** (recommandé/canonique), **Ollama localhost/LAN**,
ou **compte cloud**. Le multi-modèle (Claude, Ollama, …) est **délégué à LiteLLM** (cible 4) **quand on
le veut** — jamais codé dans le Cockpit. **Aucun provider fantôme exposé**, **aucune logique de routage
maison**, **aucun `cmd /C claude`** (la dette d'`ai.rs` iakaIDE est explicitement corrigée ici). Le
périmètre reste **v0.1 MVP** : pas d'admin-par-prompt, pas de multi-provider exposé, pas de RAG, pas
d'Obot, pas de streaming.

---

## Contexte

### Ce que la vision impose (PROJET.md)
- **§ 2.2** : l'agnosticisme modèle **passe par LiteLLM**. Le Cockpit parle à **une seule** API
  (compatible OpenAI) exposée par **LiteLLM** ; LiteLLM route vers Claude + Ollama. **On ne recode
  pas** le routage. Un **mock** local reste possible en dev (réponses simulées sans appeler LiteLLM).
- **§ 3.1** : moteur IA = **LiteLLM (proxy, API OpenAI-compat) + mock dev**.
- **§ 3.2 / D7** : tout accès aux capacités locales (y compris **appel LiteLLM**) passe par
  `src/api/backend.ts` → `invoke()`. **Pas d'appel réseau direct depuis le front** (CSP stricte).
- **§ 4** : la vue **Work** porte le moteur « prochaine étape » comme **cœur** ; la zone conversation
  de Working est aujourd'hui (L2) un **placeholder** explicitement « branché en L3 ».
- **§ 10.3** : le **RAG est ANNULÉ** — le moteur marche sur **contexte assemblé** (extraits `specs/`
  + git, cap quelques k caractères, modèle iakaIDE F2). **Ne pas réintroduire d'index vectoriel.**
- **§ 10.6** : le Cockpit n'embarque qu'**un client** vers l'endpoint LiteLLM (**URL** + **clé en
  keychain**).

### Ce que L0/L1/L2 fournissent déjà (à réutiliser, ne pas réinventer)

| Brique | Où | Ce qu'on en fait en L3 |
|---|---|---|
| `git::capture(path, &[args])` | `src-tauri/src/git.rs` (L1) | lire branche/status/log pour le contexte (déjà cross-OS) |
| `pathguard` / `paths` | `src-tauri/src/{pathguard,paths}.rs` (L0) | **valider le `path` projet** avant lecture FS (anti-traversal) |
| `secrets::{SecretStore, KeyringStore}` | `src-tauri/src/secrets.rs` (L0) | **stocker/lire la clé LiteLLM au keychain** (jamais SQLite/commit) |
| `config` + `KEY_LITELLM_ENDPOINT` | `src-tauri/src/config.rs` (L1) | lire/écrire l'**endpoint LiteLLM** (URL **non sensible**) + un **nom de modèle** par défaut |
| `db::open(app)` | `src-tauri/src/db.rs` (L1) | ouvrir la connexion config (déjà câblé) |
| Façade `backend.ts` | `src/api/backend.ts` (L1/L2) | **unique** point d'`invoke` ; on y ajoute la commande L3 typée |
| `useSettings` + clé `litellm_endpoint` | `src/hooks/useSettings.ts` (L2) | l'endpoint est **déjà** lu/écrit en réglages ; L3 ajoute **clé** + **modèle** |
| Placeholder « convph » de Working | `src/views/WorkingView.tsx` (L2) | **point d'ancrage UI** de la suggestion (remplace le placeholder par le panneau « prochaine étape ») |

### Matériau de référence : `iakaIDE/src-tauri/src/ai.rs` (TRANSPOSER, ne pas copier la dette)
`ai.rs` (F2 iakaIDE) porte **exactement la logique métier visée** — mais avec **3 dettes à corriger** :
- **`build_context(path)`** : lit `specs/PROJET.md` + `specs/etat-des-lieux.md` (chacun tronqué à
  ~2500 car. via `head`), branche/status/log git (`git::capture`). **→ SALVAGE de la logique** (avec
  validation `pathguard` ajoutée — iakaIDE ne validait pas le path).
- **`build_prompt(ctx)`** : prompt système « propose LA prochaine étape concrète, actionnable,
  priorisée, 3-5 lignes, en français ». **→ SALVAGE** (adapté au vocabulaire iakaframe / Cockpit).
- **`run_claude` (`cmd /C claude`) + `run_ollama` (POST Ollama direct) + `next_step(provider, model)`
  multi-branches** : **DETTE À SUPPRIMER**. C'est précisément le **routage** qu'on **ne refait pas**.
  **→ REMPLACÉ** par **un seul** appel `POST {endpoint}/chat/completions` (OpenAI-compat) vers
  l'endpoint configuré (LiteLLM LAN recommandé, Ollama localhost/LAN, ou cloud — même client).
  **Plus de `match provider`, plus de `cmd /C`, plus d'URL Ollama en dur.** *Note Ollama* : Ollama
  expose nativement un endpoint **OpenAI-compat** (`/v1/chat/completions`) → un Ollama localhost/LAN
  est une **cible légitime du même client**, par pure config (pas de code spécifique Ollama).

### Réseau / box
L'endpoint cible est typiquement self-hosted (LiteLLM ou Ollama sur la box / LAN, ou localhost).
**Hors box / endpoint injoignable, l'appel réel échoue** → le moteur **dégrade proprement** (message
d'erreur lisible, jamais de crash) **et le mock dev reste pleinement fonctionnel** (c'est même le mode
par défaut en dev sans endpoint configuré). Un **Ollama localhost** sans box donne un appel réel
local possible. Push différé (commits locaux atomiques).

---

## Décisions (numérotées)

### D1 — UN endpoint OpenAI-compat configurable, UN appel = `POST /chat/completions` (on câble, on ne route pas)
- Le backend Rust expose **une** commande métier : `next_step(path) -> NextStep`. **Aucun paramètre
  `provider`** (il n'y a qu'un client, vers un endpoint OpenAI-compat configuré). Le **modèle** n'est
  **pas** un paramètre de commande : c'est une **valeur de config** (D4) transmise telle quelle à
  l'endpoint (LiteLLM/Ollama/cloud).
- L'appel est **un seul** `POST {endpoint}/chat/completions` au format **OpenAI Chat Completions** :
  corps `{ "model": <modèle config>, "messages": [{role:"system",…},{role:"user",…}], "stream":
  false }`, en-tête `Authorization: Bearer <clé keychain>` (**omis si pas de clé** — cas Ollama local).
  Réponse lue en `choices[0].message.content` ; `usage.prompt_tokens` / `usage.completion_tokens` si
  présents. **L'endpoint cible est indifférent au code** : LiteLLM LAN (recommandé), Ollama
  localhost/LAN (`/v1/...`), ou cloud OpenAI-compat — **même requête, par config**.
- **Raison** : c'est l'exact besoin § 2.2 / § 10.6, **généralisé** par la précision d'archi de Stéphane
  (cf. en-tête « MISE À JOUR »). Le multi-modèle vit **dans LiteLLM** (cible 4), **quand on le veut** —
  pas dans le Cockpit. Tenir cette frontière est la mitigation **R4** (couplage/routage) et **R5**
  (agnosticisme prématuré : **une** impl client derrière l'interface).
- **OUT explicite** : pas de `match provider`, pas de second client, pas de `cmd /C claude`, pas de POST
  Ollama « spécifique » (Ollama est appelé via **son** endpoint OpenAI-compat, comme les autres), pas
  de fallback « si endpoint down alors Claude CLI ». **L'endpoint configuré EST** la couche
  d'agnosticisme ; le Cockpit ne route jamais.

### D2 — Frontière backend/front : l'appel à l'endpoint est **côté Rust**, exposé via la façade unique
- L'appel HTTP sort **depuis Rust** (commande Tauri `next_step`), **jamais** depuis le front. Le front
  appelle `backend.nextStep(path)` ; la fonction typée est ajoutée à `src/api/backend.ts` (D7).
- **Aucun `invoke` hors `backend.ts`**, **aucun `fetch`/client HTTP** vers l'endpoint IA dans le front
  (CSP stricte L0 — un appel réseau direct depuis le front est **interdit** et inutile : le secret et
  le réseau vivent côté Rust). Critère grep en § Critères.
- **Raison** : héritage D7 (façade unique, mockable, pas de couplage diffus) + sécurité (la clé ne
  transite jamais par le front ; elle reste côté Rust/keychain).

### D3 — Contexte assemblé (RAG ANNULÉ) : salvage de `build_context`, **path validé**
- `next_step(path)` **valide d'abord** le `path` (doit être un dossier ; durci via `pathguard`/`paths`
  — iakaIDE ne le faisait pas, on corrige). Un path invalide / hors périmètre → `Err` lisible.
- Contexte assemblé (transposé d'`ai.rs`) : **nom du projet** + **extrait `specs/PROJET.md`** (tronqué
  ~2500 car.) + **extrait `specs/etat-des-lieux.md`** (tronqué ~2500 car.) + **git** (branche, `status
  --short`, `log -5 --format=%cs %s`) via `git::capture`. Fichiers absents → texte de remplacement
  explicite (`"(pas de specs/PROJET.md)"`, etc.), **jamais** d'échec.
- **Cap de taille** : conserver le `head(txt, max)` (troncature `…(tronqué)`). **Pas d'index vectoriel,
  pas de RAG** (§ 10.3). Le contexte reste un **assemblage borné** de quelques k caractères.
- **Raison** : c'est le modèle F2 éprouvé, déjà aligné avec « le moteur marche sur contexte assemblé »
  (§ 10.3). On garde la logique, on ajoute la **validation de chemin** manquante.

### D3-bis — Prompt système **conscient de la méthode iakaframe** (A4 tranché)
- **A4 TRANCHÉ** : le prompt système n'est **pas** le générique « assistant de pilotage de projet »
  d'iakaIDE — il est **conscient de la méthode iakaframe**. Il doit demander **LA prochaine étape
  concrète, actionnable, priorisée (3–5 lignes, français, sans préambule)** **en mobilisant le
  vocabulaire de la méthode** : les **lots** (L0/L1/L2…), les **jalons** et **gates** (cadrage Gandalf
  → dev Gimli → verdict Legolas), les **instructions** `specs/instructions/`, l'**état des lieux**, et
  l'état git (sale/en avance → le dire). Objectif : une suggestion qui parle « next instruction à
  rédiger / prochain lot à cadrer / jalon à faire valider », pas une réponse hors-sol.
- **Gimli propose le texte exact** du prompt ; **Stéphane l'ajuste** (le ton/contenu fin reste validé
  par l'humain — c'est le sens d'A4). Le prompt vit dans le module moteur (constante/fonction
  `build_prompt`), testable (au moins : non vide, mentionne la notion de prochaine étape).
- **Raison** : la valeur du moteur tient à la **pertinence méthodologique** de la suggestion ; un prompt
  conscient des lots/jalons/instructions rend la « prochaine étape » directement exploitable dans le
  cycle iakaframe.

### D4 — Configuration de l'endpoint IA : **endpoint + modèle en SQLite non sensible, clé au keychain**
> **Endpoint OpenAI-compat générique** : les clés `litellm_*` sont **conservées telles quelles**
> (existantes en L1/L2 — on ne casse pas le schéma), mais elles désignent **un endpoint OpenAI-compat
> quelconque**, pas exclusivement LiteLLM. Le **libellé UI** (D7) parle d'« endpoint IA (OpenAI-compat
> — LiteLLM recommandé) ». La clé keychain est documentée comme **générique** (sert pour LiteLLM
> `master_key` **ou** une clé cloud ; **un Ollama localhost/LAN n'en a pas besoin**).
- **Endpoint** (`litellm_endpoint`) : **URL non sensible** → SQLite via le module `config` L1 (clé
  `KEY_LITELLM_ENDPOINT` **déjà** existante, **déjà** lue/écrite par `useSettings` en L2). Rien à
  changer côté schéma. La cible peut être LiteLLM LAN, Ollama localhost (`http://localhost:11434/v1`),
  Ollama LAN, ou un endpoint cloud OpenAI-compat — **au choix par config**.
- **Modèle par défaut** : **nouvelle clé config non sensible** `litellm_model` (valeur transmise telle
  quelle à l'endpoint — alias LiteLLM, nom de modèle Ollama, ou nom de modèle cloud). Stockée en SQLite
  (non sensible). Défaut documenté **A1 tranché : un alias/modèle Ollama self-hosted** (cf. D4-bis).
- **Clé IA** (optionnelle) : **AU KEYCHAIN** via `secrets::KeyringStore` (L0), **jamais** en SQLite,
  **jamais** commitée, **jamais** renvoyée au front. **Optionnelle par nature** : un LiteLLM sans
  `master_key` et **surtout un Ollama localhost/LAN** n'en exigent pas → l'en-tête `Authorization` est
  **omis** quand aucune clé n'est enregistrée. Service/account keychain fixés (ex. service
  `"iakacockpit"`, account `"ai_api_key"` — **nom neutre**, pas « litellm » exclusivement, puisqu'il
  sert aussi le cloud). Deux commandes dédiées : **écrire** la clé (`ai_set_key(value)`) et **savoir si
  une clé existe** (`ai_has_key() -> bool`) — **jamais** de commande qui **lit** la clé vers le front.
  La clé n'est lue **que** côté Rust, au moment de l'appel.
- **Garde `is_secret`** : le filtre `config_all` exclut déjà `token|key|secret|password`. La clé
  `litellm_model` **ne matche pas** ce filtre (OK, non sensible → remonte par `config_all`). Vérifier
  qu'aucune clé config introduite ne contienne accidentellement un de ces mots.
- **Raison** : § 10.6 (URL en config, clé en keychain) + R6 (sécurité) + précision d'archi (endpoint
  configurable, pas LiteLLM en dur). Cloisonnement strict : le front sait **si** une clé existe (pour
  l'UX réglages), il ne la **voit** jamais.

### D4-bis — Clés de config & défauts (contrat fermé)
- **Config SQLite non sensible** (module `config` L1) :
  - `litellm_endpoint` *(existant)* — URL de l'endpoint OpenAI-compat (LiteLLM LAN, Ollama
    `http://localhost:11434/v1`, etc.). Défaut si absent : **chaîne vide** → le moteur bascule en
    **mock** (cf. D5/D6), pas de crash.
  - `litellm_model` *(nouveau)* — nom/alias de modèle transmis tel quel à l'endpoint. **Défaut A1
    tranché : un modèle/alias Ollama self-hosted** (souvent localhost, **pas de clé requise**). Gimli
    propose la valeur exacte (ex. un modèle Ollama réellement disponible côté Stéphane) ; **Claude ou
    autre = simple changement de config** (endpoint LiteLLM cloud + modèle + clé), sans toucher au code.
- **Keychain (secrets, L0)** : clé IA optionnelle (service/account fixés, **nom neutre** type
  `ai_api_key`). **Jamais** en SQLite. **Souvent absente** (Ollama local).
- **Contrat de cloisonnement** : aucune commande ne renvoie la clé. Le front dispose au plus de
  `ai_has_key(): boolean`.

### D5 — Mock dev obligatoire (réponses simulées sans appeler l'endpoint IA) — **A2 tranché**
- Le moteur **doit** offrir un **mode mock** : une `NextStep` simulée **déterministe**, **sans aucun
  appel réseau**, dérivée du contexte assemblé (ex. injecte le nom du projet + l'état git lu) pour
  rester lisible et testable. Marqué **explicitement** comme simulé (`provider: "mock"` dans la
  réponse, et/ou un flag).
- **Déclenchement du mock — A2 TRANCHÉ : bascule IMPLICITE, zéro toggle UI.** Le mock s'active si
  **(a)** un flag de dev est posé (variable d'environnement `IAKACOCKPIT_AI_MOCK=1`), **OU** **(b)**
  l'`litellm_endpoint` est **vide/non configuré**. Sinon → **appel réel** vers l'endpoint configuré.
  **Pas de toggle UI** en Réglages (décision Stéphane : MVP, zéro UI en plus). **Raison** : un dev sans
  box (ou sans endpoint) obtient une suggestion utilisable **sans** réseau ; convention « mocker les
  API en dev » respectée.
- Le mock vit dans un **module/chemin clair** (`specs/mock/` pour des fixtures de référence si utile,
  et la logique de simulation dans le module Rust du moteur, isolée et testée). **Aucune** dépendance
  réseau dans le chemin mock.
- **Raison** : convention `CLAUDE.md` (« en dev, mocker les API coûteuses/limitées ») + testabilité
  (le mock rend la commande testable sans endpoint IA).

### D6 — Dégradation propre & erreurs lisibles (jamais de crash)
- Endpoint configuré mais **injoignable** (hors box, endpoint down) → `Err(String)` **lisible**
  (« endpoint IA injoignable : … ») remontée au front, qui l'affiche **sans crash**. Idem réponse vide
  / JSON illisible → message clair. Timeout **borné** (ex. 60–180 s, valeur à fixer par Gimli,
  documentée).
- Aucune erreur ne doit faire planter la commande Tauri ni l'app : tout chemin d'erreur renvoie
  `Result::Err` avec un message utilisateur.
- **Raison** : R7 (couplage infra box) — « tout fonctionne offline » ; le moteur dégrade, le mock prend
  le relais en dev.

### D7 — Façade front & hook : `nextStep` typé + `useNextStep` (hooks séparés, pas de god-component)
- **`backend.ts`** : ajouter la fonction typée `nextStep(path: string): Promise<NextStep>` + le type
  `NextStep` (miroir de la struct Rust, snake_case). Ajouter aussi `aiSetKey(value: string)`,
  `aiHasKey(): Promise<boolean>` (noms **neutres** — la clé sert LiteLLM **ou** cloud, cf. D4), et
  `configGet/Set("litellm_model")` réutilisé (pas de nouvelle fonction config nécessaire —
  `configGet`/`configSet` existent). **Aucun** `invoke` hors façade.
- **Hook `useNextStep` (nouveau)** : porte l'état `{ suggestion, provider, tokensIn, tokensOut, loading,
  error }` + une action `request(path)`. I/O **uniquement** via `backend.ts`. Pas d'état métier dans
  `App.tsx` ni dans la vue (héritage D6 L2 : composants présentationnels).
- **UI** : remplacer le **placeholder « convph »** de `WorkingView` (L2) par un **panneau « prochaine
  étape »** : un bouton « Proposer la prochaine étape » sur le projet de l'onglet actif → affiche la
  suggestion (texte lisible), l'état loading, l'erreur le cas échéant, et le `provider` (réel `mock`/
  modèle) + tokens si présents. **Pas** de thread conversationnel complet (ça reste L4 — mains
  courantes) : L3 = **une suggestion par demande**, affichée proprement.
- **Réglages** : étendre la vue Réglages (cockpit minimal L2) avec : un libellé **« Endpoint IA
  (OpenAI-compat — LiteLLM recommandé) »** au-dessus du champ `litellm_endpoint` existant (préciser que
  la cible peut être LiteLLM LAN / Ollama localhost-LAN / cloud), un champ **modèle** (`litellm_model`,
  non sensible, via `configSet`) et un champ **clé IA** (write-only : saisie → `aiSetKey` ; affichage
  d'un **état** « clé enregistrée ✓ / aucune clé » via `aiHasKey`, **jamais** la valeur ; **mentionner
  que la clé est facultative — inutile pour un Ollama local**).
- **Raison** : D7 socle (façade unique) + § 4 (le moteur s'ancre dans Work) + cloisonnement clé (D4) +
  précision d'archi (endpoint OpenAI-compat configurable, libellé non « LiteLLM-exclusif »).

### D8 — Dépendance Rust HTTP : ajouter un client **bloquant léger** (`ureq`), pas de routage — **A3 tranché**
- Le backend n'a **aucun** crate HTTP aujourd'hui (`Cargo.toml` : tauri, serde, rusqlite, portable-pty,
  keyring, dirs). Ajouter **`ureq`** (client HTTP **synchrone**, JSON via la feature `json`) — c'est le
  choix **léger** confirmé 2026 pour un POST JSON bloquant dans une commande Tauri (pas de runtime
  async tokio à traîner), et **c'est déjà ce qu'utilisait iakaIDE**. `reqwest` (async, tire tokio) est
  **écarté** comme sur-dimensionné pour un unique POST. **Signaler** l'ajout de dépendance (pas
  d'ajout silencieux — règle L0/L1) ; ne **rien** ajouter d'autre.
- **TLS — A3 TRANCHÉ : `http://` LAN pour le MVP, PAS de feature TLS `ureq` pour l'instant.** Les cibles
  visées (LiteLLM LAN, Ollama localhost/LAN) sont en `http://` — **ne pas** activer de feature TLS
  maintenant. Si un endpoint **cloud `https://`** devient nécessaire plus tard, c'est un **raffinement
  ultérieur** (activer la feature TLS de `ureq`), **hors L3**. Documenter cette limite (un endpoint
  `https://` ne fonctionnera pas tant que la feature TLS n'est pas activée).
- **Raison** : un seul appel HTTP bloquant ; minimiser la surface et le temps de build (couverture
  honnête, pas de sur-ingénierie) ; cibles MVP en clair sur le LAN.

### D9 — Qualité, tests & couverture honnête (héritage L0/L1/L2)
- `scripts/quality.sh` reste la porte : typecheck + ESLint + vitest + `cargo fmt --check` + `cargo
  clippy --all-targets -- -D warnings` + `cargo test`, **tout vert**.
- **Tests Rust** (logique pure + mock, **sans réseau réel**) :
  - `build_context` : assemble nom + extraits + git ; fichiers absents → textes de remplacement (pas
    d'échec) ; troncature `head` respectée.
  - **parsing de la réponse OpenAI-compat** : `choices[0].message.content` extrait ; `usage` mappé ;
    réponse vide / JSON invalide → `Err` lisible. **Tester sur des fixtures JSON** (`specs/mock/` ou
    inline), **jamais** d'appel réseau réel en test.
  - **mock du moteur** : `next_step` en mode mock renvoie une `NextStep` déterministe `provider:"mock"`
    sans réseau.
  - **validation de path** : un `path` inexistant / hors périmètre → `Err`.
  - **cloisonnement clé** : aucune commande ne renvoie la clé ; `ai_has_key` reflète présence/
    absence (testable via le `SecretStore` mock du module `secrets`, cf. son `MockStore`).
- **Tests front (vitest)** : `useNextStep` (loading→success→error sur `nextStep` mocké) ; `backend.ts`
  appelle bien `next_step`/`ai_set_key`/`ai_has_key` avec les bons args (mock de `call`) ;
  réglages : `aiHasKey` reflété en UI sans jamais lire la valeur. **`backend.ts` reste mockable**
  (aucun test ne touche Tauri ni réseau).
- **Couverture honnête** : l'appel réseau réel à l'endpoint IA **n'est pas** couvert unitairement
  (assumé, testé à la main au gate, box/endpoint requis) ; on teste **le parsing, le mock, la
  validation, le cloisonnement**. Rapporter le **chiffre réel**, sans gonflage.

---

## Périmètre

### Inclus (L3 strict)
- **Backend Rust** : module moteur (ex. `ai.rs` **réécrit propre** sur L0/L1, ou `next_step.rs`) avec
  `build_context(path)` (validé `pathguard`), `build_prompt(ctx)` **conscient de la méthode iakaframe**
  (A4, cf. D3-bis), **un** appel `POST {endpoint}/chat/completions` (OpenAI-compat) vers l'endpoint
  configuré (LiteLLM/Ollama/cloud), parsing `choices[0].message.content` + `usage`, **mode mock** (D5),
  erreurs lisibles (D6). Struct `NextStep` sérialisée.
- **Config & secret** : clé config `litellm_model` (non sensible, défaut Ollama self-hosted — A1) ;
  **clé IA optionnelle au keychain** via `secrets` L0 ; commandes `ai_set_key`, `ai_has_key` (jamais de
  lecture clé→front).
- **Commande Tauri** : `next_step(path) -> Result<NextStep, String>` enregistrée dans `lib.rs`
  (`generate_handler!`). `ureq` ajouté à `Cargo.toml` (D8, `http://` LAN — A3).
- **Façade front** : `nextStep`, `aiSetKey`, `aiHasKey` typées dans `backend.ts` + type `NextStep`.
  **Aucun `invoke`/`fetch` hors façade.**
- **Front** : hook `useNextStep` ; panneau « prochaine étape » dans **Working** (remplace le
  placeholder « convph ») ; libellé **« Endpoint IA (OpenAI-compat — LiteLLM recommandé) »** + champs
  **modèle** + **clé optionnelle (write-only)** dans **Réglages**.
- **Mock dev** : suggestion simulée déterministe sans réseau, marquée `provider:"mock"`, activée si
  endpoint vide ou flag de dev (D5). Fixtures de référence éventuelles dans `specs/mock/`.
- **Tests** : Rust (contexte, parsing, mock, validation path, cloisonnement clé) + front (`useNextStep`,
  façade) ; chaîne qualité verte ; couverture honnête.

### Exclu (explicitement HORS L3 — autres lots / horizon)
- **Multi-provider exposé / routage côté Cockpit / `match provider` / `cmd /C claude` / POST Ollama
  « spécifique »** → **OUT** (R4). L'endpoint configuré (LiteLLM cible 4 quand on veut router) **est**
  la couche d'agnosticisme ; ajouter un modèle = **config** (endpoint/modèle/clé), **pas** de code
  Cockpit. *(Ollama n'a pas de code dédié : il est appelé via son endpoint OpenAI-compat.)*
- **Endpoint cloud `https://` / TLS** → **OUT v0.1** (A3 : `http://` LAN seulement ; feature TLS `ureq`
  = raffinement ultérieur).
- **Streaming** (`stream:true`, affichage token-par-token) → **OUT v0.1** (réponse complète en un coup ;
  plus simple à mocker/tester). Raffinement ultérieur si besoin.
- **RAG / index vectoriel / embeddings** → **ANNULÉ** (§ 10.3). Le moteur reste sur **contexte
  assemblé borné**.
- **Thread conversationnel / mains courantes 3-canaux / historique des suggestions** → **L4**
  (iakaboxlogs). L3 = **une suggestion par demande**, affichée ; pas de fil persistant. (DEP-1.)
- **Titrage d'onglet PTY `[ROYAUME][Agent]` + état agent** → suppose moteur d'agents + 3-canaux ;
  resté OUT depuis L2 (DEP). L3 **ne** l'ouvre pas.
- **Admin-par-prompt / édition `agent.md` / fiches agents / assemblage team** → horizon (§ 9 OUT).
  L3 **ne** touche pas à la suite admin.
- **Lien Obot / MCP** → différé (§ 9). Aucun MCP en L3.
- **Coût / quotas / budget tracking détaillé** → **OUT v0.1** (on lit `usage` si présent et on
  l'affiche ; pas de comptabilité ni de plafond). Le champ coût LiteLLM n'est **pas garanti** dans la
  réponse standard → ne pas en dépendre.
- **Estimation de tokens côté front, sélecteur de modèle riche, multi-clés** → OUT (un modèle config,
  une clé). 
- **Push / CI Forgejo** → différé (box offline) ; **commits locaux atomiques** uniquement.

> **Garde Aragorn (R1 roadmap)** : tout élément des listes DIFFÉRÉ/ANNULÉ/HORS-SCOPE **ne rentre pas**
> en L3 par effet de bord. En cas de doute, **remonter à Stéphane** avant d'élargir.

---

## Contrats d'API (commande Tauri ↔ façade `backend.ts`)

> Signatures Rust = logique F2 **transposée propre** sur le socle L0/L1. Types TS = miroir des structs
> `Serialize` (snake_case par défaut, zéro `rename` — cohérent L1). Toute commande renvoyant
> `Result<T, String>` → côté front, rejet de promesse avec le message d'erreur lisible.

### Moteur « prochaine étape »
```rust
// Rust — UN endpoint OpenAI-compat configurable, UN appel /chat/completions. Pas de paramètre
// provider/model (le modèle vient de la config litellm_model ; la clé OPTIONNELLE du keychain).
// Mock si endpoint vide / flag dev (A2). Cible indifférente : LiteLLM / Ollama / cloud (par config).
#[derive(Serialize, Clone)]
pub struct NextStep {
    pub suggestion: String,          // texte lisible (3-5 lignes)
    pub provider: String,            // "litellm" (réel — endpoint configuré) | "mock"
    pub model: Option<String>,       // modèle effectif (litellm_model), info d'affichage
    pub tokens_in: Option<u32>,      // usage.prompt_tokens si présent
    pub tokens_out: Option<u32>,     // usage.completion_tokens si présent
}
#[tauri::command]
pub fn next_step(app: AppHandle, path: String) -> Result<NextStep, String>
```
```ts
// backend.ts
export interface NextStep {
  suggestion: string;
  provider: string;                 // "litellm" | "mock"
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}
export function nextStep(path: string): Promise<NextStep>;
```
> *Note `provider`* : la valeur réelle peut rester `"litellm"` (l'endpoint OpenAI-compat configuré),
> ou refléter la cible effective si Gimli préfère — non bloquant. Seul `"mock"` est contractuel pour
> le mode simulé.

### Clé IA optionnelle (keychain — write-only côté front, nom neutre)
```rust
#[tauri::command] pub fn ai_set_key(value: String) -> Result<(), String>   // écrit au keychain
#[tauri::command] pub fn ai_has_key() -> Result<bool, String>              // présence, jamais la valeur
// AUCUNE commande ne LIT la clé vers le front. Elle n'est lue qu'en interne, au moment de l'appel.
// OPTIONNELLE : un Ollama localhost/LAN n'a pas de clé → en-tête Authorization omis.
```
```ts
export function aiSetKey(value: string): Promise<void>;
export function aiHasKey(): Promise<boolean>;
```

### Endpoint & modèle (config non sensible — déjà via configGet/configSet)
```ts
// litellm_endpoint : déjà géré par useSettings (L2) — un endpoint OpenAI-compat (LiteLLM LAN,
//   Ollama http://localhost:11434/v1, Ollama LAN, ou cloud). litellm_model : nouvelle clé non sensible.
backend.configGet("litellm_model"); backend.configSet("litellm_model", "<modèle Ollama self-hosted>"); // A1
```

### Forme de l'appel (OpenAI Chat Completions — interne Rust, endpoint configurable)
```
POST {litellm_endpoint}/chat/completions      // {litellm_endpoint} = LiteLLM LAN | Ollama | cloud
Authorization: Bearer {clé keychain}          // en-tête OMIS si pas de clé (cas Ollama local)
Content-Type: application/json
{ "model": "{litellm_model}",
  "messages": [ {"role":"system","content": <prompt système conscient méthode iakaframe — A4>},
                {"role":"user","content": <contexte assemblé>} ],
  "stream": false }

→ réponse : choices[0].message.content (suggestion) ; usage.prompt_tokens / usage.completion_tokens (si présents)
```

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src-tauri/
│  ├─ Cargo.toml              # MODIF : + ureq (feature json ; PAS de TLS en MVP — A3 http LAN) — SIGNALER l'ajout
│  ├─ src/
│  │  ├─ lib.rs               # MODIF : + module moteur ; generate_handler![ … next_step, ai_set_key, ai_has_key ]
│  │  ├─ ai.rs (ou next_step.rs)  # NOUVEAU : build_context (path validé pathguard) + build_prompt (méthode iakaframe — A4) +
│  │  │                       #           appel UNIQUE /chat/completions (endpoint configuré) + parsing + MOCK + erreurs lisibles
│  │  ├─ config.rs            # MODIF (léger) : doc/usage de la clé litellm_model (réutilise get/set L1)
│  │  ├─ secrets.rs           # RÉUTILISÉ : KeyringStore pour la clé IA optionnelle (account neutre ai_api_key ; pas de modif structurelle)
│  │  ├─ git.rs · pathguard.rs · paths.rs · db.rs   # RÉUTILISÉS (L0/L1), non modifiés
│  │  └─ (tests dans le module moteur : #[cfg(test)] mod tests)
├─ src/
│  ├─ api/backend.ts          # MODIF : + nextStep, aiSetKey, aiHasKey + type NextStep
│  ├─ hooks/useNextStep.ts    # NOUVEAU : état suggestion/loading/error + request(path) (I/O via backend.ts)
│  ├─ views/WorkingView.tsx   # MODIF : remplace le placeholder « convph » par le panneau « prochaine étape »
│  ├─ views/SettingsView.tsx  # MODIF : libellé « Endpoint IA (OpenAI-compat — LiteLLM recommandé) » + champ modèle (litellm_model) + champ clé optionnelle (write-only) + état clé
│  ├─ components/NextStepPanel.tsx (option)  # NOUVEAU (option) : panneau présentationnel suggestion
│  └─ __tests__/              # MODIF/AJOUT : useNextStep.test.ts + backend.ts (next_step/clé) mockés
└─ specs/mock/                # NOUVEAU (option) : fixtures JSON de réponse OpenAI-compat pour les tests parsing
```

> **Dépendance ajoutée** : `ureq` (côté Rust, D8, **feature json, sans TLS** — A3 `http://` LAN).
> **Aucune** dépendance front nouvelle. **Aucun** crate async/tokio. Si un crate manque pour le
> parsing/HTTP, **le signaler avant** (pas d'ajout silencieux — règle L0/L1).

---

## Critères d'acceptation (vérifiables)

- [ ] **UN endpoint, UN appel** : le code moteur n'a **aucun** `match provider`, **aucun** `cmd /C`,
      **aucune** URL Ollama/Claude en dur, **aucun** second client HTTP, **aucun** code spécifique
      Ollama (Ollama appelé via son endpoint OpenAI-compat). Un **unique**
      `POST {endpoint}/chat/completions`. (grep : pas de `cmd /C`, pas de `11434`, pas de `match
      provider`.)
- [ ] **Frontière respectée** : grep → **aucun** `invoke(` hors `src/api/backend.ts` ; **aucun**
      `fetch(`/client HTTP vers l'endpoint IA dans `src/` (front) ; l'appel réseau est **uniquement**
      côté Rust. La CSP **n'est pas touchée** (jamais `null`).
- [ ] **Clé optionnelle au keychain, jamais ailleurs** : la clé IA est stockée via `secrets`/keychain ;
      grep → **aucune** trace de la clé en SQLite, en fichier, en commit, ni renvoyée au front.
      `config_all` n'expose **pas** de clé secrète. Aucune commande ne **lit** la clé vers le front ;
      `ai_has_key` reflète seulement présence/absence. L'en-tête `Authorization` est **omis** quand
      aucune clé n'est enregistrée (cas Ollama local).
- [ ] **Endpoint & modèle en config** : `litellm_endpoint` (déjà L2, **endpoint OpenAI-compat
      générique**) et `litellm_model` (nouveau, non sensible, **défaut Ollama self-hosted — A1**) se
      lisent/écrivent via `config_get/config_set` ; le modèle est **transmis tel quel** à l'endpoint
      (le Cockpit ne route pas).
- [ ] **Contexte assemblé (RAG annulé)** : `build_context` lit `specs/PROJET.md` + `specs/etat-des-lieux.md`
      (tronqués) + git (branche/status/log) ; fichiers absents → textes de remplacement **sans échec** ;
      **aucun** index vectoriel / embedding.
- [ ] **Path validé** : un `path` inexistant ou hors périmètre est **rejeté** (`Err` lisible) — couvert
      par un test (`pathguard`).
- [ ] **Mock dev fonctionnel** : sans endpoint (ou flag dev), `next_step` renvoie une suggestion
      **déterministe** `provider:"mock"` **sans aucun appel réseau** ; vérifiable en test et à la main.
- [ ] **Parsing OpenAI-compat testé** : sur fixtures JSON, `choices[0].message.content` est extrait,
      `usage` mappé ; réponse vide / JSON invalide → `Err` **lisible** ; **aucun** réseau réel en test.
- [ ] **Dégradation propre** : endpoint configuré mais injoignable → message d'erreur lisible affiché
      dans Working **sans crash** ; timeout borné documenté.
- [ ] **UI Working** : le placeholder « convph » est remplacé par un panneau « prochaine étape » ;
      bouton → suggestion affichée (texte), loading visible, erreur lisible, `provider`/modèle/tokens
      affichés si présents. **Pas** de thread conversationnel persistant (reste L4).
- [ ] **UI Réglages** : libellé **« Endpoint IA (OpenAI-compat — LiteLLM recommandé) »** ; champ
      **modèle** (`litellm_model`) éditable ; champ **clé optionnelle** write-only (saisie → `aiSetKey`,
      mention « facultative — inutile pour un Ollama local ») ; **état** « clé enregistrée ✓ / aucune
      clé » via `aiHasKey` — **jamais** la valeur de la clé affichée.
- [ ] **Prompt conscient de la méthode (A4)** : `build_prompt` mobilise lots/jalons/gates/instructions/
      état des lieux ; testé non vide et orienté « prochaine étape ». (Texte validé par Stéphane.)
- [ ] **Pas de god-component** : état moteur dans `useNextStep` (pas dans `App.tsx` ni la vue) ;
      composants présentationnels ; I/O uniquement via `backend.ts`.
- [ ] **Tests** : Rust (contexte, parsing fixtures, mock, validation path, cloisonnement clé) + front
      (`useNextStep` loading/success/error ; façade `next_step`/`ai_set_key`/`ai_has_key`
      mockée) ; `npm run test` + `cargo test` **verts**.
- [ ] **Build & qualité verts** : `npm run typecheck` 0 err, `npm run lint` 0 err, `npm run build` OK,
      `cargo fmt --check`/`clippy --all-targets -- -D warnings`/`cargo test` verts ;
      `bash scripts/quality.sh` **en succès**. `npm run tauri build` OK.
- [ ] **Couverture honnête** : `cargo test`/`npm run test:coverage` rapportent le **chiffre réel** ;
      l'appel réseau réel à l'endpoint IA est assumé non couvert unitairement (testé à la main au gate,
      endpoint requis), sans gonflage.
- [ ] **Aucun élément OUT livré** : pas de streaming, pas de RAG, pas de multi-provider exposé, pas de
      routage maison, pas d'endpoint `https://`/TLS, pas de thread L4, pas d'admin-par-prompt, pas
      d'Obot, pas de comptabilité de coût. (Revue de scope au gate.)
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ; un module +
      ses tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L3-1 — Recoder du routage par glissement** (R4 roadmap, CRITIQUE). Tentation de garder le
  `match provider` d'`ai.rs`, d'ajouter un fallback Claude CLI, ou un POST Ollama « spécifique ».
  *Mitigation* : D1 fixe **UN** endpoint configuré + **UN** appel ; critère grep (`match provider`,
  `cmd /C`, `11434`) ; le multi-modèle est délégué à **LiteLLM (cible 4)**, pas au Cockpit ; Ollama est
  appelé via son endpoint OpenAI-compat (pas de code dédié). Audit Legolas dédié.
- **R-L3-2 — Fuite de secret** (R6 roadmap, Élevé). Clé IA en SQLite, en log, ou renvoyée au front.
  *Mitigation* : D4 (keychain only, write-only côté front, aucune commande de lecture clé, clé
  **souvent absente** car Ollama local) ; critère grep ; `config_all` filtre déjà
  `key|token|secret|password`.
- **R-L3-3 — Appel réseau direct depuis le front** (CSP / archi). *Mitigation* : D2 (appel côté Rust,
  façade unique) ; critère grep `invoke`/`fetch` ; CSP jamais touchée.
- **R-L3-4 — Path non validé = lecture FS arbitraire.** iakaIDE ne validait pas. *Mitigation* : D3
  (validation `pathguard`/`paths` avant lecture) ; test d'un path hors périmètre.
- **R-L3-5 — Endpoint injoignable hors box = expérience cassée.** *Mitigation* : D5 (mock dev par
  défaut sans endpoint) + D6 (erreur lisible, jamais de crash). Le moteur dégrade ; le dev avance hors
  box via le mock — **ou** via un **Ollama localhost** (appel réel local, sans box).
- **R-L3-6 — Réponse non standard / champ coût absent.** La réponse OpenAI-compat garantit
  `choices[0].message.content` + `usage`, **pas** un champ coût. *Mitigation* : parser défensivement
  (`Option`), ne **pas** dépendre du coût, message lisible si JSON inattendu (test fixtures invalides).
  *(Ollama et LiteLLM exposent tous deux le format OpenAI-compat — même parser.)*
- **R-L3-7 — Dépendance HTTP qui alourdit le build.** *Mitigation* : D8 (`ureq` synchrone léger, sans
  TLS en MVP — A3, pas de tokio/reqwest) ; une seule dépendance ajoutée, signalée.
- **R-L3-8 — Scope-creep par le thread conversationnel.** Working montre une « conversation » (v7) ;
  tentation de bâtir un fil persistant. *Mitigation* : L3 = **une suggestion par demande** ; le fil
  3-canaux est **L4** (DEP-1). Pas d'historique persistant en L3.
- **R-L3-9 — Endpoint `https://` cloud silencieusement attendu.** A3 fixe `http://` LAN sans TLS ; un
  endpoint `https://` ne fonctionnera **pas** tant que la feature TLS n'est pas activée. *Mitigation* :
  documenter la limite (D8) ; le cloud `https://` est un **raffinement ultérieur** hors L3.
- **Limite box** : pas de push, pas de CI, endpoint LAN injoignable hors box — l'appel **réel** se
  valide **avec la box** (ou via Ollama localhost) ; le reste (mock, parsing, validation, cloisonnement,
  UI) est **local et offline**.

---

## Points ouverts & dépendances

### Arbitrages — **TRANCHÉS par Stéphane (2026-06-25)**
- **A1 — Modèle par défaut `litellm_model`** → **TRANCHÉ : un alias/modèle Ollama self-hosted** (souvent
  localhost, pas de clé requise ; aligné « self-hosted/open-source d'abord » `CLAUDE.md`). Claude ou
  autre = **simple changement de config** (endpoint + modèle + clé), sans toucher au code. *Reste à
  fixer par Gimli/Stéphane* : la **valeur exacte** du modèle Ollama (nom d'un modèle réellement
  disponible côté Stéphane) — détail d'implémentation, pas un arbitrage de périmètre. Gravé en D4-bis.
- **A2 — Bascule mock ↔ réel** → **TRANCHÉ : bascule IMPLICITE, zéro toggle UI.** Mock si
  `litellm_endpoint` vide **OU** flag `IAKACOCKPIT_AI_MOCK=1` ; sinon appel réel. Gravé en D5.
- **A3 — `http://` vs `https://`** → **TRANCHÉ : `http://` LAN pour le MVP, sans feature TLS `ureq`.**
  Cibles visées en clair (LiteLLM LAN, Ollama localhost/LAN). Cloud `https://`/TLS = raffinement
  ultérieur **hors L3**. Gravé en D8 + R-L3-9.
- **A4 — Ton du prompt système** → **TRANCHÉ : prompt CONSCIENT de la méthode iakaframe**
  (lots/jalons/gates/instructions/état des lieux/git). Gimli propose le texte exact ; Stéphane l'ajuste.
  Gravé en D3-bis.

> **Précision d'archi gravée (cf. en-tête « MISE À JOUR »)** : le « provider unique » du Cockpit est un
> **endpoint OpenAI-compat configurable** (LiteLLM LAN recommandé / Ollama localhost-LAN / cloud), pas
> LiteLLM en dur. « On câble, on ne route pas » tient : multi-modèle = **LiteLLM (cible 4)**, jamais le
> Cockpit. Aucune zone de périmètre ne reste ouverte en L3.

### Dépendances ouvertes (vers d'autres lots — signalées, non comblées en L3)
- **DEP-1 — Thread conversationnel / historique des suggestions / mains courantes 3-canaux** → **L4**
  (iakaboxlogs). En L3 : **une suggestion par demande**, affichée ; pas de persistance de fil.
- **DEP-2 — Titrage d'onglet `[ROYAUME][Agent]` + état agent** → suppose moteur d'agents + 3-canaux ;
  resté OUT depuis L2. L3 ne l'ouvre pas.
- **DEP-3 — Multi-modèle / sélecteur riche / multi-clés** → **config de l'endpoint** (LiteLLM cible 4
  hors Cockpit) ; jamais du code Cockpit (R4). Un modèle config, une clé optionnelle : MVP.

---

## Notes pour Gimli

- **`ai.rs` d'iakaIDE est un MATÉRIAU, pas un livrable.** Tu **salvages** `build_context` (+ logique
  d'assemblage) ; tu **réécris** `build_prompt` **conscient de la méthode iakaframe** (A4, D3-bis) ; tu
  **supprimes** `run_claude`/`run_ollama`/`match provider` (la dette de routage qu'on **ne** refait
  **pas**). À la place : **un seul** `POST /chat/completions` vers l'**endpoint configuré** (LiteLLM/
  Ollama/cloud — même code). Tu **ajoutes** la validation `pathguard` que iakaIDE n'avait pas.
- **On câble UN endpoint, on ne route pas.** L'endpoint est OpenAI-compat **configurable** : LiteLLM LAN
  (recommandé), Ollama localhost/LAN, ou cloud — **par config, pas par code**. S'il te vient l'envie
  d'un `match` sur un provider, d'un fallback CLI, ou d'un POST « spécifique Ollama », **c'est hors
  scope** — remonte plutôt que d'élargir (garde R4). Le multi-modèle, c'est **LiteLLM (cible 4)**.
- **La clé est OPTIONNELLE et ne touche jamais le front ni SQLite ni un commit.** Keychain only
  (account neutre `ai_api_key`, module `secrets` L0, réutilise son `MockStore` pour tester le
  cloisonnement). Un Ollama local n'a pas de clé → en-tête `Authorization` **omis**. Le front sait au
  plus **si** une clé existe (`aiHasKey`).
- **Le mock dev est obligatoire**, pas optionnel : un dev sans box doit obtenir une suggestion
  déterministe sans réseau (bascule implicite A2 : endpoint vide ou flag). Teste-le. *(Astuce dev :
  un Ollama localhost permet aussi un appel réel sans box.)*
- **`backend.ts` est sacré** (D7) : aucun `invoke` ni appel réseau IA hors façade/Rust. L'appel HTTP
  vit **côté Rust**.
- **Ancre l'UI dans Working** (remplace le placeholder « convph » L2) et **étends Réglages** (libellé
  « Endpoint IA (OpenAI-compat — LiteLLM recommandé) » + modèle + clé optionnelle write-only). Pas de
  thread conversationnel (L4).
- **Avant de clore** : `bash scripts/quality.sh` en entier ; fais les greps toi-même (`invoke`/`fetch`
  hors façade, `cmd /C`, `11434`, `match provider`, trace de clé) ; vérifie chaque case des Critères.
  Rapporte la **couverture réelle** sans la maquiller.
- **Arbitrages A1–A4 TRANCHÉS** (Ollama self-hosted par défaut ; bascule mock implicite ; `http://` LAN
  sans TLS ; prompt conscient méthode) : applique-les. Le **texte exact du prompt** (A4) et la **valeur
  exacte du modèle Ollama** (A1) restent à présenter à Stéphane pour ajustement — propose, attends le
  feu vert sur ces deux détails, sans rouvrir le périmètre.
- **Gate Legolas obligatoire** après L3 (anti « Gimli solo ») : il auditera la frontière (un endpoint,
  un appel, pas de routage maison), le cloisonnement de la clé (keychain, jamais front/SQLite), l'appel
  côté Rust (façade unique), la validation de path, le mock dev, la dégradation propre, et la couverture
  honnête. Ne t'auto-valide pas.

---

## Sources (faits vérifiés sur le web, 2026-06-25)
- **LiteLLM proxy — endpoint OpenAI-compat `/chat/completions`, `Authorization: Bearer`, `master_key`,
  `stream` optionnel** :
  [OpenAI-Compatible Endpoints — LiteLLM](https://docs.litellm.ai/docs/providers/openai_compatible) ·
  [LiteLLM Proxy — docs](https://docs.litellm.ai/docs/providers/litellm_proxy) ·
  [user_keys (curl /chat/completions + Bearer)](https://docs.litellm.ai/docs/proxy/user_keys) ·
  [BerriAI/litellm — GitHub](https://github.com/BerriAI/litellm)
- **Ollama expose nativement un endpoint OpenAI-compat** (`/v1/chat/completions`) → cible légitime du
  même client, sans code dédié (précision d'archi : endpoint configurable, pas LiteLLM en dur) :
  [Ollama — OpenAI compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- **Client HTTP Rust pour un POST JSON bloquant dans Tauri 2 (ureq synchrone léger vs reqwest async)** :
  [reqwest vs ureq vs hyper — Rustify (2026)](https://rustify.rs/articles/rust-reqwest-vs-ureq-vs-hyper-2026) ·
  [Best Rust HTTP client — LogRocket](https://blog.logrocket.com/best-rust-http-client/)
- **Réfs internes** : `iakaIDE/src-tauri/src/ai.rs` (logique F2 à transposer ; dette `cmd /C`/routage à
  supprimer) ; `specs/instructions/L1-salvage-backend-rust.md` (façade, config, secrets, git) ;
  `src/hooks/useSettings.ts` + `src/views/{WorkingView,SettingsView}.tsx` (L2, points d'ancrage UI) ;
  `specs/PROJET.md` § 2.2/3.1/3.2/4/9/10.3/10.6 ; `specs/roadmap.md` § 2 (L3) / § 0 / R4-R6.
```