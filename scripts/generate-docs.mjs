#!/usr/bin/env node

/**
 * Documentation Generation Script for buildit components
 *
 * Extracts JSDoc comments, type information, and generates API documentation
 * for web components in markdown format.
 *
 * Usage:
 *   node scripts/generate-docs.js [component-name]
 *   node scripts/generate-docs.js button
 *   node scripts/generate-docs.js --all
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse JSDoc comments from TypeScript file
 */
function parseJSDoc(content) {
  const jsdocPattern = /\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\//g;
  const docs = [];

  let match;
  while ((match = jsdocPattern.exec(content)) !== null) {
    const comment = match[0];
    const parsed = {
      description: '',
      params: [],
      attrs: [],
      slots: [],
      parts: [],
      events: [],
      examples: [],
      tags: {}
    };

    // Extract description (first non-tag lines)
    const lines = comment.split('\n').map(line =>
      line.replace(/^\s*\*\s?/, '').trim()
    ).filter(line => line && !line.startsWith('@'));

    parsed.description = lines.join(' ').replace(/\s+/g, ' ').trim();

    // Extract @attr tags
    const attrPattern = /@attr\s+\{([^}]+)\}\s+(\S+)\s+-\s+(.+)/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(comment)) !== null) {
      parsed.attrs.push({
        type: attrMatch[1],
        name: attrMatch[2],
        description: attrMatch[3].trim()
      });
    }

    // Extract @slot tags
    const slotPattern = /@slot\s+(\S+)\s+-\s+(.+)/g;
    let slotMatch;
    while ((slotMatch = slotPattern.exec(comment)) !== null) {
      parsed.slots.push({
        name: slotMatch[1],
        description: slotMatch[2].trim()
      });
    }

    // Extract @part tags
    const partPattern = /@part\s+(\S+)\s+-\s+(.+)/g;
    let partMatch;
    while ((partMatch = partPattern.exec(comment)) !== null) {
      parsed.parts.push({
        name: partMatch[1],
        description: partMatch[2].trim()
      });
    }

    // Extract @fires/@event tags
    const eventPattern = /@(?:fires|event)\s+(\S+)\s+-\s+(.+)/g;
    let eventMatch;
    while ((eventMatch = eventPattern.exec(comment)) !== null) {
      parsed.events.push({
        name: eventMatch[1],
        description: eventMatch[2].trim()
      });
    }

    // Extract @example tags
    const examplePattern = /@example\s+([\s\S]+?)(?=@\w+|\*\/)/g;
    let exampleMatch;
    while ((exampleMatch = examplePattern.exec(comment)) !== null) {
      parsed.examples.push(exampleMatch[1].trim());
    }

    docs.push(parsed);
  }

  return docs;
}

/**
 * Extract interface properties from TypeScript
 */
function extractInterfaceProps(content, interfaceName) {
  const interfacePattern = new RegExp(
    `interface\\s+${interfaceName}\\s*{([^}]+)}`,
    's'
  );

  const match = content.match(interfacePattern);
  if (!match) return [];

  const propsContent = match[1];
  const propPattern = /(\w+)\??:\s*([^;]+);/g;
  const props = [];

  let propMatch;
  while ((propMatch = propPattern.exec(propsContent)) !== null) {
    props.push({
      name: propMatch[1],
      type: propMatch[2].trim(),
      optional: propMatch[0].includes('?:')
    });
  }

  return props;
}

/**
 * Extract observed attributes from component class
 */
function extractObservedAttributes(content) {
  const pattern = /static\s+observedAttributes\s*=\s*\[([^\]]+)\]/;
  const match = content.match(pattern);

  if (!match) return [];

  return match[1]
    .split(',')
    .map(attr => attr.trim().replace(/['"]/g, ''))
    .filter(Boolean);
}

/**
 * Extract event types from events.ts
 */
function extractEventTypes(eventsFilePath) {
  if (!fs.existsSync(eventsFilePath)) return {};

  const content = fs.readFileSync(eventsFilePath, 'utf-8');
  const events = {};

  // Extract event detail interfaces
  const detailPattern = /export interface (\w+Detail) {([^}]+)}/g;
  let match;

  while ((match = detailPattern.exec(content)) !== null) {
    const name = match[1];
    const propsContent = match[2];
    const props = [];

    const propPattern = /(\w+)\??:\s*([^;]+);/g;
    let propMatch;

    while ((propMatch = propPattern.exec(propsContent)) !== null) {
      props.push({
        name: propMatch[1],
        type: propMatch[2].trim()
      });
    }

    events[name] = props;
  }

  return events;
}

/**
 * Generate markdown table for attributes
 */
function generateAttributesTable(attrs) {
  if (!attrs || attrs.length === 0) return '';

  let table = '\n| Attribute | Type | Description |\n';
  table += '|-----------|------|-------------|\n';

  for (const attr of attrs) {
    table += `| \`${attr.name}\` | \`${attr.type}\` | ${attr.description} |\n`;
  }

  return table;
}

/**
 * Generate markdown table for slots
 */
function generateSlotsTable(slots) {
  if (!slots || slots.length === 0) return '';

  let table = '\n| Slot | Description |\n';
  table += '|------|-------------|\n';

  for (const slot of slots) {
    const name = slot.name === '(default)' ? 'Default' : slot.name;
    table += `| \`${name}\` | ${slot.description} |\n`;
  }

  return table;
}

/**
 * Generate markdown table for CSS parts
 */
function generatePartsTable(parts) {
  if (!parts || parts.length === 0) return '';

  let table = '\n| Part | Description |\n';
  table += '|------|-------------|\n';

  for (const part of parts) {
    table += `| \`${part.name}\` | ${part.description} |\n`;
  }

  return table;
}

/**
 * Generate markdown table for events
 */
function generateEventsTable(events) {
  if (!events || events.length === 0) return '';

  let table = '\n| Event | Description |\n';
  table += '|-------|-------------|\n';

  for (const event of events) {
    table += `| \`${event.name}\` | ${event.description} |\n`;
  }

  return table;
}

/**
 * Generate API reference section
 */
function generateAPIReference(componentPath, componentName) {
  const content = fs.readFileSync(componentPath, 'utf-8');
  const docs = parseJSDoc(content);

  // Find the main component JSDoc (usually the largest one with @attr tags)
  const mainDoc = docs.find(doc => doc.attrs.length > 0) || docs[0];

  if (!mainDoc) {
    console.warn(`No JSDoc found for ${componentName}`);
    return '';
  }

  let apiRef = '## API Reference\n\n';

  // Attributes
  if (mainDoc.attrs.length > 0) {
    apiRef += '### Attributes\n';
    apiRef += generateAttributesTable(mainDoc.attrs);
    apiRef += '\n';
  }

  // Slots
  if (mainDoc.slots.length > 0) {
    apiRef += '### Slots\n';
    apiRef += generateSlotsTable(mainDoc.slots);
    apiRef += '\n';
  }

  // CSS Parts
  if (mainDoc.parts.length > 0) {
    apiRef += '### CSS Parts\n';
    apiRef += generatePartsTable(mainDoc.parts);
    apiRef += '\n\n';
    apiRef += '**Styling Shadow Parts:**\n\n';
    apiRef += '```css\n';
    apiRef += `/* Style the ${mainDoc.parts[0].name} part */\n`;
    apiRef += `bit-${componentName}::part(${mainDoc.parts[0].name}) {\n`;
    apiRef += '  /* Your custom styles */\n';
    apiRef += '}\n';
    apiRef += '```\n\n';
  }

  // Events
  if (mainDoc.events.length > 0) {
    apiRef += '### Events\n';
    apiRef += generateEventsTable(mainDoc.events);
    apiRef += '\n';
  }

  return apiRef;
}

/**
 * Generate TypeScript types section
 */
function generateTypesSection(componentPath, componentName) {
  const content = fs.readFileSync(componentPath, 'utf-8');

  // Extract interface if exists
  const propsInterfaceName = `Bit${componentName.charAt(0).toUpperCase() + componentName.slice(1)}Props`;
  const props = extractInterfaceProps(content, propsInterfaceName);

  if (props.length === 0) return '';

  let section = '## TypeScript\n\n';
  section += '### Component Interface\n\n';
  section += '```typescript\n';
  section += `interface ${propsInterfaceName} {\n`;

  for (const prop of props) {
    const optional = prop.optional ? '?' : '';
    section += `  ${prop.name}${optional}: ${prop.type};\n`;
  }

  section += '}\n';
  section += '```\n\n';

  section += '### Type-Safe Usage\n\n';
  section += '```typescript\n';
  section += `import type { ${propsInterfaceName} } from '@vielzeug/buildit';\n\n`;
  section += `const button = document.querySelector<HTMLElement & ${propsInterfaceName}>('bit-${componentName}');\n`;
  section += `button.variant = 'outline'; // Type-safe!\n`;
  section += '```\n\n';

  return section;
}

/**
 * Process a single component
 */
function processComponent(componentName, componentPath) {
  console.log(`Processing ${componentName}...`);

  const apiReference = generateAPIReference(componentPath, componentName);
  const typesSection = generateTypesSection(componentPath, componentName);

  // Output to console or file
  const output = `${apiReference}${typesSection}`;

  return output;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const builditSrc = path.join(__dirname, '../packages/buildit/src');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Generator for buildit

Usage:
  node scripts/generate-docs.js <component-name>
  node scripts/generate-docs.js button
  node scripts/generate-docs.js --all

Options:
  --all       Generate docs for all components
  --help, -h  Show this help message
    `);
    return;
  }

  if (args.includes('--all')) {
    // Process all components
    const categories = ['base', 'form', 'layout'];

    for (const category of categories) {
      const categoryPath = path.join(builditSrc, category);
      if (!fs.existsSync(categoryPath)) continue;

      const components = fs.readdirSync(categoryPath).filter(item => {
        const itemPath = path.join(categoryPath, item);
        return fs.statSync(itemPath).isDirectory();
      });

      for (const component of components) {
        const componentFile = path.join(categoryPath, component, `${component}.ts`);
        if (fs.existsSync(componentFile)) {
          const output = processComponent(component, componentFile);
          console.log(output);
          console.log('\n---\n');
        }
      }
    }
  } else if (args.length > 0) {
    // Process single component
    const componentName = args[0];
    const categories = ['base', 'form', 'layout'];

    let found = false;
    for (const category of categories) {
      const componentFile = path.join(builditSrc, category, componentName, `${componentName}.ts`);
      if (fs.existsSync(componentFile)) {
        const output = processComponent(componentName, componentFile);
        console.log(output);
        found = true;
        break;
      }
    }

    if (!found) {
      console.error(`Component "${componentName}" not found in base, form, or layout categories.`);
      process.exit(1);
    }
  } else {
    console.error('Please specify a component name or use --all');
    console.error('Usage: node scripts/generate-docs.js <component-name>');
    console.error('       node scripts/generate-docs.js --all');
    process.exit(1);
  }
}

main();
