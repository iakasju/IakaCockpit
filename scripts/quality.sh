#!/usr/bin/env bash
#
# quality.sh — chaine qualite complete L0 (D8).
# Enchaine : typecheck TS + ESLint + vitest (front), puis fmt-check + clippy
# (-D warnings) + cargo test (back). S'arrete au premier echec.
#
# Usage : bash scripts/quality.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/6] TypeScript typecheck (tsc --noEmit)"
npm run typecheck

echo "==> [2/6] ESLint"
npm run lint

echo "==> [3/6] vitest (front)"
npm run test

echo "==> [4/6] cargo fmt --check"
( cd src-tauri && cargo fmt --check )

echo "==> [5/6] cargo clippy -D warnings"
( cd src-tauri && cargo clippy --all-targets -- -D warnings )

echo "==> [6/6] cargo test (back)"
( cd src-tauri && cargo test )

echo "==> Qualite : OK"
