#!/bin/bash
# PreToolUse (Bash, git *): blocks unsafe git operations. Exit 2 = block, stderr goes to Claude.
input=$(cat)
cmd=$(node "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/lib/json-get.cjs" tool_input.command <<<"$input")
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
branch=$(git branch --show-current 2>/dev/null)

block() { echo "BLOCKED by .claude/hooks/guard-git.sh: $1" >&2; exit 2; }

if grep -Eq 'git[[:space:]]+commit' <<<"$cmd"; then
  grep -Eq -- '--no-verify|(^|[[:space:]])-n([[:space:]]|$)' <<<"$cmd" && \
    block "--no-verify is not allowed. Fix the failing checks instead (see docs/testing/testing-strategy.md)."
  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    block "Do not commit on main. Create a branch: git switch -c feat/<short-name> (see docs/conventions.md)."
  fi
fi

if grep -Eq 'git[[:space:]]+push' <<<"$cmd"; then
  grep -Eq -- '--force|(^|[[:space:]])-f([[:space:]]|$)|--no-verify' <<<"$cmd" && \
    block "Force push and --no-verify are not allowed."
  grep -Eq '[[:space:]](main|master)([[:space:]]|$)' <<<"$cmd" && \
    block "Never push directly to main. Push your feature branch and open a pull request."
fi

grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-z]*f' <<<"$cmd" && \
  block "Destructive git command. Ask the owner before discarding work."

exit 0
