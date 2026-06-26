#!/usr/bin/env bash
# sync-vignettes.sh — copie le SOUS-ENSEMBLE de vignettes iakagraph utilisees par
# la demo (L9) dans src/assets/vignettes/, puis genere le manifest TypeScript.
#
# N'invente rien : lit teams.json (l'ORDRE = mapping role->personnage, index 0..7)
# et copie <team>/<slug>.png pour les ROLES du DEMO_TEAM (index 0..ROLE_COUNT-1).
# Sert en 'self' (bundle Vite) -> CSP intacte, zero scope FS, 100% offline.
#
# Idempotent : recree proprement le dossier cible + le manifest a chaque run.
# Les PNG sont COMMITES : un dev sans iakagraph n'a pas besoin de relancer ce
# script ; il sert aux mises a jour (nouvelle team / nouvelle charte).
#
# Usage :
#   scripts/sync-vignettes.sh
#   IAKAGRAPH_ROOT=~/work/iakagraph TEAMS="lotr avengers starfleet" scripts/sync-vignettes.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IAKAGRAPH_ROOT="${IAKAGRAPH_ROOT:-$HOME/work/iakagraph}"
TEAMS_JSON="${IAKAGRAPH_ROOT}/teams.json"

# Charte app = naonedge ; variantes embarquees (cles app = "naonedge-<variante>").
CHARTE="${CHARTE:-naonedge}"
VARIANTS="${VARIANTS:-dark light}"
# Teams embarquees (C-1 = 3 teams). Surchargables (ex. les 11) sans toucher le code.
TEAMS="${TEAMS:-lotr avengers starfleet}"
# Nombre de roles embarques (DEMO_TEAM = 5 : index 0..4).
ROLE_COUNT="${ROLE_COUNT:-5}"

DEST="${HERE}/src/assets/vignettes"
MANIFEST="${DEST}/manifest.ts"

command -v jq >/dev/null || { echo "ERREUR: jq requis"; exit 1; }
[ -f "$TEAMS_JSON" ] || { echo "ERREUR: introuvable $TEAMS_JSON (IAKAGRAPH_ROOT?)"; exit 1; }

echo "== sync-vignettes : charte=${CHARTE} variantes=[${VARIANTS}] teams=[${TEAMS}] roles=${ROLE_COUNT} =="

# Reset propre (idempotent) du sous-arbre des PNG copies (garde le .gitkeep eventuel).
for v in $VARIANTS; do
  rm -rf "${DEST:?}/${CHARTE}-${v}"
done

# Recolte des lignes du manifest (charte-app, team, roleIndex, slug, chemin import).
imports=""   # lignes `import vN from "./path";`
entries=""   # corps de l'objet
idx=0

for v in $VARIANTS; do
  charte_app="${CHARTE}-${v}"
  src_dir="${IAKAGRAPH_ROOT}/theme/${CHARTE}/${v}/vignettes"
  team_block=""
  for team in $TEAMS; do
    # Slugs ordonnes (= roles) de la team, tronques a ROLE_COUNT.
    # (bash 3.2 macOS : pas de mapfile -> boucle while sur les lignes.)
    role_block=""
    role=0
    while IFS= read -r slug; do
      src_png="${src_dir}/${team}/${slug}.png"
      if [ ! -f "$src_png" ]; then
        echo "  ! absent (ignore): ${src_png}"
        role=$((role+1))
        continue
      fi
      out_rel="${charte_app}/${team}/${slug}.png"
      out_abs="${DEST}/${out_rel}"
      mkdir -p "$(dirname "$out_abs")"
      cp "$src_png" "$out_abs"
      var="v${idx}"
      imports="${imports}import ${var} from \"./${out_rel}\";"$'\n'
      role_block="${role_block}      ${role}: ${var},"$'\n'
      idx=$((idx+1))
      role=$((role+1))
    done < <(jq -r --arg t "$team" '.[$t][].slug' "$TEAMS_JSON" | head -n "$ROLE_COUNT")
    team_block="${team_block}    \"${team}\": {"$'\n'"${role_block}    },"$'\n'
  done
  entries="${entries}  \"${charte_app}\": {"$'\n'"${team_block}  },"$'\n'
done

# Generation du manifest TypeScript (source de verite unique du resolveur).
{
  echo "/**"
  echo " * manifest.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN."
  echo " *"
  echo " * Mapping (charte-app -> team -> roleIndex 0..N-1 -> URL d'asset Vite servie en 'self')."
  echo " * L'ordre des roleIndex reflete teams.json (0=portefeuille, 1=coordination,"
  echo " * 2=cadrage, 3=dev, 4=qualite...). Source: ${CHARTE} / [${VARIANTS}] / [${TEAMS}]."
  echo " */"
  printf '%s' "$imports"
  echo ""
  echo "export type VignetteManifest = Record<"
  echo "  string,"
  echo "  Record<string, Record<number, string>>"
  echo ">;"
  echo ""
  echo "export const VIGNETTES: VignetteManifest = {"
  printf '%s' "$entries"
  echo "};"
} > "$MANIFEST"

echo "== ${idx} PNG copies, manifest genere : ${MANIFEST} =="
