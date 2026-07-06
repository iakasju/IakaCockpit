/**
 * CadreView — vue « Cadre » (L22-P1). Éditeur des 6 couches du cadre iakaframe :
 * Règles · Skills · Templates · Team · Règles projet · Délégations. Présentationnel
 * au sens D8 : toute la logique/persistance vit dans `useFrame` (passé en prop).
 *
 * P1 = édition structurée directe (formulaires/toggles), SANS LLM. La conversation-
 * authoring (P2) et l'enforcement runner (P3) sont hors de ce lot. UI fonctionnelle ;
 * la fidélité pixel au mock « Le Cadre » est un passage design ultérieur (Loki).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseFrame } from "../hooks/useFrame";
import { RULE_TYPES, type RuleType } from "../frame/model";

type Layer = "rules" | "skills" | "templates" | "team" | "project" | "delegations";
const LAYERS: readonly Layer[] = [
  "rules",
  "skills",
  "templates",
  "team",
  "project",
  "delegations",
];

interface CadreViewProps {
  frame: UseFrame;
  teams: { id: string; name: string }[];
}

/** Pastille de type de règle (couleur = type). */
function TypeDot({ type }: { type: RuleType }): JSX.Element {
  return <span className={`cdot t-${type}`} aria-hidden />;
}

export function CadreView({ frame, teams }: CadreViewProps): JSX.Element {
  const { t } = useTranslation();
  const [layer, setLayer] = useState<Layer>("rules");
  const f = frame.frame;

  const counts: Record<Layer, number> = {
    rules: f.rules.length,
    skills: f.skills.length,
    templates: f.templates.length,
    team: f.agents.length,
    project: f.projectRuleIds.length,
    delegations: f.delegations.length,
  };

  return (
    <section className="view cadre" aria-label={t("cadre.ariaLabel")}>
      <header className="cadrehead">
        <div>
          <h1>{t("cadre.title")}</h1>
          <div className="sub">{t("cadre.subtitle")}</div>
        </div>
        <label className="scopesel">
          <span>{t("cadre.scope")}</span>
          <select
            value={frame.teamId}
            onChange={(e) => frame.setTeamId(e.target.value)}
            aria-label={t("cadre.scope")}
          >
            {teams.length === 0 && <option value={frame.teamId}>{frame.teamId || "—"}</option>}
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="cadretabs" role="tablist" aria-label={t("cadre.layersAria")}>
        {LAYERS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={layer === l}
            className={`cadretab${layer === l ? " on" : ""}`}
            onClick={() => setLayer(l)}
          >
            {t(`cadre.layer.${l}`)}
            <span className="n">{counts[l]}</span>
          </button>
        ))}
      </nav>

      {frame.problems.length > 0 && (
        <div className="cadrewarn" role="status">
          {t("cadre.problems", { count: frame.problems.length })} — {frame.problems[0]}
        </div>
      )}

      <div className="cadrebody">
        {layer === "rules" && <RulesLayer frame={frame} />}
        {layer === "skills" && <SkillsLayer frame={frame} />}
        {layer === "templates" && <TemplatesLayer frame={frame} />}
        {layer === "team" && <TeamLayer frame={frame} />}
        {layer === "project" && (
          <ProjectLayer frame={frame} />
        )}
        {layer === "delegations" && <DelegationsLayer frame={frame} />}
      </div>
    </section>
  );
}

// --- Règles ---
function RulesLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const [type, setType] = useState<RuleType>("interdit");
  const [label, setLabel] = useState("");
  const add = (): void => {
    if (label.trim().length === 0) return;
    frame.addRule(type, label.trim());
    setLabel("");
  };
  return (
    <div className="cadrelayer">
      <form
        className="cadreadd"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <select value={type} onChange={(e) => setType(e.target.value as RuleType)} aria-label={t("cadre.ruleType")}>
          {RULE_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(`cadre.type.${rt}`)}
            </option>
          ))}
        </select>
        <input
          value={label}
          placeholder={t("cadre.rulePlaceholder")}
          onChange={(e) => setLabel(e.target.value)}
          aria-label={t("cadre.ruleLabel")}
        />
        <button type="submit" className="btn accent sm" disabled={label.trim().length === 0}>
          {t("cadre.add")}
        </button>
      </form>
      <ul className="cadrelist">
        {frame.frame.rules.map((r) => (
          <li key={r.id} className="cadrerow">
            <TypeDot type={r.type} />
            <span className="ctype">{t(`cadre.type.${r.type}`)}</span>
            <span className="clabel">{r.label}</span>
            <button type="button" className="crm" title={t("cadre.remove")} onClick={() => frame.removeRule(r.id)}>
              ×
            </button>
          </li>
        ))}
        {frame.frame.rules.length === 0 && <li className="cadreempty">{t("cadre.empty")}</li>}
      </ul>
    </div>
  );
}

// --- Skills (paquets de règles) ---
function SkillsLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const add = (): void => {
    if (name.trim().length === 0) return;
    setOpenId(frame.addSkill(name.trim()));
    setName("");
  };
  return (
    <div className="cadrelayer">
      <form className="cadreadd" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} placeholder={t("cadre.skillPlaceholder")} onChange={(e) => setName(e.target.value)} aria-label={t("cadre.skillName")} />
        <button type="submit" className="btn accent sm" disabled={name.trim().length === 0}>{t("cadre.add")}</button>
      </form>
      <ul className="cadrelist">
        {frame.frame.skills.map((s) => (
          <li key={s.id} className="cadrecard">
            <div className="cadrerow">
              <button type="button" className="cexp" onClick={() => setOpenId(openId === s.id ? null : s.id)} aria-expanded={openId === s.id}>
                {openId === s.id ? "▾" : "▸"}
              </button>
              <span className="clabel strong">{s.name}</span>
              <span className="cmeta">{t("cadre.nRules", { count: s.ruleIds.length })}</span>
              <button type="button" className="crm" title={t("cadre.remove")} onClick={() => frame.removeSkill(s.id)}>×</button>
            </div>
            {openId === s.id && (
              <div className="cadrepick">
                <div className="picklbl">{t("cadre.pickRules")}</div>
                <div className="chips">
                  {frame.frame.rules.map((r) => {
                    const on = s.ruleIds.includes(r.id);
                    return (
                      <button key={r.id} type="button" className={`pickchip${on ? " on" : ""}`} onClick={() => frame.toggleSkillRule(s.id, r.id)}>
                        <TypeDot type={r.type} />{r.label}
                      </button>
                    );
                  })}
                  {frame.frame.rules.length === 0 && <span className="cadreempty">{t("cadre.noRulesYet")}</span>}
                </div>
              </div>
            )}
          </li>
        ))}
        {frame.frame.skills.length === 0 && <li className="cadreempty">{t("cadre.empty")}</li>}
      </ul>
    </div>
  );
}

// --- Templates (assemblage skills + règles) ---
function TemplatesLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const add = (): void => {
    if (name.trim().length === 0) return;
    setOpenId(frame.addTemplate(name.trim()));
    setName("");
  };
  return (
    <div className="cadrelayer">
      <form className="cadreadd" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} placeholder={t("cadre.templatePlaceholder")} onChange={(e) => setName(e.target.value)} aria-label={t("cadre.templateName")} />
        <button type="submit" className="btn accent sm" disabled={name.trim().length === 0}>{t("cadre.add")}</button>
      </form>
      <ul className="cadrelist">
        {frame.frame.templates.map((tpl) => (
          <li key={tpl.id} className="cadrecard">
            <div className="cadrerow">
              <button type="button" className="cexp" onClick={() => setOpenId(openId === tpl.id ? null : tpl.id)} aria-expanded={openId === tpl.id}>
                {openId === tpl.id ? "▾" : "▸"}
              </button>
              <span className="clabel strong">{tpl.name}</span>
              <span className="cmeta">{t("cadre.nSkillsRules", { skills: tpl.skillIds.length, rules: tpl.ruleIds.length })}</span>
              <button type="button" className="crm" title={t("cadre.remove")} onClick={() => frame.removeTemplate(tpl.id)}>×</button>
            </div>
            {openId === tpl.id && (
              <div className="cadrepick">
                <div className="picklbl">{t("cadre.pickSkills")}</div>
                <div className="chips">
                  {frame.frame.skills.map((s) => (
                    <button key={s.id} type="button" className={`pickchip${tpl.skillIds.includes(s.id) ? " on" : ""}`} onClick={() => frame.toggleTemplateSkill(tpl.id, s.id)}>◆ {s.name}</button>
                  ))}
                  {frame.frame.skills.length === 0 && <span className="cadreempty">{t("cadre.noSkillsYet")}</span>}
                </div>
                <div className="picklbl">{t("cadre.pickRules")}</div>
                <div className="chips">
                  {frame.frame.rules.map((r) => (
                    <button key={r.id} type="button" className={`pickchip${tpl.ruleIds.includes(r.id) ? " on" : ""}`} onClick={() => frame.toggleTemplateRule(tpl.id, r.id)}>
                      <TypeDot type={r.type} />{r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
        {frame.frame.templates.length === 0 && <li className="cadreempty">{t("cadre.empty")}</li>}
      </ul>
    </div>
  );
}

// --- Team (agents nommés = template + extras) ---
function TeamLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [tplId, setTplId] = useState("");
  const templates = frame.frame.templates;
  const add = (): void => {
    const tid = tplId || templates[0]?.id;
    if (name.trim().length === 0 || !tid) return;
    frame.addAgent(name.trim(), tid);
    setName("");
  };
  return (
    <div className="cadrelayer">
      <form className="cadreadd" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} placeholder={t("cadre.agentPlaceholder")} onChange={(e) => setName(e.target.value)} aria-label={t("cadre.agentName")} />
        <select value={tplId} onChange={(e) => setTplId(e.target.value)} aria-label={t("cadre.templateName")}>
          <option value="">{t("cadre.chooseTemplate")}</option>
          {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
        </select>
        <button type="submit" className="btn accent sm" disabled={name.trim().length === 0 || templates.length === 0}>{t("cadre.add")}</button>
      </form>
      {templates.length === 0 && <div className="cadrewarn">{t("cadre.needTemplate")}</div>}
      <ul className="cadrelist">
        {frame.frame.agents.map((a) => {
          const tpl = templates.find((tp) => tp.id === a.templateId);
          return (
            <li key={a.id} className="cadrerow">
              <span className="clabel strong">{a.name}</span>
              <span className="tmplpill">⚙ {tpl?.name ?? t("cadre.unknownTemplate")}</span>
              <span className="cmeta">{t("cadre.nExtras", { count: a.extraSkillIds.length + a.extraRuleIds.length })}</span>
              <button type="button" className="crm" title={t("cadre.remove")} onClick={() => frame.removeAgent(a.id)}>×</button>
            </li>
          );
        })}
        {frame.frame.agents.length === 0 && <li className="cadreempty">{t("cadre.empty")}</li>}
      </ul>
    </div>
  );
}

// --- Règles projet ---
function ProjectLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="cadrelayer">
      <div className="picklbl">{t("cadre.projectHint")}</div>
      <div className="chips">
        {frame.frame.rules.map((r) => (
          <button key={r.id} type="button" className={`pickchip${frame.frame.projectRuleIds.includes(r.id) ? " on" : ""}`} onClick={() => frame.toggleProjectRule(r.id)}>
            <TypeDot type={r.type} />{r.label}
          </button>
        ))}
        {frame.frame.rules.length === 0 && <span className="cadreempty">{t("cadre.noRulesYet")}</span>}
      </div>
    </div>
  );
}

// --- Délégations (graphe team) ---
function DelegationsLayer({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const agents = frame.frame.agents;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const nameOf = (id: string): string => agents.find((a) => a.id === id)?.name ?? id;
  const add = (): void => {
    if (from && to) frame.addDelegation(from, to);
  };
  return (
    <div className="cadrelayer">
      {agents.length < 2 ? (
        <div className="cadrewarn">{t("cadre.needAgents")}</div>
      ) : (
        <form className="cadreadd" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("cadre.delegFrom")}>
            <option value="">{t("cadre.delegFrom")}</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <span className="delegarrow">→</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("cadre.delegTo")}>
            <option value="">{t("cadre.delegTo")}</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button type="submit" className="btn accent sm" disabled={!from || !to || from === to}>{t("cadre.add")}</button>
        </form>
      )}
      <ul className="cadrelist">
        {frame.frame.delegations.map((e) => (
          <li key={`${e.from}->${e.to}`} className="cadrerow">
            <span className="clabel">{nameOf(e.from)} <span className="delegarrow">→</span> {nameOf(e.to)}</span>
            <button type="button" className="crm" title={t("cadre.remove")} onClick={() => frame.removeDelegation(e.from, e.to)}>×</button>
          </li>
        ))}
        {frame.frame.delegations.length === 0 && agents.length >= 2 && <li className="cadreempty">{t("cadre.empty")}</li>}
      </ul>
    </div>
  );
}
