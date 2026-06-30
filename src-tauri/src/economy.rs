//! economy — agrégation CROSS-PROJET des tokens (L18 #5b, treemap de l'Étagère).
//!
//! Lit les transcripts JSONL de session (`~/.claude/projects/<escaped>/<sid>.jsonl`) et
//! somme les tokens (`message.usage`) PAR PROJET (clé = dernier segment du `cwd` de chaque
//! record). Sépare coordinateur (tours principaux) vs délégués (`isSidechain`). LECTURE
//! SEULE, défensif (une ligne invalide est ignorée, jamais de panique). Borné en sortie
//! (top N projets). Aucun secret, aucune écriture.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

/// Coût agrégé d'un projet (miroir TS `ProjectEconomy`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ProjectEconomy {
    pub project: String,
    pub input: u64,
    pub output: u64,
    /// Tokens de sortie des tours du coordinateur (non-sidechain).
    pub coord: u64,
    /// Tokens de sortie des tours de sous-agents délégués (sidechain).
    pub sub: u64,
}

/// Accumulateur par projet : (input, output, coord, sub).
type Acc = HashMap<String, (u64, u64, u64, u64)>;

/// Dernier segment d'un cwd = nom de projet (`/a/b/iaka-demo` → `iaka-demo`).
fn project_of(cwd: &str) -> Option<String> {
    cwd.trim_end_matches('/')
        .rsplit('/')
        .find(|s| !s.is_empty())
        .map(str::to_string)
}

/// Intègre UNE ligne JSONL (record assistant avec `message.usage`) dans l'accumulateur.
/// PUR/testable. Ignore proprement tout record non pertinent.
pub fn fold_line(acc: &mut Acc, line: &str) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }
    let v: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };
    if v.get("type").and_then(Value::as_str) != Some("assistant") {
        return;
    }
    let usage = match v.get("message").and_then(|m| m.get("usage")) {
        Some(u) => u,
        None => return,
    };
    let n = |k: &str| usage.get(k).and_then(Value::as_u64).unwrap_or(0);
    let input =
        n("input_tokens") + n("cache_creation_input_tokens") + n("cache_read_input_tokens");
    let output = n("output_tokens");
    if input == 0 && output == 0 {
        return;
    }
    let project = match v.get("cwd").and_then(Value::as_str).and_then(project_of) {
        Some(p) => p,
        None => return,
    };
    let sidechain = v
        .get("isSidechain")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let e = acc.entry(project).or_default();
    e.0 += input;
    e.1 += output;
    if sidechain {
        e.3 += output;
    } else {
        e.2 += output;
    }
}

/// Convertit l'accumulateur en liste triée (coût total desc), bornée à `top`.
pub fn finalize(acc: Acc, top: usize) -> Vec<ProjectEconomy> {
    let mut out: Vec<ProjectEconomy> = acc
        .into_iter()
        .map(|(project, (input, output, coord, sub))| ProjectEconomy {
            project,
            input,
            output,
            coord,
            sub,
        })
        .collect();
    out.sort_by_key(|p| std::cmp::Reverse(p.input + p.output));
    out.truncate(top);
    out
}

/// Scanne un dossier `projects/` (chaque sous-dossier = un cwd escapé, chaque `.jsonl` =
/// une session) et agrège. Défensif : un fichier/dir illisible est ignoré.
pub fn scan_projects_dir(projects_dir: &Path, top: usize) -> Vec<ProjectEconomy> {
    let mut acc: Acc = HashMap::new();
    let dirs = match std::fs::read_dir(projects_dir) {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    for sess_dir in dirs.flatten() {
        let files = match std::fs::read_dir(sess_dir.path()) {
            Ok(f) => f,
            Err(_) => continue,
        };
        for f in files.flatten() {
            let p = f.path();
            if p.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&p) {
                for line in content.lines() {
                    fold_line(&mut acc, line);
                }
            }
        }
    }
    finalize(acc, top)
}

/// Répertoire des transcripts Claude Code : `<home>/.claude/projects`.
fn claude_projects_dir() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE"))?;
    Some(Path::new(&home).join(".claude").join("projects"))
}

/// Commande : coût agrégé par projet (top 8) depuis les transcripts de session.
#[tauri::command]
pub fn portfolio_economy() -> Result<Vec<ProjectEconomy>, String> {
    match claude_projects_dir() {
        Some(dir) => Ok(scan_projects_dir(&dir, 8)),
        None => Ok(Vec::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_of_prend_le_dernier_segment() {
        assert_eq!(project_of("/Users/x/work/iaka-demo"), Some("iaka-demo".into()));
        assert_eq!(project_of("/a/b/"), Some("b".into()));
        assert_eq!(project_of(""), None);
    }

    #[test]
    fn fold_line_somme_input_caches_et_output() {
        let mut acc = Acc::new();
        fold_line(&mut acc, r#"{"type":"assistant","cwd":"/w/iaka-demo","message":{"usage":{"input_tokens":100,"cache_read_input_tokens":50,"output_tokens":20}}}"#);
        let e = &acc["iaka-demo"];
        assert_eq!(e.0, 150); // input + caches
        assert_eq!(e.1, 20); // output
        assert_eq!(e.2, 20); // coord (non-sidechain)
        assert_eq!(e.3, 0);
    }

    #[test]
    fn fold_line_separe_coordinateur_et_delegues() {
        let mut acc = Acc::new();
        fold_line(&mut acc, r#"{"type":"assistant","cwd":"/w/p","message":{"usage":{"input_tokens":10,"output_tokens":5}}}"#);
        fold_line(&mut acc, r#"{"type":"assistant","isSidechain":true,"cwd":"/w/p","message":{"usage":{"input_tokens":8,"output_tokens":3}}}"#);
        let e = &acc["p"];
        assert_eq!(e.2, 5); // coord
        assert_eq!(e.3, 3); // sub
    }

    #[test]
    fn fold_line_ignore_non_assistant_et_sans_usage() {
        let mut acc = Acc::new();
        fold_line(&mut acc, r#"{"type":"user","cwd":"/w/p","message":{"content":"x"}}"#);
        fold_line(&mut acc, r#"{"type":"assistant","cwd":"/w/p","message":{"content":[]}}"#);
        fold_line(&mut acc, "pas du json");
        assert!(acc.is_empty());
    }

    #[test]
    fn finalize_trie_par_cout_total_et_borne() {
        let mut acc = Acc::new();
        acc.insert("a".into(), (10, 5, 5, 0));
        acc.insert("b".into(), (100, 50, 50, 0));
        acc.insert("c".into(), (1, 1, 1, 0));
        let v = finalize(acc, 2);
        assert_eq!(v.len(), 2);
        assert_eq!(v[0].project, "b");
        assert_eq!(v[1].project, "a");
    }
}
