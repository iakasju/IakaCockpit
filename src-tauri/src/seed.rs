//! seed — orchestration de la **démo dev** (L7). Bornée par un flag dev.
//!
//! Au lancement d'un build de DEV/TEST, IakaCockpit doit s'ouvrir **déjà peuplé**
//! pour démontrer la chaîne L2→L6 **sans configuration manuelle** :
//!   1. un **vrai mini-repo git** sous le chapeau (`<root>/iaka-demo`), détecté par
//!      `portfolio::scan_portfolio` comme un projet normal (zéro détection à écrire) ;
//!   2. des **clés config NON sensibles** seedées sur la stack locale (IA Ollama hôte,
//!      CouchDB, n8n) — `config::set` **uniquement si absentes** (jamais d'écrasement) ;
//!   3. côté front (`useDemoSeed`) : l'ouverture des **onglets team** `[ROYAUME][Agent]`.
//!
//! **L7 ne crée AUCUN métier nouveau.** On réutilise `paths`, `config`, `git::capture`,
//! `db`. Pas de `git2`, pas de scan maison, pas de PTY maison, **aucun appel réseau**,
//! **aucun secret écrit au keychain** (AR-3).
//!
//! **Gardes (cœur du lot — la SÛRETÉ) :**
//!   - **ZÉRO seed en prod** (D1) : `demo_seed_enabled()` = `cfg!(dev)` OU
//!     `IAKACOCKPIT_DEMO_SEED=1`. `seed_demo` **revérifie** le flag en première ligne →
//!     inerte si off (`SeedReport { seeded: false, .. }`). Un build release sans la var
//!     d'env ne seede **jamais** rien.
//!   - **Non destructif / idempotent** (D2) : « créer si absent » strict. Dossier déjà
//!     présent → on ne touche à rien. `.git` présent → aucune commande git destructive.
//!     Clé config déjà posée → laissée intacte. En cas de doute → no-op, jamais détruire.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::AppHandle;

use crate::config::{self, KEY_LITELLM_ENDPOINT};
use crate::db;
use crate::git;
use crate::paths::resolve_hat_root;

// --- Cibles du seed (D4 — endpoints RÉELS, valeurs NON sensibles) ---
//
// IA = Ollama HÔTE de Stéphane (`:11434`), PAS le conteneur Docker `:11435` (AR-2).
// CouchDB / n8n = stack Docker locale (ports vérifiés dans docker-compose.yml).

/// Nom du dossier de démo sous le chapeau (`<root>/iaka-demo`).
const DEMO_DIR_NAME: &str = "iaka-demo";

/// Variable d'env qui autorise le seed hors `tauri dev` (ex. `.dmg` de démo).
const ENV_SEED_FLAG: &str = "IAKACOCKPIT_DEMO_SEED";

/// Clés config NON sensibles seedées (créer si absent — D2/D4). Les constantes de
/// clés sont **réutilisées** des modules métier (aucune clé inventée ici).
fn demo_config_targets() -> Vec<(&'static str, &'static str)> {
    vec![
        // L3 — IA : Ollama HÔTE de Stéphane (AR-2), modèle déjà `pull`é.
        (KEY_LITELLM_ENDPOINT, "http://localhost:11434/v1"),
        (crate::ai::KEY_LITELLM_MODEL, crate::ai::DEFAULT_MODEL),
        // L4 — main courante (stack Docker locale).
        (crate::maincourante::KEY_COUCHDB_URL, "http://localhost:5984"),
        (crate::maincourante::KEY_COUCHDB_DB, "conversations"),
        // L6 — canal adresse n8n (stack Docker locale).
        (
            crate::notify::KEY_N8N_WEBHOOK_URL,
            "http://localhost:5678/webhook/iakacockpit-adresse",
        ),
        (
            crate::notify::KEY_N8N_ACTIVE_SUPPORT,
            crate::notify::DEFAULT_SUPPORT,
        ),
    ]
}

/// Compte rendu du seed (sérialisé vers le front — miroir TS `SeedReport`).
#[derive(Serialize, Clone, Debug, PartialEq, Eq, Default)]
pub struct SeedReport {
    /// `false` si le flag est off (seed inerte) — le front ne fait alors rien.
    pub seeded: bool,
    /// Chemin du dossier de démo (pour ouvrir les onglets team), `None` si flag off.
    pub demo_path: Option<String>,
    /// `true` si le dossier a été créé **ce run** (`false` s'il existait déjà).
    pub created_dir: bool,
    /// Clés config réellement posées **ce run** (vide si toutes déjà présentes).
    pub config_keys_set: Vec<String>,
}

/// Le seed est-il autorisé ? (D1 — `cfg!(dev)` OU `IAKACOCKPIT_DEMO_SEED=1`).
///
/// `cfg!(dev)` est vrai **uniquement** quand l'app a été lancée via `tauri dev`
/// (faux par construction en build release) → garde anti-prod sûre. La branche env
/// donne la souplesse `.dmg` de démo sans jamais ouvrir la porte en release. Calque
/// des `should_mock` L3/L4/L6.
pub fn demo_seed_enabled() -> bool {
    cfg!(dev) || env_flag()
}

/// Lecture de la variable d'env d'autorisation (`=="1"`). Testable sans recompiler.
fn env_flag() -> bool {
    std::env::var(ENV_SEED_FLAG).map(|v| v == "1").unwrap_or(false)
}

/// Une valeur de config est-elle « absente » au sens du seed (à poser) ?
/// `None` ou chaîne vide/espaces → absente. Sinon → l'utilisateur l'a renseignée,
/// on ne touche pas (D2).
fn is_blank(v: &Option<String>) -> bool {
    match v {
        None => true,
        Some(s) => s.trim().is_empty(),
    }
}

/// Contenu du mini-repo de démo (rend les fonctions L2→L6 démontrables).
fn demo_files() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "README.md",
            "# iaka-demo\n\nDossier de démo généré par IakaCockpit en mode dev — non destructif.\n",
        ),
        (
            "specs/PROJET.md",
            "# Projet de démonstration IakaCockpit\n\n\
Projet de démonstration servant à montrer la chaîne L2→L6 d'IakaCockpit\n\
(grille/PTY, moteur « prochaine étape », main courante 3-canaux, canal adresse).\n\n\
Ce dossier est généré automatiquement en mode dev et n'est jamais seedé en prod.\n",
        ),
        (
            "specs/etat-des-lieux.md",
            "# État des lieux — iaka-demo\n\n\
| Champ | Valeur |\n|---|---|\n| Version | v0.1.0 |\n\n\
## Fait\n\
- Dossier de démo créé (mini-repo git réel sous le chapeau).\n\n\
## À faire\n\
- Démontrer la prochaine étape (L3), la main courante (L4), le canal adresse (L6).\n",
        ),
    ]
}

/// Crée le dossier de démo + ses fichiers + un commit git, **si absent** (D2/D3).
///
/// Retourne `true` si le dossier a été créé **ce run**. Logique pure testable avec un
/// `tempdir` (on injecte le chemin racine). Non destructif :
///   - dossier déjà présent → no-op (`Ok(false)`), on ne touche à rien ;
///   - sinon : crée les fichiers, puis `git init/add/commit` **si `.git` absent**.
///
/// La dégradation git est **propre** : si `git` est introuvable / l'init échoue, le
/// dossier reste « hors git » (pas de crash). Le commit passe `-c user.*` (valeurs
/// neutres) pour ne pas dépendre de la config git globale (R-L7-8).
fn create_demo_dir(root: &Path) -> std::io::Result<(PathBuf, bool)> {
    let demo = root.join(DEMO_DIR_NAME);

    // Garde non destructive : dossier déjà présent (même partiel) → on ne touche à rien.
    if demo.exists() {
        return Ok((demo, false));
    }

    std::fs::create_dir_all(&demo)?;
    for (rel, content) in demo_files() {
        let full = demo.join(rel);
        if let Some(parent) = full.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(full, content)?;
    }

    init_git_repo(&demo);

    Ok((demo, true))
}

/// `git init` + add + commit du dossier démo **si `.git` absent** (D3). Dégrade
/// proprement (best-effort) : on **réutilise** `git::capture` (binaire git, cross-OS),
/// pas de `git2`. Aucune commande git destructive (jamais reset/checkout/clean).
fn init_git_repo(demo: &Path) {
    // Idempotence git : `.git` déjà présent → aucune commande git rejouée.
    if demo.join(".git").exists() {
        return;
    }
    // init + add + commit (best-effort : un échec laisse le dossier « hors git »).
    if git::capture(demo, &["init"]).is_none() {
        return; // git introuvable / init impossible → on reste hors git, sans crash.
    }
    let _ = git::capture(demo, &["add", "-A"]);
    // `-c user.*` neutres : ne dépend pas de la config git globale de la machine.
    let _ = git::capture(
        demo,
        &[
            "-c",
            "user.email=demo@iakacockpit.local",
            "-c",
            "user.name=IakaCockpit Demo",
            "commit",
            "-m",
            "chore: seed projet de démo",
        ],
    );
}

/// Seede les clés config NON sensibles **absentes** (D2/D4). Renvoie la liste des
/// clés réellement posées ce run. Une clé déjà renseignée par l'utilisateur n'est
/// **ni relue ni remplacée**. Logique pure testable sur une base mémoire.
fn seed_config(conn: &rusqlite::Connection) -> rusqlite::Result<Vec<String>> {
    let mut set_keys = Vec::new();
    for (key, value) in demo_config_targets() {
        let current = config::get(conn, key)?;
        if is_blank(&current) {
            config::set(conn, key, value)?;
            set_keys.push(key.to_string());
        }
    }
    Ok(set_keys)
}

// --- Commande Tauri ---

/// Seed de démo (L7). **Inerte si `demo_seed_enabled()` est faux** (D1) — revérifie le
/// flag en première ligne, donc inerte même si appelée par erreur en prod. Idempotente
/// et non destructive (D2). AUCUN appel réseau, AUCUN secret écrit (D6/AR-3).
#[tauri::command]
pub fn seed_demo(app: AppHandle) -> Result<SeedReport, String> {
    if !demo_seed_enabled() {
        // Garde anti-prod : seed inerte, le front ne fera rien (`seeded:false`).
        return Ok(SeedReport::default());
    }

    let root = resolve_hat_root();
    let (demo_path, created_dir) = create_demo_dir(&root).map_err(|e| e.to_string())?;

    let conn = db::open(&app)?;
    let config_keys_set = seed_config(&conn).map_err(|e| e.to_string())?;

    Ok(SeedReport {
        seeded: true,
        demo_path: Some(demo_path.to_string_lossy().to_string()),
        created_dir,
        config_keys_set,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::fs;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        config::init_schema(&conn).unwrap();
        conn
    }

    fn tmp_dir(name: &str) -> PathBuf {
        let mut d = std::env::temp_dir();
        d.push(format!(
            "iakacockpit_l7_{name}_{}_{}",
            std::process::id(),
            // unicité inter-tests (le PID seul ne suffit pas en parallèle).
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    // --- D1 : flag dev (branche env testable ; cfg!(dev) documentée) ---

    #[test]
    fn env_flag_vrai_si_variable_vaut_1() {
        // On ne mute pas l'env global du process (tests parallèles) : on teste la
        // logique de parsing via une fonction locale équivalente.
        fn parse(v: Option<&str>) -> bool {
            v.map(|x| x == "1").unwrap_or(false)
        }
        assert!(parse(Some("1")));
        assert!(!parse(Some("0")));
        assert!(!parse(Some("true")));
        assert!(!parse(None));
    }

    #[test]
    fn demo_seed_enabled_ne_panique_pas() {
        // Smoke : la fonction publique réelle s'évalue (valeur dépend du profil/env).
        let _ = demo_seed_enabled();
    }

    // --- D2/D4 : seed config non destructif + non sensible ---

    #[test]
    fn seed_config_pose_les_cles_absentes_aux_valeurs_attendues() {
        let conn = mem();
        let set = seed_config(&conn).unwrap();
        // Toutes les cibles sont absentes au départ → toutes posées.
        assert_eq!(set.len(), demo_config_targets().len());
        // Valeurs exactes (AR-2 : Ollama hôte :11434, modèle llama3.1:8b).
        assert_eq!(
            config::get(&conn, KEY_LITELLM_ENDPOINT).unwrap(),
            Some("http://localhost:11434/v1".to_string())
        );
        assert_eq!(
            config::get(&conn, crate::ai::KEY_LITELLM_MODEL).unwrap(),
            Some("llama3.1:8b".to_string())
        );
        assert_eq!(
            config::get(&conn, crate::maincourante::KEY_COUCHDB_URL).unwrap(),
            Some("http://localhost:5984".to_string())
        );
    }

    #[test]
    fn seed_config_n_ecrase_pas_une_cle_saisie_par_l_utilisateur() {
        let conn = mem();
        // L'utilisateur a déjà configuré son endpoint.
        config::set(&conn, KEY_LITELLM_ENDPOINT, "http://mon-endpoint:9999/v1").unwrap();
        let set = seed_config(&conn).unwrap();
        // La clé déjà saisie n'est PAS posée ce run (donc pas dans la liste)…
        assert!(!set.contains(&KEY_LITELLM_ENDPOINT.to_string()));
        // …et sa valeur reste intacte.
        assert_eq!(
            config::get(&conn, KEY_LITELLM_ENDPOINT).unwrap(),
            Some("http://mon-endpoint:9999/v1".to_string())
        );
    }

    #[test]
    fn seed_config_idempotent_second_run_ne_pose_rien() {
        let conn = mem();
        let first = seed_config(&conn).unwrap();
        assert!(!first.is_empty());
        let second = seed_config(&conn).unwrap();
        assert!(second.is_empty(), "second run ne doit rien re-poser");
    }

    #[test]
    fn seed_config_traite_une_cle_vide_comme_absente() {
        let conn = mem();
        // Valeur « vide » (espaces) = considérée absente → seedée.
        config::set(&conn, KEY_LITELLM_ENDPOINT, "   ").unwrap();
        let set = seed_config(&conn).unwrap();
        assert!(set.contains(&KEY_LITELLM_ENDPOINT.to_string()));
        assert_eq!(
            config::get(&conn, KEY_LITELLM_ENDPOINT).unwrap(),
            Some("http://localhost:11434/v1".to_string())
        );
    }

    #[test]
    fn toutes_les_cles_seedees_sont_non_sensibles() {
        // Garde de cloisonnement (calque L3/L4/L6) : aucune clé D4 ne matche le filtre
        // `key|token|secret|password` (sinon `config_all` la masquerait).
        for (key, _) in demo_config_targets() {
            let k = key.to_lowercase();
            assert!(
                !(k.contains("token")
                    || k.contains("key")
                    || k.contains("secret")
                    || k.contains("password")),
                "{key} devrait rester non sensible"
            );
        }
    }

    #[test]
    fn cible_ia_est_l_ollama_hote_pas_le_conteneur_docker() {
        // R-L7-6 : la cible IA est :11434 (hôte), JAMAIS :11435 (conteneur) ni :4020 (LiteLLM).
        let targets = demo_config_targets();
        let endpoint = targets
            .iter()
            .find(|(k, _)| *k == KEY_LITELLM_ENDPOINT)
            .map(|(_, v)| *v)
            .unwrap();
        assert!(endpoint.contains(":11434"));
        assert!(!endpoint.contains(":11435"));
        assert!(!endpoint.contains(":4020"));
    }

    // --- D3 : création de dossier idempotente + git réel ---

    #[test]
    fn create_demo_dir_cree_le_dossier_et_les_fichiers_au_premier_run() {
        let root = tmp_dir("create");
        let (demo, created) = create_demo_dir(&root).unwrap();
        assert!(created, "premier run doit créer le dossier");
        assert!(demo.is_dir());
        assert!(demo.join("README.md").is_file());
        assert!(demo.join("specs/PROJET.md").is_file());
        assert!(demo.join("specs/etat-des-lieux.md").is_file());
        // L'état des lieux porte une ligne version (pour `read_version`).
        let etat = fs::read_to_string(demo.join("specs/etat-des-lieux.md")).unwrap();
        assert!(etat.contains("| Version | v0.1.0 |"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn create_demo_dir_idempotent_ne_recree_rien_si_present() {
        let root = tmp_dir("idem");
        let (demo, created_first) = create_demo_dir(&root).unwrap();
        assert!(created_first);
        // On marque le dossier (fichier sentinelle) pour prouver qu'il n'est pas recréé.
        fs::write(demo.join("sentinelle.txt"), "ne pas effacer").unwrap();
        let (_demo2, created_second) = create_demo_dir(&root).unwrap();
        assert!(!created_second, "second run ne doit PAS recréer le dossier");
        // La sentinelle survit → aucun écrasement.
        assert!(demo.join("sentinelle.txt").is_file());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn init_git_repo_ne_rejoue_rien_si_dot_git_present() {
        let root = tmp_dir("dotgit");
        let demo = root.join(DEMO_DIR_NAME);
        fs::create_dir_all(demo.join(".git")).unwrap();
        // Marqueur dans le faux .git : ne doit pas être touché (aucune commande git rejouée).
        fs::write(demo.join(".git/SENTINEL"), "x").unwrap();
        init_git_repo(&demo);
        assert!(demo.join(".git/SENTINEL").is_file());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn create_demo_dir_initialise_un_git_reel_quand_git_dispo() {
        // Best-effort : si `git` est absent de l'environnement de test, on n'échoue
        // pas (le dossier reste « hors git », comportement spécifié). Sinon on vérifie
        // qu'un commit existe.
        let root = tmp_dir("gitreal");
        let (demo, _) = create_demo_dir(&root).unwrap();
        let git_present = git::capture(&demo, &["rev-parse", "--git-dir"]).is_some();
        if git_present {
            let log = git::capture(&demo, &["log", "-1", "--format=%s"]);
            assert_eq!(log.as_deref(), Some("chore: seed projet de démo"));
        }
        let _ = fs::remove_dir_all(&root);
    }

    // --- SeedReport ---

    #[test]
    fn seed_report_default_est_inerte() {
        let r = SeedReport::default();
        assert!(!r.seeded);
        assert!(r.demo_path.is_none());
        assert!(!r.created_dir);
        assert!(r.config_keys_set.is_empty());
    }

    #[test]
    fn is_blank_traite_none_et_vide_comme_absent() {
        assert!(is_blank(&None));
        assert!(is_blank(&Some("".to_string())));
        assert!(is_blank(&Some("   ".to_string())));
        assert!(!is_blank(&Some("x".to_string())));
    }
}
