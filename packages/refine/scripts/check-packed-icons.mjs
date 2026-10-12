import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const tempRoot = mkdtempSync(join(tmpdir(), 'refine-packed-icons-'));
const archiveDir = join(tempRoot, 'archive');
const consumerRoot = join(tempRoot, 'consumer');
const packedPackage = join(consumerRoot, 'node_modules/@vielzeug/refine');
const bundleDir = join(consumerRoot, 'bundle');

try {
  mkdirSync(archiveDir, { recursive: true });
  mkdirSync(packedPackage, { recursive: true });
  writeFileSync(join(consumerRoot, 'consumer.js'), "import '@vielzeug/refine/icon';\n");

  execFileSync('pnpm', ['pack', '--pack-destination', archiveDir], {
    cwd: packageRoot,
    stdio: 'pipe',
  });

  const archives = readdirSync(archiveDir).filter((file) => file.endsWith('.tgz'));
  if (archives.length !== 1) throw new Error(`Expected one Refine package archive, found ${archives.length}`);

  execFileSync(
    'tar',
    ['-xzf', join(archiveDir, archives[0]), '--strip-components=1', '-C', packedPackage],
    { stdio: 'pipe' },
  );

  await build({
    configFile: false,
    logLevel: 'silent',
    root: consumerRoot,
    build: {
      minify: false,
      outDir: bundleDir,
      rollupOptions: {
        external: (id) => id === 'lucide' || (id.startsWith('@vielzeug/') && id !== '@vielzeug/refine/icon'),
        input: join(consumerRoot, 'consumer.js'),
        output: { entryFileNames: 'consumer.js' },
      },
    },
  });

  const output = readFileSync(join(bundleDir, 'consumer.js'), 'utf8');
  if (!output.includes('registerIcons(') || !output.includes('ChevronDown')) {
    throw new Error('Packed production consumer bundle dropped Refine’s internal icon registration');
  }

  process.stdout.write('Packed production consumer bundle retains Refine internal icon registration.\n');
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
