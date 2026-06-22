export const buildCspExample = {
  code: `import { buildCsp } from '@vielzeug/sandbox'

// Default strict CSP — no external resources allowed
const defaultCsp = buildCsp()
console.log('Default CSP:')
console.log(defaultCsp)

// Allow Google Fonts (stylesheet + font files)
const fontsCsp = buildCsp({
  allowedStyleOrigins: ['https://fonts.googleapis.com'],
  allowedFontOrigins: ['https://fonts.gstatic.com'],
})
console.log('\\nWith Google Fonts:')
console.log(fontsCsp)

// Allow a CDN script origin and an image host
const cdnCsp = buildCsp({
  allowedScriptOrigins: ['https://cdn.example.com'],
  allowedImageOrigins: ['https://images.example.com'],
})
console.log('\\nWith CDN + images:')
console.log(cdnCsp)`,
  name: 'Build CSP String',
};
