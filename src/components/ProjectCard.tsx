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
  /** Retire le projet de la table (le range sur l'étagère). */
  onRemove: (projectId: string) => void;
}

/** Nombre max d'avatars affichés avant le badge `+N` (mock en montre 1–3). */
const AVATAR_CAP = 4;

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
}: ProjectCardProps): JSX.Element {
  const { t } = useTranslation();
  const shown = avatars.slice(0, AVATAR_CAP);
  const overflow = avatars.length - shown.length;

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
        <div className="ic" aria-hidden />
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
            aria-label={t("card.removeAria", { project: project.id })}
            title={t("card.removeAria", { project: project.id })}
            onClick={() => onRemove(project.id)}
          >
            −
          </button>
        </div>
      </div>

      <div className="desc">
        {project.last_commit_subject ?? t("card.noCommit")}
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
