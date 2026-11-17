[CmdletBinding()]
param(
    [switch]$Docker,
    [switch]$Direct
)

$ErrorActionPreference = 'Stop'
if ($Docker -and $Direct) { throw 'Choose either -Docker or -Direct, not both.' }
$launcher = Join-Path $PSScriptRoot 'run-local.ps1'
if ($Docker) { & $launcher -Docker }
elseif ($Direct) { & $launcher -Direct }
else { & $launcher }
