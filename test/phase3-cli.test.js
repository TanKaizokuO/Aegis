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
    const stdout = execSync(`node ${cliPath} ${args}`, {
      ...options,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || '', status: error.status };
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
