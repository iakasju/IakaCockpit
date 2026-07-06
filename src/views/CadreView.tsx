/**
 * CadreView — vue « Le Cadre » (L22-P1), refonte ergonomique (mock Loki 2026-07-06).
 *
 * Une SEULE surface lue de haut en bas = l'ordre de composition (Règle → Skill →
 * Template → Agent), avec une « chaîne » (spine) en tête, des connecteurs inter-bandes,
 * la décomposition VISIBLE dans chaque carte (skills dépliables, héritage résumé), des
 * définitions + exemples à l'écran et une légende des 6 types. Présentationnel (D8) :
 * toute la logique/persistance vit dans `useFrame`. Style scopé dans `theme/cadre.css`.
 *
 * P1 = édition directe (SANS LLM) ; le dock « définir en conversant » est un réservé
 * désactivé (P2). Le modèle et la persistance (frame.json) sont intacts.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseFrame } from "../hooks/useFrame";
import { RULE_TYPES, type Rule, type RuleType } from "../frame/model";

interface CadreViewProps {
  frame: UseFrame;
  teams: { id: string; name: string }[];
}

/** Style de pastille colorée par type de règle (custom-props `--t-*`, cf. cadre.css). */
function dot(type: RuleType): React.CSSProperties {
  return { background: `var(--t-${type})` };
}

/** Connecteur narratif entre deux bandes. */
function Between({ label }: { label: string }): JSX.Element {
  return (
    <div className="between">
      <span className="ln" />
      <span className="tx">{label}</span>
      <span className="dn">▼</span>
      <span className="ln" />
    </div>
  );
}

export function CadreView({ frame, teams }: CadreViewProps): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;

  return (
    <section className="cadre" aria-label={t("cadre.ariaLabel")}>
      <div className="wrap">
        <div className="eyebrow">{t("cadre.eyebrow")}</div>
        <div className="head">
          <div>
            <h1>{t("cadre.title")}</h1>
            <p className="lede">{t("cadre.lede")}</p>
          </div>
          <div className="scope">
            <span className="lb">{t("cadre.scope")}</span>
            <select
              value={frame.teamId}
              onChange={(e) => frame.setTeamId(e.target.value)}
              aria-label={t("cadre.scope")}
            >
              {teams.length === 0 && (
                <option value={frame.teamId}>{frame.teamId || "—"}</option>
              )}
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* La chaîne : modèle + point de départ + flux, d'un coup d'œil */}
        <section className="spine" aria-label={t("cadre.ariaLabel")}>
          <p className="recipe">{t("cadre.recipe")}</p>
          <div className="flow">
            <a className="stage" href="#band-rules">
              <span className="num">1</span>
              <span className="snm">{t("cadre.layer.rules")}</span>
              <span className="sdef">{t("cadre.flowRulesDef")}</span>
              <span className="scount">
                {f.rules.length} {t("cadre.unitRules")}
              </span>
            </a>
            <div className="conn">
              <span className="arw">→</span>
              <span className="cl">{t("cadre.connGroup")}</span>
            </div>
            <a className="stage" href="#band-skills">
              <span className="num">2</span>
              <span className="snm">{t("cadre.layer.skills")}</span>
              <span className="sdef">{t("cadre.flowSkillsDef")}</span>
              <span className="scount">
                {f.skills.length} {t("cadre.unitSkills")}
              </span>
            </a>
            <div className="conn">
              <span className="arw">→</span>
              <span className="cl">{t("cadre.connAssemble")}</span>
            </div>
            <a className="stage" href="#band-templates">
              <span className="num">3</span>
              <span className="snm">{t("cadre.layer.templates")}</span>
              <span className="sdef">{t("cadre.flowTemplatesDef")}</span>
              <span className="scount">
                {f.templates.length} {t("cadre.unitTemplates")}
              </span>
            </a>
            <div className="conn">
              <span className="arw">→</span>
              <span className="cl">{t("cadre.connInstantiate")}</span>
            </div>
            <a className="stage" href="#band-agents">
              <span className="num">4</span>
              <span className="snm">{t("cadre.layer.team")}</span>
              <span className="sdef">{t("cadre.flowAgentsDef")}</span>
              <span className="scount">
                {f.agents.length} {t("cadre.unitAgents")}
              </span>
            </a>
          </div>
          <div className="apart">
            <span className="albl">{t("cadre.apart")}</span>
            <a className="apchip" href="#band-project">
              <b>{t("cadre.apartProject")}</b>{" "}
              <span className="n">
                {t("cadre.apartProjectN", { count: f.projectRuleIds.length })}
              </span>
            </a>
            <a className="apchip" href="#band-deleg">
              <b>{t("cadre.apartDeleg")}</b>{" "}
              <span className="n">
                {t("cadre.apartDelegN", { count: f.delegations.length })}
              </span>
            </a>
          </div>
        </section>

        {frame.problems.length > 0 && (
          <div className="cadrewarn" role="status">
            {t("cadre.problems", { count: frame.problems.length })} — {frame.problems[0]}
          </div>
        )}

        <RulesBand frame={frame} />
        <Between label={t("cadre.betweenGroup")} />
        <SkillsBand frame={frame} />
        <Between label={t("cadre.betweenAssemble")} />
        <TemplatesBand frame={frame} />
        <Between label={t("cadre.betweenInstantiate")} />
        <AgentsBand frame={frame} />

        <div className="apartgrid">
          <ProjectBand frame={frame} />
          <DelegBand frame={frame} />
        </div>

        {/* Dock réservé à la conversation-authoring (P2) — présent mais inactif */}
        <div className="dock" aria-label={t("cadre.dockTitle")}>
          <div className="di" aria-hidden>
            ◎
          </div>
          <div className="dt">
            <b>{t("cadre.dockTitle")}</b>
            <p>{t("cadre.dockDesc")}</p>
          </div>
          <input placeholder={t("cadre.dockPlaceholder")} disabled aria-label={t("cadre.dockTitle")} />
          <span className="soon">{t("cadre.dockSoon")}</span>
        </div>
      </div>
    </section>
  );
}

/** Chip « règle » (pastille + libellé + × retrait optionnel). */
function RuleChip({ rule, onRemove }: { rule: Rule; onRemove?: () => void }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="mc">
      <i style={dot(rule.type)} />
      {rule.label}
      {onRemove && (
        <button className="x" title={t("cadre.remove")} onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  );
}

// ---------------- 1 · Règles ----------------
function RulesBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [type, setType] = useState<RuleType>("interdit");
  const [label, setLabel] = useState("");
  const add = (): void => {
    if (!label.trim()) return;
    frame.addRule(type, label.trim());
    setLabel("");
  };
  const grouped = RULE_TYPES.map((rt) => ({
    type: rt,
    rules: f.rules.filter((r) => r.type === rt),
  })).filter((g) => g.rules.length > 0);

  return (
    <section className="band" id="band-rules">
      <div className="bhead">
        <div className="bnum">1</div>
        <div className="bt">
          <h2>
            {t("cadre.layer.rules")} <span className="eq">{t("cadre.rulesEq")}</span>
          </h2>
          <div className="ex">{t("cadre.rulesEx")}</div>
        </div>
        <div className="bcount">{t("cadre.nRules", { count: f.rules.length })}</div>
      </div>

      <div className="legend" aria-label={t("cadre.ruleType")}>
        {RULE_TYPES.map((rt) => (
          <span className="lg" key={rt}>
            <i style={dot(rt)} />
            {t(`cadre.type.${rt}`)} <small>{t(`cadre.typeGlose.${rt}`)}</small>
          </span>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="plus">{t("cadre.addRule")}</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RuleType)}
          aria-label={t("cadre.ruleType")}
        >
          {RULE_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(`cadre.type.${rt}`)}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("cadre.rulePlaceholder")}
          aria-label={t("cadre.ruleLabel")}
        />
        <button className="btn" type="submit" disabled={!label.trim()}>
          {t("cadre.add")}
        </button>
      </form>

      {grouped.map((g) => (
        <div className="rulegroup" key={g.type}>
          <div className="rgh">
            <i style={dot(g.type)} />
            <span className="t">{t(`cadre.type.${g.type}`)}</span>
            <span className="c">{g.rules.length}</span>
          </div>
          <div className="rules">
            {g.rules.map((r) => (
              <span className="rule" key={r.id}>
                <i style={dot(r.type)} />
                {r.label}
                <button
                  className="x"
                  title={t("cadre.remove")}
                  onClick={() => frame.removeRule(r.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
      {f.rules.length === 0 && <div className="ghint">{t("cadre.empty")}</div>}
    </section>
  );
}

// ---------------- 2 · Skills ----------------
function SkillsBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [name, setName] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const ruleById = new Map(f.rules.map((r) => [r.id, r]));
  const add = (): void => {
    if (!name.trim()) return;
    setPick(frame.addSkill(name.trim()));
    setName("");
  };

  return (
    <section className="band" id="band-skills">
      <div className="bhead">
        <div className="bnum">2</div>
        <div className="bt">
          <h2>
            {t("cadre.layer.skills")} <span className="eq">{t("cadre.skillsEq")}</span>
          </h2>
          <div className="ex">{t("cadre.skillsEx")}</div>
        </div>
        <div className="bcount">{f.skills.length}</div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="plus">{t("cadre.newSkill")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("cadre.skillPlaceholder")}
        />
        <button className="btn" type="submit" disabled={!name.trim()}>
          {t("cadre.create")}
        </button>
      </form>

      <div className="cardgrid">
        {f.skills.map((s) => {
          const avail = f.rules.filter((r) => !s.ruleIds.includes(r.id));
          return (
            <div className="card" key={s.id}>
              <div className="ch">
                <span className="badge skill">S</span>
                <span className="cn">{s.name}</span>
                <span className="cm">{t("cadre.nRules", { count: s.ruleIds.length })}</span>
                <button className="x" title={t("cadre.remove")} onClick={() => frame.removeSkill(s.id)}>
                  ×
                </button>
              </div>
              <div className="cont">{t("cadre.containsRules")}</div>
              <div className="minichips">
                {s.ruleIds
                  .map((id) => ruleById.get(id))
                  .filter((r): r is Rule => !!r)
                  .map((r) => (
                    <RuleChip key={r.id} rule={r} onRemove={() => frame.toggleSkillRule(s.id, r.id)} />
                  ))}
                <button
                  className="mc add"
                  onClick={() => setPick(pick === s.id ? null : s.id)}
                >
                  {t("cadre.addRuleChip")}
                </button>
              </div>
              {pick === s.id && (
                <div className="minichips" style={{ marginTop: 8 }}>
                  {avail.map((r) => (
                    <button className="mc" key={r.id} onClick={() => frame.toggleSkillRule(s.id, r.id)}>
                      <i style={dot(r.type)} />
                      {r.label}
                    </button>
                  ))}
                  {avail.length === 0 && <span className="ghint">{t("cadre.empty")}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------- 3 · Templates ----------------
function TemplatesBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [name, setName] = useState("");
  const [pick, setPick] = useState<string | null>(null); // `${id}:skills` | `${id}:rules`
  const ruleById = new Map(f.rules.map((r) => [r.id, r]));
  const skillById = new Map(f.skills.map((s) => [s.id, s]));
  const add = (): void => {
    if (!name.trim()) return;
    frame.addTemplate(name.trim());
    setName("");
  };

  return (
    <section className="band" id="band-templates">
      <div className="bhead">
        <div className="bnum">3</div>
        <div className="bt">
          <h2>
            {t("cadre.layer.templates")}{" "}
            <span className="eq">{t("cadre.templatesEq")}</span>
          </h2>
          <div className="ex">{t("cadre.templatesEx")}</div>
        </div>
        <div className="bcount">{f.templates.length}</div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="plus">{t("cadre.newTemplate")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("cadre.templatePlaceholder")}
        />
        <button className="btn" type="submit" disabled={!name.trim()}>
          {t("cadre.create")}
        </button>
      </form>

      <div className="cardgrid">
        {f.templates.map((tpl) => {
          const availSkills = f.skills.filter((s) => !tpl.skillIds.includes(s.id));
          const availRules = f.rules.filter((r) => !tpl.ruleIds.includes(r.id));
          return (
            <div className="card" key={tpl.id}>
              <div className="ch">
                <span className="badge tpl">T</span>
                <span className="cn">{tpl.name}</span>
                <span className="cm">
                  {t("cadre.nSkillsRules", {
                    skills: tpl.skillIds.length,
                    rules: tpl.ruleIds.length,
                  })}
                </span>
                <button className="x" title={t("cadre.remove")} onClick={() => frame.removeTemplate(tpl.id)}>
                  ×
                </button>
              </div>

              <div className="cont">{t("cadre.skillsAssembled")}</div>
              {tpl.skillIds
                .map((id) => skillById.get(id))
                .filter((s): s is NonNullable<typeof s> => !!s)
                .map((s) => (
                  <details className="skillrow" key={s.id}>
                    <summary>
                      <span className="tri">▶</span>
                      <span className="badge">S</span>
                      <span className="sk">{s.name}</span>
                      <span className="cm">{t("cadre.nRules", { count: s.ruleIds.length })}</span>
                      <button
                        className="x"
                        title={t("cadre.remove")}
                        onClick={(e) => {
                          e.preventDefault();
                          frame.toggleTemplateSkill(tpl.id, s.id);
                        }}
                      >
                        ×
                      </button>
                    </summary>
                    <div className="inner">
                      {s.ruleIds
                        .map((id) => ruleById.get(id))
                        .filter((r): r is Rule => !!r)
                        .map((r) => (
                          <RuleChip key={r.id} rule={r} />
                        ))}
                    </div>
                  </details>
                ))}

              <div className="cont" style={{ marginTop: 10 }}>
                {t("cadre.rulesAdded")}
              </div>
              <div className="minichips">
                {tpl.ruleIds
                  .map((id) => ruleById.get(id))
                  .filter((r): r is Rule => !!r)
                  .map((r) => (
                    <RuleChip key={r.id} rule={r} onRemove={() => frame.toggleTemplateRule(tpl.id, r.id)} />
                  ))}
                <button
                  className="mc add"
                  onClick={() => setPick(pick === `${tpl.id}:add` ? null : `${tpl.id}:add`)}
                >
                  {t("cadre.addSkillRule")}
                </button>
              </div>

              {pick === `${tpl.id}:add` && (
                <div className="minichips" style={{ marginTop: 8 }}>
                  {availSkills.map((s) => (
                    <button className="mc" key={s.id} onClick={() => frame.toggleTemplateSkill(tpl.id, s.id)}>
                      ◆ {s.name}
                    </button>
                  ))}
                  {availRules.map((r) => (
                    <button className="mc" key={r.id} onClick={() => frame.toggleTemplateRule(tpl.id, r.id)}>
                      <i style={dot(r.type)} />
                      {r.label}
                    </button>
                  ))}
                  {availSkills.length === 0 && availRules.length === 0 && (
                    <span className="ghint">{t("cadre.empty")}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------- 4 · Agents ----------------
function AgentsBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [name, setName] = useState("");
  const [tplId, setTplId] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const ruleById = new Map(f.rules.map((r) => [r.id, r]));
  const templateById = new Map(f.templates.map((tp) => [tp.id, tp]));
  const add = (): void => {
    const tid = tplId || f.templates[0]?.id;
    if (!name.trim() || !tid) return;
    frame.addAgent(name.trim(), tid);
    setName("");
  };

  return (
    <section className="band" id="band-agents">
      <div className="bhead">
        <div className="bnum">4</div>
        <div className="bt">
          <h2>
            {t("cadre.layer.team")} <span className="eq">{t("cadre.agentsEq")}</span>
          </h2>
          <div className="ex">{t("cadre.agentsEx")}</div>
        </div>
        <div className="bcount">{f.agents.length}</div>
      </div>

      {f.templates.length === 0 ? (
        <div className="cadrewarn">{t("cadre.needTemplate")}</div>
      ) : (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <span className="plus">{t("cadre.nameAgent")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("cadre.agentPlaceholder")}
          />
          <select value={tplId} onChange={(e) => setTplId(e.target.value)} aria-label={t("cadre.baseTemplate")}>
            <option value="">{t("cadre.chooseTemplate")}</option>
            {f.templates.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.name}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={!name.trim()}>
            {t("cadre.addToTeam")}
          </button>
        </form>
      )}

      <div className="cardgrid">
        {f.agents.map((a) => {
          const tpl = templateById.get(a.templateId);
          const availSkills = f.skills.filter((s) => !a.extraSkillIds.includes(s.id));
          const availRules = f.rules.filter((r) => !a.extraRuleIds.includes(r.id));
          return (
            <div className="card" key={a.id}>
              <div className="ch">
                <span className="badge agent">A</span>
                <span className="cn">{a.name}</span>
                <span className="cm">{tpl?.name ?? t("cadre.unknownTemplate")}</span>
                <button className="x" title={t("cadre.remove")} onClick={() => frame.removeAgent(a.id)}>
                  ×
                </button>
              </div>
              <div className="inherit">
                <span className="via">{t("cadre.basedOn")}</span>
                <span className="frm">{tpl?.name ?? t("cadre.unknownTemplate")}</span>
                <span className="via">
                  {t("cadre.inherits", {
                    skills: tpl?.skillIds.length ?? 0,
                    rules: tpl?.ruleIds.length ?? 0,
                  })}
                </span>
              </div>
              <div className="cont">{t("cadre.extrasOf", { name: a.name })}</div>
              <div className="minichips">
                {a.extraSkillIds
                  .map((id) => f.skills.find((s) => s.id === id))
                  .filter((s): s is NonNullable<typeof s> => !!s)
                  .map((s) => (
                    <button className="mc" key={s.id} onClick={() => frame.toggleAgentSkill(a.id, s.id)} title={t("cadre.remove")}>
                      ◆ {s.name}
                    </button>
                  ))}
                {a.extraRuleIds
                  .map((id) => ruleById.get(id))
                  .filter((r): r is Rule => !!r)
                  .map((r) => (
                    <RuleChip key={r.id} rule={r} onRemove={() => frame.toggleAgentRule(a.id, r.id)} />
                  ))}
                <button className="mc add" onClick={() => setPick(pick === a.id ? null : a.id)}>
                  {t("cadre.addSkillRule")}
                </button>
              </div>
              {pick === a.id && (
                <div className="minichips" style={{ marginTop: 8 }}>
                  {availSkills.map((s) => (
                    <button className="mc" key={s.id} onClick={() => frame.toggleAgentSkill(a.id, s.id)}>
                      ◆ {s.name}
                    </button>
                  ))}
                  {availRules.map((r) => (
                    <button className="mc" key={r.id} onClick={() => frame.toggleAgentRule(a.id, r.id)}>
                      <i style={dot(r.type)} />
                      {r.label}
                    </button>
                  ))}
                  {availSkills.length === 0 && availRules.length === 0 && (
                    <span className="ghint">{t("cadre.empty")}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------- À part : règles projet ----------------
function ProjectBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [pick, setPick] = useState(false);
  const ruleById = new Map(f.rules.map((r) => [r.id, r]));
  const avail = f.rules.filter((r) => !f.projectRuleIds.includes(r.id));
  return (
    <section className="band apartband" id="band-project">
      <div className="bhead">
        <div className="bnum side">·</div>
        <div className="bt">
          <h2 style={{ fontSize: 18 }}>
            {t("cadre.apartProject")} <span className="eq">{t("cadre.projectEq")}</span>
          </h2>
          <div className="ex">{t("cadre.projectEx")}</div>
        </div>
      </div>
      <div className="minichips">
        {f.projectRuleIds
          .map((id) => ruleById.get(id))
          .filter((r): r is Rule => !!r)
          .map((r) => (
            <RuleChip key={r.id} rule={r} onRemove={() => frame.toggleProjectRule(r.id)} />
          ))}
        <button className="mc add" onClick={() => setPick((v) => !v)}>
          {t("cadre.addProjectRule")}
        </button>
      </div>
      {pick && (
        <div className="minichips" style={{ marginTop: 8 }}>
          {avail.map((r) => (
            <button className="mc" key={r.id} onClick={() => frame.toggleProjectRule(r.id)}>
              <i style={dot(r.type)} />
              {r.label}
            </button>
          ))}
          {avail.length === 0 && <span className="ghint">{t("cadre.empty")}</span>}
        </div>
      )}
      <p className="ghint">{t("cadre.projectHint")}</p>
    </section>
  );
}

// ---------------- À part : chaîne de délégation ----------------
function DelegBand({ frame }: { frame: UseFrame }): JSX.Element {
  const { t } = useTranslation();
  const f = frame.frame;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const nameOf = (id: string): string => f.agents.find((a) => a.id === id)?.name ?? id;
  const initial = (id: string): string => (nameOf(id)[0] ?? "?").toUpperCase();

  return (
    <section className="band apartband" id="band-deleg">
      <div className="bhead">
        <div className="bnum side">·</div>
        <div className="bt">
          <h2 style={{ fontSize: 18 }}>
            {t("cadre.apartDeleg")} <span className="eq">{t("cadre.delegEq")}</span>
          </h2>
          <div className="ex">{t("cadre.delegEx")}</div>
        </div>
      </div>

      {f.agents.length < 2 ? (
        <div className="cadrewarn">{t("cadre.needAgents")}</div>
      ) : (
        <>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) frame.addDelegation(from, to);
            }}
          >
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("cadre.delegFrom")}>
              <option value="">{t("cadre.delegFrom")}</option>
              {f.agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="plus" aria-hidden>
              →
            </span>
            <select value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("cadre.delegTo")}>
              <option value="">{t("cadre.delegTo")}</option>
              {f.agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={!from || !to || from === to}>
              {t("cadre.addDeleg")}
            </button>
          </form>

          <div className="minichips">
            {f.agents.map((a) => (
              <span className="gnode" key={a.id} style={{ padding: "6px 10px" }}>
                <span className="av">{initial(a.id)}</span>
                <span className="gn">{a.name}</span>
              </span>
            ))}
          </div>

          <div className="minichips" style={{ marginTop: 10 }}>
            {f.delegations.map((e) => (
              <span className="mc" key={`${e.from}->${e.to}`}>
                {nameOf(e.from)} → {nameOf(e.to)}
                <button className="x" title={t("cadre.remove")} onClick={() => frame.removeDelegation(e.from, e.to)}>
                  ×
                </button>
              </span>
            ))}
            {f.delegations.length === 0 && <span className="ghint">{t("cadre.empty")}</span>}
          </div>
        </>
      )}
    </section>
  );
}
