/**
 * runnerView — projection PURE d'un `RunnerEvent` (transcript) → `ChatTurn` (L10b).
 *
 * Le tailer Rust (`transcript.rs`) émet des `RunnerEvent` typés homogènes ; le chat
 * (vue filtrée du canal « adresse ») en dérive des bulles. Cette fonction est PURE
 * (aucun I/O, aucun React) → testable directement.
 *
 * Règles de filtrage (MVP, § 4.3) :
 *   - **parole user** : IGNORÉE — la saisie est déjà échoée localement (entrée
 *     partagée) ; un fil de sous-agent (`is_sidechain`) injecte aussi des prompts
 *     user = bruit interne. On évite ainsi les doublons.
 *   - **parole assistant** → bulle (kind `parole`). `agent` laissé indéfini → le rendu
 *     retombe sur la persona courante (comportement L8/L9). Le badge `[ROYAUME][Agent]`
 *     éventuel est DANS le texte (verbatim, jamais reformulé).
 *   - **geste** (tool_use hors Task) → ligne d'activité visible.
 *   - **délégation** (tool_use Task) → ligne attribuée au `subagent_type`.
 *   - **activité** (tool_result) → ligne compacte (fin de geste).
 *   - **pensée** (thinking) → ligne masquable.
 */
import type { RunnerEvent } from "../api/backend";
import type { ChatTurn } from "./useConversations";

/** Libellé d'un geste outil pour la bulle (nom + entrée résumée). */
function gesteLabel(ev: RunnerEvent): string {
  const name = ev.tool_name ?? "outil";
  return ev.tool_input ? `${name} — ${ev.tool_input}` : name;
}

/**
 * Traduit un `RunnerEvent` en `ChatTurn`, ou `null` si l'event ne doit PAS apparaître
 * dans le chat (parole utilisateur déjà échoée / fil interne). Aucune reformulation :
 * le texte est repris VERBATIM.
 */
export function runnerEventToTurn(ev: RunnerEvent): ChatTurn | null {
  switch (ev.kind) {
    case "parole": {
      // L'utilisateur est déjà échoé (entrée partagée) → on n'affiche que l'assistant.
      if (ev.role !== "assistant") return null;
      const content = (ev.text ?? "").trim();
      if (content.length === 0) return null;
      return { role: "assistant", content, kind: "parole" };
    }
    case "delegation": {
      const sub = ev.agent ?? "sous-agent";
      const desc = ev.text ? ` : ${ev.text}` : "";
      return {
        role: "assistant",
        content: `Délègue à ${sub}${desc}`,
        kind: "delegation",
        // L'émetteur du geste de délégation = le sous-agent visé (avatar/badge).
        agent: ev.agent,
      };
    }
    case "geste":
      return {
        role: "assistant",
        content: gesteLabel(ev),
        kind: "geste",
      };
    case "activite": {
      const txt = (ev.text ?? "").trim();
      return {
        role: "assistant",
        content: txt.length > 0 ? `Résultat : ${txt}` : "Résultat d'outil",
        kind: "activite",
      };
    }
    case "pensee": {
      const content = (ev.text ?? "").trim();
      if (content.length === 0) return null;
      return { role: "assistant", content, kind: "pensee" };
    }
    default:
      return null;
  }
}
