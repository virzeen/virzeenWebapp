// Reads hook JSON from stdin and prints the value at a dotted path, e.g. "tool_input.command".
// Uses Node (already required by the project) so hooks don't depend on jq.
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  try {
    const value = process.argv[2]
      .split(".")
      .reduce((obj, key) => (obj == null ? undefined : obj[key]), JSON.parse(raw));
    process.stdout.write(value == null ? "" : String(value));
  } catch {
    process.stdout.write("");
  }
});
