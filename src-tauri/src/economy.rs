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

/// Dernier segment d'un cwd = nom de projet. Coupe sur `/` ET `\` pour gérer les vieux
/// transcripts Windows (`C:\iakaVODdash` → `iakaVODdash`, `/a/b/iaka-demo` → `iaka-demo`).
/// Défensif : chaîne vide → `None`, segments vides (séparateurs de fin) ignorés.
fn project_of(cwd: &str) -> Option<String> {
    cwd.trim_end_matches(['/', '\\'])
        .rsplit(['/', '\\'])
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

/// Commande : coût agrégé par projet depuis les transcripts de session. Renvoie TOUS les
/// projets (pas de troncature) ; le scope (projets de la table) est appliqué CÔTÉ FRONT —
/// tronquer ici jetterait les petits projets de la table avant le filtre (décision = tout
/// garder). Calque `portfolio_activity`.
#[tauri::command]
pub fn portfolio_economy() -> Result<Vec<ProjectEconomy>, String> {
    match claude_projects_dir() {
        Some(dir) => Ok(scan_projects_dir(&dir, usize::MAX)),
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
    /// Date de la table de prix (`pricing.json`), ou `None` si table embarquée.
    pub priced_at: Option<String>,
}

/// Accumulateur de coût : par modèle (tokens, cost, untariffed) + par jour (cost).
#[derive(Default)]
struct CostAcc {
    by_model: HashMap<String, (u64, f64, bool)>,
    by_day: HashMap<String, f64>,
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

/// Intègre UNE ligne JSONL dans l'accumulateur de coût, filtrée par période `[from, to]`.
/// PUR/testable. Sépare les 4 buckets, tarife via `pricing`, ignore proprement tout record
/// non pertinent / hors période / non daté.
fn fold_cost_line(acc: &mut CostAcc, line: &str, from: i64, to: i64, pricing: &PricingSnapshot) {
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

    AnalyticsCost {
        cost_total,
        by_model,
        by_day,
        untariffed_models,
        priced_at,
    }
}

/// Scanne un dossier `projects/` et agrège le coût $ sur la période. Défensif.
fn scan_projects_cost(
    projects_dir: &Path,
    from: i64,
    to: i64,
    pricing: &PricingSnapshot,
) -> AnalyticsCost {
    let mut acc = CostAcc::default();
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
                if let Ok(content) = std::fs::read_to_string(&p) {
                    for line in content.lines() {
                        fold_cost_line(&mut acc, line, from, to, pricing);
                    }
                }
            }
        }
    }
    finalize_cost(acc, pricing.priced_at.clone())
}

/// Commande : coût $ réel agrégé sur la période `[from, to]` (ms epoch, du sélecteur de plage)
/// depuis les transcripts de session. Table de prix = snapshot courant (embarquée + refresh
/// background). Lecture seule, défensive (vide / hors-Tauri → coût 0, listes vides).
#[tauri::command]
pub fn analytics_cost(from: i64, to: i64) -> Result<AnalyticsCost, String> {
    let pricing = pricing::snapshot();
    match claude_projects_dir() {
        Some(dir) => Ok(scan_projects_cost(&dir, from, to, &pricing)),
        None => Ok(finalize_cost(CostAcc::default(), pricing.priced_at.clone())),
    }
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
#[derive(Default)]
struct DelegAcc {
    uses: HashMap<String, (String, i64)>,
    results: HashMap<String, i64>,
}

/// Intègre UNE ligne JSONL dans l'accumulateur de délégations. PUR/testable. Collecte les
/// `tool_use` de délégation (côté assistant) et les `tool_result` (côté user) par `tool_use_id`.
fn fold_deleg_line(acc: &mut DelegAcc, line: &str) {
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
/// ts de la DÉLÉGATION (use). Tri par nombre de délégations desc puis nom. Durée moyenne sur les
/// seules délégations appariées (result trouvé).
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

/// Scanne un dossier `projects/` et agrège les délégations par agent sur la période. Défensif.
fn scan_projects_deleg(projects_dir: &Path, from: i64, to: i64) -> Vec<AgentDelegations> {
    let mut acc = DelegAcc::default();
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
                if let Ok(content) = std::fs::read_to_string(&p) {
                    for line in content.lines() {
                        fold_deleg_line(&mut acc, line);
                    }
                }
            }
        }
    }
    finalize_deleg(acc, from, to)
}

/// Commande : délégations réelles par agent nommé sur la période `[from, to]` (ms epoch),
/// depuis les transcripts. Comptes + durées (use→result) uniquement — PAS de tokens/$ (pas de
/// source, cf. constat). Lecture seule, défensive (vide / hors-Tauri → liste vide).
#[tauri::command]
pub fn delegations_by_agent(from: i64, to: i64) -> Result<Vec<AgentDelegations>, String> {
    match claude_projects_dir() {
        Some(dir) => Ok(scan_projects_deleg(&dir, from, to)),
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
    fn project_of_gere_les_cwd_windows() {
        // Vieux transcripts Windows : séparateur antislash.
        assert_eq!(project_of(r"C:\iakaVODdash"), Some("iakaVODdash".into()));
        assert_eq!(
            project_of(r"C:\Users\x\work\iaka-demo"),
            Some("iaka-demo".into())
        );
        // Chemin mixte (slash + antislash).
        assert_eq!(project_of(r"/c/work\iaka-demo"), Some("iaka-demo".into()));
        // Séparateur de fin (trailing) ignoré.
        assert_eq!(project_of(r"C:\iakaVODdash\"), Some("iakaVODdash".into()));
        assert_eq!(project_of(r"\a\b\"), Some("b".into()));
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
        fold_cost_line(&mut acc, line, ms + 1, ms + 1000, &pr);
        assert!(acc.by_model.is_empty(), "hors période → ignorée");
        // Période INCLUANT la ligne → comptée.
        fold_cost_line(&mut acc, line, ms - 1000, ms + 1000, &pr);
        assert_eq!(acc.by_model.len(), 1);
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
        );
        // user → ignorée.
        fold_cost_line(
            &mut acc,
            r#"{"type":"user","timestamp":"2026-06-30T10:00:00Z","message":{"content":"x"}}"#,
            0,
            i64::MAX,
            &pr,
        );
        // Que du JSON invalide → ignorée.
        fold_cost_line(&mut acc, "pas du json", 0, i64::MAX, &pr);
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
        );
        fold_deleg_line(
            &mut acc,
            r#"{"type":"user","timestamp":"2026-06-30T10:00:05Z","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"ok"}]}}"#,
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
}
