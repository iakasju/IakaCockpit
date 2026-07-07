//! frame — persistance du « Cadre » iakaframe (L22-P1, AR-1).
//!
//! Stocke UN `frame.json` **par team**, versionnable, sous le chapeau :
//! `<hat>/.iakacockpit/frames/<team>.json`. Rust reste **agnostique du schéma** — le
//! modèle vit côté front (`src/frame/model.ts`) ; ici on lit/écrit une chaîne JSON telle
//! quelle. Anti-traversal via `pathguard`, écriture atomique, dégradation propre
//! (`Err(String)`, jamais de panique). Aucun secret (calque config non sensible).

use std::path::{Path, PathBuf};

use serde::Deserialize;

use crate::pathguard;
use crate::paths;

const FRAMES_DIR: &str = ".iakacockpit/frames";

/// Un fichier markdown à exporter (L22-P2b). Le CONTENU est généré côté front (agnostique
/// du schéma) ; Rust ne fait qu'écrire sous un dossier sûr.
#[derive(Deserialize)]
pub struct ExportFile {
    pub name: String,
    pub content: String,
}

/// Nom de fichier sûr à partir d'un `team_id` quelconque (le team_id est libre).
fn slug(team_id: &str) -> String {
    let s: String = team_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if s.trim_matches('.').is_empty() {
        "team".to_string()
    } else {
        s
    }
}

/// Chemin du `frame.json` d'une team sous `root` (testable). Anti-traversal `pathguard`.
fn frame_path_in(root: &Path, team_id: &str) -> Result<PathBuf, String> {
    let base = root.join(FRAMES_DIR);
    let file = format!("{}.json", slug(team_id));
    pathguard::safe_path(&base, Path::new(&file))
        .map_err(|e| format!("chemin cadre invalide: {e:?}"))
}

fn load_in(root: &Path, team_id: &str) -> Result<Option<String>, String> {
    let path = frame_path_in(root, team_id)?;
    match std::fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("lecture cadre: {e}")),
    }
}

fn save_in(root: &Path, team_id: &str, json: &str) -> Result<(), String> {
    let path = frame_path_in(root, team_id)?;
    let dir = path.parent().ok_or("chemin cadre sans parent")?;
    std::fs::create_dir_all(dir).map_err(|e| format!("création dossier cadres: {e}"))?;
    let tmp = path.with_extension("part");
    std::fs::write(&tmp, json.as_bytes()).map_err(|e| format!("écriture cadre: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("finalisation cadre: {e}"))?;
    Ok(())
}

/// Charge le `frame.json` d'une team, ou `None` si absent (pas d'erreur sur absence).
#[tauri::command]
pub fn frame_load(team_id: String) -> Result<Option<String>, String> {
    load_in(&paths::resolve_hat_root(), &team_id)
}

/// Écrit (atomique) le `frame.json` d'une team, crée le dossier si besoin.
#[tauri::command]
pub fn frame_save(team_id: String, json: String) -> Result<(), String> {
    save_in(&paths::resolve_hat_root(), &team_id, &json)
}

/// Dossier d'export markdown d'une team : `<hat>/.iakacockpit/frames/<team>/` (à côté du
/// `<team>.json`). Anti-traversal `pathguard`.
fn export_dir_in(root: &Path, team_id: &str) -> Result<PathBuf, String> {
    let base = root.join(FRAMES_DIR);
    pathguard::safe_path(&base, Path::new(&slug(team_id)))
        .map_err(|e| format!("dossier export invalide: {e:?}"))
}

fn export_in(root: &Path, team_id: &str, files: &[ExportFile]) -> Result<String, String> {
    let dir = export_dir_in(root, team_id)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("création dossier export: {e}"))?;
    for f in files {
        // Chaque nom de fichier est ressluggé + borné sous le dossier (défense).
        let path = pathguard::safe_path(&dir, Path::new(&slug(&f.name)))
            .map_err(|e| format!("nom de fichier export invalide: {e:?}"))?;
        std::fs::write(&path, f.content.as_bytes()).map_err(|e| format!("écriture export: {e}"))?;
    }
    Ok(dir.to_string_lossy().to_string())
}

/// Exporte les fichiers markdown du Cadre (un `agent.md` par agent, générés par le front)
/// sous `<hat>/.iakacockpit/frames/<team>/`. Renvoie le chemin du dossier.
#[tauri::command]
pub fn frame_export(team_id: String, files: Vec<ExportFile>) -> Result<String, String> {
    export_in(&paths::resolve_hat_root(), &team_id, &files)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("iakacockpit-frame-{name}"));
        let _ = std::fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn slug_nettoie_les_caracteres_dangereux() {
        assert_eq!(slug("iakaframe"), "iakaframe");
        assert_eq!(slug("team a/b"), "team_a_b");
        assert_eq!(slug("../evil"), ".._evil");
        assert_eq!(slug(""), "team");
    }

    #[test]
    fn frame_path_reste_sous_la_base() {
        let root = PathBuf::from("/home/u/work");
        let p = frame_path_in(&root, "iakaframe").unwrap();
        assert_eq!(p, root.join(".iakacockpit/frames").join("iakaframe.json"));
        // une tentative de traversal est neutralisée (slug -> pas de séparateur)
        let p2 = frame_path_in(&root, "../../etc/passwd").unwrap();
        assert!(p2.starts_with(root.join(".iakacockpit/frames")));
    }

    #[test]
    fn load_absent_renvoie_none() {
        let root = tmp("absent");
        assert_eq!(load_in(&root, "x").unwrap(), None);
    }

    #[test]
    fn save_puis_load_round_trip() {
        let root = tmp("roundtrip");
        let json = r#"{"version":1,"teamId":"iakaframe","rules":[]}"#;
        save_in(&root, "iakaframe", json).unwrap();
        assert_eq!(load_in(&root, "iakaframe").unwrap().as_deref(), Some(json));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn export_ecrit_les_md_sous_le_dossier_team() {
        let root = tmp("export");
        let files = vec![
            ExportFile {
                name: "gimli.md".to_string(),
                content: "# Agent — Gimli".to_string(),
            },
            ExportFile {
                name: "legolas.md".to_string(),
                content: "# Agent — Legolas".to_string(),
            },
        ];
        let dir = export_in(&root, "iakaframe", &files).unwrap();
        assert!(dir.ends_with(".iakacockpit/frames/iakaframe"));
        let p = std::path::Path::new(&dir).join("gimli.md");
        assert_eq!(std::fs::read_to_string(p).unwrap(), "# Agent — Gimli");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn save_ecrase_sans_laisser_de_part() {
        let root = tmp("overwrite");
        save_in(&root, "t", "{\"v\":1}").unwrap();
        save_in(&root, "t", "{\"v\":2}").unwrap();
        assert_eq!(load_in(&root, "t").unwrap().as_deref(), Some("{\"v\":2}"));
        let frames = root.join(".iakacockpit/frames");
        let parts = std::fs::read_dir(&frames)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("part"))
            .count();
        assert_eq!(parts, 0);
        let _ = std::fs::remove_dir_all(&root);
    }
}
