//! portfolio — découverte des projets + lecture de l'état git (salvage iakaIDE L1).
//!
//! `scan_portfolio(root)` énumère les sous-dossiers du chapeau et lit leur état
//! git via le helper `git::capture` (le binaire `git`, déjà cross-OS). La logique
//! pure (parsing `ahead/behind`, lecture de version, tri) est conservée AVEC ses
//! tests (repris d'iakaIDE). Aucune dette OS : aucun chemin Windows en dur — le
//! `root` est fourni par l'appelant, qui l'obtient via `config::get_root`
//! (défaut calculé par `paths::resolve_hat_root`).

use crate::git;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize, Clone)]
pub struct Project {
    pub id: String,
    pub path: String,
    pub is_git: bool,
    pub branch: Option<String>,
    pub dirty: bool,
    pub ahead: u32,
    pub behind: u32,
    pub last_commit_date: Option<String>,
    pub last_commit_subject: Option<String>,
    pub version: Option<String>,
    /// "work pending" | "stable" | "hors git"
    pub work_status: String,
}

/// `git rev-list --left-right --count @{u}...HEAD` renvoie `behind<TAB>ahead`
/// (gauche = upstream `@{u}` => behind ; droite = HEAD => ahead). Renvoie
/// `(ahead, behind)`.
fn parse_ahead_behind(s: &str) -> (u32, u32) {
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() == 2 {
        let behind = parts[0].parse().unwrap_or(0);
        let ahead = parts[1].parse().unwrap_or(0);
        (ahead, behind)
    } else {
        (0, 0)
    }
}

/// Lit la ligne `| Version | ... |` de `specs/etat-des-lieux.md`. `"-"` ou vide
/// => `None`.
fn read_version(dir: &Path) -> Option<String> {
    let p = dir.join("specs").join("etat-des-lieux.md");
    let txt = std::fs::read_to_string(p).ok()?;
    for line in txt.lines() {
        let l = line.trim();
        if l.starts_with('|') {
            let cells: Vec<&str> = l.trim_matches('|').split('|').map(|c| c.trim()).collect();
            if cells.len() >= 2 && cells[0].eq_ignore_ascii_case("Version") {
                let v = cells[1].trim();
                if v.is_empty() || v == "-" {
                    return None;
                }
                return Some(v.to_string());
            }
        }
    }
    None
}

/// Rang de tri d'un statut de travail (work pending → stable → hors git).
fn rank(s: &str) -> u8 {
    match s {
        "work pending" => 0,
        "stable" => 1,
        _ => 2,
    }
}

fn read_project(path: &Path) -> Project {
    let id = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let path_str = path.to_string_lossy().to_string();
    let is_git = path.join(".git").exists();
    let version = read_version(path);

    if !is_git {
        return Project {
            id,
            path: path_str,
            is_git: false,
            branch: None,
            dirty: false,
            ahead: 0,
            behind: 0,
            last_commit_date: None,
            last_commit_subject: None,
            version,
            work_status: "hors git".to_string(),
        };
    }

    let branch = git::capture(path, &["rev-parse", "--abbrev-ref", "HEAD"]);
    let dirty = git::capture(path, &["status", "--porcelain"])
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    // Absorbe l'absence d'upstream / de commit : ahead=behind=0.
    let (ahead, behind) = git::capture(
        path,
        &["rev-list", "--left-right", "--count", "@{u}...HEAD"],
    )
    .map(|s| parse_ahead_behind(&s))
    .unwrap_or((0, 0));
    let (last_commit_date, last_commit_subject) =
        match git::capture(path, &["log", "-1", "--format=%cs|%s"]) {
            Some(s) => {
                let mut it = s.splitn(2, '|');
                (
                    it.next().map(|x| x.to_string()).filter(|x| !x.is_empty()),
                    it.next().map(|x| x.to_string()),
                )
            }
            None => (None, None),
        };
    let work_status = if dirty || ahead > 0 {
        "work pending"
    } else {
        "stable"
    }
    .to_string();

    Project {
        id,
        path: path_str,
        is_git: true,
        branch,
        dirty,
        ahead,
        behind,
        last_commit_date,
        last_commit_subject,
        version,
        work_status,
    }
}

/// Énumère les sous-dossiers de `root` et renvoie leur état (trié work pending →
/// stable → hors git, puis par identifiant).
#[tauri::command]
pub fn scan_portfolio(root: String) -> Result<Vec<Project>, String> {
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Err(format!("Racine introuvable ou inaccessible : {}", root));
    }
    let entries = std::fs::read_dir(root_path)
        .map_err(|e| format!("Lecture de {} impossible : {}", root, e))?;
    let mut projects: Vec<Project> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .map(|p| read_project(&p))
        .collect();

    projects.sort_by(|a, b| {
        rank(&a.work_status)
            .cmp(&rank(&b.work_status))
            .then(a.id.to_lowercase().cmp(&b.id.to_lowercase()))
    });
    Ok(projects)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ahead_behind_maps_behind_then_ahead() {
        // sortie de `git rev-list --left-right --count @{u}...HEAD` = "behind<TAB>ahead"
        assert_eq!(parse_ahead_behind("2\t5"), (5, 2)); // ahead=5, behind=2
        assert_eq!(parse_ahead_behind("0\t0"), (0, 0));
        assert_eq!(parse_ahead_behind("3 1"), (1, 3)); // séparé par espace
    }

    #[test]
    fn ahead_behind_robuste_si_vide() {
        assert_eq!(parse_ahead_behind(""), (0, 0));
        assert_eq!(parse_ahead_behind("garbage"), (0, 0));
    }

    fn tmp_with_edl(tag: &str, content: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("iakacockpit-edl-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("specs")).unwrap();
        std::fs::write(dir.join("specs").join("etat-des-lieux.md"), content).unwrap();
        dir
    }

    #[test]
    fn read_version_lit_la_ligne_version() {
        let d = tmp_with_edl(
            "ok",
            "| Champ | Valeur |\n| Version | v0.8.0 |\n| Branche | main |\n",
        );
        assert_eq!(read_version(&d), Some("v0.8.0".to_string()));
    }

    #[test]
    fn read_version_tiret_ou_vide_donne_none() {
        let d = tmp_with_edl("dash", "| Version | - |\n");
        assert_eq!(read_version(&d), None);
    }

    #[test]
    fn read_version_absente_donne_none() {
        let d = tmp_with_edl("none", "| Branche | main |\n");
        assert_eq!(read_version(&d), None);
        // fichier inexistant
        assert_eq!(read_version(std::path::Path::new("/zzz/inexistant")), None);
    }

    #[test]
    fn tri_classe_work_pending_avant_stable_avant_hors_git() {
        let mut v = [
            mk("zeta", "hors git"),
            mk("beta", "stable"),
            mk("alpha", "work pending"),
            mk("gamma", "stable"),
        ];
        v.sort_by(|a, b| {
            rank(&a.work_status)
                .cmp(&rank(&b.work_status))
                .then(a.id.to_lowercase().cmp(&b.id.to_lowercase()))
        });
        let order: Vec<&str> = v.iter().map(|p| p.id.as_str()).collect();
        assert_eq!(order, vec!["alpha", "beta", "gamma", "zeta"]);
    }

    fn mk(id: &str, status: &str) -> Project {
        Project {
            id: id.to_string(),
            path: format!("/x/{id}"),
            is_git: status != "hors git",
            branch: None,
            dirty: false,
            ahead: 0,
            behind: 0,
            last_commit_date: None,
            last_commit_subject: None,
            version: None,
            work_status: status.to_string(),
        }
    }
}
