# Instruction : L8 — Conversation projet (chat/shell + roster team)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution, P2), gate 🏹 Legolas (P3).
> **Statut : à valider par Stéphane** avant exécution. Doc en français, code/identifiants en anglais.
> **Lot métier #8** de MOVE 3 (dev). Antérieurs : L0 (socle, PASS), L1 (backend salvagé, PASS), L2
> (vues UI + PTY xterm réel, PASS), L3 (moteur prochaine étape, PASS), L4 (mains courantes lecture
> seule, PASS), L6 (canal adresse sortant n8n, PASS), L7 (seed démo dev, PASS). L5 = traçage MACHINE
> des délégations (tooling méthode, hors app).
>
> Réf. vision : `specs/PROJET.md` § 3.1/3.2 (stack, façade unique D7), § 4 (vues Work + PTY par projet
> titré `[ROYAUME][Agent]`), § 5 (mains courantes 3-canaux), § 6 (modes présentation : B charté seul en
> v0.1, **C WhatsApp = horizon**), § 9 (scope v0.1) ; `CLAUDE.md` (archi front D7 façade unique ;
> socle sécurité L0 : `pathguard`, `paths`/`IAKAFRAME_ROOT`, config SQLite non sensible, secrets
> keychain, CSP stricte ; conventions « mocker les API en dev », « MVP d'abord », « réutiliser
> l'existant », « pas de god-component, hooks séparés »).
>
> **Code inspecté en lecture seule le 2026-06-26** (rien n'est supposé) : `src/views/WorkingView.tsx`,
> `src/components/PtyTerminal.tsx`, `src/components/NextStepPanel.tsx`, `src/hooks/{useGridState,usePty,
> useNextStep,useDemoSeed}.ts`, `src/mock/demoTeam.ts`, `src/api/backend.ts`, `src/App.tsx`,
> `src/theme/app.css` ; `src-tauri/src/ai.rs` (client OpenAI-compat L3). **Fait technique vérifié sur le
> web (2026-06-26, cf. § Sources)** : Ollama expose `/v1/chat/completions` (OpenAI-compat) acceptant un
> `messages[]` **multi-tours** (system/user/assistant) — exactement la forme déjà construite par
> `call_endpoint` de `ai.rs`.

---

## Objectif

Suite à un **retour terrain de Stéphane** en testant la démo : la vue **Working** affiche aujourd'hui
**N onglets PTY** (le seed L7 en ouvre 5, un par agent), un panneau « prochaine étape » et un terminal.
Le retour est sans équivoque :

> **« 1 projet = 1 conversation active »**, cette conversation doit être **interactive** (« style
> WhatsApp, ou PTY mais avec la possibilité de taper »), et **« où est mon powershell ? »** (il
> cherchait son shell).

L8 **rework la vue Working** pour matérialiser ce modèle. Décisions **ARRÊTÉES** par Stéphane (à
cadrer, **pas à rediscuter**) :

1. **Une seule conversation active par projet**, avec **bascule Chat ↔ Shell** (toggle) :
   - **Shell** = le **terminal PTY typeable existant** (`PtyTerminal`, L2 — la frappe marche **déjà** :
     `term.onData → pty.write`), **plein cadre** (fin de l'encombrement multi-onglets). **Le terminal
     in-app doit reproduire le TERMINAL RÉEL de l'utilisateur** (AR-2 enrichi) : shell de **login
     interactif** sourçant son profil (`~/.zshrc`/`~/.zprofile` : prompt, alias, env, PATH), indiscernable
     du terminal d'où il lance Claude Code (cf. **D10**).
   - **Chat** = **bulles type WhatsApp** : l'utilisateur tape, **l'agent répond via Ollama** (réutilise
     le client IA L3 `ai.rs` / l'endpoint OpenAI-compat configuré). Dialogue **multi-tours**. **Chat =
     mode par défaut** d'une conversation (AR-2 TRANCHÉ). **Interlocuteur par défaut = le RESPONSABLE**
     (Aragorn en contexte projet, Odin en contexte portefeuille) ; le chat est **persona-aware** (D2/D3).
2. **Team = widget ROSTER** (pastilles `[ROYAUME][Agent]` + **statut attend/travaille**), **PAS** 5
   onglets PTY. **Cliquer un agent → démarre une ligne `@agent : `** dans la saisie pour s'adresser
   directement à lui (le système répond « en tant que » cet agent — persona via prompt) (D6).
3. **Ajuster le seed L7** : `useDemoSeed` n'ouvre **plus 5 onglets** ; il prépare **UNE conversation**
   pour le projet démo + le roster (les 5 du seed). Le lot **réconcilie avec L7 sans le casser**.

**L8 réutilise tout : PTY (L2) et client IA (L3) via la façade unique. On change l'ENVELOPPE
(modèle « conversation » + UI), pas les capacités techniques.** Aucune réécriture du PTY, aucune
réécriture du transport IA. **Seul ajustement bas-niveau** : le socle L0 `shell` doit spawner un
**login shell interactif** sourçant le profil (D10) — c'est la condition du « terminal réel ».

> **Arbitrages AR-1..AR-5 — TRANCHÉS par Stéphane (2026-06-26).** AR-1 = interlocuteur = **responsable**
> (Aragorn projet / Odin portefeuille) + roster avec statut + **clic = `@agent:`** (persona-aware, routage
> réel différé) ; AR-2 = **ouverture en chat** + **terminal réel** (login interactif, profil sourcé) ;
> AR-3 = **5 agents** ; AR-4 = prompt **persona-aware** (texte à confirmer) ; AR-5 = **un seul bloc**
> (P1+P2 livrés ensemble, un seul gate ; structuration P1/P2 = guide d'implémentation interne). Détail
> en § Points ouverts (tous gravés dans les décisions ci-dessous).

> **Note de scope vis-à-vis du PROJET.md § 6.** La vision range le **mode WhatsApp (mode C)** en
> *horizon*. Ici, le chat WhatsApp **n'est pas un mode de présentation global** (le commutateur A/B/C
> reste différé) : c'est l'**UI de la conversation IA d'un projet** (le canal « parler à l'agent »),
> distincte du mode d'affichage du terminal. Décision de Stéphane (retour terrain) qui prime, § 1
> PROJET.md (« la vision de Stéphane prime »). On le trace ici sans rouvrir le commutateur A/B/C.

---

## Contexte

### Pourquoi ce lot maintenant
Le seed L7 (gate PASS) a produit une démo **fonctionnelle mais déroutante** à l'usage : 5 onglets PTU
juxtaposés brouillent le message « 1 projet = 1 conversation », et l'utilisateur ne **retrouve pas son
shell** dans le bruit des onglets. Le besoin est de **simplifier l'enveloppe** : une conversation par
projet, deux modes clairs (parler à l'agent / piloter le shell), et la team **listée** (roster) plutôt
qu'**éclatée en terminaux**.

### Ce que l'existant fournit déjà (à RÉUTILISER, ne RIEN réimplémenter)

| Brique | Où | Ce qu'on en fait en L8 |
|---|---|---|
| **PTY typeable** (`term.onData → pty.write`) | `src/components/PtyTerminal.tsx` (L2) | **réutilisé tel quel** comme **vue Shell** plein cadre. La frappe marche déjà — **ne rien réécrire** |
| `usePty` (open/write/resize/close + events) | `src/hooks/usePty.ts` (L1/L2) | cycle de vie PTY **inchangé** ; une session par conversation |
| **Client IA OpenAI-compat** (`call_endpoint`, `messages[]` system+user, `should_mock`, dégradation) | `src-tauri/src/ai.rs` (L3) | **socle du chat multi-tours** : généraliser `[system,user]` → `[system, …historique…]` |
| `build_context(path)` (specs + git, validé `pathguard`) | `src-tauri/src/ai.rs` (L3) | **injecter le contexte projet** dans le message système du chat (réutilisé) |
| `should_mock` + flag `IAKACOCKPIT_AI_MOCK` + mock déterministe | `src-tauri/src/ai.rs` (L3) | **même dégradation** pour le chat : endpoint vide / flag → réponse mockée, jamais de crash |
| `nextStep()` façade + `NextStep` type | `src/api/backend.ts` (L3) | **patron** à calquer pour `chat(...)` (même endroit, même style typé) |
| `useGridState` (onglets `PtyTab` + vues) | `src/hooks/useGridState.ts` (L2) | **refactor de l'enveloppe** : de « N PtyTab » à « 1 conversation par projet (mode chat\|shell) » |
| `WorkingView` (worklist + tabsbar + workbody) | `src/views/WorkingView.tsx` (L2) | **rework** : worklist (inchangée) + **roster** + **espace conversation** (toggle chat/shell) |
| `NextStepPanel` / `useNextStep` | `src/components/NextStepPanel.tsx` + hook (L3) | **conservé** (la « prochaine étape » reste une action one-shot) ; repositionné (D5) |
| `useDemoSeed` + `DEMO_TEAM` | `src/hooks/useDemoSeed.ts` + `src/mock/demoTeam.ts` (L7) | **réconcilié** : prépare 1 conversation + roster, **n'ouvre plus 5 onglets** (D7) |
| Charte / tokens CSS | `src/theme/{tokens,app}.css` | **réutilisée** : bulles chat + roster habillés par l'iakacharte (pas de CDN, CSP intacte) |

### Le fait technique qui rend le chat multi-tours quasi-gratuit
`call_endpoint` (ai.rs) **construit déjà** un payload OpenAI exactement de la forme :
```jsonc
{ "model": …, "messages": [ {"role":"system",…}, {"role":"user",…} ], "stream": false }
```
Le **chat multi-tours** est la **même requête** avec un `messages[]` **plus long**
(`system` + N tours `user`/`assistant`). Ollama l'accepte (`/v1/chat/completions`, vérifié web). Donc
le travail Rust = **généraliser la signature** (recevoir un historique au lieu d'un seul `user`),
**pas** un nouveau client HTTP.

---

## Décisions (numérotées)

### D1 — Modèle de données : « 1 conversation par projet » avec mode (`chat` | `shell`)

On **remplace** l'abstraction « liste de N `PtyTab` » par une abstraction **« conversation par
projet »**. Une conversation porte : le projet, le **mode courant** (`chat` | `shell`), l'**id de
session PTY** (pour le shell), et l'**historique chat** (en mémoire MVP, D3).

- **Contrat (fermé)** — nouveau hook `useConversations` (remplace l'usage « onglets PTY » de
  `useGridState` dans Working) :
  ```ts
  export type ConvMode = "chat" | "shell";
  export interface ChatTurn { role: "user" | "assistant"; content: string; }
  export interface Conversation {
    projectId: string;          // un projet = une conversation (clé d'unicité)
    title: string;              // nom de projet (libellé)
    cwd: string;                // chemin projet (cwd PTY + path contexte IA)
    mode: ConvMode;             // mode affiché (toggle D4) — défaut "chat" (AR-2 TRANCHÉ, cf. D4)
    agent: string;              // interlocuteur courant (persona) — défaut = responsable (D3) ;
                                //   p.ex. "Aragorn" en projet, redéfini par un @mention (D6)
    ptySessionId: string;       // id de session PTY stable (survit au toggle, D4)
    history: ChatTurn[];        // historique chat multi-tours (mémoire MVP, D3)
    pending: boolean;           // une requête chat est en vol (UI : input désactivé)
    error: string | null;      // dernière erreur chat lisible (dégradation D3)
  }
  ```
- **Une conversation par projet** : ouvrir un projet déjà ouvert **ré-active** sa conversation (calque
  exact de `useGridState.openTab` qui dédoublonne déjà par `projectId`). **Pas** de multi-conversations
  pour un même projet.
- **`useGridState` reste** le porteur des **3 vues** (`portfolio | working | settings`). On **retire**
  de `useGridState` la responsabilité « onglets PTY » (déplacée dans `useConversations`) **OU** on
  garde `useGridState` pour la navigation et on ajoute `useConversations` à côté — **reco** : **hook
  séparé `useConversations`** (un hook par préoccupation, D6 socle), `useGridState` ne garde que la
  navigation 3-vues. **À trancher en implémentation** (Notes Gimli), sans god-component.
- **Raison** : le besoin terrain est « 1 projet = 1 conversation ». L'abstraction « N onglets » ne le
  porte pas. On ferme le modèle pour éviter que Gimli bricole une liste d'onglets déguisée.

### D2 — Chat multi-tours via Ollama : nouvelle commande façade `chat(path, messages)` calquée sur `ai.rs`

- **Commande Tauri** (dans `ai.rs`, **à côté** de `next_step` — même module, même client) :
  ```rust
  /// Un tour de chat projet, EN TANT QUE l'agent `agent` (persona). Réutilise build_context,
  /// should_mock, call_endpoint (généralisé). Dégrade proprement (Err lisible), comme next_step.
  #[tauri::command]
  pub fn chat(app: AppHandle, path: String, agent: String, messages: Vec<ChatMessage>)
      -> Result<ChatReply, String>
  ```
  avec :
  ```rust
  #[derive(Deserialize)] pub struct ChatMessage { pub role: String, pub content: String } // user|assistant
  #[derive(Serialize)]   pub struct ChatReply  {
      pub content: String,            // réponse de l'agent (assistant)
      pub provider: String,           // "litellm" | "mock"
      pub model: Option<String>,
      pub tokens_in: Option<u32>,
      pub tokens_out: Option<u32>,
  }
  ```
- **Construction du payload** : `[ {system: build_prompt_chat(agent, build_context(path)) }, ...messages ]`.
  On **généralise** `call_endpoint` pour accepter un **`Vec` de messages** (au lieu de `system`+`user`
  figés) — le reste (URL, `Authorization` omis sans clé, timeout, parsing `choices[0].message`/`usage`)
  est **identique**. `next_step` continue d'appeler la même fonction avec son couple `[system, user]`.
- **Prompt système chat PERSONA-AWARE (AR-1/AR-4 TRANCHÉS)** : `build_prompt_chat(agent, ctx)` reflète
  **l'agent courant** — son **nom**, son **royaume** et son **rôle** dans la méthode iakaframe (p.ex.
  *Aragorn = ACCUEIL/dispatch — responsable projet* ; *Odin = PORTEFEUILLE — responsable portefeuille* ;
  *Gandalf = CADRAGE* ; *Gimli = DEV* ; *Legolas = QUALITÉ*), plus le **contexte projet** (specs+git
  injecté). L'agent **discute** du projet en tenant ce rôle. Le mapping `agent → (royaume, rôle)` est
  une **constante** côté Rust (ou passée depuis le front — à trancher impl ; reco : une petite table Rust
  pour rester autonome). ⚠️ **Texte du prompt à confirmer par Stéphane** (comme `build_prompt` L3 / A4) :
  Gimli **propose** le texte persona-aware, Stéphane ajuste. **Grave que le prompt EST persona-aware** ;
  seul le wording reste « à confirmer ». Si `agent` est inconnu/vide → fallback responsable par défaut
  (jamais d'erreur).
- **Mock & dégradation** : **réutilise `should_mock`** (endpoint vide / `IAKACOCKPIT_AI_MOCK=1`) →
  réponse mockée déterministe (ex. « [MOCK] réponse simulée — configure un endpoint IA pour discuter
  réellement »). Endpoint injoignable / réponse vide → **`Err(String)` lisible** (jamais de panique),
  **exactement** comme `next_step`.
- **Façade** : `chat(path, messages): Promise<ChatReply>` + types miroir dans `backend.ts`, exposée
  dans l'objet `backend`. **Aucun `invoke` hors façade.** Le contexte IA **borné** (specs+git, cap
  existant `head(...)`) est réinjecté à chaque tour (MVP) — **pas de RAG** (annulé, PROJET § 10.3).
- **Raison** : « réutilise le client IA L3 / le même endpoint/clé/mock/dégradation » (décision arrêtée).
  Une commande dédiée `chat` (plutôt qu'étendre `next_step`) garde **`next_step` intact** (one-shot,
  testé, gate PASS) et donne un contrat clair, calqué sur l'existant.

### D3 — Interlocuteur = RESPONSABLE par défaut + `@agent` (AR-1 ENRICHI, TRANCHÉ) ; historique en mémoire (MVP)

- **Interlocuteur par défaut = le RESPONSABLE** (AR-1 TRANCHÉ — première orientation de Stéphane,
  gravée) :
  - **Aragorn** (ACCUEIL/dispatch) en **contexte projet** (la conversation d'un projet du set de Work) ;
  - **Odin** (PORTEFEUILLE) en **contexte portefeuille** (si une conversation portefeuille existe — en
    L8 la conversation vit dans Working/projet, donc l'interlocuteur par défaut concret est **Aragorn** ;
    le cas Odin/portefeuille est **tracé** pour cohérence et activé quand une conversation portefeuille
    sera ouverte).
  - **Pas** « un agent projet générique » : c'est **nommément** le responsable. Le champ
    `Conversation.agent` est initialisé à ce responsable.
- **`@agent` — s'adresser directement à un autre agent (AR-1 TRANCHÉ)** :
  - **Cliquer un agent du roster** (D6) **insère une ligne `@agent : `** comme **préfixe de saisie**
    dans le champ de message (ex. `@Gandalf : `). L'utilisateur complète son message.
  - À l'envoi, l'`@agent` détermine la **persona courante** passée à `chat(path, agent, messages)` (D2) :
    le système **répond « en tant que » cet agent** (prompt persona-aware). Le champ `Conversation.agent`
    devient cet agent pour ce tour (et reste affiché comme interlocuteur courant).
  - **MVP vs différé (FERMÉ)** : ce qui est **MVP en L8** = (a) l'insertion du préfixe `@agent:`, (b) le
    **changement de persona** (le system prompt reflète l'agent mentionné), (c) l'affichage de
    l'interlocuteur courant. Ce qui est **DIFFÉRÉ/tracé** = le **routage multi-agent RÉEL**
    (orchestration : plusieurs agents qui se répondent/délèguent, exécution autonome) → **DEP-1**, hors
    L8. **On ne surdimensionne pas** : en L8, `@agent` = **un seul appel `chat` avec une persona
    choisie**, pas un orchestrateur.
- **Historique en mémoire** (état React dans `useConversations`, champ `history`). **Pas de persistance
  SQLite/CouchDB en L8** : MVP d'abord. Fermer/rouvrir l'app **repart d'un historique vide** — acceptable
  pour le MVP, **tracé** (persistance + lien aux mains courantes 3-canaux iakaboxlogs = **DEP-2**, lot
  futur, pas L8).
- **Raison** : AR-1 enrichi par Stéphane — l'interlocuteur n'est pas anonyme mais **le responsable**, et
  le roster devient **adressable** (`@agent`) sans pour autant ouvrir l'orchestration multi-agent (bornée
  à un changement de persona). MVP qui livre un fil interactif **incarné**, extensible vers le routage réel.

### D4 — Toggle Chat/Shell : un seul espace, deux modes ; le PTY SURVIT au toggle (ne pas tuer le shell)

- **Un seul espace de conversation** (plein cadre), un **toggle** (segmented control / 2 boutons)
  bascule `mode` entre `chat` et `shell`. Le toggle **ne change que l'affichage**, pas le cycle de vie.
- **Le PTY survit (DÉCISION FERMÉE)** : passer en `chat` **ne ferme PAS** la session PTY. Le shell reste
  **vivant en arrière-plan** ; revenir en `shell` **retrouve la même session** (même `ptySessionId`,
  même historique de terminal). Implémentation : **monter le `PtyTerminal` une fois** et le **masquer
  en CSS** (`display:none`) quand `mode === "chat"`, **plutôt que le démonter** (le démontage déclenche
  `pty.close` via le cleanup de `PtyTerminal`, R-L2-4 — ce qu'on **veut éviter**). ⚠️ **Point dur** :
  `PtyTerminal` ferme la session à son `useEffect` cleanup ; donc **garder le composant monté** (caché)
  est la voie sûre. **Ne pas** conditionner son rendu par `&&` (qui le démonterait).
- **Mode par défaut : `chat` (AR-2 TRANCHÉ)** — une conversation s'ouvre en **chat** (l'utilisateur parle
  à son responsable/agent d'emblée). Le **shell est à un clic** (toggle), et **reproduit son terminal
  réel** (D10). *(Le shell n'est donc pas perdu — il est explicite via le toggle ; « où est mon
  powershell » est résolu par la **présence visible du toggle** + un shell **fidèle**, pas par
  l'ouverture par défaut.)*
- **Resize au retour shell** : quand on revient sur `shell`, xterm peut nécessiter un `fit()` (l'addon
  ResizeObserver de `PtyTerminal` gère déjà le redimensionnement ; vérifier qu'un terminal **caché puis
  ré-affiché** se refit correctement — sinon déclencher un resize au retour). **Critère de test manuel.**
- **Raison** : « éviter de tuer le shell en basculant » (décision arrêtée). Un shell qui meurt à chaque
  bascule serait inutilisable. Masquer ≠ démonter : c'est la garde technique centrale du lot.

### D5 — Layout Working reworké : worklist + roster + espace conversation (toggle) ; « prochaine étape » conservée

- **Structure cible** de `WorkingView` (3 colonnes / zones) :
  - **gauche — worklist** (set de Work) : **inchangée** (liste des projets + bouton import).
  - **centre — espace conversation** : barre de tête = **titre projet** + **toggle Chat/Shell** +
    (optionnel) bouton « prochaine étape ». Corps = **Shell** (`PtyTerminal` plein cadre, caché si chat)
    **OU** **Chat** (liste de bulles + zone de saisie).
  - **droite (ou en tête) — roster** : panneau team `[ROYAUME][Agent]` + statut (D6).
- **Plus de `tabsbar`** : la barre d'onglets PTY (5 onglets) **disparaît**. Une conversation = le projet
  sélectionné dans la worklist. (Sélectionner un autre projet = changer de conversation active.)
- **« Prochaine étape » conservée** (L3, gate PASS) : `NextStepPanel`/`useNextStep` **restent**.
  Repositionnement : soit un **bouton/onglet secondaire** dans la barre de tête de la conversation, soit
  un panneau repliable. **Ne pas supprimer** cette fonction. Placement exact = **détail UI** (Notes
  Gimli), tant que la fonction reste accessible et testée.
- **Raison** : matérialise « 1 conversation + roster + toggle » sans perdre l'acquis L3.

### D6 — Roster : widget team `[ROYAUME][Agent]` + statut attend/travaille ; clic = `@agent:` (AR-1/AR-3 TRANCHÉS)

- **Widget roster** (composant présentationnel `Roster`) : liste les agents `[ROYAUME][Agent]` avec un
  **statut** affichant au minimum **« attend »** (idle, disponible) vs **« travaille »** (un tour de
  chat le concernant est en vol — `pending`). Pastille colorée + libellé, réutilise la **charte** (tokens
  CSS). Le **responsable** (interlocuteur courant, D3) est **mis en évidence**.
- **Statut (MVP vs différé, FERMÉ)** : en L8 le statut est un **état LOCAL MVP** — « travaille » quand
  l'agent est l'interlocuteur d'un tour `chat` en cours (`Conversation.pending` + `agent` courant),
  « attend » sinon. Le **statut « vivant » temps réel** (lié à un moteur d'agents réel / iakaboxlogs) est
  **différé/tracé** (DEP-1). On ne branche **aucun** flux temps réel en L8.
- **Source de la liste (AR-3 TRANCHÉ : 5 agents)** : **les 5 du seed** (`DEMO_TEAM` :
  Odin/Aragorn/Gandalf/Gimli/Legolas). **Réutiliser `DEMO_TEAM`** (constante team L7) — pas de
  duplication. Extensible aux 8 plus tard (hors L8).
- **Comportement au clic (AR-1 TRANCHÉ)** : cliquer un agent **insère une ligne `@agent : `** comme
  **préfixe de saisie** dans le champ de message (ex. `@Gandalf : `) et **met en évidence** l'agent
  sélectionné. À l'envoi, ce `@agent` fixe la **persona** passée à `chat(path, agent, messages)` (D2/D3)
  → le système **répond « en tant que » cet agent**. **MVP = changement de persona** (un seul appel
  `chat`), **PAS** d'orchestration multi-agent (routage réel = DEP-1, différé). Si le message ne porte
  **aucun** `@agent`, l'interlocuteur reste le **responsable** par défaut (D3).
- **Raison** : AR-1 enrichi — le roster n'est plus « informatif » mais **adressable** (`@agent`), tout en
  restant borné à un **changement de persona** (pas un orchestrateur). On livre un roster **utile et
  incarné** sans ouvrir le moteur multi-agents.

### D7 — Réconciliation L7 : `useDemoSeed` prépare 1 conversation + roster, n'ouvre PLUS 5 onglets

- **`useDemoSeed`** (L7) : aujourd'hui il boucle sur `DEMO_TEAM` et appelle `openTab(...)` 5 fois. En
  L8 : il **ouvre UNE conversation** pour le projet démo (via `useConversations.openConversation(demo)`)
  et **ne crée plus 5 onglets PTY**. `DEMO_TEAM` **reste** mais alimente désormais le **roster** (D6),
  plus les onglets.
- **Ne pas régresser le gate L7** : les **autres garanties L7 sont préservées** — seed côté Rust
  **inchangé** (dossier démo + git + config), `seeded:false` en prod **inchangé**, exécution **unique**
  par session (`useRef`), démarrage sur **Portfolio** (AR-4 L7), refresh portfolio. **Seule change** la
  partie « ouverture d'onglets » → « ouverture d'une conversation ». Les **tests L7** touchés
  (`useDemoSeed.test`) sont **mis à jour** en conséquence (plus d'assertion « 5 openTab » ; à la place
  « 1 conversation ouverte si `conversations.length === 0` »).
- **Garde de non-doublon** : la condition L7 « n'ouvre que si rien n'est déjà ouvert » devient
  « n'ouvre la conversation démo que si **aucune conversation** n'est active » (calque exact).
- **Raison** : « reconcilier avec L7 sans le casser » (décision arrêtée). On chirurgicalise le seul
  point qui change (onglets → conversation), on préserve tout le reste du contrat L7.

### D8 — Frontière, façade & sécurité (héritage L0→L7 — non négociable)

- **Façade unique (D7 socle)** : `chat(path, messages)` est le **seul** nouveau pont. **Aucun**
  `invoke`/`fetch`/`listen` hors `src/api/backend.ts`. L'appel réseau IA reste **côté Rust** (`ureq`,
  via `ai.rs`) — **aucun client HTTP IA dans le front** (CSP).
- **CSP intacte (L0)** : aucun appel réseau front ajouté → **ne pas toucher** `connect-src` (jamais
  `null`). Les bulles chat sont du **rendu local** (pas de CDN, pas de WebGL nouveau). xterm reste bundlé
  local (L2). **Si Gimli croit avoir besoin d'élargir la CSP → STOP, signaler** (pas d'élargissement en
  douce — règle L0→L7).
- **`pathguard` (L0)** : `chat` valide le `path` projet via `validate_project_dir` + `build_context`
  (déjà fait par `ai.rs`) — **réutilisé**, pas de nouvelle lecture FS non gardée.
- **Pas de god-component** : `useConversations` (état), `Chat`/`Roster` (présentationnels),
  `PtyTerminal` (réutilisé), `WorkingView` (assemble) ; `App.tsx` **câble**. Hooks séparés (D6 socle).
- **Raison** : on **change l'enveloppe** d'une fonctionnalité, on ne déroge à **aucune** garde du socle.

### D10 — Terminal in-app = TERMINAL RÉEL de l'utilisateur (login shell interactif sourçant le profil) [AR-2 enrichi, TRANCHÉ]

> **Mot de Stéphane** : *« pour la conf du terminal : base-toi sur la conf du terminal que j'utilise pour
> te parler »*. L'objectif : le shell in-app doit être **indiscernable** de son terminal habituel (celui
> d'où il lance Claude Code) — **même prompt, mêmes alias, même env, même PATH**.

- **Constat sur le socle L0 (`shell.rs` inspecté)** : `default_shell()` résout bien le bon shell par OS
  (`$SHELL`/zsh sur macOS), **mais ne passe AUCUN argument** (`args: vec![]`). Un `zsh` spawné **sans
  `-l`** n'est **pas un login shell** : il **ne source pas** `~/.zprofile`/`~/.zlogin` (PATH, env de
  login), seulement `~/.zshrc` (interactif). Résultat possible aujourd'hui : un terminal in-app **au
  PATH/env appauvri** vs le terminal habituel de Stéphane (qui lance un **login shell**). C'est
  **précisément** ce que l'AR-2 enrichi corrige.
- **Ajustement L0 à faire (signalé)** : rendre le shell spawné **login + interactif** sourçant le profil :
  - **macOS/Unix** : passer **`-l`** (login) — et s'assurer du caractère **interactif** (un PTY rend déjà
    le shell interactif ; `-i` n'est généralement **pas** nécessaire avec un vrai PTY, mais le **login
    `-l`** l'est pour sourcer `~/.zprofile`). Cible : `zsh -l` (resp. `bash -l`). Le `~/.zshrc` est sourcé
    par zsh interactif ; `~/.zprofile`/`~/.profile` par le login.
  - **Windows** : `pwsh`/`powershell` chargent le profil par défaut (`$PROFILE`) en interactif — **ne pas
    casser** ce comportement (ne pas ajouter `-NoProfile`). *(Le besoin « terminal réel » est exprimé pour
    macOS ; garder Windows fonctionnel sans régression.)*
  - **Implémentation** : ajuster `shell::default_shell()` (ou la construction du `CommandBuilder`) pour
    **ajouter `-l`** sur Unix. **Mettre à jour les tests `shell.rs`** (aujourd'hui ils vérifient
    `args: vec![]` → ils attendront `-l` sur Unix). **Ne pas** casser la dé-Windows-isation L0 (jamais
    `cmd`), ni la validation `cwd` sous le chapeau (terminal.rs inchangé sur ce point).
- **Frontière & sécurité** : aucun changement de surface (toujours `portable-pty`, `cwd` validé sous le
  chapeau, pas de nouvelle commande). On **enrichit la spec du shell**, on n'ouvre rien. **Si Gimli
  découvre** que `-l` casse quelque chose sur une plateforme → **signaler** (ne pas bricoler en douce).
- **Vérification (manuelle, gate)** : ouvrir le shell in-app sur macOS → le **prompt**, les **alias** et le
  **PATH** correspondent à ceux du terminal habituel de Stéphane (test : `echo $PATH`, une commande
  aliasée, l'invite). **Critère d'acceptation dédié** (§ Critères).
- **Raison** : c'est l'exigence explicite de Stéphane (AR-2 enrichi). Sans login shell, le terminal in-app
  est subtilement différent (PATH/alias manquants) — inacceptable pour « mon terminal ». L'ajustement est
  **petit et localisé** (`shell.rs` + ses tests).

### D9 — Qualité, tests & couverture honnête (héritage L0→L7)

- `scripts/quality.sh` reste la porte : typecheck + ESLint + vitest + `cargo fmt --check` + `cargo clippy
  --all-targets -- -D warnings` + `cargo test`, **tout vert**.
- **Tests Rust** (logique pure, **sans réseau**) : généralisation `call_endpoint` (construit un payload
  avec un `messages[]` de longueur > 2, system en tête) ; `chat` **mock** (endpoint vide / flag → réponse
  mockée déterministe) ; parsing réutilisé (déjà testé) ; `chat` avec historique vide / multi-tours
  produit un payload bien formé (test du builder, pas d'appel réseau) ; **`build_prompt_chat` est
  persona-aware** (le prompt d'un agent donné contient son **nom** et son **royaume/rôle** ; agent
  inconnu → fallback responsable, pas d'erreur). `next_step` **inchangé** : ses tests existants **restent
  verts** (non-régression). **`shell.rs` mis à jour (D10)** : sur Unix, la spec/le `CommandBuilder` porte
  **`-l`** (login) ; tests `shell` ajustés en conséquence (Windows inchangé, jamais `cmd`).
- **Tests front (vitest)** : `useConversations` (ouvrir = dédoublonne par projet ; **agent par défaut =
  responsable** ; toggle change `mode` sans toucher `ptySessionId` ; `@agent` change la **persona** passée
  à `chat` ; envoyer un message **ajoute le tour user**, appelle `backend.chat(path, agent, history)`
  mockée, **ajoute le tour assistant** ; erreur → `error` peuplé, pas de crash) ; `Chat` (rend les bulles
  user/assistant, saisie désactivée si `pending`, **préfixe `@agent:` inséré** au clic roster) ; `Roster`
  (rend `[ROYAUME][Agent]` bien formés, **statut attend/travaille**, clic → callback `@agent`) ;
  `useDemoSeed` **mis à jour** (1 conversation, plus 5 onglets) ; façade `chat` appelle la bonne commande
  avec l'argument `agent`.
- **Couverture honnête** : le **PTY réel** et l'**appel Ollama réel** restent **non couverts
  unitairement** (assumés, testés **à la main** au gate : taper dans le shell, basculer chat↔shell sans
  tuer la session, envoyer un message et recevoir une réponse Ollama). Rapporter le **chiffre réel**, pas
  de gonflage.

---

## Périmètre

### Inclus (L8 strict — livré en UN SEUL BLOC, AR-5 TRANCHÉ)
- **Modèle conversation** : hook `useConversations` (1 conversation/projet, mode chat|shell, **agent
  courant**, historique mémoire, `ptySessionId` stable). Refactor de l'enveloppe « onglets » (D1).
- **Chat multi-tours persona-aware** : commande Rust `chat(path, agent, messages)` dans `ai.rs`
  (généralise `call_endpoint`, réutilise `build_context`/`should_mock`/dégradation, `build_prompt_chat`
  **persona-aware**) ; façade `chat()` + types `ChatMessage`/`ChatReply` (D2). Historique **en mémoire**
  (D3).
- **Interlocuteur** : **responsable par défaut** (Aragorn projet / Odin portefeuille) + **`@agent`** au
  clic roster (changement de **persona**, un seul appel `chat`) (D3).
- **Toggle Chat/Shell** : un espace, 2 modes ; **le PTY survit** (masqué, pas démonté) ; **défaut = chat**
  (AR-2, D4).
- **Terminal réel** : socle L0 `shell` ajusté en **login shell interactif** (`-l` Unix) sourçant le profil,
  indiscernable du terminal habituel (AR-2 enrichi, D10).
- **Layout Working reworké** : worklist + espace conversation (toggle) + **widget roster** ; `tabsbar`
  retirée ; **« prochaine étape » conservée** (D5).
- **Roster** : widget `Roster` (5 agents `DEMO_TEAM`, AR-3) + **statut attend/travaille** (état local MVP) ;
  clic → **`@agent:`** (D6).
- **Réconciliation L7** : `useDemoSeed` ouvre **1 conversation** (plus 5 onglets) ; reste du contrat L7
  préservé ; tests L7 mis à jour (D7).
- **Tests** : Rust (builder messages, **prompt persona-aware**, chat mock, **shell `-l`**, non-régression
  next_step) + front (useConversations, Chat, Roster + `@agent`, useDemoSeed maj, façade) ; chaîne qualité
  verte ; couverture honnête (D9).
- **Backlog** : entrée L8 ajoutée à `CLAUDE.md`.

### Exclu (explicitement HORS L8 — autres lots / horizon)
- **Persistance de l'historique chat** (SQLite/CouchDB) → **OUT** (MVP mémoire, D3). Lien aux mains
  courantes 3-canaux iakaboxlogs = **différé** (DEP-2), pas L8.
- **Routage multi-agent RÉEL / orchestration** (plusieurs agents qui se répondent, délèguent, s'exécutent
  de façon autonome) → **OUT/différé** (DEP-1). En L8, `@agent` = **changement de persona** (un seul appel
  `chat`), **pas** un orchestrateur (D3/D6).
- **Runner d'agent autonome** (un agent qui exécute réellement dans le shell) → **OUT** (déjà hors L7,
  reste hors L8). Le shell est un **PTY interactif humain**.
- **Statut roster « vivant » temps réel** (lié à un moteur d'agents réel / iakaboxlogs) → **DEP-1** ; en L8
  statut **local MVP** (attend/travaille dérivé de `pending` + agent courant, D6).
- **Streaming des réponses chat** (token par token) → **OUT** MVP (`stream:false` comme `next_step`).
  Réponse en un bloc. *(Streaming = amélioration future, non bloquante.)*
- **Commutateur global de présentation A/B/C** (PROJET § 6) → **reste horizon**. Le chat WhatsApp ici est
  l'UI de la conversation IA, **pas** un mode de présentation global (cf. Objectif, note de scope).
- **Multi-conversations par projet** → **OUT** (1 projet = 1 conversation, D1).
- **Nouvelle dépendance** (Rust ou front) → **OUT**. xterm/usePty existants, client IA `ureq` existant.
- **Modif CSP** → **OUT** (aucun appel réseau front ajouté, D8).

> **Garde Aragorn (R1 roadmap)** : tout élément DIFFÉRÉ/HORS-SCOPE **ne rentre pas** en L8 par effet de
> bord. En cas de doute, **remonter à Stéphane** avant d'élargir.

---

## Phasage : UN SEUL BLOC (AR-5 TRANCHÉ) — structuration P1/P2 = guide d'implémentation interne

> **AR-5 TRANCHÉ par Stéphane : L8 est livré en UN SEUL BLOC** (P1+P2 ensemble), **un seul gate Legolas**.
> La structuration P1/P2 ci-dessous **reste un guide d'ordre d'implémentation** pour Gimli (réduire le
> risque en validant l'enveloppe avant de brancher l'IA), **pas** un découpage de livraison ni un gate
> intermédiaire.

- **Étape interne 1 — Enveloppe (UI + shell réel + roster), sans chat IA.**
  `useConversations` (modèle 1 conv/projet + toggle + agent par défaut), **Shell plein cadre** (PtyTerminal
  réutilisé, **survit au toggle**, **login shell réel** D10), **Roster** (5 agents + statut + clic
  `@agent`), `tabsbar` retirée, **« prochaine étape » conservée**, réconciliation L7 (1 conversation).
- **Étape interne 2 — Chat multi-tours persona-aware via Ollama.**
  Commande Rust `chat(path, agent, messages)` (généralise `call_endpoint`, `build_prompt_chat`
  persona-aware), façade `chat()`, **bulles chat WhatsApp** + saisie multi-tours + `@agent`, historique
  mémoire, mock/dégradation L3. Active le mode `chat` (défaut).

**Tout est livré et gaté ENSEMBLE.** Frontière IN/différé tracée dans « Exclu » (persistance, orchestration
multi-agent réelle, streaming, statut vivant temps réel, commutateur A/B/C = **différés**).

---

## Contrats d'API (commande Tauri ↔ façade `backend.ts`)

```rust
// Rust — ai.rs (À CÔTÉ de next_step, MÊME client/endpoint/mock/dégradation).
#[derive(Deserialize)]
pub struct ChatMessage { pub role: String, pub content: String }   // "user" | "assistant"

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ChatReply {
    pub content: String,            // réponse de l'assistant
    pub provider: String,           // "litellm" | "mock"
    pub model: Option<String>,
    pub tokens_in: Option<u32>,
    pub tokens_out: Option<u32>,
}

/// Un tour de chat projet EN TANT QUE `agent` (persona). Construit
/// [system(build_prompt_chat(agent, build_context(path))), ...messages], appelle call_endpoint
/// généralisé. Mock si should_mock. Dégrade en Err(String) lisible. AUCUNE panique. agent inconnu/vide
/// → fallback responsable.
#[tauri::command]
pub fn chat(app: AppHandle, path: String, agent: String, messages: Vec<ChatMessage>)
    -> Result<ChatReply, String>
```
```ts
// backend.ts — miroir snake_case, AUCUN invoke hors façade.
export interface ChatMessage { role: "user" | "assistant"; content: string; }
export interface ChatReply {
  content: string;
  provider: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}
// `agent` = persona courante (responsable par défaut, ou agent @mentionné — D3).
export function chat(path: string, agent: string, messages: ChatMessage[]): Promise<ChatReply>;
```

> `next_step` **reste inchangé** (signature, comportement, tests). `call_endpoint` est **généralisé**
> (accepte un `Vec` de messages) — `next_step` l'appelle avec son couple `[system, user]`, `chat`
> l'appelle avec `[system(persona), ...historique]`. **Aucune** nouvelle commande PTY (réutilise
> `pty_open/write/resize/close`). **Aucune** nouvelle dépendance. **`shell.rs` ajusté** (login `-l` Unix,
> D10) — pas une nouvelle commande, un enrichissement de la spec shell L0.

---

## Fichiers concernés (arborescence cible indicative)

```
IakaCockpit/
├─ src-tauri/src/
│  ├─ ai.rs              # MODIF : + ChatMessage/ChatReply + chat(path, agent, messages) ; call_endpoint
│  │                     #         généralisé (Vec<message>) ; build_prompt_chat PERSONA-AWARE ; mapping
│  │                     #         agent→(royaume,rôle) ; next_step INCHANGÉ ; tests
│  ├─ shell.rs           # MODIF (D10) : login shell interactif (`-l` Unix) sourçant le profil ; tests maj
│  └─ lib.rs             # MODIF : ai::chat dans generate_handler!
├─ src/
│  ├─ api/backend.ts     # MODIF : + chat(path, agent, messages) + types ChatMessage/ChatReply (exposés)
│  ├─ hooks/useConversations.ts   # NOUVEAU : 1 conv/projet, mode chat|shell, agent courant, history, envoi
│  ├─ hooks/useGridState.ts       # MODIF : ne garde que la nav 3-vues (onglets PTY retirés) — ou laisser
│  │                               #         et n'utiliser que la nav (à trancher, pas de god-component)
│  ├─ hooks/useDemoSeed.ts        # MODIF : ouvre 1 conversation (plus 5 onglets) ; reste L7 préservé
│  ├─ components/Chat.tsx         # NOUVEAU : bulles WhatsApp + saisie + préfixe @agent (présentationnel)
│  ├─ components/Roster.tsx       # NOUVEAU : widget team [ROYAUME][Agent] + statut attend/travaille +
│  │                               #          clic→@agent (présentationnel)
│  ├─ components/PtyTerminal.tsx  # RÉUTILISÉ (non modifié) — monté caché en mode chat (D4)
│  ├─ components/NextStepPanel.tsx# RÉUTILISÉ — repositionné dans la conversation (D5)
│  ├─ views/WorkingView.tsx       # MODIF (rework) : worklist + espace conversation (toggle) + roster
│  ├─ mock/demoTeam.ts            # RÉUTILISÉ : DEMO_TEAM alimente le roster (plus les onglets)
│  ├─ App.tsx            # MODIF : câble useConversations ; WorkingView nouvelles props
│  └─ theme/app.css      # MODIF : styles bulles chat + roster + toggle (charte, pas de CDN)
├─ src/**/__tests__/     # NOUVEAU/MODIF : useConversations, Chat, Roster, useDemoSeed (maj), backend.chat
├─ specs/instructions/L8-conversation-projet.md   # CE fichier
└─ CLAUDE.md             # MODIF : entrée L8 au backlog
```

> **Aucune dépendance ajoutée** (Rust : `ureq`/`git`/`config` existants ; front : xterm/usePty
> existants). **Aucune** modif de la CSP. Si un crate/commande manque, **le signaler avant** (pas
> d'ajout silencieux — règle L0→L7).

---

## Critères d'acceptation (vérifiables)

- [ ] **1 conversation par projet** : sélectionner un projet du set de Work ouvre/ré-active **une**
      conversation (pas N onglets) ; re-sélectionner le même projet **ne crée pas** de doublon (dédoublonné
      par `projectId`). La **`tabsbar` (5 onglets PTY) a disparu**. Vérifié test + revue.
- [ ] **Toggle Chat/Shell** : un toggle (visible) bascule l'espace entre **Chat** (bulles) et **Shell**
      (terminal plein cadre). **Défaut = Chat** (AR-2). Le shell est **à un clic** et **visiblement
      accessible** (le toggle répond à « où est mon powershell »).
- [ ] **Terminal RÉEL (D10, AR-2 enrichi)** : sur macOS, le shell in-app est un **login shell interactif**
      sourçant le profil → **prompt, alias, `$PATH`** identiques au terminal habituel de Stéphane (vérif
      manuelle : `echo $PATH`, une commande aliasée, l'invite). `shell.rs` passe **`-l`** sur Unix ;
      Windows charge le profil (pas de `-NoProfile`), jamais `cmd`.
- [ ] **Le PTY survit au toggle** (garde centrale, D4) : ouvrir le shell, y taper une commande, basculer
      en Chat puis revenir en Shell → **la même session est retrouvée** (historique terminal intact, pas
      de `[session terminée]`, pas de re-prompt). Vérifié **à la main** au gate. (Composant **monté caché**,
      pas démonté.)
- [ ] **Shell typeable** : taper au clavier écrit dans le PTY (frappe réelle, L2 réutilisé) ; resize OK ;
      un shell **caché puis ré-affiché** se **refit** correctement (pas de terminal tronqué).
- [ ] **Chat multi-tours persona-aware via Ollama** : l'utilisateur tape un message → bulle **user**
      ajoutée → `backend.chat(path, agent, history)` appelée → réponse **assistant** en bulle. Un **2ᵉ**
      message conserve l'historique (multi-tours réel : payload contient les tours précédents).
      **L'interlocuteur par défaut = le responsable** (Aragorn en projet) ; le prompt système **reflète
      l'agent** (nom/royaume/rôle). Vérifié à la main (Ollama réel) + test (façade mockée).
- [ ] **`@agent` (AR-1)** : cliquer un agent du roster **insère `@<Agent> : `** dans la saisie ; à l'envoi,
      la **persona** passée à `chat` est cet agent → réponse « en tant que » lui. Sans `@agent`,
      interlocuteur = responsable. (Routage multi-agent réel = différé, DEP-1 — non attendu.)
- [ ] **Mock & dégradation chat** : endpoint vide / `IAKACOCKPIT_AI_MOCK=1` → réponse **mockée**
      déterministe (provider `mock`), pas de crash ; endpoint injoignable → **erreur lisible** dans la
      conversation (champ `error`), pas de panique. **Calque exact de `next_step`.**
- [ ] **`next_step` non régressé** : la commande et ses tests L3 **restent inchangés et verts** ; la
      « prochaine étape » reste **accessible** dans la vue Working (D5).
- [ ] **Roster** : widget team affiché avec les **5 agents** (`DEMO_TEAM`) `[ROYAUME][Agent]` (royaume
      MAJUSCULE) + **statut attend/travaille** (état local MVP : « travaille » pour l'agent d'un tour
      `chat` en cours) ; **responsable mis en évidence** ; clic → **`@agent:`** (D6).
- [ ] **Réconciliation L7 (non-régression)** : en `tauri dev`, le seed ouvre **1 conversation** pour
      `iaka-demo` (plus 5 onglets) ; le reste du contrat L7 est **intact** (dossier+git+config seedés,
      `seeded:false` en prod, exécution unique, démarrage sur Portfolio, refresh portfolio). Tests
      `useDemoSeed` **mis à jour** (plus d'assertion « 5 openTab »). **Gate L7 non cassé.**
- [ ] **Façade unique** : grep → **aucun** `invoke(`/`fetch(`/`listen(` hors `src/api/backend.ts` ;
      `chat` typée ; `ChatMessage`/`ChatReply` miroirs. **Aucun** appel réseau front ajouté ; **CSP non
      touchée** (jamais `null`).
- [ ] **Réutilisation (pas de réimplémentation)** : grep → **pas** de nouveau client HTTP IA (réutilise
      `call_endpoint`/`ureq`) ; **pas** de PTY maison (réutilise `usePty`/`PtyTerminal`) ; **pas** de
      nouveau `build_context` (réutilisé) ; **aucune** nouvelle dépendance Cargo/npm.
- [ ] **Pas de god-component** : `useConversations` (état) / `Chat`,`Roster` (présentationnels) /
      `WorkingView` (assemble) / `App.tsx` (câble). Hooks séparés (D6 socle). Revue.
- [ ] **Tests** : Rust (builder messages multi-tours, `chat` mock, non-régression `next_step`) + front
      (`useConversations`, `Chat`, `Roster`, `useDemoSeed` maj, façade `chat`) ; `npm run test` +
      `cargo test` **verts**.
- [ ] **Build & qualité verts** : `npm run typecheck` 0 err, `npm run lint` 0 err, `npm run build` OK,
      `cargo fmt --check`/`clippy --all-targets -- -D warnings`/`cargo test` verts ; `bash
      scripts/quality.sh` **en succès**.
- [ ] **Couverture honnête** : PTY réel + appel Ollama réel assumés **non couverts unitairement** (testés
      à la main au gate : frappe shell, survie au toggle, message→réponse). Chiffre réel, sans gonflage.
- [ ] **Aucun élément OUT livré** : pas de persistance chat, pas de routage par agent, pas de runner, pas
      de streaming, pas de commutateur A/B/C, pas de multi-conversations, pas de dépendance neuve, CSP
      intacte. (Revue de scope au gate.)
- [ ] **Backlog** : `CLAUDE.md` porte l'entrée L8.
- [ ] **Commits** : atomiques, conventional commits, **locaux** (push différé box offline) ; module + ses
      tests dans le **même** commit (ou tests d'abord).

---

## Risques & limites

- **R-L8-1 — Tuer le shell en basculant chat↔shell** (CRITIQUE, cœur du lot). `PtyTerminal` ferme la
  session à son cleanup ; un rendu conditionnel `mode==="shell" && <PtyTerminal/>` **démonterait** et
  **tuerait** la session à chaque toggle. *Mitigation* : **D4** — monter `PtyTerminal` **une fois** et le
  **masquer en CSS** (`display:none`) en mode chat, jamais le démonter ; critère de test manuel (taper,
  basculer, revenir → même session). C'est **la** garde à ne pas rater.
- **R-L8-2 — Casser le gate L7** en touchant `useDemoSeed`. *Mitigation* : **D7** chirurgical (seul le
  bloc « onglets » devient « conversation ») ; seed Rust **non touché** ; tests L7 mis à jour ; revue de
  non-régression au gate (seed inerte en prod, exécution unique, démarrage Portfolio préservés).
- **R-L8-3 — Scope-creep vers l'ORCHESTRATION multi-agent réelle / la persistance / le streaming**. Le
  `@agent` et le « chat WhatsApp » invitent à construire un orchestrateur. *Mitigation* : **D3/D6**
  bornent strictement — `@agent` = **changement de persona** (un seul appel `chat`), **pas** un routeur
  d'agents ; historique **mémoire** ; `stream:false`. Le routage réel = **DEP-1** explicite ; garde
  Aragorn. **Ne pas** confondre « persona-aware » (IN) et « orchestration » (OUT).
- **R-L8-9 — Login shell `-l` casse une plateforme** (profil qui plante, double-source, divergence
  Windows). *Mitigation* : **D10** cible Unix (`-l`) ; Windows **inchangé** (profil par défaut, pas de
  `-NoProfile`) ; tests `shell.rs` mis à jour ; si `-l` pose problème sur une plateforme → **signaler**
  (pas de bricolage). Vérif manuelle macOS (PATH/alias/prompt = terminal habituel).
- **R-L8-4 — Réimplémenter le client IA pour le chat**. *Mitigation* : **D2** généralise `call_endpoint`
  existant (un `Vec` de messages), réutilise `build_context`/`should_mock`/parsing ; critère grep
  anti-réimplémentation ; `next_step` intact.
- **R-L8-5 — Régresser `next_step`** en généralisant `call_endpoint`. *Mitigation* : `next_step` appelle
  la fonction généralisée avec `[system, user]` ; ses tests L3 **restent verts** (non-régression
  obligatoire au gate).
- **R-L8-6 — God-component dans `WorkingView`** (la vue qui sait tout : conversations + chat + shell +
  roster + next-step). *Mitigation* : **D8** — état dans `useConversations`, présentation dans
  `Chat`/`Roster`/`PtyTerminal`/`NextStepPanel`, `WorkingView` **assemble** seulement.
- **R-L8-7 — Terminal caché mal redimensionné** au retour shell (xterm `fit()` sur élément masqué).
  *Mitigation* : **D4** — vérifier le refit au ré-affichage (ResizeObserver existant ; sinon resize
  explicite au retour) ; critère de test manuel.
- **R-L8-8 — Élargissement CSP en douce** pour « faire marcher le chat ». *Mitigation* : **D8** — le chat
  passe **côté Rust** (`ureq`), **aucun** appel réseau front → CSP **non concernée**. Si Gimli croit
  devoir l'élargir → **STOP, signaler** (jamais `null`).
- **Limite IA** : la qualité du chat dépend de l'**Ollama hôte** (`:11434`, modèle `llama3.1:8b`, seedé
  L7) **lancé**. Sinon → **mock / erreur lisible** (dégradation L3). La démo reste utilisable (shell réel +
  roster marchent sans IA).

---

## Points ouverts & dépendances

### Arbitrages — TOUS TRANCHÉS par Stéphane (2026-06-26)
- **AR-1 — Interlocuteur du chat → TRANCHÉ (ENRICHI) : le RESPONSABLE par défaut + `@agent`.** Par défaut
  **Aragorn** (projet) / **Odin** (portefeuille) ; les autres agents de la team sont dans le **roster**
  (statut attend/travaille) et **adressables** par **clic → `@agent:`** (changement de **persona**, le
  système répond « en tant que » l'agent). Le **routage multi-agent RÉEL** (orchestration) est
  **différé/tracé** (DEP-1). Gravé en **D3/D6** ; prompt **persona-aware** (D2).
- **AR-2 — Mode par défaut + terminal → TRANCHÉ : ouverture en CHAT** + **terminal réel.** Une
  conversation s'ouvre en **chat** ; le shell (à un clic) **reproduit le terminal habituel** de Stéphane
  (login shell interactif sourçant le profil — `~/.zshrc`/`~/.zprofile`, prompt/alias/env/PATH). Gravé en
  **D4** (mode chat) + **D10** (terminal réel, ajustement L0 `shell` : `-l` Unix).
- **AR-3 — Roster : 5 ou 8 agents ? → TRANCHÉ : 5** (`DEMO_TEAM` : Odin/Aragorn/Gandalf/Gimli/Legolas,
  cohérent seed L7, extensible). Gravé en **D6**.
- **AR-4 — Prompt système du chat → TRANCHÉ : persona-aware** (reflète l'agent courant — responsable par
  défaut, ou agent `@mentionné` — et son royaume/rôle). **Le texte exact reste « à confirmer »** : Gimli
  **propose**, Stéphane ajuste (comme `build_prompt` L3 / A4). Le **caractère persona-aware**, lui, est
  **gravé** (D2).
- **AR-5 — Phasage → TRANCHÉ : UN SEUL BLOC.** P1+P2 livrés **ensemble**, **un seul gate Legolas**. La
  structuration P1/P2 est un **guide d'ordre d'implémentation** interne (valider l'enveloppe avant l'IA),
  pas un découpage de livraison. Gravé en § Phasage.

### Dépendances ouvertes (signalées, non comblées en L8)
- **DEP-1 — Orchestration multi-agent RÉELLE + statut « vivant » temps réel** (plusieurs agents qui se
  répondent/délèguent/s'exécutent ; statut working/pending/stopped issu d'un moteur d'agents réel /
  iakaboxlogs) → hors L8. En L8 : `@agent` = **changement de persona** (un appel `chat`), statut roster =
  **local MVP** (attend/travaille dérivé de `pending`).
- **DEP-2 — Persistance + lien mains courantes 3-canaux** (historique chat journalisé/relu, iakaboxlogs)
  → **différé** (lot futur). En L8 : historique **mémoire**.

---

## Notes pour Gimli

- **Réutilise tout, ne réinvente rien.** Le **shell** = `PtyTerminal` **tel quel** (la frappe marche
  déjà — **ne réécris pas** le PTY). Le **chat** = `call_endpoint` **généralisé** (un `Vec` de messages),
  **pas** un nouveau client HTTP. Le **contexte** = `build_context` réutilisé. Le **mock/dégradation** =
  `should_mock` + patron `next_step`. Le **roster** = `DEMO_TEAM` (L7), pas une nouvelle constante.
- **La garde n°1 = NE PAS TUER LE SHELL au toggle (R-L8-1).** Monte `PtyTerminal` **une fois** et
  **cache-le en CSS** (`display:none`) quand `mode==="chat"`. **Jamais** `mode==="shell" && <PtyTerminal/>`
  (ça le démonte → `pty.close` → session morte). Teste à la main : taper, basculer, revenir = même session.
  **Défaut = chat (AR-2)** : le shell est monté **caché** dès l'ouverture (pour survivre), affiché au clic.
- **Terminal RÉEL (D10, AR-2 enrichi).** Ajuste `shell::default_shell()` pour spawner un **login shell
  interactif** : ajoute **`-l`** sur Unix (zsh/bash) → il source `~/.zprofile`/`~/.zshrc` (PATH/alias/env).
  Windows : **garde** le chargement du profil (pas de `-NoProfile`), jamais `cmd`. **Mets à jour les tests
  `shell.rs`** (ils attendaient `args: vec![]` → `-l` sur Unix). Vérifie à la main sur macOS que le
  terminal in-app est **indiscernable** de celui d'où Stéphane lance Claude Code (`echo $PATH`, un alias,
  l'invite). Si `-l` casse une plateforme → **signale** (R-L8-9).
- **Persona-aware (AR-1/AR-4).** `chat(path, agent, messages)` reçoit l'**agent courant** ;
  `build_prompt_chat(agent, ctx)` reflète son **nom/royaume/rôle**. Interlocuteur **par défaut = le
  responsable** (Aragorn projet / Odin portefeuille), pas un agent générique. **`@agent`** (clic roster) =
  insère `@<Agent> : ` dans la saisie + change la persona du tour. **MVP = changement de persona, PAS
  d'orchestration** (un seul appel `chat` — R-L8-3). Mapping `agent→(royaume,rôle)` = petite table.
- **`next_step` est SACRÉ (R-L8-5).** Tu **généralises** `call_endpoint` (signature `messages: &[..]`),
  tu **ne touches pas** au comportement de `next_step` ni à ses tests. Ils restent verts.
- **`backend.ts` est sacré (D8).** `chat` typée, **aucun** `invoke`/`fetch`/`listen` ailleurs, **CSP non
  touchée** (jamais `null`), **aucun** appel réseau front. Le chat sort **côté Rust** (`ureq`).
- **Ne casse pas L7 (R-L8-2).** Touche **uniquement** le bloc « ouverture d'onglets » de `useDemoSeed`
  (→ « ouverture d'une conversation »). Le seed Rust, le flag prod, l'exécution unique, le démarrage
  Portfolio : **intacts**. Mets à jour les tests `useDemoSeed` en conséquence (plus de « 5 openTab »).
- **Pas de god-component (R-L8-6).** `useConversations` porte l'état ; `Chat`/`Roster` sont
  présentationnels ; `WorkingView` assemble ; `App.tsx` câble. À trancher proprement : `useGridState`
  garde la nav 3-vues, `useConversations` porte les conversations (ne mélange pas).
- **Phasage (AR-5 TRANCHÉ : un seul bloc).** Tu livres P1+P2 **ensemble**, **un seul gate**. Tu **peux**
  implémenter dans l'ordre (enveloppe d'abord, puis chat IA) pour réduire le risque — mais tu ne livres ni
  ne gates par moitié.
- **Prompt chat (AR-4)** : le prompt **EST persona-aware** (gravé) ; **propose le texte**, **marque-le
  « à confirmer »**, ne fige pas le wording sans accord de Stéphane.
- **Avant de clore** : `bash scripts/quality.sh` en entier ; greps toi-même (`invoke`/`fetch`/`listen`
  hors façade ; nouveau client HTTP IA = doit être absent ; PTY maison = absent ; dépendance neuve =
  absente ; `tabsbar` PTY = retirée). Vérifie chaque case des Critères. Teste **à la main** dans
  `tauri dev` : **terminal réel** (PATH/alias = ton terminal), shell typeable, **survie au toggle**,
  message chat → réponse Ollama (ou mock si hôte éteint), **`@agent`** change la persona. Rapporte la
  couverture réelle sans la maquiller.
- **AR-1..AR-5 sont TRANCHÉS** (responsable + `@agent` ; chat par défaut + terminal réel ; 5 agents ;
  prompt persona-aware ; un seul bloc) : **applique-les tels quels**, ne rouvre pas ces choix. Seul le
  **wording** du prompt persona (AR-4) reste à confirmer avec Stéphane.
- **Gate Legolas obligatoire** après L8 (anti « Gimli solo ») : il auditera **survie du shell au toggle**,
  **non-régression `next_step` + gate L7**, **chat mock/dégradation**, **façade unique + CSP intacte**,
  **réutilisation (pas de réimplémentation)**, **pas de god-component**, couverture honnête. Ne
  t'auto-valide pas.

---

## Estimation (à l'entrée du jalon de dev — règle de méthode)

> Règle de méthode : estimation posée à l'entrée du jalon (équivalent j-homme, complexité/risque,
> inconnues). Lot **moyen**, **livré en un seul bloc** (AR-5). **Réévaluée** après l'enrichissement AR-1
> (responsable + `@agent` + roster statut) et AR-2 enrichi (terminal réel D10).

- **Charge globale : ~3,5 à 5 j-homme** (cible médiane **~4 j**) — **+~0,5 j** vs l'estimation initiale
  (~3,5 j), du fait de l'enrichissement AR-1/AR-2. Décomposition (ordre d'implémentation interne) :
  - **Étape 1 — Enveloppe (UI + shell réel + roster + `@agent`), sans IA : ~2 à 2,5 j.**
    `useConversations` (modèle 1 conv/projet + **agent courant** + toggle) + rework `WorkingView` + `Roster`
    (**statut attend/travaille** + **clic→`@agent`**, +~0,3 j vs roster purement informatif) +
    réconciliation `useDemoSeed` + maj tests L7. **Deux points délicats** : (a) **survie du shell au
    toggle** (montage caché vs démontage — R-L8-1/R-L8-7), bornée ; (b) **terminal réel D10** (ajuster
    `shell.rs` en login `-l` + maj tests + vérif macOS PATH/alias — petit mais à faire soigneusement,
    +~0,3 j). Le reste = assemblage de briques mûres.
  - **Étape 2 — Chat multi-tours persona-aware Ollama : ~1,5 à 2,5 j.**
    Généralisation `call_endpoint` (`Vec` de messages) + commande `chat(path, agent, messages)` +
    **`build_prompt_chat` persona-aware** + mapping `agent→(royaume,rôle)` + façade + `Chat` (bulles +
    saisie + insertion `@agent`) + câblage `useConversations` (envoi/historique/erreur/persona) + tests.
    **Très balisé** (calqué sur `next_step`/`ai.rs`) ; multi-tours **gratuit côté protocole** (vérifié web).
    Le **persona-aware** ajoute surtout du **wording de prompt** (AR-4, itératif) + un petit mapping —
    impact code mineur. Allers-retours possibles sur le prompt → marge.
- **Complexité : moyenne.** **Faible côté capacités** (réutilisation pure : PTY L2, client IA L3, façade,
  charte) ; la difficulté est **d'enveloppe** (refactor « onglets → conversation » **sans tuer le shell ni
  casser L7**) + **deux ajustements ciblés** (login shell D10, persona-aware) — du soin, pas de la
  recherche.
- **Risque / inconnues** :
  - **Survie du shell au toggle (R-L8-1/R-L8-7)** : risque **principal**, **maîtrisé** (« monter caché »
    + test manuel). Inconnue faible (refit xterm sur élément masqué à vérifier).
  - **Login shell `-l` (R-L8-9, D10)** : inconnue **faible** (macOS standard zsh `-l` ; Windows inchangé).
    Petit, à vérifier à la main (PATH/alias = terminal réel).
  - **Non-régression `next_step` + gate L7** : maîtrisée (chirurgie ciblée + tests existants verts).
  - **Prompt persona-aware (AR-4)** : itératif, non bloquant (mock disponible).
  - **`@agent` borné (R-L8-3)** : risque de glissement vers l'orchestration → **borné** explicitement
    (changement de persona, un seul appel `chat`). Inconnue faible si la frontière est tenue.
- **Verdict** : lot **moyen, peu risqué côté capacités** (tout réutilisé), dont l'effort se concentre sur
  **le refactor d'enveloppe propre** (1 conv/projet, toggle survivant, persona-aware), **le terminal réel**
  (D10) et **la non-régression** (next_step, gate L7). **Estimation réévaluée : ~4 j-homme** en cible
  médiane (vs ~3,5 j avant l'enrichissement AR-1/AR-2) — **livrée en un seul bloc** (AR-5), un seul gate.

---

## Sources (faits vérifiés sur le web, 2026-06-26)
- **Ollama OpenAI-compat `/v1/chat/completions` + `messages[]` multi-tours** (system/user/assistant,
  même format que le payload déjà construit par `ai.rs` ; maintien de l'historique via le tableau de
  messages) : [OpenAI compatibility — Ollama (docs)](https://docs.ollama.com/api/openai-compatibility) ·
  [OpenAI compatibility · Ollama Blog](https://ollama.com/blog/openai-compatibility) ·
  [OpenAI Compatibility Layer — DeepWiki (ollama/ollama)](https://deepwiki.com/ollama/ollama/3.4-openai-compatibility-layer)
- **Login shell zsh / sourcing du profil (D10, AR-2 enrichi)** : sur macOS chaque terminal est un **login
  shell** → source `~/.zprofile` (PATH/EDITOR), puis `~/.zshrc` (alias/prompt) en interactif ; un zsh
  **non-login** ne source **pas** `~/.zprofile` → **PATH divergent**. D'où `-l` pour reproduire le
  terminal réel : [.zshrc and .zprofile — mac.install.guide](https://mac.install.guide/terminal/zshrc-zprofile) ·
  [How Do Zsh Configuration Files Work? — freeCodeCamp](https://www.freecodecamp.org/news/how-do-zsh-configuration-files-work/)
- **Réf interne socle L0 `shell`** (constat « `args: vec![]` aujourd'hui → pas de login ») :
  `src-tauri/src/shell.rs` (`default_shell`) ; `src-tauri/src/terminal.rs` (`pty_open` → `default_shell().to_command()`).
- **Réfs internes** (lecture seule, briques réutilisées) : `src-tauri/src/ai.rs` (`call_endpoint`,
  `build_context`, `should_mock`, `parse_chat_completion`, `next_step`) ; `src/components/PtyTerminal.tsx`
  (`term.onData → pty.write`, cleanup `pty.close`) ; `src/hooks/{usePty,useGridState,useNextStep,
  useDemoSeed}.ts` ; `src/views/WorkingView.tsx` ; `src/mock/demoTeam.ts` (`DEMO_TEAM`) ;
  `src/api/backend.ts` (façade) ; `src/theme/app.css` ; `specs/PROJET.md` § 4/5/6/9 ;
  `specs/instructions/{L2,L3,L7}-*.md` (patrons PTY/IA/seed) ; `CLAUDE.md` (archi D7, socle L0).
```
