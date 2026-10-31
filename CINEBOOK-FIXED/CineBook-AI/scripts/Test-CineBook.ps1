$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$failed = $false
if (Get-Command mvn -ErrorAction SilentlyContinue) {
  Push-Location (Join-Path $root 'backend'); try { mvn test; if ($LASTEXITCODE -ne 0) { $failed = $true } } finally { Pop-Location }
} else { Write-Warning 'Maven unavailable: backend tests skipped.' }
if (Get-Command npm -ErrorAction SilentlyContinue) {
  Push-Location (Join-Path $root 'frontend')
  try {
    if (-not $failed) { npm run check; if ($LASTEXITCODE -ne 0) { $failed = $true } }
    if (-not $failed) { npm test; if ($LASTEXITCODE -ne 0) { $failed = $true } }
    if (-not $failed) { npm run build; if ($LASTEXITCODE -ne 0) { $failed = $true } }
  } finally { Pop-Location }
} else { Write-Warning 'npm unavailable: frontend checks skipped.' }
python (Join-Path $PSScriptRoot 'verify-repository.py')
if ($LASTEXITCODE -ne 0) { $failed = $true }
if ($failed) { throw 'At least one requested verification step failed or could not complete. Review the output above.' }
