/**
 * gitLabel — libellé court de l'état git d'un projet (i18n) + classe de pastille de statut.
 * Factorisé (ex-`Tile.tsx`) pour partage entre la carte/ligne de l'Étagère (L21). Pur.
 */
import type { TFunction } from "i18next";
import type { Project } from "../api/backend";

/** Libellé court de l'état git (i18n) ; symboles ↑/↓ + nombre bruts (données). */
export function gitLabel(p: Project, t: TFunction): { cls: string; text: string } {
  if (!p.is_git) return { cls: "dirty", text: t("tile.gitNone") };
  if (p.dirty) return { cls: "dirty", text: t("tile.gitDirty") };
  if (p.ahead > 0) return { cls: "ahead", text: `↑${p.ahead}` };
  if (p.behind > 0) return { cls: "ahead", text: `↓${p.behind}` };
  return { cls: "clean", text: t("tile.gitClean") };
}

/** Classe de la pastille de statut git (`clean`/`dirty`/`nogit`). */
export function statusDotClass(p: Project): string {
  if (!p.is_git) return "nogit";
  return p.dirty ? "dirty" : "clean";
}
