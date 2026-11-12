#!/usr/bin/env bun
// Explicit .ts import extensions are the repo convention for these scripts (run directly under bun, never compiled by tsc).
/**
 * Regenerates the tool tables in docs/codex/tools.md from the real tool registries instead of a
 * hand-maintained table: the two used to drift (a removed tool stayed listed, a renamed one
 * kept its old name) with nothing catching it.
 *
 * Run explicitly (`bun run gen:tool-docs`) after a build, not as part of `build` or `prepare:data`: `src/tools/*.ts`
 * import their siblings with `.js` specifiers (required for the real NodeNext build), and
 * resolving those against `src/` would read the wrong files, so this imports the compiled
 * `dist/` output instead, which only exists after a build.
 *
 * Tool tables live in docs/codex/tools.md (not README.md) so the README stays uniform with the
 * rest of the monorepo's standard README shape.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ToolDefinition } from '../src/tools/shared.ts';

import { log } from './_log.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsDocPath = resolve(__dirname, '../../../docs/codex/tools.md');
const packageToolsEntry = resolve(__dirname, '../dist/tools/packages.js');
const refineToolsEntry = resolve(__dirname, '../dist/tools/refine.js');

for (const entry of [packageToolsEntry, refineToolsEntry]) {
  if (!existsSync(entry)) {
    throw new Error(`generate-tool-docs: ${entry} not found. Run \`bun run build\` first: this reads compiled output.`);
  }
}

const { packageTools } = (await import(packageToolsEntry)) as { packageTools: readonly ToolDefinition[] };
const { refineTools } = (await import(refineToolsEntry)) as { refineTools: readonly ToolDefinition[] };
const ALL_TOOLS = [...packageTools, ...refineTools];

function formatInputs(tool: ToolDefinition): string {
  const names = Object.keys(tool.inputSchema.properties);

  if (names.length === 0) return 'N/A';

  const required = new Set(tool.inputSchema.required ?? []);

  return names.map((name) => (required.has(name) ? `\`${name}\`` : `\`${name}?\``)).join(', ');
}

/**
 * First sentence of a tool's description: the table cell, not the full multi-sentence blurb.
 * Splits on ". " only when followed by a capital letter, so abbreviations like "e.g." (period,
 * space, lowercase) don't get mistaken for a sentence boundary.
 */
function summarise(tool: ToolDefinition): string {
  return tool.description.split(/(?<=\.)\s(?=[A-Z])/)[0] ?? tool.description;
}

function renderTable(tools: ToolDefinition[]): string {
  const rows = tools.map((t) => `| \`${t.name}\` | ${formatInputs(t)} | ${summarise(t)} |`);

  return ['| Tool | Input | Description |', '| --- | --- | --- |', ...rows].join('\n');
}

function replaceBetweenMarkers(content: string, marker: string, replacement: string): string {
  const start = `<!-- TOOLS:${marker}:START -->`;
  const end = `<!-- TOOLS:${marker}:END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);

  if (!pattern.test(content)) {
    throw new Error(`generate-tool-docs: docs/codex/tools.md is missing the ${start} / ${end} marker pair.`);
  }

  return content.replace(pattern, `${start}\n${replacement}\n${end}`);
}

const generic = ALL_TOOLS.filter((t) => !t.name.startsWith('refine-'));
const refine = ALL_TOOLS.filter((t) => t.name.startsWith('refine-'));

let content = readFileSync(toolsDocPath, 'utf8');

content = replaceBetweenMarkers(content, 'GENERIC', renderTable(generic));
content = replaceBetweenMarkers(content, 'REFINE', renderTable(refine));

writeFileSync(toolsDocPath, content, 'utf8');
log(`Refreshed tool tables in ${toolsDocPath}`);
