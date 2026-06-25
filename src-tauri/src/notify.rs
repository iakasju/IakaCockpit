//! notify — canal « adresse » SORTANT via passerelle n8n (L6).
//!
//! **PHASE 1 = SORTANT uniquement.** UN seul `POST {n8n_webhook_url}` (Content-Type
//! `application/json`) vers un **webhook n8n** configurable. **n8n route** ensuite vers
//! le support actif (Discord / Slack / MQTT). Le Cockpit **n'implémente AUCUN support
//! nativement** : il POSTe un payload **canal-agnostique** `{canal, support, cible,
//! message, meta}` et n8n diffuse. Même patron que L3 (un endpoint LiteLLM qui route les
//! modèles) : « on câble, on ne route pas ». **Aucun secret de support** (Discord/Slack/
//! MQTT) dans le Cockpit : ils restent dans n8n.
//!
//! Patron **calqué sur `ai.rs` (L3)** : même `ureq` (déjà présent, http LAN sans TLS),
//! même parsing défensif, même dégradation `Err(String)` lisible (jamais de panique),
//! même bascule mock par flag d'env / config vide. Et **calqué sur `maincourante.rs`
//! (L4)** pour le cloisonnement keychain : token webhook write-only (présence seule
//! exposée), config non sensible en SQLite.
//!
//! L'ack du Cockpit = **HTTP 2xx** (« n8n a reçu et va router »), **PAS** « le message
//! est arrivé sur Discord/Slack/MQTT » (la diffusion réelle est asynchrone côté n8n,
//! hors visibilité du Cockpit en phase 1).
//!
//! Le champ `canal` est porté **explicitement** (toujours `"adresse"` ici) pour que
//! geste/pensée réutilisent la **même** passerelle plus tard sans rouvrir le contrat :
//! le champ existe, seul `adresse` est implémenté/testé (frontière § Périmètre exclu).

use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

use crate::config;
use crate::db;
use crate::secrets::{KeyringStore, SecretStore};

/// Clé de config non sensible : URL HTTP du webhook n8n (D3). Défaut **vide** → mock.
pub const KEY_N8N_WEBHOOK_URL: &str = "n8n_webhook_url";
/// Clé de config non sensible : support actif choisi côté Cockpit (D2).
pub const KEY_N8N_ACTIVE_SUPPORT: &str = "n8n_active_support";

/// Support actif **par défaut** (D2) si non configuré. Reproductible/ajustable en UI.
pub const DEFAULT_SUPPORT: &str = "slack";

/// Service keychain (cohérent avec le reste de l'app, cf. L3/L4).
pub const SECRET_SERVICE: &str = "iakacockpit";
/// Account keychain **neutre** pour le token (optionnel) du webhook n8n (D3).
pub const SECRET_ACCOUNT_TOKEN: &str = "n8n_webhook_token";

/// En-tête d'auth du webhook n8n (Header Auth n8n, D3). Token statique attendu côté n8n.
pub const AUTH_HEADER: &str = "X-API-Key";

/// Variable d'environnement forçant le mode mock (calque `ai.rs` / `maincourante.rs`).
const ENV_MOCK_FLAG: &str = "IAKACOCKPIT_NOTIFY_MOCK";

/// Timeout borné de l'appel réseau (D5). LAN rapide → marge courte mais finie.
const HTTP_TIMEOUT_SECS: u64 = 15;

/// Ack renvoyé au front (miroir TS `NotifyAck`, snake_case — aucun `rename` Rust).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct NotifyAck {
    /// `true` = pris en charge (HTTP 2xx réel, ou mock). Toujours `true` ici : tout
    /// chemin d'échec renvoie `Err(String)` (jamais un ack `ok:false`).
    pub ok: bool,
    /// `"n8n"` (POST réel ack 2xx) | `"mock"` (simulé, sans réseau).
    pub provider: String,
    /// Code HTTP de l'ack n8n si POST réel ; `None` en mock.
    pub http_status: Option<u16>,
}

/// Construit le payload canal-agnostique Cockpit→n8n (D1). **Fonction pure testée.**
///
/// `canal` est **toujours** `"adresse"` (frontière de ce lot). `support` est porté tel
/// quel (D2 : le Cockpit choisit). `cible` est une chaîne **opaque** transmise telle
/// quelle ; vide → champ omis (n8n applique sa cible par défaut). `meta` est forwardée
/// telle quelle si fournie (objet JSON), sinon `{}`.
///
/// Refus `message` vide géré **en amont** (par l'appelant) avant tout réseau (D1) — la
/// construction elle-même n'effectue pas ce refus pour rester pure/réutilisable.
fn build_payload(message: &str, support: &str, cible: Option<&str>, meta: Option<Value>) -> Value {
    let mut obj = serde_json::Map::new();
    obj.insert("canal".to_string(), Value::String("adresse".to_string()));
    obj.insert("support".to_string(), Value::String(support.to_string()));
    if let Some(c) = cible.filter(|s| !s.trim().is_empty()) {
        obj.insert("cible".to_string(), Value::String(c.to_string()));
    }
    obj.insert("message".to_string(), Value::String(message.to_string()));
    obj.insert(
        "meta".to_string(),
        meta.unwrap_or_else(|| Value::Object(serde_json::Map::new())),
    );
    Value::Object(obj)
}

/// Décide si l'on bascule en mock (D5) : flag d'env OU URL webhook vide.
fn should_mock(url: &str) -> bool {
    if std::env::var(ENV_MOCK_FLAG)
        .map(|v| v == "1")
        .unwrap_or(false)
    {
        return true;
    }
    url.trim().is_empty()
}

/// Lit le token (optionnel) du webhook au keychain. `None` si absent/vide. Interne
/// Rust uniquement — **jamais** renvoyé au front (D3/D6). Calque `read_api_key` (L3).
fn read_token(store: &dyn SecretStore) -> Option<String> {
    store
        .get_secret(SECRET_SERVICE, SECRET_ACCOUNT_TOKEN)
        .ok()
        .flatten()
        .filter(|t| !t.trim().is_empty())
}

/// Ack mocké déterministe (D5) : aucun réseau, écho de provider. Le payload construit
/// est passé pour cohérence d'API (et future trace), pas modifié.
fn mock_ack(_payload: &Value) -> NotifyAck {
    NotifyAck {
        ok: true,
        provider: "mock".to_string(),
        http_status: None,
    }
}

/// Tronque un corps de réponse pour un message d'erreur lisible (jamais un pavé).
fn head(txt: &str, max: usize) -> String {
    let t = txt.trim();
    if t.chars().count() <= max {
        t.to_string()
    } else {
        t.chars().take(max).collect::<String>() + "…"
    }
}

/// UN appel `POST {url}` (D1). En-tête `X-API-Key` **omis** si pas de token (calque
/// exact du `Authorization` optionnel d'`ai.rs`). Succès sur **2xx**. Tout chemin
/// d'erreur → `Err(String)` lisible (D1), jamais de panique.
fn call_webhook(url: &str, token: Option<&str>, payload: &Value) -> Result<NotifyAck, String> {
    let mut req = ureq::post(url.trim())
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
        .set("Content-Type", "application/json");
    if let Some(t) = token {
        req = req.set(AUTH_HEADER, t);
    }

    match req.send_json(payload.clone()) {
        Ok(resp) => {
            // `ureq` ne renvoie `Ok` que pour les 2xx/3xx ; on borne explicitement à 2xx.
            let status = resp.status();
            if (200..300).contains(&status) {
                Ok(NotifyAck {
                    ok: true,
                    provider: "n8n".to_string(),
                    http_status: Some(status),
                })
            } else {
                let body = resp.into_string().unwrap_or_default();
                Err(format!(
                    "n8n a refusé l'envoi (HTTP {status}) : {}",
                    head(&body, 300)
                ))
            }
        }
        // `ureq::Error::Status` = réponse HTTP non-2xx (4xx/5xx) : message lisible avec
        // le code et un extrait du corps (D1).
        Err(ureq::Error::Status(code, resp)) => {
            let body = resp.into_string().unwrap_or_default();
            Err(format!(
                "n8n a refusé l'envoi (HTTP {code}) : {}",
                head(&body, 300)
            ))
        }
        // Transport (DNS, connexion refusée, timeout…) : passerelle injoignable (D1).
        Err(e) => Err(format!("passerelle n8n injoignable : {e}")),
    }
}

// --- Commandes Tauri ---

/// Émet un message sur le canal « adresse » via la passerelle n8n (D4). UN POST (D1).
/// Mock si URL vide / flag dev (D5). Dégrade proprement en `Err(String)` lisible (D1),
/// jamais de crash. `support`/`cible`/`meta` sont optionnels : `support` retombe sur la
/// config (`n8n_active_support`) puis `DEFAULT_SUPPORT`.
#[tauri::command]
pub fn notify_user(
    app: AppHandle,
    message: String,
    support: Option<String>,
    cible: Option<String>,
    meta: Option<Value>,
) -> Result<NotifyAck, String> {
    // Refus `message` vide **avant tout réseau** (D1).
    if message.trim().is_empty() {
        return Err("message vide : rien à envoyer".to_string());
    }

    let conn = db::open(&app)?;
    let url = config::get(&conn, KEY_N8N_WEBHOOK_URL)
        .map_err(|e| e.to_string())?
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_default();

    // Support effectif : argument explicite > config > défaut (D2).
    let support = support
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            config::get(&conn, KEY_N8N_ACTIVE_SUPPORT)
                .ok()
                .flatten()
                .filter(|s| !s.trim().is_empty())
        })
        .unwrap_or_else(|| DEFAULT_SUPPORT.to_string());

    let payload = build_payload(&message, &support, cible.as_deref(), meta);

    if should_mock(&url) {
        return Ok(mock_ack(&payload));
    }

    let store = KeyringStore::new();
    let token = read_token(&store);
    call_webhook(&url, token.as_deref(), &payload)
}

/// Écrit le token (optionnel) du webhook n8n au keychain (write-only côté front, D3).
/// **Jamais** de lecture token→front. Une valeur vide **supprime** le token (UX
/// « retirer »). Calque exact de `ai_set_key` (L3).
#[tauri::command]
pub fn n8n_set_token(value: String) -> Result<(), String> {
    let store = KeyringStore::new();
    if value.trim().is_empty() {
        return store
            .delete_secret(SECRET_SERVICE, SECRET_ACCOUNT_TOKEN)
            .map_err(|e| e.to_string());
    }
    store
        .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_TOKEN, &value)
        .map_err(|e| e.to_string())
}

/// Indique si un token de webhook n8n est enregistré (présence seule, **jamais** la
/// valeur, D3). Calque exact de `ai_has_key` (L3).
#[tauri::command]
pub fn n8n_has_token() -> Result<bool, String> {
    let store = KeyringStore::new();
    Ok(read_token(&store).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    // --- Mock store (réplique du contrat secrets, pour le cloisonnement token) ---

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

    // --- build_payload (D1) : LE point dur, fonction pure testée ---

    #[test]
    fn build_payload_canal_toujours_adresse() {
        let p = build_payload("coucou", "slack", None, None);
        assert_eq!(p["canal"], "adresse");
        assert_eq!(p["support"], "slack");
        assert_eq!(p["message"], "coucou");
    }

    #[test]
    fn build_payload_porte_le_support_choisi() {
        for s in ["slack", "discord", "mqtt"] {
            let p = build_payload("m", s, None, None);
            assert_eq!(p["support"], s);
        }
    }

    #[test]
    fn build_payload_cible_optionnelle_omise_si_vide() {
        let p = build_payload("m", "slack", None, None);
        assert!(p.get("cible").is_none());
        let p2 = build_payload("m", "slack", Some("   "), None);
        assert!(p2.get("cible").is_none());
        let p3 = build_payload("m", "slack", Some("#iakaframe"), None);
        assert_eq!(p3["cible"], "#iakaframe");
    }

    #[test]
    fn build_payload_meta_defaut_objet_vide() {
        let p = build_payload("m", "slack", None, None);
        assert!(p["meta"].is_object());
        assert_eq!(p["meta"].as_object().unwrap().len(), 0);
    }

    #[test]
    fn build_payload_forward_la_meta_fournie() {
        let meta = serde_json::json!({
            "royaume": "IAKACOCKPIT", "agent": "Gandalf",
            "project": "iakacockpit", "ts": "2026-06-25T14:30:00Z", "source": "iakacockpit"
        });
        let p = build_payload("m", "slack", Some("#c"), Some(meta));
        assert_eq!(p["meta"]["royaume"], "IAKACOCKPIT");
        assert_eq!(p["meta"]["agent"], "Gandalf");
        assert_eq!(p["meta"]["source"], "iakacockpit");
    }

    // --- mock (D5) ---

    #[test]
    fn should_mock_si_url_vide() {
        assert!(should_mock(""));
        assert!(should_mock("   "));
    }

    #[test]
    fn should_mock_faux_si_url_presente() {
        // (le flag d'env n'est pas posé dans ce test)
        assert!(!should_mock("http://localhost:5678/webhook/abc"));
    }

    #[test]
    fn mock_ack_est_deterministe_et_marque_mock() {
        let p = build_payload("m", "slack", None, None);
        let a = mock_ack(&p);
        assert!(a.ok);
        assert_eq!(a.provider, "mock");
        assert_eq!(a.http_status, None);
        // Déterminisme : deux appels identiques → même ack.
        assert_eq!(mock_ack(&p), a);
    }

    // --- cloisonnement token (D3) ---

    #[test]
    fn read_token_reflete_presence_et_absence() {
        let store = MockStore::default();
        assert_eq!(read_token(&store), None);
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_TOKEN, "tok-secret")
            .unwrap();
        assert_eq!(read_token(&store), Some("tok-secret".to_string()));
        // Vide → considéré absent (header X-API-Key omis).
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_TOKEN, "  ")
            .unwrap();
        assert_eq!(read_token(&store), None);
    }

    #[test]
    fn account_keychain_est_neutre_et_service_coherent() {
        assert_eq!(SECRET_ACCOUNT_TOKEN, "n8n_webhook_token");
        assert_eq!(SECRET_SERVICE, "iakacockpit");
        assert_eq!(AUTH_HEADER, "X-API-Key");
    }

    // --- garde : clés de config non sensibles (config_all les remonte) ---

    #[test]
    fn cles_config_n8n_ne_sont_pas_des_secrets() {
        for k in [KEY_N8N_WEBHOOK_URL, KEY_N8N_ACTIVE_SUPPORT] {
            let lk = k.to_lowercase();
            assert!(
                !(lk.contains("token")
                    || lk.contains("key")
                    || lk.contains("secret")
                    || lk.contains("password")),
                "{k} ne doit pas matcher is_secret"
            );
        }
    }

    // --- head (troncature pour message d'erreur lisible) ---

    #[test]
    fn head_tronque_les_corps_longs() {
        let out = head(&"x".repeat(500), 10);
        assert!(out.starts_with("xxxxxxxxxx"));
        assert!(out.ends_with('…'));
        assert_eq!(head("court", 10), "court");
    }
}
