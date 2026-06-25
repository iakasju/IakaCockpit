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
  aiSetKey,
  aiHasKey,
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
  onPtyOutput,
  onPtyClosed,
};

export type Backend = typeof backend;
