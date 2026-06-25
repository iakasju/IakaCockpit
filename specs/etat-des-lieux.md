# Etat des lieux - IakaCockpit

> Regenere manuellement (pwsh indisponible sur macOS) le 2026-06-25 (motif: pause / checkpoint L0).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (candidate staging : v0.1.0-rc) |
| Branche | main |
| Dernier commit | f57e23d feat(L0): bootstrap cross-OS Tauri/React/TS + socle securite |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 66 |
| Remote | AUCUN (Forgejo LAN non configure sur ce poste) |
| Note | L0 implemente + gate qualite Legolas PASS ; cadrage L1 ecrit |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `f57e23d` | 2026-06-25 | feat(L0): bootstrap cross-OS Tauri/React/TS + socle securite (CSP, keychain, path-guard teste) |
| `90c81bc` | 2026-06-25 | docs(specs): instruction L0 bootstrap + socle securite (cadrage Gandalf) |
| `1a430ae` | 2026-06-25 | docs(maquettes): convergence UX v2-v7 (reference v7) + portraits inline |
| `858fb60` | 2026-06-24 | docs(specs): cadrage IakaCockpit v0.1 — dayone + roadmap + direction design + 4 maquettes UX |
| `a52272d` | 2026-06-24 | docs: etat des lieux initial (iakaframe snapshot) |
| `49e5271` | 2026-06-24 | chore: init iakaframe (structure + methode de travail) |

## Reprise du travail

- **Ce qui vient d'etre fait** : L0 (bootstrap cross-OS + socle securite) implemente et **valide par le gate qualite Legolas — verdict PASS** sur 7 verifications (typecheck, lint, 8/8 tests front, build, cargo fmt, clippy `-D warnings`, **27/27 tests Rust** : pathguard, paths, shell, secrets, config). Cadrage **L1** ecrit par Gandalf dans `specs/instructions/L1-salvage-backend-rust.md`.
- **En cours / a reprendre** : instruction L1 **en attente de validation Odin/Stephane** (3 decisions a arbitrer : perimetre 10 commandes, serialisation snake_case, endpoints `check_services` codes en dur). Une fois validee -> dispatch Gimli.
- **Prochaine etape concrete** : arbitrer le cadrage L1, puis lancer l'implementation (Gimli) du salvage backend Rust iakaIDE (scan git, portfolio, PTY, services, config), branche sur le socle L0.
- **Pieges connus** : (1) **aucun remote git** configure ici -> le push Forgejo (`http://192.168.2.11:3001/sjupin/IakaCockpit.git`) reste a brancher avant tout `update`/push ; (2) **pwsh absent** sur macOS -> les scripts `iakaframe-*.ps1` (snapshot/update) ne tournent pas, etat des lieux regenere a la main ; (3) le code iakaIDE a salvager est sous `/Users/sjupin/work/iakaIDE` (Windows-ise : `C:\\work` en dur, `powershell.exe`) -> a de-Windows-iser via le socle L0.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
| 2026-06-25 | pause | v0.1.0-rc | main | gate L0 PASS (Legolas) + cadrage L1 ecrit |
