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
 * L26 (révision recette v3 2026-07-13) — UN switch coulissant « plein écran », aligné à
 * DROITE des onglets (`margin-left:auto`) : un interrupteur (piste + pastille qui glisse)
 * — pastille à GAUCHE = normal (off), à DROITE = focus/plein écran (on). Le glyphe `⤢`
 * vit DANS la pastille et voyage avec elle ; plus de libellé texte (accessibilité par
 * `aria-label`/`title` i18n). `role="switch"` + `aria-checked`.
 * Activer = focus + plein écran OS ; désactiver = normal + sortie du plein écran. Remplace
 * l'ancien bouton-icône `⤢` (trop discret) et, avant lui, les 2 feux macOS. La barre est
 * TOUJOURS rendue sur la vue Travail — même sans onglet, le switch subsiste (elle ne
 * retourne plus `null`). L'orchestration (état focus + appel façade fullscreen) vit dans
 * `App` ; ici on ne fait qu'appeler `onToggleFocus` (présentationnel D8).
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
  /**
   * L31-P2 — statut vivant (`running`/`idle`) par `projectId` de slot, dérivé de la récence
   * du tailer. Rend un petit point discret dans l'onglet. Absent (défaut) → aucun point
   * (rétro-compat). Un `projectId` sans entrée = pas de point (zéro fausse donnée).
   */
  liveStatus?: Readonly<Record<string, "running" | "idle">>;
  /** Ferme l'onglet = retire le projet de la Table (ferme PTY + conversation). */
  onClose: (projectId: string) => void;
  /**
   * Polish P4 — bouton « + » : ouvre un projet (réutilise le flux d'ajout de la worklist,
   * `WorkingView.onAddProject` → import d'un dossier + pose sur la Table). Posé à DROITE des
   * onglets, AVANT le switch plein écran (jamais dans la zone scrollable). Optionnel.
   */
  onAddProject?: () => void;
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
  onAddProject,
  focus,
  onToggleFocus,
  liveStatus,
}: ProjectTabsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="projtabs" role="tablist" aria-label={t("working.tabsAria")}>
      {/* L26 (recette v5) — SEULS les onglets scrollent horizontalement. Le switch est
          SORTI de cette zone (frère ci-dessous) : dans un conteneur à `overflow-x:auto`,
          `margin-left:auto` ne pousse pas jusqu'au bout ; en le sortant, le switch se pose
          naturellement à droite (`.projtabs-list` en `flex:1`, switch en `flex:0 0 auto`). */}
      <div className="projtabs-list">
        {conversations.map((c) => {
          const on = c.projectId === activeProjectId;
          // L31-P2 — point de statut vivant du slot (discret). Absent → pas de point.
          const live = liveStatus?.[c.projectId];
          return (
            <div key={c.projectId} className={`projtab${on ? " active" : ""}`}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                className="pt-open"
                onClick={() => onSelect(c.projectId)}
              >
                {live && (
                  <span className={`pt-status ${live}`} aria-hidden />
                )}
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
      {/* Polish P4 — bouton « + » : ouvre un projet (même flux que le « + » de la worklist).
          FRÈRE de `.projtabs-list` (hors zone scrollable), posé juste AVANT le switch → il ne
          casse ni le layout 2-lignes ni le collage à droite du `.fsswitch`. */}
      {onAddProject && (
        <button
          type="button"
          className="pt-add"
          aria-label={t("working.tabAddAria")}
          title={t("working.tabAddAria")}
          onClick={onAddProject}
        >
          +
        </button>
      )}
      {/* L26 (recette v5) — SWITCH coulissant « plein écran », FRÈRE de `.projtabs-list`
          (hors zone scrollable) → il se pose collé au BORD DROIT de la barre (padding-right
          0 de `.projtabs`). Pastille à gauche = off, à droite = on ; piste colorée en `on`.
          Le glyphe `⤢` vit DANS la pastille (voyage avec elle) — plus de libellé texte.
          Accessibilité via `aria-label`/`title` i18n. Symétrique : App gère focus +
          fullscreen d'un seul geste. */}
      <button
        type="button"
        role="switch"
        aria-checked={focus}
        className={`fsswitch${focus ? " on" : ""}`}
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
        <span className="fsswitch-track" aria-hidden>
          <span className="fsswitch-knob">
            <span className="fsswitch-ico">⤢</span>
          </span>
        </span>
      </button>
    </div>
  );
}
