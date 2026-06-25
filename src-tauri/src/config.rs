//! config — configuration NON sensible persistée en SQLite (D3/D9).
//!
//! SQLite ne stocke QUE de la config non sensible : chapeau (`root`), thème,
//! endpoint LiteLLM (URL, SANS la clé). Aucun secret ici — les secrets vont au
//! keychain (`secrets.rs`). La valeur initiale de `root` est CALCULÉE par OS
//! (`paths::resolve_hat_root`), jamais codée en dur.
//!
//! Schéma minimal clé/valeur : table `config(key TEXT PRIMARY KEY, value TEXT)`.

use std::collections::HashMap;

use rusqlite::Connection;
use tauri::AppHandle;

use crate::db;
use crate::paths::resolve_hat_root;

/// Clés de config réservées (non sensibles).
pub const KEY_ROOT: &str = "root";
pub const KEY_THEME: &str = "theme";
pub const KEY_LITELLM_ENDPOINT: &str = "litellm_endpoint";
/// Projets importés hors racine (bouton + de Working) : tableau JSON de chemins.
pub const KEY_EXTRA_PROJECTS: &str = "extra_projects";

/// Crée la table `config` si absente.
pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

/// Écrit (ou remplace) une valeur de config.
pub fn set(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )?;
    Ok(())
}

/// Lit une valeur de config (`None` si absente).
pub fn get(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM config WHERE key = ?1")?;
    let mut rows = stmt.query(rusqlite::params![key])?;
    match rows.next()? {
        Some(row) => Ok(Some(row.get(0)?)),
        None => Ok(None),
    }
}

/// Garantit que `root` est présent ; s'il manque, l'initialise avec le défaut
/// calculé par OS. Renvoie la valeur effective.
pub fn ensure_root(conn: &Connection) -> rusqlite::Result<String> {
    if let Some(v) = get(conn, KEY_ROOT)? {
        return Ok(v);
    }
    let default_root = resolve_hat_root().to_string_lossy().to_string();
    set(conn, KEY_ROOT, &default_root)?;
    Ok(default_root)
}

/// Une clé est-elle un secret ? (jamais renvoyée en bloc par `config_all`).
///
/// Repris de l'audit iakaIDE : les clés contenant `token|key|secret|password`
/// restent accessibles une par une via `config_get`, jamais listées en bloc. En
/// pratique aucun secret ne transite par la config (les secrets vont au keychain,
/// L3) — ce filtre est une garde de cloisonnement.
fn is_secret(key: &str) -> bool {
    let k = key.to_lowercase();
    k.contains("token") || k.contains("key") || k.contains("secret") || k.contains("password")
}

// --- Commandes Tauri (salvage iakaIDE, branchées sur le module L0 ci-dessus) ---

/// Racine du chapeau. Défaut **calculé** par OS (`paths`/`ensure_root`) si absent.
#[tauri::command]
pub fn get_root(app: AppHandle) -> Result<String, String> {
    let conn = db::open(&app)?;
    ensure_root(&conn).map_err(|e| e.to_string())
}

/// Persiste la racine du chapeau.
#[tauri::command]
pub fn set_root(app: AppHandle, root: String) -> Result<(), String> {
    let conn = db::open(&app)?;
    set(&conn, KEY_ROOT, &root).map_err(|e| e.to_string())
}

/// Lit une valeur de config (`None` si absente).
#[tauri::command]
pub fn config_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let conn = db::open(&app)?;
    get(&conn, &key).map_err(|e| e.to_string())
}

/// Écrit/maj une valeur de config.
#[tauri::command]
pub fn config_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let conn = db::open(&app)?;
    set(&conn, &key, &value).map_err(|e| e.to_string())
}

/// Renvoie la config NON sensible (clé → valeur). Les secrets sont **exclus**
/// (cf. `is_secret`) ; ils restent lisibles un par un via `config_get`.
#[tauri::command]
pub fn config_all(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let conn = db::open(&app)?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM config")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        if !is_secret(&k) {
            map.insert(k, v);
        }
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        conn
    }

    #[test]
    fn set_then_get_roundtrip() {
        let conn = mem();
        set(&conn, KEY_THEME, "dark").unwrap();
        assert_eq!(get(&conn, KEY_THEME).unwrap(), Some("dark".to_string()));
    }

    #[test]
    fn get_absent_renvoie_none() {
        let conn = mem();
        assert_eq!(get(&conn, "inconnu").unwrap(), None);
    }

    #[test]
    fn set_remplace_la_valeur() {
        let conn = mem();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4000").unwrap();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4001").unwrap();
        assert_eq!(
            get(&conn, KEY_LITELLM_ENDPOINT).unwrap(),
            Some("http://localhost:4001".to_string())
        );
    }

    #[test]
    fn ensure_root_initialise_avec_le_defaut_calcule() {
        let conn = mem();
        let root = ensure_root(&conn).unwrap();
        assert!(!root.is_empty());
        // Idempotent : un second appel ne change pas la valeur.
        let again = ensure_root(&conn).unwrap();
        assert_eq!(root, again);
        assert_eq!(get(&conn, KEY_ROOT).unwrap(), Some(root));
    }

    #[test]
    fn is_secret_detecte_les_cles_sensibles() {
        for k in [
            "token",
            "litellm_token",
            "api_key",
            "KEY",
            "my_secret",
            "db_password",
        ] {
            assert!(is_secret(k), "{k} devrait être secret");
        }
    }

    #[test]
    fn is_secret_laisse_passer_la_config_non_sensible() {
        for k in [KEY_ROOT, KEY_THEME, KEY_LITELLM_ENDPOINT, "widget_layout"] {
            assert!(!is_secret(k), "{k} ne devrait pas être secret");
        }
    }

    #[test]
    fn config_all_filtre_exclut_uniquement_les_secrets() {
        // Reproduit le filtre de `config_all` sur une base mémoire (sans AppHandle).
        let conn = mem();
        set(&conn, KEY_THEME, "dark").unwrap();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4000").unwrap();
        set(&conn, "litellm_api_key", "sk-secret").unwrap();

        let mut stmt = conn.prepare("SELECT key, value FROM config").unwrap();
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .unwrap();
        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = row.unwrap();
            if !is_secret(&k) {
                map.insert(k, v);
            }
        }
        assert!(map.contains_key(KEY_THEME));
        assert!(map.contains_key(KEY_LITELLM_ENDPOINT));
        assert!(!map.contains_key("litellm_api_key"));
    }
}
