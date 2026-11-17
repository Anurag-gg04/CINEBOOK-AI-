$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $env:DB_URL) { $env:DB_URL = 'jdbc:mysql://localhost:3306/cinebook?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC' }
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = 'cinebook' }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = 'cinebook_dev_only' }
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'local-only-change-this-random-secret-before-sharing-2026' }
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { throw 'Maven 3.9+ is required.' }
Push-Location (Join-Path $root 'backend')
try { mvn spring-boot:run; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } } finally { Pop-Location }
