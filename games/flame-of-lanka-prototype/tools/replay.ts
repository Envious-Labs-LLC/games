// Re-runs a recorded game from a replay file and asserts the outcome
// reproduces. Implement alongside the replay format (seed + input stream).
// See .claude/knowledge/walk/determinism-and-replay.md. Usage: pnpm replay <file>

const file = process.argv[2];
if (!file) {
  console.error("usage: pnpm replay <replay-file.json>");
  process.exit(2);
}
console.log(`replay — not yet implemented in this template. File: ${file}`);
console.log("Add the replay format and re-run loop per walk/determinism-and-replay.md.");
process.exit(0);
