/**
 * EffectsPanel — « effets fichiers » de la session (L18 #7). Présentationnel : la liste
 * des fichiers touchés (Edit/Write…) triés par nombre d'éditions, avec une barre
 * d'intensité relative. Aucun I/O — reçoit les effets dérivés des gestes du transcript.
 *
 * NB : la heatmap fichiers × TOURS du mock demande l'indexation par tour (refinement) ;
 * ici on expose la donnée data-ready (quels fichiers, combien de fois) sans rien inventer.
 */
import { useTranslation } from "react-i18next";
import type { FileEffect } from "../hooks/useEffects";

export interface EffectsPanelProps {
  effects: readonly FileEffect[];
}

function baseName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function EffectsPanel({ effects }: EffectsPanelProps): JSX.Element {
  const { t } = useTranslation();
  const max = effects.reduce((m, e) => Math.max(m, e.count), 1);

  return (
    <section className="fxpanel" aria-label={t("effects.ariaLabel")}>
      <div className="fxh">
        <span className="fxt">{t("effects.title")}</span>
        {effects.length > 0 && (
          <span className="fxv">{t("effects.count", { count: effects.length })}</span>
        )}
      </div>
      {effects.length === 0 ? (
        <p className="fxempty">{t("effects.empty")}</p>
      ) : (
        <ul className="fxlist">
          {effects.map((e) => (
            <li key={e.path} className="fxitem" title={e.path}>
              <span className="fxbar" aria-hidden>
                <i style={{ width: `${(e.count / max) * 100}%` }} />
              </span>
              <span className="fxname">{baseName(e.path)}</span>
              <span className="fxn">{e.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
