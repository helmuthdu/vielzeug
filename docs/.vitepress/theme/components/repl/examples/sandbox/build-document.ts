export const buildDocumentExample = {
  code: `import { buildDocument } from '@vielzeug/sandbox'

// Build a complete standalone sandbox HTML document — useful for SSR previews,
// static artifacts, or anywhere you need the document string without a live iframe.
const html = buildDocument('<h1>Hello from the sandbox</h1><p>No live iframe required.</p>', {
  lang: 'en',
  title: 'Sandbox Preview',
  namedStyles: {
    base: 'body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; }',
  },
})

console.log('Document length:', html.length, 'characters')
console.log('Has <html lang="en">:', html.includes('lang="en"'))
console.log('Has <title>Sandbox Preview</title>:', html.includes('<title>Sandbox Preview</title>'))
console.log('Has named style block #base:', html.includes('<style id="base">'))
console.log('Includes the bridge script:', html.includes('window.__sandbox__'))

console.log('\\nFirst 300 characters:')
console.log(html.slice(0, 300))`,
  name: 'Build Document',
};
