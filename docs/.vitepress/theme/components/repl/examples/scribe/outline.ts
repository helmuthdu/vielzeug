export const outlineExample = {
  code: `import { parseProse, proseOutline, proseToText } from '@vielzeug/scribe'

const doc = parseProse('# Install\\n\\nRun the installer.\\n\\n## Configure\\n\\nEdit the config.\\n\\n## Troubleshoot\\n\\nCheck the logs.')

// TOC entries with stable slug ids (they match renderProseHtml's headingIds ids).
console.log(JSON.stringify(proseOutline(doc), null, 0))

// Plain text for notifications and search indexes.
console.log(proseToText(doc))`,
  name: 'Outline and plain text',
};
