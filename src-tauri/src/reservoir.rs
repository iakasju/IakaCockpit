//! reservoir — lecture du **réservoir iakaframe** (dépôt frère) comme SOURCE DE VÉRITÉ
//! des équipes et de leurs personas.
//!
//! Pourquoi ce module existe : le Cockpit portait jusqu'ici sa propre liste d'agents,
//! figée dans le front. Elle a divergé du réservoir sans que rien ne le signale —
//! `charon`, `helm` et `feanor` y étaient absents alors qu'ils figurent au roster
//! `teams/iakaframe-8.md` depuis longtemps. On lit désormais la source plutôt que d'en
//! tenir une copie.
//!
//! **Lecture seule, jamais d'écriture.** Le Cockpit ne modifie pas le réservoir.
//!
//! Résolution de la racine, calquée sur la convention déjà en place pour le dépôt frère
//! (`scripts/test-handoff-parity.mjs`) : `IAKAFRAME_HOME` est **autoritaire** — s'il est
//! posé et ne porte pas de réservoir, on **échoue** au lieu de se rabattre sur un voisin
//! (un repli silencieux lirait un autre dépôt et rendrait un résultat qui ne veut rien
//! dire). Sans variable, on cherche `<chapeau>/iakaframe`. Réservoir absent → `None`,
//! **jamais une erreur** : un clone isolé du Cockpit doit continuer de fonctionner.
//!
//! Le format lu est le frontmatter YAML minimal des fichiers du réservoir. On ne tire
//! **aucune** dépendance YAML pour ça : seules deux formes sont nécessaires
//! (`clé: valeur` et `clé: [a, b, c]`), et un parseur complet serait du poids mort.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Variable d'environnement autoritaire pour pointer un réservoir précis.
const RESERVOIR_ENV: &str = "IAKAFRAME_HOME";
/// Nom du dépôt réservoir sous le chapeau, quand la variable n'est pas posée.
const RESERVOIR_DIRNAME: &str = "iakaframe";

/// Un persona du réservoir : son id de fichier et sa clé de rôle déclarée.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReservoirPersona {
    /// Id = nom du fichier sans extension (`aragorn`, `charon`…).
    pub id: String,
    /// `roleKey` du frontmatter. Vide si le persona n'en déclare pas.
    pub role_key: String,
}

/// Une équipe du réservoir, telle que son frontmatter la décrit.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReservoirTeam {
    pub id: String,
    pub name: String,
    /// Ids de personas, **dans l'ordre du roster** — cet ordre porte du sens.
    pub personas: Vec<String>,
    pub coordinator: String,
}

/// Ce que le Cockpit lit du réservoir.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Reservoir {
    /// Racine effectivement lue (utile pour dire À L'ÉCRAN d'où viennent les données).
    pub root: String,
    pub teams: Vec<ReservoirTeam>,
    pub personas: Vec<ReservoirPersona>,
    /// Ids du pool de rôles (`library/roles/`), toutes méthodes confondues.
    pub roles: Vec<String>,
}

/// Un répertoire est-il un réservoir ? Signature minimale et stable.
fn is_reservoir(dir: &Path) -> bool {
    dir.join("library").join("personas").is_dir() && dir.join("teams").is_dir()
}

/// Résout la racine du réservoir. `Err` seulement si la variable autoritaire est posée
/// mais fausse — cas où se taire serait pire que rendre la main.
pub fn resolve_reservoir_root_with(
    env_value: Option<String>,
    hat_root: PathBuf,
) -> Result<Option<PathBuf>, String> {
    if let Some(v) = env_value {
        let trimmed = v.trim();
        if !trimmed.is_empty() {
            let p = PathBuf::from(trimmed);
            return if is_reservoir(&p) {
                Ok(Some(p))
            } else {
                Err(format!(
                    "{RESERVOIR_ENV} pointe « {trimmed} », qui ne porte pas library/personas + teams. \
                     Chemin autoritaire : aucun repli sur un autre dépôt."
                ))
            };
        }
    }
    let sibling = hat_root.join(RESERVOIR_DIRNAME);
    Ok(if is_reservoir(&sibling) {
        Some(sibling)
    } else {
        None
    })
}

/// Extrait le bloc de frontmatter (entre deux lignes `---`). Absent → `""`.
fn frontmatter(text: &str) -> &str {
    let rest = match text.strip_prefix("---") {
        Some(r) => r.trim_start_matches(['\r', '\n']),
        None => return "",
    };
    match rest.find("\n---") {
        Some(i) => &rest[..i],
        None => "",
    }
}

/// Valeur scalaire d'une clé de frontmatter (guillemets retirés).
fn fm_scalar(fm: &str, key: &str) -> String {
    for line in fm.lines() {
        let l = line.trim();
        if let Some(v) = l.strip_prefix(&format!("{key}:")) {
            let v = v.trim();
            if v.starts_with('[') {
                return String::new();
            }
            return v.trim_matches(['"', '\'']).to_string();
        }
    }
    String::new()
}

/// Valeur liste `clé: [a, b, c]`. Une liste absente ou d'une autre forme rend un vecteur
/// vide — on ne devine pas.
fn fm_list(fm: &str, key: &str) -> Vec<String> {
    for line in fm.lines() {
        let l = line.trim();
        if let Some(v) = l.strip_prefix(&format!("{key}:")) {
            let v = v.trim();
            if let Some(inner) = v.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
                return inner
                    .split(',')
                    .map(|s| s.trim().trim_matches(['"', '\'']).to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
            }
        }
    }
    Vec::new()
}

/// Ids des fichiers `.md` d'un répertoire, triés, hors gabarits (`_TEMPLATE`).
fn md_ids(dir: &Path) -> Vec<String> {
    let mut out: Vec<String> = match std::fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter_map(|e| {
                let p = e.path();
                if p.extension().and_then(|x| x.to_str()) != Some("md") {
                    return None;
                }
                let stem = p.file_stem()?.to_str()?.to_string();
                if stem.starts_with('_') {
                    return None;
                }
                Some(stem)
            })
            .collect(),
        Err(_) => Vec::new(),
    };
    out.sort();
    out
}

/// Lit un réservoir déjà localisé. Tolérant : un fichier illisible est ignoré, jamais fatal.
pub fn read_reservoir_at(root: &Path) -> Reservoir {
    let personas_dir = root.join("library").join("personas");
    let personas = md_ids(&personas_dir)
        .into_iter()
        .map(|id| {
            let text =
                std::fs::read_to_string(personas_dir.join(format!("{id}.md"))).unwrap_or_default();
            let role_key = fm_scalar(frontmatter(&text), "roleKey");
            ReservoirPersona { id, role_key }
        })
        .collect();

    let teams_dir = root.join("teams");
    let teams = md_ids(&teams_dir)
        .into_iter()
        .filter_map(|id| {
            let text =
                std::fs::read_to_string(teams_dir.join(format!("{id}.md"))).unwrap_or_default();
            let fm = frontmatter(&text);
            let personas = fm_list(fm, "personas");
            // Une team sans roster n'est pas exploitable : on la laisse de côté plutôt que
            // de faire remonter une équipe vide dans l'IHM.
            if personas.is_empty() {
                return None;
            }
            let declared = fm_scalar(fm, "id");
            let name = fm_scalar(fm, "name");
            Some(ReservoirTeam {
                id: if declared.is_empty() { id } else { declared },
                name,
                coordinator: fm_scalar(fm, "coordinator"),
                personas,
            })
        })
        .collect();

    Reservoir {
        root: root.to_string_lossy().to_string(),
        teams,
        personas,
        roles: md_ids(&root.join("library").join("roles")),
    }
}

/// Commande façade : rend le réservoir, ou `None` s'il n'y en a pas sur ce poste.
#[tauri::command]
pub fn read_reservoir() -> Result<Option<Reservoir>, String> {
    let root = resolve_reservoir_root_with(
        std::env::var(RESERVOIR_ENV).ok(),
        crate::paths::resolve_hat_root(),
    )?;
    Ok(root.as_deref().map(read_reservoir_at))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Arène DÉDIÉE par test : les tests Rust tournent en parallèle, une arène partagée
    /// ferait qu'un test supprime le répertoire pendant qu'un autre le lit (flake garanti).
    fn arena(nom: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("iaka-reservoir-{}-{nom}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("library").join("personas")).unwrap();
        std::fs::create_dir_all(dir.join("library").join("roles")).unwrap();
        std::fs::create_dir_all(dir.join("teams")).unwrap();
        dir
    }

    fn persona(dir: &Path, id: &str, role: &str) {
        std::fs::write(
            dir.join("library")
                .join("personas")
                .join(format!("{id}.md")),
            format!("---\nname: {id}\nroleKey: {role}\n---\n# {id}\n"),
        )
        .unwrap();
    }

    #[test]
    fn frontmatter_scalaire_et_liste() {
        let fm = frontmatter("---\nid: t\npersonas: [a, b, c]\ncoordinator: a\n---\ncorps\n");
        assert_eq!(fm_scalar(fm, "id"), "t");
        assert_eq!(fm_scalar(fm, "coordinator"), "a");
        // Une clé de LISTE ne doit pas être rendue comme scalaire.
        assert_eq!(fm_scalar(fm, "personas"), "");
        assert_eq!(fm_list(fm, "personas"), vec!["a", "b", "c"]);
        // Clé absente : vide, jamais de panique.
        assert_eq!(fm_list(fm, "absente"), Vec::<String>::new());
    }

    #[test]
    fn sans_frontmatter_rien_n_est_devine() {
        assert_eq!(frontmatter("# titre seul\n"), "");
        assert_eq!(fm_scalar("", "id"), "");
    }

    #[test]
    fn lit_roster_personas_et_roles() {
        let dir = arena("roster");
        persona(&dir, "aragorn", "coordination");
        persona(&dir, "charon", "deploiement");
        persona(&dir, "feanor", "frame");
        // Gabarit : présent dans le vrai réservoir, ne doit JAMAIS remonter comme persona.
        std::fs::write(dir.join("library/personas/_TEMPLATE.md"), "---\n---\n").unwrap();
        for r in ["coordination", "deploiement", "frame"] {
            std::fs::write(dir.join(format!("library/roles/{r}.md")), "# r\n").unwrap();
        }
        std::fs::write(
            dir.join("teams/iakaframe-8.md"),
            "---\nid: iakaframe-8\nname: La compagnie\npersonas: [aragorn, charon, feanor]\ncoordinator: aragorn\n---\n",
        )
        .unwrap();

        let r = read_reservoir_at(&dir);
        assert_eq!(r.teams.len(), 1);
        assert_eq!(r.teams[0].id, "iakaframe-8");
        assert_eq!(r.teams[0].coordinator, "aragorn");
        // L'ORDRE du roster est porteur de sens : il doit être conservé tel quel.
        assert_eq!(r.teams[0].personas, vec!["aragorn", "charon", "feanor"]);
        assert_eq!(r.personas.len(), 3, "le gabarit _TEMPLATE est exclu");
        let charon = r.personas.iter().find(|p| p.id == "charon").unwrap();
        assert_eq!(charon.role_key, "deploiement");
        assert_eq!(r.roles, vec!["coordination", "deploiement", "frame"]);
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn team_sans_roster_est_ecartee() {
        let dir = arena("sans-roster");
        std::fs::write(
            dir.join("teams/vide.md"),
            "---\nid: vide\nname: Vide\n---\n",
        )
        .unwrap();
        assert!(read_reservoir_at(&dir).teams.is_empty());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn racine_absente_rend_none_jamais_une_erreur() {
        // Un clone isolé du Cockpit doit continuer de fonctionner sans réservoir.
        let vide = std::env::temp_dir().join("iaka-pas-de-reservoir");
        let r = resolve_reservoir_root_with(None, vide);
        assert_eq!(r, Ok(None));
    }

    #[test]
    fn variable_autoritaire_fausse_echoue_au_lieu_de_se_replier() {
        let dir = arena("autoritaire");
        let faux = std::env::temp_dir().join(format!("iaka-faux-{}", std::process::id()));
        std::fs::create_dir_all(&faux).unwrap();
        // Le chapeau porte un VRAI réservoir : si le repli existait, il masquerait l'erreur.
        let res = resolve_reservoir_root_with(
            Some(faux.to_string_lossy().to_string()),
            dir.parent().unwrap().to_path_buf(),
        );
        assert!(res.is_err(), "un chemin autoritaire faux doit échouer");
        assert!(res.unwrap_err().contains("aucun repli"));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn variable_vide_est_ignoree() {
        let dir = arena("vide");
        let hat = dir.parent().unwrap().to_path_buf();
        // Le dossier d'arène n'est pas nommé « iakaframe » : la découverte par frère ne
        // doit rien trouver, et surtout ne pas échouer.
        assert_eq!(
            resolve_reservoir_root_with(Some("   ".into()), hat),
            Ok(None)
        );
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
