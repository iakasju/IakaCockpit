//! pathguard — garde-fou anti-traversal (D6).
//!
//! Tout accès au système de fichiers sous le chapeau (L1+) DOIT passer par ce
//! module. iakaIDE avait un équivalent NON testé ; ici les tests (passants ET
//! attaques, cross-OS) sont posés dès le premier commit.
//!
//! Principe : on normalise *purement* (sans toucher au disque) les composants du
//! chemin candidat, en refusant toute remontée (`..`) qui ferait sortir de la base,
//! ainsi que tout chemin absolu injecté. La normalisation sans I/O garde la fonction
//! testable de façon déterministe sur les 3 OS, indépendamment de l'existence réelle
//! des fichiers (les symlinks hors base relèvent d'une vérif L1 sur disque réel).

use std::path::{Component, Path, PathBuf};

/// Erreurs de validation de chemin.
#[derive(Debug, PartialEq, Eq)]
pub enum PathGuardError {
    /// Le candidat s'évade de la base (remontée `..` ou absolu injecté).
    Escapes,
    /// Composant inattendu (préfixe Windows injecté, racine, etc.).
    InvalidComponent,
}

impl std::fmt::Display for PathGuardError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PathGuardError::Escapes => write!(f, "le chemin s'évade de la base autorisée"),
            PathGuardError::InvalidComponent => write!(f, "composant de chemin invalide"),
        }
    }
}

impl std::error::Error for PathGuardError {}

/// Normalise les composants d'un chemin RELATIF sans accès disque.
///
/// - `.` est ignoré ;
/// - `..` dépile le dernier segment ; s'il n'y a rien à dépiler → évasion ;
/// - un composant racine/préfixe (chemin absolu ou `C:\`) → invalide.
fn normalize_relative(candidate: &Path) -> Result<PathBuf, PathGuardError> {
    let mut stack: Vec<std::ffi::OsString> = Vec::new();
    for comp in candidate.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                // Remontée : interdit de dépasser la base.
                if stack.pop().is_none() {
                    return Err(PathGuardError::Escapes);
                }
            }
            Component::Normal(seg) => stack.push(seg.to_os_string()),
            // Un chemin absolu, une racine ou un préfixe disque injecté n'a rien
            // à faire dans un candidat relatif sous le chapeau.
            Component::RootDir | Component::Prefix(_) => {
                return Err(PathGuardError::InvalidComponent);
            }
        }
    }
    let mut out = PathBuf::new();
    for seg in stack {
        out.push(seg);
    }
    Ok(out)
}

/// Résout `candidate` (relatif) sous `base` en garantissant qu'il ne s'en évade pas.
///
/// Refuse : `..` qui remonte au-dessus de la base, chemins absolus injectés,
/// préfixes Windows (`C:\`). Renvoie le chemin joint normalisé sous `base`.
pub fn safe_path(base: &Path, candidate: &Path) -> Result<PathBuf, PathGuardError> {
    let normalized = normalize_relative(candidate)?;
    Ok(base.join(normalized))
}

/// Résout le répertoire d'un projet sous le chapeau `root`.
///
/// `project` doit être un simple identifiant de projet restant sous le chapeau
/// (mêmes garanties que `safe_path`).
pub fn safe_project_dir(root: &Path, project: &str) -> Result<PathBuf, PathGuardError> {
    safe_path(root, Path::new(project))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> PathBuf {
        PathBuf::from("/home/user/work")
    }

    // --- Cas passants ---

    #[test]
    fn accepte_un_sous_chemin_simple() {
        let p = safe_path(&base(), Path::new("projet/src")).unwrap();
        assert_eq!(p, base().join("projet").join("src"));
    }

    #[test]
    fn accepte_un_point_courant() {
        let p = safe_path(&base(), Path::new("./projet")).unwrap();
        assert_eq!(p, base().join("projet"));
    }

    #[test]
    fn accepte_remontee_compensee_restant_sous_base() {
        // a/../b reste sous la base -> autorisé, normalisé en b.
        let p = safe_path(&base(), Path::new("a/../b")).unwrap();
        assert_eq!(p, base().join("b"));
    }

    #[test]
    fn safe_project_dir_simple() {
        let p = safe_project_dir(&base(), "iakacockpit").unwrap();
        assert_eq!(p, base().join("iakacockpit"));
    }

    // --- Cas d'attaque (DOIVENT être rejetés) ---

    #[test]
    fn rejette_traversal_unix() {
        assert_eq!(
            safe_path(&base(), Path::new("../../etc/passwd")),
            Err(PathGuardError::Escapes)
        );
    }

    #[test]
    fn rejette_traversal_remontee_simple() {
        assert_eq!(
            safe_path(&base(), Path::new("..")),
            Err(PathGuardError::Escapes)
        );
    }

    #[test]
    fn rejette_chemin_absolu_unix_injecte() {
        assert_eq!(
            safe_path(&base(), Path::new("/etc/passwd")),
            Err(PathGuardError::InvalidComponent)
        );
    }

    #[test]
    fn rejette_traversal_avec_separateur_backslash() {
        // Sur Windows `\` est un séparateur ; ailleurs il fait partie du nom.
        // On vérifie le comportement de façon cross-OS sans dépendre de l'OS courant.
        let candidate = Path::new("..\\..\\windows\\system32");
        let res = safe_path(&base(), candidate);
        if cfg!(windows) {
            assert_eq!(res, Err(PathGuardError::Escapes));
        } else {
            // Sur Unix, "..\\.." est un seul segment littéral -> reste sous base.
            assert!(res.is_ok());
            assert_eq!(res.unwrap(), base().join("..\\..\\windows\\system32"));
        }
    }

    #[test]
    fn rejette_evasion_meme_avec_segments_avant() {
        // a/../../x remonte d'un cran de trop -> évasion.
        assert_eq!(
            safe_path(&base(), Path::new("a/../../x")),
            Err(PathGuardError::Escapes)
        );
    }

    #[test]
    fn safe_project_dir_rejette_traversal() {
        assert_eq!(
            safe_project_dir(&base(), "../secrets"),
            Err(PathGuardError::Escapes)
        );
    }

    #[cfg(windows)]
    #[test]
    fn rejette_prefixe_disque_windows() {
        assert_eq!(
            safe_path(&base(), Path::new("C:\\Windows")),
            Err(PathGuardError::InvalidComponent)
        );
    }
}
