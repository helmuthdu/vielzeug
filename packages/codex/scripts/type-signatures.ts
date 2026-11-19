// Explicit .ts import extensions are the repo convention for these scripts (run directly under bun, never compiled by tsc).
/**
 * Resolves each package's real public exports through the TypeScript checker at generate time.
 * One `Program` covers every package's `src/index.ts` entry point; `checker.getExportsOfModule`
 * gives the true export list (following `export *` and aliases with `getAliasedSymbol`), so the
 * answer is the compiler's own view rather than a text slice of whichever statement mentioned
 * the name. Each export's signature is the declaration text including its JSDoc, taken from the
 * source file with `node.getStart(sourceFile, true)`.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

import type { ExportEntry } from '../src/types.ts';

export interface PackageExports {
  readonly slug: string;
  readonly exports: ExportEntry[];
}

function kindOf(symbol: ts.Symbol): ExportEntry['kind'] | null {
  const declared = symbol.valueDeclaration ?? symbol.declarations?.find((d) => !ts.isTypeOnlyExportDeclaration(d));

  if (!declared) return null;
  if (ts.isInterfaceDeclaration(declared)) return 'interface';
  if (ts.isTypeAliasDeclaration(declared)) return 'type';
  if (ts.isClassDeclaration(declared)) return 'class';
  if (ts.isFunctionDeclaration(declared)) return 'function';
  if (ts.isVariableDeclaration(declared)) {
    return ts.getCombinedModifierFlags(declared) & ts.ModifierFlags.Const ? 'const' : 'variable';
  }
  if (ts.isEnumDeclaration(declared)) return 'const';

  return null;
}

/** The declaration text including leading JSDoc and decorators, as written in source. */
function declarationText(node: ts.Node, sourceFile: ts.SourceFile): string {
  const start = node.getStart(sourceFile, true);

  return sourceFile.text.slice(start, node.getEnd()).trim();
}

/** The first paragraph of a symbol's JSDoc as a single line, when present. */
function docSummary(symbol: ts.Symbol, checker: ts.TypeChecker): string | undefined {
  const text = symbol.getDocumentationComment(checker);
  if (text.length === 0) return undefined;

  const summary = ts.displayPartsToString(text).trim().replace(/\s+/g, ' ');

  return summary.length > 0 ? summary : undefined;
}

/** Find the statement-level declaration node to slice for a symbol's export. */
function declarationNode(symbol: ts.Symbol): ts.Declaration | undefined {
  const value = symbol.valueDeclaration;

  if (value) {
    // Variable declarations live inside a VariableStatement; slice the whole statement so the
    // `export const` keyword is part of the signature.
    if (ts.isVariableDeclaration(value) && value.parent?.parent && ts.isVariableStatement(value.parent.parent)) {
      return value.parent.parent;
    }

    return value;
  }

  return symbol.declarations?.find(
    (d) => ts.isInterfaceDeclaration(d) || ts.isTypeAliasDeclaration(d) || ts.isEnumDeclaration(d),
  );
}

/**
 * Resolve every package entry point in one Program and return the checker-verified public
 * exports per package, sorted by name. Entry points that do not exist are skipped.
 */
export function resolvePackageExports(repoRoot: string, slugs: readonly string[]): PackageExports[] {
  const entryPoints = slugs
    .map((slug) => ({ slug, file: resolve(repoRoot, 'packages', slug, 'src/index.ts') }))
    .filter((entry) => existsSync(entry.file));

  if (entryPoints.length === 0) return [];

  const program = ts.createProgram(
    entryPoints.map((entry) => entry.file),
    { allowJs: false, moduleResolution: ts.ModuleResolutionKind.Bundler, noResolve: false, strict: false, target: ts.ScriptTarget.ES2022 },
  );
  const checker = program.getTypeChecker();
  const results: PackageExports[] = [];

  for (const { slug, file } of entryPoints) {
    const sourceFile = program.getSourceFile(file);

    if (!sourceFile || !ts.isSourceFile(sourceFile)) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    if (!moduleSymbol) continue;

    const exports: ExportEntry[] = [];

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      // Follow `export * from` / `export { x as y }` aliases to the real declaration.
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const kind = kindOf(symbol);
      const node = kind === null ? undefined : declarationNode(symbol);

      if (kind === null || !node) continue;

      const nodeSourceFile = node.getSourceFile();
      const signature = declarationText(node, nodeSourceFile);
      const doc = docSummary(symbol, checker);

      exports.push({
        ...(doc ? { doc } : {}),
        kind,
        name: exported.name,
        signature,
      });
    }

    exports.sort((left, right) => left.name.localeCompare(right.name));
    results.push({ exports, slug });
  }

  return results;
}
