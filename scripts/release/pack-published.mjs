import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { run as defaultRun } from '../lib/cli.mjs';
import { createPublishedManifest } from './resolve-workspace-deps.mjs';

function copyFilter(source) {
  return !source.split(path.sep).includes('node_modules');
}

export function packPublishedPackage(folder, { findProject, run = defaultRun } = {}) {
  const staging = mkdtempSync(path.join(tmpdir(), 'vielzeug-publish-'));

  try {
    cpSync(folder, staging, { filter: copyFilter, recursive: true });
    const manifest = createPublishedManifest(JSON.parse(readFileSync(path.join(folder, 'package.json'), 'utf8')), { findProject });
    writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    const [packed] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json'], { cwd: staging }));
    if (typeof packed?.filename !== 'string') throw new Error(`npm pack did not return an artifact for ${folder}`);

    return {
      cleanup: () => rmSync(staging, { force: true, recursive: true }),
      files: packed.files,
      manifest,
      tarballPath: path.join(staging, packed.filename),
    };
  } catch (error) {
    rmSync(staging, { force: true, recursive: true });
    throw error;
  }
}
