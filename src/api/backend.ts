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

/** Type de chef-runner ouvert dans un PTY (L10a). `shell` = repli legacy. */
export type ChefRunnerKind = "claude-code" | "shell";

/**
 * Miroir de `terminal::RunnerSession` (Rust, L10a). `session_id` = clef PTY ↔ transcript
 * ↔ session (consommée par le tailer L10b). `transcript_path` = chemin PRÉVU du transcript
 * JSONL (`~/.claude/projects/<escaped>/<session_id>.jsonl`). Vides pour le repli `shell`.
 */
export interface RunnerSession {
  session_id: string;
  transcript_path: string;
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

// --- Chef-runner conversationnel en PIPES (L10 P1) ---
//
// Le chef-runner (`claude` en mode flux structuré stream-json) tourne EN PIPES côté
// Rust (PAS un PTY : `claude` refuse le NDJSON sur un stdin TTY — finding spike P0).
// Le PARSE NDJSON vit côté Rust (D7/CSP : aucune logique de format/réseau dans le
// front). En P1, le front ne reçoit que le FLUX BRUT (`runner://raw`) — surface de
// rendu xterm ; le parse typé → vue filtrée (chat bulles) arrive en P2.

/** Type de runner (P1 : seul `"claude-code"` est connu côté Rust). */
export type RunnerKind = "claude-code";

/**
 * Ouvre une session chef-runner EN PIPES (spawn `claude` dans `cwd`, validé sous le
 * chapeau côté Rust). `model` optionnel → défaut Rust. Émet `runner://raw|stderr|
 * closed/{id}`.
 */
export function runnerOpen(
  id: string,
  kind: RunnerKind,
  model?: string,
  cwd?: string,
): Promise<void> {
  return call<void>("runner_open", { id, kind, model, cwd });
}

/**
 * Envoie un TOUR utilisateur au runner `id` : Rust enveloppe `text` en message NDJSON
 * `{"type":"user",…}` et l'écrit sur le MÊME stdin long-vécu (enchaînement des tours).
 */
export function runnerWrite(id: string, text: string): Promise<void> {
  return call<void>("runner_write", { id, text });
}

/** Interrompt l'outil en cours du runner `id` (`{"type":"interrupt"}` = `esc` ; le process survit). */
export function runnerInterrupt(id: string): Promise<void> {
  return call<void>("runner_interrupt", { id });
}

/** Ferme la session runner `id` (ferme stdin + termine le process). */
export function runnerClose(id: string): Promise<void> {
  return call<void>("runner_close", { id });
}

/**
 * S'abonne au FLUX BRUT du runner (`runner://raw/{id}`) — chaque ligne stdout du chef
 * (NDJSON verbatim en P1) à écrire dans la surface xterm. Désabonnement à appeler au
 * nettoyage. SEUL endroit autorisé à `listen` (miroir D6/D7).
 */
export function onRunnerRaw(
  id: string,
  cb: (line: string) => void,
): Promise<UnlistenFn> {
  return listen<string>(`runner://raw/${id}`, (e) => cb(e.payload));
}

/** S'abonne au flux stderr du runner (`runner://stderr/{id}`, diagnostics routés à part). */
export function onRunnerStderr(
  id: string,
  cb: (line: string) => void,
): Promise<UnlistenFn> {
  return listen<string>(`runner://stderr/${id}`, (e) => cb(e.payload));
}

/** S'abonne à la fin du runner (`runner://closed/{id}`, EOF stdout / process terminé). */
export function onRunnerClosed(
  id: string,
  cb: () => void,
): Promise<UnlistenFn> {
  return listen<void>(`runner://closed/${id}`, () => cb());
}

/**
 * Façade backend. Exposée en objet pour faciliter le mock dans les tests, en plus
 * des exports nommés (utilisés directement par les hooks/composants en L2).
 */
export const backend = {
  call,
  isTauri,
  scanPortfolio,
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
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
  ptyRunnerOpen,
  onPtyOutput,
  onPtyClosed,
  runnerOpen,
  runnerWrite,
  runnerInterrupt,
  runnerClose,
  onRunnerRaw,
  onRunnerStderr,
  onRunnerClosed,
};

export type Backend = typeof backend;
