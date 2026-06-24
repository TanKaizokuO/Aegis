# Phase 3: CLI & Edge Cases Implementation Prompt

**Context:**
You are completing the Inclusive Language Linter by adding the Command-Line Interface (CLI) and addressing specific edge cases. This CLI will batch-process files using the core engine (Phase 1) and configuration (Phase 2).

**Objective:**
Implement the CLI entry point, file discovery, configuration file loading, output formatting, and specific error handling cases as outlined in the spec.

**Requirements from Functional Specification:**

1. **CLI Usage & Options:**
   - Implement the `InclusiveLinter` command.
   - Support flags: `--version`, `--help`, `--stdin`, `--text`, `--html`, `--mdx`, `--diff`, `--reporter`, `--quiet`, `--why`.

2. **File Discovery:**
   - Process explicit globs if provided.
   - If `--stdin` is set, read from standard input.
   - If no globs and no `--stdin`, auto-discover files in the current directory, `doc/`, and `docs/` matching the active format extensions.
   - Respect `.aegisignore` pattern matching (and always ignore `node_modules`).

3. **Configuration Loading:**
   - Search upwards for `.aegisrc`, `.aegisrc.yml`, `.aegisrc.yaml`, `.aegisrc.js`, or `package.json` ("aegis" field).
   - Load and apply configuration per-file dynamically.

4. **Output & Exit Codes:**
   - Format default output to stderr: `<filename>\n  <startLine>:<startCol>-<endLine>:<endCol>  warning  <message>  <ruleId>  <source>\n\n⚠ <N> warning(s)`
   - Handle `--quiet`: No output for clean files. If `--quiet` is off, print `<filename>: no issues found` for clean files.
   - Exit Code `0`: No warnings found. Exit Code `1`: Warnings found or a fatal error occurred.

5. **Edge Cases & Error Handling:**
   - Empty input string: Return empty messages array.
   - `--stdin` with globs: Throw error "Do not pass globs with `--stdin`".
   - Non-existent reporter (`--reporter=<name>`): Print `Could not find reporter '<name>'` and exit `0`.
   - Unrecognized extensions: Silently skip during auto-discovery.

6. **State & Notifications:**
   - Add a version check to notify the user if a newer version of the package is available (non-blocking).
   - Ensure the CLI maintains no persistent storage or side effects other than stdout/stderr.

**Task:**
Please write the CLI implementation, configuration resolution logic, file discovery logic, and output formatting to complete the project.
