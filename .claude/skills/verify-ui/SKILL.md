---
name: verify-ui
description: Visually and functionally verify Virzeen UI changes in a real browser with the Playwright MCP before calling a task done. Use after any change to pages, components, styles, forms, or client-side behavior, and whenever the user asks to "check", "test in browser", or "see if it works".
---

# Verify UI with Playwright MCP

Written tests prove logic; this proves the screen actually works and looks right.

1. Make sure the dev server is running at `http://localhost:3000` (start `pnpm dev` if not).
2. For each page or flow you changed:
   a. Navigate to it with the Playwright MCP.
   b. Take an accessibility snapshot. Check headings are in order, buttons/inputs have names, images have alt text.
   c. Resize to **360×800**, **768×1024**, **1280×800**. At each size: no horizontal scroll, nothing overlapping or cut off, primary action visible.
   d. Perform the user flow (click, type, submit). Confirm the loading state, then the success state. Trigger at least one error state (e.g. invalid input).
   e. Check the browser console: zero errors, zero failed network requests (except intentional test errors).
   f. Tab through the page: focus is visible and the order makes sense.
3. For anything using money, confirm prices display as `Rs 1,250` format and match the server totals.
4. Report results as a short table: page × viewport × pass/fail, plus any issues found.
5. Fix every issue, then re-run the affected checks. Only then mark the task done.
