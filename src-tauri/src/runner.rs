//! runner — chef-runner conversationnel en PIPES (L10 P1).
//!
//! > ⚠️ **PARQUÉ (virage L10b, `b7ac879`) — PAS la voie principale.** La voie pipes
//! > `stream-json` **tue la TUI native** (réflexes `Shift+Tab`/`esc`/box perdus, cf.
//! > finding ci-dessous). La cible retenue est le **chef-runner en TUI native dans un
//! > PTY** (`terminal.rs::pty_runner_open`) + **vues dérivées du transcript JSONL**
//! > (`transcript.rs`, tailer L10b). Ce module est **conservé « au chaud »** (code
//! > testé, gate Legolas PASS) comme **transport `stream-json` alternatif documenté**
//! > (usages non-interactifs/programmatiques) — **il n'est PAS branché dans le chemin
//! > conversation** (cf. instruction L10 § 5.3).
//!
//! **Finding du spike P0** (`specs/mock/spike-l10/`) : le CLI `claude` en mode flux
//! structuré (`--input-format stream-json --output-format stream-json --verbose`)
//! **REFUSE** le NDJSON quand `stdin` est un TTY (`Error: Input must be provided…`).
//! Le chef-runner ne peut donc PAS réutiliser le PTY de `terminal.rs` : il faut une
//! **couture PIPES** dédiée (`std::process` avec stdin/stdout/stderr en pipes). xterm
//! devient une **surface de RENDU** du flux brut (le flux reste la source de vérité).
//!
//! `terminal.rs` (PTY shell legacy) reste **inchangé** : il sert le shell de repli.
//!
//! Modèle de cycle de vie (prouvé par le spike) :
//! - **UN seul** process `claude` long-vécu par session ;
//! - enchaîner les tours = écrire de nouveaux messages `{"type":"user",…}` sur le
//!   **MÊME stdin** (PAS de `--continue`/`--resume` à chaud) ;
//! - `{"type":"interrupt"}` sur stdin = `esc` (abort outil → exit 137, process survit) ;
//! - `runner_close` ferme stdin + termine le process.
//!
//! Événements émis vers le front (façade `backend.ts`) :
//! - `runner://raw/{id}`    -> `String` (1 ligne stdout du chef, rendue dans xterm) ;
//! - `runner://stderr/{id}` -> `String` (stderr routé à part — diagnostics) ;
//! - `runner://closed/{id}` -> `()` (fin du process / EOF stdout).
//!
//! **P1 = flux BRUT seulement.** Le parse NDJSON typé → `runner://event` (vue filtrée
//! chat) relève de **P2** : ici on émet les lignes verbatim (parse défensif léger :
//! lossy UTF-8, lignes vides ignorées, aucune panique sur une ligne malformée).

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::paths::resolve_hat_root;

/// Modèle Claude Code par défaut du chef-runner (P1, PROVISOIRE).
///
/// Haiku = bon marché pour le dev/démo, et **éprouvé par le spike P0**. Sera
/// remplaçable par une clé config non sensible en **P3** (réglages globaux).
const DEFAULT_CLAUDE_MODEL: &str = "claude-haiku-4-5";

/// Politique de permissions du chef-runner — **PROVISOIRE (P1)**.
///
/// À-arbitrer #7 (spec L10) : Stéphane a tranché « à régler en config ». En P1 on
/// pose une **politique par défaut paramétrable** (cf. [`default_permission_policy`])
/// et on NE code **pas** `--dangerously-skip-permissions` comme **unique voie en
/// dur** : c'est une variante parmi d'autres, réservée à une activation explicite.
/// Le branchement sur une **clé config** arrive en **P3**.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PermissionPolicy {
    /// Allowlist d'outils explicite (`--allowedTools a,b,c`), **sans bypass global**.
    /// Vide → aucun argument (le CLI demandera la permission au cas par cas).
    AllowList(Vec<String>),
    /// Bypass total (`--dangerously-skip-permissions`) — **réservé**, à n'activer
    /// que par configuration explicite (P3). Jamais le défaut.
    BypassAll,
}

impl PermissionPolicy {
    /// Traduit la politique en arguments CLI.
    fn to_args(&self) -> Vec<String> {
        match self {
            PermissionPolicy::AllowList(tools) => {
                if tools.is_empty() {
                    vec![]
                } else {
                    vec!["--allowedTools".to_string(), tools.join(",")]
                }
            }
            PermissionPolicy::BypassAll => vec!["--dangerously-skip-permissions".to_string()],
        }
    }
}

/// Politique par défaut PROVISOIRE (P1) : allowlist d'outils de lecture/exploration
/// (`Read`/`Glob`/`Grep`/`Bash`), **sans bypass global**. Suffit à une démo P1
/// (lister/lire le projet) sans laisser le chef écrire sans garde. À remplacer par
/// une clé config en P3.
fn default_permission_policy() -> PermissionPolicy {
    PermissionPolicy::AllowList(vec![
        "Read".to_string(),
        "Glob".to_string(),
        "Grep".to_string(),
        "Bash".to_string(),
    ])
}

/// Spécification d'un runner (point d'abstraction L10 : passer de 1 à N runners
/// réels doit être une **extension**, pas une réécriture — cf. PROJET § 2.3).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunnerSpec {
    /// Type de runner (`"claude-code"` par défaut ; `"shell"` = legacy via `terminal.rs`).
    pub kind: String,
    /// Programme à lancer (résolu par OS, jamais de chemin en dur — modèle `shell.rs`).
    pub program: String,
    /// Arguments du programme.
    pub args: Vec<String>,
}

/// Nom du binaire Claude Code par OS (modèle `shell.rs` : pas de chemin en dur, la
/// résolution PATH est faite par `Command` au spawn). Sur Windows, le lanceur npm
/// s'appelle `claude.cmd` ; ailleurs `claude`.
fn claude_program() -> String {
    if cfg!(windows) {
        "claude.cmd".to_string()
    } else {
        "claude".to_string()
    }
}

/// Arguments du kind `claude-code` (posture B, prouvée par le spike P0).
///
/// `--verbose` est **OBLIGATOIRE** avec `--output-format stream-json` (sinon refus).
/// `--include-partial-messages` (deltas token) est volontairement **omis** (bruit ;
/// P3/option). La politique de permission est appliquée en queue (provisoire P1).
fn claude_code_args(model: &str, policy: &PermissionPolicy) -> Vec<String> {
    let mut args = vec![
        "--print".to_string(),
        "--input-format".to_string(),
        "stream-json".to_string(),
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--model".to_string(),
        model.to_string(),
    ];
    args.extend(policy.to_args());
    args
}

/// Construit la `RunnerSpec` d'un `kind` donné. P1 ne connaît que `claude-code` ;
/// tout autre kind est rejeté (le shell legacy passe par `terminal.rs`, pas ici).
fn resolve_spec(kind: &str, model: Option<String>) -> Result<RunnerSpec, String> {
    match kind {
        "claude-code" => {
            let model = model
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_CLAUDE_MODEL.to_string());
            Ok(RunnerSpec {
                kind: kind.to_string(),
                program: claude_program(),
                args: claude_code_args(&model, &default_permission_policy()),
            })
        }
        other => Err(format!("kind de runner inconnu : {other}")),
    }
}

/// Sérialise un **tour utilisateur** en ligne NDJSON `{"type":"user",…}` terminée par
/// `\n` (le CLI lit du JSON ligne-par-ligne). Le schéma vit **côté Rust** (cohérent
/// avec le parse de sortie Rust-side, D7/CSP). `serde_json` garantit l'échappement.
fn user_turn_line(text: &str) -> String {
    let v = serde_json::json!({
        "type": "user",
        "message": {
            "role": "user",
            "content": [{ "type": "text", "text": text }]
        }
    });
    format!("{v}\n")
}

/// Ligne de contrôle d'**interruption** (`= esc` du spike). Schéma figé côté Rust.
fn interrupt_line() -> String {
    let v = serde_json::json!({ "type": "interrupt" });
    format!("{v}\n")
}

/// Nettoyage défensif d'une ligne brute de stdout/stderr (P1) : décodage lossy UTF-8
/// puis retrait du `\r\n`/`\n` terminal. Renvoie `None` si la ligne est vide (rien à
/// émettre). **Jamais de panique** sur une ligne malformée (parse typé = P2).
fn clean_line(raw: &str) -> Option<String> {
    let s = raw.trim_end_matches(['\r', '\n']);
    if s.is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

struct RunnerProc {
    child: Child,
    stdin: ChildStdin,
}

#[derive(Default)]
pub struct RunnerState(Mutex<HashMap<String, RunnerProc>>);

/// Valide qu'un `cwd` (absolu, fourni par le front) reste sous le chapeau `root`.
/// Logique PURE (aucun accès disque) → testable cross-OS. **Conservée côté runner**
/// (un runner reste un vecteur d'exécution). Dupliquée volontairement de `terminal.rs`
/// pour laisser ce dernier **strictement inchangé** (spec L10 § 8).
fn validate_cwd(root: &Path, cwd: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(cwd);
    if !candidate.is_absolute() {
        return Err(format!("cwd doit être un chemin absolu : {cwd}"));
    }
    if !candidate.starts_with(root) {
        return Err(format!(
            "cwd hors du chapeau autorisé ({}) : {cwd}",
            root.to_string_lossy()
        ));
    }
    Ok(candidate.to_path_buf())
}

/// Ouvre une session chef-runner en PIPES (spawn `claude`, threads de lecture
/// stdout/stderr). Le `cwd` (si fourni) DOIT rester sous le chapeau (rejeté sinon).
#[tauri::command]
pub fn runner_open(
    app: AppHandle,
    state: State<RunnerState>,
    id: String,
    kind: String,
    model: Option<String>,
    cwd: Option<String>,
) -> Result<(), String> {
    let spec = resolve_spec(&kind, model)?;

    let mut cmd = Command::new(&spec.program);
    cmd.args(&spec.args);

    // cwd optionnel : validé sous le chapeau avant tout spawn (anti-évasion).
    if let Some(d) = cwd.as_ref().filter(|d| !d.is_empty()) {
        let root = resolve_hat_root();
        let validated = validate_cwd(&root, d)?;
        cmd.current_dir(validated);
    }

    // PIPES (PAS un PTY : finding spike). stdin restera ouvert pour les tours suivants.
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("échec du lancement du runner « {} » : {e}", spec.program))?;

    let stdin = child.stdin.take().ok_or("stdin du runner indisponible")?;
    let stdout = child.stdout.take().ok_or("stdout du runner indisponible")?;
    let stderr = child.stderr.take().ok_or("stderr du runner indisponible")?;

    // Thread reader stdout : 1 ligne = 1 objet NDJSON, émis VERBATIM (P1).
    let app_out = app.clone();
    let id_out = id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    if let Some(clean) = clean_line(&l) {
                        let _ = app_out.emit(&format!("runner://raw/{id_out}"), clean);
                    }
                }
                Err(_) => break,
            }
        }
        let _ = app_out.emit(&format!("runner://closed/{id_out}"), ());
    });

    // Thread reader stderr : routé à part (diagnostics, jamais mélangé au flux NDJSON).
    let app_err = app.clone();
    let id_err = id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    if let Some(clean) = clean_line(&l) {
                        let _ = app_err.emit(&format!("runner://stderr/{id_err}"), clean);
                    }
                }
                Err(_) => break,
            }
        }
    });

    state
        .0
        .lock()
        .unwrap()
        .insert(id, RunnerProc { child, stdin });
    Ok(())
}

/// Envoie un **tour utilisateur** : enveloppe `text` en `{"type":"user",…}` NDJSON et
/// l'écrit sur le MÊME stdin long-vécu (enchaînement des tours, finding spike).
#[tauri::command]
pub fn runner_write(state: State<RunnerState>, id: String, text: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let proc = map.get_mut(&id).ok_or("session runner inconnue")?;
    proc.stdin
        .write_all(user_turn_line(&text).as_bytes())
        .map_err(|e| e.to_string())?;
    proc.stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

/// Interrompt l'outil en cours (`{"type":"interrupt"}` = `esc`). Le process survit.
#[tauri::command]
pub fn runner_interrupt(state: State<RunnerState>, id: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let proc = map.get_mut(&id).ok_or("session runner inconnue")?;
    proc.stdin
        .write_all(interrupt_line().as_bytes())
        .map_err(|e| e.to_string())?;
    proc.stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

/// Ferme la session : retire le process, ferme stdin (EOF → le chef termine) puis le
/// tue (filet). Le drop de `RunnerProc` ferme `stdin` ; `kill` garantit l'arrêt.
#[tauri::command]
pub fn runner_close(state: State<RunnerState>, id: String) -> Result<(), String> {
    if let Some(mut proc) = state.0.lock().unwrap().remove(&id) {
        let _ = proc.child.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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

    // --- Résolution du binaire par OS (modèle shell.rs) ---

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

    // --- Arguments claude-code (posture B prouvée par le spike) ---

    #[test]
    fn claude_code_args_porte_les_flags_obligatoires() {
        let args = claude_code_args("claude-haiku-4-5", &PermissionPolicy::AllowList(vec![]));
        // Flux structuré + --verbose obligatoire + modèle passé.
        for needle in [
            "--print",
            "--input-format",
            "stream-json",
            "--output-format",
            "--verbose",
            "--model",
            "claude-haiku-4-5",
        ] {
            assert!(args.iter().any(|a| a == needle), "manque {needle}");
        }
    }

    #[test]
    fn allowlist_non_vide_produit_allowedtools_joints() {
        let args = PermissionPolicy::AllowList(vec!["Read".into(), "Bash".into()]).to_args();
        assert_eq!(
            args,
            vec!["--allowedTools".to_string(), "Read,Bash".to_string()]
        );
    }

    #[test]
    fn allowlist_vide_ne_produit_aucun_argument() {
        assert!(PermissionPolicy::AllowList(vec![]).to_args().is_empty());
    }

    #[test]
    fn bypass_total_est_une_voie_reservee_explicite() {
        assert_eq!(
            PermissionPolicy::BypassAll.to_args(),
            vec!["--dangerously-skip-permissions".to_string()]
        );
    }

    #[test]
    fn defaut_provisoire_nest_pas_un_bypass_total() {
        // Garde anti-dérive : le défaut P1 NE doit PAS être le skip total.
        assert_ne!(default_permission_policy(), PermissionPolicy::BypassAll);
        let args = default_permission_policy().to_args();
        assert!(!args.iter().any(|a| a == "--dangerously-skip-permissions"));
        assert!(args.iter().any(|a| a == "--allowedTools"));
    }

    // --- RunnerSpec ---

    #[test]
    fn resolve_spec_claude_code_par_defaut() {
        let spec = resolve_spec("claude-code", None).unwrap();
        assert_eq!(spec.kind, "claude-code");
        assert_eq!(spec.program, claude_program());
        assert!(spec.args.iter().any(|a| a == DEFAULT_CLAUDE_MODEL));
    }

    #[test]
    fn resolve_spec_honore_le_modele_fourni() {
        let spec = resolve_spec("claude-code", Some("claude-sonnet-4-5".into())).unwrap();
        assert!(spec.args.iter().any(|a| a == "claude-sonnet-4-5"));
        assert!(!spec.args.iter().any(|a| a == DEFAULT_CLAUDE_MODEL));
    }

    #[test]
    fn resolve_spec_modele_vide_retombe_sur_le_defaut() {
        let spec = resolve_spec("claude-code", Some("  ".into())).unwrap();
        assert!(spec.args.iter().any(|a| a == DEFAULT_CLAUDE_MODEL));
    }

    #[test]
    fn resolve_spec_rejette_un_kind_inconnu() {
        assert!(resolve_spec("shell", None).is_err());
        assert!(resolve_spec("bidon", None).is_err());
    }

    // --- Sérialisation des messages NDJSON (schéma Rust-side) ---

    #[test]
    fn user_turn_line_est_un_json_user_termine_par_newline() {
        let line = user_turn_line("Bonjour");
        assert!(line.ends_with('\n'));
        let v: serde_json::Value = serde_json::from_str(line.trim_end()).unwrap();
        assert_eq!(v["type"], "user");
        assert_eq!(v["message"]["role"], "user");
        assert_eq!(v["message"]["content"][0]["type"], "text");
        assert_eq!(v["message"]["content"][0]["text"], "Bonjour");
    }

    #[test]
    fn user_turn_line_echappe_les_caracteres_speciaux() {
        // Anti-injection NDJSON : un guillemet/newline dans le texte ne casse pas la ligne.
        let line = user_turn_line("a\"b\nc");
        // Une seule ligne JSON (le \n interne est échappé, pas un séparateur).
        assert_eq!(line.matches('\n').count(), 1);
        let v: serde_json::Value = serde_json::from_str(line.trim_end()).unwrap();
        assert_eq!(v["message"]["content"][0]["text"], "a\"b\nc");
    }

    #[test]
    fn interrupt_line_est_le_controle_esc() {
        let line = interrupt_line();
        assert!(line.ends_with('\n'));
        let v: serde_json::Value = serde_json::from_str(line.trim_end()).unwrap();
        assert_eq!(v["type"], "interrupt");
    }

    // --- Parse défensif des lignes (P1 = verbatim, jamais de panique) ---

    #[test]
    fn clean_line_retire_le_retour_chariot_terminal() {
        assert_eq!(
            clean_line("{\"type\":\"system\"}\r\n").as_deref(),
            Some("{\"type\":\"system\"}")
        );
        assert_eq!(clean_line("texte\n").as_deref(), Some("texte"));
    }

    #[test]
    fn clean_line_ignore_les_lignes_vides() {
        assert_eq!(clean_line(""), None);
        assert_eq!(clean_line("\n"), None);
        assert_eq!(clean_line("\r\n"), None);
    }

    #[test]
    fn clean_line_ne_panique_pas_sur_une_ligne_non_json() {
        // P1 émet verbatim : une ligne non-JSON est rendue telle quelle (parse typé = P2).
        assert_eq!(
            clean_line("pas du json <<<").as_deref(),
            Some("pas du json <<<")
        );
    }

    // --- validate_cwd (anti-évasion chapeau, conservé côté runner) ---

    #[test]
    fn cwd_sous_le_chapeau_est_accepte() {
        let p = validate_cwd(&root(), &under("projet")).unwrap();
        assert_eq!(p, root().join("projet"));
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
        assert!(validate_cwd(&root(), escape)
            .unwrap_err()
            .contains("hors du chapeau"));
    }

    #[test]
    fn cwd_voisin_au_meme_prefixe_litteral_est_rejete() {
        let sibling = if cfg!(windows) {
            "C:\\Users\\u\\work-secret\\x"
        } else {
            "/home/u/work-secret/x"
        };
        assert!(validate_cwd(&root(), sibling).is_err());
    }
}
