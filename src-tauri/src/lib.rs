//! IakaCockpit — backend Tauri 2 (socle L0).
//!
//! L0 pose la fondation : modules de sécurité (`pathguard`, `secrets`), résolution
//! cross-OS (`paths`, `shell`) et config SQLite non sensible (`config`). AUCUNE
//! commande métier n'est salvagée ici — le salvage du backend iakaIDE est L1.
//! L'`invoke_handler` est volontairement minimal (une commande `ping` de santé)
//! pour rester prêt à accueillir L1 sans god-file.

pub mod config;
pub mod pathguard;
pub mod paths;
pub mod secrets;
pub mod shell;

/// Commande de santé minimale — prouve le pont front↔back sans logique métier.
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("erreur au lancement d'IakaCockpit");
}
