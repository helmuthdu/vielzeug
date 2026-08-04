import type { DocPage, PackageContent, PackageMeta, SnapshotCatalog } from '../src/types.ts';

export function stripDocMarkup(markdown: string): string {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\[\[toc]]\s*$/gm, '')
    .replace(/^:::[\s\S]*?:::\s*$/gm, (match) => match.replace(/^:::[^\n]*\n?|^:::\s*$/gm, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const PAGE_LABELS: Record<DocPage, string> = { api: 'API Reference', examples: 'Examples', index: 'Overview', usage: 'Usage Guide' };

function overview(packages: readonly PackageMeta[], version: string): string {
  const lines = ['# Vielzeug', '', `> ${packages.length} focused TypeScript packages. Version: ${version}`, '', 'Install any package independently: `pnpm add @vielzeug/<name>`', '', '## Packages', ''];
  for (const pkg of packages) lines.push(`- [${pkg.name}](/${pkg.slug}/): ${pkg.description}`);
  return `${lines.join('\n')}\n`;
}

function full(catalog: SnapshotCatalog, contents: ReadonlyMap<string, PackageContent>): string {
  const lines = ['# Vielzeug — Full Documentation', '', `> Complete documentation for ${catalog.packages.length} packages. Version: ${catalog.version}`];
  for (const pkg of catalog.packages) {
    const content = contents.get(pkg.slug);
    if (!content) continue;
    lines.push('', '---', '', `## ${pkg.name}`, '', `**Category:** ${pkg.category || 'general'}`);
    for (const page of ['index', 'api', 'usage', 'examples'] as const) {
      const markdown = content.docs[page];
      if (!markdown) continue;
      lines.push('', `### ${PAGE_LABELS[page]}`, '', stripDocMarkup(markdown));
    }
    if (content.examples.length > 0) lines.push('', '### REPL Examples', '', content.examples.map((example) => `- ${example.name} (id: \`${example.id}\`)`).join('\n'));
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

export function generateLlmsTxt(catalog: SnapshotCatalog, contents: ReadonlyMap<string, PackageContent>): { llmsFullTxt: string; llmsTxt: string } {
  return { llmsFullTxt: full(catalog, contents), llmsTxt: overview(catalog.packages, catalog.version) };
}
