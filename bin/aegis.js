#!/usr/bin/env node

import mri from 'mri';

const argv = process.argv.slice(2);
const args = mri(argv, {
  boolean: [
    'version', 'help', 'stdin', 'text', 'html', 'mdx', 'diff', 'quiet', 'why'
  ],
  string: ['reporter'],
  alias: {
    v: 'version',
    h: 'help',
    q: 'quiet',
    t: 'text',
    r: 'reporter'
  }
});
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (args.version) {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

if (args.help) {
  console.log(`
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
  `);
  process.exit(0);
}

const globs = args._;

if (args.stdin && globs.length > 0) {
  console.error("Do not pass globs with `--stdin`");
  process.exit(1);
}
