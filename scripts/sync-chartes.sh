#!/usr/bin/env bash
# sync-chartes.sh — embarque les CHARTES (tokens) du reservoir iakagraph dans l'app.
#
# Lit ~/work/iakagraph/theme/<famille>/<variante>/tokens.css (10 chartes, MEME
# contrat de variables : seules les valeurs changent) et genere DEUX fichiers
# COMMITES, servis en 'self' (bundle Vite) -> CSP intacte, zero inline runtime,
# 100% offline :
#   - src/assets/chartes/chartes.css : un bloc html[data-theme="<id>"]{...} par
#     charte NON-naonedge. PONT explicite : le contrat iakagraph (--bg-primary/
#     --bg-card/--accent-gold...) est traduit vers le contrat de l'app (--bg/--surf/
#     --accent...) consomme par theme/app.css. Variables de meme nom (--accent-rgb,
#     --on-accent, --red.. --purple, --font-*, --mono) passent a l'identique.
#     Les chartes naonedge-dark/light restent HAND-WRITTEN dans theme/tokens.css
#     (defaut byte-stable, polices systeme) : on ne les regenere PAS ici, mais
#     elles figurent au manifest (catalogue complet a 10).
#   - src/assets/chartes/manifest.ts : { id, name, swatches[bg,card,accent] } par
#     charte (source unique du selecteur de charte dans Reglages).
#
# Idempotent : regenere proprement les deux fichiers a chaque run. Les fichiers
# sont COMMITES : un dev sans iakagraph n'a pas besoin de relancer ; ce script
# sert aux mises a jour (nouvelle charte / nouvelle valeur).
#
# Usage :
#   scripts/sync-chartes.sh
#   IAKAGRAPH_ROOT=~/work/iakagraph scripts/sync-chartes.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IAKAGRAPH_ROOT="${IAKAGRAPH_ROOT:-$HOME/work/iakagraph}"
THEME_ROOT="${IAKAGRAPH_ROOT}/theme"

DEST="${HERE}/src/assets/chartes"
CSS_OUT="${DEST}/chartes.css"
MANIFEST="${DEST}/manifest.ts"

[ -d "$THEME_ROOT" ] || { echo "ERREUR: introuvable $THEME_ROOT (IAKAGRAPH_ROOT?)"; exit 1; }

# Chartes embarquees : "famille/variante|id-app|Nom lisible". L'id-app garde la
# compatibilite ascendante (naonedge-dark / naonedge-light inchanges).
CHARTES=(
  "naonedge/dark|naonedge-dark|NaonEdge dark"
  "naonedge/light|naonedge-light|NaonEdge light"
  "grimoire/dark-fantasy|grimoire-dark-fantasy|Grimoire dark-fantasy"
  "os/windows|os-windows|OS Windows"
  "os/ubuntu|os-ubuntu|OS Ubuntu"
  "os/android|os-android|OS Android"
  "os/macos|os-macos|OS macOS"
  "cartoon/std|cartoon-std|Cartoon std"
  "photoreal/modern|photoreal-modern|Photoreal modern"
  "studio/clair|studio-clair|Studio clair"
)

# Pont iakagraph -> app : "<var-app>|<var-iakagraph>". L'ORDRE = ordre d'emission.
BRIDGE=(
  "--bg|bg-primary"
  "--surf|bg-card"
  "--surf-2|line"
  "--surf-3|bg-deep"
  "--field|bg-deep"
  "--text|text-primary"
  "--text-2|text-secondary"
  "--text-3|text-muted"
  "--accent|accent-gold"
  "--accent-2|accent-gold-light"
  "--accent-rgb|accent-rgb"
  "--on-accent|on-accent"
  "--red|red"
  "--green|green"
  "--blue|blue"
  "--orange|orange"
  "--cyan|cyan"
  "--purple|purple"
  "--r|radius-md"
  "--r-lg|radius-lg"
  "--font-sans|font-sans"
  "--font-serif|font-serif"
  "--mono|mono"
)

# extract <file> <iakagraph-var> -> valeur (sans le ; final). Vide si absente.
extract() {
  grep -oE -- "--$2 *:[^;]*" "$1" | head -1 | sed -E "s/^--$2 *: *//"
}

mkdir -p "$DEST"
echo "== sync-chartes : ${#CHARTES[@]} chartes depuis ${THEME_ROOT} =="

# ----- chartes.css -----
{
  echo "/* chartes.css — GENERE par scripts/sync-chartes.sh. NE PAS EDITER A LA MAIN."
  echo "   Un bloc html[data-theme=\"<id>\"] par charte iakagraph, traduit du contrat"
  echo "   iakagraph (--bg-primary...) vers le contrat de l'app (--bg...). Servi en"
  echo "   'self' (bundle Vite) -> CSP intacte, aucun inline-style runtime. */"
  echo ""
} > "$CSS_OUT"

manifest_entries=""

for row in "${CHARTES[@]}"; do
  rel="${row%%|*}"; rest="${row#*|}"
  id="${rest%%|*}"; name="${rest#*|}"
  src="${THEME_ROOT}/${rel}/tokens.css"
  [ -f "$src" ] || { echo "  ! absente (ignoree): ${src}"; continue; }

  # naonedge-* : hand-written dans theme/tokens.css (defaut byte-stable) -> pas de
  # bloc genere ici, mais on l'inscrit quand meme au manifest (catalogue complet).
  case "$id" in
    naonedge-*) skip_css=1 ;;
    *)          skip_css=0 ;;
  esac

  if [ "$skip_css" -eq 0 ]; then
    {
      echo "html[data-theme=\"${id}\"] {"
      for b in "${BRIDGE[@]}"; do
        app_var="${b%%|*}"; iaka_var="${b#*|}"
        val="$(extract "$src" "$iaka_var")"
        [ -n "$val" ] && echo "  ${app_var}: ${val};"
      done
      echo "}"
      echo ""
    } >> "$CSS_OUT"
  fi

  bg="$(extract "$src" bg-primary)"
  card="$(extract "$src" bg-card)"
  accent="$(extract "$src" accent-gold)"
  manifest_entries="${manifest_entries}  { id: \"${id}\", name: \"${name}\", swatches: [\"${bg}\", \"${card}\", \"${accent}\"] },"$'\n'
  if [ "$skip_css" -eq 1 ]; then
    echo "  = ${id} (${name}) — manifest seul (CSS dans tokens.css)"
  else
    echo "  + ${id} (${name})"
  fi
done

# ----- manifest.ts -----
{
  echo "/**"
  echo " * manifest.ts — GENERE par scripts/sync-chartes.sh. NE PAS EDITER A LA MAIN."
  echo " *"
  echo " * Catalogue des chartes embarquees (tokens iakagraph). \`id\` = data-theme"
  echo " * applique sur <html> (useSettings.applyToDom) ; \`swatches\` = apercu"
  echo " * [fond, carte, accent]. Le CSS associe vit dans chartes.css (meme dossier)."
  echo " */"
  echo "export interface CharteInfo {"
  echo "  id: string;"
  echo "  name: string;"
  echo "  /** Apercu : [fond global, carte, accent]. */"
  echo "  swatches: [string, string, string];"
  echo "}"
  echo ""
  echo "export const CHARTES: CharteInfo[] = ["
  printf '%s' "$manifest_entries"
  echo "];"
} > "$MANIFEST"

echo "== chartes.css + manifest.ts generes dans ${DEST} =="
