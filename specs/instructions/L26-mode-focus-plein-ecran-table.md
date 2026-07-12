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

### F1 — Feux jaune/vert dans la barre d'onglets (`ProjectTabs`)
- À **droite** des onglets, ajouter **2 pastilles rondes** style **feux macOS** : **verte**
  (agrandir/plein écran) + **jaune** (restaurer). Couleurs standard macOS (vert ~`#28c840`, jaune
  ~`#febc2e`), ~12 px, `title`/`aria-label` i18n (« Agrandir la zone de travail » / « Revenir à
  la normale »). (Icône au survol type `⤢`/`–` = cosmétique différée.)
- **PAS de bouton rouge** (non demandé).
- Props ajoutées : `focus: boolean`, `onEnterFocus()`, `onExitFocus()`. Vert → `onEnterFocus`,
  jaune → `onExitFocus`. Atténuer/désactiver le feu déjà à l'état courant (vert inactif si déjà
  focus, jaune inactif si déjà normal) — les deux restent visibles.
- `ProjectTabs` **rend la barre même avec 0 onglet** (les feux sont toujours présents sur la vue
  Travail) — ne plus retourner `null` sans rendre les contrôles.

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
- **Vert** (`onEnterFocus`) : `workFocus = true` **et** `void backend.setFullscreen(true)` (passe
  en plein écran si pas déjà — idempotent).
- **Jaune** (`onExitFocus`) : `workFocus = false` **SEULEMENT** (rétablit les colonnes). **NE
  touche PAS au plein écran** (AR-1 tranché) — la sortie du fullscreen OS reste au feu natif macOS.

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
1. Deux pastilles **jaune + verte** (look feux macOS) apparaissent **à droite des onglets** de la
   Table, avec `title`/`aria-label` i18n.
2. **Vert** → le **rail** et la **worklist** disparaissent, la zone de travail s'agrandit, la
   **colonne widgets droite reste**, et l'app **passe en fullscreen** (si pas déjà).
3. **Jaune** → rail + worklist **réapparaissent** (layout normal) ; le plein écran OS **n'est PAS
   modifié** (si on était en fullscreen, on y reste ; sortie via le feu natif macOS).
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
- **AR-1** — **TRANCHÉ (Stéphane 2026-07-13)** : Jaune = **que les colonnes** — rétablit rail +
  worklist, **ne touche PAS au plein écran** (on reste en fullscreen si on l'était ; sortie via le
  feu natif macOS). Vert = focus + fullscreen (one-way).
