//! IakaCockpit — backend Tauri 2 (socle L0 + métier L1).
//!
//! L0 a posé la fondation : modules de sécurité (`pathguard`, `secrets`),
//! résolution cross-OS (`paths`, `shell`) et config SQLite non sensible (`config`).
//! L1 salvage le backend métier d'iakaIDE, **dé-Windows-isé** et branché sur L0 :
//! `git` + `portfolio` (scan), `services` (check), `config` (commandes sur le
//! module L0), `terminal` (PTY, shell par OS, cwd validé sous le chapeau). Le
//! helper `db` ouvre `iakacockpit.sqlite` ; le module `config` reste l'unique
//! propriétaire du schéma SQLite.

pub mod ai;
pub mod codex;
pub mod config;
pub mod db;
pub mod economy;
pub mod git;
pub mod maincourante;
pub mod notify;
pub mod pathguard;
pub mod paths;
pub mod portfolio;
pub mod secrets;
pub mod seed;
pub mod services;
pub mod shell;
pub mod terminal;
pub mod transcript;

/// Commande de santé minimale — prouve le pont front↔back sans logique métier.
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(terminal::TermState::default())
        .manage(transcript::TranscriptState::default())
        .setup(|app| {
            // Garantit une racine de chapeau persistée dès le premier boot
            // (défaut calculé par OS via `paths`). Best-effort : un échec d'I/O
            // ne doit pas empêcher l'app de démarrer.
            if let Ok(conn) = db::open(app.handle()) {
                let _ = config::ensure_root(&conn);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            portfolio::scan_portfolio,
            portfolio::add_project,
            portfolio::list_extra_projects,
            economy::portfolio_economy,
            services::check_services,
            config::get_root,
            config::set_root,
            config::config_get,
            config::config_set,
            config::config_all,
            terminal::pty_open,
            terminal::pty_write,
            terminal::pty_resize,
            terminal::pty_close,
            terminal::pty_runner_open,
            transcript::transcript_tail_start,
            transcript::transcript_tail_stop,
            codex::codex_tail_start,
            ai::next_step,
            ai::chat,
            ai::ai_set_key,
            ai::ai_has_key,
            maincourante::fetch_main_courante,
            maincourante::couch_set_credentials,
            maincourante::couch_has_credentials,
            notify::notify_user,
            notify::n8n_set_token,
            notify::n8n_has_token,
            seed::seed_demo,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement d'IakaCockpit");
}
