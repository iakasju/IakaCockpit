# Etat des lieux - IakaCockpit

> Regenere manuellement (pwsh indisponible sur macOS) le 2026-06-25 (motif: pause / checkpoint L2).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (candidate staging : v0.2.0-rc apres L2) |
| Branche | main |
| Dernier commit | abf9900 feat(L2): App shell de navigation (3 vues) + montage theme par defaut |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 92 |
| Remote | AUCUN — Forgejo LAN indisponible plusieurs jours (box offline) ; push differe |
| Note | L0 + L1 + L2 implementes, gate Legolas PASS sur les trois ; commits 100% locaux |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `abf9900` | 2026-06-25 | feat(L2): App shell de navigation (3 vues) + montage theme par defaut |
| `a1cca59` | 2026-06-25 | feat(L2): composants + vues Portfolio / Working / Reglages (presentationnels) |
| `ef4f5ca` | 2026-06-25 | feat(L2): feed main courante MOCKE (3 canaux) + filtres (DEP-1) |
| `0e79d2a` | 2026-06-25 | feat(L2): useServices — etat iakabox avec degradation hors box (R-L2-7) |
| `7883b26` | 2026-06-25 | feat(L2): useSettings — preferences UI PERSISTEES + cockpit minimal (PO-2) |
| `64207ce` | 2026-06-25 | feat(L2): hook usePty — cycle de vie des sessions terminal reelles |
| `d3e7598` | 2026-06-25 | feat(L2): hooks portfolio / navigation+onglets / workset (+ tests) |
| `fd08eca` | 2026-06-25 | feat(L2): iakacharte NaonEdge (dark defaut + light) + layout cockpit |
| `a210dc8` | 2026-06-25 | feat(L2): facade PTY event helpers + xterm deps |
| `3165aad` | 2026-06-25 | docs(L2): verrouille PO-1/2/3 |

## Reprise du travail

- **Ce qui vient d'etre fait** :
  - **L0** (socle securite cross-OS) + **L1** (salvage backend Rust, 10 commandes de-Windows-isees) : implementes, **gate Legolas PASS**.
  - **L2** (vues UI) implemente par Gimli en 9 commits + **gate Legolas PASS** : 3 vues (Portfolio grille reelle via scanPortfolio/getRoot ; Working terminal PTY xterm REEL + conversation placeholder ; Reglages PERSISTES via configSet) ; structure grille/dock/onglets facon maquette v7 ; charte NaonEdge dark ; archi D7 tenue (hooks separes usePortfolio/useGridState/useWorkset/usePty/useSettings/useServices ; backend.ts seul point d'invoke ET de listen). Qualite verte : 50/50 tests front, 44/44 Rust (inchange), lint/typecheck/build OK, couverture honnete (hooks ~94%, presentationnel assume a 0%). Deps ajoutees : @xterm/xterm 6 + addon-fit.
  - **Decisions de cadrage gravees** : MCP = composant de dev non trace ; git = source de verite des sorties projet (non re-tracees) ; engagement humain via agent (canal adresse) ; main courante filtrable par event (jalon/delegations/tools) + fiche jalon (roadmap L2).
- **En cours / a reprendre** : rien d'ouvert cote dev. Reserve produit : trancher « onglets qualite » (avec Loki) ; vue « liste des jalons » + fiche jalon dependent d'une commande backend dediee et du tracage L4.
- **Prochaine etape concrete** : **L3** — moteur « prochaine etape » IA via UN provider derriere LiteLLM (abstraction provider, une impl cablee, passerelle LiteLLM, mock dev). Cadrage Gandalf avant code.
- **Pieges connus** :
  1. **Forgejo LAN indisponible plusieurs jours** (box offline) -> aucun remote, **push differe** ; tout en commits locaux, a pousser au retour (`http://192.168.2.11:3001/sjupin/IakaCockpit.git`).
  2. **pwsh absent** sur macOS -> scripts `iakaframe-*.ps1` non executables ; etat des lieux regenere a la main.
  3. **Build .dmg de demo** : non generable en headless (Finder/AppleScript) ; **autorisation Finder accordee par Stephane** pour le faire sur poste reel ; **build de demo reporte a quand L2/UI est mure** (decide : pas de DMG maintenant). Le `.app`/binaire release se construisent sans Finder.
  4. Bundle JS ~498 kB (xterm) : code-splitting eventuel = lot d'optimisation ulterieur, hors L2.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-06-24 20:36 | version | v0.1.0 | main | onboarding initial |
| 2026-06-25 | pause | v0.1.0-rc | main | gate L0 PASS (Legolas) + cadrage L1 ecrit |
| 2026-06-25 | pause | v0.1.0-rc | main | L1 implemente + gate L1 PASS ; roadmap enrichie |
| 2026-06-25 | pause | v0.2.0-rc | main | L2 implemente + gate L2 PASS (Legolas) ; vues UI + terminal PTY reel |
