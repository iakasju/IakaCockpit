# Statut vivant et session attachée — une activité réelle ne devient pas le travail d'un persona

> Cadré par 🔵 Gandalf le 2026-09-05, sur le **signalement S-1 du gate 🏹 Legolas de L46**
> (2026-09-04), mesuré par le gate et **reproduit par lui sur `main`**. Successeur de **L46**
> (`specs/instructions/identite-du-runner-badge-et-team.md`) et **L47**
> (`specs/instructions/pastille-du-badge-runner.md`). Base : `main`@`456e7d6`, arbre propre.
> **Aucune ligne de code écrite** : ce document est le seul artefact du cadrage.
> **Les arbitrages AR-1..AR-6 sont TRANCHÉS par Stéphane le 2026-09-05 : « reco »** — chacun sur
> la recommandation de Gandalf, soit AR-1 = **(a)** `none` « non lancé » · AR-2 = **(a)** correction
> au point d'appel · AR-3 = **(a)** aucun nom sur la parole attachée · AR-4 = **(a)** purger le
> résidu à la bascule attaché→possédé · AR-5 = **(a)** ajouter une SECONDE limite, l'existante
> reste intacte · AR-6 = **(c)** témoin positif conservé dans le dépôt **et** contrefactuel.
> Gate P1 franchi ; le § 6 conserve les options écartées pour mémoire.

---

## 1. Le signalement, verbatim

> **S-1** — `src/App.tsx:158-167`, `src/App.tsx:401-425`, `src/hooks/useLiveStatus.ts:76-99` : le
> statut vivant du roster (`rstatus`) attribue le coordinateur de la team liée comme « travaille »
> sur un geste réel d'une conversation `attached`, hors de toute identité injectée. Hors CA-6
> littéral (qui porte sur l'attribution de geste `.evagent`, pas sur le statut d'activité L31-P2).
> Préexistant à ce lot.

**Reformulation** : une session Claude Code **externe**, que ce Cockpit n'a **jamais lancée ni
informée de rien**, émet un geste réel ; ce geste allume le point de statut d'un **persona nommé**
de la team liée. L'activité est vraie ; **son attribution est fabriquée**. C'est exactement la
famille de défaut qui a valu son FAIL à L46 — sur un **autre canal**.

---

## 2. Ce qui a été établi PAR LECTURE (aucun de ces points n'est supposé)

### 2.1 — La chaîne complète, de l'événement au pixel

| # | Étape | Ligne exacte | Ce qui s'y passe |
|---|---|---|---|
| 1 | Le tailer démarre sur un transcript **externe** | `src/hooks/useRunnerViews.ts:104-110`, `:112-128` | `source === "attached"` ⇒ clef = `attachedSessionId`, **aucun PTY**. |
| 2 | Chaque `RunnerEvent` passe par l'observateur additif | `src/hooks/useRunnerViews.ts:139` | `onEventRef.current?.(projectId, ev)` — **inconditionnel**, quelle que soit la source. |
| 3 | L'observateur marque la fraîcheur du slot | `src/App.tsx:159-168`, **`:165`** | `live.mark(projectId)` — `projectId` = **l'id réel du projet** pour une conversation attachée (pas de `slot`). |
| 4 | Le hook enregistre l'horodatage mural | `src/hooks/useLiveStatus.ts:120-126` | `lastEventAt[projectId] = Date.now()` (throttlé 2 s). |
| 5 | L'ensemble des slots « ouverts » est construit | `src/App.tsx:252-255` | `liveProjectIds` = **TOUTES** les conversations, `owned` **et** `attached`. |
| 6 | Le coordinateur est résolu depuis la team **liée** | `src/App.tsx:406-409` | `teams.coordinatorOf(activeTeam)?.name`. |
| 7 | Le statut du roster est dérivé | `src/App.tsx:410-428` | `deriveRosterLiveStatus(rosterMembers, activeRealProjectId, activeCoordinatorName, liveProjectIds, live.lastEventAt, now)`. |
| 8 | Le slot du coordinateur **est** la conversation du projet | `src/hooks/useLiveStatus.ts:64-73` | `slotProjectIdForAgent` : agent == coordinateur ⇒ `slotId = realProjectId`. |
| 9 | **Le point de décision** | `src/hooks/useLiveStatus.ts:95-97` | `openProjectIds.has(slotId) ? deriveLiveStatus(lastEventAt[slotId], now) : "none"`. |
| 10 | La fraîcheur devient `running` | `src/hooks/useLiveStatus.ts:48-56` | `0 ≤ now − lastEventTs ≤ 20 000` ⇒ `running`. |
| 11 | Le statut descend en prop | `src/App.tsx:936` → `src/views/WorkingView.tsx:848` | `rosterLiveStatus` → `liveStatus`. |
| 12 | **Le pixel** | `src/components/Roster.tsx:97-112`, **`:133`**, `:141` | `<span class="rstatus working">` + libellé `t("roster.statusWorking")` = « travaille », **sur la ligne qui porte le NOM de l'agent** (`:138`). |

### 2.2 — L'information qui manque, exactement

Au point de décision (**étape 9**, `useLiveStatus.ts:95`), la seule question posée est
« **existe-t-il une conversation portant cet id ?** ». L'information absente est
**`conv.source`** — `"owned"` (runner lancé et **informé** par ce Cockpit) vs `"attached"`
(transcript externe tailé en lecture seule, L25, `src/hooks/useConversations.ts:61`, `:293-297`).

Cette information **existe** et est **déjà disponible dans le même composant** : `App.tsx:252-255`
la jette en construisant `liveProjectIds`, et `App.tsx:196-197` s'en sert **déjà** pour couper
l'attribution de geste (correctif du FAIL de L46). Ce n'est donc pas une donnée à aller chercher :
**c'est une donnée qui est écartée en route.**

### 2.3 — Portée exacte : UNE cellule, et une seule

Fait de lecture qui borne le lot et qu'il faut dire avant de le dimensionner :

- `slotProjectIdForAgent` (`useLiveStatus.ts:69-72`) ne renvoie `realProjectId` **que** pour
  l'agent égal au coordinateur ; tout autre agent obtient un slot **synthétique**
  `<projet>::agent::<nom>`, qui n'existe que si le décideur a cliqué « lancer » — donc
  **toujours `owned`**.
- `rosterLiveStatus` est calculé pour `activeRealProjectId` (`App.tsx:309-312`, `:414`) : une
  session attachée sur le projet A **n'affecte pas** le roster du projet B actif.

**Conclusion** : le défaut allume **exactement la ligne du coordinateur de la team liée**, et
**uniquement** quand la conversation **active** est `attached`. Ce n'est pas moins grave — c'est la
ligne la plus visible du roster — mais c'est **fermé**, et ça rend les critères d'acceptation
écrivables sans ambiguïté.

### 2.4 — UN canal, ou plusieurs ? Inventaire VÉRIFIÉ, pas recopié

L'ordre de mission demande de ne pas croire les verdicts des lots précédents. Les onze points de
rendu qui portent un nom d'agent, un coordinateur ou un statut ont donc été **relus un à un**.

| Point de rendu | Ligne | Comportement en `attached` | Verdict |
|---|---|---|---|
| `.rstatus` / libellé du roster | `Roster.tsx:133,141` ; `App.tsx:410-428` | Le coordinateur passe « travaille » sur un geste externe | ❌ **FABRICATION — c'est S-1** |
| `.bwho` (nom en tête de bulle assistant) + avatar de gouttière | `Chat.tsx:297,299,306` | `turn.agent ?? agent` ⇒ `agent` = `active.agent` = **coordinateur de la team liée** ; la **parole** du transcript externe est étiquetée à son nom, avec **sa vignette** | ❌ **FABRICATION — canal NON couvert par L46/L47, trouvé ici** |
| `.evagent` (ligne d'événement) | `Chat.tsx:273,279` ; `App.tsx:195-200` | `identityFor` coupe sur `conv.source === "attached"` ⇒ aucun nom | ✅ honnête (**correctif L46, re-vérifié**) |
| Bandeau délégations (`.treeband`, arbre + couloirs) | `WorkingView.tsx:636` | `active.source === "owned"` en garde ⇒ bandeau absent | ✅ honnête (**jumeau L46, re-vérifié**) |
| `.ct-runner` (coordinateur · kind · modèle) | `WorkingView.tsx:495-502` | Gardé `owned` | ✅ honnête |
| Bannières « runner non câblé » (shell et chat) | `WorkingView.tsx:679-702`, `:727-754`, `:776-786` | La branche `attached` **sort avant** ; la bannière chat est gardée `owned` | ✅ honnête |
| `.ct-agent` (interlocuteur) | `WorkingView.tsx:492-494` | Affiche le coordinateur de la team liée, **mais** `WorkingView.tsx:507-516` pose à côté « session vivante · lecture seule » + « identité non garantie » | ⚠️ **déclaré**, pas silencieux — cf. § 2.5 |
| Point de statut d'onglet `.pt-status` | `ProjectTabs.tsx:92,102-104` ; `App.tsx:431-437` | S'allume sur l'activité externe — **sans nommer personne** | ✅ **honnête, et à NE PAS casser** |
| Chip « ● en cours » de l'Étagère | `PortfolioView.tsx:89,205` ; `App.tsx:252` | Idem : fait du projet, aucun nom | ✅ honnête |
| Panneau « Tâches en cours » | `TasksPanel` ; `useAgentTasks.ts:53` | `agent` = `subagent_type` **lu dans le transcript** — donnée réelle de la session externe | ✅ honnête |
| Analytics — coordinateur par projet | `App.tsx:660-663` ; `AnalyticsView.tsx:114-117` ; `useAnalytics.ts:377-403` | Attribue le coût **top-level** d'un projet au coordinateur de sa team liée, **sans aucune notion de source** | ⚠️ **même famille, HORS d'atteinte de ce lot** — § 2.9 |

**Réponse à la question posée** : **deux** canaux à corriger (roster `rstatus`, bulles `.bwho`),
**un** canal déclaré et laissé tel (`.ct-agent`, § 2.5), **un** hors d'atteinte (Analytics, § 2.9),
**sept** vérifiés honnêtes.

**Le second canal n'avait été vu par personne, et le fichier de garde de L46 le dit sans le
savoir** : `src/__tests__/identityAttachedJunction.test.tsx:265-267` écrit que « "Boromir" apparaît
légitimement AILLEURS à l'écran (interlocuteur `.ct-agent`, roster) ». La liste est **incomplète** —
il apparaît aussi en **tête de chaque run de bulles assistant**, et là ce n'est pas une étiquette de
configuration : c'est **l'attribution d'une parole**. Le badge que le runner écrit lui-même est,
lui, dans le texte verbatim (`runnerView.ts:12-14`) ; retirer l'étiquette du Cockpit ne fait donc
**perdre aucune information vraie**.

### 2.5 — Pourquoi `.ct-agent` n'est PAS traité comme les deux autres

`.ct-agent` porte l'**interlocuteur** de la conversation, c'est-à-dire « à qui vous parleriez ». Sa
mention est **explicitement déclarée fausse-en-attaché** juste à côté, par la clé
`working.identityNotGuaranteed` posée par **AR-7 de L46, tranché par le décideur**
(`WorkingView.tsx:507-516`). Rouvrir cet arbitrage « tant qu'on y est » serait le trancher par
accident. Il est donc **nommé et laissé tel** — mais l'asymétrie est réelle et doit être écrite :
`.ct-agent` est *déclaré*, `.bwho` ne l'est *pas*, et c'est ce qui les sépare.

### 2.6 — La limite déjà déclarée : elle porte sur un AUTRE axe

`src/hooks/useLiveStatus.ts:10-15` écrit :

> « LIMITE HONNÊTE (MVP, documentée) : ce n'est PAS un vrai signal de process vivant […] C'est la
> **fraîcheur du flux d'events du tailer** : un runner qui tourne mais n'émet plus rien sera vu
> "au repos" ; un runner mort dont le dernier event est récent restera "en cours" […] »

**Position de cadrage, nette** : cette limite concerne **« est-ce que ça tourne vraiment ? »**. Le
défaut de ce lot concerne **« à QUI peut-on l'attribuer ? »**. Ce sont **deux axes indépendants** :
sur une session attachée, le signal de fraîcheur est **juste** (quelque chose tourne bel et bien) et
l'attribution est **fausse**. Les fondre dans le même paragraphe brouillerait les deux.

**Donc** : ni étendue, ni remplacée. Elle est **laissée intacte**, et une **seconde** limite,
distincte et nommée, est écrite — **à l'endroit où la décision se prend** (la doc de
`deriveRosterLiveStatus` et le point d'appel `App.tsx`), pas dans le paragraphe existant. Corollaire
qui compte : le hook `useLiveStatus` **n'est pas fautif** ; il fait exactement ce qu'il annonce. Le
défaut vit à la **jonction**. Le réécrire comme s'il était coupable serait un contresens de lecture.

### 2.7 — Le résidu de la conversion `attached` → `owned`

`useConversations.ts:412-418` (`startRunner`) bascule une conversation attachée en `owned` **en
conservant son `projectId`**. Or `lastEventAt` est keyé par `projectId` : l'horodatage déposé par
les events de la **session externe** survit à la bascule. Pendant `RUNNING_WINDOW_MS` (**20 s**,
`useLiveStatus.ts:33`), le coordinateur afficherait donc « travaille » **sur la foi d'events qui ne
sont pas les siens**, avant même que le runner neuf ait émis quoi que ce soit.

C'est **la même fabrication, différée**. Elle est traitable pour trois lignes (AR-4).

### 2.8 — Le piège d'horloge — mesuré, et plus retors que « il faut attendre »

`useNow` (`src/hooks/useNow.ts:15-27`) pousse `Date.now()` dans l'état **toutes les 1 000 ms**, avec
un tick immédiat au montage. Conséquence en test :

- l'événement est marqué à `t0` (**après** le montage) ;
- tant qu'aucun tick n'a eu lieu, `now` vaut encore `t_montage < t0`, donc
  `dt = now − lastEventTs` est **négatif** → `deriveLiveStatus` rend `idle` (branche défensive,
  `useLiveStatus.ts:54-55`).

C'est pourquoi la sonde du gate a dû **attendre 1,2 s réelles**. Et c'est là que se cache le vrai
piège : un test qui attend « un peu » est **flaky par construction** — l'intervalle réel de 1 s peut
tomber **ou pas** pendant les `await` du harnais. Le dépôt a déjà payé ce prix (**L33**, flake
`tail_file_*`).

**Deux faits mesurés qui commandent la technique de test** :

1. **`waitFor` et les faux timers de vitest ne cohabitent pas dans ce dépôt.** Lu sur le disque :
   `node_modules/@testing-library/dom/dist/helpers.js:14-27` — `jestFakeTimersAreEnabled()` est
   gardé par `typeof jest !== 'undefined'`. Vitest expose `vi`, **pas** `jest` : la détection rend
   **`false`**, `waitFor` continue de poller avec un `setInterval` **falsifié**, et le test **pend**.
   Confirmé par la documentation (§ 12). Corollaire : sous `vi.useFakeTimers()`, **aucun `waitFor`**
   ne doit rester dans la fenêtre falsifiée.
2. **Il existe un tick DÉTERMINISTE, sans faux timers et sans attente.** `useNow:34-39` : au retour
   de visibilité, `start()` appelle `tick()` **immédiatement**. Deux `dispatchEvent` de
   `visibilitychange` (masqué, puis visible) forcent donc `now = Date.now()` **à l'instant voulu**,
   avec `dt ≥ 0` garanti puisque le marquage a eu lieu avant. L'idiome est **déjà employé et testé**
   dans le dépôt : `src/__tests__/useNow.test.ts:5-12,53-64`.

La technique (2) est celle qui est recommandée aux CA : **zéro sleep réel, zéro faux timer, zéro
flake**. Elle a un coût, qui doit être écrit **dans le fichier de test** : elle **couple le test au
comportement de reprise de `useNow`**. Si `useNow` cesse de ticker au retour de visibilité, le test
devient **vacuous** — d'où le **verrou** obligatoire de CA-3 (un témoin positif qui doit, lui,
afficher « travaille »).

### 2.9 — Rapport au différé Analytics : il ne touche PAS ce lot, et il faut le dire

Le backlog nomme, depuis L46, un successeur : « le schéma des sous-agents a changé en claude 2.1.260
(ils vivent sous `<session>/subagents/`), ce qui concerne Analytics ; `name:"Agent"`,
`subagent_type` et `outputFile` restent valides » (`CLAUDE.md:1471-1473`).

**Franchement : non, il ne touche pas ce lot.** Il porte sur **où vivent les tours de sous-agents
sur le disque** et sur la chaîne d'attribution `outputFile` de L30. Ce lot-ci ne lit **aucun**
fichier, ne touche **aucune** vue Analytics, et ne dépend d'aucune propriété du schéma : il tranche
sur `conv.source`, une donnée **du Cockpit**, sur des events **déjà** émis par le tailer. Les deux
lots sont indépendants et peuvent être pris dans n'importe quel ordre.

**En revanche, un autre point d'Analytics est bien de la même famille** — et lui n'est **pas** dans
ce lot non plus, pour une raison **structurelle** : `coordinatorOfProject` (`App.tsx:660-663`)
attribue le coût top-level d'un projet au coordinateur de sa team liée, alors que
`useAnalytics.ts:377-403` agrège des transcripts **scannés sur disque**, où la notion
`owned`/`attached` **n'existe pas** — et n'existera jamais rétroactivement, l'historique d'un projet
mêlant par nature des sessions des deux natures. Le corriger suppose de décider **ce qu'on affiche à
la place** d'un nom (une catégorie « non attribuable » ?), ce qui est un **arbitrage produit sur
Analytics**, pas une conséquence de celui-ci. **Inscrit, nommé, non fait.**

---

## 3. Verdict : le lot vaut la peine, et il est petit

1. **C'est un vrai défaut, du même rang que celui qui a valu le FAIL de L46.** L'instruction de L46
   l'écrit elle-même : « une attribution mensongère est **pire** que l'absence d'attribution ». Le
   gate a mesuré, puis **reproduit sur `main`** : ce n'est pas une hypothèse.
2. **La cause est identifiée et bon marché** : la donnée qui manque (`conv.source`) est **déjà
   calculée à trois lignes de là** et **déjà utilisée** pour couper le canal voisin. Il n'y a rien à
   inventer.
3. **Le lot trouve un second canal**, plus visible que celui qui a été signalé (§ 2.4), et **aucun
   des deux ne peut être vu par une garde de fonction pure** : `deriveRosterLiveStatus` et
   `Chat` ne savent pas — et ne doivent pas savoir — ce qu'est une conversation attachée. C'est,
   pour la cinquième fois dans ce dépôt, un défaut **de jonction**.
4. **Il ne vaut PAS un chantier** : aucun Rust, aucune façade, aucune dépendance, aucune commande
   nouvelle. Ce qui coûte, c'est la **vérification** — et cette fois avec une difficulté propre :
   **le temps entre dans la garde** (§ 2.8).

---

## 4. Décision proposée

**Ne laisser le statut d'activité et l'attribution de parole nommer un persona que lorsque le
Cockpit a réellement lancé — et informé — le runner ; sinon, ne nommer personne, sans pour autant
effacer le fait qu'une session tourne.**

- Le statut du roster n'admet comme « slot » que les conversations **possédées** (`owned`).
- Les bulles assistant d'une conversation attachée ne portent **ni nom d'emprunt ni vignette
  d'emprunt** ; le badge écrit par le runner reste **verbatim dans le texte**.
- Le signal **sans nom** — point d'onglet, chip de l'Étagère, badge « session vivante · lecture
  seule » — est **conservé intact** : l'activité externe reste visible, elle cesse seulement d'être
  **imputée**.
- Ce que la décision **refuse délibérément** : cesser de marquer la fraîcheur des sessions attachées
  (ce serait réparer une attribution fausse en supprimant une information vraie), inventer un
  persona neutre, ou rouvrir un arbitrage tranché de L46.

---

## 5. Périmètre FERMÉ

### F1 — Le prédicat « slot réellement possédé » (cœur du lot)

Helper **pur**, sans React ni I/O — `src/hooks/useLiveStatus.ts` ou voisin :

```
ownedConversationIds(conversations: readonly {projectId, source}[]) : Set<string>
```

Il ne retient que `source === "owned"`. Il est **distinct** de `liveProjectIds`
(`App.tsx:252-255`), qui **doit rester inchangé** : ce dernier alimente aussi la chip de l'Étagère
(`PortfolioView.tsx:89,205`) et surtout la **réconciliation d'ouverture eager L24-F1**
(`App.tsx:633,642`) — le restreindre y **rouvrirait** en boucle les conversations attachées.
Ce point est **la seule vraie chausse-trape du lot** et doit être écrit dans le code.

### F2 — Branchement au point de décision

`App.tsx:410-428` : `deriveRosterLiveStatus` reçoit `ownedProjectIds` au lieu de `liveProjectIds`.
La signature de la fonction pure **ne change pas** ; **son paramètre est renommé**
(`openProjectIds` → `ownedProjectIds`) et sa doc (`useLiveStatus.ts:75-82`) dit désormais ce qu'elle
suppose de son appelant.

**Conséquence voulue et à vérifier** : tous les membres du roster passent à `none` (« non lancé »)
tant que la conversation active est attachée — cf. AR-1.

⚠️ **Piège nommé** : ne **jamais** répondre à ce défaut en passant `rosterLiveStatus={undefined}`.
`Roster.tsx:97-103` retomberait sur le **repli L8** (`workingAgents` / `pending`), c'est-à-dire sur
`deriveWorkingAgents` (`runnerView.ts:109-126`) — un chemin qui **rallumerait** des noms. Le repli
doit rester **inatteignable** en conditions réelles (une entrée existe pour chaque membre).

### F3 — La parole attachée ne porte pas de nom d'emprunt

`Chat.tsx:297,299,306` : le repli `turn.agent ?? agent` **et** la vignette de gouttière sont
**conditionnés** à une nouvelle prop explicite (nommage à trancher, AR-3), passée par
`WorkingView.tsx:804-828` depuis `active.source`. Une prop **distincte de `readOnly`** : confondre
« on ne peut pas écrire » et « on ne sait pas qui parle » serait une dette de nommage.

Repli : prop absente → comportement historique (rétro-compatibilité des tests existants).
Un `turn.agent` **explicitement porté** par le tour (délégations, historique de démo) n'est
**jamais** effacé : on ne supprime que le **repli** sur la persona de la conversation.

### F4 — Purge de la fraîcheur à la bascule `attached` → `owned` *(dépend d'AR-4)*

`useLiveStatus` expose `forget(projectId)` ; `App.tsx` (`startRunnerForActive`) l'appelle au moment
de la bascule. Sans quoi le § 2.7 reste ouvert pendant 20 s.

### F5 — Tests (cf. § 9)

Une garde **pure** sur F1 (non vacuous : le contrefactuel « inclure les attachées » la fait rougir)
**et** deux gardes de **jonction** sur le harnais existant
`src/__tests__/identityAttachedJunction.test.tsx` (App montée, mode attaché forcé par
`latest_transcript`, event émis à la main sur le bus Tauri) — **avec le verrou de témoin positif**
imposé par § 2.8.

### Hors couverture, DÉCLARÉ dans le code (pas seulement ici)

- **Ce qui tourne vraiment** : la limite préexistante de `useLiveStatus.ts:10-15` (fraîcheur ≠
  process vivant) reste **inchangée et vraie** ; DEP-1 reste différé.
- **Ce à quoi une activité attachée est attribuable** : **rien**, définitivement, tant que la
  session n'a pas été lancée par ce Cockpit. Condition de levée : aucune — c'est structurel (le
  process externe n'a reçu aucun `--append-system-prompt`, § 2.3 de L46).
- **Analytics** (`coordinatorOfProject`) : hors d'atteinte, motif § 2.9, à écrire **là où le
  résolveur est défini** (`App.tsx:660-663`) et non dans un rapport.
- **Le badge écrit par le runner externe** : il reste affiché **verbatim** dans le texte. Le Cockpit
  ne le corrige pas, ne le masque pas, ne le commente pas.

### Explicitement HORS lot

1. **Toute orchestration, tout routage, tout roster injecté** — inchangé depuis AR-3 de L46.
2. **`.ct-agent`** : mention déjà déclarée par AR-7 de L46, **tranchée**. § 2.5.
3. **Analytics** et sa notion de coordinateur par projet. § 2.9. Inscrit, non fait.
4. **Le successeur `subagents/` de claude 2.1.261** : indépendant, § 2.9.
5. **Un vrai signal de process vivant** (DEP-1) : ce lot ne s'en approche pas.
6. **`RUNNING_WINDOW_MS` / `MARK_THROTTLE_MS`** : on ne les touche pas « tant qu'on y est ».
7. **Le repli L8 `deriveWorkingAgents`** : conservé tel quel (rétro-compat des tests du composant),
   simplement maintenu **inatteignable** en conditions réelles. Ne pas le supprimer dans ce lot.
8. **La persistance de quoi que ce soit** : rien de ce lot n'est persisté.

---

## 6. Arbitrages — **TRANCHÉS le 2026-09-05** (décideur : « reco »)

> AR-1 = **(a)** · AR-2 = **(a)** · AR-3 = **(a)** · AR-4 = **(a)** · AR-5 = **(a)** ·
> AR-6 = **(c)**. Options écartées conservées ci-dessous telles qu'elles ont été proposées.

### AR-1 — Que dit le roster quand la conversation active est `attached` ?

C'est le vrai choix **de produit** du lot : une session externe **travaille réellement** ; ce qui est
faux, c'est de l'imputer à un persona.

- **(a)** **`none` (« non lancé ») pour tous les membres.** Aucun nouvel état, aucune i18n, aucun
  CSS. Sémantiquement exact : « aucun slot **de ce Cockpit** pour cet agent ».
- **(b)** **Un 4ᵉ état, sans nom** (ex. `external` → point neutre + libellé « activité externe »),
  posé sur la **section** du roster et non sur une ligne d'agent.
- **(c)** **Masquer complètement** le point et le libellé de statut en mode attaché.

**Recommandation : (a).** Trois motifs, du plus fort au plus faible :

1. **L'information « ça tourne » est DÉJÀ à l'écran, deux fois, et sans nom** : le point d'onglet
   (`ProjectTabs.tsx:102-104`) et le badge « session vivante · lecture seule »
   (`WorkingView.tsx:507-516`). (b) la **dupliquerait**, et la reposerait sur le widget qui porte
   les **noms** — exactement l'endroit d'où on cherche à la retirer.
2. `none` **existe déjà**, est **déjà rendu** (`Roster.tsx:106,109`) et **déjà testé**
   (`Roster.test.tsx:148-161`). Coût marginal : zéro.
3. (c) supprime aussi le `—` « non lancé », donc une information vraie et utile (« vous n'avez lancé
   aucun agent ici »).

**(b) redevient défendable** si le décideur veut que le roster porte l'activité : il faut alors que
le libellé soit posé **hors des lignes d'agents**, et cela ajoute type + CSS + i18n fr/en + tests
(**+0,2 j**).

### AR-2 — Où vit la correction ?

- **(a)** **Au point d'appel** (`App.tsx`) : un ensemble `ownedProjectIds` distinct ; la fonction
  pure garde sa signature, son paramètre est renommé et documenté.
- **(b)** **Dans la fonction pure** : lui passer les conversations (avec leur `source`) et lui faire
  décider.
- **(c)** **À la source** : ne plus appeler `live.mark` pour une conversation attachée
  (`App.tsx:165`).

**Recommandation : (a).** Motifs :

1. **(c) est un piège** : il ferait **disparaître le point d'onglet** et la chip de l'Étagère pour
   les sessions attachées — on réparerait une **attribution fausse** en supprimant une
   **information vraie**. C'est le contraire du principe du lot.
2. **(b)** ferait entrer la notion de « conversation » dans un module qui l'ignore délibérément —
   la même raison pour laquelle `resolveRunnerIdentity` ne connaît pas `attached`
   (`identityAttachedJunction.test.tsx:12-15`).
3. **(a) est la forme EXACTE du correctif de L46** (`App.tsx:194-200` : on coupe sur `conv.source`
   **avant** de consulter le résolveur). Reproduire un geste déjà validé, plutôt qu'en inventer un.

### AR-3 — La parole attachée : que montre-t-on à la place du nom ?

- **(a)** **Rien** : pas de `.bwho`, pas de vignette de gouttière. Le badge du runner reste dans le
  texte, verbatim.
- **(b)** Un libellé **neutre** (« session externe ») à la place du nom.
- **(c)** Ne rien changer (statu quo).

**Recommandation : (a).** (c) est écarté : c'est la fabrication la plus visible du lot (§ 2.4).
(b) ajoute une i18n et **répète**, sur chaque run de bulles, ce que le badge d'en-tête dit **déjà**
une fois — bruit sans information. (a) ne fait perdre **aucune donnée vraie** : ce qui est vrai (le
badge que le runner s'est donné) est **dans le texte**.

*Nommage de la prop* (sous-arbitrage) : `personaAttributed` / `identityKnown` / `attributeSpeaker`.
**Reco : `identityKnown`**, parce qu'il dit la **cause** (on ne sait pas qui parle) et non l'effet, et
qu'il se lit symétriquement de `identityInjected` (`ResolvedRunner`, L46) — même concept, autre bout
de la chaîne. **Ne pas réutiliser `readOnly`.**

### AR-4 — Le résidu de la bascule `attached` → `owned` (§ 2.7)

- **(a)** **Purger** `lastEventAt[projectId]` à la bascule (`forget`).
- **(b)** **Déclarer** la limite (jusqu'à 20 s d'attribution héritée) et ne rien coder.

**Recommandation : (a).** C'est trois lignes contre une fenêtre de 20 s de la **même** fabrication
que celle qu'on corrige ; (b) livrerait un lot qui laisse ouverte, par écrit, la porte qu'il vient de
fermer. Et (a) est **mesurable** (CA-6), ce que (b) n'est pas.

### AR-5 — La limite déjà déclarée de `useLiveStatus`

- **(a)** **Laisser intacte** la limite « fraîcheur ≠ process vivant » et **ajouter** une seconde
  limite, distincte, au point de décision.
- **(b)** **Fusionner** les deux dans le paragraphe existant.
- **(c)** **Remplacer** la limite existante.

**Recommandation : (a), fermement.** § 2.6 : les deux limites portent sur des axes indépendants
(« est-ce que ça tourne » vs « à qui l'imputer »), et sur une session attachée la première est
**satisfaite** pendant que la seconde est **violée**. (c) effacerait une limite encore vraie ;
(b) fabriquerait un paragraphe qui laisserait croire que le hook est fautif — il ne l'est pas.

### AR-6 — Le témoin positif du harnais de jonction

- **(a)** **Dans le même fichier** : ajouter au harnais attaché un cas `owned` qui, **avec le même
  geste et le même tick**, affiche bien « travaille ».
- **(b)** **Se contenter du contrefactuel** (révoquer la correction doit faire rougir).
- **(c)** Les deux.

**Recommandation : (c), et (a) est la partie non négociable.** § 2.8 : une assertion négative
dépendante d'une horloge peut être verte **parce que le tick n'a pas eu lieu** — c'est le témoin vide
de L42-F1, transposé au temps. Le contrefactuel (b) seul est un geste **de gate**, joué une fois ;
le témoin positif (a) est **conservé dans le dépôt** et rougit **le jour où** `useNow` change de
comportement. Coût : un second cas dans un harnais qui existe déjà des deux côtés
(`identityJunction.test.tsx` monte l'App en `owned`, `identityAttachedJunction.test.tsx` en
`attached`).

---

## 7. Risques

| Risque | Mitigation |
|---|---|
| **Casser le signal honnête** (point d'onglet / chip Étagère) en coupant `live.mark` | AR-2 = (a) : on ne touche pas au marquage. **CA-4** l'exige **en positif** : après le geste externe, le point d'onglet **doit** rester `running`. |
| **Rouvrir en boucle les conversations attachées** en restreignant `liveProjectIds` | F1 : ensemble **distinct**, `liveProjectIds` inchangé (`App.tsx:633,642` = réconciliation eager L24-F1). **CA-7**. |
| **Retomber sur le repli L8** en passant `rosterLiveStatus={undefined}` | F2 : une entrée existe pour **chaque** membre. **CA-2** assert « aucun "travaille" », ce que le repli violerait. |
| **Garde vacuous à cause de l'horloge** (verte parce que le tick n'a pas eu lieu) | § 2.8 + AR-6 : tick **déterministe** par `visibilitychange`, **plus** témoin positif conservé. **CA-3**. |
| **Test flaky** (attente réelle, intervalle de 1 s qui tombe ou non) | Interdiction explicite : **aucun `setTimeout` réel** dans les gardes du lot. **CA-5**. Leçon L33. |
| **`waitFor` qui pend** sous faux timers | Fait mesuré § 2.8 (1) : si l'exécution choisit malgré tout `vi.useFakeTimers()`, **aucun `waitFor`** dans la fenêtre falsifiée. |
| **Régression de L46/L47** | **CA-8** : les gardes existantes passent **sans modification de leur attendu**. |
| **Attribution héritée après bascule** | AR-4 = (a), **CA-6**. |

---

## 8. Fichiers concernés

| Chemin | Ce qui change |
|---|---|
| `src/hooks/useLiveStatus.ts` | F1 (`ownedConversationIds`), F4 (`forget`), renommage + doc du paramètre de `deriveRosterLiveStatus`, **seconde limite déclarée** (AR-5). La limite existante (l. 10-15) **n'est pas touchée**. |
| `src/App.tsx` (~252-255, ~410-428, `startRunnerForActive`) | F2 : ensemble `ownedProjectIds` **distinct** ; F4 : purge à la bascule ; hors-couverture Analytics écrit sur `coordinatorOfProject` (~660-663). |
| `src/components/Chat.tsx` (~297,299,306) | F3 : repli de nom **et** vignette conditionnés à `identityKnown` (AR-3). |
| `src/views/WorkingView.tsx` (~804-828) | F3 : passe `identityKnown` depuis `active.source`. |
| `src/__tests__/identityAttachedJunction.test.tsx` | CA-2, CA-3 (verrou), CA-4, CA-6, CA-9 — le harnais **existe déjà** et monte l'App en mode attaché. |
| `src/__tests__/useLiveStatus.test.ts` *(ou voisin)* | CA-1 (pure). |
| `src/i18n/locales/{fr,en}.ts` | **Seulement si AR-1 = (b)** ; sinon **aucun changement**. |
| `CLAUDE.md` | Entrée de backlog du lot + clôture datée de **S-1 de L46** + inscription du successeur Analytics (§ 2.9). |
| `src-tauri/**` | **Aucun changement.** |

---

## 9. Critères d'acceptation

> Règle du dépôt, rappelée : **toute garde doit pouvoir rougir**. Chaque CA porte son
> **contrefactuel** — la mutation, faite **dans le programme** (jamais dans l'attendu), qui doit le
> faire échouer **nommément**, puis être **révoquée avec preuve** (`git diff` vide ou `sha256`
> identique).

- [ ] **CA-1 — Le prédicat de possession est pur et non vacuous.** `ownedConversationIds` ne retient
      que `source === "owned"`. *Vérif* : test unitaire sur une liste mêlant les deux sources.
      *Contrefactuel* : lui faire retenir aussi les `attached` → rouge **en nommant l'id** indûment
      retenu. **Ce CA ne suffit PAS** : le défaut vit à la jonction, et il faut l'écrire ici même.
- [ ] **CA-2 — JONCTION (le CA qui compte) : un geste d'une session ATTACHÉE n'allume aucun agent.**
      Sur le harnais `identityAttachedJunction.test.tsx` (App montée, `latest_transcript` renvoie une
      session externe), émettre un `RunnerEvent` `kind:"geste"`, **forcer un tick déterministe**
      (§ 2.8), puis asserter : la ligne du coordinateur porte **« non lancé »** et **aucune** ligne
      du roster ne porte **« travaille »**. *Contrefactuel* : rendre `liveProjectIds` au lieu de
      `ownedProjectIds` dans `App.tsx` → **ce test-là, et lui seul, rougit nommément**.
- [ ] **CA-3 — LE VERROU : le harnais peut produire un « travaille ».** Cas **positif** conservé
      dans le dépôt : même scénario en mode **`owned`** (calque `identityJunction.test.tsx`), même
      geste, **même procédure de tick** → la ligne du coordinateur porte bien **« travaille »**.
      **Sans ce cas, CA-2 est un témoin vide** : il serait vert si le tick n'avait jamais lieu, ou si
      aucun event n'atteignait `mark`. *Contrefactuel* : supprimer le tick de ce cas positif → il
      rougit (preuve que le tick est bien ce qui décide).
- [ ] **CA-4 — On n'a PAS réparé en supprimant une information vraie.** Dans le même cas attaché que
      CA-2, le **point d'onglet** reste `running` (`.pt-status.running`, `ProjectTabs.tsx:102-104`)
      et le badge « session vivante · lecture seule » reste affiché. *Contrefactuel* : couper
      `live.mark` pour les conversations attachées (option AR-2 (c)) → **CA-4 rougit** alors que
      CA-2 resterait vert — c'est précisément ce que ce CA existe pour attraper.
- [ ] **CA-5 — Aucune garde du lot ne dépend du temps réel.** *Vérif* : les fichiers de test touchés
      ne contiennent **ni** `setTimeout` réel d'attente, **ni** `await new Promise(r => setTimeout…)`,
      **ni** `vi.advanceTimersByTime` accompagné d'un `waitFor` dans la fenêtre falsifiée (§ 2.8 (1)).
      La technique employée est **écrite dans l'en-tête du fichier**, avec son couplage à `useNow`.
      *Contrefactuel* : aucun — exigence de forme, assumée comme telle, **vérifiée par lecture**.
- [ ] **CA-6 — Bascule `attached` → `owned` : aucune fraîcheur héritée** *(dépend d'AR-4 = (a))*.
      Après un geste externe puis « démarrer un runner », le coordinateur **ne porte pas**
      « travaille » tant que le runner neuf n'a rien émis. *Contrefactuel* : retirer l'appel à
      `forget` → rouge.
- [ ] **CA-7 — L'ouverture eager L24-F1 est intacte.** `liveProjectIds` reste l'ensemble de
      **toutes** les conversations : une conversation attachée n'est **jamais** rouverte en boucle.
      *Vérif* : le nombre d'appels d'ouverture reste borné sur le harnais attaché.
      *Contrefactuel* : restreindre `liveProjectIds` aux `owned` → rouge (réouverture répétée
      observée).
- [ ] **CA-8 — Non-régression intégrale de L46 et L47.** Les deux cas de
      `identityAttachedJunction.test.tsx` (geste non attribué ; bandeau des délégations absent), les
      gardes de `identityJunction.test.tsx` et celles de la pastille passent **sans modification de
      leur attendu**. *Contrefactuel* : neutraliser la coupe `conv.source` de `identityFor`
      (`App.tsx:197`) → rouge sur les tests de L46, pas sur ceux de ce lot (les deux canaux sont
      **distincts**, et cette indépendance est elle-même une information).
- [ ] **CA-9 — La parole attachée ne porte aucun nom d'emprunt** *(F3, AR-3)*. Sur le harnais
      attaché, un event `kind:"parole"` `role:"assistant"` produit une bulle **sans `.bwho`** et
      **sans vignette de gouttière**. **Verrou** : le cas **positif** `owned` du même fichier doit,
      lui, afficher le nom — sinon l'assertion serait satisfaite par une bulle qui ne s'affiche pas
      du tout. *Contrefactuel* : retirer la condition dans `Chat.tsx` → rouge **en montrant le nom
      fautif**.
- [ ] **CA-10 — Hors couverture écrit dans le code.** Les quatre bornes du § 5 (fraîcheur ≠ process
      vivant ; activité attachée non imputable, **sans condition de levée** ; Analytics hors
      d'atteinte, sur `coordinatorOfProject` ; badge du runner externe laissé verbatim) portent leur
      motif **dans le fichier concerné**. *Vérif* : lecture. *Contrefactuel* : aucun — exigence de
      forme.
- [ ] **CA-11 — `bash scripts/quality.sh` exit 0**, front + Rust, chiffres **recomptés** (jamais
      recopiés d'un rapport antérieur ; le dernier compte connu est **977 front / 346 Rust**, et
      **il doit être re-mesuré, pas cité**). Rust attendu **non touché** (`git diff` vide sur
      `src-tauri/`).
- [ ] **CA-12 — RECETTE RÉELLE (gate humain, hors ligne).** `npm run tauri dev`, projet lié à une
      team **avec une session Claude Code externe vivante** dans son répertoire : ouvrir le projet,
      constater que le roster n'affiche **personne** en « travaille » pendant que la session externe
      travaille, et que l'onglet, lui, **est bien allumé**. **Non couvert par les tests** — c'est le
      seul point où l'on voit les deux canaux **ensemble**.

---

## 10. Estimation — jalon P1→P2

- **Équivalent jour-homme (spec fermée)** : **0,6 à 1 j-homme**.
  Répartition : F1 + F2 ≈ 0,1 j ; F3 (`Chat`/`WorkingView`) ≈ 0,1 j ; F4 ≈ 0,05 j ;
  **tests + les dix contrefactuels ≈ 0,3 à 0,6 j** — poste principal, **et cette fois avec une
  difficulté propre** : la maîtrise de l'horloge dans une App montée (§ 2.8) ; doc, hors-couverture,
  backlog et clôture datée de S-1 ≈ 0,1 j.
- **Complexité / risque** : **très faible en code, ÉLEVÉ en vérification.** Le code utile tient en
  une poignée de lignes et reproduit un geste déjà validé (AR-2, motif 3). Le risque n'est pas de
  casser : il est d'écrire une garde **verte pour la mauvaise raison** — ici, parce que le tick n'a
  pas eu lieu. C'est le seul lot de la série où **le temps entre dans la garde**.
- **Inconnues susceptibles de faire glisser l'estimation** :
  1. **Le tick déterministe** (§ 2.8 (2)) : si le double `visibilitychange` ne suffit pas dans le
     harnais App complet, il faut basculer sur `vi.useFakeTimers()` **et purger tous les `waitFor`**
     de la fenêtre falsifiée (fait mesuré § 2.8 (1)) : **+0,2 j**.
  2. **AR-1 = (b)** — 4ᵉ état : type + CSS + i18n fr/en + tests : **+0,2 j**.
  3. **AR-6** — le témoin positif suppose de monter l'App en `owned` **dans le fichier attaché**
     (deux `describe` à harnais différents dans un même fichier, ou un second fichier) : **+0,1 j**
     si le harnais résiste.
  4. **CA-7** — si la mesure du nombre d'ouvertures n'est pas exprimable simplement sur le harnais,
     le CA se replie sur une garde de non-régression du memo : **+0,1 j**.
  5. **CA-12** — recette réelle : dépend d'une session du décideur, **hors du temps agent**.

*Ce n'est pas un engagement ferme : un ordre de grandeur assumé et révisable, à confronter au temps
réel à la clôture du lot.*

---

## 11. Ce que ce cadrage CONFIRME et ce qu'il CONTREDIT dans l'ordre de mission

Par honnêteté de lecture, et parce que ces points changent des décisions :

1. **CONFIRMÉ** — « c'est la même fabrication que le défaut bloquant de L46, sur un canal
   différent ». Vérifié ligne à ligne : même donnée absente (`conv.source`), même forme de
   correctif, même nature de garde (jonction).
2. **CONTREDIT / COMPLÉTÉ** — l'ordre de mission demande « combien de canaux ». La réponse n'est
   **pas** « un » : il y en a **deux** à corriger. Le second (`.bwho` + vignette de gouttière,
   `Chat.tsx:297,299,306`) **n'avait été relevé ni par L46 ni par L47**, et le fichier de garde de
   L46 le range implicitement parmi les apparitions « légitimes » (`identityAttachedJunction.test.tsx:265-267`).
   Il est **plus visible** que celui qui a été signalé.
3. **NUANCÉ** — S-1 cite `src/App.tsx:158-167` et `:401-425`. Sur `main`@`456e7d6` les bornes exactes
   sont **`:159-168`** (`ingestRunnerEvent`, marquage l. **165**) et **`:402-428`** (`activeCoordinatorName`
   + `rosterLiveStatus`). Décalage d'une à quatre lignes, sans conséquence : le diagnostic est juste.
4. **NUANCÉ** — « le statut vivant du roster attribue le coordinateur ». Exact, et **borné** : le
   défaut ne peut toucher **que** la ligne du coordinateur, et **que** lorsque la conversation
   **active** est attachée (§ 2.3). Les slots d'agents sont toujours `owned`.
5. **CONTREDIT** — sur la limite déjà déclarée, l'ordre de mission propose « l'étendre, la remplacer,
   ou en ajouter une autre ». La réponse est **la troisième**, et pour une raison qui n'est pas de
   commodité : l'étendre serait **faux**, parce qu'en mode attaché la limite existante est
   **satisfaite** (le signal de fraîcheur est vrai) pendant que la nouvelle est **violée** (§ 2.6).
6. **RÉPONSE FRANCHE** — le successeur Analytics nommé par L46 (schéma `subagents/` de claude 2.1.261)
   **ne touche pas ce lot**, ni dans un sens ni dans l'autre (§ 2.9). En revanche, un **autre** point
   d'Analytics — `coordinatorOfProject` — est bien de la même famille, et il est **hors d'atteinte**
   pour une raison structurelle, pas par confort.
7. **FAIT MESURÉ QUI CHANGE LA MÉTHODE DE TEST** — l'ordre de mission signale « la sonde du gate a dû
   attendre 1,2 s réelles ». Le piège est **pire** que ça : une attente réelle rend la garde
   **flaky** (l'intervalle de 1 s peut tomber ou non). Et la parade réflexe — `vi.useFakeTimers()` —
   **pend** dans ce dépôt, parce que `@testing-library/dom` ne détecte les faux timers que via
   `typeof jest !== 'undefined'` (lu sur le disque : `node_modules/@testing-library/dom/dist/helpers.js:14-27`).
   Il existe une troisième voie, déterministe et déjà employée ici : forcer le tick par
   `visibilitychange` (§ 2.8 (2)).
8. **Le lot VAUT d'être fait** — la question était posée. Il est petit, sa cause est identifiée, il
   ferme un signalement mesuré **et** un canal que personne n'avait vu. Ce qu'il ne faut **pas**
   faire, en revanche, c'est le fondre dans un lot Analytics : § 2.9 montre que l'autre moitié du
   problème demande un arbitrage produit distinct.

---

## 12. Sources

**Fait externe vérifié le 2026-09-05** — faux timers et `waitFor` : la documentation de Testing
Library recommande explicitement d'installer/désinstaller les faux timers autour de chaque test et
signale que leur combinaison provoque des expirations ; la documentation de Vitest confirme que ses
faux timers reposent sur `@sinonjs/fake-timers` et n'avancent qu'à l'appel explicite de
`vi.advanceTimers…()` (mode manuel par défaut).

- [Testing Library — « Using Fake Timers »](https://testing-library.com/docs/using-fake-timers/)
- [Vitest — `fakeTimers` (config)](https://vitest.dev/config/faketimers)
- [Vitest — API `vi`](https://vitest.dev/api/vi.html)

**Fait mesuré sur ce poste, qui prime sur la documentation** : la détection est gardée par
`typeof jest !== 'undefined'` dans la copie installée —
`node_modules/@testing-library/dom/dist/helpers.js:14-27`. Vitest n'expose pas `jest` : la détection
rend `false`.

**Faits internes, mesurés et non sourcés sur le web** (§ 2.1 à 2.8) : sources `src/` de ce dépôt sur
`main`@`456e7d6`, instructions `specs/instructions/identite-du-runner-badge-et-team.md` (L46) et
`specs/instructions/pastille-du-badge-runner.md` (L47), entrées **L46**/**L47** de `CLAUDE.md`
(l. 1420-1534).
