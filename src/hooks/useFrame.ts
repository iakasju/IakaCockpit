/**
 * useFrame — AUTORITÉ du « Cadre » d'une team (L22-P1). Calque `useTeams` : un hook par
 * préoccupation (D6/D7), aucun `invoke` direct (façade `frameLoad/frameSave`, D7).
 *
 * Charge le `frame.json` de la team courante (parse défensif), expose le CRUD des 4
 * niveaux + règles projet + graphe de délégations, et **persiste** après chaque mutation
 * (écriture atomique côté Rust). Hors contexte natif, l'état vit en mémoire (dev/tests).
 * `problems` = intégrité référentielle (validateFrame), pour l'UI.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { backend, type Backend } from "../api/backend";
import {
  emptyFrame,
  parseFrame,
  validateFrame,
  type AgentInstance,
  type AgentTemplate,
  type Frame,
  type Rule,
  type RuleScope,
  type RuleType,
} from "../frame/model";

let seq = 0;
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${seq}`;
}

/** Retire toutes les occurrences d'`id` d'un tableau (immuable). */
function without(ids: string[], id: string): string[] {
  return ids.filter((x) => x !== id);
}
/** Ajoute `id` s'il est absent, le retire s'il est présent (toggle immuable). */
function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? without(ids, id) : [...ids, id];
}

export interface UseFrame {
  teamId: string;
  setTeamId: (id: string) => void;
  frame: Frame;
  loading: boolean;
  error: string | null;
  problems: string[];

  addRule: (type: RuleType, label: string, value?: string, scope?: RuleScope) => string;
  updateRule: (id: string, patch: Partial<Omit<Rule, "id">>) => void;
  removeRule: (id: string) => void;

  addSkill: (name: string) => string;
  renameSkill: (id: string, name: string) => void;
  removeSkill: (id: string) => void;
  toggleSkillRule: (skillId: string, ruleId: string) => void;

  addTemplate: (name: string, roleKey?: string) => string;
  updateTemplate: (id: string, patch: Partial<Omit<AgentTemplate, "id">>) => void;
  removeTemplate: (id: string) => void;
  toggleTemplateSkill: (templateId: string, skillId: string) => void;
  toggleTemplateRule: (templateId: string, ruleId: string) => void;

  addAgent: (name: string, templateId: string) => string;
  updateAgent: (id: string, patch: Partial<Omit<AgentInstance, "id">>) => void;
  removeAgent: (id: string) => void;
  toggleAgentSkill: (agentId: string, skillId: string) => void;
  toggleAgentRule: (agentId: string, ruleId: string) => void;

  toggleProjectRule: (ruleId: string) => void;
  addDelegation: (from: string, to: string) => void;
  removeDelegation: (from: string, to: string) => void;
}

export function useFrame(
  initialTeamId = "",
  api: Backend = backend,
  /**
   * Semence optionnelle (démo dev) : si le `frame.json` de la team est ABSENT et que
   * ce callback renvoie un cadre, il est posé PUIS persisté (non destructif — jamais
   * si un fichier existe déjà). App le garde derrière le flag démo.
   */
  seedFrame?: (teamId: string) => Frame | null,
): UseFrame {
  const [teamId, setTeamId] = useState(initialTeamId);
  const [frame, setFrame] = useState<Frame>(() => emptyFrame(initialTeamId));
  // Démarre à `true` : le cadre est toujours chargé au montage/au changement de team.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Évite d'écraser le fichier avec le cadre vide initial avant le 1er chargement.
  const loadedRef = useRef(false);
  // Ref pour appeler la semence À JOUR sans relancer le chargement à chaque render.
  const seedRef = useRef(seedFrame);
  seedRef.current = seedFrame;

  // (Re)charge le cadre à chaque changement de team.
  useEffect(() => {
    let alive = true;
    loadedRef.current = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const raw = api.isTauri() ? await api.frameLoad(teamId) : null;
        if (!alive) return;
        // Rust renvoie une CHAÎNE JSON brute (agnostique du schéma) → parser ici,
        // puis reconstruire défensivement. JSON invalide → cadre vide (jamais de crash).
        let parsed: unknown = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }
        if (parsed) {
          setFrame(parseFrame(parsed, teamId));
        } else {
          // Absent → semence démo si fournie (puis persistée), sinon cadre vide.
          const seed = seedRef.current?.(teamId) ?? null;
          if (seed) {
            setFrame(seed);
            if (api.isTauri()) {
              api
                .frameSave(seed.teamId, JSON.stringify(seed, null, 2))
                .catch((e) => setError(String(e)));
            }
          } else {
            setFrame(emptyFrame(teamId));
          }
        }
      } catch (e) {
        if (!alive) return;
        setError(String(e));
        setFrame(emptyFrame(teamId));
      } finally {
        if (alive) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId, api]);

  /**
   * Applique une transformation immuable au cadre courant puis **persiste**
   * (fire-and-forget, borné, non bloquant ; jamais avant le 1er chargement).
   */
  const mutate = useCallback(
    (fn: (f: Frame) => Frame): void => {
      setFrame((cur) => {
        const next = fn(cur);
        if (api.isTauri() && loadedRef.current) {
          api.frameSave(next.teamId, JSON.stringify(next, null, 2)).catch((e) => setError(String(e)));
        }
        return next;
      });
    },
    [api],
  );

  // --- Règles ---
  const addRule = useCallback(
    (type: RuleType, label: string, value?: string, scope?: RuleScope): string => {
      const id = newId("r");
      const rule: Rule = { id, type, label };
      if (value) rule.value = value;
      if (scope) rule.scope = scope;
      mutate((f) => ({
        ...f,
        rules: [...f.rules, rule],
        projectRuleIds: scope === "projet" ? [...f.projectRuleIds, id] : f.projectRuleIds,
      }));
      return id;
    },
    [mutate],
  );
  const updateRule = useCallback(
    (id: string, patch: Partial<Omit<Rule, "id">>): void =>
      mutate((f) => ({
        ...f,
        rules: f.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    [mutate],
  );
  const removeRule = useCallback(
    (id: string): void =>
      mutate((f) => ({
        ...f,
        rules: f.rules.filter((r) => r.id !== id),
        skills: f.skills.map((s) => ({ ...s, ruleIds: without(s.ruleIds, id) })),
        templates: f.templates.map((t) => ({ ...t, ruleIds: without(t.ruleIds, id) })),
        agents: f.agents.map((a) => ({ ...a, extraRuleIds: without(a.extraRuleIds, id) })),
        projectRuleIds: without(f.projectRuleIds, id),
      })),
    [mutate],
  );

  // --- Skills ---
  const addSkill = useCallback(
    (name: string): string => {
      const id = newId("s");
      mutate((f) => ({ ...f, skills: [...f.skills, { id, name, ruleIds: [] }] }));
      return id;
    },
    [mutate],
  );
  const renameSkill = useCallback(
    (id: string, name: string): void =>
      mutate((f) => ({ ...f, skills: f.skills.map((s) => (s.id === id ? { ...s, name } : s)) })),
    [mutate],
  );
  const removeSkill = useCallback(
    (id: string): void =>
      mutate((f) => ({
        ...f,
        skills: f.skills.filter((s) => s.id !== id),
        templates: f.templates.map((t) => ({ ...t, skillIds: without(t.skillIds, id) })),
        agents: f.agents.map((a) => ({ ...a, extraSkillIds: without(a.extraSkillIds, id) })),
      })),
    [mutate],
  );
  const toggleSkillRule = useCallback(
    (skillId: string, ruleId: string): void =>
      mutate((f) => ({
        ...f,
        skills: f.skills.map((s) =>
          s.id === skillId ? { ...s, ruleIds: toggle(s.ruleIds, ruleId) } : s,
        ),
      })),
    [mutate],
  );

  // --- Templates ---
  const addTemplate = useCallback(
    (name: string, roleKey?: string): string => {
      const id = newId("t");
      const tpl: AgentTemplate = { id, name, skillIds: [], ruleIds: [] };
      if (roleKey) tpl.roleKey = roleKey;
      mutate((f) => ({ ...f, templates: [...f.templates, tpl] }));
      return id;
    },
    [mutate],
  );
  const updateTemplate = useCallback(
    (id: string, patch: Partial<Omit<AgentTemplate, "id">>): void =>
      mutate((f) => ({
        ...f,
        templates: f.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    [mutate],
  );
  const removeTemplate = useCallback(
    (id: string): void =>
      mutate((f) => ({ ...f, templates: f.templates.filter((t) => t.id !== id) })),
    [mutate],
  );
  const toggleTemplateSkill = useCallback(
    (templateId: string, skillId: string): void =>
      mutate((f) => ({
        ...f,
        templates: f.templates.map((t) =>
          t.id === templateId ? { ...t, skillIds: toggle(t.skillIds, skillId) } : t,
        ),
      })),
    [mutate],
  );
  const toggleTemplateRule = useCallback(
    (templateId: string, ruleId: string): void =>
      mutate((f) => ({
        ...f,
        templates: f.templates.map((t) =>
          t.id === templateId ? { ...t, ruleIds: toggle(t.ruleIds, ruleId) } : t,
        ),
      })),
    [mutate],
  );

  // --- Agents ---
  const addAgent = useCallback(
    (name: string, templateId: string): string => {
      const id = newId("a");
      mutate((f) => ({
        ...f,
        agents: [...f.agents, { id, name, templateId, extraSkillIds: [], extraRuleIds: [] }],
      }));
      return id;
    },
    [mutate],
  );
  const updateAgent = useCallback(
    (id: string, patch: Partial<Omit<AgentInstance, "id">>): void =>
      mutate((f) => ({
        ...f,
        agents: f.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    [mutate],
  );
  const removeAgent = useCallback(
    (id: string): void =>
      mutate((f) => ({
        ...f,
        agents: f.agents.filter((a) => a.id !== id),
        delegations: f.delegations.filter((e) => e.from !== id && e.to !== id),
      })),
    [mutate],
  );
  const toggleAgentSkill = useCallback(
    (agentId: string, skillId: string): void =>
      mutate((f) => ({
        ...f,
        agents: f.agents.map((a) =>
          a.id === agentId ? { ...a, extraSkillIds: toggle(a.extraSkillIds, skillId) } : a,
        ),
      })),
    [mutate],
  );
  const toggleAgentRule = useCallback(
    (agentId: string, ruleId: string): void =>
      mutate((f) => ({
        ...f,
        agents: f.agents.map((a) =>
          a.id === agentId ? { ...a, extraRuleIds: toggle(a.extraRuleIds, ruleId) } : a,
        ),
      })),
    [mutate],
  );

  // --- Règles projet & délégations ---
  const toggleProjectRule = useCallback(
    (ruleId: string): void =>
      mutate((f) => ({ ...f, projectRuleIds: toggle(f.projectRuleIds, ruleId) })),
    [mutate],
  );
  const addDelegation = useCallback(
    (from: string, to: string): void =>
      mutate((f) =>
        from === to || f.delegations.some((e) => e.from === from && e.to === to)
          ? f
          : { ...f, delegations: [...f.delegations, { from, to }] },
      ),
    [mutate],
  );
  const removeDelegation = useCallback(
    (from: string, to: string): void =>
      mutate((f) => ({
        ...f,
        delegations: f.delegations.filter((e) => !(e.from === from && e.to === to)),
      })),
    [mutate],
  );

  return {
    teamId,
    setTeamId,
    frame,
    loading,
    error,
    problems: validateFrame(frame),
    addRule,
    updateRule,
    removeRule,
    addSkill,
    renameSkill,
    removeSkill,
    toggleSkillRule,
    addTemplate,
    updateTemplate,
    removeTemplate,
    toggleTemplateSkill,
    toggleTemplateRule,
    addAgent,
    updateAgent,
    removeAgent,
    toggleAgentSkill,
    toggleAgentRule,
    toggleProjectRule,
    addDelegation,
    removeDelegation,
  };
}
