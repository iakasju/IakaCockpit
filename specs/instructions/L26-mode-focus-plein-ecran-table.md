# L26 — Mode focus plein écran de la Table (feux macOS jaune/vert)

> Cadré 🟠 Aragorn (2026-07-13), demande Stéphane. Front + 1 commande Rust (fullscreen OS).
> Cible : version **v0.20.0**.

## 1. Besoin
Dans la **barre d'onglets** de la Table, **à droite** des onglets projets, deux **pastilles
façon feux macOS** (jaune + verte) pour un **mode focus** :
- **Vert** = agrandir au max la zone de travail : **masquer les 2 colonnes de gauche** (rail de
  nav + worklist), **garder la colonne de widgets à droite**, ET **passer l'app en fullscreen
  OS** si elle ne l'est pas déjà.
- **Jaune** = revenir à la normale.
- Même en plein écran, on **garde les onglets projets et le toggle Shell/Conversation**.

## 2. État des lieux (code réel)
- **App shell** (`App.tsx`, `main.app-shell`) : `nav.rail` (**colonne gauche n°1**, nav globale)
  + `div.host` (vue active).
- **WorkingView** (`WorkingView.tsx`) : `aside.worklist` (**colonne gauche n°2**) + `div.workpane`
  (centre : `ProjectTabs` + `.convhead` + corps) + `aside.wkright` (**colonne widgets droite** :
  Roster + TasksPanel).
- **`ProjectTabs`** (`src/components/ProjectTabs.tsx`) = barre d'onglets (L24), un onglet/conv.
- **Tauri** v2.11.2 : `window.set_fullscreen(bool)` dispo côté Rust (core) — pas de feature ni de
  capability JS si on l'appelle depuis **notre** commande Rust.

## 3. Périmètre FERMÉ

### F1 — Switch « plein écran » dans la barre d'onglets (`ProjectTabs`) — RÉVISION RECETTE 2026-07-13 (v2)
> Itération recette : v0.20.0 = 2 feux macOS (pas assez explicites) → toggle-icône `⤢` (trop
> discret) → **v2 = un SWITCH coulissant gauche↔droite, aligné à DROITE**.
- À l'**extrême droite** de la barre d'onglets (**aligné à droite**, `margin-left:auto`), un
  **switch coulissant** type interrupteur : **piste + pastille qui glisse** — **gauche = normal
  (off)**, **droite = focus/plein écran (on)**. Accompagné d'un **petit libellé/icône « plein
  écran »** (`⤢` ou libellé i18n) pour être **explicite** (pas juste une icône discrète).
- Sémantique accessible : `role="switch"` + `aria-checked={focus}` + `aria-label`/`title` i18n.
  Clic → **bascule** (`onToggleFocus`). Un seul contrôle, deux états visuellement distincts
  (pastille à gauche vs à droite, piste colorée en `on`).
- **Retire l'ancien bouton-icône `.fsbtn`** (et déjà les feux) — remplacé par le switch.
- Props : `focus: boolean`, `onToggleFocus: () => void` (inchangées).
- `ProjectTabs` **rend la barre même avec 0 onglet** (le switch est toujours présent, aligné à
  droite) — ne pas retourner `null` sans rendre les contrôles.

### F2 — État « focus travail » (App)
- Nouvel état booléen **`workFocus`** dans `App` (`useState`) — il masque le **rail (App)** ET la
  **worklist (WorkingView)**, donc il vit au niveau App et est passé aux deux.
- Quand `workFocus === true` :
  - **masquer `.rail`** (ex. classe `app-shell--focus` qui cache le rail) ;
  - **masquer `.worklist`** + **agrandir `.workpane`** (WorkingView reçoit `focus` en prop → classe
    conditionnelle sur `.work` / `.worklist`) ;
  - **garder `.wkright`** (widgets projet à droite) ;
  - **garder** `ProjectTabs` + `.convhead` (toggle Shell/Conversation) visibles et fonctionnels.
- `WorkingView` reçoit `focus` + `onEnterFocus`/`onExitFocus` et les passe à `ProjectTabs`.

### F3 — Fullscreen OS (Rust)
- Commande façade **`set_fullscreen(on: bool) -> Result<(), String>`** (Rust ; injecter
  `window: tauri::WebviewWindow`/`tauri::Window`, appeler `window.set_fullscreen(on)`),
  enregistrée dans l'`invoke_handler` (`lib.rs`), miroir `backend.ts`. (Optionnel
  `is_fullscreen() -> Result<bool,String>` pour lire l'état.)
- **Toggle SYMÉTRIQUE** (`onToggleFocus`, révision 2026-07-13) : `const next = !workFocus;
  setWorkFocus(next); void backend.setFullscreen(next);`. Activer → focus + plein écran ; désactiver
  → colonnes rétablies **ET** sortie du plein écran. (Un seul contrôle = un seul état `workFocus`
  qui pilote colonnes **et** fullscreen. **Remplace AR-1** — l'asymétrie venait de la métaphore
  2-boutons, abandonnée.)

## 4. Gardes (non négociables)
- **Façade unique D7** : une seule nouvelle commande `set_fullscreen` (via `backend.ts`) ; aucun
  usage direct du plugin window JS (évite la config de capabilities + garde la façade unique).
- **Présentationnel D8** : `ProjectTabs`/`WorkingView` restent présentationnels ; l'appel façade
  (fullscreen) est orchestré par `App` dans les callbacks.
- **CSP intacte**, **i18n parité fr/en** (libellés des feux), pas de god-component.
- **Onglets + toggle Shell/Conversation TOUJOURS visibles** en focus (exigence explicite).
- Ne pas régresser L24 (onglets) ni L25 (attached) : `ProjectTabs` garde son contrat existant
  (onglets, `onSelect`, `onClose`) — on **ajoute** seulement les feux.

## 5. Critères d'acceptation
1. **(révision v2)** Un **switch coulissant gauche↔droite** (`role="switch"`, `aria-checked`, libellé/
   icône plein écran, i18n), **aligné à DROITE** de la barre d'onglets ; pastille à gauche = off, à
   droite = on. **Plus de feux ni de bouton-icône discret.**
2. **Switch à droite (on)** → le **rail** et la **worklist** disparaissent, la zone de travail
   s'agrandit, la **colonne widgets droite reste**, et l'app **passe en fullscreen**.
3. **Switch à gauche (off)** → rail + worklist **réapparaissent** ET l'app **sort du fullscreen**
   (symétrique).
4. En focus, **onglets projets + toggle Shell/Conversation** restent visibles et cliquables ;
   switcher d'onglet / basculer Shell↔Conversation fonctionne toujours.
5. `set_fullscreen(on)` (Rust) est enregistrée et bascule le fullscreen OS ; miroir `backend.ts`.
6. `npm run typecheck` + `lint` + `test` verts ; `cargo test` vert (au moins compile + commande
   enregistrée). Tests front : les feux appellent `onEnterFocus`/`onExitFocus` ; `WorkingView`/App
   masquent bien rail+worklist et gardent `.wkright` quand `focus`.

## 6. Différés / hors-lot
- Icône au survol des feux (`⤢`), animations macOS.
- Bouton rouge (fermer) — non demandé.
- Raccourci clavier (ex. `esc` pour sortir du focus) — hors lot (esc est déjà l'interruption Shell).
- Persistance de l'état focus entre sessions — non (transitoire).

## 7. Arbitrages
- **AR-1** — ~~Jaune = que les colonnes~~ **SUPERSEDÉ (révision recette 2026-07-13)** : la métaphore
  2-boutons macOS est abandonnée au profit d'**UN toggle « plein écran »**. Le toggle est
  **symétrique** : activer = focus + fullscreen ; désactiver = colonnes rétablies **+** sortie du
  fullscreen. (Les feux jaune/vert de v0.20.0 sont retirés.)
