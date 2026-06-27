/**
 * manifest.ts — GENERE par scripts/sync-chartes.sh. NE PAS EDITER A LA MAIN.
 *
 * Catalogue des chartes embarquees (tokens iakagraph). `id` = data-theme
 * applique sur <html> (useSettings.applyToDom) ; `swatches` = apercu
 * [fond, carte, accent]. Le CSS associe vit dans chartes.css (meme dossier).
 */
export interface CharteInfo {
  id: string;
  name: string;
  /** Apercu : [fond global, carte, accent]. */
  swatches: [string, string, string];
}

export const CHARTES: CharteInfo[] = [
  { id: "naonedge-dark", name: "NaonEdge dark", swatches: ["#0a0a0a", "#1a1a1a", "#c8a44e"] },
  { id: "naonedge-light", name: "NaonEdge light", swatches: ["#f7f6f2", "#ffffff", "#9a7521"] },
  { id: "grimoire-dark-fantasy", name: "Grimoire dark-fantasy", swatches: ["#e7dcc0", "#efe6cf", "#a84b2a"] },
  { id: "os-windows", name: "OS Windows", swatches: ["#f3f3f3", "#ffffff", "#0067c0"] },
  { id: "os-ubuntu", name: "OS Ubuntu", swatches: ["#fafafa", "#ffffff", "#e95420"] },
  { id: "os-android", name: "OS Android", swatches: ["#fef7ff", "#ffffff", "#6750a4"] },
  { id: "os-macos", name: "OS macOS", swatches: ["#ececec", "#ffffff", "#007aff"] },
  { id: "cartoon-std", name: "Cartoon std", swatches: ["#fff7e6", "#ffffff", "#ff5a5f"] },
  { id: "photoreal-modern", name: "Photoreal modern", swatches: ["#f5f6f8", "#ffffff", "#4f46e5"] },
  { id: "studio-clair", name: "Studio clair", swatches: ["#fbfbfc", "#ffffff", "#5b5bd6"] },
];
