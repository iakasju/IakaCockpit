# Charte « Ember » — proposition neuve (Mock D)

> Auteur : 🎭 Loki, 2026-06-27. Charte **inventée** pour le lot de refonte (consigne :
> une 4ᵉ hypothèse libre, pas contrainte à studio-clair). Intention : donner à IakaCockpit
> une **identité propre** — ni *naonedge* (dark premium / or, thème par défaut hérité), ni
> *studio-clair* (blanc froid / indigo SaaS). Voir mémoire « IakaCockpit = produit à part ».

## Intention
**Papier chaud + encre + braise.** Une voix **optimiste, artisanale-premium**, à mi-chemin de
l'éditorial et du logiciel d'auteur. Le cockpit doit donner envie de *reprendre le travail*,
pas d'administrer une console. La chaleur du fond (sable) + l'énergie de la braise (ember) + un
**display grotesque assumé** (Bricolage Grotesque) créent un caractère immédiatement reconnaissable
et **non générique** — c'est le reproche n°1 fait à l'app actuelle.

## Tokens clés
| Rôle | Token | Valeur | Note |
|------|-------|--------|------|
| Fond global | `--bg` | `#f5efe6` | sable chaud (+ halo radial braise très léger en haut-droite) |
| Surface carte | `--card` | `#fffdf9` | papier crème |
| Fond profond / champs | `--deep` | `#ece3d5` | |
| Bord | `--line` | `#e3d8c6` | bords chauds, jamais gris froid |
| Encre primaire | `--ink` | `#23190f` | brun-noir chaud (pas de noir pur) |
| Encre secondaire | `--ink2` | `#6e6253` | |
| Encre tertiaire | `--ink3` | `#a89a86` | |
| **Accent primaire — braise** | `--ember` | `#e0531d` | CTA, chiffres clés, mots-héros, accents de carte |
| Accent clair | `--ember-l` | `#f47a3e` | dégradés |
| Secondaire — pin | `--pine` | `#0f6b5e` | statut « vivant », contraste froid maîtrisé |
| Sémantique — prune | `--plum` | `#7b3f8f` | catégorie design |
| Sémantique — or | `--gold` | `#c98a17` | alertes douces |
| Rayon | `--r` / `--r-lg` | `16px` / `26px` | formes généreuses, organiques |
| Élévation | `--shadow` | `0 2px 0 line, 0 22px 44px -30px rgba(35,25,15,.45)` | ombre **chaude**, double (liseré + halo) |

## Typographie
- **Display** : **Bricolage Grotesque** (700/800, `opsz` variable) — caractère fort, légèrement
  imparfait/humain, très « 2026 indé-premium ». Porte les titres, chiffres et boutons.
- **Texte** : **Inter** (400–600) — neutre, lisible, laisse parler le display.
- **Mono** : system mono (chemins, ids) — discret.
- Échelle généreuse : H1 ≈ 50px / line-height 1.02 / letter-spacing −0.025em ; labels en
  petites capitales espacées (0.14em) en braise.

## Accessibilité
- Encre `#23190f` sur sable `#f5efe6` ≈ ratio **> 12:1** (AAA).
- Braise `#e0531d` réservée aux **gros éléments** (CTA, titres, chiffres, liseré) — pas au petit
  texte courant sur fond clair (contraste ≈ 3.4:1, OK ≥ 24px/bold, à éviter en corps fin).
  En usage texte fin, basculer sur `--ink2`. Pin `#0f6b5e` lisible en label (≈ 4.8:1).
- Aucune information portée par la **seule** couleur : statuts doublés d'un mot (« en cours »,
  « au repos »).

## Ce qu'on garde du contrat de tokens existant
Même **grammaire de variables** que les autres chartes du catalogue (surfaces / encre /
accent / sémantique / formes) → Ember s'intègre comme un `data-theme` de plus, **sans toucher
les composants**. Seules les *valeurs* changent (et la paire typo). Pour le casting, prévoir un
jeu de vignettes « ember » (sinon fallback pastille, comme studio-clair aujourd'hui).

## Pourquoi cette direction
Le diagnostic de l'audit pointe « muet / générique » comme cause profonde du « pas moderne ».
Ember répond frontalement : une **couleur signature** (la braise) + une **typo signature** (le
grotesque) donnent au produit un visage. C'est la piste la plus *risquée mais la plus
différenciante* des quatre — à opposer à studio-clair (sûr, neutre, déjà en place).
