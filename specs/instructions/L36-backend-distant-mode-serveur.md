# Instruction : L36 — Backend distant (mode serveur) — sortir la chauffe du Mac

> Cadré par 🧙 Gandalf (2026-08-18). Rédigé comme instruction de travail fermée.
> **État : EN ATTENTE D'ARBITRAGE** — 8 arbitrages (AR-1..AR-8) sont posés ci-dessous
> avec recommandation. Rien ne part au dev avant que Stéphane les tranche.
>
> Réalise le point d'horizon **« Cible web parallèle »** du backlog `CLAUDE.md` et de
> `specs/PROJET.md § 10.1` (rouvert le 2026-06-25), avec un **motif nouveau** : ce n'est
> plus « avoir une version web », c'est **décharger le Mac**.

---

## 1. Problème

Le Mac chauffe. La gêne est la **chauffe / le CPU**, **pas le disque** (traité à part :
Docker 17 Go, actifs lourds vers le partage réseau — hors périmètre ici).

La cible exprimée par Stéphane : **le backend d'IakaCockpit tourne sur l'iakabox**, le Mac
n'a plus qu'un **navigateur**. Les builds, les PTY, les processus `claude`/`codex` tournent
sur la box ; le Mac devient un client léger.

**Reformulation en une phrase** : *donner à IakaCockpit une deuxième cible d'exécution —
un serveur sans tête sur la box, piloté par un navigateur — sans perdre la cible desktop
Tauri actuelle.*

### 1.1 Ce qui chauffe réellement — et pourquoi ça change le périmètre

Le raisonnement qui suit **conditionne tout le reste** et doit être lu avant les options.

| Source de chaleur | Où elle vit | Part supposée | Le mode serveur la déplace-t-il ? |
|---|---|---|---|
| Processus `claude` / `codex` (Node, **un par onglet projet** depuis L24) | machine qui exécute le runner | **dominante** | **oui — si le runner tourne sur la box** |
| Builds déclenchés par ces runners (`cargo`, `vite`, `vitest`, whisper.cpp) | machine qui exécute le runner | **forte** (les `target/` Rust pesaient 22 Go) | **oui — même condition** |
| Index Analytics `economy.rs` (scan de tous les transcripts, phases 1+2, au démarrage + refresh) + tailers de transcript | machine qui exécute le backend Cockpit | moyenne | oui |
| Rendu xterm de la TUI native (défaut connu : « rendu lent, lignes qui se chevauchent », différé (b) de L10) + React + WebView | machine qui affiche | faible à moyenne | **non** — elle reste sur le Mac, et le passage au navigateur **ne l'améliore pas** |
| `whisper-rs` / `cpal` (dictée) | machine qui capte le micro | ponctuelle | **non** — le micro est physiquement sur le Mac |

**Conséquence n°1 — le gain ne vient pas du portage, il vient du déplacement du travail.**
Un backend Cockpit sur la box qui regarderait un chapeau et des transcripts **restés sur le
Mac** ne verrait **rien** et ne refroidirait **rien**. Ce qui refroidit, c'est que **`~/work`
et les runners vivent sur la box**. Le portage du backend est le moyen de **continuer à
voir** ce travail depuis le Mac — ce n'est pas lui, en soi, qui enlève la chaleur.

**Conséquence n°2 — le gain est plafonné par l'habitude.** Une part de la chauffe vient des
sessions `claude` que Stéphane lance **dans son propre terminal**, hors Cockpit (celle-ci en
est une). Elles ne bougeront que si l'habitude change. À dire, pas à supposer.

**Conséquence n°3 — un risque symétrique existe** : si la box est plus lente que le Mac
(Apple Silicon), on échange « ça chauffe » contre « ça rame ». **Non mesuré à ce jour.**

---

## 2. Ce qui existe — mesuré dans le dépôt (2026-08-18, `main`, v0.32.1)

| Élément | Où | État mesuré |
|---|---|---|
| Façade front unique | `src/api/backend.ts` | **Le SEUL fichier de `src/` qui importe `@tauri-apps/*`.** *(Rectification du brief : `src/hooks/usePty.ts` n'en parle qu'en commentaire, ligne 7 — il n'importe rien. Les autres occurrences sont des `vi.mock` de tests.)* La discipline D7 est donc tenue à 100 % : **une seule couture à ouvrir**. |
| Détection d'environnement | `src/api/backend.ts:37` `isTauri()` | présent, prêt à servir d'aiguillage de transport |
| Commandes exposées | `src-tauri/src/lib.rs:80-130` | **49 commandes** enregistrées, 17 fichiers |
| Dépendance à `AppHandle` | 17 signatures de commande | quasi **uniquement** pour `db::open(app)` → `app_data_dir()` (`src-tauri/src/db.rs:21`). **Une seule vraie dépendance** : « où est le dossier de données ». |
| Dépendance à `State<…>` | 8 signatures (`terminal.rs` ×5, `transcript.rs` ×2, `codex.rs` ×1) | registre de PTY / de tailers — remplaçable par un état de processus |
| Dépendance à la fenêtre | 1 seule : `terminal::set_fullscreen` (`src-tauri/src/terminal.rs:662`, `tauri::WebviewWindow`) | sans objet côté serveur → API Fullscreen du navigateur |
| Canaux d'événements | 3 : `pty://output/{id}`, `pty://closed/{id}` (`terminal.rs:139,144`), `runner://event/{sessionId}` (`transcript.rs`, `codex.rs`) | **tous unidirectionnels serveur → client** |
| Racine du chapeau | `src-tauri/src/paths.rs:30` | **déjà configurable** (`IAKAFRAME_ROOT`, puis `<home>/work`) + commande `set_root` |
| Racine des transcripts | `terminal.rs:786`, `codex.rs:374`, `economy.rs:315` | **`dirs::home_dir()` EN DUR** — `~/.claude/projects` et `~/.codex/sessions` ne sont **pas** configurables (contrairement au chapeau) |
| Secrets | `src-tauri/src/secrets.rs` | trait `SecretStore` + impl `KeyringStore` (crate `keyring`). **Le trait existe déjà** → la seconde impl est un travail borné. |
| Config non sensible | `config.rs` + SQLite `iakacockpit.sqlite` sous `app_data_dir` | ne dépend de Tauri que par le chemin |
| Dépendances Rust | `src-tauri/Cargo.toml` | **pas de tokio, pas de reqwest** (choix assumé : `ureq` bloquant). `cpal` + `whisper-rs` (whisper.cpp via CMake, Metal sur Apple Silicon) sont compilés **dans la lib** |
| Plugins Tauri | `dialog`, `updater`, `process` | `pickDirectory` (dialog natif), auto-update L34, `relaunch` — **les trois perdent leur sens en mode serveur** |
| CSP | `src-tauri/tauri.conf.json:23` | stricte (`default-src 'self'`) — en mode serveur, elle devra être servie en **en-tête HTTP** |
| Stack Docker projet | `docker/docker-compose.yml` | convention déjà tenue : réseau `iakacockpit-dev-net`, conteneurs `iakacockpit-dev-*`, ports hôte **127.0.0.1** dédiés (11435, 4020, 5984, 5678) |
| Mode « attaché » | L25 (`latest_transcript` + conversation `attached`, lecture seule, **sans PTY**) | **déjà livré** — brique clef du lot A ci-dessous |

---

## 3. Faits vérifiés sur le web (2026-08-18) — ils désamorcent le risque n°1

Le brief désignait l'**authentification de Claude Code sur une machine sans tête** comme le
risque n°1 de faisabilité. **Vérification faite : ce n'est pas un risque de faisabilité, c'est
une procédure documentée.**

1. **Login OAuth par SSH — supporté nommément.** La doc d'authentification de Claude Code
   écrit : *« If your browser shows a login code instead of redirecting back after you sign
   in, paste it into the terminal at the `Paste code here if prompted` prompt. This happens
   when the browser can't reach Claude Code's local callback server, which is common in WSL2,
   **SSH sessions**, and containers. »* → un `claude` lancé dans un TTY SSH sur la box se
   connecte, en collant le code obtenu dans le navigateur du Mac.
   Source : <https://code.claude.com/docs/en/authentication>
2. **Jeton long non interactif** : `claude setup-token` produit un OAuth **valable un an**
   (`CLAUDE_CODE_OAUTH_TOKEN`), destiné aux « CI pipelines and scripts where browser login
   isn't available ». Limites **explicites** : il exige un plan Pro/Max/Team/Enterprise, il
   *« can only make model requests »* (donc **pas** de Remote Control ni de connecteurs
   claude.ai), il n'est **pas** relu par le mode `--bare`, et il **ne se rafraîchit pas
   seul**. Même source.
3. **Stockage des identifiants sur Linux** : *« On Linux, credentials are stored in
   `~/.claude/.credentials.json` with file mode `0600` »* (macOS = Keychain chiffré). Fait
   **structurant** : l'outil de référence que nous ferons tourner sur la box **stocke déjà
   son propre secret en clair 0600 sur cette box**. Le débat « pas de trousseau sur la box »
   a donc un **précédent assumé par l'éditeur**. Même source.
4. **Codex** : `codex login --device-auth` (flux *device code*, ajouté fin mars 2026) résout
   le login sans callback navigateur ; l'échec classique sur serveur distant est le callback
   OAuth sur le **port 1455**. Sources :
   <https://developers.openai.com/codex/auth> et
   <https://codex.danielvaughan.com/2026/04/01/codex-cli-authentication-flows-credential-management/>
5. **Tauri n'émet toujours pas de bundle web** (v2 stable, ligne 2.11) : la cible navigateur
   passe obligatoirement par un serveur qui réexpose les commandes — le postulat de
   `PROJET.md § 10.1` **reste vrai en 2026**. Sources :
   <https://tech-insider.org/tauri-vs-electron-2026/> et
   <https://www.buildmvpfast.com/blog/tauri-v2-vs-electron-desktop-apps-2026>
6. **Transport, versions disponibles** : `axum` **0.8.9** est la dernière version publiée sur
   crates.io (la 0.9 n'est **pas** sortie, la branche `main` porte des ruptures) ;
   `tungstenite` **0.29.0** (2026-03-17) est vivant ; `tiny_http` est publié et maintenu.
   Sources : <https://crates.io/crates/axum/versions>, <https://crates.io/crates/tungstenite>,
   <https://crates.io/crates/tiny_http>
7. **Alternative qui ne passe pas par nous** : Anthropic livre **Remote Control** (research
   preview) — piloter depuis `claude.ai/code` ou l'app mobile une session Claude Code qui
   tourne sur une autre machine. Ça répondrait à « je veux que ça tourne ailleurs », mais
   **hors IakaCockpit** (pas de Portefeuille, pas d'Analytics, pas d'Équipes) et **via le
   cloud Anthropic**, et c'est **incompatible avec `CLAUDE_CODE_OAUTH_TOKEN`** (cf. fait 2).
   Source : <https://code.claude.com/docs/en/remote-control>

> **Ce que ces faits changent au cadrage** : le point dur n°1 du brief (auth headless) passe
> de « risque de faisabilité » à « **procédure d'installation** ». Le vrai point dur remonte
> d'un cran : **où vit le chapeau, et ce que ça entraîne** (§ 5, AR-2).

---

## 4. Arbitrages à trancher (Gandalf propose, Stéphane tranche)

### AR-1 — **Mode serveur COMPLET d'emblée, ou premier lot « lecture seule à distance » ?**
*(la question posée explicitement par Stéphane)*

**Recommandation : ni l'un ni l'autre tels quels — un chemin en 4 lots, dont le premier
est bien « lecture seule », mais avec une correction de raisonnement.**

Le piège de la question telle qu'elle est formulée : *« un lot lecture seule suffirait-il
à sortir l'essentiel de la chauffe ? »* — **non, pas par lui-même**. Une lecture seule à
distance ne refroidit rien tant que le travail (projets + runners) est resté sur le Mac :
le serveur sur la box lirait un `~/work` et un `~/.claude/projects` **vides** (§ 1.1,
conséquence n°1).

**Mais il devient la bonne première marche dès qu'on l'accompagne de son complément non
logiciel** : le chapeau et les runners passent sur la box, et **les runners sont lancés à
la main en SSH/tmux** sur la box en attendant le lot B. Dans cette configuration :

- `claude`, `codex`, `cargo`, `vite` tournent **sur la box** → **la chauffe part dès le
  lot A**, avant même que le PTY soit porté ;
- le Cockpit dans le navigateur montre le **Portefeuille**, l'**Analytics**, le **Journal**
  et la **vue live attachée** de la session en cours — et cette dernière **existe déjà**
  (L25, mode `attached` : tail du transcript, lecture seule, **sans PTY**). On ne l'invente
  pas, on la rebranche sur un transport distant ;
- tous les points durs transverses (chapeau, auth, secrets, transport, réseau, isolation)
  sont **exercés pour de vrai** au prix d'environ **un tiers** du chantier complet.

Autrement dit : le lot A n'est pas « moins de refroidissement pour moins cher », c'est
**tout le refroidissement pour un tiers du prix**, au prix d'un **inconfort d'usage**
(taper dans un terminal SSH au lieu de taper dans le Cockpit) que le lot B lève ensuite.

Argument décisif en faveur du phasage : l'estimation complète (§ 9) est de **16 à 21
jours-homme**. Engager 16 à 21 jours sur une hypothèse de gain **non mesurée** (§ 1.1,
conséquence n°3 : et si la box était plus lente ?) serait un pari. Le lot A **prouve le
gain sur pièce** avant qu'on engage les deux tiers restants.

**→ Recommandé : A (lecture seule + travail déplacé) → mesure → B (interactif) → C
(parité) ; D (environnement box) est un pré-requis transverse.**
**→ Écarté : le mode serveur complet en un seul lot** (chantier long, gate unique tardif,
gain non prouvé avant la fin).
**→ Écarté aussi : la lecture seule *sans* déplacer le travail** — élégante et inutile.

### AR-2 — **Où vit le chapeau `~/work` ?** *(le vrai point dur, absent du brief)*

Trois options :

- **(a) Le chapeau est recloné sur la box depuis Forgejo.** Le Mac garde ou non sa copie.
  Simple, rapide, aligné sur l'infra existante (29 dépôts sur Forgejo). **Risque : deux
  copies qui divergent** si Stéphane édite des deux côtés. Discipline requise : la box
  devient **la** machine de travail, le Mac ne fait plus que regarder.
- **(b) Un seul chapeau, partagé par le réseau** (le partage SMB `//192.168.2.20/work`
  existe déjà, monté sur le Mac en `~/mounts`). Une seule copie, zéro divergence.
  **Risque lourd** : git, `cargo` et les tailers de transcript sur un partage réseau =
  I/O médiocres et sémantique de verrous douteuse. **Déconseillé pour un arbre de travail.**
- **(c) Le chapeau reste sur le Mac, la box ne fait que servir l'UI.** **Ne refroidit
  rien** (§ 1.1). Sans objet.

**Recommandation : (a)**, avec un point de vigilance nommé : le jour où le chapeau est sur
la box, **le Mac n'est plus la machine de travail**. C'est une décision d'usage autant que
technique, et elle appartient à Stéphane.

**Corollaire à ne pas manquer** : ce n'est pas que `~/work` qui doit déménager. **La
méthode iakaframe elle-même vit dans `~/.claude` du Mac** — `CLAUDE.md` global, `skills/`,
et les hooks `delegation-guard.mjs` (L5), `plan-courante.mjs` (L18), `identity-guard.ps1`.
Sans eux sur la box, les agents perdent leurs personas et **le Journal / les widgets de
plan deviennent muets** (ils sont alimentés par ces hooks, pas par le Cockpit). À traiter
dans le lot D, explicitement.

### AR-3 — **Sur quel hôte tourne le serveur ?**

Inventaire connu : `.20` = hôte Proxmox *bigserver* (porte le partage `/work` 4 To,
accessible par notre clé SSH) · `.11` = VM Docker (Forgejo, n8n, CouchDB, Portainer) ·
`.12` = VM IA (ComfyUI, Ollama, LiteLLM — **et la dette L35 non soldée**, cf. `CLAUDE.md`).

**Recommandation : une VM/LXC dédiée, ou à défaut `.11`.** Écarter `.12` (GPU/IA, dette
sécurité ouverte) et `.20` (un hyperviseur n'exécute pas de charge applicative).
**Pré-requis : mesurer d'abord** cœurs, RAM, disque libre et architecture (x86_64 attendu
face à un Mac arm64) — cf. lot 0.

### AR-4 — **Conteneurisé ou natif sur l'hôte ?**

La convention iakaframe impose une **stack Docker par projet** (réseau, volumes,
conteneurs préfixés, ports hôte distincts). Mais le processus à isoler est ici un
**runner qui doit voir le chapeau, git, le réseau, `~/.claude` et lancer des builds** :
en conteneur, on remonte tout en volumes et l'isolation devient déclarative.

**Recommandation : la stack Docker `iakacockpit-srv-*` porte le SERVEUR ; les RUNNERS
tournent dans ce même conteneur** (ils sont fils du serveur), avec `~/work`, `~/.claude`
et `~/.codex` en volumes nommés ou bind-mounts. La convention est donc **tenue** (réseau,
préfixe, port hôte dédié), sans prétendre à une isolation que le métier interdit. Si le
conteneur s'avère un frein en recette, **repli documenté** : service systemd natif — à
déclarer, pas à subir.

### AR-5 — **Transport : WebSocket, ou SSE + POST ?**

Fait mesuré (§ 2) : **les 3 canaux d'événements sont unidirectionnels serveur → client**.
Le seul flux client → serveur est `pty_write`, **qui est déjà une commande** (donc un POST).

- **SSE + POST** : `EventSource` est natif au navigateur (aucune lib côté front),
  reconnexion automatique, un **seul** flux multiplexé pour les 3 canaux (le nom
  d'événement porte le routage), même origine → CSP `connect-src 'self'` **inchangée**.
- **WebSocket** : bidirectionnel, mais on n'a **rien** de bidirectionnel à part la frappe.

**Recommandation : SSE + POST au lot A.** Le seul point à mesurer est la **frappe clavier
au lot B** (un POST par touche). Décision au vu de la mesure : batching à ~10 ms, ou
WebSocket **pour le seul canal PTY**. On n'ouvre pas WebSocket « au cas où ».

### AR-6 — **Comment ouvre-t-on la couture Rust ?**

- **(a) Découpage en 3 crates** (`core` pur / adaptateur Tauri / adaptateur serveur) :
  le plus propre, le plus de remue-ménage (17 fichiers déplacés).
- **(b) Un seul crate, deux adaptateurs derrière un *feature flag* Cargo** : le corps des
  commandes descend dans des `*_impl(ctx, …)` **sans `tauri::`** ; `desktop.rs` porte les
  `#[tauri::command]`, `server.rs` porte les routes HTTP ; `tauri` devient une dépendance
  **optionnelle** ; le binaire serveur se construit en `--no-default-features --features
  server` (et **ne compile pas** webkit2gtk).

**Recommandation : (b)** — conforme à « MVP d'abord, pas de sur-ingénierie », réversible,
diff lisible au gate. Le découpage en crates reste ouvert si la couture fait mal.
L'abstraction à introduire est **minimale** : un `Ctx` qui sait (1) **où est le dossier de
données** (aujourd'hui `app_data_dir`) et (2) **comment émettre un événement**
(aujourd'hui `Emitter`). C'est tout ce que `AppHandle` apporte réellement (§ 2).

**À feature-gater aussi : `cpal` + `whisper-rs`.** Compiler whisper.cpp (CMake) dans un
binaire serveur Linux qui n'aura **jamais** de micro est un coût de build pur perte.

### AR-7 — **Secrets côté serveur** (pas de trousseau sur la box)

Le trait `SecretStore` **existe déjà** (`secrets.rs`) — c'est un remplacement d'implémentation,
pas une refonte. Options : (a) fichier `0600` sous le dossier de données du serveur ;
(b) variables d'environnement injectées par la stack ; (c) Secret Service Linux (dbus) dans
une session utilisateur — lourd et fragile en conteneur.

**Recommandation : (a) fichier `0600`, avec (b) en surcharge.** Précédent explicite :
Claude Code lui-même stocke son OAuth en `~/.claude/.credentials.json` mode `0600` sur
Linux (§ 3, fait 3). Cohérent avec l'arbitrage portefeuille *« sécu souple sur la
plateforme de dev »* : on **consigne**, on ne bloque pas. **À consigner nommément** : les
secrets CouchDB / clé IA / token n8n passent d'un Keychain chiffré à un fichier en clair
protégé par les seules permissions POSIX. C'est une **régression de posture assumée**, pas
un détail à taire.

### AR-8 — **Accès depuis le Mac : tunnel SSH, ou exposition sur le LAN ?**

**Point à voir en face** : dès le lot B, le serveur permet de **spawner un PTY sur la
box**. Un endpoint non authentifié sur le LAN, c'est **l'exécution de code arbitraire sous
notre compte**, pour quiconque est sur le réseau. Ce n'est plus « on peut lire mes
données ».

- **(a) Bind `127.0.0.1` sur la box + tunnel SSH depuis le Mac** (`ssh -L 7420:…`) : **zéro
  ligne d'authentification à écrire**, chiffré, réutilise un accès qui existe déjà, et le
  Mac ouvre simplement `http://localhost:7420`. Coût : un tunnel à tenir (agent `launchd`).
- **(b) Bind LAN + jeton porteur** : plus confortable (aucun tunnel), mais il faut écrire
  l'auth, la stocker côté navigateur, et l'on hérite du modèle de menace ci-dessus.

**Recommandation : (a) au lot A et au lot B** (sobriété maximale, surface nulle), **(b) à
instruire au lot C** si le tunnel se révèle pénible à l'usage. Noter que le double rebond
`.20` → `.11` complique le tunnel si le serveur va sur `.11` — à vérifier au lot 0 (un
`-L` en deux sauts, ou un `~/.ssh/config` avec `ProxyCommand`).

---

## 5. Décision retenue *(à confirmer par les arbitrages ci-dessus)*

Ouvrir **une seconde cible d'exécution** pour le backend existant — un **serveur HTTP sans
tête** — en gardant la cible desktop Tauri **première et intacte**, conformément à
`PROJET.md § 10.1` (« deux versions maintenues en parallèle »).

La couture est **celle qui existe déjà** : `src/api/backend.ts` gagne un **transport
alternatif** (`fetch` + `EventSource`) au lieu d'`invoke` + `listen`, choisi à l'exécution
par `isTauri()`. Côté Rust, le corps des commandes descend sous un `Ctx` neutre ; deux
adaptateurs minces l'exposent (Tauri / HTTP).

Le chantier est découpé en **quatre lots + un lot 0 de mesure**, chacun avec son gate.

---

## 6. Périmètre

### Lot 0 — **Mesure** (pré-requis, non négociable)

- **Inclus** : mesurer, avant tout code — (1) la chauffe actuelle du Mac **par processus**
  (qui consomme quoi : runners `claude`/`codex`, `rustc`/`cargo`, `node`/vite, l'app
  Cockpit elle-même, la WebView) sur une session de travail représentative ; (2) les
  ressources de l'hôte cible (cœurs, RAM, disque libre, architecture) ; (3) **un `cargo
  build` complet d'IakaCockpit chronométré sur la box et sur le Mac**, côte à côte ;
  (4) la faisabilité du tunnel SSH jusqu'à l'hôte retenu ; (5) les ports déjà écoutés sur
  l'hôte, pour fixer le port sans collision.
- **Exclu** : tout code applicatif.
- **Sortie** : un tableau de faits + un **GO/NO-GO argumenté** sur AR-1..AR-3. Un
  ralentissement de build supérieur à ~2× sur la box est un signal de **NO-GO** à remonter
  à Stéphane, pas à absorber en silence.

### Lot A — **Lecture seule à distance** *(le lot qui sort la chauffe)*

- **Inclus** :
  - couture Rust (`Ctx`, feature flag `server`, `tauri` en dépendance optionnelle,
    `cpal`/`whisper-rs` feature-gatés) ;
  - binaire serveur : service des fichiers statiques (`dist/`), **en-tête CSP** équivalente
    à celle de `tauri.conf.json`, route de commande, **un flux SSE multiplexé** ;
  - **commandes en lecture** : `ping`, `scan_portfolio`, `list_extra_projects`,
    `portfolio_economy`, `portfolio_activity`, `analytics_cost`, `delegations_by_agent`,
    `agent_attribution`, `delegation_edges`, `analytics_index_status`, `analytics_refresh`,
    `pricing_table`, `check_services`, `get_root`, `config_get`, `config_all`,
    `latest_transcript`, `transcript_tail_start`, `transcript_tail_stop`,
    `codex_tail_start`, `frame_load`, `handoff_read`, `handoff_list`, `now_millis`,
    `fetch_main_courante` ;
  - transport front alternatif dans `src/api/backend.ts` **et nulle part ailleurs** ;
  - **dégradation explicite** des fonctions non disponibles en mode serveur (bandeau
    d'auto-update, plein écran natif, dictée, sélecteur de dossier natif) : elles se
    **désactivent proprement et se voient**, elles ne plantent pas et ne mentent pas ;
  - stack `docker/` du serveur + procédure de démarrage ;
  - **mode d'emploi de l'exploitation transitoire** : comment lancer un runner en SSH/tmux
    sur la box et le retrouver dans la vue live attachée (L25) du navigateur.
- **Exclu** : PTY, frappe, spawn de runner depuis l'UI, toute écriture, secrets, voix.

### Lot B — **Interactif** (PTY + runners depuis le navigateur)

- **Inclus** : `pty_open/write/resize/close`, `pty_runner_open`, les canaux
  `pty://output|closed` sur le flux SSE, la frappe (POST, **latence mesurée**), le rendu
  xterm en navigateur, le dialogue de trust (`~/.claude.json`), l'allowlist + le
  system-prompt dérivés du Cadre (L22-P3), la garde L10 (PtyTerminal jamais démonté).
- **Exclu** : la fonte du rendu xterm (différé (b) de L10 — un défaut **préexistant**, à ne
  pas confondre avec une régression du portage ; il faut le mesurer **avant** le lot B pour
  pouvoir le disculper).

### Lot C — **Parité d'écriture**

- **Inclus** : `set_root`, `config_set`, `add_project`, `frame_save`, `frame_export`,
  `prepare_resume`, `seed_demo`, `notify_user`, `next_step`, `chat`, `frame_author`, les
  secrets (`ai_set_key`, `couch_set_credentials`, `n8n_set_token`) via la seconde impl de
  `SecretStore`, et **un remplaçant serveur de `pickDirectory`** — un navigateur **ne peut
  pas** ouvrir un sélecteur de dossier sur le système de fichiers du serveur : il faut une
  commande de listage + un composant de sélection. *(Piège classiquement oublié.)*
- **Exclu** : `voice_listen` (le micro est sur le Mac — il faudrait passer par WebAudio
  côté navigateur : **lot séparé**, cf. § 8), `set_fullscreen` natif (→ API Fullscreen du
  navigateur), auto-update L34 (**sans objet** en mode serveur : le serveur se met à jour
  par déploiement).

### Lot D — **Environnement de la box** (transverse, peut démarrer en parallèle du lot A)

- **Inclus** : chapeau `~/work` sur la box (AR-2) ; **`~/.claude` de la méthode** —
  `CLAUDE.md` global, `skills/`, hooks `delegation-guard.mjs` / `plan-courante.mjs` (sans
  eux : **Journal et widgets de plan muets**) ; auth `claude` (§ 3, faits 1-3) et `codex`
  (fait 4) ; toolchains Node + Rust + CMake ; identité git + token Forgejo (`~/work/.env`) ;
  **décision sur l'historique Analytics** (copier `~/.claude/projects` du Mac vers la box,
  ou assumer une coupure d'historique — l'Analytics est adossé à ces fichiers).
- **Exclu** : la migration des données d'autres projets que ceux du chapeau.

### Hors périmètre de L36 (tous lots)

- Le **disque** du Mac (traité à part).
- Les dettes **sécurité** de L32 sur `.12` → **L35** (lot distinct, déjà tracé).
- Le **daemon iaka** unifié (com/sandbox/admin) de l'horizon `CLAUDE.md` : L36 **peut**
  converger avec lui plus tard, il ne le préempte pas.
- Toute **refonte UI**. Le mode serveur ne change **aucune vue** ; il change le transport.
- Le **multi-utilisateur** / l'accès depuis l'extérieur du LAN.

---

## 7. Étapes d'implémentation

### Lot 0
1. Mesurer la chauffe par processus sur une session type ; produire le tableau des faits.
2. Inventorier l'hôte cible (cœurs/RAM/disque/arch), et chronométrer un `cargo build`
   complet **des deux côtés**.
3. Vérifier le chemin SSH jusqu'à l'hôte + le tunnel de port ; relever les ports occupés.
4. **Remonter un GO/NO-GO** avec AR-1..AR-3 documentés par la mesure. *(gate)*

### Lot A
5. Introduire `Ctx` (dossier de données + émission d'événement) et faire descendre les
   corps de commande dans des `*_impl(ctx, …)` **sans `tauri::`**, module par module, en
   commençant par les modules **sans état** (`portfolio`, `economy`, `pricing`, `services`,
   `handoff`, `frame`), puis `config` (le seul vrai usage d'`AppHandle`).
6. Rendre `tauri` **optionnel** dans `Cargo.toml` ; créer `desktop.rs` (les
   `#[tauri::command]` actuels, réduits à des passe-plats) ; feature-gater `cpal` /
   `whisper-rs`. **Vérifier à cette étape que la cible desktop est strictement inchangée**
   (`quality.sh` vert, app lancée à la main) — c'est le point de non-régression du lot.
7. Écrire `server.rs` : statique + `POST /cmd/<nom>` + `GET /events` (SSE multiplexé),
   en-tête CSP, bind `127.0.0.1:<port du lot 0>`.
8. Adapter l'émission d'événements : les 3 canaux passent par le `Ctx` (Tauri `emit` d'un
   côté, diffusion SSE de l'autre) — **sans renommer les canaux** (`pty://…`, `runner://…`
   restent les noms de contrat).
9. Côté front, dans **`src/api/backend.ts` seul** : un transport `fetch`/`EventSource`
   choisi par `isTauri()`. Aucun hook, aucun composant modifié pour cause de transport.
10. Désactiver proprement et **visiblement** ce qui n'a pas de sens hors Tauri (update,
    plein écran natif, dictée, sélecteur de dossier).
11. Stack `docker/` du serveur (réseau + conteneur préfixés, port hôte dédié) + procédure.
12. **Recette réelle** : navigateur du Mac ↔ serveur sur la box, un runner lancé en SSH,
    la vue live attachée qui défile, l'Analytics qui compte. *(gate)*
13. **Re-mesurer la chauffe du Mac** dans les mêmes conditions qu'à l'étape 1, et
    **confronter au chiffre annoncé**. *(gate — c'est la preuve du besoin, pas un bonus)*

### Lot B
14. Porter les canaux PTY sur le flux SSE ; POST pour la frappe ; **mesurer la latence
    frappe → écho** sur le LAN.
15. Décider au vu de la mesure : batching, ou WebSocket **pour le seul canal PTY** (AR-5).
16. `pty_runner_open` côté serveur : trust `~/.claude.json`, scrub d'environnement,
    allowlist + system-prompt du Cadre, `session_id`, tailer.
17. Recette : ouvrir un projet depuis le navigateur, taper dans la TUI native, voir la
    conversation dérivée. *(gate)*

### Lot C
18. Seconde implémentation de `SecretStore` (fichier `0600` + surcharge par environnement).
19. Commandes d'écriture + remplaçant serveur de `pickDirectory` (listage + composant).
20. Recette de parité : **chaque vue** se comporte pareil en desktop et en navigateur, ou
    l'écart est **déclaré**. *(gate)*

### Lot D *(parallélisable dès le lot 0)*
21. Provisionner l'hôte, y installer les toolchains, cloner le chapeau, poser `~/.claude`
    (méthode + skills + hooks), authentifier `claude` et `codex`, brancher git/Forgejo.
22. Trancher le sort de l'historique Analytics et l'appliquer.
23. Recette : un hook de délégation émis **depuis la box** atterrit dans CouchDB et
    s'affiche au Journal. *(gate)*

---

## 8. Fichiers concernés *(prévision de cadrage, à confirmer à l'implémentation)*

- `src-tauri/Cargo.toml` — `tauri` optionnel, features `desktop`/`server`, `cpal` +
  `whisper-rs` gatés, ajout du serveur HTTP (choix de crate à arrêter au lot A : `axum`
  0.8.9 + `tokio`, **ou** `tiny_http` sans runtime async — ce dernier est cohérent avec le
  parti pris « pas de tokio » déjà inscrit dans ce `Cargo.toml`).
- `src-tauri/src/lib.rs` — `run()` devient l'adaptateur desktop ; le registre des 49
  commandes reste la référence de parité entre les deux adaptateurs.
- `src-tauri/src/desktop.rs` *(neuf)* — les `#[tauri::command]`, réduits à des passe-plats.
- `src-tauri/src/server.rs` + `src-tauri/src/bin/server.rs` *(neufs)* — HTTP, SSE, statique,
  CSP.
- `src-tauri/src/ctx.rs` *(neuf)* — le `Ctx` (dossier de données + émission).
- `src-tauri/src/db.rs` — `open(&AppHandle)` → `open(&Ctx)`.
- `src-tauri/src/{config,portfolio,economy,pricing,services,ai,maincourante,notify,seed,resume,frame,handoff}.rs`
  — `AppHandle` → `Ctx` dans 17 signatures.
- `src-tauri/src/{terminal,transcript,codex}.rs` — émission via `Ctx` ; registres `State`
  → état de processus ; `set_fullscreen` isolé côté desktop.
- `src-tauri/src/secrets.rs` — seconde impl du trait **existant** (lot C).
- `src/api/backend.ts` — **le seul fichier front modifié pour cause de transport.**
- `src/hooks/useAppUpdate.ts`, composant de plein écran, `useVoiceCommand` — dégradation
  visible hors Tauri (lot A, étape 10).
- `docker/` — stack du serveur.
- `CLAUDE.md` (backlog + commandes), `specs/PROJET.md § 10.1` (l'horizon devient un lot
  pris) — mise à jour **à la clôture**, pas avant.

---

## 9. Estimation *(ordre de grandeur assumé, révisable — pas un engagement ferme)*

| Lot | Équivalent jour-homme | Complexité / risque | Inconnues qui peuvent le faire glisser |
|---|---|---|---|
| **0 — Mesure** | **0,5 j** | faible | accès à la box ; représentativité de la session mesurée |
| **A — Lecture seule à distance** | **6 j** (4,5–8) | **élevée** — c'est le lot qui ouvre la couture | ampleur réelle du `AppHandle → Ctx` sur 17 signatures ; compilation Rust sur la box (whisper.cpp, CMake) ; stabilité SSE derrière le tunnel |
| **B — Interactif (PTY)** | **4,5 j** (3,5–6) | **élevée** — latence + TUI native | latence frappe→écho sur le LAN ; rendu xterm (défaut préexistant L10-(b)) ; dialogue de trust en distant |
| **C — Parité d'écriture** | **5 j** (4–6,5) | moyenne | remplaçant de `pickDirectory` (UI à concevoir) ; migration des secrets ; nombre de dégradations à traiter une par une |
| **D — Environnement box** | **2,5 j** (1,5–4) | moyenne, **peu de code, beaucoup d'inconnues** | ressources réelles de l'hôte ; auth `claude`/`codex` ; portage des hooks ; sort de l'historique Analytics |
| **Total complet** | **≈ 18,5 j** (14–25) | | |
| **Total « chauffe sortie » (0 + A + D)** | **≈ 9 j** (6,5–13) | | |

**Lecture de ce tableau** : c'est le rapport **9 j contre 18,5 j pour le même
refroidissement** qui fonde la recommandation de l'AR-1.

**Inconnues transverses, hors chiffres ci-dessus** :
- la box est-elle assez puissante ? (lot 0 — peut invalider tout le chantier) ;
- le confort d'usage en SSH pendant l'intervalle A→B : tenable une semaine, pas six mois ;
- la double maintenance desktop + serveur, dans la durée : chaque commande future devra
  être branchée **des deux côtés**. C'est le coût récurrent que `PROJET.md § 10.1`
  appelait déjà « le surcoût du serveur-agent ». Il ne disparaît pas, il s'assume.

---

## 10. Risques

| # | Risque | Mitigation |
|---|---|---|
| R1 | **On porte 13 200 lignes et le Mac chauffe toujours** (la chaleur venait d'ailleurs, ou des sessions hors Cockpit). | Lot 0 **obligatoire** : mesurer par processus avant, re-mesurer après le lot A (étape 13). Le gain est **prouvé sur pièce**, pas annoncé. |
| R2 | **La box est plus lente** : on troque la chauffe contre l'attente. | Lot 0, étape 2 : `cargo build` chronométré des deux côtés. Seuil de NO-GO explicite (~2×) remonté à Stéphane. |
| R3 | **Régression de la cible desktop** — c'est la cible **première** (`PROJET.md`). | Étape 6 : point de non-régression obligatoire (`quality.sh` + app lancée à la main) **avant** d'écrire une ligne de serveur. Le registre des 49 commandes sert de contrat de parité. |
| R4 | **Deux chapeaux divergents** (Mac + box) — perte de travail. | AR-2 : un seul chapeau de travail, décision d'usage explicite. Forgejo reste l'arbitre. |
| R5 | **Exécution de code arbitraire sur le LAN** dès le lot B. | AR-8 : bind `127.0.0.1` + tunnel SSH, zéro exposition. Constat consigné, non bloquant (arbitrage portefeuille « sécu souple »). |
| R6 | **Secrets en clair sur la box** (pas de Keychain). | AR-7 : fichier `0600`, précédent explicite de Claude Code lui-même. **Régression de posture déclarée**, pas tue. |
| R7 | **Le Journal et les widgets de plan deviennent muets** : ils sont alimentés par les hooks de `~/.claude`, hors dépôt. | Lot D, étape 21 : porter les hooks. Recette dédiée (étape 23). |
| R8 | **L'historique Analytics se coupe en deux** (transcripts d'avant sur le Mac, d'après sur la box). | Lot D, étape 22 : décision explicite (copier / assumer). Ne pas la découvrir en recette. |
| R9 | **La latence de frappe rend la TUI désagréable** (lot B). | Étape 14 : mesurer avant de choisir ; WebSocket en repli borné au seul canal PTY. |
| R10 | **On impute au portage un défaut préexistant** (rendu xterm lent, L10 différé (b)). | Mesurer le rendu xterm **avant** le lot B, pour pouvoir disculper le portage. |
| R11 | **La dictée devient impossible** (le micro est sur le Mac). | Déclarée **hors périmètre** (§ 6, lot C exclu). Le portage WebAudio est un lot à part, pas un « tant qu'on y est ». |
| R12 | **Double maintenance** : une commande future oubliée d'un côté. | Le registre `lib.rs` est le contrat ; un test de parité (toute commande enregistrée a une route) est ajouté au lot A. |

---

## 11. Critères d'acceptation

### Lot 0
- [ ] Un tableau nomme **par processus** ce qui consomme le CPU du Mac sur une session type.
- [ ] Cœurs, RAM, disque libre et **architecture** de l'hôte cible sont relevés.
- [ ] Un `cargo build` complet est chronométré **sur la box et sur le Mac**, chiffres côte à côte.
- [ ] Le tunnel SSH jusqu'à l'hôte est **établi une fois**, et le port retenu est **libre** (relevé à l'appui).
- [ ] Un **GO/NO-GO écrit** est remis à Stéphane, adossé à ces chiffres.

### Lot A
- [ ] `bash scripts/quality.sh` **exit 0** en configuration desktop, **avec le même compte de tests qu'avant** (le portage n'ampute rien).
- [ ] L'app **desktop Tauri** se lance et fonctionne **à l'identique** (recette manuelle) après l'introduction du `Ctx` — vérifié **avant** l'écriture du serveur.
- [ ] Le binaire serveur se construit **sans `tauri`, sans `webkit2gtk`, sans `whisper-rs`** (preuve : `cargo tree` sur la configuration serveur).
- [ ] Depuis le navigateur du Mac, les vues **Portefeuille, Analytics, Journal, Équipes** affichent les **données réelles de la box**.
- [ ] Un runner `claude` lancé **en SSH sur la box** apparaît dans la **vue live attachée** (L25) du navigateur, et défile en direct.
- [ ] Les 3 canaux d'événements arrivent sur **un seul** flux SSE, avec **les noms de canaux inchangés**.
- [ ] Les fonctions sans objet hors Tauri (update, plein écran natif, dictée, sélecteur de dossier) sont **désactivées et visibles comme telles** — aucune erreur en console, aucun bouton qui ment.
- [ ] `src/api/backend.ts` est **le seul fichier de `src/` modifié** pour cause de transport (preuve par `git diff --stat`).
- [ ] Un test de parité échoue si une commande de `lib.rs` n'a pas de route serveur.
- [ ] La stack Docker respecte la convention : réseau + conteneurs **préfixés projet**, port hôte **dédié et sans collision**.
- [ ] **La chauffe re-mesurée** dans les conditions de l'étape 1 est **confrontée au chiffre d'avant**, et le résultat est **dit tel quel** — y compris s'il déçoit.

### Lot B
- [ ] Un projet s'ouvre depuis le navigateur, la TUI native est **typable**, `Shift+Tab` et `esc` gardent leurs réflexes.
- [ ] La latence frappe → écho est **mesurée et chiffrée** ; le choix batching / WebSocket est **justifié par cette mesure**.
- [ ] La garde L10 tient : le terminal **n'est jamais démonté** au basculement Shell ↔ Conversation.
- [ ] L'allowlist et le system-prompt dérivés du Cadre (L22-P3) sont **appliqués au runner distant** (preuve dans la session).

### Lot C
- [ ] Chaque commande d'écriture se comporte **à l'identique** en desktop et en navigateur, ou l'écart est **déclaré dans la doc qualité**.
- [ ] Les secrets sont écrits **write-only** côté serveur (jamais relus vers le front) — la propriété de cloisonnement du desktop est **conservée**.
- [ ] Un dossier peut être **choisi depuis le navigateur** sur le système de fichiers **de la box**.

### Lot D
- [ ] `claude` et `codex` s'authentifient sur la box et **survivent à un redémarrage**.
- [ ] Une délégation émise **depuis la box** atterrit dans CouchDB et s'affiche au **Journal**.
- [ ] Le sort de l'historique Analytics est **tranché et appliqué** ; l'écran ne montre **aucune donnée fabriquée** (règle « zéro fausse donnée » du projet).

---

## 12. Vérification (gate de chaque lot)

- [ ] Typecheck OK
- [ ] Lint OK
- [ ] `cargo fmt --check` + `cargo clippy --all-targets -- -D warnings` OK **dans les deux
      configurations de features**
- [ ] Tests ajoutés/à jour et verts ; `bash scripts/quality.sh` exit 0
- [ ] Recette réelle faite par Stéphane (aucun lot ne se valide sur la seule lecture du code)
- [ ] Doc qualité `docs/qualite/vX.Y.Z.md` ; backlog `CLAUDE.md` et `PROJET.md § 10.1` mis à
      jour **à la clôture**
