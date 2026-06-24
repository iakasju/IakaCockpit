#!/usr/bin/env node
// identity-guard.mjs — Garde d'identite iakaframe (portage macOS du .ps1)
// Cable sur les hooks Stop et SubagentStop. Verifie que le TOUR courant OUVRE et
// CLOT par un badge. La POSITION de la pastille porte le sens :
//   ouverture = pastille AVANT le bloc  ->  🟡 [PORTEFEUILLE][Odin]
//   cloture   = pastille APRES le bloc  ->  [PORTEFEUILLE][Odin] 🟡
// ASSOUPLISSEMENT : l'ouverture est acceptee si N'IMPORTE QUEL message-texte du tour
// (depuis le dernier vrai prompt user ; les tool_result ne ferment pas le tour) ouvre
// par un badge. La cloture, elle, reste portee par le DERNIER message du tour.
// ANTI-COURSE DE FLUSH : si le verdict serait un refus, on attend brievement et on
// RELIT le transcript (jusqu'a 3 essais). Cela neutralise le cas ou le hook Stop lit
// le fichier avant que le dernier message-texte (porteur du badge de cloture) y soit
// ecrit -> sinon une narration d'outil intermediaire, sans badge, declenche un faux refus.
// Badge manquant -> exit 2 (refus, stderr renvoye a l'agent). FAIL-OPEN : tout bug
// interne => exit 0. Respecte stop_hook_active (anti-boucle).
//
// LIMITE ASSUMEE : ce garde ne lit que le canal ADRESSE (blocs type:"text").
// Les gestes (tool_use) lui sont invisibles -> voir delegation-guard.mjs.

import { readFileSync } from "node:fs";

const allow = () => process.exit(0);
const block = (msg) => { process.stderr.write(msg + "\n"); process.exit(2); };

// Sommeil synchrone (pas d'async dans un hook one-shot) sans dependance externe.
const sleep = (ms) => {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch { /* SharedArrayBuffer indispo -> on n'attend pas, simple degradation */ }
};

const PASTILLES = [0x1f7e1, 0x1f535, 0x1f534, 0x1f7e2, 0x1f7e3, 0x1f7e0]
  .map((cp) => String.fromCodePoint(cp));
const pastAlt = PASTILLES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const bracket = "\\[[^\\]]+\\]\\s*`?\\s*\\[[^\\]]+\\]"; // [ROYAUME][Agent]
const reOpen = new RegExp("^(?:" + pastAlt + ")\\s*`?\\s*" + bracket);
const reClose = new RegExp(bracket + "\\s*`?\\s*(?:" + pastAlt + ")(?:\\s|$)");

const linesOf = (txt) =>
  txt.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim() !== "");

// Evalue l'etat courant du transcript. Renvoie :
//   { skip: true }                      -> rien a juger (transcript illisible/vide) => allow
//   { skip: false, startOk, stopOk }    -> verdict sur le tour courant
function evaluate(tp) {
  let lines;
  try { lines = readFileSync(tp, "utf8").split(/\r?\n/); }
  catch { return { skip: true }; }

  // Messages assistant-texte du TOUR courant, du plus recent au plus ancien.
  // Le tour s'arrete au dernier VRAI prompt user (un tool_result ne ferme pas le tour).
  const turn = []; // ordre anti-chronologique (turn[0] = dernier message)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    if (obj.type === "user" && obj.message) {
      const c = obj.message.content;
      // tool_result pur => fait partie du tour, on continue ; sinon = vrai prompt => frontiere.
      const isToolResultOnly = Array.isArray(c) && c.length > 0
        && c.every((p) => p && p.type === "tool_result");
      if (isToolResultOnly) continue;
      break;
    }

    if (obj.type === "assistant" && obj.message && Array.isArray(obj.message.content)) {
      const parts = obj.message.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => String(c.text));
      if (parts.length) turn.push(parts.join("\n").trim());
    }
  }
  if (turn.length === 0) return { skip: true };

  // Ouverture : acceptee si N'IMPORTE QUEL message-texte du tour ouvre par un badge.
  const opensWith = (txt) => {
    const ne = linesOf(txt);
    return ne.length > 0 && reOpen.test(ne[0].trim());
  };
  let startOk = turn.some(opensWith);

  // Cloture : portee par le DERNIER message-texte du tour (turn[0]).
  const nonEmpty = linesOf(turn[0]);
  let stopOk;
  if (nonEmpty.length === 1) {
    const single = reOpen.test(nonEmpty[0].trim()) || reClose.test(nonEmpty[0].trim());
    stopOk = single;
    // Tour reduit a un unique one-liner : on tolere ouverture OU cloture pour les deux.
    if (turn.length === 1) startOk = single;
  } else {
    stopOk = false;
    const idxs = [nonEmpty.length - 1];
    if (nonEmpty.length >= 3) idxs.push(nonEmpty.length - 2);
    for (const idx of idxs) {
      if (idx === 0) continue;
      if (reClose.test(nonEmpty[idx].trim())) { stopOk = true; break; }
    }
  }

  return { skip: false, startOk, stopOk };
}

try {
  const raw = readFileSync(0, "utf8");
  if (!raw.trim()) allow();
  const payload = JSON.parse(raw);
  if (payload.stop_hook_active) allow();

  const tp = payload.transcript_path;
  if (!tp) allow();

  // Boucle anti-course : on ne bloque qu'apres avoir laisse le flush se terminer.
  const ATTEMPTS = 3;
  const WAIT_MS = 150;
  let res = { skip: true };
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    res = evaluate(tp);
    if (res.skip || (res.startOk && res.stopOk)) allow();
    if (attempt < ATTEMPTS - 1) sleep(WAIT_MS); // laisser ecrire le dernier message
  }

  const miss = [];
  if (!res.startOk) miss.push("ouverture (pastille AVANT le bloc en PREMIERE ligne, ex: 🟡 [ROYAUME][Agent])");
  if (!res.stopOk) miss.push("cloture (pastille APRES le bloc en derniere ligne, ex: [ROYAUME][Agent] 🟡)");
  block(
    "Garde d'identite iakaframe : badge manquant -> " + miss.join(" + ") +
    ". Convention : ouverture = pastille AVANT, cloture = pastille APRES."
  );
} catch {
  allow(); // fail-open : un bug du garde ne fige jamais une session
}
