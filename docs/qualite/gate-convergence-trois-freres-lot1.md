# Gate qualité — CONVERGENCE-TROIS-FRERES lot 1 — IakaCockpit

> Ordre de mission d'Odin (portefeuille), 2026-09-08. Gate transverse à deux dépôts sœurs
> (`IakaCockpit`, `iakaFrameGUI`), branche `feat/convergence-trois-freres`, commits Cockpit
> `7a9aaaf`, `f67b977`, `303b121`. Base : `iakaInstall/specs/instructions/convergence-trois-freres.md`
> (§3 AR-C1..C6, annexes A/B/C), `specs/instructions/release-brouillon-jusqua-matrice-verte-cockpit.md`.

## Verdict : PASS

## Verdict transverse (byte-identité Cockpit ↔ iakaFrameGUI) : PASS

## Mesures
| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run typecheck` | `0` | `tsc --noEmit` — aucune erreur |
| `npm run lint` | `0` | `eslint .` — aucune erreur |
| `npm run test` | `0` | `Test Files 102 passed (102)` / `Tests 1063 passed (1063)` |
| `npm run vitrine:check` | `0` | `vitrine : OK — README aligne sur v0.33.0 (3 zone(s)).` |
| `npm run test:convergence` | `0` | `OK — 1 frere(s) mesure(s) [iakaFrameGUI], 30 chemin(s) compare(s), 0 hors comparaison, 1 frere(s) nomme(s) SKIP [iakaInstall].` |
| `cargo fmt --check` (`src-tauri/`) | `0` | aucune sortie (rien à reformater) |
| `cargo clippy --all-targets -- -D warnings` | `0` | `Finished 'dev' profile … in 0.66s` |
| `cargo test` (`src-tauri/`) | `0` | `test result: ok. 346 passed; 0 failed; 0 ignored` |
| `git diff --stat main..HEAD -- '*.rs'` | `0` | sortie vide — **aucun `.rs` touché** |

## Chaîne complète — détail
17 fichiers modifiés `main..HEAD` (1868 insertions / 100 suppressions) : `.github/workflows/release.yml`,
`CLAUDE.md`, `README.md`, `fixtures/bloc-latest.sha256`, `fixtures/convergence.sha256`,
`fixtures/freres.json` (neuf), `fixtures/vitrine-locale.json`, `scripts/__tests__/forge-host-parity.test.mjs`,
`scripts/__tests__/release-publication.test.mjs` (neuf), `scripts/__tests__/release-publier-shell.test.mjs`
(neuf), `scripts/__tests__/vitrine.test.mjs`, `scripts/lib/release-publication.mjs` (neuf),
`scripts/lib/vitrine.mjs`, `scripts/test-convergence.mjs`, `scripts/vitrine.mjs`, `specs/PROJET.md`,
`specs/instructions/release-brouillon-jusqua-matrice-verte-cockpit.md` (neuf). Conforme à l'annonce des
annexes A/C — aucun fichier hors liste.

## 1. Byte-identité des 10 fichiers annoncés (Cockpit ↔ iakaFrameGUI)

`diff` sur chacun, dans les deux sens :

| Fichier | `diff` |
|---|---|
| `fixtures/convergence.sha256` | **vide** |
| `fixtures/bloc-latest.sha256` | **vide** |
| `scripts/test-convergence.mjs` | **vide** |
| `scripts/lib/vitrine.mjs` | **vide** |
| `scripts/vitrine.mjs` | **vide** |
| `scripts/__tests__/vitrine.test.mjs` | **vide** |
| `scripts/lib/release-publication.mjs` | **vide** |
| `scripts/__tests__/release-publication.test.mjs` | **vide** |
| `scripts/__tests__/release-publier-shell.test.mjs` | **vide** |
| `scripts/__tests__/forge-host-parity.test.mjs` | **vide** |

**10/10 byte-identiques.** `fixtures/freres.json` n'est **pas** dans cette liste (donnée locale par
nature — chaque dépôt y nomme *ses* voisins ; contenu différent constaté et légitime, cf. § 2).

`fixtures/convergence.sha256` : **29 entrées** de part et d'autre (`grep -cE '^[0-9a-f]{64}'`), fichier
lui-même byte-identique entre les deux dépôts (`diff` vide, ci-dessus). **Chaque empreinte re-calculée
contre le fichier réel de CE dépôt** (script `node` de vérification maison, indépendant du registre) :
**29/29 correctes** — 0 divergence, 0 fichier absent.

## 2. Face croisée (`npm run test:convergence`)

**Cockpit → GUI** :
```
IakaFrameGUI (/Users/sjupin/work/iakaFrameGUI) : mesure — 30 chemin(s) compare(s), 0 hors comparaison
iakaInstall (../iakaInstall) : SKIP NOMME — ne porte pas (encore) fixtures/convergence.sha256
test:convergence : OK — 1 frere(s) mesure(s) [iakaFrameGUI], 30 chemin(s) compare(s), 0 hors comparaison,
1 frere(s) nomme(s) SKIP [iakaInstall].
```
Exit `0`. Le `30` (et non `29`) est la troisième grandeur déjà documentée par le cadrage (M-C1) : le
script compare aussi le registre lui-même. `iakaInstall` est **nommé** dans `fixtures/freres.json` mais
absent (lot 2, pas encore joué) → **SKIP nommé, jamais un rouge, jamais un vert muet** — conforme à
AR-C2(a)/AR-C4(a).

**Contrefactuels joués sur copies isolées** (`scratchpad/cockpit-copy`, `scratchpad/gui-copy`,
`rsync` de `fixtures/`+`scripts/`+`specs/`, `diff -rq` initial vide) — **exécutés depuis le vrai
`scripts/test-convergence.mjs` de ce dépôt**, jamais un script réécrit pour l'occasion :

| Contrefactuel | Attendu | Obtenu |
|---|---|---|
| `freres.json` vidé (`{"freres":[]}`) | SKIP global, exit 0 | `SKIP : aucun frere declare…` — **exit 0** ✓ |
| Frère pointé vers un chemin inexistant | SKIP nommé, exit 0 | `SKIP GLOBAL : 2 frere(s) nomme(s), AUCUN present… iakaFrameGUI (../chemin-inexistant-xyz) : repertoire absent…` — **exit 0** ✓ |
| Octet muté dans `scripts/lib/vitrine.mjs` chez le frère (copie) | DIVERGENT, exit 1 | `scripts/lib/vitrine.mjs : DIVERGENT (34380 o ici, 34408 o chez le frere)` — **exit 1** ✓ |
| `IAKA_CONVERGENCE_HOME` sur un répertoire sans registre | exit 2, aucun repli | `IAKA_CONVERGENCE_HOME pointe « … », qui ne porte pas fixtures/convergence.sha256… Chemin autoritaire : aucun repli` — **exit 2** ✓ |

Les 4 contrefactuels **révoqués** après mesure (`diff` de la copie mutée contre sa sauvegarde : vide).
`grep -n readdirSync scripts/test-convergence.mjs` → **une seule occurrence, dans un commentaire qui
décrit l'ANCIENNE version** (`// … RÉSOLVAIT le frère par ÉNUMÉRATION (readdirSync …`) — **aucune
énumération de voisin dans le code exécutable** (CA-D1 satisfait).

Rejoué également **dans le sens GUI → Cockpit** (voir rapport GUI) : mêmes verdicts, mêmes codes.

## 3. `release.yml` — convention entière transposée d'`iakaInstall`

Grep ciblé + lecture directe des jobs :

- `releaseDraft: true` posé **une fois** (l. 184) ; **aucun** `tagName`/`releaseName` sous le `with:` du
  job `build` — remplacés par `releaseId: ${{ needs.prepare.outputs.release_id }}` (l. 178).
- `prepare` crée le brouillon **une seule fois** par `gh api … -F draft=true` (l. 100), exporte l'id.
- `publier:` → `needs: [build]`, **sans aucun `if:`** (l. 221-222) — strict, conforme CA-A2.
- `latest:` → `needs: publier` **avec `if: always()` conservé** (l. 338-343) — conforme CA-A3.
- `grep -n "gh api.*--jq.*--arg"` → **vide** — aucune occurrence du motif fautif du run `34026373514`
  (CA-A4).
- Gardes dédiées rejouées **individuellement** :
  - `scripts/__tests__/release-publication.test.mjs` (garde statique) : **18/18 verts**, dont le
    témoin positif (« le workflow réel, NON MUTÉ, passe la garde ») et les contrefactuels CA-R1
    (`releaseDraft:false` sur copie ⇒ rouge nommé), CA-R2 (i/ii/iii, `needs`/`if`/suppression du job
    ⇒ rouge nommé), CA-R3 (`latest` en `needs: build` ⇒ rouge nommé), CA-R10 (réintroduction du motif
    `--jq --arg` sur copie ⇒ détecté).
  - `scripts/__tests__/release-publier-shell.test.mjs` (jambe d'exécution, faux `gh` à l'arité du
    vrai + vrai `jq`) : **6/6 verts**, dont le contrefactuel qui **rejoue le texte D'AVANT le
    correctif** et **rougit sur `accepts 1 arg(s)`** — preuve que la jambe mord réellement, pas un
    théâtre.

**Diff `release.yml` Cockpit ↔ `iakaInstall`** : structurellement différent (deux conventions de
matrice distinctes avant/après ce lot ; iakaInstall garde son ossature propre), mais **les points
exigés par AR-C6(a) sont ceux-là mêmes qui ont été transposés** — confirmé ligne à ligne ci-dessus,
pas par un `diff` de fichier entier qui n'aurait aucun sens ici (les deux fichiers ne partagent pas
la même structure de base, seule la **convention** de publication est copiée).

**Diff `release.yml` Cockpit ↔ GUI** : deux divergences, **toutes deux préexistantes, déclarées, non
touchées « en passant »** — conforme à l'instruction A.4 étape 2 :
- dépendances Linux : Cockpit porte `libasound2-dev cmake pkg-config` en plus (ligne des dépendances
  `apt-get`) — écart déjà connu (M-R6 / `CONVERGENCE-RELEASE-YML-ALIGNEMENT`).
- commentaire minisign : formulation différente entre les deux dépôts (fond identique).
- Le reste des différences textuelles n'est que le nom du dépôt dans les commentaires
  (`RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-COCKPIT` vs `…-GUI`) — légitime et attendu.

**Cliquet `fixtures/bloc-latest.sha256`** : refixé, motif **daté** (2026-09-08), **anciennes valeurs
conservées** (2026-08-30, 2026-09-01→2026-09-08). Empreinte recalculée indépendamment avec
`scripts/lib/bloc-latest.mjs` (`node -e "import(...).then(m=>console.log(m.empreinte(m.lireBloc('.'))))"`) :
`55b39b01dfe655c28f24f678481a050f75fca16e5e347f54a2b74f071502eaf7`, **identique à la valeur du
fichier ET identique entre les deux dépôts** (recalculée aussi côté GUI, même valeur).

## 4. `rendreSecurite` — remontée depuis `iakaInstall`

`fixtures/vitrine-locale.json` porte `absences_de_signature` (2 entrées : `macos-notarisation`,
`windows-signature`), chacune avec `motif`, `depuis` (date), `condition_de_levee`, `procedure`. Le
motif dit explicitement une mesure **« STRUCTURELLE »** — sur `release.yml` (aucun secret
`APPLE_*`/`WINDOWS_*` câblé) et `tauri.conf.json` (aucune section `bundle.macOS`/`bundle.windows`) —
**distincte** de la mesure réelle (`codesign`/`spctl` sur un `.dmg` téléchargé) faite chez
`iakaInstall`, et le dit noir sur blanc. Conforme à l'énoncé de la mission.

README régénéré identique à la régénération : `npm run vitrine:check` → `0`
(`vitrine : OK — README aligne sur v0.33.0 (3 zone(s))`).

**Cliquet offline** (`scripts/__tests__/vitrine.test.mjs`, section `AR-C5 — le CLIQUET OFFLINE`)
rejoué individuellement : témoin positif (le `release.yml` réel ne câble rien) **vert** ; contrefactuel
macOS (`APPLE_CERTIFICATE` câblé sur copie) **rouge nommé** ; contrefactuel Windows
(`WINDOWS_CERTIFICATE` câblé sur copie) **rouge nommé** — les deux **verts en tant que tests**
(c'est-à-dire que l'assertion du rougissement attendu est satisfaite).

## 5. Documentation

- `CLAUDE.md` § Backlog : entrée `CONVERGENCE-TROIS-FRERES (lot 1)` complète, chiffres cités
  (`1063 passed`, `346 passed`, `test:convergence` cité verbatim) — **identiques à mes propres
  mesures**, rien de recopié sans re-vérification.
- Successeurs nommés présents : **lot 2 `iakaInstall`** (« hors périmètre de cette session, canal
  d'écriture borné CA-R11 ») et **`CONVERGENCE-RELEASE-YML-ALIGNEMENT`** (« les deux `release.yml`
  divergent déjà, l. 72 et l. 96-99 — pas touché en passant »). Les deux présents mot pour mot.
- `specs/PROJET.md` : entrée datée 2026-09-08 sur la convergence à trois (intersection, pas égalité).
- `specs/instructions/release-brouillon-jusqua-matrice-verte-cockpit.md` porte en tête le cartouche
  exact : *« Déposée par 🔷 Odin depuis `iakaInstall` (canal d'écriture d'un agent d'iakaInstall
  borné à ce dépôt, CA-R11) […] Jouée le 2026-09-08 par ⚒️ Gimli (posture portefeuille) […] REMISE
  AU GATE 🏹 Legolas, non auto-validée. »* — conforme.

## 6. `.claude/settings.local.json`

Fichier **tracké** (préexistant depuis `74cc99a`/`49e5271`, avant ce lot), mais
**`git diff --stat main..HEAD -- .claude/settings.local.json` est vide** : **ce lot ne l'a ni créé,
ni modifié, ni commité**. Le fait qu'il soit déjà versionné sur `main` est antérieur et hors du
périmètre de ce gate — signalé, pas un défaut de ce lot.

## Contrefactuels — synthèse
8 contrefactuels joués au total pour ce dépôt (4 sur la face croisée `test:convergence`, 2 sur le
cliquet offline de sécurité, plus les contrefactuels internes des suites `release-publication.test.mjs`
(6) et `release-publier-shell.test.mjs` (1) déjà comptés dans les 1063 tests verts). Tous révoqués,
tous nommés, aucun témoin vide détecté (les tests positifs — témoin réel non muté — sont présents et
verts à côté de chaque contrefactuel).

## Écarts relevés (non bloquants)
- Le compte `30 chemins comparés` (face croisée) diffère du compte `29 entrées` (registre) : différence
  **documentée et attendue** (le script compare aussi le registre lui-même), pas un défaut.
- Le libellé exact « run de preuve = prochain tag » n'est pas répété mot pour mot dans `CLAUDE.md`
  (il vit dans l'instruction déposée, CA-A8) — l'information est présente ailleurs dans le backlog
  (« casser réservé au décideur pour le run de preuve »), jugé suffisant, non bloquant.

## Ce qui reste au décideur
- **Run de preuve** (CA-A8/CA-A9) : le prochain tag réel de `IakaCockpit`, avec un run nominal 4/4
  vert (`isDraft:false`, assets complets, `latest` = ce tag) et, séparément, un run saboté
  (`workflow_dispatch` + `casser`) prouvant que la release reste en brouillon. **Acte de release,
  refusé aux agents.**
- Poser les secrets Apple/Windows si la levée des `absences_de_signature` est un jour décidée.
- Trancher/traiter `CONVERGENCE-RELEASE-YML-ALIGNEMENT` (aligner ou non les deux `release.yml`).
- Jouer le **lot 2** (`iakaInstall`), hors périmètre de ce gate.

[PORTEFEUILLE][Legolas] 🔴
