# Instruction : L32 — Montée LiteLLM 1.82.6 → v1.94.0 **épinglée** (fin du tag flottant)

> Rédigé par 🧙 Gandalf (P1 — cadrage), 2026-07-29. Consommé par ⚒️ Gimli (exécution, P2), gate
> 🏹 Legolas (P3). **Statut : arbitrages AR-1 à AR-5 TRANCHÉS par Stéphane le 2026-07-29 — le lot est
> DÉBLOQUÉ pour exécution.** Doc en français, code/identifiants en anglais.
>
> **Nature du lot** : ce n'est **pas** un lot applicatif. Aucune ligne de `src/` ni de `src-tauri/`
> n'est touchée. C'est un lot **d'infrastructure de recette** : on remplace un **tag flottant**
> (`main-latest`) par une **image épinglée et reproductible**, on constate ce qui tourne réellement
> sur le LAN, et on corrige une hypothèse documentaire fausse.
>
> **Faits établis en amont (relevés par 🟣 Odin, non re-vérifiés ici — ils fondent le lot)** :
> - **VM GPU `192.168.2.12`** : un conteneur nommé `litellm` existe, image
>   `ghcr.io/berriai/litellm:main-latest`, digest **`sha256:7c311546c25e7bb6e8cafede9fcd3d0d622ac636b5c9418befaa32e85dfb0186`**,
>   buildée le **2026-03-22** (commit amont `f5194b5`), version réelle **1.82.6**. Statut :
>   **`Exited (0)` depuis ~7 semaines.**
> - **Box `192.168.2.11`** : **aucun** conteneur LiteLLM. Le port 4000 de `.11` est **Dashy**
>   (Express), sans rapport.
> - **Accès à `.12`** : **double rebond SSH** poste local → `root@192.168.2.20` → `root@192.168.2.12`.
>   L'option `-J` **ne suffit pas** (notre clé est refusée en direct sur `.11`/`.12` ; celle de `.20`
>   est acceptée). Cf. mémoire `iakabox-vm2-acces-rebond`.
> - **Stack IakaCockpit** : `docker/docker-compose.yml`, service `litellm`, conteneur
>   `iakacockpit-dev-litellm`, **même tag flottant** `ghcr.io/berriai/litellm:main-latest`, port hôte
>   `127.0.0.1:4020 → 4000`, config montée depuis `./litellm-config.yaml`.
> - **Amont** : dernière stable **v1.94.0**, publiée le **2026-07-28**. Écart = **12 versions
>   mineures** depuis la 1.82.

---

## Objectif

Faire en sorte que **la version de LiteLLM qui tourne soit une décision écrite, pas un hasard de
build**. À la fin du lot :

1. la stack IakaCockpit démarre sur **`v1.94.0` épinglée par tag ET par digest**, et le chemin
   **Cockpit → LiteLLM → Ollama** répond **à l'identique** (même nom de modèle exposé, même contrat
   OpenAI-compat) ;
2. **plus aucun tag flottant LiteLLM** dans le dépôt ;
3. le conteneur `litellm` de la VM `.12` est **épinglé sur 1.94.0 et rallumé** (AR-1 tranché,
   **branche A**) — plus de zombie de 7 semaines dont personne ne sait s'il compte ;
4. l'**hypothèse fausse** de `iakaFreeVision/specs/instructions/04-arbitre-gpu-litellm.md` est
   identifiée comme **tâche de correction** dans son dépôt d'origine.

---

## Problème (le « pourquoi maintenant »)

**Trois raisons convergent, et la fenêtre est ouverte maintenant.**

1. **Le tag flottant est une dette silencieuse.** `main-latest` désigne le **dernier build de la
   branche `main`** : ce que la stack télécharge dépend du **jour où on a fait `docker pull`**. Deux
   postes, deux dates, deux LiteLLM. Rien dans le dépôt ne dit quelle version tourne — il a fallu
   ouvrir le conteneur pour apprendre qu'on était en **1.82.6, buildée le 22 mars**. Un tag flottant
   n'est pas non plus un **point de rollback** : y « revenir » ne ramène pas la 1.82.6, ça ramène le
   `main` **du jour**, c'est-à-dire une **autre** dérive. C'est le défaut de fond que ce lot corrige.
2. **Le conteneur `.12` est à l'arrêt — c'est la fenêtre propre.** Migrer un service **éteint** ne
   casse aucun usage en cours : pas d'interruption à négocier, pas de session à drainer. Sept
   semaines d'arrêt prouvent au passage que **rien ne dépend de lui aujourd'hui** — donc le coût de
   se tromper est minimal, et il ne le sera plus le jour où quelque chose s'y branchera.
3. **L'écart de 12 minors a un contenu concret pour NOTRE usage.** Correctifs de **sécurité/CVE**
   (`pillow 12.3.0` + pins), fin du **log en clair des virtual keys** en debug, **masquage des
   credentials** à l'édition, **cost map** à jour (Claude Sonnet 5, Opus 4.8, Fable 5, GPT-5.5/5.6,
   Gemini 3.5 Flash — une table de prix arrêtée en mars 2026 est **fausse**, pas seulement
   incomplète), **fiabilité du streaming**, et les commandes CLI **`lite up` / `lite down`** (proxy
   ambiant devant Claude Code). Le correctif Ollama de la v1.84.0 (forwarding des `tool_calls` /
   `tool_call_id`, qui supprimait des boucles infinies multi-tours) tombe **exactement** sur notre
   usage `ollama_chat/`.

**Et une quatrième, documentaire.** L'instruction `04-arbitre-gpu-litellm.md` d'iakaFreeVision
affirme, comme hypothèse de travail : *« Aucun compose, aucun port, aucune URL LiteLLM sur le LAN
iakabox »* (lignes 42-49) et en conclut que **LiteLLM n'est pas déployé**, donc que c'est un
**ajout** qui **sort du MVP**. **C'est faux** : il en existe un sur `.12`, simplement à l'arrêt. Cette
hypothèse commande une **décision de périmètre** dans un autre lot — la laisser fausse, c'est laisser
un raisonnement s'appuyer sur du vide.

---

## État des lieux (mesuré, pas supposé)

| Lieu | Ce qui existe | Version | État | Verdict |
|---|---|---|---|---|
| **Stack IakaCockpit** | `docker/docker-compose.yml` svc `litellm` → `iakacockpit-dev-litellm` | **flottante** (`main-latest`) | recette locale, `127.0.0.1:4020` | **à épingler** (cœur du lot) |
| **VM GPU `192.168.2.12`** | conteneur `litellm`, digest `sha256:7c31…0186` | **1.82.6** (build 2026-03-22) | **`Exited (0)`, ~7 sem.** | **à épingler + rallumer** (AR-1 tranché, branche A) |
| **Box `192.168.2.11`** | — | — | port 4000 = **Dashy**, sans rapport | **rien à faire** |
| **Doc iakaFreeVision** | `specs/instructions/04-arbitre-gpu-litellm.md` L.40-49 | — | hypothèse **fausse** | **tâche identifiée** (AR-4) |

Configuration actuelle de la stack (`docker/litellm-config.yaml`) — **c'est elle qu'il faut valider
contre le schéma 1.94** :

```yaml
model_list:
  - model_name: llama3.2:1b
    litellm_params:
      model: ollama_chat/llama3.2:1b
      api_base: http://ollama:11434
general_settings:
  master_key: sk-iaka-test
litellm_settings:
  drop_params: true
```

Trois surfaces à vérifier, et trois seulement : **`ollama_chat/` + `api_base`**,
**`general_settings.master_key`** (proxy **sans base de données**), **`litellm_settings.drop_params`**.

---

## Revue des ruptures 1.83 → 1.94 (vérifiée sur le web le 2026-07-29)

**Méthode appliquée — à re-appliquer par l'exécutant si une version intermédiaire est visée** :
lecture de l'index amont [`docs.litellm.ai/release_notes`](https://docs.litellm.ai/release_notes/),
puis de la page de release **par minor** sur GitHub
([`BerriAI/litellm/releases`](https://github.com/BerriAI/litellm/releases)), en cherchant (a) les
sections `Breaking Changes` / `Deprecations`, (b) les commits marqués **`!`** (convention
*conventional commits* pour une rupture), (c) toute mention de `model_list`, `general_settings`,
`litellm_settings`, `master_key`, `drop_params`, `ollama`. Une release amont peut porter la mention
« ⚠️ *this release contains breaking changes* » **sans** section dédiée sur GitHub : dans ce cas la
page détaillée est sur `docs.litellm.ai` (c'est le cas de la **v1.84.0**, la plus lourde du lot).

### Ruptures et vigilances, minor par minor

| Version | Statut | Ce qui change | Impact sur **notre** usage |
|---|---|---|---|
| **v1.84.0** | **RUPTURE — la plus lourde des 12** | (a) les **pass-through endpoints** exigent désormais l'authentification **par défaut** (`auth: false` doit être **explicite**) ; (b) **restriction des credentials côté client** : `api_base`/`base_url` validés, blocklist d'URL (`langfuse_host`, `s3_endpoint_url`, `slack_webhook_url`…), les credentials admin sont **retirés** si la requête redirige vers un endpoint fourni par le client → passer par `general_settings.allow_client_side_credentials` ou `configurable_clientside_auth_params` ; (c) **master key** : les requêtes master key portent l'alias **`litellm_proxy_master_key`** au lieu du hash SHA-256 (impacte requêtes de spend logs et filtres Prometheus) ; (d) route statique **`/ui/chat` supprimée** ; (e) **versionnement PEP 440** : fin du suffixe `-stable`, tags Docker `litellm:1.84.0`. **Correctif Ollama** : `tool_calls` sur messages assistant et `tool_call_id` sur `role:tool` désormais **forwardés** (fin de boucles infinies en agent multi-tours). | **Nul à positif.** Aucun `pass_through_endpoints` chez nous ; `api_base` est écrit **côté serveur** dans le YAML, jamais fourni par le client ; **ni spend logs ni Prometheus** (pas de base) ; l'UI n'est pas utilisée. Le correctif Ollama est un **gain direct**. ⚠️ **Le point (e) commande la forme du tag** — cf. D2. |
| **v1.85.0** | Vigilance | Auth par **en-tête d'identité** exige une configuration de proxy de confiance ; durcissements **SSRF**/autorisation ; **health check → 503** si le modèle ciblé est non sain **ou** la DB déconnectée ; suppression d'artefacts de déploiement legacy (`litellm-js`) ; plancher `jinja2 ≥ 3.1.6`. | Pas d'auth par en-tête. **Le 503 touche la recette** : un `/health` rouge peut signifier « **modèle non tiré** », pas « proxy mort » → **tirer `llama3.2:1b` avant** de conclure (cf. étape 6). |
| **v1.86.0** | RAS | Correctifs (budgets, rate limit, coûts), tool-calling, failover pondéré, OTEL GenAI semconv. *(Problème de signature d'image corrigé en 1.86.1.)* | — |
| **v1.87.0** | Vigilance packaging | Vérification **cosign** des images ; **le chart Helm retire le préfixe `main-`** de son tag d'image par défaut. | Confirme, côté amont, l'**abandon de la famille de tags `main-*`** dont nous dépendons. |
| **v1.88.0** | Vigilance | OTEL retypée (semconv) ; métriques Prometheus enrichies (`user_email`, `user_alias`) ; budgets d'équipe au niveau clé ; MCP access-control additif. | Hors périmètre (ni OTEL, ni Prometheus, ni équipes). |
| **v1.89.0** | Vigilance | **Routage par pattern** des futurs modèles Claude vers le provider Anthropic ; JWT/MCP OAuth ; corrections de price mappings. | Notre `model_list` est **explicite** → aucun routage implicite ne peut détourner `llama3.2:1b`. |
| **v1.90.0** | Vigilance | **Standardisation des erreurs de rate limit** (`category`, `rate_limit_type`, `model`, `llm_provider`) ; Valkey ; partitionnement Postgres des SpendLogs. | Sans effet (aucun rate limit configuré) — **à connaître** si un jour `ai.rs` parse les erreurs 429. |
| **v1.91.0** | **Vigilance réelle** | **Image Docker : seuls les artefacts de runtime sont copiés dans l'image finale** ; migration du routing UI vers l'App Router (deep-links en query params cassés) ; opt-out réservation TPM v3 / circuit breaker Redis ; `LITELLM_DISABLE_PREPARED_STATEMENTS`. | **L'image est plus maigre** → **ne pas présumer** de la présence de `curl`/`jq`/outils **dans** le conteneur. Toute recette réseau se fait **depuis l'hôte**, pas via `docker exec … curl`. |
| **v1.92.0** | Vigilance | Élagage des flags *reasoning-effort* (Claude Sonnet/Opus 4.6) ; timeouts Prisma ; `require_managed_files` ; en-têtes de réponse configurables. | Hors périmètre. |
| **v1.93.0** | **RUPTURE** | `oauth2_flow` **lu verbatim depuis la base et requis en config** (MCP OAuth), l'inférence devient un simple filet à la requête ; pages de dashboard expérimentales **dépréciées** ; PATCH `/team/{id}` ; **les clés sont throttlées** au dépassement de budget au lieu d'être **révoquées**. | Hors périmètre (ni MCP OAuth, ni teams, ni budgets, ni base). |
| **v1.94.0** | **RUPTURE (connue)** | `fix(proxy)!: enforce user budget on team keys (read-time + reservation) with UI opt-out` — le **budget utilisateur** s'applique désormais aux **clés d'équipe**, avec opt-out en UI. Contenu : plugins de routeur, prompt caching Anthropic automatique, MCP client-held credentials, DataTable UI partagée. | **Nul** : la stack tourne sur **`master_key` seul**, sans clé virtuelle, sans équipe, sans base — il n'y a **rien à budgéter**. |

### Verdict de la revue

> **Aucune des 12 minors ne rompt `ollama_chat/` + `master_key` + `drop_params`.** Le schéma de
> `litellm-config.yaml` reste valide **tel quel**. Confirmations amont : `ollama_chat/` est
> **toujours le préfixe recommandé** (*« We recommend using ollama_chat for better responses »*),
> aucune dépréciation, `api_base` toujours dans `litellm_params` ; le proxy tourne toujours **sans
> base de données** (Postgres n'est requis que pour clés/teams/users/spend logs/config) ; le
> lancement par `--config <chemin>` est toujours la forme documentée.
>
> **La seule rupture qui nous concerne réellement est de PACKAGING** (v1.84.0, point e :
> nomenclature des tags Docker) — c'est-à-dire **précisément l'objet de ce lot**. Le risque de la
> montée n'est donc **pas** dans le YAML : il est dans le **choix du tag** et dans le **filet de
> rollback**. C'est là que l'exécution doit être rigoureuse.

### Ce que l'amont recommande explicitement

La doc de déploiement est sans ambiguïté : *« pin a version tag rather than `latest` or a moving
tag, so rollbacks are deterministic »*. Et le billet de versionnement précise que la famille
historique **`main-stable` est dépréciée**, sa publication devant **cesser vers le 1er septembre
2026** ; le chart Helm a déjà retiré le préfixe `main-` en v1.87.0. **Notre `main-latest` appartient
à cette famille en voie de retrait** : le lot ne fait pas qu'améliorer la reproductibilité, il **sort
d'un chemin que l'amont abandonne**.

---

## Décisions (l'approche retenue + POURQUOI)

### D1 — Cible : **v1.94.0**, épinglée par **tag ET digest**
On vise la **dernière stable** (v1.94.0, 2026-07-28), pas un palier intermédiaire : la revue
ci-dessus montre que **rien entre 1.83 et 1.94 ne casse notre configuration**, donc un palier
n'achèterait aucune sécurité — seulement une deuxième migration à faire.

L'épinglage est **double**, et les deux moitiés servent à des choses différentes :

```yaml
image: ghcr.io/berriai/litellm:1.94.0@sha256:<DIGEST_RELEVÉ_À_L_EXÉCUTION>
```

- le **tag** est là pour l'**humain** : on lit le fichier, on sait quelle version tourne ;
- le **digest** est là pour la **machine** : il rend le pull **reproductible bit à bit**, même si le
  tag amont était un jour ré-écrit.

> **Le digest n'est PAS écrit dans cette instruction, et ce n'est pas un oubli.** Un digest
> recopié de mémoire ou deviné est un digest faux — et un digest faux fait échouer le pull de façon
> opaque. Il est **relevé à l'exécution** (étape 2) contre le registre réel, puis **collé** dans le
> compose. C'est le seul moyen honnête de l'obtenir.

### D2 — Forme du tag : **`1.94.0`** (sans `v`)
Depuis la **v1.84.0**, LiteLLM suit **PEP 440** : le tag canonique est `1.94.0`, le suffixe
`-stable` a disparu. Le registre publie **aussi** `v1.94.0` (préfixe `v` optionnel) **vers le même
digest** — les deux fonctionnent. On retient la forme **canonique amont** `1.94.0`, alignée sur les
exemples de la doc de déploiement. *Point mineur, ouvert à arbitrage — cf. AR-2.*

### D3 — `litellm-config.yaml` : **inchangé par défaut, mais vérifié activement**
La revue conclut que le schéma reste valide. **On ne modifie donc rien à l'aveugle** — mais on ne se
contente pas non plus de le supposer : la validité est **prouvée** au démarrage (logs sans erreur ni
warning de schéma) **et** par un appel réel qui exerce les trois surfaces (`ollama_chat/`,
`master_key`, `drop_params`). Si — et seulement si — la vérification révèle un écart, l'ajustement
est **minimal et documenté** dans le commit ; **aucune option nouvelle n'est ajoutée « tant qu'on y
est »**.

### D4 — Le rollback s'ancre sur le **digest 1.82.6**, pas sur `main-latest`
Point central, et contre-intuitif : **revenir à `main-latest` n'est pas un rollback.** Ça
retéléchargerait le `main` **du jour** — une version **encore différente** de 1.82.6, donc une
troisième inconnue au pire moment. Le seul ancrage valable est le digest relevé sur `.12` :
`sha256:7c311546c25e7bb6e8cafede9fcd3d0d622ac636b5c9418befaa32e85dfb0186`.

**Conséquence opératoire, à faire AVANT la montée** : vérifier que ce digest est **encore récupérable
depuis le registre** (étape 1). S'il ne l'est plus (les manifests non tagués finissent par être
purgés), le filet doit être **fabriqué avant de sauter** — sinon on monte sans rollback, ce qui est
exactement ce qu'on prétend éviter. Repli documenté : `docker save` de l'image depuis `.12` +
transfert du tar par le double rebond SSH.

### D5 — Recette **depuis l'hôte**, jamais depuis l'intérieur du conteneur
Depuis la **v1.91.0**, l'image finale ne contient que les **artefacts de runtime**. Présumer la
présence de `curl`/`jq` dans le conteneur, c'est risquer un échec de recette qui ressemble à un
échec du service. **Tous les appels de vérification partent de l'hôte**, contre `127.0.0.1:4020`.

### D6 — Le conteneur de `.12` est traité comme un **acte séparé et tracé**, jamais implicitement
L'action sur `.12` — **branche A : épingler puis rallumer** (AR-1) — est **explicite, horodatée et
notée** dans le compte rendu du lot. Le statu quo (« on n'y touche pas ») était refusé comme issue
par défaut : c'est précisément ce qui a produit, en sept semaines, un conteneur fantôme et une
hypothèse documentaire fausse. **Stéphane a choisi — pas hérité** : le `.12` redevient un service
vivant, et ce qu'il devient est désormais une décision écrite.

---

## Périmètre

### Inclus (le lot)
1. **Stack IakaCockpit** — épinglage de l'image LiteLLM (`docker/docker-compose.yml`), vérification
   de validité de `docker/litellm-config.yaml` sous 1.94, recette complète du chemin
   **Cockpit → LiteLLM → Ollama**.
2. **VM `.12`** — **branche A (AR-1 tranché)** : épingler le conteneur `litellm` sur 1.94.0 et le
   **rallumer**, par double rebond SSH, avec constat écrit (port et URL obtenus = **faits du LAN**).
3. **Correction documentaire** — **identification** de la tâche de correction sur
   `iakaFreeVision/specs/instructions/04-arbitre-gpu-litellm.md`, avec le **texte de remplacement
   sourcé** prêt à l'emploi. *(L'édition se fait dans le dépôt iakaFreeVision — cf. AR-4.)*
4. Mise à jour du **backlog** `CLAUDE.md` et de l'état des lieux.

### Exclu (HORS lot — ne PAS faire, même si c'est tentant)
- **Épinglage des autres images de la stack** (`ollama/ollama:latest`, `couchdb:3`,
  `docker.n8n.io/n8nio/n8n` **sans tag** = `latest`). Ce sont **aussi** des tags flottants, mais
  c'est un **autre chantier** (reproductibilité de stack) : le mélanger à une montée de version
  rendrait tout diagnostic d'échec ambigu. → **AR-3**.
- **Migration des clients LLM vers LiteLLM** (le Cockpit garde son choix d'endpoint configurable —
  « on câble, on ne route pas », L3). Aucun changement de `src-tauri/src/ai.rs`, aucun changement de
  la façade `src/api/backend.ts`.
- **Clés virtuelles, teams, budgets, base Postgres, dashboard, Prometheus/Grafana, guardrails
  entreprise, metering OTLP facturable, Datadog, providers cloud, MCP OAuth multi-tenant.** Toutes
  ces surfaces sont hors de notre usage (passerelle OpenAI-compat devant Ollama) — c'est ce qui rend
  les ruptures 1.93/1.94 **inoffensives** pour nous, et ce qui doit le **rester**.
- **Adoption des commandes CLI `lite up` / `lite down`** (proxy ambiant pour Claude Code) : c'est un
  **bénéfice identifié** de la montée, **pas** un objet de ce lot. → lot séparé le jour venu.
- **Le lot 04 d'iakaFreeVision lui-même** (arbitre GPU, portillon LiteLLM, étapes 3-4) : on corrige
  **une hypothèse factuelle**, on ne re-cadre **pas** sa décision de périmètre.
- **Changement du modèle exposé** (`llama3.2:1b`) ou du port hôte (`4020`) : **invariants** du lot —
  la recette consiste justement à prouver qu'ils n'ont **pas** bougé.
- **Sortie du secret `master_key` du dépôt** et **modification de l'exposition réseau du `.12`** :
  deux dettes **ouvertes par la branche A**, **nommées** au § *Ce que la branche A ouvre*, **non
  traitées ici**. L32 les **constate** ; il ne les résout pas. → **suite attendue : L35** (cf. note de
  renumérotation ci-dessous).
- **Le défaut « clé invalide → `400 No connected db.` »** : **pré-existant**, **nommé** au § *Défaut
  ouvert*, **non résolu ici**.

---

## Étapes d'implémentation (ordonnées, chacune vérifiable)

> Chaque étape produit une **preuve** (sortie de commande) à reporter dans le compte rendu. Une
> étape sans preuve est une étape non faite.

### Phase A — Sécuriser le filet AVANT de sauter

1. **Vérifier que le rollback existe.** Depuis l'hôte de la stack :
   `docker manifest inspect ghcr.io/berriai/litellm@sha256:7c311546c25e7bb6e8cafede9fcd3d0d622ac636b5c9418befaa32e85dfb0186`
   (ou `docker pull` du même digest).
   - **Succès** → le filet est en place, continuer.
   - **Échec** → **ne pas monter**. Fabriquer le filet d'abord : `docker save` de l'image depuis
     `.12` (double rebond SSH) vers un tar conservé hors dépôt, puis continuer. **Reporter le
     résultat à Stéphane dans les deux cas** — c'est une information de risque, pas un détail.

2. **Relever le digest de la cible.**
   `docker buildx imagetools inspect ghcr.io/berriai/litellm:1.94.0` → noter le **digest d'index**
   (multi-arch, donc valable quelle que soit l'architecture de l'hôte). Repli si `buildx` absent :
   `docker pull ghcr.io/berriai/litellm:1.94.0` puis
   `docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/berriai/litellm:1.94.0`.
   **Preuve attendue** : la chaîne `sha256:…` complète.

3. **Noter l'état de référence AVANT.** `docker compose ps` + un appel de chat réussi sur
   `127.0.0.1:4020` (cf. étape 7) **en 1.82.6**, pour disposer d'un **avant/après comparable**. Si la
   stack n'est pas démarrée, la démarrer et attendre qu'elle soit saine.

### Phase B — Épingler et monter la stack Cockpit

4. **Éditer `docker/docker-compose.yml`**, service `litellm` uniquement :
   `image: ghcr.io/berriai/litellm:main-latest` → `image: ghcr.io/berriai/litellm:1.94.0@sha256:<digest de l'étape 2>`.
   Ajouter **un commentaire d'une ligne** au-dessus rappelant l'ancrage de rollback
   (`# rollback : 1.82.6 = ghcr.io/berriai/litellm@sha256:7c31…0186`). **Ne toucher à aucun autre
   service.**

5. **Recréer le service** : `docker compose pull litellm && docker compose up -d litellm`.
   **Preuve** : `docker compose ps` → `iakacockpit-dev-litellm` **Up**.

6. **Vérifier la version RÉELLE dans le conteneur** — ⚠️ **PAS avec `pip`** :
   ```bash
   docker exec iakacockpit-dev-litellm sh -c \
     'grep -E "^(Name|Version):" /app/.venv/lib/python3.13/site-packages/litellm-*.dist-info/METADATA'
   ```
   → **`Name: litellm`** + **`Version: 1.94.0`**. C'est la preuve la plus dure disponible : la lecture
   **brute** du `METADATA` du `dist-info`, indépendante de tout outillage.
   *(Preuve de second rang, si le chemin du `site-packages` devait bouger :
   `docker exec iakacockpit-dev-litellm python -c "import importlib.metadata as m; print(m.version('litellm'))"`.)*

   > **Rectification du 2026-07-29 (constat 🏹 Legolas).** La prescription initiale
   > `docker exec … pip show litellm` était **matériellement inexécutable** : depuis
   > l'amaigrissement de l'image en **v1.91.0** (« seuls les artefacts de runtime sont copiés »),
   > **`pip` n'est plus embarqué** — `import pip` → `ModuleNotFoundError`. Une preuve qu'on ne peut
   > pas exécuter n'est pas une preuve. *(Même cause que D5 : ne rien présumer du contenu de
   > l'image.)*
   >
   > La **vérification secondaire** initialement prescrite est **caduque elle aussi** :
   > `/health/readiness` **n'expose plus `litellm_version`** en 1.94.0. Payload réellement mesuré :
   > `{"status":"healthy","db":"Not connected"}`. Cet appel reste utile comme **signe de vie**, il ne
   > vaut **plus** comme preuve de version.

   **La preuve fait foi, pas le tag écrit dans le compose.**

7. **Vérifier que la config est acceptée** :
   `docker compose logs litellm --tail=200` → **aucune erreur ni warning de schéma** sur
   `model_list` / `general_settings` / `litellm_settings`. Le proxy annonce le modèle et écoute
   sur 4000.

### Phase C — Recetter le chemin réel (depuis l'hôte, cf. D5)

8. **S'assurer que le modèle est tiré** : `docker exec iakacockpit-dev-ollama ollama pull llama3.2:1b`
   *(sans quoi le health check peut renvoyer un 503 trompeur — cf. v1.85.0)*.

9. **Catalogue** :
   `curl -s http://127.0.0.1:4020/v1/models -H "Authorization: Bearer sk-iaka-test"`
   → contient **`llama3.2:1b`**, à l'identique. *(Prouve `master_key` + `model_list`.)*

10. **Complétion OpenAI-compat, avec paramètres à droper** :
    ```bash
    curl -s http://127.0.0.1:4020/v1/chat/completions \
      -H "Authorization: Bearer sk-iaka-test" -H 'Content-Type: application/json' \
      -d '{"model":"llama3.2:1b","messages":[{"role":"user","content":"dis bonjour"}],
           "temperature":0.2,"max_tokens":64,"stream":false}'
    ```
    → **HTTP 200**, `object: "chat.completion"`, `choices[0].message.content` **non vide**.
    *(Prouve `ollama_chat/` + `api_base` interne + `drop_params` — les paramètres non supportés par
    Ollama doivent être **silencieusement droppés**, pas provoquer une 400.)*

11. **Vérifier l'authentification** — deux cas **distincts**, à ne pas confondre :
    - **(a)** le **même appel sans** en-tête `Authorization` doit être **refusé** → **401**.
      *(Prouve que `master_key` protège toujours — non-régression de sécurité.)*
    - **(b)** le même appel avec une **clé invalide** : **constater le code réellement renvoyé et
      l'écrire**. ⚠️ **Mesuré au gate du 2026-07-29 : `HTTP 400 No connected db.`**, et **non** 401/403.
      Comportement **pré-existant** (re-mesuré par 🏹 Legolas sur un témoin **1.91.0** reconstruit) :
      **ce n'est donc pas une régression de la montée** et **ce n'est pas à corriger ici** — c'est un
      **défaut ouvert**, nommé au § *Défaut ouvert — clé invalide*.

12. **Recette dans l'app réelle** (`npm run tauri dev`) : Réglages → endpoint
    `http://127.0.0.1:4020/v1`, modèle `llama3.2:1b`, clé `sk-iaka-test` → la fonction « prochaine
    étape » (L3) **répond**. **C'est le critère qui compte pour Stéphane** : les `curl` prouvent le
    proxy, celui-ci prouve le **produit**.

### Phase D — VM `.12` : **branche A** (épingler + rallumer) — AR-1 tranché

13. **Se connecter** par double rebond : poste → `root@192.168.2.20` → `root@192.168.2.12`
    (l'option `-J` **ne suffit pas**). **Relever l'état avant** :
    `docker ps -a --filter name=litellm` + `docker inspect litellm` (image, digest, **ports publiés**,
    volumes, **fichier de config monté**, réseau, `restart policy`). C'est cet inventaire qui alimente
    la correction documentaire (étape 15) **et** le constat d'exposition (étape 14c).
14. **Épingler et rallumer :**
    - **(a)** épingler l'image sur **le même digest 1.94.0** que la stack Cockpit (relevé à
      l'étape 2), recréer le conteneur, **sans changer la config montée ni les ports** — le lot est
      une **montée de version**, pas une reconfiguration.
    - **(b)** **prouver la version** — **même preuve qu'à l'étape 6** (`pip` **absent** de l'image
      depuis la v1.91.0) :
      `docker exec litellm sh -c 'grep -E "^(Name|Version):" /app/.venv/lib/python3.13/site-packages/litellm-*.dist-info/METADATA'`
      → `Version: 1.94.0` ; puis recette locale minimale : `GET /v1/models` sur le port réellement
      publié → le catalogue répond.
    - **(c)** **constater et écrire l'exposition** : **quelle surface est publiée, sur quel port, et
      joignable depuis où** (`0.0.0.0:<port>` = tout le LAN, `127.0.0.1:<port>` = la VM seule). Ce
      constat est un **fait du LAN** à consigner au compte rendu, **même si la réponse est « on garde
      tel quel pour l'instant »**. On **constate**, on ne **corrige pas** ici (cf. § *Ce que la
      branche A ouvre*).

### Phase E — Documentation et clôture

15. **Rédiger le correctif iakaFreeVision** (texte prêt, **pas** l'édition — cf. AR-4) : remplacer
    l'hypothèse des lignes 40-49 de
    `/Users/sjupin/work/iakaFreeVision/specs/instructions/04-arbitre-gpu-litellm.md` par le **fait
    mesuré** — un conteneur `litellm` **existait** sur `192.168.2.12` (image `main-latest`, digest
    `sha256:7c31…0186`, version 1.82.6, build 2026-03-22), **à l'arrêt (`Exited (0)`) depuis
    ~7 semaines** ; la box `.11` n'en héberge **aucun** (son port 4000 est **Dashy**) ; **issue
    retenue le 2026-07-29 (Stéphane) : conteneur épinglé sur 1.94.0 et RALLUMÉ** — port et URL à
    reporter depuis l'étape 14c. La ligne `| LiteLLM | *aucune trace de déploiement* | **inconnue à
    lever** |` du tableau § état des lieux devient un **fait établi**, et la « Phase 0 » de
    confirmation prévue par cette instruction est **close**.
    > **La correction change de portée avec la branche A** : il ne s'agit plus seulement de corriger
    > une erreur passée, mais d'inscrire un **fait présent** — il y a une passerelle LiteLLM **vivante
    > et à jour** sur `192.168.2.12`. La conclusion de périmètre de ce lot (« LiteLLM est un **ajout**,
    > donc hors MVP ») **tombe** : le socle existe. **Ce lot ne re-cadre pas la décision d'iakaFreeVision
    > pour autant** — il lui rend seulement ses prémisses exactes, à son coordinateur d'en tirer les
    > conséquences.
16. **Mettre à jour le backlog** `CLAUDE.md` (ligne L32) et régénérer l'état des lieux
    (`iakaframe update` / `snapshot`).
17. **Commit** (conventional commits, atomique) :
    `chore(docker): epingle litellm sur 1.94.0 (tag + digest), fin du tag flottant main-latest`.

---

## Fichiers concernés

- `docker/docker-compose.yml` — **service `litellm` uniquement** : image épinglée `1.94.0@sha256:…`
  + commentaire d'ancrage de rollback. *(Les 3 autres services sont hors lot — AR-3.)*
- `docker/litellm-config.yaml` — **inchangé par défaut** ; ajustement **minimal et documenté**
  seulement si la vérification de l'étape 7 révèle un écart réel (D3).
- `CLAUDE.md` — ligne de backlog **L32**.
- `specs/etat-des-lieux.md` (+ `.html`) — régénérés.
- **Hors dépôt, tâche identifiée** :
  `/Users/sjupin/work/iakaFreeVision/specs/instructions/04-arbitre-gpu-litellm.md` (lignes **40-49**)
  — correction de l'hypothèse. **Ce fichier vit dans un AUTRE dépôt : ne pas l'éditer depuis le lot
  IakaCockpit.**
- **Hors dépôt, acte d'infrastructure** : conteneur `litellm` sur `192.168.2.12` — **épinglé 1.94.0
  puis rallumé** (AR-1, branche A). Config montée et ports **inchangés**.

---

## Risques

| # | Risque | Mitigation |
|---|---|---|
| R1 | **Le digest 1.82.6 n'est plus récupérable** au registre (manifest non tagué purgé) → montée **sans filet**. | **Étape 1, bloquante** : vérification **avant** toute modification ; repli `docker save` depuis `.12` + transfert par double rebond. **Ne pas monter tant que le filet n'est pas prouvé.** |
| R2 | Un **digest erroné** (recopié/deviné) fait échouer le pull de façon opaque. | Le digest **n'est pas écrit dans cette instruction** : il est **relevé à l'exécution** contre le registre (étape 2) puis collé. |
| R3 | Un **écart de schéma** non détecté par la revue web fait démarrer le proxy en mode dégradé, silencieusement. | Double preuve : **logs de démarrage** sans warning de schéma (étape 7) **ET** appel réel exerçant les 3 surfaces (étape 10). Un démarrage « Up » **ne suffit pas**. |
| R4 | **Faux négatif de recette** : `/health` en 503 parce que `llama3.2:1b` n'est pas tiré (comportement introduit en v1.85.0), interprété comme « la 1.94 est cassée ». | Étape 8 **avant** toute conclusion ; discriminer explicitement « modèle absent » de « proxy KO ». |
| R5 | Recette lancée **depuis l'intérieur** du conteneur → échec dû à l'absence d'outils (image allégée depuis v1.91.0), pris pour une panne du service. | **D5** : tous les appels partent de **l'hôte** (`127.0.0.1:4020`). |
| R6 | **Rallumage silencieux** (branche A) : le `.12` redevient joignable **sur le LAN** avec un secret de test en clair, sans que personne ne l'ait constaté par écrit. | **Rien n'est corrigé dans L32** (ce serait sortir du périmètre), mais **tout est constaté** : étape 14c écrit la surface exposée, et le § *Ce que la branche A ouvre* nomme les deux dettes. **Une dette écrite n'est plus une dette silencieuse.** |
| R6-bis | **Reconfiguration opportuniste du `.12`** pendant le rallumage (« tant qu'on y est, on change le port / la config / la clé »). | Étape 14a : **on ne change ni la config montée ni les ports**. L32 est une **montée de version** ; toute reconfiguration relève du lot de suite. |
| R7 | **Dérive de périmètre** : « tant qu'on y est », épingler ollama/couchdb/n8n → un échec devient indiagnosticable. | Périmètre exclu **explicite** ; AR-3 sépare ce chantier. |
| R8 | **Perte de temps sur le double rebond SSH** (`-J` insuffisant, clés spécifiques). | Procédure connue et tracée (mémoire `iakabox-vm2-acces-rebond`) : local → `root@.20` → `root@.12`, avec la clé de `.20`. |
| R9 | **Volume de pull** de l'image sur le LAN (image récente, plusieurs centaines de Mo). | Faire l'étape 2 (pull) **avant** de recréer le service, hors fenêtre de recette. |

---

## Procédure de rollback

**Ancrage** : image 1.82.6 = `ghcr.io/berriai/litellm@sha256:7c311546c25e7bb6e8cafede9fcd3d0d622ac636b5c9418befaa32e85dfb0186`.
**Ne JAMAIS « revenir à `main-latest` »** : ce n'est pas un retour arrière, c'est une **nouvelle
dérive** (cf. D4).

1. Dans `docker/docker-compose.yml`, remplacer la ligne `image:` du service `litellm` par
   `ghcr.io/berriai/litellm@sha256:7c311546c25e7bb6e8cafede9fcd3d0d622ac636b5c9418befaa32e85dfb0186`.
   *(Si le filet a été fabriqué par `docker save` : `docker load < <tar>` d'abord, puis référencer
   l'image locale.)*
2. `docker compose up -d litellm` (recrée le conteneur sur l'ancienne image).
3. **Vérifier** (même preuve qu'à l'étape 6 — **pas `pip`**) :
   `docker exec iakacockpit-dev-litellm sh -c 'grep -E "^(Name|Version):" /app/.venv/lib/python3.*/site-packages/litellm-*.dist-info/METADATA'`
   → **`Version: 1.82.6`**. *(Version de repli : le `python3.x` du `site-packages` peut différer d'une
   image à l'autre — d'où le glob.)*
4. **Re-recetter** avec les **mêmes** étapes 9-12 : le rollback n'est acquis que si le chemin
   Cockpit → LiteLLM → Ollama répond **comme avant**.
5. Côté git : **`git revert`** du commit d'épinglage. **Jamais `reset --hard`, jamais
   `push --force`** (convention projet).
6. **Consigner la cause** de l'échec dans le compte rendu — un rollback non expliqué se re-paiera à
   la prochaine tentative.

---

## Critères d'acceptation (testables)

**Version et épinglage**
- [ ] La lecture **brute du `METADATA`** dans le conteneur affiche **`Name: litellm` / `Version: 1.94.0`** :
      `docker exec iakacockpit-dev-litellm sh -c 'grep -E "^(Name|Version):" /app/.venv/lib/python3.13/site-packages/litellm-*.dist-info/METADATA'`.
      *(**Pas `pip show`** : `pip` n'est plus dans l'image depuis la v1.91.0 — cf. rectification de
      l'étape 6. Preuve de second rang : `python -c "import importlib.metadata as m; print(m.version('litellm'))"`.)*
- [ ] `docker/docker-compose.yml` référence l'image sous la forme **`…:1.94.0@sha256:<digest>`**
      (tag **et** digest présents).
- [ ] **Aucun tag flottant LiteLLM ne subsiste dans le code de la stack** :
      ```bash
      grep -rnE "berriai/litellm:(main-latest|latest|main-stable)" . --exclude='*.md' --exclude='*.html'
      ```
      → **exit 1** (aucune correspondance).
      > **Rectification du 2026-07-29 (constat 🏹 Legolas).** Le critère initial — *« `grep -rn
      > "berriai/litellm" .` ne renvoie que la ligne épinglée »* — était **inatteignable par
      > construction** : **cette instruction elle-même**, committée sur la branche, cite `main-latest`
      > une dizaine de fois pour **documenter l'état d'avant**. Un critère qu'aucune exécution correcte
      > ne peut satisfaire n'est pas un critère : il fabrique un faux échec au gate. La forme
      > ci-dessus vise les **tags flottants** dans le **code** (documentation et rapports exclus) —
      > c'est la forme **vérifiée et validée** au gate.
- [ ] Le **digest de rollback 1.82.6** est présent en commentaire dans le compose.

**Fonctionnel (le chemin doit répondre à l'identique)**
- [ ] `docker compose logs litellm` : **aucune erreur ni warning de schéma** sur `model_list`,
      `general_settings`, `litellm_settings`.
- [ ] `GET /v1/models` (avec `Authorization: Bearer sk-iaka-test`) → **200**, liste contenant
      **`llama3.2:1b`** (nom exposé **inchangé**).
- [ ] `POST /v1/chat/completions` avec `temperature`/`max_tokens`/`stream:false` → **200**,
      `object: "chat.completion"`, `choices[0].message.content` **non vide** *(prouve `ollama_chat/`
      + `drop_params`)*.
- [ ] Le **même appel sans clé** est **refusé** → **401** *(prouve `master_key`)*.
- [ ] Le même appel avec une **clé invalide** : le code renvoyé est **constaté et écrit** au compte
      rendu. **Attendu mesuré : `400 No connected db.`** — **anomalie pré-existante, hors périmètre
      de correction** (cf. § *Défaut ouvert — clé invalide*). **Ce critère porte sur le constat, pas
      sur le code** : exiger 401/403 ici ferait échouer le gate sur un défaut que le lot n'a ni créé
      ni charge de résoudre.
- [ ] **Dans l'app réelle** (`npm run tauri dev`) : endpoint `http://127.0.0.1:4020/v1` + modèle
      `llama3.2:1b` + clé `sk-iaka-test` → la fonction « prochaine étape » (L3) **répond**.
- [ ] Le **port hôte reste `127.0.0.1:4020`** et le **nom de conteneur reste
      `iakacockpit-dev-litellm`** (isolation iakaframe intacte).

**Non-régression du reste**
- [ ] Les services `ollama`, `couchdb`, `n8n` sont **inchangés** dans le compose (diff limité au
      service `litellm`).
- [ ] **Aucun fichier de `src/` ni de `src-tauri/`** n'est modifié (`git diff --stat` le prouve).
- [ ] `bash scripts/quality.sh` reste **vert** *(le lot ne touche pas au code : toute variation est
      un signal d'alerte, pas un effet attendu)*.
      > **Rectification du 2026-07-29 (constat 🏹 Legolas).** Ce critère est **momentanément
      > inatteignable pour une raison étrangère à L32** : un **flake pré-existant** de 4 tests
      > `tail_file_*` (`src-tauri/src/transcript.rs`) fait sortir `quality.sh` en **101** ~7 fois sur 8
      > (dernier commit touchant `src-tauri/` = `922f2e9` du **2026-07-14**, antérieur à la branche).
      > **Tant que L33 n'est pas livré**, le critère se lit : *aucune variation qualité **imputable à
      > L32*** — prouvé par `git diff --stat` **vide** sur `src/` et `src-tauri/` (critère précédent),
      > et par la **liste nominative** des tests rouges, qui doit se limiter aux 4 `tail_file_*`
      > connus. **Après L33**, le critère reprend sa forme littérale : **vert de bout en bout**.
      > → `specs/instructions/L33-flake-tests-tail-file.md`

**VM `.12` et documentation**
- [ ] Le conteneur `litellm` de `192.168.2.12` est **Up**, sur une image **épinglée**, et la lecture
      brute du `METADATA` (même commande qu'à l'étape 6, **pas `pip show`**) affiche
      **`Version: 1.94.0`** — **plus d'`Exited (0)` dormant**, avec la **preuve** en compte rendu.
- [ ] `GET /v1/models` répond sur le port publié du `.12` (recette locale minimale).
- [ ] La **config montée et les ports du `.12` sont inchangés** par rapport à l'inventaire d'avant
      (seule l'image a bougé).
- [ ] L'**inventaire avant** du conteneur `.12` (image, digest, ports, config montée) figure au
      compte rendu.
- [ ] La **surface exposée est écrite** : port publié + interface de bind (`0.0.0.0` = LAN, ou
      `127.0.0.1` = VM seule) — **le constat est un livrable**, même si rien n'est changé.
- [ ] Le **texte de correction** pour `iakaFreeVision/.../04-arbitre-gpu-litellm.md` est **rédigé et
      remis**, avec les lignes visées (**40-49**) et les faits sourcés.
- [ ] `CLAUDE.md` (backlog L32) et `specs/etat-des-lieux.md` à jour.

---

## Arbitrages — **TRANCHÉS par Stéphane (décideur) le 2026-07-29**

> Les cinq points de décision de ce cadrage sont **fermés**. Ils sont conservés ici comme **journal
> de décision** : on doit pouvoir relire *pourquoi* c'est ainsi, pas seulement *que* c'est ainsi.
> **Le lot est débloqué pour ⚒️ Gimli.**

### AR-1 — **Sort du conteneur `litellm` de la VM `192.168.2.12`** → **BRANCHE A** *(décision principale)*

**Décision (Stéphane, 2026-07-29)** : le conteneur est **épinglé sur 1.94.0 puis rallumé**. **Ni
suppression, ni statu quo.**

**Motif, verbatim** : *« litllm va servir a plein de cas »*.

C'est la réponse exacte au critère que le cadrage avait posé (*comptes-tu faire passer des appels LLM
par un portillon sur la VM GPU ?*) — et elle va **plus loin que le critère** : LiteLLM n'est pas
destiné au seul portillon de l'arbitre GPU, mais à **plusieurs cas d'usage**. Ce qui était cadré
comme « un service de plus à maintenir sans usage identifié » devient **une brique d'infrastructure
assumée**. Conséquences actées :

- La VM **GPU** — là où vivent Ollama et ComfyUI — porte une passerelle LLM **vivante et à jour**.
- L'« étape 4 » du lot iakaFreeVision (portillon LiteLLM devant l'arbitre GPU) trouve un **socle déjà
  en place**, au lieu d'un déploiement *from scratch* qu'elle avait budgété.
- **Le `.12` n'est plus un service de test dormant** : c'est ce changement de statut qui ouvre les
  deux dettes du § suivant. **Elles ne sont pas traitées dans L32** — elles sont **nommées**.

### AR-2 — **Forme du tag** → **`1.94.0`** (reco retenue)
Forme canonique amont depuis la v1.84.0 (PEP 440), celle des exemples de la doc de déploiement. Le
tag `v1.94.0` pointe vers le **même digest** ; le digest fait foi de toute façon. *Impact :
cosmétique.*

### AR-3 — **Épinglage des 3 autres images de la stack** → **renvoyé en lot séparé (L34)** (reco retenue)
`ollama/ollama:latest`, `couchdb:3`, `docker.n8n.io/n8nio/n8n` (**sans tag** ⇒ `latest`) sont **aussi**
flottants, et devront être épinglés — **mais pas ici**. Mélanger une montée de version et un chantier
de reproductibilité rendrait tout échec ambigu ; **L32 doit rester diagnosticable**.

> **Renumérotation du 2026-07-29.** Ce renvoi disait **« L33 »**. Le numéro **L33** a été pris par un
> lot **prioritaire** : *stabiliser le flake `tail_file_*`*
> (`specs/instructions/L33-flake-tests-tail-file.md`) — sans filet de non-régression fiable, aucun lot
> ultérieur touchant `src-tauri/` n'est diagnosticable. Les suites de L32 glissent donc d'un cran :
> **L34** = épinglage des 3 images restantes (ce point) · **L35** = dettes de L32 (DETTE-1 `master_key`,
> DETTE-2 exposition LAN du `.12`, défaut ouvert `400`/`401`).

### AR-4 — **Correction iakaFreeVision** → **texte fourni par L32, édition dans le dépôt iakaFreeVision** (reco retenue)
L32 produit le **texte de remplacement sourcé** (étape 15) ; l'**édition + commit** se font **dans le
dépôt `/Users/sjupin/work/iakaFreeVision/`**, par son coordinateur, en tâche rattachée. **L'exécutant
de L32 ne franchit pas la frontière de dépôt.**

### AR-5 — **Exploitation de la stack Cockpit** → **inchangée** (reco retenue)
Le lot recette la stack puis la **laisse dans l'état où il l'a trouvée**. `restart: unless-stopped`
est déjà déclaré et n'est pas touché. *Impact : nul sur le code.*

---

## Ce que la branche A ouvre — **dettes nommées, NON traitées dans L32**

> **Pourquoi cette section existe.** Tant que le `.12` était un conteneur de test **éteint**, deux
> facilités étaient parfaitement acceptables. Le rallumer **pour servir « plein de cas »** change
> leur statut : ce qui était un raccourci de recette devient une **caractéristique durable**. On les
> écrit **maintenant**, pendant qu'on a les mains dedans et la mémoire fraîche — parce qu'une dette
> qu'on ne nomme pas au moment où on la crée est une dette qu'on redécouvre en incident.
>
> **⚠️ Ce paragraphe NOMME, il ne RÉSOUT PAS.** Aucune de ces deux dettes n'est à traiter dans L32 :
> **L32 reste la montée de version.** Aucun schéma de secrets, aucun reverse-proxy, aucune
> redéfinition d'architecture n'est proposé ici — ce serait de la sur-ingénierie sur un lot dont le
> périmètre est fermé. **Suite attendue : L35 ou lot dédié**, cadré le jour où Stéphane le décide.
> *(Ex-« L33 » — renumérotée le 2026-07-29, cf. AR-3.)*

### DETTE-1 — Le secret `master_key` est un secret **jetable, en clair et commité**
`docker/litellm-config.yaml` porte `master_key: sk-iaka-test` **en clair dans le dépôt**. C'est
**acceptable** pour une stack de **test local** bindée sur `127.0.0.1` — c'était même le choix
délibéré, annoté dans le fichier (« Test local uniquement »). Ça devient **inacceptable** pour une
passerelle **durable et multi-usages** : un secret commité n'est pas rotable, il est lisible par
quiconque a le dépôt, et il ne distingue pas les usages entre eux.

**Statut** : dette **ouverte par la branche A**, **non traitée ici**. *(Note : le Cockpit sait déjà
tenir un secret hors dépôt — le keychain write-only de L3/L6. Le constat est fait ; le **schéma
concret reste à cadrer**, pas à improviser.)*

### DETTE-2 — L'exposition réseau du `.12` n'est pas la même que celle de la stack Cockpit
La stack Cockpit bind sur **`127.0.0.1:4020`** : rien ne sort de la machine — c'est bon, et ça ne
change pas. Le `.12` rallumé sera, lui, **joignable sur le LAN** (surface exacte à constater à
l'étape 14c : port publié + interface de bind).

**Ce que L32 doit faire** : **écrire** quelle surface est exposée et sur quel port — **même si la
réponse est « on garde tel quel pour l'instant »**. Un port ouvert connu et écrit est une décision ;
un port ouvert non écrit est un angle mort.
**Ce que L32 ne fait pas** : le changer, le filtrer, le protéger. **Statut : dette nommée, suite
attendue.**

---

## Défaut ouvert — **clé invalide → `400 No connected db.`** *(à NOMMER, pas à résoudre ici)*

> **Ajouté le 2026-07-29 au constat du gate 🏹 Legolas.** Ce défaut est **PRÉ-EXISTANT** : il a été
> **re-mesuré sur un témoin `1.91.0` reconstruit**, donc **la montée ne l'a ni créé ni aggravé**.
> Il est écrit ici parce qu'un défaut mesuré et tu est un défaut qu'on redécouvre en incident.

**Le fait.** Une requête portant une **clé invalide** ne reçoit **pas** `401`/`403` mais :

```
HTTP 400 — No connected db.
```

*(À distinguer de l'absence totale de clé, qui donne bien un **401**.)* La cause est structurelle :
le proxy tourne **sans base de données** (choix assumé du lot — cf. § état des lieux), et la
validation d'une clé **non-master** exige la base ; l'échec de lookup est rendu comme une **erreur de
configuration serveur (4xx générique)** au lieu d'un **refus d'authentification**.

**Pourquoi ça compte pour NOUS, concrètement.** Un client — **`src-tauri/src/ai.rs`** — ne peut pas
**distinguer « clé refusée » de « passerelle en panne »**. Conséquence directe à l'IHM : l'app
affichera **« erreur serveur »** là où l'utilisateur doit lire **« clé invalide »** — c'est-à-dire le
seul message qui lui dise **quoi faire**. Le défaut est donc **d'ergonomie de diagnostic**, pas de
sécurité : la clé invalide est bien **rejetée**, elle est juste **mal qualifiée**.

**Statut : NOMMÉ, non traité.** Aucune correction dans L32 (ce serait toucher `ai.rs`, explicitement
**hors périmètre**) et aucune solution n'est esquissée ici — ni contournement côté client (deviner
l'intention derrière un 400), ni activation d'une base côté proxy, ni mapping d'erreur : chacune est
une **décision d'architecture** qui demande son propre cadrage. **Suite attendue : L35** (dettes
issues de L32), ou lot dédié le jour où Stéphane le décide.

---

## Estimation (jalon P1→P2 — obligation de méthode)

- **Charge : ~0,5 à 1 j-homme.**
  - **Stack Cockpit (~2-3 h)** : édition d'**une ligne** de compose + pull + recette. Le travail
    réel n'est pas l'édition, c'est la **chaîne de preuves** (version, logs, 3 appels curl, app
    réelle).
  - **VM `.12` (~1,5-2 h)** : double rebond SSH, inventaire, **épinglage + rallumage (branche A)**,
    recette locale, constat d'exposition écrit. **La branche tranchée est la plus longue des deux** —
    l'estimation ci-dessous est calée dessus, plus sur une moyenne.
  - **Documentation (~1 h)** : texte de correction iakaFreeVision + backlog + état des lieux.
- **Complexité : FAIBLE côté configuration, MOYENNE côté opération.** La revue des 12 minors conclut
  que **le YAML n'a pas à bouger** — c'est le résultat le plus rassurant du cadrage. Le travail est
  **opérationnel** (registre, digests, SSH à double rebond, décision d'infra), pas conceptuel.
- **Risque : FAIBLE, avec un point dur unique.** Le seul risque sérieux est **R1** (digest 1.82.6
  non récupérable ⇒ montée sans filet). Il est **détecté à l'étape 1, avant toute modification**, et
  bloquant. Tout le reste est réversible en quelques minutes.
- **Inconnues susceptibles de faire glisser l'estimation :**
  1. **Disponibilité du digest 1.82.6** au registre. S'il a été purgé → `docker save` + transfert de
     tar par double rebond = **+1 à 2 h**.
  2. **État réel de la VM `.12`** : autres conteneurs, contraintes VRAM, config montée non
     documentée. Découverte à l'étape 13 — **+1 h** si le conteneur s'avère lié à autre chose.
  3. **Comportement effectif de `ollama_chat/` sous 1.94** avec `llama3.2:1b`. La revue web dit qu'il
     n'y a **pas** de rupture ; la recette le **prouve**. Si un écart apparaît, il faudra le
     circonscrire → **+2 à 4 h**.
  4. **Volume de pull** de l'image sur le LAN (débit variable), à faire deux fois (stack + `.12`).
- **Verdict : lot court, peu risqué, à forte valeur de dette.** Il ne livre **aucune fonctionnalité
  utilisateur** — il rend **reproductible** et **rollback-able** une brique qui ne l'était pas, ferme
  12 minors de retard (dont des correctifs de sécurité), **remplace une hypothèse fausse par un
  fait mesuré**, et **remet en service une passerelle destinée à « plein de cas »**.
  **Estimation médiane : ~0,75 j-homme** (inchangée après arbitrage : la branche A était déjà la
  borne haute de la fourchette).
- Cette estimation est **rappelée à la clôture du lot** et confrontée au temps réel.

---

## Sources (faits LiteLLM vérifiés sur le web, 2026-07-29)

- Index des release notes : [Release Notes | liteLLM](https://docs.litellm.ai/release_notes/) ·
  [Releases · BerriAI/litellm](https://github.com/BerriAI/litellm/releases)
- **v1.84.0** (la rupture majeure : pass-through auth, credentials côté client, alias master key,
  suppression de `/ui/chat`, PEP 440, correctif forwarding des tool calls Ollama) :
  [docs — v1.84.0](https://docs.litellm.ai/release_notes/v1.84.0/v1-84-0) ·
  [GitHub — v1.84.0](https://github.com/BerriAI/litellm/releases/tag/v1.84.0)
- Versionnement et **tags Docker** (fin du suffixe `-stable`, `main-stable` déprécié — arrêt de
  publication visé au 2026-09-01, tags `1.x.y` et `v1.x.y` vers le même digest) :
  [LiteLLM release versioning is changing](https://docs.litellm.ai/blog/cleaner-release-versions)
- **Recommandation d'épinglage** (*« pin a version tag rather than `latest` or a moving tag, so
  rollbacks are deterministic »*), lancement par `--config`, base de données **non requise** pour un
  proxy sans clés/teams/spend logs : [Deploy | liteLLM](https://docs.litellm.ai/docs/proxy/deploy)
- **Ollama** (`ollama_chat/` toujours recommandé, aucune dépréciation, `api_base` dans
  `litellm_params`) : [Ollama | liteLLM](https://docs.litellm.ai/docs/providers/ollama)
- Minors intermédiaires (ruptures et vigilances relevées au tableau) :
  [v1.85.0](https://github.com/BerriAI/litellm/releases/tag/v1.85.0) ·
  [v1.86.0](https://github.com/BerriAI/litellm/releases/tag/v1.86.0) ·
  [v1.87.0](https://github.com/BerriAI/litellm/releases/tag/v1.87.0) ·
  [v1.88.0](https://github.com/BerriAI/litellm/releases/tag/v1.88.0) ·
  [v1.89.0](https://github.com/BerriAI/litellm/releases/tag/v1.89.0) ·
  [v1.90.0](https://github.com/BerriAI/litellm/releases/tag/v1.90.0) ·
  [v1.91.0](https://github.com/BerriAI/litellm/releases/tag/v1.91.0) ·
  [v1.92.0](https://github.com/BerriAI/litellm/releases/tag/v1.92.0) ·
  [v1.93.0](https://github.com/BerriAI/litellm/releases/tag/v1.93.0) ·
  [v1.94.0](https://github.com/BerriAI/litellm/releases/tag/v1.94.0)
- CLI `lite` (proxy ambiant pour Claude Code — **bénéfice identifié, hors lot**) :
  [LiteLLM Proxy CLI](https://docs.litellm.ai/docs/proxy/management_cli)
