---
name: Use bun not npm
description: Project uses bun (has bun.lockb) — always use bun run/bunx instead of npm/npx
type: feedback
---

Use `bun run`, `bunx`, and `bun install` instead of `npm`, `npx`, and `npm install`.

**Why:** The project has a `bun.lockb` lockfile and was set up with bun. Using npm is inconsistent and slower.

**How to apply:** For any shell commands — builds, dev server, package installs, script execution — default to bun.
