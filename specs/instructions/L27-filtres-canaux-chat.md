# L27 — Filtres de canaux au-dessus du chat (Travail)

> Cadré 🟠 Aragorn (2026-07-13). Chantier IHM (A). Front seul. Cible v0.22.0.
> Généralise le toggle `pensée` existant en une barre de filtres par canal.

## 1. Besoin
Au-dessus du fil de messages du chat (vue Travail), une **barre de filtres de canaux** pour
montrer/masquer chaque canal du transcript : **Parole / Geste / Délégation / Activité / Pensée**.

## 2. État des lieux (code réel)
- `src/components/Chat.tsx` rend `history: ChatTurn[]`, chaque tour typé par **`kind`** :
  `parole` / `geste` / `delegation` / `activite` / `pensee` (mappés depuis le transcript par
  `runnerView.ts`). Les tours `role:"user"` = messages de l'utilisateur (pas un canal).
- Il existe **déjà** un toggle **`pensée`** : `hidePensee` (contrôlé, **persisté** via
  `onToggleHidePensee` / `settings.hidePensee`) + repli interne `internalHide`. `hasPensee`
  n'affiche le contrôle que si au moins une pensée existe.
- `WorkingView` passe `hidePensee`/`onToggleHidePensee` au `Chat`.

## 3. Périmètre FERMÉ
- Ajouter dans `Chat.tsx` une **barre de filtres** (`.chanfilter`) **en tête de la zone de
  messages** (au-dessus du fil scrollable), avec **un chip par canal** présent dans l'historique :
  Parole, Geste, Délégation, Activité, Pensée. (N'affiche un chip que si le canal existe dans
  `history` — calque `hasPensee` ; barre masquée si un seul canal / aucun.)
- **Sémantique = toggle de visibilité** (chip actif = canal **affiché**, chip atténué = **masqué**)
  — généralise le `hidePensee` existant. Défaut : **tous affichés SAUF Pensée** (qui suit
  `hidePensee`, masquée par défaut, persistée).
- **Câblage des canaux** :
  - **Pensée** reste câblée sur `hidePensee`/`onToggleHidePensee` (**persisté**, comportement
    existant conservé — ne pas régresser).
  - Les **4 autres** canaux (parole/geste/délégation/activité) = **état local** `Chat` (Set des
    canaux masqués, MVP non persisté).
- **Application du filtre** : masquer les tours dont `(turn.kind ?? "parole")` est dans l'ensemble
  masqué. **Les tours `role:"user"` restent TOUJOURS visibles** (message de l'utilisateur, pas un
  canal filtrable). Le regroupement d'attribution (`firstOfRun`) et l'auto-scroll doivent rester
  cohérents avec l'historique **filtré**.
- **i18n parité fr/en** : libellés des chips par canal (réutiliser/compléter les clés `chat.*`
  existantes — `evGeste`/`evPensee`/… — sous des clés de filtre `chat.chan*` si besoin).
- Réutiliser la **grammaire visuelle** des chips de canaux du Journal (`MainCourante`) pour la
  cohérence, sans importer sa logique (taxonomie différente).

## 4. Gardes
- Front seul (Chat + CSS + i18n) ; **Rust non touché**. Présentationnel D8 (le filtre est un état
  d'affichage local ; la donnée `history` arrive en prop). Façade unique non concernée (aucun I/O).
- CSP intacte, pas de god-component. **Ne pas régresser** la persistance `pensée` ni le mode
  lecture seule L25 (`readOnly`) ni les autres consommateurs de `Chat`.

## 5. Critères d'acceptation
1. Une barre de chips de canaux apparaît au-dessus du chat, un chip par canal **présent** dans
   l'historique (Parole/Geste/Délégation/Activité/Pensée), avec libellé i18n.
2. Cliquer un chip **masque/affiche** les tours de ce canal ; l'état actif/atténué est visible.
3. **Pensée** reste liée au réglage **persisté** (`hidePensee`) — masquée par défaut, l'état
   survit au rechargement ; les autres canaux sont locaux (MVP).
4. Les **messages utilisateur** restent toujours visibles quel que soit le filtre.
5. `npm run typecheck` + `lint` + `test` verts ; Rust non modifié. Tests : filtrage par canal
   (masquer geste → les tours geste disparaissent), user toujours visible, pensée câblée au réglage.

## 6. Différés / hors-lot
- Persistance des filtres des 4 autres canaux (config) — MVP local.
- Filtres de canaux dans le **Journal** (il a déjà les siens, taxonomie L4).
- **Arbre des délégations** = chantier IHM (B), lot séparé (L28).
