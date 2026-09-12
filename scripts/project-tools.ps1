[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Push','Pull','Backup','Restore','Start','Build','Tree','Open')][string]$Action,
 [switch]$NoPause,
 [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$workspaceRoot = Split-Path -Parent $projectRoot
$backupRoot = Join-Path $workspaceRoot 'Backups'
$skipDirs = @('.git','node_modules','Backups','dist','out','.next','.vinext','.vite','.wrangler','.vercel','coverage','work','outputs')
function Get-Checksum {
 param([string]$FilePath)
 $stream=[IO.File]::OpenRead($FilePath)
 $algorithm=[Security.Cryptography.SHA256]::Create()
 try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','') }
 finally { $stream.Dispose(); $algorithm.Dispose() }
}
function Run-Git {
 param([string[]]$GitArgs)
 & git -C $projectRoot @GitArgs
 if ($LASTEXITCODE -ne 0) { throw "Git failed (exit $LASTEXITCODE). No further steps were run." }
}
function Run-Npm {
 param([string[]]$NpmArgs)
 & npm.cmd @NpmArgs
 if ($LASTEXITCODE -ne 0) { throw "npm failed (exit $LASTEXITCODE). No further steps were run." }
}
function Get-ProjectFiles {
 param([string]$Folder)
 foreach ($entry in Get-ChildItem -LiteralPath $Folder -Force) {
  if ($entry.PSIsContainer) {
   if ($entry.Name -notin $skipDirs) { Get-ProjectFiles -Folder $entry.FullName }
  } elseif ($entry.Extension -notin @('.log','.tmp','.tsbuildinfo') -and $entry.Name -ne 'Tree.md') { $entry }
 }
}
function Assert-Child {
 param([string]$Path,[string]$Parent)
 $resolved=[IO.Path]::GetFullPath($Path)
 $prefix=[IO.Path]::GetFullPath($Parent).TrimEnd('\')+'\'
 if (-not $resolved.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw "Path is outside the expected folder: $resolved" }
 return $resolved
}
function New-VerifiedBackup {
 $destination=Assert-Child -Path (Join-Path $backupRoot ('FP-AIMS_'+(Get-Date -Format 'yyyy-MM-dd_HHmmss_fff'))) -Parent $backupRoot
 if(Test-Path -LiteralPath $destination){throw 'A backup already exists with this timestamp.'}
 New-Item -ItemType Directory -Path $destination -Force | Out-Null
 Write-Host "Backing up FP AIMS to $destination"
 $files=@(Get-ProjectFiles -Folder $projectRoot)+@(Get-ChildItem -LiteralPath $workspaceRoot -Filter '*.bat' -File)
 $manifest=@()
 foreach($file in $files){
  $relative=if($file.DirectoryName -eq $workspaceRoot){$file.Name}else{$file.FullName.Substring($projectRoot.Length+1)}
  $target=Assert-Child -Path (Join-Path $destination $relative) -Parent $destination
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $target
  $sourceHash=(Get-Checksum -FilePath $file.FullName)
  if((Get-Checksum -FilePath $target) -ne $sourceHash){throw "Backup verification failed: $relative"}
  $manifest+=@{path=$relative;sha256=$sourceHash}
 }
 # Git history is stored as a portable bundle, separate from OneDrive's Git metadata.
 $bundle=Join-Path $destination 'history.bundle'
 Run-Git -GitArgs @('bundle','create',$bundle,'--all')
 Run-Git -GitArgs @('bundle','verify',$bundle)
 $commit=(& git -C $projectRoot rev-parse HEAD)
 if($LASTEXITCODE -ne 0){throw 'Could not read current commit.'}
 @{created=(Get-Date -Format o);project='FP-AIMS';commit=$commit;files=$manifest;bundleSha256=(Get-Checksum -FilePath $bundle)} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $destination 'backup-manifest.json') -Encoding UTF8
 'COMPLETE - source files SHA256 verified; Git history bundle verified.' | Set-Content -LiteralPath (Join-Path $destination 'BACKUP_COMPLETE.txt')
 Write-Host "Backup verified: $($files.Count) files plus Git history."
 return $destination
}
function Get-RestoreTarget {
 param([string]$RelativePath)
 # Existing flat backups used these same relative names for the launchers.
 if($RelativePath -notmatch '[\\/]' -and [IO.Path]::GetExtension($RelativePath) -eq '.bat') {
  return (Assert-Child -Path (Join-Path $workspaceRoot $RelativePath) -Parent $workspaceRoot)
 }
 return (Assert-Child -Path (Join-Path $projectRoot $RelativePath) -Parent $projectRoot)
}
$exitCode=0
Push-Location -LiteralPath $projectRoot
try {
 if(-not(Test-Path -LiteralPath (Join-Path $projectRoot 'package.json'))){throw 'FP AIMS package.json is missing.'}
 Write-Host "`nFP AIMS - $Action`n$projectRoot`n"
 switch($Action){
  'Push' {
   $branch=(& git branch --show-current)
   if($LASTEXITCODE -ne 0 -or $branch -ne 'main'){throw 'Push expects the main branch. Switch to main before using this launcher.'}
   Run-Npm -NpmArgs @('test')
   Run-Npm -NpmArgs @('run','build')
   $changes=(& git status --porcelain)
   if($LASTEXITCODE -ne 0){throw 'Could not inspect Git changes.'}
   if($changes){
    Run-Git -GitArgs @('add','--all')
    Run-Git -GitArgs @('-c','gc.auto=0','commit','-m',('Update FP AIMS '+(Get-Date -Format 'yyyy-MM-dd HH:mm')))
   }
   Run-Git -GitArgs @('push','origin','main')
   Write-Host 'Pushed. Vercel will publish any new app changes automatically.'
  }
  'Pull' {
   $changes=(& git status --porcelain)
   if($LASTEXITCODE -ne 0){throw 'Could not inspect Git changes.'}
   if($changes){throw 'There are uncommitted changes. Use Push.bat or save them before pulling.'}
   Run-Git -GitArgs @('pull','--ff-only')
   Run-Npm -NpmArgs @('ci')
   Run-Git -GitArgs @('status','--short','--branch')
  }
  'Backup' { $null=New-VerifiedBackup }
  'Restore' {
   $latest=Get-ChildItem -LiteralPath $backupRoot -Directory | Where-Object {$_.Name -match '^FP-AIMS_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}$' -and (Test-Path -LiteralPath (Join-Path $_.FullName 'BACKUP_COMPLETE.txt'))} | Sort-Object Name -Descending | Select-Object -First 1
   if(-not $latest){throw 'No completed backups were found.'}
   $source=Assert-Child -Path $latest.FullName -Parent $backupRoot
   $manifest=Get-Content -LiteralPath (Join-Path $source 'backup-manifest.json') -Raw | ConvertFrom-Json
   if($manifest.project -ne 'FP-AIMS'){throw 'This backup is not an FP AIMS backup.'}
   foreach($entry in $manifest.files){
    $file=Assert-Child -Path (Join-Path $source $entry.path) -Parent $source
    $null=Get-RestoreTarget -RelativePath $entry.path
    if(($entry.path -split '[\\/]')[0] -in $skipDirs){throw 'Backup contains an excluded directory.'}
    if((Get-Checksum -FilePath $file) -ne $entry.sha256){throw "Damaged backup: $($entry.path)"}
   }
   if((Get-Checksum -FilePath (Join-Path $source 'history.bundle')) -ne $manifest.bundleSha256){throw 'Git history bundle checksum does not match.'}
   Write-Host "Restore source: $source"
   Write-Host 'Restore replaces backed-up project files, preserves .git and .env files, and leaves newer extra files in place.'
   Write-Host 'A verified safety backup is created first. Nothing is pushed to GitHub automatically.'
   if($DryRun){Write-Host 'DRY RUN PASSED - backup verified; no files changed.';break}
   if((Read-Host 'Type RESTORE to continue') -cne 'RESTORE'){Write-Host 'Restore cancelled.';break}
   $null=New-VerifiedBackup
   foreach($entry in $manifest.files){
    if((Split-Path -Leaf $entry.path) -like '.env*'){continue}
    # Keep the layout-aware restore implementation when recovering an older flat-layout backup.
    if($entry.path.Replace('\','/') -eq 'scripts/project-tools.ps1'){continue}
    $target=Get-RestoreTarget -RelativePath $entry.path
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $source $entry.path) -Destination $target -Force
    if([IO.Path]::GetDirectoryName($target) -eq $workspaceRoot -and [IO.Path]::GetExtension($target) -eq '.bat') {
     $launcher=Get-Content -LiteralPath $target -Raw
     $launcher=$launcher.Replace('%~dp0scripts\project-tools.ps1','%~dp0FP_Aims\scripts\project-tools.ps1')
     Set-Content -LiteralPath $target -Value $launcher -Encoding ascii
    }
   }
   Run-Npm -NpmArgs @('ci')
   Run-Npm -NpmArgs @('test')
   Run-Npm -NpmArgs @('run','build')
   Run-Git -GitArgs @('status','--short')
   Write-Host 'Restore complete. Review local changes before using Push.bat.'
  }
  'Start' {
   if(-not(Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))){Run-Npm -NpmArgs @('ci')}
   Write-Host 'When Vite is ready, use http://localhost:5180 in your browser. Press Ctrl+C to stop.'
   Run-Npm -NpmArgs @('run','dev','--','--port','5180','--strictPort')
  }
  'Build' { Run-Npm -NpmArgs @('test'); Run-Npm -NpmArgs @('run','build') }
  'Tree' {
   $lines=@(Get-ProjectFiles -Folder $projectRoot | ForEach-Object {$_.FullName.Substring($projectRoot.Length+1).Replace('\','/')} | Sort-Object)
   @('# FP AIMS file tree','','```text','FP-Aims/',$lines,'```') | Set-Content -LiteralPath (Join-Path $projectRoot 'Tree.md') -Encoding UTF8
   Write-Host 'Updated Tree.md.'
  }
  'Open' { Start-Process 'https://fp-aims.vercel.app/' }
 }
} catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; $exitCode=1 }
finally { Pop-Location }
if(-not $NoPause){Read-Host 'You can close this window' | Out-Null}
exit $exitCode
