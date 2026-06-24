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
