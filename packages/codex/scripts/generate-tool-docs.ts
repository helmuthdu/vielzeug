#!/usr/bin/env node
// .ts extension required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
/**
 * Regenerates the tool tables in README.md from the real `ALL_TOOLS` registry instead of a
 * hand-maintained table — the two used to drift (a removed tool stayed listed, a renamed one
 * kept its old name) with nothing catching it.
 *
 * Runs as a `postbuild` step (after `tsc`), not as part of `prepare:data`: `src/tools/index.ts`
 * imports its siblings with `.js` specifiers (required for the real NodeNext build), and
 * `node --experimental-strip-types` — unlike a bundler or `tsc` itself — does not rewrite those
 * back to `.ts` at run time, so this has to import the compiled `dist/` output, which only
 * exists after a build.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ToolDefinition } from '../src/tools/shared.ts';

import { log } from './_log.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readmePath = resolve(__dirname, '../README.md');
const toolsEntry = resolve(__dirname, '../dist/tools/index.js');

if (!existsSync(toolsEntry)) {
  throw new Error(
    `generate-tool-docs: ${toolsEntry} not found. Run \`pnpm build\` first — this reads compiled output.`,
  );
}

const { ALL_TOOLS } = (await import(toolsEntry)) as { ALL_TOOLS: ToolDefinition[] };

function formatInputs(tool: ToolDefinition): string {
  const names = Object.keys(tool.inputSchema.properties);

  if (names.length === 0) return '—';

  const required = new Set(tool.inputSchema.required ?? []);

  return names.map((name) => (required.has(name) ? `\`${name}\`` : `\`${name}?\``)).join(', ');
}

/**
 * First sentence of a tool's description — the table cell, not the full multi-sentence blurb.
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
    throw new Error(`generate-tool-docs: README.md is missing the ${start} / ${end} marker pair.`);
  }

  return content.replace(pattern, `${start}\n${replacement}\n${end}`);
}

const generic = ALL_TOOLS.filter((t) => !t.name.startsWith('refine-'));
const refine = ALL_TOOLS.filter((t) => t.name.startsWith('refine-'));

let content = readFileSync(readmePath, 'utf8');

content = replaceBetweenMarkers(content, 'GENERIC', renderTable(generic));
content = replaceBetweenMarkers(content, 'REFINE', renderTable(refine));

writeFileSync(readmePath, content, 'utf8');
log(`Refreshed tool tables in ${readmePath}`);
