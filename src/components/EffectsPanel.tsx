/**
 * EffectsPanel — « effets fichiers » en HEATMAP (L18 #7, variante B du mock). Présentationnel :
 * une grille fichiers (lignes) × tours (colonnes/buckets), chaque cellule = intensité des
 * éditions du fichier dans ce bucket. Aucun I/O — reçoit les effets dérivés des gestes.
 * Les ordinaux d'édition (`hits`) sont bucketisés sur l'axe de temps de la session.
 */
import { useTranslation } from "react-i18next";
import { bucketize, type FileEffect } from "../hooks/useEffects";

export interface EffectsPanelProps {
  effects: readonly FileEffect[];
  /** Nombre total d'éditions de la session (borne des buckets). */
  total: number;
  /** Nombre de colonnes (tours regroupés). */
  buckets?: number;
}

function baseName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function EffectsPanel({
  effects,
  total,
  buckets = 12,
}: EffectsPanelProps): JSX.Element {
  const { t } = useTranslation();
  const rows = effects.map((e) => ({
    e,
    cells: bucketize(e.hits, total, buckets),
  }));
  const maxCell = rows.reduce(
    (m, r) => Math.max(m, ...r.cells),
    1,
  );

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
        <div className="fxgrid">
          {rows.map(({ e, cells }) => (
            <div key={e.path} className="fxrow" title={e.path}>
              <span className="fxname">{baseName(e.path)}</span>
              <span className="fxcells" aria-hidden>
                {cells.map((c, i) => (
                  <i
                    key={i}
                    className={c > 0 ? "on" : ""}
                    style={c > 0 ? { opacity: 0.25 + (c / maxCell) * 0.75 } : undefined}
                  />
                ))}
              </span>
              <span className="fxn">{e.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
