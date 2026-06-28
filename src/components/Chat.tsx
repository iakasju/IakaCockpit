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
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ChatTurn, ChatTurnKind } from "../hooks/useConversations";
import type { AvatarResolver } from "../theme/teamAvatar";

/** Étiquette courte d'une vue dérivée (geste/délégation/activité/pensée), L10b. */
function evLabel(kind: Exclude<ChatTurnKind, "parole">, t: TFunction): string {
  const key = {
    geste: "chat.evGeste",
    delegation: "chat.evDelegation",
    activite: "chat.evActivite",
    pensee: "chat.evPensee",
  }[kind];
  return t(key);
}

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
  /**
   * Résolveur d'avatar par nom d'agent (L9). `null`/absent → pas d'avatar (rendu
   * L8 : juste `bwho`). JAMAIS d'image cassée (`onError` masque l'image).
   */
  resolveAvatar?: AvatarResolver;
  /**
   * Affordance esc côté chat (L10b, arbitrage #4) : envoie `esc` au PTY du chef-runner
   * (interruption — l'esc natif de la TUI marche aussi). Absent → bouton masqué. Le
   * terminal reste le point de contrôle ; le chat offre l'ergonomie.
   */
  onInterrupt?: () => void;
  /**
   * Canal pensée masqué ? (L10b/P3). Si fourni AVEC `onToggleHidePensee`, le toggle est
   * CONTRÔLÉ (persisté en config par le parent). Absent → état interne (rétro-compat L8,
   * masquée par défaut).
   */
  hidePensee?: boolean;
  /** Bascule le canal pensée (contrôlé) — voir `hidePensee`. */
  onToggleHidePensee?: () => void;
}

/** Avatar d'une bulle assistant + fallback (masqué si absent / chargement KO). */
function BubbleAvatar({ url, alt }: { url: string; alt: string }): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (broken) return <></>;
  return (
    <img
      className="bavatar"
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
    />
  );
}

export function Chat({
  history,
  agent,
  pending,
  error,
  draft,
  onDraftChange,
  onSend,
  resolveAvatar,
  onInterrupt,
  hidePensee: hidePenseeProp,
  onToggleHidePensee,
}: ChatProps): JSX.Element {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Pensée masquable (canal § 5 PROJET) — masquée par défaut (réduit le bruit).
  // Contrôlé si le parent fournit `hidePensee` (+ toggle persisté) ; sinon état interne.
  const [internalHide, setInternalHide] = useState(true);
  const controlledPensee = hidePenseeProp !== undefined;
  const hidePensee = controlledPensee ? hidePenseeProp : internalHide;
  const togglePensee = (): void => {
    if (controlledPensee) onToggleHidePensee?.();
    else setInternalHide((v) => !v);
  };

  // Présence d'au moins une pensée → afficher le bouton de masquage.
  const hasPensee = useMemo(
    () => history.some((turn) => turn.kind === "pensee"),
    [history],
  );

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
    <div className="chat" aria-label={t("chat.ariaLabel")}>
      {(onInterrupt || hasPensee) && (
        <div className="chatbar">
          {hasPensee && (
            <button
              type="button"
              className={`btn xs${hidePensee ? "" : " accent"}`}
              aria-pressed={!hidePensee}
              onClick={togglePensee}
            >
              {hidePensee ? t("chat.showThought") : t("chat.hideThought")}
            </button>
          )}
          {onInterrupt && (
            <button
              type="button"
              className="btn xs"
              title={t("chat.interruptTitle")}
              onClick={onInterrupt}
            >
              {t("chat.interrupt")}
            </button>
          )}
        </div>
      )}
      <div className="chatlog" ref={scrollRef}>
        {history.length === 0 && !pending && (
          <div className="chatempty">{t("chat.empty", { agent })}</div>
        )}
        {history.map((turn, i) => {
          const kind = turn.kind ?? "parole";

          // Vues dérivées du transcript (L10b) : geste/délégation/activité/pensée
          // rendues en LIGNES d'événement (pas des bulles). La pensée est masquable.
          if (kind !== "parole") {
            if (kind === "pensee" && hidePensee) return null;
            const evAgent = turn.agent ?? null;
            return (
              <div key={i} className={`evline ev-${kind}`}>
                <span className="evtag" aria-hidden>
                  {evLabel(kind, t)}
                </span>
                {evAgent && <span className="evagent">{evAgent}</span>}
                <span className="evtext">{turn.content}</span>
              </div>
            );
          }

          // L9 fix avatar par-tour : l'émetteur est FIGÉ sur le tour (`turn.agent`).
          // Fallback rétro-compat L8 : si absent, on retombe sur la persona courante.
          // Changer l'interlocuteur ne re-rend donc PAS les avatars des tours passés.
          const turnAgent =
            turn.role === "assistant" ? (turn.agent ?? agent) : agent;
          const avatarUrl =
            turn.role === "assistant"
              ? (resolveAvatar?.(turnAgent) ?? null)
              : null;
          return (
            <div
              key={i}
              className={`bubble ${turn.role === "user" ? "me" : "them"}`}
            >
              {turn.role === "assistant" && (
                <span className="bhead">
                  {avatarUrl && (
                    <BubbleAvatar url={avatarUrl} alt={turnAgent} />
                  )}
                  <span className="bwho">{turnAgent}</span>
                </span>
              )}
              <span className="btext">{turn.content}</span>
            </div>
          );
        })}
        {pending && (
          <div className="bubble them pending" aria-live="polite">
            <span className="bhead">
              {resolveAvatar?.(agent) && (
                <BubbleAvatar url={resolveAvatar(agent) as string} alt={agent} />
              )}
              <span className="bwho">{agent}</span>
            </span>
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
          placeholder={t("chat.placeholder", { agent })}
          value={draft}
          disabled={pending}
          aria-label={t("chat.inputAria")}
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
          {t("chat.send")}
        </button>
      </form>
    </div>
  );
}
