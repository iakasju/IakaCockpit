//! maincourante — lecture de la main courante 3-canaux iakaboxlogs (L4).
//!
//! **LECTURE SEULE.** UN seul `POST {couchdb_url}/{base}/_find` (Mango) vers la
//! base CouchDB `conversations` d'iakaboxlogs (HTTP/JSON, `.11:5984`). On **ne
//! réimplémente NI le bus MQTT, NI le pont n8n/bridge, NI le stockage** : iakaboxlogs
//! est déjà déployé (roadmap § 4). Jamais d'écriture (`PUT`/`POST` doc), jamais de
//! création de base/index (l'index `idx-maincourante` existe déjà), jamais de
//! souscription temps réel.
//!
//! Patron **calqué sur `ai.rs` (L3)** : même `ureq` (déjà présent, http LAN sans
//! TLS), même parsing défensif `serde_json`, même dégradation `Err(String)` lisible
//! (jamais de panique), même cloisonnement keychain (`secrets` L0) pour les
//! identifiants CouchDB (write-only côté front, présence seule exposée).
//!
//! Mapping 3-canaux (D3) : le schéma porte `role` (user/assistant/system/unknown),
//! **PAS** les 3 canaux. Le canal est **dérivé** de `role` (table A1 validée), sauf
//! si `meta.canal` réel le porte (forward-compatible). Le canal `geste` n'apparaît
//! **que** via `meta.canal: "geste"` (volet machine différé) : on ne fabrique pas de
//! faux geste depuis `role` (frontière § 5).

use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::config;
use crate::db;
use crate::secrets::{KeyringStore, SecretStore};

/// Clé de config non sensible : URL HTTP de CouchDB iakaboxlogs (D4).
pub const KEY_COUCHDB_URL: &str = "couchdb_url";
/// Clé de config non sensible : nom de la base CouchDB (D4).
pub const KEY_COUCHDB_DB: &str = "couchdb_db";

/// URL CouchDB iakaboxlogs **par défaut** (LAN box). Surchargée par config.
pub const DEFAULT_COUCHDB_URL: &str = "http://192.168.2.11:5984";
/// Base CouchDB **par défaut** (créée par `scripts/init-couchdb.sh` d'iakaboxlogs).
pub const DEFAULT_COUCHDB_DB: &str = "conversations";

/// Service keychain (cohérent avec le reste de l'app, cf. L3).
pub const SECRET_SERVICE: &str = "iakacockpit";
/// Account keychain **neutre** pour l'identifiant CouchDB (Basic auth).
pub const SECRET_ACCOUNT_USER: &str = "couchdb_user";
/// Account keychain **neutre** pour le mot de passe CouchDB (Basic auth).
pub const SECRET_ACCOUNT_PASSWORD: &str = "couchdb_password";

/// Variable d'environnement forçant le mode mock/dégradé (calque `ai.rs`).
const ENV_MOCK_FLAG: &str = "IAKACOCKPIT_MC_MOCK";

/// Timeout borné de l'appel réseau (D5). LAN rapide → marge courte mais finie.
const HTTP_TIMEOUT_SECS: u64 = 15;

/// Limite de page (D1 / A3) : journal récent, pas un export. 200 docs, page unique.
const FIND_LIMIT: u64 = 200;

/// Événement de main courante, sérialisé vers le front (miroir TS `FeedEvent`).
/// Tous les champs sont des chaînes → aucune friction de casse (D6).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct FeedEvent {
    /// `_id` CouchDB.
    pub id: String,
    /// Canal dérivé (D3) : `adresse` | `geste` | `pensee` | `agent`.
    pub canal: String,
    /// Émetteur affiché `[ROYAUME][Agent]` (D3-bis).
    pub who: String,
    /// Provenance = `conv_id` (ou `royaume` à défaut) — pas un lien fort projet (D3-bis).
    pub project: String,
    /// Corps du message (`content`).
    pub body: String,
    /// Horodatage ISO-8601 (`ts`). Mise en forme = UX front.
    pub ts: String,
}

/// Filtre de la requête `_find` (filtres serveur : champs indexés).
/// Le filtre **canal** reste côté UX (le canal est dérivé, pas stocké — D3).
#[derive(Deserialize, Default, Debug)]
pub struct MainCouranteFilter {
    /// Filtre serveur par agent (champ indexé `idx-maincourante`).
    pub agent: Option<String>,
    /// Filtre serveur par royaume (champ indexé `idx-maincourante`).
    pub royaume: Option<String>,
}

// --- Base64 (Basic auth) : encodeur standard maison, sans dépendance nouvelle ---

/// Encode des octets en base64 standard (alphabet RFC 4648, padding `=`).
///
/// Volontairement **maison** (~20 lignes) pour respecter la contrainte L4 « aucune
/// dépendance Rust nouvelle » : `ureq` (sans TLS) ne fournit pas d'aide Basic auth
/// et `base64` n'est qu'une dépendance transitive non déclarée. Fonction pure testée.
fn base64_encode(input: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPHABET[((n >> 18) & 0x3f) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 0x3f) as usize] as char);
        if chunk.len() > 1 {
            out.push(ALPHABET[((n >> 6) & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(ALPHABET[(n & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// Construit l'en-tête `Authorization: Basic …` à partir de l'identifiant CouchDB.
fn basic_auth_header(user: &str, password: &str) -> String {
    format!(
        "Basic {}",
        base64_encode(format!("{user}:{password}").as_bytes())
    )
}

// --- Mapping 3-canaux (D3) : LE point dur, fonction pure testée ---

/// Valeurs de canal connues (contrat UX L2 partagé avec le front).
fn is_known_canal(c: &str) -> bool {
    matches!(c, "adresse" | "geste" | "pensee" | "agent")
}

/// Dérive le canal d'un message depuis `(role, meta)` (D3 / A1).
///
/// Règle (tranchée par Stéphane — propositions par défaut de l'instruction) :
///   1. `meta.canal` présent **et connu** → utilisé tel quel (forward-compatible :
///      le jour où les pushers enrichissent `meta.canal`, on l'honore sans changer
///      de code) ;
///   2. sinon dérivation depuis `role` (imparfaite **par nature**, réserve § 10.4) :
///      - `assistant` → `adresse` (parole de l'agent adressée à l'humain)
///      - `user`      → `adresse` (parole de l'humain — canal engageant)
///      - `system`    → `pensee`  (consignes/délibération non adressées)
///      - autre/unknown → `pensee` (dépôt par défaut, jamais d'échec).
///
/// Le canal `geste` n'est **PAS** dérivable de `role` : il n'arrive que via
/// `meta.canal: "geste"` réel (volet machine différé). On **ne fabrique pas** de
/// faux geste (frontière § 5).
fn derive_canal(role: &str, meta: &serde_json::Value) -> String {
    if let Some(c) = meta.get("canal").and_then(|v| v.as_str()) {
        if is_known_canal(c) {
            return c.to_string();
        }
    }
    match role {
        "assistant" => "adresse",
        "user" => "adresse",
        "system" => "pensee",
        _ => "pensee",
    }
    .to_string()
}

/// Mappe un document CouchDB (`serde_json::Value`) → `FeedEvent` (D6).
///
/// Parsing **défensif** : tout champ manquant tombe sur une valeur de remplacement,
/// **jamais** de panique. `who` = `[ROYAUME][Agent]` (majuscule royaume, D3-bis) ;
/// `project` = `conv_id` (ou `royaume` à défaut, ou `"?"`).
fn map_doc(doc: &serde_json::Value) -> FeedEvent {
    let id = doc
        .get("_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let role = doc
        .get("role")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let royaume = doc.get("royaume").and_then(|v| v.as_str()).unwrap_or("?");
    let agent = doc.get("agent").and_then(|v| v.as_str()).unwrap_or("?");
    let conv_id = doc.get("conv_id").and_then(|v| v.as_str());
    let content = doc
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let ts = doc
        .get("ts")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let meta = doc.get("meta").cloned().unwrap_or(serde_json::Value::Null);

    let canal = derive_canal(role, &meta);
    let who = format!("[{}][{}]", royaume.to_uppercase(), agent);
    let project = conv_id
        .filter(|c| !c.trim().is_empty())
        .map(|c| c.to_string())
        .unwrap_or_else(|| royaume.to_string());

    FeedEvent {
        id,
        canal,
        who,
        project,
        body: content,
        ts,
    }
}

/// Parse la réponse `_find` (champ `docs[]`) → `Vec<FeedEvent>`.
///
/// Défensif (R-L4-6) : réponse vide → `Vec` vide (**pas** une erreur) ; JSON
/// invalide / structure inattendue (pas de `docs[]`) → `Err` **lisible**.
fn parse_find_response(body: &str) -> Result<Vec<FeedEvent>, String> {
    let v: serde_json::Value = serde_json::from_str(body)
        .map_err(|e| format!("réponse iakaboxlogs illisible (JSON) : {e}"))?;
    // CouchDB renvoie une erreur structurée {"error":…,"reason":…} en cas de souci.
    if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
        let reason = v
            .get("reason")
            .and_then(|r| r.as_str())
            .unwrap_or("raison inconnue");
        return Err(format!("CouchDB a refusé la requête : {err} ({reason})"));
    }
    let docs = match v.get("docs").and_then(|d| d.as_array()) {
        Some(arr) => arr,
        // Pas de champ `docs` → structure inattendue (pas un _find valide).
        None => {
            return Err(
                "réponse iakaboxlogs inattendue : champ `docs` absent (structure non Mango)"
                    .to_string(),
            )
        }
    };
    Ok(docs.iter().map(map_doc).collect())
}

/// Construit le corps Mango `_find` (D1) : `selector` (+ filtres serveur), `sort`
/// `ts` desc (s'appuie sur l'index `idx-maincourante`), `limit` bornée.
fn build_find_body(filter: &MainCouranteFilter) -> serde_json::Value {
    let mut selector = serde_json::Map::new();
    // `ts > null` = tous les docs ayant un `ts` (selector non vide requis par Mango).
    selector.insert(
        "ts".to_string(),
        serde_json::json!({ "$gt": serde_json::Value::Null }),
    );
    if let Some(agent) = filter.agent.as_ref().filter(|s| !s.trim().is_empty()) {
        selector.insert("agent".to_string(), serde_json::json!(agent));
    }
    if let Some(royaume) = filter.royaume.as_ref().filter(|s| !s.trim().is_empty()) {
        selector.insert("royaume".to_string(), serde_json::json!(royaume));
    }
    serde_json::json!({
        "selector": serde_json::Value::Object(selector),
        "sort": [ { "ts": "desc" } ],
        "limit": FIND_LIMIT,
    })
}

/// Décide si l'on bascule en mode dégradé/mock (D5) : flag d'env OU URL vide OU
/// identifiants absents. Pas de réseau ici (le timeout réseau est géré à l'appel).
fn should_degrade(url: &str, has_credentials: bool) -> bool {
    if std::env::var(ENV_MOCK_FLAG)
        .map(|v| v == "1")
        .unwrap_or(false)
    {
        return true;
    }
    url.trim().is_empty() || !has_credentials
}

/// UN appel `POST {url}/{db}/_find` (Mango, auth Basic). Lecture seule.
fn call_find(
    url: &str,
    db_name: &str,
    user: &str,
    password: &str,
    filter: &MainCouranteFilter,
) -> Result<Vec<FeedEvent>, String> {
    let endpoint = format!("{}/{}/_find", url.trim_end_matches('/'), db_name);
    let body = build_find_body(filter);

    let resp = ureq::post(&endpoint)
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
        .set("Authorization", &basic_auth_header(user, password))
        .set("Content-Type", "application/json")
        .send_json(body)
        .map_err(|e| format!("iakaboxlogs (CouchDB) injoignable : {e}"))?;
    let text = resp
        .into_string()
        .map_err(|e| format!("lecture de la réponse iakaboxlogs impossible : {e}"))?;
    parse_find_response(&text)
}

/// Lit l'identifiant CouchDB (user + password) au keychain. `None` si l'un manque
/// ou est vide. Interne Rust uniquement — **jamais** renvoyé au front (D4).
fn read_credentials(store: &dyn SecretStore) -> Option<(String, String)> {
    let user = store
        .get_secret(SECRET_SERVICE, SECRET_ACCOUNT_USER)
        .ok()
        .flatten()
        .filter(|u| !u.trim().is_empty())?;
    let password = store
        .get_secret(SECRET_SERVICE, SECRET_ACCOUNT_PASSWORD)
        .ok()
        .flatten()?;
    Some((user, password))
}

// --- Commandes Tauri ---

/// Lit la main courante iakaboxlogs (lecture seule, UN `_find`). Dégrade en `Err`
/// lisible si URL/identifiants absents ou CouchDB injoignable (D5) → le front
/// retombe alors sur le mock (`useMainCourante`).
#[tauri::command]
pub fn fetch_main_courante(
    app: AppHandle,
    filter: MainCouranteFilter,
) -> Result<Vec<FeedEvent>, String> {
    let conn = db::open(&app)?;
    let url = config::get(&conn, KEY_COUCHDB_URL)
        .map_err(|e| e.to_string())?
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_default();
    let db_name = config::get(&conn, KEY_COUCHDB_DB)
        .map_err(|e| e.to_string())?
        .filter(|d| !d.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_COUCHDB_DB.to_string());

    let store = KeyringStore::new();
    let creds = read_credentials(&store);

    if should_degrade(&url, creds.is_some()) {
        return Err(
            "main courante en mode dégradé : URL/identifiants CouchDB manquants (ou flag mock)"
                .to_string(),
        );
    }

    // `should_degrade` a déjà garanti la présence des identifiants.
    let (user, password) = creds.expect("identifiants présents (vérifié par should_degrade)");
    call_find(&url, &db_name, &user, &password, &filter)
}

/// Écrit l'identifiant CouchDB (user + password) au keychain (write-only côté
/// front, D4). Un mot de passe **vide** retire les deux (UX « déconnecter »).
/// **Jamais** de lecture de la valeur vers le front.
#[tauri::command]
pub fn couch_set_credentials(user: String, password: String) -> Result<(), String> {
    let store = KeyringStore::new();
    if password.trim().is_empty() {
        store
            .delete_secret(SECRET_SERVICE, SECRET_ACCOUNT_USER)
            .map_err(|e| e.to_string())?;
        return store
            .delete_secret(SECRET_SERVICE, SECRET_ACCOUNT_PASSWORD)
            .map_err(|e| e.to_string());
    }
    store
        .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_USER, &user)
        .map_err(|e| e.to_string())?;
    store
        .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_PASSWORD, &password)
        .map_err(|e| e.to_string())
}

/// Indique si des identifiants CouchDB sont enregistrés (présence seule, **jamais**
/// la valeur, D4).
#[tauri::command]
pub fn couch_has_credentials() -> Result<bool, String> {
    let store = KeyringStore::new();
    Ok(read_credentials(&store).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    // --- Mock store (réplique du contrat secrets, pour le cloisonnement) ---

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

    // --- base64 (Basic auth) ---

    #[test]
    fn base64_encode_vecteurs_rfc4648() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(base64_encode(b"foob"), "Zm9vYg==");
        assert_eq!(base64_encode(b"fooba"), "Zm9vYmE=");
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn basic_auth_header_encode_user_password() {
        // "admin:secret" → base64
        assert_eq!(
            basic_auth_header("admin", "secret"),
            "Basic YWRtaW46c2VjcmV0"
        );
    }

    // --- mapping canal (D3 / A1) ---

    #[test]
    fn derive_canal_depuis_role_sans_meta() {
        let none = serde_json::Value::Null;
        assert_eq!(derive_canal("assistant", &none), "adresse");
        assert_eq!(derive_canal("user", &none), "adresse");
        assert_eq!(derive_canal("system", &none), "pensee");
        assert_eq!(derive_canal("unknown", &none), "pensee");
        assert_eq!(derive_canal("nimporte", &none), "pensee");
    }

    #[test]
    fn meta_canal_connu_prime_sur_role() {
        let meta = serde_json::json!({ "canal": "geste" });
        // `role` dirait "adresse", mais meta.canal réel l'emporte (forward-compatible).
        assert_eq!(derive_canal("assistant", &meta), "geste");
        let meta_adr = serde_json::json!({ "canal": "agent" });
        assert_eq!(derive_canal("system", &meta_adr), "agent");
    }

    #[test]
    fn meta_canal_inconnu_retombe_sur_role() {
        let meta = serde_json::json!({ "canal": "bidon" });
        assert_eq!(derive_canal("assistant", &meta), "adresse");
        assert_eq!(derive_canal("system", &meta), "pensee");
    }

    #[test]
    fn geste_jamais_fabrique_depuis_role() {
        // Aucune valeur de `role` ne produit "geste" (frontière § 5).
        let none = serde_json::Value::Null;
        for role in ["assistant", "user", "system", "unknown", "x"] {
            assert_ne!(derive_canal(role, &none), "geste");
        }
    }

    // --- mapping doc→FeedEvent (D6) ---

    #[test]
    fn map_doc_complet() {
        let doc = serde_json::json!({
            "_id": "abc123",
            "ts": "2026-06-21T17:30:00Z",
            "royaume": "iakaide",
            "agent": "Aragorn",
            "conv_id": "conv-2026-06-21-001",
            "role": "assistant",
            "content": "Bonjour",
            "tokens": 0,
            "meta": {}
        });
        let ev = map_doc(&doc);
        assert_eq!(ev.id, "abc123");
        assert_eq!(ev.who, "[IAKAIDE][Aragorn]");
        assert_eq!(ev.project, "conv-2026-06-21-001");
        assert_eq!(ev.body, "Bonjour");
        assert_eq!(ev.ts, "2026-06-21T17:30:00Z");
        assert_eq!(ev.canal, "adresse");
    }

    #[test]
    fn map_doc_champs_manquants_donnent_remplacement_jamais_panique() {
        let doc = serde_json::json!({ "_id": "x" });
        let ev = map_doc(&doc);
        assert_eq!(ev.id, "x");
        assert_eq!(ev.who, "[?][?]");
        // conv_id absent → fallback royaume ("?").
        assert_eq!(ev.project, "?");
        assert_eq!(ev.body, "");
        assert_eq!(ev.ts, "");
        // role absent → "unknown" → "pensee".
        assert_eq!(ev.canal, "pensee");
    }

    #[test]
    fn map_doc_conv_id_vide_retombe_sur_royaume() {
        let doc = serde_json::json!({
            "_id": "y", "royaume": "iakacockpit", "agent": "Gimli",
            "conv_id": "   ", "role": "system", "content": "x"
        });
        let ev = map_doc(&doc);
        assert_eq!(ev.project, "iakacockpit");
        assert_eq!(ev.who, "[IAKACOCKPIT][Gimli]");
    }

    #[test]
    fn map_doc_honore_meta_canal_geste() {
        let doc = serde_json::json!({
            "_id": "z", "royaume": "r", "agent": "a", "conv_id": "c",
            "role": "system", "content": "délégation",
            "meta": { "canal": "geste" }
        });
        let ev = map_doc(&doc);
        assert_eq!(ev.canal, "geste");
    }

    // --- parsing réponse _find (sur fixtures inline + champ) ---

    #[test]
    fn parse_find_extrait_les_docs() {
        let body = r#"{ "docs": [
            { "_id": "1", "ts": "2026-06-21T10:00:00Z", "royaume": "r", "agent": "A",
              "conv_id": "c1", "role": "assistant", "content": "hello", "meta": {} },
            { "_id": "2", "ts": "2026-06-21T09:00:00Z", "royaume": "r", "agent": "B",
              "conv_id": "c1", "role": "system", "content": "think", "meta": {} }
        ] }"#;
        let evs = parse_find_response(body).unwrap();
        assert_eq!(evs.len(), 2);
        assert_eq!(evs[0].id, "1");
        assert_eq!(evs[0].canal, "adresse");
        assert_eq!(evs[1].canal, "pensee");
    }

    #[test]
    fn parse_find_sur_fixture_disque_specs_mock() {
        // Fixture de référence partagée avec le front (specs/mock/couchdb-find.json).
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../specs/mock/couchdb-find.json"
        );
        let body = std::fs::read_to_string(path).expect("fixture couchdb-find.json présente");
        let evs = parse_find_response(&body).expect("fixture parsable");
        assert_eq!(evs.len(), 5);
        // Le doc avec meta.canal: "geste" (Aragorn) est honoré (forward-compatible).
        let geste = evs
            .iter()
            .find(|e| e.canal == "geste")
            .expect("un geste réel");
        assert_eq!(geste.who, "[IAKACOCKPIT][Aragorn]");
        // assistant → adresse ; system sans meta → pensee.
        assert!(evs.iter().any(|e| e.canal == "adresse"));
        assert!(evs.iter().any(|e| e.canal == "pensee"));
    }

    #[test]
    fn parse_find_reponse_vide_donne_vec_vide_pas_erreur() {
        let evs = parse_find_response(r#"{ "docs": [] }"#).unwrap();
        assert!(evs.is_empty());
    }

    #[test]
    fn parse_find_json_invalide_donne_erreur_lisible() {
        let err = parse_find_response("pas du json").unwrap_err();
        assert!(err.contains("illisible"));
    }

    #[test]
    fn parse_find_structure_inattendue_donne_erreur_lisible() {
        // Pas de champ `docs` → structure non Mango.
        let err = parse_find_response(r#"{ "total_rows": 0 }"#).unwrap_err();
        assert!(err.contains("docs"));
    }

    #[test]
    fn parse_find_erreur_couchdb_remontee() {
        let err = parse_find_response(
            r#"{ "error": "unauthorized", "reason": "Name or password is incorrect." }"#,
        )
        .unwrap_err();
        assert!(err.contains("unauthorized"));
        assert!(err.contains("incorrect"));
    }

    // --- corps Mango (D1) : tri/limite/filtres serveur ---

    #[test]
    fn build_find_body_tri_desc_et_limite() {
        let body = build_find_body(&MainCouranteFilter::default());
        assert_eq!(body["sort"][0]["ts"], "desc");
        assert_eq!(body["limit"], FIND_LIMIT);
        // selector non vide (ts > null), pas de filtre agent/royaume.
        assert!(body["selector"]["ts"]["$gt"].is_null());
        assert!(body["selector"].get("agent").is_none());
    }

    #[test]
    fn build_find_body_ajoute_filtres_serveur() {
        let filter = MainCouranteFilter {
            agent: Some("Gimli".into()),
            royaume: Some("iakacockpit".into()),
        };
        let body = build_find_body(&filter);
        assert_eq!(body["selector"]["agent"], "Gimli");
        assert_eq!(body["selector"]["royaume"], "iakacockpit");
    }

    #[test]
    fn build_find_body_ignore_filtres_vides() {
        let filter = MainCouranteFilter {
            agent: Some("  ".into()),
            royaume: None,
        };
        let body = build_find_body(&filter);
        assert!(body["selector"].get("agent").is_none());
    }

    // --- mode dégradé (D5) ---

    #[test]
    fn should_degrade_si_url_vide() {
        assert!(should_degrade("", true));
        assert!(should_degrade("   ", true));
    }

    #[test]
    fn should_degrade_si_identifiants_absents() {
        assert!(should_degrade("http://192.168.2.11:5984", false));
    }

    #[test]
    fn should_degrade_faux_si_url_et_identifiants() {
        // (le flag d'env n'est pas posé dans ce test)
        assert!(!should_degrade("http://192.168.2.11:5984", true));
    }

    // --- cloisonnement identifiants (D4) ---

    #[test]
    fn read_credentials_reflete_presence_et_absence() {
        let store = MockStore::default();
        assert_eq!(read_credentials(&store), None);
        // user seul → toujours absent (les deux requis).
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_USER, "admin")
            .unwrap();
        assert_eq!(read_credentials(&store), None);
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_PASSWORD, "pw")
            .unwrap();
        assert_eq!(
            read_credentials(&store),
            Some(("admin".to_string(), "pw".to_string()))
        );
        // user vide → considéré absent.
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT_USER, "  ")
            .unwrap();
        assert_eq!(read_credentials(&store), None);
    }

    #[test]
    fn accounts_keychain_sont_neutres() {
        assert_eq!(SECRET_ACCOUNT_USER, "couchdb_user");
        assert_eq!(SECRET_ACCOUNT_PASSWORD, "couchdb_password");
        assert_eq!(SECRET_SERVICE, "iakacockpit");
    }

    // --- garde : clés de config non sensibles (config_all les remonte) ---

    #[test]
    fn cles_config_couchdb_ne_sont_pas_des_secrets() {
        for k in [KEY_COUCHDB_URL, KEY_COUCHDB_DB] {
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
}
