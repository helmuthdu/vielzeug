// .ts extension required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
/**
 * Extracts exported declaration text from a package's src/index.ts (and everything it
 * re-exports via `export * from './x'`, followed recursively — most vielzeug packages are
 * one-function-per-file barrels, so the real declarations rarely live in index.ts itself),
 * keyed by exported name. Bundled once at generate time so `get-type-signature` is an O(1)
 * map lookup instead of a per-request scan.
 *
 * Walking the real AST and slicing `node.getText()` can't miscount braces inside a string
 * literal or comment the way the previous regex/brace-counting approach could, and reuses the
 * same `typescript` compiler API already used by scripts/repl-examples.ts and
 * scripts/generate-repl-registry.ts rather than a third, bespoke parsing strategy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

function hasExportModifier(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
}

function isWildcardReexport(stmt: ts.Statement): stmt is ts.ExportDeclaration & { moduleSpecifier: ts.StringLiteral } {
  return (
    ts.isExportDeclaration(stmt) &&
    !stmt.exportClause &&
    stmt.moduleSpecifier !== undefined &&
    ts.isStringLiteral(stmt.moduleSpecifier)
  );
}

/** Returns every name a (non-wildcard) statement exports, whether declared directly or re-exported by name. */
function exportedNames(stmt: ts.Statement): string[] {
  if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
    return stmt.exportClause.elements.map((el) => el.name.text);
  }

  if (!hasExportModifier(stmt)) return [];

  if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
    return stmt.name ? [stmt.name.text] : [];
  }

  if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt) || ts.isEnumDeclaration(stmt)) {
    return [stmt.name.text];
  }

  if (ts.isVariableStatement(stmt)) {
    return stmt.declarationList.declarations
      .filter((d): d is ts.VariableDeclaration & { name: ts.Identifier } => ts.isIdentifier(d.name))
      .map((d) => d.name.text);
  }

  return [];
}

function resolveRelativeModule(fromFile: string, specifier: string): string | null {
  const dir = dirname(fromFile);
  const candidates = [resolve(dir, `${specifier}.ts`), resolve(dir, specifier, 'index.ts')];

  return candidates.find((c) => existsSync(c)) ?? null;
}

/** Every file reachable from `entryFile` by following `export * from './relative'` chains, entryFile included. */
export function resolveBarrelFiles(entryFile: string): string[] {
  const visited = new Set<string>();

  function visit(filePath: string): void {
    if (visited.has(filePath) || !existsSync(filePath)) return;

    visited.add(filePath);

    const sourceFile = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);

    for (const stmt of sourceFile.statements) {
      if (!isWildcardReexport(stmt)) continue;

      const target = resolveRelativeModule(filePath, stmt.moduleSpecifier.text);

      if (target) visit(target);
    }
  }

  visit(entryFile);

  return [...visited];
}

/**
 * Maps every exported name reachable from `entryFile` (following `export *` re-exports) to its
 * declaration text. Multiple declarations for the same name (e.g. function overloads) are
 * joined with a blank line, matching how a human reading top-to-bottom would see them.
 */
export function extractExportedSignatures(entryFile: string): Record<string, string> {
  const byName = new Map<string, string[]>();

  for (const filePath of resolveBarrelFiles(entryFile)) {
    const sourceFile = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);

    for (const stmt of sourceFile.statements) {
      const names = exportedNames(stmt);

      if (names.length === 0) continue;

      const declarationText = stmt.getText(sourceFile);

      for (const name of names) {
        const existing = byName.get(name);

        if (existing) existing.push(declarationText);
        else byName.set(name, [declarationText]);
      }
    }
  }

  return Object.fromEntries([...byName].map(([name, texts]) => [name, texts.join('\n\n')]));
}
