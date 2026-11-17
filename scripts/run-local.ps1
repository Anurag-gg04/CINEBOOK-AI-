[CmdletBinding()]
param(
    [switch]$Docker,
    [switch]$Direct
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if ($Docker -and $Direct) {
    throw 'Choose either -Docker or -Direct, not both.'
}

function Test-DockerEngine {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
    docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Get-JavaMajorVersion {
    $versionText = (& java -version 2>&1 | Out-String)
    if ($versionText -match 'version\s+"1\.(\d+)') { return [int]$Matches[1] }
    if ($versionText -match 'version\s+"(?<major>\d+)') { return [int]$Matches['major'] }
    if ($versionText -match 'openjdk\s+(?<major>\d+)') { return [int]$Matches['major'] }
    throw "Could not determine the Java version from: $versionText"
}

# The Docker image pins Java 21 and avoids conflicts with a newer host JDK.
$useDocker = $Docker -or (-not $Direct -and (Test-DockerEngine))
if ($useDocker) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker is not installed or not on PATH. Install Docker Desktop, or use -Direct with Java, Maven, Node.js, and MySQL installed.'
    }
    if (-not (Test-DockerEngine)) {
        throw 'Docker is installed but the engine is not running. Start Docker Desktop and try again.'
    }
    Push-Location $root
    try {
        docker compose up --build
        if ($LASTEXITCODE -ne 0) { throw "Docker Compose exited with code $LASTEXITCODE." }
    }
    finally { Pop-Location }
    exit 0
}

# Direct mode accepts Java 21 or newer. Java 21 is the tested project target;
# Java 26 is not rejected just because it is newer than the configured target.
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw 'Java is missing. Install JDK 21 (recommended), or run this script with -Docker.'
}
$javaMajor = Get-JavaMajorVersion
if ($javaMajor -lt 21) { throw "JDK 21 or newer is required; detected Java $javaMajor." }
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    throw 'Maven is missing. Install Maven 3.9+ or use the Docker mode: .\scripts\run-local.ps1 -Docker'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22+ and npm 10+ are required for direct mode; use -Docker to avoid host tool setup.'
}
$nodeMajor = [int]((& node --version).Trim().TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw "Node.js 22 or newer is required; detected Node.js $nodeMajor." }

$mysqlReady = $false
try { $mysqlReady = Test-NetConnection -ComputerName 'localhost' -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue } catch { $mysqlReady = $false }
if (-not $mysqlReady) {
    throw 'MySQL is not reachable on localhost:3306. Start MySQL 8 and create the cinebook database/user, or use -Docker to start the full stack.'
}

$backendScript = Join-Path $PSScriptRoot 'Start-Backend.ps1'
$frontendScript = Join-Path $PSScriptRoot 'Start-Frontend.ps1'
Write-Host "Starting CineBook AI in separate PowerShell windows (Java $javaMajor detected)." -ForegroundColor Cyan
Write-Host 'Backend: http://localhost:8080 | Frontend: http://localhost:5173' -ForegroundColor Green
Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$backendScript`""
Start-Sleep -Seconds 2
Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$frontendScript`""
