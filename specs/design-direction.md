# IakaCockpit — Direction Design / UX

> Auteur : **Loki** (graphisme/design, royaume IAKACOCKPIT). Document de **proposition**.
> Statut : v0.1 — socle pour l'objectif 1 (doc dayone) et préparation de l'objectif 2 (maquettes JPG).
> Règle : la vision de Stéphane **prime** ; iaIDE/reverse = matériau subordonné.
> Charte par défaut : **NaonEdge dark** (dark premium · or). Réservoir : `/Users/sjupin/work/iakagraph/theme/`.

---

## 0. Principe directeur

Le Cockpit est le **cœur** de l'écosystème iakaProject. Son UI doit dire trois choses
en un coup d'œil : **où on est** (projet / vue), **qui parle** (royaume + agent, par
pastille et portrait), **dans quelle phase** (la pastille colorée). Tout le reste est
silencieux : fond sombre, **un seul accent** (l'or), respiration généreuse.

Le Cockpit **n'a pas sa propre charte** : il **embarque les iakachartes** du réservoir.
NaonEdge dark est le défaut, mais l'app est **repeignable** sans toucher au code (cf. §1).

---

## 1. Charte retenue + « embarquer les iakachartes »

### 1.1 Décision
- **Charte par défaut : `naonedge/dark`** (dark premium · or). C'est l'identité de la
  maison, déjà éprouvée sur `naonedge-dashboard`. Justification : un fond `#0a0a0a` met
  en valeur le code, les PTY et les portraits ; **un seul accent or** évite le bruit
  d'un cockpit dense ; les trois polices (Fraunces / IBM Plex Sans / JetBrains Mono)
  couvrent titres / corps / terminal sans import supplémentaire.
- **Thème commutable (réglage GLOBAL de l'app)** parmi les familles du réservoir :
  - `naonedge` — `dark` (défaut) · `light`
  - `grimoire` — `dark-fantasy` (mode immersif / sombre fantasy)
  - `cartoon` — `std` (mode ludique, vignettes BD)
  - `os` — `macos` · `ubuntu` · `android` (mimétisme natif par plateforme)

### 1.2 Mécanique « embarquer les chartes » (contrat de tokens)
Le réservoir respecte déjà un **contrat propre** que le Cockpit doit reprendre tel quel :
- `tokens.css` = **le seul fichier qui change** d'un thème à l'autre (`:root{ --bg-*, --text-*, --accent-*, --font-* }`).
- `components.css` = composants **sans aucune couleur en dur**, ne référençant que les tokens.
- `vignettes/<agent>.png` = **portrait d'agent servi par le thème actif** → changer de
  thème change la tête des agents (déjà prévu par la classe `.author` du réservoir).

**Implémentation Cockpit (proposition, sans coder l'app)** : au lieu de `:root` figé,
exposer chaque thème comme un **attribut de scope** sur la racine, p. ex.
`html[data-iakatheme="naonedge-dark"]`. Un sélecteur global (réglage app) bascule
l'attribut → tous les tokens changent à chaud, **zéro rebuild**. Le Cockpit copie/synchronise
les `tokens.css` du réservoir dans un dossier `themes/` versionné de l'app (source = iakagraph,
le Cockpit est consommateur, jamais l'inverse — étanchéité respectée).

> **Pour Gandalf/dev** : prévoir un **adaptateur de tokens**. Les tokens iakagraph sont
> orientés « document » (`--bg-card`, `--line`, `--radius-md`). L'app aura besoin de
> tokens **applicatifs** supplémentaires (densités, hauteurs de barres, z-index, états
> focus clavier). On les ajoute comme **surcouche** `tokens-app.css` qui *dérive* des
> tokens de charte (jamais de hex en dur), pour ne pas polluer le réservoir mutualisé.

---

## 2. Langage visuel du Cockpit (grille de tokens)

### 2.1 Hérité de NaonEdge dark (ne pas redéfinir — réutiliser)
| Rôle | Token | Valeur (dark) |
|---|---|---|
| Fond global | `--bg-primary` | `#0a0a0a` |
| Cartes / panneaux / widgets | `--bg-card` | `#1a1a1a` |
| Blocs profonds / PTY / code | `--bg-deep` | `#111` |
| Bords | `--line` | `#2a2a2a` |
| Séparateurs discrets | `--line-soft` | `#1f1f1f` |
| Texte principal | `--text-primary` | `#f0f0f0` |
| Texte secondaire | `--text-secondary` | `#8a8a8a` |
| Texte discret | `--text-muted` | `#555` |
| **Accent or** | `--accent-gold` | `#c8a44e` |
| Accent or clair | `--accent-gold-light` | `#e8c960` |
| Dégradé signature | `--gradient-accent` | `135deg gold→gold-light` |

Typo : **Fraunces** (titres de vues, hero), **IBM Plex Sans** (UI/corps), **JetBrains
Mono** (PTY, libellés, chiffres, badges, mains courantes).
Formes : `--radius-md:12px` (cartes/widgets), `--radius-lg:20px` (modales), glow or discret.

### 2.2 Surcouche applicative à AJOUTER (`tokens-app.css`, dérivée — pas de hex en dur)
```
--app-topbar-h: 48px;        /* barre d'onglets/vues globale */
--app-dock-h: 56px;          /* dock de la grille widgets */
--app-rail-w: 56px;          /* rail vertical projets (option) */
--app-density: 1;            /* 1 = confort, 0.85 = compact (PTY/journaux) */
--app-focus-ring: 0 0 0 2px rgba(var(--accent-rgb),.55);  /* a11y clavier */
--z-dock: 40; --z-topbar: 50; --z-modal: 100; --z-toast: 120;
--pty-line-h: 1.5; --pty-font: var(--mono); --pty-fs: 13px;
```

### 2.3 Pastilles des ROYAUMES / AGENTS (point d'identité central)
La pastille porte le **sens de phase** (méthode iakaframe) ; la **couleur d'agent** est
constante. Proposition de mapping (à valider, dérivé des sémantiques NaonEdge + usages connus) :

| Agent | Rôle | Couleur pastille | Token proposé |
|---|---|---|---|
| Odin | portefeuille / orchestrateur | or signature | `--ag-odin: var(--accent-gold)` |
| Aragorn | coordination projet | bleu | `--ag-aragorn: var(--blue)` |
| Gandalf | architecture / specs | violet | `--ag-gandalf: var(--purple)` |
| Gimli | implémentation / forge | orange | `--ag-gimli: var(--orange)` |
| Legolas | tests / qualité | vert | `--ag-legolas: var(--green)` |
| Helm | garde / sécurité / CI | rouge | `--ag-helm: var(--red)` |
| Loki | design / supports | cyan | `--ag-loki: var(--cyan)` |
| Nathalie | doc / relation | or clair | `--ag-nathalie: var(--accent-gold-light)` |

> **Distinction phase vs agent.** Dans les badges de conversation, l'émoji (🟠/🟡/🟢…)
> code la **phase servie** ; ici la couleur ci-dessus identifie **l'agent** dans l'UI
> (point coloré devant les lignes de main courante, liseré du portrait, onglet d'agent
> en admin). Les deux coexistent : un point d'agent + une pastille de phase.

### 2.4 Canaux de main courante (4 filtres) — codage visuel
| Canal | Glyphe | Couleur | Forme dans le journal |
|---|---|---|---|
| **adresse** (parole à l'humain) | `💬` / `»` | `--text-primary` | bulle pleine, badge agent visible |
| **geste** (action/outil) | `⚙` / `→` | `--accent-gold` | ligne mono, fond `--bg-deep`, monospace |
| **pensée** (raisonnement) | `…` / `~` | `--text-muted` | italique atténué, repliable |
| **agent** (dispatch/relais) | `⮌` / `@` | couleur de l'agent cible | liseré coloré gauche |

---

## 3. Les 3 modes de présentation (point design central)

Réglage **GLOBAL** de l'app : un même flux de main courante / PTY se rend de **trois**
façons. Les **4 filtres** (adresse / geste / pensée / agent) restent disponibles **dans
les trois modes** — seul le rendu change, jamais la donnée.

### Mode A — Terminal old-school (`mode=tty-raw`)
Sobriété brute, lisible, pour les puristes. Police mono, pas de bulles, pas de portraits.
```
┌─ PROJECT: iakacockpit · branch main ──────────────── tty-raw ─┐
│ [12:04:02] odin     » Je lance le cadrage design.             │
│ [12:04:03] odin     → task(loki, "direction design")          │
│ [12:04:05] loki     ~ je lis le réservoir iakagraph…          │
│ [12:04:09] loki     → read tokens.css (naonedge/dark)         │
│ [12:04:31] loki     » Charte retenue : naonedge/dark.         │
│ ~ filtres: [adresse]✓ [geste]✓ [pensée]✓ [agent]✓ ───────────│
└──────────────────────────────────────────────────────────────┘
```
- Couleur minimale : nom d'agent teinté de sa couleur, glyphe de canal en préfixe.
- Filtres = bascules ASCII en pied de panneau. Aucun avatar. Densité max (`--app-density:.85`).

### Mode B — Terminal charté NaonEdge (`mode=tty-iaka`) — **défaut**
Le terminal **habillé** : même flux, mais dans la charte. Fond `--bg-deep`, cartes de
ligne, points d'agent colorés, glyphes de canal stylés, pastille de phase, glow discret.
```
╔═══════════════════════════════════════════════════════════════╗
║  ◆ iakacockpit            main ●        [ tty-iaka ▾ ]         ║   ← Fraunces + grue
╟───────────────────────────────────────────────────────────────╢
║  ● odin   🟠  12:04  » Je lance le cadrage design.            ║   ← point bleu(odin)
║  ⚙ odin       12:04  → task(loki) ····················· done  ║   ← geste, mono or
║  ~ loki       12:04  je lis le réservoir iakagraph…  (pensée) ║   ← italique muted
║  ● loki   🟠  12:04  » Charte retenue : naonedge/dark.        ║   ← point cyan(loki)
╟───────────────────────────────────────────────────────────────╢
║  Filtres  [💬 adresse] [⚙ geste] [… pensée] [@ agent]  pills  ║   ← pills NaonEdge
╚═══════════════════════════════════════════════════════════════╝
```
- Réutilise `.tag`, `.card`, `.section-label`, `.author` du réservoir.
- Les filtres sont des **pills** (style `.fbtn` du dashboard) ; actif = aplat or.

### Mode C — Conversation type WhatsApp (`mode=chat`)
Lecture « humaine », pour suivre une session comme une discussion. Bulles, avatars
(portraits d'agents servis par le thème), horodatage discret, accusés de geste en ligne.
```
┌─────────────────────────────────────── chat ─┐
│            ┌───────────────────────────────┐ │
│            │ Je lance le cadrage design.   │ │  ← odin, bulle alignée (orchestrateur)
│            └───────────────────────────────┘ │
│  (•odin)   ⚙ a confié la tâche à @loki        │  ← accusé de geste, ligne fine
│ ┌────┐ ┌────────────────────────────────────┐│
│ │loki│ │ Charte retenue : naonedge/dark.    ││  ← portrait loki + bulle
│ │ 🦊 │ │ J'embarque les iakachartes via     ││
│ └────┘ │ tokens commutables.        12:04 ✓✓ ││
│        └────────────────────────────────────┘│
│  · loki réfléchit…  (pensée, repliée)         │  ← canal pensée en "typing" discret
├───────────────────────────────────────────────┤
│ Filtres ⌄  [💬][⚙][…][@]      [ écrire… ]  ➤  │
└───────────────────────────────────────────────┘
```
- Avatars = `vignettes/<agent>.png` du thème actif (bordure = couleur d'agent).
- Bulles `--bg-card` (agents) ; orchestrateur aligné à droite, agents à gauche.
- Canal **pensée** = état « typing » repliable ; canal **geste** = ligne d'accusé fine
  entre bulles ; canal **adresse** = corps de bulle ; canal **agent** = chip @cible.

> **Invariant des 3 modes** : même modèle de données (ligne = {ts, agent, canal,
> texte, refs}). Le mode est une **couche de rendu**. Cela vaut pour la main courante
> ET pour le PTY (le PTY ajoute juste un flux stdout/stdin brut sous le même habillage).

---

## 4. Mockups structurels (wireframes — bases des maquettes JPG)

### 4.1 Shell global (barre d'onglets/vues + dock)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◆grue  iakaProject ▾ │ Dashboard  Work  Grille  PTY  Docs │   ⚙Admin  ◐theme ▾ │  ← topbar 48px
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                          ZONE DE VUE ACTIVE                                     │
│                       (Dashboard / Work / Grille / PTY / Docs)                 │
│                                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⬢dock:  [+widget] [PTY] [journal] [agents] [docs]        projet: iakacockpit ● │  ← dock 56px
└──────────────────────────────────────────────────────────────────────────────┘
```
- `◆grue` = icône de famille NaonEdge (grue jaune) ; sélecteur de projet à côté.
- `◐theme ▾` = commutateur d'iakacharte (réglage global, §1).
- Onglets = vues ; actif = aplat or (réutilise `.tab.active`).

### 4.2 Dashboard projets (aligné sur naonedge-dashboard)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◆ NaonEdge — projets        scan: il y a 2 min            [ rechercher… ]      │
│  ┌─stat─┐ ┌─stat─┐ ┌─stat─┐ ┌─stat─┐ ┌─stat─┐                                  │
│  │  12  │ │  8   │ │  3   │ │  5   │ │  2   │   ← statbar mono (cartes .stat)   │
│  │projet│ │ actif│ │ wait │ │ tests│ │ alert│                                  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                                  │
│  Filtres: [tous] [actifs] [stack ▾]                                            │
│  ┌── pcard ──────────┐ ┌── pcard ──────────┐ ┌── pcard ──────────┐            │
│  │ ◆ iakacockpit   ● │ │ ◆ iakaide       ● │ │ ◆ iakagraph     ● │            │
│  │ cœur écosystème   │ │ IDE Tauri reverse │ │ réservoir chartes │            │
│  │ [Tauri][React][TS]│ │ [Tauri][React]    │ │ [CSS][thèmes]     │            │
│  │ ──────────────────│ │ ──────────────────│ │ ──────────────────│            │
│  │ qgate ✓  [Work →] │ │ qgate ⚠  [Work →] │ │ qgate ✓  [Work →] │            │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘            │
└──────────────────────────────────────────────────────────────────────────────┘
```
Réutilise tel quel : `.statbar/.stat`, `.fbtn`, `.grid-projects/.pcard`, `.chip`,
`.qgate`, `.dot-st`. → Très peu de design neuf, surtout du portage de l'existant.

### 4.3 Grille widgets + dock (Work)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Work · iakacockpit            [ ✎ éditer la grille ]   [ + widget ]           │
│  ┌── widget ───────────┐ ┌── widget ──────────────────────────┐               │
│  │ ⚙ Statut CI         │ │ 💬 Main courante (live)            │               │
│  │ build ✓  tests ✓    │ │ ● odin » cadrage…                 │               │
│  │ lint ✓   typecheck ✓│ │ ⚙ loki → read tokens.css          │               │
│  └─────────────────────┘ │ ● loki » charte retenue           │               │
│  ┌── widget ───────────┐ └────────────────────────────────────┘               │
│  │ ⬢ PTY · main        │ ┌── widget ──────────┐ ┌── widget ────┐              │
│  │ $ npm run dev       │ │ 📄 Docs (RAG)      │ │ 👥 Team       │              │
│  │ ▸ ready on :3010    │ │ 3 sources indexées │ │ 8 agents ●●●  │              │
│  └─────────────────────┘ └────────────────────┘ └──────────────┘              │
│ ⬢dock: [+widget] [PTY] [journal] [agents] [docs]                              │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Widgets = cartes `.card` redimensionnables (react-grid-layout). Liseré or au survol.
- Rappel mémoire : `dragDropEnabled=false` côté Tauri pour ne pas casser la grille.
- Mode édition = grille de fond visible (lignes `--line-soft`), poignées or aux coins.

### 4.4 Mains courantes filtrables (vue plein écran)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Main courante · iakacockpit     mode: [tty-iaka ▾]   ☰ exporter               │
│  Canaux:  [💬 adresse ✓] [⚙ geste ✓] [… pensée ✓] [@ agent ✓]   Agent: [tous ▾]│
│  Période: [aujourd'hui ▾]                       🔍 [ filtrer le texte… ]        │
├──────────────────────────────────────────────────────────────────────────────┤
│  ● odin    🟠 12:04:02  » Je lance le cadrage design.                          │
│  ⚙ odin       12:04:03  → task(loki, "direction design")  ········· done       │
│  ~ loki       12:04:05  je lis le réservoir iakagraph…           (pensée)      │
│  ⚙ loki       12:04:09  → read tokens.css (naonedge/dark)                      │
│  ● loki    🟠 12:04:31  » Charte retenue : naonedge/dark.                      │
│  ⮌ loki→odin  12:04:32  restitue la direction design                          │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Même barre de filtres réutilisable sur le **PTY** (filtrer stdout par projet/canal).
- Chaque ligne : point d'agent (couleur §2.3) + glyphe canal (§2.4) + ts mono + corps.
- Export = HTML standalone NaonEdge (CSS inliné) — c'est mon livrable type.

### 4.5 Admin · Agent (champ prompt + agent.md éditable + portrait)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Admin ▸ Team ▸ Agent : Loki                                  [ enregistrer ]  │
│  ┌── portrait ─────┐   ┌── identité ──────────────────────────────────────┐   │
│  │   ┌─────────┐   │   │ Nom     : Loki                                    │   │
│  │   │  🦊     │   │   │ Royaume : IAKACOCKPIT     Pastille: ● cyan        │   │
│  │   │ (vignet)│   │   │ Rôle    : design / supports                       │   │
│  │   └─────────┘   │   │ Charte de réf (team) : naonedge/dark ▾            │   │
│  │ [⬆ upload]      │   └──────────────────────────────────────────────────┘   │
│  │ [✦ générer…]    │                                                           │
│  │ [⟲ réf charte]  │   ┌── agent.md (éditable) ───────────────────────────┐   │
│  └─────────────────┘   │ # Loki — design                                  │   │
│  ┌── admin par prompt ─┐│ ## Mission …                                     │   │
│  │ ✎ "ajoute une règle ││ ## Périmètre …                                   │   │
│  │   de contraste AA…" ││ (markdown live, rendu + source)                  │   │
│  │            [ ▶ ]    │└──────────────────────────────────────────────────┘   │
│  └─────────────────────┘  ↑ le prompt édite ce agent.md (diff proposé)        │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Admin par prompt** : champ en bas-gauche ; soumettre → propose un **diff** sur
  `agent.md` (jamais d'écriture aveugle), l'humain valide. Le rendu markdown vit à droite.
- **Portrait** : 3 sources (upload / génération / réf charte) — cf. §5.
- Mêmes écrans déclinables pour Admin Projets, Skills, Tools/MCP-manager (façon Obot :
  liste de connecteurs en cartes `.card` + toggle + statut `.tag`).

---

## 5. Portraits d'agents

### 5.1 Trois sources (toutes pointent vers le même slot `portrait`)
1. **Upload** — image fournie par l'humain (PNG/JPG, recadrée en rond, bordure = couleur d'agent).
2. **Génération par prompt** — via **ComfyUI iakabox** (`comfyui-clean:8190`, cf. mémoire
   iakaFreeVision). Prompt par défaut dérivé de l'identité (« Loki, illusionniste,
   portrait dark premium, accent or, … »). ⚠️ Rappel mémoire : **VRAM partagée** →
   `ollama stop` avant génération ; mocker en dev (`specs/mock/portraits/`).
3. **Réf d'une iakacharte** — fallback : la **vignette du thème actif**
   (`iakagraph/theme/<famille>/<variante>/vignettes/<agent>.png`). C'est le défaut « gratuit »
   et cohérent : changer de thème change tous les portraits d'un coup.

### 5.2 Place dans l'UI
- **Avatar** dans le mode chat (§3-C) et dans les bulles/lignes de main courante.
- **Vignette** en en-tête des docs générés (classe `.author` du réservoir).
- **Grande carte** dans Admin ▸ Agent (§4.5).
- **Mini-points** (sans visage) partout ailleurs (densité) : juste la couleur d'agent.

> Cohérence : un portrait = un **rond**, bordure 1px = couleur d'agent, tailles
> `42px` (author) · `24px` (lignes) · `120px` (admin). Jamais d'image carrée pour un agent.

---

## 6. Recommandation : socle v0.1 design vs horizon

### Socle v0.1 (sécuriser l'objectif 1 — doc dayone) — **faire maintenant**
1. **Adopter NaonEdge dark** + synchroniser `tokens.css` + `components.css` dans `themes/`.
2. **Surcouche `tokens-app.css`** (densités, barres, focus, z-index) — §2.2.
3. **Pastilles agents/canaux** figées (§2.3 / §2.4) — c'est l'ADN identitaire, à verrouiller tôt.
4. **Mode B (tty-iaka) seul** pour commencer : c'est le défaut et il réutilise 90% du réservoir.
5. **Portraits = réf charte** (vignettes existantes) ; upload/génération en horizon.
6. **Doc dayone** = page HTML standalone NaonEdge présentant cette direction (je peux la produire).

### Horizon (après socle)
- Modes A (tty-raw) et C (chat) — couches de rendu additionnelles sur le même modèle.
- Commutateur multi-chartes complet (grimoire / cartoon / os).
- Génération de portraits via ComfyUI (avec mocks d'abord).
- Admin par prompt avec moteur de diff réel sur `agent.md`.
- MCP-manager façon Obot, canaux externes (Slack/Discord/MQTT), mobile, vocal.

> **Garde-fou design** : ne jamais introduire de couleur hors charte. Tout besoin de
> teinte passe par un token (charte ou surcouche dérivée). Toute évolution d'une charte
> se fait **dans le réservoir iakagraph**, pas dans le Cockpit (étanchéité §1).

---

_Loki · proposition v0.1 · base des maquettes JPG (objectif 2)._
