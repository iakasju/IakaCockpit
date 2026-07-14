/**
 * frame/enforcement.ts — traduction PURE du « Cadre » d'une team (L22-P3) en application
 * réelle sur le runner du coordinateur : `--allowedTools` + `--append-system-prompt`.
 *
 * Aucune I/O ni React : à partir d'un `Frame` (déjà chargé par `useFrame`) et du NOM du
 * coordinateur (résolu par `useTeams`), on dérive :
 *   - `allowedTools` = union des règles `tool` + `autorisation` MOINS les `interdit`
 *     (noms joints par virgule) ; `null` si le Cadre ne définit rien → REPLI sur
 *     l'allowlist du réglage global (zéro régression) ;
 *   - `systemPromptExtra` = obligations + paragraphes de skills + brief de l'agent
 *     (+ chaîne de délégations autorisée en texte), concaténés ; `""` si rien.
 *
 * Le branchement (App → PtyTerminal → usePty → façade `pty_runner_open`) ajoute
 * `systemPromptExtra` APRÈS l'obligation coordinateur L19 (côté Rust) — jamais à sa place.
 * L'enforcement DUR de la chaîne de délégations reste HORS lot : il vit dans le hook
 * `~/.claude/delegation-guard.mjs` (L5, hors dépôt). Ici on ne fait que l'EXPOSER en texte.
 */
import {
  resolveAgentRules,
  resolveAgentSkills,
  type AgentInstance,
  type Frame,
  type Rule,
} from "./model";

/** Résultat de la dérivation du Cadre pour un coordinateur. */
export interface FrameEnforcement {
  /**
   * Allowlist `--allowedTools` (noms joints par virgule) dérivée du Cadre, ou `null`
   * quand le Cadre ne définit aucun outil → l'appelant retombe sur le réglage global.
   */
  allowedTools: string | null;
  /**
   * Texte ajouté au `--append-system-prompt` APRÈS l'obligation L19 (jamais à sa place).
   * `""` = rien à ajouter (seule l'obligation L19 s'applique).
   */
  systemPromptExtra: string;
}

/** Nom normalisé d'un outil/règle (charge structurée prioritaire, sinon libellé). */
function toolNameOf(rule: Rule): string {
  return (rule.value ?? rule.label).trim();
}

/** Trouve l'agent d'un cadre par NOM (insensible à la casse) — le coordinateur de la team. */
export function findAgentByName(
  frame: Frame,
  name: string,
): AgentInstance | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return frame.agents.find((a) => a.name.trim().toLowerCase() === target);
}

/**
 * Dérive l'allowlist `--allowedTools` d'un agent : ensemble des règles `tool` +
 * `autorisation` (charge/valeur = nom d'outil), MOINS les règles `interdit` (par nom
 * exact). Ordre stable, dédupliqué. `null` si l'agent n'expose aucun outil (Cadre muet
 * sur les outils) → l'appelant retombe sur l'allowlist globale.
 */
export function deriveAllowedTools(frame: Frame, agentId: string): string | null {
  const rules = resolveAgentRules(frame, agentId);

  const allowed: string[] = [];
  const seen = new Set<string>();
  const add = (name: string): void => {
    if (name && !seen.has(name)) {
      seen.add(name);
      allowed.push(name);
    }
  };
  const drop = (name: string): void => {
    const i = allowed.indexOf(name);
    if (i >= 0) {
      allowed.splice(i, 1);
      seen.delete(name);
    }
  };

  for (const r of rules) {
    if (r.type === "tool" || r.type === "autorisation") add(toolNameOf(r));
  }
  for (const r of rules) {
    if (r.type === "interdit") drop(toolNameOf(r));
  }

  return allowed.length > 0 ? allowed.join(",") : null;
}

/**
 * Dérive le texte à injecter au system-prompt d'un agent (après L19) : obligations, puis
 * paragraphes de skills (texte LLM versionné), puis brief de l'agent, puis — en bonus —
 * la chaîne de délégations autorisée (« Tu peux déléguer à : … »). Uniquement des données
 * RÉELLES du Cadre (aucune donnée fabriquée) ; `""` si le Cadre n'apporte rien.
 */
export function deriveSystemPromptExtra(frame: Frame, agentId: string): string {
  const parts: string[] = [];
  const rules = resolveAgentRules(frame, agentId);

  // 1. Obligations (règles typées `obligation`).
  for (const r of rules) {
    if (r.type === "obligation") {
      const text = r.label.trim() || (r.value ?? "").trim();
      if (text) parts.push(text);
    }
  }

  // 2. Paragraphes de skills (rédigés par le LLM en P2 — `Skill.description`).
  for (const s of resolveAgentSkills(frame, agentId)) {
    const d = s.description?.trim();
    if (d) parts.push(d);
  }

  // 3. Brief de l'agent (rédigé par le LLM en P2 — `Agent.brief`).
  const agent = frame.agents.find((a) => a.id === agentId);
  const brief = agent?.brief?.trim();
  if (brief) parts.push(brief);

  // 4. Chaîne de délégations autorisée (texte — l'enforcement DUR reste au hook L5).
  const targets = frame.delegations
    .filter((e) => e.from === agentId)
    .map((e) => frame.agents.find((a) => a.id === e.to)?.name?.trim())
    .filter((n): n is string => !!n);
  if (targets.length > 0) {
    parts.push(`Tu peux déléguer à : ${targets.join(", ")}.`);
  }

  return parts.join("\n\n");
}

/**
 * Dérive l'enforcement complet (allowlist + system-prompt) pour le COORDINATEUR d'une
 * team, désigné par son nom (résolu par `useTeams.coordinatorOf`). Si aucun agent du
 * Cadre ne porte ce nom → enforcement neutre (`allowedTools:null`, `systemPromptExtra:""`)
 * = repli global côté appelant (zéro régression pour les teams sans Cadre applicable).
 */
export function deriveEnforcement(
  frame: Frame,
  coordinatorName: string,
): FrameEnforcement {
  const agent = findAgentByName(frame, coordinatorName);
  if (!agent) return { allowedTools: null, systemPromptExtra: "" };
  return {
    allowedTools: deriveAllowedTools(frame, agent.id),
    systemPromptExtra: deriveSystemPromptExtra(frame, agent.id),
  };
}
