//! ai — moteur « prochaine étape » (L3).
//!
//! UN endpoint OpenAI-compat **configurable**, UN appel `POST /chat/completions`.
//! « On câble, on ne route pas » (R4) : aucun `match provider`, aucun `cmd /C`,
//! aucune URL Ollama/Claude en dur, aucun second client HTTP. La cible (LiteLLM
//! LAN recommandé, Ollama localhost/LAN, ou cloud OpenAI-compat) est choisie par
//! **config** (`litellm_endpoint` + `litellm_model`), pas par code.
//!
//! Logique salvagée d'`iakaIDE/src-tauri/src/ai.rs` (F2) **réécrite propre** sur le
//! socle L0/L1 :
//!   - `build_context(path)` : assemble nom + extraits specs + git, avec en plus la
//!     **validation `pathguard`** que iakaIDE n'avait pas (D3) ;
//!   - `build_prompt(ctx)` : prompt système **conscient de la méthode iakaframe**
//!     (D3-bis / A4 — texte à confirmer par Stéphane) ;
//!   - **un seul** appel `/chat/completions` (D1) + parsing `choices[0].message`
//!     + `usage` ;
//!   - **mock dev** déterministe sans réseau (D5 / A2) ;
//!   - **dégradation propre** : tout chemin d'erreur renvoie `Err(String)` lisible
//!     (D6), jamais de panique.
//!
//! La **clé IA est optionnelle** et vit au keychain (module `secrets` L0, account
//! neutre `ai_api_key`) : jamais en SQLite, jamais renvoyée au front. L'en-tête
//! `Authorization` est **omis** quand aucune clé n'est enregistrée (cas Ollama local).

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Serialize;
use tauri::AppHandle;

use crate::config::{self, KEY_LITELLM_ENDPOINT};
use crate::db;
use crate::git;
use crate::pathguard;
use crate::secrets::{KeyringStore, SecretStore};

/// Clé de config non sensible : modèle/alias transmis tel quel à l'endpoint (D4).
pub const KEY_LITELLM_MODEL: &str = "litellm_model";

/// Service keychain (cohérent avec le reste de l'app).
pub const SECRET_SERVICE: &str = "iakacockpit";
/// Account keychain **neutre** : la clé sert LiteLLM `master_key` OU une clé cloud
/// (D4). Un Ollama localhost/LAN n'en a pas besoin.
pub const SECRET_ACCOUNT: &str = "ai_api_key";

/// Modèle/alias Ollama self-hosted **par défaut** (A1 — défaut self-hosted, sans
/// clé). **Valeur à confirmer par Stéphane** : doit correspondre à un modèle
/// réellement disponible côté box/localhost. Changer de cible (LiteLLM/cloud) =
/// simple changement de config, sans toucher au code.
pub const DEFAULT_MODEL: &str = "llama3.1:8b";

/// Variable d'environnement forçant le mode mock (A2, bascule implicite).
const ENV_MOCK_FLAG: &str = "IAKACOCKPIT_AI_MOCK";

/// Timeout borné de l'appel réseau (D6). Un modèle local peut être lent au premier
/// chargement → marge confortable, mais fini (jamais d'attente infinie).
const HTTP_TIMEOUT_SECS: u64 = 180;

/// Réponse du moteur, sérialisée vers le front (miroir TS `NextStep`, snake_case).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct NextStep {
    /// Suggestion lisible (3-5 lignes).
    pub suggestion: String,
    /// `"litellm"` (endpoint réel configuré) | `"mock"` (simulé, sans réseau).
    pub provider: String,
    /// Modèle effectif (`litellm_model`), pour affichage.
    pub model: Option<String>,
    /// `usage.prompt_tokens` si présent.
    pub tokens_in: Option<u32>,
    /// `usage.completion_tokens` si présent.
    pub tokens_out: Option<u32>,
}

/// Tronque un texte à `max` caractères (suffixe explicite). Salvage d'`ai.rs`.
fn head(txt: &str, max: usize) -> String {
    if txt.chars().count() <= max {
        txt.to_string()
    } else {
        txt.chars().take(max).collect::<String>() + "\n…(tronqué)"
    }
}

/// Valide le `path` projet avant toute lecture FS (D3 / R-L3-4).
///
/// Le `path` reçu du front est un chemin **absolu** de projet (issu du portfolio).
/// On exige qu'il soit un **dossier existant** ; on durcit ensuite l'accès FS via
/// `pathguard` en n'ouvrant que des sous-chemins relatifs validés sous ce dossier
/// (`specs/PROJET.md`, `specs/etat-des-lieux.md`) — jamais de remontée `..`.
fn validate_project_dir(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);
    if path.trim().is_empty() {
        return Err("chemin de projet vide".to_string());
    }
    if !p.is_dir() {
        return Err(format!("Projet introuvable : {}", p.display()));
    }
    Ok(p.to_path_buf())
}

/// Lit un fichier de specs sous le dossier projet, **chemin validé `pathguard`**.
/// Fichier absent / illisible → texte de remplacement (jamais d'échec, D3).
fn read_spec(base: &Path, rel: &str, fallback: &str) -> String {
    match pathguard::safe_path(base, Path::new(rel)) {
        Ok(full) => std::fs::read_to_string(full)
            .map(|t| head(&t, 2500))
            .unwrap_or_else(|_| fallback.to_string()),
        // Un `rel` codé en dur ici ne peut pas s'évader ; cette branche est une
        // garde défensive (jamais d'échec → fallback).
        Err(_) => fallback.to_string(),
    }
}

/// Assemble le contexte borné (RAG ANNULÉ, § 10.3) : nom + extraits specs + git.
/// Salvage de la logique `ai.rs`, **avec validation de chemin** ajoutée (D3).
fn build_context(base: &Path) -> String {
    let name = base
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let projet = read_spec(base, "specs/PROJET.md", "(pas de specs/PROJET.md)");
    let etat = read_spec(base, "specs/etat-des-lieux.md", "(pas d'état des lieux)");

    let branch = git::capture(base, &["rev-parse", "--abbrev-ref", "HEAD"]).unwrap_or_default();
    let status = git::capture(base, &["status", "--short"]).unwrap_or_default();
    let log = git::capture(base, &["log", "-5", "--format=%cs %s"]).unwrap_or_default();

    format!(
        "# Projet : {name}\n\n## PROJET.md (extrait)\n{projet}\n\n\
## État des lieux (extrait)\n{etat}\n\n## Git\nbranche: {branch}\nstatus:\n{status}\n\n\
derniers commits:\n{log}\n"
    )
}

/// Prompt système **conscient de la méthode iakaframe** (D3-bis / A4).
///
/// ⚠️ **Texte proposé par Gimli — à valider/ajuster par Stéphane.** Mobilise le
/// vocabulaire de la méthode (lots L0/L1…, jalons & gates Gandalf→Gimli→Legolas,
/// instructions `specs/instructions/`, état des lieux, état git) pour une suggestion
/// directement exploitable dans le cycle iakaframe.
fn build_prompt(ctx: &str) -> String {
    format!(
        "Tu es l'assistant de pilotage de projet d'IakaCockpit, conscient de la méthode \
de travail iakaframe. Cette méthode avance par LOTS numérotés (L0, L1, L2…), chacun \
cadré par une INSTRUCTION écrite dans specs/instructions/ (rôle Gandalf — cadrage), \
implémenté par commits atomiques (rôle Gimli — développement), puis validé par un GATE \
indépendant (rôle Legolas — tests/lint/typage, verdict pass/fail) avant tout JALON. \
L'état réel du projet est donné ci-dessous : extraits de specs/PROJET.md (vision) et de \
specs/etat-des-lieux.md, plus l'état git (branche, fichiers modifiés, derniers commits).\n\n\
À partir de cet état, propose LA prochaine étape concrète, actionnable et priorisée \
(3 à 5 lignes, en français, sans préambule ni formule de politesse). Formule-la dans le \
vocabulaire de la méthode : quelle prochaine instruction rédiger, quel lot cadrer ou \
implémenter, quel jalon faire valider au gate. Si l'arbre git est sale ou en avance sur \
la remote, dis-le explicitement et propose de le traiter. Voici l'état du projet :\n\n{ctx}"
    )
}

/// Construit la `NextStep` mockée : déterministe, sans réseau (D5 / A2).
fn mock_next_step(base: &Path, model: Option<String>) -> NextStep {
    let name = base
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "projet".to_string());
    let branch = git::capture(base, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|| "(hors git)".to_string());
    let dirty = git::capture(base, &["status", "--short"])
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let etat_git = if dirty {
        "l'arbre git est SALE (changements non commités)"
    } else {
        "l'arbre git est propre"
    };
    let suggestion = format!(
        "[MOCK — suggestion simulée, aucun appel réseau]\n\
Projet « {name} » sur la branche « {branch} » : {etat_git}.\n\
1. Rédiger l'instruction du prochain lot dans specs/instructions/ (cadrage Gandalf).\n\
2. Implémenter par commits atomiques (conventional commits), puis lancer la chaîne qualité.\n\
3. Soumettre le résultat au gate Legolas avant de marquer le jalon.\n\
(Configure un endpoint IA dans Réglages pour des suggestions réelles.)"
    );
    NextStep {
        suggestion,
        provider: "mock".to_string(),
        model,
        tokens_in: None,
        tokens_out: None,
    }
}

/// Décide si l'on bascule en mock (A2, bascule implicite) : flag d'env OU endpoint
/// vide/non configuré.
fn should_mock(endpoint: &str) -> bool {
    if std::env::var(ENV_MOCK_FLAG)
        .map(|v| v == "1")
        .unwrap_or(false)
    {
        return true;
    }
    endpoint.trim().is_empty()
}

/// Parse la réponse OpenAI-compat. Salvage défensif (R-L3-6) : `Option` partout,
/// message lisible si JSON inattendu / vide.
fn parse_chat_completion(body: &str, model: Option<String>) -> Result<NextStep, String> {
    let v: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("réponse IA illisible (JSON) : {e}"))?;
    let suggestion = v["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if suggestion.is_empty() {
        return Err("l'endpoint IA n'a renvoyé aucune suggestion (réponse vide)".to_string());
    }
    Ok(NextStep {
        suggestion,
        provider: "litellm".to_string(),
        model,
        tokens_in: v["usage"]["prompt_tokens"].as_u64().map(|x| x as u32),
        tokens_out: v["usage"]["completion_tokens"].as_u64().map(|x| x as u32),
    })
}

/// UN appel `POST {endpoint}/chat/completions` (OpenAI-compat). Endpoint
/// indifférent (LiteLLM/Ollama/cloud). En-tête `Authorization` **omis** sans clé.
fn call_endpoint(
    endpoint: &str,
    model: &str,
    api_key: Option<&str>,
    system: &str,
    user: &str,
) -> Result<NextStep, String> {
    let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));
    let payload = ureq::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user },
        ],
        "stream": false,
    });

    let mut req = ureq::post(&url).timeout(Duration::from_secs(HTTP_TIMEOUT_SECS));
    if let Some(key) = api_key {
        req = req.set("Authorization", &format!("Bearer {key}"));
    }

    let resp = req
        .send_json(payload)
        .map_err(|e| format!("endpoint IA injoignable : {e}"))?;
    let body = resp
        .into_string()
        .map_err(|e| format!("lecture de la réponse IA impossible : {e}"))?;
    parse_chat_completion(&body, Some(model.to_string()))
}

/// Lit la clé IA optionnelle au keychain (interne Rust uniquement, jamais front).
fn read_api_key(store: &dyn SecretStore) -> Option<String> {
    store
        .get_secret(SECRET_SERVICE, SECRET_ACCOUNT)
        .ok()
        .flatten()
        .filter(|k| !k.trim().is_empty())
}

// --- Commandes Tauri ---

/// Moteur « prochaine étape » sur le projet `path`. UN endpoint, UN appel
/// (D1). Mock si endpoint vide / flag dev (A2). Dégrade proprement (D6).
#[tauri::command]
pub fn next_step(app: AppHandle, path: String) -> Result<NextStep, String> {
    let base = validate_project_dir(&path)?;

    let conn = db::open(&app)?;
    let endpoint = config::get(&conn, KEY_LITELLM_ENDPOINT)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let model = config::get(&conn, KEY_LITELLM_MODEL)
        .map_err(|e| e.to_string())?
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    if should_mock(&endpoint) {
        return Ok(mock_next_step(&base, Some(model)));
    }

    let store = KeyringStore::new();
    let api_key = read_api_key(&store);

    // Séparation system/user : le message *system* porte les consignes de méthode,
    // le message *user* porte l'état réel assemblé du projet (contexte borné).
    let ctx = build_context(&base);
    let system = build_prompt("(le contexte du projet est fourni dans le message utilisateur)");
    call_endpoint(&endpoint, &model, api_key.as_deref(), &system, &ctx)
}

/// Écrit la clé IA au keychain (write-only côté front, D4). Jamais de lecture
/// clé→front. Une valeur vide **supprime** la clé (UX « retirer la clé »).
#[tauri::command]
pub fn ai_set_key(value: String) -> Result<(), String> {
    let store = KeyringStore::new();
    if value.trim().is_empty() {
        return store
            .delete_secret(SECRET_SERVICE, SECRET_ACCOUNT)
            .map_err(|e| e.to_string());
    }
    store
        .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, &value)
        .map_err(|e| e.to_string())
}

/// Indique si une clé IA est enregistrée (présence seule, **jamais** la valeur).
#[tauri::command]
pub fn ai_has_key() -> Result<bool, String> {
    let store = KeyringStore::new();
    Ok(read_api_key(&store).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;
    use std::fs;

    // --- Mock store (réplique du contrat secrets, pour le cloisonnement clé) ---

    #[derive(Default)]
    struct MockStore {
        map: RefCell<HashMap<(String, String), String>>,
    }
    impl SecretStore for MockStore {
        fn set_secret(&self, s: &str, a: &str, v: &str) -> Result<(), crate::secrets::SecretError> {
            self.map
                .borrow_mut()
                .insert((s.to_string(), a.to_string()), v.to_string());
            Ok(())
        }
        fn get_secret(
            &self,
            s: &str,
            a: &str,
        ) -> Result<Option<String>, crate::secrets::SecretError> {
            Ok(self
                .map
                .borrow()
                .get(&(s.to_string(), a.to_string()))
                .cloned())
        }
        fn delete_secret(&self, s: &str, a: &str) -> Result<(), crate::secrets::SecretError> {
            self.map
                .borrow_mut()
                .remove(&(s.to_string(), a.to_string()));
            Ok(())
        }
    }

    fn tmp_dir(name: &str) -> PathBuf {
        let mut d = std::env::temp_dir();
        d.push(format!("iakacockpit_l3_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    // --- head / troncature ---

    #[test]
    fn head_ne_tronque_pas_sous_le_cap() {
        assert_eq!(head("abc", 10), "abc");
    }

    #[test]
    fn head_tronque_au_dela_du_cap() {
        let out = head("abcdef", 3);
        assert!(out.starts_with("abc"));
        assert!(out.contains("(tronqué)"));
    }

    // --- validation de path (D3 / R-L3-4) ---

    #[test]
    fn validate_rejette_chemin_vide() {
        assert!(validate_project_dir("").is_err());
        assert!(validate_project_dir("   ").is_err());
    }

    #[test]
    fn validate_rejette_chemin_inexistant() {
        assert!(validate_project_dir("/nexiste/vraiment/pas/ici_l3").is_err());
    }

    #[test]
    fn validate_accepte_un_dossier_reel() {
        let d = tmp_dir("validate");
        assert!(validate_project_dir(d.to_str().unwrap()).is_ok());
        let _ = fs::remove_dir_all(&d);
    }

    // --- build_context (D3) ---

    #[test]
    fn build_context_fichiers_absents_donne_textes_de_remplacement() {
        let d = tmp_dir("ctx_absent");
        let ctx = build_context(&d);
        assert!(ctx.contains("(pas de specs/PROJET.md)"));
        assert!(ctx.contains("(pas d'état des lieux)"));
        assert!(ctx.contains("# Projet :"));
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn build_context_lit_les_specs_presentes() {
        let d = tmp_dir("ctx_present");
        fs::create_dir_all(d.join("specs")).unwrap();
        fs::write(d.join("specs/PROJET.md"), "VISION DU PROJET").unwrap();
        fs::write(d.join("specs/etat-des-lieux.md"), "ETAT ACTUEL").unwrap();
        let ctx = build_context(&d);
        assert!(ctx.contains("VISION DU PROJET"));
        assert!(ctx.contains("ETAT ACTUEL"));
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn build_context_tronque_les_specs_longues() {
        let d = tmp_dir("ctx_long");
        fs::create_dir_all(d.join("specs")).unwrap();
        let long = "x".repeat(5000);
        fs::write(d.join("specs/PROJET.md"), &long).unwrap();
        let ctx = build_context(&d);
        assert!(ctx.contains("(tronqué)"));
        let _ = fs::remove_dir_all(&d);
    }

    // --- build_prompt (D3-bis / A4) ---

    #[test]
    fn build_prompt_non_vide_et_oriente_prochaine_etape() {
        let p = build_prompt("CONTEXTE");
        assert!(!p.is_empty());
        assert!(p.to_lowercase().contains("prochaine étape"));
        assert!(p.contains("CONTEXTE"));
    }

    #[test]
    fn build_prompt_conscient_de_la_methode_iakaframe() {
        let p = build_prompt("ctx");
        // Mobilise le vocabulaire de la méthode (lots, instructions, gate).
        assert!(p.to_lowercase().contains("lot"));
        assert!(p.contains("specs/instructions/"));
        assert!(p.to_lowercase().contains("gate"));
    }

    // --- mock (D5 / A2) ---

    #[test]
    fn should_mock_si_endpoint_vide() {
        assert!(should_mock(""));
        assert!(should_mock("   "));
    }

    #[test]
    fn should_mock_faux_si_endpoint_present() {
        // (le flag d'env n'est pas posé dans ce test)
        assert!(!should_mock("http://localhost:4000"));
    }

    #[test]
    fn mock_next_step_est_deterministe_et_marque_mock() {
        let d = tmp_dir("mock");
        let ns = mock_next_step(&d, Some("m".into()));
        assert_eq!(ns.provider, "mock");
        assert!(ns.suggestion.contains("MOCK"));
        assert_eq!(ns.tokens_in, None);
        // Déterminisme : deux appels identiques → même suggestion.
        let ns2 = mock_next_step(&d, Some("m".into()));
        assert_eq!(ns.suggestion, ns2.suggestion);
        let _ = fs::remove_dir_all(&d);
    }

    // --- parsing OpenAI-compat (R-L3-6) ---

    #[test]
    fn parse_extrait_content_et_usage() {
        let body = r#"{
            "choices": [{ "message": { "content": "Fais X puis Y." } }],
            "usage": { "prompt_tokens": 120, "completion_tokens": 45 }
        }"#;
        let ns = parse_chat_completion(body, Some("modele".into())).unwrap();
        assert_eq!(ns.suggestion, "Fais X puis Y.");
        assert_eq!(ns.provider, "litellm");
        assert_eq!(ns.model.as_deref(), Some("modele"));
        assert_eq!(ns.tokens_in, Some(120));
        assert_eq!(ns.tokens_out, Some(45));
    }

    #[test]
    fn parse_usage_absent_donne_none() {
        let body = r#"{ "choices": [{ "message": { "content": "OK" } }] }"#;
        let ns = parse_chat_completion(body, None).unwrap();
        assert_eq!(ns.suggestion, "OK");
        assert_eq!(ns.tokens_in, None);
        assert_eq!(ns.tokens_out, None);
    }

    #[test]
    fn parse_reponse_vide_donne_erreur_lisible() {
        let body = r#"{ "choices": [{ "message": { "content": "" } }] }"#;
        let err = parse_chat_completion(body, None).unwrap_err();
        assert!(err.contains("aucune suggestion"));
    }

    #[test]
    fn parse_json_invalide_donne_erreur_lisible() {
        let err = parse_chat_completion("pas du json", None).unwrap_err();
        assert!(err.contains("illisible"));
    }

    // --- cloisonnement clé (D4 / R-L3-2) ---

    #[test]
    fn read_api_key_reflete_presence_et_absence() {
        let store = MockStore::default();
        assert_eq!(read_api_key(&store), None);
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, "sk-secret")
            .unwrap();
        assert_eq!(read_api_key(&store), Some("sk-secret".to_string()));
        // Vide → considéré absent (Authorization omis).
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, "  ")
            .unwrap();
        assert_eq!(read_api_key(&store), None);
    }

    #[test]
    fn account_keychain_est_neutre_pas_litellm_exclusif() {
        assert_eq!(SECRET_ACCOUNT, "ai_api_key");
        assert!(!SECRET_ACCOUNT.contains("litellm"));
    }

    // --- garde anti-routage (R-L3-1) : la clé de config modèle reste non sensible ---

    #[test]
    fn cle_modele_n_est_pas_un_secret() {
        // `litellm_model` ne doit pas matcher le filtre `key|token|secret|password`
        // (sinon `config_all` le masquerait). On reproduit le test côté config.
        let k = KEY_LITELLM_MODEL.to_lowercase();
        assert!(
            !(k.contains("token")
                || k.contains("key")
                || k.contains("secret")
                || k.contains("password"))
        );
    }
}
