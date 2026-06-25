//! git — helper partagé d'exécution du binaire `git` (salvage iakaIDE L1).
//!
//! Point d'évolution unique pour timeout/encodage/flags git. Neutre et déjà
//! cross-OS (`git -C <dir> <args>` ; aucune dépendance OS). Pierre angulaire de
//! `portfolio::scan_portfolio`. Transposé du module iakaIDE (audit M1 : supprime
//! 4 duplications) sans recopier de dette — il n'y en avait pas.

use std::path::Path;
use std::process::Command;

/// `git -C <dir> <args>` -> stdout (trim) si succès, sinon `None`. Lecture
/// **tolérante** (scan portefeuille / log / status : une erreur git devient une
/// absence, pas un échec).
pub fn capture(dir: &Path, args: &[&str]) -> Option<String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// `git -C <dir> <args>` -> stdout (trim) ou `Err(stderr|stdout)`. Opérations
/// **strictes** : l'erreur est remontée à l'appelant. (Non consommé par les 10
/// commandes L1 ; conservé comme dépendance neutre pour les actions git L2.)
#[allow(dead_code)]
pub fn run(dir: &Path, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if out.status.success() {
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}
