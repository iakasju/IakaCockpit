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
 *
 * L26 — « feux macOS » de mode focus, À DROITE des onglets : vert = agrandir la zone de
 * travail (masquer les 2 colonnes de gauche + plein écran OS), jaune = revenir à la
 * normale. Le feu déjà à l'état courant est atténué/désactivé (les deux restent visibles).
 * La barre est TOUJOURS rendue sur la vue Travail — même sans onglet, les feux subsistent
 * (elle ne retourne plus `null`). L'orchestration (état focus + appel façade fullscreen)
 * vit dans `App` ; ici on ne fait qu'appeler les callbacks (présentationnel D8).
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
  /** L26 — la Table est-elle en mode focus (colonnes gauche masquées) ? */
  focus: boolean;
  /** L26 — feu VERT : entre en mode focus + plein écran OS (orchestré par App). */
  onEnterFocus: () => void;
  /** L26 — feu JAUNE : sort du mode focus (colonnes seules — ne touche PAS au plein écran). */
  onExitFocus: () => void;
}

export function ProjectTabs({
  conversations,
  activeProjectId,
  onSelect,
  onClose,
  focus,
  onEnterFocus,
  onExitFocus,
}: ProjectTabsProps): JSX.Element {
  const { t } = useTranslation();
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
      {/* L26 — feux macOS (mode focus), toujours à DROITE des onglets. Pas de bouton
          rouge (non demandé). Le feu déjà à l'état courant est désactivé/atténué mais
          reste visible. */}
      <div
        className="projfocus"
        role="group"
        aria-label={t("working.focusGroupAria")}
      >
        <button
          type="button"
          className="feu feu-green"
          disabled={focus}
          aria-pressed={focus}
          aria-label={t("working.focusEnterAria")}
          title={t("working.focusEnterAria")}
          onClick={onEnterFocus}
        />
        <button
          type="button"
          className="feu feu-yellow"
          disabled={!focus}
          aria-pressed={!focus}
          aria-label={t("working.focusExitAria")}
          title={t("working.focusExitAria")}
          onClick={onExitFocus}
        />
      </div>
    </div>
  );
}
