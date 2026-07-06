/**
 * demoFrame — cadre de DÉMO dev (L22-P1, tranche 5). Un exemple cohérent (calque du
 * mock « Le Cadre » v3) pour que la vue Cadre ne soit pas vide au 1er lancement DEV.
 *
 * Dev-gardé et NON destructif : `useFrame` ne le sème que si le `frame.json` de la team
 * est absent (cf. option `seedFrame`), puis il devient un vrai cadre éditable/persisté
 * (prouve aussi le round-trip). Zéro seed en prod (le flag démo garde l'appel côté App).
 */
import { type Frame } from "../frame/model";

/** Construit le cadre de démo pour `teamId` (ids stables, données plausibles). */
export function makeDemoFrame(teamId: string): Frame {
  return {
    version: 1,
    teamId,
    rules: [
      { id: "r-commit", type: "autorisation", label: "Autoriser git commit", value: "git commit" },
      { id: "r-noforce", type: "interdit", label: "Jamais git push --force", value: "git push --force" },
      { id: "r-atomic", type: "obligation", label: "Commits atomiques & fréquents" },
      { id: "r-edit", type: "tool", label: "Edit", value: "Edit" },
      { id: "r-bash", type: "tool", label: "Bash", value: "Bash" },
      { id: "r-src", type: "autorisation", label: "Modifier src/**", value: "src/**" },
      { id: "r-front", type: "competence", label: "Développement front" },
      { id: "r-instr", type: "obligation", label: "Lire l'instruction avant de coder" },
      { id: "r-tests", type: "competence", label: "Tests & couverture" },
      { id: "r-doc", type: "obligation", label: "Documentation à jour", scope: "projet" },
    ],
    skills: [
      { id: "s-git", name: "Git sûr", ruleIds: ["r-commit", "r-noforce", "r-atomic"] },
      { id: "s-front", name: "Dév front", ruleIds: ["r-edit", "r-bash", "r-src", "r-front"] },
    ],
    templates: [
      { id: "t-coord", name: "Coordinateur", roleKey: "coordination", skillIds: ["s-git"], ruleIds: ["r-instr"] },
      { id: "t-dev", name: "Développeur", roleKey: "fabrication", skillIds: ["s-git", "s-front"], ruleIds: ["r-instr"] },
      { id: "t-qa", name: "Qualité", roleKey: "tests", skillIds: ["s-git"], ruleIds: ["r-tests"] },
    ],
    agents: [
      { id: "a-aragorn", name: "Aragorn", templateId: "t-coord", extraSkillIds: [], extraRuleIds: [] },
      { id: "a-gimli", name: "Gimli", templateId: "t-dev", extraSkillIds: [], extraRuleIds: [] },
      { id: "a-legolas", name: "Legolas", templateId: "t-qa", extraSkillIds: [], extraRuleIds: [] },
    ],
    projectRuleIds: ["r-doc"],
    delegations: [
      { from: "a-aragorn", to: "a-gimli" },
      { from: "a-aragorn", to: "a-legolas" },
    ],
  };
}
