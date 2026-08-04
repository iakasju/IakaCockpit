# Instruction : L33 — Stabiliser le flake `tail_file_*` (harnais de test calé sur l'horloge murale)

> Rédigé par 🧙 Gandalf (P1 — cadrage), 2026-07-29. Consommé par ⚒️ Gimli (P2), gate 🏹 Legolas (P3).
> Doc en français, code et identifiants en anglais.
>
> **Nature du lot** : lot **COURT**, **purement local** (aucune dépendance au LAN iakabox, injoignable
> ce jour). Il ne livre **aucune fonctionnalité** : il **rend au dépôt son filet de non-régression**.
> Il ne touche **que** le module `#[cfg(test)] mod tests` de `src-tauri/src/transcript.rs`
> (`transcript.rs:545`) — **aucune ligne de code de production**.

---

## ⚠️ Amendement du 2026-08-03 (🧙 Gandalf) — état réel du lot, à lire AVANT le reste

Ce cadrage a été **consommé** : le lot est **implémenté** (branche `feat/L33-flake-tail-file`,
2026-07-30) et **remis au gate 🏹 Legolas**, non auto-validé. L'instruction ci-dessous est donc
**historique** — elle n'est plus à exécuter. Vérifié en lecture de code le 2026-08-03 :
`wait_until` / `WAIT_DEADLINE` / `POLL_STEP` / `LINE_GRACE` (`transcript.rs:921-946`), harnais
`run_tail_collect_ext` avec condition de fin `done` (`:962-1009`), harnais négatif dédié
`run_tail_abandon` sur `JoinHandle::is_finished` (`:1022-1058`), et les 4 tests appelants
(`:1061`, `:1097`, `:1125`, `:1147`) portant chacun sa condition de fin. **Toute demande de
re-cadrage du même besoin est un doublon** : le besoin est couvert.

**Trois rectifications de fond apportées par ce même amendement :**

**A1 — La cause racine énoncée au § Problème était INCOMPLÈTE.** Le cadrage n'avait retenu que le
calage sur l'horloge murale. L'exécution rapporte une seconde cause, **dominante** : le transcript
de test vivait directement sous `$TMPDIR`, si bien que le filet `resolve_transcript` balayait le
**répertoire temporaire du système** à chaque pas d'attente — **57 819 entrées, 5,3 à 6,5 s par
tour** sur ce poste, là où la production balaye `~/.claude/projects/` (quelques dizaines
d'entrées). Le harnais faisait donc payer au tailer un coût que la production ne paie **jamais**.
La correction associée (arène dédiée reproduisant `<racine>/projects/<escaped>/<sid>.jsonl`) est
en place et documentée dans le code (`transcript.rs:879-908`). *Fait rapporté par l'exécution,
consigné ici tel quel — non re-mesuré par le cadrage, qui travaille en lecture seule.*

**A2 — Le critère C3 de ce document était INOPPOSABLE (corrigé ci-dessous).** La commande écrite
sélectionnait **0 test** et **verdissait à vide**. Cause vérifiée sur pièce : `--exact` exige le
nom **pleinement qualifié**, or les tests vivent dans `mod tests` du module `transcript`
(`lib.rs:31` `pub mod transcript;`, crate lib `app_lib` — `Cargo.toml:9-13`). Le préfixe
`transcript::tests::` est donc **obligatoire**. Corrigé à l'étape 14 et au critère C3. **Un gate
rendu sur l'ancienne commande serait sans valeur** — non pas faute de citer sa commande, mais
parce que la commande citée ne mesure rien.

**A3 — Ce qui reste dû au gate.** Les campagnes C1–C5 rapportées par l'exécution (C1 20/20,
C2 10/10, C3 50/50 avec le nom qualifié, C4 20/20 sous charge, C5 `quality.sh` exit 0 ×2) sont
des **déclarations d'exécutant** : elles doivent être **rejouées ou contre-vérifiées** par
🏹 Legolas, commandes et sorties citées, avant tout verdict. Le contrefactuel (phase C) est le
point à ne pas relâcher : c'est lui, et non les campagnes, qui prouve que les tests **mesurent
encore quelque chose**.

---

## Problème

Quatre tests de `src-tauri/src/transcript.rs` échouent **par intermittence**, ce qui rend
`bash scripts/quality.sh` rouge (exit 101) **la plupart du temps**. Le filet de non-régression du
dépôt ne vaut donc plus rien : le prochain lot qui touchera réellement `src-tauri/` verra rouge
**sans pouvoir dire si c'est lui**. C'est ce qui a fait échouer le gate de L32 alors que L32 était
innocent — la branche L32 ne modifie **aucun octet** de `src/` ni `src-tauri/`.

### Le fait, mesuré au gate 🏹 Legolas du 2026-07-29 — **à ne PAS re-mesurer**

| Constat | Mesure |
|---|---|
| Tests concernés | `tail_file_emet_les_events_dun_fichier_qui_grossit_en_direct` (`src-tauri/src/transcript.rs:946`), `tail_file_attend_un_transcript_qui_apparait_tard_et_l_emet` (`:974`), `tail_file_avec_plafond_court_abandonne_avant_l_apparition_du_fichier` (`:994`), `tail_file_voit_les_appends_apres_un_premier_eof` (`:1012`) |
| Taux de vert | **~12 %** — sur **8 passes** de `cargo test`, **7 rouges** (exit 101), **1 verte** |
| Plancher observé | **335/337** (pas 336/337 : plusieurs tests tombent ensemble) |
| **En isolement complet** | `..._apparait_tard_...` seul (`--exact`, `336 filtered out`) → **2 échecs sur 5** |
| **Séquentiel** | `cargo test -- --test-threads=1` → **3 échecs**. Ce n'est donc **PAS** de la contention entre tests |
| Signature temporelle | runs **verts** 1,15–1,24 s · runs **rouges** 2,43–3,20 s |
| Symptôme typique | `panicked at … un transcript apparu TARD doit quand même être tailé (fix recette muet) : []` |
| Antériorité | **pré-existant, prouvé** : dernier commit touchant `src-tauri/` = `922f2e9` du 2026-07-14 |

### Cause mécanique — identifiée, et elle est dans le **harnais**, pas dans la production

`run_tail_collect_ext` (`src-tauri/src/transcript.rs:900-938`) est **entièrement calé sur l'horloge
murale**, face à un tailer qui poll toutes les **150 ms** (`POLL_INTERVAL`, `transcript.rs:357`) :

```rust
std::thread::sleep(create_delay);          // :921  — le fichier apparaît « tard »
…
std::thread::sleep(Duration::from_millis(40));   // :928  — entre deux appends
…
std::thread::sleep(Duration::from_millis(400));  // :931  — puis on ARRÊTE le tailer
stop.store(true, Ordering::Relaxed);             // :932
```

**Le signal d'arrêt tombe sur un délai deviné.** Dès que la latence FS ou l'ordonnancement dépasse la
marge (400 ms pour un tailer qui dort par pas de 150 ms), le tailer est stoppé **avant d'avoir émis**
et le vecteur collecté est **vide** (`[]`). Aucun rendez-vous, aucune condition d'attente : le test
mesure la charge de la machine autant que le comportement du tailer.

Trois conséquences précises, à traiter chacune pour elle-même :

1. **Arrêt prématuré** (3 tests positifs, `:946` `:974` `:1012`) — `sleep(400ms)` puis `stop` : sous
   charge, on coupe avant l'émission.
2. **Séquencement non garanti** (`:1012`, « appends après un premier EOF ») — les lignes sont écrites
   à **40 ms** d'intervalle contre un poll de **150 ms** : rien ne garantit que le tailer ait
   **atteint l'EOF** entre la 1ʳᵉ et la 2ᵉ ligne. Le test **croit** vérifier la mécanique « held fd »
   ; en réalité, le plus souvent, il lit deux lignes déjà présentes. **Défaut de validité, pas
   seulement de stabilité.**
3. **Course inversée** (`:994`, le test **négatif** `evs.is_empty()`) — le tailer est censé
   **abandonner** (plafond 200 ms) **avant** que le fichier n'apparaisse (700 ms). Si le thread est
   ordonnancé tard (> 700 ms), il trouve le fichier **déjà là**, l'émet, et l'assertion « vide »
   tombe. C'est le seul test dont un **retard** provoque un **faux échec par excès d'émission**.

---

## Décision retenue

**Remplacer chaque délai deviné par un rendez-vous explicite sur une condition observable**, avec un
plafond **généreux** (le prix du plafond n'est payé qu'en cas d'échec). C'est le geste standard de
dé-flakage : *« replace sleep statements with wait-for statements that wait for a certain condition
to become true, up to a timeout »* — le plafond peut être **beaucoup plus haut** que l'ancien sleep,
puisqu'on ne l'attend pas (cf. § Sources).

**On ne touche pas au comportement de production de `tail_file` / `tail_resolved`.** Le défaut est
dans le harnais ; la production est le **témoin**. Si l'exécution devait modifier autre chose que le
module de test, **c'est un signal à remonter à Stéphane, pas à absorber** (cf. R3).

### D1 — Un seul primitif d'attente, en `std`, sans nouvelle dépendance

Un helper unique dans le module de test :

```rust
/// Poll `pred` jusqu'à ce qu'elle soit vraie, ou jusqu'à `deadline`. Rend `true` si la
/// condition a été atteinte. Ne bloque jamais indéfiniment.
fn wait_until(deadline: Duration, mut pred: impl FnMut() -> bool) -> bool
```

- pas de tierce partie (**MVP, réutiliser l'existant**) ; `Condvar` serait plus élégant mais
  imposerait de **modifier la production** (signaler depuis `emit`) — **refusé** ;
- pas de crate d'attente : `std::thread::sleep` par pas **court** (≤ 20 ms) suffit ici, et ce sleep-là
  est **légitime** : c'est un **pas de poll**, pas un **délai deviné** ;
- **la prédicate ne doit jamais tenir le `Mutex` pendant le sommeil** : évaluer, relâcher, dormir.

Les trois usages du helper couvrent les trois défauts ci-dessus, et **rien de plus** :

| Usage | Sur quoi on attend | Remplace |
|---|---|---|
| **U1 — arrêt** | la condition **attendue par l'assertion** est satisfaite dans `collected` | `sleep(400ms)` puis `stop` |
| **U2 — séquencement** | la ligne *i* a été **observée** dans `collected` avant d'écrire la ligne *i+1* | `sleep(40ms)` entre appends |
| **U3 — abandon** | le **thread du tailer s'est terminé de lui-même** (`JoinHandle::is_finished`) | l'ordre « écrire puis join » du test négatif |

`JoinHandle::is_finished` est **stable depuis Rust 1.61** ; la MSRV du projet est **1.77.2**
(`src-tauri/Cargo.toml:7`) → disponible, sans `unsafe`, sans dépendance (cf. § Sources).

### D2 — La condition d'arrêt est **la même** que l'assertion

`run_tail_collect_ext` reçoit une **condition de fin** (`done: impl Fn(&[RunnerEvent]) -> bool`)
fournie par le test appelant, et **arrête le tailer dès qu'elle est vraie** — ou à l'expiration du
plafond, auquel cas **le test échoue sur sa propre assertion**, avec le contenu réellement collecté
en message d'erreur (diagnostic honnête : `[]` restera lisible comme « rien n'est venu »).

> **Pourquoi la même condition.** Attendre autre chose que ce qu'on assert, c'est réintroduire un
> pari. Si `done` et l'assertion divergent, le test redevient temporel.

**Corollaire à ne pas contourner** : un test qui échouait *pour de vrai* échoue toujours — il paie
seulement le plafond avant de le dire. C'est le prix correct.

### D3 — Le test négatif (`:994`) est rendu déterministe par **inversion de l'ordre**

Aujourd'hui : on crée le fichier à 700 ms puis on join. Demain : on **attend la terminaison spontanée
du thread** (U3 — le tailer doit abandonner tout seul, plafond 200 ms), **puis** on crée le fichier,
**puis** on assert `evs.is_empty()`. Le thread est mort : plus aucune émission n'est possible, la
course n'existe plus.

- Si le thread **ne se termine pas** dans le plafond généreux → **échec explicite** (« le tailer n'a
  pas abandonné »), **jamais un blocage** : on positionne `stop` et on `join` avant de paniquer.
- La sémantique du test est **préservée** : « avec un plafond plus court que le délai d'apparition, le
  tailer abandonne » — c'est exactement ce qu'on prouve, en supprimant l'aléa d'ordonnancement.
- ⚠️ Le plafond côté production est décompté **par pas de `POLL_INTERVAL`** (`transcript.rs:427-432`) :
  avec `Some(200ms)` l'abandon survient en pratique vers **300 ms** (2 pas de 150 ms). C'est **normal**
  et ne doit **pas** conduire à « ajuster » la production.

### D4 — `create_delay` est **conservé**, et ce n'est pas une inconséquence

Le délai d'apparition du fichier (600 ms en `:982`, 700 ms en `:1002`) reste un `sleep`. Il n'est
**pas** une source de flake pour les tests positifs, car la propriété qu'il installe est **monotone** :
il suffit que le fichier **n'existe pas encore** quand le tailer commence à attendre ; un
ordonnancement plus lent ne fait que **renforcer** cette propriété, jamais l'inverser. Pour le test
négatif, D3 rend `create_delay` **sans effet** sur le résultat.

> **Ne pas rallonger `create_delay` « pour plus de marge »** : ce serait déplacer un seuil, pas le
> supprimer — et ralentir la suite pour rien.

---

## Périmètre

### Inclus (le lot, et rien d'autre)

1. Refonte du harnais `run_tail_collect_ext` / `run_tail_collect`
   (`src-tauri/src/transcript.rs:896-943`) selon D1/D2/D3.
2. Adaptation des **4 tests appelants** (`:946`, `:974`, `:994`, `:1012`) : chacun fournit sa
   condition de fin ; **noms, intentions et assertions inchangés** dans leur substance.
3. **Contrefactuel** : preuve que chaque test peut encore **rougir pour la bonne raison** (cf. § Étapes,
   phase C).
4. **Campagne statistique** de non-flake (cf. § Critères d'acceptation).
5. Compte rendu au gate 🏹 Legolas, avec les journaux des campagnes.

### Exclu (HORS lot — ne PAS faire, même si c'est tentant)

- **Toute modification du code de production** : `tail_file`, `tail_resolved`, `resolve_transcript`,
  `POLL_INTERVAL`, `tail_loop`, les commandes Tauri. Le lot **stabilise la mesure**, il ne refond pas
  le tailer. Une modification de production sortie du contrefactuel **doit être remontée**, pas
  commitée.
- **Affaiblir un test pour le faire passer** — interdit et non négociable :
  - pas de `#[ignore]`, pas de suppression, pas de renommage-évasion, pas de `#[cfg]` d'exclusion ;
  - pas de `sleep` rallongé « au pif » (déplace le seuil, ne le supprime pas) ;
  - pas d'assertion relâchée (`is_empty()` → `len() <= 1`, `==` → `contains`, exact → approximatif) ;
  - pas de `retry` de test ni de harnais qui ré-essaie l'assertion.
  - **Si un test s'avérait mal conçu au point d'être insauvable en l'état, il faut le DIRE** (remontée
    à Stéphane, avec la démonstration), **pas le contourner**.
- **`src-tauri/src/codex.rs`** : vérifié — son unique `sleep` de test (`codex.rs:668`) sert à
  **ordonner deux mtime**, pas de rendez-vous inter-threads ; il n'y a pas de tailer live dans ses
  tests. **Rien à y faire.**
- **Généraliser le helper** à d'autres modules, l'extraire dans un `tests/common`, introduire une
  crate de test (`awaitility`-like), paramétrer les plafonds par variable d'environnement : **sur-
  ingénierie** sur un lot dont le périmètre est fermé.
- **Front, `src/`, CI, `scripts/quality.sh`** : non touchés.
- **Les dettes de L32** (secret `master_key` en clair, exposition LAN du `.12`, épinglage des 3 autres
  images de la stack, défaut « 400 au lieu de 401 ») : **hors lot**, renvoyées à **L34/L35** (cf. § Numérotation).

### Numérotation (arbitrage de cadrage)

Ce lot est **prioritaire** sur les dettes de L32 : il conditionne la lisibilité de **tous** les lots
suivants qui toucheront `src-tauri/`. Il prend donc **L33**, et les suites de L32 glissent :

| Numéro | Contenu | Statut |
|---|---|---|
| **L33** | **ce lot** — stabilisation du flake `tail_file_*` | cadré, à exécuter |
| **L34** | épinglage des **3 autres images** de la stack (`ollama`, `couchdb`, `n8n`) — ex-AR-3 de L32 | à cadrer |
| **L35** | dettes **sécurité** de L32 : DETTE-1 (`master_key` en clair et commité) + DETTE-2 (exposition LAN du `.12`) + **défaut ouvert 400/401** | à cadrer |

*(Les renvois « → L33 » de `specs/instructions/L32-montee-litellm-v194.md` ont été rectifiés en
conséquence le 2026-07-29.)*

---

## Étapes d'implémentation

> Chaque étape produit une **preuve** (sortie de commande) à reporter au compte rendu. Une étape sans
> preuve est une étape non faite.

### Phase A — Témoin (1 passe, pas 8)

1. **Constater l'état avant, sans le re-mesurer** : `cd src-tauri && cargo test` **une seule fois**,
   et joindre la sortie. Le taux (~12 % de vert) est un **fait acquis** du gate Legolas : on ne
   refait pas la campagne d'avant. Ce témoin sert seulement d'ancrage de compte rendu.
2. Noter le **nombre total de tests Rust** annoncé par `cargo test` (**337** au gate du 2026-07-29) :
   il devra être **identique ou supérieur** à la fin, avec **0 `ignored`**.

### Phase B — Refonte du harnais

3. Ajouter `wait_until(deadline, pred) -> bool` (D1) dans `mod tests`, avec deux constantes nommées
   et commentées :
   - `WAIT_DEADLINE` — plafond **généreux** de rendez-vous : **10 s**. Justification à inscrire en
     commentaire : ~**8×** la durée d'un run vert complet (1,15–1,24 s) et ~**66×** `POLL_INTERVAL` ;
     jamais payé sur le chemin nominal.
   - `POLL_STEP` — pas de poll du helper : **10 ms** (≤ 20 ms), soit ≥ 15 relevés par pas de tailer.
4. Réécrire `run_tail_collect_ext` : signature enrichie d'une **condition de fin**
   `done: impl Fn(&[RunnerEvent]) -> bool` (D2). Séquence exacte :
   1. spawn du tailer (inchangé) ;
   2. `sleep(create_delay)` (conservé, D4) puis `File::create` ;
   3. pour chaque ligne : `writeln!` + `flush`, puis **U2** — attendre que le **compte d'events ait
      augmenté** (plafond court dédié, ex. `LINE_GRACE = 2 s`) ; l'expiration de cette grâce est
      **non fatale** (toutes les lignes ne produisent pas forcément un event) : c'est `done` qui
      gouverne, pas elle ;
   4. **U1** — `wait_until(WAIT_DEADLINE, || done(&collected))` ;
   5. `stop.store(true)` puis `join` (le join peut coûter jusqu'à un `POLL_INTERVAL` : **normal**,
      ne pas « optimiser ») ;
   6. nettoyage du fichier, retour du vecteur collecté.
5. Adapter `run_tail_collect` (cas nominal) pour transmettre la condition de fin.
6. Adapter les **3 tests positifs** — la condition de fin **reprend mot pour mot** le prédicat de
   l'assertion :
   - `:946` → parole assistant présente **ET** un `Geste` présent ;
   - `:974` → parole assistant dont le texte est **exactement** `"🟡 [COORDINATION][Aragorn] prêt"` ;
   - `:1012` → les deux textes `"premier"` **et** `"second apres EOF"` présents. **Ce test gagne au
     passage sa validité** : grâce à U2, la 2ᵉ ligne n'est écrite qu'**après** que la 1ʳᵉ ait été
     observée, donc **après** que le tailer ait franchi l'EOF — la mécanique « held fd » est
     réellement exercée, ce qui n'était pas garanti (cf. Problème, point 2).
7. Adapter le **test négatif** `:994` selon D3 (chemin dédié dans le harnais, ou petit harnais
   séparé — au choix de l'exécutant, la sobriété prime) : attendre `handle.is_finished()`, **puis**
   créer le fichier, **puis** assert `evs.is_empty()` ; échec explicite si le thread n'a pas rendu
   la main dans `WAIT_DEADLINE`.
8. `cargo fmt` + `cargo clippy --all-targets -- -D warnings` verts.

### Phase C — Contrefactuel (obligatoire : prouver que les tests mesurent encore quelque chose)

> **Une passe verte ne prouve rien si le test ne peut plus rougir.** On casse **volontairement** le
> comportement testé, **une mutation à la fois**, on constate le **rouge**, on **révoque** la mutation.
> Ces mutations sont **locales et temporaires** : **aucune n'est commitée**.

| # | Mutation temporaire (production) | Doit faire **ROUGIR** |
|---|---|---|
| M1 | `transcript.rs:464-468` : `Ok(0) => { sleep; continue }` → `Ok(0) => break` (le tailer ne voit plus les appends après EOF) | `:1012` **et** `:946` |
| M2 | `tail_file` : traiter `create_wait = None` comme `Some(200ms)` (retour de l'ancien plafond court) | `:974` |
| M3 | `tail_file` : **ignorer** `create_wait` (traiter `Some(_)` comme `None`) | `:994`, avec le message explicite « le tailer n'a pas abandonné » — **et sans blocage** |

9. Appliquer M1, lancer `cargo test`, **capturer le rouge**, révoquer.
10. Idem M2, puis M3.
11. **Prouver la révocation** : `git diff -- src-tauri/src/transcript.rs` ne montre **que** des lignes
    situées **sous** `#[cfg(test)]` (`transcript.rs:545`) ; `git diff --stat` limité à ce seul fichier.

### Phase D — Campagne statistique (cf. § Critères d'acceptation pour les seuils et leur justification)

12. **C1** — 20 passes consécutives de `cargo test` (parallèle, défaut).
13. **C2** — 10 passes consécutives de `cargo test -- --test-threads=1`.
14. **C3** — 50 passes consécutives du seul `..._apparait_tard_...`. Commande **exacte** — le nom
    doit être **pleinement qualifié**, `--exact` matchant le chemin de module complet :
    ```bash
    cd src-tauri && cargo test transcript::tests::tail_file_attend_un_transcript_qui_apparait_tard_et_l_emet -- --exact
    ```
    ⚠️ **Garde anti-verdissement-à-vide** (rectifié le 2026-08-03, cf. A2) : la sortie **DOIT**
    annoncer `running 1 test` puis `1 passed; 0 failed; … filtered out`. Si elle annonce
    `running 0 tests`, **la campagne ne vaut rien** — c'est le symptôme de l'ancienne commande
    non qualifiée. Exit code attendu : **0**, à chacune des 50 passes.
15. **C4** — **une** des trois campagnes rejouée **sous charge** (en parallèle d'un `npm run test` ou
    d'un `cargo build`), puisque les runs rouges corrélaient avec la latence (2,43–3,20 s).
16. **C5** — `bash scripts/quality.sh` **vert de bout en bout**, 2 fois de suite.
17. Reporter, pour chaque campagne : la **commande exacte**, le **nombre de passes**, le **compte
    d'échecs** (attendu : **0**) et la **durée** min/max d'une passe.

### Phase E — Clôture

18. **Commit** unique, atomique, *conventional* :
    `test(transcript): remplace les sleeps du harnais tail_file par des rendez-vous explicites`.
    *(Préfixe `test:` et non `fix:` : rien de la production ne change.)*
19. Mettre à jour le **backlog `CLAUDE.md`** (ligne L33) et régénérer l'état des lieux.
    ⚠️ `CLAUDE.md` est **hors du périmètre d'écriture du cadrage** : c'est à l'exécution de le faire.
20. **Pas de push** : le LAN iakabox `192.168.2.0/24` est **tombé** (vérifié deux fois), Forgejo est
    injoignable. Commit **local**, dette de push assumée — comme pour L32.

---

## Fichiers concernés

- `src-tauri/src/transcript.rs` — **module `#[cfg(test)] mod tests` UNIQUEMENT** (à partir de
  `transcript.rs:545`) : helper `wait_until`, constantes `WAIT_DEADLINE`/`POLL_STEP`/`LINE_GRACE`,
  harnais `run_tail_collect_ext`/`run_tail_collect` (`:896-943`), 4 tests appelants (`:946`, `:974`,
  `:994`, `:1012`).
- `CLAUDE.md` — ligne de backlog **L33** *(par l'exécution, hors périmètre du cadrage)*.
- `specs/etat-des-lieux.md` (+ `.html`) — régénérés.
- **Non touchés, et c'est un critère** : tout `src/`, tout `src-tauri/src/*.rs` autre que le module de
  test ci-dessus, `scripts/quality.sh`, `docker/`.

---

## Risques

| # | Risque | Mitigation |
|---|---|---|
| R1 | **Le plafond généreux masque une vraie lenteur** : un test attend 10 s et finit vert alors que le tailer est devenu pathologiquement lent. | Le compte rendu reporte la **durée min/max d'une passe** (C1/C3). Une passe verte qui durerait secondes au lieu de ~1,2 s est un **signal à remonter**, pas un succès. |
| R2 | **La condition de fin diverge de l'assertion** → on attend autre chose que ce qu'on prouve, le pari temporel revient par la fenêtre. | D2 : `done` **reprend le prédicat de l'assertion**. Vérifiable à la relecture de diff (critère de forme). |
| R3 | **Le flake résiste** après la refonte ⇒ ce n'était pas (que) le harnais, il y a une course dans la production. | **Ne rien absorber** : arrêter, documenter la mesure, **remonter à Stéphane**. Une modification de `tail_file`/`tail_resolved` est **hors lot** et demande un re-cadrage. |
| R4 | **Test négatif transformé en blocage** : si le tailer n'abandonne jamais, l'attente de terminaison pend et la suite se fige (pire qu'un échec). | D3 : attente **bornée** par `WAIT_DEADLINE`, puis `stop` + `join` + **panique explicite**. Vérifié par le contrefactuel **M3**. |
| R5 | **Dérive de périmètre** : « tant qu'on y est », factoriser le helper, toucher `codex.rs`, ajuster `POLL_INTERVAL`. | Périmètre exclu explicite ; critère `git diff` borné au module de test d'un seul fichier. |
| R6 | **Contrefactuel oublié ou bâclé** → on livre 4 tests verts qui ne mesurent plus rien (le pire résultat possible : un filet qui ment). | Phase C **obligatoire**, 3 mutations, **rouge capturé** au compte rendu, révocation **prouvée** par `git diff`. |
| R7 | **Mutation de contrefactuel oubliée dans le commit** (production silencieusement cassée). | Étape 11 : `git diff` ne montre que des lignes sous `#[cfg(test)]`, **avant** le commit ; campagne D lancée **après** révocation. |
| R8 | **Machine peu chargée pendant la campagne** ⇒ 20 verts prouvent peu, le flake corrélant à la latence. | **C4** : une campagne **sous charge** délibérée. |

---

## Critères d'acceptation (testables)

### Forme — ce que le diff doit montrer

- [ ] `git diff -- src-tauri/src/transcript.rs` ne contient **que** des lignes situées **sous**
      `#[cfg(test)]` (`transcript.rs:545`) ; `git diff --stat` ne liste **que** ce fichier (hors
      `CLAUDE.md` / état des lieux).
- [ ] **Aucun `std::thread::sleep` de durée devinée ne gouverne plus une assertion** dans le module de
      test : les seuls `sleep` restants sont (a) le **pas de poll** du helper, (b) le `create_delay`
      du scénario, (c) la grâce `LINE_GRACE` non fatale. Vérifiable par lecture du diff.
- [ ] **Les 4 noms de tests existent à l'identique** ; **aucun `#[ignore]`**, aucun test supprimé,
      aucune assertion relâchée (le libellé et la substance des `assert!` sont conservés).
- [ ] `cargo test` annonce **≥ 337 tests** et **`0 ignored`**.
- [ ] `cargo fmt --check` et `cargo clippy --all-targets -- -D warnings` **verts**.
- [ ] **Aucune nouvelle dépendance** dans `src-tauri/Cargo.toml` (`git diff` vide sur ce fichier).

### Contrefactuel — les tests peuvent encore rougir pour la bonne raison

- [ ] **M1** appliquée → `tail_file_voit_les_appends_apres_un_premier_eof` **ET**
      `tail_file_emet_les_events_dun_fichier_qui_grossit_en_direct` **échouent** (sortie jointe).
- [ ] **M2** appliquée → `tail_file_attend_un_transcript_qui_apparait_tard_et_l_emet` **échoue**.
- [ ] **M3** appliquée → `tail_file_avec_plafond_court_abandonne_avant_l_apparition_du_fichier`
      **échoue explicitement** (message « le tailer n'a pas abandonné ») **et la suite ne se bloque
      pas** (elle rend la main dans `WAIT_DEADLINE`).
- [ ] Les 3 mutations sont **révoquées** avant la campagne D (`git diff` le prouve).

### Statistique — le seuil, et **pourquoi ce seuil**

> **Une passe verte ne prouve rien sur un flake à 12 %.** Deux lectures sont exigées : (a) sous
> l'hypothèse « le flake persiste au taux mesuré », la probabilité de passer **par chance** doit être
> négligeable ; (b) en cas de succès, on doit pouvoir **borner** le taux résiduel qu'on aurait pu ne
> pas voir.

- [ ] **C1 — 20 passes consécutives vertes** de `cargo test` (parallèle).
      *Sous H0 (p(vert) = 0,125) : 0,125²⁰ ≈ **9 × 10⁻¹⁹** — le flake mesuré ne peut pas survivre à
      cette campagne. En cas de succès, borne à 95 % : taux résiduel **r ≤ 14 %** par passe.*
- [ ] **C2 — 10 passes consécutives vertes** de `cargo test -- --test-threads=1`.
      *Legolas a mesuré **3 échecs** en séquentiel : le mode n'est pas un cas dérivé, il doit être
      couvert pour lui-même. 10 passes suffisent (le séquentiel est le plus coûteux en temps et le
      plus discriminant : il **sérialise** donc allonge chaque test, ce qui **augmente** l'exposition
      au défaut).*
- [ ] **C3 — 50 passes consécutives vertes** du seul test incriminé, commande exacte
      `cargo test transcript::tests::tail_file_attend_un_transcript_qui_apparait_tard_et_l_emet -- --exact`
      (exit **0**), **chaque** passe annonçant `running 1 test` / `1 passed` — jamais
      `running 0 tests`. *(Nom qualifié obligatoire : rectification A2 du 2026-08-03 ; l'ancienne
      commande non qualifiée sélectionnait 0 test et verdissait à vide.)*
      *C'est le test dont l'échec **en isolement** (2 sur 5, r ≈ 40 %) a prouvé que le problème n'était
      pas la contention. Une passe est quasi gratuite (~ms), donc on paie le volume : sous H0
      (p(vert) = 0,6) : 0,6⁵⁰ ≈ **8 × 10⁻¹²**. En cas de succès, borne à 95 % : **r ≤ 5,8 %** — la
      borne la plus serrée des trois, sur le test le plus fragile.*
- [ ] **C4 — une** des campagnes ci-dessus rejouée **sous charge** (concurremment à `npm run test` ou
      `cargo build`), **0 échec**. *Les runs rouges duraient 2,43–3,20 s contre 1,15–1,24 s pour les
      verts : la charge est le déclencheur connu, il faut le provoquer, pas l'éviter.*
- [ ] **C5 — `bash scripts/quality.sh` vert de bout en bout, 2 fois de suite** (exit 0).
- [ ] Le compte rendu joint, **par campagne** : commande exacte, nombre de passes, **0 échec**, durée
      min/max d'une passe.

> **Ce que le statistique ne prouve pas.** Aucune campagne ne démontre l'**absence** de flake ; elle
> **borne le résiduel**. La preuve de fond est **structurelle** : *plus aucun délai deviné ne gouverne
> l'arrêt du tailer ni le séquencement des appends*. Le critère de **forme** ci-dessus est donc
> **aussi contraignant** que les seuils — une campagne verte obtenue en rallongeant des `sleep`
> serait un **échec du lot**, pas un succès.

---

## Estimation (jalon P1→P2 — obligation de méthode)

- **Charge : ~0,25 à 0,5 j-homme** (médiane **~0,4 j**, soit ~3 h) :
  - **~1 h** — helper + refonte du harnais + adaptation des 4 tests (le code est court ; le soin est
    dans D2/D3) ;
  - **~1 h** — contrefactuel : 3 mutations, 3 rebuilds `cargo`, capture des rouges, révocation
    prouvée ;
  - **~1 h** — campagnes C1–C5 (dont le séquentiel, le plus lent) + compte rendu chiffré.
- **Complexité : FAIBLE.** Aucun choix d'architecture, aucune dépendance, aucune API à concevoir : on
  remplace des délais par des attentes conditionnelles dans un module de test de ~140 lignes. La
  seule finesse est le **test négatif** (D3), et elle est écrite.
- **Risque : FAIBLE, avec un point dur unique.** Le seul scénario coûteux est **R3** (le flake
  résiste ⇒ course réelle en production). Il est **détecté par la campagne**, il **ne s'absorbe pas**,
  il **se remonte**.
- **Inconnues susceptibles de faire glisser l'estimation :**
  1. **Le flake résiste** (R3) → investigation d'une course dans `tail_resolved` : **+2 à 4 h**, et
     **re-cadrage** (ce serait un autre lot, touchant la production).
  2. **Un 5ᵉ test flake apparaît** une fois les 4 premiers stabilisés (masqué par l'arrêt prématuré au
     premier échec) : **+1 h**.
  3. **Durée des campagnes** sur cette machine : 20 passes de `cargo test` ≈ 1 à 3 min si le cache de
     build tient ; un `cargo clippy --all-targets` intercalé recompile et coûte davantage.
- **Verdict : lot COURT, peu risqué, à valeur de socle.** Il ne livre **aucune fonctionnalité** — il
  **rend au dépôt un filet de non-régression digne de foi**, sans lequel **tout** lot ultérieur
  touchant `src-tauri/` sera indiagnosticable. C'est la dette la plus rentable du moment.
- Cette estimation est **rappelée à la clôture du lot** et confrontée au temps réel.

---

## Sources

**Faits internes** (mesurés, non re-vérifiés ici) : gate 🏹 Legolas du **2026-07-29** (taux de vert
~12 % sur 8 passes, isolement 2/5, séquentiel 3 échecs, signature temporelle, antériorité `922f2e9`
du 2026-07-14).

**Faits externes vérifiés sur le web le 2026-07-29** :

- `std::thread::JoinHandle::is_finished` — **stabilisé en Rust 1.61.0**, non bloquant, conçu
  précisément pour « implementing a non-blocking join operation » ; MSRV du projet = **1.77.2**
  (`src-tauri/Cargo.toml:7`) → utilisable sans dépendance :
  [doc.rust-lang.org — JoinHandle](https://doc.rust-lang.org/std/thread/struct.JoinHandle.html) ·
  [Announcing Rust 1.61.0](https://blog.rust-lang.org/2022/05/19/Rust-1.61.0/) ·
  [Tracking issue #90470](https://github.com/rust-lang/rust/issues/90470)
- **État de l'art du dé-flakage** : les délais fixes échouent « on slower machines or under heavy
  load » ; la correction canonique est de remplacer les `sleep` par des `wait-for` sur condition avec
  timeout, et « the timeout value can be set to a much higher value than the sleep value since the
  time price is not always paid » ; les problèmes d'attente/timing pèsent ~45 % des tests flaky :
  [Semaphore — How to deal with and eliminate flaky tests](https://semaphore.io/community/tutorials/how-to-deal-with-and-eliminate-flaky-tests) ·
  [fabric8io/kubernetes-client #7391 — Replace Thread.sleep with deterministic waits](https://github.com/fabric8io/kubernetes-client/issues/7391) ·
  [Salesforce Engineering — Flaky tests and how to avoid them](https://engineering.salesforce.com/flaky-tests-and-how-to-avoid-them-25b84b756f60/) ·
  [Harness — Flaky tests: how to find, fix and prevent them](https://www.harness.io/blog/flaky-tests-the-quiet-killer-of-productivity-in-your-ci-pipeline)
