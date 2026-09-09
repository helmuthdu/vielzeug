import { buildBridgeScript } from './_bridge.js';
import { buildCspFromOptions, type NormalizedSandboxOptions, normalizeSandboxOptions } from './_policy.js';
import type { BridgeBootstrap } from './_protocol.js';
import type { SandboxOptions } from './types.js';

function escapeCss(css: string): string {
  return css.replace(/<\/style/gi, '\\3C /style');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildDocumentFromOptions(
  html: string,
  options: NormalizedSandboxOptions,
  bootstrap: BridgeBootstrap,
): string {
  const csp = escapeAttr(buildCspFromOptions(options));
  const styles = Object.entries(options.styles)
    .map(([id, css]) => `<style id="${escapeAttr(id)}">${escapeCss(css)}</style>`)
    .join('\n');
  const scripts = options.scripts
    .map((src) => `<script crossorigin="anonymous" src="${escapeAttr(src)}"></script>`)
    .join('\n');
  const nonce = options.nonce ? ` nonce="${escapeAttr(options.nonce)}"` : '';

  return `<!doctype html>
<html lang="${escapeAttr(options.lang)}">
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(options.title)}</title>
${styles}
<script${nonce}>
${buildBridgeScript(bootstrap)}
</script>
</head>
<body>
${scripts}
${html}
</body>
</html>`;
}

export function buildDocument(html: string, options: SandboxOptions = {}): string {
  return buildDocumentFromOptions(html, normalizeSandboxOptions(options), { channel: '', generation: 0 });
}
