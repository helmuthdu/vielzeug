import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
// The consumer fixture must run under Node: the runtime a real `npm install` consumer uses,
// and the one this gate exists to verify against. Under `bun run verify:exports`,
// process.execPath is the bun binary, so pin node explicitly rather than following the parent.
const node = 'node';
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const fixture = await mkdtemp(resolve(tmpdir(), 'vielzeug-flux-'));
const packageDir = resolve(fixture, 'node_modules', '@vielzeug');
const packagePath = resolve(packageDir, 'flux');
const specifiers = Object.keys(manifest.exports).map((entry) =>
  entry === '.' ? manifest.name : `${manifest.name}/${entry.slice(2)}`,
);

try {
  await mkdir(packageDir, { recursive: true });
  await symlink(root, packagePath, 'dir');
  await writeFile(resolve(fixture, 'esm.mjs'), `await Promise.all(${JSON.stringify(specifiers)}.map((specifier) => import(specifier)));\n`);
  await writeFile(
    resolve(fixture, 'cjs.cjs'),
    `for (const specifier of ${JSON.stringify(specifiers)}) require(specifier);\n`,
  );
  await execute(node, ['esm.mjs'], { cwd: fixture });
  await execute(node, ['cjs.cjs'], { cwd: fixture });
} finally {
  await rm(fixture, { force: true, recursive: true });
}
