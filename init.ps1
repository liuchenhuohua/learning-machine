$ErrorActionPreference = "Stop"

function Invoke-HarnessCheck {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter()][string[]]$CommandArgs = @()
    )

    Write-Host "=== $Label ==="
    & $Command @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Write-Host "=== Learning Machine Harness Verification ==="
Invoke-HarnessCheck -Label "TypeScript typecheck" -Command "corepack" -CommandArgs @("pnpm", "typecheck")
Invoke-HarnessCheck -Label "Frontend tests" -Command "corepack" -CommandArgs @("pnpm", "test")
Invoke-HarnessCheck -Label "Production frontend build" -Command "corepack" -CommandArgs @("pnpm", "build")
Invoke-HarnessCheck -Label "Rust tests" -Command "cargo" -CommandArgs @("test", "--manifest-path", "src-tauri/Cargo.toml")
Write-Host "=== Verification complete ==="
Write-Host "Next steps: select exactly one active feature and keep the repository restartable."
Write-Host "Update feature_list.json, progress.md, and session-handoff.md before ending the session."
