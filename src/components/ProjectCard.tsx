/**
 * ProjectCard — carte riche d'un projet POSÉ SUR LA TABLE (L21 tranche A). Calque la
 * grammaire `.proj` du mock (`specs/design/redesign/A/concepts/app/portefeuille.html:92-98`) :
 *   `.top` (icône + nom + chemin + chip statut) · `.desc` · `.foot` (`.avatars` superposées
 *   + `.cost` anneau % + total tokens).
 *
 * Présentationnel PUR (D8) : reçoit déjà résolus le statut « vivant » (chip), les avatars de
 * la team du projet (URL ou `null` → pastille de repli), le total tokens et le % d'anneau
 * (scopé à la table, tranche C). Aucun I/O, aucun calcul de donnée ici. Zéro fausse donnée :
 * un projet sans transcript affiche « — tokens » et un anneau NEUTRE (pas de faux %).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../api/backend";

/** Avatar d'un membre de team (nom + royaume/rôle + URL de vignette résolue ou `null`). */
export interface AvatarMember {
  name: string;
  royaume: string;
  url: string | null;
}

export interface ProjectCardProps {
  project: Project;
  /** Conversation vivante pour ce projet → chip `● en cours` (AR-2), sinon `au repos`. */
  live: boolean;
  /** Avatars de la team du projet (URL résolue suivant la charte active, ou `null`). */
  avatars: readonly AvatarMember[];
  /** Total tokens (input+output) du projet, ou `null` si absent des transcripts. */
  tokens: number | null;
  /** Part du projet dans le total des tokens de la TABLE (0–100), ou `null` si pas de tokens. */
  ringPct: number | null;
  /** Couleur de l'anneau (alignée sur la treemap pour le même projet). */
  ringColor: string;
  /** Bascule le projet table↔atelier (toggle). Sur `table` = retirer, sur `shelf` = poser. */
  onRemove: (projectId: string) => void;
  /**
   * Contexte de rendu de la carte (L16-F1) :
   *  - `"table"` (défaut) : projet POSÉ sur la table → action « − retirer » ;
   *  - `"shelf"` : projet RANGÉ dans l'atelier, rendu en TUILE via le toggle Liste/Tuiles →
   *    action « + poser sur la table ». Même grammaire `.proj`, seule l'action est échangée.
   */
  variant?: "table" | "shelf";
}

/** Nombre max d'avatars affichés avant le badge `+N` (mock en montre 1–3). */
const AVATAR_CAP = 4;

/**
 * Seuil (AR-7) au-delà duquel le backlog restant est jugé « urgent » (pastille
 * rouge). `>= URGENCY_HIGH` étapes restantes → rouge ; `1..URGENCY_HIGH-1` → ambre.
 */
const URGENCY_HIGH = 5;

/** Niveau d'urgence de la tuile (F4), dérivé du backlog restant (donnée pure). */
type UrgencyLevel = "none" | "done" | "mid" | "high";

/**
 * Niveau d'urgence pur dérivé de `backlog_remaining` (AR-7) :
 *  - `null` (pas de backlog du tout) → `"none"` (gris/neutre) ;
 *  - `0` (backlog présent, tout coché) → `"done"` (vert, fini) ;
 *  - `1..URGENCY_HIGH-1` → `"mid"` (ambre, en cours) ;
 *  - `>= URGENCY_HIGH` → `"high"` (rouge, urgent).
 */
function urgencyLevel(remaining: number | null): UrgencyLevel {
  if (remaining === null) return "none";
  if (remaining === 0) return "done";
  if (remaining >= URGENCY_HIGH) return "high";
  return "mid";
}

/** Formate un total de tokens à la française : 148200 → « 148,2k » (calque mock). */
function fmtTokens(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `${s.replace(".", ",")}k`;
  }
  return String(n);
}

/** Vignette ronde + repli pastille `[ROYAUME]` (initiale) si URL absente / image cassée. */
function CardAvatar({ member }: { member: AvatarMember }): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (member.url && !broken) {
    return (
      <img
        src={member.url}
        alt={member.name}
        title={member.name}
        onError={() => setBroken(true)}
      />
    );
  }
  // Pastille de repli : initiale du nom d'agent (jamais d'image cassée).
  return (
    <span className="pastille" title={`[${member.royaume}][${member.name}]`} aria-hidden>
      {member.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ProjectCard({
  project,
  live,
  avatars,
  tokens,
  ringPct,
  ringColor,
  onRemove,
  variant = "table",
}: ProjectCardProps): JSX.Element {
  const { t } = useTranslation();
  const isShelf = variant === "shelf";
  const shown = avatars.slice(0, AVATAR_CAP);
  const overflow = avatars.length - shown.length;

  // Pastille d'urgence (F4, AR-7) : niveau pur dérivé du backlog restant + libellé
  // i18n décrivant l'état (la pastille n'est plus décorative → title + aria-label).
  const remaining = project.backlog_remaining;
  const level = urgencyLevel(remaining);
  const urgencyLabel =
    level === "high"
      ? t("card.urgencyHigh", { count: remaining ?? 0 })
      : level === "mid"
        ? t("card.urgencyMid", { count: remaining ?? 0 })
        : level === "done"
          ? t("card.urgencyDone")
          : t("card.urgencyNone");

  // Anneau : conic-gradient % rempli (couleur projet) + reste neutre. Pas de tokens →
  // anneau NEUTRE (gris plein), aucun % affiché (zéro fausse donnée).
  const pct = ringPct;
  const ringStyle =
    pct !== null
      ? {
          background: `conic-gradient(${ringColor} 0 ${pct}%, var(--surf-3) ${pct}% 100%)`,
        }
      : { background: "var(--surf-3)" };

  return (
    <article className="proj">
      <div className="top">
        {/* Pastille d'urgence (F4, AR-7) : point coloré dérivé du backlog restant.
            N'est plus décorative → title + aria-label i18n décrivant le niveau. */}
        <div
          className={`ic urg urg-${level}`}
          role="img"
          aria-label={urgencyLabel}
          title={urgencyLabel}
        />
        <div className="proj-id">
          <h3>{project.id}</h3>
          <div className="path">{project.path}</div>
        </div>
        <div className="topright">
          <span className={`chip${live ? " live" : ""}`}>
            {live ? t("card.statusLive") : t("card.statusIdle")}
          </span>
          <button
            type="button"
            className="cardrm"
            aria-label={
              isShelf
                ? t("card.putOnTableAria", { project: project.id })
                : t("card.removeAria", { project: project.id })
            }
            title={
              isShelf
                ? t("card.putOnTableAria", { project: project.id })
                : t("card.removeAria", { project: project.id })
            }
            onClick={() => onRemove(project.id)}
          >
            {isShelf ? "+" : "−"}
          </button>
        </div>
      </div>

      <div className="desc">
        {/* Sujet en GRAS (F3, AR-4/AR-6) : description dédiée du projet, fallback
            honnête sur le sujet du dernier commit puis « — » (zéro fausse donnée). */}
        <b className="desc-subject">
          {project.description ?? project.last_commit_subject ?? t("card.noCommit")}
        </b>
        {/* Prochaine étape statique du backlog CLAUDE.md (F3, AR-5) — masquée si absente. */}
        {project.backlog_next && (
          <div className="desc-next">
            {t("card.next", { text: project.backlog_next })}
          </div>
        )}
        {/* Ligne méta discrète (F3) : chaque item n'apparaît que si sa donnée existe. */}
        <div className="cardmeta">
          {project.version && <span className="metachip">{project.version}</span>}
          {project.behind > 0 && (
            <span className="metachip">{t("card.behind", { count: project.behind })}</span>
          )}
          {project.backlog_remaining !== null && project.backlog_remaining > 0 && (
            <span className="metachip">
              {t("card.remainingSteps", { count: project.backlog_remaining })}
            </span>
          )}
        </div>
      </div>

      <div className="foot">
        <div className="avatars">
          {shown.map((m) => (
            <CardAvatar key={m.name} member={m} />
          ))}
          {overflow > 0 && (
            <span className="pastille more" aria-hidden>
              +{overflow}
            </span>
          )}
        </div>
        <div className="cost">
          <div className="ring" style={ringStyle}>
            <span>{pct !== null ? `${Math.round(pct)}%` : "—"}</span>
          </div>
          <div className="tk">
            <b>{tokens !== null ? fmtTokens(tokens) : "—"}</b>
            {t("card.tokens")}
          </div>
        </div>
      </div>
    </article>
  );
}
