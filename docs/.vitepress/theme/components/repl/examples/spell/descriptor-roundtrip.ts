export const descriptorRoundtripExample = {
  code: `import { s } from '@vielzeug/spell';
import { toJsonSchema } from '@vielzeug/spell/json';

const Product = s.object({
  id: s.string().uuid(),
  name: s.string().min(1).describe('Display name'),
  price: s.number().positive(),
  sku: s.string().startsWith('SKU-'),
});

// definition() returns frozen, declarative data
const definition = Product.definition();
console.log(definition.kind); // 'object'
console.log(definition.fields.sku); // { kind: 'string', patterns: [{ flags: '', source: '^SKU-' }] }

// toJsonSchema() maps the definition to JSON Schema 2020-12
console.log(toJsonSchema(definition));

// Runtime behavior has no declarative form
try {
  Product.check(() => true).definition();
} catch (error) {
  console.log(error.name); // 'SpellDefinitionError'
}
`,
  name: 'Declarative Definition Export',
};
