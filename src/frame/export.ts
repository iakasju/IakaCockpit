/**
 * frame/export.ts — génération des fichiers **markdown** du Cadre (L22-P2b).
 *
 * `frame.json` reste la SOURCE ; ici on en dérive des `agent.md` (un par agent), la SORTIE
 * consommée par iakaframe (calque des contrats d'agent de la méthode). PUR (sans I/O) :
 * l'écriture disque est faite côté Rust (`frame_export`). Chaque agent.md rassemble son
 * template, ses skills (avec leur paragraphe rédigé, P2), son brief, ses règles effectives
 * et ses délégations sortantes.
 */
import { resolveAgentRules, type Frame } from "./model";

/** Slug de nom de fichier sûr (miroir léger du slug Rust). */
export function slugName(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "agent";
}

/** Markdown d'UN agent : identité + brief + skills + règles effectives + délégations. */
export function agentMarkdown(frame: Frame, agentId: string): string {
  const agent = frame.agents.find((a) => a.id === agentId);
  if (!agent) return "";
  const template = frame.templates.find((t) => t.id === agent.templateId);
  const skillById = new Map(frame.skills.map((s) => [s.id, s]));

  const skillIds = [
    ...(template?.skillIds ?? []),
    ...agent.extraSkillIds.filter((id) => !(template?.skillIds ?? []).includes(id)),
  ];
  const effective = resolveAgentRules(frame, agentId);
  const delegatesTo = frame.delegations
    .filter((e) => e.from === agentId)
    .map((e) => frame.agents.find((a) => a.id === e.to)?.name ?? e.to);

  const lines: string[] = [];
  lines.push(`# Agent — ${agent.name}`, "");
  lines.push(
    `> Team : \`${frame.teamId}\` · Template : **${template?.name ?? "—"}** · Généré depuis le Cadre iakaframe.`,
    "",
  );

  if (agent.brief && agent.brief.trim()) {
    lines.push("## Brief", "", agent.brief.trim(), "");
  }

  lines.push("## Compétences (skills)", "");
  if (skillIds.length === 0) {
    lines.push("_Aucune._", "");
  } else {
    for (const id of skillIds) {
      const s = skillById.get(id);
      if (!s) continue;
      lines.push(`### ${s.name}`);
      if (s.description && s.description.trim()) {
        lines.push("", s.description.trim());
      }
      const ruleLabels = s.ruleIds
        .map((rid) => frame.rules.find((r) => r.id === rid)?.label)
        .filter((l): l is string => !!l);
      if (ruleLabels.length > 0) {
        lines.push("", `Règles : ${ruleLabels.join(" · ")}`);
      }
      lines.push("");
    }
  }

  lines.push("## Règles effectives", "");
  if (effective.length === 0) {
    lines.push("_Aucune._", "");
  } else {
    for (const r of effective) {
      const val = r.value ? ` (\`${r.value}\`)` : "";
      lines.push(`- **[${r.type}]** ${r.label}${val}`);
    }
    lines.push("");
  }

  if (delegatesTo.length > 0) {
    lines.push("## Délègue à", "");
    for (const name of delegatesTo) lines.push(`- ${name}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Un fichier markdown par agent : `{ name: "<slug>.md", content }`. */
export function frameExportFiles(frame: Frame): { name: string; content: string }[] {
  return frame.agents.map((a) => ({
    name: `${slugName(a.name)}.md`,
    content: agentMarkdown(frame, a.id),
  }));
}
