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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project, ProjectActivity } from "../api/backend";
import { ProjectCard, type AvatarMember } from "../components/ProjectCard";
import { ShelfRow } from "../components/ShelfRow";
import { ActivityTimeline } from "../components/ActivityTimeline";
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
  /** Ventilation tokens/jour/projet (L21 D / AR-5 révisé) ; échelle PORTEFEUILLE ENTIER
   *  (non filtrée par la table) → scatter-timeline « Travail récent · portefeuille ». */
  activity?: readonly ProjectActivity[];
  /**
   * L16-F2 — double-clic sur une cellule de la treemap Économie : bascule sur Travail avec
   * le projet au premier plan (navigation + focus, AUCUNE mutation du workset). Câblé par
   * `App` (`openProject` + `setActiveView("working")`).
   */
  onOpenInWork?: (projectId: string) => void;
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
  activity = [],
  onOpenInWork,
}: PortfolioViewProps): JSX.Element {
  const { t } = useTranslation();

  // L16-F1 — mode d'affichage de l'ATELIER SEUL (la table reste toujours en tuiles).
  // Défaut = « Liste » (aucune régression visuelle) ; état local UI, sans persistance (MVP).
  const [shelfView, setShelfView] = useState<"list" | "tiles">("list");

  // KPIs RÉELS (dérivés des props, purs) — le coût/tokens reste un placeholder.
  const cleanCount = projects.filter((p) => p.is_git && !p.dirty).length;
  const dirtyCount = projects.filter((p) => p.dirty).length;
  // Descripteurs `.kd` HONNÊTES (3ᵉ niveau du bandeau, Loki P2-5) — dérivés du réel,
  // jamais un chiffre inventé : nb de dépôts sous git + nb de projets vivants sur la table.
  const gitCount = projects.filter((p) => p.is_git).length;

  // Partition table / atelier (front pur).
  const tableProjects = projects.filter((p) => worksetIds.has(p.id));
  const shelfProjects = projects.filter((p) => !worksetIds.has(p.id));
  // Projets de la table ayant une conversation vivante (descripteur `.kd` « sur la table »).
  const liveOnTable = tableProjects.filter(
    (p) => liveProjectIds?.has(p.id) ?? false,
  ).length;

  // ÉCONOMIE SCOPÉE À LA TABLE (tranche C, helper pur) : dénominateur de l'anneau % ET de
  // la treemap = Σ tokens des projets de la table uniquement (AR-4).
  const scope = scopePortfolioEconomy(economy, worksetIds);
  // Couleur d'anneau alignée sur la treemap (même index → même teinte par projet).
  const colorByProject = new Map(
    scope.tableEconomy.map((e, i) => [e.project, treemapColor(i)]),
  );
  // Visu « travail passé » (AR-5 RÉVISÉ) : à l'échelle du PORTEFEUILLE ENTIER — PAS de
  // filtre `worksetIds` ici (comme le naonedge-dashboard montre tous les projets). L'anneau
  // % des cartes ET la treemap Économie RESTENT, eux, scopés à la table (AR-4) : seule
  // l'activité passe en vue portefeuille. La donnée est la VRAIE `portfolioActivity()`.

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

          {/* Bandeau KPIs numériques en ligne (décision IHM) — rythme à 3 niveaux du mock :
              libellé `.kl` / valeur `.kv` / descripteur `.kd` (Loki P2-5). Les `.kd` sont
              HONNÊTES (dérivés du réel ou libellé qualitatif), jamais un chiffre inventé. */}
          <div className="kpibar">
            <div className="k">
              <div className="kl">{t("portfolio.kpiDetected")}</div>
              <div className="kv">{projects.length}</div>
              <div className="kd">
                {t("portfolio.kdDetected", { count: gitCount })}
              </div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiOnTable")}</div>
              <div className="kv">{worksetCount}</div>
              <div className="kd">
                {t("portfolio.kdOnTable", { count: liveOnTable })}
              </div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiClean")}</div>
              <div className="kv">{cleanCount}</div>
              <div className="kd">{t("portfolio.kdClean")}</div>
            </div>
            <div className="k">
              <div className="kl">{t("portfolio.kpiDirty")}</div>
              <div className="kv">{dirtyCount}</div>
              <div className="kd">{t("portfolio.kdDirty")}</div>
            </div>
            <div className="k k-soon">
              <div className="kl">{t("portfolio.kpiEconomy")}</div>
              <div className="kv">
                <small>{t("portfolio.soon")}</small>
              </div>
              <div className="kd">{t("portfolio.economyPeriod")}</div>
            </div>
          </div>

          {/* Travail récent · portefeuille — PLEINE LARGEUR (retour terrain) : SORTI de
              `.foliolayout` pour s'étendre jusqu'au bord droit (plus contraint par la grille
              tuiles|économie). Posé juste APRÈS la `.kpibar`, AVANT le layout 2 zones, en flux
              bloc de `.pfpad` → largeur pleine. Échelle PORTEFEUILLE ENTIER (AR-5 révisé) :
              `activity` non filtrée par la table. */}
          <div className="rowhead">
            <h2>{t("portfolio.recentWorkHead")}</h2>
          </div>
          <ActivityTimeline activity={activity} />

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

              {/* Rangés dans l'atelier — liste (défaut) OU tuiles (toggle L16-F1). */}
              <div className="rowhead">
                <h2>
                  {t("portfolio.shelfHead")} · {shelfProjects.length}
                </h2>
                <div
                  className="segtoggle"
                  role="group"
                  aria-label={t("portfolio.shelfViewAria")}
                >
                  <button
                    type="button"
                    className={shelfView === "list" ? "on" : ""}
                    aria-pressed={shelfView === "list"}
                    onClick={() => setShelfView("list")}
                  >
                    {t("portfolio.shelfViewList")}
                  </button>
                  <button
                    type="button"
                    className={shelfView === "tiles" ? "on" : ""}
                    aria-pressed={shelfView === "tiles"}
                    onClick={() => setShelfView("tiles")}
                  >
                    {t("portfolio.shelfViewTiles")}
                  </button>
                </div>
              </div>
              {shelfView === "list" ? (
                <div className="scan">
                  {shelfProjects.map((p) => (
                    <ShelfRow key={p.id} project={p} onPut={onToggleWork} />
                  ))}
                </div>
              ) : (
                // Tuiles atelier : grammaire `.proj` réutilisée (variant "shelf") — tokens
                // « — » + anneau NEUTRE (hors table → pas de coût scopé, zéro fausse donnée),
                // avatars de la team, action « + poser sur la table ».
                <div className="cards">
                  {shelfProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      variant="shelf"
                      live={false}
                      avatars={avatarsForProject?.(p.id) ?? NO_AVATARS}
                      tokens={null}
                      ringPct={null}
                      ringColor="var(--text-3)"
                      onRemove={onToggleWork}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="folioside" aria-label={t("portfolio.economyAria")}>
              <div className="rowhead">
                <h2>{t("portfolio.economyTitle")}</h2>
                <span className="eb">{t("portfolio.economyPeriod")}</span>
              </div>
              {/* Treemap coût par projet & agent (L18 #5b) — SCOPÉE à la table (tranche C) :
                  EST le « coût par projet & agent » (segments coordinateur/délégués par projet). */}
              <TreemapPanel
                items={scope.tableEconomy}
                onOpenInWork={onOpenInWork}
              />
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
