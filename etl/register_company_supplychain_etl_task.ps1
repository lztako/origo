param(
  [string]$TaskName = "CompanySupplychainETL",
  [string]$InputPath = "",
  [string]$RunScriptPath = "",
  [string]$Time = "02:00",
  [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($RunScriptPath)) {
  $RunScriptPath = Join-Path $scriptDir "run_company_supplychain_etl.ps1"
}

if ([string]::IsNullOrWhiteSpace($InputPath)) {
  $InputPath = Join-Path $scriptDir "input\company_supplychain.json"
}

if (!(Test-Path $RunScriptPath)) {
  throw "Run script not found: $RunScriptPath"
}

$inputDir = Split-Path -Parent $InputPath
if (!(Test-Path $inputDir)) {
  New-Item -ItemType Directory -Path $inputDir -Force | Out-Null
}

$reportDir = Join-Path $scriptDir "logs"
if (!(Test-Path $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportPath = Join-Path $reportDir "company_supplychain_last_run.json"
$argText = "-NoProfile -ExecutionPolicy Bypass -File `"$RunScriptPath`" -InputPath `"$InputPath`" -PythonExe `"$PythonExe`" -ReportPath `"$reportPath`""

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argText
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "Scheduled task '$TaskName' updated."
Write-Host "Run script: $RunScriptPath"
Write-Host "Input path: $InputPath"
Write-Host "Report path: $reportPath"
