# Aegis

## Overview
**Vision/Goal:** Aegis is an Inclusive Language Linter that analyzes written documents (Markdown, MDX, HTML, Plain Text) to detect and report instances of insensitive, biased, or profane language, suggesting neutral alternatives.

**Current Status:** Active Development (v1.0.0)

## Tech Stack
**Language/Runtime:** Node.js (Requires v18+ for the native `node --test` runner), using ES Modules.

**Frameworks/Libraries:** 
- **unified** ecosystem (remark/rehype) for AST-based document parsing.

**Key Dependencies:**
- `remark-parse`, `remark-gfm`, `remark-mdx`, `rehype-parse`: Format-specific syntax parsers.
- `unist-util-visit`: AST traversal and node visiting.
- `cosmiconfig`: Configuration file resolution.
- `mri`, `fast-glob`, `ignore`: CLI argument parsing, file discovery, and ignore pattern matching.
- `acorn`: JavaScript parser (likely used for MDX expressions).

## Directory Structure
```text
Aegis/
├── bin/
│   └── aegis.js            (CLI entry point)
├── src/
│   ├── cli/                (CLI logic and file discovery)
│   ├── dictionaries.js     (Immutable dictionaries for rules and terms)
│   ├── nlp-bridge.js       (AST-to-natural-language translation layer)
│   ├── rules-engine.js     (Core equality and profanity rule engines)
│   └── virtual-file.js     (Data container for files and diagnostics)
├── test/                   (Native Node.js test suite)
├── index.js                (Programmatic API exports)
├── Functional_specs.md     (Clean-room functional specifications)
└── package.json            (Project manifest)
```

## Core Logic & Data Flow
1. **Parsing & Bridging:** The `Document` input is wrapped into a `VirtualFile`. Format-specific parsers (Markdown, MDX, HTML) generate a syntax tree. A bridge layer strips away syntax (code blocks, attributes, scripts) and extracts only human-readable prose into a natural-language syntax tree.
2. **Rule Analysis:** The natural-language tree is processed left-to-right by two stateless engines:
   - *Equality Analysis:* Flags biased/unequal phrasing using a longest-match-first strategy and suggests alternatives.
   - *Profanity Analysis:* Checks words against a rated dictionary (0-2 sureness) to detect potentially offensive terms.
3. **Filtering & Reporting:** The generated diagnostic messages are filtered against user configurations (Allow/Deny lists) and in-document directives (e.g., `<!--aegis ignore-->`). Remaining warnings are sorted by position and appended to the `VirtualFile`, which is returned to the user or formatted by the CLI.

## Environment & Setup
**Prerequisites:** 
- Node.js v18 or higher.

**Setup & Execution:**
- Install dependencies: `npm install`
- Run programmatic tests: `npm test`
- Run via CLI: `node ./bin/aegis.js <glob> [options]`
- Configuration is automatically loaded via `cosmiconfig` (e.g., `.aegisrc`, `.aegisrc.yml`, or `package.json`'s `aegis` field).

## Development Conventions
- **Stateless Architecture:** The programmatic API is entirely stateless. In-memory dictionaries are read-only. No global state, caches, or files are written. 
- **Transient State Container:** The `VirtualFile` object acts as the transient state passed through the analysis pipeline, cleanly separating inputs from the generated diagnostic output.
- **Rule Identifiers:** Diagnostic rules follow a hyphenated-pair convention (e.g., `master-slave`, `he-she`) for easy configuration and targeting.
- **Module System:** Strict use of ES Modules (`"type": "module"`).

## Known Issues / Debt
- **Contextual Limitations:** The system relies on string-matching and longest-match-first algorithms. While it excludes literals and code syntax, it lacks deep NLP contextual understanding, which can lead to false positives (e.g., dual-use words).
- **Static Profanity Ratings:** Profanity relies on a hardcoded 0-2 sureness scale that may not scale across different dialects or specialized contexts without ML models.
- **No Auto-Fixing:** The engine is read-only. It generates diagnostics and suggests replacements but currently lacks a `--fix` capability to automatically rewrite AST nodes.
- **Rigid Binary Pairs:** The `DisableBinaryPairs` logic rigidly flags phrases like "he or she" to enforce "they", which might conflict with specific legal or localized compliance guidelines.
