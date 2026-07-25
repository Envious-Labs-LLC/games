import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Crawl-stage lint. At Walk, add eslint-plugin-boundaries to enforce the
// sim/view dependency rule (src/sim must not import src/view or phaser).
// See .claude/knowledge/walk/sim-view-separation.md.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
