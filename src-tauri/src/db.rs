//! db — ouverture de la connexion SQLite applicative (L1).
//!
//! Un seul propriétaire du schéma : le module L0 `config` (D2/R-L1-7). Ce helper
//! ne fait qu'ouvrir la base `iakacockpit.sqlite` sous `app_data_dir` et déléguer
//! la création du schéma à `config::init_schema`. Aucune définition de table ici,
//! aucun nom de fichier Windows (`iakaide.sqlite` éliminé).

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::config;

/// Nom du fichier SQLite applicatif (jamais `iakaide.sqlite`).
const DB_FILE: &str = "iakacockpit.sqlite";

/// Ouvre la connexion à la base applicative et garantit le schéma (L0).
///
/// Crée `app_data_dir` au besoin, ouvre `iakacockpit.sqlite`, puis appelle
/// `config::init_schema`. Toute erreur est remontée sous forme de `String`
/// (consommable par les commandes Tauri).
pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(dir.join(DB_FILE)).map_err(|e| e.to_string())?;
    config::init_schema(&conn).map_err(|e| e.to_string())?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::DB_FILE;

    #[test]
    fn nom_de_fichier_db_est_iakacockpit_pas_iakaide() {
        assert_eq!(DB_FILE, "iakacockpit.sqlite");
        assert!(!DB_FILE.contains("iakaide"));
    }
}
