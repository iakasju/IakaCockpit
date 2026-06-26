# Spike P0 — L10 (flux structuré `stream-json` de Claude Code)

> Spike de dé-risquage du **point dur n°2** de `specs/instructions/L10-conversation-session.md`.
> Exécuté le 2026-06-26 par 🔨 Gimli sur `claude` v2.1.193 (macOS). **Conservé comme preuve.**

## Verdict — posture **B FERMABLE** (actée par Stéphane)

Le flux structuré `claude --print --input-format stream-json --output-format stream-json --verbose`
tient les promesses : NDJSON stable (1 ligne = 1 objet), dérivation **parole/geste/fin-de-tour par
`type`** (zéro parsing d'écran ANSI), multi-tours sur un stdin long-vécu, **interrupt** (`{"type":"interrupt"}`)
fonctionnel (abort `exit 137`). → Pas de repli posture A.

## Finding majeur (raffine P1)

**stdin NE DOIT PAS être un TTY.** Dans un vrai PTY, `claude` refuse le mode NDJSON
(`Error: Input must be provided…`). Le chef-runner doit donc tourner en **pipes** (stdin/stdout),
xterm devenant **surface de rendu** du flux. → `terminal.rs` (PTY shell) reste pour le shell legacy ;
le chef-runner exige une **nouvelle couture pipes** (`runner.rs`). À intégrer dans L10 avant P1.

## Fichiers

- `pipe_interrupt.py` — spike concluant (pipes + 2 tours + interrupt).
- `pty_interrupt.py` — démontre le refus TTY-stdin (contre-preuve).
- `turns.ndjson` — entrée 2 tours.
- `out.ndjson`, `out2.ndjson`, `err.log`, `err2.log` — captures brutes.

Types NDJSON observés : `system`(`init`/`status`/…), `assistant`(`thinking`/`text`/`tool_use`),
`user`(`tool_result`), `result`(`success`), `stream_event` (si `--include-partial-messages`),
`rate_limit_event`.
