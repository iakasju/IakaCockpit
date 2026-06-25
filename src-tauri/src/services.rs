//! services — état des services iakabox (salvage iakaIDE L1, MVP).
//!
//! `check_services()` teste chaque endpoint par une connexion TCP. La liste est
//! codée en dur (D5, MVP toléré — la rendre dynamique est un raffinement hors L1).
//! La commande **ne renvoie jamais d'erreur** : un service injoignable (timeout,
//! hors box) devient simplement `reachable: false` (R-L1-5). Logique neutre,
//! aucune dette OS.

use serde::Serialize;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

#[derive(Serialize, Clone)]
pub struct ServiceStatus {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub url: String,
    pub reachable: bool,
    pub latency_ms: Option<u64>,
}

// Endpoints vérifiés (iakabox-usage.html). MVP : codés en dur (D5).
const SERVICES: &[(&str, &str, u16, &str)] = &[
    (
        "Forgejo (git)",
        "192.168.2.11",
        3001,
        "http://192.168.2.11:3001",
    ),
    ("Ollama", "192.168.2.12", 11434, "http://192.168.2.12:11434"),
    ("ComfyUI", "192.168.2.12", 8188, "http://192.168.2.12:8188"),
    ("Obot", "192.168.2.12", 3009, "http://192.168.2.12:3009"),
    ("AppFlowy", "192.168.2.14", 3008, "http://192.168.2.14:3008"),
    // iakaboxlogs (main courante 3-canaux, L4) : CouchDB single-node.
    (
        "iakaboxlogs (CouchDB)",
        "192.168.2.11",
        5984,
        "http://192.168.2.11:5984",
    ),
];

const TIMEOUT_MS: u64 = 1500;

fn check(host: &str, port: u16) -> (bool, Option<u64>) {
    let addr = format!("{host}:{port}");
    let sa = match addr.to_socket_addrs().ok().and_then(|mut a| a.next()) {
        Some(s) => s,
        None => return (false, None),
    };
    let start = Instant::now();
    match TcpStream::connect_timeout(&sa, Duration::from_millis(TIMEOUT_MS)) {
        Ok(_) => (true, Some(start.elapsed().as_millis() as u64)),
        Err(_) => (false, None),
    }
}

#[tauri::command]
pub fn check_services() -> Vec<ServiceStatus> {
    SERVICES
        .iter()
        .map(|(name, host, port, url)| {
            let (reachable, latency_ms) = check(host, *port);
            ServiceStatus {
                name: name.to_string(),
                host: host.to_string(),
                port: *port,
                url: url.to_string(),
                reachable,
                latency_ms,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // R-L1-5 : on teste la FORME du résultat, pas la connectivité réelle (les TCP
    // .11/.12/.14 sont injoignables hors box — c'est le comportement nominal).
    #[test]
    fn check_services_renvoie_un_status_par_service_sans_paniquer() {
        let statuses = check_services();
        assert_eq!(statuses.len(), SERVICES.len());
        for (s, (name, host, port, url)) in statuses.iter().zip(SERVICES.iter()) {
            assert_eq!(s.name, *name);
            assert_eq!(s.host, *host);
            assert_eq!(s.port, *port);
            assert_eq!(s.url, *url);
            // Cohérence : une latence n'est rapportée que si le service répond.
            assert_eq!(s.latency_ms.is_some(), s.reachable);
        }
    }

    #[test]
    fn check_hote_invalide_degrade_proprement() {
        // Hôte non résoluble -> (false, None), jamais de panique.
        let (reachable, latency) = check("hote.inexistant.invalid", 65000);
        assert!(!reachable);
        assert_eq!(latency, None);
    }
}
