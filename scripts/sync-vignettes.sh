#!/usr/bin/env bash
# sync-vignettes.sh — copie le CATALOGUE COMPLET de vignettes iakagraph
# (10 chartes x 11 teams x 8 roles + casting iakaframe racine) dans
# src/assets/vignettes/, puis genere le manifest TypeScript (L15).
#
# SOURCE = jeu WebP 256px (vignettes-256-webp) : ~7,6 Mo embarques au lieu des
# ~118 Mo de PNG pleine reso. Structure identique (seule l'extension change .webp).
#
# N'invente rien : lit teams.json (l'ORDRE = mapping role->personnage, index 0..7)
# et copie <team>/<slug>.webp pour TOUS les roles de CHAQUE team. Ajoute en plus la
# pseudo-team "iakaframe" depuis les 8 WebP de roles a la RACINE du dossier source
# (odin/aragorn/gandalf/gimli/legolas/helm/loki/nathalie = casting iakaframe natif).
# Sert en 'self' (bundle Vite) -> CSP intacte, zero scope FS, 100% offline.
#
# Idempotent : recree proprement les sous-arbres cibles + le manifest a chaque run.
# Les WebP sont COMMITES (~952 / ~7,6 Mo) : un dev sans iakagraph n'a pas besoin de
# relancer ce script ; il sert aux mises a jour (nouvelle team / nouvelle charte).
#
# Usage :
#   scripts/sync-vignettes.sh
#   IAKAGRAPH_ROOT=~/work/iakagraph scripts/sync-vignettes.sh
#   CHARTES="naonedge/dark naonedge/light" TEAMS="lotr avengers" scripts/sync-vignettes.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IAKAGRAPH_ROOT="${IAKAGRAPH_ROOT:-$HOME/work/iakagraph}"
TEAMS_JSON="${IAKAGRAPH_ROOT}/teams.json"

# Chartes = paires "famille/variante" (path iakagraph) -> cle app "famille-variante"
# (alignee sur src/assets/chartes/manifest.ts). Surchargable sans toucher le code.
CHARTES="${CHARTES:-naonedge/dark naonedge/light grimoire/dark-fantasy os/windows os/ubuntu os/android os/macos cartoon/std photoreal/modern studio/clair}"

# Teams embarquees : par defaut TOUTES les teams de teams.json (11). Surchargable.
TEAMS="${TEAMS:-$(jq -r 'keys[]' "$TEAMS_JSON" 2>/dev/null | tr '\n' ' ')}"

# Casting iakaframe natif (WebP a la RACINE des vignettes) : ORDRE = les 7 ROLES
# canoniques (src/theme/roles.ts) : 0=portefeuille(odin) 1=coordination(aragorn)
# 2=architecture(gandalf) 3=fabrication(gimli) 4=tests(legolas) 5=graphisme(loki)
# 6=doc(nathalie). Pseudo-team "iakaframe". (helm = squad prod, hors des 7 roles.)
IAKAFRAME_SLUGS="odin aragorn gandalf gimli legolas loki nathalie"

DEST="${HERE}/src/assets/vignettes"
MANIFEST="${DEST}/manifest.ts"
CATALOG="${HERE}/src/assets/teams/catalog.ts"

# Nom lisible d'une team (libelle d'affichage). Defaut = id capitalise si absent.
team_display_name() {
  case "$1" in
    avengers) echo "Avengers" ;;
    xmen) echo "X-Men" ;;
    lotr) echo "LOTR" ;;
    norse) echo "Norse" ;;
    dc-justice) echo "DC Justice" ;;
    defenders) echo "Defenders" ;;
    harry-potter) echo "Harry Potter" ;;
    autobots) echo "Autobots" ;;
    olympians) echo "Olympians" ;;
    rebels) echo "Rebels" ;;
    starfleet) echo "Starfleet" ;;
    *) echo "$1" ;;
  esac
}

command -v jq >/dev/null || { echo "ERREUR: jq requis"; exit 1; }
[ -f "$TEAMS_JSON" ] || { echo "ERREUR: introuvable $TEAMS_JSON (IAKAGRAPH_ROOT?)"; exit 1; }

echo "== sync-vignettes (L15) : chartes=[${CHARTES}] teams=[${TEAMS}] + iakaframe racine =="

# Reset propre (idempotent) : on efface les sous-arbres charte qu'on va reecrire.
for entry in $CHARTES; do
  charte_app="${entry%/*}-${entry#*/}"   # naonedge/dark -> naonedge-dark
  rm -rf "${DEST:?}/${charte_app}"
done

# Recolte des lignes du manifest (charte-app -> team -> roleIndex -> import).
imports=""   # lignes `import vN from "./path";`
entries=""   # corps de l'objet
idx=0

# Copie un WebP source -> dest, emet l'import + la ligne de role. Retour: 0 si copie.
emit_role() {
  local src_img="$1" out_rel="$2" role="$3"
  if [ ! -f "$src_img" ]; then
    echo "  ! absent (ignore): ${src_img}"
    return 1
  fi
  local out_abs="${DEST}/${out_rel}"
  mkdir -p "$(dirname "$out_abs")"
  cp "$src_img" "$out_abs"
  local var="v${idx}"
  imports="${imports}import ${var} from \"./${out_rel}\";"$'\n'
  role_block="${role_block}      ${role}: ${var},"$'\n'
  idx=$((idx+1))
  return 0
}

for entry in $CHARTES; do
  charte_app="${entry%/*}-${entry#*/}"
  src_dir="${IAKAGRAPH_ROOT}/theme/${entry}/vignettes-256-webp"
  if [ ! -d "$src_dir" ]; then
    echo "  ! charte absente (ignore): ${src_dir}"
    continue
  fi
  team_block=""

  # --- Teams thematiques (teams.json) : roleIndex = ordre des slugs ---
  for team in $TEAMS; do
    role_block=""
    role=0
    # bash 3.2 macOS : pas de mapfile -> boucle while sur les lignes ordonnees.
    while IFS= read -r slug; do
      [ -z "$slug" ] && { role=$((role+1)); continue; }
      emit_role "${src_dir}/${team}/${slug}.webp" "${charte_app}/${team}/${slug}.webp" "$role" || true
      role=$((role+1))
    done < <(jq -r --arg t "$team" '.[$t][].slug' "$TEAMS_JSON")
    team_block="${team_block}    \"${team}\": {"$'\n'"${role_block}    },"$'\n'
  done

  # --- Pseudo-team "iakaframe" : casting natif a la racine des vignettes ---
  role_block=""
  role=0
  for slug in $IAKAFRAME_SLUGS; do
    emit_role "${src_dir}/${slug}.webp" "${charte_app}/iakaframe/${slug}.webp" "$role" || true
    role=$((role+1))
  done
  team_block="${team_block}    \"iakaframe\": {"$'\n'"${role_block}    },"$'\n'

  entries="${entries}  \"${charte_app}\": {"$'\n'"${team_block}  },"$'\n'
done

# Generation du manifest TypeScript (source de verite unique du resolveur).
{
  echo "/**"
  echo " * manifest.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN."
  echo " *"
  echo " * Mapping (charte-app -> team -> roleIndex 0..7 -> URL d'asset Vite servie en 'self')."
  echo " * L'ordre des roleIndex reflete teams.json (0=portefeuille, 1=coordination,"
  echo " * 2=cadrage, 3=dev, 4=qualite, 5=production, 6=design, 7=doc)."
  echo " * Teams : toutes celles de teams.json + pseudo-team 'iakaframe' (casting natif)."
  echo " * Source: chartes=[${CHARTES}]."
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

echo "== ${idx} WebP copies, manifest genere : ${MANIFEST} =="

# --- Catalogue des teams (donnees runtime pour le seed useTeams, L15-B) ---------
# Source unique = teams.json. L'ordre des slugs = roleIndex (0..7). Commite, regenere
# en meme temps que les vignettes (meme declencheur : nouvelle team / casting).
mkdir -p "$(dirname "$CATALOG")"
{
  echo "/**"
  echo " * catalog.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN."
  echo " *"
  echo " * Catalogue des teams thematiques (source: iakagraph teams.json). Chaque team ="
  echo " * liste ORDONNEE d'agents ; l'index = roleIndex (0=portefeuille .. 7=doc)."
  echo " * Sert de GRAINE au bootstrap des teams par defaut (useTeams, L15-B). Aucun"
  echo " * secret : seulement slug + roleIndex + libelle d'affichage."
  echo " */"
  echo "export interface CatalogAgent {"
  echo "  /** Slug stable (= nom affiche par defaut). */"
  echo "  slug: string;"
  echo "  /** Index de role (0..7) = ordre dans teams.json. */"
  echo "  roleIndex: number;"
  echo "}"
  echo ""
  echo "export interface CatalogTeam {"
  echo "  /** Cle stable (= cle teams.json, ex. \"lotr\"). Sert aussi de vignetteTeam. */"
  echo "  id: string;"
  echo "  /** Libelle d'affichage (ex. \"LOTR\"). */"
  echo "  name: string;"
  echo "  agents: CatalogAgent[];"
  echo "}"
  echo ""
  echo "export const TEAM_CATALOG: readonly CatalogTeam[] = ["
  for team in $TEAMS; do
    name="$(team_display_name "$team")"
    echo "  {"
    echo "    id: \"${team}\","
    echo "    name: \"${name}\","
    echo "    agents: ["
    role=0
    while IFS= read -r slug; do
      [ -z "$slug" ] && { role=$((role+1)); continue; }
      echo "      { slug: \"${slug}\", roleIndex: ${role} },"
      role=$((role+1))
    done < <(jq -r --arg t "$team" '.[$t][].slug' "$TEAMS_JSON")
    echo "    ],"
    echo "  },"
  done
  echo "] as const;"
} > "$CATALOG"

echo "== catalogue teams genere : ${CATALOG} =="
