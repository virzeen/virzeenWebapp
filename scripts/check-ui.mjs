#!/usr/bin/env node
// Virzeen UI guard: turns the rules in docs/ui/*.md into automatic checks.
// Usage:
//   node scripts/check-ui.mjs <file...>   check specific files
//   node scripts/check-ui.mjs --changed   check files changed vs HEAD (+ untracked)
//   node scripts/check-ui.mjs --all       check every UI file (CI)
// Escape hatch (use rarely, with a reason): put `ui-allow: <reason>` in a comment
// on the same line or the line directly above.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCOPES = ["apps/web/src/", "packages/ui/src/", "packages/emails/"];
const EXT = /\.(tsx|ts)$/;
const IGNORE = /(\.test\.|\.spec\.|\.d\.ts$|\/tokens\/)/;

const RULES = [
  {
    id: "no-hex-color",
    test: /(?<![\w&/="'])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?|oklch)\(/,
    msg: "Raw color value. Use a color token (text-ink, bg-surface, border-line, text-accent...). See docs/ui/design-tokens.md §1.",
  },
  {
    id: "no-arbitrary-tailwind",
    test: /(?<![\w-])(?!(?:aspect|grid-cols|grid-rows|supports|data|aria|group|peer)-\[)[a-z][a-z0-9-]*-\[[^\]\s]+\]/,
    msg: "Arbitrary Tailwind value. Use the token scale. Only aspect-[], grid-cols-[], grid-rows-[] are allowed. See docs/ui/design-tokens.md.",
  },
  {
    id: "no-inline-style",
    test: /\bstyle=\{\{/,
    msg: "Inline style for visual design. Use Tailwind token classes or a primitive variant.",
  },
  {
    id: "no-raw-img",
    test: /<img\b/,
    msg: "Raw <img>. Use <CloudImage> with alt, aspect ratio and sizes. See docs/ui/components-catalog.md.",
  },
  {
    id: "no-direct-next-image",
    test: /from\s+["']next\/image["']/,
    msg: "Import <CloudImage> instead of next/image directly.",
    allowFile: /cloud-image\.tsx$/,
  },
  {
    id: "no-manual-money",
    test: /toLocaleString\(|Intl\.NumberFormat|["'`>]\s*(?:Rs\.?|NPR)\s*[\d{$]/,
    msg: "Money formatted by hand. Render prices with <Price paisa={...} />.",
    allowFile: /(price|money)\.tsx?$/,
  },
  {
    id: "no-console",
    test: /\bconsole\.(log|debug|info)\(/,
    msg: "console.* in UI code. Remove it (server code uses the logger).",
  },
  {
    id: "no-dangerous-html",
    test: /dangerouslySetInnerHTML/,
    msg: "dangerouslySetInnerHTML is forbidden except in the sanitized RichText and JsonLd components. See docs/security/security-policy.md §4.",
    allowFile: /(rich-text|json-ld)\.tsx$/,
  },
  {
    id: "no-click-on-div",
    test: /<(?:div|span|li|img)\b[^>]*\bonClick=/,
    msg: "onClick on a non-interactive element. Use <Button> or <Link> so it works with keyboard and screen readers.",
  },
  {
    id: "no-index-key",
    test: /key=\{\s*(?:i|index|idx)\s*\}/,
    msg: "Array index used as React key. Use a stable id.",
  },
];

const FILE_RULES = [
  {
    id: "client-imports-server",
    applies: (path, src) => path.includes("/client/") || /^\s*["']use client["']/m.test(src),
    test: /from\s+["'](?:@\/server\/(?!actions\/)|@virzeen\/core|@virzeen\/db)/,
    msg: "Client code imports server-only code. Client may import only Server Actions from @/server/actions; pass data as props. See docs/architecture.md.",
  },
  {
    id: "no-fetch-in-effect",
    applies: () => true,
    test: /useEffect\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]{0,400}?\bfetch\(/,
    msg: "Data fetched in useEffect. Fetch on the server (server/queries) and pass props. See docs/ui/ui-discipline.md §5.",
  },
  {
    id: "use-client-on-page",
    applies: (path) => /\/app\/.*\/(page|layout)\.tsx$/.test(path),
    test: /^\s*["']use client["']/m,
    msg: "'use client' on a page/layout. Keep pages as Server Components; move interactivity to a small client leaf.",
  },
  {
    id: "cloudimage-missing-alt",
    applies: () => true,
    test: /<CloudImage\b(?![^>]*\balt=)[^>]*\/?>/,
    msg: '<CloudImage> without alt. Add descriptive alt text (or alt="" if decorative).',
  },
];

const inScope = (p) => SCOPES.some((s) => p.startsWith(s)) && EXT.test(p) && !IGNORE.test(p);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    statSync(full).isDirectory() ? walk(full, out) : out.push(relative(ROOT, full).split(sep).join("/"));
  }
  return out;
}

function changedFiles() {
  const run = (cmd) => {
    try {
      return execSync(cmd, { encoding: "utf8" });
    } catch {
      return "";
    }
  };
  return [
    ...new Set(
      (run("git diff --name-only HEAD") + run("git ls-files --others --exclude-standard"))
        .split("\n")
        .filter(Boolean),
    ),
  ];
}

const args = process.argv.slice(2);
let files;
if (args.includes("--all")) files = SCOPES.flatMap((s) => walk(join(ROOT, s)));
else if (args.includes("--changed")) files = changedFiles();
else files = args.map((f) => relative(ROOT, f).split(sep).join("/"));
files = files.filter((f) => inScope(f) && existsSync(f));

const allowed = (lines, i) => /ui-allow:/.test(lines[i]) || (i > 0 && /ui-allow:/.test(lines[i - 1]));
const problems = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line) && !/ui-allow/.test(line)) return; // skip comments
    for (const r of RULES) {
      if (r.allowFile?.test(file)) continue;
      if (r.test.test(line) && !allowed(lines, i)) problems.push(`${file}:${i + 1}  [${r.id}] ${r.msg}`);
    }
  });
  for (const r of FILE_RULES) {
    if (!r.applies(file, src)) continue;
    const m = r.test.exec(src);
    if (m) {
      const lineNo = src.slice(0, m.index).split("\n").length;
      if (!allowed(lines, lineNo - 1)) problems.push(`${file}:${lineNo}  [${r.id}] ${r.msg}`);
    }
  }
}

if (problems.length) {
  console.error(`UI guard found ${problems.length} problem(s):\n` + problems.join("\n"));
  process.exit(1);
}
if (!args.includes("--quiet")) console.log(`UI guard: ${files.length} file(s) checked, no problems.`);
