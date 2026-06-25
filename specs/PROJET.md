# PROJET — IakaCockpit

> Doc **DAYONE fondatrice** de l'écosystème iakaProject. Espace Cowork (réflexion) :
> **aucun code n'est écrit ici** — vision, valeurs, architecture cible, périmètre, réserves
> de faisabilité (vérifiées sur le web) et plan en *moves*.
> Rédigé par 🧙 Gandalf (P1 — cadrage), iakaframe. Date : 2026-06-24.

> **Règle de priorité.** La vision de Stéphane prime. iakaIDE
> (`/Users/sjupin/work/iakaIDE`) et sa reverse fonctionnelle sont **du matériau de
> référence subordonné** : on **salvage son backend Rust éprouvé** (27 commandes : scan
> git, portfolio, PTY, services, config — cf. § 3.4) et on garde les concepts UX éprouvés
> (grille de widgets + dock + onglets, moteur « prochaine étape »), mais le **front est
> réécrit propre**. Partout où la vision diffère de l'existant, **la vision gagne**.

---

## 1. Vision & positionnement — un ORCHESTRATEUR, pas un énième outil

**IakaCockpit est le CŒUR de l'écosystème iakaProject.** C'est l'outil **central** de
**management / développement / testing** des projets créés avec la **méthode iakaframe +
IA**. Il *assume* la méthode (les 3 acteurs, les royaumes, les gates, les mains courantes
3-canaux) et *embarque* les **iakachartes** (le design vit dans `iakagraph/theme/`, le
Cockpit le consomme).

### 1.1 Le positionnement, en une phrase
Le Cockpit est un **ORCHESTRATEUR AU-DESSUS des outils existants** — **pas un énième** client
LLM, terminal IA ou manager MCP. Sa règle de conception est **« câbler l'existant plutôt que
rebâtir »** :
- **Multi-modèle = LiteLLM** en passerelle. On **ne recode pas** le routage multi-provider :
  le Cockpit parle à **une** API (compatible OpenAI) exposée par **LiteLLM**, qui route vers
  Claude, Ollama, etc. L'agnosticisme modèle **passe par LiteLLM** (cf. § 2.2).
- **MCP = lien vers Obot**. **Pas de MCP manager maison** : l'admin des tools MCP **renvoie à
  Obot** (gateway open-source self-hosted — différé, cf. § 9 horizon).
- **Embarquer/lier plutôt que refaire**, partout où un outil mûr existe.

### 1.2 Benchmark — ce qu'on ne cherche PAS à battre
**OpenWebUI, AnythingLLM, LM Studio, Codex, Claude Desktop** sont des concurrents sur le
terrain du « client/atelier LLM » — on **ne les bat pas à leur jeu** et on **ne les
réimplémente pas**. **Notre singularité**, qu'aucun d'eux n'offre :
- la **méthode iakaframe** matérialisée (3 acteurs, royaumes, gates, instructions) ;
- les **mains courantes 3-canaux** (adresse / geste / pensée / agent) ;
- le **pilotage de portefeuille** (N projets vus, scannés, pilotés depuis le chapeau).
Le Cockpit **orchestre** ces outils-là au service de cette singularité.

### 1.3 Ancrage au chapeau
Comme Odin, le Cockpit est **attaché à la RACINE** — le répertoire « chapeau » qui coiffe
tous les projets (`~/work`, `C:\work`, exposé via `IAKAFRAME_ROOT`). Ses **settings vivent au
niveau chapeau**, pas par projet : une seule instance pilote **tout le portefeuille**. Un
projet est une *donnée* que le Cockpit observe et pilote, pas le périmètre de l'application.

### 1.4 Ce que ça change par rapport à iakaIDE
iakaIDE était un « AI-driven project manager » desktop centré sur la vue portefeuille + la
« prochaine étape ». Le Cockpit **élargit** vers le **poste de pilotage de la méthode** —
projets, mains courantes 3-canaux, orchestration des outils tiers (LiteLLM, Obot) — tout
depuis le chapeau, **cross-OS dès le départ**.

**Public.** D'abord **dogfooding** sur le portefeuille de Stéphane (~29 dépôts Forgejo,
méthode iakaframe). Généralisable ensuite à tout porteur de projets travaillant « méthode +
IA ».

---

## 2. Valeurs cardinales — l'AGNOSTICISME

L'agnosticisme est **la** valeur structurante : le Cockpit ne doit jamais être prisonnier
d'un OS, d'un modèle, d'un runner ou d'un hébergement. Cinq axes — **mais l'agnosticisme se
réalise en câblant des outils mûrs, pas en recodant des abstractions** (cf. § 1.1).

### 2.1 Agnostique OS (multi-OS) — *socle v0.1*
- **Shell par défaut selon l'OS** : PowerShell sur Windows, `zsh`/`bash` sur macOS/Linux,
  via **`portable-pty`** (un PTY natif par OS, piloté uniformément côté Rust).
- **Chemins via le chapeau** : jamais de chemin en dur. Résolution par `IAKAFRAME_ROOT`
  (fallback `~/work` / `C:\work`). Séparateurs et casse gérés par la couche d'abstraction.
- **Invocation IA agnostique** : plus de `cmd /C` Windows-only ; un lanceur de process
  uniforme (binaire + args + cwd + env), résolu par OS. **Dé-Windows-isation** du backend
  Rust salvagé (cf. § 3.4).
- Conséquence : **le même Cockpit tourne identiquement** sur les 3 OS dès le départ
  (décision verrouillée — cross-OS day one, pas « windows d'abord, le reste après »).

### 2.2 Agnostique modèle (multi-LLM) — *via LiteLLM, socle v0.1*
- **L'agnosticisme modèle passe par LiteLLM**, pas par une couche maison. Le Cockpit parle à
  **une seule** API (compatible OpenAI) exposée par **LiteLLM (proxy self-hosted)** ; LiteLLM
  route vers les backends réels. **On ne recode pas** le routage multi-provider.
- **Côté Cockpit, un seul « provider » : LiteLLM.** Au départ, LiteLLM est configuré pour
  router vers **Claude + Ollama** (les deux réellement câblés) ; en ajouter d'autres = config
  LiteLLM, **sans toucher au Cockpit**. Pas de provider fantôme exposé dans l'app.
- Un **mock** local reste possible en dev (réponses simulées sans appeler LiteLLM).

### 2.3 Agnostique runner (multi-runner) — *socle v0.1 (un runner câblé)*
- L'« agent d'exécution » lancé par le Cockpit n'est pas figé sur un seul harnais.
  Aujourd'hui : Claude Code en CLI. Demain : un autre runner (autre CLI agentique, script,
  job). Le Cockpit pilote un **runner abstrait** (commande + cwd + env + canal de sortie
  PTY), pas « Claude Code » en dur.

### 2.4 Agnostique cible de test/staging (multi-target) — *hors scope v0.1*
Vision : déployer/tester un livrable sur plusieurs cibles (sandbox / Docker local / LAN /
WAN). **Hors scope v0.1 — Stéphane précisera SA solution plus tard** (cf. § 8). On ne
spécifie pas de driver de cible au socle.

### 2.5 Agnostique projet (multi-projets) — *socle v0.1*
- Le Cockpit **n'est pas mono-projet** : il scanne le chapeau, liste N projets, suit leur
  état git, et **un PTY cross-OS par projet** + des mains courantes par projet. Le
  portefeuille est la donnée native. (Le PTY *simultané* multi-projets est validé au socle ;
  l'ampleur de la parallélisation s'affine en démo.)

---

## 3. Architecture cible

### 3.1 Stack
| Couche | Choix | Raison |
|---|---|---|
| Frontend | **React + TypeScript (Vite)** | Cohérent avec l'existant iaka ; itération rapide, écosystème riche |
| Coquille desktop | **Tauri 2 (Rust)** | Accès filesystem + lancement de process (git, runners, PTY) ; bundle léger (vs Electron) ; cibles desktop **et mobile** depuis un seul front |
| Terminal | **xterm.js (front) + `portable-pty` (Rust)** | Multi-onglets / multi-projets ; stack confirmée par des projets 2026 (Terax AI, `tauri-plugin-pty`) |
| Données locales | **SQLite** | État, config chapeau, cache portefeuille, historique — zéro serveur |
| Moteur IA | **LiteLLM** (proxy, API OpenAI-compat) + mock dev | Agnosticisme modèle délégué à LiteLLM ; route vers Claude + Ollama (self-hosted-first) |
| Secrets | **Keychain OS** (Keychain macOS / Credential Manager Windows / Secret Service Linux) | **Plus de secrets en clair** (dette iakaIDE corrigée d'emblée) |
| Mains courantes | **iakaboxlogs** (MQTT Mosquitto + CouchDB sur VM2 `.11`) | Réutilisation de l'existant déployé/validé (push MQTT → CouchDB) |
| Hébergement app | **Desktop local** (chapeau-rooted) | Le pilotage local (FS, git, PTY) est au cœur. *Pas de cible web/PWA — annulée (§ 10).* |

> Self-hosted/open-source d'abord (LiteLLM, Ollama, CouchDB, Forgejo, Obot) ; Claude = modèle
> premium routé par LiteLLM.

### 3.2 Abstraction backend (front propre, découplé de Tauri)
Tout accès aux **capacités locales** (filesystem, git, PTY, SQLite, runner IA, keychain, appel
LiteLLM) passe par **une seule couche d'abstraction** côté front : `src/api/backend.ts` →
`invoke()` (commandes Rust). Intérêt **au socle** : (a) un front **propre et testable**
(mockable sans Tauri, ce qui sert la maquette runnable du MOVE 2), (b) **pas de couplage diffus**
aux `invoke()` partout. *Aucune cible web n'est visée (§ 10.1) ; l'abstraction sert la propreté
et le test, pas un build navigateur.*

### 3.3 Socle technique = principes (la dette iakaIDE devient des règles)
Acquis verrouillés, appliqués **dès le premier module** :
- **CSP stricte** + sanitisation du rendu Markdown (pas de XSS dans les visionneuses `.md`).
- **Secrets en keychain OS** (jamais en clair dans SQLite ni en fichier).
- **Garde-fous de chemins testés** dès le premier module sensible (équivalents
  `safe_path`/`safe_project_dir` : path-traversal **couvert par des tests**, pas promis).
- **Pas de god-component** : hooks séparés d'emblée (`useGridState`, `usePortfolio`,
  `usePty`, `useMainCourante`…), pas un composant qui sait tout.
- **Couverture honnête** : on mesure et on dit la vérité sur ce qui est testé (la fierté
  iakaIDE était une couverture ~2 % maquillée — banni).

### 3.4 Salvage du backend Rust iakaIDE (« propre » ≠ « tout réécrire »)
**« Réécriture propre » = front réécrit + sécurité d'emblée + dé-Windows-isation, MAIS on
SALVAGE le backend Rust éprouvé d'iakaIDE.** Ce backend (≈ **27 commandes** Tauri : scan git,
portfolio, **PTY**, services, config) est **fonctionnel et testé en réel** ; on **ne le
re-dérive pas from scratch**. Le travail dessus :
- **récupérer** les commandes éprouvées (scan/portfolio/PTY/services/config) ;
- **dé-Windows-iser** (shells via `portable-pty` selon l'OS, plus de `cmd /C`, chemins via
  chapeau) ;
- **durcir** selon § 3.3 (keychain pour les secrets aujourd'hui en clair, tests des garde-fous
  de chemins, CSP).
Le **front**, lui, est **réécrit** (pas de god-component, hooks séparés).

### 3.5 Schéma (cible v0.1)
```
                 Décideur (Stéphane)  ──── arbitre / valide les gates
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │  UI React + TS  (front RÉÉCRIT, chapeau-rooted)            │
   │  UX : grille widgets + dock + onglets/vues                 │
   │  Vues : Dashboard · Work · PTY · Mains courantes 3-canaux  │
   └───────────────┬───────────────────────────────────────────┘
                   │  src/api/backend.ts  (Tauri invoke)
   ┌───────────────▼───────────────────────────────────────────┐
   │  Tauri core (Rust)  — backend SALVAGÉ iakaIDE + dé-Win     │
   │  scan projets · git · portable-pty · runner · SQLite ·     │
   │  keychain · client LiteLLM                                 │
   └──┬──────────┬──────────┬───────────┬──────────────┬────────┘
      │          │          │           │              │
   chapeau     git       PTY/run    SQLite/keychain   LiteLLM ──► Claude / Ollama
   (~/work)  (état)  (par projet)  (état/secrets)    (proxy, route les modèles)

   iakaboxlogs (MQTT .11 → CouchDB .11) ──► mains courantes 3-canaux (lecture)
```

---

## 4. Inventaire des VUES / ÉCRANS

> Modèle UX **v0.1 = l'UX éprouvée iakaIDE, réécrite** : **grille de widgets + dock +
> onglets/vues**. Une **barre d'onglets/modes** bascule entre vues ; au sein du mode
> « Grille », des **widgets dockables/redimensionnables** + un **dock**. Un thème = un jeu de
> variables CSS (iakachartes), ne touche jamais la logique.
>
> **Le bureau-OS / window-manager (façon macOS-Ubuntu, idée iakastart/iakapages) est
> EXPLICITEMENT HORS v0.1** — « pour ne pas dérouter les users ». À explorer plus tard avec
> 🎭 Loki (cf. § 9 horizon).

### Vues produit — *socle v0.1*

| Vue | Rôle | Contenu |
|---|---|---|
| **Dashboard projets** | Vue portefeuille du chapeau | Cartes de projets (git propre/sale, ahead/behind, version, dernière activité). **Réutilise `naonedge-dashboard`** (scan + cartes + onglets par projet). |
| **Work** | Plan de travail d'un projet (≈ iakaIDE) | Moteur **« prochaine étape » IA** (cœur), jalons à valider, commits en attente, travail récent. |
| **Grille widgets + dock** | Cockpit composable | Widgets repositionnables (portefeuille, agents, jalons, services, PTY, mains courantes…) + dock pour ajouter/retirer. |
| **PTY par projet** | Terminaux des runners (cross-OS) | N onglets = N sessions PTY ; **titre = `[ROYAUME][Agent]` + état** (working/pending/stopped). Shell par défaut selon l'OS. |
| **Mains courantes 3-canaux** | Journal filtrable par projet | adresse / geste / pensée / agent — branché sur **iakaboxlogs** (§ 5). Filtres applicables aussi au PTY. |

### Écrans ADMIN — *HORIZON (hors v0.1)*

La **suite admin complète** est **différée** (hors socle). Tracée pour mémoire :

| Écran admin | Rôle | Statut |
|---|---|---|
| **Admin projets** | Ajouter/retirer un projet du chapeau, brancher Forgejo | Horizon |
| **Admin team / agents** | Roster des royaumes/agents, qui est armé | Horizon |
| **Admin agent** + **admin par prompt** | Fiche agent + champ prompt éditant `agent.md` (§ 4.1) | Horizon |
| **Admin skills** | Inventaire/activation des skills | Horizon |
| **Admin tools (MCP)** | **Lien vers Obot** (pas de manager maison) | Horizon (différé) |
| **Admin cockpit** | Réglages globaux : LiteLLM, endpoints, thème, chapeau | Partiel v0.1 (réglages minimaux : chapeau, endpoint LiteLLM, thème) |

### 4.1 ADMIN PAR PROMPT — *horizon (différé)*
Vision : sur l'écran **Admin agent**, un **champ de prompt** modifie le comportement d'un
agent **en langage naturel** ; le prompt **édite le `agent.md`** (affiché ET éditable
manuellement, source de vérité = le `.md`, diff montré avant écriture). **Hors v0.1.**

### 4.2 Portraits / bustes d'agents — *horizon (différé)*
Vision (trois voies) : **upload** d'image · **génération par prompt** (ComfyUI `.12`) ·
**référence depuis une team vers une iakacharte**. **Hors v0.1** (portraits générés différés).

---

## 5. Mains courantes — modèle 3-canaux — *SOCLE v0.1*

> **Remontée en socle v0.1** : c'est **la signature de la méthode** (rien de comparable chez
> OpenWebUI/AnythingLLM/LM Studio/Codex/Claude Desktop) et **ce n'est pas cher** —
> **iakaboxlogs existe déjà** (déployé/validé). On branche, on ne rebâtit pas.

**Une main courante par projet** : un **journal FILTRABLE par canal**, directement adossé au
**concept des 3 canaux d'un agent LLM**
(`/Users/sjupin/work/iakaframe/concept-trois-canaux-llm.html`) :

| Canal | Nature | Dans le journal |
|---|---|---|
| **Adresse** | Parole publique adressée à l'humain (le seul canal « engageant ») | messages visibles de l'agent |
| **Geste** | Actes : appels d'outils, **délégations**, résultats | lignes d'action (l'angle mort des garde-fous — d'où l'intérêt de les tracer) |
| **Pensée** | Délibération privée (visible ou masquée selon le modèle) | raisonnement, si exposé |
| **Agent** | Filtre par émetteur (`[ROYAUME][Agent]`) | quel agent a produit la ligne |

- **Filtres applicables au PTY** : les mêmes filtres (adresse/geste/pensée/agent)
  s'appliquent au terminal **pour alléger les conversations** (ne voir que l'adresse, ou
  isoler les gestes d'un agent).
- **Extension envisagée — filtre par *event*** (piste de roadmap, non figée) : une dimension de
  filtre supplémentaire (en plus de canal/agent), **vue transversale sur le canal « geste »** —
  types d'event **ouverts/extensibles** : jalon, **délégations**, **utilisation de tools** (outils
  **métier**, pas la plomberie de dev), *etc.* L'event **jalon** ouvre une **fiche jalon** (auteur,
  input, rapport, verdict PASS/FAIL). Détail et rattachement en `specs/roadmap.md` (L2).
- **Lien iakaboxlogs (réutilisation).** iakaboxlogs est **déjà déployé et validé** (VM2
  `.11`) : agents → **MQTT (Mosquitto)** → pont → **CouchDB** (consultable Fauxton), topics
  `iakaboxlogs/<royaume>/<agent>/<conv_id>`, documents `{role, content, meta, ts, …}`. Le
  Cockpit **lit cette main courante** (CouchDB HTTP/JSON) plutôt que de réimplémenter le
  stockage. Le mapping `role`→canal (adresse/geste/pensée) est à **affiner** côté schéma
  (réserve § 10.4) ; au socle, on lit ce qui existe et on enrichit `meta.canal` au besoin.
- **Portée du traçage — on ne trace PAS les composants de dev.** Le canal « Geste » trace
  les actes **métier** des agents (parole adressée, délégations entre agents, appels d'outils
  côté produit, résultats). Les **composants de dev** — au premier chef **MCP** (rattaché à
  **Obot**, cf. § 1.1 / § 4) — sont des **rouages d'outillage de développement, pas des actes
  métier à journaliser dans le cockpit**. Règle : *MCP est un composant de dev → il n'apparaît
  pas dans la main courante du cockpit.* (Le traçage **machine des délégations** reste prévu en
  L4 ; il porte sur la chaîne d'agents, pas sur la plomberie MCP.)
- **On ne re-trace pas ce que git trace déjà.** Les **sorties de projet** (commits, diffs,
  tags, historique) sont **la source de vérité dans git** ; le cockpit **lit/affiche** cet état
  (vues portfolio/jalons) mais ne le **re-journalise pas** dans la main courante. Le journal du
  cockpit porte sur la **conversation et les actes d'agents**, pas sur le versionnage du code.
- **L'engagement de l'humain passe par un agent qui vient demander, pas par la surveillance d'un
  journal.** Si une **action réelle de Stéphane** est attendue (validation, arbitrage, feu vert),
  c'est **le rôle d'un agent de venir la solliciter explicitement** sur le **canal « adresse »**
  (le seul engageant). La main courante reste un journal **consultable**, jamais un dispositif
  où l'humain devrait *guetter* qu'on attend quelque chose de lui.

---

## 6. Modes de PRÉSENTATION (réglage GLOBAL) — *v0.1 = mode B seul*

Vision (réglage **global** de l'app, valant pour toute l'app) — trois modes :

1. **Terminal old-school** — flux brut, monospace. *(Horizon — mode A)*
2. **Terminal dans la charte iaka** — même flux, habillé par l'iakacharte active (NaonEdge
   dark/or par défaut). **← seul mode du socle v0.1 (mode B).**
3. **Conversation type WhatsApp** — bulles, fils, lecture grand public. *(Horizon — mode C)*

**v0.1 : uniquement le mode B (charté).** Les modes A et C sont **différés** (le commutateur
de présentation viendra en horizon).

---

## 7. CANAUX EXTERNES de conversation — *HORS SCOPE v0.1*

Vision : converser avec ses agents depuis l'extérieur (Slack, Discord, app MQTT iakaProject),
depuis un **téléphone**, en **vocal**, voire **CarPlay / Android Auto**.

**Statut : HORS SCOPE v0.1 — Stéphane précisera SES solutions plus tard.** On **ne spécifie
pas** ici de solution technique (ni bot Slack/Discord, ni app mobile, ni STT/TTS). Les
contraintes connues (CarPlay/Android Auto = app mobile native distincte, Android Auto bloque
les chatbots tiers) sont consignées en réserve § 10.2 **à titre d'information**, sans en faire
un backlog technique.

---

## 8. Cibles de TEST / STAGING — *HORS SCOPE v0.1*

Vision : tester/déployer un livrable sur plusieurs cibles (**sandbox / Docker local / LAN /
WAN**) depuis le Cockpit.

**Statut : HORS SCOPE v0.1 — Stéphane précisera SA solution plus tard.** On **ne spécifie
pas** de driver de cible ni d'orchestration de déploiement au socle. (Rappel méthode :
isolation Docker par projet conservée le moment venu.)

---

## 9. SCOPE EXPLICITE — SOCLE v0.1 (SIGNÉ) vs HORIZON / HORS-SCOPE

> **Périmètre v0.1 signé par Stéphane** (arbitrage 2026-06-24). Le socle est **court et
> livrable** ; le reste est tagué **non codé**.

### SOCLE v0.1 — IN (le périmètre signé)
Objectif : **un Cockpit chapeau-rooted, cross-OS, qui voit le portefeuille, propose la
prochaine étape, lance un runner par projet, journalise en 3-canaux**, avec un socle sain.

- **S1 — Scaffolding cross-OS + front propre** : Tauri 2 + React/TS + SQLite,
  **chapeau-rooted** (`IAKAFRAME_ROOT`), abstraction `src/api/backend.ts`, **pas de
  god-component** (hooks séparés). **UX = grille widgets + dock + onglets/vues.**
- **S2 — Backend Rust salvagé/cross-OS-isé** : récupérer les commandes éprouvées d'iakaIDE
  (scan git, portfolio, PTY, services, config — ~27 cmd), **dé-Windows-iser**, durcir (§ 3.4).
- **S3 — Dashboard projets** : scan du chapeau + état git (cartes). **Réutilise
  `naonedge-dashboard`.**
- **S4 — PTY cross-OS par projet** : `portable-pty`, shell par défaut selon l'OS, onglet titré
  `[ROYAUME][Agent]` + état.
- **S5 — Moteur « prochaine étape » IA** : **via UN provider derrière LiteLLM** (route Claude +
  Ollama ; mock en dev). **Cœur du reboot.**
- **S6 — Mains courantes 3-canaux** : adresse/geste/pensée/agent, **branchées sur iakaboxlogs**
  (MQTT/CouchDB `.11`), filtrables (appliqué aussi au PTY). **Signature de la méthode.**
- **S7 — Socle sécurité** : **keychain OS**, **CSP stricte**, **tests des garde-fous de
  chemins**, **couverture honnête** mesurée.
- **S8 — Positionnement orchestrateur** matérialisé : **LiteLLM** comme passerelle modèle,
  **lien Obot** prévu pour les tools MCP (réglages minimaux : chapeau, endpoint LiteLLM, thème).
- **S9 — Une iakacharte** (NaonEdge par défaut) — **mode de présentation B (charté) seul**.

### HORIZON — OUT (différé, tracé)
- **MCP = lien Obot** : **différé** (pas de manager maison ; quand on l'ouvre, on lie Obot).
- **Bureau-OS / window-manager** (macOS-Ubuntu, idée iakastart/iakapages) : **différé → à
  explorer avec 🎭 Loki** (hors v0.1 pour ne pas dérouter les users).
- **Cible web parallèle** (rouverte 2026-06-25) : **différé/horizon** — UI navigateur servie par
  un **daemon local** réexposant les commandes via la couture `src/api/backend.ts`, **desktop +
  web maintenus en parallèle**. Points durs à cadrer : auth, CSP, FS sur HTTP local, ports
  (cf. § 10.1). **Non planifié** — pas en v0.1.
- **Suite admin complète** : admin projets/team/agents/agent/skills, **admin-par-prompt** +
  édition `agent.md`.
- **Portraits générés** d'agents (upload / génération ComfyUI / référence charte).
- **Modes de présentation A & C** (terminal old-school / WhatsApp) + commutateur.
- **Providers IA additionnels** (ajoutés côté config LiteLLM, pas côté Cockpit).
- PTY *multi-projets simultanés* à grande échelle (le PTY par projet est socle ; l'ampleur
  s'affine en démo).

### HORS-SCOPE — OUT (Stéphane précisera SES solutions plus tard)
- **Mobile / vocal / CarPlay / Android Auto** — *Stéphane précisera* (cf. § 7, réserve § 10.2).
- **Multi-target test/staging** (sandbox / Docker local / LAN / WAN) — *Stéphane précisera*
  (cf. § 8).
- **Canaux externes de chat** (Slack / Discord / app MQTT conversationnelle) — *Stéphane
  précisera*.

### ANNULÉ — retiré du projet
- **RAG docs projets** : **annulé** (le moteur F2 marche sur contexte assemblé ; cf. § 10.3).

> **Révisé 2026-06-25** : **Web / PWA** n'est **plus annulé** → **rouvert en DIFFÉRÉ/horizon**
> (double cible desktop+web maintenue en parallèle via daemon local + couture `backend.ts` ;
> cf. § 10.1). Voir « HORIZON — OUT » ci-dessus.

---

## 10. RÉSERVES DE FAISABILITÉ (vérifiées sur le web, 2026-06-24)

### 10.1 Cible web/PWA — *RÉOUVERTE en DIFFÉRÉ/BACKLOG (révision 2026-06-25)*

> **Note de révision — 2026-06-25 (décision Stéphane).** La cible web, jusqu'ici **annulée**,
> est **rouverte** par Stéphane et repasse en **différé / backlog (horizon)** — *« on inscrit au
> backlog pour plus tard, kit à avoir deux versions maintenues en parallèle »*. L'objectif n'est
> **pas** de remplacer le desktop, mais de **maintenir DEUX cibles en parallèle** :
> - **Desktop** (Tauri 2) — cible actuelle, **inchangée**, reste **première**.
> - **Web** — UI navigateur servie par un **daemon local** (« serveur-agent ») qui réexpose les
>   mêmes commandes (FS / git / PTY / SQLite / keychain) en **HTTP local**, à la place des
>   `invoke()` Tauri.
>
> **La couture qui rend ça tractable existe déjà : la façade unique `src/api/backend.ts`** (D7 /
> § 3.2). On y brancherait un transport `fetch()` vers le daemon **en alternative** à `invoke()`.
> ⚠️ **Évolution assumée du § 3.2** : la façade y était décrite comme servant « la propreté et le
> test, **pas** un build navigateur » — cette décision fait **précisément évoluer ce point**.
>
> **Points durs à cadrer le jour où le lot sera pris** (mémoire du « pourquoi c'était annulé » —
> ne pas les perdre) : **surcoût du serveur-agent** (un daemon à écrire/maintenir) et **surface
> de sécurité** ouverte par l'exposition HTTP locale — **auth** du daemon, **CSP** côté UI web,
> **exposer le FS sur HTTP local**, **gestion des ports**. **Rien n'est figé** côté technique
> (pas de choix de daemon arrêté) : ceci n'est qu'une **inscription au backlog + traçage de
> changement de scope**, pas un cadrage du lot (instruction dédiée le moment venu).

**Rappel du fait historique (raison de l'annulation initiale, conservé).** Tauri 2 partage un seul
front desktop/mobile mais **n'émet pas nativement de bundle web/PWA** (feature demandée non
livrée) ; une cible web suppose donc un **serveur-agent** réexposant FS/git/PTY/SQLite en HTTP —
surcoût qui avait motivé l'annulation. **L'abstraction `src/api/backend.ts` reste** (§ 3.2) ; avec
la révision ci-dessus, elle redevient **aussi** la couture de la double cible, et non plus
seulement un outil de propreté/test.

### 10.2 CarPlay / Android Auto — *hors scope ; contraintes consignées pour info*
- **Apple CarPlay** : depuis iOS 26.4, Apple ouvre les **apps conversationnelles voix-seules**
  (ChatGPT, Perplexity, Grok intégrés). Une entitlement CarPlay est requise, **une seule
  catégorie par app** (Audio, Communication, Navigation, EV, Parking, sécurité publique…),
  approbation Apple centrée sur la **sécurité du conducteur**. Un « cockpit de dev » n'entre
  dans **aucune** catégorie « usage général » — seul un **front conversationnel/vocal** dédié
  serait recevable.
- **Android Auto** : **plus restrictif** — Google **interdit les chatbots tiers** (seul Gemini
  est permis). Un assistant conversationnel iaka **ne passerait pas** côté Android Auto.
- **Conclusion (pour info)** : CarPlay/Android Auto exigeraient une **app mobile native
  séparée**, **vocale**, et même là Android Auto est **un mur** (chatbots tiers interdits).
  C'est **hors scope v0.1** ; **Stéphane précisera SA solution** s'il y revient (§ 7).

### 10.3 RAG docs projets — *ANNULÉ (pour mémoire de la raison)*
La décision est **d'annuler** le RAG. Raison : le moteur « prochaine étape » **fonctionne déjà
sur un contexte assemblé** (extraits `specs/` + git, cap ~4-6k car., modèle iakaIDE F2) — un
index vectoriel serait de la sur-ingénierie au regard du besoin. Retiré du périmètre (même de
l'horizon).

### 10.4 Réutilisation iakaboxlogs (MQTT/CouchDB) — *acquis, mapping à affiner*
iakaboxlogs est **déployé et validé** (Mosquitto + CouchDB sur VM2 `.11`, skill de push
`log-conversation` opérationnelle). Le Cockpit **lit** cette base (HTTP/JSON Fauxton/CouchDB)
pour les mains courantes — **réutilisation directe**, pas de réimplémentation. **Réserve** : le
schéma actuel porte `role` (user/assistant/system), **pas** explicitement les 3 canaux
(adresse/geste/pensée) ; un **mapping** ou un enrichissement `meta.canal` est à cadrer pour le
filtrage 3-canaux (instruction dédiée, horizon).

### 10.5 PTY cross-OS par projet — *faisable (confirmé 2026)*
`portable-pty` + `xterm.js` sur Tauri 2 est une stack **éprouvée en 2026** (projets Terax AI,
`tauri-plugin-pty`) pour des **terminaux multi-onglets natifs cross-OS**. Le **PTY par projet**
est **socle v0.1** (le backend iakaIDE salvagé porte déjà un PTY) ; l'ampleur de la
parallélisation simultanée s'affine en démo runnable (§ 11).

### 10.6 Orchestration LiteLLM + lien Obot — *aligné, à câbler*
- **LiteLLM** est un **proxy open-source self-hostable** exposant une API **compatible OpenAI**
  qui route vers de nombreux backends (Claude, Ollama…). C'est l'outil **standard** pour
  « parler à une API et laisser le routage multi-modèle dehors » — exactement le besoin § 2.2.
  Le Cockpit n'embarque qu'**un client** vers l'endpoint LiteLLM (URL + clé en keychain).
- **Obot** (MCP gateway open-source self-hosted) couvre le besoin « tools MCP » sans manager
  maison ; **différé** — quand l'écran tools s'ouvrira, on **lie** Obot (au pire une vue sur
  son API). Conforme « réutiliser l'existant + open-source d'abord ».

---

## 11. PLAN en *moves* (process resserré — on saute les maquettes JPG)

> Méthode : on ne code pas avant d'avoir **vu** et **validé** l'UX. **Trois temps** (les
> maquettes JPG statiques sont **sautées** — on va directement au prototype cliquable).

1. **MOVE 1 — DAYONE** *(ce document)* : vision, valeurs, architecture, scope signé, réserves.
   → **gate humain** : Stéphane valide la doc fondatrice.
2. **MOVE 2 — Maquette runnable FAKE (HTML jetable)** : un prototype **cliquable en HTML
   jetable** (front seul, données **mockées**) — navigation, **grille widgets + dock +
   onglets**, PTY factice, « prochaine étape » simulée, mains courantes 3-canaux factices.
   But : **valider l'UX** avant tout code de prod. → gate.
3. **MOVE 3 — Dev (socle v0.1)** : front réécrit propre + **backend Rust salvagé/dé-Windows-isé**
   (scan, git, PTY, LiteLLM, keychain) + **mains courantes iakaboxlogs**, feature par feature,
   **instruction écrite avant chaque tâche** (`specs/instructions/`), commits atomiques, tests
   des garde-fous.

---

## 12. Backlog des features (amorce)

Chaque feature reçoit son fichier dans `specs/instructions/` AVANT implémentation.

| Feature | Instruction | Phase |
|---|---|---|
| Maquette runnable fake (HTML jetable, UX) | `specs/instructions/m2-maquette-runnable.md` | MOVE 2 |
| S1 — Scaffolding cross-OS + front propre (grille+dock+onglets) | `specs/instructions/s1-scaffolding.md` | Socle v0.1 |
| S2 — Backend Rust salvagé/dé-Windows-isé (~27 cmd iakaIDE) | `specs/instructions/s2-backend-salvage.md` | Socle v0.1 |
| S3 — Dashboard projets (réutilise naonedge-dashboard) | `specs/instructions/s3-dashboard.md` | Socle v0.1 |
| S4 — PTY cross-OS par projet | `specs/instructions/s4-pty.md` | Socle v0.1 |
| S5 — Moteur « prochaine étape » IA via LiteLLM | `specs/instructions/s5-next-step-litellm.md` | Socle v0.1 |
| S6 — Mains courantes 3-canaux (iakaboxlogs) | `specs/instructions/s6-mains-courantes.md` | Socle v0.1 |
| S7 — Socle sécurité (keychain, CSP, tests chemins, couverture) | `specs/instructions/s7-securite.md` | Socle v0.1 |
| S8 — Orchestrateur (client LiteLLM, lien Obot prévu) + réglages min | `specs/instructions/s8-orchestrateur.md` | Socle v0.1 |
| S9 — iakacharte + mode présentation B (charté) | `specs/instructions/s9-charte.md` | Socle v0.1 |
| (Horizon) suite admin, admin-par-prompt, portraits, modes A/C, lien Obot, bureau-OS | à spécifier | Horizon |
| (Hors-scope, Stéphane précisera) mobile/vocal/CarPlay, multi-target Docker, canaux chat | — | Hors-scope |

---

## 13. Décisions structurantes (journal)

> Trace courte des arbitrages — le « pourquoi » qui se perd sinon.

- **2026-06-24** — **IakaCockpit = cœur d'iakaProject**, **ancré au chapeau** ; **positionné
  ORCHESTRATEUR au-dessus des outils** (câbler plutôt que rebâtir), pas un énième client LLM.
  Benchmark : on ne bat pas OpenWebUI/AnythingLLM/LM Studio/Codex/Claude Desktop à leur jeu ;
  singularité = méthode iakaframe + 3-canaux + pilotage portefeuille.
- **2026-06-24** — **Agnosticisme = valeur cardinale**, réalisé en câblant des outils mûrs :
  **multi-modèle = LiteLLM** (on ne recode pas le routage), **MCP = lien Obot** (pas de manager
  maison, différé).
- **2026-06-24** — **« Réécriture propre » = front réécrit (pas de god-component) + sécurité
  d'emblée + dé-Windows-isation, MAIS backend Rust iakaIDE SALVAGÉ** (~27 cmd : scan git,
  portfolio, PTY, services, config), pas re-dérivé. **Cross-OS day one.**
- **2026-06-24** — **La dette iakaIDE devient des principes de socle** : CSP stricte, secrets
  keychain, garde-fous chemins testés, pas de god-component, couverture honnête.
- **2026-06-24** — **UX v0.1 = grille widgets + dock + onglets/vues** (UX éprouvée iakaIDE).
  **Bureau-OS / window-manager (iakastart/iakapages) DIFFÉRÉ** (hors v0.1, pour ne pas dérouter
  les users → à explorer avec Loki).
- **2026-06-24** — **Mains courantes 3-canaux REMONTÉES EN SOCLE v0.1** (signature de la
  méthode, peu coûteuse car **iakaboxlogs existe** ; MQTT/CouchDB `.11`). Mapping
  `role`→3-canaux (`meta.canal`) à affiner.
- **2026-06-24** — **Cœur du reboot = moteur « prochaine étape » IA**, via **UN provider
  derrière LiteLLM** (route Claude + Ollama ; mock en dev).
- **2026-06-24** — **Abstraction `src/api/backend.ts` gardée pour la propreté/le test du front**,
  **PAS** pour viser le web.
- **2026-06-24** — **ANNULÉS** : **web/PWA** (Tauri n'émet pas de PWA ; surcoût serveur-agent
  non désiré) et **RAG** (le moteur marche sur contexte assemblé).
- **2026-06-25** — **Web/PWA RÉOUVERT en DIFFÉRÉ/backlog** (révision de la décision du 24).
  Stéphane : *« on inscrit au backlog pour plus tard, kit à avoir deux versions maintenues en
  parallèle »*. Objectif = **double cible desktop (Tauri) + web (daemon local HTTP)** maintenues
  en parallèle, **desktop reste premier** ; couture = façade **`src/api/backend.ts`** (transport
  `fetch()` alternatif à `invoke()`). Points durs à cadrer le jour venu : auth, CSP, FS sur HTTP
  local, ports. Non planifié (cf. § 10.1). **RAG reste annulé.**
- **2026-06-24** — **HORS SCOPE v0.1, Stéphane précisera SES solutions** : mobile / vocal /
  CarPlay / Android Auto, multi-target test-staging (sandbox / Docker local / LAN / WAN),
  canaux externes de chat. (CarPlay/Android Auto : app mobile native distincte requise ;
  Android Auto bloque les chatbots tiers.)
- **2026-06-24** — **Présentation v0.1 = mode B (charté) seul** ; modes A (old-school) & C
  (WhatsApp) en horizon.
- **2026-06-24** — **Process resserré, maquettes JPG sautées. Plan en 3 moves** : DAYONE →
  maquette runnable FAKE (HTML jetable, valider l'UX) → dev.

---

## Sources (faits vérifiés sur le web, 2026-06-24)
- Tauri 2, absence de cible web/PWA native (justifie l'annulation) : [Tauri v2](https://v2.tauri.app/) · [Could Tauri run in browsers? (issue #3655)](https://github.com/tauri-apps/tauri/issues/3655) · [Tauri v2: One Codebase 4 All?](https://andamp.io/insights/blog/tauri-v2-one-codebase-4-all)
- LiteLLM (proxy OpenAI-compat, routage multi-modèle) : [LiteLLM (github)](https://github.com/BerriAI/litellm) · [docs.litellm.ai](https://docs.litellm.ai/)
- PTY multi-terminal : [tauri-plugin-pty](https://crates.io/crates/tauri-plugin-pty) · [Open-source AI terminal Rust/Tauri (HN)](https://news.ycombinator.com/item?id=48061825)
- CarPlay / Android Auto : [Requesting CarPlay Entitlements (Apple)](https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements) · [ChatGPT comes to CarPlay, Android Auto left behind](https://www.androidauthority.com/chatgpt-apple-carplay-vs-android-auto-3653922/)
- MCP manager Obot : [Obot (obot.ai)](https://obot.ai/) · [obot-platform/obot (GitHub)](https://github.com/obot-platform/obot)
