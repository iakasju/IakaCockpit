/**
 * AgentSwimlanes — arbre des délégations en variante B « Swimlanes d'agents » (L29).
 *
 * Rendu HORIZONTAL COMPACT (par opposition à l'arbre vertical `DelegationTree`, L28) :
 *   - **un couloir (lane) par agent** en Y : coordinateur en tête, puis les agents
 *     délégués dédupliqués (ordre de première apparition) ;
 *   - **colonne de labels FIGÉE** (avatar + nom) hors de l'ascenseur horizontal, alignée
 *     en Y sur les couloirs de la scène (patron « 1ʳᵉ colonne gelée » d'un Gantt) — R1 ;
 *   - **axe temps X** dérivé des `ts` (début) / `doneTs` (fin) des délégations, avec des
 *     **lignes de repère verticales** (gridlines) + **labels d'heure** à densité **adaptée
 *     au zoom** pour qu'aucune portion visible ne soit sans repère — R2 ;
 *   - **barre d'activité** par tâche dans le couloir de son agent : `ts` → `doneTs`
 *     (fin) ou → « maintenant » si `running` (barre ouverte, jamais d'estimation) ;
 *   - **flèches de délégation** coordinateur → agent délégué, à l'abscisse `ts`
 *     (pointillé accent) — MVP 1 niveau (imbriqué différé) ;
 *   - **zoom `+` / `−`** sur l'axe du temps (échelle px/minute, état d'affichage local
 *     borné) — R3 ; **ascenseur horizontal** sur la seule scène (labels restent visibles).
 *
 * Présentationnel PUR (D8) : aucun I/O, SVG en JSX (pas d'innerHTML, CSP intacte).
 * Reçoit ses données en props (coordinateur + tâches déjà dérivées via `useAgentTasks`).
 * Vide → placeholder honnête. Libellés i18n (parité fr/en). Zéro fausse donnée : une
 * tâche sans `ts` valide n'a pas de barre ; une tâche `running` reste « ouverte ».
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AgentTask } from "../hooks/useAgentTasks";
import type { AvatarResolver } from "../theme/teamAvatar";

export interface AgentSwimlanesProps {
  /** Nom du coordinateur = couloir de tête (source des flèches de délégation). */
  coordinator: string;
  /** Délégations à afficher (une barre par tâche). Vide → placeholder. */
  tasks: readonly AgentTask[];
  /** Résolveur de vignette par nom d'agent (réutilise celui du Roster). */
  resolveAvatar?: AvatarResolver;
}

const MIN_PX = 60_000; // 1 min : borne basse de la marge temporelle.
const PX_PER_MIN = 9; // densité horizontale de base (px par minute de session).
const MIN_SCENE = 360; // largeur mini de la scène scrollable.
const MAX_W = 4200; // garde-fou (sessions très longues) : scroll, pas d'explosion.

// Zoom (R3) : facteur d'échelle multiplié sur PX_PER_MIN, borné ÷4 … ×4 (état local).
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.5;
const TARGET_TICK_PX = 120; // espacement pixel visé entre deux repères d'heure.

/** Paliers de pas d'axe « ronds » (ms), du plus fin au plus large. */
const STEPS_MS = [
  60_000, // 1 min
  2 * 60_000,
  5 * 60_000,
  10 * 60_000,
  15 * 60_000,
  30 * 60_000,
  3_600_000, // 1 h
  3 * 3_600_000,
  6 * 3_600_000,
  12 * 3_600_000,
  86_400_000, // 1 j
];

/** Capitalise un nom d'agent (`gandalf` → `Gandalf`) pour l'affichage. */
function displayName(agent: string): string {
  return agent.length > 0 ? agent[0].toUpperCase() + agent.slice(1) : agent;
}

/** Parse un horodatage ISO ; `undefined` si absent/illisible (défensif). */
function parseTs(s?: string): number | undefined {
  if (!s) return undefined;
  const n = Date.parse(s);
  return Number.isNaN(n) ? undefined : n;
}

const p2 = (n: number): string => String(n).padStart(2, "0");
const hhmm = (ts: number): string => {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

interface Lane {
  agent: string; // clé normalisée (minuscule) pour l'appariement.
  name: string; // libellé affiché (capitalisé).
}

// --- Géométrie (partagée colonne de labels ↔ scène pour un alignement Y parfait). ---
const L = 120; // largeur de la colonne de labels FIGÉE (avatar + nom).
const SL = 14; // marge gauche de la scène.
const R = 20; // marge droite de la scène.
const T = 30; // bande de l'axe (labels d'heure).
const laneH = 34; // hauteur d'un couloir (identique labels ↔ scène → alignement).
const barH = 15;
const B = 14;

const laneY = (i: number): number => T + i * laneH + laneH / 2;

export function AgentSwimlanes({
  coordinator,
  tasks,
  resolveAvatar,
}: AgentSwimlanesProps): JSX.Element {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1); // R3 : état d'affichage local (pas de la donnée).
  const total = tasks.length;
  const coordKey = coordinator.trim().toLowerCase();
  const coordName = displayName(coordinator);

  const zoomIn = (): void =>
    setZoom((z) => Math.min(ZOOM_MAX, +(z * ZOOM_STEP).toFixed(3)));
  const zoomOut = (): void =>
    setZoom((z) => Math.max(ZOOM_MIN, +(z / ZOOM_STEP).toFixed(3)));

  if (total === 0) {
    return (
      <section className="swim" aria-label={t("swimlanes.ariaLabel")}>
        <div className="swimh">
          <span className="swimt">{t("swimlanes.title")}</span>
        </div>
        <div className="swimempty">{t("swimlanes.empty")}</div>
      </section>
    );
  }

  // --- Couloirs : coordinateur en tête, puis délégués dédupliqués (1re apparition). ---
  const lanes: Lane[] = [{ agent: coordKey, name: coordName }];
  const laneIndex = new Map<string, number>([[coordKey, 0]]);
  for (const task of tasks) {
    const key = task.agent.trim().toLowerCase();
    if (!laneIndex.has(key)) {
      laneIndex.set(key, lanes.length);
      lanes.push({ agent: key, name: displayName(task.agent) });
    }
  }

  // --- Axe temps : bornes dérivées des ts/doneTs ; « maintenant » pour les running. ---
  const now = Date.now();
  let hasRunning = false;
  let minT = Infinity;
  let maxT = -Infinity;
  for (const task of tasks) {
    const start = parseTs(task.ts);
    const end = parseTs(task.doneTs);
    if (start !== undefined) {
      minT = Math.min(minT, start);
      maxT = Math.max(maxT, start);
    }
    if (end !== undefined) {
      minT = Math.min(minT, end);
      maxT = Math.max(maxT, end);
    }
    if (task.status === "running") hasRunning = true;
  }
  // Dégénéré (aucun ts lisible) : axe minimal centré sur « maintenant » — les tâches
  // sans horodatage n'auront simplement pas de barre (zéro fausse donnée).
  if (!Number.isFinite(minT)) {
    minT = now - MIN_PX;
    maxT = now;
  }
  // Les barres running s'étendent jusqu'à « maintenant » : l'axe doit l'englober.
  if (hasRunning) maxT = Math.max(maxT, now);
  const pad = Math.max(MIN_PX, (maxT - minT) * 0.06);
  minT -= pad;
  maxT += pad;
  const span = maxT - minT || 1;

  // Largeur de la SCÈNE ∝ durée × échelle (zoom). Bornée [MIN_SCENE, MAX_W] → scroll X.
  const pxPerMin = PX_PER_MIN * zoom;
  const spanMin = span / 60_000;
  const Ws = Math.round(
    Math.min(MAX_W, Math.max(MIN_SCENE, SL + R + spanMin * pxPerMin)),
  );

  const H = T + lanes.length * laneH + B;
  const x = (ts: number): number => SL + ((ts - minT) / span) * (Ws - SL - R);

  // --- Ticks temps (R2) : pas « rond » donnant ~TARGET_TICK_PX px entre repères, donc
  //     densité qui SUIT le zoom (plus fin quand on zoome) → aucune portion sans heure. ---
  const pxPerMs = (Ws - SL - R) / span;
  const targetMs = TARGET_TICK_PX / Math.max(pxPerMs, 1e-9);
  const stepMs =
    STEPS_MS.find((s) => s >= targetMs) ?? STEPS_MS[STEPS_MS.length - 1];
  const ticks: { px: number; label: string }[] = [];
  for (let ts = Math.ceil(minT / stepMs) * stepMs; ts <= maxT; ts += stepMs) {
    ticks.push({ px: x(ts), label: hhmm(ts) });
  }

  const zoomLevel = Math.round(zoom * 100) / 100;

  return (
    <section className="swim" aria-label={t("swimlanes.ariaLabel")}>
      <div className="swimh">
        <span className="swimt">{t("swimlanes.title")}</span>
        <span className="swimcount">
          {t("swimlanes.count", { count: total })}
        </span>
        {/* R3 — Zoom de l'axe du temps (change px/minute, borné). */}
        <span className="swimzoom">
          <button
            type="button"
            className="swimzb"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            title={t("swimlanes.zoomOut")}
            aria-label={t("swimlanes.zoomOut")}
          >
            −
          </button>
          <span className="swimzlvl" aria-hidden="true">
            {t("swimlanes.zoomLevel", { level: zoomLevel })}
          </span>
          <button
            type="button"
            className="swimzb"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            title={t("swimlanes.zoomIn")}
            aria-label={t("swimlanes.zoomIn")}
          >
            +
          </button>
        </span>
      </div>

      <div className="swimbody">
        {/* R1 — Colonne de labels FIGÉE : hors de `.swimscroll`, donc toujours visible
            pendant le défilement horizontal. Même géométrie Y (T, laneH, laneY). */}
        <svg
          className="swimlabels"
          viewBox={`0 0 ${L} ${H}`}
          width={L}
          height={H}
          role="presentation"
          aria-hidden="true"
        >
          {lanes.map((lane, i) => {
            const y = laneY(i);
            const url = resolveAvatar?.(lane.name) ?? null;
            return (
              <g key={`lbl-${lane.agent}`}>
                {url ? (
                  <image
                    href={url}
                    x={6}
                    y={y - 10}
                    width={20}
                    height={20}
                    className="swimav"
                  />
                ) : (
                  <>
                    <rect
                      x={6}
                      y={y - 10}
                      width={20}
                      height={20}
                      rx={6}
                      className="swimav ph"
                    />
                    <text
                      x={16}
                      y={y + 4}
                      textAnchor="middle"
                      className="swimavtxt"
                    >
                      {lane.name.slice(0, 1).toUpperCase()}
                    </text>
                  </>
                )}
                <text x={32} y={y + 4} className="swimlab">
                  {lane.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Scène scrollable : axe temps + gridlines + barres + flèches (alignée en Y). */}
        <div className="swimscroll">
          <svg
            className="swimscene"
            viewBox={`0 0 ${Ws} ${H}`}
            width={Ws}
            height={H}
            data-px-min={Math.round(pxPerMin * 100) / 100}
            role="img"
            aria-label={t("swimlanes.title")}
          >
            {/* R2 — Repères d'heure : gridline verticale traversant les couloirs +
                label d'heure, densité adaptée au zoom. */}
            {ticks.map((tk, i) => (
              <g key={`tk${i}`}>
                <line
                  x1={tk.px.toFixed(1)}
                  y1={T - 6}
                  x2={tk.px.toFixed(1)}
                  y2={H - B}
                  className="swimgrid"
                />
                <text x={tk.px + 3} y={T - 10} className="swimax">
                  {tk.label}
                </text>
              </g>
            ))}

            {/* Ligne de base par couloir (alignée avec la colonne de labels). */}
            {lanes.map((lane, i) => {
              const y = laneY(i);
              const isCoord = i === 0;
              return (
                <line
                  key={`row-${lane.agent}`}
                  x1={SL}
                  y1={y}
                  x2={Ws - R}
                  y2={y}
                  className={isCoord ? "swimrow coord" : "swimrow"}
                />
              );
            })}

            {/* Flèches de délégation : couloir coordinateur → couloir de l'agent délégué,
                à l'abscisse `ts` (MVP 1 niveau, pointillé accent). */}
            {tasks.map((task) => {
              const key = task.agent.trim().toLowerCase();
              const i = laneIndex.get(key);
              const start = parseTs(task.ts);
              if (i === undefined || i === 0 || start === undefined) return null;
              const px = x(start);
              const y0 = laneY(0);
              const y1 = laneY(i);
              const dir = y1 > y0 ? 1 : -1;
              const yTip = y1 - dir * (barH / 2 + 2);
              return (
                <g key={`arr-${task.id}`} className="swimarr">
                  <path
                    d={`M ${px.toFixed(1)} ${y0} L ${px.toFixed(1)} ${yTip.toFixed(1)}`}
                    className="swimarrline"
                  />
                  <polygon
                    points={`${px},${yTip + dir * 5} ${px - 3.5},${yTip - dir * 0.5} ${px + 3.5},${yTip - dir * 0.5}`}
                    className="swimarrhead"
                  />
                </g>
              );
            })}

            {/* Barres d'activité : `ts` → `doneTs` (fin) ou « maintenant » si running. */}
            {tasks.map((task) => {
              const key = task.agent.trim().toLowerCase();
              const i = laneIndex.get(key);
              const start = parseTs(task.ts);
              if (i === undefined || start === undefined) return null;
              const running = task.status === "running";
              const endRaw = parseTs(task.doneTs);
              const end = endRaw ?? (running ? now : start);
              const x1 = x(start);
              const x2 = x(Math.max(end, start));
              const w = Math.max(6, x2 - x1); // largeur mini pour rester visible.
              const y = laneY(i) - barH / 2;
              const title = running
                ? t("swimlanes.barRunning", { agent: displayName(task.agent) })
                : t("swimlanes.barDone", { agent: displayName(task.agent) });
              return (
                <rect
                  key={`bar-${task.id}`}
                  x={x1.toFixed(1)}
                  y={y}
                  width={w.toFixed(1)}
                  height={barH}
                  rx={5}
                  className={`swimbar ${task.status}`}
                >
                  <title>{title}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
