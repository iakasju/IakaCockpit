//! codex — runner **Codex** réel : vues dérivées du *rollout* JSONL on-disk (jumeau L10).
//!
//! Codex suit EXACTEMENT le patron L10 de Claude Code : une **TUI native** hostée dans le
//! PTY (spawn = `terminal::pty_runner_open`, kind `codex`) **+ un transcript JSONL que le
//! CLI écrit EN DIRECT sur disque** — ici le *rollout* :
//! `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<thread_id>.jsonl`. On **tail**e ce rollout
//! exactement comme le transcript Claude (zéro parsing ANSI), et on émet les MÊMES
//! [`RunnerEvent`] homogènes sur `runner://event/{session_id}` (le front ne voit aucune
//! différence de runner — § ConversationSource de `transcript.rs`).
//!
//! ## Deux différences avec Claude (et SEULEMENT deux)
//! 1. **Découverte du fichier.** Le `thread_id` du rollout est généré par Codex (PAS
//!    pré-fixable comme le `--session-id` de Claude) → on ne peut pas composer le chemin
//!    à l'avance. On **découvre** donc le rollout : le `.jsonl` le plus récent sous
//!    `~/.codex/sessions/` dont `session_meta.cwd == cwd du projet` ET créé **après** le
//!    lancement du runner (`started_at_ms`, anti-rollout-périmé sur re-run). Calque l'esprit
//!    de `transcript::resolve_transcript` (filet par identité), appliqué au cwd.
//! 2. **Schéma des lignes.** Mapping propre à Codex (cf. [`map_codex_value`]) — paroles via
//!    `event_msg`, gestes/pensée via `response_item`. **Parse défensif** : toute ligne ou
//!    tout type inconnu est ignoré, jamais de panique (schéma encore mouvant — § risques).
//!
//! Le **live-tail** (held fd, EOF, lignes partielles, arrêt par `stop`) n'est PAS dupliqué :
//! il est partagé via `transcript::tail_resolved`. Le registre d'arrêt est le MÊME
//! ([`transcript::TranscriptState`]) → `transcript_tail_stop` arrête aussi un tailer Codex.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

use crate::transcript::{
    short_json, tail_resolved, ConversationSource, EventKind, RunnerEvent, TranscriptState,
    POLL_INTERVAL,
};

/// Sous-dossier (relatif au HOME) où Codex écrit ses rollouts de session.
const CODEX_SESSIONS_SUBDIR: &str = ".codex/sessions";

/// Marge (ms) retranchée à `started_at_ms` pour la découverte : absorbe la granularité de
/// `mtime` du système de fichiers et un léger décalage d'horloge, sans réembarquer un
/// rollout d'un run PRÉCÉDENT (ceux-ci sont bien plus vieux que cette marge).
const DISCOVERY_SKEW_MS: u64 = 2_000;

// ===========================================================================
// Source de vues Codex (mapping rollout → RunnerEvent homogène)
// ===========================================================================

/// Source de vues du runner **Codex** : parse une ligne du rollout JSONL. Jumeau de
/// `transcript::TranscriptSource` côté Claude — même contrat [`ConversationSource`].
pub struct CodexSource;

impl ConversationSource for CodexSource {
    fn map_record(&self, raw: &str) -> Vec<RunnerEvent> {
        let line = raw.trim();
        if line.is_empty() {
            return Vec::new();
        }
        match serde_json::from_str::<Value>(line) {
            Ok(o) => map_codex_value(&o),
            Err(_) => Vec::new(), // ligne non-JSON : ignorée (défensif).
        }
    }
}

/// Construit une `Parole` à partir d'un `message` (string) — ou rien si vide.
fn parole(role: &str, message: Option<&Value>, ts: &Option<String>) -> Vec<RunnerEvent> {
    let txt = message.and_then(Value::as_str).unwrap_or("").trim();
    if txt.is_empty() {
        return Vec::new();
    }
    vec![RunnerEvent {
        kind: EventKind::Parole,
        role: role.to_string(),
        is_sidechain: false,
        agent: None,
        text: Some(txt.to_string()),
        tool_name: None,
        tool_use_id: None,
        tool_input: None,
        ts: ts.clone(),
    }]
}

/// Construit une `Activite` portant un libellé (ex. nom d'événement de tâche).
fn activite(label: &str, ts: &Option<String>) -> RunnerEvent {
    RunnerEvent {
        kind: EventKind::Activite,
        role: "assistant".to_string(),
        is_sidechain: false,
        agent: None,
        text: Some(label.to_string()),
        tool_name: None,
        tool_use_id: None,
        tool_input: None,
        ts: ts.clone(),
    }
}

/// Un `response_item.payload.type` désigne-t-il un APPEL d'outil/commande (= geste) ?
/// ⚠️ **Shapes RÉELS À CONFIRMER en recette** (session read-only du spike = aucun appel) :
/// liste défensive des types connus du CLI Codex. Inconnu → ignoré (jamais de crash).
fn is_codex_tool_call(t: &str) -> bool {
    matches!(
        t,
        "function_call"
            | "local_shell_call"
            | "custom_tool_call"
            | "mcp_tool_call"
            | "exec_command"
    )
}

/// Un `response_item.payload.type` désigne-t-il un RÉSULTAT d'outil/commande (= activité) ?
fn is_codex_tool_result(t: &str) -> bool {
    matches!(
        t,
        "function_call_output"
            | "local_shell_call_output"
            | "custom_tool_call_output"
            | "mcp_tool_call_output"
            | "exec_command_output"
    )
}

/// Mappe un `event_msg` (canal d'événements de haut niveau de Codex) :
///   - `user_message`  → **Parole** (rôle user) ;
///   - `agent_message` → **Parole** (rôle assistant) ;
///   - `task_started`/`task_complete` → **Activite** (roster « au travail ») ;
///   - reste (`token_count`, …) → ignoré.
fn map_event_msg(payload: Option<&Value>, ts: &Option<String>) -> Vec<RunnerEvent> {
    let p = match payload {
        Some(p) => p,
        None => return Vec::new(),
    };
    let pt = match p.get("type").and_then(Value::as_str) {
        Some(x) => x,
        None => return Vec::new(),
    };
    match pt {
        "user_message" => parole("user", p.get("message"), ts),
        "agent_message" => parole("assistant", p.get("message"), ts),
        "task_started" => vec![activite("tâche démarrée", ts)],
        "task_complete" => vec![activite("tâche terminée", ts)],
        _ => Vec::new(),
    }
}

/// Extrait un nom d'outil lisible d'un payload de `response_item` d'appel (défensif).
fn tool_name_of(p: &Value) -> String {
    p.get("name")
        .and_then(Value::as_str)
        .or_else(|| p.get("tool_name").and_then(Value::as_str))
        .or_else(|| p.get("type").and_then(Value::as_str))
        .unwrap_or("?")
        .to_string()
}

/// Mappe un `response_item` (enregistrement structuré de Codex) :
///   - `message` → **ignoré** (DOUBLON des paroles déjà émises via `event_msg` : on évite
///     d'afficher chaque bulle DEUX fois) ;
///   - `reasoning` → **Pensee** (canal masquable) ;
///   - appel d'outil/commande → **Geste** ; résultat → **Activite** (shapes à confirmer).
fn map_response_item(payload: Option<&Value>, ts: &Option<String>) -> Vec<RunnerEvent> {
    let p = match payload {
        Some(p) => p,
        None => return Vec::new(),
    };
    let pt = match p.get("type").and_then(Value::as_str) {
        Some(x) => x,
        None => return Vec::new(),
    };
    // Anti-duplication : la parole vit déjà sur le canal `event_msg`.
    if pt == "message" {
        return Vec::new();
    }
    if pt == "reasoning" {
        // Réflexion interne : on tente `summary`/`text`/`content` (défensif, shape mouvant).
        let txt = p
            .get("summary")
            .and_then(Value::as_str)
            .or_else(|| p.get("text").and_then(Value::as_str))
            .map(str::to_string)
            .or_else(|| p.get("content").map(short_json))
            .unwrap_or_default();
        let txt = txt.trim();
        if txt.is_empty() {
            return Vec::new();
        }
        return vec![RunnerEvent {
            kind: EventKind::Pensee,
            role: "assistant".to_string(),
            is_sidechain: false,
            agent: None,
            text: Some(txt.to_string()),
            tool_name: None,
            tool_use_id: None,
            tool_input: None,
            ts: ts.clone(),
        }];
    }
    if is_codex_tool_call(pt) {
        let id = p
            .get("call_id")
            .and_then(Value::as_str)
            .or_else(|| p.get("id").and_then(Value::as_str))
            .map(str::to_string);
        let input = p
            .get("arguments")
            .or_else(|| p.get("input"))
            .or_else(|| p.get("command"))
            .map(short_json);
        return vec![RunnerEvent {
            kind: EventKind::Geste,
            role: "assistant".to_string(),
            is_sidechain: false,
            agent: None,
            text: None,
            tool_name: Some(tool_name_of(p)),
            tool_use_id: id,
            tool_input: input,
            ts: ts.clone(),
        }];
    }
    if is_codex_tool_result(pt) {
        let id = p
            .get("call_id")
            .and_then(Value::as_str)
            .or_else(|| p.get("id").and_then(Value::as_str))
            .map(str::to_string);
        let summary = p.get("output").or_else(|| p.get("content")).map(short_json);
        return vec![RunnerEvent {
            kind: EventKind::Activite,
            role: "assistant".to_string(),
            is_sidechain: false,
            agent: None,
            text: summary,
            tool_name: None,
            tool_use_id: id,
            tool_input: None,
            ts: ts.clone(),
        }];
    }
    Vec::new()
}

/// Traduit un record de rollout (objet JSON désérialisé) en events. PUR/testable.
/// Ignore proprement `session_meta`, `turn_context` et tout type inconnu (défensif).
fn map_codex_value(o: &Value) -> Vec<RunnerEvent> {
    let t = match o.get("type").and_then(Value::as_str) {
        Some(t) => t,
        None => return Vec::new(),
    };
    let ts = o
        .get("timestamp")
        .and_then(Value::as_str)
        .map(str::to_string);
    let payload = o.get("payload");
    match t {
        "event_msg" => map_event_msg(payload, &ts),
        "response_item" => map_response_item(payload, &ts),
        _ => Vec::new(), // session_meta / turn_context / inconnus : ignorés.
    }
}

// ===========================================================================
// Découverte du rollout (par cwd + récence)
// ===========================================================================

/// Canonicalise un chemin (résout `/tmp`↔`/private/tmp`, liens, `..`) ; retombe sur la
/// chaîne brute si la canonicalisation échoue (chemin disparu) — comparaison robuste.
fn canonical_or_raw(path: &str) -> String {
    std::fs::canonicalize(path)
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string())
}

/// Liste récursivement les `*.jsonl` sous `root` (arbo Codex `YYYY/MM/DD/`). Best-effort :
/// un dossier illisible est sauté (jamais d'erreur propagée).
fn walk_jsonl(root: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                out.push(path);
            }
        }
    }
    out
}

/// Lit le `session_meta.cwd` d'un rollout (toujours en TÊTE de fichier). `None` si absent /
/// illisible. Lit peu : on s'arrête au premier record JSON (le `session_meta`).
fn rollout_cwd(path: &Path) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v = serde_json::from_str::<Value>(line).ok()?;
        if v.get("type").and_then(Value::as_str) == Some("session_meta") {
            return v
                .get("payload")
                .and_then(|p| p.get("cwd"))
                .and_then(Value::as_str)
                .map(str::to_string);
        }
        // session_meta est censé être le tout premier record : si la 1ʳᵉ ligne JSON n'en
        // est pas une, ce fichier n'est pas un rollout exploitable → on abandonne tôt.
        return None;
    }
    None
}

/// `mtime` d'un fichier en millisecondes depuis l'epoch (0 si indisponible).
fn mtime_ms(path: &Path) -> u64 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Découvre le rollout Codex le **plus récent** (par `mtime`) sous `sessions_root` dont le
/// `session_meta.cwd` correspond à `cwd` (comparaison canonicalisée) ET dont le `mtime` est
/// `>= min_mtime_ms` (filtre anti-rollout-périmé : on ne ré-attrape pas la session d'un run
/// PRÉCÉDENT dans le même projet). `min_mtime_ms == 0` ⇒ pas de filtre de récence.
/// Pur (I/O lecture seule) → testable avec une arène temporaire.
pub fn discover_codex_rollout(
    sessions_root: &Path,
    cwd: &str,
    min_mtime_ms: u64,
) -> Option<PathBuf> {
    let target = canonical_or_raw(cwd);
    let mut best: Option<(u64, PathBuf)> = None;
    for path in walk_jsonl(sessions_root) {
        let m = mtime_ms(&path);
        if m < min_mtime_ms {
            continue; // rollout antérieur au lancement de CE runner : ignoré.
        }
        let meta_cwd = match rollout_cwd(&path) {
            Some(c) => c,
            None => continue,
        };
        if canonical_or_raw(&meta_cwd) != target {
            continue;
        }
        match &best {
            Some((bm, _)) if *bm >= m => {}
            _ => best = Some((m, path)),
        }
    }
    best.map(|(_, p)| p)
}

// ===========================================================================
// Tailer Codex (commande Tauri)
// ===========================================================================

/// Répertoire personnel (chemin vide si introuvable → la découverte ne trouvera rien, sans
/// crash).
fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default()
}

/// Boucle de tail Codex : (1) **découvre** le rollout (par cwd + récence, attente bornée par
/// `stop` comme côté Claude — le rollout apparaît quelques secondes après le spawn), puis
/// (2) **tail** le fichier via le cœur partagé `transcript::tail_resolved` avec `CodexSource`.
/// `started_at_ms` = horodatage du spawn (renvoyé par `pty_runner_open`) : borne basse de
/// récence pour ne pas ré-attraper un rollout d'un run précédent.
fn codex_tail_loop(
    app: AppHandle,
    session_id: String,
    cwd: String,
    started_at_ms: u64,
    stop: Arc<AtomicBool>,
) {
    let sessions_root = home_dir().join(CODEX_SESSIONS_SUBDIR);
    let min_mtime = started_at_ms.saturating_sub(DISCOVERY_SKEW_MS);

    let rollout = loop {
        if stop.load(Ordering::Relaxed) {
            return; // conversation fermée / app arrêtée avant l'apparition du rollout.
        }
        if let Some(found) = discover_codex_rollout(&sessions_root, &cwd, min_mtime) {
            break found;
        }
        std::thread::sleep(POLL_INTERVAL);
    };

    let source = CodexSource;
    tail_resolved(&rollout, &stop, &source, |ev| {
        let _ = app.emit(&format!("runner://event/{session_id}"), ev);
    });
}

/// Démarre le tailer du **rollout Codex** pour la session `session_id`, en le découvrant par
/// `cwd` (+ récence `started_at_ms`), et émet ses events sur `runner://event/{session_id}`.
/// **Idempotent** (un tailer déjà actif pour ce `session_id` n'est pas redémarré) ; un `cwd`
/// vide est un **no-op** (rien à découvrir). L'arrêt passe par `transcript_tail_stop` (même
/// registre [`TranscriptState`]).
#[tauri::command]
pub fn codex_tail_start(
    app: AppHandle,
    state: State<TranscriptState>,
    session_id: String,
    cwd: String,
    started_at_ms: u64,
) -> Result<(), String> {
    if cwd.trim().is_empty() {
        return Ok(()); // pas de cwd : aucune découverte possible (no-op).
    }
    let mut map = state.0.lock().unwrap();
    if map.contains_key(&session_id) {
        return Ok(()); // déjà actif : idempotent.
    }
    let stop = Arc::new(AtomicBool::new(false));
    map.insert(session_id.clone(), Arc::clone(&stop));
    drop(map);

    std::thread::spawn(move || {
        codex_tail_loop(app, session_id, cwd, started_at_ms, stop);
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, SystemTime};

    fn src() -> CodexSource {
        CodexSource
    }

    // --- Records ignorés (en-tête / contexte / inconnus) ---

    #[test]
    fn ignore_session_meta_turn_context_et_inconnus() {
        let s = src();
        for raw in [
            r#"{"type":"session_meta","payload":{"session_id":"u","cwd":"/p","timestamp":"T"}}"#,
            r#"{"type":"turn_context","payload":{"cwd":"/p","model":"gpt"}}"#,
            r#"{"type":"event_msg","payload":{"type":"token_count","info":{}}}"#,
            r#"{"type":"bidon","payload":{}}"#,
        ] {
            assert!(s.map_record(raw).is_empty(), "doit ignorer : {raw}");
        }
    }

    #[test]
    fn ligne_non_json_ou_sans_type_est_ignoree_sans_panique() {
        assert!(src().map_record("pas du json {").is_empty());
        assert!(src().map_record("").is_empty());
        assert!(src().map_record(r#"{"payload":{}}"#).is_empty());
    }

    // --- Paroles via event_msg (schéma RÉEL confirmé au spike) ---

    #[test]
    fn user_message_est_une_parole_user() {
        let evs = src().map_record(
            r#"{"type":"event_msg","timestamp":"T1","payload":{"type":"user_message","message":"Reply OK","images":[]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[0].role, "user");
        assert_eq!(evs[0].text.as_deref(), Some("Reply OK"));
        assert_eq!(evs[0].ts.as_deref(), Some("T1"));
    }

    #[test]
    fn agent_message_est_une_parole_assistant() {
        let evs = src().map_record(
            r#"{"type":"event_msg","payload":{"type":"agent_message","message":"OK","phase":"final_answer"}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[0].role, "assistant");
        assert_eq!(evs[0].text.as_deref(), Some("OK"));
    }

    #[test]
    fn message_vide_n_emet_rien() {
        let evs = src().map_record(
            r#"{"type":"event_msg","payload":{"type":"agent_message","message":"   "}}"#,
        );
        assert!(evs.is_empty());
    }

    #[test]
    fn task_started_et_complete_sont_des_activites() {
        let a = src()
            .map_record(r#"{"type":"event_msg","payload":{"type":"task_started","turn_id":"t"}}"#);
        let b = src().map_record(
            r#"{"type":"event_msg","payload":{"type":"task_complete","last_agent_message":"OK"}}"#,
        );
        assert_eq!(a.len(), 1);
        assert_eq!(a[0].kind, EventKind::Activite);
        assert_eq!(b.len(), 1);
        assert_eq!(b[0].kind, EventKind::Activite);
    }

    // --- response_item : message dédupliqué, reasoning = pensée, appels = gestes ---

    #[test]
    fn response_item_message_est_ignore_pour_eviter_le_doublon_parole() {
        // La parole vit sur event_msg ; le response_item/message est un DOUBLON structuré.
        let evs = src().map_record(
            r#"{"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"OK"}]}}"#,
        );
        assert!(
            evs.is_empty(),
            "le doublon de parole doit être ignoré : {evs:?}"
        );
    }

    #[test]
    fn response_item_reasoning_est_une_pensee() {
        let evs = src().map_record(
            r#"{"type":"response_item","payload":{"type":"reasoning","summary":"je planifie"}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Pensee);
        assert_eq!(evs[0].text.as_deref(), Some("je planifie"));
    }

    #[test]
    fn response_item_appel_outil_est_un_geste() {
        // Shape `local_shell_call` (variante historique, toujours gérée défensivement).
        let evs = src().map_record(
            r#"{"type":"response_item","payload":{"type":"local_shell_call","call_id":"c1","name":"shell","command":["ls","-1"]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Geste);
        assert_eq!(evs[0].tool_use_id.as_deref(), Some("c1"));
        assert!(evs[0].tool_input.as_deref().unwrap().contains("ls"));
    }

    #[test]
    fn response_item_resultat_outil_est_une_activite() {
        let evs = src().map_record(
            r#"{"type":"response_item","payload":{"type":"local_shell_call_output","call_id":"c1","output":"README.md"}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Activite);
        assert_eq!(evs[0].tool_use_id.as_deref(), Some("c1"));
        assert!(evs[0].text.as_deref().unwrap().contains("README.md"));
    }

    #[test]
    fn response_item_function_call_reel_geste_et_correlation() {
        // Shape RÉELLE confirmée sur rollout Codex 0.142.3 (recette 2026-06-29) :
        // l'appel est un `function_call` (name=exec_command, arguments JSON, call_id distinct
        // du `id` `fc_…`), le résultat un `function_call_output` partageant le MÊME `call_id`.
        // On vérifie que le geste prend bien `call_id` (et pas l'`id` `fc_…`) pour corréler.
        let call = src().map_record(
            r#"{"type":"response_item","payload":{"type":"function_call","id":"fc_abc","name":"exec_command","arguments":"{\"cmd\":\"ls\",\"workdir\":\"/w\"}","call_id":"call_42"}}"#,
        );
        assert_eq!(call.len(), 1);
        assert_eq!(call[0].kind, EventKind::Geste);
        assert_eq!(call[0].tool_name.as_deref(), Some("exec_command"));
        assert_eq!(
            call[0].tool_use_id.as_deref(),
            Some("call_42"),
            "le geste doit corréler sur call_id, pas sur l'id fc_…"
        );
        assert!(call[0].tool_input.as_deref().unwrap().contains("ls"));

        let out = src().map_record(
            r#"{"type":"response_item","payload":{"type":"function_call_output","call_id":"call_42","output":"alpha\nbravo\n"}}"#,
        );
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].kind, EventKind::Activite);
        assert_eq!(
            out[0].tool_use_id.as_deref(),
            call[0].tool_use_id.as_deref(),
            "appel et résultat partagent le même call_id => corrélation possible"
        );
        assert!(out[0].text.as_deref().unwrap().contains("alpha"));
    }

    // --- Fixture RÉELLE (rollout capturé) : ne panique pas, paroles présentes, pas de doublon ---

    #[test]
    fn fixture_reelle_donne_les_paroles_sans_doublon() {
        let raw = include_str!("../tests/fixtures/codex_rollout_sample.jsonl");
        let s = src();
        let mut paroles = Vec::new();
        for line in raw.lines() {
            for ev in s.map_record(line) {
                if ev.kind == EventKind::Parole {
                    paroles.push((ev.role.clone(), ev.text.clone()));
                }
            }
        }
        // Exactement une parole user + une parole assistant (PAS dédoublées par response_item).
        let users = paroles.iter().filter(|(r, _)| r == "user").count();
        let assistants = paroles.iter().filter(|(r, _)| r == "assistant").count();
        assert_eq!(
            users, 1,
            "une seule parole user (event_msg, pas de doublon) : {paroles:?}"
        );
        assert_eq!(assistants, 1, "une seule parole assistant : {paroles:?}");
    }

    // --- Découverte du rollout (cwd + récence) ---

    fn unique_sessions_dir() -> PathBuf {
        use std::sync::atomic::AtomicU64;
        static SEQ: AtomicU64 = AtomicU64::new(0);
        let n = SEQ.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!(
            "iaka-codex-{}-{}-{n}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_rollout(root: &Path, day: &str, name: &str, cwd: &str) -> PathBuf {
        let dir = root.join(day);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        let meta = format!(
            r#"{{"type":"session_meta","payload":{{"session_id":"s","cwd":"{cwd}","timestamp":"T"}}}}"#
        );
        std::fs::write(&path, format!("{meta}\n")).unwrap();
        path
    }

    #[test]
    fn discover_trouve_le_rollout_du_bon_cwd() {
        let root = unique_sessions_dir();
        let cwd = root.join("proj");
        let cwd_s = cwd.to_string_lossy().to_string();
        write_rollout(&root, "2026/06/27", "rollout-a.jsonl", "/autre/projet");
        let target = write_rollout(&root, "2026/06/27", "rollout-b.jsonl", &cwd_s);

        let found = discover_codex_rollout(&root, &cwd_s, 0);
        assert_eq!(found, Some(target));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn discover_prend_le_plus_recent_pour_le_meme_cwd() {
        let root = unique_sessions_dir();
        let cwd = root.join("proj");
        let cwd_s = cwd.to_string_lossy().to_string();
        let _older = write_rollout(&root, "2026/06/26", "rollout-old.jsonl", &cwd_s);
        // mtime strictement plus récent pour le second (création postérieure + pause).
        std::thread::sleep(Duration::from_millis(50));
        let newer = write_rollout(&root, "2026/06/27", "rollout-new.jsonl", &cwd_s);

        let found = discover_codex_rollout(&root, &cwd_s, 0).unwrap();
        assert_eq!(found, newer, "le rollout le plus récent doit gagner");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn discover_filtre_les_rollouts_anterieurs_au_lancement() {
        let root = unique_sessions_dir();
        let cwd = root.join("proj");
        let cwd_s = cwd.to_string_lossy().to_string();
        let old = write_rollout(&root, "2026/06/27", "rollout-old.jsonl", &cwd_s);
        // Le rollout est VIEUX (run précédent) ; on exige une borne basse dans le futur.
        let old_ms = mtime_ms(&old);
        let future = old_ms + 10_000;
        assert_eq!(
            discover_codex_rollout(&root, &cwd_s, future),
            None,
            "un rollout antérieur à started_at ne doit pas être ré-attrapé"
        );
        // Sans filtre (0), il est bien trouvé.
        assert_eq!(discover_codex_rollout(&root, &cwd_s, 0), Some(old));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn discover_rend_none_quand_aucun_cwd_ne_correspond() {
        let root = unique_sessions_dir();
        write_rollout(&root, "2026/06/27", "rollout-a.jsonl", "/x/y");
        assert_eq!(discover_codex_rollout(&root, "/nope", 0), None);
        let _ = std::fs::remove_dir_all(&root);
    }
}
