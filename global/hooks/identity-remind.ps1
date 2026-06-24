# identity-remind.ps1 — Rappel d'identite iakaframe (hook UserPromptSubmit)
# Emet un rappel ajoute au contexte : badge d'ouverture (pastille AVANT) + annonce, badge de
# cloture (pastille APRES). Nudge doux, complement du garde bloquant (identity-guard.ps1)
# cable sur Stop/SubagentStop.
# Aucun emoji dans la sortie (evite les soucis d'encodage PS 5.1) : on decrit le format.

Write-Output ("[Garde d'identite iakaframe] Regle de la methode : tout agent qui prend la parole " +
    "s'identifie ET annonce ce qu'il fait. La POSITION de la pastille porte le sens. Concretement : " +
    "badge d'ouverture = pastille AVANT le bloc, en TOUTE PREMIERE ligne -> <pastille> [ROYAUME][Agent] " +
    "(ex: la pastille jaune puis [PORTEFEUILLE][Odin]) suivi d'une courte annonce de ce que tu vas faire ; " +
    "puis badge de cloture = pastille APRES le bloc en derniere ligne -> [ROYAUME][Agent] <pastille>. " +
    "Double badge par intervention. Une delegation = chaine de badges.")
exit 0
