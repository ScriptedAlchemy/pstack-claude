#!/usr/bin/env bash
# Lists upstream pstack changes since the reviewed pin. Changes no plugin file and never advances the pin.
set -euo pipefail
cd "$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
expected_url=https://github.com/cursor/plugins.git
actual_url=$(git remote get-url upstream 2>/dev/null) || {
  echo "Missing upstream. Run: git remote add upstream $expected_url" >&2
  exit 1
}
if [[ "$actual_url" != "$expected_url" ]]; then
  echo "Refusing unexpected upstream URL: $actual_url" >&2
  exit 1
fi
pinned=$(node -p 'require("./UPSTREAM.json").commit')
[[ "$pinned" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid pinned commit in UPSTREAM.json.' >&2; exit 1; }
git fetch --quiet --no-tags upstream main
git cat-file -e "$pinned^{commit}"
if git diff --quiet "$pinned" upstream/main -- pstack; then
  echo "No upstream pstack changes since $pinned."
  exit 0
fi
echo "Upstream pstack changes since $pinned:"
git log --oneline "$pinned..upstream/main" -- pstack
git diff --stat "$pinned" upstream/main -- pstack
echo 'Review required. Follow UPDATING.md.'
