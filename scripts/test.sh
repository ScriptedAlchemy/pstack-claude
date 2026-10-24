#!/usr/bin/env bash
set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"
node scripts/check-native.mjs
if command -v claude >/dev/null; then
  claude plugin validate .
  claude plugin validate plugins/pstack
else
  echo 'skip: claude plugin validate (claude is not on PATH)'
fi
node --test plugins/pstack/skills/statechart/scripts/test/statechart.test.mjs
scripts=plugins/pstack/skills/poteto-mode/scripts
if [[ ! -d "$scripts/node_modules" ]]; then
  echo "Run bun install --frozen-lockfile in $scripts first." >&2
  exit 1
fi
(cd "$scripts" && bun run test && bun run typecheck)
