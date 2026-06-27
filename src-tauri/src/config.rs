//! config — configuration NON sensible persistée en SQLite (D3/D9).
//!
//! SQLite ne stocke QUE de la config non sensible : chapeau (`root`), thème,
//! endpoint LiteLLM (URL, SANS la clé). Aucun secret ici — les secrets vont au
//! keychain (`secrets.rs`). La valeur initiale de `root` est CALCULÉE par OS
//! (`paths::resolve_hat_root`), jamais codée en dur.
//!
//! Schéma minimal clé/valeur : table `config(key TEXT PRIMARY KEY, value TEXT)`.

use std::collections::HashMap;

use rusqlite::Connection;
use tauri::AppHandle;

use crate::db;
use crate::paths::resolve_hat_root;

/// Clés de config réservées (non sensibles).
pub const KEY_ROOT: &str = "root";
pub const KEY_THEME: &str = "theme";
pub const KEY_LITELLM_ENDPOINT: &str = "litellm_endpoint";
/// Projets importés hors racine (bouton + de Working) : tableau JSON de chemins.
pub const KEY_EXTRA_PROJECTS: &str = "extra_projects";

// --- Teams & agents — définition de premier rang (L11) — config NON sensible -----
//
// La TEAM est une entité de données (roster d'agents : persona + runner + modèle +
// skills + coordinateur), sérialisée **JSON** côté front sous la clé `teams` (AR-5 :
// zéro nouvelle commande Tauri, on réutilise `config_get/set/all`). Aucune de ces clés
// ne matche `token|key|secret|password` → toutes remontent par `config_all`. INVARIANT
// (L11 § 3) : le JSON `teams` ne contient AUCUN secret (runner = kind, modèle = alias,
// skills = ids) ; les credentials de runner restent au keychain.

/// Tableau JSON des `Team` (définition complète : agents, runner/modèle/skills,
/// coordinateur, casting visuel). Bootstrap côté front (`useTeams`) si absent.
pub const KEY_TEAMS: &str = "teams";
/// Id de la **dernière team utilisée** (graine de pré-sélection du popup `TeamPicker`).
pub const KEY_DEFAULT_TEAM: &str = "default_team";
/// Préfixe de la liaison **par projet** → `project_team:<projectId>` = id de team.
pub const PREFIX_PROJECT_TEAM: &str = "project_team:";
/// Id de la team par défaut (miroir TS `DEFAULT_TEAM_ID`). Posée par le seed démo en
/// liaison `project_team:iaka-demo` et bootstrappée côté front.
pub const DEFAULT_TEAM_ID: &str = "iakaframe";

// --- Réglages GLOBAUX du chef-runner (L10b/P3) — config NON sensible -----------
//
// Set par défaut du cockpit (PER-PROJET = cible, hors L10). Aucune de ces clés ne
// matche `token|key|secret|password` → toutes remontent par `config_all` (lues
// côté front par `useSettings`) ET côté Rust par `read_chef_settings` (consommé par
// `terminal::pty_runner_open`, avec fallback sur les constantes du module terminal
// si absentes). AUCUN secret ici (le chef-runner n'a pas de clé par défaut).

/// Runner par défaut du chef (`claude-code` ; champ prévu pour extension
/// Ollama/Codex, mais seul `claude-code` est sélectionnable en L10).
pub const KEY_CHEF_RUNNER_KIND: &str = "chef_runner_kind";
/// Modèle du chef-runner (alias/nom transmis à `claude --model`).
pub const KEY_CHEF_MODEL: &str = "chef_model";
/// Allowlist d'outils du chef-runner (`claude --allowedTools`, liste CSV).
pub const KEY_CHEF_ALLOWED_TOOLS: &str = "chef_allowed_tools";
/// Mode de trust du cwd (`inherit` = héritage parent / dialogue natif ;
/// `accept` = pré-acceptation idempotente). Cf. `terminal::TrustMode`.
pub const KEY_CHEF_TRUST_MODE: &str = "chef_trust_mode";

/// Réglages globaux du chef-runner lus depuis la config (tous optionnels). `None`
/// = clé absente OU valeur vide/blanche → l'appelant (`terminal.rs`) retombe sur sa
/// **constante par défaut** (vider un champ dans Réglages restaure donc le défaut).
#[derive(Debug, Clone, Default)]
pub struct ChefSettings {
    pub runner_kind: Option<String>,
    pub model: Option<String>,
    pub allowed_tools: Option<String>,
    pub trust_mode: Option<String>,
}

/// Lit les réglages globaux du chef-runner (best-effort : une erreur SQLite sur une
/// clé → `None` pour cette clé, jamais d'échec). Les valeurs vides/blanches sont
/// traitées comme **absentes** (= défaut côté appelant).
pub fn read_chef_settings(conn: &Connection) -> ChefSettings {
    let read = |key: &str| -> Option<String> {
        get(conn, key)
            .ok()
            .flatten()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };
    ChefSettings {
        runner_kind: read(KEY_CHEF_RUNNER_KIND),
        model: read(KEY_CHEF_MODEL),
        allowed_tools: read(KEY_CHEF_ALLOWED_TOOLS),
        trust_mode: read(KEY_CHEF_TRUST_MODE),
    }
}

/// Crée la table `config` si absente.
pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

/// Écrit (ou remplace) une valeur de config.
pub fn set(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )?;
    Ok(())
}

/// Lit une valeur de config (`None` si absente).
pub fn get(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM config WHERE key = ?1")?;
    let mut rows = stmt.query(rusqlite::params![key])?;
    match rows.next()? {
        Some(row) => Ok(Some(row.get(0)?)),
        None => Ok(None),
    }
}

/// Garantit que `root` est présent ; s'il manque, l'initialise avec le défaut
/// calculé par OS. Renvoie la valeur effective.
pub fn ensure_root(conn: &Connection) -> rusqlite::Result<String> {
    if let Some(v) = get(conn, KEY_ROOT)? {
        return Ok(v);
    }
    let default_root = resolve_hat_root().to_string_lossy().to_string();
    set(conn, KEY_ROOT, &default_root)?;
    Ok(default_root)
}

/// Une clé est-elle un secret ? (jamais renvoyée en bloc par `config_all`).
///
/// Repris de l'audit iakaIDE : les clés contenant `token|key|secret|password`
/// restent accessibles une par une via `config_get`, jamais listées en bloc. En
/// pratique aucun secret ne transite par la config (les secrets vont au keychain,
/// L3) — ce filtre est une garde de cloisonnement.
///
/// **L11 — exemption du namespace `project_team:` (fail-safe préservé).** La liaison
/// projet→team a une clé `project_team:<projectId>` où `projectId` = **nom de dossier
/// contrôlé par l'utilisateur** (ex. `mon**key**-app`, `token-service`, `secret-santa`,
/// `turn**key**`, `my-pass**word**s`). Sans exemption, le test sous-chaîne classerait
/// ces liaisons « secrètes » → exclues de `config_all` → `useTeams` ne les relit jamais
/// → le choix de team ne persiste pas (popup en boucle). On exempte donc **explicitement
/// ce préfixe** AVANT le test sous-chaîne. C'est sûr par construction : la **valeur**
/// d'une liaison est un **id de team** (non sensible, invariant § 3 — jamais de
/// credential). L'exemption est **bornée à ce préfixe** et ne déclasse **aucune** autre
/// clé : tout secret réel (ex. `litellm_api_key`, `*_token`, `*_password`) reste classé
/// secret. Un faux négatif (secret qui fuit) reste impossible ici ; on ne corrige qu'un
/// faux positif fonctionnel.
fn is_secret(key: &str) -> bool {
    let k = key.to_lowercase();
    // Exemption explicite (non secret par construction) : la liaison projet→team.
    if k.starts_with(PREFIX_PROJECT_TEAM) {
        return false;
    }
    k.contains("token") || k.contains("key") || k.contains("secret") || k.contains("password")
}

// --- Commandes Tauri (salvage iakaIDE, branchées sur le module L0 ci-dessus) ---

/// Racine du chapeau. Défaut **calculé** par OS (`paths`/`ensure_root`) si absent.
#[tauri::command]
pub fn get_root(app: AppHandle) -> Result<String, String> {
    let conn = db::open(&app)?;
    ensure_root(&conn).map_err(|e| e.to_string())
}

/// Persiste la racine du chapeau.
#[tauri::command]
pub fn set_root(app: AppHandle, root: String) -> Result<(), String> {
    let conn = db::open(&app)?;
    set(&conn, KEY_ROOT, &root).map_err(|e| e.to_string())
}

/// Lit une valeur de config (`None` si absente).
#[tauri::command]
pub fn config_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let conn = db::open(&app)?;
    get(&conn, &key).map_err(|e| e.to_string())
}

/// Écrit/maj une valeur de config.
#[tauri::command]
pub fn config_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let conn = db::open(&app)?;
    set(&conn, &key, &value).map_err(|e| e.to_string())
}

/// Renvoie la config NON sensible (clé → valeur). Les secrets sont **exclus**
/// (cf. `is_secret`) ; ils restent lisibles un par un via `config_get`.
#[tauri::command]
pub fn config_all(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let conn = db::open(&app)?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM config")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        if !is_secret(&k) {
            map.insert(k, v);
        }
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        conn
    }

    #[test]
    fn set_then_get_roundtrip() {
        let conn = mem();
        set(&conn, KEY_THEME, "dark").unwrap();
        assert_eq!(get(&conn, KEY_THEME).unwrap(), Some("dark".to_string()));
    }

    #[test]
    fn get_absent_renvoie_none() {
        let conn = mem();
        assert_eq!(get(&conn, "inconnu").unwrap(), None);
    }

    #[test]
    fn set_remplace_la_valeur() {
        let conn = mem();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4000").unwrap();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4001").unwrap();
        assert_eq!(
            get(&conn, KEY_LITELLM_ENDPOINT).unwrap(),
            Some("http://localhost:4001".to_string())
        );
    }

    #[test]
    fn ensure_root_initialise_avec_le_defaut_calcule() {
        let conn = mem();
        let root = ensure_root(&conn).unwrap();
        assert!(!root.is_empty());
        // Idempotent : un second appel ne change pas la valeur.
        let again = ensure_root(&conn).unwrap();
        assert_eq!(root, again);
        assert_eq!(get(&conn, KEY_ROOT).unwrap(), Some(root));
    }

    #[test]
    fn is_secret_detecte_les_cles_sensibles() {
        for k in [
            "token",
            "litellm_token",
            "api_key",
            "KEY",
            "my_secret",
            "db_password",
        ] {
            assert!(is_secret(k), "{k} devrait être secret");
        }
    }

    #[test]
    fn is_secret_laisse_passer_la_config_non_sensible() {
        for k in [KEY_ROOT, KEY_THEME, KEY_LITELLM_ENDPOINT, "widget_layout"] {
            assert!(!is_secret(k), "{k} ne devrait pas être secret");
        }
    }

    // --- L11 : teams & agents (définition non sensible) ---

    #[test]
    fn cles_teams_ne_sont_pas_secretes() {
        // `teams`, `default_team` et toute liaison `project_team:<id>` doivent remonter
        // par config_all (lues par `useTeams`). Aucune ne matche le filtre secret.
        assert!(!is_secret(KEY_TEAMS), "teams ne doit pas être filtré");
        assert!(
            !is_secret(KEY_DEFAULT_TEAM),
            "default_team ne doit pas être filtré"
        );
        for pid in ["iaka-demo", "iakacockpit", "demo-1"] {
            let key = format!("{PREFIX_PROJECT_TEAM}{pid}");
            assert!(
                !is_secret(&key),
                "{key} ne doit pas être filtré comme secret"
            );
        }
    }

    #[test]
    fn liaison_project_team_avec_id_utilisateur_piege_n_est_pas_secrete() {
        // V1 : `projectId` = nom de dossier contrôlé par l'utilisateur ; un id contenant
        // `key|token|secret|password` NE DOIT PAS faire classer la liaison « secrète »
        // (sinon `config_all` l'exclut → `hasBinding` toujours faux → popup en boucle).
        for pid in [
            "monkey-app",    // contient "key"
            "token-service", // contient "token"
            "secret-santa",  // contient "secret"
            "turnkey",       // contient "key"
            "my-passwords",  // contient "password"
            "KeyVault-Proj", // casse mixte + "key"
        ] {
            let key = format!("{PREFIX_PROJECT_TEAM}{pid}");
            assert!(
                !is_secret(&key),
                "{key} (id utilisateur) ne doit PAS être classé secret"
            );
        }
    }

    #[test]
    fn liaison_project_team_piege_remonte_bien_par_le_filtre_config_all() {
        // Bout-en-bout du filtre `config_all` : une liaison à id piégé est ÉCRITE puis
        // RELUE (présente dans le map filtré) → `useTeams` la voit, le choix persiste.
        let conn = mem();
        let key = format!("{PREFIX_PROJECT_TEAM}monkey-app");
        set(&conn, &key, "iakaframe").unwrap();
        // Un VRAI secret en parallèle pour prouver qu'il reste exclu.
        set(&conn, "litellm_api_key", "sk-secret").unwrap();

        let mut stmt = conn.prepare("SELECT key, value FROM config").unwrap();
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .unwrap();
        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = row.unwrap();
            if !is_secret(&k) {
                map.insert(k, v);
            }
        }
        // La liaison piégée remonte (relue par useTeams) ; le secret reste exclu.
        assert_eq!(map.get(&key).map(String::as_str), Some("iakaframe"));
        assert!(!map.contains_key("litellm_api_key"));
    }

    #[test]
    fn vrais_secrets_restent_secrets_apres_exemption_project_team() {
        // L'exemption est BORNÉE au préfixe `project_team:` : aucune autre clé secrète
        // n'est déclassée (fail-safe préservé — un faux négatif serait inacceptable).
        for k in [
            "litellm_api_key",
            "ai_api_key",
            "n8n_webhook_token",
            "couch_password",
            "service_secret",
            "some_token",
            // Piège inverse : "project_team" ailleurs que le préfixe + motif secret.
            "team_project_token",
        ] {
            assert!(is_secret(k), "{k} DOIT rester classé secret");
        }
    }

    #[test]
    fn teams_json_roundtrip_en_config() {
        // La team est une chaîne JSON opaque côté Rust (parse côté front) : on vérifie
        // juste le roundtrip clé/valeur (aucun secret, aucun traitement Rust du JSON).
        let conn = mem();
        let json = r#"[{"id":"iakaframe","name":"iakaframe","agents":[]}]"#;
        set(&conn, KEY_TEAMS, json).unwrap();
        assert_eq!(get(&conn, KEY_TEAMS).unwrap(), Some(json.to_string()));
    }

    // --- L10b/P3 : réglages globaux du chef-runner (non sensibles) ---

    #[test]
    fn cles_chef_runner_ne_sont_pas_secretes() {
        // Toutes doivent remonter par config_all (UI Réglages + lecture Rust).
        for k in [
            KEY_CHEF_RUNNER_KIND,
            KEY_CHEF_MODEL,
            KEY_CHEF_ALLOWED_TOOLS,
            KEY_CHEF_TRUST_MODE,
        ] {
            assert!(!is_secret(k), "{k} ne doit pas être filtré comme secret");
        }
    }

    #[test]
    fn read_chef_settings_absent_est_tout_none() {
        let conn = mem();
        let s = read_chef_settings(&conn);
        assert!(s.runner_kind.is_none());
        assert!(s.model.is_none());
        assert!(s.allowed_tools.is_none());
        assert!(s.trust_mode.is_none());
    }

    #[test]
    fn read_chef_settings_relit_les_valeurs_persistees() {
        let conn = mem();
        set(&conn, KEY_CHEF_RUNNER_KIND, "claude-code").unwrap();
        set(&conn, KEY_CHEF_MODEL, "claude-sonnet-4-5").unwrap();
        set(&conn, KEY_CHEF_ALLOWED_TOOLS, "Read,Glob").unwrap();
        set(&conn, KEY_CHEF_TRUST_MODE, "accept").unwrap();
        let s = read_chef_settings(&conn);
        assert_eq!(s.runner_kind.as_deref(), Some("claude-code"));
        assert_eq!(s.model.as_deref(), Some("claude-sonnet-4-5"));
        assert_eq!(s.allowed_tools.as_deref(), Some("Read,Glob"));
        assert_eq!(s.trust_mode.as_deref(), Some("accept"));
    }

    #[test]
    fn read_chef_settings_traite_le_vide_comme_absent() {
        // Vider un champ dans Réglages doit restaurer le défaut (None côté appelant).
        let conn = mem();
        set(&conn, KEY_CHEF_MODEL, "   ").unwrap();
        set(&conn, KEY_CHEF_ALLOWED_TOOLS, "").unwrap();
        let s = read_chef_settings(&conn);
        assert!(s.model.is_none());
        assert!(s.allowed_tools.is_none());
    }

    #[test]
    fn config_all_filtre_exclut_uniquement_les_secrets() {
        // Reproduit le filtre de `config_all` sur une base mémoire (sans AppHandle).
        let conn = mem();
        set(&conn, KEY_THEME, "dark").unwrap();
        set(&conn, KEY_LITELLM_ENDPOINT, "http://localhost:4000").unwrap();
        set(&conn, "litellm_api_key", "sk-secret").unwrap();

        let mut stmt = conn.prepare("SELECT key, value FROM config").unwrap();
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .unwrap();
        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = row.unwrap();
            if !is_secret(&k) {
                map.insert(k, v);
            }
        }
        assert!(map.contains_key(KEY_THEME));
        assert!(map.contains_key(KEY_LITELLM_ENDPOINT));
        assert!(!map.contains_key("litellm_api_key"));
    }
}
