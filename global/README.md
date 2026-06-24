# kit-claude/global — artefacts de déploiement niveau-utilisateur

Sources **versionnées** des fichiers qui vivent au runtime dans `~/.claude/`
(`C:\Users\sjupi\.claude\`).

Copier dans `~/.claude/` :
- `CLAUDE.md` → `~/.claude/CLAUDE.md` (instructions globales de la méthode).
- `hooks/identity-guard.ps1` → `~/.claude/identity-guard.ps1`.
- `hooks/identity-remind.ps1` → `~/.claude/identity-remind.ps1`.

À **distinguer** du `kit-claude/CLAUDE.md` (template **par projet**, à copier à la racine
d'un nouveau repo).

Sens de déploiement : **`kit-claude/global/` (source versionnée) → `~/.claude/` (runtime)**.
On édite la source ici, puis on déploie vers le global ; on n'édite jamais la copie runtime
à la main.
