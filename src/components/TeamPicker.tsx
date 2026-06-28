/**
 * TeamPicker — popup de liaison projet↔team (L11, § 5.2). Présentationnel.
 *
 * Affiché par `App.openProject` **avant** d'ouvrir la conversation, **uniquement** si
 * le projet n'a pas de liaison `project_team:<id>` (sinon ouverture directe). Listbox
 * des teams existantes ; pré-sélection = **dernière team utilisée** (`defaultTeamId`),
 * sinon 1ʳᵉ team de la liste. **Confirmer** → `onConfirm(teamId)` (persiste la liaison
 * + maj « dernière team »). **Annuler** → `onCancel()` (n'écrit RIEN, ouvre avec la team
 * par défaut ; le popup reviendra). Affordance « Gérer les teams… » → `onManageTeams()`.
 *
 * Pas d'invalidation : on re-propose le popup seulement quand il n'y a pas de liaison.
 * Aucune origine/iframe/portal externe (CSP stricte intacte) — simple overlay DOM.
 */
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { Team } from "../hooks/useTeams";

export interface TeamPickerProps {
  /** Nom/libellé du projet à relier (titre du popup). */
  projectLabel: string;
  /** Teams sélectionnables (au moins la team par défaut existe toujours). */
  teams: Team[];
  /** Pré-sélection = dernière team utilisée ; repli 1ʳᵉ team si absente. */
  defaultTeamId: string;
  /** Confirme : persiste `project_team` + `default_team` puis ouvre. */
  onConfirm: (teamId: string) => void;
  /** Annule : ouvre avec la team par défaut, sans persister (popup reviendra). */
  onCancel: () => void;
  /** Ouvre l'écran Settings « Teams & agents » (gestion/création). */
  onManageTeams: () => void;
}

export function TeamPicker({
  projectLabel,
  teams,
  defaultTeamId,
  onConfirm,
  onCancel,
  onManageTeams,
}: TeamPickerProps): JSX.Element {
  const { t } = useTranslation();
  // Pré-sélection : dernière team utilisée si elle existe, sinon la 1ʳᵉ de la liste.
  const initial =
    teams.find((tm) => tm.id === defaultTeamId)?.id ?? teams[0]?.id ?? "";
  const [selected, setSelected] = useState<string>(initial);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        // Clic hors carte = annuler (ouvre avec la team par défaut).
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal-card teampicker"
        role="dialog"
        aria-modal="true"
        aria-label={t("teamPicker.dialogAria", { project: projectLabel })}
      >
        <h2 className="modal-title">
          <Trans
            i18nKey="teamPicker.title"
            values={{ project: projectLabel }}
            components={[<em />]}
          />
        </h2>
        <p className="modal-lead">
          <Trans i18nKey="teamPicker.lead" components={[<strong />]} />
        </p>

        <select
          className="field"
          size={Math.min(Math.max(teams.length, 3), 8)}
          aria-label={t("teamPicker.listAria")}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {teams.map((tm) => (
            <option key={tm.id} value={tm.id}>
              {tm.name}
              {tm.id === defaultTeamId ? t("teamPicker.lastUsedSuffix") : ""}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button type="button" className="btn sm" onClick={onManageTeams}>
            {t("teamPicker.manage")}
          </button>
          <span className="spc" style={{ flex: 1 }} />
          <button type="button" className="btn sm" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn accent sm"
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
