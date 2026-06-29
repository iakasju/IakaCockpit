# L16 — Pilotage vocal d'iakacockpit (voix → action IHM)

> Statut : cadré (chef de projet, 2026-06-29). Décisions tranchées par Stéphane.
> Objectif **unique** : **piloter iakacockpit à la voix**. Le mini-LLM n'est qu'un maillon
> d'interprétation, pas une fin. Note de vision liée : `specs/notes/concepts-llm-transcript-ihm.md`.

## Besoin

Pouvoir commander le cockpit en parlant : « montre le portefeuille », « va au journal »,
« ouvre les réglages », puis « lance le travail sur iakaframe », puis « parle à l'équipe ».
La voix est le but ; l'interprétation doit être **locale, offline, open-source** (calque
iakaframe : self-hosted d'abord, on câble on ne route pas).

## Architecture cible (pipeline)

```
🎤 micro → capture audio → STT LOCAL (texte) → dispatcher d'intent
        (règles d'abord → LLM Ollama en secours) → action IHM exécutée
```

**Choix structurant** : le STT vit **côté Rust** (`src-tauri`), PAS dans la WebView
(WKWebView macOS n'expose pas la Web Speech API de façon fiable). Transcription **locale**
(aucun envoi cloud de la voix).

## Décisions (Stéphane, 2026-06-29)

- **Moteur d'intent** = **règles d'abord, LLM en secours**. Patterns FR tolérants + fuzzy-match
  des noms de projets/équipes connus (le code résout) ; Ollama (`ai.rs`, déjà câblé) en repli
  pour les phrases libres, **sortie JSON contrainte**.
- **STT** = **whisper.cpp** (`whisper-rs`), modèle petit multilingue (tiny/base). Couvre la
  commande **et** la conversation libre (P3) avec un seul moteur.
- **Déclenchement** = **push-to-talk** (raccourci/bouton) au MVP. Wake-word différé.
- **Périmètre du 1ᵉʳ pas** = **barre de commande IHM** (navigation). Conversation = phase ultérieure.
- **Langue** = FR.

## Phasage

### P1 — Tuyau bout-en-bout, navigation (ce lot)
- **`src-tauri/src/voice.rs`** (neuf) : capture micro (`cpal`), STT local (`whisper-rs` +
  modèle téléchargé au 1ᵉʳ run, **pas bundlé** — durcissement différé), push-to-talk, renvoie
  le **texte transcrit** (commande Tauri `voice_listen` / event `voice://transcript`).
- **Dispatcher d'intent (front, pur/testable)** : registre d'actions **fermé** + règles FR
  tolérantes → action `{type:"nav", view}`. Pas de LLM en P1 (les règles suffisent pour la nav).
- **Façade `backend.ts`** : `voiceListen()` (D7, point d'`invoke` unique).
- **`useVoiceCommand` (hook)** : reçoit l'action, exécute via `useGridState.setActiveView`.
- **UI** : bouton micro + retour visuel (écoute → transcription → action / « pas compris →
  propositions »). Discret (rail ou barre basse).
- **Commandes couvertes** : montrer/aller/ouvrir + {portefeuille, travail, journal, équipes,
  réglages} (et synonymes).

### P2 — Lancer le travail (différé, tracé)
« lance le travail sur <projet> » → ouvre Travail + résout projet/équipe (fuzzy ; `TeamPicker`
si ambigu). Branche le **LLM-secours** Ollama (sortie JSON) pour les phrases libres.

### P3 — Conversation vocale avec les teams (différé, tracé)
« parle à l'équipe », « dis à Aragorn que… » → bascule conversation, la voix alimente le chat
coordinateur existant (free-form whisper). TTS de la réponse = option ultérieure.

## Périmètre fermé (P1)

À LIVRER : `voice.rs` + STT local + push-to-talk + dispatcher règles (nav) + façade +
hook + UI micro + tests (dispatcher pur : phrases → action ; tolérance fuzzy).
HORS P1 : LLM-secours, lancement Travail, conversation, wake-word, TTS, bundling du modèle.

## Points durs & parades

- **Permission micro macOS** : entitlement `NSMicrophoneUsageDescription` + prompt OS (build).
- **STT offline FR** : whisper tiny/base, quasi temps réel sur Mac ; modèle au 1ᵉʳ run.
- **STT bruité** : règles **tolérantes** + fuzzy resolution côté code (ne pas exiger une
  transcription parfaite).
- **Taille binaire** : modèle non bundlé en P1 (téléchargé), bundling = durcissement différé.

## Gardes

- Façade unique `backend.ts` (un seul `invoke`), pas de god-component, dispatcher **pur** et
  testable, CSP intacte (aucun asset distant), **voix jamais envoyée au cloud**.
- Réutilise l'existant (nav, Ollama, façade) ; aucune route métier nouvelle hors `voice`.

## Vérification de clôture (P1)

`npm run typecheck` + `lint` + `test` verts ; `cargo test`/`clippy`/`fmt` OK ; recette réelle
`tauri dev` : prononcer « montre le portefeuille » / « va au journal » → la vue change.
