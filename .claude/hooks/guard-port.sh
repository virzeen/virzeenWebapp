#!/bin/bash
# PreToolUse (Bash, PowerShell, Playwright MCP): port 3000 belongs to the owner's own `pnpm dev`.
# Exit 2 = block, stderr goes to Claude.
input=$(cat)
lib="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/lib/json-get.cjs"
text="$(node "$lib" tool_input.command <<<"$input") $(node "$lib" tool_input.url <<<"$input") $(node "$lib" tool_input.code <<<"$input")"

block() { echo "BLOCKED by .claude/hooks/guard-port.sh: $1" >&2; exit 2; }
msg="Port 3000 is the owner's dev server (CLAUDE.md §6). For your own checks run: NEXT_DIST_DIR=.next-agent pnpm --filter @virzeen/web exec next dev --port 3200, and use http://localhost:3200."

grep -Eiq '(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:3000)([^0-9]|$)|--port[ =]3000([^0-9]|$)|-p[ =]?3000([^0-9]|$)|:3000([^0-9]|$)|LocalPort[ ]+3000([^0-9]|$)' <<<"$text" && block "$msg"
grep -Eiq 'pnpm[[:space:]]+(run[[:space:]]+)?dev([[:space:]]|$)|pnpm[[:space:]]+--filter[[:space:]]+[^ ]+[[:space:]]+(run[[:space:]]+)?dev([[:space:]]|$)|turbo[[:space:]]+(run[[:space:]]+)?dev([[:space:]]|$)' <<<"$text" && block "'pnpm dev' starts on port 3000. $msg"
grep -Eiq '(rm|Remove-Item|rd|rmdir|del)[^|;&]*apps/web/\.next([[:space:]/\]|$)|(rm|Remove-Item|rd|rmdir|del)[^|;&]*apps\web\\.next([[:space:]/\]|$)' <<<"$text" && block "Do not delete apps/web/.next: the owner's dev server on 3000 uses it. Ask the owner."
exit 0
