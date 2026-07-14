[CmdletBinding()]
param(
  [string]$OwnerEmail = "",
  [string]$CampaignName = "",
  [string]$CampaignId = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$variableNames = @(
  "DEMO_SEED_CONFIRM",
  "DEMO_OWNER_EMAIL",
  "DEMO_CAMPAIGN_NAME",
  "DEMO_CAMPAIGN_ID"
)
$previousValues = @{}

if ([string]::IsNullOrWhiteSpace($OwnerEmail) -and [string]::IsNullOrWhiteSpace($CampaignId)) {
  throw 'Specify the Party Codex account: .\scripts\seed-demo.ps1 -OwnerEmail "account@example.com"'
}

foreach ($name in $variableNames) {
  $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

function Set-Or-ClearProcessVariable {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Value = ""
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    [Environment]::SetEnvironmentVariable($Name, $null, "Process")
  }
  else {
    [Environment]::SetEnvironmentVariable($Name, $Value.Trim(), "Process")
  }
}

Push-Location $repoRoot
try {
  Set-Or-ClearProcessVariable -Name "DEMO_SEED_CONFIRM" -Value "SEED_PARTY_CODEX_DEMO"
  Set-Or-ClearProcessVariable -Name "DEMO_OWNER_EMAIL" -Value $OwnerEmail.ToLowerInvariant()
  Set-Or-ClearProcessVariable -Name "DEMO_CAMPAIGN_NAME" -Value $CampaignName
  Set-Or-ClearProcessVariable -Name "DEMO_CAMPAIGN_ID" -Value $CampaignId

  Write-Host "Party Codex: loading demo campaign data for $($OwnerEmail.ToLowerInvariant())..." -ForegroundColor Cyan
  npm run demo:seed

  if ($LASTEXITCODE -ne 0) {
    throw "Demo seed failed with exit code $LASTEXITCODE."
  }

  Write-Host "Demo campaign data is ready." -ForegroundColor Green
}
finally {
  foreach ($name in $variableNames) {
    [Environment]::SetEnvironmentVariable($name, $previousValues[$name], "Process")
  }
  Pop-Location
}
