//! config — configuration NON sensible persistée en SQLite (D3/D9).
//!
//! SQLite ne stocke QUE de la config non sensible : chapeau (`root`), thème,
//! endpoint LiteLLM (URL, SANS la clé). Aucun secret ici — les secrets vont au
//! keychain (`secrets.rs`). La valeur initiale de `root` est CALCULÉE par OS
//! (`paths::resolve_hat_root`), jamais codée en dur.
//!
//! Schéma minimal clé/valeur : table `config(key TEXT PRIMARY KEY, value TEXT)`.

use rusqlite::Connection;

use crate::paths::resolve_hat_root;

/// Clés de config réservées (non sensibles).
pub const KEY_ROOT: &str = "root";
pub const KEY_THEME: &str = "theme";
pub const KEY_LITELLM_ENDPOINT: &str = "litellm_endpoint";

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
}
