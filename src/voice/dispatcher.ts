/**
 * dispatcher.ts — moteur d'intent VOCAL, **pur et testable** (L16-P1).
 *
 * Reçoit un texte transcrit (STT local, cf. `voice.rs`) et le résout en une
 * **action IHM fermée**. P1 ne couvre que la NAVIGATION entre les 5 vues ; le
 * LLM-secours (phrases libres) et le lancement du Travail sont différés (P2/P3).
 *
 * Décision de cadrage (L16, Stéphane) : **règles d'abord**, tolérantes au bruit
 * STT (normalisation sans accent + fuzzy léger). Aucune dépendance, aucun I/O :
 * `dispatch(transcript) → VoiceAction | null`. Un `null` = « pas compris » →
 * l'IHM propose des exemples (`VOICE_COMMAND_EXAMPLES`).
 */
import type { ViewId } from "../hooks/useGridState";

/** Action IHM produite par le dispatcher. P1 = navigation seule. */
export type VoiceAction = { type: "nav"; view: ViewId };

/**
 * Synonymes NORMALISÉS (minuscule, sans accent) par vue. Vocabulaire classique
 * + identité Atelier/Étagère/Table : « étagère » = portefeuille, « table » =
 * travail (cf. `specs/design/identite-atelier-etagere-table.md`).
 */
const VIEW_SYNONYMS: Record<ViewId, readonly string[]> = {
  portfolio: ["portefeuille", "portfolio", "etagere"],
  working: ["travail", "working", "table", "chantier"],
  journal: ["journal", "main courante", "mains courantes", "historique", "log", "logs"],
  analytics: ["analytics", "analyse", "statistiques", "stats", "metriques"],
  teams: ["equipes", "equipe", "team", "teams", "roster", "agents"],
  cadre: ["cadre", "frame", "regles", "regle"],
  settings: [
    "reglages",
    "reglage",
    "parametres",
    "parametre",
    "settings",
    "configuration",
    "config",
    "preferences",
  ],
};

/** Ordre de priorité en cas d'égalité de score (rare). */
const VIEW_PRIORITY: readonly ViewId[] = [
  "portfolio",
  "working",
  "journal",
  "analytics",
  "teams",
  "cadre",
  "settings",
];

/** Exemples affichés par l'IHM quand rien n'est compris. */
export const VOICE_COMMAND_EXAMPLES: readonly string[] = [
  "montre le portefeuille",
  "va au travail",
  "ouvre le journal",
  "montre les équipes",
  "ouvre les réglages",
];

/** Minuscule, sans accent, ponctuation → espaces, espaces normalisés. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Distance de Levenshtein (pour tolérer le bruit STT sur un mot). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/**
 * Résout un texte transcrit en action de navigation, ou `null` si aucune vue
 * n'est reconnue. Scoring : token exact (0) < sous-chaîne (0.5) < fuzzy (1 + d).
 */
export function dispatch(transcript: string): VoiceAction | null {
  const norm = normalize(transcript);
  if (!norm) return null;
  const tokens = norm.split(" ");

  let bestView: ViewId | null = null;
  let bestScore = Infinity;

  for (const view of VIEW_PRIORITY) {
    for (const syn of VIEW_SYNONYMS[view]) {
      let score: number | null = null;

      if (syn.includes(" ")) {
        // Synonyme multi-mots : uniquement sous-chaîne (pas de fuzzy).
        if (norm.includes(syn)) score = 0;
      } else if (tokens.includes(syn)) {
        score = 0; // token exact
      } else if (norm.includes(syn)) {
        score = 0.5; // sous-chaîne (ex. collé à un autre mot)
      } else {
        // Fuzzy anti-bruit : seuil serré (1 pour mots courts, 2 sinon).
        const thr = syn.length <= 5 ? 1 : 2;
        let min = Infinity;
        for (const t of tokens) {
          if (Math.abs(t.length - syn.length) > thr) continue;
          const d = levenshtein(t, syn);
          if (d < min) min = d;
        }
        if (min <= thr) score = 1 + min;
      }

      if (score !== null && score < bestScore) {
        bestScore = score;
        bestView = view;
      }
    }
  }

  return bestView ? { type: "nav", view: bestView } : null;
}
