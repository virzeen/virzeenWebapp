#!/bin/bash
# Stop: before Claude finishes, run checks on affected packages.
# Exit 2 keeps Claude working and shows it the failure.
input=$(cat)
active=$(node "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/lib/json-get.cjs" stop_hook_active <<<"$input")
# Avoid infinite loops: if Claude is already continuing because of this hook, let it stop.
[ "$active" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
changes=$(git status --porcelain 2>/dev/null)
[ -z "$changes" ] && exit 0   # nothing changed (e.g. a question): nothing to verify

code_changed=$(grep -E '(apps|packages)/' <<<"$changes")
[ -z "$code_changed" ] && exit 0

out=$(node scripts/check-ui.mjs --changed --quiet 2>&1)
if [ $? -ne 0 ]; then
  echo "UI guard failed. Fix before finishing:" >&2
  echo "$out" | tail -40 >&2
  exit 2
fi

out=$(pnpm turbo run typecheck lint test --affected --output-logs=errors-only 2>&1)
if [ $? -ne 0 ]; then
  echo "Checks failed. The task is not done until typecheck, lint and tests pass:" >&2
  echo "$out" | tail -60 >&2
  exit 2
fi

if ! grep -q 'docs/STATUS.md' <<<"$changes"; then
  echo "Code changed but docs/STATUS.md was not updated. Record what changed and what is next (CLAUDE.md protocol step 10)." >&2
  exit 2
fi
exit 0
