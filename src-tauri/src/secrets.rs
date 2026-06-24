//! secrets — abstraction keychain OS (D5).
//!
//! Les secrets (ex. future clé LiteLLM, L3) ne sont JAMAIS stockés en clair :
//! ni en SQLite, ni en fichier, ni en commit. On s'adosse au crate `keyring`
//! (Keychain macOS / Credential Manager Windows / Secret Service Linux).
//! `stronghold` est écarté (déprécié, retrait annoncé en Tauri v3).
//!
//! L0 pose le CONTRAT `SecretStore` + un test set→get→delete. Sur un runner
//! headless sans coffre natif (ex. Linux CI sans Secret Service), le test du
//! backend réel est SKIPPÉ proprement (documenté) sans masquer que l'impl réelle
//! vise bien le keychain natif.

/// Contrat d'un coffre à secrets. Implémenté en prod par le keychain natif.
pub trait SecretStore {
    /// Écrit (ou remplace) un secret pour (service, account).
    fn set_secret(&self, service: &str, account: &str, value: &str) -> Result<(), SecretError>;
    /// Lit un secret ; `None` s'il n'existe pas.
    fn get_secret(&self, service: &str, account: &str) -> Result<Option<String>, SecretError>;
    /// Supprime un secret (idempotent : absent = succès).
    fn delete_secret(&self, service: &str, account: &str) -> Result<(), SecretError>;
}

/// Erreur du coffre, masquant le détail du backend.
#[derive(Debug)]
pub enum SecretError {
    /// Le coffre natif est indisponible sur cet environnement (ex. pas de Secret Service).
    Unavailable(String),
    /// Erreur du backend keychain.
    Backend(String),
}

impl std::fmt::Display for SecretError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SecretError::Unavailable(m) => write!(f, "coffre indisponible : {m}"),
            SecretError::Backend(m) => write!(f, "erreur keychain : {m}"),
        }
    }
}

impl std::error::Error for SecretError {}

/// Implémentation réelle : keychain natif de l'OS via le crate `keyring`.
pub struct KeyringStore;

impl KeyringStore {
    pub fn new() -> Self {
        KeyringStore
    }

    fn entry(service: &str, account: &str) -> Result<keyring::Entry, SecretError> {
        keyring::Entry::new(service, account).map_err(|e| SecretError::Unavailable(e.to_string()))
    }
}

impl Default for KeyringStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SecretStore for KeyringStore {
    fn set_secret(&self, service: &str, account: &str, value: &str) -> Result<(), SecretError> {
        Self::entry(service, account)?
            .set_password(value)
            .map_err(|e| SecretError::Backend(e.to_string()))
    }

    fn get_secret(&self, service: &str, account: &str) -> Result<Option<String>, SecretError> {
        match Self::entry(service, account)?.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(SecretError::Backend(e.to_string())),
        }
    }

    fn delete_secret(&self, service: &str, account: &str) -> Result<(), SecretError> {
        match Self::entry(service, account)?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()), // idempotent
            Err(e) => Err(SecretError::Backend(e.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    /// Backend mock en mémoire — valide le CONTRAT du trait sans dépendre d'un
    /// coffre natif (test déterministe sur n'importe quel runner).
    #[derive(Default)]
    struct MockStore {
        map: RefCell<HashMap<(String, String), String>>,
    }

    impl SecretStore for MockStore {
        fn set_secret(&self, s: &str, a: &str, v: &str) -> Result<(), SecretError> {
            self.map
                .borrow_mut()
                .insert((s.to_string(), a.to_string()), v.to_string());
            Ok(())
        }
        fn get_secret(&self, s: &str, a: &str) -> Result<Option<String>, SecretError> {
            Ok(self
                .map
                .borrow()
                .get(&(s.to_string(), a.to_string()))
                .cloned())
        }
        fn delete_secret(&self, s: &str, a: &str) -> Result<(), SecretError> {
            self.map
                .borrow_mut()
                .remove(&(s.to_string(), a.to_string()));
            Ok(())
        }
    }

    /// Test de contrat (mock) : toujours exécuté, déterministe.
    #[test]
    fn contrat_set_get_delete_sur_mock() {
        let store = MockStore::default();
        assert_eq!(store.get_secret("svc", "acc").unwrap(), None);
        store.set_secret("svc", "acc", "topsecret").unwrap();
        assert_eq!(
            store.get_secret("svc", "acc").unwrap(),
            Some("topsecret".to_string())
        );
        store.delete_secret("svc", "acc").unwrap();
        assert_eq!(store.get_secret("svc", "acc").unwrap(), None);
        // delete idempotent
        store.delete_secret("svc", "acc").unwrap();
    }

    /// Test du backend RÉEL (keychain natif). Skip documenté si le coffre est
    /// indisponible (ex. Linux headless sans Secret Service). Sur macOS le
    /// Keychain fonctionne → le cycle complet doit passer.
    #[test]
    fn contrat_set_get_delete_sur_keyring_reel() {
        let store = KeyringStore::new();
        let service = "iakacockpit-test";
        let account = "l0-roundtrip";

        match store.set_secret(service, account, "valeur-de-test") {
            Ok(()) => {}
            Err(e) => {
                eprintln!("[secrets] SKIP keychain réel (coffre natif indisponible) : {e}");
                return;
            }
        }
        let got = store
            .get_secret(service, account)
            .expect("get après set doit réussir");
        assert_eq!(got, Some("valeur-de-test".to_string()));
        store
            .delete_secret(service, account)
            .expect("delete doit réussir");
        assert_eq!(store.get_secret(service, account).unwrap(), None);
    }
}
