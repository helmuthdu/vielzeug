// .ts extension required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
/**
 * Extracts REPL example metadata + code from docs/.vitepress/theme/components/repl/examples/<slug>/
 * via the TypeScript compiler API (no dynamic import / execution of repo code at build time —
 * mirrors the AST-only approach in scripts/generate-repl-registry.ts).
 *
 * Each package's examples/<slug>/index.ts re-exports a `<slug>Examples` object literal mapping
 * example id -> imported `{ name, code }` object from a sibling file. This walks that shape
 * statically: resolve the id -> identifier -> source file -> `name`/`code` string literals.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

import type { BundledExample } from '../src/types.ts';

function propertyKeyText(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
}

/** Maps imported identifier name -> resolved absolute file path, from the index.ts's import declarations. */
function readImportMap(sourceFile: ts.SourceFile, dir: string): Map<string, string> {
  const imports = new Map<string, string>();

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;

    if (!stmt.importClause?.namedBindings || !ts.isNamedImports(stmt.importClause.namedBindings)) continue;

    const modulePath = resolve(dir, `${stmt.moduleSpecifier.text}.ts`);

    for (const el of stmt.importClause.namedBindings.elements) {
      imports.set(el.name.text, modulePath);
    }
  }

  return imports;
}

/** Finds the single exported object literal (the `<slug>Examples` map) and returns id -> imported identifier. */
function readExportedIdMap(sourceFile: ts.SourceFile): Map<string, string> {
  const ids = new Map<string, string>();

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;

      for (const prop of decl.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.initializer)) continue;

        const key = propertyKeyText(prop.name);

        if (key !== undefined) ids.set(key, prop.initializer.text);
      }
    }
  }

  return ids;
}

/** Reads `name`/`code` string properties off the exported example object in a single example file. */
function readExampleFields(filePath: string, exportedName: string): { code: string; name: string } | undefined {
  if (!existsSync(filePath)) return undefined;

  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== exportedName) continue;

      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;

      let code: string | undefined;
      let name: string | undefined;

      for (const prop of decl.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteralLike(prop.initializer)) continue;

        const key = propertyKeyText(prop.name);

        if (key === 'code') code = prop.initializer.text;

        if (key === 'name') name = prop.initializer.text;
      }

      if (code !== undefined && name !== undefined) return { code, name };
    }
  }

  return undefined;
}

/**
 * Returns all REPL examples for a package, sorted by id. Returns [] when the package has no
 * REPL examples directory (DOM-output packages ore/prism/refine, or any package not yet wired
 * into the REPL).
 */
export function readReplExamples(repoRoot: string, slug: string): BundledExample[] {
  const dir = resolve(repoRoot, `docs/.vitepress/theme/components/repl/examples/${slug}`);
  const indexPath = resolve(dir, 'index.ts');

  if (!existsSync(indexPath)) return [];

  const indexSource = readFileSync(indexPath, 'utf8');
  const indexSourceFile = ts.createSourceFile(indexPath, indexSource, ts.ScriptTarget.Latest, true);

  const importMap = readImportMap(indexSourceFile, dirname(indexPath));
  const idMap = readExportedIdMap(indexSourceFile);

  const examples: BundledExample[] = [];

  for (const [id, identifier] of idMap) {
    const filePath = importMap.get(identifier);

    if (!filePath) continue;

    const fields = readExampleFields(filePath, identifier);

    if (fields) examples.push({ id, ...fields });
  }

  return examples.sort((a, b) => a.id.localeCompare(b.id));
}
