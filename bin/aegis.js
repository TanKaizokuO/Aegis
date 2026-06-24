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

if (args.diff) {
  console.error('[--diff not yet implemented]');
  process.exit(0);
}

const globs = args._;

if (args.stdin && globs.length > 0) {
  console.error("Do not pass globs with `--stdin`");
  process.exit(1);
}

import fg from 'fast-glob';
import ignore from 'ignore';
import fs from 'node:fs';
import { relative } from 'node:path';

const ig = ignore().add('node_modules');

let currentDir = process.cwd();
while (currentDir !== dirname(currentDir)) {
  const ignorePath = join(currentDir, '.aegisignore');
  if (fs.existsSync(ignorePath)) {
    ig.add(fs.readFileSync(ignorePath, 'utf8'));
    break;
  }
  currentDir = dirname(currentDir);
}

let filesToProcess = [];

if (!args.stdin) {
  const searchGlobs = globs.length > 0 ? globs : [
    '*.{md,mdx,html,txt}',
    'doc/**/*.{md,mdx,html,txt}',
    'docs/**/*.{md,mdx,html,txt}'
  ];
  
  const validExtensions = new Set(['.md', '.mdx', '.html', '.txt']);
  const allFiles = fg.sync(searchGlobs, { absolute: true });
  filesToProcess = allFiles.filter(f => {
    if (!ig.ignores(relative(process.cwd(), f))) {
      // Check extension
      const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
      return validExtensions.has(ext);
    }
    return false;
  });
}

import { cosmiconfigSync } from 'cosmiconfig';
import { AnalyzeMarkdown, AnalyzeMDX, AnalyzeHTML, AnalyzePlainText } from '../index.js';

const explorer = cosmiconfigSync('aegis');
const allResults = [];

function getAnalyzer(filepath, cliArgs) {
  if (cliArgs.mdx) return AnalyzeMDX;
  if (cliArgs.html) return AnalyzeHTML;
  if (cliArgs.text) return AnalyzePlainText;
  
  if (filepath) {
    const ext = filepath.slice(filepath.lastIndexOf('.')).toLowerCase();
    if (ext === '.mdx') return AnalyzeMDX;
    if (ext === '.html') return AnalyzeHTML;
    if (ext === '.txt') return AnalyzePlainText;
  }
  return AnalyzeMarkdown; // Default for .md and stdin
}

if (args.stdin) {
  const stdinBuffer = fs.readFileSync(0, 'utf-8');
  if (stdinBuffer.trim().length > 0) {
    const analyzer = getAnalyzer(null, args);
    const result = explorer.search(process.cwd());
    const config = result ? result.config : undefined;
    const vf = analyzer(stdinBuffer, config);
    vf.path = 'stdin';
    allResults.push(vf);
  } else {
    const vf = { path: 'stdin', Messages: [] };
    allResults.push(vf);
  }
} else {
  for (const file of filesToProcess) {
    const content = fs.readFileSync(file, 'utf-8');
    const analyzer = getAnalyzer(file, args);
    const result = explorer.search(dirname(file));
    const config = result ? result.config : undefined;
    const vf = analyzer(content, config);
    vf.path = relative(process.cwd(), file);
    allResults.push(vf);
  }
}

// Reporting and exit
async function runReporter() {
  let reporterFn;
  
  if (args.reporter) {
    try {
      const reporterModule = await import(args.reporter);
      reporterFn = reporterModule.default || reporterModule;
    } catch (e) {
      console.error(`Could not find reporter '${args.reporter}'`);
      process.exit(0);
    }
  } else {
    const reporterModule = await import('../src/cli/reporter.js');
    reporterFn = reporterModule.default;
  }

  reporterFn(allResults, { quiet: args.quiet, why: args.why });

  const totalWarnings = allResults.reduce((acc, f) => acc + (f.Messages ? f.Messages.length : 0), 0);
  if (totalWarnings > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runReporter();
