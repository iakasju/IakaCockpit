/**
 * reconcileEagerOpen — logique PURE de l'ouverture EAGER des fenêtres de travail (L24 F1).
 *
 * Extrait de l'effet d'`App` pour être testable au niveau atteignable (App entier n'est
 * pas montable en test : portfolio/workset dépendent d'`invoke` en attente). Aucune I/O :
 * reçoit l'état en paramètres, renvoie la liste des projets à ouvrir.
 *
 * Règle (AR-2 + AR-3) : un projet de la Table est ouvert EAGER **si et seulement si** il
 * est **déjà lié** à une team (`hasBinding`) ET **n'a pas encore** de conversation ouverte.
 *   - déjà ouvert → exclu (idempotence + anti-boucle de rendu : la conversation créée
 *     retombe dans `openConversationIds` au tour suivant → plus rien à ouvrir) ;
 *   - non lié → exclu (anti-empilement de `TeamPicker` : le picker n'est ouvert qu'au
 *     clic explicite, comportement `openProject` conservé).
 */
import type { Project } from "../api/backend";

export interface EagerOpenParams {
  /** Projets présents sur la Table (intersection portfolio ⨯ workset). */
  worksetProjects: readonly Project[];
  /** Ids des projets ayant déjà une conversation ouverte (runner vivant). */
  openConversationIds: ReadonlySet<string>;
  /** Un projet est-il lié à une team ? (borne l'ouverture eager, anti-popup). */
  hasBinding: (projectId: string) => boolean;
}

export function projectsToEagerOpen(p: EagerOpenParams): Project[] {
  return p.worksetProjects.filter(
    (proj) => p.hasBinding(proj.id) && !p.openConversationIds.has(proj.id),
  );
}
