#!/usr/bin/env bash
# Three-way merges upstream pstack changes into the port: base is the pinned upstream file,
# theirs is the target upstream file, ours is the ported file. Conflicts get standard markers.
# Usage: scripts/sync-upstream.sh [target-ref]   (default: upstream/main)
set -euo pipefail
cd "$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit or stash local changes first.' >&2; exit 1; }
git fetch --quiet --no-tags upstream main
pinned=$(node -p 'require("./UPSTREAM.json").commit')
target=$(git rev-parse "${1:-upstream/main}")

# Upstream paths the port renames or replaces.
port_path() {
  case "$1" in
    pstack/plugin.json | pstack/.cursor-plugin/* | pstack/docs/harness/*) return 1 ;;
    pstack/skills/poteto-mode/references/bugbot-triage.md) echo plugins/pstack/skills/poteto-mode/references/review-bot-triage.md ;;
    pstack/*) echo "plugins/$1" ;;
  esac
}

conflicts=()
skipped=()
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
while IFS=$'\t' read -r status path; do
  if ! ours=$(port_path "$path"); then
    skipped+=("$path")
    continue
  fi
  case "$status" in
    A | M)
      if [[ "$status" == A ]]; then : > "$tmp/base"; else git show "$pinned:$path" > "$tmp/base"; fi
      git show "$target:$path" > "$tmp/theirs"
      mkdir -p "$(dirname "$ours")"
      if [[ ! -f "$ours" ]]; then
        cp "$tmp/theirs" "$ours"
        echo "added    $ours"
      elif cmp -s "$ours" "$tmp/theirs"; then
        echo "same     $ours"
      elif git merge-file -L port -L "upstream@${pinned:0:7}" -L "upstream@${target:0:7}" "$ours" "$tmp/base" "$tmp/theirs"; then
        echo "merged   $ours"
      else
        conflicts+=("$ours")
        echo "CONFLICT $ours"
      fi
      ;;
    D)
      rm -f "$ours"
      echo "deleted  $ours"
      ;;
  esac
done < <(git diff --name-status --no-renames "$pinned" "$target" -- pstack)

node scripts/codemod.mjs > /dev/null
for path in ${skipped[@]+"${skipped[@]}"}; do echo "review by hand (no direct counterpart): $path"; done
for path in ${conflicts[@]+"${conflicts[@]}"}; do echo "resolve: $path"; done
echo "Next: resolve conflicts, port new Cursor names per PORTING.md until scripts/check-native.mjs passes,"
echo "then set UPSTREAM.json to $target and bump the plugin version."
