$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
$devLink = Join-Path $scriptDir 'dev-link.ps1'
$moduleDev = Join-Path $repoRoot 'module-dev.json'
$moduleJson = Join-Path $repoRoot 'module.json'
$scratch = Join-Path $env:TEMP ('cpr-dev-link-accept-' + [guid]::NewGuid().ToString('N'))
$failures = 0

function Write-Criterion {
    param(
        [int]$Number,
        [bool]$Passed,
        [string]$Message
    )

    $status = if ($Passed) { 'PASS' } else { 'FAIL' }
    Write-Host "Criterion ${Number}: $status - $Message"
    if (-not $Passed) {
        $script:failures += 1
    }
}

try {
    $beforeHash = (Get-FileHash -LiteralPath $moduleDev -Algorithm SHA256).Hash

    New-Item -ItemType Directory -Path $scratch | Out-Null
    $missingData = Join-Path $scratch 'missing-data'
    $expectedModulesPath = Join-Path $missingData 'modules'

    $failedOutput = & pwsh -NoProfile -File $devLink -FoundryData $missingData 2>&1
    $failedExitCode = $LASTEXITCODE
    $failedText = ($failedOutput | Out-String)
    Write-Criterion 1 (($failedExitCode -ne 0) -and $failedText.Contains($expectedModulesPath)) "missing modules path failure contains $expectedModulesPath"

    $moduleContent = Get-Content -Raw -LiteralPath $moduleJson
    Write-Criterion 2 ((Test-Path -LiteralPath $moduleJson) -and $moduleContent.Contains('"version": "1.5.43-dev"') -and -not $moduleContent.Contains('#{')) 'module.json generated with dev substitutions and no placeholder remnants'

    $dataRoot = Join-Path $scratch 'FoundryData'
    $modulesRoot = Join-Path $dataRoot 'modules'
    New-Item -ItemType Directory -Path $modulesRoot | Out-Null

    $positiveOutput = & pwsh -NoProfile -File $devLink -FoundryData $dataRoot 2>&1
    $positiveExitCode = $LASTEXITCODE
    $linkPath = Join-Path $modulesRoot 'chris-premades'
    $linkItem = if (Test-Path -LiteralPath $linkPath) { Get-Item -LiteralPath $linkPath } else { $null }
    Write-Criterion 4 (($positiveExitCode -eq 0) -and ($null -ne $linkItem) -and ($linkItem.LinkType -eq 'Junction') -and ($linkItem.Target -eq $repoRoot)) "junction points at $repoRoot"

    $secondOutput = & pwsh -NoProfile -File $devLink -FoundryData $dataRoot 2>&1
    $secondExitCode = $LASTEXITCODE
    $secondLinkItem = if (Test-Path -LiteralPath $linkPath) { Get-Item -LiteralPath $linkPath } else { $null }
    Write-Criterion 5 (($secondExitCode -eq 0) -and ($null -ne $secondLinkItem) -and ($secondLinkItem.LinkType -eq 'Junction') -and ($secondLinkItem.Target -eq $repoRoot)) 'second run is idempotent and leaves the junction present'

    $afterHash = (Get-FileHash -LiteralPath $moduleDev -Algorithm SHA256).Hash
    Write-Criterion 3 ($beforeHash -eq $afterHash) 'module-dev.json is byte-identical after harness runs'
}
catch {
    $failures += 1
    Write-Host "Harness error: FAIL - $($_.Exception.Message)"
}
finally {
    if (Test-Path -LiteralPath $scratch) {
        Remove-Item -LiteralPath $scratch -Recurse -Force
    }
}

if ($failures -ne 0) {
    exit 1
}

exit 0