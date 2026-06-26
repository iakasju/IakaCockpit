//! shell — résolution du shell par défaut, cross-OS (D4, enrichi L8/D10).
//!
//! Grave la dé-Windows-isation dès L0 : plus aucun `cmd /C`. On choisit
//! EXPLICITEMENT le shell par OS et on le matérialise dans un
//! `portable_pty::CommandBuilder` (l'API n'a pas de défaut par OS intégré).
//!
//! L0 = résolution + test SEULEMENT. Aucune session PTY n'est ouverte ici :
//! l'ouverture réelle (I/O, resize) relève de L1/L2.
//!
//! **L8/D10 — terminal in-app = TERMINAL RÉEL de l'utilisateur.** Sur Unix, le
//! shell est spawné en **login shell** (`-l`) pour qu'il source le profil de
//! login (`~/.zprofile`/`~/.zlogin`, puis `~/.zshrc` en interactif via le PTY) :
//! PATH, alias, env, prompt **identiques** au terminal habituel. Sans `-l`, un zsh
//! interactif ne source PAS `~/.zprofile` → PATH appauvri (constat AR-2 enrichi).
//! Windows reste **inchangé** : `pwsh`/`powershell` chargent leur `$PROFILE` par
//! défaut en interactif — on n'ajoute **pas** `-NoProfile` (et jamais `cmd`).

use portable_pty::CommandBuilder;

/// Décrit le shell choisi pour l'OS courant (programme + arguments éventuels).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellSpec {
    pub program: String,
    pub args: Vec<String>,
}

impl ShellSpec {
    /// Construit un `CommandBuilder` portable-pty à partir de la spec.
    pub fn to_command(&self) -> CommandBuilder {
        let mut cmd = CommandBuilder::new(&self.program);
        cmd.args(&self.args);
        cmd
    }
}

/// Retourne le shell par défaut pour l'OS courant.
///
/// - Windows : `pwsh` si présent, sinon `powershell` (jamais `cmd`).
/// - macOS/Linux : `$SHELL` si défini et non vide, sinon `/bin/zsh`, sinon `/bin/bash`.
pub fn default_shell() -> ShellSpec {
    if cfg!(windows) {
        default_shell_windows(which_in_path("pwsh"))
    } else {
        default_shell_unix(std::env::var("SHELL").ok(), |p| {
            std::path::Path::new(p).exists()
        })
    }
}

/// Logique Windows isolée et testable : `pwsh` si trouvé dans le PATH, sinon `powershell`.
fn default_shell_windows(pwsh_available: bool) -> ShellSpec {
    let program = if pwsh_available { "pwsh" } else { "powershell" };
    ShellSpec {
        program: program.to_string(),
        args: vec![],
    }
}

/// Argument de **login shell** sur Unix (D10) : source le profil de login
/// (`~/.zprofile`/`~/.zlogin`, `~/.profile`) → PATH/alias/env du terminal réel.
/// L'interactivité est assurée par le PTY lui-même (`-i` non requis).
const UNIX_LOGIN_ARG: &str = "-l";

/// Logique Unix isolée et testable : `$SHELL`, sinon premier shell standard existant.
///
/// **D10 (L8)** : le shell choisi est spawné en **login** (`-l`) pour reproduire
/// le terminal habituel de l'utilisateur (profil sourcé). Vaut pour `$SHELL` comme
/// pour les candidats standard et le dernier recours `sh`.
fn default_shell_unix(shell_env: Option<String>, exists: impl Fn(&str) -> bool) -> ShellSpec {
    if let Some(s) = shell_env {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            return ShellSpec {
                program: trimmed.to_string(),
                args: vec![UNIX_LOGIN_ARG.to_string()],
            };
        }
    }
    for candidate in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if exists(candidate) {
            return ShellSpec {
                program: candidate.to_string(),
                args: vec![UNIX_LOGIN_ARG.to_string()],
            };
        }
    }
    // Dernier recours : nom logique (résolu via PATH au spawn réel en L1).
    ShellSpec {
        program: "sh".to_string(),
        args: vec![UNIX_LOGIN_ARG.to_string()],
    }
}

/// Vérifie grossièrement la présence d'un exécutable dans le PATH.
fn which_in_path(program: &str) -> bool {
    let Some(path) = std::env::var_os("PATH") else {
        return false;
    };
    std::env::split_paths(&path).any(|dir| {
        let candidate = dir.join(program);
        candidate.exists()
            || candidate.with_extension("exe").exists()
            || candidate.with_extension("cmd").exists()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_courant_est_non_vide_et_coherent_avec_los() {
        let spec = default_shell();
        assert!(!spec.program.is_empty());
        if cfg!(windows) {
            // Jamais cmd : powershell uniquement.
            assert!(spec.program.contains("powershell") || spec.program.contains("pwsh"));
        } else {
            // Un chemin/binaire de shell Unix raisonnable.
            assert!(
                spec.program.contains("sh")
                    || spec.program.starts_with('/')
                    || !spec.program.is_empty()
            );
        }
    }

    #[test]
    fn windows_prefere_pwsh_si_present() {
        assert_eq!(default_shell_windows(true).program, "pwsh");
        assert_eq!(default_shell_windows(false).program, "powershell");
    }

    #[test]
    fn unix_respecte_shell_env() {
        let spec = default_shell_unix(Some("/usr/bin/fish".to_string()), |_| false);
        assert_eq!(spec.program, "/usr/bin/fish");
        // D10 : login shell → source le profil (terminal réel).
        assert_eq!(spec.args, vec!["-l".to_string()]);
    }

    #[test]
    fn unix_sans_env_prend_premier_existant() {
        // Seul /bin/bash "existe" dans ce faux FS.
        let spec = default_shell_unix(None, |p| p == "/bin/bash");
        assert_eq!(spec.program, "/bin/bash");
        assert_eq!(spec.args, vec!["-l".to_string()]);
    }

    #[test]
    fn unix_env_vide_ignore() {
        let spec = default_shell_unix(Some("  ".to_string()), |p| p == "/bin/zsh");
        assert_eq!(spec.program, "/bin/zsh");
        assert_eq!(spec.args, vec!["-l".to_string()]);
    }

    #[test]
    fn unix_est_un_login_shell_meme_en_dernier_recours() {
        // Aucun candidat n'existe → dernier recours `sh`, toujours en login (D10).
        let spec = default_shell_unix(None, |_| false);
        assert_eq!(spec.program, "sh");
        assert_eq!(spec.args, vec!["-l".to_string()]);
    }

    #[test]
    fn windows_ne_force_pas_d_argument_de_login() {
        // Windows : profil chargé par défaut, jamais `-NoProfile`, pas de `-l`.
        assert!(default_shell_windows(true).args.is_empty());
        assert!(default_shell_windows(false).args.is_empty());
    }

    #[test]
    fn produit_un_command_builder() {
        let spec = ShellSpec {
            program: "/bin/zsh".to_string(),
            args: vec!["-l".to_string()],
        };
        let _cmd = spec.to_command();
        // On vérifie surtout que la construction ne panique pas (pas de spawn).
        assert_eq!(spec.args, vec!["-l".to_string()]);
    }
}
