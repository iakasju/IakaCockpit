/**
 * updateEndpoints.ts — MIROIR FRONT des endpoints de mise à jour (L34).
 *
 * Le plugin `updater` n'expose pas à la webview l'URL qu'il interroge : l'appel
 * part du backend Rust. Or les Réglages doivent dire d'où vient une mise à jour
 * (savoir d'où elle vient fait partie du contrat). D'où ce miroir — et, avec lui,
 * un risque de dérive : la SOURCE DE VÉRITÉ reste `src-tauri/tauri.conf.json`
 * (`plugins.updater.endpoints`). Un test de garde (`updateEndpoints.test.ts`) lit
 * le fichier de config et échoue si les deux listes divergent.
 *
 * La liste est ORDONNÉE : le premier endpoint qui répond gagne. Le jour où le flux
 * passe sur un site public, on PRÉFIXE la liste (ici et dans `tauri.conf.json`) —
 * l'entrée Forgejo devient le repli LAN, on ne la retire pas.
 */
export const UPDATE_ENDPOINTS: readonly string[] = [
  "http://192.168.1.139:3001/sjupin/iakacockpit/raw/branch/main/updater/latest.json",
];

/** Endpoint affiché à l'utilisateur (le premier de la liste), `null` si vide. */
export function primaryUpdateEndpoint(): string | null {
  return UPDATE_ENDPOINTS[0] ?? null;
}
