# L15 — Noms de personnages pour les teams du catalogue

> Statut : cadré (chef de projet, 2026-06-29). Suite directe du travail **L15-B**
> (teams du catalogue iakagraph déjà bootstrappées) et de **L14** (chartes).
> Décision source de vérité tranchée par Stéphane : **amont iakagraph `teams.json`**.

## Besoin

Les 11 teams thématiques du catalogue iakagraph (`avengers`, `xmen`, `lotr`…) sont déjà
proposées comme teams par défaut, et leurs vignettes suivent déjà la charte active. **Mais
le nom d'agent affiché est le slug brut** (`beast`, `profx`, `capamerica`, `lokiavg`,
`c3po`…). On veut afficher le **nom du personnage** correspondant à la vignette : « Beast »,
« Professor X », « Captain America », « R2-D2 »…

Une simple capitalisation du slug ne suffit pas (`profx`→« Professor X »,
`capamerica`→« Captain America », `c3po`→« C-3PO »). Il faut un **libellé curé par
personnage** (11 × 8 = 88).

## Décision (Stéphane)

**Source de vérité = iakagraph `teams.json`** : on ajoute un champ `name` à chaque entrée de
personnage (additif, à côté de `slug`/`seed`/`desc`). Le générateur Cockpit le recopie dans
`catalog.ts`. Pas de table de noms dupliquée côté app.

## Périmètre (fermé)

1. **`~/work/iakagraph/teams.json`** — ajouter `"name": "<Nom du personnage>"` aux **88**
   entrées (additif, ordre des slugs inchangé = roleIndex). Ne touche ni `seed` ni `desc`
   (la génération d'images iakagraph ne lit que slug/seed/desc → non impactée).
2. **`scripts/sync-vignettes.sh`** — `CatalogAgent` gagne `name: string` ; la boucle de
   génération lit `slug` **et** `name` (fallback `name // slug` si absent) et émet
   `{ slug, name, roleIndex }`.
3. **`src/assets/teams/catalog.ts`** — **régénéré** par le script (jamais édité à la main).
4. **`src/hooks/useTeams.ts`** — `teamFromCatalog` : `name: a.name` (au lieu de `a.slug`).
   `id: a.slug` **inchangé** (clé stable, vignetteTeam, coordinateur par roleIndex inchangés).
5. **Tests** — `useTeams.test` : `teamFromCatalog` expose les noms ; parité catalogue
   (chaque agent a un `name` non vide). Non-régression : bootstrap idempotent, ids inchangés.

## Hors périmètre

- Pas de changement de la team par défaut `iakaframe` (déjà des noms propres).
- Pas de changement des slugs, ids, roleIndex, coordinateur, vignettes, chartes.
- Pas de renommage des **teams** (les libellés de team existent déjà : « X-Men »…).

## Gardes

- `catalog.ts` reste **généré** (entête « NE PAS EDITER A LA MAIN ») → régénération via le
  script, pas d'édition manuelle.
- Additif/non destructif côté `teams.json` (autres consommateurs iakagraph intacts).
- Front : `TeamsView`/`Roster`/`Chat` consomment déjà `agent.name` → zéro changement UI.
- CSP / assets / Rust : **inchangés**.

## Vérification de clôture

`npm run typecheck` + `npm run lint` + `npm run test` verts ; `catalog.ts` régénéré contient
les 88 `name` ; un échantillon (xmen→Beast/Professor X, avengers→Captain America, rebels→R2-D2)
affiché correct.
