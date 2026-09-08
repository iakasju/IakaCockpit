# Gate qualité transverse — CONVERGENCE-TROIS-FRERES (lot 2) + CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME

**Émetteur** : 🏹 Legolas — **Récepteur** : 🔷 Odin (ordre de mission portefeuille, 2026-09-08).

> **Rapport commun aux trois dépôts** (`iakaInstall`, `IakaCockpit`, `iakaFrameGUI`) — contenu
> identique dans les trois, seule cette cartouche locale change.

## Cartouche locale — `IakaCockpit`

- Branche vérifiée : `fix/convergence-registre-exclu`
- Commits couverts : `fab1746`, `84a9083`, `1090eba`, `4cf8493`
- HEAD au moment du gate : `4cf8493`
- Ce dépôt est une des deux applications sœurs, registre à 29 entrées.
- **Trace d'incident retrouvée sur `main`** (§ 8 du rapport) : commit direct sur `main` puis
  reset, le même jour, avant ce gate. État courant intact.

## Verdict transverse : PASS

## Verdict par dépôt

| Dépôt | Branche | Commits vérifiés | Verdict |
|---|---|---|---|
| `iakaInstall` | `feat/convergence-trois-freres-lot2` | `a3e8ab5`, `3763e92`, `3ef907f`, `3d5acc0` + `83166f8`, `f2b876f`, `4eea8ff`, `0f89526` | **PASS** |
| `IakaCockpit` | `fix/convergence-registre-exclu` | `fab1746`, `84a9083`, `1090eba`, `4cf8493` | **PASS** |
| `iakaFrameGUI` | `fix/convergence-registre-exclu` | `8c50fd9`, `61addb8`, `05df974`, `f33cf6a` | **PASS** |

## 1. Byte-identité du correctif

| Fichier | shasum -a 256 | Diffs deux à deux |
|---|---|---|
| `scripts/test-convergence.mjs` (les 3 dépôts) | `f93d5f0771ba8281388a6f00b63d8cd230e2717f36e0500d415f438f05dbab56` | vides |
| `scripts/__tests__/convergence-croisee.test.mjs` (les 3 dépôts) | `6cb323956e8d294ddebcffce42318cb6da19c4f60e300770e94647ba454ee29a` | vides |

Le shasum attendu (`f93d5f07…`) est confirmé sur les trois dépôts.

## 2. Le rouge → le vert

Le script `scripts/test-convergence.mjs` **n'existait pas sur `main` d'iakaInstall** (fichier introduit par le lot). Repris **chez la sœur** (`IakaCockpit`, worktree détaché sur `main` = `0ce1dc3`, script AVANT-correctif) et rejoué contre `iakaInstall` HEAD (registre 7 entrées, sous-ensemble strict) :

| État du script | Commande | Code | Résumé |
|---|---|---|---|
| AVANT correctif (`IakaCockpit@main`, `0ce1dc3`) | `IAKA_CONVERGENCE_HOME=/Users/sjupin/work/iakaInstall node scripts/test-convergence.mjs` | `1` | `2 ecart(s)` dont `fixtures/convergence.sha256 : DIVERGENT (9799 o ici, 4266 o chez le frere)` — exactement le défaut ciblé |
| CORRIGÉ (`IakaCockpit@HEAD`, `4cf8493`) | idem | `0` | `OK — 1 frere(s) mesure(s) …, 7 chemin(s) compare(s), 22 hors comparaison` + `fixtures/convergence.sha256 exclu de la comparaison par construction — instrument, pas objet` |

Rouge confirmé sur l'écart exact visé par le correctif ; vert confirmé après. Worktree nettoyé (`git worktree remove --force`), arbre `IakaCockpit` inchangé après coup.

## 3. Les six sens (`npm run test:convergence` par dépôt)

| Dépôt lanceur | Commande | Code | Résumé cité |
|---|---|---|---|
| `iakaInstall` | `npm run test:convergence` | `0` | `test:convergence : OK — 2 frere(s) mesure(s) [IakaCockpit, iakaFrameGUI], 14 chemin(s) compare(s), 0 hors comparaison, 0 frere(s) nomme(s) SKIP.` (registre exclu déclaré des deux côtés) |
| `IakaCockpit` | `npm run test:convergence` | `0` | `test:convergence : OK — 2 frere(s) mesure(s) [iakaFrameGUI, iakaInstall], 36 chemin(s) compare(s), 22 hors comparaison, 0 frere(s) nomme(s) SKIP.` |
| `iakaFrameGUI` | `npm run test:convergence` | `0` | `test:convergence : OK — 2 frere(s) mesure(s) [IakaCockpit, iakaInstall], 36 chemin(s) compare(s), 22 hors comparaison, 0 frere(s) nomme(s) SKIP.` |

0 écart dans les trois sens ; les chemins hors comparaison sont nommés (22 côté sœurs contre `iakaInstall`) ; `fixtures/convergence.sha256` explicitement exclu par construction dans les trois sorties.

## 4. Registres

- Comptes mesurés : `IakaCockpit` = **29** entrées, `iakaFrameGUI` = **29** entrées, `iakaInstall` = **7** entrées (conforme à l'attendu 29/29/7).
- Les 7 empreintes du registre `iakaInstall` **recalculées** (`shasum -a 256`) correspondent exactement aux 7 lignes déclarées dans `fixtures/convergence.sha256`.
- Les 7 fichiers du registre `iakaInstall` sont **byte-identiques** (`diff` vide) avec `IakaCockpit` ET `iakaFrameGUI`, un par un.
- `fixtures/tauri-action-pin.json` : présent dans les trois dépôts, **divergent** (`IakaCockpit`/`iakaFrameGUI` partagent `f4919781e7027b4c…`, `iakaInstall` porte `6632e70f1b126b6e…` — note de notarisation propre). Confirmé **exclu** du registre : mentionné seulement en commentaire (ligne 38), aucune ligne d'empreinte à son nom.
- `fixtures/freres.json` d'`iakaInstall` nomme les deux sœurs avec chemins **relatifs réels** (`../IakaCockpit`, `../iakaFrameGUI`), motif écrit pour chacune.

## 5. Lot 2 — cartouches rectifiés (iakaInstall)

`scripts/lib/vitrine.mjs`, `scripts/vitrine.mjs`, `scripts/__tests__/vitrine.test.mjs` portent chacun un bloc **« ⚠️ RECTIFICATION DATÉE (2026-09-08, CONVERGENCE-TROIS-FRERES, lot 2) »** qui : (a) reconnaît que la phrase originelle « `iakaInstall` N'ENTRE PAS a ce registre » est devenue fausse au sens absolu (le dépôt porte désormais son propre registre), (b) la maintient vraie **pour ce fichier précisément** (encore divergent, `diff` non vide mesuré), (c) conclut « on date, on n'efface pas ». Vérifié : les trois fichiers sont bien **divergents** avec les deux sœurs (`diff` non vide, mesuré).

## 6. Contrefactuels (copies isolées, hors arbres réels)

| Contrefactuel | Setup | Résultat | Code |
|---|---|---|---|
| Octet muté dans un fichier de l'intersection (`scripts/lib/pin-tauri-action.mjs`) | copie légère d'`iakaInstall` (rsync sans `node_modules`/`.git`/`src-tauri`, `node_modules` symlinké), 1 octet XOR, `IAKA_CONVERGENCE_HOME=IakaCockpit` | `1 ecart(s)` — `scripts/lib/pin-tauri-action.mjs : DIVERGENT (3035 o ici, 3035 o chez le frere)` | `1` |
| `freres.json` vidé (`{"freres":[]}`) | même copie | `SKIP : aucun frere declare dans fixtures/freres.json (tableau vide).` | `0` |
| Frère absent nommé (`FrereFantome` → répertoire inexistant, `IakaCockpit` présent via symlink réel) | copie + symlinks vers dépôts réels en position `../` | `IakaCockpit` mesuré (7 chemins, 0 écart) ; `FrereFantome (../ce-repertoire-n-existe-pas-du-tout) : SKIP NOMME` ; `OK — 1 frere(s) mesure(s) [IakaCockpit] … 1 frere(s) nomme(s) SKIP [FrereFantome]` | `0` |
| Ligne retirée du registre (`fixtures/vitrine-assets.json` supprimée de `convergence.sha256`, 7→6 entrées) | copie légère + `npx vitest run scripts/__tests__/convergence-locale.test.mjs` | `FAIL` — `CA-C6 — le cliquet de complétude ne descend que sur décision (≥ 7 entrées)` : `AssertionError: … expected 6 to be greater than or equal to 7` | test rouge (1 failed / 1 passed) |

Les 4 contrefactuels se comportent comme attendu (la face n'est pas aveugle). Aucune fuite dans les arbres réels (`git status --short` vide sur les trois dépôts après nettoyage des copies scratch).

## 7. Chaîne qualité par dépôt

| Dépôt | Commande | Code | Résumé cité |
|---|---|---|---|
| `iakaInstall` | `npm run typecheck` | `0` | (silencieux, `tsc --noEmit` sans sortie) |
| `iakaInstall` | `npm run lint` | `0` | (silencieux, `eslint .` sans sortie) |
| `iakaInstall` | `npm run test` | `0` | `Test Files 24 passed (24)` / `Tests 158 passed (158)` |
| `iakaInstall` | `npm run build` | `0` | `✓ built in 325ms` |
| `IakaCockpit` | `npm run typecheck` | `0` | (silencieux) |
| `IakaCockpit` | `npm run lint` | `0` | (silencieux) |
| `IakaCockpit` | `npm run test` | `0` | `Test Files 103 passed (103)` / `Tests 1064 passed (1064)` |
| `iakaFrameGUI` | `npm run lint:all` (typecheck + lint) | `0` | (silencieux) |
| `iakaFrameGUI` | `npm run test` | `0` | `Test Files 133 passed (133)` / `Tests 1364 passed (1364)` |

Comptes conformes aux attendus (1064 / 1364 / 158).

**Cargo** : `git diff --stat` sur les commits du correctif dans les trois dépôts (`3d5acc0~1..0f89526` côté `iakaInstall` élargi à `a3e8ab5~1..0f89526` ; `fab1746~1..4cf8493` côté `IakaCockpit` ; `8c50fd9~1..f33cf6a` côté `iakaFrameGUI`) : **aucun fichier `.rs` modifié** dans les trois cas — `cargo test` non nécessaire à ce gate.

## 8. `main` intact

| Dépôt | `main` local | `origin/main` | `git log origin/main..main` | Constat |
|---|---|---|---|---|
| `iakaInstall` | `53f9b64` | `53f9b64` | vide | intact |
| `IakaCockpit` | `0ce1dc3` | `0ce1dc3` | vide | intact **aujourd'hui**, mais trace d'incident retrouvée (voir ci-dessous) |
| `iakaFrameGUI` | `ec290ec` | `ec290ec` | vide | intact, aucune trace de reset dans le reflog |

**Trace de l'incident Gimli sur `IakaCockpit/main`** — confirmée dans le reflog :
```
0ce1dc3 main@{2026-09-08 09:59:48 +0200}: branch: Reset to 0ce1dc3
fab1746 main@{2026-09-08 09:56:20 +0200}: commit: test(convergence): frere au registre sous-ensemble strict est ROUGE (registre compare a tort)
0ce1dc3 main@{2026-09-08 09:33:50 +0200}: commit: chore(iakaframe): update etat des lieux + commit global (pause)
```
Le commit `fab1746` (destiné à `fix/convergence-registre-exclu`) a été posé directement sur `main` à 09:56:20, puis `main` a été ramené à `0ce1dc3` par reset à 09:59:48 — le même jour, avant toute mesure de ce gate. L'état courant est propre (`main` == `origin/main`, aucun commit orphelin), mais la trace **existe** dans le reflog local et n'est pas anodine : un `push --force` ou un reflog expiré ailleurs l'effacerait. À signaler au décideur, pas un blocant du gate lui-même (rien à corriger dans l'arbre courant).

## 9. Docs

- Successeur `CONVERGENCE-REGISTRE-EXCLU-DE-LUI-MEME` soldé et daté (2026-09-08) dans les trois `CLAUDE.md` (`iakaInstall:364`, `IakaCockpit:431`, `iakaFrameGUI:470`).
- `iakaInstall/specs/PROJET.md` § `CONVERGENCE-TROIS-FRERES — LOT 2 (2026-09-08)` consigne le lot, le défaut découvert et son successeur nommé. Le compte de tests y est cité à **157** (avant correctif) ; la suite actuelle (après correctif, +1 test rouge-d'abord `83166f8`) rend **158** — cohérent, pas une divergence à traiter.

## Écarts constatés (aucun bloquant pour ce gate)

Aucun écart bloquant. Toutes les mesures ci-dessus sont vertes.

## Ce qui reste au décideur

1. **Tags de preuve des sœurs** — `IakaCockpit/package.json` annonce `0.33.0` (scellé selon le reflog : `docs(version): scelle v0.33.0`) mais le tag git **`v0.33.0` n'existe pas** (dernier tag réel : `v0.32.2`). `iakaFrameGUI` (`v0.1.8` = tag et version, cohérent) et `iakaInstall` (`v0.1.2` = tag et version, cohérent) n'ont pas cet écart. Décision à prendre : poser le tag manquant ou consigner pourquoi il ne l'est pas.
2. **`CONVERGENCE-RELEASE-YML-ALIGNEMENT`** — successeur nommé, non traité par ce lot (déclaré dans les trois `CLAUDE.md` : `iakaInstall:524`, `IakaCockpit:427/550`, `iakaFrameGUI:466/600`) : les `release.yml` d'`IakaCockpit` et `iakaFrameGUI` divergent encore. Hors périmètre de ce gate, à planifier.
3. **Bloc contrefactuel de `vitrine-en-ligne.test.mjs`** — `iakaInstall` porte 18 tests contre 16 chez chaque sœur ; l'écart est le bloc `describe("Contrefactuel — un SKIP travesti en succès…")` (2 `it`), ajouté sur exigence explicite d'Aragorn (2026-09-08), **absent des deux sœurs**, nommé « candidat à remonter chez les sœurs » (`iakaInstall/CLAUDE.md:412-418`). Non remonté à ce jour — décision à prendre sur le calendrier de propagation.
4. **Trace de l'incident `main` sur `IakaCockpit`** (§ 8 ci-dessus) — état courant propre, mais la trace du commit direct sur `main` puis reset mérite d'être connue du décideur (hygiène de process, pas un défaut de code).

