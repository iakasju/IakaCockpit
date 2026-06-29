# Identité iakacockpit — métaphore Atelier / Étagère / Table

> Note d'identité produit (chef de projet, 2026-06-29). Décision de direction proposée
> par Stéphane. Répond au chantier ouvert « iakacockpit = produit à part, identité à définir ».

## La métaphore

iakacockpit est un **atelier** d'agents augmentés. Le travail s'y organise autour de deux
meubles et d'un geste :

| Métaphore | Remplace (concept actuel) | Sens |
|---|---|---|
| **Atelier** | Chapeau / `IAKAFRAME_ROOT` | l'espace global au-dessus de tous les projets — l'espace d'Odin (portefeuille). C'est le **nom même de l'espace/produit**, pas un onglet. |
| **Étagère** | Portefeuille | les projets **rangés** : la racine rendue tangible. Étagère **instrumentée** (KPIs économie/coût) → elle garde l'intendance de valeur que portait « portefeuille ». |
| **Table** (établi) | Travail | le projet **sorti, posé, travaillé** avec l'équipe (conversation-first + shell). |

## Ce que la métaphore apporte

1. **Elle dit le GESTE** que ni « portefeuille → travail » ni « chapeau » n'exprimaient :
   *prendre un projet sur l'**étagère** → le poser sur la **table** → le **ranger**.* C'est
   l'interaction centrale du produit, rendue physique et immédiate.
2. **Elle fond 3 concepts en 2 (+1 contenant)** : le « chapeau-root », abstrait et technique,
   devient l'**atelier** (l'espace tout entier) ; l'**étagère** en est la forme visible.
3. **Registre juste** : artisanal / atelier, cohérent avec « équipe augmentée d'agents »
   (iakaframe), à l'opposé du registre financier abstrait de « portefeuille ».

## Réserve & règle d'application

- **Sémantique d'intendance** : « portefeuille » portait l'idée de *gérer de la valeur*. Une
  étagère est passive ; on la rend **instrumentée** (anneaux de coût, treemap, KPIs déjà
  mockés) pour réinjecter cette intendance.
- **Churn** : `chapeau-root` / `IAKAFRAME_ROOT` / `Portfolio` sont des termes **porteurs** du
  code, des docs et des rôles d'agents. **Règle : on renomme l'EXPÉRIENCE (labels d'IHM,
  langage de marque), pas le SOCLE technique.** Les identifiants Rust/TS, `IAKAFRAME_ROOT`, la
  vue `portfolio` du routeur, etc. restent inchangés ; seuls changent les **mots vus par
  l'utilisateur**.

## Déclinaison rail (proposition)

- **Atelier** = nom de l'espace / accroche d'identité (header, branding), pas un onglet.
- **Étagère** (ex-Portefeuille) · **Table** (ex-Travail) · **Journal** · **Équipes** ·
  **Réglages**. Les trois derniers restent (journal = livre de bord de l'atelier ; équipes =
  les compagnons ; réglages = l'outillage).

## Statut & suites

- **À matérialiser** : Loki décline le rail + les vues dans ce langage (mock) — itération
  **mise en file après** l'itération en cours (évite le conflit sur `viz.css`).
- **À confirmer par Stéphane** : libellé exact du nav (« Table » vs « Établi » vs garder
  « Travail » ; « Étagère » vs « Portefeuille »), et si « Atelier » devient l'accroche de marque.
- Lié à la mémoire `iakacockpit-produit-a-part-identite-propre` (identité enfin nommée).
