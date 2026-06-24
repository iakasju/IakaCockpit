# perimeter-guard.ps1 — Garde iakaframe du canal des GESTES DIRECTS (Edit/Write/Bash/NotebookEdit).
# Miroir Windows de perimeter-guard.mjs (parite §3.8). Cable sur PreToolUse,
# matcher "Edit|Write|Bash|NotebookEdit".
#
# Pourquoi : delegation-guard ne garde QUE l'outil Task. Les gestes mutateurs DIRECTS ne sont
# gardes par aucun hook -> faille de perimetre. Ce garde detecte le(s) chemin(s) touche(s),
# journalise, et selon le mode signale (WARN, exit 0) ou bloque (DENY, exit 2) un geste qui
# SORT du perimetre autorise.
#
# PRINCIPE : garde de CHEMINS, jamais de personas. ANCRAGE : $env:CLAUDE_PROJECT_DIR (stable),
# PAS le cwd. Variable absente -> SKIP (fail-open, exit 0). FAIL-OPEN partout : tout bug => exit 0.
# Journal : ~/.claude/iakaframe-perimeter.log
#
# RESERVE : non smoke-teste sous Windows (pwsh absent du poste macOS de developpement).

$ErrorActionPreference = 'Stop'

$HomeDir = [Environment]::GetFolderPath('UserProfile')
$ClaudeDir = Join-Path $HomeDir '.claude'
$HarnessSettings = Join-Path $ClaudeDir 'settings.json'
$LogPath = Join-Path $ClaudeDir 'iakaframe-perimeter.log'

function Out-Allow { exit 0 }

function Write-Log($rec) {
    try { Add-Content -Path $LogPath -Value ($rec | ConvertTo-Json -Compress -Depth 6) -Encoding utf8 } catch { }
}

function Normalize-Path([string]$p) {
    # Resout en absolu sans exiger l'existence du fichier ; normalise separateurs et "..".
    try { return [System.IO.Path]::GetFullPath($p) } catch { return $p }
}

function Is-Under([string]$base, [string]$target) {
    if (-not $base -or -not $target) { return $false }
    $b = (Normalize-Path $base).TrimEnd('\','/')
    $t = Normalize-Path $target
    if ($t -eq $b) { return $true }
    return $t.StartsWith($b + [System.IO.Path]::DirectorySeparatorChar) -or $t.StartsWith($b + '/')
}

function Effective-Mode([string]$modeEnv, [string]$tool) {
    $v = ($modeEnv).Trim().ToLower()
    if ($v -eq 'deny') { return 'deny' }
    if ($v -eq 'warn') { return 'warn' }
    # default | "" | inconnu => panachage par outil
    if ($tool -eq 'Bash') { return 'warn' } else { return 'deny' }
}

function Classify-Path([string]$absPath, [string]$projectDir) {
    if ((Normalize-Path $absPath) -eq (Normalize-Path $HarnessSettings)) { return 'DENY_HARNESS' }
    if ($projectDir -and (Is-Under $projectDir $absPath)) { return 'ALLOW_PROJECT' }
    if (Is-Under $ClaudeDir $absPath) { return 'ALLOW_PORTFOLIO' }
    return 'HORS'
}

function Is-Blocking([string]$verdict) { return ($verdict -eq 'HORS' -or $verdict -eq 'DENY_HARNESS') }

# Extrait les chemins absolus "interessants" d'une chaine shell (MVP honnete, non exhaustif).
function Extract-AbsPaths([string]$command) {
    $set = New-Object System.Collections.Generic.HashSet[string]
    $homeEsc = [Regex]::Escape($HomeDir)
    foreach ($m in [Regex]::Matches($command, $homeEsc + "(?:[\\/][^\s'""``;|&><]*)?")) {
        if ($m.Value) { [void]$set.Add((Normalize-Path $m.Value)) }
    }
    foreach ($m in [Regex]::Matches($command, "~/\.claude(?:/[^\s'""``;|&><]*)?")) {
        $tail = $m.Value.Substring(1)
        [void]$set.Add((Normalize-Path (Join-Path $HomeDir $tail)))
    }
    return @($set)
}

try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { Out-Allow }
    $p = $raw | ConvertFrom-Json
    if ($p.hook_event_name -ne 'PreToolUse') { Out-Allow }

    $session = $p.session_id
    $tool = [string]$p.tool_name
    $ti = $p.tool_input
    $payloadCwd = if ($p.cwd) { [string]$p.cwd } else { (Get-Location).Path }

    $modeEnvRaw = $env:IAKAFRAME_PERIMETER_MODE
    $modeEnv = if ([string]::IsNullOrEmpty($modeEnvRaw)) { 'default' } else { $modeEnvRaw }

    $projectDirRaw = $env:CLAUDE_PROJECT_DIR
    if ([string]::IsNullOrWhiteSpace($projectDirRaw)) {
        Write-Log @{ at=(Get-Date).ToString('o'); event='SKIP'; session=$session; tool=$tool; path=$null;
            project_dir=$null; verdict='SKIP'; reason='no_project_dir';
            mode=(Effective-Mode $modeEnv $tool); mode_env=$modeEnv }
        Out-Allow
    }
    $projectDir = Normalize-Path $projectDirRaw

    function To-Abs([string]$pth) {
        if ([System.IO.Path]::IsPathRooted($pth)) { return Normalize-Path $pth }
        return Normalize-Path (Join-Path $payloadCwd $pth)
    }

    # ---- Edit / Write / NotebookEdit : chemin explicite FIABLE ----
    if ($tool -eq 'Edit' -or $tool -eq 'Write' -or $tool -eq 'NotebookEdit') {
        $rawPath = if ($ti.file_path) { [string]$ti.file_path } elseif ($ti.notebook_path) { [string]$ti.notebook_path } else { $null }
        $mode = Effective-Mode $modeEnv $tool
        if (-not $rawPath) {
            Write-Log @{ at=(Get-Date).ToString('o'); event='GESTE'; session=$session; tool=$tool; path=$null;
                project_dir=$projectDir; verdict='SKIP'; reason='no_path'; mode=$mode; mode_env=$modeEnv }
            Out-Allow
        }
        $abs = To-Abs $rawPath
        $verdict = Classify-Path $abs $projectDir
        Write-Log @{ at=(Get-Date).ToString('o'); event='GESTE'; session=$session; tool=$tool; path=$abs;
            project_dir=$projectDir; verdict=$verdict; mode=$mode; mode_env=$modeEnv }
        if (Is-Blocking $verdict) {
            $why = if ($verdict -eq 'DENY_HARNESS') { "auto-modification du harnais (~/.claude/settings.json) reservee a l'humain" } else { "chemin HORS perimetre projet" }
            $head = if ($mode -eq 'deny') { 'REFUSE' } else { 'HORS PERIMETRE' }
            $tail = if ($mode -eq 'deny') { "  Passe par la delegation (Aragorn/royaume) plutot qu'un geste direct hors perimetre,`n  ou exporte IAKAFRAME_PERIMETER_MODE=warn pour desamorcer." } else { "  (WARN : geste laisse passer mais journalise.)" }
            [Console]::Error.WriteLine("[perimeter-guard] Geste $tool $head : $why.`n  Cible    : $abs`n  Perimetre: $projectDir`n  Verdict  : $verdict (mode=$mode).`n$tail")
            if ($mode -eq 'deny') { exit 2 }
        }
        Out-Allow
    }

    # ---- Bash : heuristique sur la chaine shell (MVP honnete) ----
    if ($tool -eq 'Bash') {
        $command = [string]$ti.command
        $mode = Effective-Mode $modeEnv $tool
        $cmdShort = if ($command.Length -gt 500) { $command.Substring(0,500) + [char]0x2026 } else { $command }

        $absPaths = Extract-AbsPaths $command
        if ($absPaths.Count -eq 0) {
            Write-Log @{ at=(Get-Date).ToString('o'); event='GESTE'; session=$session; tool=$tool; path=$null; command=$cmdShort;
                project_dir=$projectDir; verdict='BASH_UNRESOLVED'; mode=$mode; mode_env=$modeEnv }
            Out-Allow
        }

        $worst = 'ALLOW_PROJECT'
        $classified = @()
        foreach ($ap in $absPaths) {
            $v = Classify-Path $ap $projectDir
            $classified += @{ path=$ap; verdict=$v }
            if ($v -eq 'DENY_HARNESS') { $worst = 'DENY_HARNESS' }
            elseif ($v -eq 'HORS' -and $worst -ne 'DENY_HARNESS') { $worst = 'HORS' }
        }

        Write-Log @{ at=(Get-Date).ToString('o'); event='GESTE'; session=$session; tool=$tool; path=$classified; command=$cmdShort;
            project_dir=$projectDir; verdict=$worst; mode=$mode; mode_env=$modeEnv }

        if (Is-Blocking $worst) {
            $offenders = ($classified | Where-Object { Is-Blocking $_.verdict } | ForEach-Object { $_.path }) -join ', '
            $why = if ($worst -eq 'DENY_HARNESS') { "auto-modification du harnais (~/.claude/settings.json) reservee a l'humain" } else { "chemin(s) absolu(s) HORS perimetre projet" }
            $head = if ($mode -eq 'deny') { 'REFUSEE' } else { 'HORS PERIMETRE' }
            $tail = if ($mode -eq 'deny') { "  Passe par la delegation plutot qu'un geste direct hors perimetre,`n  ou exporte IAKAFRAME_PERIMETER_MODE=warn pour desamorcer." } else { "  (WARN : commande laissee passer mais journalisee. Heuristique non exhaustive.)" }
            [Console]::Error.WriteLine("[perimeter-guard] Commande Bash $head : $why.`n  Chemin(s): $offenders`n  Perimetre: $projectDir`n  Verdict  : $worst (mode=$mode).`n$tail")
            if ($mode -eq 'deny') { exit 2 }
        }
        Out-Allow
    }

    Out-Allow
} catch {
    Out-Allow  # fail-open : un bug du garde ne fige jamais une session
}
