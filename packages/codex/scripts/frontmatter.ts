/**
 * Minimal YAML frontmatter parser.
 * Supported formats: inline arrays [a,b,c], block sequences (- item),
 * quoted strings, values containing colons, and CRLF line endings.
 */
const MAX_FRONTMATTER_INPUT = 102_400; // 100 KB — frontmatter is always tiny; guard against crafted large inputs

export function parseFrontmatter(markdown: string): Record<string, string | string[]> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown.slice(0, MAX_FRONTMATTER_INPUT));

  if (!match?.[1]) return {};

  const lines = match[1].split(/\r?\n/);
  const result: Record<string, string | string[]> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines and comments
    if (!line || line.trimStart().startsWith('#')) {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(':');

    if (colonIdx < 1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();

    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      i++;
      continue;
    }

    const rest = line.slice(colonIdx + 1).trim();

    // Inline array: keywords: [mcp, ai-agent, claude]
    // Also handles multi-line bracket arrays:
    //   exports:
    //     [
    //       createServer,
    //       createServerFromDisk,
    //     ]
    if (rest.startsWith('[')) {
      let raw = rest;

      if (!rest.endsWith(']')) {
        i++;

        while (i < lines.length) {
          const next = lines[i]?.trim() ?? '';

          raw += ',' + next;
          i++;

          if (next.endsWith(']')) break;
        }
      } else {
        i++;
      }

      result[key] = raw
        .slice(raw.indexOf('[') + 1, raw.lastIndexOf(']'))
        .split(',')
        .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);

      continue;
    }

    // Empty value → look ahead for block sequence items (- item) or a multi-line bracket array
    if (rest === '') {
      i++;

      // Multi-line bracket array:
      //   exports:
      //     [
      //       createServer,
      //       createServerFromDisk,
      //     ]
      if (lines[i]?.trim().startsWith('[')) {
        let raw = '';

        while (i < lines.length) {
          const next = lines[i]?.trim() ?? '';

          raw += ',' + next;
          i++;

          if (next.endsWith(']')) break;
        }

        result[key] = raw
          .slice(raw.indexOf('[') + 1, raw.lastIndexOf(']'))
          .split(',')
          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
          .filter(Boolean);

        continue;
      }

      const items: string[] = [];

      while (i < lines.length) {
        const next = lines[i];

        if (!next?.trim()) break;

        const trimmed = next.trim();

        if (trimmed.startsWith('- ')) {
          items.push(
            trimmed
              .slice(2)
              .replace(/^['"`]|['"`]$/g, '')
              .trim(),
          );
          i++;
        } else {
          break;
        }
      }

      if (items.length > 0) result[key] = items;

      continue;
    }

    // Regular string — strip surrounding quotes
    result[key] = rest.replace(/^['"`]|['"`]$/g, '');
    i++;
  }

  return result;
}
