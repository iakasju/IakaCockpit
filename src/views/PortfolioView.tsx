/**
 * PortfolioView — vue « Étagère » (D2, identité Atelier/Étagère/Table). Présentationnel :
 * bandeau de KPIs + grille de tuiles RÉELLE (3 colonnes) + colonne « Économie ». Reçoit
 * l'état des hooks en props, aucun I/O ici.
 *
 * Layout (décision IHM, mock Loki — incrément L17 #1) : KPIs numériques en LIGNE (bandeau
 * au-dessus) · tuiles au CENTRE (3 colonnes) · widgets économie à DROITE. Les KPIs et
 * widgets de COÛT (tokens) ne sont pas encore branchés (incrément suivant) : affichés en
 * placeholder HONNÊTE, pas de fausse donnée.
 */
import { useTranslation } from "react-i18next";
import type { Project } from "../api/backend";
import { Tile } from "../components/Tile";

export interface PortfolioViewProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
  root: string | null;
  worksetIds: ReadonlySet<string>;
  worksetCount: number;
  onToggleWork: (projectId: string) => void;
  onGotoWork: () => void;
}

export function PortfolioView({
  projects,
  loading,
  error,
  root,
  worksetIds,
  worksetCount,
  onToggleWork,
  onGotoWork,
}: PortfolioViewProps): JSX.Element {
  const { t } = useTranslation();

  // KPIs RÉELS (dérivés des props, purs) — le coût/tokens reste un placeholder.
  const cleanCount = projects.filter((p) => p.is_git && !p.dirty).length;
  const dirtyCount = projects.filter((p) => p.dirty).length;

  return (
    <section className="view pf" aria-label={t("portfolio.ariaLabel")}>
      <div className="pfright">
        <div className="pfpad">
          <div className="rh">
            <span className="eyebrow">{t("portfolio.eyebrow")}</span>
            <h1>{t("portfolio.title")}</h1>
            <span className="sub">{root ?? t("portfolio.rootUnresolved")}</span>
          </div>

          {/* Bandeau KPIs numériques en ligne (décision IHM). */}
          <div className="kpibar">
            <div className="k">
              <div className="kl">{t("portfolio.kpiDetected")}</div>
              <div className="kv">{projects.length}</div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiOnTable")}</div>
              <div className="kv">{worksetCount}</div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiClean")}</div>
              <div className="kv">{cleanCount}</div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiDirty")}</div>
              <div className="kv">{dirtyCount}</div>
            </div>
            <div className="k k-soon">
              <div className="kl">{t("portfolio.kpiEconomy")}</div>
              <div className="kv">
                <small>{t("portfolio.soon")}</small>
              </div>
            </div>
          </div>

          {/* Tuiles (centre, 3 colonnes) + économie (droite). */}
          <div className="foliolayout">
            <div className="foliomain">
              <div className="rowhead">
                <h2>{t("portfolio.underHat")}</h2>
                {worksetCount > 0 && (
                  <button
                    type="button"
                    className="btn accent sm goto"
                    onClick={onGotoWork}
                  >
                    {t("portfolio.openInWorking")}
                  </button>
                )}
              </div>

              {loading && (
                <div className="pfstate">{t("portfolio.scanning")}</div>
              )}
              {error && (
                <div className="pfstate err">
                  {t("portfolio.scanError", { error })}
                </div>
              )}
              {!loading && !error && projects.length === 0 && (
                <div className="pfstate">{t("portfolio.empty")}</div>
              )}

              <div className="tilegrid">
                {projects.map((p) => (
                  <Tile
                    key={p.id}
                    project={p}
                    inWork={worksetIds.has(p.id)}
                    onToggleWork={onToggleWork}
                  />
                ))}
              </div>
            </div>

            <aside className="folioside" aria-label={t("portfolio.economyAria")}>
              <div className="rowhead">
                <h2>{t("portfolio.economyTitle")}</h2>
                <span className="eb">{t("portfolio.economyPeriod")}</span>
              </div>
              <div className="ecocard soon">
                <div className="ecoh">{t("portfolio.economyCardTitle")}</div>
                <div className="ecoskel" aria-hidden>
                  <i style={{ width: "58%" }} />
                  <i style={{ width: "39%" }} />
                  <i style={{ width: "46%" }} />
                  <i style={{ width: "30%" }} />
                </div>
                <p className="ecohint">{t("portfolio.economyPlaceholder")}</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
