#!/bin/bash
# SessionStart: plain-text stdout is added to Claude's context.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
branch=$(git branch --show-current 2>/dev/null); branch=${branch:-unknown}
echo "Current git branch: ${branch}"
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "The current branch is main. Work must happen on a feat/, fix/ or chore/ branch."
fi
changed=$(git status --porcelain 2>/dev/null | head -20)
if [ -n "$changed" ]; then
  echo "Uncommitted changes exist:"
  echo "$changed"
fi
echo ""
echo "Project status (docs/STATUS.md):"
if [ -f docs/STATUS.md ]; then
  head -c 6000 docs/STATUS.md
else
  echo "docs/STATUS.md is missing."
fi
echo ""
echo "This project follows the task protocol in CLAUDE.md section 2 and the routing table in section 3."
exit 0
