//! terminal — sessions PTY interactives cross-OS (salvage iakaIDE L1).
//!
//! Une session = un onglet (`id` fourni par l'appelant) ; la sortie est streamée
//! au front par événement Tauri. Dé-Windows-isation gravée (D3) :
//! - le shell n'est PLUS `powershell.exe` en dur mais `shell::default_shell()`
//!   (pwsh/powershell sur Windows ; `$SHELL`/zsh/bash sur Unix) — socle L0 ;
//! - le `cwd`, s'il est fourni, DOIT rester sous le chapeau (`paths` L0) : un
//!   `cwd` qui s'évade est rejeté (`Err`) — un PTY est un vecteur d'exécution
//!   arbitraire, on ne l'ouvre pas hors périmètre (dette iakaIDE corrigée).
//!
//! Événements émis (le front L2 s'y abonnera) :
//! - `pty://output/{id}` -> `String` (flux de sortie) ;
//! - `pty://closed/{id}`  -> `()` (fin de session).

use portable_pty::{native_pty_system, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::paths::resolve_hat_root;
use crate::shell::default_shell;

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct TermState(Mutex<HashMap<String, Session>>);

/// Valide qu'un `cwd` (chemin absolu fourni par le front) reste sous le chapeau
/// `root`. Logique PURE (aucun accès disque) → testable cross-OS.
///
/// Refuse :
/// - un chemin relatif (le front fournit toujours un absolu : un projet du chapeau) ;
/// - tout chemin qui n'est pas un descendant (ou égal) de `root`.
fn validate_cwd(root: &Path, cwd: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(cwd);
    if !candidate.is_absolute() {
        return Err(format!("cwd doit être un chemin absolu : {cwd}"));
    }
    if !candidate.starts_with(root) {
        return Err(format!(
            "cwd hors du chapeau autorisé ({}) : {cwd}",
            root.to_string_lossy()
        ));
    }
    Ok(candidate.to_path_buf())
}

#[tauri::command]
pub fn pty_open(
    app: AppHandle,
    state: State<TermState>,
    id: String,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    // Shell par OS (socle L0) — jamais `powershell.exe` en dur.
    let mut cmd = default_shell().to_command();

    // cwd optionnel : validé sous le chapeau avant tout spawn (D3).
    if let Some(d) = cwd.as_ref().filter(|d| !d.is_empty()) {
        let root = resolve_hat_root();
        let validated = validate_cwd(&root, d)?;
        cmd.cwd(validated);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Thread de lecture : pousse la sortie vers le front via événement Tauri.
    let app2 = app.clone();
    let id2 = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app2.emit(&format!("pty://output/{id2}"), s);
                }
                Err(_) => break,
            }
        }
        let _ = app2.emit(&format!("pty://closed/{id2}"), ());
    });

    state.0.lock().unwrap().insert(
        id,
        Session {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(())
}

#[tauri::command]
pub fn pty_write(state: State<TermState>, id: String, data: String) -> Result<(), String> {
    let mut map = state.0.lock().unwrap();
    let s = map.get_mut(&id).ok_or("session inconnue")?;
    s.writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    s.writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(state: State<TermState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = state.0.lock().unwrap();
    let s = map.get(&id).ok_or("session inconnue")?;
    s.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_close(state: State<TermState>, id: String) -> Result<(), String> {
    if let Some(mut s) = state.0.lock().unwrap().remove(&id) {
        let _ = s.child.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Base cross-OS : un chemin absolu cohérent avec l'OS courant (sinon
    // `is_absolute()` / `starts_with` divergent entre Windows et Unix).
    fn root() -> PathBuf {
        if cfg!(windows) {
            PathBuf::from("C:\\Users\\u\\work")
        } else {
            PathBuf::from("/home/u/work")
        }
    }

    fn under(sub: &str) -> String {
        root().join(sub).to_string_lossy().to_string()
    }

    #[test]
    fn cwd_sous_le_chapeau_est_accepte() {
        let p = validate_cwd(&root(), &under("projet")).unwrap();
        assert_eq!(p, root().join("projet"));
    }

    #[test]
    fn cwd_egal_au_chapeau_est_accepte() {
        let r = root();
        let cwd = r.to_string_lossy().to_string();
        assert_eq!(validate_cwd(&r, &cwd).unwrap(), r);
    }

    #[test]
    fn cwd_relatif_est_rejete() {
        assert!(validate_cwd(&root(), "projet/src").is_err());
    }

    #[test]
    fn cwd_qui_sevade_du_chapeau_est_rejete() {
        let escape = if cfg!(windows) {
            "C:\\Windows\\System32"
        } else {
            "/etc/passwd"
        };
        let err = validate_cwd(&root(), escape).unwrap_err();
        assert!(err.contains("hors du chapeau"));
    }

    #[test]
    fn cwd_voisin_au_meme_prefixe_litteral_est_rejete() {
        // `/home/u/work-secret` ne doit PAS passer juste parce que la chaîne
        // commence par `/home/u/work` : `starts_with` opère par composants de
        // chemin, pas par préfixe de chaîne.
        let sibling = if cfg!(windows) {
            "C:\\Users\\u\\work-secret\\x"
        } else {
            "/home/u/work-secret/x"
        };
        assert!(validate_cwd(&root(), sibling).is_err());
    }
}
