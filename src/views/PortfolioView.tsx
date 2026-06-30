/**
 * PortfolioView — vue « Étagère » (D2, identité Atelier/Étagère/Table). Présentationnel :
 * bandeau de KPIs + projets POSÉS SUR LA TABLE (cartes riches `.proj`) + projets RANGÉS DANS
 * L'ATELIER (lignes `.scanrow`) + colonne « Économie » (treemap). Reçoit l'état des hooks en
 * props, aucun I/O ici.
 *
 * Conformité mock Loki (L21, `specs/design/redesign/A/concepts/app/portefeuille.html:87-172`).
 *  - Table (`worksetIds`) → `ProjectCard` : nom + chemin + chip statut + description (sujet du
 *    dernier commit) + avatars de la team + anneau de coût (% scopé table) + total tokens.
 *  - Atelier (hors workset) → `ShelfRow` : nom + chemin + statut git réel + bouton « poser ».
 *  - Scoping (tranche C) : anneau % ET treemap partagent le MÊME dénominateur = Σ tokens des
 *    projets de la TABLE uniquement.
 */
import { useTranslation } from "react-i18next";
import type { Project } from "../api/backend";
import { ProjectCard, type AvatarMember } from "../components/ProjectCard";
import { ShelfRow } from "../components/ShelfRow";
import { TreemapPanel, type TreemapItem } from "../components/TreemapPanel";
import { treemapColor } from "../components/treemapColor";
import { scopePortfolioEconomy, ringPct, tokensOf } from "./portfolioScope";

export interface PortfolioViewProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
  root: string | null;
  worksetIds: ReadonlySet<string>;
  worksetCount: number;
  onToggleWork: (projectId: string) => void;
  onGotoWork: () => void;
  /** Projets ayant une conversation vivante → chip `● en cours` (AR-2). */
  liveProjectIds?: ReadonlySet<string>;
  /** Avatars de la team d'un projet (URL résolue suivant la charte active, ou `null`). */
  avatarsForProject?: (projectId: string) => AvatarMember[];
  /** Coût par projet & agent (L18 #5b) ; vide → placeholder. Sert l'anneau ET la treemap. */
  economy?: readonly TreemapItem[];
}

const NO_AVATARS: AvatarMember[] = [];

export function PortfolioView({
  projects,
  loading,
  error,
  root,
  worksetIds,
  worksetCount,
  onToggleWork,
  onGotoWork,
  liveProjectIds,
  avatarsForProject,
  economy = [],
}: PortfolioViewProps): JSX.Element {
  const { t } = useTranslation();

  // KPIs RÉELS (dérivés des props, purs) — le coût/tokens reste un placeholder.
  const cleanCount = projects.filter((p) => p.is_git && !p.dirty).length;
  const dirtyCount = projects.filter((p) => p.dirty).length;

  // Partition table / atelier (front pur).
  const tableProjects = projects.filter((p) => worksetIds.has(p.id));
  const shelfProjects = projects.filter((p) => !worksetIds.has(p.id));

  // ÉCONOMIE SCOPÉE À LA TABLE (tranche C, helper pur) : dénominateur de l'anneau % ET de
  // la treemap = Σ tokens des projets de la table uniquement (AR-4).
  const scope = scopePortfolioEconomy(economy, worksetIds);
  // Couleur d'anneau alignée sur la treemap (même index → même teinte par projet).
  const colorByProject = new Map(
    scope.tableEconomy.map((e, i) => [e.project, treemapColor(i)]),
  );

  const showLoading = loading;
  const showError = !loading && error;
  const showEmpty = !loading && !error && projects.length === 0;

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

          {/* Tuiles (centre) + économie (droite). */}
          <div className="foliolayout">
            <div className="foliomain">
              {showLoading && (
                <div className="pfstate">{t("portfolio.scanning")}</div>
              )}
              {showError && (
                <div className="pfstate err">
                  {t("portfolio.scanError", { error })}
                </div>
              )}
              {showEmpty && (
                <div className="pfstate">{t("portfolio.empty")}</div>
              )}

              {/* Posés sur la table — cartes riches. */}
              <div className="rowhead">
                <h2>
                  {t("portfolio.tableHead")} · {tableProjects.length}
                </h2>
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

              {!showLoading && !showError && tableProjects.length === 0 && (
                <div className="pfstate">{t("portfolio.tableEmpty")}</div>
              )}

              <div className="cards">
                {tableProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    live={liveProjectIds?.has(p.id) ?? false}
                    avatars={avatarsForProject?.(p.id) ?? NO_AVATARS}
                    tokens={tokensOf(scope, p.id)}
                    ringPct={ringPct(scope, p.id)}
                    ringColor={colorByProject.get(p.id) ?? "var(--text-3)"}
                    onRemove={onToggleWork}
                  />
                ))}
              </div>

              {/* Rangés dans l'atelier — lignes compactes. */}
              <div className="rowhead">
                <h2>
                  {t("portfolio.shelfHead")} · {shelfProjects.length}
                </h2>
              </div>
              <div className="scan">
                {shelfProjects.map((p) => (
                  <ShelfRow key={p.id} project={p} onPut={onToggleWork} />
                ))}
              </div>
            </div>

            <aside className="folioside" aria-label={t("portfolio.economyAria")}>
              <div className="rowhead">
                <h2>{t("portfolio.economyTitle")}</h2>
                <span className="eb">{t("portfolio.economyPeriod")}</span>
              </div>
              {/* Treemap coût par projet & agent (L18 #5b) — SCOPÉE à la table (tranche C). */}
              <TreemapPanel items={scope.tableEconomy} />
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
