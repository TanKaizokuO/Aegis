# Phase 1: Core Analysis Engine Implementation Prompt

**Context:**
You are tasked with building the core analysis engine for an Inclusive Language Linter. This system analyzes documents in Markdown, MDX, HTML, and Plain Text to detect insensitive or profane language.

**Objective:**
Implement the 4 programmatic API entry points, the `VirtualFile` data structure, and the core NLP/AST pipeline (Parsing, Bridging, and Analysis). Do not implement Configuration Filtering or the CLI in this phase.

**Requirements from Functional Specification:**

1. **Programmatic API (4 Analyzers):**
   - Implement `AnalyzeMarkdown` (Default Export): Ignores content inside inline code spans, code blocks, YAML/TOML frontmatter, and GFM extensions.
   - Implement `AnalyzeMDX`: Ignores JSX component tags/attributes and code expressions.
   - Implement `AnalyzeHTML`: Ignores `<script>`, `<style>`, HTML comments, tag attributes, and tag names. Only visible text nodes are analyzed.
   - Implement `AnalyzePlainText`: Treats everything as prose and analyzes all content.

2. **Data Structure (`VirtualFile`):**
   - Must support input properties: `Value` (required), `Path`, `Cwd`, `History`, `Data`.
   - Must support output properties: `Value`, `Path`, `Messages`, `History`, `Data`.
   - Implement the `DiagnosticMessage` structure (Line, Column, EndLine, EndColumn, Message, RuleId, Source, Severity='WARNING', ActualText, SuggestedReplacements).

3. **Analysis Pipeline:**
   - **Parse**: Generate a syntax tree for the respective format.
   - **Bridge**: Extract human-readable prose into a natural-language syntax tree, discarding format-specific syntax according to the analyzer used.
   - **Analyze**: Run two rule engines left-to-right on the natural language tree:
     - *Equality Analysis*: Find insensitive terms and suggest neutral alternatives. Must handle longest-match precedence for multi-word phrases. Must skip literal/quoted words.
     - *Profanity Analysis*: Find profane words and assign a sureness rating (0, 1, or 2). Must handle longest-match precedence.

4. **State Management:**
   - Ensure the API is entirely stateless.
   - Rule dictionaries should be immutable and loaded once.
   - Use `VirtualFile` as the transient state container during a single analysis pass.

**Task:**
Please write the source code to implement these core analysis functions, data structures, and the parsing/analysis pipelines.
