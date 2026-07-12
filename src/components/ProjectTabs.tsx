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
 * L26 (révision recette 2026-07-13) — UN toggle « plein écran », À DROITE des onglets :
 * un seul bouton symétrique portant un symbole de plein écran (⤢ = entrer / ⤡ = réduire).
 * Activer = focus + plein écran OS ; désactiver = normal + sortie du plein écran. Remplace
 * les 2 feux macOS jaune/vert (jugés pas assez explicites). La barre est TOUJOURS rendue
 * sur la vue Travail — même sans onglet, le toggle subsiste (elle ne retourne plus `null`).
 * L'orchestration (état focus + appel façade fullscreen) vit dans `App` ; ici on ne fait
 * qu'appeler `onToggleFocus` (présentationnel D8).
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
  /**
   * L26 (révision recette) — bascule le mode focus. Toggle SYMÉTRIQUE orchestré par App :
   * activer = focus + plein écran OS ; désactiver = normal + sortie du plein écran.
   */
  onToggleFocus: () => void;
}

export function ProjectTabs({
  conversations,
  activeProjectId,
  onSelect,
  onClose,
  focus,
  onToggleFocus,
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
      {/* L26 (révision recette) — UN toggle « plein écran », toujours à DROITE des
          onglets. Symbole expand (⤢) en mode normal, compress (⤡) en mode focus.
          Symétrique : App gère focus + fullscreen d'un seul geste. */}
      <button
        type="button"
        className={`fsbtn${focus ? " active" : ""}`}
        aria-pressed={focus}
        aria-label={
          focus
            ? t("working.focusToggleExitAria")
            : t("working.focusToggleEnterAria")
        }
        title={
          focus
            ? t("working.focusToggleExitAria")
            : t("working.focusToggleEnterAria")
        }
        onClick={onToggleFocus}
      >
        <span aria-hidden>{focus ? "⤡" : "⤢"}</span>
      </button>
    </div>
  );
}
