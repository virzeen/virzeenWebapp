# UI review checklist

Go through this yourself, in the main session, before committing a larger change to components, pages or `packages/ui`. Never hand it to a subagent (owner rule 2026-11-11, CLAUDE.md §6).

1. Read `docs/ui/ui-discipline.md`.
2. Get changed files with `git diff --name-only main...HEAD`.
3. Flag: hex/rgb literals, arbitrary Tailwind values, inline visual styles, components that duplicate an existing primitive, primitives without stories, missing loading/empty/error states, `"use client"` on components that don't need it, missing alt text/labels, money not rendered via `<Price>`, images not via `<CloudImage>`, client code importing server code.

Report findings with file:line, the rule violated (doc section), and the fix, then fix them.
