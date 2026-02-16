import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PackageInfo {
  version: string;
  dependencies: number;
  size: string;
}

interface PackagesData {
  [key: string]: PackageInfo;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Build-time data extraction requires nested logic
export function getPackagesData(): PackagesData {
  // Go up from docs/.vitepress/theme/utils to the project root, then into packages
  const packagesDir = path.resolve(__dirname, '../../../../packages');
  const packages: PackagesData = {};

  try {
    const packageDirs = fs.readdirSync(packagesDir);

    for (const dir of packageDirs) {
      const packageJsonPath = path.join(packagesDir, dir, 'package.json');

      if (!fs.existsSync(packageJsonPath)) continue;

      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const distPath = path.join(packagesDir, dir, 'dist');

        // Count dependencies (excluding dev dependencies)
        const dependencies = packageJson.dependencies
          ? Object.keys(packageJson.dependencies).filter((dep: string) => !dep.startsWith('@types/')).length
          : 0;

        // Try to get actual bundle size
        let size = 'N/A';
        if (fs.existsSync(distPath)) {
          const distFiles = fs.readdirSync(distPath);

          // Prefer package-named file (e.g., deposit.cjs) over index.cjs
          let cjsFile = distFiles.find((f: string) => f === `${dir}.cjs`);
          if (!cjsFile) {
            cjsFile = distFiles.find((f: string) => f.endsWith('.cjs') && f !== 'index.cjs');
          }
          if (!cjsFile) {
            cjsFile = distFiles.find((f: string) => f.endsWith('.cjs'));
          }

          if (cjsFile) {
            const filePath = path.join(distPath, cjsFile);
            const fileContent = fs.readFileSync(filePath);

            // Actually gzip the content to get accurate size
            const gzipped = gzipSync(fileContent);
            const gzippedSizeKB = (gzipped.length / 1024).toFixed(1);

            size = `${gzippedSizeKB} KB`;
          }
        }

        packages[dir] = {
          version: packageJson.version,
          dependencies,
          size,
        };
      } catch (err) {
        console.warn(`Could not read package.json for ${dir}:`, err);
      }
    }
  } catch (err) {
    console.error('Error reading packages directory:', err);
  }

  return packages;
}
