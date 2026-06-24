import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    
    // We use a short timeout so it doesn't hang the CLI if network is slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    
    const res = await fetch(`https://registry.npmjs.org/aegis-linter-core/latest`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      if (data.version && data.version !== pkg.version) {
        return `\n╭───────────────────────────────────────────────────╮\n│                                                   │\n│   Update available ${pkg.version} → ${data.version}                    │\n│   Run npm i -g aegis-linter-core to update        │\n│                                                   │\n╰───────────────────────────────────────────────────╯\n`;
      }
    }
  } catch (e) {
    // Fail silently, this is non-blocking
  }
  return null;
}
