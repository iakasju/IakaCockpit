/**
 * Chat — fil de conversation IA style WhatsApp (L8, D2/D3). Présentationnel.
 *
 * Rend l'historique en bulles (user à droite, assistant à gauche) + une zone de
 * saisie multi-tours. La saisie est CONTRÔLÉE par le parent (`draft`/`onDraftChange`)
 * pour permettre l'insertion du préfixe `@agent:` au clic roster (D6). À l'envoi,
 * `onSend(content)` est appelé (le parent extrait l'`@agent` et appelle
 * `useConversations.send`). Saisie désactivée si `pending`.
 *
 * Aucun I/O ici (D8) : l'appel `chat` vit dans `useConversations`/la façade.
 */
import { useEffect, useRef } from "react";
import type { ChatTurn } from "../hooks/useConversations";

export interface ChatProps {
  /** Historique multi-tours (mémoire MVP). */
  history: ChatTurn[];
  /** Interlocuteur courant (persona) — affiché en tête. */
  agent: string;
  /** Un tour est en vol (saisie + bouton désactivés). */
  pending: boolean;
  /** Dernière erreur lisible (dégradation), ou null. */
  error: string | null;
  /** Texte de saisie (contrôlé par le parent). */
  draft: string;
  onDraftChange: (value: string) => void;
  /** Envoie le contenu courant (le parent gère persona + appel). */
  onSend: (content: string) => void;
}

export function Chat({
  history,
  agent,
  pending,
  error,
  draft,
  onDraftChange,
  onSend,
}: ChatProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll en bas à chaque nouveau tour / pending.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, pending]);

  const submit = (): void => {
    if (pending) return;
    if (draft.trim().length === 0) return;
    onSend(draft);
  };

  return (
    <div className="chat" aria-label="Conversation">
      <div className="chatlog" ref={scrollRef}>
        {history.length === 0 && !pending && (
          <div className="chatempty">
            Discute avec <strong>{agent}</strong> à propos de ce projet (contexte :
            specs + état des lieux + git). Clique un agent du roster pour t'adresser
            directement à lui. Sans endpoint IA configuré, une réponse mockée est
            renvoyée.
          </div>
        )}
        {history.map((turn, i) => (
          <div
            key={i}
            className={`bubble ${turn.role === "user" ? "me" : "them"}`}
          >
            {turn.role === "assistant" && (
              <span className="bwho">{agent}</span>
            )}
            <span className="btext">{turn.content}</span>
          </div>
        ))}
        {pending && (
          <div className="bubble them pending" aria-live="polite">
            <span className="bwho">{agent}</span>
            <span className="btext typing">…</span>
          </div>
        )}
        {error && (
          <div className="chaterror" role="alert">
            {error}
          </div>
        )}
      </div>

      <form
        className="chatinput"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          className="chatfield"
          rows={1}
          placeholder={`Message à ${agent}…`}
          value={draft}
          disabled={pending}
          aria-label="Saisie de message"
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            // Entrée = envoyer ; Maj+Entrée = nouvelle ligne.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className="btn accent sm"
          disabled={pending || draft.trim().length === 0}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
