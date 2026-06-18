export const descriptorRoundtripExample = {
  code: `// Export a schema as a portable descriptor, then convert it to JSON Schema.
import { descriptorToJsonSchema, s } from '@vielzeug/spell'

const Product = s
  .object({
    price: s.number().positive().multipleOf(0.01),
    sku: s.string().regex(/^sku-[0-9]{4}$/).label('SKU'),
  })
  .relaxed()
  .label('Product payload')

// toDescriptor() returns a plain serialisable object describing the schema tree
const descriptor = Product.toDescriptor()
console.log('Kind:', descriptor.kind)
console.log('Strict:', descriptor.strict)
console.log('SKU description:', descriptor.fields.sku.description)
console.log('Price multipleOf:', descriptor.fields.price.multipleOf)

// descriptorToJsonSchema() converts the descriptor to a standard JSON Schema object
const jsonSchema = descriptorToJsonSchema(descriptor)
console.log('JSON Schema type:', jsonSchema.type)
console.log('JSON Schema additionalProperties:', jsonSchema.additionalProperties)
console.log('Required fields:', jsonSchema.required)`,
  name: 'Descriptor & JSON Schema',
};
