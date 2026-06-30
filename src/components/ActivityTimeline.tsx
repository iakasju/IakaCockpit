/**
 * ActivityTimeline — visu « travail passé » (L21 D). Scatter-timeline calqué sur
 * `naonedge-dashboard/index.html:303-360` (`renderChart`) : 1 ligne = 1 projet, X = temps
 * (jours si ≤ 45 j, sinon mois), chaque bulle = un jour d'activité, rayon ∝ tokens du jour.
 *
 * Présentationnel PUR (D8), SVG en JSX (aucune dépendance, CSP intacte — pas d'innerHTML).
 * Reçoit la série à l'échelle du PORTEFEUILLE ENTIER (AR-5 révisé : non filtrée par la table).
 * Empty-state honnête si aucune donnée (jamais de bulle fantôme : un projet sans transcript
 * n'apparaît pas).
 */
import { useTranslation } from "react-i18next";
import type { ProjectActivity } from "../api/backend";
import { treemapColor } from "./treemapColor";

const DAY_MS = 86_400_000;
const MONTHS = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
];

function fmtTok(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${(Number.isInteger(k) ? String(k) : k.toFixed(1)).replace(".", ",")}k`;
  }
  return String(n);
}

interface Bubble {
  t: number;
  v: number;
  date: string;
}
interface Row {
  name: string;
  color: string;
  pts: Bubble[];
}

export interface ActivityTimelineProps {
  /** Série tokens/jour/projet, à l'échelle du PORTEFEUILLE ENTIER (AR-5 révisé). */
  activity: readonly ProjectActivity[];
}

export function ActivityTimeline({ activity }: ActivityTimelineProps): JSX.Element {
  const { t } = useTranslation();

  const rows: Row[] = activity
    .filter((p) => p.days.length > 0)
    .map((p, i) => ({
      name: p.project,
      color: treemapColor(i),
      pts: p.days.map((d) => ({
        t: Date.parse(d.date),
        v: d.tokens,
        date: d.date,
      })),
    }))
    .filter((r) => r.pts.every((b) => !Number.isNaN(b.t)));

  // Le titre de section est porté par le `rowhead` parent (Loki P2-6) ; ici on ne garde
  // que la légende explicative pour éviter un double titre redondant.
  const header = (
    <div className="acthead">
      <span className="actsub">{t("activity.subtitle")}</span>
    </div>
  );

  if (rows.length === 0) {
    return (
      <section className="activity" aria-label={t("activity.title")}>
        {header}
        <p className="actempty">{t("activity.empty")}</p>
      </section>
    );
  }

  // Bornes temporelles + valeur max (rayon des bulles).
  let minT = Infinity;
  let maxT = -Infinity;
  let maxV = 1;
  for (const r of rows) {
    for (const b of r.pts) {
      minT = Math.min(minT, b.t);
      maxT = Math.max(maxT, b.t);
      maxV = Math.max(maxV, b.v);
    }
  }
  const pad = Math.max(DAY_MS, (maxT - minT) * 0.06);
  minT -= pad;
  maxT += pad;

  const W = 1000;
  const L = 140;
  const R = 24;
  const T = 34;
  // Tailles standard (axe 9 / labels 11, cf. app.css) + interligne resserré : rowH = 26.
  // Anti-collision verticale des bulles préservée : rayon plafonné à ~12 (Ø max ≈ 24 ≤ rowH)
  // → pas de chevauchement entre lignes adjacentes.
  const rowH = 26;
  const B = 16;
  const H = T + rows.length * rowH + B;
  const span = maxT - minT || 1;
  const x = (ts: number): number => L + ((ts - minT) / span) * (W - L - R);
  const rad = (v: number): number => 3 + Math.sqrt(v / maxV) * 9;

  // Max 5 lignes VISIBLES (retour terrain) : au-delà, le surplus reste accessible par SCROLL
  // vertical — la donnée n'est JAMAIS tronquée (toutes les lignes sont rendues). On borne la
  // hauteur visible via `aspect-ratio` du conteneur = même base de largeur que le SVG (zéro
  // mesure JS, robuste à toute largeur) ; le SVG, plus haut, déborde → `overflow-y:auto`.
  // Choix MVP assumé : tout le bloc scrolle (l'axe X défile avec le corps), pas d'axe figé.
  const VISIBLE_ROWS = 5;
  const scrollable = rows.length > VISIBLE_ROWS;
  const capUnits = T + VISIBLE_ROWS * rowH + B;

  // Quadrillage : jours (≤ 45 j) sinon mois.
  const ticks: { px: number; label: string }[] = [];
  const spanDays = (maxT - minT) / DAY_MS;
  const p2 = (n: number): string => String(n).padStart(2, "0");
  if (spanDays <= 45) {
    const step = spanDays <= 12 ? 1 : spanDays <= 24 ? 2 : 3;
    for (let ts = Math.ceil(minT / DAY_MS) * DAY_MS; ts <= maxT; ts += step * DAY_MS) {
      const dt = new Date(ts);
      ticks.push({
        px: x(ts),
        label: `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)}`,
      });
    }
  } else {
    const start = new Date(minT);
    const m = new Date(start.getFullYear(), start.getMonth(), 1);
    while (m.getTime() <= maxT) {
      const mt = m.getTime();
      if (mt >= minT) {
        ticks.push({
          px: x(mt),
          label: `${MONTHS[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`,
        });
      }
      m.setMonth(m.getMonth() + 1);
    }
  }

  return (
    <section className="activity" aria-label={t("activity.title")}>
      {header}
      <div
        className={scrollable ? "actscroll on" : "actscroll"}
        style={scrollable ? { aspectRatio: `${W} / ${capUnits}` } : undefined}
      >
      <svg
        className="actsvg"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMinYMin meet"
        role="img"
      >
        {ticks.map((tk, i) => (
          <g key={`t${i}`}>
            <line
              x1={tk.px.toFixed(1)}
              y1={T - 6}
              x2={tk.px.toFixed(1)}
              y2={H - B}
              className="actgrid"
            />
            <text x={tk.px + 4} y={T - 10} className="actax">
              {tk.label}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = T + i * rowH + rowH / 2;
          return (
            <g key={r.name}>
              <text x={L - 10} y={y + 3} className="actlab" textAnchor="end">
                {r.name}
              </text>
              <line x1={L} y1={y} x2={W - R} y2={y} className="actrow" />
              {r.pts.map((b, j) => (
                <circle
                  key={j}
                  cx={x(b.t).toFixed(1)}
                  cy={y}
                  r={rad(b.v).toFixed(1)}
                  fill={r.color}
                  fillOpacity={0.8}
                  stroke={r.color}
                  strokeWidth={1}
                >
                  <title>
                    {t("activity.bubbleTitle", {
                      project: r.name,
                      date: b.date,
                      tokens: fmtTok(b.v),
                    })}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      </div>
    </section>
  );
}
