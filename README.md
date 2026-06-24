# Aegis Linter

A fast, stateless, Alex-compatible Markdown, MDX, HTML, and Plain Text linter designed to enforce inclusive language with no false positives across block boundaries.

## Features
- **Multi-Format Support**: Natively parses Markdown, MDX, HTML, and Plain Text.
- **Smart Ignore Directives**: Supports in-document ignore comments (e.g. `<!--aegis ignore-->`, `<!--aegis disable-->`, `<!--aegis enable-->`).
- **Fast Execution**: Implements explicit glob expansion and intelligent auto-discovery to prevent runaway recursive searches.
- **Standard Input (`stdin`)**: Read and format piped text natively.
- **Configuration**: Fully configurable via `.aegisrc` using `cosmiconfig`.
- **Non-blocking Version Checks**: Checks for updates gracefully without slowing down CI pipelines or local workflows.

## Installation

Install globally using `npm`:

```bash
npm install -g aegis-linter-core
```

Or install as a devDependency in your project:

```bash
npm install --save-dev aegis-linter-core
```

## Usage

```bash
Usage: aegis [options] [globs...]

Options:
  -v, --version         Output the version number
  -h, --help            Output usage information
  --stdin               Read from standard input
  -t, --text            Force parsing as plain text
  --html                Force parsing as HTML
  --mdx                 Force parsing as MDX
  --diff                (Not yet implemented) output diff
  -r, --reporter <name> Format output using a reporter
  -q, --quiet           Do not output anything for clean files
  --why                 Append rule source to warnings
```

### Examples

Lint all `.md`, `.mdx`, `.html`, and `.txt` files in the current directory and `doc/` folders (auto-discovery):
```bash
aegis
```

Lint specific files:
```bash
aegis README.md "docs/**/*.md"
```

Read from standard input:
```bash
echo "master branch" | aegis --stdin
```

## Configuration

Aegis can be configured via a `.aegisrc` file (JSON or YAML) or an `"aegis"` key in your `package.json`.

```json
{
  "allow": [
    "master",
    "slave"
  ]
}
```

## Directives

You can disable or enable rules within your markdown, MDX, or HTML files using HTML comments:

```html
<!-- aegis disable he-she -->
He is going to the store.
<!-- aegis enable he-she -->
```

Or ignore the next block:
```html
<!-- aegis ignore he-she -->
He is going to the store.
```

## License

This project is licensed under the [Apache License 2.0](LICENSE).
