/**
 * CEM Analyzer plugin for the Sigil `define<Props>(TAG, config)` factory pattern.
 *
 * The standard CEM analyzer only detects `customElements.define()` calls and class-based
 * custom elements. Sigil components are registered via a functional `define<Props>(TAG, {...})`
 * factory. This plugin hooks into the `analyzePhase` to detect that call pattern and builds
 * a full CEM `CustomElement` declaration from the JSDoc block that immediately precedes the
 * `export const TAG = '...'` statement which must appear right before each `define(...)` call.
 *
 * Supported JSDoc tags:
 *   @element, @attr, @fires, @slot, @part, @cssprop, @example
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract JSDoc comment text from a node, walking up to find the preceding
 * `export const TAG = '...'` or the `define(...)` call itself.
 */
function getLeadingJsDoc(ts, node, sourceFile) {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.getFullStart());

  if (!ranges || ranges.length === 0) return null;

  // Take the last (closest) comment block
  const last = ranges[ranges.length - 1];

  if (last.kind !== ts.SyntaxKind.MultiLineCommentTrivia) return null;

  const raw = fullText.slice(last.pos, last.end);

  if (!raw.startsWith('/**')) return null;

  return raw;
}

/**
 * Strip JSDoc comment delimiters and leading " * " from each line,
 * returning an array of trimmed lines.
 */
function parseJsDocLines(raw) {
  return raw
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trimEnd())
    .filter((l) => l.length > 0);
}

/**
 * Parse a single `@tag rest` line into { tag, rest }.
 */
function parseTag(line) {
  const m = line.match(/^@(\S+)\s*(.*)/s);

  if (!m) return null;

  return { tag: m[1], rest: m[2].trim() };
}

/**
 * Extract a union type string from a description that contains quoted enum values.
 * e.g. "Theme color: 'primary' | 'secondary' | 'error'" → "'primary' | 'secondary' | 'error'"
 * Returns null if no quoted values found.
 */
function extractEnumFromDescription(description) {
  // Match sequences of 'value' separated by |
  const matches = description.match(/('[^']+')(\s*\|\s*'[^']+')+/);

  if (matches) return matches[0].trim();

  // Single quoted value only — not an enum, skip
  return null;
}

/**
 * Extract a default value from a description containing "(default: X)" or "default: X".
 * Returns the default string or null.
 */
function extractDefaultFromDescription(description) {
  const m = description.match(/\(default:\s*([^)]+)\)/i) || description.match(/default:\s*(\S+)/i);

  return m ? m[1].trim() : null;
}

/**
 * Parse `{type} name - description` pattern used by @attr.
 * Also handles `{type} name` without description.
 * Promotes inline quoted enum values in description to proper union type.text.
 * Extracts (default: X) annotations into a separate default field.
 */
function parseAttrRest(rest) {
  const typeMatch = rest.match(/^\{([^}]+)\}\s*(.*)/);
  const rawType = typeMatch ? typeMatch[1].trim() : 'string';
  const remainder = typeMatch ? typeMatch[2].trim() : rest.trim();
  const dashIdx = remainder.indexOf(' - ');
  const name = dashIdx !== -1 ? remainder.slice(0, dashIdx).trim() : remainder.trim();
  const description = dashIdx !== -1 ? remainder.slice(dashIdx + 3).trim() : '';

  // Promote enum values from description to type.text if the raw type is plain 'string'
  let resolvedType = rawType;

  if (rawType === 'string' && description) {
    const enumStr = extractEnumFromDescription(description);

    if (enumStr) resolvedType = enumStr;
  }

  // Extract default value
  const defaultValue = description ? extractDefaultFromDescription(description) : null;

  return { type: resolvedType, name, description, default: defaultValue ?? undefined };
}

/**
 * Parse `eventName - description` or `eventName description` for @fires.
 */
function parseFiringRest(rest) {
  const dashIdx = rest.indexOf(' - ');

  if (dashIdx !== -1) {
    return { name: rest.slice(0, dashIdx).trim(), description: rest.slice(dashIdx + 3).trim() };
  }

  const spaceIdx = rest.indexOf(' ');

  if (spaceIdx !== -1) {
    return { name: rest.slice(0, spaceIdx).trim(), description: rest.slice(spaceIdx + 1).trim() };
  }

  return { name: rest.trim(), description: '' };
}

/**
 * Parse `slotName - description` or just `- description` (default slot).
 */
function parseSlotRest(rest) {
  if (!rest || rest.startsWith('-')) {
    return { name: '', description: rest.replace(/^-\s*/, '').trim() };
  }

  const dashIdx = rest.indexOf(' - ');

  if (dashIdx !== -1) {
    return { name: rest.slice(0, dashIdx).trim(), description: rest.slice(dashIdx + 3).trim() };
  }

  return { name: rest.trim(), description: '' };
}

/**
 * Build a CEM declaration object from parsed JSDoc lines for a given tag name + class name.
 */
function buildDeclaration(tagName, className, lines) {
  const declaration = {
    kind: 'class',
    name: className,
    tagName,
    customElement: true,
    description: '',
    summary: '',
    attributes: [],
    events: [],
    slots: [],
    cssParts: [],
    cssProperties: [],
    demos: [],
    members: [],
  };

  let descriptionLines = [];
  let inExample = false;
  let exampleLines = [];
  let examples = [];

  for (const line of lines) {
    const tagged = parseTag(line);

    if (!tagged) {
      if (inExample) {
        exampleLines.push(line);
      } else {
        descriptionLines.push(line);
      }

      continue;
    }

    const { tag, rest } = tagged;

    if (tag === 'example') {
      if (inExample && exampleLines.length) {
        examples.push(exampleLines.join('\n'));
        exampleLines = [];
      }

      inExample = true;

      if (rest) exampleLines.push(rest);

      continue;
    }

    // Any new @tag ends an open example block
    if (inExample) {
      examples.push(exampleLines.join('\n'));
      exampleLines = [];
      inExample = false;
    }

    if (tag === 'element') {
      // Skip — we already have tagName; additional @element lines name children (ignore here)
      continue;
    }

    if (tag === 'attr') {
      const { type, name, description, default: defaultValue } = parseAttrRest(rest);

      if (name) {
        // Infer boolean type from {boolean} annotation
        const attrType = type === 'boolean' ? { text: 'boolean' } : { text: type };

        const attrEntry = { name, type: attrType, description };

        if (defaultValue !== undefined) attrEntry.default = defaultValue;

        declaration.attributes.push(attrEntry);
      }

      continue;
    }

    if (tag === 'fires' || tag === 'event') {
      const { name, description } = parseFiringRest(rest);

      if (name) {
        declaration.events.push({ name, description, type: { text: 'CustomEvent' } });
      }

      continue;
    }

    if (tag === 'slot') {
      const { name, description } = parseSlotRest(rest);

      declaration.slots.push({ name, description });
      continue;
    }

    if (tag === 'part') {
      const dashIdx = rest.indexOf(' - ');
      const partName = dashIdx !== -1 ? rest.slice(0, dashIdx).trim() : rest.trim();
      const partDesc = dashIdx !== -1 ? rest.slice(dashIdx + 3).trim() : '';

      if (partName) {
        declaration.cssParts.push({ name: partName, description: partDesc });
      }

      continue;
    }

    if (tag === 'cssprop' || tag === 'cssvar' || tag === 'css-property') {
      const dashIdx = rest.indexOf(' - ');
      const propName = dashIdx !== -1 ? rest.slice(0, dashIdx).trim() : rest.trim();
      const propDesc = dashIdx !== -1 ? rest.slice(dashIdx + 3).trim() : '';

      if (propName) {
        declaration.cssProperties.push({ name: propName, description: propDesc });
      }

      continue;
    }

    if (tag === 'summary') {
      declaration.summary = rest;
      continue;
    }
  }

  // Close any open example
  if (inExample && exampleLines.length) {
    examples.push(exampleLines.join('\n'));
  }

  declaration.description = descriptionLines.join('\n').trim();

  if (examples.length > 0) {
    declaration.demos = examples.map((source) => ({ url: '', description: source }));
  }

  return declaration;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export function sigilCemPlugin() {
  // Per-module store: tagName → raw JSDoc string, collected in analyzePhase
  const jsDocByTag = new Map();

  return {
    name: 'sigil-define-plugin',

    /**
     * packageLinkPhase: After the built-in analyzer has created bare declarations
     * for `customElements.define(tag, class extends HTMLElement {})` patterns
     * (e.g. sg-tr/sg-th/sg-td in table.ts), merge the JSDoc data we collected
     * during analyzePhase into those stubs. These stubs only appear in the manifest
     * at the package-link phase, not the module-link phase.
     */
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
          if (!decl.tagName || !decl.tagName.startsWith('sg-')) continue;

          // Only patch stubs — declarations with no description and no attributes/demos
          const isStub =
            (!decl.description || decl.description.trim() === '') &&
            (!decl.attributes || decl.attributes.length === 0) &&
            (!decl.demos || decl.demos.length === 0);

          if (!isStub) continue;

          const jsDocRaw = jsDocByTag.get(decl.tagName);

          if (!jsDocRaw) continue;

          const lines = parseJsDocLines(jsDocRaw);

          if (lines.length === 0) continue;

          const className = decl.name || decl.tagName;
          const patched = buildDeclaration(decl.tagName, className, lines);

          // Merge non-empty fields from patched into existing decl
          if (patched.description) decl.description = patched.description;

          if (patched.summary) decl.summary = patched.summary;

          if (patched.attributes?.length) decl.attributes = patched.attributes;

          if (patched.events?.length) decl.events = patched.events;

          if (patched.slots?.length) decl.slots = patched.slots;

          if (patched.cssParts?.length) decl.cssParts = patched.cssParts;

          if (patched.cssProperties?.length) decl.cssProperties = patched.cssProperties;

          if (patched.demos?.length) decl.demos = patched.demos;
        }
      }
    },

    analyzePhase({ ts, node, moduleDoc, context }) {
      // ── Pass 1: collect JSDoc for customElements.define('sg-...') stubs ──────
      // These are handled by the built-in analyzer but produce bare declarations.
      // We store the JSDoc here so moduleLinkPhase can enrich them.
      //
      // Handles two patterns:
      //   customElements.define('sg-tr', class extends HTMLElement {});
      //   if (!customElements.get('sg-tr')) customElements.define('sg-tr', ...);
      {
        const sourceFile = node.getSourceFile();

        // Look for expression statements or if-statements containing customElements.define
        let defineCallNode = null;

        if (ts.isExpressionStatement(node)) {
          const expr = node.expression;

          if (
            ts.isCallExpression(expr) &&
            ts.isPropertyAccessExpression(expr.expression) &&
            ts.isIdentifier(expr.expression.expression) &&
            expr.expression.expression.text === 'customElements' &&
            expr.expression.name.text === 'define' &&
            expr.arguments.length >= 1 &&
            ts.isStringLiteral(expr.arguments[0]) &&
            expr.arguments[0].text.startsWith('sg-')
          ) {
            defineCallNode = node;
          }
        } else if (ts.isIfStatement(node)) {
          // if (!customElements.get(...)) customElements.define(...)
          const thenStmt = node.thenStatement;
          const thenExpr = ts.isExpressionStatement(thenStmt)
            ? thenStmt.expression
            : ts.isBlock(thenStmt) && thenStmt.statements.length === 1
              ? thenStmt.statements[0].expression
              : null;

          if (
            thenExpr &&
            ts.isCallExpression(thenExpr) &&
            ts.isPropertyAccessExpression(thenExpr.expression) &&
            thenExpr.expression.name.text === 'define' &&
            thenExpr.arguments.length >= 1 &&
            ts.isStringLiteral(thenExpr.arguments[0]) &&
            thenExpr.arguments[0].text.startsWith('sg-')
          ) {
            defineCallNode = node;
          }
        }

        if (defineCallNode) {
          // Get tag name from either the expression or the if-block's then-call
          let tagName = null;

          if (ts.isExpressionStatement(defineCallNode)) {
            tagName = defineCallNode.expression.arguments[0].text;
          } else if (ts.isIfStatement(defineCallNode)) {
            const thenStmt = defineCallNode.thenStatement;
            const thenExpr = ts.isExpressionStatement(thenStmt)
              ? thenStmt.expression
              : thenStmt.statements[0].expression;

            tagName = thenExpr.arguments[0].text;
          }

          if (tagName && !jsDocByTag.has(tagName)) {
            // Walk back siblings to find the JSDoc-bearing statement
            const parent = defineCallNode.parent;
            const stmts = ts.isBlock(parent) ? parent.statements : ts.isSourceFile(parent) ? parent.statements : null;

            if (stmts) {
              const myIdx = stmts.findIndex((s) => s === defineCallNode);
              let jsDocRaw = getLeadingJsDoc(ts, defineCallNode, sourceFile);

              if (!jsDocRaw) {
                for (let i = myIdx - 1; i >= Math.max(0, myIdx - 3); i--) {
                  const raw = getLeadingJsDoc(ts, stmts[i], sourceFile);

                  if (raw && raw.includes(`@element ${tagName}`)) {
                    jsDocRaw = raw;
                    break;
                  }
                }
              }

              if (jsDocRaw) jsDocByTag.set(tagName, jsDocRaw);
            }
          }
        }
      }

      // ── Pass 2: define<Props>(TAG) factory pattern ────────────────────────
      // We look for: export const FOO_TAG = 'sg-foo' as const;
      // followed immediately by: define<Props>(FOO_TAG, { ... })
      //
      // Strategy: when we see a `define(...)` call expression as an expression statement,
      // look at the first argument — if it's an identifier referencing a const string 'sg-*',
      // we resolve the tag name, then walk back to find the preceding JSDoc.

      if (ts.isExpressionStatement(node)) {
        const expr = node.expression;

        // Match: define<...>(TAG, ...) or define(TAG, ...)
        if (
          ts.isCallExpression(expr) &&
          ts.isIdentifier(expr.expression) &&
          expr.expression.text === 'define' &&
          expr.arguments.length >= 1
        ) {
          const tagArg = expr.arguments[0];
          let tagName = null;

          // Resolve the tag name: either a string literal directly or via identifier → const
          if (ts.isStringLiteral(tagArg)) {
            tagName = tagArg.text;
          } else if (ts.isIdentifier(tagArg)) {
            // Walk the source file to find `const IDENTIFIER = 'sg-...' as const`
            const sourceFile = node.getSourceFile();
            const text = sourceFile.getFullText();
            // Quick regex scan for the export const declaration
            const varName = tagArg.text;
            const constMatch = text.match(new RegExp(`export\\s+const\\s+${varName}\\s*=\\s*['"]([^'"]+)['"]`));

            if (constMatch) {
              tagName = constMatch[1];
            }
          }

          if (!tagName || !tagName.startsWith('sg-')) return;

          // Derive class name from tag: sg-foo-bar → SgFooBarElement
          const className =
            tagName
              .split('-')
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join('') + 'Element';

          // Find the JSDoc: it belongs to the preceding `export const TAG = '...'` statement,
          // or, if not found, the define() call's own leading comment.
          const sourceFile = node.getSourceFile();
          const fullText = sourceFile.getFullText();

          // Walk siblings of the parent block to find the preceding export const statement
          let jsDocRaw = null;
          const parent = node.parent;

          if (parent && (ts.isBlock(parent) || ts.isSourceFile(parent))) {
            const stmts = ts.isBlock(parent) ? parent.statements : parent.statements;
            const myIdx = stmts.findIndex((s) => s === node);

            // Walk ALL prior siblings (not just 3) for the JSDoc-bearing export const
            for (let i = myIdx - 1; i >= 0; i--) {
              const prev = stmts[i];

              if (ts.isVariableStatement(prev) && prev.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
                const raw = getLeadingJsDoc(ts, prev, sourceFile);

                if (raw && raw.includes(`@element ${tagName}`)) {
                  jsDocRaw = raw;
                  break;
                }
              }
            }
          }

          // Fallback: JSDoc on the define() call itself
          if (!jsDocRaw) {
            jsDocRaw = getLeadingJsDoc(ts, node, sourceFile);
          }

          // Last resort: text-scan the whole file for a JSDoc block containing @element TAG
          // (handles cases where export const TAG and define(TAG) are far apart)
          if (!jsDocRaw) {
            const needle = `@element ${tagName}`;
            let searchFrom = 0;

            while (true) {
              const idx = fullText.indexOf(needle, searchFrom);

              if (idx === -1) break;

              // Walk backwards to find the opening /** of this JSDoc block
              const blockEnd = fullText.lastIndexOf('*/', idx);
              const blockStart = fullText.lastIndexOf('/**', blockEnd);

              if (blockStart !== -1 && blockEnd !== -1) {
                const candidate = fullText.slice(blockStart, blockEnd + 2);

                // Make sure this is the primary @element declaration (first @element in block)
                const firstElement = candidate.match(/@element\s+(\S+)/);

                if (firstElement && firstElement[1] === tagName) {
                  jsDocRaw = candidate;
                  break;
                }
              }

              searchFrom = idx + 1;
            }
          }

          if (!jsDocRaw) return;

          const lines = parseJsDocLines(jsDocRaw);

          if (lines.length === 0) return;

          const declaration = buildDeclaration(tagName, className, lines);

          // Avoid duplicates (table.ts registers some elements via customElements.define too)
          const existing = moduleDoc.declarations ?? [];
          const alreadyPresent = existing.some((d) => d.tagName === tagName || d.name === className);

          if (alreadyPresent) return;

          if (!moduleDoc.declarations) moduleDoc.declarations = [];

          moduleDoc.declarations.push(declaration);

          // Register in exports
          if (!moduleDoc.exports) moduleDoc.exports = [];

          const alreadyExported = moduleDoc.exports.some((e) => e.name === className);

          if (!alreadyExported) {
            moduleDoc.exports.push({
              kind: 'custom-element-definition',
              name: className,
              declaration: { name: className, module: moduleDoc.path },
            });
          }
        }
      }
    },
  };
}
