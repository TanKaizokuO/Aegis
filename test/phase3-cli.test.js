import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, '..', 'bin', 'aegis.js');

function runCli(args, options = {}) {
  try {
    const stdout = execSync(`node ${cliPath} ${args} 2>&1`, {
      ...options,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { stdout, stderr: stdout, status: 0 };
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stdout || '', status: error.status };
  }
}

test('Phase 3 CLI: Help and Version', async (t) => {
  await t.test('--help output', () => {
    const { stdout, status } = runCli('--help');
    assert.strictEqual(status, 0);
    assert.ok(stdout.includes('Usage: aegis [options]'));
  });

  await t.test('--version output', () => {
    const { stdout, status } = runCli('--version');
    assert.strictEqual(status, 0);
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(stdout.includes(pkg.version));
  });
});

test('Phase 3 CLI: File Discovery & Ignore Logic', async (t) => {
  const tmpDir = join(__dirname, 'tmp-discovery');
  
  t.before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
    fs.mkdirSync(join(tmpDir, 'sub'), { recursive: true });
    
    // Create files
    fs.writeFileSync(join(tmpDir, 'clean.md'), 'Clean text.');
    fs.writeFileSync(join(tmpDir, 'dirty.md'), 'He is going to the master branch.');
    fs.writeFileSync(join(tmpDir, 'node_modules', 'dirty.md'), 'master branch');
    fs.writeFileSync(join(tmpDir, 'sub', 'dirty.md'), 'master branch');
    fs.writeFileSync(join(tmpDir, 'unrecognized.csv'), 'master branch');
    
    // Create .aegisignore ignoring the 'sub' directory
    fs.writeFileSync(join(tmpDir, '.aegisignore'), 'sub/\n');
  });
  
  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('Auto-discovery skips node_modules and .aegisignore', () => {
    const { stderr, status } = runCli('', { cwd: tmpDir });
    // Should exit 1 because dirty.md has warnings
    assert.strictEqual(status, 1);
    
    // Check that dirty.md was found
    assert.ok(stderr.includes('dirty.md'));
    
    // node_modules and sub should be skipped
    assert.ok(!stderr.includes('node_modules/dirty.md'));
    assert.ok(!stderr.includes('sub/dirty.md'));
  });

  await t.test('Explicit globs skip unrecognized extensions silently', () => {
    const { stderr, status } = runCli('*.csv', { cwd: tmpDir });
    // No recognized files = 0 warnings
    assert.strictEqual(status, 0);
    assert.ok(!stderr.includes('unrecognized.csv'));
  });
});

test('Phase 3 CLI: Stdin & Format Fallbacks', async (t) => {
  await t.test('Stdin processes input and defaults to Markdown', () => {
    try {
      execSync(`echo "He is going to the master branch." | node ${cliPath} --stdin`, { encoding: 'utf8', stdio: 'pipe' });
      assert.fail('Should exit 1');
    } catch (error) {
      assert.strictEqual(error.status, 1);
      assert.ok(error.stderr.includes('stdin'));
      assert.ok(error.stderr.includes('warning  `He` may be insensitive'));
      assert.ok(error.stderr.includes('warning  `master` may be insensitive'));
    }
  });

  await t.test('Stdin format override works', () => {
    // In plain text, embedded comments are not parsed as directives
    try {
      execSync(`echo "<!--aegis ignore he-she-->\nHe is going." | node ${cliPath} --stdin --text`, { encoding: 'utf8', stdio: 'pipe' });
      assert.fail('Should exit 1');
    } catch (error) {
      assert.strictEqual(error.status, 1);
      // In text mode, "he", "she", and "He" are all caught
      assert.ok(error.stderr.includes('3 warning(s)'));
    }
  });

  await t.test('Stdin glob conflict validation', () => {
    try {
      execSync(`node ${cliPath} --stdin someglob`, { encoding: 'utf8', stdio: 'pipe' });
      assert.fail('Should exit 1');
    } catch (error) {
      assert.strictEqual(error.status, 1);
      assert.ok(error.stderr.includes('Do not pass globs with `--stdin`'));
    }
  });
});

test('Phase 3 CLI: Reporters, Quiet, and Exit Codes', async (t) => {
  await t.test('--quiet suppresses output for clean files', () => {
    try {
      execSync(`echo "Clean text here." | node ${cliPath} --stdin --quiet`, { encoding: 'utf8', stdio: 'pipe' });
      // Should not throw, exit 0
    } catch (error) {
      assert.fail('Should exit 0');
    }
  });

  await t.test('Missing reporter outputs message and exits 0', () => {
    const { stderr, status } = runCli('--reporter=nonexistent-reporter');
    assert.strictEqual(status, 0);
    assert.ok(stderr.includes("Could not find reporter 'nonexistent-reporter'"));
  });

  await t.test('--why appends source engine to warnings', () => {
    try {
      execSync(`echo "He is going." | node ${cliPath} --stdin --why`, { encoding: 'utf8', stdio: 'pipe' });
      assert.fail('Should exit 1');
    } catch (error) {
      assert.strictEqual(error.status, 1);
      assert.ok(error.stderr.includes('(EqualityAnalyzer)'));
    }
  });

  await t.test('--diff outputs unimplemented stub and exits 0', () => {
    const { stderr, status } = runCli('--diff');
    assert.strictEqual(status, 0);
    assert.ok(stderr.includes("[--diff not yet implemented]"));
  });
});
