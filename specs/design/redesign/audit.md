# Audit design IakaCockpit — esthétique & ergonomie

> Auteur : 🎭 Loki (studio iakaframe). Date : 2026-06-27.
> Méthode : capture réelle du front (Vite :3020) via Chrome headless/CDP (`cdp-batch.mjs`),
> puis lecture des PNG. Données backend **vides** hors Tauri (scan/roster/PTY absents — `invoke`
> échoue) : l'audit porte sur la **forme** (charte, layout, hiérarchie, densité), pas sur la donnée.
> Captures citées dans le scratchpad : `sc-portfolio.png`, `sc-working.png`, `sc-journal.png`,
> `sc-teams.png`, `sc-réglages.png` (toutes en charte **studio-clair**), + `teams-grimoire.png`,
> `front-3020.png` (naonedge-dark) pour comparaison de charte.

## Verdict de Stéphane à servir
> « le site est **trop vieux, trop lourd, pas assez aéré** ».

Diagnostic : **le verdict est juste**, mais la cause n'est pas la charte (studio-clair est déjà
propre et clair). La cause est **structurelle et typographique** : une grammaire d'UI « panneau
d'admin 2018 » — tout est une **boîte pleine bordée**, la **typo est indifférenciée**, la
**hiérarchie est plate**, et l'app **ne respire pas** parce qu'elle empile des formulaires longs
plutôt que d'orchestrer des espaces. Changer de charte ne suffira pas ; il faut changer la
**grammaire de mise en page** et la **voix typographique**.

---

## 1. Esthétique

### 1.1 Ce qui « fait vieux / lourd » (par ordre d'impact)

1. **La barre d'onglets en « pilule grise » (le plus daté).** `sc-*.png` : les 5 onglets sont logés
   dans un **caisson gris arrondi** facette « segmented control iOS 2015 ». C'est la première chose
   qu'on voit et elle date l'app immédiatement. L'onglet actif est un aplat indigo plein : contraste
   correct mais traitement « bouton » là où on attend une **navigation discrète**.

2. **Tout est une carte pleine, bordée, ombrée.** `sc-réglages.png` / `sc-teams.png` : chaque section
   est un rectangle blanc à **bordure + ombre douce + radius**. Empilées, ces cartes créent un effet
   « millefeuille » : beaucoup de bords, peu de vide. Le **cadre** prend le pas sur le **contenu**.
   La modernité 2026 va vers le **sans-bord** (séparation par l'espace et la couleur de fond, pas par
   un trait).

3. **Champs de formulaire « pleine largeur » uniformes.** `sc-teams.png` : Nom de team, Casting,
   Coordinateur… tous des barres grises de **1440 px de large** alignées. Aucune mesure de ligne, aucun
   regroupement visuel ; ça se lit comme un **questionnaire administratif**, pas comme un cockpit.

4. **La carte agent noire au milieu d'un fond clair** (`sc-teams.png`, bloc « Odin ») : un **encart
   sombre** surgit dans une page claire — rupture de matière non maîtrisée, on dirait deux apps collées.

5. **Densité serrée dans les listes.** `sc-journal.png` : les entrées de main courante sont **collées**
   (interligne court, pastille + nom + canal + heure sur une ligne dense). Lisible mais **compact**,
   sans rythme — l'œil ne sait pas où se poser.

6. **Profondeur incohérente.** On mélange : ombres portées (cartes), aplats (onglet actif), bordures
   1px (champs), et un encart noir. **Quatre langages de profondeur** pour un seul écran = bruit.

### 1.2 Palette & contraste
- studio-clair est **saine** : fond blanc froid `#fbfbfc`, cartes `#ffffff`, accent indigo `#5b5bd6`,
  texte `#16181d`. Contrastes AA respectés sur le texte principal.
- **Mais l'accent est sous-exploité** : l'indigo ne sert qu'aux onglets actifs et aux boutons. Aucune
  couleur sémantique ne structure l'info (statuts, canaux, royaumes des agents pourraient porter une
  couleur). Résultat : **un écran monochrome gris-sur-blanc**, d'où la sensation de platitude.
- Le **texte secondaire `#5b6270`** est partout, en taille proche du primaire → manque de **contraste
  de hiérarchie** (pas de contraste de couleur, mais de *rôle*).

### 1.3 Typographie actuelle — point clé (« un changement de police peut être bénéfique »)
- studio-clair utilise **Inter / système** pour TOUT (titres, corps, labels) et un mono système pour le
  code. **Une seule voix.** Les titres (« Teams & agents », « Réglages généraux ») sont juste du
  **gras un peu plus gros** — pas de caractère, pas de contraste de graisse fort, pas de display.
- C'est **le** levier de modernité le plus rentable : une app se sent « 2026 » d'abord par sa **paire
  typographique** (un display à personnalité + un texte neutre lisible) et son **échelle** (gros titres
  aérés, petits labels en majuscules espacées). Voir § Reco typo.

---

## 2. Ergonomie

### 2.1 Navigation (5 onglets : Portfolio / Working / Journal / Teams / Réglages)
- **Top-tabs centrés** : simple, mais **plafonne** — la nav ne montre **aucun état** (combien de
  projets ? une conversation est-elle vive ? la team tourne-t-elle ?). C'est une **barre d'onglets de
  site vitrine**, pas un **cockpit d'opérations**.
- Les 5 destinations sont **hétérogènes** : Portfolio (gestion), Working (action temps réel), Journal
  (flux passif), Teams (config), Réglages (config). On mélange **faire** et **paramétrer** au même
  niveau. Teams + Réglages devraient être en **second rang** (config), Working + Portfolio + Journal en
  **premier** (opération).

### 2.2 Architecture de l'information & hiérarchie
- **Working** (`sc-working.png`) est la vue cœur (projet → conversation → terminal) mais hors Tauri elle
  est vide (« Aucune conversation ouverte »). Sa structure : **rail gauche « Set de Work »** + grande
  zone conversation. Bonne ossature, mais le rail est **typé en mono gris pâle** (« AUCUN PROJET… ») —
  illisible et froid, on dirait un log d'erreur, pas une invitation.
- **Réglages** (`sc-réglages.png`) est en réalité la **vue la mieux structurée** : sous-nav latérale
  (Généraux / Cockpit-opérationnel), sections claires, contrôles segmentés. **Ironie** : la page de
  *config* est mieux pensée que la page de *travail*. À capitaliser : ce patron (rail + sections) est le
  bon, il faut l'étendre et l'alléger.
- **Hiérarchie plate** partout : titre H1, puis tout au même niveau. Pas de « héros », pas de point
  d'entrée évident, pas de progression guidée.

### 2.3 Flux (lier projet → team → conversation)
- Le flux **projet → team → conversation** est éclaté sur **3 onglets** (Portfolio pour le projet, Teams
  pour la team, Working pour la conversation). L'utilisateur doit **reconstruire mentalement** le lien.
  Or c'est **le** geste central du produit (cf. vision § 0 : terminal = conversation). Il devrait être
  **un seul espace** ou un flux contigu, pas une chasse au trésor inter-onglets.
- **Teams** (`sc-teams.png`) est un **long formulaire vertical** (team → casting → coordinateur → puis
  une carte par agent en pleine largeur). Scroll infini, aucune vue d'ensemble du casting. Un casting de
  5–8 agents devrait se **voir d'un coup** (grille de cartes-portraits), pas se dérouler.

### 2.4 Scannabilité & respiration
- **Aération insuffisante** : marges de section présentes mais **gouttières internes serrées**, et
  surtout **largeur de contenu = pleine fenêtre** (1440 px). Aucune **colonne de lecture** : le texte et
  les champs courent sur toute la largeur → fatigue, manque de calme.
- **Scannabilité faible** : sans couleurs sémantiques ni contraste typographique, l'œil ne trouve pas de
  points d'ancrage. Tout gris, tout aligné, tout pareil.

---

## 3. Diagnostic priorisé — ce qui pèse le plus dans « pas moderne »

| # | Problème | Poids ressenti | Levier |
|---|----------|----------------|--------|
| 1 | **Une seule voix typo, titres sans caractère** | ●●●●● | Paire display + texte, grande échelle de titres |
| 2 | **Grammaire « tout en cartes bordées/ombrées »** | ●●●●● | Passer au sans-bord : espace + fond, pas de trait |
| 3 | **Onglets pilule grise (segmented 2015)** | ●●●● | Nav latérale ou top discret sans caisson |
| 4 | **Pas de colonne de lecture (full-width 1440)** | ●●●● | Contenu borné + grille |
| 5 | **Flux projet→team→conv éclaté sur 3 onglets** | ●●●● | Unifier l'espace de travail |
| 6 | **Accent/sémantique sous-exploités (tout gris)** | ●●● | Couleur de statut/canal/royaume |
| 7 | **Profondeur incohérente (4 langages)** | ●●● | Un seul système d'élévation |
| 8 | **Teams = formulaire vertical infini** | ●●● | Grille de cartes-casting |

**Synthèse en une phrase** : l'app n'est pas « moche », elle est **muette** — elle n'a ni voix
typographique ni respiration, et elle parle la grammaire « panneau d'admin bordé » au lieu de la
grammaire « produit aéré 2026 ». Les 4 mocks attaquent ces 8 points sous 4 angles distincts.

---

## 4. Recommandation typographique (levier #1)

Une app se modernise d'abord par sa **paire** typo. Trois directions, une par grande famille, testées
dans les mocks :

- **Mock A — Géométrique chaleureux** : display **Space Grotesk** (titres à caractère, légèrement
  technique) + texte **Inter** (neutre, lisible). Voix « SaaS produit moderne ».
- **Mock B — Éditorial** : display **serif** (Fraunces / Newsreader — contraste fort, personnalité) +
  texte **Inter**. Voix « calme, premium, magazine », maximise la respiration.
- **Mock C — Mono-tech assumé** : texte **system-ui** neutre + **mono** (JetBrains/IBM Plex Mono) pour
  les accents/labels/données. Voix « cockpit d'ingénieur », dense mais structurée.
- **Mock D (charte neuve)** : voir `mock-D-charte.md` — paire **Clash/Satoshi-like** (display fort +
  grotesque), palette propre.

Constante : **toujours deux voix** (un display + un texte), une **échelle de titres généreuse** (H1 ≥
32–40px, line-height serré sur les titres, large sur le corps), et des **labels en petites capitales
espacées** (letter-spacing) pour structurer sans bordures.

---

## 5. Faut-il lancer `tauri dev` ?

**Non, pas pour cet audit.** Le front me donne les 5 vues, la charte, la hiérarchie, la densité, la typo
— tout le matériau « forme ». Les seules choses invisibles hors Tauri (Working peuplé : roster +
vignettes + terminal TUI) sont **documentées** (specs L8/L9/L10) et je les **reconstruis fidèlement**
dans les mocks (vignettes réelles embarquées, bulles de chat + chaîne de badges, terminal). Lancer
`tauri dev` ouvrirait une fenêtre GUI intrusive pour un gain marginal sur un travail de **forme**. Si
Stéphane veut une recette du Working **réel peuplé**, ce sera une passe `screencapture` dédiée, hors de
ce lot d'exploration.
