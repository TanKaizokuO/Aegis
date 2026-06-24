# Comprehensive Functional Specification — Inclusive Language Linter

> **Clean-Room Document** — This specification describes *what* the system accomplishes in purely functional terms. It contains no source code, no original identifiers, and no pseudocode. A developer with zero knowledge of the original codebase can use this document to rebuild the functionality from scratch.

---

## 1. System Overview

The system is an **Inclusive Language Linter** that analyzes written documents and reports instances of insensitive, inconsiderate, or profane language. It supports four document formats — **Markdown**, **MDX**, **HTML**, and **Plain Text** — and can be consumed through either a **Programmatic API** or a **Command-Line Interface (CLI)**.

At its core, the system performs three activities:

1. **Parsing**: Converts the input document from its source format into a natural-language syntax tree, stripping away format-specific syntax (markup tags, code blocks, inline code spans, etc.) so that only human-readable prose is analyzed.
2. **Analysis**: Runs two independent rule engines over the natural-language tree:
   - **Equality Analysis** — Detects gender-biased, racially charged, ableist, condescending, or otherwise unequal phrasing and suggests neutral alternatives.
   - **Profanity Analysis** — Detects profane or potentially offensive words, each tagged with a confidence rating indicating how likely the word is to be profane.
3. **Filtering & Reporting**: Applies user-configured allow/deny rule lists and in-document control directives to suppress or limit which violations are reported. Produces a sorted collection of diagnostic messages attached to the original document.

---

## 2. Public API / Interface Contracts

The system exposes **four document-analysis functions** and one **CLI entry point**.

### 2.1 Programmatic API — Four Document Analyzers

All four functions share an identical signature and return type. They differ only in which document format parser is used.

---

#### 2.1.1 AnalyzeMarkdown (Default Export)

| Aspect | Detail |
|---|---|
| **Purpose** | Analyze a Markdown document for inclusive language violations. |
| **Alias** | This function is also the module's default export. |
| **Syntax Awareness** | Content inside inline code spans (`` ` ``), code blocks, YAML/TOML frontmatter, and GFM (GitHub Flavored Markdown) extensions is **ignored** and not analyzed. |

#### 2.1.2 AnalyzeMDX

| Aspect | Detail |
|---|---|
| **Purpose** | Analyze an MDX document (Markdown with embedded JSX components, v2 syntax). |
| **Syntax Awareness** | JSX component tags and code expressions are treated as syntax and ignored. Plain text content between component boundaries is analyzed. Attribute values on component tags are **not** analyzed. |

#### 2.1.3 AnalyzeHTML

| Aspect | Detail |
|---|---|
| **Purpose** | Analyze an HTML document for inclusive language violations. |
| **Syntax Awareness** | Content inside `<script>` elements, `<style>` elements, HTML comments, tag attributes, and tag names is **ignored**. Only visible text nodes are analyzed. |

#### 2.1.4 AnalyzePlainText

| Aspect | Detail |
|---|---|
| **Purpose** | Analyze a plain-text document. |
| **Syntax Awareness** | **None** — all content is treated as prose and is analyzed, including any characters that look like markup (backtick-wrapped words, asterisks, etc.). |

---

#### VirtualFile Data Structure

The **VirtualFile** is the core data container used for both input and output. When provided as input (instead of a plain string), it carries the document content along with optional metadata. When returned as output, it is enriched with diagnostic messages.

**Input Properties** (when constructing a VirtualFile to pass as the `Document` parameter):

| Property | Type | Required | Description |
|---|---|---|---|
| `Value` | String or Buffer | **Yes** | The raw text content of the document. This is the property the system reads to obtain the string to analyze. |
| `Path` | String | No | Relative or absolute file path associated with the document. Used for display purposes in diagnostic output (e.g., `"readme.md"`). Does not trigger filesystem reads — the content must still be supplied via `Value`. |
| `Cwd` | String | No | The current working directory to resolve `Path` against. Defaults to the process working directory. |
| `History` | Array of String | No | An ordered list of file paths representing the rename history of this file. The last entry is treated as the current `Path`. |
| `Data` | Object | No | An arbitrary key-value store for attaching custom metadata. Not read or modified by the analysis pipeline. |

**Output Properties** (present on the returned VirtualFile after analysis):

| Property | Type | Description |
|---|---|---|
| `Value` | String or Buffer | The original, unmodified document content (pass-through). |
| `Path` | String | The file path, if one was provided or inferred. |
| `Messages` | Array of **DiagnosticMessage** | Zero or more warnings found in the document, sorted by position. See below. |
| `History` | Array of String | The file path history, unchanged. |
| `Data` | Object | The metadata store, unchanged. |

> [!TIP]
> When a plain string is passed as the `Document` parameter, the system internally wraps it in a VirtualFile with `Value` set to that string and all optional properties left at their defaults.

#### Common Input Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Document` | String or VirtualFile | **Yes** | The document content to analyze. May be a raw string or a VirtualFile object (see above for its expected properties). |
| `Configuration` | Configuration Object, String Array, or absent | No | Controls which rules to apply. See §2.3 for full specification. |

#### Common Return Value

All four functions return a **VirtualFile** object containing the following key property:

| Property | Type | Description |
|---|---|---|
| `Messages` | Array of **DiagnosticMessage** | Zero or more warnings found in the document, sorted by position (line then column, ascending). |

Each **DiagnosticMessage** has the following fields:

| Field | Type | Description |
|---|---|---|
| `Line` | Integer | 1-based line number where the violation starts. |
| `Column` | Integer | 1-based column number where the violation starts. |
| `EndLine` | Integer | 1-based line number where the violation ends. |
| `EndColumn` | Integer | 1-based column number where the violation ends. |
| `Message` | String | Human-readable description of the violation and suggested replacement. |
| `RuleId` | String | A unique identifier for the specific rule that was triggered (e.g., a hyphenated pair like "he-she", "master-slave", "boogeyman-boogeywoman"). |
| `Source` | String | The analysis engine that produced the message. One of: `"EqualityAnalyzer"` or `"ProfanityAnalyzer"`. |
| `Severity` | Enum | Always `WARNING` (never `ERROR`). The system treats all violations as non-fatal warnings. |
| `ActualText` | String | The literal text fragment that triggered the rule. |
| `SuggestedReplacements` | Array of String | Zero or more suggested alternative words/phrases. |

---

### 2.2 Key Behavioral Differences Between Analyzers

| Scenario | Markdown | MDX | HTML | Plain Text |
|---|---|---|---|---|
| Word inside inline code (`` `word` ``) | **Ignored** | **Ignored** (if in Markdown context) | N/A | **Analyzed** |
| Word inside a code block | **Ignored** | **Ignored** | N/A | **Analyzed** |
| Word inside `<script>` | N/A | N/A | **Ignored** | **Analyzed** |
| Word inside `<style>` | N/A | N/A | **Ignored** | **Analyzed** |
| Word inside HTML comment | N/A | N/A | **Ignored** | **Analyzed** |
| Word inside an HTML attribute value | N/A | N/A | **Ignored** | **Analyzed** |
| Word inside YAML/TOML frontmatter | **Ignored** | Not processed | N/A | **Analyzed** |
| Word inside JSX component attributes | N/A | **Ignored** | N/A | **Analyzed** |
| In-document control directives (see §3.4) | **Supported** | **Supported** | **Not supported** | **Not supported** |

> [!IMPORTANT]
> The critical difference between Markdown/MDX analysis and Plain Text analysis is that the former **strips syntax** before analysis, meaning words inside code spans, code blocks, and frontmatter are invisible to the linter. Plain Text treats everything as prose.

---

### 2.3 Configuration Object Specification

The `Configuration` parameter accepts three forms:

#### Form 1: Array of Strings (Shorthand for Allow List)

A plain array of strings is interpreted as an **allow list** — the listed rule identifiers are suppressed.

#### Form 2: Configuration Object

| Field | Type | Default | Description |
|---|---|---|---|
| `AllowList` | Array of String | `undefined` | Rule identifiers to **skip** (suppress). When provided, all rules fire *except* those listed. |
| `DenyList` | Array of String | `undefined` | Rule identifiers to **exclusively report**. When provided, *only* the listed rules are reported; all others are suppressed. |
| `DisableBinaryPairs` | Boolean | `false` | When `true`, gendered word *pairs* (e.g., "he or she", "garbageman or garbagewoman") are treated as violations. When `false` (default), such compensating pairs are accepted as inclusive. |
| `ProfanityThreshold` | Integer (0, 1, or 2) | `0` | The minimum profanity confidence rating at which to report. See §3.2 for the rating scale. |

#### Form 3: Undefined / Absent

All rules are active. Binary pairs are allowed. Profanity threshold is 0 (report all profanity, including unlikely ones).

---

### 2.4 CLI Interface

The CLI provides a command-line entry point for batch-processing files from the filesystem.

#### Usage

```
InclusiveLinter [<glob> ...] [options ...]
```

#### Options

| Flag | Alias | Type | Description |
|---|---|---|---|
| `--version` | `-v` | Boolean | Print the current version and exit. |
| `--help` | `-h` | Boolean | Print usage information and exit. |
| `--stdin` | — | Boolean | Read document content from standard input instead of files. |
| `--text` | `-t` | Boolean | Treat all input as plain text (not Markdown). |
| `--html` | `-l` | Boolean | Treat all input as HTML (not Markdown). |
| `--mdx` | — | Boolean | Treat all input as MDX (not Markdown). |
| `--diff` | `-d` | Boolean | In CI environments, ignore lines that were not changed in the current push. |
| `--reporter=NAME` | — | String | Use a custom reporter module for output formatting. |
| `--quiet` | `-q` | Boolean | Suppress output for files with no issues. Only show files that have warnings. |
| `--why` | `-w` | Boolean | Include the source/origin of each warning in the output (verbose mode). |

#### File Discovery Behavior

| Condition | Behavior |
|---|---|
| Explicit file globs provided | Process exactly those files. |
| `--stdin` flag set | Read from standard input. No file globs allowed (see §4.2). |
| No files and no `--stdin` | **Auto-discovery mode**: Search the current directory, `doc/`, and `docs/` recursively for files matching the active format's extensions. Missing directories are silently ignored. |

#### Extension Mapping by Format

| Format | File Extensions Searched |
|---|---|
| Default (Markdown/Text) | `.txt`, `.text`, `.md`, `.markdown`, `.mkd`, `.mkdn`, `.mkdown`, `.ron` |
| HTML (`--html`) | `.htm`, `.html` |
| MDX (`--mdx`) | `.mdx` |

#### Configuration File Loading

The CLI automatically loads configuration from the filesystem using a hierarchical search:

| Source | Format | Description |
|---|---|---|
| `.aegisrc` | JSON | Configuration file (see §2.3, Form 2). |
| `.aegisrc.yml` / `.aegisrc.yaml` | YAML | Same fields as the JSON variant. |
| `.aegisrc.js` | JavaScript | Must export a configuration object. |
| `package.json` → `"aegis"` field | JSON | Inline configuration within the project manifest. |

Configuration files are searched **upward** from the directory containing each file being analyzed. The closest configuration file wins.

#### Ignore File

A file named `.aegisignore` can be placed in any ancestor directory of the working directory. Its format follows the same glob/pattern rules as standard ignore files (e.g., `.gitignore`). Files and directories matching these patterns are excluded from processing.

> [!NOTE]
> `node_modules` is always ignored by default, even without an explicit `.aegisignore` entry.

#### Exit Codes

| Code | Meaning |
|---|---|
| `0` | No warnings found in any processed file. |
| `1` | One or more warnings were found, **OR** a fatal error occurred. |

#### Output Format

By default, output is written to **stderr** in a human-readable format:

```
<filename>
  <startLine>:<startCol>-<endLine>:<endCol>  warning  <message>  <ruleId>  <source>

⚠ <N> warning(s)
```

When `--quiet` is active and a file has no issues, that file produces **no output at all** (not even a "no issues found" line).

When no issues are found and `--quiet` is not active, the output is:

```
<filename>: no issues found
```

---

## 3. Core Logic & Behavior

### 3.1 Analysis Pipeline

The system processes each document through a four-stage pipeline:

1. **Parse**: The document is parsed according to its format into a structured syntax tree.
   - For Markdown: Produces a Markdown AST supporting GFM tables, strikethrough, autolinks, task lists, and YAML/TOML frontmatter blocks.
   - For MDX: Produces a Markdown AST extended with JSX component nodes.
   - For HTML: Produces an HTML AST (DOM-like tree).
   - For Plain Text: Directly produces a natural-language syntax tree (no format parsing needed).

2. **Bridge to Natural Language**: For Markdown, MDX, and HTML, a bridge transformation extracts only the human-readable prose from the format-specific syntax tree and converts it into a natural-language (English) syntax tree. Code blocks, inline code, script/style elements, frontmatter, and attributes are discarded at this stage.

3. **Analyze**: Two analysis passes run over the natural-language tree:
   - **Equality Analysis**: Checks every word and phrase against a dictionary of insensitive terms. Each entry maps a problematic term to one or more suggested neutral alternatives, plus a rule identifier. When the dictionary contains both a multi-word phrase (e.g., "master server") and individual words within it (e.g., "master"), the longer multi-word match must take precedence and generate a single diagnostic message rather than multiple overlapping messages for the component words. The traversal proceeds left-to-right through the natural-language tree, consuming tokens greedily at the longest available match.
   - **Profanity Analysis**: Checks every word against a profanity dictionary. Each entry carries a **sureness rating** (0, 1, or 2) indicating how likely it is that the word is being used as profanity. The same longest-match-first precedence applies: if a multi-word profane phrase exists in the dictionary, it produces one diagnostic rather than per-word diagnostics.

4. **Filter and Sort**: Rule-filtering logic (allow/deny lists and in-document directives) is applied to remove suppressed messages. The remaining messages are sorted by source position (line number, then column number, ascending).

### 3.2 Profanity Sureness Rating Scale

| Rating | Meaning | Behavior |
|---|---|---|
| **0** | Unlikely to be profane (e.g., "beaver" — a common animal name) | Reported when `ProfanityThreshold ≤ 0` (the default). |
| **1** | Possibly profane (e.g., "addict" — dual-use word) | Reported when `ProfanityThreshold ≤ 1`. |
| **2** | Likely profane (e.g., explicit expletives) | Always reported when `ProfanityThreshold ≤ 2` (i.e., always). |

The message text varies by sureness:

| Rating | Message Pattern |
|---|---|
| 0 | "Be careful with `<word>`, it's profane in some cases" |
| 1–2 | "Don't use `<word>`, it's profane" |

### 3.3 Equality Analysis — Binary Pair Behavior

**Binary pairs** are compensating gendered phrases such as "he or she", "him or her", "garbageman or garbagewoman."

- When `DisableBinaryPairs` is **false** (default): Binary pairs are recognized and **not flagged** as violations (they demonstrate an effort to be inclusive).
- When `DisableBinaryPairs` is **true**: Binary pairs **are flagged**, and the system suggests a single gender-neutral alternative (e.g., "they" instead of "he or she").

### 3.4 In-Document Control Directives (Markdown & MDX Only)

Authors can suppress specific warnings directly within their document content using specially formatted HTML comments. Three directive types are supported:

#### 3.4.1 Ignore Directive

Suppresses the specified rules for the **next** content node only (e.g., the next paragraph).

**Format**: `<!--aegis ignore <ruleId1> [<ruleId2> ...]-->`

If no rule identifiers are specified, **all** rules are suppressed for the next node.

#### 3.4.2 Disable Directive

Suppresses the specified rules from this point **forward** until a corresponding Enable directive is encountered or the document ends.

**Format**: `<!--aegis disable <ruleId1> [<ruleId2> ...]-->`

If no rule identifiers are specified, **all** rules are disabled.

#### 3.4.3 Enable Directive

Re-enables rules that were previously disabled.

**Format**: `<!--aegis enable <ruleId1> [<ruleId2> ...]-->`

If no rule identifiers are specified, **all** rules are re-enabled.

> [!NOTE]
> In-document control directives are **only** available when using the Markdown or MDX analyzers, because they rely on the Markdown parser's ability to interpret HTML comments as control nodes. HTML and Plain Text analyzers do not support this mechanism.

### 3.5 Literal Word Detection

The equality analysis engine automatically skips words that are used in a **literal** or **quoted** context. Specifically:

- Words wrapped in quotation marks (e.g., `"he"`)
- Words at the start of a sentence followed by an em-dash (e.g., `He — ...`)
- Other syntactically literal usages

These are assumed to be intentional references rather than biased language.

---

## 4. Edge Cases & Error Handling

### 4.1 Mutually Exclusive Allow/Deny Lists

**Constraint**: The `AllowList` and `DenyList` fields are **mutually exclusive**. If both are provided simultaneously, the system **must** throw an error.

| Condition | Result |
|---|---|
| Both `AllowList` and `DenyList` are provided | **Error**: "Do not provide both allow and deny configuration parameters" |
| Only `AllowList` is provided | All rules fire except those in the list. |
| Only `DenyList` is provided | Only the listed rules fire; all others are suppressed. |
| Neither is provided | All rules fire. |

> [!WARNING]
> This validation is enforced at the filtering stage. The error is a synchronous, thrown exception — it halts processing immediately.

### 4.2 CLI: stdin with Globs

If `--stdin` is specified and file globs are also provided as arguments, the system **must** throw an error.

| Condition | Result |
|---|---|
| `--stdin` and glob arguments present | **Error**: "Do not pass globs with `--stdin`" |

### 4.3 Missing or Empty Input

| Condition | Result |
|---|---|
| Empty string passed to any analyzer | Returns a VirtualFile with an empty `Messages` array (no warnings). |
| Clean document (no violations) | Returns a VirtualFile with an empty `Messages` array. CLI prints `<filename>: no issues found` (unless `--quiet`). |

### 4.4 Non-existent Reporter

| Condition | Result |
|---|---|
| `--reporter=<name>` specifies a reporter module that cannot be found | Output: `Could not find reporter '<name>'`. Process exits with code 0. |

### 4.5 Unrecognized File Extensions

Files with extensions not in the active extension list are **silently skipped** during auto-discovery. If an explicit glob matches a file with an unusual extension, it is still processed using the active format parser.

### 4.6 Version Notification

On every CLI invocation, the system checks whether a newer version of the package is available. If an update exists, a non-blocking notification is displayed to the user.

---

## 5. State Management

### 5.1 Stateless Analysis

The programmatic API functions are **entirely stateless**. Each call:

- Receives an immutable input document
- Creates a fresh processing pipeline
- Returns a new VirtualFile with diagnostic messages

No global state, caches, or side effects are produced. Multiple calls can run concurrently without interference.

The dictionaries for Equality rules and Profanity rules are loaded into memory as **immutable, read-only lookups** at module initialization time. They are never modified, extended, or reloaded during analysis. All invocations of the analysis functions share the same in-memory dictionary instances without contention.

### 5.2 VirtualFile as Transient State Container

During a single analysis invocation, the **VirtualFile** object acts as a transient state container:

| Stage | State Change to VirtualFile |
|---|---|
| Construction | Initialized from the input string or file object. Contains the raw content and optional metadata (path, filename). Messages array is empty. |
| Parsing | The syntax tree is generated from the content. The tree is held in memory but not persisted on the VirtualFile. |
| Analysis | Each detected violation appends a DiagnosticMessage to the VirtualFile's `Messages` array. |
| Filtering | Messages matching suppressed rules (via allow/deny lists or in-document directives) are **removed** from the `Messages` array. |
| Sorting | The `Messages` array is reordered by position (line, then column, ascending). |
| Return | The VirtualFile is returned to the caller. Its `Messages` array is the final, filtered, sorted list of violations. |

### 5.3 CLI Configuration State

The CLI loads configuration **once per file** from the filesystem hierarchy. Configuration files are read synchronously at startup and are not watched for changes during execution. The configuration is passed into the analysis pipeline per-file and does not persist across files (each file may have its own configuration from its nearest ancestor configuration file).

### 5.4 No Persistent Storage

The system does **not**:

- Write any files (unless the `--output` flag is used, which is explicitly disabled in this system)
- Maintain a database or cache
- Store analysis results between invocations
- Modify the input documents in any way

The only external side-effects are:

1. Writing diagnostic output to stderr (CLI only)
2. Exiting the process with an appropriate exit code (CLI only)
3. Optionally displaying an update notification (CLI only)

---

## Appendix A: Rule Identifier Format

Rule identifiers follow a **hyphenated-pair** convention representing the problematic word and its counterpart or category. Examples:

| Rule Identifier | Triggers On | Category |
|---|---|---|
| `he-she` | "he", "she" | Gender bias |
| `her-him` | "his", "him", "her" | Gender bias |
| `master-slave` | "master", "slave" | Intolerant phrasing |
| `boogeyman-boogeywoman` | "boogeyman" | Gender bias |
| `dad-mom` | "pop" (among others) | Gender bias |
| `gimp` | "cripple" | Ableist language |
| `beaver` | "beaver" | Profanity (rating 0) |
| `butt` | "butt" | Profanity (rating 0) |
| `asshat` | "asshat" | Profanity (rating 2) |
| `slaves` | "slaves" | Profanity |

These identifiers are used in configuration files (allow/deny lists) and in-document control directives.

---

## Appendix B: Message Format Patterns

| Source | Pattern |
|---|---|
| Equality Analyzer | `` `<word>` may be insensitive, use `<alt1>`, `<alt2>` instead `` |
| Equality Analyzer (binary pair, when disabled) | `` `<word>` may be insensitive, use `<alt>` instead `` |
| Profanity Analyzer (rating ≥ 1) | `` Don't use `<word>`, it's profane `` |
| Profanity Analyzer (rating 0) | `` Be careful with `<word>`, it's profane in some cases `` |
| Equality Analyzer (referring to a person) | `` `<word>` may be insensitive, when referring to a person, use `<alt1>`, `<alt2>` instead `` |
