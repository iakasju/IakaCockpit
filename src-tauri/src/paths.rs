//! paths — résolution du chapeau (« hat root ») cross-OS (D3).
//!
//! Reproduit l'INTENTION d'iakaIDE (`const DEFAULT_ROOT = "C:\\work"`) SANS son
//! hardcoding Windows : la racine par défaut est CALCULÉE par OS à l'exécution, et
//! surchargeable via la variable d'environnement `IAKAFRAME_ROOT`.
//!
//! Ordre de résolution :
//!   1. `IAKAFRAME_ROOT` si définie et non vide ;
//!   2. défaut par OS : `<home>/work` (macOS/Linux), `<home>\work` (Windows),
//!      le home étant résolu dynamiquement via `dirs`. Aucune constante de chemin
//!      Windows en dur.

use std::path::PathBuf;

/// Nom de la variable d'environnement de surcharge du chapeau.
pub const HAT_ROOT_ENV: &str = "IAKAFRAME_ROOT";

/// Sous-dossier par défaut du chapeau, relatif au home de l'utilisateur.
const HAT_SUBDIR: &str = "work";

/// Résout la racine du chapeau pour l'OS courant.
///
/// Renvoie le chemin issu de `IAKAFRAME_ROOT` si défini et non vide, sinon le
/// défaut calculé `<home>/work`.
pub fn resolve_hat_root() -> PathBuf {
    resolve_hat_root_with(std::env::var(HAT_ROOT_ENV).ok(), dirs::home_dir())
}

/// Variante testable : on injecte la valeur d'env et le home.
///
/// Séparée de `resolve_hat_root` pour pouvoir tester les branches sans toucher
/// l'environnement global du process (qui rendrait les tests non déterministes).
fn resolve_hat_root_with(env_value: Option<String>, home: Option<PathBuf>) -> PathBuf {
    if let Some(v) = env_value {
        let trimmed = v.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    match home {
        Some(h) => h.join(HAT_SUBDIR),
        // Dernier recours si le home est introuvable : chemin relatif, jamais un
        // disque Windows en dur. L1 pourra demander à l'utilisateur de fixer la racine.
        None => PathBuf::from(HAT_SUBDIR),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_override_est_respecte() {
        let p = resolve_hat_root_with(
            Some("/custom/root".to_string()),
            Some(PathBuf::from("/home/user")),
        );
        assert_eq!(p, PathBuf::from("/custom/root"));
    }

    #[test]
    fn env_vide_retombe_sur_le_defaut() {
        let p = resolve_hat_root_with(Some("   ".to_string()), Some(PathBuf::from("/home/user")));
        assert_eq!(p, PathBuf::from("/home/user").join("work"));
    }

    #[test]
    fn defaut_calcule_sous_le_home() {
        let p = resolve_hat_root_with(None, Some(PathBuf::from("/home/user")));
        assert_eq!(p, PathBuf::from("/home/user").join("work"));
    }

    #[test]
    fn sans_home_retombe_sur_relatif_jamais_un_disque_windows() {
        let p = resolve_hat_root_with(None, None);
        assert_eq!(p, PathBuf::from("work"));
        // Garantie cross-OS : aucun préfixe disque codé en dur.
        assert!(!p.to_string_lossy().contains("C:\\"));
    }

    #[test]
    fn resolution_reelle_ne_panique_pas() {
        // Smoke test de la fonction publique réelle (dépend de l'environnement).
        let _ = resolve_hat_root();
    }
}
