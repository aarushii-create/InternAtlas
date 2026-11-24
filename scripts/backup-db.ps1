param(
  [string]$OutputDirectory = ".\backups"
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
  throw "Set DATABASE_URL before creating a backup."
}

$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDirectory "internatlas-$timestamp.dump"
$temporaryDump = [System.IO.Path]::GetTempFileName()
try {
  & pg_dump --format=custom --no-owner --file="$temporaryDump" $env:DATABASE_URL
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE."
  }
  & node (Join-Path $PSScriptRoot "backup-crypto.mjs") encrypt $temporaryDump $backupPath
  if ($LASTEXITCODE -ne 0) {
    throw "Backup encryption failed with exit code $LASTEXITCODE."
  }
} finally {
  if (Test-Path -LiteralPath $temporaryDump -PathType Leaf) {
    Remove-Item -LiteralPath $temporaryDump -Force
  }
}

$cutoff = (Get-Date).ToUniversalTime().AddDays(-30)
Get-ChildItem -LiteralPath $OutputDirectory -Filter "internatlas-*.dump" -File |
  Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }

Write-Output "Encrypted backup created: $((Resolve-Path $backupPath).Path)"
