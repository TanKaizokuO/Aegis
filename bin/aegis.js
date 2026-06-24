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

