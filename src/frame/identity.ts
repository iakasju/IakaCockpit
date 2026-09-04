/**
 * frame/identity.ts — carte d'IDENTITÉ du runner (lot « Identité du runner — la team
 * liée pilote l'affichage, elle ne dit rien au runner », 2026-09-04).
 *
 * Constat cadré (`specs/instructions/identite-du-runner-badge-et-team.md`) : la liaison
 * projet↔team (L11) pilote TOUT ce que le Cockpit AFFICHE (interlocuteur, avatars,
 * roster, coordinateur), mais ne dit RIEN au runner lui-même — le processus `claude`
 * lancé dans le cwd du projet ignore qu'il est censé être un persona donné, ignore le
 * royaume. Sommé de produire un badge `[ROYAUME][Agent]` par le garde d'identité global
 * (hors dépôt), il en invente un (« claude »).
 *
 * Module **PUR**, sans I/O ni React (calque `frame/enforcement.ts`) : compose un
 * préambule de system-prompt à partir de données déjà résolues par l'appelant
 * (persona = coordinateur de la team liée ou nom du slot d'agent ; royaume = id du
 * projet en MAJUSCULES, AR-6). Préfixé — jamais substitué — à `systemPromptExtra`
 * (L22-P3) : L19 (Rust) → identité → Cadre (cf. `App.tsx` `resolveRunner`, CA-7).
 *
 * Zéro fausse donnée (AR-4/CA-6) : persona ou royaume absent → `""` (aucune injection).
 * Zéro roster injecté (AR-3) : le texte ne nomme AUCUN autre agent — fait bloquant
 * mesuré au cadrage (§ 2.5) : pour 11 des 12 teams sélectionnables dans ce Cockpit, les
 * noms d'agents n'existent PAS côté runner (`~/.claude/agents/*.md`, 10 contrats) et
 * `delegation-guard.mjs` REFUSERAIT (exit 2) toute délégation vers eux.
 *
 * HORS COUVERTURE, déclaré ici (CA-11) — pas seulement dans un rapport :
 *   - **Runner `codex`** : `codex_args` (`src-tauri/src/terminal.rs:387-394`) ne passe
 *     AUCUN system-prompt au process `codex` (pas de `--append-system-prompt`). Le texte
 *     composé ici peut être calculé pour un agent dont le runner est `codex`, mais il
 *     n'atteint JAMAIS le processus : c'est une limite STRUCTURELLE du CLI Codex, pas un
 *     oubli de ce module. Condition de levée : que le CLI `codex` expose un équivalent de
 *     `--append-system-prompt`. Voir `WorkingView.tsx` (F3) : l'affichage distingue ce
 *     cas (« identité non injectée ») du cas où le persona est bien porté par le runner.
 *   - **Conversation `attached` (L25)** : la session n'a pas été lancée par nous (tail
 *     d'un transcript externe, AUCUN PTY) ; son identité est hors de portée, définitivement.
 */

/** Pastille par défaut de la carte d'identité — symbole neutre, PAS une donnée de team
 * (aucune fabrication : ce n'est pas la couleur/phase d'un persona particulier, juste le
 * marqueur générique qui illustre la RÈGLE de position du badge, valable pour tout agent
 * n'ayant pas de pastille de phase propre — cf. § 6 F1 de l'instruction). */
export const DEFAULT_IDENTITY_PASTILLE = "•";

export interface IdentityPreambleInput {
  /** Nom du persona (coordinateur de la team liée, ou nom du slot d'agent). */
  persona: string | undefined | null;
  /** Royaume du badge — id du projet en MAJUSCULES (AR-6), jamais `agent.royaume`. */
  royaume: string | undefined | null;
  /** Symbole de pastille (position porte le sens). Défaut : `DEFAULT_IDENTITY_PASTILLE`. */
  pastille?: string;
}

/**
 * Compose le préambule d'identité injecté au system-prompt du runner. Fonction PURE et
 * DÉTERMINISTE (CA-1) : mêmes entrées → même chaîne, à l'octet (aucune date, aucun
 * aléatoire). Renvoie `""` si `persona` ou `royaume` est absent/vide (CA-6, zéro
 * fabrication) — l'appelant n'injecte alors rien.
 *
 * Le texte énonce, dans l'ordre, et RIEN D'AUTRE (§ 6 F1) :
 *   1. qui tu es (nom + royaume) ;
 *   2. la forme du badge : la pastille se pose AVANT le bloc à l'OUVERTURE, APRÈS à la
 *      CLÔTURE — la POSITION porte le sens, jamais un mot ; « START »/« STOP » (et
 *      variantes) sont bannis, car redondants avec cette position.
 * Il ne redit PAS l'obligation L19 (Rust), ne liste AUCUN outil, ne nomme AUCUN autre
 * agent (AR-3) — le Cadre (L22-P3), lui, est ajouté APRÈS ce préambule par l'appelant.
 */
export function identityPreamble({
  persona,
  royaume,
  pastille = DEFAULT_IDENTITY_PASTILLE,
}: IdentityPreambleInput): string {
  const p = (persona ?? "").trim();
  const r = (royaume ?? "").trim();
  if (!p || !r) return "";
  return [
    `Ton identité dans cette équipe : tu es ${p}, agent du projet ${r}. ` +
      `Ce n'est ni « Claude » ni un nom générique : c'est ${p}.`,
    `Le badge attendu à chaque prise de parole adressée est [${r}][${p}]. La pastille ` +
      `${pastille} porte le sens par sa POSITION, jamais par un mot : ${pastille} AVANT ` +
      `le bloc à l'OUVERTURE, ${pastille} APRÈS le bloc à sa CLÔTURE. N'emploie jamais ` +
      `« START » ni « STOP » (ni leurs variantes) : ils sont redondants avec cette position.`,
  ].join("\n\n");
}

export interface ResolveRunnerIdentityInput {
  /** `teams.hasBinding(projectId)` — liaison EXPLICITE, jamais le repli silencieux sur
   * la team par défaut (AR-4, CA-6). */
  hasBinding: boolean;
  /** Coordinateur de la team liée (branche projet), OU nom de l'agent du slot (branche
   * slot, CA-4) — jamais l'inverse : un slot porte l'identité DE SON agent. */
  persona: string | undefined;
  /** Id du projet (pas du slot synthétique) — dérive le royaume en MAJUSCULES (AR-6/CA-5). */
  projectId: string;
  /** Runner effectivement résolu — `codex` est hors couverture STRUCTURELLE (CA-11). */
  runnerKind: string;
}

export interface ResolveRunnerIdentityResult {
  /** Préambule d'identité, `""` si non injecté (à composer avec l'extra du Cadre). */
  identity: string;
  /** `true` ⇔ `identity` ATTEINDRA réellement le processus (pilote F3). */
  identityInjected: boolean;
}

/**
 * Point d'entrée UNIQUE (F1) qui décide SI une identité doit être composée, à partir de
 * données déjà résolues par l'appelant (`App.tsx` `resolveRunner`, deux branches
 * slot/coordinateur). Extrait pour éviter la DUPLICATION entre les deux branches et pour
 * rester testable EN PUR (CA-4/CA-5/CA-6) sans monter l'App — la JONCTION, elle, reste
 * éprouvée par `identityJunction.test.tsx` (CA-2, le critère qui compte).
 *
 * Zéro fabrication (CA-6) : `hasBinding:false` ⇒ `identity:""`, quels que soient
 * `persona`/`projectId` (même s'ils sont valides — l'absence de LIAISON EXPLICITE suffit
 * à refuser l'injection, cf. § AR-4 de l'instruction).
 */
export function resolveRunnerIdentity({
  hasBinding,
  persona,
  projectId,
  runnerKind,
}: ResolveRunnerIdentityInput): ResolveRunnerIdentityResult {
  const identity = hasBinding
    ? identityPreamble({ persona, royaume: projectId.toUpperCase() })
    : "";
  return {
    identity,
    // codex hors couverture STRUCTURELLE (terminal.rs:387-394, codex_args ne porte
    // aucun --append-system-prompt) : même une identité composée n'atteint jamais le
    // process. `identityInjected` reflète ce qui ARRIVE, pas ce qui a été TENTÉ.
    identityInjected: identity.length > 0 && runnerKind === "claude-code",
  };
}

/**
 * Compose le `systemPromptExtra` final transmis au runner : identité (ce module)
 * PRÉFIXÉE — jamais substituée — à l'extra dérivé du Cadre (L22-P3, `deriveEnforcement`).
 * `""` si les deux parts sont vides → `undefined` côté appelant (repli historique intact,
 * CA-7). PUR, calque l'ordre déjà imposé côté Rust (L19 → identité → Cadre, `chef_args`).
 */
export function composeSystemPromptExtra(
  identity: string,
  cadreExtra: string | undefined,
): string {
  const parts = [identity.trim(), (cadreExtra ?? "").trim()].filter(
    (s) => s.length > 0,
  );
  return parts.join("\n\n");
}
