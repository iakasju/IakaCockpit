//! pricing — table de prix par modèle pour le coût $ réel (L30-P2, volet B).
//!
//! Le transcript ne porte PAS de coût : il porte `message.model` + `message.usage`
//! (4 buckets : input / output / cache_creation / cache_read). Le coût $ se DÉRIVE en
//! multipliant chaque bucket par le prix du modèle. Ce module fournit la table de prix
//! (`$/million de tokens`, 4 postes — le cache change le coût réel).
//!
//! ## Approvisionnement (AR-5)
//! - **Table EMBARQUÉE par défaut** ([`EMBEDDED_PRICES`]) : valeurs publiques courantes
//!   des modèles utilisés. **Valeurs bootstrap, rafraîchies au démarrage — `pricing.json`
//!   autoritaire.** Toujours disponible OFFLINE (fallback inconditionnel).
//! - **Rafraîchissement EN TÂCHE DE FOND au démarrage** ([`spawn_refresh`]) : si une config
//!   `pricing_url` (non sensible) est posée, on télécharge un `pricing.json` (client `ureq`,
//!   comme `ai.rs`/`notify`) et on met à jour la table en cache. **Non bloquant** ; toute
//!   erreur/absence garde l'embarquée. Un `pricing.json` local (cache disque) est relu au
//!   démarrage avant tout réseau. La date de MAJ (`priced_at`) est tracée dans la table.
//!
//! ## Matching de modèle (robuste)
//! Le nom de modèle du transcript varie (`claude-opus-4-8-20251101`, `claude-sonnet-4-5`,
//! `gpt-5-codex`…). On normalise en minuscules puis on prend le **plus long préfixe** de la
//! table qui matche. Les modèles **locaux** (contenant `llama`/`ollama`) coûtent **0 $**
//! (self-hosted). Un modèle absent de la table → `None` (coût non compté + « untariffed »),
//! jamais de coût inventé.

use std::sync::{OnceLock, RwLock};

use serde::Deserialize;

/// Prix d'un modèle en **$/million de tokens**, séparé par bucket de `message.usage`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ModelPrice {
    /// `input_tokens`.
    pub input: f64,
    /// `output_tokens`.
    pub output: f64,
    /// `cache_creation_input_tokens` (écriture de cache).
    pub cache_write: f64,
    /// `cache_read_input_tokens` (lecture de cache — bien moins cher).
    pub cache_read: f64,
}

impl ModelPrice {
    /// Modèle local / self-hosted (llama, ollama…) : gratuit.
    pub const ZERO: ModelPrice = ModelPrice {
        input: 0.0,
        output: 0.0,
        cache_write: 0.0,
        cache_read: 0.0,
    };

    /// Coût $ d'une ligne à partir des 4 buckets de tokens (comptes bruts).
    pub fn cost_of(&self, input: u64, output: u64, cache_write: u64, cache_read: u64) -> f64 {
        let m = 1_000_000.0;
        (input as f64) / m * self.input
            + (output as f64) / m * self.output
            + (cache_write as f64) / m * self.cache_write
            + (cache_read as f64) / m * self.cache_read
    }
}

/// Table de prix EMBARQUÉE par défaut (bootstrap). Clé = **préfixe normalisé** du nom de
/// modèle ; on retient le plus long préfixe qui matche (cf. [`match_price`]).
///
/// ⚠️ **Valeurs bootstrap** (USD / million de tokens, tarifs publics courants début 2026).
/// **Rafraîchies au démarrage depuis `pricing.json` (autoritaire).** Elles servent de repli
/// OFFLINE ; ne pas les considérer comme la source de vérité. Anthropic : cache_write ≈
/// 1,25× input (cache 5 min), cache_read ≈ 0,1× input. OpenAI : pas de coût d'écriture de
/// cache distinct (cache_write = input), cache_read réduit.
pub const EMBEDDED_PRICES: &[(&str, ModelPrice)] = &[
    // --- Anthropic Claude ---
    (
        "claude-opus-4",
        ModelPrice {
            input: 15.0,
            output: 75.0,
            cache_write: 18.75,
            cache_read: 1.5,
        },
    ),
    (
        "claude-opus",
        ModelPrice {
            input: 15.0,
            output: 75.0,
            cache_write: 18.75,
            cache_read: 1.5,
        },
    ),
    (
        "claude-sonnet-4",
        ModelPrice {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.30,
        },
    ),
    (
        "claude-3-7-sonnet",
        ModelPrice {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.30,
        },
    ),
    (
        "claude-3-5-sonnet",
        ModelPrice {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.30,
        },
    ),
    (
        "claude-sonnet",
        ModelPrice {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.30,
        },
    ),
    (
        "claude-3-5-haiku",
        ModelPrice {
            input: 0.80,
            output: 4.0,
            cache_write: 1.0,
            cache_read: 0.08,
        },
    ),
    (
        "claude-3-haiku",
        ModelPrice {
            input: 0.25,
            output: 1.25,
            cache_write: 0.30,
            cache_read: 0.03,
        },
    ),
    (
        "claude-haiku",
        ModelPrice {
            input: 0.80,
            output: 4.0,
            cache_write: 1.0,
            cache_read: 0.08,
        },
    ),
    // --- OpenAI (dont Codex) ---
    (
        "gpt-5-codex",
        ModelPrice {
            input: 1.25,
            output: 10.0,
            cache_write: 1.25,
            cache_read: 0.125,
        },
    ),
    (
        "gpt-5",
        ModelPrice {
            input: 1.25,
            output: 10.0,
            cache_write: 1.25,
            cache_read: 0.125,
        },
    ),
    (
        "gpt-4o-mini",
        ModelPrice {
            input: 0.15,
            output: 0.60,
            cache_write: 0.15,
            cache_read: 0.075,
        },
    ),
    (
        "gpt-4o",
        ModelPrice {
            input: 2.5,
            output: 10.0,
            cache_write: 2.5,
            cache_read: 1.25,
        },
    ),
    (
        "gpt-4.1",
        ModelPrice {
            input: 2.0,
            output: 8.0,
            cache_write: 2.0,
            cache_read: 0.5,
        },
    ),
    (
        "o4-mini",
        ModelPrice {
            input: 1.1,
            output: 4.4,
            cache_write: 1.1,
            cache_read: 0.275,
        },
    ),
    (
        "o3",
        ModelPrice {
            input: 2.0,
            output: 8.0,
            cache_write: 2.0,
            cache_read: 0.5,
        },
    ),
];

/// Un modèle est-il local/self-hosted (donc gratuit) ?
fn is_local_model(normalized: &str) -> bool {
    normalized.contains("llama") || normalized.contains("ollama")
}

/// Normalise un nom de modèle avant matching : minuscules, trim, et **retrait d'un suffixe
/// entre crochets** type `[1m]` (variante contexte long des transcripts sous-agents, ex.
/// `claude-opus-4-8[1m]` → `claude-opus-4-8`). Le suffixe crochet ne participe pas au prix.
pub fn normalize_model(model: &str) -> String {
    let lower = model.trim().to_lowercase();
    match lower.split_once('[') {
        Some((head, _)) => head.trim().to_string(),
        None => lower,
    }
}

/// Résout le prix d'un modèle dans une table `(prefixe, prix)` par **plus long préfixe**.
/// Modèle local → `Some(ZERO)`. Aucun préfixe → `None` (untariffed).
fn match_price(model: &str, table: &[(String, ModelPrice)]) -> Option<ModelPrice> {
    let norm = normalize_model(model);
    if norm.is_empty() {
        return None;
    }
    if is_local_model(&norm) {
        return Some(ModelPrice::ZERO);
    }
    let mut best: Option<(usize, ModelPrice)> = None;
    for (prefix, price) in table {
        if norm.starts_with(prefix.as_str()) {
            let len = prefix.len();
            if best.map(|(l, _)| len > l).unwrap_or(true) {
                best = Some((len, *price));
            }
        }
    }
    best.map(|(_, p)| p)
}

/// État de la table de prix en cache (table effective + date de MAJ). `priced_at` = `None`
/// pour l'embarquée (jamais tarifée par une source externe).
#[derive(Debug, Clone)]
pub struct PricingSnapshot {
    table: Vec<(String, ModelPrice)>,
    /// Date de la dernière MAJ (`pricing.json` `priced_at`), ou `None` si embarquée.
    pub priced_at: Option<String>,
}

impl PricingSnapshot {
    /// Snapshot depuis la table EMBARQUÉE (repli offline).
    fn embedded() -> Self {
        PricingSnapshot {
            table: EMBEDDED_PRICES
                .iter()
                .map(|(k, p)| (k.to_string(), *p))
                .collect(),
            priced_at: None,
        }
    }

    /// Prix d'un modèle (plus long préfixe ; local → 0 ; inconnu → `None`).
    pub fn price_for(&self, model: &str) -> Option<ModelPrice> {
        match_price(model, &self.table)
    }
}

/// Cache process-global de la table (init paresseuse sur l'embarquée). Le rafraîchissement
/// background y écrit ; `analytics_cost` en prend un snapshot cohérent (clone borné).
fn cache() -> &'static RwLock<PricingSnapshot> {
    static C: OnceLock<RwLock<PricingSnapshot>> = OnceLock::new();
    C.get_or_init(|| RwLock::new(PricingSnapshot::embedded()))
}

/// Snapshot cohérent de la table courante (clone sous verrou de lecture). Consommé par
/// `economy::analytics_cost` : un seul clone par scan, pas de contention par ligne.
pub fn snapshot() -> PricingSnapshot {
    cache()
        .read()
        .map(|g| g.clone())
        .unwrap_or_else(|_| PricingSnapshot::embedded())
}

/// Format d'un `pricing.json` autoritaire (téléchargé ou cache local). `models` = map
/// `nom-modèle-ou-préfixe` → prix. Champs de prix optionnels (défaut 0.0 → interprété
/// comme gratuit pour ce poste).
#[derive(Debug, Deserialize)]
struct PricingFile {
    #[serde(default)]
    priced_at: Option<String>,
    #[serde(default)]
    models: std::collections::HashMap<String, PriceEntry>,
}

#[derive(Debug, Deserialize)]
struct PriceEntry {
    #[serde(default)]
    input: f64,
    #[serde(default)]
    output: f64,
    #[serde(default)]
    cache_write: f64,
    #[serde(default)]
    cache_read: f64,
}

/// Parse un `pricing.json` en snapshot. `None` si JSON invalide ou aucun modèle (défensif :
/// on garde alors l'embarquée). Les clés sont normalisées en minuscules (matching préfixe).
fn parse_pricing_json(body: &str) -> Option<PricingSnapshot> {
    let file: PricingFile = serde_json::from_str(body).ok()?;
    if file.models.is_empty() {
        return None;
    }
    let table: Vec<(String, ModelPrice)> = file
        .models
        .into_iter()
        .map(|(k, e)| {
            (
                k.trim().to_lowercase(),
                ModelPrice {
                    input: e.input,
                    output: e.output,
                    cache_write: e.cache_write,
                    cache_read: e.cache_read,
                },
            )
        })
        .collect();
    Some(PricingSnapshot {
        table,
        priced_at: file.priced_at,
    })
}

/// Écrit un snapshot dans le cache global (remplace la table). Best-effort (verrou empoisonné
/// → ignoré). Le refresh l'appelle après un parse réussi.
fn install(snapshot: PricingSnapshot) {
    if let Ok(mut g) = cache().write() {
        *g = snapshot;
    }
}

/// Timeout borné du téléchargement du `pricing.json` (non bloquant — thread de fond).
const PRICING_HTTP_TIMEOUT_SECS: u64 = 10;

/// Télécharge et installe un `pricing.json` depuis `url` (client `ureq`, comme `ai.rs`).
/// Retourne `true` si la table a été mise à jour. Défensif : toute erreur → `false` (on
/// garde ce qui est déjà en cache). AUCUN secret, aucune écriture disque ici.
fn refresh_from_url(url: &str) -> bool {
    if url.trim().is_empty() {
        return false;
    }
    let resp = match ureq::get(url.trim())
        .timeout(std::time::Duration::from_secs(PRICING_HTTP_TIMEOUT_SECS))
        .call()
    {
        Ok(r) => r,
        Err(_) => return false,
    };
    let body = match resp.into_string() {
        Ok(b) => b,
        Err(_) => return false,
    };
    match parse_pricing_json(&body) {
        Some(snap) => {
            install(snap);
            true
        }
        None => false,
    }
}

/// Charge un `pricing.json` LOCAL (cache disque) s'il existe, et l'installe. `true` si
/// installé. Best-effort : absent/illisible/invalide → `false` (embarquée conservée).
fn refresh_from_local(path: &std::path::Path) -> bool {
    let body = match std::fs::read_to_string(path) {
        Ok(b) => b,
        Err(_) => return false,
    };
    match parse_pricing_json(&body) {
        Some(snap) => {
            install(snap);
            true
        }
        None => false,
    }
}

/// Rafraîchit la table de prix EN TÂCHE DE FOND au démarrage (non bloquant). Spawn un thread
/// qui : (1) relit un `pricing.json` local (cache disque) s'il existe ; (2) si `pricing_url`
/// est configurée, télécharge la version autoritaire, l'installe ET l'écrit dans le cache
/// disque pour le prochain démarrage OFFLINE. Toute erreur/absence garde l'embarquée. NE
/// BLOQUE JAMAIS le démarrage (thread détaché) ; aucune panique ne remonte.
///
/// `pricing_url` est lue depuis la config non sensible (module `config`). `cache_path` = où
/// écrire/relire le `pricing.json` (typiquement `<app_data_dir>/pricing.json`).
pub fn spawn_refresh(pricing_url: Option<String>, cache_path: Option<std::path::PathBuf>) {
    std::thread::spawn(move || {
        // 1. Repli disque immédiat (rapide, offline) avant tout réseau.
        if let Some(ref p) = cache_path {
            let _ = refresh_from_local(p);
        }
        // 2. Version autoritaire (réseau, bornée). Succès → réécrit le cache disque.
        if let Some(url) = pricing_url {
            if refresh_from_url(&url) {
                if let Some(ref p) = cache_path {
                    let snap = snapshot();
                    // On ré-écrit un JSON minimal (uniquement pour le prochain démarrage
                    // offline) — best-effort, on ne casse rien si l'écriture échoue.
                    if let Ok(json) = serialize_snapshot(&snap) {
                        let _ = std::fs::write(p, json);
                    }
                }
            }
        }
    });
}

/// Sérialise un snapshot en `pricing.json` (pour le cache disque). Format symétrique de
/// [`parse_pricing_json`].
fn serialize_snapshot(snap: &PricingSnapshot) -> Result<String, serde_json::Error> {
    let mut models = serde_json::Map::new();
    for (k, p) in &snap.table {
        models.insert(
            k.clone(),
            serde_json::json!({
                "input": p.input,
                "output": p.output,
                "cache_write": p.cache_write,
                "cache_read": p.cache_read,
            }),
        );
    }
    let root = serde_json::json!({
        "priced_at": snap.priced_at,
        "models": serde_json::Value::Object(models),
    });
    serde_json::to_string_pretty(&root)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn table() -> Vec<(String, ModelPrice)> {
        EMBEDDED_PRICES
            .iter()
            .map(|(k, p)| (k.to_string(), *p))
            .collect()
    }

    #[test]
    fn cost_of_ventile_les_quatre_buckets() {
        let p = ModelPrice {
            input: 3.0,
            output: 15.0,
            cache_write: 3.75,
            cache_read: 0.30,
        };
        // 1M input @3 + 1M output @15 + 1M cw @3.75 + 1M cr @0.30 = 22.05
        let c = p.cost_of(1_000_000, 1_000_000, 1_000_000, 1_000_000);
        assert!((c - 22.05).abs() < 1e-9, "coût = {c}");
        // La séparation compte : 2M de cache_read ne coûtent QUE 0.60 (pas le prix input).
        let c2 = p.cost_of(0, 0, 0, 2_000_000);
        assert!((c2 - 0.60).abs() < 1e-9, "cache_read = {c2}");
    }

    #[test]
    fn match_prend_le_plus_long_prefixe() {
        let t = table();
        // opus-4-8 → tarif opus-4 (plus long préfixe que "claude-opus").
        let p = match_price("claude-opus-4-8-20251101", &t).unwrap();
        assert_eq!(p.output, 75.0);
        let s = match_price("claude-sonnet-4-5-20250929", &t).unwrap();
        assert_eq!(s.output, 15.0);
        assert_eq!(s.input, 3.0);
    }

    #[test]
    fn normalise_le_suffixe_entre_crochets() {
        // `[1m]` (contexte long des sous-agents) est retiré avant le prix.
        assert_eq!(normalize_model("claude-opus-4-8[1m]"), "claude-opus-4-8");
        assert_eq!(normalize_model("  GPT-5-Codex  "), "gpt-5-codex");
        assert_eq!(normalize_model("claude-sonnet-4-5"), "claude-sonnet-4-5");
        // Le prix se résout malgré le suffixe crochet.
        let t = table();
        let p = match_price("claude-opus-4-8[1m]", &t).unwrap();
        assert_eq!(p.output, 75.0);
    }

    #[test]
    fn modele_local_est_gratuit() {
        let t = table();
        assert_eq!(match_price("llama3.1:8b", &t), Some(ModelPrice::ZERO));
        assert_eq!(match_price("ollama/qwen2.5", &t), Some(ModelPrice::ZERO));
        // Prix explicitement à zéro (pas de coût compté).
        let c = match_price("llama3.1:8b", &t)
            .unwrap()
            .cost_of(9_999, 9_999, 0, 0);
        assert_eq!(c, 0.0);
    }

    #[test]
    fn modele_inconnu_est_untariffed_none() {
        let t = table();
        assert_eq!(match_price("mistral-large-2411", &t), None);
        assert_eq!(match_price("", &t), None);
        assert_eq!(match_price("   ", &t), None);
    }

    #[test]
    fn codex_gpt5_est_tarife() {
        let t = table();
        let p = match_price("gpt-5-codex", &t).unwrap();
        assert_eq!(p.input, 1.25);
        assert_eq!(p.output, 10.0);
    }

    #[test]
    fn parse_pricing_json_remplace_la_table() {
        let json = r#"{
            "priced_at": "2026-07-13",
            "models": {
                "claude-opus-4": { "input": 20, "output": 100, "cache_write": 25, "cache_read": 2 },
                "gpt-5": { "input": 1, "output": 8 }
            }
        }"#;
        let snap = parse_pricing_json(json).unwrap();
        assert_eq!(snap.priced_at.as_deref(), Some("2026-07-13"));
        let p = snap.price_for("claude-opus-4-8").unwrap();
        assert_eq!(p.output, 100.0);
        // Champs de prix absents → 0.0 (poste gratuit), jamais d'erreur.
        let g = snap.price_for("gpt-5-codex").unwrap();
        assert_eq!(g.cache_read, 0.0);
    }

    #[test]
    fn parse_pricing_json_invalide_ou_vide_donne_none() {
        assert!(parse_pricing_json("pas du json").is_none());
        assert!(parse_pricing_json(r#"{"models":{}}"#).is_none());
    }

    #[test]
    fn snapshot_par_defaut_est_l_embarquee_sans_date() {
        let snap = PricingSnapshot::embedded();
        assert!(snap.priced_at.is_none());
        assert!(snap.price_for("claude-sonnet-4-5").is_some());
    }

    #[test]
    fn serialize_puis_parse_roundtrip() {
        let snap = PricingSnapshot {
            table: vec![(
                "claude-opus-4".to_string(),
                ModelPrice {
                    input: 15.0,
                    output: 75.0,
                    cache_write: 18.75,
                    cache_read: 1.5,
                },
            )],
            priced_at: Some("2026-07-13".to_string()),
        };
        let json = serialize_snapshot(&snap).unwrap();
        let back = parse_pricing_json(&json).unwrap();
        assert_eq!(back.priced_at.as_deref(), Some("2026-07-13"));
        assert_eq!(back.price_for("claude-opus-4-8").unwrap().input, 15.0);
    }
}
