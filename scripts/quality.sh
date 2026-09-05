#!/usr/bin/env bash
#
# quality.sh — chaine qualite complete L0 (D8).
# Enchaine : typecheck TS + ESLint + vitest (front), puis fmt-check + clippy
# (-D warnings) + cargo test (back). S'arrete au premier echec.
# Puis, HORS GATE et sans pouvoir les bloquer : la face en ligne du cliquet de vitrine (L42) et la
# face 2 de la garde de publication (dette de canal).
#
# Usage : bash scripts/quality.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/8] TypeScript typecheck (tsc --noEmit)"
npm run typecheck

echo "==> [2/8] ESLint"
npm run lint

echo "==> [3/8] vitest (front)"
npm run test

echo "==> [4/8] cargo fmt --check"
( cd src-tauri && cargo fmt --check )

echo "==> [5/8] cargo clippy -D warnings"
( cd src-tauri && cargo clippy --all-targets -- -D warnings )

echo "==> [6/8] cargo test (back)"
( cd src-tauri && cargo test )

# --- HORS GATE, et c'est dit -------------------------------------------------------------------
# L42 — FACE EN LIGNE du cliquet de vitrine. Elle est jouee ICI pour etre VUE, pas pour bloquer :
# sa mesure depend du reseau (API GitHub, en anonyme), et faire dependre le gate d'un reseau
# rendrait la qualite du depot faillible sur une machine hors ligne. Sa rougeur INFORME — vitrine
# qui ment, ou dette de publication — et l'instruction L42 dit expressement qu'elle ne bloque aucun
# lot. Ce qui bloque, c'est la face LOCALE, jouee a l'etape [3/8] par vitest.
#
# ON N'AVALE RIEN : le code de sortie est capture et RESTITUE en clair. 0 = concorde, 1 = ecart,
# 3 = NON MESURE (reseau indisponible OU quota anonyme epuise) — et 3 n'est jamais presente comme
# un succes. La CAUSE exacte du 3 est celle qu'imprime le script lui-meme ; ce runner ne la devine
# pas et ne la reecrit pas.
echo "==> [7/8] vitrine en ligne (HORS GATE — informe, ne bloque pas)"
set +e
node scripts/vitrine-en-ligne.mjs
VITRINE=$?
set -e
case "$VITRINE" in
  0) echo "    vitrine en ligne : la page publique dit vrai." ;;
  # Le code 3 couvre DEUX causes — reseau indisponible ET quota anonyme epuise. Nommer la premiere
  # ici affirmait une cause que ce script ne mesure pas, alors que la raison exacte est imprimee
  # juste au-dessus par vitrine-en-ligne.mjs. On rappelle donc le statut, pas un diagnostic.
  3) echo "    vitrine en ligne : NON MESUREE — raison exacte ci-dessus. Ce n'est PAS un succes ; a rejouer." ;;
  *) echo "    vitrine en ligne : ECART(S) ci-dessus (code $VITRINE). A traiter, sans bloquer ce gate." ;;
esac

# Dette de canal (§ 4.2) — FACE 2 de la garde de publication. Elle mesure ce que CHAQUE endpoint
# d'update sert reellement, en reseau, contre le tag local : ce qui bloque, c'est la face LOCALE
# (la jonction resultats->ecran, jouee dans `npm run test`, scripts/lib/publish-push.mjs). AR-6 = a :
# ce geste n'est JAMAIS appele par `publish-update.mjs` (zero dependance, cache CDN, une panne
# reseau ne doit pas devenir un echec de publication) ; il est joue ICI pour etre VU, pas pour
# bloquer. Memes trois codes que la vitrine : 0 concorde, 1 ecart(s) nomme(s), 3 NON MESURE.
echo "==> [8/8] canaux d'ecriture en ligne (HORS GATE — informe, ne bloque pas)"
set +e
node scripts/verifier-canaux-en-ligne.mjs
CANAUX=$?
set -e
case "$CANAUX" in
  0) echo "    canaux en ligne : chaque endpoint INTERROGE sert la version publiee." ;;
  3) echo "    canaux en ligne : NON MESURE — raison exacte ci-dessus. Ce n'est PAS un succes ; a rejouer." ;;
  *) echo "    canaux en ligne : ECART(S) ci-dessus (code $CANAUX). A traiter, sans bloquer ce gate." ;;
esac

echo "==> Qualite : OK"
