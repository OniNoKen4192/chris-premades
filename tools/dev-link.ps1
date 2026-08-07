<#
Dev loop: run this script from anywhere, then edit the repo and refresh Foundry.
It generates the dev manifest at the repo root and links this repo into the
Foundry data modules directory with an NTFS junction, avoiding a webpack build
for normal edit-to-refresh iterations.

When using -Packs, STOP Foundry first. Foundry locks its LevelDB compendium
packs while running, so pack rebuilds need the app closed.
#>
param(
    [string]$FoundryData = 'F:\FoundryV14Data\Data',
    [switch]$Packs
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$moduleDevPath = Join-Path $repoRoot 'module-dev.json'
$moduleJsonPath = Join-Path $repoRoot 'module.json'
$modulesPath = Join-Path $FoundryData 'modules'
$junctionPath = Join-Path $modulesPath 'chris-premades'

if ($Packs) {
    Push-Location -LiteralPath $repoRoot
    try {
        npm run buildCompendiums
    }
    finally {
        Pop-Location
    }
}

$manifest = Get-Content -Raw -LiteralPath $moduleDevPath
$manifest = $manifest.Replace('#{VERSION}#', '0.0.0-dev').Replace('#{MANIFEST}#', '').Replace('#{DOWNLOAD}#', '')
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($moduleJsonPath, $manifest, $utf8NoBom)
Write-Host "module.json generated at $moduleJsonPath"

if (-not (Test-Path -LiteralPath $modulesPath -PathType Container)) {
    throw "Foundry modules directory does not exist: $modulesPath"
}

if (Test-Path -LiteralPath $junctionPath) {
    $existing = Get-Item -LiteralPath $junctionPath
    if (($existing.LinkType -eq 'Junction') -and ($existing.Target -eq $repoRoot)) {
        Write-Host "Junction already present at $junctionPath"
        exit 0
    }

    throw "Path already exists and is not the expected junction: $junctionPath"
}

New-Item -ItemType Junction -Path $junctionPath -Target $repoRoot | Out-Null
Write-Host "Junction created at $junctionPath -> $repoRoot"