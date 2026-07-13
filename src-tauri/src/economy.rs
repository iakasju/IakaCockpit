//! economy — agrégation CROSS-PROJET des tokens (L18 #5b, treemap de l'Étagère).
//!
//! Lit les transcripts JSONL de session (`~/.claude/projects/<escaped>/<sid>.jsonl`) et
//! somme les tokens (`message.usage`) PAR PROJET (clé = dernier segment du `cwd` de chaque
//! record). Sépare coordinateur (tours principaux) vs délégués (`isSidechain`). LECTURE
//! SEULE, défensif (une ligne invalide est ignorée, jamais de panique). Borné en sortie
//! (top N projets). Aucun secret, aucune écriture.

use crate::paths;
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock, RwLock};

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

/// Segments non vides d'un chemin (coupe sur `/` ET `\` — gère les vieux transcripts Windows).
fn path_segments(path: &str) -> Vec<&str> {
    path.split(['/', '\\']).filter(|s| !s.is_empty()).collect()
}

/// Racine du chapeau (« hat root ») résolue UNE fois via le socle L0 `paths` (cross-OS,
/// `IAKAFRAME_ROOT`, zéro constante Windows). Chaîne mise en cache (stable sur la vie du process).
fn hat_root() -> &'static str {
    static R: OnceLock<String> = OnceLock::new();
    R.get_or_init(|| paths::resolve_hat_root().to_string_lossy().into_owned())
}

/// Le répertoire `<root>/<seg>` est-il un VRAI projet (dépôt git) ? Test FS `.git` (dossier OU
/// fichier — worktrees), **caché par segment** (une seule vérif FS par nom de projet, pas par
/// ligne). Défensif : inaccessible / verrou empoisonné → `false` (classé non-projet → `.folder`).
fn is_git_project(candidate: &Path) -> bool {
    let key = candidate
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    static CACHE: OnceLock<Mutex<HashMap<String, bool>>> = OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(mut c) = cache.lock() {
        if let Some(v) = c.get(&key) {
            return *v;
        }
        let v = candidate.join(".git").exists();
        c.insert(key, v);
        return v;
    }
    candidate.join(".git").exists()
}

/// Nom de projet d'un `cwd`, RELATIF à une racine chapeau + un prédicat « est-un-projet » (PUR,
/// testable sans FS). Règle (décision Stéphane) : le projet = le **répertoire directement sous le
/// chapeau** (`/work`).
///   - `cwd` sous la racine → premier segment `seg` sous `/work` :
///       * `<root>/seg` est un dépôt git → projet = `seg` (`IakaCockpit`, `iakagraph`…) ;
///       * sinon (dossier de travail Odin sans `.git`) → projet = **`.folder`** (bucket unique).
///   - `cwd` == racine exacte (`/work`) → dernier segment de la racine (`work`, portefeuille).
///   - `cwd` hors racine → dernier segment (comportement historique conservé).
///   - `cwd` vide → `None`.
fn project_of_with<F>(cwd: &str, root: &str, is_project: F) -> Option<String>
where
    F: Fn(&Path) -> bool,
{
    let cwd_segs = path_segments(cwd);
    if cwd_segs.is_empty() {
        return None;
    }
    let root_segs = path_segments(root);
    if !root_segs.is_empty() && cwd_segs.starts_with(&root_segs) {
        if cwd_segs.len() > root_segs.len() {
            // Sous la racine → premier segment sous /work, classé projet git vs `.folder`.
            let seg = cwd_segs[root_segs.len()];
            let candidate = Path::new(root).join(seg);
            return Some(if is_project(&candidate) {
                seg.to_string()
            } else {
                ".folder".to_string()
            });
        }
        // cwd == racine exacte → niveau portefeuille (le dossier /work lui-même).
        return root_segs.last().map(|&s| s.to_string());
    }
    // Hors racine → dernier segment (inchangé, aucune perte).
    cwd_segs.last().map(|&s| s.to_string())
}

/// Nom de projet d'un `cwd` (wrapper prod) : racine chapeau réelle (cachée) + `.git`-check caché.
fn project_of(cwd: &str) -> Option<String> {
    project_of_with(cwd, hat_root(), is_git_project)
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

/// Commande : coût agrégé par projet, dérivé de l'INDEX précalculé (perf). Renvoie TOUS les
/// projets (pas de troncature) ; le scope (projets de la table) est appliqué CÔTÉ FRONT.
#[tauri::command]
pub fn portfolio_economy() -> Result<Vec<ProjectEconomy>, String> {
    Ok(query_index(index_economy))
}

/// Commande : ventilation tokens/jour/projet pour la visu « travail passé » (L21 D), dérivée
/// de l'INDEX précalculé. **FIX V2** : plus de troncature top-12 (elle masquait l'évolution
/// d'un projet sélectionné hors du top) → TOUS les projets, l'évolution suit le scope comme
/// V1/V4. Le scope est appliqué CÔTÉ FRONT (`deriveAnalytics`).
#[tauri::command]
pub fn portfolio_activity() -> Result<Vec<ProjectActivity>, String> {
    Ok(query_index(|idx| index_activity(idx, usize::MAX)))
}

// ============================ Coût $ réel par période (L30-P2, volet B) ============================
//
// Le transcript ne porte pas de coût : il porte `message.model` + `message.usage` (4 buckets).
// On DÉRIVE le coût $ en multipliant chaque bucket par le prix du modèle (`pricing.rs`). On
// SÉPARE les 4 buckets (ne PAS réutiliser le mélange de `fold_line`, qui somme input+caches).
// Agrégation PAR PÉRIODE (bornes `from`/`to` ms epoch venant du sélecteur de plage), par modèle
// et par jour. Modèle sans tarif → coût NON compté + signalé (`untariffed`), jamais inventé.
// LECTURE SEULE, défensif.

use crate::pricing::{self, PricingSnapshot};

/// Coût agrégé d'un modèle sur la période (miroir TS `ModelCost`).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ModelCost {
    pub model: String,
    /// Total des 4 buckets de tokens attribués à ce modèle.
    pub tokens: u64,
    /// Coût $ (0.0 si `untariffed` — non compté dans `cost_total`).
    pub cost: f64,
    /// `true` = modèle absent de la table de prix → coût non tarifé (marqueur honnête).
    pub untariffed: bool,
}

/// Coût $ d'un jour (miroir TS `DayCost`) — tendance + cumul côté front.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct DayCost {
    pub date: String,
    pub cost: f64,
}

/// Coût $ PARENT par projet (miroir TS `ProjectCost`). Le transcript parent = le COORDINATEUR ;
/// exposer la conso par projet permet au front d'attribuer chaque projet à SON coordinateur
/// (Aragorn pour iakacockpit…) puis d'agréger par nom — sans fusionner Odin et Aragorn.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProjectCost {
    pub project: String,
    /// Total des 4 buckets de tokens du transcript parent de ce projet sur la période.
    pub tokens: u64,
    /// Coût $ tarifé de ce projet (0.0 si tous ses modèles sont untariffed).
    pub cost: f64,
    /// `true` = aucun modèle tarifé pour ce projet (coût non compté).
    pub untariffed: bool,
}

/// Coût $ réel agrégé sur une période (miroir TS `AnalyticsCost`).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AnalyticsCost {
    /// Somme des coûts TARIFÉS sur la période (les untariffed comptent 0).
    pub cost_total: f64,
    /// Coût par modèle (tri coût desc), avec marqueur `untariffed`.
    pub by_model: Vec<ModelCost>,
    /// Coût par jour (tri date asc) — pour tendance + cumulé.
    pub by_day: Vec<DayCost>,
    /// Noms des modèles rencontrés SANS tarif (coût non compté ; front les signale).
    pub untariffed_models: Vec<String>,
    /// Coût PARENT par projet (tri coût desc) — attribution du coordinateur PAR projet côté front.
    pub by_project: Vec<ProjectCost>,
    /// Date de la table de prix (`pricing.json`), ou `None` si table embarquée.
    pub priced_at: Option<String>,
}

/// Accumulateur de coût : par modèle (tokens, cost, untariffed) + par jour (cost) + par projet
/// (tokens, cost, `all_untariffed` — vrai tant qu'aucun modèle tarifé n'a été vu pour ce projet).
#[derive(Default)]
struct CostAcc {
    by_model: HashMap<String, (u64, f64, bool)>,
    by_day: HashMap<String, f64>,
    by_project: HashMap<String, (u64, f64, bool)>,
}

/// Convertit un timestamp ISO-8601 UTC (`2026-06-30T12:00:00Z`, avec ms optionnelles) en
/// millisecondes epoch. `None` si la forme n'est pas datable (défensif). Algorithme
/// `days_from_civil` (Howard Hinnant) — pas de dépendance `chrono`, hypothèse UTC (les
/// transcripts Claude/Codex écrivent en `Z`).
fn iso_to_epoch_ms(ts: &str) -> Option<i64> {
    let b = ts.as_bytes();
    if b.len() < 19 {
        return None;
    }
    if b[4] != b'-'
        || b[7] != b'-'
        || (b[10] != b'T' && b[10] != b' ')
        || b[13] != b':'
        || b[16] != b':'
    {
        return None;
    }
    let year: i64 = ts.get(0..4)?.parse().ok()?;
    let month: i64 = ts.get(5..7)?.parse().ok()?;
    let day: i64 = ts.get(8..10)?.parse().ok()?;
    let hour: i64 = ts.get(11..13)?.parse().ok()?;
    let min: i64 = ts.get(14..16)?.parse().ok()?;
    let sec: i64 = ts.get(17..19)?.parse().ok()?;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    let days = days_from_civil(year, month, day);
    let mut ms = (days * 86_400 + hour * 3_600 + min * 60 + sec) * 1_000;
    // Millisecondes optionnelles après un `.` (on garde jusqu'à 3 chiffres).
    if b.len() > 19 && b[19] == b'.' {
        let frac: String = ts[20..]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .take(3)
            .collect();
        if !frac.is_empty() {
            let padded = format!("{frac:0<3}");
            if let Ok(m) = padded.parse::<i64>() {
                ms += m;
            }
        }
    }
    Some(ms)
}

/// Jours depuis 1970-01-01 pour une date civile (UTC), algorithme de Howard Hinnant.
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = y - era * 400; // [0, 399]
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1; // [0, 365]
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era * 146_097 + doe - 719_468
}

/// Intègre UNE ligne JSONL dans l'accumulateur de coût, filtrée par période `[from, to]` et,
/// optionnellement, par projet. **Référence de scan direct** conservée pour la non-régression
/// (les commandes lisent désormais l'INDEX précalculé). PUR/testable.
#[cfg(test)]
fn fold_cost_line(
    acc: &mut CostAcc,
    line: &str,
    from: i64,
    to: i64,
    pricing: &PricingSnapshot,
    project: Option<&str>,
) {
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
    // Scope projet : le projet d'une ligne = dernier segment de son `cwd` (même clé que le
    // Périmètre). Hors du projet ciblé → ignorée (jamais de fausse donnée).
    if let Some(target) = project {
        if v.get("cwd")
            .and_then(Value::as_str)
            .and_then(project_of)
            .as_deref()
            != Some(target)
        {
            return;
        }
    }
    let message = match v.get("message") {
        Some(m) => m,
        None => return,
    };
    let usage = match message.get("usage") {
        Some(u) => u,
        None => return,
    };
    // Période : sans timestamp datable → on ne peut pas placer la ligne (ignorée).
    let ts = match v.get("timestamp").and_then(Value::as_str) {
        Some(t) => t,
        None => return,
    };
    let ms = match iso_to_epoch_ms(ts) {
        Some(ms) => ms,
        None => return,
    };
    if ms < from || ms > to {
        return;
    }
    let day = match day_of(ts) {
        Some(d) => d,
        None => return,
    };
    let n = |k: &str| usage.get(k).and_then(Value::as_u64).unwrap_or(0);
    let input = n("input_tokens");
    let output = n("output_tokens");
    let cache_write = n("cache_creation_input_tokens");
    let cache_read = n("cache_read_input_tokens");
    let tokens = input + output + cache_write + cache_read;
    if tokens == 0 {
        return;
    }
    // Modèle : `message.model` (le nom réel du tour). Absent → clé « unknown » untariffed.
    let model = message
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .to_string();

    let (cost, untariffed) = match pricing.price_for(&model) {
        Some(p) => (p.cost_of(input, output, cache_write, cache_read), false),
        None => (0.0, true),
    };

    let e = acc.by_model.entry(model).or_insert((0, 0.0, false));
    e.0 += tokens;
    e.1 += cost;
    e.2 |= untariffed;

    // Le jour ne cumule que le coût TARIFÉ (les untariffed ajoutent 0 — pas de faux coût).
    *acc.by_day.entry(day).or_insert(0.0) += cost;
}

/// Convertit l'accumulateur de coût en `AnalyticsCost` (par modèle tri coût desc, par jour tri
/// date asc, total = somme des coûts tarifés, liste des modèles sans tarif).
fn finalize_cost(acc: CostAcc, priced_at: Option<String>) -> AnalyticsCost {
    let mut by_model: Vec<ModelCost> = acc
        .by_model
        .into_iter()
        .map(|(model, (tokens, cost, untariffed))| ModelCost {
            model,
            tokens,
            cost,
            untariffed,
        })
        .collect();
    by_model.sort_by(|a, b| {
        b.cost
            .partial_cmp(&a.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.tokens.cmp(&a.tokens))
    });

    let mut untariffed_models: Vec<String> = by_model
        .iter()
        .filter(|m| m.untariffed)
        .map(|m| m.model.clone())
        .collect();
    untariffed_models.sort();
    untariffed_models.dedup();

    let cost_total: f64 = by_model.iter().map(|m| m.cost).sum();

    let mut by_day: Vec<DayCost> = acc
        .by_day
        .into_iter()
        .map(|(date, cost)| DayCost { date, cost })
        .collect();
    by_day.sort_by(|a, b| a.date.cmp(&b.date));

    // `all_untariffed` (3ᵉ champ) = vrai tant qu'aucun modèle tarifé n'a été vu → `untariffed`.
    let mut by_project: Vec<ProjectCost> = acc
        .by_project
        .into_iter()
        .map(|(project, (tokens, cost, all_untariffed))| ProjectCost {
            project,
            tokens,
            cost,
            untariffed: all_untariffed,
        })
        .collect();
    by_project.sort_by(|a, b| {
        b.cost
            .partial_cmp(&a.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.tokens.cmp(&a.tokens))
    });

    AnalyticsCost {
        cost_total,
        by_model,
        by_day,
        untariffed_models,
        by_project,
        priced_at,
    }
}

/// Commande : coût $ réel agrégé sur la période `[from, to]` (ms epoch, du sélecteur de plage),
/// dérivé de l'INDEX précalculé (somme des tokens par (projet,jour,modèle) → tarification à la
/// requête). `project = Some(p)` scope au projet du Périmètre ; `None`/absent = tout le
/// portefeuille. Table de prix = snapshot courant. Lecture seule ; instantané après build.
#[tauri::command]
pub fn analytics_cost(
    from: i64,
    to: i64,
    project: Option<String>,
) -> Result<AnalyticsCost, String> {
    let pricing = pricing::snapshot();
    let (fd, td) = (ymd_from_ms(from), ymd_from_ms(to));
    Ok(query_index(|idx| {
        index_cost(idx, &fd, &td, project.as_deref(), &pricing)
    }))
}

// ==================== Délégations réelles par agent (L30-P2, transcript) ====================
//
// Les tokens PAR AGENT NOMMÉ n'ont pas de source réelle (`isSidechain` toujours false → tokens
// des sous-agents hors transcript parent). Ce qui EST réel : les `tool_use "Agent"`/`"Task"`
// (avec `subagent_type` = nom d'agent) et leur `tool_result` apparié (durée = ts result − ts
// use). On agrège en COMPTES + DURÉES par agent (PAS de tokens/$, cf. constat). LECTURE SEULE.

/// Agrégat de délégations pour un agent nommé (miroir TS `AgentDelegations`).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AgentDelegations {
    pub agent: String,
    /// Nombre de délégations à cet agent dans la période.
    pub count: u64,
    /// Durée totale (ms) des délégations APPARIÉES (use → result).
    pub total_ms: i64,
    /// Durée moyenne (ms) sur les délégations appariées (0 si aucune appariée).
    pub avg_ms: i64,
}

/// Accumulateur de délégations : `tool_use_id` → (agent, ts_use_ms) et `tool_use_id` → ts_result_ms.
/// **Référence de scan direct** (non-régression) — la commande lit désormais l'INDEX.
#[cfg(test)]
#[derive(Default)]
struct DelegAcc {
    uses: HashMap<String, (String, i64)>,
    results: HashMap<String, i64>,
}

/// Intègre UNE ligne JSONL dans l'accumulateur de délégations. PUR/testable. **Référence de
/// scan direct** conservée pour la non-régression (la commande lit l'INDEX).
#[cfg(test)]
fn fold_deleg_line(acc: &mut DelegAcc, line: &str, project: Option<&str>) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }
    let v: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };
    let ty = match v.get("type").and_then(Value::as_str) {
        Some(t) => t,
        None => return,
    };
    // Scope projet (même clé que le Périmètre : dernier segment du cwd).
    if let Some(target) = project {
        if v.get("cwd")
            .and_then(Value::as_str)
            .and_then(project_of)
            .as_deref()
            != Some(target)
        {
            return;
        }
    }
    let ms = v
        .get("timestamp")
        .and_then(Value::as_str)
        .and_then(iso_to_epoch_ms);
    let blocks = match v.get("message").and_then(|m| m.get("content")) {
        Some(Value::Array(b)) => b,
        _ => return,
    };
    for blk in blocks {
        let bt = blk.get("type").and_then(Value::as_str).unwrap_or("");
        match (ty, bt) {
            ("assistant", "tool_use") => {
                let name = blk.get("name").and_then(Value::as_str).unwrap_or("");
                if !crate::transcript::is_delegation_tool(name) {
                    continue;
                }
                let id = match blk.get("id").and_then(Value::as_str) {
                    Some(i) => i.to_string(),
                    None => continue,
                };
                let agent = blk
                    .get("input")
                    .and_then(|i| i.get("subagent_type"))
                    .and_then(Value::as_str);
                if let (Some(agent), Some(ms)) = (agent, ms) {
                    acc.uses.insert(id, (agent.to_string(), ms));
                }
            }
            ("user", "tool_result") => {
                let id = blk.get("tool_use_id").and_then(Value::as_str);
                if let (Some(id), Some(ms)) = (id, ms) {
                    // Premier résultat gagne (le tool_result est unique par id).
                    acc.results.entry(id.to_string()).or_insert(ms);
                }
            }
            _ => {}
        }
    }
}

/// Convertit l'accumulateur en liste par agent (comptes + durées), filtrée par période sur le
/// ts de la DÉLÉGATION (use). **Référence de scan direct** (non-régression).
#[cfg(test)]
fn finalize_deleg(acc: DelegAcc, from: i64, to: i64) -> Vec<AgentDelegations> {
    // agent → (count, total_ms, paired_count)
    let mut by_agent: HashMap<String, (u64, i64, u64)> = HashMap::new();
    for (id, (agent, use_ms)) in &acc.uses {
        if *use_ms < from || *use_ms > to {
            continue;
        }
        let e = by_agent.entry(agent.clone()).or_insert((0, 0, 0));
        e.0 += 1;
        if let Some(res_ms) = acc.results.get(id) {
            let dur = res_ms - use_ms;
            if dur >= 0 {
                e.1 += dur;
                e.2 += 1;
            }
        }
    }
    let mut out: Vec<AgentDelegations> = by_agent
        .into_iter()
        .map(|(agent, (count, total_ms, paired))| AgentDelegations {
            agent,
            count,
            total_ms,
            avg_ms: if paired > 0 {
                total_ms / paired as i64
            } else {
                0
            },
        })
        .collect();
    out.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.agent.cmp(&b.agent)));
    out
}

/// Commande : délégations réelles par agent nommé sur la période `[from, to]` (ms epoch),
/// dérivée de l'INDEX précalculé. `project = Some(p)` scope au projet du Périmètre ; `None`/
/// absent = tout le portefeuille. Comptes + durées (use→result) uniquement. Instantané après build.
#[tauri::command]
pub fn delegations_by_agent(
    from: i64,
    to: i64,
    project: Option<String>,
) -> Result<Vec<AgentDelegations>, String> {
    let (fd, td) = (ymd_from_ms(from), ymd_from_ms(to));
    Ok(query_index(|idx| {
        index_deleg(idx, &fd, &td, project.as_deref())
    }))
}

// ==================== Attribution par agent RÉELLE (tokens + coût, L30-P3) ====================
//
// Source PROUVÉE (spike Aragorn, 50 délégations réelles) : dans le transcript PARENT, chaque
// `tool_use "Agent"`/`"Task"` a un `tool_result` dont le champ RACINE `toolUseResult` porte
// `resolvedModel` (modèle réel du sous-agent, ex. `claude-opus-4-8[1m]`) et `outputFile`
// (chemin absolu du transcript JSONL du sous-agent). En ouvrant `outputFile` et en sommant les
// 4 buckets `usage` de ses lignes, on obtient les tokens RÉELS de la délégation → coût =
// tokens × prix(normalize(resolvedModel)). `subagent_type` (nom d'agent) vient du tool_use
// apparié. `outputFile` disparu (tmp éphémère) → délégation `unavailable` (JAMAIS fabriquée).

/// Tokens + coût RÉELS attribués à un agent nommé (miroir TS `AgentTokens`).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AgentTokens {
    pub agent: String,
    /// Somme des 4 buckets `usage` des transcripts sous-agents attribués à cet agent.
    pub tokens: u64,
    /// Coût $ dérivé (prix du `resolvedModel` appliqué aux 4 buckets). 0 si modèle hors table.
    pub cost: f64,
    /// Nombre de délégations RÉELLEMENT attribuées (outputFile lu) pour cet agent.
    pub delegations: u64,
    /// Modèle représentatif (celui de la plus grosse délégation en tokens).
    pub model: String,
    /// Vrai si au moins une délégation a un modèle hors table de prix (coût non compté).
    pub untariffed: bool,
}

/// Attribution par agent sur la période (miroir TS `AgentAttribution`).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AgentAttribution {
    pub agents: Vec<AgentTokens>,
    /// Délégations DANS la période/scope non attribuables (outputFile absent/illisible).
    pub unavailable: u32,
    /// Date de la table de prix (`pricing.json`), ou `None` (embarquée).
    pub priced_at: Option<String>,
}

/// Accumulateur d'attribution : `tool_use_id` → (agent, ts_use_ms) côté use, et
/// `tool_use_id` → (resolvedModel, outputFile) côté result. **Référence de scan direct**
/// (non-régression) — la commande lit l'INDEX.
#[cfg(test)]
#[derive(Default)]
struct AttribAcc {
    uses: HashMap<String, (String, i64)>,
    results: HashMap<String, (String, String)>,
}

/// Intègre UNE ligne JSONL du transcript PARENT dans l'accumulateur d'attribution. **Référence
/// de scan direct** conservée pour la non-régression (la commande lit l'INDEX). PUR/testable.
#[cfg(test)]
fn fold_attrib_line(acc: &mut AttribAcc, line: &str, project: Option<&str>) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }
    let v: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };
    let ty = match v.get("type").and_then(Value::as_str) {
        Some(t) => t,
        None => return,
    };
    if let Some(target) = project {
        if v.get("cwd")
            .and_then(Value::as_str)
            .and_then(project_of)
            .as_deref()
            != Some(target)
        {
            return;
        }
    }
    let ms = v
        .get("timestamp")
        .and_then(Value::as_str)
        .and_then(iso_to_epoch_ms);
    // Le `toolUseResult` (racine du record) porte resolvedModel/outputFile de CETTE délégation.
    let tur = v.get("toolUseResult");
    let blocks = match v.get("message").and_then(|m| m.get("content")) {
        Some(Value::Array(b)) => b,
        _ => return,
    };
    for blk in blocks {
        let bt = blk.get("type").and_then(Value::as_str).unwrap_or("");
        match (ty, bt) {
            ("assistant", "tool_use") => {
                let name = blk.get("name").and_then(Value::as_str).unwrap_or("");
                if !crate::transcript::is_delegation_tool(name) {
                    continue;
                }
                let id = match blk.get("id").and_then(Value::as_str) {
                    Some(i) => i.to_string(),
                    None => continue,
                };
                let agent = blk
                    .get("input")
                    .and_then(|i| i.get("subagent_type"))
                    .and_then(Value::as_str);
                if let (Some(agent), Some(ms)) = (agent, ms) {
                    acc.uses.insert(id, (agent.to_string(), ms));
                }
            }
            ("user", "tool_result") => {
                let id = match blk.get("tool_use_id").and_then(Value::as_str) {
                    Some(i) => i.to_string(),
                    None => continue,
                };
                // resolvedModel + outputFile vivent dans le `toolUseResult` racine du record.
                let (Some(tur), true) = (tur, !acc.results.contains_key(&id)) else {
                    continue;
                };
                let model = tur
                    .get("resolvedModel")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                let output = tur
                    .get("outputFile")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                acc.results.insert(id, (model, output));
            }
            _ => {}
        }
    }
}

/// Somme les 4 buckets `usage` sur les lignes JSONL d'un transcript sous-agent. Défensif : une
/// ligne sans `usage` (à la racine OU sous `message`) est ignorée. PUR/testable.
fn sum_usage_jsonl(content: &str) -> (u64, u64, u64, u64) {
    let (mut i, mut o, mut cw, mut cr) = (0u64, 0u64, 0u64, 0u64);
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        // `message.usage` (record assistant) OU `usage` à la racine (variante).
        let usage = v
            .get("message")
            .and_then(|m| m.get("usage"))
            .or_else(|| v.get("usage"));
        let usage = match usage {
            Some(u) => u,
            None => continue,
        };
        let n = |k: &str| usage.get(k).and_then(Value::as_u64).unwrap_or(0);
        i += n("input_tokens");
        o += n("output_tokens");
        cw += n("cache_creation_input_tokens");
        cr += n("cache_read_input_tokens");
    }
    (i, o, cw, cr)
}

/// Lit un `outputFile` et somme ses 4 buckets `usage`. `None` si le fichier est illisible
/// (tmp éphémère disparu) → la délégation sera comptée `unavailable`, JAMAIS fabriquée.
fn read_output_usage(path: &str) -> Option<(u64, u64, u64, u64)> {
    if path.trim().is_empty() {
        return None;
    }
    let content = std::fs::read_to_string(path).ok()?;
    Some(sum_usage_jsonl(&content))
}

/// Finalise l'attribution : pour chaque délégation DANS la période, lit son `outputFile` via
/// `reader` (injectable pour les tests), somme les tokens, tarife via `pricing`. **Référence de
/// scan direct** conservée pour la non-régression (la commande lit l'INDEX).
#[cfg(test)]
fn finalize_attrib<F>(
    acc: AttribAcc,
    from: i64,
    to: i64,
    pricing: &PricingSnapshot,
    reader: F,
) -> AgentAttribution
where
    F: Fn(&str) -> Option<(u64, u64, u64, u64)>,
{
    // agent → (tokens, cost, delegations, dominant_model, dominant_tokens, untariffed)
    let mut by_agent: HashMap<String, (u64, f64, u64, String, u64, bool)> = HashMap::new();
    let mut unavailable: u32 = 0;

    for (id, (agent, use_ms)) in &acc.uses {
        if *use_ms < from || *use_ms > to {
            continue;
        }
        let (model, output) = match acc.results.get(id) {
            Some(r) => r,
            None => {
                // Délégation sans tool_result (donc sans outputFile) → non attribuable.
                unavailable += 1;
                continue;
            }
        };
        let (i, o, cw, cr) = match reader(output) {
            Some(sums) => sums,
            None => {
                unavailable += 1;
                continue;
            }
        };
        let tokens = i + o + cw + cr;
        let (cost, untariffed) = match pricing.price_for(model) {
            Some(p) => (p.cost_of(i, o, cw, cr), false),
            None => (0.0, true),
        };
        let e = by_agent
            .entry(agent.clone())
            .or_insert((0, 0.0, 0, String::new(), 0, false));
        e.0 += tokens;
        e.1 += cost;
        e.2 += 1;
        if tokens >= e.4 {
            e.4 = tokens;
            e.3 = model.clone();
        }
        e.5 |= untariffed;
    }

    let mut agents: Vec<AgentTokens> = by_agent
        .into_iter()
        .map(
            |(agent, (tokens, cost, delegations, model, _dom, untariffed))| AgentTokens {
                agent,
                tokens,
                cost,
                delegations,
                model,
                untariffed,
            },
        )
        .collect();
    agents.sort_by(|a, b| b.tokens.cmp(&a.tokens).then_with(|| a.agent.cmp(&b.agent)));

    AgentAttribution {
        agents,
        unavailable,
        priced_at: pricing.priced_at.clone(),
    }
}

/// Commande : attribution par agent RÉELLE (tokens + coût) sur la période `[from, to]` (ms
/// epoch), scopée par projet (`project`), dérivée de la PHASE 2 de l'index (lecture des
/// `outputFile`). **Non bloquante** : si la phase 2 n'est pas prête, déclenche son build EN FOND
/// et renvoie du vide (le front affiche « calcul en cours » via `analytics_index_status` et
/// re-fetche). `unavailable` = délégations dont l'`outputFile` a expiré (jamais de token fabriqué).
#[tauri::command]
pub fn agent_attribution(
    from: i64,
    to: i64,
    project: Option<String>,
) -> Result<AgentAttribution, String> {
    let pricing = pricing::snapshot();
    // Phase 2 pas prête → NE PAS bloquer : build en fond + vide (le front polle le statut).
    let ready = index_cache()
        .read()
        .map(|g| g.attrib_built)
        .unwrap_or(false);
    if !ready {
        trigger_phase2_async();
        return Ok(AgentAttribution {
            agents: Vec::new(),
            unavailable: 0,
            priced_at: pricing.priced_at.clone(),
        });
    }
    let (fd, td) = (ymd_from_ms(from), ymd_from_ms(to));
    Ok(query_index(|idx| {
        index_attrib(idx, &fd, &td, project.as_deref(), &pricing)
    }))
}

/// État de construction de l'index (miroir TS `IndexStatus`). Le front affiche « construction… »
/// tant que `tokens_ready` est faux, et « calcul par agent en cours… » tant que `attrib_ready`
/// est faux, puis re-fetche.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct IndexStatus {
    pub tokens_ready: bool,
    pub attrib_ready: bool,
}

/// Commande : état de construction de l'index (phase 1 / phase 2). Lecture non bloquante.
#[tauri::command]
pub fn analytics_index_status() -> Result<IndexStatus, String> {
    let (tokens_ready, attrib_ready) = match index_cache().read() {
        Ok(g) => (g.tokens_built, g.attrib_built),
        Err(p) => {
            let g = p.into_inner();
            (g.tokens_built, g.attrib_built)
        }
    };
    Ok(IndexStatus {
        tokens_ready,
        attrib_ready,
    })
}

/// Commande : reconstruit l'index d'agrégats à la demande (bouton « Actualiser » Analytics).
/// Phase 1 puis phase 2. Best-effort.
#[tauri::command]
pub fn analytics_refresh() -> Result<(), String> {
    build_index();
    Ok(())
}

// ==================== Index d'agrégats précalculé (PERF) ====================
//
// PERF : sans index, CHAQUE changement de plage/projet re-scanne TOUS les transcripts (millions
// de lignes) + relit les `outputFile` → LENT. L'index agrège TOUT en UNE passe (calque du cache
// `pricing` : process-global `RwLock`), puis chaque commande SOMME en mémoire → instantané.
//
// On stocke des TOKENS (+ modèle), JAMAIS le coût $ : le coût se calcule À LA REQUÊTE (tokens ×
// prix via `pricing::snapshot()`), pour qu'un refresh de prix ne force pas un re-scan. La clé
// temporelle est le JOUR `YYYY-MM-DD` (granularité jour ASSUMÉE pour l'agrégat — les presets de
// plage sont journaliers). Incrémental par mtime = DIFFÉRÉ (rebuild complet au démarrage / refresh).

/// 4 buckets de tokens (input, output, cache_creation, cache_read).
type Buckets = (u64, u64, u64, u64);

/// Clé de l'agrégat d'attribution : (project, date, agent, model normalisé).
type AttribKey = (String, String, String, String);
/// Valeur de l'agrégat d'attribution : 4 buckets de tokens + nombre de délégations attribuées.
type AttribVal = (u64, u64, u64, u64, u64);

fn add_buckets(dst: &mut Buckets, src: Buckets) {
    dst.0 += src.0;
    dst.1 += src.1;
    dst.2 += src.2;
    dst.3 += src.3;
}

/// Une délégation en attente de résolution (phase 2) : tout est connu SAUF les tokens du
/// sous-agent, qui nécessitent la lecture (lente) de `output`. Collectée en phase 1 (parsing pur).
#[derive(Clone)]
struct PendingDeleg {
    project: String,
    day: String,
    agent: String,
    /// `resolvedModel` du sous-agent (vide si pas de tool_result apparié).
    model: String,
    /// Chemin de l'`outputFile` (vide si pas de résultat → non attribuable en phase 2).
    output: String,
}

/// Index d'agrégats précalculé, construit en DEUX PHASES pour un Périmètre instantané.
/// Phase 1 (rapide, parsing pur) remplit `tokens` + `deleg` (comptes/durées) + `pending` — elle
/// sert `portfolio_economy`/`portfolio_activity`/`analytics_cost`/`delegations_by_agent`. Phase 2
/// (lente, I/O `outputFile`) remplit `attrib` + `unavailable` — elle sert `agent_attribution`.
/// Tokens seulement (le coût se dérive à la requête via `pricing`).
#[derive(Default, Clone)]
pub struct AggIndex {
    /// Phase 1 prête : `tokens`/`deleg`/`pending` remplis (Périmètre/coût/délégations servables).
    tokens_built: bool,
    /// Phase 2 prête : `attrib`/`unavailable` remplis (attribution par agent servable).
    attrib_built: bool,
    /// Horodatage (ms epoch) du dernier build — freshness (incrémental différé).
    #[allow(dead_code)]
    built_at: Option<i64>,
    /// (project, date, model, sidechain) → buckets. Sert cost / activity / economy. (Phase 1.)
    tokens: HashMap<(String, String, String, bool), Buckets>,
    /// (project, date, agent) → (count, total_ms appariés, paired). Délégations. (Phase 1.)
    deleg: HashMap<(String, String, String), (u64, i64, u64)>,
    /// Délégations à attribuer en phase 2 (lecture des `outputFile`). (Rempli en phase 1.)
    pending: Vec<PendingDeleg>,
    /// (project, date, agent, model normalisé) → (i, o, cw, cr, count attribué). (Phase 2.)
    attrib: HashMap<AttribKey, AttribVal>,
    /// (project, date) → nb de délégations non attribuables (outputFile manquant). (Phase 2.)
    unavailable: HashMap<(String, String), u32>,
}

/// Convertit un ms epoch (UTC) en date `YYYY-MM-DD` (algorithme `civil_from_days` de Howard
/// Hinnant, symétrique de `days_from_civil`, sans `chrono`). Clamp défensif des bornes ouvertes
/// (`i64::MAX`/`MIN`) → dates extrêmes qui bornent correctement les comparaisons lexicales.
fn ymd_from_ms(ms: i64) -> String {
    let days = ms.div_euclid(86_400_000).clamp(-100_000_000, 100_000_000);
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = y + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Un projet est-il dans le scope ? `None` = tout le portefeuille.
fn in_scope(project: &str, target: Option<&str>) -> bool {
    match target {
        Some(t) => project == t,
        None => true,
    }
}

/// PHASE 1 (rapide, PARSING PUR — AUCUNE lecture d'`outputFile`) : parse le contenu d'UN transcript
/// parent en un FRAGMENT `tokens` + `deleg` (comptes/durées) + `pending` (délégations à attribuer en
/// phase 2). Une passe, chaque ligne parsée une fois. Fragment = contribution de CE fichier (cache
/// incrémental par mtime). Défensif partout.
fn parse_file_frag(content: &str) -> FileFrag {
    let mut frag = FileFrag::default();
    // Appariement délégation intra-fichier (use↔result par tool_use_id — même parent).
    let mut uses: HashMap<String, (String, i64, String, String)> = HashMap::new();
    let mut results: HashMap<String, (i64, String, String)> = HashMap::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let ty = v.get("type").and_then(Value::as_str).unwrap_or("");
        let project = v.get("cwd").and_then(Value::as_str).and_then(project_of);
        let ms = v
            .get("timestamp")
            .and_then(Value::as_str)
            .and_then(iso_to_epoch_ms);
        let day = v.get("timestamp").and_then(Value::as_str).and_then(day_of);

        // (a) Tokens (record assistant avec usage) → agrégat tokens (project, date, model, sidechain).
        if ty == "assistant" {
            if let (Some(usage), Some(project), Some(day)) = (
                v.get("message").and_then(|m| m.get("usage")),
                project.clone(),
                day.clone(),
            ) {
                let n = |k: &str| usage.get(k).and_then(Value::as_u64).unwrap_or(0);
                let b: Buckets = (
                    n("input_tokens"),
                    n("output_tokens"),
                    n("cache_creation_input_tokens"),
                    n("cache_read_input_tokens"),
                );
                if b.0 != 0 || b.1 != 0 || b.2 != 0 || b.3 != 0 {
                    let model = v
                        .get("message")
                        .and_then(|m| m.get("model"))
                        .and_then(Value::as_str)
                        .unwrap_or("unknown")
                        .to_string();
                    let sidechain = v
                        .get("isSidechain")
                        .and_then(Value::as_bool)
                        .unwrap_or(false);
                    add_buckets(
                        frag.tokens
                            .entry((project, day, model, sidechain))
                            .or_default(),
                        b,
                    );
                }
            }
        }

        // (b) Délégations : collecte use (assistant) / result (user) par tool_use_id.
        let blocks = match v.get("message").and_then(|m| m.get("content")) {
            Some(Value::Array(b)) => b,
            _ => continue,
        };
        let tur = v.get("toolUseResult");
        for blk in blocks {
            let bt = blk.get("type").and_then(Value::as_str).unwrap_or("");
            match (ty, bt) {
                ("assistant", "tool_use") => {
                    let name = blk.get("name").and_then(Value::as_str).unwrap_or("");
                    if !crate::transcript::is_delegation_tool(name) {
                        continue;
                    }
                    let id = match blk.get("id").and_then(Value::as_str) {
                        Some(i) => i.to_string(),
                        None => continue,
                    };
                    let agent = blk
                        .get("input")
                        .and_then(|i| i.get("subagent_type"))
                        .and_then(Value::as_str);
                    if let (Some(agent), Some(ms), Some(project), Some(day)) =
                        (agent, ms, project.clone(), day.clone())
                    {
                        uses.insert(id, (agent.to_string(), ms, project, day));
                    }
                }
                ("user", "tool_result") => {
                    let id = match blk.get("tool_use_id").and_then(Value::as_str) {
                        Some(i) => i.to_string(),
                        None => continue,
                    };
                    if results.contains_key(&id) {
                        continue;
                    }
                    let (model, output) = match tur {
                        Some(t) => (
                            t.get("resolvedModel")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string(),
                            t.get("outputFile")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string(),
                        ),
                        None => (String::new(), String::new()),
                    };
                    if let Some(ms) = ms {
                        results.insert(id, (ms, model, output));
                    }
                }
                _ => {}
            }
        }
    }

    // Délégations du fichier : durée (appariée, SANS I/O) en phase 1 ; l'attribution (lecture
    // d'`outputFile`) est DIFFÉRÉE en phase 2 → on empile une entrée `pending` par délégation.
    for (id, (agent, use_ms, project, day)) in uses {
        let e = frag
            .deleg
            .entry((project.clone(), day.clone(), agent.clone()))
            .or_insert((0, 0, 0));
        e.0 += 1;
        // `model`/`output` du résultat apparié (vides si pas de tool_result → non attribuable P2).
        let (model, output) = match results.get(&id) {
            Some((res_ms, model, output)) => {
                let dur = res_ms - use_ms;
                if dur >= 0 {
                    e.1 += dur;
                    e.2 += 1;
                }
                (model.clone(), output.clone())
            }
            None => (String::new(), String::new()),
        };
        frag.pending.push(PendingDeleg {
            project,
            day,
            agent,
            model,
            output,
        });
    }
    frag
}

/// Fragment par fichier transcript : contribution de CE fichier aux agrégats phase 1. Base du cache
/// incrémental (merge des fragments = index global ; réutilisé tant que mtime/size inchangés).
#[derive(Clone, Default)]
struct FileFrag {
    tokens: HashMap<(String, String, String, bool), Buckets>,
    deleg: HashMap<(String, String, String), (u64, i64, u64)>,
    pending: Vec<PendingDeleg>,
}

/// Contribution phase-2 RÉSOLUE d'un fichier (attribution + non-attribuables), cachée tant que le
/// fichier ne change pas → seuls les fichiers modifiés relisent leurs `outputFile`.
#[derive(Clone, Default)]
struct AttribFrag {
    attrib: HashMap<AttribKey, AttribVal>,
    unavailable: HashMap<(String, String), u32>,
}

/// Entrée du cache par fichier : empreinte (mtime/size) + fragment phase 1 + phase 2 résolue (option).
struct CachedFile {
    /// `None` si `stat` a échoué (fichier traité comme CHANGÉ à chaque build → défensif).
    mtime: Option<std::time::SystemTime>,
    size: u64,
    frag: FileFrag,
    /// Phase 2 résolue ; `None` = à (re)résoudre (fichier nouveau/modifié).
    attrib: Option<AttribFrag>,
}

type FileCacheMap = HashMap<std::path::PathBuf, CachedFile>;

/// Fusionne un fragment phase 1 dans l'index global (sommes commutatives → merge = parse complet).
fn merge_phase1_frag(idx: &mut AggIndex, frag: &FileFrag) {
    for (k, v) in &frag.tokens {
        add_buckets(idx.tokens.entry(k.clone()).or_default(), *v);
    }
    for (k, v) in &frag.deleg {
        let e = idx.deleg.entry(k.clone()).or_insert((0, 0, 0));
        e.0 += v.0;
        e.1 += v.1;
        e.2 += v.2;
    }
    idx.pending.extend(frag.pending.iter().cloned());
}

/// Intègre le contenu d'UN transcript dans l'index (parse + merge). Wrapper conservé pour les tests
/// (non-régression) ; la prod passe par le cache incrémental.
#[cfg(test)]
fn index_file_phase1(idx: &mut AggIndex, content: &str) {
    merge_phase1_frag(idx, &parse_file_frag(content));
}

/// PHASE 2 (lente, I/O) : résout les `pending` en lisant chaque `outputFile` UNE fois via `reader`
/// → `attrib` (tokens sommés + modèle normalisé) et `unavailable` (outputFile absent/illisible).
/// PUR (l'I/O disque est dans `reader`) — testable sans disque.
fn resolve_pending<F>(
    pending: &[PendingDeleg],
    reader: &F,
) -> (
    HashMap<AttribKey, AttribVal>,
    HashMap<(String, String), u32>,
)
where
    F: Fn(&str) -> Option<Buckets>,
{
    let mut attrib: HashMap<AttribKey, AttribVal> = HashMap::new();
    let mut unavailable: HashMap<(String, String), u32> = HashMap::new();
    for p in pending {
        match reader(&p.output) {
            Some(b) => {
                let key = (
                    p.project.clone(),
                    p.day.clone(),
                    p.agent.clone(),
                    pricing::normalize_model(&p.model),
                );
                let a = attrib.entry(key).or_insert((0, 0, 0, 0, 0));
                a.0 += b.0;
                a.1 += b.1;
                a.2 += b.2;
                a.3 += b.3;
                a.4 += 1;
            }
            None => {
                *unavailable
                    .entry((p.project.clone(), p.day.clone()))
                    .or_insert(0) += 1;
            }
        }
    }
    (attrib, unavailable)
}

/// PHASE 1 depuis un dossier `projects/` (parsing pur, AUCUN `outputFile` lu). Défensif.
/// Cache process-global de l'index (init paresseuse sur un index vide non construit).
fn index_cache() -> &'static RwLock<AggIndex> {
    static C: OnceLock<RwLock<AggIndex>> = OnceLock::new();
    C.get_or_init(|| RwLock::new(AggIndex::default()))
}

/// Cache par FICHIER transcript (empreinte mtime/size + fragments). Base de l'incrémental : au
/// rebuild, seuls les fichiers nouveaux/modifiés sont re-parsés ; les inchangés réutilisent leur
/// fragment ; les disparus sont retirés.
fn file_cache() -> &'static RwLock<FileCacheMap> {
    static C: OnceLock<RwLock<FileCacheMap>> = OnceLock::new();
    C.get_or_init(|| RwLock::new(FileCacheMap::new()))
}

/// Garde anti-double-spawn de la phase 2 (déclenchée à la demande par `agent_attribution`).
static PHASE2_RUNNING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// INCRÉMENTAL — met à jour le cache par fichier : re-parse (via `read`) UNIQUEMENT les fichiers
/// nouveaux/modifiés (mtime OU size différent), réutilise le fragment des inchangés, retire les
/// disparus. Re-parser un fichier INVALIDE sa phase 2 (`attrib = None`). Défensif : `stat` échoué
/// (`mtime = None`) ⇒ traité comme changé ; lecture échouée ⇒ fragment vide. Retourne le nb de
/// fichiers RE-PARSÉS (0 = tout réutilisé). PUR (l'I/O est dans `read`). `files` = (path, mtime, size).
fn rebuild_frags<R>(
    cache: &mut FileCacheMap,
    files: &[(PathBuf, Option<std::time::SystemTime>, u64)],
    read: R,
) -> usize
where
    R: Fn(&Path) -> Option<String>,
{
    let mut present: HashSet<PathBuf> = HashSet::new();
    let mut parsed = 0usize;
    for (path, mtime, size) in files {
        present.insert(path.clone());
        // Réutilisable seulement si empreinte connue ET identique (mtime datable + size égale).
        let reuse = matches!(
            cache.get(path),
            Some(c) if c.mtime.is_some() && c.mtime == *mtime && c.size == *size
        );
        if reuse {
            continue;
        }
        let frag = read(path).map(|c| parse_file_frag(&c)).unwrap_or_default();
        cache.insert(
            path.clone(),
            CachedFile {
                mtime: *mtime,
                size: *size,
                frag,
                attrib: None, // phase 2 à (re)résoudre pour ce fichier
            },
        );
        parsed += 1;
    }
    cache.retain(|k, _| present.contains(k));
    parsed
}

/// Index PHASE 1 = merge des fragments du cache (résultat identique à un parse complet).
fn merge_phase1(cache: &FileCacheMap) -> AggIndex {
    let mut idx = AggIndex::default();
    for c in cache.values() {
        merge_phase1_frag(&mut idx, &c.frag);
    }
    idx.tokens_built = true;
    idx
}

/// PHASE 2 INCRÉMENTALE — résout (lecture des `outputFile`) SEULEMENT les fragments non encore
/// résolus (fichiers nouveaux/modifiés), réutilise l'attrib cachée des autres, puis merge le tout.
fn resolve_and_merge_phase2<F>(
    cache: &mut FileCacheMap,
    reader: &F,
) -> (
    HashMap<AttribKey, AttribVal>,
    HashMap<(String, String), u32>,
)
where
    F: Fn(&str) -> Option<Buckets>,
{
    for c in cache.values_mut() {
        if c.attrib.is_none() {
            let (attrib, unavailable) = resolve_pending(&c.frag.pending, reader);
            c.attrib = Some(AttribFrag {
                attrib,
                unavailable,
            });
        }
    }
    let mut attrib: HashMap<AttribKey, AttribVal> = HashMap::new();
    let mut unavailable: HashMap<(String, String), u32> = HashMap::new();
    for c in cache.values() {
        if let Some(af) = &c.attrib {
            for (k, v) in &af.attrib {
                let e = attrib.entry(k.clone()).or_insert((0, 0, 0, 0, 0));
                e.0 += v.0;
                e.1 += v.1;
                e.2 += v.2;
                e.3 += v.3;
                e.4 += v.4;
            }
            for (k, v) in &af.unavailable {
                *unavailable.entry(k.clone()).or_insert(0) += v;
            }
        }
    }
    (attrib, unavailable)
}

/// Liste les transcripts `.jsonl` d'un dossier `projects/` + leur empreinte (mtime/size) — SANS
/// lire le contenu (la lecture est différée aux seuls fichiers modifiés). Défensif.
fn collect_transcript_stats(
    projects_dir: &Path,
) -> Vec<(PathBuf, Option<std::time::SystemTime>, u64)> {
    let mut out = Vec::new();
    if let Ok(dirs) = std::fs::read_dir(projects_dir) {
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
                let meta = std::fs::metadata(&p).ok();
                let mtime = meta.as_ref().and_then(|m| m.modified().ok());
                let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                out.push((p, mtime, size));
            }
        }
    }
    out
}

fn now_ms() -> Option<i64> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_millis() as i64)
}

/// PHASE 1 : (re)construit tokens/deleg/pending INCRÉMENTALEMENT (cache par fichier) et l'installe.
/// RAPIDE au démarrage récurrent (seuls les fichiers modifiés sont relus/parsés). Non paniquant.
pub fn build_phase1() {
    let idx = match claude_projects_dir() {
        Some(dir) => {
            let files = collect_transcript_stats(&dir);
            let mut cache = match file_cache().write() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            rebuild_frags(&mut cache, &files, |p| std::fs::read_to_string(p).ok());
            let mut idx = merge_phase1(&cache);
            idx.built_at = now_ms();
            idx
        }
        None => AggIndex {
            tokens_built: true,
            ..Default::default()
        },
    };
    if let Ok(mut g) = index_cache().write() {
        *g = idx;
    }
}

/// PHASE 2 : résout les `outputFile` INCRÉMENTALEMENT (seuls les fichiers modifiés relisent leurs
/// outputFiles ; les délégations inchangées gardent leur attribution cachée) et installe
/// `attrib`/`unavailable`. Construit d'abord la phase 1 si besoin.
pub fn build_phase2() {
    if !index_cache()
        .read()
        .map(|g| g.tokens_built)
        .unwrap_or(false)
    {
        build_phase1();
    }
    let (attrib, unavailable) = {
        let mut cache = match file_cache().write() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        resolve_and_merge_phase2(&mut cache, &read_output_usage)
    };
    if let Ok(mut g) = index_cache().write() {
        g.attrib = attrib;
        g.unavailable = unavailable;
        g.attrib_built = true;
    }
}

/// (Re)construit l'index COMPLET (phase 1 puis phase 2). Utilisé par `analytics_refresh`.
pub fn build_index() {
    build_phase1();
    build_phase2();
}

/// Lance la construction de l'index EN TÂCHE DE FOND au démarrage (thread détaché) : phase 1
/// (Périmètre servable vite) PUIS phase 2. NON bloquant ; aucune panique ne remonte.
pub fn spawn_build() {
    std::thread::spawn(|| {
        build_phase1();
        build_phase2();
    });
}

/// Déclenche la phase 2 en tâche de fond si elle n'est pas prête et pas déjà en cours (garde
/// atomique anti-double-spawn). Non bloquant — `agent_attribution` renvoie du vide en attendant.
fn trigger_phase2_async() {
    use std::sync::atomic::Ordering;
    if PHASE2_RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
    {
        std::thread::spawn(|| {
            build_phase2();
            PHASE2_RUNNING.store(false, Ordering::SeqCst);
        });
    }
}

/// Exécute `f` sur l'index après avoir garanti la PHASE 1 (Périmètre/coût/délégations). Construit
/// la phase 1 SYNCHRONE au premier accès si pas prête (rapide). Ne clone pas l'index.
fn query_index<T>(f: impl FnOnce(&AggIndex) -> T) -> T {
    if !index_cache()
        .read()
        .map(|g| g.tokens_built)
        .unwrap_or(false)
    {
        build_phase1();
    }
    match index_cache().read() {
        Ok(g) => f(&g),
        Err(poisoned) => f(&poisoned.into_inner()),
    }
}

/// Coût $ depuis l'index : somme les buckets (project ∈ scope, date ∈ plage, model) → prix.
fn index_cost(
    idx: &AggIndex,
    from_date: &str,
    to_date: &str,
    project: Option<&str>,
    pricing: &PricingSnapshot,
) -> AnalyticsCost {
    let mut acc = CostAcc::default();
    for ((proj, date, model, _sc), (i, o, cw, cr)) in &idx.tokens {
        if !in_scope(proj, project) || date.as_str() < from_date || date.as_str() > to_date {
            continue;
        }
        let tokens = i + o + cw + cr;
        let (cost, untariffed) = match pricing.price_for(model) {
            Some(p) => (p.cost_of(*i, *o, *cw, *cr), false),
            None => (0.0, true),
        };
        let e = acc.by_model.entry(model.clone()).or_insert((0, 0.0, false));
        e.0 += tokens;
        e.1 += cost;
        e.2 |= untariffed;
        *acc.by_day.entry(date.clone()).or_insert(0.0) += cost;
        // Coût PARENT par projet : le 3ᵉ champ = `all_untariffed` (part à vrai, faux dès qu'un
        // modèle tarifé contribue). Sert l'attribution du coordinateur PAR projet côté front.
        let pe = acc.by_project.entry(proj.clone()).or_insert((0, 0.0, true));
        pe.0 += tokens;
        pe.1 += cost;
        pe.2 &= untariffed;
    }
    finalize_cost(acc, pricing.priced_at.clone())
}

/// Délégations par agent depuis l'index (comptes + durées appariées).
fn index_deleg(
    idx: &AggIndex,
    from_date: &str,
    to_date: &str,
    project: Option<&str>,
) -> Vec<AgentDelegations> {
    let mut by_agent: HashMap<String, (u64, i64, u64)> = HashMap::new();
    for ((proj, date, agent), (count, total_ms, paired)) in &idx.deleg {
        if !in_scope(proj, project) || date.as_str() < from_date || date.as_str() > to_date {
            continue;
        }
        let e = by_agent.entry(agent.clone()).or_insert((0, 0, 0));
        e.0 += count;
        e.1 += total_ms;
        e.2 += paired;
    }
    let mut out: Vec<AgentDelegations> = by_agent
        .into_iter()
        .map(|(agent, (count, total_ms, paired))| AgentDelegations {
            agent,
            count,
            total_ms,
            avg_ms: if paired > 0 {
                total_ms / paired as i64
            } else {
                0
            },
        })
        .collect();
    out.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.agent.cmp(&b.agent)));
    out
}

/// Attribution par agent depuis l'index (tokens sommés → coût à la requête ; `unavailable`).
fn index_attrib(
    idx: &AggIndex,
    from_date: &str,
    to_date: &str,
    project: Option<&str>,
    pricing: &PricingSnapshot,
) -> AgentAttribution {
    // agent → (tokens, cost, delegations, dominant_model, dominant_tokens, untariffed)
    let mut by_agent: HashMap<String, (u64, f64, u64, String, u64, bool)> = HashMap::new();
    for ((proj, date, agent, model), (i, o, cw, cr, count)) in &idx.attrib {
        if !in_scope(proj, project) || date.as_str() < from_date || date.as_str() > to_date {
            continue;
        }
        let tokens = i + o + cw + cr;
        let (cost, untariffed) = match pricing.price_for(model) {
            Some(p) => (p.cost_of(*i, *o, *cw, *cr), false),
            None => (0.0, true),
        };
        let e = by_agent
            .entry(agent.clone())
            .or_insert((0, 0.0, 0, String::new(), 0, false));
        e.0 += tokens;
        e.1 += cost;
        e.2 += count;
        if tokens >= e.4 {
            e.4 = tokens;
            e.3 = model.clone();
        }
        e.5 |= untariffed;
    }
    let mut unavailable = 0u32;
    for ((proj, date), n) in &idx.unavailable {
        if !in_scope(proj, project) || date.as_str() < from_date || date.as_str() > to_date {
            continue;
        }
        unavailable += n;
    }
    let mut agents: Vec<AgentTokens> = by_agent
        .into_iter()
        .map(
            |(agent, (tokens, cost, delegations, model, _dom, untariffed))| AgentTokens {
                agent,
                tokens,
                cost,
                delegations,
                model,
                untariffed,
            },
        )
        .collect();
    agents.sort_by(|a, b| b.tokens.cmp(&a.tokens).then_with(|| a.agent.cmp(&b.agent)));
    AgentAttribution {
        agents,
        unavailable,
        priced_at: pricing.priced_at.clone(),
    }
}

/// Totaux par projet depuis l'index (all-time), format identique à `scan_projects_dir`.
fn index_economy(idx: &AggIndex) -> Vec<ProjectEconomy> {
    let mut acc: Acc = HashMap::new();
    for ((proj, _date, _model, sidechain), (i, o, cw, cr)) in &idx.tokens {
        let e = acc.entry(proj.clone()).or_default();
        e.0 += i + cw + cr; // input total = input + cache_creation + cache_read (calque fold_line)
        e.1 += o;
        if *sidechain {
            e.3 += o;
        } else {
            e.2 += o;
        }
    }
    finalize(acc, usize::MAX)
}

/// Ventilation tokens/jour/projet depuis l'index (règle byDay = input+output+cache_creation,
/// HORS cache_read), format identique à `scan_projects_activity`.
fn index_activity(idx: &AggIndex, top: usize) -> Vec<ProjectActivity> {
    let mut acc: ActAcc = HashMap::new();
    for ((proj, date, _model, _sc), (i, o, cw, _cr)) in &idx.tokens {
        let sum = i + o + cw;
        if sum == 0 {
            continue;
        }
        *acc.entry(proj.clone())
            .or_default()
            .entry(date.clone())
            .or_insert(0) += sum;
    }
    finalize_activity(acc, top)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_of_projet_git_sous_le_chapeau_est_le_repertoire_direct() {
        // Un vrai projet (dépôt git) → premier segment sous /work, quelle que soit la profondeur.
        let root = "/Users/x/work";
        let is_git = |p: &Path| p.ends_with("IakaCockpit") || p.ends_with("iakagraph");
        assert_eq!(
            project_of_with("/Users/x/work/IakaCockpit/src-tauri", root, is_git),
            Some("IakaCockpit".into())
        );
        assert_eq!(
            project_of_with("/Users/x/work/IakaCockpit/docker/redesign", root, is_git),
            Some("IakaCockpit".into())
        );
        assert_eq!(
            project_of_with("/Users/x/work/iakagraph", root, is_git),
            Some("iakagraph".into())
        );
    }

    #[test]
    fn project_of_dossier_non_git_sous_le_chapeau_est_point_folder() {
        // Dossiers de travail Odin sans `.git` → bucket unique `.folder` (pas une entrée chacun).
        let root = "/Users/x/work";
        let no_git = |_: &Path| false;
        assert_eq!(
            project_of_with("/Users/x/work/divers", root, no_git),
            Some(".folder".into())
        );
        assert_eq!(
            project_of_with("/Users/x/work/naonedge-dashboard/sub", root, no_git),
            Some(".folder".into())
        );
    }

    #[test]
    fn project_of_racine_exacte_est_le_portefeuille() {
        let root = "/Users/x/work";
        let no_git = |_: &Path| false;
        // La racine /work elle-même = portefeuille (Odin), PAS `.folder`.
        assert_eq!(
            project_of_with("/Users/x/work", root, no_git),
            Some("work".into())
        );
        assert_eq!(
            project_of_with("/Users/x/work/", root, no_git),
            Some("work".into())
        );
    }

    #[test]
    fn project_of_hors_chapeau_dernier_segment() {
        let root = "/Users/x/work";
        let no_git = |_: &Path| false;
        assert_eq!(
            project_of_with("/private/tmp/scratch/foo", root, no_git),
            Some("foo".into())
        );
        assert_eq!(project_of_with("", root, no_git), None);
    }

    #[test]
    fn project_of_gere_les_cwd_windows() {
        // Vieux transcripts Windows : séparateur antislash + racine Windows.
        let is_git = |p: &Path| p.ends_with("IakaCockpit");
        let no_git = |_: &Path| false;
        assert_eq!(
            project_of_with(r"C:\work\IakaCockpit\src-tauri", r"C:\work", is_git),
            Some("IakaCockpit".into())
        );
        // Dossier non-git Windows → `.folder`.
        assert_eq!(
            project_of_with(r"C:\work\divers", r"C:\work", no_git),
            Some(".folder".into())
        );
        // Racine exacte Windows → portefeuille.
        assert_eq!(
            project_of_with(r"C:\work", r"C:\work", no_git),
            Some("work".into())
        );
        // Chemin mixte (slash + antislash) sous une racine mixte.
        assert_eq!(
            project_of_with(r"/c/work\iaka-demo\sub", "/c/work", no_git),
            Some(".folder".into())
        );
    }

    #[test]
    fn project_of_n_appelle_le_git_check_que_sous_la_racine() {
        // Le prédicat (test FS coûteux) n'est appelé QUE pour un cwd sous la racine — jamais pour
        // la racine exacte, hors-racine ou vide. Le wrapper prod `is_git_project` cache en plus
        // par segment (une seule vérif FS par nom de projet, pas par ligne).
        let root = "/Users/x/work";
        let calls = std::cell::Cell::new(0);
        let pred = |_: &Path| {
            calls.set(calls.get() + 1);
            true
        };
        assert_eq!(
            project_of_with("/Users/x/work/IakaCockpit/a", root, pred),
            Some("IakaCockpit".into())
        );
        assert_eq!(calls.get(), 1); // sous racine → 1 appel
        project_of_with("/Users/x/work", root, pred); // racine exacte → 0
        project_of_with("/private/tmp/foo", root, pred); // hors racine → 0
        project_of_with("", root, pred); // vide → 0
        assert_eq!(calls.get(), 1, "git-check appelé seulement sous la racine");
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

    // ---------------- Coût $ réel par période (L30-P2) ----------------

    fn pricing_test() -> PricingSnapshot {
        pricing::snapshot() // embarquée par défaut en test (aucun refresh)
    }

    #[test]
    fn iso_to_epoch_ms_parse_utc_et_millisecondes() {
        // 1970-01-01T00:00:00Z = 0.
        assert_eq!(iso_to_epoch_ms("1970-01-01T00:00:00Z"), Some(0));
        // Une heure plus tard = 3_600_000 ms.
        assert_eq!(iso_to_epoch_ms("1970-01-01T01:00:00Z"), Some(3_600_000));
        // Millisecondes prises en compte.
        assert_eq!(iso_to_epoch_ms("1970-01-01T00:00:00.250Z"), Some(250));
        // Formes non datables → None.
        assert_eq!(iso_to_epoch_ms("pas-une-date"), None);
        assert_eq!(iso_to_epoch_ms(""), None);
        assert_eq!(iso_to_epoch_ms("2026-13-01T00:00:00Z"), None); // mois invalide
    }

    #[test]
    fn iso_to_epoch_ms_coherent_avec_une_date_connue() {
        // 2026-06-30T00:00:00Z. Vérifie via reconstruction jour (days_from_civil).
        let ms = iso_to_epoch_ms("2026-06-30T12:00:00Z").unwrap();
        // midi le 30 juin → doit tomber le bon jour (préfixe date via day_of du même ts).
        assert_eq!(day_of("2026-06-30T12:00:00Z"), Some("2026-06-30".into()));
        assert!(ms > 1_700_000_000_000); // postérieur à 2023
    }

    #[test]
    fn fold_cost_separe_les_quatre_buckets_et_tarife() {
        let pr = pricing_test();
        let mut acc = CostAcc::default();
        // Ligne sonnet : input 1M @3, output 1M @15, cache_creation 1M @3.75, cache_read 1M @0.30.
        fold_cost_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":1000000,"output_tokens":1000000,"cache_creation_input_tokens":1000000,"cache_read_input_tokens":1000000}}}"#,
            0,
            i64::MAX,
            &pr,
            None,
        );
        let cost = finalize_cost(acc, None);
        assert!(
            (cost.cost_total - 22.05).abs() < 1e-6,
            "total = {}",
            cost.cost_total
        );
        assert_eq!(cost.by_model.len(), 1);
        assert_eq!(cost.by_model[0].tokens, 4_000_000);
        assert!(!cost.by_model[0].untariffed);
        assert_eq!(cost.by_day.len(), 1);
        assert_eq!(cost.by_day[0].date, "2026-06-30");
    }

    #[test]
    fn fold_cost_modele_local_coute_zero() {
        let pr = pricing_test();
        let mut acc = CostAcc::default();
        fold_cost_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"model":"llama3.1:8b","usage":{"input_tokens":500000,"output_tokens":500000}}}"#,
            0,
            i64::MAX,
            &pr,
            None,
        );
        let cost = finalize_cost(acc, None);
        assert_eq!(cost.cost_total, 0.0);
        assert_eq!(cost.by_model[0].tokens, 1_000_000); // tokens comptés, coût nul
        assert!(!cost.by_model[0].untariffed); // local = tarifé (à 0), pas untariffed
        assert!(cost.untariffed_models.is_empty());
    }

    #[test]
    fn fold_cost_modele_inconnu_est_untariffed_sans_cout() {
        let pr = pricing_test();
        let mut acc = CostAcc::default();
        fold_cost_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"model":"mistral-large-2411","usage":{"input_tokens":1000000,"output_tokens":1000000}}}"#,
            0,
            i64::MAX,
            &pr,
            None,
        );
        let cost = finalize_cost(acc, None);
        assert_eq!(cost.cost_total, 0.0); // non compté
        assert!(cost.by_model[0].untariffed);
        assert_eq!(
            cost.untariffed_models,
            vec!["mistral-large-2411".to_string()]
        );
    }

    #[test]
    fn fold_cost_borne_la_periode() {
        let pr = pricing_test();
        let mut acc = CostAcc::default();
        // Ligne à 2026-06-30T10:00:00Z.
        let line = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":1000000,"output_tokens":0}}}"#;
        let ms = iso_to_epoch_ms("2026-06-30T10:00:00Z").unwrap();
        // Période EXCLUANT la ligne (fenêtre après) → rien.
        fold_cost_line(&mut acc, line, ms + 1, ms + 1000, &pr, None);
        assert!(acc.by_model.is_empty(), "hors période → ignorée");
        // Période INCLUANT la ligne → comptée.
        fold_cost_line(&mut acc, line, ms - 1000, ms + 1000, &pr, None);
        assert_eq!(acc.by_model.len(), 1);
    }

    #[test]
    fn fold_cost_reagit_a_la_plage_24h_7j_30j_strictement() {
        // Prouve la RÉACTIVITÉ du coût par plage : trois tours datés (récent / -3 j / -10 j),
        // agrégés sur des fenêtres 24 h ⊂ 7 j ⊂ 30 j → coûts STRICTEMENT croissants.
        let pr = pricing_test();
        let day = 86_400_000_i64;
        let now = iso_to_epoch_ms("2026-06-30T12:00:00Z").unwrap();

        // sonnet (tarifé) input-only : coûts distincts, tous positifs.
        let recent = r#"{"type":"assistant","timestamp":"2026-06-30T11:00:00Z","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":1000000,"output_tokens":0}}}"#; // now-1h
        let mid = r#"{"type":"assistant","timestamp":"2026-06-27T12:00:00Z","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":2000000,"output_tokens":0}}}"#; // now-3j
        let old = r#"{"type":"assistant","timestamp":"2026-06-20T12:00:00Z","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":4000000,"output_tokens":0}}}"#; // now-10j

        let total_for = |from: i64| -> f64 {
            let mut acc = CostAcc::default();
            for line in [recent, mid, old] {
                fold_cost_line(&mut acc, line, from, now, &pr, None);
            }
            finalize_cost(acc, None).cost_total
        };

        let c24 = total_for(now - day); // seulement le tour récent
        let c7 = total_for(now - 7 * day); // récent + -3 j
        let c30 = total_for(now - 30 * day); // les trois

        assert!(c24 > 0.0, "24h doit compter le tour récent");
        assert!(c24 < c7, "7j ({c7}) doit dépasser 24h ({c24})");
        assert!(c7 < c30, "30j ({c30}) doit dépasser 7j ({c7})");
    }

    #[test]
    fn fold_cost_ignore_sans_timestamp_sans_usage_et_non_assistant() {
        let pr = pricing_test();
        let mut acc = CostAcc::default();
        // Pas de timestamp → ignorée (impossible à placer dans la période).
        fold_cost_line(
            &mut acc,
            r#"{"type":"assistant","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":10}}}"#,
            0,
            i64::MAX,
            &pr,
            None,
        );
        // user → ignorée.
        fold_cost_line(
            &mut acc,
            r#"{"type":"user","timestamp":"2026-06-30T10:00:00Z","message":{"content":"x"}}"#,
            0,
            i64::MAX,
            &pr,
            None,
        );
        // Que du JSON invalide → ignorée.
        fold_cost_line(&mut acc, "pas du json", 0, i64::MAX, &pr, None);
        assert!(acc.by_model.is_empty());
    }

    // ---------------- Délégations réelles par agent (L30-P2) ----------------

    #[test]
    fn fold_deleg_apparie_use_et_result_et_calcule_la_duree() {
        let mut acc = DelegAcc::default();
        // Délégation à gimli à T=...:00, résultat à T=...:05 → durée 5000 ms.
        fold_deleg_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"content":[{"type":"tool_use","id":"toolu_1","name":"Agent","input":{"subagent_type":"gimli","description":"code"}}]}}"#,
            None,
        );
        fold_deleg_line(
            &mut acc,
            r#"{"type":"user","timestamp":"2026-06-30T10:00:05Z","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"ok"}]}}"#,
            None,
        );
        let out = finalize_deleg(acc, 0, i64::MAX);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].agent, "gimli");
        assert_eq!(out[0].count, 1);
        assert_eq!(out[0].total_ms, 5_000);
        assert_eq!(out[0].avg_ms, 5_000);
    }

    #[test]
    fn fold_deleg_compte_les_delegations_non_appariees_sans_duree() {
        let mut acc = DelegAcc::default();
        // Délégation sans tool_result → comptée, durée 0 (avg 0, paire absente).
        fold_deleg_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"content":[{"type":"tool_use","id":"toolu_2","name":"Task","input":{"subagent_type":"legolas","description":"gate"}}]}}"#,
            None,
        );
        let out = finalize_deleg(acc, 0, i64::MAX);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].agent, "legolas");
        assert_eq!(out[0].count, 1);
        assert_eq!(out[0].total_ms, 0);
        assert_eq!(out[0].avg_ms, 0);
    }

    #[test]
    fn fold_deleg_agrege_par_agent_et_trie_par_compte() {
        let mut acc = DelegAcc::default();
        for (i, agent) in [(1, "gimli"), (2, "gimli"), (3, "loki")] {
            fold_deleg_line(
                &mut acc,
                &format!(
                    r#"{{"type":"assistant","timestamp":"2026-06-30T10:00:0{i}Z","message":{{"content":[{{"type":"tool_use","id":"id{i}","name":"Agent","input":{{"subagent_type":"{agent}","description":"x"}}}}]}}}}"#
                ),
                None,
            );
        }
        let out = finalize_deleg(acc, 0, i64::MAX);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].agent, "gimli"); // 2 délégations (tri desc)
        assert_eq!(out[0].count, 2);
        assert_eq!(out[1].agent, "loki");
        assert_eq!(out[1].count, 1);
    }

    #[test]
    fn fold_deleg_ignore_les_outils_non_delegation() {
        let mut acc = DelegAcc::default();
        // Bash n'est PAS une délégation → rien collecté.
        fold_deleg_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"content":[{"type":"tool_use","id":"b1","name":"Bash","input":{"command":"ls"}}]}}"#,
            None,
        );
        let out = finalize_deleg(acc, 0, i64::MAX);
        assert!(out.is_empty());
    }

    #[test]
    fn finalize_deleg_borne_la_periode_sur_le_ts_de_delegation() {
        let mut acc = DelegAcc::default();
        fold_deleg_line(
            &mut acc,
            r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","message":{"content":[{"type":"tool_use","id":"t1","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#,
            None,
        );
        let ms = iso_to_epoch_ms("2026-06-30T10:00:00Z").unwrap();
        // Fenêtre après la délégation → exclue.
        assert!(finalize_deleg(
            DelegAcc {
                uses: acc.uses.clone(),
                results: acc.results.clone(),
            },
            ms + 1,
            ms + 1000
        )
        .is_empty());
        // Fenêtre incluant la délégation → présente.
        assert_eq!(finalize_deleg(acc, ms - 1, ms + 1).len(), 1);
    }

    #[test]
    fn fold_cost_scope_par_projet_via_cwd() {
        // Deux tours dans deux projets distincts (via `cwd`). Le scope projet ne compte QUE le
        // projet ciblé ; `None` = total (les deux). Prouve le fix Périmètre → coût.
        let pr = pricing_test();
        let l_a = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/Users/x/work/proj-a","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":1000000,"output_tokens":0}}}"#;
        let l_b = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/Users/x/work/proj-b","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":3000000,"output_tokens":0}}}"#;

        let total_for = |project: Option<&str>| -> f64 {
            let mut acc = CostAcc::default();
            fold_cost_line(&mut acc, l_a, 0, i64::MAX, &pr, project);
            fold_cost_line(&mut acc, l_b, 0, i64::MAX, &pr, project);
            finalize_cost(acc, None).cost_total
        };

        let all = total_for(None);
        let a = total_for(Some("proj-a"));
        let b = total_for(Some("proj-b"));
        assert!(a > 0.0 && b > 0.0);
        assert!(
            a < all,
            "scope proj-a ({a}) doit être strictement < total ({all})"
        );
        assert!(
            b < all,
            "scope proj-b ({b}) doit être strictement < total ({all})"
        );
        assert!((a + b - all).abs() < 1e-6, "a+b doit reconstituer le total");
        // proj-b (3 M input) coûte plus que proj-a (1 M) → scopes bien distincts.
        assert!(b > a);
    }

    // ---------------- Attribution par agent RÉELLE (L30-P3) ----------------

    #[test]
    fn sum_usage_jsonl_somme_les_quatre_buckets() {
        // Deux lignes assistant avec usage (message.usage) + une variante racine `usage`.
        let content = concat!(
            r#"{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10,"cache_read_input_tokens":5}}}"#,
            "\n",
            r#"{"type":"assistant","message":{"usage":{"input_tokens":200,"output_tokens":80}}}"#,
            "\n",
            r#"{"type":"user","message":{"content":"pas d'usage"}}"#,
            "\n",
            r#"{"usage":{"input_tokens":1,"output_tokens":1}}"#,
        );
        let (i, o, cw, cr) = sum_usage_jsonl(content);
        assert_eq!((i, o, cw, cr), (301, 131, 10, 5));
    }

    /// Construit un accumulateur d'attribution depuis des lignes de transcript parent.
    fn attrib_acc_from(lines: &[&str], project: Option<&str>) -> AttribAcc {
        let mut acc = AttribAcc::default();
        for l in lines {
            fold_attrib_line(&mut acc, l, project);
        }
        acc
    }

    #[test]
    fn attribution_via_output_file_donne_tokens_et_cout() {
        let pr = pricing_test();
        // Parent : une délégation Agent→gimli + son tool_result avec toolUseResult(outputFile,
        // resolvedModel opus[1m]). L'outputFile est lu par un `reader` injecté (fixture).
        let use_line = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/iakacockpit","message":{"content":[{"type":"tool_use","id":"tu1","name":"Agent","input":{"subagent_type":"gimli","description":"code"}}]}}"#;
        let res_line = r#"{"type":"user","timestamp":"2026-06-30T10:05:00Z","cwd":"/w/iakacockpit","toolUseResult":{"resolvedModel":"claude-opus-4-8[1m]","outputFile":"/tmp/sub-gimli.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"tu1","content":"ok"}]}}"#;
        let acc = attrib_acc_from(&[use_line, res_line], None);

        // Reader fixture : 1M output sous opus (75 $/M) → coût 75.
        let reader = |path: &str| -> Option<(u64, u64, u64, u64)> {
            assert_eq!(path, "/tmp/sub-gimli.jsonl");
            Some((0, 1_000_000, 0, 0))
        };
        let out = finalize_attrib(acc, 0, i64::MAX, &pr, reader);
        assert_eq!(out.unavailable, 0);
        assert_eq!(out.agents.len(), 1);
        let a = &out.agents[0];
        assert_eq!(a.agent, "gimli");
        assert_eq!(a.tokens, 1_000_000);
        assert!((a.cost - 75.0).abs() < 1e-6, "coût opus = {}", a.cost);
        assert_eq!(a.delegations, 1);
        assert_eq!(a.model, "claude-opus-4-8[1m]"); // resolvedModel brut conservé
        assert!(!a.untariffed);
    }

    #[test]
    fn attribution_output_file_manquant_incremente_unavailable_sans_fabriquer() {
        let pr = pricing_test();
        let use_line = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/p","message":{"content":[{"type":"tool_use","id":"tu2","name":"Task","input":{"subagent_type":"legolas","description":"gate"}}]}}"#;
        let res_line = r#"{"type":"user","timestamp":"2026-06-30T10:05:00Z","cwd":"/w/p","toolUseResult":{"resolvedModel":"claude-sonnet-4-5","outputFile":"/tmp/disparu.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"tu2","content":"ok"}]}}"#;
        let acc = attrib_acc_from(&[use_line, res_line], None);
        // Reader = fichier disparu → None.
        let out = finalize_attrib(acc, 0, i64::MAX, &pr, |_| None);
        assert_eq!(out.unavailable, 1);
        assert!(out.agents.is_empty(), "aucun token fabriqué");
    }

    #[test]
    fn attribution_delegation_sans_result_est_unavailable() {
        let pr = pricing_test();
        // tool_use sans tool_result apparié → non attribuable.
        let use_line = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/p","message":{"content":[{"type":"tool_use","id":"tu3","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#;
        let acc = attrib_acc_from(&[use_line], None);
        let out = finalize_attrib(acc, 0, i64::MAX, &pr, |_| Some((10, 10, 0, 0)));
        assert_eq!(out.unavailable, 1);
        assert!(out.agents.is_empty());
    }

    #[test]
    fn attribution_borne_periode_et_scope_projet() {
        let pr = pricing_test();
        // Deux délégations, projets distincts, dates distinctes.
        let use_a = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/proj-a","message":{"content":[{"type":"tool_use","id":"a","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#;
        let res_a = r#"{"type":"user","timestamp":"2026-06-30T10:01:00Z","cwd":"/w/proj-a","toolUseResult":{"resolvedModel":"claude-sonnet-4-5","outputFile":"/tmp/a.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"a","content":"ok"}]}}"#;
        let use_b = r#"{"type":"assistant","timestamp":"2026-06-20T10:00:00Z","cwd":"/w/proj-b","message":{"content":[{"type":"tool_use","id":"b","name":"Agent","input":{"subagent_type":"legolas","description":"y"}}]}}"#;
        let res_b = r#"{"type":"user","timestamp":"2026-06-20T10:01:00Z","cwd":"/w/proj-b","toolUseResult":{"resolvedModel":"claude-sonnet-4-5","outputFile":"/tmp/b.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"b","content":"ok"}]}}"#;
        let reader = |_: &str| Some((0u64, 100u64, 0u64, 0u64));

        // Scope proj-a (fold-level) : seule la délégation A est collectée.
        let acc_a = attrib_acc_from(&[use_a, res_a, use_b, res_b], Some("proj-a"));
        let out_a = finalize_attrib(acc_a, 0, i64::MAX, &pr, reader);
        assert_eq!(out_a.agents.len(), 1);
        assert_eq!(out_a.agents[0].agent, "gimli");

        // ALL mais fenêtre period excluant B (avant le 25 juin) : seule A dans la période.
        let acc_all = attrib_acc_from(&[use_a, res_a, use_b, res_b], None);
        let from = iso_to_epoch_ms("2026-06-25T00:00:00Z").unwrap();
        let out_win = finalize_attrib(acc_all, from, i64::MAX, &pr, reader);
        assert_eq!(out_win.agents.len(), 1);
        assert_eq!(out_win.agents[0].agent, "gimli");
    }

    #[test]
    fn read_output_usage_fichier_reel_puis_absent() {
        // Écrit un petit transcript sous-agent dans le temp dir, le lit, le supprime.
        let dir = std::env::temp_dir();
        let path = dir.join(format!("iaka-attrib-test-{}.jsonl", std::process::id()));
        let ps = path.to_string_lossy().to_string();
        std::fs::write(
            &path,
            concat!(
                r#"{"type":"assistant","message":{"usage":{"input_tokens":300,"output_tokens":100}}}"#,
                "\n",
                r#"{"type":"assistant","message":{"usage":{"input_tokens":0,"output_tokens":50}}}"#,
            ),
        )
        .unwrap();
        assert_eq!(read_output_usage(&ps), Some((300, 150, 0, 0)));
        std::fs::remove_file(&path).unwrap();
        // Disparu → None (jamais de fabrication).
        assert_eq!(read_output_usage(&ps), None);
        // Chemin vide → None.
        assert_eq!(read_output_usage(""), None);
    }

    #[test]
    fn fold_deleg_scope_par_projet_via_cwd() {
        // Une délégation par projet (cwd distinct). Le scope ne garde que le projet ciblé.
        let use_a = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/proj-a","message":{"content":[{"type":"tool_use","id":"ida","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#;
        let use_b = r#"{"type":"assistant","timestamp":"2026-06-30T10:00:00Z","cwd":"/w/proj-b","message":{"content":[{"type":"tool_use","id":"idb","name":"Agent","input":{"subagent_type":"legolas","description":"y"}}]}}"#;

        let agents_for = |project: Option<&str>| -> Vec<String> {
            let mut acc = DelegAcc::default();
            fold_deleg_line(&mut acc, use_a, project);
            fold_deleg_line(&mut acc, use_b, project);
            finalize_deleg(acc, 0, i64::MAX)
                .into_iter()
                .map(|d| d.agent)
                .collect()
        };

        let all = agents_for(None);
        assert_eq!(all.len(), 2, "ALL = les deux délégations");
        assert_eq!(agents_for(Some("proj-a")), vec!["gimli".to_string()]);
        assert_eq!(agents_for(Some("proj-b")), vec!["legolas".to_string()]);
    }

    // ---------------- Index d'agrégats précalculé (PERF) ----------------

    #[test]
    fn ymd_from_ms_convertit_les_dates() {
        assert_eq!(ymd_from_ms(0), "1970-01-01");
        // 2026-06-30T12:00:00Z → même jour que day_of.
        let ms = iso_to_epoch_ms("2026-06-30T12:00:00Z").unwrap();
        assert_eq!(ymd_from_ms(ms), "2026-06-30");
        // Bornes ouvertes : MAX borne haute, MIN borne basse (comparaison lexicale correcte).
        assert!(ymd_from_ms(i64::MAX).as_str() > "2026-06-30");
        assert!(ymd_from_ms(i64::MIN).as_str() < "2026-06-30");
    }

    /// Fixture : un transcript parent (tokens coord + délégué sidechain + 2 délégations gimli/
    /// legolas, une avec outputFile lisible, une avec outputFile manquant).
    fn fixture_parent() -> Vec<&'static str> {
        vec![
            // Tokens coordinateur (opus) — proj-a, 2026-06-30.
            r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/proj-a","message":{"model":"claude-opus-4-8[1m]","usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":200}}}"#,
            // Tokens délégué (sidechain) — proj-a, même jour.
            r#"{"type":"assistant","timestamp":"2026-06-30T09:05:00Z","isSidechain":true,"cwd":"/w/proj-a","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":300,"output_tokens":100}}}"#,
            // Délégation A → gimli (avec result + outputFile lisible).
            r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/proj-a","message":{"content":[{"type":"tool_use","id":"tuA","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#,
            r#"{"type":"user","timestamp":"2026-06-30T09:02:00Z","cwd":"/w/proj-a","toolUseResult":{"resolvedModel":"claude-opus-4-8[1m]","outputFile":"/tmp/ok.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"tuA","content":"ok"}]}}"#,
            // Délégation B → legolas (result mais outputFile manquant → unavailable).
            r#"{"type":"assistant","timestamp":"2026-06-30T09:10:00Z","cwd":"/w/proj-a","message":{"content":[{"type":"tool_use","id":"tuB","name":"Task","input":{"subagent_type":"legolas","description":"y"}}]}}"#,
            r#"{"type":"user","timestamp":"2026-06-30T09:11:00Z","cwd":"/w/proj-a","toolUseResult":{"resolvedModel":"claude-sonnet-4-5","outputFile":"/tmp/gone.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"tuB","content":"ok"}]}}"#,
        ]
    }

    /// Reader fixture : `/tmp/ok.jsonl` → 1M output ; sinon absent.
    fn fixture_reader(path: &str) -> Option<Buckets> {
        if path == "/tmp/ok.jsonl" {
            Some((0, 1_000_000, 0, 0))
        } else {
            None
        }
    }

    /// Index complet de fixture : phase 1 (parsing) PUIS phase 2 (résolution via reader fixture).
    fn build_fixture_index() -> AggIndex {
        let mut idx = AggIndex::default();
        let content = fixture_parent().join("\n");
        index_file_phase1(&mut idx, &content);
        idx.tokens_built = true;
        let (attrib, unavailable) = resolve_pending(&idx.pending, &fixture_reader);
        idx.attrib = attrib;
        idx.unavailable = unavailable;
        idx.attrib_built = true;
        idx
    }

    #[test]
    fn index_cost_egal_au_scan_direct() {
        let pr = pricing_test();
        let idx = build_fixture_index();
        // Direct : fold_cost_line sur toutes les lignes tokens (pas de scope, toute la période).
        let mut acc = CostAcc::default();
        for l in fixture_parent() {
            fold_cost_line(&mut acc, l, 0, i64::MAX, &pr, None);
        }
        let direct = finalize_cost(acc, pr.priced_at.clone());
        let via_index = index_cost(&idx, "0000-00-00", "9999-99-99", None, &pr);
        assert!((direct.cost_total - via_index.cost_total).abs() < 1e-9);
        assert_eq!(direct.by_model.len(), via_index.by_model.len());
        assert_eq!(direct.by_day, via_index.by_day);
    }

    #[test]
    fn index_deleg_egal_au_scan_direct() {
        let idx = build_fixture_index();
        let mut acc = DelegAcc::default();
        for l in fixture_parent() {
            fold_deleg_line(&mut acc, l, None);
        }
        let direct = finalize_deleg(acc, 0, i64::MAX);
        let via_index = index_deleg(&idx, "0000-00-00", "9999-99-99", None);
        assert_eq!(direct, via_index);
        // Deux délégations (gimli, legolas).
        assert_eq!(via_index.len(), 2);
    }

    #[test]
    fn index_attrib_egal_au_scan_direct_sur_tokens_et_unavailable() {
        let pr = pricing_test();
        let idx = build_fixture_index();
        let mut acc = AttribAcc::default();
        for l in fixture_parent() {
            fold_attrib_line(&mut acc, l, None);
        }
        let direct = finalize_attrib(acc, 0, i64::MAX, &pr, fixture_reader);
        let via_index = index_attrib(&idx, "0000-00-00", "9999-99-99", None, &pr);
        // gimli attribué (1M output opus), legolas non attribuable (outputFile manquant).
        assert_eq!(via_index.agents.len(), 1);
        assert_eq!(via_index.agents[0].agent, "gimli");
        assert_eq!(direct.agents[0].tokens, via_index.agents[0].tokens);
        assert!((direct.agents[0].cost - via_index.agents[0].cost).abs() < 1e-9);
        assert_eq!(direct.unavailable, via_index.unavailable);
        assert_eq!(via_index.unavailable, 1);
    }

    #[test]
    fn index_economy_et_activity_egaux_au_scan_direct() {
        let idx = build_fixture_index();
        // Économie : fold_line direct.
        let mut acc_e = Acc::new();
        for l in fixture_parent() {
            fold_line(&mut acc_e, l);
        }
        let direct_e = finalize(acc_e, usize::MAX);
        let index_e = index_economy(&idx);
        assert_eq!(direct_e, index_e);
        // Activité : fold_activity_line direct.
        let mut acc_a = ActAcc::new();
        for l in fixture_parent() {
            fold_activity_line(&mut acc_a, l);
        }
        let direct_a = finalize_activity(acc_a, usize::MAX);
        let index_a = index_activity(&idx, usize::MAX);
        assert_eq!(direct_a, index_a);
    }

    #[test]
    fn index_scope_et_periode_filtrent() {
        let pr = pricing_test();
        let idx = build_fixture_index();
        // Scope inexistant → vide.
        let c = index_cost(&idx, "0000-00-00", "9999-99-99", Some("autre"), &pr);
        assert_eq!(c.cost_total, 0.0);
        assert!(c.by_model.is_empty());
        // Période excluant le 30 juin → vide.
        let c2 = index_cost(&idx, "2026-07-01", "9999-99-99", None, &pr);
        assert_eq!(c2.cost_total, 0.0);
        // Scope proj-a → non vide.
        let c3 = index_cost(&idx, "0000-00-00", "9999-99-99", Some("proj-a"), &pr);
        assert!(c3.cost_total > 0.0);
    }

    #[test]
    fn build_from_dir_lit_les_transcripts_et_output_files() {
        // Construit une arbo temporaire projects/<session>/<sid>.jsonl + un outputFile réel.
        let base = std::env::temp_dir().join(format!("iaka-idx-{}", std::process::id()));
        let sess = base.join("proj-x-session");
        std::fs::create_dir_all(&sess).unwrap();
        let sub_path = base.join("sub-agent.jsonl");
        std::fs::write(
            &sub_path,
            r#"{"type":"assistant","message":{"usage":{"input_tokens":0,"output_tokens":2000000}}}"#,
        )
        .unwrap();
        let sub = sub_path.to_string_lossy().to_string();
        let parent = format!(
            concat!(
                r#"{{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/proj-x","message":{{"model":"claude-sonnet-4-5","usage":{{"input_tokens":100,"output_tokens":50}}}}}}"#,
                "\n",
                r#"{{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/proj-x","message":{{"content":[{{"type":"tool_use","id":"z1","name":"Agent","input":{{"subagent_type":"gimli","description":"x"}}}}]}}}}"#,
                "\n",
                r#"{{"type":"user","timestamp":"2026-06-30T09:01:00Z","cwd":"/w/proj-x","toolUseResult":{{"resolvedModel":"claude-sonnet-4-5","outputFile":"{sub}"}},"message":{{"content":[{{"type":"tool_result","tool_use_id":"z1","content":"ok"}}]}}}}"#,
            ),
            sub = sub
        );
        std::fs::write(sess.join("s1.jsonl"), parent).unwrap();

        // Phase 1 incrémentale (cache local, SANS outputFile) puis phase 2 (résolution réelle).
        let files = collect_transcript_stats(&base);
        let mut cache = FileCacheMap::new();
        let parsed = rebuild_frags(&mut cache, &files, |p| std::fs::read_to_string(p).ok());
        assert_eq!(parsed, 1, "un transcript nouveau → parsé une fois");
        let mut idx = merge_phase1(&cache);
        assert!(idx.tokens_built);
        assert!(idx.attrib.is_empty(), "phase 1 ne lit AUCUN outputFile");
        assert!(
            !idx.pending.is_empty(),
            "phase 1 empile la délégation à résoudre"
        );
        let (attrib_map, unavailable_map) =
            resolve_and_merge_phase2(&mut cache, &read_output_usage);
        idx.attrib = attrib_map;
        idx.unavailable = unavailable_map;
        idx.attrib_built = true;

        let pr = pricing_test();
        let attrib = index_attrib(&idx, "0000-00-00", "9999-99-99", None, &pr);
        assert_eq!(attrib.agents.len(), 1);
        assert_eq!(attrib.agents[0].agent, "gimli");
        assert_eq!(attrib.agents[0].tokens, 2_000_000); // lu depuis l'outputFile réel
        assert_eq!(attrib.unavailable, 0);

        std::fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn phase1_sert_le_perimetre_sans_lire_les_outputfiles() {
        // Phase 1 = parsing pur : remplit tokens/deleg/pending, PAS attrib/unavailable. Le
        // Périmètre (economy/activity) et le coût sont servables SANS aucune lecture d'outputFile.
        let mut idx = AggIndex::default();
        let content = fixture_parent().join("\n");
        index_file_phase1(&mut idx, &content);
        idx.tokens_built = true;

        // Phase 2 pas faite → attrib/unavailable vides, mais pending rempli.
        assert!(idx.attrib.is_empty());
        assert!(idx.unavailable.is_empty());
        assert!(!idx.pending.is_empty());
        assert!(!idx.attrib_built);

        // Périmètre + coût + délégations SERVABLES depuis la seule phase 1.
        assert!(!index_economy(&idx).is_empty());
        assert!(!index_activity(&idx, usize::MAX).is_empty());
        let pr = pricing_test();
        assert!(!index_cost(&idx, "0000-00-00", "9999-99-99", None, &pr)
            .by_model
            .is_empty());
        assert!(!index_deleg(&idx, "0000-00-00", "9999-99-99", None).is_empty());

        // L'attribution nécessite la phase 2 : vide tant qu'elle n'a pas résolu les pending.
        assert!(index_attrib(&idx, "0000-00-00", "9999-99-99", None, &pr)
            .agents
            .is_empty());

        // Phase 2 (résolution) → attribution non vide + unavailable comptés (fixture : 1 KO).
        let (attrib, unavailable) = resolve_pending(&idx.pending, &fixture_reader);
        idx.attrib = attrib;
        idx.unavailable = unavailable;
        idx.attrib_built = true;
        let a = index_attrib(&idx, "0000-00-00", "9999-99-99", None, &pr);
        assert_eq!(a.agents.len(), 1); // gimli attribué
        assert_eq!(a.unavailable, 1); // legolas (outputFile manquant)
    }

    // ---------------- Index INCRÉMENTAL (cache par fichier, mtime) ----------------

    /// Deux transcripts distincts (projets p1/p2) pour la fixture incrémentale.
    fn frag_fixtures() -> (String, String, String) {
        let f1 = concat!(
            r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/p1","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":100,"output_tokens":50}}}"#,
            "\n",
            r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/p1","message":{"content":[{"type":"tool_use","id":"a1","name":"Agent","input":{"subagent_type":"gimli","description":"x"}}]}}"#,
            "\n",
            r#"{"type":"user","timestamp":"2026-06-30T09:01:00Z","cwd":"/w/p1","toolUseResult":{"resolvedModel":"claude-sonnet-4-5","outputFile":"/tmp/f1.jsonl"},"message":{"content":[{"type":"tool_result","tool_use_id":"a1","content":"ok"}]}}"#,
        )
        .to_string();
        let f2 = r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/p2","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":200,"output_tokens":80}}}"#.to_string();
        // Version modifiée de f2 (tokens différents).
        let f2b = r#"{"type":"assistant","timestamp":"2026-06-30T09:00:00Z","cwd":"/w/p2","message":{"model":"claude-sonnet-4-5","usage":{"input_tokens":500,"output_tokens":300}}}"#.to_string();
        (f1, f2, f2b)
    }

    fn tm(secs: u64) -> Option<std::time::SystemTime> {
        Some(std::time::UNIX_EPOCH + std::time::Duration::from_secs(secs))
    }

    #[test]
    fn incremental_reparse_seulement_les_fichiers_modifies() {
        let (f1, f2, _f2b) = frag_fixtures();
        let p1 = PathBuf::from("/proj/p1.jsonl");
        let p2 = PathBuf::from("/proj/p2.jsonl");
        let contents: HashMap<PathBuf, String> =
            HashMap::from([(p1.clone(), f1), (p2.clone(), f2)]);
        let read = |p: &Path| contents.get(p).cloned();

        let mut cache = FileCacheMap::new();
        // 1er build : 2 fichiers → 2 parsés.
        let files = vec![(p1.clone(), tm(10), 100), (p2.clone(), tm(20), 50)];
        assert_eq!(rebuild_frags(&mut cache, &files, read), 2);
        // Rebuild sans modif → 0 parsé (tout réutilisé).
        assert_eq!(rebuild_frags(&mut cache, &files, read), 0);
        // p2 modifié (mtime ET size) → 1 seul parsé.
        let files2 = vec![(p1.clone(), tm(10), 100), (p2.clone(), tm(21), 51)];
        assert_eq!(rebuild_frags(&mut cache, &files2, read), 1);
    }

    #[test]
    fn incremental_egal_au_build_complet_apres_modif() {
        let (f1, f2, f2b) = frag_fixtures();
        let p1 = PathBuf::from("/proj/p1.jsonl");
        let p2 = PathBuf::from("/proj/p2.jsonl");
        // Contenu APRÈS modif de p2.
        let contents: HashMap<PathBuf, String> =
            HashMap::from([(p1.clone(), f1.clone()), (p2.clone(), f2b.clone())]);
        let read = |p: &Path| contents.get(p).cloned();

        // --- Chemin INCRÉMENTAL : build v1 (p2=f2) puis modif p2→f2b. ---
        let mut inc = FileCacheMap::new();
        let v1: HashMap<PathBuf, String> =
            HashMap::from([(p1.clone(), f1.clone()), (p2.clone(), f2)]);
        rebuild_frags(
            &mut inc,
            &[(p1.clone(), tm(10), 100), (p2.clone(), tm(20), 50)],
            |p| v1.get(p).cloned(),
        );
        // Modif p2 (nouvelle empreinte) → re-parse seulement p2 (contenu f2b).
        let parsed = rebuild_frags(
            &mut inc,
            &[(p1.clone(), tm(10), 100), (p2.clone(), tm(30), 99)],
            read,
        );
        assert_eq!(parsed, 1);
        let idx_inc = merge_phase1(&inc);

        // --- Chemin COMPLET : cache vide, tout parsé avec les contenus finaux. ---
        let mut full = FileCacheMap::new();
        rebuild_frags(
            &mut full,
            &[(p1.clone(), tm(10), 100), (p2.clone(), tm(30), 99)],
            read,
        );
        let idx_full = merge_phase1(&full);

        // Correctness : incrémental == complet (tokens + deleg, maps commutatives).
        assert_eq!(idx_inc.tokens, idx_full.tokens);
        assert_eq!(idx_inc.deleg, idx_full.deleg);

        // Phase 2 aussi identique (attrib + unavailable) — reader factice pour l'outputFile de p1.
        let reader = |path: &str| {
            if path == "/tmp/f1.jsonl" {
                Some((0, 1_000_000, 0, 0))
            } else {
                None
            }
        };
        let a_inc = resolve_and_merge_phase2(&mut inc, &reader);
        let a_full = resolve_and_merge_phase2(&mut full, &reader);
        assert_eq!(a_inc.0, a_full.0);
        assert_eq!(a_inc.1, a_full.1);
    }

    #[test]
    fn incremental_retire_les_fichiers_disparus() {
        let (f1, f2, _f2b) = frag_fixtures();
        let p1 = PathBuf::from("/proj/p1.jsonl");
        let p2 = PathBuf::from("/proj/p2.jsonl");
        let contents: HashMap<PathBuf, String> =
            HashMap::from([(p1.clone(), f1), (p2.clone(), f2)]);
        let read = |p: &Path| contents.get(p).cloned();

        let mut cache = FileCacheMap::new();
        rebuild_frags(
            &mut cache,
            &[(p1.clone(), tm(10), 100), (p2.clone(), tm(20), 50)],
            read,
        );
        let with_both = merge_phase1(&cache);
        // p2 disparaît → son fragment est retiré ; l'index ne le contient plus.
        rebuild_frags(&mut cache, &[(p1.clone(), tm(10), 100)], read);
        assert_eq!(cache.len(), 1);
        let after = merge_phase1(&cache);
        assert!(after.tokens.len() < with_both.tokens.len());
        // p1 conservé (projet p1 encore présent) ; p2 absent.
        assert!(after.tokens.keys().all(|(proj, _, _, _)| proj == "p1"));
    }

    #[test]
    fn incremental_stat_echoue_traite_comme_change() {
        // mtime = None (stat KO) → jamais réutilisé (re-parse à chaque build). Défensif.
        let (f1, _f2, _f2b) = frag_fixtures();
        let p1 = PathBuf::from("/proj/p1.jsonl");
        let contents: HashMap<PathBuf, String> = HashMap::from([(p1.clone(), f1)]);
        let read = |p: &Path| contents.get(p).cloned();
        let mut cache = FileCacheMap::new();
        assert_eq!(
            rebuild_frags(&mut cache, &[(p1.clone(), None, 100)], read),
            1
        );
        // Même appel avec mtime None → re-parsé (pas de réutilisation sur empreinte inconnue).
        assert_eq!(
            rebuild_frags(&mut cache, &[(p1.clone(), None, 100)], read),
            1
        );
    }

    #[test]
    fn index_cost_by_project_somme_coherente_et_filtree() {
        let pr = pricing_test();
        // Deux projets, sonnet tarifé, même jour.
        let mut idx = AggIndex::default();
        idx.tokens.insert(
            (
                "proj-a".into(),
                "2026-06-30".into(),
                "claude-sonnet-4-5".into(),
                false,
            ),
            (1_000_000, 0, 0, 0),
        );
        idx.tokens.insert(
            (
                "proj-b".into(),
                "2026-06-30".into(),
                "claude-sonnet-4-5".into(),
                false,
            ),
            (3_000_000, 0, 0, 0),
        );
        idx.tokens.insert(
            (
                "proj-b".into(),
                "2026-06-20".into(),
                "claude-sonnet-4-5".into(),
                false,
            ),
            (500_000, 0, 0, 0),
        );
        idx.tokens_built = true;

        // Toute la période : 2 projets, Σ by_project.tokens == Σ by_model.tokens.
        let c = index_cost(&idx, "0000-00-00", "9999-99-99", None, &pr);
        assert_eq!(c.by_project.len(), 2);
        let sum_bp: u64 = c.by_project.iter().map(|p| p.tokens).sum();
        let sum_bm: u64 = c.by_model.iter().map(|m| m.tokens).sum();
        assert_eq!(sum_bp, sum_bm);
        assert_eq!(sum_bp, 4_500_000);
        // Tri coût desc → proj-b (3,5 M) devant proj-a (1 M).
        assert_eq!(c.by_project[0].project, "proj-b");
        assert_eq!(c.by_project[0].tokens, 3_500_000);
        assert!(!c.by_project[0].untariffed);

        // Scope projet → une seule entrée.
        let ca = index_cost(&idx, "0000-00-00", "9999-99-99", Some("proj-a"), &pr);
        assert_eq!(ca.by_project.len(), 1);
        assert_eq!(ca.by_project[0].project, "proj-a");

        // Période excluant le 20 juin → proj-b n'a que son jour du 30 (3 M).
        let cwin = index_cost(&idx, "2026-06-25", "9999-99-99", None, &pr);
        let pb = cwin
            .by_project
            .iter()
            .find(|p| p.project == "proj-b")
            .unwrap();
        assert_eq!(pb.tokens, 3_000_000);
    }

    #[test]
    fn index_activity_ne_tronque_pas_les_projets() {
        // FIX V2 : `portfolio_activity` (via index) renvoie TOUS les projets — un projet
        // sélectionné hors des 12 plus gros n'est plus masqué (son évolution s'affiche).
        let mut idx = AggIndex::default();
        for i in 0..15 {
            idx.tokens.insert(
                (
                    format!("proj-{i:02}"),
                    "2026-06-30".into(),
                    "m".into(),
                    false,
                ),
                (10, 5, 0, 0),
            );
        }
        idx.tokens_built = true;
        let act = index_activity(&idx, usize::MAX);
        assert_eq!(act.len(), 15, "aucune troncature top-12");
        // Le plus petit projet est bien présent.
        assert!(act.iter().any(|p| p.project == "proj-14"));
    }

    #[test]
    fn index_vide_non_construit_donne_du_vide_propre() {
        // Un index par défaut (non construit) → requêtes vides, jamais de panique.
        let idx = AggIndex::default();
        assert!(!idx.tokens_built);
        assert!(!idx.attrib_built);
        let pr = pricing_test();
        assert!(index_cost(&idx, "0000-00-00", "9999-99-99", None, &pr)
            .by_model
            .is_empty());
        assert!(index_deleg(&idx, "0000-00-00", "9999-99-99", None).is_empty());
        assert!(index_attrib(&idx, "0000-00-00", "9999-99-99", None, &pr)
            .agents
            .is_empty());
        assert!(index_economy(&idx).is_empty());
        assert!(index_activity(&idx, usize::MAX).is_empty());
    }
}
