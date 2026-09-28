#!/usr/bin/env bash
set -euo pipefail

echo "=== Learning Machine Harness Verification ==="

echo "=== TypeScript typecheck ==="
corepack pnpm typecheck

echo "=== Frontend tests ==="
corepack pnpm test

echo "=== Production frontend build ==="
corepack pnpm build

echo "=== Rust tests ==="
cargo test --manifest-path src-tauri/Cargo.toml

echo "=== Verification complete ==="
echo "Next steps: select exactly one active feature and keep the repository restartable."
echo "Update feature_list.json, progress.md, and session-handoff.md before ending the session."
