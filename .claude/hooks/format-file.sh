#!/bin/bash
# PostToolUse (Edit|Write): format + lint + UI-guard the file Claude just changed.
# Exit 2 shows problems to Claude so it fixes them immediately.
input=$(cat)
file=$(node "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/lib/json-get.cjs" tool_input.file_path <<<"$input")
if [ -z "$file" ] || [ ! -f "$file" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
BIN=node_modules/.bin

# 1. Format (skipped until prettier is installed)
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.css|*.md|*.mdx|*.yml|*.yaml)
    if [ -x "$BIN/prettier" ]; then "$BIN/prettier" --write "$file" >/dev/null 2>&1; fi ;;
esac

# 2. Lint (skipped until eslint is installed)
case "$file" in
  *.ts|*.tsx|*.js|*.jsx)
    if [ -x "$BIN/eslint" ]; then
      out=$("$BIN/eslint" --fix "$file" 2>&1)
      if [ $? -ne 0 ]; then
        echo "ESLint errors in $file. Fix them before continuing:" >&2
        echo "$out" | tail -40 >&2
        exit 2
      fi
    fi ;;
esac

# 3. UI guard (tokens, images, money, client/server imports, a11y basics)
case "$file" in
  *apps/web/src/*.tsx|*apps/web/src/*.ts|*packages/ui/src/*.tsx|*packages/ui/src/*.ts)
    out=$(node scripts/check-ui.mjs "$file" --quiet 2>&1)
    if [ $? -ne 0 ]; then
      echo "$out" >&2
      echo "Fix these using docs/ui/design-tokens.md and docs/ui/components-catalog.md before continuing." >&2
      exit 2
    fi ;;
esac
exit 0
