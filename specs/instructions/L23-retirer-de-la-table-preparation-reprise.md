# Instruction : L23 — Bouton « retirer de la table » + préparation de reprise en tâche de fond

> Cadré par 🧙 Gandalf (2026-07-11), à partir d'un besoin de Stéphane (décisions VERROUILLÉES).
> Consommé par Gimli comme instruction de travail. Le dernier lot livré est **L22 (`v0.16.0`)** → ce lot est **L23**.
> Faits externes vérifiés (Tauri 2, tâches de fond + événements) cités en § Décision.

---

## Contexte

Vision iakaframe : **ranger un projet = mettre le dev en pause → préparer la reprise**. Le cycle
de doc de la méthode régénère un **état des lieux** à chaque pause / préparation de reprise. Sur
la page **Table** (vue « Travail » = `src/views/WorkingView.tsx`, colonne gauche « Sur la table »,
items `.workitem`), on ne peut aujourd'hui **que poser** un projet (bouton `+` d'import) et
**l'ouvrir** (clic sur l'item) — pas le **retirer**. Le retrait n'existe que côté **Étagère**
(`PortfolioView` → `ProjectCard` bouton `.cardrm`, câblé sur `workset.toggle`).

Besoin : sur chaque `.workitem`, un bouton **« retirer de la table »** qui, d'un geste,
(1) **range le projet immédiatement** (retrait du set de Work, UI à jour sans attendre) et
(2) **déclenche en tâche de fond** un **job de préparation de reprise** = régénérer l'**état des
lieux** du projet (faits git). Ce geste matérialise le rituel « pause → reprise » directement dans
l'IHM, **sans PowerShell** (le `.ps1` Windows du cycle de doc est hors cible sur Mac).

## Décisions VERROUILLÉES (ne pas rouvrir)

1. **Retrait immédiat.** Le clic retire le projet du set de Work **tout de suite** ; l'UI se met à
   jour sans attendre la fin du job.
2. **Job de préparation de reprise EN TÂCHE DE FOND.** Le retrait **n'attend PAS** la fin du job.
   Un **statut** informe l'utilisateur : « préparation de reprise… » → « prête », + **cas d'échec**.
3. **Toujours avec reprise.** AUCUNE échappatoire, aucun clic « retirer sans préparer ». Le job part
   **systématiquement** à chaque retrait depuis la Table.

## Ce qui existe (à réutiliser — ne pas réimplémenter)

| Élément | Où | État |
|---|---|---|
| Retrait du workset (câblé Étagère) | `useWorkset.toggle`/`add`, passé en `onToggleWork`→`onRemove`, bouton `.cardrm` de `ProjectCard` | implémenté — **même callback à réutiliser** |
| Liste « Sur la table » | `WorkingView.tsx` `.worklist`/`.workitem` (238-251) | implémenté — **cible du nouveau bouton** |
| Hook workset (autorité du set) | `src/hooks/useWorkset.ts` (Set d'ids, `toggle`/`add`/`has`) | implémenté — **point d'accroche du retrait** |
| Câblage App workset ↔ vues | `App.tsx` `workset`, `worksetProjects` (164-167), `onToggleWork={workset.toggle}` (417) | implémenté — **ajouter le handler retrait+job** |
| Capture de faits git (cross-OS, binaire `git`) | `src-tauri/src/git.rs` `capture(dir, args)` | implémenté (L1) — **socle du job** |
| Écriture `specs/etat-des-lieux.md` côté Rust (précédent) | `src-tauri/src/seed.rs` (`std::fs::write`, git `-c user.*` neutre) | implémenté (L7) — **modèle d'écriture de fichier** |
| Façade unique `invoke` | `src/api/backend.ts` (seul `invoke`, types miroir snake_case) | implémenté (D7) — **où ajouter la commande** |
| Commande async + `spawn_blocking` | `src-tauri/src/voice.rs` `voice_listen` (async) | implémenté (L16) — **patron de la commande de fond** |
| Émission d'événements Rust→front | `transcript.rs`/`codex.rs` `app.emit(...)` via `tauri::Emitter` | implémenté (L10) — **option si statut par événement** |
| CLI cross-OS `@naonedge/iakaframe` | registre npm Forgejo (LAN) | publiée — **écartée ici (cf. Décision B)** |
| Fix troncature `.workitem .mid .nm/.pv` | `src/theme/app.css:1422-1444` (`display:block` + ellipsis) | **déjà appliqué, non committé** — à intégrer au lot |
| Bouton « retirer de la table » sur `.workitem` | — | **absent → ce lot** |
| Commande de préparation de reprise | — | **absent → ce lot** |

## Décision (approche retenue + alternatives écartées)

### A. Le « comment » du retrait — réutiliser le callback workset existant

Le retrait est **déjà** le `workset.toggle` câblé côté Étagère. `WorkingView` reçoit une **nouvelle
prop** `onRemoveFromWork: (projectId: string) => void`, et `App` la branche sur un **handler dédié**
qui : (1) **retire immédiatement** du set (`workset.toggle`/un `remove`), puis (2) **lance le job**
sans l'attendre. On **ne réutilise pas** directement `onToggleWork` en prop car l'item de la Table
disparaît au retrait : App doit orchestrer retrait **+** job **+** statut → un handler distinct est
plus lisible (pas de god-component ; l'orchestration vit dans App, l'état de statut dans un petit
hook `usePrepareResume`). *(Écarté : mettre l'appel backend dans `useWorkset` — mélangerait le set
d'ids pur avec de l'I/O ; le set doit rester front-pur.)*

**Gotcha bloquant à traiter (button-in-button).** Côté Étagère, `.proj` est un `<article>` : le
`.cardrm` s'y imbrique sans souci. Mais côté Table, **`.workitem` EST un `<button>`** (`onOpenProject`
au clic). Imbriquer un `<button>` retirer dans un `<button>` est **du HTML invalide** (hydratation/a11y
cassées). Gimli **doit restructurer** l'item : `.workitem` devient un conteneur `<div>` (ou `<li>`) avec
**une zone cliquable interne** (bouton/rôle) pour ouvrir + **un bouton frère** « retirer ». Conserver le
style/hover/`.active` existants (adapter les sélecteurs CSS). C'est un point porteur : ne pas nester.

### B. Le « comment » de l'état des lieux — **commande Rust `git::capture` (reco), PAS la CLI ni PowerShell**

**Reco : générer `specs/etat-des-lieux.md` côté Rust**, via une nouvelle commande qui capte les faits
git avec `git::capture` (déjà cross-OS, binaire `git`, zéro dépendance) et écrit le fichier avec
`std::fs::write` (patron `seed.rs`). Rationale (aligné CLAUDE.md) :

- **Self-hosted / réutilisation maximale** : `git.rs` capte déjà branche/commits/statut ; `seed.rs`
  écrit déjà un `specs/etat-des-lieux.md`. Zéro nouvelle dépendance, zéro réseau.
- **Cross-OS** sans PowerShell (`.ps1` exclu sur Mac) et **sans supposer Node** installé.
- **Façade unique** (D7) : un seul point d'`invoke` dans `backend.ts` ; pas de sous-process Node
  éparpillé, pas d'accès registre Forgejo LAN (indispo hors LAN).
- **CSP stricte intacte** : tout se passe côté Rust, aucun client réseau front.

*Écarté — CLI `@naonedge/iakaframe` en sous-process* : suppose Node + accès au registre npm Forgejo
(LAN) au runtime, ajoute une dépendance de process externe et un mode de panne réseau, pour un gain nul
ici (les faits git sont déjà à portée de `git.rs`). *Écarté — `.ps1` iakaframe-snapshot* : Windows-only,
hors cible Mac (décision Stéphane).

**Commande à ajouter (à écrire par Gimli, décrite ici — pas de code au cadrage) :**

- **Nom** : `prepare_resume` (façade TS `prepareResume`).
- **Signature Rust** : `async fn prepare_resume(path: String) -> Result<ResumeReport, String>`, en
  `#[tauri::command]`. Le travail git+écriture tourne en `spawn_blocking` (patron `voice.rs`) pour ne
  **pas** bloquer le thread principal (fait vérifié Tauri 2, cf. sources en bas).
- **Ce qu'elle fait** : valide `path` (réutiliser `pathguard`/`validate_cwd` du socle L0, comme les
  autres commandes qui touchent au FS) ; capte les faits git (`git -C <path> rev-parse` pour savoir si
  dépôt, branche `--abbrev-ref HEAD`, `status --porcelain` pour propre/sale, `log -N --format=...` pour
  les N derniers commits) ; **écrit** `<path>/specs/etat-des-lieux.md` (crée `specs/` si absent).
- **Ce qu'elle NE fait PAS** : aucun `git add`/`commit`/`push` (cf. sous-arbitrage SA-6), aucun réseau,
  aucun secret.
- **`ResumeReport`** (miroir TS, snake_case) : au minimum `{ ok: bool, path: String, is_git: bool,
  branch: Option<String>, commit_count: u32, dirty: bool, wrote_path: String }` — de quoi afficher un
  statut honnête et, plus tard, un lien vers le fichier.

### C. Le « comment » du statut — Promise-based async command (reco), état de statut front

Le job étant **une** tâche (pas un flux de progression %), la voie la plus MVP est une **commande async
retournant une Promise** (`prepareResume(path)`), et un petit **hook front `usePrepareResume`** qui tient
le statut par projet : `idle → running → done | error`. App déclenche le retrait immédiat **puis**
`void prepareResume(path)` **sans bloquer l'UI**, et met à jour le statut à la résolution/au rejet.
*(Écarté pour le MVP : statut par `app.emit` d'événements — utile pour une **progression** granulaire,
superflu pour un job atomique ; on garde l'option `Emitter` documentée si un jour on veut du %.)*

**Où afficher le statut ?** L'item disparaît de la liste au retrait immédiat → le statut **ne peut pas**
vivre sur l'item. Reco : une **petite zone de statut dans l'en-tête de la worklist** (`.wlhead`/sous le
compteur) listant les préparations récentes (« <projet> · préparation… / prête / échec »), transitoire
et discrète. *(Cf. sous-arbitrage SA-4 : toast système vs zone worklist — reco zone worklist.)*

### D. MVP-first (périmètre resserré)

MVP : **faits git → `specs/etat-des-lieux.md`** (branche, N commits, propre/sale) sous un **squelette de
récit** (titres « Fait récemment » / « À faire » remplis des faits captés, le narratif fin laissé en
gabarit). **Pas de LLM** dans ce lot (l'enrichissement du récit par Ollama via `ai.rs` est une piste P2,
cf. SA-1). On **n'ajoute pas** de commit/push automatique (SA-6). On ne touche **pas** à l'Étagère
(déjà câblée). Commits atomiques, gate Legolas en clôture.

## Périmètre FERMÉ

**DANS le lot L23 :**
- Bouton « retirer de la table » sur chaque `.workitem` (restructuration anti button-in-button).
- Prop `onRemoveFromWork` sur `WorkingView` + handler d'orchestration dans `App` (retrait immédiat +
  déclenchement job).
- Commande backend `prepare_resume` (Rust, `git::capture`, écrit `specs/etat-des-lieux.md`) + façade
  `prepareResume` + type `ResumeReport` dans `backend.ts`.
- Hook `usePrepareResume` (statut par projet : running/done/error) + zone de statut dans la worklist.
- Intégration du **fix de troncature CSS déjà appliqué** (`.workitem .mid .nm/.pv`) — acquis à committer
  **avec** le lot (le bouton retirer a besoin de la place libérée).
- i18n FR/EN des nouveaux libellés (namespace `working.*`).
- Tests (front + Rust) + gate Legolas.

**HORS lot L23 :**
- Modification de l'Étagère / `ProjectCard` / `.cardrm` (déjà câblés).
- Tout commit/push git automatique du projet préparé (SA-6 : « état des lieux » seul).
- Enrichissement LLM du récit de reprise (piste P2, SA-1).
- Statut par événements/progression % (`app.emit`) — option documentée, non implémentée.
- Retrait « sans préparer » / toute échappatoire (interdit par la décision 3).
- Persistance backend du workset (reste un différé antérieur, PO-2).

## Découpe en tranches implémentables

- **T1 — UI bouton + restructuration item + fix CSS.** `.workitem` passe de `<button>` à conteneur
  `<div>`/`<li>` : zone cliquable « ouvrir » + bouton frère « retirer » (aria-label i18n, calque visuel
  `.cardrm`). Adapter les sélecteurs CSS (`.workitem`, `:hover`, `.active`). **Intégrer** le fix de
  troncature déjà appliqué (`app.css:1422-1444`) au diff du lot.
- **T2 — Callback + orchestration.** Prop `onRemoveFromWork` sur `WorkingView` ; handler `App`
  (`removeFromWorkAndPrepare`) : `workset.toggle(id)` **puis** déclenche le job sans await.
- **T3 — Commande backend.** `prepare_resume(path)` (Rust, async + `spawn_blocking`, `git::capture`,
  `std::fs::write` de `specs/etat-des-lieux.md`, validation cwd L0) + `ResumeReport` + façade
  `prepareResume` (ajoutée à l'objet `backend`).
- **T4 — Job async + feedback.** Hook `usePrepareResume` (map projet→statut) ; zone de statut worklist
  (running/done/error) ; branchement dans le handler T2.
- **T5 — i18n + tests + gate.** Clés FR/EN ; tests Rust (`prepare_resume` : dépôt git réel via tempdir,
  cas hors-git, écriture du fichier, N commits) ; tests front (bouton présent/appelle le callback,
  retrait immédiat, transitions de statut avec façade mockée) ; `quality.sh` vert ; gate Legolas.

## Critères d'acceptation vérifiables

- **Bouton présent** : chaque `.workitem` de la Table affiche un bouton « retirer de la table »
  (aria-label i18n), **sans** button-in-button (HTML valide, item ouvrable **et** bouton cliquable
  indépendamment). *(test front + revue DOM)*
- **Retrait immédiat** : au clic, le projet quitte la liste « Sur la table » **immédiatement**, avant
  toute résolution du job (l'UI n'attend pas). *(test front : la liste diminue synchroniquement ; le
  callback backend est appelé mais son await n'est pas requis pour le rendu)*
- **Job systématique** : chaque retrait depuis la Table appelle `prepareResume(path)` **une fois** ;
  aucun chemin de code ne retire sans déclencher le job. *(test front : spy sur la façade)*
- **État des lieux écrit** : `prepare_resume` sur un dépôt git réel écrit/rafraîchit
  `<path>/specs/etat-des-lieux.md` contenant branche, statut propre/sale et les N derniers commits.
  *(test Rust avec tempdir + git réel, best-effort si `git` absent — patron `seed.rs`)*
- **Statut visible** : l'utilisateur voit « préparation de reprise… » puis « prête » ; en cas d'échec
  (rejet de la commande), il voit un statut d'erreur lisible. *(test front : transitions running→done
  et running→error)*
- **Cas hors-git** : un dossier non-dépôt ne fait pas échouer le job — il écrit un état des lieux
  « hors git » minimal et le statut finit « prête » (cf. SA-3). *(test Rust)*
- **Aucun effet git destructif** : `prepare_resume` n'exécute aucun `add`/`commit`/`push`/`reset`.
  *(revue de code + test : l'arbre git du tempdir reste inchangé hormis le fichier écrit)*
- **Gardes intacts** : façade unique respectée (grep : aucun `invoke` hors `backend.ts`), CSP stricte
  inchangée, pas de god-component, i18n FR/EN à parité. `npm run typecheck` + `lint` + `test` verts,
  `cargo test` vert, `bash scripts/quality.sh` OK.

## Sous-arbitrages restants (pour Stéphane — reco de Gandalf)

- **SA-1 — Récit de reprise : squelette (faits) ou narratif LLM ?** Le besoin mentionne « court récit
  ce qui vient d'être fait / ce qui reste ». Un job Rust ne capte que des **faits git**. **Reco : MVP =
  squelette rempli des faits** (titres « Fait récemment » = N commits, « À faire » = gabarit), **sans
  LLM** ; enrichissement narratif via `ai.rs` en **P2** si tu le veux. *(alternative : brancher Ollama
  dès L23 — plus riche mais plus lourd, dépend de l'endpoint dispo.)*
- **SA-2 — Nombre de commits N.** **Reco : N = 5** (aligné sur le récit « Fait récemment » de
  l'état des lieux existant du dépôt). Paramétrable plus tard.
- **SA-3 — Dossier non-dépôt git.** **Reco : ne pas échouer** — écrire un état des lieux « hors git »
  minimal, statut « prête (hors git) ». *(alternative : statut « n/a » sans fichier — moins utile.)*
- **SA-4 — Où s'affiche le statut ?** L'item disparaît au retrait → pas sur l'item. **Reco : zone
  discrète dans l'en-tête de la worklist** (liste transitoire des préparations). *(alternative : toast
  système via un composant toast — à créer, plus intrusif ; non nécessaire au MVP.)*
- **SA-5 — Écrasement de `specs/etat-des-lieux.md`.** Le fichier existe souvent déjà. **Reco :
  régénérer/écraser** (c'est le but d'une préparation de reprise) — comportement d'un snapshot.
  *(alternative : append horodaté — bruite le fichier.)*
- **SA-6 — Commit/push automatique après régénération ?** Tu as dit « état des lieux » **seul**.
  **Reco : NON** — juste régénérer le `.md`, aucun `git add/commit/push` auto. À rouvrir seulement si tu
  le demandes explicitement.
- **SA-7 — Confirmation avant retrait ?** La décision 3 (« toujours avec reprise, aucune échappatoire »)
  penche pour un geste direct. **Reco : pas de confirmation** (retrait réversible : reposer le projet
  depuis l'Étagère). *(alternative : confirmation si l'arbre est sale — sur-ingénierie pour un MVP.)*

## Vérification (clôture)

- [ ] `npm run typecheck` OK
- [ ] `npm run lint` OK
- [ ] Tests front ajoutés/à jour et verts (bouton, retrait immédiat, statut)
- [ ] `cargo test` (dont `prepare_resume`) vert
- [ ] `bash scripts/quality.sh` OK (front + Rust)
- [ ] Fix de troncature CSS committé **avec** le lot
- [ ] Grep : aucun `invoke`/`listen` hors `backend.ts` ; CSP inchangée
- [ ] Recette terrain réelle par Stéphane (`tauri dev`) : retrait immédiat + `specs/etat-des-lieux.md`
      régénéré + statut prête/échec observés
- [ ] **Gate Legolas** en clôture

## Estimation grossière

**≈ 1,5 – 2 j-homme.** T1 (UI + restructuration item + CSS) ~0,5 j · T2 (callback/orchestration) ~0,25 j ·
T3 (commande Rust + façade) ~0,5 j · T4 (hook statut + zone worklist) ~0,25–0,5 j · T5 (i18n + tests +
gate) ~0,25–0,5 j.

---

### Sources (faits externes vérifiés)

- [Long-running backend async tasks in Tauri v2 — sneaky crow](https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2)
- [Calling Rust from the Frontend | Tauri v2](https://v2.tauri.app/develop/calling-rust/)
- [Handling events in Tauri — Tauri Tutorials](https://tauritutorials.com/blog/tauri-events-basics)
