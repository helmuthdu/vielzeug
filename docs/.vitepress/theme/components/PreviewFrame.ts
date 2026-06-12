// Generates the srcdoc HTML for the preview iframe sandbox

export interface PreviewFrameOptions {
  html: string;
  script: string;
  sigilStyles: string;
  prismStyles: string;
  dir?: 'ltr' | 'rtl';
}

export function buildFrameSrcdoc(opts: PreviewFrameOptions): string {
  const { dir = 'ltr', html, prismStyles, script, sigilStyles } = opts;

  const scriptBlock = script ? `<script> (function() { ${script} })();</script>` : '';

  return `<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${sigilStyles}</style>
  <style>${prismStyles}</style>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; }
    body { padding: var(--size-4, 1rem); font-family: inherit; }
  </style>
</head>
<body>
${html}
${scriptBlock}
</body>
</html>`;
}
