//! portfolio — découverte des projets + lecture de l'état git (salvage iakaIDE L1).
//!
//! `scan_portfolio(root)` énumère les sous-dossiers du chapeau et lit leur état
//! git via le helper `git::capture` (le binaire `git`, déjà cross-OS). La logique
//! pure (parsing `ahead/behind`, lecture de version, tri) est conservée AVEC ses
//! tests (repris d'iakaIDE). Aucune dette OS : aucun chemin Windows en dur — le
//! `root` est fourni par l'appelant, qui l'obtient via `config::get_root`
//! (défaut calculé par `paths::resolve_hat_root`).

use crate::{config, db, git};
use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;
use tauri::AppHandle;

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
    /// Description dédiée du projet (AR-6=B, F3) : 1ʳᵉ ligne significative de
    /// `specs/PROJET.md` (PRIORITAIRE), sinon 1ʳᵉ ligne de `## Ce qu'est ce
    /// projet` de `CLAUDE.md`, sinon `None`. Sert de sujet en gras de la tuile
    /// (fallback front = `last_commit_subject`).
    pub description: Option<String>,
    /// Nb d'items `- [ ]` NON cochés du backlog de `CLAUDE.md` (F3). `None` si 0 /
    /// pas de backlog (le front masque alors la donnée — zéro fausse donnée).
    pub backlog_remaining: Option<u32>,
    /// Texte du 1er item `- [ ]` non coché du backlog de `CLAUDE.md` (F3), nettoyé
    /// du marqueur et du markdown de tête. **Distinct** de la `NextStep` LLM (L3).
    pub backlog_next: Option<String>,
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

/// Première ligne « significative » d'un doc markdown : saute un éventuel bloc de
/// frontmatter YAML en tête (délimité par `---`), puis ignore lignes vides, titres
/// `#` et citations `>`.
fn first_significant_line(txt: &str) -> Option<String> {
    let mut lines = txt.lines().peekable();
    // Frontmatter : si le premier contenu non vide est `---`, on saute tout le bloc
    // jusqu'au `---` de fermeture (corps du frontmatter inclus).
    while let Some(l) = lines.peek() {
        if l.trim().is_empty() {
            lines.next();
        } else {
            break;
        }
    }
    if lines.peek().map(|l| l.trim() == "---").unwrap_or(false) {
        lines.next(); // consomme le `---` ouvrant
        for l in lines.by_ref() {
            if l.trim() == "---" {
                break; // `---` fermant consommé
            }
        }
    }
    for line in lines {
        let l = line.trim();
        if l.is_empty() || l == "---" || l.starts_with('#') || l.starts_with('>') {
            continue;
        }
        return Some(l.to_string());
    }
    None
}

/// Description dédiée du projet (F3, ordre AR-6=B) : (1) 1ʳᵉ ligne significative
/// de `specs/PROJET.md` (PRIORITAIRE) ; (2) sinon 1ʳᵉ ligne de texte de la
/// section `## Ce qu'est ce projet` de `CLAUDE.md` ; (3) sinon `None`. Parse
/// tolérant (niveau de `#` et casse de l'entête indifférents).
fn read_description(dir: &Path) -> Option<String> {
    // (1) 1ʳᵉ ligne significative de specs/PROJET.md (PRIORITAIRE, AR-6=B).
    if let Ok(txt) = std::fs::read_to_string(dir.join("specs").join("PROJET.md")) {
        if let Some(s) = first_significant_line(&txt) {
            return Some(s);
        }
    }
    // (2) fallback : section « ## Ce qu'est ce projet » de CLAUDE.md.
    if let Ok(txt) = std::fs::read_to_string(dir.join("CLAUDE.md")) {
        let mut in_section = false;
        for line in txt.lines() {
            let l = line.trim();
            if l.starts_with('#') {
                if in_section {
                    // Nouvelle section atteinte sans texte : abandon de la piste (2).
                    break;
                }
                let heading = l.trim_start_matches('#').trim();
                if heading.eq_ignore_ascii_case("Ce qu'est ce projet") {
                    in_section = true;
                }
                continue;
            }
            if in_section {
                if l.is_empty() || l == "---" || l.starts_with('>') {
                    continue;
                }
                return Some(l.to_string());
            }
        }
    }
    // (3) rien.
    None
}

/// Parse tolérant d'une ligne de checklist markdown. Renvoie `Some((checked, texte))`
/// si la ligne est un item `- [ ]` / `- [x]` (puce `-`/`*`/`+`, casse du `x`
/// indifférente, indentation tolérée), texte nettoyé du markdown de tête ; `None`
/// sinon.
fn parse_checkbox(line: &str) -> Option<(bool, String)> {
    let t = line.trim_start();
    let rest = t
        .strip_prefix("- ")
        .or_else(|| t.strip_prefix("* "))
        .or_else(|| t.strip_prefix("+ "))?;
    let rest = rest.trim_start();
    let bytes = rest.as_bytes();
    if bytes.len() < 3 || bytes[0] != b'[' || bytes[2] != b']' {
        return None;
    }
    let checked = match bytes[1] {
        b' ' => false,
        b'x' | b'X' => true,
        _ => return None,
    };
    let text = rest[3..]
        .trim()
        .trim_start_matches(['*', '_', '`', ' '])
        .to_string();
    Some((checked, text))
}

/// Backlog statique du projet (F3/F4) : compte les items `- [ ]` NON cochés de
/// `CLAUDE.md` et capte le texte du premier, en UN passage. Renvoie
/// `(backlog_remaining, backlog_next)`.
///
/// Sémantique F4 (pastille d'urgence) — `backlog_remaining` distingue « fini » de
/// « pas de backlog » : `Some(count_unchecked)` **dès qu'au moins UNE case**
/// (`- [ ]` OU `- [x]`) existe → `Some(0)` possible quand tout est coché ; `None`
/// **uniquement** s'il n'y a aucune case du tout / pas de `CLAUDE.md`.
/// `backlog_next` = texte du 1er `- [ ]` non coché, ou `None` si tout coché /
/// absent. **Distinct** du moteur LLM « prochaine étape » (L3).
fn read_backlog(dir: &Path) -> (Option<u32>, Option<String>) {
    let txt = match std::fs::read_to_string(dir.join("CLAUDE.md")) {
        Ok(t) => t,
        Err(_) => return (None, None),
    };
    let mut has_checkbox = false;
    let mut remaining: u32 = 0;
    let mut next: Option<String> = None;
    for line in txt.lines() {
        if let Some((checked, text)) = parse_checkbox(line) {
            has_checkbox = true;
            if !checked {
                remaining += 1;
                if next.is_none() && !text.is_empty() {
                    next = Some(text);
                }
            }
        }
    }
    if has_checkbox {
        (Some(remaining), next)
    } else {
        (None, None)
    }
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
    let description = read_description(path);
    let (backlog_remaining, backlog_next) = read_backlog(path);

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
            description,
            backlog_remaining,
            backlog_next,
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
        description,
        backlog_remaining,
        backlog_next,
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

// --- Projets importés hors racine (bouton + de Working) ---
//
// Un dossier choisi par l'utilisateur (geste natif, sélecteur de fichiers) peut
// vivre N'IMPORTE OÙ — y compris hors du chapeau. On persiste la liste de ses
// chemins en config (clé `extra_projects`, tableau JSON) pour qu'ils survivent au
// refresh / redémarrage. La logique pure (lecture/écriture dédupliquée) est isolée
// ici et testée sans `AppHandle`.

/// Lit la liste persistée des chemins de projets importés (`[]` si absente ou
/// JSON corrompu — tolérant, ne casse jamais le listing).
fn read_extra_paths(conn: &Connection) -> rusqlite::Result<Vec<String>> {
    match config::get(conn, config::KEY_EXTRA_PROJECTS)? {
        Some(json) => Ok(serde_json::from_str::<Vec<String>>(&json).unwrap_or_default()),
        None => Ok(Vec::new()),
    }
}

/// Ajoute un chemin à la liste persistée (dédupliqué ; no-op s'il y est déjà).
fn add_extra_path(conn: &Connection, path: &str) -> rusqlite::Result<()> {
    let mut paths = read_extra_paths(conn)?;
    if !paths.iter().any(|p| p == path) {
        paths.push(path.to_string());
        let json = serde_json::to_string(&paths).unwrap_or_else(|_| "[]".to_string());
        config::set(conn, config::KEY_EXTRA_PROJECTS, &json)?;
    }
    Ok(())
}

/// Importe un dossier existant comme projet : valide que c'est un dossier,
/// persiste son chemin, et renvoie son état git scanné (même lecture que le
/// portfolio). Le dossier est choisi par geste utilisateur (sélecteur natif) :
/// pas de contrainte « sous le chapeau » — c'est précisément un import externe.
#[tauri::command]
pub fn add_project(app: AppHandle, path: String) -> Result<Project, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("Dossier introuvable ou inaccessible : {path}"));
    }
    let conn = db::open(&app)?;
    add_extra_path(&conn, &path).map_err(|e| e.to_string())?;
    Ok(read_project(p))
}

/// Renvoie l'état des projets importés encore présents sur disque (les chemins
/// disparus sont silencieusement ignorés).
#[tauri::command]
pub fn list_extra_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let conn = db::open(&app)?;
    let paths = read_extra_paths(&conn).map_err(|e| e.to_string())?;
    Ok(paths
        .iter()
        .map(Path::new)
        .filter(|p| p.is_dir())
        .map(read_project)
        .collect())
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

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::config::init_schema(&conn).unwrap();
        conn
    }

    #[test]
    fn extra_paths_vide_par_defaut() {
        let conn = mem();
        assert_eq!(read_extra_paths(&conn).unwrap(), Vec::<String>::new());
    }

    #[test]
    fn extra_paths_ajout_persiste_et_dedupe() {
        let conn = mem();
        add_extra_path(&conn, "/a/proj1").unwrap();
        add_extra_path(&conn, "/b/proj2").unwrap();
        add_extra_path(&conn, "/a/proj1").unwrap(); // doublon → ignoré
        assert_eq!(
            read_extra_paths(&conn).unwrap(),
            vec!["/a/proj1".to_string(), "/b/proj2".to_string()]
        );
    }

    #[test]
    fn extra_paths_json_corrompu_donne_liste_vide() {
        let conn = mem();
        crate::config::set(&conn, crate::config::KEY_EXTRA_PROJECTS, "pas du json").unwrap();
        assert_eq!(read_extra_paths(&conn).unwrap(), Vec::<String>::new());
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
            description: None,
            backlog_remaining: None,
            backlog_next: None,
            work_status: status.to_string(),
        }
    }

    // --- F3 : description dédiée + backlog statique ---

    /// Crée un dossier temporaire vierge avec `specs/` prêt (fixtures F3).
    fn tmp_dir(tag: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("iakacockpit-f3-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("specs")).unwrap();
        dir
    }

    #[test]
    fn read_description_lit_projet_md_en_priorite() {
        // AR-6=B : PROJET.md est PRIORITAIRE sur CLAUDE.md.
        let d = tmp_dir("desc-projet");
        std::fs::write(
            d.join("specs").join("PROJET.md"),
            "---\ntitre: x\n---\n\n# Titre\n\n> une citation\n\nLa vision réelle du projet.\n",
        )
        .unwrap();
        assert_eq!(
            read_description(&d),
            Some("La vision réelle du projet.".to_string())
        );
    }

    #[test]
    fn read_description_projet_md_gagne_sur_claude_md() {
        // AR-6=B : même si CLAUDE.md a une section « ## Ce qu'est ce projet »,
        // PROJET.md l'emporte.
        let d = tmp_dir("desc-priorite");
        std::fs::write(
            d.join("CLAUDE.md"),
            "# CLAUDE.md\n\n## Ce qu'est ce projet\n\nDescription CLAUDE.md (perdante).\n",
        )
        .unwrap();
        std::fs::write(
            d.join("specs").join("PROJET.md"),
            "# Titre\n\nLa vision réelle du projet.\n",
        )
        .unwrap();
        assert_eq!(
            read_description(&d),
            Some("La vision réelle du projet.".to_string())
        );
    }

    #[test]
    fn read_description_fallback_sur_claude_md() {
        // Sans PROJET.md significatif → fallback sur la section CLAUDE.md.
        let d = tmp_dir("desc-claude");
        std::fs::write(
            d.join("CLAUDE.md"),
            "# CLAUDE.md\n\n## Ce qu'est ce projet\n\nUn cockpit chapeau-rooted de l'écosystème.\n\n## Autre\ntexte\n",
        )
        .unwrap();
        // pas de specs/PROJET.md
        assert_eq!(
            read_description(&d),
            Some("Un cockpit chapeau-rooted de l'écosystème.".to_string())
        );
    }

    #[test]
    fn read_description_absente_donne_none() {
        let d = tmp_dir("desc-none");
        std::fs::write(d.join("CLAUDE.md"), "# CLAUDE.md\n\n## Backlog\n- [ ] x\n").unwrap();
        // pas de PROJET.md
        assert_eq!(read_description(&d), None);
        // dossier totalement vide
        let empty = tmp_dir("desc-empty");
        assert_eq!(read_description(&empty), None);
    }

    #[test]
    fn read_backlog_compte_les_non_coches_et_capte_le_premier() {
        let d = tmp_dir("backlog-mixte");
        std::fs::write(
            d.join("CLAUDE.md"),
            "## Backlog\n- [x] fait A\n- [ ] **L16** — Toggle tuiles\n- [X] fait B\n- [ ] Documenter\n",
        )
        .unwrap();
        let (remaining, next) = read_backlog(&d);
        assert_eq!(remaining, Some(2));
        // texte nettoyé du markdown de tête (`**`).
        assert_eq!(next, Some("L16** — Toggle tuiles".to_string()));
    }

    #[test]
    fn read_backlog_tout_coche_donne_some_zero_et_next_none() {
        // F4 : backlog PRÉSENT mais tout coché → `Some(0)` (pastille verte « fini »),
        // distinct du gris « pas de backlog ». `next` reste `None`.
        let d = tmp_dir("backlog-done");
        std::fs::write(
            d.join("CLAUDE.md"),
            "## Backlog\n- [x] fait A\n- [X] fait B\n",
        )
        .unwrap();
        assert_eq!(read_backlog(&d), (Some(0), None));
    }

    #[test]
    fn read_backlog_mix_donne_some_k_et_premier_non_coche() {
        // F4 : mix coché / non coché → `Some(k)` (k = nb de non cochés) + `next` = 1er
        // item non coché (peu importe qu'il vienne après des cochés).
        let d = tmp_dir("backlog-mix");
        std::fs::write(
            d.join("CLAUDE.md"),
            "## Backlog\n- [x] fait A\n- [ ] premier restant\n- [x] fait B\n- [ ] second restant\n",
        )
        .unwrap();
        let (remaining, next) = read_backlog(&d);
        assert_eq!(remaining, Some(2));
        assert_eq!(next, Some("premier restant".to_string()));
    }

    #[test]
    fn read_backlog_absent_donne_none() {
        // F4 : `None` UNIQUEMENT si aucune case du tout / pas de CLAUDE.md.
        let d = tmp_dir("backlog-absent");
        // pas de CLAUDE.md du tout
        assert_eq!(read_backlog(&d), (None, None));
        // CLAUDE.md sans aucune case
        std::fs::write(d.join("CLAUDE.md"), "# Titre\ntexte sans checklist\n").unwrap();
        assert_eq!(read_backlog(&d), (None, None));
    }

    #[test]
    fn parse_checkbox_est_tolerant() {
        assert_eq!(
            parse_checkbox("- [ ] tâche"),
            Some((false, "tâche".to_string()))
        );
        assert_eq!(
            parse_checkbox("- [x] fait"),
            Some((true, "fait".to_string()))
        );
        assert_eq!(
            parse_checkbox("- [X] fait"),
            Some((true, "fait".to_string()))
        );
        assert_eq!(
            parse_checkbox("  - [ ] indenté"),
            Some((false, "indenté".to_string()))
        );
        assert_eq!(
            parse_checkbox("* [ ] puce étoile"),
            Some((false, "puce étoile".to_string()))
        );
        assert_eq!(parse_checkbox("texte normal"), None);
        assert_eq!(parse_checkbox("- pas une case"), None);
    }
}
