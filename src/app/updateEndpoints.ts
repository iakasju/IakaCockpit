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
 * La liste est ORDONNÉE : le premier endpoint qui répond gagne. Depuis le lot 0
 * (« trois canaux synchrones »), elle en porte TROIS — une cible morte ne bloque plus
 * la mise à jour, l'updater essaie la suivante (CA-11). L'ordre suit la disponibilité
 * constatée, pas une préférence : voir les commentaires de chaque entrée.
 */
export const UPDATE_ENDPOINTS: readonly string[] = [
  // 1. NAS (forge courante, même LAN que le poste) — c'est ELLE qui reçoit le manifeste publié
  //    par `scripts/publish-update.mjs`, et c'est donc le seul endpoint dont le contenu est
  //    garanti cohérent avec les URL d'artefacts qu'il annonce.
  "http://192.168.1.139:3001/sjupin/iakacockpit/raw/branch/main/updater/latest.json",
  // 2. GitHub — le seul chemin qui ne dépende pas du LAN. Le dépôt `iakasju/IakaCockpit` est
  //    PUBLIC depuis le 2026-08-28 (décision du décideur) : mesuré `200` en anonyme le jour même
  //    par `iakaframe endpoints`, il sert le manifeste. C'est LUI qui rend CA-11 réel — jusque-là,
  //    ce dépôt était privé, cette URL rendait 404, et la liste n'avait de redondance que le
  //    nombre de ses lignes. ⚠️ Le rendre privé à nouveau désarmerait la bascule en silence : un
  //    dépôt privé répond volontiers 200 + une page de connexion, ce qu'aucun code HTTP ne trahit.
  //    La seule vérification qui vaille est la mesure : `iakaframe endpoints --app .`
  "https://raw.githubusercontent.com/iakasju/IakaCockpit/main/updater/latest.json",
  // 3. ⚠️ RETIRÉE LE 2026-09-03 (décision du décideur) — l'iakabox `192.168.2.11` figurait ici
  //    « en DERNIER secours, au cas où elle revienne ». Le motif du retrait n'est PAS qu'elle soit
  //    morte — elle est en panne TEMPORAIRE et sera réparée. C'est le PIÈGE DU RETOUR : rien ne
  //    pousse vers elle, donc elle reviendrait en servant un manifeste PÉRIMÉ ; et comme le plugin
  //    s'arrête au PREMIER endpoint qui RÉPOND, un client du LAN recevrait une vieille version.
  //    Un canal qui revient en servant du périmé est PIRE qu'un canal absent : absent il est
  //    ignoré, présent et périmé IL FAIT AUTORITÉ.
  //    ⚠️ Cette propriété vaut pour TOUT endpoint, DONC POUR LE NAS ci-dessus, qui est en position
  //    1 et le seul que les scripts poussent : s'il répondait en retard, GitHub ne serait JAMAIS
  //    atteint. C'est le vrai risque de la liste, et il survit à ce retrait.
  //    CONDITION DE CHUTE : la réintégration de l'iakabox est un geste du décideur (« je gère le
  //    retour en grâce de iakabox quand elle est réparée ») — et elle exige d'abord qu'un canal
  //    la pousse, sans quoi le piège se rouvre à l'identique.
];

/** Endpoint affiché à l'utilisateur (le premier de la liste), `null` si vide. */
export function primaryUpdateEndpoint(): string | null {
  return UPDATE_ENDPOINTS[0] ?? null;
}
