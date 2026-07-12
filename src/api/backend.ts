/**
 * backend.ts — UNIQUE point d'accès au backend Tauri.
 *
 * Règle d'architecture (D7) : tout appel `invoke` vers Rust passe par ce module.
 * Aucun composant ni hook ne doit importer `@tauri-apps/api/core` directement.
 * Ce découplage rend le backend mockable (tests, futur L2) et empêche le retour
 * d'un god-component qui mélangerait I/O et rendu.
 *
 * L1 ajoute les commandes métier salvagées d'iakaIDE (portfolio, services, config,
 * PTY). Chaque commande est exposée par une fonction typée au-dessus de `call` —
 * jamais d'`invoke` ailleurs.
 *
 * Sérialisation : les types TS sont le miroir EXACT des structs `Serialize` Rust
 * (snake_case par défaut, cf. D7 — aucun `rename` côté Rust). Les noms d'arguments
 * passés à `call` reprennent les noms des paramètres Rust (snake_case).
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

/** Wrapper typé minimal autour de `invoke`. Seul endroit autorisé à l'appeler. */
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}

/**
 * Détecte si l'on tourne dans un contexte Tauri (fenêtre native) plutôt qu'un
 * simple navigateur (dev front pur / tests). Évite de crasher hors Tauri.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// --- Types miroir des structs Rust (snake_case, D7) ---

/** Statut de travail d'un projet (miroir de `Project.work_status`, Rust). */
export type WorkStatus = "work pending" | "stable" | "hors git";

/** Miroir de `portfolio::Project` (Rust). */
export interface Project {
  id: string;
  path: string;
  is_git: boolean;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
  last_commit_date: string | null;
  last_commit_subject: string | null;
  version: string | null;
  /** Description dédiée du projet (F3, AR-6) — sujet en gras de la tuile ; `null` → fallback commit. */
  description: string | null;
  /** Nb d'items `- [ ]` non cochés du backlog `CLAUDE.md` (F3) ; `null` si 0/absent. */
  backlog_remaining: number | null;
  /** Texte du 1er `- [ ]` du backlog `CLAUDE.md` (F3) ; distinct de la NextStep LLM (L3). */
  backlog_next: string | null;
  work_status: WorkStatus;
}

/**
 * Miroir de `ai::NextStep` (Rust) — moteur « prochaine étape » L3.
 * `provider` vaut `"litellm"` (endpoint OpenAI-compat configuré : LiteLLM / Ollama
 * / cloud) ou `"mock"` (suggestion simulée, sans réseau).
 */
export interface NextStep {
  suggestion: string;
  provider: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}

/**
 * Miroir de `ai::ChatMessage` (Rust, L8) — un message du fil de chat. `role` vaut
 * `"user"` (l'utilisateur) ou `"assistant"` (l'agent). L'historique vit côté front
 * (mémoire MVP, D3) et est réinjecté à chaque tour.
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Miroir de `ai::ChatReply` (Rust, L8) — réponse d'un tour de chat. `provider` vaut
 * `"litellm"` (endpoint réel) ou `"mock"` (simulé, sans réseau).
 */
export interface ChatReply {
  content: string;
  provider: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}

/**
 * Les 3 canaux de la main courante + le canal "agent" (relais inter-agents).
 * Contrat UX partagé (L2/L4) : `mock/feed.ts` réutilise ce type, pas de duplication.
 */
export type Canal = "adresse" | "geste" | "pensee" | "agent";

/**
 * Miroir de `maincourante::FeedEvent` (Rust, L4) — un événement de main courante.
 * Le mapping doc CouchDB → FeedEvent (canal dérivé + `[ROYAUME][Agent]`) se fait
 * CÔTÉ RUST (D6) ; le front reçoit des FeedEvent prêts à afficher.
 */
export interface FeedEvent {
  /** `_id` CouchDB. */
  id: string;
  /** Canal dérivé (D3). */
  canal: Canal;
  /** Émetteur affiché `[ROYAUME][Agent]`. */
  who: string;
  /** Provenance = conv_id (ou royaume) — pas un lien fort projet. */
  project: string;
  /** Corps du message (`content`). */
  body: string;
  /** Horodatage ISO-8601 (mise en forme = UX front). */
  ts: string;
  /** Payload structuré brut (`meta`) — passthrough (L18 : `event:"plan"` porte `items`). */
  meta?: Record<string, unknown> | null;
}

/** Filtre serveur de la main courante (miroir de `maincourante::MainCouranteFilter`). */
export interface MainCouranteFilter {
  agent?: string;
  royaume?: string;
}

/**
 * Support de diffusion du canal « adresse » (L6). Le Cockpit choisit le support
 * actif (D2) et le passe dans le payload ; n8n route bêtement dessus. AUCUN secret
 * de support ne vit dans le Cockpit — ils restent dans n8n.
 */
export type NotifySupport = "slack" | "discord" | "mqtt";

/**
 * Miroir de `notify::NotifyAck` (Rust, L6) — accusé de PRISE EN CHARGE par la
 * passerelle n8n. `ok:true` = n8n a reçu et va router (HTTP 2xx réel) OU mock ;
 * `provider` vaut `"n8n"` (POST réel) ou `"mock"` (URL vide / flag dev, sans réseau).
 * L'ack NE signifie PAS que le message est arrivé sur Discord/Slack/MQTT (diffusion
 * asynchrone côté n8n, hors visibilité du Cockpit en phase 1).
 */
export interface NotifyAck {
  ok: boolean;
  provider: string;
  http_status: number | null;
}

/**
 * Miroir de `seed::SeedReport` (Rust, L7) — compte rendu du seed de démo dev.
 * `seeded:false` = flag dev off (seed inerte) → le bootstrap front ne fait rien.
 * `demo_path` = dossier de démo à ouvrir (onglets team) ; `created_dir` = créé ce
 * run ; `config_keys_set` = clés config réellement posées (vide si déjà présentes).
 */
export interface SeedReport {
  seeded: boolean;
  demo_path: string | null;
  created_dir: boolean;
  config_keys_set: string[];
}

/**
 * Miroir de `resume::ResumeReport` (Rust, L23) — compte rendu de la préparation de
 * reprise déclenchée au retrait d'un projet de la Table. `ok:true` = état des lieux
 * régénéré (vrai même hors git, SA-3). `is_git`/`branch`/`commit_count`/`dirty` = faits
 * git captés ; `wrote_path` = fichier `specs/etat-des-lieux.md` écrit (lien futur).
 */
export interface ResumeReport {
  ok: boolean;
  path: string;
  is_git: boolean;
  branch: string | null;
  commit_count: number;
  dirty: boolean;
  wrote_path: string;
}

/** Miroir de `services::ServiceStatus` (Rust). */
export interface ServiceStatus {
  name: string;
  host: string;
  port: number;
  url: string;
  reachable: boolean;
  latency_ms: number | null;
}

// --- Portfolio / git ---

/** Énumère les projets sous `root` (trié work pending → stable → hors git). */
export function scanPortfolio(root: string): Promise<Project[]> {
  return call<Project[]>("scan_portfolio", { root });
}

/** Coût agrégé d'un projet (miroir `economy::ProjectEconomy`, L18 #5b). */
export interface ProjectEconomy {
  project: string;
  input: number;
  output: number;
  /** Tokens de sortie du coordinateur (tours principaux). */
  coord: number;
  /** Tokens de sortie des sous-agents délégués (sidechain). */
  sub: number;
}

/**
 * Coût par projet agrégé depuis les transcripts de session (top 8, tri coût desc). Lecture
 * seule. Vide si aucun transcript / hors Tauri. Alimente la treemap de l'Étagère (#5b).
 */
export function portfolioEconomy(): Promise<ProjectEconomy[]> {
  return call<ProjectEconomy[]>("portfolio_economy");
}

/** Tokens d'un jour pour un projet (miroir `economy::DayTokens`, L21 D). */
export interface DayTokens {
  date: string;
  tokens: number;
}

/** Série d'activité d'un projet : jours triés croissants (miroir `economy::ProjectActivity`). */
export interface ProjectActivity {
  project: string;
  days: DayTokens[];
}

/**
 * Ventilation tokens/jour/projet (top 12, tri total desc) depuis les transcripts de session
 * (L21 D). Somme `input + output + cache_creation` HORS `cache_read`, bucketée par jour.
 * Lecture seule. Vide si aucun transcript / hors Tauri. Alimente la visu « travail passé »
 * (scatter-timeline) ; le scope « projets de la table » est appliqué côté front.
 */
export function portfolioActivity(): Promise<ProjectActivity[]> {
  return call<ProjectActivity[]>("portfolio_activity");
}

/**
 * Importe un dossier existant comme projet (bouton + de Working). Persiste son
 * chemin côté Rust et renvoie son état git scanné. Le dossier peut vivre hors du
 * chapeau (import externe choisi par geste utilisateur).
 */
export function addProject(path: string): Promise<Project> {
  return call<Project>("add_project", { path });
}

/** Projets importés hors racine, encore présents sur disque. */
export function listExtraProjects(): Promise<Project[]> {
  return call<Project[]>("list_extra_projects");
}

/**
 * Ouvre le sélecteur de dossier natif (plugin dialog). Renvoie le chemin choisi,
 * ou `null` si l'utilisateur annule. SEUL endroit autorisé à toucher au plugin
 * dialog (même règle de cloisonnement que `invoke`/`listen`, D7).
 */
export async function pickDirectory(): Promise<string | null> {
  const selection = await openDialog({ directory: true, multiple: false });
  return typeof selection === "string" ? selection : null;
}

// --- Services ---

/** État des services iakabox (ne rejette jamais : injoignable → reachable:false). */
export function checkServices(): Promise<ServiceStatus[]> {
  return call<ServiceStatus[]>("check_services");
}

// --- Moteur « prochaine étape » IA (L3) ---
//
// UN endpoint OpenAI-compat configurable, côté Rust. L'appel réseau IA vit
// UNIQUEMENT côté Rust (D2) : aucun `fetch`/client HTTP IA dans le front (CSP
// stricte). Le front ne fait qu'`invoke` via cette façade.

/**
 * Demande une suggestion de « prochaine étape » pour le projet `path`.
 * Mode réel (endpoint configuré) ou mock (endpoint vide / flag dev) — transparent
 * côté front : `provider` indique lequel. Rejette avec un message lisible si
 * l'endpoint est injoignable (dégradation propre côté Rust).
 */
export function nextStep(path: string): Promise<NextStep> {
  return call<NextStep>("next_step", { path });
}

/**
 * Un tour de chat projet (L8, D2) EN TANT QUE `agent` (persona). `agent` = persona
 * courante : responsable par défaut (Aragorn projet / Odin portefeuille), ou agent
 * `@mentionné` (D3). `messages` = historique multi-tours (user/assistant) ; le
 * système (persona + contexte projet) est ajouté CÔTÉ RUST. Mode réel (endpoint
 * configuré) ou mock (endpoint vide / flag dev) — `provider` l'indique. Rejette
 * avec un message lisible si l'endpoint est injoignable (dégradation propre Rust).
 * L'appel réseau IA vit UNIQUEMENT côté Rust (CSP stricte) — aucun client HTTP front.
 */
export function chat(
  path: string,
  agent: string,
  messages: ChatMessage[],
): Promise<ChatReply> {
  return call<ChatReply>("chat", { path, agent, messages });
}

/**
 * Écrit la clé IA optionnelle au keychain (WRITE-ONLY : la clé n'est jamais relue
 * vers le front). Une valeur vide retire la clé. Cf. cloisonnement D4.
 */
export function aiSetKey(value: string): Promise<void> {
  return call<void>("ai_set_key", { value });
}

/** Indique si une clé IA est enregistrée (présence seule, jamais la valeur). */
export function aiHasKey(): Promise<boolean> {
  return call<boolean>("ai_has_key");
}

// --- Main courante 3-canaux (L4) ---
//
// Lecture seule de la base CouchDB iakaboxlogs (`conversations`). L'appel HTTP +
// l'auth Basic + le mapping doc→FeedEvent vivent UNIQUEMENT côté Rust (D2) : aucun
// `fetch`/client HTTP CouchDB dans le front (CSP stricte), aucun identifiant ne
// transite par le front. Le front ne fait qu'`invoke` via cette façade.

/**
 * Lit la main courante iakaboxlogs (lecture seule, UN `_find` côté Rust). Renvoie
 * les événements récents (tri ts desc, limite bornée). Rejette avec un message
 * lisible si URL/identifiants CouchDB absents ou box injoignable (mode dégradé,
 * consommé par `useMainCourante` pour retomber sur le mock). Filtres serveur
 * optionnels (agent/royaume — champs indexés).
 */
export function fetchMainCourante(
  filter?: MainCouranteFilter,
): Promise<FeedEvent[]> {
  return call<FeedEvent[]>("fetch_main_courante", { filter: filter ?? {} });
}

/**
 * Écrit l'identifiant CouchDB (user + password) au keychain (WRITE-ONLY : jamais
 * relu vers le front). Un mot de passe vide retire les identifiants. Cf. D4.
 */
export function couchSetCredentials(
  user: string,
  password: string,
): Promise<void> {
  return call<void>("couch_set_credentials", { user, password });
}

/** Indique si des identifiants CouchDB sont enregistrés (présence seule, jamais la valeur). */
export function couchHasCredentials(): Promise<boolean> {
  return call<boolean>("couch_has_credentials");
}

// --- Canal adresse externe SORTANT via passerelle n8n (L6) ---
//
// UN POST {n8n_webhook_url} canal-agnostique côté Rust. L'appel HTTP + l'auth
// (header X-API-Key) + le token vivent UNIQUEMENT côté Rust (D6) : aucun `fetch`/
// client HTTP n8n dans le front (CSP stricte), aucun token ne transite par le front.
// Le front ne fait qu'`invoke` via cette façade. AUCUN secret de support côté app.

/**
 * Émet un message sur le canal « adresse » via la passerelle n8n (L6). Renvoie un
 * ack de PRISE EN CHARGE (`provider:"n8n"` en POST réel, `"mock"` si URL vide / flag
 * dev). Rejette avec un message lisible si n8n est injoignable, refuse l'envoi
 * (HTTP non-2xx) ou si le message est vide (dégradation propre côté Rust, zéro crash).
 *
 * `support` (slack/discord/mqtt) et `cible` (canal/salon/topic, chaîne opaque) sont
 * optionnels : `support` absent → la config `n8n_active_support` (puis défaut) côté
 * Rust. `meta` = contexte d'émission (émetteur, projet, ts…) — AUCUN secret.
 */
export function notifyUser(
  message: string,
  support?: NotifySupport,
  cible?: string,
  meta?: Record<string, unknown>,
): Promise<NotifyAck> {
  return call<NotifyAck>("notify_user", { message, support, cible, meta });
}

/**
 * Écrit le token (optionnel) du webhook n8n au keychain (WRITE-ONLY : jamais relu
 * vers le front). Une valeur vide retire le token. Header d'auth `X-API-Key`. Cf. D3.
 */
export function n8nSetToken(value: string): Promise<void> {
  return call<void>("n8n_set_token", { value });
}

/** Indique si un token de webhook n8n est enregistré (présence seule, jamais la valeur). */
export function n8nHasToken(): Promise<boolean> {
  return call<boolean>("n8n_has_token");
}

// --- Seed démo dev (L7) ---
//
// Orchestration de démo bornée CÔTÉ RUST par un flag dev (`cfg!(dev)` ou
// `IAKACOCKPIT_DEMO_SEED=1`) : en build de prod, la commande est inerte
// (`seeded:false`). Le seed (FS+git+config) vit côté Rust ; le front ne fait
// qu'`invoke` via cette façade, puis ouvre les onglets team (état UI).

/**
 * Seed de démo dev (idempotent, non destructif). Crée le mini-repo `iaka-demo`
 * sous le chapeau (si absent) et pose les clés config non sensibles (si absentes),
 * puis renvoie un `SeedReport`. **Inerte en prod** (`seeded:false`) : aucune
 * écriture. Le front ne déclenche l'ouverture des onglets team que si `seeded:true`.
 */
export function seedDemo(): Promise<SeedReport> {
  return call<SeedReport>("seed_demo");
}

// --- Préparation de reprise (L23 — retrait de la Table → état des lieux) ---
//
// Déclenchée EN TÂCHE DE FOND au retrait d'un projet de la Table (le retrait UI est
// immédiat, il n'attend PAS ce job). Régénère `specs/etat-des-lieux.md` à partir des
// faits git, CÔTÉ RUST (git::capture + std::fs::write, spawn_blocking). AUCUN
// add/commit/push, aucun réseau, aucun secret. Le front ne fait qu'`invoke` via cette façade.

/**
 * Prépare la reprise du projet `path` : régénère `specs/etat-des-lieux.md` (branche,
 * arbre propre/sale, N derniers commits). Résout un `ResumeReport` (`ok:true` même hors
 * git — état des lieux minimal, SA-3). Rejette avec un message lisible si le dossier est
 * introuvable ou l'écriture échoue (le hook `usePrepareResume` bascule alors en statut
 * d'erreur). Ne bloque pas l'UI (async côté Rust).
 */
export function prepareResume(path: string): Promise<ResumeReport> {
  return call<ResumeReport>("prepare_resume", { path });
}

// --- Pilotage vocal (L16-P1 — voix → action IHM) ---

/**
 * Écoute vocale **push-to-talk** : capture micro + STT **LOCAL** (whisper.cpp
 * côté `voice.rs`) → renvoie le texte transcrit. La voix ne quitte JAMAIS la
 * machine (offline, aucun envoi cloud). Le front résout ensuite le texte en
 * action IHM via le dispatcher pur (`src/voice/dispatcher.ts`). Rejette si le
 * backend natif n'est pas disponible (dev front pur / STT non branché) — le
 * hook `useVoiceCommand` dégrade proprement.
 */
export function voiceListen(): Promise<string> {
  return call<string>("voice_listen");
}

// --- Cadre iakaframe (L22 — persistance frame.json par team, AR-1) ---

/**
 * Charge le `frame.json` d'une team (chaîne JSON brute, ou `null` si absent). Rust est
 * agnostique du schéma : le front parse via `frame/model.parseFrame`. Non destructif.
 */
export function frameLoad(teamId: string): Promise<string | null> {
  return call<string | null>("frame_load", { teamId });
}

/** Écrit (atomique) le `frame.json` d'une team. Le front sérialise le `Frame`. */
export function frameSave(teamId: string, json: string): Promise<void> {
  return call<void>("frame_save", { teamId, json });
}

/**
 * L22-P2b — exporte les fichiers markdown du Cadre (un `agent.md` par agent, générés par
 * le front via `frame/export`) sous `<hat>/.iakacockpit/frames/<team>/`. Renvoie le chemin
 * du dossier. Rust est agnostique du contenu (il écrit ce que le front lui donne).
 */
export function frameExport(
  teamId: string,
  files: { name: string; content: string }[],
): Promise<string> {
  return call<string>("frame_export", { teamId, files });
}

/**
 * L22-P2 — le LLM embarqué **rédige** un artefact du Cadre : `kind` = `"skill"` (paragraphe
 * de skill) ou `"agent"` (brief d'agent). `context` = version actuelle (pour réviser).
 * Réutilise le type `ChatReply` (`content` = texte rédigé, `provider` = litellm|mock).
 * Mock/dégradation calqués L3/L8. Le front range le texte dans le `frame.json`.
 */
export function frameAuthor(
  kind: "skill" | "agent",
  name: string,
  instruction: string,
  context?: string,
): Promise<ChatReply> {
  return call<ChatReply>("frame_author", { kind, name, instruction, context });
}

// --- Handoff (H1 — réception d'un paquet livré par la forge, canal partagé, LECTURE seule) ---

/** Paquet de handoff brut lu dans le canal (chaînes JSON opaques ; le front tient le schéma). */
export interface RawHandoffPackage {
  /** Contenu de `team.json` (Team PURE `@iakaframe/core`), ou `null` si absent. */
  team_json: string | null;
  /** Contenu de `handoff.json` (provenance forge), ou `null` si absent. */
  handoff_json: string | null;
}

/** Lit le paquet de handoff d'une team depuis le canal partagé `<hat>/iaka-handoff/<teamId>/`. */
export function handoffRead(teamId: string): Promise<RawHandoffPackage> {
  return call<RawHandoffPackage>("handoff_read", { teamId });
}

/** Liste les livraisons disponibles dans le canal (team_ids ayant un `team.json`). */
export function handoffList(): Promise<string[]> {
  return call<string[]>("handoff_list");
}

/** Horloge du backend (epoch ms UTC) — source d'`importedAt` ; jamais `Date.now()` côté JS. */
export function nowMillis(): Promise<number> {
  return call<number>("now_millis");
}

// --- Config (branchée sur le module L0, défaut racine calculé par OS) ---

/** Racine du chapeau (défaut calculé par OS si non persistée). */
export function getRoot(): Promise<string> {
  return call<string>("get_root");
}

/** Persiste la racine du chapeau. */
export function setRoot(root: string): Promise<void> {
  return call<void>("set_root", { root });
}

/** Lit une valeur de config (`null` si absente). */
export function configGet(key: string): Promise<string | null> {
  return call<string | null>("config_get", { key });
}

/** Écrit/maj une valeur de config. */
export function configSet(key: string, value: string): Promise<void> {
  return call<void>("config_set", { key, value });
}

/** Config NON sensible (secrets exclus). */
export function configAll(): Promise<Record<string, string>> {
  return call<Record<string, string>>("config_all");
}

// --- PTY (sessions terminal cross-OS) ---
//
// L'abonnement aux événements `pty://output/{id}` et `pty://closed/{id}` (via
// `@tauri-apps/api/event`) est PRÉPARÉ ici (noms documentés) mais consommé en L2
// avec xterm.js. L1 n'expose que les commandes.

/** Ouvre une session PTY (shell par OS ; `cwd` validé sous le chapeau côté Rust). */
export function ptyOpen(
  id: string,
  cwd?: string,
  cols?: number,
  rows?: number,
): Promise<void> {
  return call<void>("pty_open", { id, cwd, cols, rows });
}

/** Écrit dans la session PTY `id`. */
export function ptyWrite(id: string, data: string): Promise<void> {
  return call<void>("pty_write", { id, data });
}

/** Redimensionne la session PTY `id`. */
export function ptyResize(id: string, cols: number, rows: number): Promise<void> {
  return call<void>("pty_resize", { id, cols, rows });
}

/** Ferme la session PTY `id`. */
export function ptyClose(id: string): Promise<void> {
  return call<void>("pty_close", { id });
}

// --- Chef-runner en TUI native dans le PTY (L10a) ---
//
// Le chef-runner (`claude` en TUI NATIVE interactive) tourne dans le MÊME PTY que le
// shell legacy (terminal.rs étendu — PAS la couture pipes parquée). Il émet les MÊMES
// événements `pty://output|closed/{id}` : la frappe va au stdin, la TUI native rend ses
// réflexes (Shift+Tab, esc, box, dialogues de confiance). Le `session_id` (uuid)
// pré-généré côté Rust est renvoyé ici : clef qui reliera PTY ↔ transcript JSONL ↔
// session (le tailer du transcript = L10b ; ici on ne fait que lancer + récupérer la clef).

/**
 * Type de chef-runner ouvert dans un PTY. `claude-code` (L10a) et `codex` (runner Codex
 * réel) = TUI natives conversationnelles avec vues dérivées d'un transcript on-disk ;
 * `shell` = repli legacy.
 */
export type ChefRunnerKind = "claude-code" | "codex" | "shell";

/**
 * Miroir de `terminal::RunnerSession` (Rust, L10a). `session_id` = clef PTY ↔ transcript
 * ↔ session (consommée par le tailer L10b). `transcript_path` = chemin PRÉVU du transcript
 * JSONL Claude (`~/.claude/projects/<escaped>/<session_id>.jsonl`) — **VIDE pour codex**
 * (le rollout est découvert par cwd) et pour le repli `shell`. `started_at_ms` = horodatage
 * du spawn (borne basse de récence pour la découverte du rollout Codex ; ignoré par Claude).
 */
export interface RunnerSession {
  session_id: string;
  transcript_path: string;
  started_at_ms: number;
}

/**
 * Ouvre un chef-runner dans un PTY (`claude` en TUI native par défaut ; `cwd` validé
 * sous le chapeau côté Rust). `model` optionnel → défaut Rust (réglage global = P3).
 * Émet `pty://output|closed/{id}` (réutilise `onPtyOutput`/`onPtyClosed`). Renvoie le
 * `RunnerSession` (session_id + chemin de transcript prévu).
 */
export function ptyRunnerOpen(
  id: string,
  kind: ChefRunnerKind,
  model?: string,
  cwd?: string,
  cols?: number,
  rows?: number,
): Promise<RunnerSession> {
  return call<RunnerSession>("pty_runner_open", {
    id,
    kind,
    model,
    cwd,
    cols,
    rows,
  });
}

// --- Tailer du transcript JSONL → vues filtrées (L10b) ---
//
// Le tailer (côté Rust, transcript.rs) lit le transcript JSONL que Claude Code écrit
// EN DIRECT, parse chaque record (CSP/D7 : tout le parse vit côté Rust) et émet des
// `RunnerEvent` typés homogènes sur `runner://event/{session_id}`. Le front ne fait
// que démarrer/arrêter le tailer et s'abonner — AUCUN parse de format au front.

/** Canal d'une vue dérivée (miroir de `transcript::EventKind`, Rust). */
export type RunnerEventKind =
  | "parole"
  | "geste"
  | "delegation"
  | "activite"
  | "pensee"
  | "economie";

/**
 * Miroir de `transcript::RunnerEvent` (Rust, L10b) — une vue dérivée du transcript.
 * Les champs optionnels sont OMIS côté Rust quand absents (snake_case, D7).
 * - `parole` : `text` = parole (user tapé / assistant) ;
 * - `geste` : `tool_name`/`tool_use_id`/`tool_input` (tool_use hors Task) ;
 * - `delegation` : `agent` = subagent_type, `text` = description (tool_use Task) ;
 * - `activite` : `tool_use_id`/`text` (tool_result, fin de geste) ;
 * - `pensee` : `text` = réflexion interne (canal masquable).
 * `is_sidechain` distingue le fil d'un sous-agent délégué.
 */
export interface RunnerEvent {
  kind: RunnerEventKind;
  role: "user" | "assistant";
  is_sidechain: boolean;
  agent?: string;
  text?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: string;
  ts?: string;
}

/**
 * Démarre le tailer du transcript `transcriptPath` (chemin PRÉVU renvoyé par
 * `ptyRunnerOpen`) et fait émettre ses `RunnerEvent` sur `runner://event/{sessionId}`.
 * Idempotent côté Rust (un tailer déjà actif n'est pas redémarré) ; un `transcriptPath`
 * vide (repli `shell`) est un no-op. `sessionId` = `session_id` du `RunnerSession`.
 */
export function transcriptTailStart(
  sessionId: string,
  transcriptPath: string,
): Promise<void> {
  // Tauri v2 attend les arguments de commande en camelCase (mappés vers les params
  // snake_case Rust `session_id`/`transcript_path`). ⚠️ Les AUTRES commandes n'ont que
  // des params d'UN seul mot (`id`, `cwd`, `path`…) → camelCase == snake_case, donc le
  // bug ne s'y voyait pas ; ici les params en DEUX mots l'exposent. Passer snake_case
  // faisait rejeter l'appel (« missing required key sessionId ») → le tailer ne démarrait
  // JAMAIS (chat muet). On envoie donc bien `sessionId`/`transcriptPath`.
  return call<void>("transcript_tail_start", {
    sessionId,
    transcriptPath,
  });
}

/** Arrête le tailer du `sessionId` (le PTY/runner n'est pas affecté). No-op si inactif. */
export function transcriptTailStop(sessionId: string): Promise<void> {
  // camelCase attendu par Tauri v2 (cf. `transcriptTailStart`).
  return call<void>("transcript_tail_stop", { sessionId });
}

/**
 * Démarre le tailer du **rollout Codex** pour `sessionId` (clef d'événements renvoyée par
 * `ptyRunnerOpen` kind=codex), en le DÉCOUVRANT par `cwd` (+ récence `startedAtMs` = borne
 * basse pour ignorer un rollout d'un run précédent). Émet les MÊMES `RunnerEvent` sur
 * `runner://event/{sessionId}` que Claude (vues homogènes). Idempotent côté Rust ; un `cwd`
 * vide est un no-op. L'arrêt passe par `transcriptTailStop` (registre partagé). camelCase
 * attendu par Tauri v2 (cf. `transcriptTailStart`).
 */
export function codexTailStart(
  sessionId: string,
  cwd: string,
  startedAtMs: number,
): Promise<void> {
  return call<void>("codex_tail_start", { sessionId, cwd, startedAtMs });
}

// --- Abonnement aux événements PTY (DEP-5) ---
//
// Helpers d'abonnement aux événements émis par Rust. C'est le SEUL endroit
// autorisé à importer `@tauri-apps/api/event` : aucun hook/composant ne doit
// `listen` directement (règle D6/D7, miroir de la règle `invoke`). Si un nouvel
// événement doit être consommé, il est ajouté ici comme helper typé.

/** Réexport du type de désabonnement de Tauri (sans exposer l'import event). */
export type { UnlistenFn };

/**
 * S'abonne au flux de sortie d'une session PTY (`pty://output/{id}`).
 * Renvoie une fonction de désabonnement à appeler au nettoyage.
 */
export function onPtyOutput(
  id: string,
  cb: (data: string) => void,
): Promise<UnlistenFn> {
  return listen<string>(`pty://output/${id}`, (e) => cb(e.payload));
}

/**
 * S'abonne à la fermeture d'une session PTY (`pty://closed/{id}`).
 * Renvoie une fonction de désabonnement à appeler au nettoyage.
 */
export function onPtyClosed(
  id: string,
  cb: () => void,
): Promise<UnlistenFn> {
  return listen<void>(`pty://closed/${id}`, () => cb());
}

// --- Chef-runner conversationnel : VUES dérivées du transcript (L10b) ---
//
// Le chef-runner (`claude` en TUI native) tourne dans un PTY (`ptyRunnerOpen`,
// cf. plus haut) ; les VUES filtrées (chat/gestes/délégations) sont dérivées du
// **transcript JSONL de session** que Claude Code écrit sur disque, tailé côté Rust
// (`transcriptTailStart`) et émis en `RunnerEvent` typés sur `runner://event/{sessionId}`.
// (La couture PIPES `stream-json` du spike P1 a été débranchée en L10a au profit de la
// TUI native — cf. backlog L10 ; ce code mort a été retiré.)

/**
 * S'abonne aux VUES dérivées du transcript (`runner://event/{sessionId}`, L10b) —
 * `RunnerEvent` typés émis par le tailer Rust. Le `sessionId` = `session_id` du
 * `RunnerSession`. Désabonnement à appeler au nettoyage. SEUL endroit autorisé à
 * `listen` (miroir D6/D7).
 */
export function onRunnerEvent(
  sessionId: string,
  cb: (event: RunnerEvent) => void,
): Promise<UnlistenFn> {
  return listen<RunnerEvent>(`runner://event/${sessionId}`, (e) => cb(e.payload));
}

/**
 * Façade backend. Exposée en objet pour faciliter le mock dans les tests, en plus
 * des exports nommés (utilisés directement par les hooks/composants en L2).
 */
export const backend = {
  call,
  isTauri,
  scanPortfolio,
  portfolioEconomy,
  portfolioActivity,
  addProject,
  listExtraProjects,
  pickDirectory,
  checkServices,
  getRoot,
  setRoot,
  configGet,
  configSet,
  configAll,
  nextStep,
  chat,
  aiSetKey,
  aiHasKey,
  fetchMainCourante,
  couchSetCredentials,
  couchHasCredentials,
  notifyUser,
  n8nSetToken,
  n8nHasToken,
  seedDemo,
  prepareResume,
  voiceListen,
  frameLoad,
  frameSave,
  frameExport,
  frameAuthor,
  handoffRead,
  handoffList,
  nowMillis,
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
  ptyRunnerOpen,
  transcriptTailStart,
  transcriptTailStop,
  codexTailStart,
  onPtyOutput,
  onPtyClosed,
  onRunnerEvent,
};

export type Backend = typeof backend;
