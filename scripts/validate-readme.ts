/**
 * Validates package README structure across the monorepo.
 *
 * Enforces the canonical shape defined in `.ai/reference/readme-template.md`:
 * title, blockquote description, Installation, Quick Start, optional Features,
 * Documentation, License — and nothing else.
 *
 * Usage:
 *   pnpm validate:readme
 *   pnpm validate:readme -- --package=ripple
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain, parseArgs } from './lib/cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_PACKAGES_DIR = join(ROOT, 'packages');

const LICENSE_LINE =
  'MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.';

const PERMITTED_HEADINGS = new Set([
  'Installation',
  'Install and run',
  'Quick Start',
  'Features',
  'Documentation',
  'License',
]);

export interface ReadmeDiagnostic {
  file: string;
  hint?: string;
  line?: number;
  message: string;
  package: string;
  rule: string;
}

export interface ReadmeValidationResult {
  checkedPackages: readonly string[];
  diagnostics: readonly ReadmeDiagnostic[];
}

export interface LoadReadmeWorkspaceOptions {
  packagesDir?: string;
}

interface ReadmeFile {
  path: string;
  slug: string;
  text: string;
  lines: string[];
}

function diagnostic(
  slug: string,
  file: string,
  rule: string,
  message: string,
  options: Pick<ReadmeDiagnostic, 'hint' | 'line'> = {},
): ReadmeDiagnostic {
  return { file, message, package: slug, rule, ...options };
}

function loadReadmes(packagesDir: string): Map<string, ReadmeFile> {
  const readmes = new Map<string, ReadmeFile>();

  for (const slug of readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    const path = join(packagesDir, slug, 'README.md');
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    readmes.set(slug, { lines: text.split(/\r?\n/), path, slug, text });
  }

  return readmes;
}

function headingText(line: string): string | null {
  const match = /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line);
  return match ? match[2].trim() : null;
}

function validateReadme(readme: ReadmeFile): readonly ReadmeDiagnostic[] {
  const diagnostics: ReadmeDiagnostic[] = [];
  const { lines, path, slug } = readme;

  // Rule: title
  const title = headingText(lines[0] ?? '');
  if (lines[0] === undefined || title !== `@vielzeug/${slug}`) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/title', `First line must be "# @vielzeug/${slug}"`, {
        line: 1,
        hint: `Current: "${lines[0] ?? '(missing)'}"`,
      }),
    );
  }

  // Rule: blockquote description on line 3 (after title + blank line)
  const descLine = lines[2] ?? '';
  if (!descLine.startsWith('> ')) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/description', 'Line 3 must be a blockquote description ("> ...").', {
        line: 3,
        hint: `Current: "${descLine}"`,
      }),
    );
  }

  // Collect all level-2 headings
  const h2Headings: { index: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^##[ \t]+(.+?)\s*#*\s*$/.exec(lines[i] ?? '');
    if (match) h2Headings.push({ index: i + 1, text: match[1].trim() });
  }

  // Rule: required headings present
  const headingTexts = h2Headings.map((h) => h.text);
  const hasInstall = headingTexts.includes('Installation') || headingTexts.includes('Install and run');
  if (!hasInstall) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/heading-missing', 'Missing required section: ## Installation (or ## Install and run for CLI packages).'),
    );
  }
  if (!headingTexts.includes('Quick Start')) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/heading-missing', 'Missing required section: ## Quick Start'),
    );
  }
  if (!headingTexts.includes('Documentation')) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/heading-missing', 'Missing required section: ## Documentation'),
    );
  }
  if (!headingTexts.includes('License')) {
    diagnostics.push(
      diagnostic(slug, path, 'readme/heading-missing', 'Missing required section: ## License'),
    );
  }

  // Rule: no unpermitted level-2 headings
  for (const h2 of h2Headings) {
    if (!PERMITTED_HEADINGS.has(h2.text)) {
      diagnostics.push(
        diagnostic(slug, path, 'readme/heading-unpermitted', `Unpermitted section: ## ${h2.text}`, {
          line: h2.index,
          hint: 'Permitted: Installation/Install and run, Quick Start, Features, Documentation, License. Move bespoke content to docs/<name>/.',
        }),
      );
    }
  }

  // Rule: License is the last level-2 section
  const lastH2 = h2Headings[h2Headings.length - 1];
  if (lastH2 && lastH2.text !== 'License') {
    diagnostics.push(
      diagnostic(slug, path, 'readme/heading-order', '## License must be the last section.', {
        line: lastH2.index,
      }),
    );
  }

  // Rule: heading order (Installation → Quick Start → Features → Documentation → License)
  const expectedOrder = ['Installation', 'Install and run', 'Quick Start', 'Features', 'Documentation', 'License'];
  let lastIndex = -1;
  for (const h2 of h2Headings) {
    const expectedIndex = expectedOrder.indexOf(h2.text);
    if (expectedIndex === -1) continue;
    if (expectedIndex < lastIndex) {
      diagnostics.push(
        diagnostic(slug, path, 'readme/heading-order', `## ${h2.text} appears out of order (expected after the previous required section).`, {
          line: h2.index,
          hint: `Required order: Installation → Quick Start → Features → Documentation → License`,
        }),
      );
    }
    lastIndex = Math.max(lastIndex, expectedIndex);
  }

  // Rule: no npm badge images
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes('img.shields.io')) {
      diagnostics.push(
        diagnostic(slug, path, 'readme/no-badges', 'npm badge images are not allowed in READMEs.', {
          line: i + 1,
          hint: 'Badges add visual noise without adding information for a monorepo package.',
        }),
      );
      break;
    }
  }

  // Rule: no <details> blocks
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes('<details')) {
      diagnostics.push(
        diagnostic(slug, path, 'readme/no-details', '<details> collapsible blocks are not allowed in READMEs.', {
          line: i + 1,
          hint: 'Move Quick Reference content to docs/<name>/index.md.',
        }),
      );
      break;
    }
  }

  // Rule: license line exact
  const licenseHeadingIndex = h2Headings.find((h) => h.text === 'License')?.index;
  if (licenseHeadingIndex !== undefined) {
    const licenseLine = lines[licenseHeadingIndex]; // line after "## License" (0-based index == line number)
    // Find the first non-empty line after the License heading
    for (let i = licenseHeadingIndex; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trim() === '') continue;
      if (line !== LICENSE_LINE) {
        diagnostics.push(
          diagnostic(slug, path, 'readme/license-line', 'License text must match the canonical line.', {
            line: i + 1,
            hint: `Expected: ${LICENSE_LINE}`,
          }),
        );
      }
      break;
    }
  }

  // Rule: Documentation section links to vielzeug.dev
  const docsHeadingIndex = h2Headings.find((h) => h.text === 'Documentation')?.index;
  if (docsHeadingIndex !== undefined) {
    const nextHeadingIndex = h2Headings
      .slice(h2Headings.findIndex((h) => h.text === 'Documentation') + 1)
      .find((h) => true)?.index;
    const docsEnd = nextHeadingIndex ?? lines.length;
    const docsSection = lines.slice(licenseHeadingIndex !== undefined && docsHeadingIndex < licenseHeadingIndex ? docsHeadingIndex : docsHeadingIndex, docsEnd);
    const hasVielzeugLink = docsSection.some((line) => line?.includes('https://vielzeug.dev/'));
    if (!hasVielzeugLink) {
      diagnostics.push(
        diagnostic(slug, path, 'readme/docs-link', '## Documentation must link to at least one https://vielzeug.dev/<slug>/ page.'),
      );
    }
  }

  return diagnostics;
}

export function validateReadmeWorkspace(
  readmes: ReadonlyMap<string, ReadmeFile>,
  filterPackage: string | null = null,
): ReadmeValidationResult {
  const slugs = filterPackage
    ? [filterPackage]
    : [...readmes.keys()].sort();

  if (filterPackage && !readmes.has(filterPackage)) {
    throw new Error(`Unknown package: ${filterPackage}`);
  }

  const diagnostics: ReadmeDiagnostic[] = [];
  for (const slug of slugs) {
    const readme = readmes.get(slug);
    if (readme) diagnostics.push(...validateReadme(readme));
  }

  return { checkedPackages: slugs, diagnostics };
}

function main(): void {
  const { flags } = parseArgs(process.argv.slice(2));
  const filterPackage = typeof flags.package === 'string' ? flags.package : null;

  const readmes = loadReadmes(DEFAULT_PACKAGES_DIR);
  const result = validateReadmeWorkspace(readmes, filterPackage);

  if (result.diagnostics.length === 0) {
    console.log(`Validated README structure for ${result.checkedPackages.length} package${result.checkedPackages.length === 1 ? '' : 's'}.`);
    return;
  }

  for (const item of result.diagnostics) {
    const location = item.line ? `:${item.line}` : '';
    console.error(`[${item.rule}] ${item.package}/README.md${location}: ${item.message}`);
    if (item.hint) console.error(`  hint: ${item.hint}`);
  }
  console.error(`${result.diagnostics.length} README validation failure${result.diagnostics.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
