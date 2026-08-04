import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const fixture = await mkdtemp(resolve(tmpdir(), 'vielzeug-flux-'));
const packageDir = resolve(fixture, 'node_modules', '@vielzeug');
const packagePath = resolve(packageDir, 'flux');
const ripplePath = resolve(packageDir, 'ripple');
const specifiers = Object.keys(manifest.exports).map((entry) =>
  entry === '.' ? manifest.name : `${manifest.name}/${entry.slice(2)}`,
);

try {
  await mkdir(packageDir, { recursive: true });
  await symlink(root, packagePath, 'dir');
  await symlink(resolve(root, '..', 'ripple'), ripplePath, 'dir');
  await writeFile(resolve(fixture, 'esm.mjs'), `await Promise.all(${JSON.stringify(specifiers)}.map((specifier) => import(specifier)));\n`);
  await writeFile(
    resolve(fixture, 'cjs.cjs'),
    `for (const specifier of ${JSON.stringify(specifiers)}) require(specifier);\n`,
  );
  await execute(process.execPath, ['esm.mjs'], { cwd: fixture });
  await execute(process.execPath, ['cjs.cjs'], { cwd: fixture });
} finally {
  await rm(fixture, { force: true, recursive: true });
}
