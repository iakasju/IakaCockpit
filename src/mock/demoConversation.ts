/**
 * demoConversation — HISTORIQUE de chat préchargé de la DÉMO (L9-C.1).
 *
 * Met en scène la mécanique iakaframe pour que la démo « raconte la méthode »
 * dès le boot dev (sans endpoint IA) :
 *   1. l'utilisateur demande un cadrage ;
 *   2. **Aragorn** (coordination) **délègue à Gandalf** (cadrage) — chaîne de badges ;
 *   3. **Gandalf** **rend un rapport** de cadrage ;
 *   4. **Aragorn** **restitue VERBATIM** le rapport de Gandalf (sans ventriloquie),
 *      puis ajoute son propre badge.
 *
 * Cette séquence est INJECTÉE dans la conversation `iaka-demo` à sa création
 * (`useDemoSeed` → `openConversation(..., DEMO_HISTORY)`), bornée par le flag dev
 * (`seeded:true`). Elle DOIT rester cohérente avec la main courante CouchDB
 * (`docker/init-couchdb.sh`, conv_id `iaka-demo`) : mêmes agents, même scène.
 *
 * Mise en scène visuelle uniquement — AUCUN agent réel n'est lancé (DEP-1).
 */
import type { ChatTurn } from "../hooks/useConversations";

/**
 * Texte VERBATIM du rapport de Gandalf, partagé entre le tour « rapport » et le
 * tour « restitution » (Aragorn cite mot pour mot). Source unique = pas de dérive.
 */
export const GANDALF_REPORT_VERBATIM =
  "Cadrage L9 fermé : 3 teams embarquées (lotr, avengers, starfleet), " +
  "vignettes servies en 'self' (CSP intacte), conversation préchargée cohérente " +
  "chat ↔ main courante. Trois critères d'acceptation, deux arbitrages tranchés.";

/**
 * Historique de démo (chaîne de badges iakaframe). L'identité d'un tour assistant
 * est portée par l'agent courant de la conversation côté UI ; on ouvre la
 * conversation avec Aragorn comme responsable, et le contenu nomme explicitement
 * l'agent qui parle (badge `[ROYAUME][Agent]`) pour la lisibilité de la démo.
 */
export const DEMO_HISTORY: readonly ChatTurn[] = [
  {
    role: "user",
    content: "Peux-tu cadrer le lot L9 (démo enrichie) avant qu'on code ?",
  },
  {
    role: "assistant",
    content:
      "🟢 [ACCUEIL][Aragorn] — Bien reçu. Le cadrage relève de Gandalf : je lui " +
      "délègue l'instruction. [ACCUEIL][Aragorn] 🟢",
  },
  {
    role: "assistant",
    content:
      "🔵 [CADRAGE][Gandalf] — Je prends le cadrage de L9.\n\n" +
      GANDALF_REPORT_VERBATIM +
      "\n\n[CADRAGE][Gandalf] 🔵",
  },
  {
    role: "assistant",
    content:
      "🟢 [ACCUEIL][Aragorn] — Je restitue le rapport de Gandalf, verbatim :\n\n" +
      "[CADRAGE][Gandalf] « " +
      GANDALF_REPORT_VERBATIM +
      " »\n\n" +
      "C'est validé côté coordination : on peut lancer Gimli sur la réalisation. " +
      "[ACCUEIL][Aragorn] 🟢",
  },
];

/**
 * Paires `(royaume, agent)` distinctes apparaissant dans la séquence assistant
 * (hors user). Sert au test de cohérence chat ↔ main courante (C4).
 */
export const DEMO_HISTORY_AGENTS: readonly { royaume: string; agent: string }[] =
  [
    { royaume: "ACCUEIL", agent: "Aragorn" },
    { royaume: "CADRAGE", agent: "Gandalf" },
  ];
