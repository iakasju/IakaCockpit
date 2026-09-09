<!-- Gate qualité Legolas — dépôt IakaCockpit — 2026-09-09 -->
# Gate qualité — CONVERGENCE-RELEASE-YML-ALIGNEMENT

**Branche** : `feat/convergence-release-yml-alignement` — **Cockpit** `1a9b45e` (1 commit sur `main`),
**GUI** `92f133d` (1 commit sur `main`). Instruction unique :
`IakaCockpit/specs/instructions/convergence-release-yml-alignement.md` (§ 3 AR-Y1..Y6, § 8 CA-Y1..Y13).

## Verdict transverse : **PASS**

Toutes les mesures ci-dessous ont été **rejouées par ce gate**, dans un contexte séparé de
l'exécution (aucun chiffre repris de Gimli/CLAUDE.md sans re-mesure). `main` intact dans les deux
dépôts (`main = origin/main = github/main`), un seul commit logique par branche, 0 écart de
convergence entre les deux sœurs. Un écart **préexistant et hors périmètre** avec `iakaInstall`
(lecture seule) est confirmé et déclaré, pas jugé. Le seul point qui reste dû au décideur — le run
de preuve AR-Y6 (CA-Y13) — est **non couvert par construction**, comme prévu par l'instruction, et
n'entache pas le verdict.

## Tableau CA-Y1 .. CA-Y13

| Critère | Mesure rejouée par ce gate | Verdict |
|---|---|---|
| **CA-Y1** | `diff -u release.yml release.yml` (Cockpit↔GUI) → **vide**. `shasum -a 256` identique des deux côtés : `a394663e40ad9fdefdb04c6ce4d73d58c95bffd2a71a4272d4235e7dc9f7348d` (426 lignes chacun). **Contrefactuel rejoué** (copie isolée hors dépôt, `name: release` → `name: release-mutation-test`) : `test:convergence` nomme `.github/workflows/release.yml : DIVERGENT (26975 o ici, 26961 o chez le frere)`, exit 1. Dépôts réels non touchés (vérifié : empreinte inchangée, `git status` propre). | **PASS** |
| **CA-Y2** | `grep -n "apt-get install"` sur les deux `release.yml` : **une seule occurrence**, ligne 123, `xargs -r -a .github/deps-linux.txt sudo apt-get install -y` — aucun nom de paquet en dur. Garde `deps-linux.test.mjs` (i) : témoin positif vert + contrefactuel `libfoo-inexistant-fantome-dev` détecté et **nommé**, verrou anti-témoin-vide vérifié (le nom fictif n'est pas déjà présent dans les deux `deps-linux.txt` réels). | **PASS** |
| **CA-Y3** | Jambe d'exécution étendue (`release-publier-shell.test.mjs`) rejouée dans les deux dépôts : **6 passed \| 3 skipped (9)** — les 3 skips sont le test Linux GNU (xargs BSD sur ce Mac, `xargsGnuOk()` a rendu `false`, SKIP **nommé** dans le libellé du describe, jamais un vert muet). Nominal (N réels passés dans l'ordre) et les deux contrefactuels (paquet ajouté ⇒ N+1 ; fichier vide ⇒ `apt-get install` jamais appelé) sont câblés mais **non exécutés sur ce poste** — SKIP structurel R-2, pas un défaut. **Docker indisponible sur ce poste** (daemon non lancé, `docker ps` échoue) : le rejeu en conteneur `ubuntu:22.04` demandé par ma mission est **déclaré non rejoué**, pas simulé. | **PASS (SKIP macOS nommé, non rejoué en conteneur — déclaré)** |
| **CA-Y4** | Cockpit `.github/deps-linux.txt` = **8** paquets (5 communs Tauri + `libasound2-dev`/`cmake`/`pkg-config`) ; GUI = **5**. Justification vérifiée contre les `Cargo.toml` réels : `IakaCockpit/src-tauri/Cargo.toml:45-46` porte `cpal = "0.15"` et `whisper-rs = "0.12"`, **absents** de `iakaFrameGUI/src-tauri/Cargo.toml` (grep vide). Critère par lecture, limite déclarée dans le fichier de garde. | **PASS** |
| **CA-Y5** | `grep` littéral de `.github/deps-linux.txt` dans les deux `fixtures/convergence.sha256` : **0 occurrence** comme fichier gardé (seulement des mentions en commentaire). `estInscritAuRegistre` testé positif+contrefactuel dans `deps-linux.test.mjs`. | **PASS** |
| **CA-Y6** | `grep -c '^[0-9a-f]{64}'` : **32** de part et d'autre. `diff` des deux registres : **vide**. Empreintes **recalculées contre les fichiers réels** avec la commande canonique en tête du registre (script Node exécuté) : **identiques à l'octet** dans les deux dépôts (aucune empreinte recopiée). `forge-host-parity.test.mjs` rejoué individuellement : **8/8**, plancher `toBeGreaterThanOrEqual(32)` motivé dans un commentaire daté qui déclare aussi l'écart `iakaInstall`. | **PASS** |
| **CA-Y7** | Empreinte du bloc `latest:` recalculée (`bloc-latest.mjs`) : `55b39b01dfe655c28f24f678481a050f75fca16e5e347f54a2b74f071502eaf7`, **identique** à la valeur témoin de l'étape 0 du cadrage, dans les **deux** dépôts. `git diff main..HEAD -- fixtures/bloc-latest.sha256` : seul le cartouche daté a bougé, **aucune ligne d'empreinte**. | **PASS** |
| **CA-Y8** | `release-publication.test.mjs` rejoué individuellement dans les deux dépôts : **18/18**. | **PASS** |
| **CA-Y9** | `grep -rn "l\. 72\|l\. 96-99"` sur les deux dépôts : toutes les occurrences vivent soit dans des instructions/gates **antérieurs** au lot (non réécrits, hors périmètre), soit précédées d'un bloc `RECTIFICATION DATEE (2026-09-08…)` qui déclare explicitement les anciennes lignes **fausses et conservées comme trace historique** (`fixtures/convergence.sha256:45-52`, `:108-115`, `fixtures/bloc-latest.sha256:13-20`) — jamais présentées comme état actuel. | **PASS** |
| **CA-Y10** | Successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES` **inscrit** dans les deux `CLAUDE.md` (Cockpit et GUI), avec sa condition d'entrée écrite et le run de preuve nommé avec `--repo <owner>/<Depot>` et **remote `github`** explicitement cité. ⚠️ **Écart déclaré, pas un défaut d'exécution** : l'instruction d'origine (§ 4, geste 6) demandait l'inscription dans les **trois** `CLAUDE.md`, `iakaInstall` compris. L'ordre de mission portefeuille imposant `iakaInstall` **lecture seule** prime sur l'instruction, et l'omission est **signalée explicitement** dans les deux `CLAUDE.md` (« `iakaInstall` non touché… l'écriture y est omise délibérément »). Contrainte de plus haut rang correctement respectée et documentée. | **PASS (avec écart déclaré et justifié, non imputable à l'exécution)** |
| **CA-Y11** | `git diff --stat main..HEAD -- '*.rs' scripts/test-convergence.mjs package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock` : **vide** dans les deux dépôts. | **PASS** |
| **CA-Y12** | Chaîne rejouée **par ce gate**, une commande par ligne : voir tableau qualité ci-dessous. | **PASS** |
| **CA-Y13** | `apt-get` réel non prouvé, run de preuve `AR-Y6` **non joué** (acte du décideur, remote `github`), déclaré « non couvert par construction » dans les deux `CLAUDE.md`. Aucune fausse déclaration de couverture trouvée. | **NON MESURÉ, déclaré tel (conforme à l'instruction)** |

## Chaîne qualité — Cockpit

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run typecheck` | `0` | (aucune erreur tsc) |
| `npm run lint` | `0` | (aucune erreur eslint) |
| `npm run test` | `0` | `Test Files 104 passed (104)` / `Tests 1071 passed \| 3 skipped (1074)` |
| `npm run vitrine:check` | `0` | `vitrine : OK — README aligne sur v0.33.0 (3 zone(s)).` |
| `cargo fmt --check` (src-tauri) | `0` | (silencieux, conforme) |
| `cargo clippy --all-targets -- -D warnings` (src-tauri) | `0` | `Finished 'dev' profile [unoptimized + debuginfo] target(s)` |
| `cargo test` (src-tauri) | `0` | `test result: ok. 346 passed; 0 failed; 0 ignored` |
| `IAKA_CONVERGENCE_HOME=../iakaFrameGUI npm run test:convergence` | `0` | `OK — 1 frere(s) mesure(s) […], 32 chemin(s) compare(s), 0 hors comparaison, 0 frere(s) nomme(s) SKIP.` |
| `IAKA_CONVERGENCE_HOME=<worktree main iakaInstall> npm run test:convergence` | `1` | `1 ecart(s) — scripts/__tests__/release-publier-shell.test.mjs : DIVERGENT (26505 o ici, 19925 o chez le frere)` — **déclaré, hors gate par construction, ne bloque pas** |

## Chaîne qualité — iakaFrameGUI

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` (typecheck + lint) | `0` | (aucune erreur) |
| `npm run test:all` | `0` | `Test Files 134 passed (134)` / `Tests 1371 passed \| 3 skipped (1374)` |
| `npm run vitrine:check` | `0` | `vitrine : OK — README aligne sur v0.1.8 (3 zone(s)).` |
| `npm run test:rust` (ligne distincte, D-5) | `0` | `test result: ok. 116 passed; 0 failed; 0 ignored` |
| `IAKA_CONVERGENCE_HOME=../IakaCockpit npm run test:convergence` | `0` | `OK — 1 frere(s) mesure(s) […], 32 chemin(s) compare(s), 0 hors comparaison, 0 frere(s) nomme(s) SKIP.` |

## Contrefactuels rejoués par ce gate

1. **CA-Y1** — mutation `name: release` → `name: release-mutation-test` sur une **copie isolée** hors dépôt (jamais le fichier réel) : `test:convergence` nomme `.github/workflows/release.yml : DIVERGENT`, exit 1. Copie détruite après usage, dépôt réel vérifié inchangé (empreinte `a394663e…348d` identique, `git status` propre).
2. **Bug `\s+` de `paquetsEnDurDansWorkflow`** — remplacement temporaire de `[ \t]*` par `\s*` dans `scripts/lib/deps-linux.mjs` (fichier réel, révoqué immédiatement après) : le témoin positif rougit exactement comme décrit (`expected [ 'uses:', 'actions/setup-node@v4' ] to deeply equal []`), reproduisant la capture de l'étape suivante. Révocation prouvée : `shasum -a 256` identique avant/après (`88b5dcd174a17a137d4d68b59b7391de1b4d944526ff8e5901ea3ec5c29cfb36`), suite revérifiée à 7/7.
3. **deps-linux.test.mjs (i/ii/iii)** — rejoués tels quels dans les deux dépôts (7/7 dans les deux), verrou anti-témoin-vide vérifié positif.

## Écarts constatés, non traités (hors périmètre de ce gate)

- **`iakaInstall`, écart daté sur `release-publier-shell.test.mjs`** : `26505` octets ici (Cockpit et GUI, identiques) contre `19925` octets sur `main` d'`iakaInstall` (commit `f743e8b`, vérifié via un `git worktree` détaché temporaire, jamais la branche `fix/deps-linux-et-jambe-etendue` d'un autre Gimli actif sur ce dépôt — worktree supprimé après mesure, branche de l'autre agent intacte). **Attribué et daté** dans les deux `CLAUDE.md`, successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES` nommé. Ce n'est **pas un défaut de ce lot** : c'est la conséquence mesurée de l'extension mandatée par l'instruction (§ 5 étape 3.3), sur un fichier auparavant partagé à trois. Je ne le juge pas — un autre Gimli le traite en parallèle sur `iakaInstall`.
- **CA-Y10** : successeur non inscrit dans `iakaInstall/CLAUDE.md` — cf. tableau ci-dessus, écart déclaré et justifié par une contrainte de plus haut rang (lecture seule imposée par l'ordre de mission portefeuille).
- **CA-Y13 / AR-Y6** : run de preuve réel (`workflow_dispatch platforms=linux` sur tag de test, remote `github`) **non joué** — acte de release réservé au décideur, explicitement hors mandat des agents.
- **Rejeu Docker de la jambe Linux** (ma mission, item 4) : Docker Desktop présent (`/usr/local/bin/docker`, version 29.2.1) mais **daemon non démarré** sur ce poste (`docker ps` → *"dial unix .../docker.sock: no such file or directory"*). **Déclaré non rejoué**, pas simulé.

## Ce qui reste au décideur

1. Le run de preuve AR-Y6 (dispatch `workflow_dispatch -f platforms=linux` sur un tag de test, remote `github`, pour Cockpit **et** GUI), puis le run nominal 4/4 au prochain vrai tag de chaque dépôt.
2. Le brouillon de release créé par le dispatch (sa suppression est un acte du décideur).
3. L'arbitrage sur le successeur `CONVERGENCE-RELEASE-YML-TROIS-FRERES` (ouverture après `UPDATER-DE-LA-FACADE`), et le traitement, sur `iakaInstall`, de l'écart daté sur `release-publier-shell.test.mjs` (déjà pris en charge par un autre Gimli sur sa branche `fix/deps-linux-et-jambe-etendue`, non lu en détail par ce gate — lecture seule limitée à `main`).

## Portée du verdict

Ce PASS **ouvre** l'étape suivante (stage) sans besoin d'humain (gate automatique dev→stage). Il ne
constitue pas une Revue Qualité de Version (RQV) — ce lot n'est pas une version mineure — et
n'autorise aucune bascule production (⛴️ Charon reste sur feu vert humain, hors du périmètre de ce
gate).
