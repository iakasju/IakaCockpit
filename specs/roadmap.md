# Roadmap & Coordination — IakaCockpit

> Document de coordination (Aragorn) alimentant la doc **dayone** (objectif 1).
> Réf. vision : `specs/PROJET.md` (révisé par Gandalf). Matériau subordonné :
> iakaIDE v0.8.1 — **backend Rust SALVAGÉ** (salvage > réécriture), **front réécrit propre**.
> **Périmètre v0.1 SIGNÉ par Stéphane (gate MOVE 1 franchi).** La vision PRIME sur l'existant.

---

## 0. Principe directeur — anti scope-creep (RENFORCÉ)

IakaCockpit reste un chantier à ampleur dangereuse. Le périmètre v0.1 est désormais **signé** ;
toute dérive hors de ce périmètre est **bloquée par défaut**. Règles de survie :

> **(a) On ne construit pas l'agnosticisme, on l'OUTILLE** : on se câble SUR des passerelles
> existantes (LiteLLM pour les modèles, Obot pour MCP) plutôt que de coder le routage nous-mêmes.
> **(b) Salvage > réécriture** quand le code existant est sain et neutre (backend Rust iakaIDE).
> **(c) Réécriture propre** là où la dette est structurelle (tout le front).

**Garde Aragorn (non négociable)** : tout lot, écran ou intégration **absent de la liste IN
ci-dessous** est refusé sans nouveau feu vert explicite de Stéphane (remontée). Les éléments
DIFFÉRÉ/ANNULÉ/HORS-SCOPE ne rentrent **jamais** en v0.1 par effet de bord. Revue de scope à
chaque gate. **Aragorn n'invente pas le périmètre des éléments HORS SCOPE** (mobile/vocal/
CarPlay/multi-target) : Stéphane apportera SES solutions plus tard — on ne les phase pas.

### Périmètre v0.1 — verdict (signé)

| Statut | Éléments |
|---|---|
| **IN (MVP v0.1)** | cockpit chapeau-rooted ; **backend Rust salvagé d'iakaIDE** dé-Windows-isé (scan git, portfolio, PTY, services, config) ; **front réécrit propre** (pas de god-component, hooks séparés) ; **socle sécurité L0** (CSP, keychain, tests path, couverture honnête) ; Dashboard projets (réutilise naonedge-dashboard) ; **PTY cross-OS par projet** ; moteur « prochaine étape » IA via **UN provider derrière LiteLLM** ; **mains courantes 3-canaux sur iakaboxlogs (remontées en socle v0.1)** ; UI **grille + dock + onglets** (concept gardé, réécrit). |
| **DIFFÉRÉ** | **bureau-OS / window-manager** (exploration iakastart/iakapages plus tard avec Loki) ; lien **Obot/MCP** (positionné, branché plus tard) ; admin-par-prompt + suite admin + portraits générés (horizon). |
| **ANNULÉ** | **web/PWA**, **RAG Docs**. |
| **HORS SCOPE (Stéphane phasera SES solutions)** | mobile, vocal, CarPlay/Android Auto ; multi-target test/staging (sandbox/Docker local/LAN/WAN). **Ne pas phaser.** |

### Positionnement assumé
IakaCockpit est un **orchestrateur AU-DESSUS des outils** : il **câble LiteLLM** (multi-modèle —
on ne code pas le routage) et **se liera à Obot** (MCP — différé) plutôt que de rebâtir ces couches.

---

## 1. PHASAGE des 3 MOVES (process resserré — maquettes JPG sautées)

### MOVE 1 — Doc « dayone » globale (EN COURS, révision Gandalf)
- **Objectif** : figer la vision exécutable alignée sur le périmètre signé (IN / DIFFÉRÉ / ANNULÉ /
  HORS-SCOPE), décisions verrouillées, architecture cible.
- **Livrables** : `specs/PROJET.md` rempli ; `specs/roadmap.md` (ce doc) ; backlog v0.1 priorisé
  pointant vers les futures instructions ; liste des décisions verrouillées + positionnement
  (orchestrateur au-dessus de LiteLLM/Obot).
- **Agents** : **Gandalf** (pilote), Aragorn (phasage/risques/lots).
- **Gate → MOVE 2** : `PROJET.md` validé par Stéphane, cohérent avec le périmètre signé.

### MOVE 2 — Maquette runnable FAKE en HTML jetable (validation UX réelle)
- **Objectif** : valider l'**ergonomie réelle** (navigation, grille+dock+onglets, PTY, mains
  courantes 3-canaux) sur du **HTML jetable** — c'est LA vraie validation UX (pas des JPG).
- **Livrables** : page(s) HTML autonome(s), données mockées en dur, grille+dock+onglets
  manipulables, faux PTY, faux flux mains-courantes 3-canaux. **Jetable** : sert à décider, pas à
  être porté tel quel. Aucun backend, aucun secret. Charte/tokens issus de `iakagraph/theme/`.
- **Agents** : **Loki** (UX/charte sur le HTML), **Gimli** (HTML jetable), Aragorn (suivi).
  *(Pas de gate Legolas lourd sur du jetable — c'est un artefact de décision, pas un livrable produit.)*
- **Gate → MOVE 3** : Stéphane valide l'**UX** sur la maquette runnable. Point de non-retour :
  on ne câble le vrai backend qu'une fois l'UX figée.

### MOVE 3 — Le dev (socle v0.1 réel)
- **Objectif** : construire le socle v0.1 par lots (section 2), chaque lot livré + gated.
- **Agents** : **Gimli** (dev), **Legolas** (gate qualité après CHAQUE livraison Gimli — non
  sautable, anti « Gimli solo »), **Nathalie** (doc dayone par lot), **Helm** (packaging/staging —
  cible définie par Stéphane, hors-scope phasé ici), Aragorn (séquencement + reporting).
- **Gate → prod** : jamais franchi seul — **Helm + feu vert humain**.

---

## 2. LOTS v0.1 ORDONNÉS (du plus structurant au moins)

> Chaque lot = livrable autonome, gated Legolas. **MVP = L0 + L1 + L2 + L3.**

### L0 — Socle sécurité + bootstrap propre (fondation, AVANT tout métier)
Tauri 2 + React/TS + Vite + SQLite, **cross-OS d'emblée**, ancré au **répertoire chapeau**.
Garde-fous érigés en principes AVANT le métier : **CSP stricte**, **secrets en keychain OS**
(jamais en clair/SQLite/commit), **tests garde-fous des chemins** (path traversal), **archi front
sans god-component** (modules + hooks séparés), **couverture honnête** (CI lint+typecheck+test).
→ *La dette d'iakaIDE transformée en socle ; tout s'appuie dessus.*

### L1 — Salvage backend Rust d'iakaIDE (dé-Windows-isé) — LOT À PART ENTIÈRE
Récupérer et **dé-Windows-iser** les commandes Rust saines d'iakaIDE : **scan git**, **portfolio**,
**PTY** (portable-pty), **services**, **config**. Salvage assumé (le backend Rust est neutre et
éprouvé), **pas une réécriture**. Chemins normalisés cross-OS, pas de constante Windows en dur.
→ *Gros gain de temps : ce code marche déjà ; on le rend propre et portable plutôt que le refaire.*

### L2 — Dashboard projets + PTY cross-OS par projet (cœur visible, front neuf)
Front **réécrit propre** sur le backend salvagé (L1). Dashboard projets chapeau-rooted (état git
propre/sale, ahead/behind, version, activité ; **réutilise naonedge-dashboard/scan**). **PTY
cross-OS par projet** (xterm + portable-pty). UI **grille + dock + onglets** réécrite proprement.
→ *Premier écran à valeur immédiate + identité cockpit ; dogfoodable sur les ~29 dépôts.*

**Pistes rattachées à L2 (entrées de roadmap, à cadrer le moment venu — pas du périmètre figé) :**
- **Vue « liste des jalons d'un projet »** : panneau qui lit le backlog d'un projet (cases
  L0/L1/L2… + instructions `specs/instructions/`) et l'affiche en **frise de jalons** avec leur
  état (cadré / en cours / gate PASS / livré). *Dépendance* : nécessite une **commande backend L2
  dédiée** pour lire les jalons d'un projet (`scan_portfolio` de L1 donne déjà la liste des projets,
  pas le détail des jalons).
- **Onglets qualité — ⚠️ DÉBAT OUVERT (non décidé)** : *que doit afficher un onglet qualité ?* À
  trancher avec **Stéphane + Loki** (maquette UX) avant tout cadrage. **Piste évoquée, non
  arrêtée** : le verdict **Legolas** le plus récent par projet/jalon (PASS/FAIL par étape —
  typecheck, lint, tests, clippy, couverture). **À ne pas figer** : périmètre ouvert tant que le
  débat n'est pas clos.
- **Main courante filtrable par *event* + fiche jalon** : étendre les filtres de la main courante
  (§ 5 PROJET.md, aujourd'hui canal + agent) d'une **dimension *event*** — une **vue transversale**
  sur le **canal « geste »** (actes : appels d'outils, délégations, résultats), alimentée par le
  **traçage machine** (L4). Types d'event filtrables (**liste ouverte/extensible**) : **jalon**,
  **délégations** (un agent passe la main à un autre), **utilisation de tools** (appels d'outils
  **métier/produit** des agents), *etc.* *Frontière à tenir* (déjà gravée § 5) : on **ne trace pas
  les composants de dev** (MCP/Obot) ni ce que **git** trace déjà — « utilisation de tools » = outils
  métier, pas la plomberie de dev. Un type d'event particulier, le **jalon**, ouvre une **fiche
  jalon** : cliquer sur un jalon (ex. « jalon X ») présente l'**auteur** (agent émetteur), l'**input**
  (demande/instruction déclenchante), le **rapport** de l'agent, et le **verdict PASS / FAIL**.
  *Lien conceptuel* : la fiche jalon rend lisible la **chaîne de délégation d'un jalon** (cadrage
  Gandalf → implémentation Gimli → verdict Legolas) ; elle **relie** la **vue « liste des jalons »**
  (ci-dessus, L2) et la **main courante** (§ 5), en s'appuyant sur le **traçage machine des
  délégations** (volet prévu en L4). *Entrée de roadmap, à cadrer le moment venu — pas du périmètre
  figé ; suppose la fiche et les events alimentés par L4.*

### L3 — Moteur « prochaine étape » IA via UN provider derrière LiteLLM
Abstraction provider, **UNE impl câblée**, **passerelle LiteLLM** pour le multi-modèle (on ne code
PAS le routage). « Prochaine étape par projet » (lecture specs/état des lieux → suggestion).
→ *Cœur de la vision (F2), mais outillé par LiteLLM, pas réimplémenté.*

### L4 — Mains courantes 3-canaux sur iakaboxlogs (REMONTÉ EN SOCLE v0.1)
Vues mains courantes (adresse / geste / pensée / agent) **branchées sur iakaboxlogs existant**
(Mosquitto MQTT → CouchDB, pont n8n), filtres. **Réutilisation pure** — ne PAS réimplémenter le bus.
→ *Décidé IN par Stéphane : fait partie du socle v0.1, plus une option tardive.*

**Piste rattachée à L4 (entrée de roadmap — volet MACHINE de la traçabilité) :**
- **Tracer les délégations** : logger chaque **délégation entre agents** (qui délègue à qui, quoi,
  verdict) sur **MQTT/CouchDB** via la brique **iakaframe-log-conversation**. *Distinction à tenir* :
  trace **HUMAINE** = la chaîne de badges (déjà en place dans la méthode) ; trace **MACHINE** =
  iakaboxlogs (ce lot L4). **Cette entrée = le volet machine** (la chaîne de badges reste l'humain).

**⇒ FIN DU MVP v0.1 : L0+L1+L2+L3 = cockpit chapeau-rooted, projets détectés/pilotés en grille,
PTY cross-OS par projet, « prochaine étape » IA via LiteLLM. L4 complète le socle dès que mûr.**

> **Hors v0.1 (rappel garde) :** bureau-OS/window-manager, lien Obot/MCP, admin-par-prompt + suite
> admin + portraits = DIFFÉRÉ. web/PWA + RAG = ANNULÉ. mobile/vocal/CarPlay + multi-target = HORS
> SCOPE (non phasé ici). **Aucun de ces éléments n'entre en v0.1 sans feu vert Stéphane.**

**Ordre recommandé : L0 → L1 → L2 → L3 (MVP, STOP & valider en réel) → L4.**

---

## 3. CARTE DES RISQUES (alignée périmètre signé)

| # | Risque | Gravité | Mitigation concrète |
|---|---|---|---|
| R1 | **Scope-creep** (ré-introduire DIFFÉRÉ/ANNULÉ/HORS-SCOPE en v0.1) | **CRITIQUE** | Périmètre IN **signé** (section 0). Garde Aragorn : tout hors-IN refusé sans feu vert Stéphane (remontée). Revue de scope à chaque gate. Bureau-OS, Obot, admin, mobile, multi-target : explicitement tenus dehors. |
| R2 | **Salvage qui traîne la dette** (backend iakaIDE pas vraiment dé-Windows-isé) | Élevée | L1 = lot dédié avec critère « zéro chemin/constante Windows en dur », tests cross-OS sur les chemins, Legolas vérifie la portabilité avant gate. |
| R3 | **Front mal réécrit** (god-component à nouveau) | Élevée | Décisions L0 appliquées AVANT le métier : pas de god-component, hooks séparés, couverture honnête. Legolas audite l'archi à chaque gate. |
| R4 | **Couplage LiteLLM** (on recode du routage par glissement) | Moyenne | Règle « on câble, on ne route pas » : une seule impl provider derrière LiteLLM ; le multi-modèle est délégué à la passerelle, pas au cockpit. |
| R5 | **Agnosticisme prématuré** | Moyenne | 1 impl réelle derrière chaque interface (1 provider, 1 cible). N'ajouter une 2e qu'après Legolas PASS sur la 1re. |
| R6 | **Sécurité** (secrets, CSP, path traversal, spawn PTY) | Élevée | Fondation L0 : keychain OS, CSP stricte, tests path-traversal, validation chemins avant spawn PTY, jamais de secret en SQLite/commit. Audit Legolas dédié sécurité. |
| R7 | **Couplage infra box** (Forgejo/iakaboxlogs/n8n indispo) | Moyenne | Tout fonctionne offline (commits locaux). L4 mains courantes en mode dégradé si MQTT down. Voir section 5. |
| R8 | **Obot/MCP** (surface mouvante) | Faible (différé) | DIFFÉRÉ hors v0.1. Positionné « lien Obot » (pas de rebuild). Spike isolé avant toute intégration. |
| R9 | **Maquette HTML jetable « adoptée »** (le jetable devient le produit) | Moyenne | Statut JETABLE assumé : artefact de décision UX, **interdit de portage** en MOVE 3. Le front v0.1 est réécrit propre, pas extrait du HTML fake. |
| R10 | **Re-cadrage permanent** | Moyenne | Gate MOVE 1 fige le périmètre (fait). Maquette MOVE 2 absorbe l'exploration UX avant le code. Changement de scope = arbitrage tracé. |

---

## 4. DÉPENDANCES & RÉUTILISATION (ne PAS réimplémenter)

| Besoin | Réutiliser / câbler | Plutôt que |
|---|---|---|
| Backend scan git / portfolio / PTY / services / config | **iakaIDE backend Rust SALVAGÉ** (dé-Windows-isé) | Réécrire le backend desktop |
| Détection projets / dashboard | **naonedge-dashboard** (`scan.js/scan.ps1`, cartes) + état des lieux iakaframe | Réécrire un scanner de dépôts |
| Mains courantes 3-canaux (L4, socle v0.1) | **iakaboxlogs** déployé (Mosquitto MQTT → CouchDB, pont n8n) | Monter un nouveau bus de messages |
| Multi-modèle / routage IA | **LiteLLM** (passerelle — on câble dessus) | Coder le routage multi-modèle |
| MCP (différé) | **Obot** (lien, plus tard) | Rebâtir une couche MCP |
| Chartes / thèmes / tokens UI | **iakagraph/theme/** + `THEMES.md` | Inventer une charte from scratch |
| Commandes projet cross-OS (init/snapshot/update) | **CLI iakaframe** (`@naonedge/iakaframe`, Node zéro-dep, npm Forgejo) | Réimplémenter init/snapshot/update |
| Canaux externes + reporting | **n8n existant** (détient les secrets Slack) | Câbler des SDK côté app |

> iakaIDE fournit le **backend à salvager** + le **plan d'architecture éprouvé** (concepts grille/
> dock/onglets/PTY/agents). On salvage le Rust, on réécrit le front.

---

## 5. RYTHME pendant les 4 jours BOX OFFLINE (pas de push)

Box OFFLINE = pas de push/Forgejo, **iakaboxlogs/n8n indispo** (mains courantes L4, Slack). Mais
**tout l'amont + le socle ne dépendent pas de la box** :

**À avancer plein régime (zéro dépendance box) :**
- **MOVE 1 — doc dayone** : `PROJET.md`, `roadmap.md`, backlog, décisions (Gandalf). Local.
- **MOVE 2 — maquette runnable FAKE HTML jetable** (Loki + Gimli) : **100 % local**, données en
  dur, aucun backend, aucun MQTT, aucun secret. **Candidat idéal** pour ces 4 jours.
- **L0 — socle sécurité + bootstrap** : Tauri/React/SQLite + garde-fous (CSP/keychain/tests-path).
  Build et tests en local, aucune dépendance réseau.
- **L1 — salvage backend Rust** : récupération + dé-Windows-isation depuis iakaIDE **local** ;
  tests de portabilité des chemins en local. **Faisable hors box.**
- **Instructions** des lots L2/L3 (specs écrites avant code).

**Mode commits locaux (filet de sécurité) :**
- Commits atomiques fréquents en local (conventional commits). File d'attente de push au retour.
- Jamais de `reset --hard` ni `push --force`.

**À NE PAS tenter sans la box (file pour le retour) :**
- **L4 mains courantes** (MQTT/CouchDB iakaboxlogs) + reporting Slack via n8n.
- Push / création de dépôt Forgejo.

**Reporting offline** : Slack via n8n coupé → Aragorn rend compte **en direct à Stéphane** (canal
de session) ; états de phase rejoués sur Slack au retour de la box.

**Séquence recommandée sur ~4 jours :**
- **J1** : finir MOVE 1 (doc dayone alignée, gated Stéphane).
- **J1-2** : MOVE 2 — maquette runnable FAKE HTML jetable (Loki UX + Gimli) → valider l'UX.
- **J2-3** : **L0** socle sécurité + bootstrap propre.
- **J3-4** : **L1** salvage backend Rust dé-Windows-isé + tests cross-OS.
- **Au retour de la box** : push de tout ; brancher **L4** (mains courantes iakaboxlogs) + reporting Slack.

---

## Gates récapitulés (non sautables)

1. **MOVE 1 → 2** : périmètre v0.1 **SIGNÉ** ✅ + `PROJET.md` validé.
2. **MOVE 2 → 3** : UX validée par Stéphane sur la maquette runnable HTML.
3. **Après CHAQUE lot Gimli (MOVE 3)** : **gate Legolas obligatoire** (anti « Gimli solo »).
4. **Vers prod** : **Helm + feu vert humain** (jamais Aragorn seul).
