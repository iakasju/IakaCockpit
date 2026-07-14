//! terminal — sessions PTY interactives cross-OS (salvage iakaIDE L1).
//!
//! Une session = un onglet (`id` fourni par l'appelant) ; la sortie est streamée
//! au front par événement Tauri. Dé-Windows-isation gravée (D3) :
//! - le shell n'est PLUS `powershell.exe` en dur mais `shell::default_shell()`
//!   (pwsh/powershell sur Windows ; `$SHELL`/zsh/bash sur Unix) — socle L0 ;
//! - le `cwd`, s'il est fourni, DOIT rester sous le chapeau (`paths` L0) : un
//!   `cwd` qui s'évade est rejeté (`Err`) — un PTY est un vecteur d'exécution
//!   arbitraire, on ne l'ouvre pas hors périmètre (dette iakaIDE corrigée).
//!
//! Événements émis (le front L2 s'y abonnera) :
//! - `pty://output/{id}` -> `String` (flux de sortie) ;
//! - `pty://closed/{id}`  -> `()` (fin de session).
//!
//! **L10a — chef-runner en TUI NATIVE dans le PTY** (virage acté, spike L10b
//! `b7ac879`). En plus du shell legacy (`pty_open`), ce module ouvre un **chef-runner**
//! (`pty_runner_open`) : le **VRAI** `claude` lancé en TUI native interactive dans le
//! MÊME PTY (réflexes intacts : `Shift+Tab`, `esc`, box, dialogues). Le flux ANSI passe
//! par `pty://output/{id}` comme pour un shell ; la frappe va au stdin. Les **vues
//! filtrées** ne dérivent PAS de l'écran ANSI mais du **transcript JSONL** que Claude
//! Code écrit en direct (tailer = L10b). On NE réutilise PAS la couture pipes
//! `runner.rs` (parquée : elle tue la TUI). GOTCHA DUR du spike : l'env est **scrubbé**
//! (`CLAUDE_CODE_*`/`CLAUDECODE`) sinon le `claude` enfant se croit *nested* et n'écrit
//! AUCUN transcript. `session_id` (uuid) **pré-généré côté Rust** AVANT le spawn, passé
//! au runner ET renvoyé au front : clef qui reliera PTY <-> transcript <-> session.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::config::{read_chef_settings, ChefSettings};
use crate::paths::resolve_hat_root;
use crate::shell::default_shell;

/// Modèle Claude Code par défaut du chef-runner. Haiku = bon marché pour le dev/démo,
/// et éprouvé par le spike L10b. **L10b/P3** : devient le **fallback** d'une clé config
/// non sensible (`config::KEY_CHEF_MODEL`) — la constante n'est plus en dur dans le
/// spawn, elle ne sert qu'en l'absence de réglage persisté.
const DEFAULT_CHEF_MODEL: &str = "claude-haiku-4-5";

/// Allowlist d'outils du chef-runner — **défaut cadré** (arbitrage #2, § 4.5).
/// Lecture/exploration par défaut, **sans bypass global** (`--dangerously-skip-permissions`
/// INTERDIT). **L10b/P3** : devient le **fallback** d'une clé config éditable
/// (`config::KEY_CHEF_ALLOWED_TOOLS`). ⚠️ N'a d'effet que sur un workspace **trusté**
/// (sinon le CLI ignore l'allowlist — cf. PRÉ-REQUIS TRUST § 4.5 + [`TrustMode`]).
const CHEF_ALLOWED_TOOLS: &str = "Read,Glob,Grep,Bash";

/// Mode de trust par défaut (L10b/P3). `inherit` = on NE force rien : un cwd sous un
/// dossier parent déjà trusté hérite la confiance, sinon le dialogue natif s'affiche
/// dans la TUI (terminal = seul point de contrôle). Fallback de
/// `config::KEY_CHEF_TRUST_MODE`.
const DEFAULT_TRUST_MODE: &str = "inherit";

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct TermState(Mutex<HashMap<String, Session>>);

/// Valide qu'un `cwd` (chemin absolu fourni par le front) reste sous le chapeau
/// `root`. Logique PURE (aucun accès disque) → testable cross-OS.
///
/// Refuse :
/// - un chemin relatif (le front fournit toujours un absolu : un projet du chapeau) ;
/// - tout chemin contenant un composant `..` (`ParentDir`) : sans normalisation,
///   `starts_with` matche littéralement `<root>/../../etc` alors que l'OS le résout
///   HORS chapeau — un `cwd` légitime sous le chapeau n'a jamais besoin de `..` ;
/// - tout chemin qui n'est pas un descendant (ou égal) de `root`.
fn validate_cwd(root: &Path, cwd: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(cwd);
    if !candidate.is_absolute() {
        return Err(format!("cwd doit être un chemin absolu : {cwd}"));
    }
    if candidate
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(format!(
            "cwd contient un composant `..` (évasion possible) : {cwd}"
        ));
    }
    if !candidate.starts_with(root) {
        return Err(format!(
            "cwd hors du chapeau autorisé ({}) : {cwd}",
            root.to_string_lossy()
        ));
    }
    Ok(candidate.to_path_buf())
}

/// Ouvre une `PtyPair` à la taille demandée (défauts 80x24).
fn open_pty(cols: Option<u16>, rows: Option<u16>) -> Result<portable_pty::PtyPair, String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };
    pty_system.openpty(size).map_err(|e| e.to_string())
}

/// Spawn `cmd` dans le slave de `pair`, branche le thread de lecture
/// (`pty://output/{id}` puis `pty://closed/{id}` en fin) et enregistre la session.
/// **Logique commune** au shell legacy (`pty_open`) et au chef-runner
/// (`pty_runner_open`) : le PTY se comporte à l'identique (output→front, frappe→stdin).
fn spawn_into_state(
    app: &AppHandle,
    state: &State<TermState>,
    id: String,
    pair: portable_pty::PtyPair,
    cmd: CommandBuilder,
) -> Result<(), String> {
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Thread de lecture : pousse la sortie vers le front via événement Tauri.
    let app2 = app.clone();
    let id2 = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app2.emit(&format!("pty://output/{id2}"), s);
                }
                Err(_) => break,
            }
        }
        let _ = app2.emit(&format!("pty://closed/{id2}"), ());
    });

    state.0.lock().unwrap().insert(
        id,
        Session {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(())
}

#[tauri::command]
pub fn pty_open(
    app: AppHandle,
    state: State<TermState>,
    id: String,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<(), String> {
    let pair = open_pty(cols, rows)?;

    // Shell par OS (socle L0) — jamais `powershell.exe` en dur.
    let mut cmd = default_shell().to_command();

    // cwd optionnel : validé sous le chapeau avant tout spawn (D3).
    if let Some(d) = cwd.as_ref().filter(|d| !d.is_empty()) {
        let root = resolve_hat_root();
        let validated = validate_cwd(&root, d)?;
        cmd.cwd(validated);
    }

    spawn_into_state(&app, &state, id, pair, cmd)
}

#[tauri::command]
pub fn pty_write(state: State<TermState>, id: String, data: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let s = map.get_mut(&id).ok_or("session inconnue")?;
    s.writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    s.writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(state: State<TermState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = state.0.lock().unwrap();
    let s = map.get(&id).ok_or("session inconnue")?;
    s.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_close(state: State<TermState>, id: String) -> Result<(), String> {
    if let Some(mut s) = state.0.lock().unwrap().remove(&id) {
        let _ = s.child.kill();
    }
    Ok(())
}

// ===========================================================================
// L10a — Chef-runner en TUI native dans le PTY
// ===========================================================================

/// Mode de trust du cwd du chef-runner (L10b/P3, arbitrage § 4.5 + risque (f)).
/// Le **PRÉ-REQUIS TRUST** est gravé : si le workspace n'est pas trusté, le CLI
/// **IGNORE l'allowlist** (`Ignoring N permissions.allow entries… not trusted`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrustMode {
    /// **Défaut.** On NE force rien : un cwd sous un dossier parent déjà trusté
    /// (`~/work`) hérite la confiance ; sinon le dialogue natif de confiance s'affiche
    /// dans la TUI et l'utilisateur répond (terminal = seul point de contrôle). Aucune
    /// écriture de fichier.
    Inherit,
    /// **Pré-acceptation.** On assure (idempotent, non destructif) une entrée de
    /// confiance pour le cwd dans `~/.claude.json` AVANT le spawn, pour que le dialogue
    /// ne **bloque pas** l'auto-lancement hands-off (risque (f)). Pas de bypass de
    /// permissions (l'allowlist reste la politique) : on ne fait qu'« assurer le trust ».
    Accept,
}

impl TrustMode {
    /// Résout le mode depuis la config (absent → défaut `DEFAULT_TRUST_MODE` ; valeur
    /// inconnue → `Inherit`, sans surprise).
    fn from_config(value: Option<&str>) -> TrustMode {
        match value.unwrap_or(DEFAULT_TRUST_MODE) {
            "accept" => TrustMode::Accept,
            _ => TrustMode::Inherit,
        }
    }
}

/// D'où dérivent les **vues filtrées** (chat/gestes/…) du runner — point d'abstraction
/// `ConversationSource` (§ 4.2) côté SPAWN. Détermine ce que `pty_runner_open` renvoie au
/// front (chemin de transcript Claude vs rollout Codex découvert par cwd vs aucun).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ViewSource {
    /// Claude Code : transcript JSONL `~/.claude/projects/<escaped>/<session_id>.jsonl`
    /// (chemin DÉTERMINISTE, composé d'avance via `transcript_path`).
    ClaudeTranscript,
    /// Codex : rollout JSONL `~/.codex/sessions/…/rollout-<ts>-<thread_id>.jsonl` —
    /// `thread_id` généré par Codex (PAS pré-fixable) → **découvert** par le tailer Codex
    /// à partir du cwd (cf. `codex::discover_codex_rollout`) ; pas de chemin renvoyé ici.
    CodexRollout,
    /// Repli `shell` : aucune vue dérivée (pas de tailer).
    None,
}

/// Spécification d'un chef-runner (point d'abstraction L10 : passer de 1 à N runners
/// réels doit être une **extension**, pas une réécriture — PROJET § 2.3). `session_id`
/// = `Some(uuid)` pour les runners conversationnels (clef d'événements / tailer),
/// `None` pour le repli `shell`.
#[derive(Debug, Clone, PartialEq, Eq)]
struct RunnerSpec {
    /// `"claude-code"` (défaut), `"codex"`, ou `"shell"` (repli legacy = `default_shell()`).
    kind: String,
    /// Programme à lancer (résolu par OS — modèle `shell.rs`, jamais de chemin en dur).
    program: String,
    /// Arguments du programme.
    args: Vec<String>,
    /// Clef d'événements du runner conversationnel (`runner://event/{id}` + tailer).
    /// `claude-code` : ce même id est AUSSI passé en `--session-id` (transcript déterministe).
    /// `codex` : id d'événements seulement (PAS passé au binaire — Codex gère son thread_id).
    /// `shell` : `None`.
    session_id: Option<String>,
    /// Faut-il scrubber l'env `CLAUDE_CODE_*`/`CLAUDECODE` (claude-code uniquement — sinon le
    /// `claude` enfant se croit nested et n'écrit aucun transcript). Codex/shell : `false`.
    scrub_env: bool,
    /// Mode de trust du cwd (claude-code ; `Inherit` non pertinent pour codex/shell).
    trust_mode: TrustMode,
    /// D'où dérivent les vues (pilote le retour `transcript_path` de `pty_runner_open`).
    view_source: ViewSource,
}

/// Compte rendu d'ouverture d'un chef-runner, renvoyé au front (D7, snake_case).
/// `session_id` = clef qui reliera PTY <-> transcript JSONL <-> session (consommée par
/// le tailer L10b). `transcript_path` = chemin PRÉVU du transcript (utile au critère
/// L10a « un transcript apparaît » et au tailer L10b). Vides pour le repli `shell`.
#[derive(Debug, Clone, Serialize)]
pub struct RunnerSession {
    pub session_id: String,
    pub transcript_path: String,
    /// Horodatage du spawn (epoch **millisecondes**). Pour Codex, c'est la **borne basse de
    /// récence** transmise au tailer (`codex_tail_start`) afin de découvrir le rollout du
    /// run COURANT et pas celui d'un run précédent dans le même projet. Claude l'ignore
    /// (transcript déterministe par `session_id`) ; le shell le renvoie aussi (inoffensif).
    pub started_at_ms: u64,
}

/// Nom du binaire Claude Code par OS (modèle `shell.rs` : pas de chemin en dur, la
/// résolution PATH est faite au spawn). Sur Windows le lanceur npm est `claude.cmd`.
fn claude_program() -> String {
    if cfg!(windows) {
        "claude.cmd".to_string()
    } else {
        "claude".to_string()
    }
}

/// Obligation de RÔLE du coordinateur (L19, décision Stéphane) : planifier les étapes,
/// planifier les délégations, et estimer les temps prévisionnels — encodés `[~Xmin]` en
/// tête d'item `TodoWrite` (option A, parsé par le Gantt). Injectée au système du
/// chef-runner. Si le runner ne produit rien → le Gantt reste en réalisé seul (honnête).
const COORDINATOR_OBLIGATION: &str = "En tant que coordinateur de l'équipe : AVANT d'exécuter, \
établis le plan des étapes avec l'outil TodoWrite. Préfixe CHAQUE étape de sa durée estimée \
entre crochets (ex. « [~5min] Cadrer »), et précise l'agent délégué quand l'étape est déléguée. \
Mets le plan à jour (statuts in_progress/completed) au fil de l'avancement.";

/// Arguments du chef-runner `claude-code` (TUI native — PAS de `--print`, prouvé spike
/// L10b). `--session-id` rend le transcript DÉTERMINISTE ; `--allowedTools` = allowlist
/// (réglage global L10b/P3, ou **dérivée du Cadre de la team** L22-P3, défaut
/// `CHEF_ALLOWED_TOOLS`), **jamais** `--dangerously-skip-permissions` ;
/// `--append-system-prompt` porte l'obligation de rôle du coordinateur (L19) **PUIS**,
/// L22-P3, le `system_prompt_extra` dérivé du Cadre (obligations + paragraphes de skills
/// et brief de l'agent coordinateur). L'extra est ajouté APRÈS L19 (jamais à sa place) ;
/// une valeur `None`/vide laisse seulement l'obligation L19 (historique). Schéma figé Rust.
fn chef_args(
    session_id: &str,
    model: &str,
    allowed_tools: &str,
    system_prompt_extra: Option<&str>,
) -> Vec<String> {
    let mut system_prompt = COORDINATOR_OBLIGATION.to_string();
    if let Some(extra) = system_prompt_extra.map(str::trim).filter(|s| !s.is_empty()) {
        system_prompt.push_str("\n\n");
        system_prompt.push_str(extra);
    }
    vec![
        "--session-id".to_string(),
        session_id.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--allowedTools".to_string(),
        allowed_tools.to_string(),
        "--append-system-prompt".to_string(),
        system_prompt,
    ]
}

/// Emplacement du binaire `codex` dans le **bundle de l'app desktop** Codex (macOS) — il
/// n'est PAS sur le PATH (livré dans `Codex.app`). Résolu en priorité s'il existe.
const CODEX_BUNDLE_PATH: &str = "/Applications/Codex.app/Contents/Resources/codex";

/// Résout le programme `codex` à partir d'un prédicat d'existence du bundle (logique PURE,
/// testable sans I/O ni dépendance machine) : sur macOS, le **chemin absolu du bundle** s'il
/// existe ; sinon **fallback PATH** (`codex`, le spawn résoudra) — `codex.cmd` sur Windows.
fn resolve_codex_program(bundle_exists: bool) -> String {
    if cfg!(target_os = "macos") && bundle_exists {
        CODEX_BUNDLE_PATH.to_string()
    } else if cfg!(windows) {
        "codex.cmd".to_string()
    } else {
        "codex".to_string()
    }
}

/// Programme `codex` effectif (bundle macOS si présent → sinon PATH). Fait l'I/O d'existence
/// puis délègue la décision à [`resolve_codex_program`] (pure).
fn codex_program() -> String {
    resolve_codex_program(Path::new(CODEX_BUNDLE_PATH).is_file())
}

/// Arguments du chef-runner `codex` (TUI native interactive — PAS de sous-commande `exec`,
/// qui serait non-interactive). Sans prompt (l'utilisateur saisit dans la TUI). `-m <model>`
/// uniquement si un modèle est fourni (sinon défaut Codex). **Aucun** `--dangerously-*`
/// (pas de bypass de sandbox/approbation) : le trust se règle nativement dans la TUI.
fn codex_args(model: &str) -> Vec<String> {
    let m = model.trim();
    if m.is_empty() {
        Vec::new()
    } else {
        vec!["-m".to_string(), m.to_string()]
    }
}

/// Construit la `RunnerSpec` d'un `kind`. `claude-code` → `claude` en TUI native avec
/// `session_id` pré-généré, **modèle / allowlist / trust résolus depuis les réglages
/// globaux** (L10b/P3) avec **fallback sur les constantes** si absents, **+
/// `system_prompt_extra` dérivé du Cadre de la team** (L22-P3) ajouté au system-prompt
/// après l'obligation L19. `codex` → `codex` en TUI native (binaire bundle/PATH, `-m` si
/// modèle, env conservé, trust natif ; `system_prompt_extra` ignoré — pas de
/// `--append-system-prompt` dans ses args). `shell` → repli legacy `default_shell()`
/// (login `-l` D10, sans session/scrub). Tout autre kind rejeté.
fn resolve_runner_spec(
    kind: &str,
    model: Option<String>,
    allowed_tools: Option<String>,
    trust_mode: Option<&str>,
    session_id: &str,
    system_prompt_extra: Option<String>,
) -> Result<RunnerSpec, String> {
    match kind {
        "claude-code" => {
            // Réglage global ou fallback constante (vide/blanc = défaut).
            let model = model
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_CHEF_MODEL.to_string());
            let tools = allowed_tools
                .filter(|t| !t.trim().is_empty())
                .unwrap_or_else(|| CHEF_ALLOWED_TOOLS.to_string());
            Ok(RunnerSpec {
                kind: kind.to_string(),
                program: claude_program(),
                args: chef_args(session_id, &model, &tools, system_prompt_extra.as_deref()),
                session_id: Some(session_id.to_string()),
                scrub_env: true,
                trust_mode: TrustMode::from_config(trust_mode),
                view_source: ViewSource::ClaudeTranscript,
            })
        }
        "codex" => {
            // Modèle = front uniquement (l'agent Codex porte son alias) ; on NE retombe PAS
            // sur le réglage GLOBAL claude (`chef.model` est un alias Claude — hors sujet).
            let model = model.unwrap_or_default();
            Ok(RunnerSpec {
                kind: kind.to_string(),
                program: codex_program(),
                args: codex_args(&model),
                // Id d'événements/tailer — PAS passé au binaire (Codex gère son thread_id).
                session_id: Some(session_id.to_string()),
                // Codex garde son env (config/auth `~/.codex`) : aucun scrub.
                scrub_env: false,
                // Trust natif dans la TUI (prompt si projet non trusté) — aucun bypass.
                trust_mode: TrustMode::Inherit,
                view_source: ViewSource::CodexRollout,
            })
        }
        "shell" => {
            let sh = default_shell();
            Ok(RunnerSpec {
                kind: kind.to_string(),
                program: sh.program,
                args: sh.args,
                session_id: None,
                scrub_env: false,
                trust_mode: TrustMode::Inherit,
                view_source: ViewSource::None,
            })
        }
        other => Err(format!("kind de chef-runner inconnu : {other}")),
    }
}

/// Le cwd est-il DÉJÀ marqué trusté dans le JSON de config Claude ? (`projects[cwd]
/// .hasTrustDialogAccepted == true`). Pur/testable. Sert de garde d'idempotence pour
/// ne pas réécrire `~/.claude.json` inutilement (mode `Accept`).
fn cwd_already_trusted(existing: &Option<Value>, cwd: &str) -> bool {
    existing
        .as_ref()
        .and_then(|v| v.get("projects"))
        .and_then(|p| p.get(cwd))
        .and_then(|e| e.get("hasTrustDialogAccepted"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

/// Fusionne (NON destructif) une entrée de confiance pour `cwd` dans le JSON de config
/// Claude (`~/.claude.json`). Préserve **toutes** les autres clés ; crée `projects`
/// puis `projects[cwd]` s'ils manquent et y pose `hasTrustDialogAccepted = true`.
/// PUR/testable (aucun I/O). Un `existing` non-objet est remplacé par un objet neuf.
fn merge_trust_entry(existing: Option<Value>, cwd: &str) -> Value {
    let mut root = match existing {
        Some(v @ Value::Object(_)) => v,
        _ => Value::Object(serde_json::Map::new()),
    };
    let obj = root.as_object_mut().expect("root est un objet");
    let projects = obj
        .entry("projects")
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    if !projects.is_object() {
        *projects = Value::Object(serde_json::Map::new());
    }
    let projects = projects.as_object_mut().unwrap();
    let entry = projects
        .entry(cwd.to_string())
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    if !entry.is_object() {
        *entry = Value::Object(serde_json::Map::new());
    }
    entry
        .as_object_mut()
        .unwrap()
        .insert("hasTrustDialogAccepted".to_string(), Value::Bool(true));
    root
}

/// Écriture ATOMIQUE (temp + rename dans le même dossier) — limite le risque de course
/// avec les écritures que Claude Code fait lui-même sur `~/.claude.json`.
fn write_atomic(path: &Path, contents: &str) -> std::io::Result<()> {
    let tmp = path.with_file_name(".claude.json.iakacockpit.tmp");
    std::fs::write(&tmp, contents)?;
    std::fs::rename(&tmp, path)
}

/// Assure (best-effort, idempotent) le trust du `cwd` dans `~/.claude.json` (mode
/// `Accept`). Échec **silencieux** : on ne bloque JAMAIS le spawn (au pire le dialogue
/// natif s'affiche dans la TUI). No-op si le cwd est déjà trusté (pas de réécriture).
fn ensure_cwd_trusted(home: &Path, cwd: &str) {
    let path = home.join(".claude.json");
    let existing = std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok());
    if cwd_already_trusted(&existing, cwd) {
        return; // déjà trusté : aucune écriture (idempotent).
    }
    let merged = merge_trust_entry(existing, cwd);
    if let Ok(s) = serde_json::to_string_pretty(&merged) {
        let _ = write_atomic(&path, &s);
    }
}

/// Prédicat PUR de scrub d'environnement (GOTCHA DUR n°1 du spike L10b). Un `claude`
/// enfant qui hérite de `CLAUDECODE` / `CLAUDE_CODE_*` se croit *nested* et N'ÉCRIT
/// AUCUN transcript top-level. On retire largement (défensif) ces variables + quelques
/// marqueurs d'agent. Borné à `CLAUDE_CODE_*` (pas tout `CLAUDE_*`) pour ne pas casser
/// une éventuelle config légitime.
fn should_scrub_env(key: &str) -> bool {
    key.starts_with("CLAUDE_CODE_") || matches!(key, "CLAUDECODE" | "CLAUDE_EFFORT" | "AI_AGENT")
}

/// Fixe `TERM=xterm-256color` pour que la TUI native (claude OU codex) se rende correctement
/// (calque spike). Partagé par tous les runners conversationnels.
fn set_tui_term(cmd: &mut CommandBuilder) {
    cmd.env("TERM", "xterm-256color");
}

/// Applique le scrub d'env sur le `CommandBuilder` (qui hérite par défaut de l'env du
/// process courant) : retire toute variable que [`should_scrub_env`] désigne. Fixe aussi
/// `TERM` pour la TUI native (claude uniquement — codex conserve son env).
fn apply_env_scrub(cmd: &mut CommandBuilder) {
    for (key, _) in std::env::vars_os() {
        if key.to_str().is_some_and(should_scrub_env) {
            cmd.env_remove(&key);
        }
    }
    set_tui_term(cmd);
}

/// Escaping du chemin de projet → nom de dossier de transcript. Règle RÉELLE de Claude
/// Code, confirmée empiriquement (recette Legolas) : chemin **absolu**, chaque caractère
/// **non alphanumérique ASCII** (`[^A-Za-z0-9]`) remplacé **un-pour-un** par `-` ; la
/// **casse est conservée**. Donc `/`, `.`, **`_`**, espace, accent… → `-`
/// (ex. `/Users/sjupin/work/iaka_probe underscore`
/// → `-Users-sjupin-work-iaka-probe-underscore`).
///
/// ⚠️ Ne surtout PAS restreindre à `/` et `.` (ancien bug L10) : un `_`/espace/accent dans
/// le chapeau ferait pointer `transcript_path` vers un dossier JAMAIS créé → le tailer
/// attendrait indéfiniment → **chat muet à vie pour ce projet, sans erreur**. Le filet de
/// `transcript::resolve_transcript` (recherche par `session_id`) couvre en plus toute
/// dérive future de cette règle. *(Windows : règle à confirmer ; macOS/Linux = prouvé.)*
fn escape_cwd(cwd: &str) -> String {
    cwd.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect()
}

/// Dossier de transcripts de session d'un `cwd` : `<home>/.claude/projects/<escaped>/`.
/// UNIQUE point de composition de ce dossier (réutilise `escape_cwd`) — partagé par
/// `transcript_path` (chemin d'UNE session) et `latest_transcript` (scan de la session
/// vivante, L25). Pur/testable.
fn transcript_dir(home: &Path, cwd: &str) -> PathBuf {
    home.join(".claude").join("projects").join(escape_cwd(cwd))
}

/// Chemin PRÉVU du transcript JSONL pour `(cwd, session_id)` :
/// `<home>/.claude/projects/<escaped>/<session_id>.jsonl`. Pur/testable (le tailer L10b
/// le consommera ; ici on le renvoie au front au titre du critère L10a).
fn transcript_path(home: &Path, cwd: &str, session_id: &str) -> PathBuf {
    transcript_dir(home, cwd).join(format!("{session_id}.jsonl"))
}

/// Session VIVANTE détectée sur disque pour un `cwd` (L25 F1). `session_id` = nom du
/// fichier transcript sans extension (clef PTY/tailer ↔ transcript) ; `path` = chemin
/// absolu du `.jsonl` ; `mtime_epoch` = date de dernière modification (epoch secondes).
/// Miroir TS `LatestTranscript` (snake_case, D7).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LatestTranscript {
    pub session_id: String,
    pub path: String,
    pub mtime_epoch: u64,
}

/// Cherche le transcript `*.jsonl` le PLUS RÉCEMMENT MODIFIÉ (mtime) dans `dir` — la
/// **session vivante** du projet (L25). `None` si le dossier est absent/vide ou ne
/// contient aucun `.jsonl`. Lecture de répertoire seule (aucun I/O réseau). PUR/testable
/// (le dossier est passé en paramètre : pas de dépendance au `home` de la machine).
fn latest_transcript_in(dir: &Path) -> Option<LatestTranscript> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        // On ne retient QUE les `*.jsonl` (les autres fichiers du dossier sont ignorés).
        if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) if m.is_file() => m,
            _ => continue,
        };
        let mtime = match meta.modified() {
            Ok(t) => t,
            Err(_) => continue,
        };
        let is_better = best.as_ref().map(|(m, _)| mtime > *m).unwrap_or(true);
        if is_better {
            best = Some((mtime, path));
        }
    }
    let (mtime, path) = best?;
    let session_id = path.file_stem()?.to_string_lossy().into_owned();
    let mtime_epoch = mtime
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Some(LatestTranscript {
        session_id,
        path: path.to_string_lossy().into_owned(),
        mtime_epoch,
    })
}

/// Détecte la **session vivante** d'un `cwd` (L25 F1) : le transcript `*.jsonl` le plus
/// récemment modifié dans `<home>/.claude/projects/<escaped>/` (même échappement que
/// `transcript_path`, réutilisé via `transcript_dir` — pas de constante chemin en dur,
/// cross-OS socle L0). Renvoie `None` si aucune session sur disque. **Lecture seule**,
/// aucun I/O réseau : le front l'appelle AVANT d'ouvrir un projet pour s'ATTACHER à la
/// conversation en cours (vue live) plutôt que spawner un runner vierge. Aucun risque de
/// traversal : `escape_cwd` remplace tout caractère non alphanumérique (dont `/`, `.`,
/// `..`) par `-`, donc le nom de dossier composé ne peut pas s'évader de `projects/`.
#[tauri::command]
pub fn latest_transcript(cwd: String) -> Result<Option<LatestTranscript>, String> {
    Ok(latest_transcript_in(&transcript_dir(&home_dir(), &cwd)))
}

/// L26 — bascule le **plein écran OS** de la fenêtre courante (mode focus de la Table).
/// Passe par NOTRE commande (façade unique D7) plutôt que par le plugin window JS : évite
/// la config de capabilities côté front et garde tout l'accès backend dans `backend.ts`.
/// `on=true` = plein écran (vert / entrée en focus), `on=false` = fenêtré. Idempotent
/// (Tauri no-op si déjà dans l'état demandé). AR-1 : le feu jaune ne l'appelle PAS — la
/// sortie du plein écran reste au contrôle natif macOS. NON testé unitairement : les
/// commandes de fenêtre exigent un runtime Tauri (pas de `WebviewWindow` hors app).
#[tauri::command]
pub fn set_fullscreen(window: tauri::WebviewWindow, on: bool) -> Result<(), String> {
    window.set_fullscreen(on).map_err(|e| e.to_string())
}

/// Ouvre un **chef-runner** dans un PTY : `claude` en TUI native (kind `claude-code`,
/// défaut) ou le shell legacy (kind `shell`). `session_id` (uuid) est **pré-généré ici**
/// AVANT le spawn, passé au runner ET renvoyé au front. Le `cwd` (si fourni) DOIT rester
/// sous le chapeau (rejeté sinon — `validate_cwd`). Émet `pty://output|closed/{id}` comme
/// un shell (PTY inchangé). **Trust (§ 4.5)** : on NE force PAS la confiance ni le bypass ;
/// le PTY étant interactif, un éventuel dialogue de confiance s'affiche dans la TUI et
/// l'utilisateur répond nativement (jamais de blocage silencieux) ; un cwd sous un dossier
/// parent déjà trusté (`~/work`) hérite la confiance.
// Commande Tauri : les arguments sont désérialisés par nom (pas de struct payload pour
// rester aligné sur `pty_open`/la façade D7) — d'où le dépassement assumé.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn pty_runner_open(
    app: AppHandle,
    state: State<TermState>,
    id: String,
    kind: String,
    model: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
    // L22-P3 : allowlist + system-prompt DÉRIVÉS du Cadre de la team du projet (front).
    // `None` = pas de Cadre applicable → repli sur le réglage global / la constante.
    allowed_tools: Option<String>,
    system_prompt_extra: Option<String>,
) -> Result<RunnerSession, String> {
    // session_id pré-généré côté Rust AVANT le spawn (clef PTY <-> transcript/événements).
    let session_id = Uuid::new_v4().to_string();
    // Horodatage du spawn (epoch ms) — borne basse de récence pour la découverte du rollout
    // Codex (cf. RunnerSession::started_at_ms). Capté AVANT le spawn (gap-immune).
    let started_at_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Réglages GLOBAUX du chef-runner (L10b/P3) lus en config non sensible (best-effort).
    // Le `model` explicite (param front) PRIME sur le réglage ; chacun retombe sur la
    // constante du module si absent (cf. `resolve_runner_spec`). ⚠️ Le fallback `chef.model`
    // est CLAUDE-centré (alias Claude) : on ne l'applique PAS à codex (modèle front-only).
    let chef: ChefSettings = crate::db::open(&app)
        .ok()
        .map(|conn| read_chef_settings(&conn))
        .unwrap_or_default();
    let effective_model = if kind == "codex" {
        model
    } else {
        model.or(chef.model)
    };
    // L22-P3 : l'allowlist DÉRIVÉE DU CADRE (param front) PRIME sur le réglage global,
    // qui prime lui-même sur la constante (fallback dans `resolve_runner_spec`). `None`
    // des deux → constante = comportement historique (zéro régression).
    let effective_tools = allowed_tools
        .filter(|t| !t.trim().is_empty())
        .or(chef.allowed_tools);
    let spec = resolve_runner_spec(
        &kind,
        effective_model,
        effective_tools,
        chef.trust_mode.as_deref(),
        &session_id,
        system_prompt_extra,
    )?;

    let pair = open_pty(cols, rows)?;

    let mut cmd = CommandBuilder::new(&spec.program);
    cmd.args(&spec.args);

    // Env : claude scrub `CLAUDE_CODE_*` (sinon AUCUN transcript — gotcha spike) + fixe TERM ;
    // codex conserve son env (`~/.codex` config/auth) mais a besoin de TERM pour sa TUI.
    if spec.scrub_env {
        apply_env_scrub(&mut cmd);
    } else if spec.view_source == ViewSource::CodexRollout {
        set_tui_term(&mut cmd);
    }

    // cwd optionnel : validé sous le chapeau avant tout spawn (anti-évasion, D3).
    let validated_cwd = match cwd.as_ref().filter(|d| !d.is_empty()) {
        Some(d) => {
            let root = resolve_hat_root();
            let v = validate_cwd(&root, d)?;
            cmd.cwd(&v);
            Some(v)
        }
        None => None,
    };

    // Mode de trust `Accept` (réglage global, **claude-code uniquement**) : pré-acceptation
    // idempotente du cwd dans `~/.claude.json` AVANT le spawn, pour que le dialogue ne bloque
    // pas l'auto-lancement (risque (f)). Codex a son propre trust (TUI native) → jamais ici.
    if spec.trust_mode == TrustMode::Accept && spec.view_source == ViewSource::ClaudeTranscript {
        if let Some(cwd) = &validated_cwd {
            ensure_cwd_trusted(&home_dir(), &cwd.to_string_lossy());
        }
    }

    spawn_into_state(&app, &state, id, pair, cmd)?;

    // Chemin de transcript renvoyé au front :
    //   - claude-code + cwd connu → chemin DÉTERMINISTE `~/.claude/projects/…` ;
    //   - codex → VIDE (rollout découvert plus tard par cwd via `codex_tail_start`) ;
    //   - shell → VIDE (pas de tailer).
    let transcript = match (spec.view_source, &spec.session_id, &validated_cwd) {
        (ViewSource::ClaudeTranscript, Some(sid), Some(path)) => {
            transcript_path(&home_dir(), &path.to_string_lossy(), sid)
                .to_string_lossy()
                .into_owned()
        }
        _ => String::new(),
    };

    Ok(RunnerSession {
        session_id: spec.session_id.unwrap_or_default(),
        transcript_path: transcript,
        started_at_ms,
    })
}

/// Répertoire personnel (réutilise `dirs`, déjà au socle). Renvoie un chemin vide si
/// introuvable (le front retombe alors sur la seule `session_id`).
fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    // Base cross-OS : un chemin absolu cohérent avec l'OS courant (sinon
    // `is_absolute()` / `starts_with` divergent entre Windows et Unix).
    fn root() -> PathBuf {
        if cfg!(windows) {
            PathBuf::from("C:\\Users\\u\\work")
        } else {
            PathBuf::from("/home/u/work")
        }
    }

    fn under(sub: &str) -> String {
        root().join(sub).to_string_lossy().to_string()
    }

    #[test]
    fn cwd_sous_le_chapeau_est_accepte() {
        let p = validate_cwd(&root(), &under("projet")).unwrap();
        assert_eq!(p, root().join("projet"));
    }

    #[test]
    fn cwd_egal_au_chapeau_est_accepte() {
        let r = root();
        let cwd = r.to_string_lossy().to_string();
        assert_eq!(validate_cwd(&r, &cwd).unwrap(), r);
    }

    #[test]
    fn cwd_relatif_est_rejete() {
        assert!(validate_cwd(&root(), "projet/src").is_err());
    }

    #[test]
    fn cwd_qui_sevade_du_chapeau_est_rejete() {
        let escape = if cfg!(windows) {
            "C:\\Windows\\System32"
        } else {
            "/etc/passwd"
        };
        let err = validate_cwd(&root(), escape).unwrap_err();
        assert!(err.contains("hors du chapeau"));
    }

    #[test]
    fn cwd_avec_parent_dir_est_rejete() {
        // `<root>/../../etc/passwd` matcherait `starts_with(root)` littéralement
        // mais s'évade une fois résolu par l'OS : les composants `..` sont refusés.
        let escape = root().join("..").join("..").join("etc").join("passwd");
        let err = validate_cwd(&root(), &escape.to_string_lossy()).unwrap_err();
        assert!(err.contains("`..`"));

        let deep = root()
            .join("sub")
            .join("..")
            .join("..")
            .join("..")
            .join("etc");
        assert!(validate_cwd(&root(), &deep.to_string_lossy()).is_err());
    }

    #[test]
    fn cwd_voisin_au_meme_prefixe_litteral_est_rejete() {
        // `/home/u/work-secret` ne doit PAS passer juste parce que la chaîne
        // commence par `/home/u/work` : `starts_with` opère par composants de
        // chemin, pas par préfixe de chaîne.
        let sibling = if cfg!(windows) {
            "C:\\Users\\u\\work-secret\\x"
        } else {
            "/home/u/work-secret/x"
        };
        assert!(validate_cwd(&root(), sibling).is_err());
    }

    // ===================================================================
    // L10a — chef-runner (résolution, args, scrub env, transcript escaping)
    // ===================================================================

    const SID: &str = "11111111-2222-3333-4444-555555555555";

    #[test]
    fn claude_program_est_coherent_avec_los() {
        let p = claude_program();
        assert!(!p.is_empty());
        if cfg!(windows) {
            assert_eq!(p, "claude.cmd");
        } else {
            assert_eq!(p, "claude");
        }
    }

    #[test]
    fn chef_args_porte_session_modele_et_allowlist() {
        let args = chef_args(SID, "claude-haiku-4-5", CHEF_ALLOWED_TOOLS, None);
        // session-id pré-généré + modèle + allowlist cadrée, appariés (flag, valeur).
        for (flag, value) in [
            ("--session-id", SID),
            ("--model", "claude-haiku-4-5"),
            ("--allowedTools", CHEF_ALLOWED_TOOLS),
        ] {
            let i = args.iter().position(|a| a == flag).expect("flag présent");
            assert_eq!(args.get(i + 1).map(String::as_str), Some(value));
        }
    }

    #[test]
    fn chef_args_porte_l_obligation_coordinateur() {
        // L19 : le coordinateur reçoit l'obligation de planifier + estimer (option A).
        let args = chef_args(SID, "m", CHEF_ALLOWED_TOOLS, None);
        let i = args
            .iter()
            .position(|a| a == "--append-system-prompt")
            .expect("flag d'obligation présent");
        let prompt = args.get(i + 1).map(String::as_str).unwrap_or("");
        assert!(prompt.contains("TodoWrite"));
        assert!(prompt.contains("[~5min]"));
    }

    #[test]
    fn chef_args_honore_une_allowlist_personnalisee() {
        // L10b/P3 : l'allowlist est un réglage global (plus une constante en dur).
        let args = chef_args(SID, "m", "Read,Glob,Edit,Write", None);
        let i = args
            .iter()
            .position(|a| a == "--allowedTools")
            .expect("flag présent");
        assert_eq!(
            args.get(i + 1).map(String::as_str),
            Some("Read,Glob,Edit,Write")
        );
    }

    #[test]
    fn chef_args_ne_contient_jamais_bypass_ni_print() {
        // Garde anti-dérive (arbitrage #2) : ni bypass total, ni mode --print (TUI native).
        let args = chef_args(SID, "m", CHEF_ALLOWED_TOOLS, None);
        assert!(!args.iter().any(|a| a == "--dangerously-skip-permissions"));
        assert!(!args.iter().any(|a| a == "--print"));
    }

    #[test]
    fn chef_args_concatene_le_system_prompt_extra_du_cadre_apres_l19() {
        // L22-P3 : le Cadre injecte ses obligations/skills/brief APRÈS l'obligation L19,
        // jamais à sa place (le prompt contient les DEUX, dans l'ordre).
        let extra = "Obligation Cadre : commits atomiques.\n\nGit sûr : jamais push --force.";
        let args = chef_args(SID, "m", CHEF_ALLOWED_TOOLS, Some(extra));
        let i = args
            .iter()
            .position(|a| a == "--append-system-prompt")
            .expect("flag présent");
        let prompt = args.get(i + 1).map(String::as_str).unwrap_or("");
        // L19 conservée…
        assert!(prompt.contains("TodoWrite"));
        // …ET l'extra du Cadre ajouté après.
        assert!(prompt.contains("commits atomiques"));
        assert!(prompt.contains("jamais push --force"));
        let l19 = prompt.find("TodoWrite").unwrap();
        let cadre = prompt.find("commits atomiques").unwrap();
        assert!(l19 < cadre, "l'obligation L19 précède l'extra du Cadre");
    }

    #[test]
    fn chef_args_extra_none_ou_vide_ne_change_pas_le_prompt() {
        // Repli : `None` ou une chaîne blanche → strictement l'obligation L19 (historique).
        let base = chef_args(SID, "m", CHEF_ALLOWED_TOOLS, None);
        let blank = chef_args(SID, "m", CHEF_ALLOWED_TOOLS, Some("   "));
        assert_eq!(base, blank);
        let i = base
            .iter()
            .position(|a| a == "--append-system-prompt")
            .unwrap();
        assert_eq!(
            base.get(i + 1).map(String::as_str),
            Some(COORDINATOR_OBLIGATION)
        );
    }

    #[test]
    fn allowlist_par_defaut_est_lecture_exploration() {
        // Constante cadrée = lecture/exploration, sans écriture libre par défaut.
        assert_eq!(CHEF_ALLOWED_TOOLS, "Read,Glob,Grep,Bash");
    }

    #[test]
    fn resolve_spec_claude_code_par_defaut() {
        let spec = resolve_runner_spec("claude-code", None, None, None, SID, None).unwrap();
        assert_eq!(spec.kind, "claude-code");
        assert_eq!(spec.program, claude_program());
        assert_eq!(spec.session_id.as_deref(), Some(SID));
        assert!(spec.scrub_env);
        assert!(spec.args.iter().any(|a| a == DEFAULT_CHEF_MODEL));
        // Sans réglage allowlist → fallback constante.
        assert!(spec.args.iter().any(|a| a == CHEF_ALLOWED_TOOLS));
        // Sans réglage trust → Inherit (défaut).
        assert_eq!(spec.trust_mode, TrustMode::Inherit);
    }

    #[test]
    fn resolve_spec_honore_le_modele_fourni() {
        let spec = resolve_runner_spec(
            "claude-code",
            Some("claude-sonnet-4-5".into()),
            None,
            None,
            SID,
            None,
        )
        .unwrap();
        assert!(spec.args.iter().any(|a| a == "claude-sonnet-4-5"));
        assert!(!spec.args.iter().any(|a| a == DEFAULT_CHEF_MODEL));
    }

    #[test]
    fn resolve_spec_modele_vide_retombe_sur_le_defaut() {
        let spec =
            resolve_runner_spec("claude-code", Some("  ".into()), None, None, SID, None).unwrap();
        assert!(spec.args.iter().any(|a| a == DEFAULT_CHEF_MODEL));
    }

    #[test]
    fn resolve_spec_honore_allowlist_et_trust_des_reglages() {
        // L10b/P3 : allowlist éditable + trust mode lus depuis les réglages globaux.
        let spec = resolve_runner_spec(
            "claude-code",
            None,
            Some("Read,Glob".into()),
            Some("accept"),
            SID,
            None,
        )
        .unwrap();
        assert!(spec.args.iter().any(|a| a == "Read,Glob"));
        assert!(!spec.args.iter().any(|a| a == CHEF_ALLOWED_TOOLS));
        assert_eq!(spec.trust_mode, TrustMode::Accept);
    }

    #[test]
    fn resolve_spec_allowlist_vide_retombe_sur_le_defaut() {
        let spec =
            resolve_runner_spec("claude-code", None, Some("   ".into()), None, SID, None).unwrap();
        assert!(spec.args.iter().any(|a| a == CHEF_ALLOWED_TOOLS));
    }

    #[test]
    fn resolve_spec_claude_code_injecte_le_system_prompt_du_cadre() {
        // L22-P3 : le `system_prompt_extra` dérivé du Cadre atterrit dans le prompt du chef,
        // en plus de l'obligation L19.
        let spec = resolve_runner_spec(
            "claude-code",
            None,
            None,
            None,
            SID,
            Some("Brief coordinateur : cadrer avant d'exécuter.".into()),
        )
        .unwrap();
        let i = spec
            .args
            .iter()
            .position(|a| a == "--append-system-prompt")
            .expect("flag présent");
        let prompt = spec.args.get(i + 1).map(String::as_str).unwrap_or("");
        assert!(prompt.contains("TodoWrite")); // L19 conservée
        assert!(prompt.contains("cadrer avant d'exécuter")); // extra du Cadre
    }

    #[test]
    fn resolve_spec_codex_ignore_le_system_prompt_du_cadre() {
        // Codex n'a pas de `--append-system-prompt` dans ses args : l'extra est ignoré,
        // sans crash ni fuite du texte dans la ligne de commande.
        let spec = resolve_runner_spec(
            "codex",
            Some("gpt-5-codex".into()),
            None,
            None,
            SID,
            Some("ignoré côté codex".into()),
        )
        .unwrap();
        assert!(!spec.args.iter().any(|a| a == "--append-system-prompt"));
        assert!(!spec.args.iter().any(|a| a.contains("ignoré")));
    }

    #[test]
    fn resolve_spec_shell_est_le_repli_legacy_sans_session() {
        // Le repli shell = default_shell() (login -l D10), sans session-id ni scrub.
        let spec = resolve_runner_spec("shell", None, None, None, SID, None).unwrap();
        assert_eq!(spec.kind, "shell");
        assert_eq!(spec.program, default_shell().program);
        assert_eq!(spec.args, default_shell().args);
        assert!(spec.session_id.is_none());
        assert!(!spec.scrub_env);
        assert!(!spec.args.iter().any(|a| a == "--session-id"));
    }

    #[test]
    fn resolve_spec_rejette_un_kind_inconnu() {
        assert!(resolve_runner_spec("bidon", None, None, None, SID, None).is_err());
    }

    // ===================================================================
    // Runner Codex réel — résolution binaire, args, spec
    // ===================================================================

    #[test]
    fn resolve_codex_program_prend_le_bundle_macos_si_present() {
        let p = resolve_codex_program(true);
        if cfg!(target_os = "macos") {
            // macOS + bundle présent → chemin absolu du bundle Codex.app.
            assert_eq!(p, CODEX_BUNDLE_PATH);
        } else if cfg!(windows) {
            assert_eq!(p, "codex.cmd");
        } else {
            assert_eq!(p, "codex");
        }
    }

    #[test]
    fn resolve_codex_program_retombe_sur_le_path_sans_bundle() {
        // Bundle absent (ou hors macOS) → fallback PATH (`codex` / `codex.cmd`).
        let p = resolve_codex_program(false);
        if cfg!(windows) {
            assert_eq!(p, "codex.cmd");
        } else {
            assert_eq!(p, "codex");
        }
    }

    #[test]
    fn codex_args_vide_sans_modele() {
        assert!(codex_args("").is_empty());
        assert!(codex_args("   ").is_empty());
    }

    #[test]
    fn codex_args_porte_le_modele_avec_dash_m() {
        assert_eq!(codex_args("gpt-5-codex"), vec!["-m", "gpt-5-codex"]);
    }

    #[test]
    fn codex_args_n_a_jamais_de_bypass_ni_de_subcommand_exec() {
        // Garde anti-dérive : pas de bypass sandbox/approbation, pas de mode non-interactif.
        let args = codex_args("m");
        assert!(!args
            .iter()
            .any(|a| a == "--dangerously-bypass-approvals-and-sandbox"));
        assert!(!args.iter().any(|a| a == "exec"));
    }

    #[test]
    fn resolve_spec_codex_est_une_tui_native_sans_scrub_ni_trust_force() {
        let spec = resolve_runner_spec("codex", Some("gpt-5-codex".into()), None, None, SID, None)
            .unwrap();
        assert_eq!(spec.kind, "codex");
        assert_eq!(spec.program, codex_program());
        // Id d'événements présent (clef du tailer) MAIS pas passé en --session-id à codex.
        assert_eq!(spec.session_id.as_deref(), Some(SID));
        assert!(!spec.args.iter().any(|a| a == "--session-id"));
        assert!(spec.args.iter().any(|a| a == "gpt-5-codex"));
        // Codex garde son env (pas de scrub claude) et son trust natif (pas de pré-accept).
        assert!(!spec.scrub_env);
        assert_eq!(spec.trust_mode, TrustMode::Inherit);
        assert_eq!(spec.view_source, ViewSource::CodexRollout);
    }

    #[test]
    fn resolve_spec_codex_sans_modele_n_a_pas_de_dash_m() {
        let spec = resolve_runner_spec("codex", None, None, None, SID, None).unwrap();
        assert!(!spec.args.iter().any(|a| a == "-m"));
        assert_eq!(spec.view_source, ViewSource::CodexRollout);
    }

    #[test]
    fn claude_reste_la_source_transcript_deterministe() {
        // Non-régression : la branche claude-code garde bien sa view_source transcript.
        let spec = resolve_runner_spec("claude-code", None, None, None, SID, None).unwrap();
        assert_eq!(spec.view_source, ViewSource::ClaudeTranscript);
        assert!(spec.scrub_env);
    }

    // --- L10b/P3 : mode de trust + fusion de l'entrée ~/.claude.json ---

    #[test]
    fn trust_mode_from_config_resout_accept_et_defaut() {
        assert_eq!(TrustMode::from_config(Some("accept")), TrustMode::Accept);
        assert_eq!(TrustMode::from_config(Some("inherit")), TrustMode::Inherit);
        // Valeur inconnue / absente → Inherit (défaut, sans surprise).
        assert_eq!(TrustMode::from_config(Some("bidon")), TrustMode::Inherit);
        assert_eq!(TrustMode::from_config(None), TrustMode::Inherit);
        // La constante documentaire reflète bien le défaut.
        assert_eq!(
            TrustMode::from_config(Some(DEFAULT_TRUST_MODE)),
            TrustMode::Inherit
        );
    }

    #[test]
    fn merge_trust_entry_cree_l_entree_sur_un_json_absent() {
        let cwd = "/Users/u/work/iaka-demo";
        let merged = merge_trust_entry(None, cwd);
        assert!(cwd_already_trusted(&Some(merged), cwd));
    }

    #[test]
    fn merge_trust_entry_preserve_les_autres_cles() {
        // Schéma proche du vrai ~/.claude.json : on ne doit RIEN écraser d'autre.
        let existing: Value = serde_json::json!({
            "numStartups": 42,
            "projects": {
                "/Users/u/work/autre": { "hasTrustDialogAccepted": true, "history": [1, 2] }
            }
        });
        let cwd = "/Users/u/work/iaka-demo";
        let merged = merge_trust_entry(Some(existing), cwd);
        // L'entrée demandée est posée…
        assert!(cwd_already_trusted(&Some(merged.clone()), cwd));
        // …sans toucher aux clés/projets existants.
        assert_eq!(merged.get("numStartups").and_then(Value::as_i64), Some(42));
        let autre = merged
            .get("projects")
            .and_then(|p| p.get("/Users/u/work/autre"))
            .unwrap();
        assert_eq!(
            autre.get("hasTrustDialogAccepted").and_then(Value::as_bool),
            Some(true)
        );
        assert!(autre.get("history").is_some());
    }

    #[test]
    fn merge_trust_entry_remplace_un_json_non_objet() {
        // Un fichier corrompu (ex. tableau) ne fait pas paniquer : on repart d'un objet.
        let merged = merge_trust_entry(Some(serde_json::json!([1, 2, 3])), "/c");
        assert!(cwd_already_trusted(&Some(merged), "/c"));
    }

    #[test]
    fn cwd_already_trusted_est_faux_quand_absent() {
        assert!(!cwd_already_trusted(&None, "/c"));
        let existing = Some(serde_json::json!({ "projects": {} }));
        assert!(!cwd_already_trusted(&existing, "/c"));
        let untrusted = Some(serde_json::json!({
            "projects": { "/c": { "hasTrustDialogAccepted": false } }
        }));
        assert!(!cwd_already_trusted(&untrusted, "/c"));
    }

    #[test]
    fn scrub_env_cible_les_variables_de_session_claude() {
        // GOTCHA DUR : on retire CLAUDE_CODE_* / CLAUDECODE (sinon aucun transcript).
        assert!(should_scrub_env("CLAUDECODE"));
        assert!(should_scrub_env("CLAUDE_CODE_SESSION_ID"));
        assert!(should_scrub_env("CLAUDE_CODE_ENTRYPOINT"));
        assert!(should_scrub_env("CLAUDE_EFFORT"));
        assert!(should_scrub_env("AI_AGENT"));
    }

    #[test]
    fn scrub_env_epargne_les_variables_legitimes() {
        // Borné : on ne casse pas l'env général ni une config claude non-session.
        assert!(!should_scrub_env("HOME"));
        assert!(!should_scrub_env("PATH"));
        assert!(!should_scrub_env("TERM"));
        assert!(!should_scrub_env("CLAUDE_CONFIG_DIR")); // pas CLAUDE_CODE_*
    }

    #[test]
    fn escape_cwd_remplace_tout_non_alphanumerique_par_tiret() {
        // Règle RÉELLE de Claude Code (`[^A-Za-z0-9]` → `-`), casse conservée.
        assert_eq!(
            escape_cwd("/Users/sjupin/work/iaka-demo"),
            "-Users-sjupin-work-iaka-demo"
        );
        assert_eq!(
            escape_cwd("/Users/sjupin/work/IakaCockpit"),
            "-Users-sjupin-work-IakaCockpit"
        );
        // Un point dans un segment est AUSSI remplacé.
        assert_eq!(escape_cwd("/home/u/work/my.app"), "-home-u-work-my-app");
    }

    #[test]
    fn escape_cwd_remplace_underscore_espace_et_accent() {
        // RÉGRESSION B1 (« chat muet » latent) : l'ancienne règle ne remplaçait que `/`
        // et `.`, laissant `_`/espace/accent intacts → `transcript_path` pointait vers un
        // dossier inexistant → tailer en attente infinie. Preuve LIVE (Legolas) : un runner
        // lancé dans `…/iaka_probe_underscore` écrit dans `…-iaka-probe-underscore`.
        assert_eq!(
            escape_cwd("/Users/sjupin/work/iaka_probe_underscore"),
            "-Users-sjupin-work-iaka-probe-underscore"
        );
        // Espace (dossier « my project ») et tréma/accent : tous → `-`, un-pour-un.
        assert_eq!(escape_cwd("/Users/u/my project"), "-Users-u-my-project");
        assert_eq!(escape_cwd("/home/u/projét"), "-home-u-proj-t");
        // Chiffres et casse conservés tels quels.
        assert_eq!(escape_cwd("/v2/Repo3"), "-v2-Repo3");
    }

    #[test]
    fn transcript_path_compose_le_chemin_attendu() {
        let home = Path::new("/Users/sjupin");
        let p = transcript_path(home, "/Users/sjupin/work/iaka-demo", SID);
        assert_eq!(
            p,
            Path::new("/Users/sjupin/.claude/projects/-Users-sjupin-work-iaka-demo")
                .join(format!("{SID}.jsonl"))
        );
    }

    // ===================================================================
    // L25 F1 — détection de la session vivante (`latest_transcript`)
    // ===================================================================

    #[test]
    fn transcript_dir_compose_le_dossier_avec_l_echappement() {
        // Réutilise EXACTEMENT `escape_cwd` (underscore/espace → `-`) : le dossier de
        // scan de la session vivante = celui où Claude Code écrit les transcripts.
        let home = Path::new("/Users/sjupin");
        assert_eq!(
            transcript_dir(home, "/Users/sjupin/work/iaka-demo"),
            Path::new("/Users/sjupin/.claude/projects/-Users-sjupin-work-iaka-demo")
        );
        assert_eq!(
            transcript_dir(home, "/Users/u/work/iaka_probe underscore"),
            Path::new("/Users/sjupin/.claude/projects/-Users-u-work-iaka-probe-underscore")
        );
    }

    /// Crée une arène de transcripts temporaire UNIQUE (isolation entre tests parallèles).
    fn unique_transcripts_dir() -> std::path::PathBuf {
        use std::sync::atomic::{AtomicU64, Ordering};
        static SEQ: AtomicU64 = AtomicU64::new(0);
        let n = SEQ.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!(
            "iaka-latest-{}-{}-{n}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Écrit un `.jsonl` (nom `<stem>.jsonl`) et fixe son mtime à `epoch` secondes
    /// (déterministe : pas de dépendance à un `sleep` fragile entre écritures).
    fn write_jsonl_with_mtime(dir: &Path, stem: &str, epoch: u64) -> std::path::PathBuf {
        let path = dir.join(format!("{stem}.jsonl"));
        let f = std::fs::File::create(&path).unwrap();
        let when = std::time::UNIX_EPOCH + std::time::Duration::from_secs(epoch);
        f.set_modified(when).unwrap();
        path
    }

    #[test]
    fn latest_transcript_in_rend_le_plus_recemment_modifie() {
        let dir = unique_transcripts_dir();
        write_jsonl_with_mtime(&dir, "sid-old", 1_000);
        write_jsonl_with_mtime(&dir, "sid-live", 3_000); // le plus récent
        write_jsonl_with_mtime(&dir, "sid-mid", 2_000);

        let found = latest_transcript_in(&dir).expect("une session vivante");
        assert_eq!(found.session_id, "sid-live");
        assert_eq!(found.mtime_epoch, 3_000);
        assert!(found.path.ends_with("sid-live.jsonl"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn latest_transcript_in_ignore_les_non_jsonl() {
        let dir = unique_transcripts_dir();
        // Un fichier NON `.jsonl` PLUS récent ne doit PAS l'emporter.
        let other = dir.join("notes.txt");
        let f = std::fs::File::create(&other).unwrap();
        f.set_modified(std::time::UNIX_EPOCH + std::time::Duration::from_secs(9_000))
            .unwrap();
        write_jsonl_with_mtime(&dir, "sid-real", 2_000);

        let found = latest_transcript_in(&dir).expect("le seul .jsonl gagne");
        assert_eq!(found.session_id, "sid-real");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn latest_transcript_in_dossier_vide_rend_none() {
        let dir = unique_transcripts_dir();
        assert_eq!(latest_transcript_in(&dir), None);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn latest_transcript_in_dossier_absent_rend_none() {
        // Dossier jamais créé (projet sans aucune session) → None, pas d'erreur.
        let dir = std::env::temp_dir().join("iaka-latest-absent-xyz-jamais-cree");
        assert_eq!(latest_transcript_in(&dir), None);
    }
}
