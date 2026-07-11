//! handoff — **lecture disque du paquet de handoff** (H1) : le cockpit RÉCEPTIONNE.
//!
//! Le canal (Q-B) est un dossier partagé sous le chapeau : `<handoff_root>/<team_id>/`, où la
//! forge dépose `team.json` (définition PURE) + `handoff.json` (provenance). Ici, le cockpit
//! y LIT (dépôt en lecture seule côté cockpit — aucune écriture dans le canal, Q-E : pas de
//! remontée). Rust est **agnostique du schéma** : il renvoie les chaînes JSON telles quelles ;
//! le front (`src/handoff/receive.ts`) parse défensivement la forme `@iakaframe/core`.
//!
//! Anti-traversal via `pathguard`, dégradation propre (`Err(String)`/`Ok(None)`, jamais de
//! panique). Aucun secret, aucun réseau. `now_millis` fournit l'horloge (importedAt) — le front
//! n'utilise jamais `Date.now()`.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::pathguard;
use crate::paths::resolve_handoff_root;

const TEAM_FILE: &str = "team.json";
const MANIFEST_FILE: &str = "handoff.json";

/// Contenu brut d'un paquet de handoff lu depuis le canal (chaînes JSON opaques, `None` si
/// le fichier correspondant est absent). Le front tient le schéma.
#[derive(Serialize, Default)]
pub struct HandoffPackage {
    /// Contenu de `team.json`, ou `None` si absent (paquet invalide/incomplet).
    pub team_json: Option<String>,
    /// Contenu de `handoff.json`, ou `None` si absent.
    pub handoff_json: Option<String>,
}

/// Valide un id de team (segment simple) — même garde que la forge.
fn validate_team_id(id: &str) -> Result<(), String> {
    let t = id.trim();
    if t.is_empty() {
        return Err("id de team vide".to_string());
    }
    if t == "." || t == ".." || t.contains('/') || t.contains('\\') {
        return Err("id de team invalide".to_string());
    }
    Ok(())
}

/// Dossier de handoff d'une team sous `root` (`<root>/<id>`), validé anti-traversal.
fn team_dir(root: &Path, id: &str) -> Result<PathBuf, String> {
    validate_team_id(id)?;
    pathguard::safe_path(root, Path::new(id.trim())).map_err(|e| format!("{e:?}"))
}

/// Lit un fichier optionnel (`None` si absent ; erreur sur autre I/O).
fn read_opt(path: &Path) -> Result<Option<String>, String> {
    match std::fs::read_to_string(path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Lit le paquet de handoff d'une team sous `root`. Les deux fichiers sont optionnels
/// (paquet incomplet toléré → le front décide s'il est exploitable).
pub fn read_in(root: &Path, id: &str) -> Result<HandoffPackage, String> {
    let dir = team_dir(root, id)?;
    Ok(HandoffPackage {
        team_json: read_opt(&dir.join(TEAM_FILE))?,
        handoff_json: read_opt(&dir.join(MANIFEST_FILE))?,
    })
}

/// Liste les team_ids disponibles dans le canal (sous-dossiers contenant un `team.json`).
/// Canal absent → liste vide (jamais d'erreur bloquante). Triée pour un affichage stable.
pub fn list_in(root: &Path) -> Vec<String> {
    let mut out = Vec::new();
    let entries = match std::fs::read_dir(root) {
        Ok(e) => e,
        Err(_) => return out,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && path.join(TEAM_FILE).is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                out.push(name.to_string());
            }
        }
    }
    out.sort();
    out
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Lit le paquet de handoff d'une team depuis le canal partagé.
#[tauri::command]
pub fn handoff_read(team_id: String) -> Result<HandoffPackage, String> {
    read_in(&resolve_handoff_root(), &team_id)
}

/// Liste les livraisons disponibles dans le canal (team_ids).
#[tauri::command]
pub fn handoff_list() -> Result<Vec<String>, String> {
    Ok(list_in(&resolve_handoff_root()))
}

/// Horloge du backend en millisecondes epoch (UTC) — source d'`importedAt` (jamais `Date.now`).
#[tauri::command]
pub fn now_millis() -> Result<i64, String> {
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    Ok(d.as_millis() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!(
            "iakacockpit-handoff-{tag}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = std::fs::remove_dir_all(&d);
        d
    }

    fn write_pkg(root: &Path, id: &str, team: &str, manifest: &str) {
        let dir = root.join(id);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("team.json"), team).unwrap();
        std::fs::write(dir.join("handoff.json"), manifest).unwrap();
    }

    #[test]
    fn read_lit_les_deux_fichiers() {
        let root = tmp("read");
        write_pkg(
            &root,
            "iakaframe",
            r#"{"id":"iakaframe"}"#,
            r#"{"source":"forge"}"#,
        );
        let pkg = read_in(&root, "iakaframe").unwrap();
        assert_eq!(pkg.team_json.as_deref(), Some(r#"{"id":"iakaframe"}"#));
        assert_eq!(pkg.handoff_json.as_deref(), Some(r#"{"source":"forge"}"#));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn read_paquet_absent_renvoie_none() {
        let root = tmp("absent");
        let pkg = read_in(&root, "inconnu").unwrap();
        assert!(pkg.team_json.is_none());
        assert!(pkg.handoff_json.is_none());
    }

    #[test]
    fn list_ne_retient_que_les_dossiers_avec_team_json() {
        let root = tmp("list");
        write_pkg(&root, "alpha", "{}", "{}");
        write_pkg(&root, "beta", "{}", "{}");
        // Un dossier sans team.json est ignoré.
        std::fs::create_dir_all(root.join("gamma")).unwrap();
        let ids = list_in(&root);
        assert_eq!(ids, vec!["alpha".to_string(), "beta".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn list_canal_absent_renvoie_vide() {
        let root = tmp("void");
        assert!(list_in(&root).is_empty());
    }

    #[test]
    fn traversal_dans_l_id_est_refuse() {
        let root = tmp("trav");
        assert!(read_in(&root, "../evil").is_err());
        assert!(read_in(&root, "").is_err());
        assert!(read_in(&root, "..").is_err());
        assert!(read_in(&root, "a/b").is_err());
    }

    #[test]
    fn now_millis_posterieur_a_2023() {
        assert!(now_millis().unwrap() > 1_700_000_000_000);
    }
}
