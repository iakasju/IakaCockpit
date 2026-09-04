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

/**
 * decideEagerOpenFocus — L37 F2 : le démarrage n'ouvre pas de fenêtre à la place de
 * l'utilisateur (AR-1 = (c)). L'ouverture EAGER d'un lot de projets restaurés au boot
 * ne doit PAS voler le focus (rester sur Portefeuille) ; toute ouverture EAGER
 * ultérieure (pose utilisateur sur la Table, après ce premier passage) le vole comme
 * avant (comportement L24 inchangé).
 *
 * Pure : reçoit l'état de restauration (le hook `useWorkset().loaded`) et un booléen
 * mémorisé par l'appelant (ex. une réf) indiquant si le PREMIER passage qui suit la
 * fin de la restauration a déjà eu lieu. Renvoie la décision de focus ET le nouvel
 * état à mémoriser — aucune mutation ici, l'appelant applique les deux.
 */
export interface EagerFocusState {
  /** Le passage de restauration (premier après `worksetLoaded`) a-t-il déjà eu lieu ? */
  restorationConsumed: boolean;
}

export interface EagerFocusDecision {
  /** `false` uniquement pendant la fenêtre de restauration ; `true` sinon. */
  focus: boolean;
  /** Nouvel état à mémoriser (ref) pour le passage suivant. */
  nextState: EagerFocusState;
}

export function decideEagerOpenFocus(
  worksetLoaded: boolean,
  state: EagerFocusState,
): EagerFocusDecision {
  const isRestorationPass = worksetLoaded && !state.restorationConsumed;
  return {
    focus: !isRestorationPass,
    // Consommé dès que la restauration est terminée, que ce passage ait ouvert
    // des projets ou non (une Table vide au boot ne doit pas rouvrir la fenêtre
    // à un passage ultérieur qui n'a plus rien à voir avec le démarrage).
    nextState: { restorationConsumed: state.restorationConsumed || worksetLoaded },
  };
}
