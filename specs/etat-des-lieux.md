# Etat des lieux - IakaCockpit

> Regenere manuellement (pwsh indisponible sur macOS) le 2026-06-25 (motif: pause / checkpoint L1).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (candidate staging : v0.1.0-rc) |
| Branche | main |
| Dernier commit | 41d2bba docs(roadmap): jalons + onglets qualite (debat) en L2, tracage delegations en L4 |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 72 |
| Remote | AUCUN — Forgejo LAN indisponible plusieurs jours (box offline) ; push differe |
| Note | L0 + L1 implementes, gate Legolas PASS sur les deux ; commits 100% locaux |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `41d2bba` | 2026-06-25 | docs(roadmap): jalons projet + onglets qualite (debat) en L2, tracage delegations en L4 |
| `ed74c8b` | 2026-06-25 | feat(L1): facade backend.ts typee (10 commandes) + tests vitest |
| `a6ebddb` | 2026-06-25 | feat(L1): PTY de-Windows-ise (shell L0 + cwd valide) + cablage lib.rs |
| `5d1b230` | 2026-06-25 | feat(L1): salvage check_services (MVP, degrade proprement hors box) |
| `ed75902` | 2026-06-25 | feat(L1): commandes config sur le module L0 (fin de "C:\work") |
| `dcdc317` | 2026-06-25 | feat(L1): salvage git + portfolio (scan cross-OS) branche sur paths L0 |
| `2f48181` | 2026-06-25 | docs(L1): instruction salvage backend Rust iakaIDE (cadrage Gandalf) |
| `b5081a6` | 2026-06-25 | docs(L0): checkpoint gate Legolas PASS — etat des lieux + backlog |

## Reprise du travail

- **Ce qui vient d'etre fait** :
  - **L0** (socle securite cross-OS) implemente + **gate Legolas PASS** (27 tests).
  - **L1** (salvage backend Rust iakaIDE) implemente par Gimli en 5 commits atomiques + **gate Legolas PASS** : 10 commandes Tauri salvagees (scan_portfolio, check_services, 5x config, 4x PTY), de-Windows-isees sur le socle L0 (`paths::resolve_hat_root`, `shell::default_shell`), cwd PTY valide anti-traversal, DB `iakacockpit.sqlite` schema unique L0, facade `invoke` unique `src/api/backend.ts`. Chaine qualite verte : 44/44 tests Rust, 21/21 front, clippy `-D warnings` a zero, couverture front 89,65%.
  - **Roadmap** enrichie : vue « liste des jalons » + onglets qualite (DEBAT OUVERT) en L2 ; tracage machine des delegations en L4.
- **En cours / a reprendre** : rien d'ouvert cote dev. Decisions produit en attente : trancher « onglets qualite » (avec Loki) avant de cadrer L2.
- **Prochaine etape concrete** : cadrer **L2** (vues Portfolio / Working / Reglages + grille/dock/onglets, maquette v7) via Gandalf — apres arbitrage onglets qualite.
- **Pieges connus** :
  1. **Forgejo LAN indisponible plusieurs jours** (box offline) -> aucun remote, **push differe** ; tout est en commits locaux (filet intact), a pousser au retour de la box (`http://192.168.2.11:3001/sjupin/IakaCockpit.git`).
  2. **pwsh absent** sur macOS -> scripts `iakaframe-*.ps1` (snapshot/update) non executables ; etat des lieux regenere a la main.
  3. **Bundle `.dmg` non generable** en environnement headless (imagerie disque pilotee par Finder/AppleScript -> permission Automatisation macOS requise) ; le `.app` et le binaire release se construisent bien. A valider sur poste reel seulement si le DMG est requis pour le staging.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
| 2026-06-25 | pause | v0.1.0-rc | main | gate L0 PASS (Legolas) + cadrage L1 ecrit |
| 2026-06-25 | pause | v0.1.0-rc | main | L1 implemente + gate L1 PASS (Legolas) ; roadmap enrichie |
