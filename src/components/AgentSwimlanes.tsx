/**
 * AgentSwimlanes — arbre des délégations en variante B « Swimlanes d'agents » (L29).
 *
 * Rendu HORIZONTAL COMPACT (par opposition à l'arbre vertical `DelegationTree`, L28) :
 *   - **un couloir (lane) par agent** en Y : coordinateur en tête, puis les agents
 *     délégués dédupliqués (ordre de première apparition) ;
 *   - **axe temps X** dérivé des `ts` (début) / `doneTs` (fin) des délégations ;
 *   - **barre d'activité** par tâche dans le couloir de son agent : `ts` → `doneTs`
 *     (fin) ou → « maintenant » si `running` (barre ouverte, jamais d'estimation) ;
 *   - **flèches de délégation** coordinateur → agent délégué, à l'abscisse `ts`
 *     (pointillé accent) — MVP 1 niveau (imbriqué différé) ;
 *   - **ascenseur horizontal** : tout le bloc scrolle en X, hauteur bornée compacte.
 *
 * Présentationnel PUR (D8) : aucun I/O, SVG en JSX (pas d'innerHTML, CSP intacte).
 * Reçoit ses données en props (coordinateur + tâches déjà dérivées via `useAgentTasks`).
 * Vide → placeholder honnête. Libellés i18n (parité fr/en). Zéro fausse donnée : une
 * tâche sans `ts` valide n'a pas de barre ; une tâche `running` reste « ouverte ».
 */
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
const PX_PER_MIN = 9; // densité horizontale (px par minute de session).
const MIN_W = 680; // largeur mini du SVG (tient sans scroll si session courte).
const MAX_W = 4200; // garde-fou (sessions très longues) : scroll, pas d'explosion.

/** Paliers de pas d'axe « ronds » (ms), du plus fin au plus large. */
const STEPS_MS = [
  60_000, // 1 min
  5 * 60_000,
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

export function AgentSwimlanes({
  coordinator,
  tasks,
  resolveAvatar,
}: AgentSwimlanesProps): JSX.Element {
  const { t } = useTranslation();
  const total = tasks.length;
  const coordKey = coordinator.trim().toLowerCase();
  const coordName = displayName(coordinator);

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

  // Largeur px proportionnelle à la durée (min MIN_W, plafonnée MAX_W → scroll en X).
  const L = 120; // gouttière des labels de couloir.
  const R = 20;
  const spanMin = span / 60_000;
  const W = Math.round(
    Math.min(MAX_W, Math.max(MIN_W, L + R + spanMin * PX_PER_MIN)),
  );

  const T = 30; // bande de l'axe (ticks temps).
  const laneH = 34;
  const barH = 15;
  const B = 14;
  const H = T + lanes.length * laneH + B;

  const x = (ts: number): number => L + ((ts - minT) / span) * (W - L - R);
  const laneY = (i: number): number => T + i * laneH + laneH / 2;

  // --- Ticks temps : pas « rond » donnant ~6 graduations sur l'empan. ---
  const rawStep = span / 6;
  const stepMs = STEPS_MS.find((s) => s >= rawStep) ?? STEPS_MS[STEPS_MS.length - 1];
  const ticks: { px: number; label: string }[] = [];
  for (
    let ts = Math.ceil(minT / stepMs) * stepMs;
    ts <= maxT;
    ts += stepMs
  ) {
    ticks.push({ px: x(ts), label: hhmm(ts) });
  }

  return (
    <section className="swim" aria-label={t("swimlanes.ariaLabel")}>
      <div className="swimh">
        <span className="swimt">{t("swimlanes.title")}</span>
        <span className="swimcount">
          {t("swimlanes.count", { count: total })}
        </span>
      </div>
      <div className="swimscroll">
        <svg
          className="swimsvg"
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={t("swimlanes.title")}
        >
          {/* Graduations temps (verticales) + labels. */}
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

          {/* Couloirs : label (avatar + nom) + ligne de base par agent. */}
          {lanes.map((lane, i) => {
            const y = laneY(i);
            const url = resolveAvatar?.(lane.name) ?? null;
            const isCoord = i === 0;
            return (
              <g key={`lane-${lane.agent}`}>
                <line
                  x1={L}
                  y1={y}
                  x2={W - R}
                  y2={y}
                  className={isCoord ? "swimrow coord" : "swimrow"}
                />
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
    </section>
  );
}
