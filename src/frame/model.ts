/**
 * frame/model.ts — modèle de données PUR du « Cadre » iakaframe (L22, P1).
 *
 * Ontologie verrouillée avec Stéphane (2026-07-02), 4 niveaux + 2 structures à part :
 *   Règle (typée) → Skill (paquet nommé de règles) → Template (type d'agent :
 *   assemblage skills + règles) → Agent (instance nommée dans une team : template +
 *   skills/règles en plus + nom). À part : règles projet (portée projet) et graphe de
 *   délégations (niveau team).
 *
 * Ce module est SANS I/O ni React : types + validation + résolution + parse défensif,
 * tout testable. La persistance (`frame.json`, AR-1) et l'état (`useFrame`) sont ailleurs.
 * `délégation` N'EST PAS un type de règle (décision) ; la chaîne est un graphe à part.
 */

/** Types de règle (fermé). `délégation` exclu à dessein (= graphe team). */
export type RuleType =
  | "interdit"
  | "autorisation"
  | "obligation"
  | "tool"
  | "geste"
  | "competence";

export const RULE_TYPES: readonly RuleType[] = [
  "interdit",
  "autorisation",
  "obligation",
  "tool",
  "geste",
  "competence",
];

/** Portée d'une règle. `agent` = pose sur un agent/template ; `projet` = règle projet. */
export type RuleScope = "agent" | "projet";

/** Règle : brique atomique typée, réutilisable. */
export interface Rule {
  id: string;
  type: RuleType;
  /** Texte lisible (« Jamais git push --force »). */
  label: string;
  /** Charge structurée optionnelle (ex. `git push --force`, `src/**`, `Edit`). */
  value?: string;
  /** Portée (défaut `agent`). Une règle `projet` alimente les règles projet. */
  scope?: RuleScope;
}

/**
 * Skill : paquet NOMMÉ de règles réutilisable (ex. « Git sûr »). L22-P2 : gagne un
 * **paragraphe rédigé par le LLM** (`description`) + son **historique de versions**
 * (`versions`, plus ancienne → plus récente ; la dernière = `description`). Les règles
 * typées restent (décision « paragraphe EN PLUS des règles »).
 */
export interface Skill {
  id: string;
  name: string;
  ruleIds: string[];
  /** Paragraphe courant rédigé par le LLM (P2). */
  description?: string;
  /** Historique des paragraphes (P2), du plus ancien au plus récent. */
  versions?: string[];
}

/** Template d'agent : assemblage de skills + de règles = un type d'agent. */
export interface AgentTemplate {
  id: string;
  /** Nom du type (« Développeur »). */
  name: string;
  /** Rôle canonique optionnel (clé `roles.ts`). */
  roleKey?: string;
  skillIds: string[];
  /** Règles propres au template (hors skills). */
  ruleIds: string[];
}

/**
 * Agent : instance nommée dans une team = template + skills/règles en plus + nom. L22-P2 :
 * gagne un **brief rédigé par le LLM** (`brief`) qui cadre ses ajouts propres (exporté dans
 * l'`agent.md`).
 */
export interface AgentInstance {
  id: string;
  /** Nom du persona dans la team (« Gimli »). */
  name: string;
  templateId: string;
  extraSkillIds: string[];
  extraRuleIds: string[];
  /** Brief rédigé par le LLM cadrant les ajouts propres à l'agent (P2). */
  brief?: string;
}

/** Arête du graphe de délégations (qui peut déléguer à qui) — ids d'agents. */
export interface DelegationEdge {
  from: string;
  to: string;
}

/** Le Cadre d'une team (document persisté en `frame.json`, AR-1). */
export interface Frame {
  version: 1;
  teamId: string;
  rules: Rule[];
  skills: Skill[];
  templates: AgentTemplate[];
  agents: AgentInstance[];
  /** Règles à portée projet (ids de règles `scope:"projet"`). */
  projectRuleIds: string[];
  /** Chaîne des délégations : graphe au niveau team. */
  delegations: DelegationEdge[];
}

/** Cadre vide (création). */
export function emptyFrame(teamId: string): Frame {
  return {
    version: 1,
    teamId,
    rules: [],
    skills: [],
    templates: [],
    agents: [],
    projectRuleIds: [],
    delegations: [],
  };
}

/**
 * Résout TOUTES les règles effectives d'un agent : règles des skills du template +
 * règles propres du template + règles des skills en plus + règles en plus. Dédupliqué
 * par id, ordre stable (template d'abord, puis extras). Retourne `[]` si agent/template
 * introuvable. PUR — sert P3 (enforcement) et l'aperçu UI.
 */
export function resolveAgentRules(frame: Frame, agentId: string): Rule[] {
  const agent = frame.agents.find((a) => a.id === agentId);
  if (!agent) return [];
  const template = frame.templates.find((t) => t.id === agent.templateId);

  const skillById = new Map(frame.skills.map((s) => [s.id, s]));
  const ruleById = new Map(frame.rules.map((r) => [r.id, r]));

  const ruleIds: string[] = [];
  const pushSkill = (id: string): void => {
    const sk = skillById.get(id);
    if (sk) ruleIds.push(...sk.ruleIds);
  };

  if (template) {
    template.skillIds.forEach(pushSkill);
    ruleIds.push(...template.ruleIds);
  }
  agent.extraSkillIds.forEach(pushSkill);
  ruleIds.push(...agent.extraRuleIds);

  const seen = new Set<string>();
  const out: Rule[] = [];
  for (const id of ruleIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const rule = ruleById.get(id);
    if (rule) out.push(rule);
  }
  return out;
}

/**
 * Résout TOUS les skills effectivement appliqués à un agent : skills du template +
 * skills en plus. Dédupliqué par id, ordre stable (template d'abord, puis extras).
 * Retourne `[]` si agent introuvable. PUR — sert P3 (paragraphes de skills injectés
 * dans le system-prompt du coordinateur) et l'aperçu UI.
 */
export function resolveAgentSkills(frame: Frame, agentId: string): Skill[] {
  const agent = frame.agents.find((a) => a.id === agentId);
  if (!agent) return [];
  const template = frame.templates.find((t) => t.id === agent.templateId);

  const skillById = new Map(frame.skills.map((s) => [s.id, s]));
  const ids: string[] = [];
  if (template) ids.push(...template.skillIds);
  ids.push(...agent.extraSkillIds);

  const seen = new Set<string>();
  const out: Skill[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const sk = skillById.get(id);
    if (sk) out.push(sk);
  }
  return out;
}

// --- Parse défensif (chargement de `frame.json`, AR-1) ---

function str(v: unknown, def = ""): string {
  return typeof v === "string" ? v : def;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function parseRuleType(v: unknown): RuleType {
  return RULE_TYPES.includes(v as RuleType) ? (v as RuleType) : "interdit";
}

/**
 * Reconstruit un `Frame` valide-en-forme depuis un JSON quelconque (fichier édité à la
 * main, version antérieure…). Ne jette JAMAIS : les champs manquants prennent un défaut,
 * les entrées mal typées sont écartées. La cohérence RÉFÉRENTIELLE reste vérifiée à part
 * par `validateFrame`.
 */
export function parseFrame(raw: unknown, fallbackTeamId = ""): Frame {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rules: Rule[] = Array.isArray(r.rules)
    ? (r.rules as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const rule: Rule = { id: str(o.id), type: parseRuleType(o.type), label: str(o.label) };
        if (typeof o.value === "string") rule.value = o.value;
        if (o.scope === "projet" || o.scope === "agent") rule.scope = o.scope;
        return rule;
      }).filter((x) => x.id !== "")
    : [];
  const skills: Skill[] = Array.isArray(r.skills)
    ? (r.skills as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const skill: Skill = { id: str(o.id), name: str(o.name), ruleIds: strArr(o.ruleIds) };
        if (typeof o.description === "string") skill.description = o.description;
        if (Array.isArray(o.versions)) skill.versions = strArr(o.versions);
        return skill;
      }).filter((x) => x.id !== "")
    : [];
  const templates: AgentTemplate[] = Array.isArray(r.templates)
    ? (r.templates as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const tpl: AgentTemplate = {
          id: str(o.id),
          name: str(o.name),
          skillIds: strArr(o.skillIds),
          ruleIds: strArr(o.ruleIds),
        };
        if (typeof o.roleKey === "string") tpl.roleKey = o.roleKey;
        return tpl;
      }).filter((x) => x.id !== "")
    : [];
  const agents: AgentInstance[] = Array.isArray(r.agents)
    ? (r.agents as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const agent: AgentInstance = {
          id: str(o.id),
          name: str(o.name),
          templateId: str(o.templateId),
          extraSkillIds: strArr(o.extraSkillIds),
          extraRuleIds: strArr(o.extraRuleIds),
        };
        if (typeof o.brief === "string") agent.brief = o.brief;
        return agent;
      }).filter((x) => x.id !== "")
    : [];
  const delegations: DelegationEdge[] = Array.isArray(r.delegations)
    ? (r.delegations as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { from: str(o.from), to: str(o.to) };
      }).filter((e) => e.from !== "" && e.to !== "")
    : [];
  return {
    version: 1,
    teamId: str(r.teamId, fallbackTeamId),
    rules,
    skills,
    templates,
    agents,
    projectRuleIds: strArr(r.projectRuleIds),
    delegations,
  };
}

/**
 * Valide l'intégrité référentielle du cadre. Retourne la liste des problèmes (vide =
 * cadre sain). PUR — utilisé par `useFrame`/les tests avant sauvegarde.
 */
export function validateFrame(frame: Frame): string[] {
  const problems: string[] = [];

  const dupes = (kind: string, ids: string[]): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${kind} : id en double « ${id} »`);
      seen.add(id);
    }
  };
  dupes("règle", frame.rules.map((r) => r.id));
  dupes("skill", frame.skills.map((s) => s.id));
  dupes("template", frame.templates.map((t) => t.id));
  dupes("agent", frame.agents.map((a) => a.id));

  const ruleIds = new Set(frame.rules.map((r) => r.id));
  const skillIds = new Set(frame.skills.map((s) => s.id));
  const templateIds = new Set(frame.templates.map((t) => t.id));
  const agentIds = new Set(frame.agents.map((a) => a.id));

  const refRule = (ctx: string, id: string): void => {
    if (!ruleIds.has(id)) problems.push(`${ctx} référence une règle inconnue « ${id} »`);
  };
  const refSkill = (ctx: string, id: string): void => {
    if (!skillIds.has(id)) problems.push(`${ctx} référence un skill inconnu « ${id} »`);
  };

  for (const s of frame.skills) {
    s.ruleIds.forEach((id) => refRule(`skill « ${s.name} »`, id));
  }
  for (const t of frame.templates) {
    t.skillIds.forEach((id) => refSkill(`template « ${t.name} »`, id));
    t.ruleIds.forEach((id) => refRule(`template « ${t.name} »`, id));
  }
  for (const a of frame.agents) {
    if (!templateIds.has(a.templateId)) {
      problems.push(`agent « ${a.name} » référence un template inconnu « ${a.templateId} »`);
    }
    a.extraSkillIds.forEach((id) => refSkill(`agent « ${a.name} »`, id));
    a.extraRuleIds.forEach((id) => refRule(`agent « ${a.name} »`, id));
  }
  frame.projectRuleIds.forEach((id) => refRule("règles projet", id));
  for (const e of frame.delegations) {
    if (!agentIds.has(e.from)) problems.push(`délégation depuis un agent inconnu « ${e.from} »`);
    if (!agentIds.has(e.to)) problems.push(`délégation vers un agent inconnu « ${e.to} »`);
  }

  return problems;
}
