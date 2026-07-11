//! resume — préparation de reprise (L23).
//!
//! Geste « ranger un projet = mettre le dev en pause → préparer la reprise ». Quand
//! l'utilisateur retire un projet de la **Table** (worklist de la vue Travail), le front
//! (1) le retire immédiatement du set de Work puis (2) déclenche EN TÂCHE DE FOND cette
//! commande, qui **régénère l'état des lieux** du projet à partir des **faits git**.
//!
//! MVP (décisions Stéphane, SA-1..7) :
//!   - **faits git seuls** (branche, arbre propre/sale, N derniers commits) sous un
//!     **squelette de récit** (« Fait récemment » = commits, « À faire » = gabarit) —
//!     **PAS de LLM/Ollama** dans ce lot ;
//!   - **N = 5** commits (`N_COMMITS`) ;
//!   - **dossier hors git → ne PAS échouer** : on écrit un état des lieux « hors git »
//!     minimal, `ok:true` (SA-3) ;
//!   - **écrasement** de `specs/etat-des-lieux.md` (snapshot, SA-5) ;
//!   - **AUCUN** `git add/commit/push` ni réseau ni secret (SA-6).
//!
//! Sûreté FS : on **réutilise** `ai::validate_project_dir` (le `path` est un dossier
//! projet existant, absolu, issu du portfolio) et on durcit l'écriture via
//! `pathguard::safe_path` (jamais de remontée `..`) — patron `seed.rs`/`ai.rs`. La
//! commande est **async + `spawn_blocking`** (patron `voice.rs`) : le travail git+écriture
//! ne bloque pas le thread UI.

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::git;
use crate::pathguard;

/// Nombre de derniers commits captés dans « Fait récemment » (SA-2 : N = 5).
const N_COMMITS: usize = 5;

/// Chemin RELATIF (sous le dossier projet) de l'état des lieux régénéré.
const ETAT_REL: &str = "specs/etat-des-lieux.md";

/// Compte rendu de la préparation de reprise (miroir TS `ResumeReport`, snake_case).
///
/// De quoi afficher un statut honnête côté front et, plus tard, un lien vers le fichier.
#[derive(Serialize, Clone, Debug, PartialEq, Eq, Default)]
pub struct ResumeReport {
    /// Le job a abouti (état des lieux écrit) — vrai même hors git (SA-3).
    pub ok: bool,
    /// Chemin du dossier projet préparé.
    pub path: String,
    /// Le dossier est-il un dépôt git ?
    pub is_git: bool,
    /// Branche courante (None hors git / HEAD détachée sans nom).
    pub branch: Option<String>,
    /// Nombre de commits captés (0 hors git ou dépôt sans commit).
    pub commit_count: u32,
    /// Arbre de travail sale (modifications non committées) ? Faux hors git.
    pub dirty: bool,
    /// Chemin absolu du fichier écrit (`<path>/specs/etat-des-lieux.md`).
    pub wrote_path: String,
}

/// Faits git captés (logique PURE, testable sans écriture disque).
struct GitFacts {
    is_git: bool,
    branch: Option<String>,
    dirty: bool,
    /// Les N derniers commits, un par ligne, déjà mis en forme (`<date> · <sujet>`).
    commits: Vec<String>,
}

/// Capte les faits git d'un dossier via `git::capture` (cross-OS, binaire `git`,
/// lecture TOLÉRANTE : une erreur git = une absence, jamais un échec). AUCUNE commande
/// destructive (jamais add/commit/push/reset).
fn gather_git_facts(base: &Path) -> GitFacts {
    // Dépôt ? `rev-parse --is-inside-work-tree` == "true" (robuste aux dossiers nus).
    let is_git = git::capture(base, &["rev-parse", "--is-inside-work-tree"])
        .map(|s| s == "true")
        .unwrap_or(false);

    if !is_git {
        return GitFacts {
            is_git: false,
            branch: None,
            dirty: false,
            commits: Vec::new(),
        };
    }

    // Branche (HEAD détachée → "HEAD" ; None si vide).
    let branch =
        git::capture(base, &["rev-parse", "--abbrev-ref", "HEAD"]).filter(|s| !s.is_empty());

    // Arbre sale ? `status --porcelain` non vide.
    let dirty = git::capture(base, &["status", "--porcelain"])
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    // N derniers commits : `%cs` (date committer YYYY-MM-DD) + sujet.
    let log_arg = format!("-{N_COMMITS}");
    let commits = git::capture(base, &["log", &log_arg, "--format=%cs · %s"])
        .map(|s| {
            s.lines()
                .filter(|l| !l.trim().is_empty())
                .map(|l| l.to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    GitFacts {
        is_git: true,
        branch,
        dirty,
        commits,
    }
}

/// Nom lisible du projet (dernier segment du chemin), pour le titre du récit.
fn project_name(base: &Path) -> String {
    base.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| base.to_string_lossy().to_string())
}

/// Construit le squelette markdown de l'état des lieux à partir des faits (SA-1).
///
/// Titres « Fait récemment » (= N derniers commits) / « À faire » (= gabarit) ; le
/// narratif fin est laissé en gabarit (pas de LLM dans ce lot). Cas hors git (SA-3) :
/// section « hors git » minimale, jamais d'échec.
fn render_markdown(name: &str, facts: &GitFacts) -> String {
    let mut md = String::new();
    md.push_str(&format!("# État des lieux — {name}\n\n"));
    md.push_str(
        "> Snapshot de préparation de reprise (IakaCockpit L23) — faits git, régénéré au retrait de la Table.\n\n",
    );

    if !facts.is_git {
        // SA-3 : dossier non-dépôt → état des lieux « hors git » minimal, pas d'échec.
        md.push_str("| Champ | Valeur |\n|---|---|\n| Dépôt git | non (dossier hors git) |\n\n");
        md.push_str("## Fait récemment\n\n");
        md.push_str("- (dossier hors git : aucun historique de commits à capter)\n\n");
        md.push_str("## À faire\n\n");
        md.push_str("- (à compléter : prochaine étape à la reprise)\n");
        return md;
    }

    let branch = facts.branch.as_deref().unwrap_or("(inconnue)");
    let tree = if facts.dirty {
        "modifié (changements non committés)"
    } else {
        "propre"
    };
    md.push_str("| Champ | Valeur |\n|---|---|\n");
    md.push_str("| Dépôt git | oui |\n");
    md.push_str(&format!("| Branche | {branch} |\n"));
    md.push_str(&format!("| Arbre | {tree} |\n\n"));

    md.push_str("## Fait récemment\n\n");
    if facts.commits.is_empty() {
        md.push_str("- (dépôt sans commit pour l'instant)\n\n");
    } else {
        for c in &facts.commits {
            md.push_str(&format!("- {c}\n"));
        }
        md.push('\n');
    }

    md.push_str("## À faire\n\n");
    md.push_str("- (à compléter : ce qui reste, prochaine étape à la reprise)\n");
    md
}

/// Écrit `content` dans `<base>/specs/etat-des-lieux.md` (crée `specs/` si absent),
/// chemin durci par `pathguard` (jamais de remontée `..`). Renvoie le chemin écrit.
fn write_etat(base: &Path, content: &str) -> Result<PathBuf, String> {
    let full = pathguard::safe_path(base, Path::new(ETAT_REL)).map_err(|e| e.to_string())?;
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("création du dossier specs : {e}"))?;
    }
    std::fs::write(&full, content).map_err(|e| format!("écriture de l'état des lieux : {e}"))?;
    Ok(full)
}

/// Cœur PUR (testable avec un `tempdir`) : capte les faits git, écrit l'état des lieux
/// (écrase — SA-5) et renvoie le rapport. Ne fait AUCUN add/commit/push, aucun réseau.
fn prepare_resume_at(base: &Path) -> Result<ResumeReport, String> {
    let name = project_name(base);
    let facts = gather_git_facts(base);
    let md = render_markdown(&name, &facts);
    let wrote = write_etat(base, &md)?;

    Ok(ResumeReport {
        ok: true,
        path: base.to_string_lossy().to_string(),
        is_git: facts.is_git,
        branch: facts.branch,
        commit_count: facts.commits.len() as u32,
        dirty: facts.dirty,
        wrote_path: wrote.to_string_lossy().to_string(),
    })
}

/// Corps bloquant de la commande : valide le dossier projet (existant, absolu) puis
/// régénère l'état des lieux. Séparé de la commande async pour rester synchronement
/// testable et tourner sous `spawn_blocking`.
fn prepare_resume_blocking(path: &str) -> Result<ResumeReport, String> {
    let base = crate::ai::validate_project_dir(path)?;
    prepare_resume_at(&base)
}

// --- Commande Tauri (façade `prepareResume(path)` côté front) ---

/// Prépare la reprise d'un projet : régénère `specs/etat-des-lieux.md` à partir des
/// faits git (branche, arbre propre/sale, N derniers commits). **Async + `spawn_blocking`**
/// (le travail git+écriture ne bloque pas le thread UI, patron `voice.rs`). Non
/// destructif côté git (aucun add/commit/push), hors git → écrit un état des lieux
/// minimal sans échouer (SA-3).
#[tauri::command]
pub async fn prepare_resume(path: String) -> Result<ResumeReport, String> {
    tauri::async_runtime::spawn_blocking(move || prepare_resume_blocking(&path))
        .await
        .map_err(|e| format!("tâche de préparation de reprise interrompue : {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::process::Command;

    fn tmp_dir(name: &str) -> PathBuf {
        let mut d = std::env::temp_dir();
        d.push(format!(
            "iakacockpit_l23_{name}_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    /// Initialise un dépôt git réel avec `n` commits (config `-c user.*` neutre). Renvoie
    /// `false` si `git` est absent de l'environnement de test (le test se dégrade alors).
    fn init_repo_with_commits(dir: &Path, n: usize) -> bool {
        let inited = Command::new("git")
            .arg("-C")
            .arg(dir)
            .arg("init")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if !inited {
            return false;
        }
        for i in 0..n {
            fs::write(dir.join(format!("f{i}.txt")), format!("contenu {i}")).unwrap();
            let _ = Command::new("git")
                .arg("-C")
                .arg(dir)
                .args(["add", "-A"])
                .output();
            let _ = Command::new("git")
                .arg("-C")
                .arg(dir)
                .args([
                    "-c",
                    "user.email=t@t.local",
                    "-c",
                    "user.name=T",
                    "commit",
                    "-m",
                    &format!("feat: commit {i}"),
                ])
                .output();
        }
        true
    }

    #[test]
    fn hors_git_ecrit_un_etat_des_lieux_minimal_sans_echouer() {
        // SA-3 : dossier non-dépôt → ok:true, is_git:false, fichier écrit.
        let dir = tmp_dir("horsgit");
        let report = prepare_resume_at(&dir).unwrap();
        assert!(report.ok);
        assert!(!report.is_git);
        assert_eq!(report.commit_count, 0);
        assert!(!report.dirty);
        assert!(report.branch.is_none());
        let etat = dir.join(ETAT_REL);
        assert!(
            etat.is_file(),
            "l'état des lieux doit être écrit même hors git"
        );
        let content = fs::read_to_string(&etat).unwrap();
        assert!(content.contains("hors git"));
        assert!(content.contains("## Fait récemment"));
        assert!(content.contains("## À faire"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn cree_le_dossier_specs_absent() {
        // Le dossier `specs/` n'existe pas → doit être créé avant écriture.
        let dir = tmp_dir("nospecs");
        assert!(!dir.join("specs").exists());
        let report = prepare_resume_at(&dir).unwrap();
        assert!(dir.join("specs").is_dir());
        assert!(report.wrote_path.ends_with("etat-des-lieux.md"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn ecrase_un_etat_des_lieux_existant() {
        // SA-5 : snapshot → écrasement (pas d'append).
        let dir = tmp_dir("ecrase");
        fs::create_dir_all(dir.join("specs")).unwrap();
        fs::write(dir.join(ETAT_REL), "ANCIEN CONTENU À REMPLACER").unwrap();
        prepare_resume_at(&dir).unwrap();
        let content = fs::read_to_string(dir.join(ETAT_REL)).unwrap();
        assert!(!content.contains("ANCIEN CONTENU"));
        assert!(content.contains("# État des lieux"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn depot_git_reel_capte_branche_commits_et_reste_propre() {
        let dir = tmp_dir("gitreal");
        if !init_repo_with_commits(&dir, 3) {
            // `git` absent de l'env de test : on n'échoue pas (best-effort, patron seed.rs).
            let _ = fs::remove_dir_all(&dir);
            return;
        }
        let report = prepare_resume_at(&dir).unwrap();
        assert!(report.ok);
        assert!(report.is_git);
        assert_eq!(report.commit_count, 3, "3 commits captés");
        assert!(!report.dirty, "arbre propre juste après commit");
        assert!(report.branch.is_some());
        let content = fs::read_to_string(dir.join(ETAT_REL)).unwrap();
        assert!(content.contains("| Dépôt git | oui |"));
        assert!(content.contains("feat: commit 2"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn depot_git_plafonne_a_n_commits() {
        // SA-2 : N = 5. Un dépôt de 8 commits n'en capte que 5.
        let dir = tmp_dir("plafond");
        if !init_repo_with_commits(&dir, 8) {
            let _ = fs::remove_dir_all(&dir);
            return;
        }
        let report = prepare_resume_at(&dir).unwrap();
        assert_eq!(report.commit_count, N_COMMITS as u32);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn depot_sale_est_signale_dirty() {
        let dir = tmp_dir("sale");
        if !init_repo_with_commits(&dir, 1) {
            let _ = fs::remove_dir_all(&dir);
            return;
        }
        // Modification non committée → arbre sale.
        fs::write(dir.join("nouveau.txt"), "non suivi").unwrap();
        let report = prepare_resume_at(&dir).unwrap();
        assert!(report.dirty, "un fichier non suivi rend l'arbre sale");
        let content = fs::read_to_string(dir.join(ETAT_REL)).unwrap();
        assert!(content.contains("modifié"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn aucun_effet_git_destructif() {
        // Le HEAD (sha du dernier commit) doit être identique avant/après : aucun
        // add/commit/push/reset n'a touché l'historique (seul un fichier est écrit).
        let dir = tmp_dir("nondestr");
        if !init_repo_with_commits(&dir, 2) {
            let _ = fs::remove_dir_all(&dir);
            return;
        }
        let head_before = git::capture(&dir, &["rev-parse", "HEAD"]);
        let count_before = git::capture(&dir, &["rev-list", "--count", "HEAD"]);
        prepare_resume_at(&dir).unwrap();
        let head_after = git::capture(&dir, &["rev-parse", "HEAD"]);
        let count_after = git::capture(&dir, &["rev-list", "--count", "HEAD"]);
        assert_eq!(head_before, head_after, "HEAD inchangé (aucun commit auto)");
        assert_eq!(count_before, count_after, "nombre de commits inchangé");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn prepare_resume_blocking_rejette_un_dossier_inexistant() {
        // Validation (ai::validate_project_dir) : chemin inexistant → Err lisible.
        let res = prepare_resume_blocking("/chemin/inexistant/pour/le/test/l23");
        assert!(res.is_err());
    }

    #[test]
    fn render_markdown_hors_git_est_coherent() {
        let facts = GitFacts {
            is_git: false,
            branch: None,
            dirty: false,
            commits: Vec::new(),
        };
        let md = render_markdown("demo", &facts);
        assert!(md.contains("# État des lieux — demo"));
        assert!(md.contains("hors git"));
    }

    #[test]
    fn resume_report_default_est_inerte() {
        let r = ResumeReport::default();
        assert!(!r.ok);
        assert!(!r.is_git);
        assert_eq!(r.commit_count, 0);
    }
}
