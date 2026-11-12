/**
 * Applies mechanical rename codemods (rule files in `./codemods/`) to a target
 * codebase with the TypeScript compiler API, so upgrade renames published in
 * the migration guides do not need hand editing at every call site.
 *
 * Usage: `bun scripts/codemods/apply.ts <dir> --rules=<rules.ts> [--dry-run]`
 *
 * Three rule kinds cover the rename shapes consumers hit:
 *   - `export`: renames an imported/exported specifier (optionally restricted to
 *     one module) and every local reference bound from it.
 *   - `member`: renames `.old` property accesses and method calls.
 *   - `key`: renames `old:` keys in object literals and object destructuring
 *     patterns. Shorthand entries expand to `new: old` so existing local names
 *     keep working without scope analysis.
 *
 * Edits are text splices on the original source, so untouched code keeps its
 * exact formatting. The target project's typecheck and tests remain the gate:
 * the codemod only automates the mechanical part of a migration.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import ts from 'typescript';

import { isMain, parseArgs } from '../lib/cli.mjs';

export interface CodemodRule {
  readonly from: string;
  readonly to: string;
  /** `export` rules only: module specifier the rename applies to; omit for any module. */
  readonly module?: string;
  readonly kind: 'export' | 'member' | 'key';
}

interface TextEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);

/** Applies edits right-to-left (offsets stay valid); overlapping edits are skipped. */
export function applyEdits(source: string, edits: readonly TextEdit[]): string {
  let output = source;
  let lastStart = Number.POSITIVE_INFINITY;

  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    if (edit.end > lastStart) continue;

    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    lastStart = edit.start;
  }

  return output;
}

/** Renames rule targets in one source file; returns new text plus the edit count. */
export function applyRenames(
  source: string,
  fileName: string,
  rules: readonly CodemodRule[],
): { changed: boolean; output: string; uses: number } {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const edits: TextEdit[] = [];
  const touched = new Set<number>();
  // Locals bound by a matching `export` import, renamed at every reference site.
  const exportLocals = new Map<string, string>();
  const nameRules = new Map<string, CodemodRule[]>();

  for (const rule of rules) {
    nameRules.set(rule.from, [...(nameRules.get(rule.from) ?? []), rule]);
  }

  const rename = (name: ts.Node, to: string): void => {
    const start = name.getStart(sourceFile);

    if (touched.has(start)) return;

    touched.add(start);
    edits.push({ end: name.end, start, text: to });
  };

  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const moduleName = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
      const bindings = node.importClause?.namedBindings;
      const specifiers =
        bindings && ts.isNamedImports(bindings)
          ? [...bindings.elements]
          : node.exportClause && ts.isNamedExports(node.exportClause)
            ? [...node.exportClause.elements]
            : [];

      for (const spec of specifiers) {
        const importedName = spec.propertyName?.text ?? spec.name.text;

        for (const rule of nameRules.get(importedName) ?? []) {
          if (rule.kind !== 'export' || (rule.module && rule.module !== moduleName)) continue;

          rename(spec.propertyName ?? spec.name, rule.to);

          // Aliased imports keep their local name; only unaliased bindings rename at usage sites.
          if (ts.isImportSpecifier(spec) && !spec.propertyName) exportLocals.set(spec.name.text, rule.to);
        }
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      for (const rule of nameRules.get(node.name.text) ?? []) {
        if (rule.kind === 'member') rename(node.name, rule.to);
      }
    } else if (ts.isShorthandPropertyAssignment(node)) {
      for (const rule of nameRules.get(node.name.text) ?? []) {
        if (rule.kind !== 'key') continue;

        const start = node.getStart(sourceFile);

        if (touched.has(start)) continue;

        touched.add(start);
        edits.push({ end: node.getEnd(), start, text: `${rule.to}: ${node.name.text}` });
      }
    } else if (
      (ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) &&
      !ts.isComputedPropertyName(node.name)
    ) {
      for (const rule of nameRules.get(node.name.getText(sourceFile)) ?? []) {
        if (rule.kind === 'key') rename(node.name, rule.to);
      }
    } else if (ts.isBindingElement(node) && node.propertyName && !ts.isComputedPropertyName(node.propertyName)) {
      for (const rule of nameRules.get(node.propertyName.getText(sourceFile)) ?? []) {
        if (rule.kind === 'key') rename(node.propertyName, rule.to);
      }
    }

    if (ts.isIdentifier(node)) {
      const to = exportLocals.get(node.text);

      if (to) rename(node, to);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  const output = applyEdits(source, edits);

  return { changed: output !== source, output, uses: edits.length };
}

function collectFiles(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;

    const full = join(dir, entry);

    if (statSync(full).isDirectory()) collectFiles(full, files);
    else if (SOURCE_EXTENSIONS.has(extname(entry))) files.push(full);
  }
}

/** Renames across a directory tree; returns the number of files changed. */
export function codemodDirectory(dir: string, rules: readonly CodemodRule[], dryRun: boolean): number {
  const files: string[] = [];

  collectFiles(resolve(dir), files);

  let changedFiles = 0;

  for (const file of files) {
    const { changed, output, uses } = applyRenames(readFileSync(file, 'utf8'), file, rules);

    if (!changed) continue;

    changedFiles++;

    if (dryRun) process.stdout.write(`would change ${file} (${uses} edits)\n`);
    else writeFileSync(file, output);
  }

  return changedFiles;
}

async function main(): Promise<number> {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const target = positionals[0];
  const rulesPath = typeof flags.rules === 'string' ? flags.rules : undefined;

  if (!target || !rulesPath) {
    process.stderr.write('usage: bun scripts/codemods/apply.ts <dir> --rules=<rules.ts> [--dry-run]\n');

    return 2;
  }

  const imported = (await import(resolve(rulesPath))) as { default?: readonly CodemodRule[] };
  const rules = imported.default;

  if (!Array.isArray(rules) || rules.length === 0) {
    process.stderr.write(`codemods/apply: ${rulesPath} must default-export a non-empty rule array\n`);

    return 2;
  }

  const changed = codemodDirectory(target, rules, flags['dry-run'] === true);

  process.stdout.write(`codemods/apply: ${changed} file(s) changed; run the project typecheck and tests next.\n`);

  return 0;
}

if (isMain(import.meta.url)) process.exitCode = await main();
