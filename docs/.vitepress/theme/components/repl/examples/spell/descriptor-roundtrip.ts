export const descriptorRoundtripExample = {
  code: `import { s } from '@vielzeug/spell'
import { fromDefinition } from '@vielzeug/spell/json'

const Product = s.object({
  id: s.string().uuid(),
  name: s.string().min(1),
  price: s.number().positive(),
})

const definition = Product.definition()
const jsonSchema = fromDefinition(definition)

console.log(definition.kind)
console.log(jsonSchema)`,
  name: 'Declarative Definition Export',
};
