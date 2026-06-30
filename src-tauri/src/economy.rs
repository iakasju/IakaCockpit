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
    let input = n("input_tokens") + n("cache_creation_input_tokens") + n("cache_read_input_tokens");
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

// ============================ Ventilation tokens/jour/projet (L21 D) ============================
//
// Pour la visu « travail passé » (scatter-timeline), on a besoin d'une série tokens PAR JOUR et
// PAR PROJET — pas seulement des totaux. Algo calqué sur `naonedge-dashboard/scan.js getTokenStats`
// (byDay) : par ligne, somme `input + output + cache_creation` **HORS `cache_read`** (écart ASSUMÉ
// vs `fold_line` ci-dessus qui inclut `cache_read` pour les TOTAUX — ici on applique la règle
// dashboard), clé jour = préfixe `YYYY-MM-DD` du `timestamp`. LECTURE SEULE, défensif.

/// Tokens d'UN jour pour un projet (miroir TS `DayTokens`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DayTokens {
    pub date: String,
    pub tokens: u64,
}

/// Série d'activité d'un projet (jours triés croissants) (miroir TS `ProjectActivity`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ProjectActivity {
    pub project: String,
    pub days: Vec<DayTokens>,
}

/// Accumulateur d'activité : projet → (jour → tokens).
type ActAcc = HashMap<String, HashMap<String, u64>>;

/// Extrait le préfixe `YYYY-MM-DD` d'un timestamp ISO (`2026-06-30T12:00:00Z` → `2026-06-30`).
/// Renvoie `None` si la forme n'est pas une date (défensif — pas de bulle non datable).
fn day_of(ts: &str) -> Option<String> {
    if ts.len() < 10 {
        return None;
    }
    let head = &ts[..10];
    let bytes = head.as_bytes();
    let ok = bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit);
    ok.then(|| head.to_string())
}

/// Intègre UNE ligne JSONL dans l'accumulateur d'activité (byDay, HORS `cache_read`).
/// PUR/testable. Ignore proprement tout record non pertinent ou non daté.
pub fn fold_activity_line(acc: &mut ActAcc, line: &str) {
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
    // Règle dashboard : input + output + cache_creation, **SANS cache_read**.
    let sum = n("input_tokens") + n("output_tokens") + n("cache_creation_input_tokens");
    if sum == 0 {
        return;
    }
    let project = match v.get("cwd").and_then(Value::as_str).and_then(project_of) {
        Some(p) => p,
        None => return,
    };
    let day = match v.get("timestamp").and_then(Value::as_str).and_then(day_of) {
        Some(d) => d,
        None => return,
    };
    *acc.entry(project).or_default().entry(day).or_insert(0) += sum;
}

/// Convertit l'accumulateur d'activité en liste : jours triés croissants, projets triés par
/// total tokens décroissant, borné à `top`.
pub fn finalize_activity(acc: ActAcc, top: usize) -> Vec<ProjectActivity> {
    let mut out: Vec<ProjectActivity> = acc
        .into_iter()
        .map(|(project, by_day)| {
            let mut days: Vec<DayTokens> = by_day
                .into_iter()
                .map(|(date, tokens)| DayTokens { date, tokens })
                .collect();
            days.sort_by(|a, b| a.date.cmp(&b.date));
            ProjectActivity { project, days }
        })
        .collect();
    out.sort_by_key(|p| std::cmp::Reverse(p.days.iter().map(|d| d.tokens).sum::<u64>()));
    out.truncate(top);
    out
}

/// Scanne un dossier `projects/` et agrège l'activité byDay/projet. Défensif.
pub fn scan_projects_activity(projects_dir: &Path, top: usize) -> Vec<ProjectActivity> {
    let mut acc: ActAcc = HashMap::new();
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
                    fold_activity_line(&mut acc, line);
                }
            }
        }
    }
    finalize_activity(acc, top)
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

/// Commande : ventilation tokens/jour/projet (top 12) pour la visu « travail passé » (L21 D).
/// Le scope (projets de la table) est appliqué CÔTÉ FRONT ; ici on renvoie tous les projets.
#[tauri::command]
pub fn portfolio_activity() -> Result<Vec<ProjectActivity>, String> {
    match claude_projects_dir() {
        Some(dir) => Ok(scan_projects_activity(&dir, 12)),
        None => Ok(Vec::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_of_prend_le_dernier_segment() {
        assert_eq!(
            project_of("/Users/x/work/iaka-demo"),
            Some("iaka-demo".into())
        );
        assert_eq!(project_of("/a/b/"), Some("b".into()));
        assert_eq!(project_of(""), None);
    }

    #[test]
    fn fold_line_somme_input_caches_et_output() {
        let mut acc = Acc::new();
        fold_line(
            &mut acc,
            r#"{"type":"assistant","cwd":"/w/iaka-demo","message":{"usage":{"input_tokens":100,"cache_read_input_tokens":50,"output_tokens":20}}}"#,
        );
        let e = &acc["iaka-demo"];
        assert_eq!(e.0, 150); // input + caches
        assert_eq!(e.1, 20); // output
        assert_eq!(e.2, 20); // coord (non-sidechain)
        assert_eq!(e.3, 0);
    }

    #[test]
    fn fold_line_separe_coordinateur_et_delegues() {
        let mut acc = Acc::new();
        fold_line(
            &mut acc,
            r#"{"type":"assistant","cwd":"/w/p","message":{"usage":{"input_tokens":10,"output_tokens":5}}}"#,
        );
        fold_line(
            &mut acc,
            r#"{"type":"assistant","isSidechain":true,"cwd":"/w/p","message":{"usage":{"input_tokens":8,"output_tokens":3}}}"#,
        );
        let e = &acc["p"];
        assert_eq!(e.2, 5); // coord
        assert_eq!(e.3, 3); // sub
    }

    #[test]
    fn fold_line_ignore_non_assistant_et_sans_usage() {
        let mut acc = Acc::new();
        fold_line(
            &mut acc,
            r#"{"type":"user","cwd":"/w/p","message":{"content":"x"}}"#,
        );
        fold_line(
            &mut acc,
            r#"{"type":"assistant","cwd":"/w/p","message":{"content":[]}}"#,
        );
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

    // ---------------- Ventilation tokens/jour/projet (L21 D) ----------------

    #[test]
    fn day_of_extrait_le_prefixe_date() {
        assert_eq!(day_of("2026-06-30T12:00:00Z"), Some("2026-06-30".into()));
        assert_eq!(day_of("2026-06-30"), Some("2026-06-30".into()));
        assert_eq!(day_of("pas-une-date"), None);
        assert_eq!(day_of("2026/06/30T.."), None);
        assert_eq!(day_of(""), None);
    }

    #[test]
    fn fold_activity_somme_input_output_cache_creation_hors_cache_read() {
        let mut acc = ActAcc::new();
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/iaka-demo","message":{"usage":{"input_tokens":100,"output_tokens":20,"cache_creation_input_tokens":30,"cache_read_input_tokens":9999}}}"#,
        );
        // 100 + 20 + 30 = 150 ; cache_read (9999) EXCLU.
        assert_eq!(acc["iaka-demo"]["2026-06-30"], 150);
    }

    #[test]
    fn fold_activity_bucket_par_jour() {
        let mut acc = ActAcc::new();
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-29T23:00:00Z","cwd":"/w/p","message":{"usage":{"input_tokens":10,"output_tokens":0}}}"#,
        );
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T01:00:00Z","cwd":"/w/p","message":{"usage":{"input_tokens":5,"output_tokens":0}}}"#,
        );
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T02:00:00Z","cwd":"/w/p","message":{"usage":{"input_tokens":7,"output_tokens":0}}}"#,
        );
        assert_eq!(acc["p"]["2026-06-29"], 10);
        assert_eq!(acc["p"]["2026-06-30"], 12); // 5 + 7 cumulés sur le jour
    }

    #[test]
    fn fold_activity_ignore_non_assistant_sans_usage_et_non_date() {
        let mut acc = ActAcc::new();
        fold_activity_line(
            &mut acc,
            r#"{"type":"user","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/p","message":{"content":"x"}}"#,
        );
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","cwd":"/w/p","message":{"usage":{"input_tokens":10}}}"#,
        ); // pas de timestamp
        fold_activity_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/p","message":{"usage":{"cache_read_input_tokens":500}}}"#,
        ); // que du cache_read -> sum 0
        fold_activity_line(&mut acc, "pas du json");
        assert!(acc.is_empty());
    }

    #[test]
    fn finalize_activity_jours_tries_projets_par_total_et_borne() {
        let mut acc = ActAcc::new();
        acc.entry("a".into())
            .or_default()
            .insert("2026-06-30".into(), 5);
        acc.entry("a".into())
            .or_default()
            .insert("2026-06-28".into(), 3);
        acc.entry("b".into())
            .or_default()
            .insert("2026-06-30".into(), 100);
        acc.entry("c".into())
            .or_default()
            .insert("2026-06-30".into(), 1);
        let v = finalize_activity(acc, 2);
        assert_eq!(v.len(), 2); // borné top 2
        assert_eq!(v[0].project, "b"); // 100 > total a (8) > c (1)
        assert_eq!(v[1].project, "a");
        // Jours triés croissants pour a.
        assert_eq!(
            v[1].days
                .iter()
                .map(|d| d.date.as_str())
                .collect::<Vec<_>>(),
            vec!["2026-06-28", "2026-06-30"]
        );
    }
}
