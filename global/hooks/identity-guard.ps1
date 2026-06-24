# identity-guard.ps1 — Garde d'identité iakaframe (méthode : double badge ouverture+clôture)
# Câblé sur les hooks Stop et SubagentStop.
# Vérifie que le TOUR courant OUVRE et CLÔT par un badge.
# Convention markup (depuis 2026-06-23) — la POSITION de la pastille porte le sens :
#   ouverture (balise ouvrante) = pastille AVANT le bloc  ->  🟡 [PORTEFEUILLE][Odin]
#   clôture   (balise fermante) = pastille APRES le bloc  ->  [PORTEFEUILLE][Odin] 🟡
#   (backticks/espaces tolérés autour des crochets)
#
# ASSOUPLISSEMENT : l'ouverture est acceptée si N'IMPORTE QUEL message-texte du tour
# (depuis le dernier vrai prompt user ; les tool_result ne ferment pas le tour) ouvre
# par un badge. La clôture, elle, reste portée par le DERNIER message du tour.
# ANTI-COURSE DE FLUSH : si le verdict serait un refus, on attend brièvement et on RELIT
# le transcript (jusqu'à 3 essais). Cela neutralise le cas où le hook Stop lit le fichier
# avant que le dernier message-texte (porteur du badge de clôture) y soit écrit -> sinon
# une narration d'outil intermédiaire, sans badge, déclenche un faux refus.
#
# Si un badge manque -> exit 2 (refus) : l'agent doit corriger avant de rendre la main.
#
# Sécurité : FAIL-OPEN. Toute erreur interne (parse, lecture, etc.) => exit 0 (laisse passer),
#            jamais bloquer pour un bug du garde. Respecte stop_hook_active (anti-boucle :
#            ne bloque qu'une fois, puis laisse passer pour ne jamais figer une session).
#
# LIMITE ASSUMEE : ce garde ne lit que le canal ADRESSE (blocs type:"text").
# Les gestes (tool_use) lui sont invisibles -> voir delegation-guard (canal des gestes).

$ErrorActionPreference = 'Stop'

function Out-Allow { exit 0 }
function Out-Block($msg) {
    [Console]::Error.WriteLine($msg)
    exit 2
}

# Pastilles autorisées, construites par code point (pas d'emoji littéral dans le fichier).
$pastilles = (0x1F7E1, 0x1F535, 0x1F534, 0x1F7E2, 0x1F7E3, 0x1F7E0) |
    ForEach-Object { [char]::ConvertFromUtf32($_) }
$bracket = '\[[^\]]+\]\s*`?\s*\[[^\]]+\]'   # [ROYAUME][Agent], backtick interne toléré
$pastAlt = ($pastilles | ForEach-Object { [regex]::Escape($_) }) -join '|'

# Orientation = sémantique (comme un markup) :
#   ouvrant  -> pastille AVANT le bloc crochets   (ouverture)
#   fermant  -> pastille APRES le bloc crochets   (clôture)
function Test-BadgeOpen([string]$s) {
    if (-not $s) { return $false }
    return ($s.Trim() -match ('^(?:' + $pastAlt + ')\s*`?\s*' + $bracket))
}
function Test-BadgeClose([string]$s) {
    if (-not $s) { return $false }
    return ($s.Trim() -match ($bracket + '\s*`?\s*(?:' + $pastAlt + ')(?:\s|$)'))
}

# Evalue l'état courant du transcript. Renvoie un objet :
#   @{ Skip = $true }                          -> rien à juger -> allow
#   @{ Skip = $false; StartOk; StopOk }        -> verdict sur le tour courant
function Get-Verdict([string]$tp) {
    if (-not (Test-Path -LiteralPath $tp)) { return @{ Skip = $true } }
    $lines = @(Get-Content -LiteralPath $tp -Encoding UTF8 -ErrorAction Stop)
    if (-not $lines) { return @{ Skip = $true } }

    # Messages assistant-texte du TOUR courant, du plus récent au plus ancien.
    # Le tour s'arrête au dernier VRAI prompt user (un tool_result ne ferme pas le tour).
    $turn = New-Object System.Collections.Generic.List[string]  # turn[0] = dernier message
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        $line = ([string]$lines[$i]).Trim()
        if (-not $line) { continue }
        try { $obj = $line | ConvertFrom-Json } catch { continue }

        if ($obj.type -eq 'user' -and $obj.message) {
            $c = $obj.message.content
            # tool_result pur => fait partie du tour ; sinon = vrai prompt => frontière.
            $isToolResultOnly = $false
            if ($c -is [System.Array] -and $c.Count -gt 0) {
                $isToolResultOnly = $true
                foreach ($p in $c) {
                    if (-not ($p -and $p.type -eq 'tool_result')) { $isToolResultOnly = $false; break }
                }
            }
            if ($isToolResultOnly) { continue }
            break
        }

        if ($obj.type -eq 'assistant' -and $obj.message -and $obj.message.content) {
            $parts = @()
            foreach ($cc in $obj.message.content) {
                if ($cc.type -eq 'text' -and $cc.text) { $parts += [string]$cc.text }
            }
            if ($parts.Count -gt 0) { $turn.Add((($parts -join "`n").Trim())) }
        }
    }
    if ($turn.Count -eq 0) { return @{ Skip = $true } }

    function Get-NonEmpty([string]$txt) {
        return @($txt -split "`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_.Trim() -ne '' })
    }

    # Ouverture : acceptée si N'IMPORTE QUEL message-texte du tour ouvre par un badge.
    $startOk = $false
    foreach ($msg in $turn) {
        $ne = Get-NonEmpty $msg
        if ($ne.Count -gt 0 -and (Test-BadgeOpen $ne[0])) { $startOk = $true; break }
    }

    # Clôture : portée par le DERNIER message-texte du tour (turn[0]).
    $nonEmpty = Get-NonEmpty $turn[0]
    if ($nonEmpty.Count -eq 1) {
        $single = (Test-BadgeOpen $nonEmpty[0]) -or (Test-BadgeClose $nonEmpty[0])
        $stopOk = $single
        # Tour réduit à un unique one-liner : on tolère ouverture OU clôture pour les deux.
        if ($turn.Count -eq 1) { $startOk = $single }
    }
    else {
        $stopOk = $false
        $idxs = @($nonEmpty.Count - 1)
        if ($nonEmpty.Count -ge 3) { $idxs += ($nonEmpty.Count - 2) }
        foreach ($idx in $idxs) {
            if ($idx -eq 0) { continue }
            if (Test-BadgeClose $nonEmpty[$idx]) { $stopOk = $true; break }
        }
    }

    return @{ Skip = $false; StartOk = $startOk; StopOk = $stopOk }
}

try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { Out-Allow }
    $payload = $raw | ConvertFrom-Json

    # Anti-boucle : si on est déjà dans une relance de hook Stop, on laisse passer.
    if ($payload.stop_hook_active) { Out-Allow }

    $tp = $payload.transcript_path
    if (-not $tp) { Out-Allow }

    # Boucle anti-course : on ne bloque qu'après avoir laissé le flush se terminer.
    $ATTEMPTS = 3
    $WAIT_MS  = 150
    $res = @{ Skip = $true }
    for ($attempt = 0; $attempt -lt $ATTEMPTS; $attempt++) {
        $res = Get-Verdict $tp
        if ($res.Skip -or ($res.StartOk -and $res.StopOk)) { Out-Allow }
        if ($attempt -lt ($ATTEMPTS - 1)) { Start-Sleep -Milliseconds $WAIT_MS }  # laisser écrire le dernier message
    }

    $miss = @()
    if (-not $res.StartOk) { $miss += 'ouverture (pastille AVANT le bloc en PREMIERE ligne, ex: 🟡 [ROYAUME][Agent])' }
    if (-not $res.StopOk)  { $miss += 'cloture (pastille APRES le bloc en derniere ligne, ex: [ROYAUME][Agent] 🟡)' }
    Out-Block ("Garde d'identite iakaframe : badge manquant -> " + ($miss -join ' + ') + ". " +
        "Convention markup : ouverture = pastille AVANT (balise ouvrante), cloture = pastille APRES (balise fermante).")
}
catch {
    Out-Allow   # fail-open : un bug du garde ne doit jamais bloquer une session
}
