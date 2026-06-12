export const descriptorRoundtripExample = {
  code: `// Round-trip a portable schema descriptor for tooling and runtime reuse.
import { fromDescriptor, s } from '@vielzeug/spell'

const Product = s
  .object({
    price: s.number().positive().multipleOf(0.01),
    sku: s.string().regex(/^sku-[0-9]{4}$/).label('SKU'),
  })
  .relaxed()
  .label('Product payload')

const descriptor = Product.toDescriptor()
const rebuilt = fromDescriptor(descriptor)

console.log('Descriptor strict:', descriptor.strict)
console.log('Price multipleOf:', descriptor.fields.price.multipleOf)
console.log('SKU description:', descriptor.fields.sku.description)
console.log('Round-trip valid:', rebuilt.safeParse({ sku: 'sku-1024', price: 19.99, extra: true }).success)
console.log('Round-trip invalid:', rebuilt.safeParse({ sku: 'bad', price: -1 }).success)`,
  name: 'Descriptor Round-Trip',
};
