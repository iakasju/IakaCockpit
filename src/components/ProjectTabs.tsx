/**
 * ProjectTabs — barre d'onglets par projet de la Table (L24 F2).
 *
 * Présentationnel PUR (D8) : aucune I/O, aucun état. Un onglet par conversation ouverte
 * (= par projet de la Table ayant une fenêtre de travail vivante), libellé = nom du
 * projet (`conversation.title`). L'onglet actif est mis en évidence ; cliquer un onglet
 * bascule l'`active` (via `onSelect`, calque du clic worklist) ; le « × » retire le
 * projet de la Table (via `onClose` = `onRemoveFromWork`, L23-inc : ferme PTY + conv).
 *
 * Ordre stable = ordre des conversations (ordre d'ouverture / du workset). Anti
 * button-in-button : l'onglet et son « × » sont deux boutons FRÈRES, jamais imbriqués.
 */
import { useTranslation } from "react-i18next";
import type { Conversation } from "../hooks/useConversations";

export interface ProjectTabsProps {
  /** Conversations ouvertes (une par projet de la Table ayant une fenêtre). */
  conversations: readonly Conversation[];
  /** Projet de la conversation active (onglet mis en évidence), ou `null`. */
  activeProjectId: string | null;
  /** Sélectionne la conversation d'un projet (bascule l'`active`). */
  onSelect: (projectId: string) => void;
  /** Ferme l'onglet = retire le projet de la Table (ferme PTY + conversation). */
  onClose: (projectId: string) => void;
}

export function ProjectTabs({
  conversations,
  activeProjectId,
  onSelect,
  onClose,
}: ProjectTabsProps): JSX.Element | null {
  const { t } = useTranslation();
  if (conversations.length === 0) return null;
  return (
    <div className="projtabs" role="tablist" aria-label={t("working.tabsAria")}>
      {conversations.map((c) => {
        const on = c.projectId === activeProjectId;
        return (
          <div key={c.projectId} className={`projtab${on ? " active" : ""}`}>
            <button
              type="button"
              role="tab"
              aria-selected={on}
              className="pt-open"
              onClick={() => onSelect(c.projectId)}
            >
              {c.title}
            </button>
            <button
              type="button"
              className="pt-close"
              aria-label={t("working.tabCloseAria", { project: c.title })}
              title={t("working.tabCloseAria", { project: c.title })}
              onClick={() => onClose(c.projectId)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
