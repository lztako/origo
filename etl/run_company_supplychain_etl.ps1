param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$SnapshotId = "",
  [string]$SnapshotPrefix = "run",
  [int]$ChunkSize = 500,
  [switch]$Append,
  [switch]$DryRun,
  [string]$ReportPath = "",
  [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$etlScript = Join-Path $scriptDir "company_supplychain_etl.py"

if (!(Test-Path $etlScript)) {
  throw "ETL script not found: $etlScript"
}

if (!(Test-Path $InputPath)) {
  throw "Input file not found: $InputPath"
}

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL)) {
  throw "Missing environment variable SUPABASE_URL"
}

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
  throw "Missing environment variable SUPABASE_SERVICE_ROLE_KEY"
}

$argsList = @(
  $etlScript,
  "--input", $InputPath,
  "--supabase-url", $env:SUPABASE_URL,
  "--service-role-key", $env:SUPABASE_SERVICE_ROLE_KEY,
  "--snapshot-prefix", $SnapshotPrefix,
  "--chunk-size", "$ChunkSize"
)

if (-not [string]::IsNullOrWhiteSpace($SnapshotId)) {
  $argsList += @("--snapshot-id", $SnapshotId)
}

if ($Append) {
  $argsList += "--append"
}

if ($DryRun) {
  $argsList += "--dry-run"
}

if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
  $argsList += @("--report", $ReportPath)
}

& $PythonExe @argsList

if ($LASTEXITCODE -ne 0) {
  throw "ETL failed with exit code $LASTEXITCODE"
}
