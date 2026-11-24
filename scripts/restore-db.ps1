[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
  throw "Set DATABASE_URL before restoring a backup."
}
if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
  throw "Backup file not found: $BackupFile"
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
if ($PSCmdlet.ShouldProcess($env:DATABASE_URL, "Replace database contents from $resolvedBackup")) {
  $temporaryDump = [System.IO.Path]::GetTempFileName()
  try {
    Remove-Item -LiteralPath $temporaryDump -Force
    & node (Join-Path $PSScriptRoot "backup-crypto.mjs") decrypt $resolvedBackup $temporaryDump
    if ($LASTEXITCODE -ne 0) {
      throw "Backup decryption failed with exit code $LASTEXITCODE."
    }
    & pg_restore --clean --if-exists --no-owner --dbname="$env:DATABASE_URL" $temporaryDump
    if ($LASTEXITCODE -ne 0) {
      throw "pg_restore failed with exit code $LASTEXITCODE."
    }
  } finally {
    if (Test-Path -LiteralPath $temporaryDump -PathType Leaf) {
      Remove-Item -LiteralPath $temporaryDump -Force
    }
  }
}
