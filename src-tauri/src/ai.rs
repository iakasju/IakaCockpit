//! ai — moteur « prochaine étape » (L3).
//!
//! UN endpoint OpenAI-compat **configurable**, UN appel `POST /chat/completions`.
//! « On câble, on ne route pas » (R4) : aucun `match provider`, aucun `cmd /C`,
//! aucune URL Ollama/Claude en dur, aucun second client HTTP. La cible (LiteLLM
//! LAN recommandé, Ollama localhost/LAN, ou cloud OpenAI-compat) est choisie par
//! **config** (`litellm_endpoint` + `litellm_model`), pas par code.
//!
//! Logique salvagée d'`iakaIDE/src-tauri/src/ai.rs` (F2) **réécrite propre** sur le
//! socle L0/L1 :
//!   - `build_context(path)` : assemble nom + extraits specs + git, avec en plus la
//!     **validation `pathguard`** que iakaIDE n'avait pas (D3) ;
//!   - `build_prompt(ctx)` : prompt système **conscient de la méthode iakaframe**
//!     (D3-bis / A4 — texte à confirmer par Stéphane) ;
//!   - **un seul** appel `/chat/completions` (D1) + parsing `choices[0].message`
//!     + `usage` ;
//!   - **mock dev** déterministe sans réseau (D5 / A2) ;
//!   - **dégradation propre** : tout chemin d'erreur renvoie `Err(String)` lisible
//!     (D6), jamais de panique.
//!
//! La **clé IA est optionnelle** et vit au keychain (module `secrets` L0, account
//! neutre `ai_api_key`) : jamais en SQLite, jamais renvoyée au front. L'en-tête
//! `Authorization` est **omis** quand aucune clé n'est enregistrée (cas Ollama local).

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::config::{self, KEY_LITELLM_ENDPOINT};
use crate::db;
use crate::git;
use crate::pathguard;
use crate::secrets::{KeyringStore, SecretStore};

/// Clé de config non sensible : modèle/alias transmis tel quel à l'endpoint (D4).
pub const KEY_LITELLM_MODEL: &str = "litellm_model";

/// Service keychain (cohérent avec le reste de l'app).
pub const SECRET_SERVICE: &str = "iakacockpit";
/// Account keychain **neutre** : la clé sert LiteLLM `master_key` OU une clé cloud
/// (D4). Un Ollama localhost/LAN n'en a pas besoin.
pub const SECRET_ACCOUNT: &str = "ai_api_key";

/// Modèle/alias Ollama self-hosted **par défaut** (A1 — défaut self-hosted, sans
/// clé). **Valeur à confirmer par Stéphane** : doit correspondre à un modèle
/// réellement disponible côté box/localhost. Changer de cible (LiteLLM/cloud) =
/// simple changement de config, sans toucher au code.
pub const DEFAULT_MODEL: &str = "llama3.1:8b";

/// Variable d'environnement forçant le mode mock (A2, bascule implicite).
const ENV_MOCK_FLAG: &str = "IAKACOCKPIT_AI_MOCK";

/// Timeout borné de l'appel réseau (D6). Un modèle local peut être lent au premier
/// chargement → marge confortable, mais fini (jamais d'attente infinie).
const HTTP_TIMEOUT_SECS: u64 = 180;

/// Réponse du moteur, sérialisée vers le front (miroir TS `NextStep`, snake_case).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct NextStep {
    /// Suggestion lisible (3-5 lignes).
    pub suggestion: String,
    /// `"litellm"` (endpoint réel configuré) | `"mock"` (simulé, sans réseau).
    pub provider: String,
    /// Modèle effectif (`litellm_model`), pour affichage.
    pub model: Option<String>,
    /// `usage.prompt_tokens` si présent.
    pub tokens_in: Option<u32>,
    /// `usage.completion_tokens` si présent.
    pub tokens_out: Option<u32>,
}

// --- Chat multi-tours persona-aware (L8/D2) ---

/// Un message du fil de chat reçu du front (`role` = "user" | "assistant").
/// L'historique vit côté front (mémoire MVP, D3) et est réinjecté à chaque tour.
#[derive(Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Réponse d'un tour de chat, sérialisée vers le front (snake_case, miroir TS).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ChatReply {
    /// Réponse de l'assistant (l'agent incarné).
    pub content: String,
    /// `"litellm"` (endpoint réel) | `"mock"` (simulé, sans réseau).
    pub provider: String,
    pub model: Option<String>,
    pub tokens_in: Option<u32>,
    pub tokens_out: Option<u32>,
}

/// Carte d'un agent iakaframe : royaume + rôle dans la méthode (persona-aware, D2).
struct Persona {
    name: &'static str,
    royaume: &'static str,
    role: &'static str,
}

/// Agent **responsable par défaut** en contexte projet (AR-1) : Aragorn (ACCUEIL).
const DEFAULT_AGENT: &str = "Aragorn";

/// Table persona (les 5 agents du roster L8, AR-3). Petite constante Rust → le
/// backend reste autonome (pas besoin que le front lui passe royaume/rôle).
const PERSONAS: &[Persona] = &[
    Persona {
        name: "Odin",
        royaume: "PORTEFEUILLE",
        role: "responsable du portefeuille (vision d'ensemble, arbitrages inter-projets)",
    },
    Persona {
        name: "Aragorn",
        royaume: "ACCUEIL",
        role: "responsable de projet — accueil et dispatch (cadrage du besoin, répartition du travail)",
    },
    Persona {
        name: "Gandalf",
        royaume: "CADRAGE",
        role: "cadreur — il rédige les instructions de lot avant tout code (specs/instructions/)",
    },
    Persona {
        name: "Gimli",
        royaume: "DEV",
        role: "développeur + devops — il implémente par commits atomiques, build, déploiement staging",
    },
    Persona {
        name: "Legolas",
        royaume: "QUALITÉ",
        role: "gate qualité indépendant — tests, lint, typage, verdict pass/fail",
    },
];

/// Résout la persona de `agent` (insensible à la casse). Agent inconnu/vide →
/// **fallback responsable** (Aragorn) — jamais d'erreur (D2).
fn resolve_persona(agent: &str) -> &'static Persona {
    let wanted = agent.trim();
    PERSONAS
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(wanted))
        .unwrap_or_else(|| {
            PERSONAS
                .iter()
                .find(|p| p.name == DEFAULT_AGENT)
                .expect("Aragorn doit exister dans PERSONAS")
        })
}

/// Tronque un texte à `max` caractères (suffixe explicite). Salvage d'`ai.rs`.
fn head(txt: &str, max: usize) -> String {
    if txt.chars().count() <= max {
        txt.to_string()
    } else {
        txt.chars().take(max).collect::<String>() + "\n…(tronqué)"
    }
}

/// Valide le `path` projet avant toute lecture FS (D3 / R-L3-4).
///
/// Le `path` reçu du front est un chemin **absolu** de projet (issu du portfolio).
/// On exige qu'il soit un **dossier existant** ; on durcit ensuite l'accès FS via
/// `pathguard` en n'ouvrant que des sous-chemins relatifs validés sous ce dossier
/// (`specs/PROJET.md`, `specs/etat-des-lieux.md`) — jamais de remontée `..`.
pub(crate) fn validate_project_dir(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);
    if path.trim().is_empty() {
        return Err("chemin de projet vide".to_string());
    }
    if !p.is_dir() {
        return Err(format!("Projet introuvable : {}", p.display()));
    }
    Ok(p.to_path_buf())
}

/// Lit un fichier de specs sous le dossier projet, **chemin validé `pathguard`**.
/// Fichier absent / illisible → texte de remplacement (jamais d'échec, D3).
fn read_spec(base: &Path, rel: &str, fallback: &str) -> String {
    match pathguard::safe_path(base, Path::new(rel)) {
        Ok(full) => std::fs::read_to_string(full)
            .map(|t| head(&t, 2500))
            .unwrap_or_else(|_| fallback.to_string()),
        // Un `rel` codé en dur ici ne peut pas s'évader ; cette branche est une
        // garde défensive (jamais d'échec → fallback).
        Err(_) => fallback.to_string(),
    }
}

/// Assemble le contexte borné (RAG ANNULÉ, § 10.3) : nom + extraits specs + git.
/// Salvage de la logique `ai.rs`, **avec validation de chemin** ajoutée (D3).
fn build_context(base: &Path) -> String {
    let name = base
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let projet = read_spec(base, "specs/PROJET.md", "(pas de specs/PROJET.md)");
    let etat = read_spec(base, "specs/etat-des-lieux.md", "(pas d'état des lieux)");

    let branch = git::capture(base, &["rev-parse", "--abbrev-ref", "HEAD"]).unwrap_or_default();
    let status = git::capture(base, &["status", "--short"]).unwrap_or_default();
    let log = git::capture(base, &["log", "-5", "--format=%cs %s"]).unwrap_or_default();

    format!(
        "# Projet : {name}\n\n## PROJET.md (extrait)\n{projet}\n\n\
## État des lieux (extrait)\n{etat}\n\n## Git\nbranche: {branch}\nstatus:\n{status}\n\n\
derniers commits:\n{log}\n"
    )
}

/// Prompt système **conscient de la méthode iakaframe** (D3-bis / A4).
///
/// ⚠️ **Texte proposé par Gimli — à valider/ajuster par Stéphane.** Mobilise le
/// vocabulaire de la méthode (lots L0/L1…, jalons & gates Gandalf→Gimli→Legolas,
/// instructions `specs/instructions/`, état des lieux, état git) pour une suggestion
/// directement exploitable dans le cycle iakaframe.
fn build_prompt(ctx: &str) -> String {
    format!(
        "Tu es l'assistant de pilotage de projet d'IakaCockpit, conscient de la méthode \
de travail iakaframe. Cette méthode avance par LOTS numérotés (L0, L1, L2…), chacun \
cadré par une INSTRUCTION écrite dans specs/instructions/ (rôle Gandalf — cadrage), \
implémenté par commits atomiques (rôle Gimli — développement), puis validé par un GATE \
indépendant (rôle Legolas — tests/lint/typage, verdict pass/fail) avant tout JALON. \
L'état réel du projet est donné ci-dessous : extraits de specs/PROJET.md (vision) et de \
specs/etat-des-lieux.md, plus l'état git (branche, fichiers modifiés, derniers commits).\n\n\
À partir de cet état, propose LA prochaine étape concrète, actionnable et priorisée \
(3 à 5 lignes, en français, sans préambule ni formule de politesse). Formule-la dans le \
vocabulaire de la méthode : quelle prochaine instruction rédiger, quel lot cadrer ou \
implémenter, quel jalon faire valider au gate. Si l'arbre git est sale ou en avance sur \
la remote, dis-le explicitement et propose de le traiter. Voici l'état du projet :\n\n{ctx}"
    )
}

/// Prompt système **PERSONA-AWARE** du chat projet (D2 / AR-4).
///
/// ⚠️ **Texte proposé par Gimli — à valider/ajuster par Stéphane** (comme
/// `build_prompt` L3). Le **caractère persona-aware est gravé** (l'agent, son
/// royaume et son rôle figurent dans le prompt) ; seul le wording reste à confirmer.
/// L'agent **discute** du projet en tenant son rôle iakaframe ; le contexte projet
/// (specs + git, borné) est injecté.
fn build_prompt_chat(agent: &str, ctx: &str) -> String {
    let p = resolve_persona(agent);
    format!(
        "Tu es {name}, agent de l'équipe iakaframe du royaume [{royaume}]. Ton rôle : {role}. \
La méthode iakaframe avance par LOTS numérotés (L0, L1…), chacun cadré par une INSTRUCTION \
écrite (Gandalf — cadrage), implémenté par commits atomiques (Gimli — dev), puis validé par \
un GATE indépendant (Legolas — tests/lint/typage) avant tout jalon. Tu réponds EN TANT QUE \
{name}, à la première personne, dans ton rôle, en français, sans formule de politesse \
superflue. Reste dans ton périmètre : si une demande relève d'un autre agent, dis-le et \
oriente vers lui. Appuie-toi sur l'état réel du projet ci-dessous (extraits de \
specs/PROJET.md et specs/etat-des-lieux.md + état git) pour des réponses concrètes et \
actionnables. Voici l'état du projet :\n\n{ctx}",
        name = p.name,
        royaume = p.royaume,
        role = p.role,
    )
}

/// Réponse de chat **mockée** : déterministe, sans réseau (calque `mock_next_step`,
/// D2). Incarne l'agent demandé (persona) et le dernier message utilisateur.
fn mock_chat_reply(agent: &str, messages: &[ChatMessage], model: Option<String>) -> ChatReply {
    let p = resolve_persona(agent);
    let last_user = messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| head(&m.content, 200))
        .unwrap_or_else(|| "(aucun message)".to_string());
    let content = format!(
        "[MOCK — réponse simulée, aucun appel réseau]\n\
Ici {name} [{royaume}]. J'ai bien lu : « {last_user} ». \
Configure un endpoint IA (Réglages) pour discuter réellement avec moi.",
        name = p.name,
        royaume = p.royaume,
    );
    ChatReply {
        content,
        provider: "mock".to_string(),
        model,
        tokens_in: None,
        tokens_out: None,
    }
}

/// Parse la réponse OpenAI-compat en `ChatReply` (calque `parse_chat_completion`,
/// défensif : `Option` partout, message lisible si JSON inattendu / vide).
fn parse_chat_reply(body: &str, model: Option<String>) -> Result<ChatReply, String> {
    let v: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("réponse IA illisible (JSON) : {e}"))?;
    let content = v["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if content.is_empty() {
        return Err("l'agent n'a renvoyé aucune réponse (réponse vide)".to_string());
    }
    Ok(ChatReply {
        content,
        provider: "litellm".to_string(),
        model,
        tokens_in: v["usage"]["prompt_tokens"].as_u64().map(|x| x as u32),
        tokens_out: v["usage"]["completion_tokens"].as_u64().map(|x| x as u32),
    })
}

/// Construit la `NextStep` mockée : déterministe, sans réseau (D5 / A2).
fn mock_next_step(base: &Path, model: Option<String>) -> NextStep {
    let name = base
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "projet".to_string());
    let branch = git::capture(base, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|| "(hors git)".to_string());
    let dirty = git::capture(base, &["status", "--short"])
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let etat_git = if dirty {
        "l'arbre git est SALE (changements non commités)"
    } else {
        "l'arbre git est propre"
    };
    let suggestion = format!(
        "[MOCK — suggestion simulée, aucun appel réseau]\n\
Projet « {name} » sur la branche « {branch} » : {etat_git}.\n\
1. Rédiger l'instruction du prochain lot dans specs/instructions/ (cadrage Gandalf).\n\
2. Implémenter par commits atomiques (conventional commits), puis lancer la chaîne qualité.\n\
3. Soumettre le résultat au gate Legolas avant de marquer le jalon.\n\
(Configure un endpoint IA dans Réglages pour des suggestions réelles.)"
    );
    NextStep {
        suggestion,
        provider: "mock".to_string(),
        model,
        tokens_in: None,
        tokens_out: None,
    }
}

/// Décide si l'on bascule en mock (A2, bascule implicite) : flag d'env OU endpoint
/// vide/non configuré.
fn should_mock(endpoint: &str) -> bool {
    if std::env::var(ENV_MOCK_FLAG)
        .map(|v| v == "1")
        .unwrap_or(false)
    {
        return true;
    }
    endpoint.trim().is_empty()
}

/// Parse la réponse OpenAI-compat. Salvage défensif (R-L3-6) : `Option` partout,
/// message lisible si JSON inattendu / vide.
fn parse_chat_completion(body: &str, model: Option<String>) -> Result<NextStep, String> {
    let v: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("réponse IA illisible (JSON) : {e}"))?;
    let suggestion = v["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if suggestion.is_empty() {
        return Err("l'endpoint IA n'a renvoyé aucune suggestion (réponse vide)".to_string());
    }
    Ok(NextStep {
        suggestion,
        provider: "litellm".to_string(),
        model,
        tokens_in: v["usage"]["prompt_tokens"].as_u64().map(|x| x as u32),
        tokens_out: v["usage"]["completion_tokens"].as_u64().map(|x| x as u32),
    })
}

/// Un message OpenAI-compat `{role, content}` — brique commune à `next_step`
/// (`[system, user]`) et `chat` (`[system, …historique…]`). Généralisation L8/D2 :
/// le payload accepte un **`Vec` de longueur quelconque**, pas un couple figé.
struct Msg<'a> {
    role: &'a str,
    content: &'a str,
}

/// Sérialise les messages en tableau JSON OpenAI (`[{role, content}, …]`).
fn messages_json(messages: &[Msg<'_>]) -> serde_json::Value {
    serde_json::Value::Array(
        messages
            .iter()
            .map(|m| ureq::json!({ "role": m.role, "content": m.content }))
            .collect(),
    )
}

/// Construit le payload `/chat/completions` (model + messages + `stream:false`).
/// Extrait pur (testable sans réseau, D9) : vérifie l'ordre/forme des messages.
fn build_payload(model: &str, messages: &[Msg<'_>]) -> serde_json::Value {
    ureq::json!({
        "model": model,
        "messages": messages_json(messages),
        "stream": false,
    })
}

/// UN appel `POST {endpoint}/chat/completions` (OpenAI-compat) avec un **historique
/// de messages** de longueur quelconque (D2). Endpoint indifférent
/// (LiteLLM/Ollama/cloud). En-tête `Authorization` **omis** sans clé. Renvoie le
/// **corps brut** : le parsing (`NextStep`/`ChatReply`) est fait par l'appelant.
fn post_chat(
    endpoint: &str,
    model: &str,
    api_key: Option<&str>,
    messages: &[Msg<'_>],
) -> Result<String, String> {
    let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));
    let payload = build_payload(model, messages);

    let mut req = ureq::post(&url).timeout(Duration::from_secs(HTTP_TIMEOUT_SECS));
    if let Some(key) = api_key {
        req = req.set("Authorization", &format!("Bearer {key}"));
    }

    let resp = req
        .send_json(payload)
        .map_err(|e| format!("endpoint IA injoignable : {e}"))?;
    resp.into_string()
        .map_err(|e| format!("lecture de la réponse IA impossible : {e}"))
}

/// UN appel `/chat/completions` pour `next_step` : couple `[system, user]`, parsing
/// `NextStep`. Conserve le contrat L3 **exact** (signature/comportement inchangés),
/// désormais bâti sur `post_chat` généralisé.
fn call_endpoint(
    endpoint: &str,
    model: &str,
    api_key: Option<&str>,
    system: &str,
    user: &str,
) -> Result<NextStep, String> {
    let messages = [
        Msg {
            role: "system",
            content: system,
        },
        Msg {
            role: "user",
            content: user,
        },
    ];
    let body = post_chat(endpoint, model, api_key, &messages)?;
    parse_chat_completion(&body, Some(model.to_string()))
}

/// Lit la clé IA optionnelle au keychain (interne Rust uniquement, jamais front).
fn read_api_key(store: &dyn SecretStore) -> Option<String> {
    store
        .get_secret(SECRET_SERVICE, SECRET_ACCOUNT)
        .ok()
        .flatten()
        .filter(|k| !k.trim().is_empty())
}

// --- Commandes Tauri ---

/// Moteur « prochaine étape » sur le projet `path`. UN endpoint, UN appel
/// (D1). Mock si endpoint vide / flag dev (A2). Dégrade proprement (D6).
#[tauri::command]
pub fn next_step(app: AppHandle, path: String) -> Result<NextStep, String> {
    let base = validate_project_dir(&path)?;

    let conn = db::open(&app)?;
    let endpoint = config::get(&conn, KEY_LITELLM_ENDPOINT)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let model = config::get(&conn, KEY_LITELLM_MODEL)
        .map_err(|e| e.to_string())?
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    if should_mock(&endpoint) {
        return Ok(mock_next_step(&base, Some(model)));
    }

    let store = KeyringStore::new();
    let api_key = read_api_key(&store);

    // Séparation system/user : le message *system* porte les consignes de méthode,
    // le message *user* porte l'état réel assemblé du projet (contexte borné).
    let ctx = build_context(&base);
    let system = build_prompt("(le contexte du projet est fourni dans le message utilisateur)");
    call_endpoint(&endpoint, &model, api_key.as_deref(), &system, &ctx)
}

/// Écrit la clé IA au keychain (write-only côté front, D4). Jamais de lecture
/// clé→front. Une valeur vide **supprime** la clé (UX « retirer la clé »).
#[tauri::command]
pub fn ai_set_key(value: String) -> Result<(), String> {
    let store = KeyringStore::new();
    if value.trim().is_empty() {
        return store
            .delete_secret(SECRET_SERVICE, SECRET_ACCOUNT)
            .map_err(|e| e.to_string());
    }
    store
        .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, &value)
        .map_err(|e| e.to_string())
}

/// Indique si une clé IA est enregistrée (présence seule, **jamais** la valeur).
#[tauri::command]
pub fn ai_has_key() -> Result<bool, String> {
    let store = KeyringStore::new();
    Ok(read_api_key(&store).is_some())
}

/// Un tour de chat projet **EN TANT QUE** `agent` (persona, D2). Construit
/// `[system(build_prompt_chat(agent, build_context(path))), …messages…]` et
/// appelle l'endpoint généralisé (`post_chat`). **Multi-tours** : l'historique
/// vient du front (`messages`). Mock si endpoint vide / flag dev (A2). Dégrade en
/// `Err(String)` lisible (D6), **jamais de panique**. Agent inconnu/vide →
/// fallback responsable (Aragorn). **AUCUNE orchestration** : un seul appel (R-L8-3).
///
/// > **L10b — REFRAMÉ « source de vues » du cas Ollama (§ 5.4, arbitrage #3).** Sous
/// > la cible **Claude Code**, la conversation dérive du **transcript JSONL**
/// > (`transcript.rs`, `ConversationSource` → tailer) : `chat` n'est **PLUS** le moteur
/// > de la conversation. Il est **conservé** comme **future impl Ollama de
/// > `ConversationSource`** (c'est NOUS qui émettons request/response → la « source »
/// > est le log de nos appels, sans fichier à tailer) — **ni supprimé, ni inerte**, mais
/// > **NON branché** dans le chemin conversation en L10. `next_step` (L3) reste intact.
#[tauri::command]
pub fn chat(
    app: AppHandle,
    path: String,
    agent: String,
    messages: Vec<ChatMessage>,
) -> Result<ChatReply, String> {
    let base = validate_project_dir(&path)?;

    let conn = db::open(&app)?;
    let endpoint = config::get(&conn, KEY_LITELLM_ENDPOINT)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let model = config::get(&conn, KEY_LITELLM_MODEL)
        .map_err(|e| e.to_string())?
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    if should_mock(&endpoint) {
        return Ok(mock_chat_reply(&agent, &messages, Some(model)));
    }

    let store = KeyringStore::new();
    let api_key = read_api_key(&store);

    let ctx = build_context(&base);
    let system = build_prompt_chat(&agent, &ctx);

    // [system(persona), …historique user/assistant…] — D2.
    let mut msgs: Vec<Msg<'_>> = Vec::with_capacity(messages.len() + 1);
    msgs.push(Msg {
        role: "system",
        content: &system,
    });
    for m in &messages {
        msgs.push(Msg {
            role: &m.role,
            content: &m.content,
        });
    }

    let body = post_chat(&endpoint, &model, api_key.as_deref(), &msgs)?;
    parse_chat_reply(&body, Some(model))
}

// --- L22-P2 : rédaction d'artefacts du Cadre par le LLM embarqué ---

/// Prompt système de rédaction (P2). Contraint le LLM à produire une FICHE autonome (pas
/// une réponse de conversation) : 3ᵉ personne, sans « tu », sans préambule ni formule
/// d'ouverture, la demande INTÉGRÉE et non commentée.
fn build_author_system(kind: &str) -> String {
    let (objet, sujet) = match kind {
        "agent" => (
            "le BRIEF d'un agent d'une équipe : ce que cet agent fait EN PROPRE, en plus de son template",
            "ce brief",
        ),
        _ => (
            "la description d'un SKILL (une capacité réutilisable d'agent) : ce qu'il recouvre et comment il s'applique",
            "cette description",
        ),
    };
    format!(
        "Tu es un rédacteur de fiches pour la méthode iakaframe. Rédige {objet}. \
Écris UN SEUL paragraphe AUTONOME, à la 3ᵉ personne, en français. \
INTERDITS : t'adresser au lecteur (jamais « tu » ni « vous »), préambule, titre, \
méta-commentaire, ni formule d'ouverture (« En effet », « Bien sûr », « Voici »). \
Intègre la demande dans {sujet} sans la commenter ni y répondre. \
Commence directement par le contenu."
    )
}

fn build_author_user(name: &str, instruction: &str, context: Option<&str>) -> String {
    let mut s = String::new();
    if !name.trim().is_empty() {
        s.push_str(&format!("Nom : {name}\n"));
    }
    if let Some(ctx) = context {
        if !ctx.trim().is_empty() {
            s.push_str(&format!("Version actuelle :\n{ctx}\n\n"));
        }
    }
    s.push_str(&format!("Demande : {instruction}"));
    s
}

fn mock_frame_author(kind: &str, name: &str, instruction: &str) -> ChatReply {
    let label = if kind == "agent" { "Brief" } else { "Skill" };
    ChatReply {
        content: format!(
            "[MOCK — rédaction simulée, aucun appel réseau]\n{label} « {name} » : {instruction}.\n\
(Configure un endpoint IA dans Réglages pour une rédaction réelle.)"
        ),
        provider: "mock".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
    }
}

/// L22-P2 : le LLM embarqué **rédige** un artefact du Cadre (paragraphe de skill ou brief
/// d'agent). UN endpoint, UN appel (calque L3/L8) ; mock si endpoint vide / flag dev (A2).
/// Dégrade proprement (D6). `frame.json` reste la source ; ce texte y est rangé par le front.
#[tauri::command]
pub fn frame_author(
    app: AppHandle,
    kind: String,
    name: String,
    instruction: String,
    context: Option<String>,
) -> Result<ChatReply, String> {
    if instruction.trim().is_empty() {
        return Err("précise ce que tu veux rédiger".to_string());
    }
    let conn = db::open(&app)?;
    let endpoint = config::get(&conn, KEY_LITELLM_ENDPOINT)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let model = config::get(&conn, KEY_LITELLM_MODEL)
        .map_err(|e| e.to_string())?
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    if should_mock(&endpoint) {
        return Ok(mock_frame_author(&kind, &name, &instruction));
    }

    let store = KeyringStore::new();
    let api_key = read_api_key(&store);
    let system = build_author_system(&kind);
    let user = build_author_user(&name, &instruction, context.as_deref());
    let messages = [
        Msg {
            role: "system",
            content: &system,
        },
        Msg {
            role: "user",
            content: &user,
        },
    ];
    let body = post_chat(&endpoint, &model, api_key.as_deref(), &messages)?;
    parse_chat_reply(&body, Some(model))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashMap;

    #[test]
    fn author_system_distingue_skill_et_agent() {
        assert!(build_author_system("agent").contains("BRIEF"));
        assert!(build_author_system("skill").contains("SKILL"));
        assert!(build_author_system("autre").contains("SKILL")); // défaut = skill
    }

    #[test]
    fn author_user_inclut_nom_contexte_et_demande() {
        let u = build_author_user("Git sûr", "ajoute la revue", Some("para v1"));
        assert!(u.contains("Nom : Git sûr"));
        assert!(u.contains("Version actuelle"));
        assert!(u.contains("para v1"));
        assert!(u.contains("Demande : ajoute la revue"));
    }

    #[test]
    fn mock_frame_author_est_marque_mock_et_sans_reseau() {
        let r = mock_frame_author("skill", "Git sûr", "sécurise git");
        assert_eq!(r.provider, "mock");
        assert!(r.content.contains("Git sûr"));
        assert!(r.content.contains("sécurise git"));
    }
    use std::fs;

    // --- Mock store (réplique du contrat secrets, pour le cloisonnement clé) ---

    #[derive(Default)]
    struct MockStore {
        map: RefCell<HashMap<(String, String), String>>,
    }
    impl SecretStore for MockStore {
        fn set_secret(&self, s: &str, a: &str, v: &str) -> Result<(), crate::secrets::SecretError> {
            self.map
                .borrow_mut()
                .insert((s.to_string(), a.to_string()), v.to_string());
            Ok(())
        }
        fn get_secret(
            &self,
            s: &str,
            a: &str,
        ) -> Result<Option<String>, crate::secrets::SecretError> {
            Ok(self
                .map
                .borrow()
                .get(&(s.to_string(), a.to_string()))
                .cloned())
        }
        fn delete_secret(&self, s: &str, a: &str) -> Result<(), crate::secrets::SecretError> {
            self.map
                .borrow_mut()
                .remove(&(s.to_string(), a.to_string()));
            Ok(())
        }
    }

    fn tmp_dir(name: &str) -> PathBuf {
        let mut d = std::env::temp_dir();
        d.push(format!("iakacockpit_l3_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    // --- head / troncature ---

    #[test]
    fn head_ne_tronque_pas_sous_le_cap() {
        assert_eq!(head("abc", 10), "abc");
    }

    #[test]
    fn head_tronque_au_dela_du_cap() {
        let out = head("abcdef", 3);
        assert!(out.starts_with("abc"));
        assert!(out.contains("(tronqué)"));
    }

    // --- validation de path (D3 / R-L3-4) ---

    #[test]
    fn validate_rejette_chemin_vide() {
        assert!(validate_project_dir("").is_err());
        assert!(validate_project_dir("   ").is_err());
    }

    #[test]
    fn validate_rejette_chemin_inexistant() {
        assert!(validate_project_dir("/nexiste/vraiment/pas/ici_l3").is_err());
    }

    #[test]
    fn validate_accepte_un_dossier_reel() {
        let d = tmp_dir("validate");
        assert!(validate_project_dir(d.to_str().unwrap()).is_ok());
        let _ = fs::remove_dir_all(&d);
    }

    // --- build_context (D3) ---

    #[test]
    fn build_context_fichiers_absents_donne_textes_de_remplacement() {
        let d = tmp_dir("ctx_absent");
        let ctx = build_context(&d);
        assert!(ctx.contains("(pas de specs/PROJET.md)"));
        assert!(ctx.contains("(pas d'état des lieux)"));
        assert!(ctx.contains("# Projet :"));
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn build_context_lit_les_specs_presentes() {
        let d = tmp_dir("ctx_present");
        fs::create_dir_all(d.join("specs")).unwrap();
        fs::write(d.join("specs/PROJET.md"), "VISION DU PROJET").unwrap();
        fs::write(d.join("specs/etat-des-lieux.md"), "ETAT ACTUEL").unwrap();
        let ctx = build_context(&d);
        assert!(ctx.contains("VISION DU PROJET"));
        assert!(ctx.contains("ETAT ACTUEL"));
        let _ = fs::remove_dir_all(&d);
    }

    #[test]
    fn build_context_tronque_les_specs_longues() {
        let d = tmp_dir("ctx_long");
        fs::create_dir_all(d.join("specs")).unwrap();
        let long = "x".repeat(5000);
        fs::write(d.join("specs/PROJET.md"), &long).unwrap();
        let ctx = build_context(&d);
        assert!(ctx.contains("(tronqué)"));
        let _ = fs::remove_dir_all(&d);
    }

    // --- build_prompt (D3-bis / A4) ---

    #[test]
    fn build_prompt_non_vide_et_oriente_prochaine_etape() {
        let p = build_prompt("CONTEXTE");
        assert!(!p.is_empty());
        assert!(p.to_lowercase().contains("prochaine étape"));
        assert!(p.contains("CONTEXTE"));
    }

    #[test]
    fn build_prompt_conscient_de_la_methode_iakaframe() {
        let p = build_prompt("ctx");
        // Mobilise le vocabulaire de la méthode (lots, instructions, gate).
        assert!(p.to_lowercase().contains("lot"));
        assert!(p.contains("specs/instructions/"));
        assert!(p.to_lowercase().contains("gate"));
    }

    // --- chat : builder de payload multi-tours (L8/D2) ---

    #[test]
    fn build_payload_porte_le_systeme_en_tete_et_tout_l_historique() {
        let msgs = [
            Msg {
                role: "system",
                content: "S",
            },
            Msg {
                role: "user",
                content: "u1",
            },
            Msg {
                role: "assistant",
                content: "a1",
            },
            Msg {
                role: "user",
                content: "u2",
            },
        ];
        let payload = build_payload("mod", &msgs);
        assert_eq!(payload["model"], "mod");
        assert_eq!(payload["stream"], false);
        let arr = payload["messages"].as_array().unwrap();
        // Multi-tours : longueur > 2, system en tête, ordre préservé.
        assert_eq!(arr.len(), 4);
        assert_eq!(arr[0]["role"], "system");
        assert_eq!(arr[0]["content"], "S");
        assert_eq!(arr[1]["role"], "user");
        assert_eq!(arr[3]["content"], "u2");
    }

    #[test]
    fn build_payload_historique_vide_donne_juste_le_systeme() {
        let msgs = [Msg {
            role: "system",
            content: "S",
        }];
        let arr = build_payload("m", &msgs)["messages"]
            .as_array()
            .unwrap()
            .clone();
        assert_eq!(arr.len(), 1);
        assert_eq!(arr[0]["role"], "system");
    }

    // --- chat : prompt PERSONA-AWARE (D2 / AR-4) ---

    #[test]
    fn resolve_persona_connait_les_cinq_agents() {
        for name in ["Odin", "Aragorn", "Gandalf", "Gimli", "Legolas"] {
            assert_eq!(resolve_persona(name).name, name);
        }
    }

    #[test]
    fn resolve_persona_insensible_a_la_casse() {
        assert_eq!(resolve_persona("gandalf").name, "Gandalf");
        assert_eq!(resolve_persona("LEGOLAS").name, "Legolas");
    }

    #[test]
    fn resolve_persona_inconnu_ou_vide_retombe_sur_le_responsable() {
        assert_eq!(resolve_persona("Sauron").name, DEFAULT_AGENT);
        assert_eq!(resolve_persona("").name, DEFAULT_AGENT);
        assert_eq!(resolve_persona("   ").name, DEFAULT_AGENT);
        assert_eq!(DEFAULT_AGENT, "Aragorn");
    }

    #[test]
    fn build_prompt_chat_reflete_nom_royaume_et_role_de_l_agent() {
        let p = build_prompt_chat("Gandalf", "CTX");
        assert!(p.contains("Gandalf"));
        assert!(p.contains("[CADRAGE]"));
        // Le rôle de Gandalf (cadrage / instructions) doit transparaître.
        assert!(p.to_lowercase().contains("cadr") || p.contains("instruction"));
        // Le contexte projet est injecté.
        assert!(p.contains("CTX"));
    }

    #[test]
    fn build_prompt_chat_agent_inconnu_incarne_le_responsable() {
        let p = build_prompt_chat("Inconnu", "ctx");
        assert!(p.contains("Aragorn"));
        assert!(p.contains("[ACCUEIL]"));
    }

    // --- chat : mock & dégradation (D2) ---

    #[test]
    fn mock_chat_reply_est_marque_mock_et_incarne_l_agent() {
        let msgs = vec![ChatMessage {
            role: "user".into(),
            content: "Salut, où en est-on ?".into(),
        }];
        let r = mock_chat_reply("Gimli", &msgs, Some("m".into()));
        assert_eq!(r.provider, "mock");
        assert!(r.content.contains("MOCK"));
        assert!(r.content.contains("Gimli"));
        assert!(r.content.contains("[DEV]"));
        assert!(r.content.contains("où en est-on"));
        assert_eq!(r.tokens_in, None);
    }

    #[test]
    fn mock_chat_reply_sans_message_user_ne_panique_pas() {
        let r = mock_chat_reply("Aragorn", &[], None);
        assert_eq!(r.provider, "mock");
        assert!(r.content.contains("aucun message"));
    }

    // --- chat : parsing OpenAI-compat (calque next_step) ---

    #[test]
    fn parse_chat_reply_extrait_content_et_usage() {
        let body = r#"{
            "choices": [{ "message": { "content": "Réponse de l'agent." } }],
            "usage": { "prompt_tokens": 12, "completion_tokens": 7 }
        }"#;
        let r = parse_chat_reply(body, Some("mod".into())).unwrap();
        assert_eq!(r.content, "Réponse de l'agent.");
        assert_eq!(r.provider, "litellm");
        assert_eq!(r.tokens_in, Some(12));
        assert_eq!(r.tokens_out, Some(7));
    }

    #[test]
    fn parse_chat_reply_vide_donne_erreur_lisible() {
        let body = r#"{ "choices": [{ "message": { "content": "" } }] }"#;
        let err = parse_chat_reply(body, None).unwrap_err();
        assert!(err.contains("aucune réponse"));
    }

    #[test]
    fn parse_chat_reply_json_invalide_donne_erreur_lisible() {
        let err = parse_chat_reply("xxx", None).unwrap_err();
        assert!(err.contains("illisible"));
    }

    // --- mock (D5 / A2) ---

    #[test]
    fn should_mock_si_endpoint_vide() {
        assert!(should_mock(""));
        assert!(should_mock("   "));
    }

    #[test]
    fn should_mock_faux_si_endpoint_present() {
        // (le flag d'env n'est pas posé dans ce test)
        assert!(!should_mock("http://localhost:4000"));
    }

    #[test]
    fn mock_next_step_est_deterministe_et_marque_mock() {
        let d = tmp_dir("mock");
        let ns = mock_next_step(&d, Some("m".into()));
        assert_eq!(ns.provider, "mock");
        assert!(ns.suggestion.contains("MOCK"));
        assert_eq!(ns.tokens_in, None);
        // Déterminisme : deux appels identiques → même suggestion.
        let ns2 = mock_next_step(&d, Some("m".into()));
        assert_eq!(ns.suggestion, ns2.suggestion);
        let _ = fs::remove_dir_all(&d);
    }

    // --- parsing OpenAI-compat (R-L3-6) ---

    #[test]
    fn parse_extrait_content_et_usage() {
        let body = r#"{
            "choices": [{ "message": { "content": "Fais X puis Y." } }],
            "usage": { "prompt_tokens": 120, "completion_tokens": 45 }
        }"#;
        let ns = parse_chat_completion(body, Some("modele".into())).unwrap();
        assert_eq!(ns.suggestion, "Fais X puis Y.");
        assert_eq!(ns.provider, "litellm");
        assert_eq!(ns.model.as_deref(), Some("modele"));
        assert_eq!(ns.tokens_in, Some(120));
        assert_eq!(ns.tokens_out, Some(45));
    }

    #[test]
    fn parse_usage_absent_donne_none() {
        let body = r#"{ "choices": [{ "message": { "content": "OK" } }] }"#;
        let ns = parse_chat_completion(body, None).unwrap();
        assert_eq!(ns.suggestion, "OK");
        assert_eq!(ns.tokens_in, None);
        assert_eq!(ns.tokens_out, None);
    }

    #[test]
    fn parse_reponse_vide_donne_erreur_lisible() {
        let body = r#"{ "choices": [{ "message": { "content": "" } }] }"#;
        let err = parse_chat_completion(body, None).unwrap_err();
        assert!(err.contains("aucune suggestion"));
    }

    #[test]
    fn parse_json_invalide_donne_erreur_lisible() {
        let err = parse_chat_completion("pas du json", None).unwrap_err();
        assert!(err.contains("illisible"));
    }

    // --- cloisonnement clé (D4 / R-L3-2) ---

    #[test]
    fn read_api_key_reflete_presence_et_absence() {
        let store = MockStore::default();
        assert_eq!(read_api_key(&store), None);
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, "sk-secret")
            .unwrap();
        assert_eq!(read_api_key(&store), Some("sk-secret".to_string()));
        // Vide → considéré absent (Authorization omis).
        store
            .set_secret(SECRET_SERVICE, SECRET_ACCOUNT, "  ")
            .unwrap();
        assert_eq!(read_api_key(&store), None);
    }

    #[test]
    fn account_keychain_est_neutre_pas_litellm_exclusif() {
        assert_eq!(SECRET_ACCOUNT, "ai_api_key");
        assert!(!SECRET_ACCOUNT.contains("litellm"));
    }

    // --- garde anti-routage (R-L3-1) : la clé de config modèle reste non sensible ---

    #[test]
    fn cle_modele_n_est_pas_un_secret() {
        // `litellm_model` ne doit pas matcher le filtre `key|token|secret|password`
        // (sinon `config_all` le masquerait). On reproduit le test côté config.
        let k = KEY_LITELLM_MODEL.to_lowercase();
        assert!(
            !(k.contains("token")
                || k.contains("key")
                || k.contains("secret")
                || k.contains("password"))
        );
    }
}
