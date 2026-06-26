//! transcript — tailer du transcript JSONL de Claude Code → events de vue (L10b).
//!
//! **Le terminal (chef-runner en TUI native, `terminal.rs`) reste la SOURCE DE
//! VÉRITÉ.** Les VUES filtrées (chat bulles, gestes, délégations) ne dérivent PAS de
//! l'écran ANSI : elles dérivent du **transcript JSONL** que Claude Code écrit EN
//! DIRECT sur disque (`~/.claude/projects/<escaped>/<session_id>.jsonl`), qu'on
//! **tail**e en parallèle pendant que la TUI tourne (virage acté, spike L10b
//! `b7ac879`).
//!
//! **Tout le parse vit CÔTÉ RUST** (D7/CSP stricte : aucune logique de format/réseau
//! dans le front). Le front ne reçoit que des `RunnerEvent` typés homogènes via
//! l'événement `runner://event/{session_id}`.
//!
//! ## ConversationSource (§ 4.2) — abstraction « source de vues » multi-runner
//! Une **vue** (parole/geste/délégation/activité/pensée) ne dépend PAS du runner :
//! seul **d'où on lit** ces events change. Le trait [`ConversationSource`] pose ce
//! point d'abstraction : `map_record` traduit un enregistrement brut de la source en
//! un flux d'events homogènes. **Impl Claude Code** = [`TranscriptSource`] (ce module,
//! branchée en L10b). **Impl Ollama** (future, hors L10) = `ai.rs chat` reframé — c'est
//! NOUS qui émettons les messages, donc la source est le log de nos appels (pas de
//! fichier à tailer). Passer de 1→N runners = **ajouter une impl**, sans toucher aux vues.
//!
//! ## Robustesse (risques § 11 tracés)
//! - **(b) latence** : le fichier apparaît ~quelques s après le 1ᵉʳ tour → on **attend
//!   sa création** (poll, heartbeat) avant de tailer.
//! - **lignes partielles** : on n'émet QUE sur une ligne complète terminée par `\n`
//!   (un flush tardif laisse une ligne incomplète : on l'accumule jusqu'au `\n`).
//! - **(d) schéma instable** : parse **défensif** par ligne (`serde_json::Value`,
//!   jamais de panique) ; toute ligne non-JSON ou tout record inconnu est **ignoré**.

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

/// Canal d'une vue dérivée (§ 4.3) — homogène quel que soit le runner.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    /// `assistant.text` / `user.text` saisi → bulle de chat (canal « adresse »).
    Parole,
    /// `assistant.tool_use` (hors `Task`) → action outil du chef.
    Geste,
    /// `tool_use name=="Task"` (+ fil `isSidechain`) → sous-agent délégué.
    Delegation,
    /// `tool_result` (record `user`) → fin de geste / agent au travail.
    Activite,
    /// `thinking` → réflexion interne (canal **masquable**, § 5 PROJET).
    Pensee,
}

/// Event de vue typé homogène émis vers le front (`runner://event/{session_id}`).
/// Miroir TS `RunnerEvent` (snake_case, D7). Les champs absents sont **omis** de la
/// sérialisation (`skip_serializing_if`) pour rester compacts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RunnerEvent {
    /// Canal de la vue.
    pub kind: EventKind,
    /// `"user"` ou `"assistant"` (rôle du record d'origine).
    pub role: String,
    /// Fil de sous-agent (`isSidechain:true`) — le front peut le distinguer / masquer.
    pub is_sidechain: bool,
    /// Sous-agent délégué (`subagent_type`) — uniquement pour `Delegation`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent: Option<String>,
    /// Texte porté : parole, pensée, ou description de délégation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    /// Nom de l'outil — pour `Geste`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    /// `tool_use_id` (apparie geste ↔ résultat) — pour `Geste`/`Activite`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_use_id: Option<String>,
    /// Entrée de l'outil, résumée (JSON tronqué) — pour `Geste`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<String>,
    /// Horodatage ISO-8601 du record (mise en forme = UX front).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ts: Option<String>,
}

/// Abstraction « source de vues » (§ 4.2) : traduit un enregistrement brut de la
/// source en events homogènes. Impl Claude Code = [`TranscriptSource`] ; impl Ollama
/// (future, hors L10) = `ai.rs chat` reframé.
pub trait ConversationSource {
    /// Traduit UN enregistrement brut (une ligne JSONL pour le transcript) en une
    /// liste d'events. **Défensif** : une entrée invalide renvoie une liste vide,
    /// jamais une panique.
    fn map_record(&self, raw: &str) -> Vec<RunnerEvent>;
}

/// Source de vues du runner **Claude Code** : parse une ligne du transcript JSONL.
pub struct TranscriptSource;

/// Longueur max d'un résumé d'entrée d'outil (borne défensive d'affichage).
const TOOL_INPUT_MAX: usize = 200;

/// Résume une `Value` d'entrée d'outil en chaîne compacte tronquée (affichage).
fn short_json(v: &Value) -> String {
    let s = match v {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    let s = s.replace('\n', " ");
    if s.chars().count() <= TOOL_INPUT_MAX {
        s
    } else {
        let truncated: String = s.chars().take(TOOL_INPUT_MAX).collect();
        format!("{truncated}…")
    }
}

/// Traduit un bloc de contenu (`text`/`thinking`/`tool_use`/`tool_result`) en event.
/// Renvoie `None` pour un bloc vide/non pertinent (texte vide, type inconnu).
fn map_block(
    role: &str,
    is_sidechain: bool,
    ts: &Option<String>,
    blk: &Value,
) -> Option<RunnerEvent> {
    let bt = blk.get("type").and_then(Value::as_str)?;
    match bt {
        "text" => {
            let txt = blk.get("text").and_then(Value::as_str).unwrap_or("").trim();
            if txt.is_empty() {
                return None;
            }
            Some(RunnerEvent {
                kind: EventKind::Parole,
                role: role.to_string(),
                is_sidechain,
                agent: None,
                text: Some(txt.to_string()),
                tool_name: None,
                tool_use_id: None,
                tool_input: None,
                ts: ts.clone(),
            })
        }
        "thinking" => {
            let txt = blk
                .get("thinking")
                .and_then(Value::as_str)
                .unwrap_or("")
                .trim();
            // La pensée est souvent vide (signature seule, contenu rédigé) → on ignore.
            if txt.is_empty() {
                return None;
            }
            Some(RunnerEvent {
                kind: EventKind::Pensee,
                role: role.to_string(),
                is_sidechain,
                agent: None,
                text: Some(txt.to_string()),
                tool_name: None,
                tool_use_id: None,
                tool_input: None,
                ts: ts.clone(),
            })
        }
        "tool_use" => {
            let name = blk.get("name").and_then(Value::as_str).unwrap_or("?");
            let id = blk.get("id").and_then(Value::as_str).map(str::to_string);
            let input = blk.get("input");
            if name == "Task" {
                // Délégation : subagent_type + description (apparié au fil isSidechain).
                let sub = input
                    .and_then(|i| i.get("subagent_type"))
                    .and_then(Value::as_str)
                    .map(str::to_string);
                let desc = input
                    .and_then(|i| i.get("description"))
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                Some(RunnerEvent {
                    kind: EventKind::Delegation,
                    role: role.to_string(),
                    is_sidechain,
                    agent: sub,
                    text: if desc.is_empty() { None } else { Some(desc) },
                    tool_name: Some(name.to_string()),
                    tool_use_id: id,
                    tool_input: None,
                    ts: ts.clone(),
                })
            } else {
                Some(RunnerEvent {
                    kind: EventKind::Geste,
                    role: role.to_string(),
                    is_sidechain,
                    agent: None,
                    text: None,
                    tool_name: Some(name.to_string()),
                    tool_use_id: id,
                    tool_input: input.map(short_json),
                    ts: ts.clone(),
                })
            }
        }
        "tool_result" => {
            let id = blk
                .get("tool_use_id")
                .and_then(Value::as_str)
                .map(str::to_string);
            // Le contenu d'un tool_result peut être une string ou une liste de blocs.
            let summary = blk.get("content").map(short_json);
            Some(RunnerEvent {
                kind: EventKind::Activite,
                role: role.to_string(),
                is_sidechain,
                agent: None,
                text: summary,
                tool_name: None,
                tool_use_id: id,
                tool_input: None,
                ts: ts.clone(),
            })
        }
        _ => None,
    }
}

/// Traduit un record (objet JSON déjà désérialisé) en events. PUR/testable.
/// Ignore proprement tout type hors `user`/`assistant` (mode, system, attachment,
/// file-history-snapshot, ai-title, last-prompt, queue-operation, permission-mode…).
fn map_value(o: &Value) -> Vec<RunnerEvent> {
    let t = match o.get("type").and_then(Value::as_str) {
        Some(t) if t == "user" || t == "assistant" => t,
        _ => return Vec::new(),
    };
    let is_sidechain = o
        .get("isSidechain")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let ts = o
        .get("timestamp")
        .and_then(Value::as_str)
        .map(str::to_string);

    let content = o.get("message").and_then(|m| m.get("content"));
    match content {
        // Contenu textuel direct (prompt utilisateur tapé) → parole.
        Some(Value::String(s)) => {
            let txt = s.trim();
            if txt.is_empty() {
                Vec::new()
            } else {
                vec![RunnerEvent {
                    kind: EventKind::Parole,
                    role: t.to_string(),
                    is_sidechain,
                    agent: None,
                    text: Some(txt.to_string()),
                    tool_name: None,
                    tool_use_id: None,
                    tool_input: None,
                    ts,
                }]
            }
        }
        // Liste de blocs (cas général assistant + user tool_result/text).
        Some(Value::Array(blocks)) => blocks
            .iter()
            .filter_map(|blk| map_block(t, is_sidechain, &ts, blk))
            .collect(),
        _ => Vec::new(),
    }
}

impl ConversationSource for TranscriptSource {
    fn map_record(&self, raw: &str) -> Vec<RunnerEvent> {
        let line = raw.trim();
        if line.is_empty() {
            return Vec::new();
        }
        match serde_json::from_str::<Value>(line) {
            Ok(o) => map_value(&o),
            Err(_) => Vec::new(), // ligne non-JSON : ignorée (défensif).
        }
    }
}

/// Registre des tailers actifs : `session_id` → drapeau d'arrêt partagé. Permet de
/// stopper un tailer (toggle/close de conversation) sans tuer le thread brutalement.
#[derive(Default)]
pub struct TranscriptState(Mutex<HashMap<String, Arc<AtomicBool>>>);

/// Intervalle de poll (attente de création + tail incrémental).
const POLL_INTERVAL: Duration = Duration::from_millis(150);
/// Plafond d'attente de création du fichier (au-delà, le thread s'arrête seul pour ne
/// pas rester orphelin si aucun transcript n'apparaît jamais — ex. kind `shell`).
const CREATE_WAIT_MAX: Duration = Duration::from_secs(120);

/// Boucle de tail : attend la création du fichier, puis lit incrémentalement les
/// lignes COMPLÈTES (terminées par `\n`), mappe chaque record et émet les events.
/// Lit depuis le DÉBUT du fichier (reconstruction complète : un toggle chat↔terminal
/// ne relance pas le tailer, l'historique reste cohérent).
fn tail_loop(app: AppHandle, session_id: String, path: String, stop: Arc<AtomicBool>) {
    let source = TranscriptSource;
    let p = Path::new(&path);

    // 1. Attente de création (heartbeat borné). (risque (b) : latence ~quelques s.)
    let mut waited = Duration::ZERO;
    while !stop.load(Ordering::Relaxed) && !p.exists() {
        std::thread::sleep(POLL_INTERVAL);
        waited += POLL_INTERVAL;
        if waited >= CREATE_WAIT_MAX {
            return; // jamais apparu : on n'orpheline pas le thread.
        }
    }
    if stop.load(Ordering::Relaxed) {
        return;
    }

    let file = match std::fs::File::open(p) {
        Ok(f) => f,
        Err(_) => return,
    };
    let mut reader = BufReader::new(file);

    // 2. Tail incrémental avec gestion des lignes partielles.
    let mut pending = String::new();
    while !stop.load(Ordering::Relaxed) {
        let mut chunk = String::new();
        match reader.read_line(&mut chunk) {
            Ok(0) => {
                // EOF : pas (encore) de nouvelle donnée → on patiente.
                std::thread::sleep(POLL_INTERVAL);
                continue;
            }
            Ok(_) => {
                pending.push_str(&chunk);
                // On ne traite QUE des lignes complètes (terminées par `\n`).
                if !pending.ends_with('\n') {
                    continue; // ligne partielle : on accumule jusqu'au `\n`.
                }
                let complete = std::mem::take(&mut pending);
                for raw_line in complete.split('\n') {
                    if raw_line.trim().is_empty() {
                        continue;
                    }
                    for ev in source.map_record(raw_line) {
                        let _ = app.emit(&format!("runner://event/{session_id}"), &ev);
                    }
                }
            }
            Err(_) => break,
        }
    }
}

/// Démarre le tailer du transcript `transcript_path` et émet ses events sur
/// `runner://event/{session_id}`. **Idempotent** : un tailer déjà actif pour ce
/// `session_id` n'est PAS redémarré. Un `transcript_path` vide (repli `shell`, pas de
/// transcript) est un **no-op** silencieux.
#[tauri::command]
pub fn transcript_tail_start(
    app: AppHandle,
    state: State<TranscriptState>,
    session_id: String,
    transcript_path: String,
) -> Result<(), String> {
    if transcript_path.trim().is_empty() {
        return Ok(()); // pas de transcript (kind shell) : rien à tailer.
    }
    let mut map = state.0.lock().unwrap();
    if map.contains_key(&session_id) {
        return Ok(()); // déjà actif : idempotent.
    }
    let stop = Arc::new(AtomicBool::new(false));
    map.insert(session_id.clone(), Arc::clone(&stop));
    drop(map);

    std::thread::spawn(move || {
        tail_loop(app, session_id, transcript_path, stop);
    });
    Ok(())
}

/// Arrête le tailer du `session_id` (drapeau d'arrêt levé ; le thread sort à son
/// prochain réveil). No-op si aucun tailer actif. Le PTY/runner n'est PAS affecté.
#[tauri::command]
pub fn transcript_tail_stop(
    state: State<TranscriptState>,
    session_id: String,
) -> Result<(), String> {
    if let Some(stop) = state.0.lock().unwrap().remove(&session_id) {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn src() -> TranscriptSource {
        TranscriptSource
    }

    // --- Records hors user/assistant : tous IGNORÉS proprement (défensif) ---

    #[test]
    fn ignore_les_records_non_conversationnels() {
        let s = src();
        for raw in [
            r#"{"type":"mode","mode":"normal"}"#,
            r#"{"type":"permission-mode","permissionMode":"bypassPermissions"}"#,
            r#"{"type":"file-history-snapshot","messageId":"x"}"#,
            r#"{"type":"system","subtype":"stop_hook_summary"}"#,
            r#"{"type":"attachment","attachment":{"type":"deferred_tools_delta"}}"#,
            r#"{"type":"ai-title","aiTitle":"Bonjour"}"#,
            r#"{"type":"last-prompt","lastPrompt":"hbkhb"}"#,
            r#"{"type":"queue-operation","operation":"enqueue"}"#,
        ] {
            assert!(s.map_record(raw).is_empty(), "doit ignorer : {raw}");
        }
    }

    #[test]
    fn ligne_non_json_est_ignoree_sans_panique() {
        assert!(src().map_record("pas du json {").is_empty());
        assert!(src().map_record("").is_empty());
        assert!(src().map_record("   ").is_empty());
    }

    #[test]
    fn record_sans_type_est_ignore() {
        assert!(src().map_record(r#"{"foo":"bar"}"#).is_empty());
    }

    // --- Parole (user tapé / assistant text) ---

    #[test]
    fn user_content_string_est_une_parole() {
        let evs = src().map_record(
            r#"{"type":"user","isSidechain":false,"timestamp":"T1","message":{"role":"user","content":"hbkhb"}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[0].role, "user");
        assert_eq!(evs[0].text.as_deref(), Some("hbkhb"));
        assert_eq!(evs[0].ts.as_deref(), Some("T1"));
        assert!(!evs[0].is_sidechain);
    }

    #[test]
    fn user_content_liste_text_est_une_parole() {
        let evs = src().map_record(
            r#"{"type":"user","message":{"role":"user","content":[{"text":"hello","type":"text"}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[0].text.as_deref(), Some("hello"));
    }

    #[test]
    fn assistant_text_est_une_parole() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Bonjour !"}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[0].role, "assistant");
        assert_eq!(evs[0].text.as_deref(), Some("Bonjour !"));
    }

    #[test]
    fn texte_vide_n_emet_rien() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"   "}]}}"#,
        );
        assert!(evs.is_empty());
    }

    // --- Pensée (thinking) — masquable, vide ignorée ---

    #[test]
    fn thinking_non_vide_est_une_pensee() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"je réfléchis"}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Pensee);
        assert_eq!(evs[0].text.as_deref(), Some("je réfléchis"));
    }

    #[test]
    fn thinking_vide_signature_seule_est_ignore() {
        // Cas réel : thinking="" (contenu rédigé, signature seule) → pas de bruit.
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"","signature":"abc"}]}}"#,
        );
        assert!(evs.is_empty());
    }

    // --- Geste (tool_use non-Task) ---

    #[test]
    fn tool_use_est_un_geste_avec_nom_id_et_input() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"Bash","input":{"command":"ls -1","description":"liste"}}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Geste);
        assert_eq!(evs[0].tool_name.as_deref(), Some("Bash"));
        assert_eq!(evs[0].tool_use_id.as_deref(), Some("toolu_1"));
        assert!(evs[0].tool_input.as_deref().unwrap().contains("ls -1"));
    }

    // --- Activité (tool_result, record user) ---

    #[test]
    fn tool_result_est_une_activite_appariee_par_id() {
        let evs = src().map_record(
            r#"{"type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_1","type":"tool_result","content":"README.md\nspecs","is_error":false}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Activite);
        assert_eq!(evs[0].tool_use_id.as_deref(), Some("toolu_1"));
        assert!(evs[0].text.as_deref().unwrap().contains("README.md"));
    }

    // --- Délégation (Task + isSidechain) ---

    #[test]
    fn task_tool_use_est_une_delegation_avec_subagent_et_description() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_task_1","name":"Task","input":{"subagent_type":"gandalf","description":"Cadrer le lot L11","prompt":"…"}}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].kind, EventKind::Delegation);
        assert_eq!(evs[0].agent.as_deref(), Some("gandalf"));
        assert_eq!(evs[0].text.as_deref(), Some("Cadrer le lot L11"));
        assert_eq!(evs[0].tool_use_id.as_deref(), Some("toolu_task_1"));
    }

    #[test]
    fn fil_de_sous_agent_porte_is_sidechain() {
        let evs = src().map_record(
            r#"{"type":"assistant","isSidechain":true,"message":{"role":"assistant","content":[{"type":"text","text":"[CADRAGE][Gandalf] fait"}]}}"#,
        );
        assert_eq!(evs.len(), 1);
        assert!(evs[0].is_sidechain);
        assert_eq!(evs[0].kind, EventKind::Parole);
    }

    // --- Multi-blocs : un record assistant peut porter thinking+text+tool_use ---

    #[test]
    fn record_multi_blocs_emet_un_event_par_bloc_dans_l_ordre() {
        let evs = src().map_record(
            r#"{"type":"assistant","message":{"role":"assistant","content":[
                {"type":"text","text":"Je délègue."},
                {"type":"tool_use","id":"t1","name":"Task","input":{"subagent_type":"gandalf","description":"cadre"}}
            ]}}"#,
        );
        assert_eq!(evs.len(), 2);
        assert_eq!(evs[0].kind, EventKind::Parole);
        assert_eq!(evs[1].kind, EventKind::Delegation);
    }

    // --- Fixtures RÉELLES (extraits du spike L10b) ---

    #[test]
    fn fixture_reelle_ne_panique_pas_et_filtre_les_records_bruyants() {
        let raw = include_str!("../tests/fixtures/transcript_sample.jsonl");
        let s = src();
        let mut kinds = Vec::new();
        for line in raw.lines() {
            for ev in s.map_record(line) {
                kinds.push(ev.kind);
            }
        }
        // Au moins une parole, un geste et une activité dérivés des vrais records.
        assert!(kinds.contains(&EventKind::Parole));
        assert!(kinds.contains(&EventKind::Geste));
        assert!(kinds.contains(&EventKind::Activite));
        // Aucun event issu des records bruyants (mode/system/attachment/…).
    }

    #[test]
    fn fixture_delegation_capture_task_sidechain_et_verbatim() {
        // ⚠️ Fixture SYNTHÉTIQUE conforme au schéma (délégation non encore prouvée
        // LIVE — risque (a) § 11). À reconfirmer sur capture réelle.
        let raw = include_str!("../tests/fixtures/transcript_delegation.jsonl");
        let s = src();
        let mut deleg = 0;
        let mut sidechain_parole = 0;
        for line in raw.lines() {
            for ev in s.map_record(line) {
                if ev.kind == EventKind::Delegation {
                    deleg += 1;
                    assert_eq!(ev.agent.as_deref(), Some("gandalf"));
                }
                if ev.kind == EventKind::Parole && ev.is_sidechain {
                    sidechain_parole += 1;
                }
            }
        }
        assert_eq!(deleg, 1, "une délégation Task captée");
        assert!(
            sidechain_parole >= 1,
            "le fil du sous-agent est marqué isSidechain"
        );
    }

    // --- Sérialisation : champs absents omis, kind en snake_case ---

    #[test]
    fn serialisation_omet_les_champs_absents_et_kind_snake_case() {
        let ev = RunnerEvent {
            kind: EventKind::Parole,
            role: "assistant".into(),
            is_sidechain: false,
            agent: None,
            text: Some("salut".into()),
            tool_name: None,
            tool_use_id: None,
            tool_input: None,
            ts: None,
        };
        let json = serde_json::to_string(&ev).unwrap();
        assert!(json.contains(r#""kind":"parole""#));
        assert!(json.contains(r#""text":"salut""#));
        assert!(!json.contains("tool_name"));
        assert!(!json.contains("agent"));
        assert!(!json.contains("\"ts\""));
    }

    #[test]
    fn short_json_tronque_les_entrees_longues() {
        let long = Value::String("x".repeat(500));
        let s = short_json(&long);
        assert!(s.chars().count() <= TOOL_INPUT_MAX + 1); // +1 pour l'ellipse
        assert!(s.ends_with('…'));
    }
}
