export const numberValidationExample = {
  code: "import { s } from '/spell'\n\nconst tests = [\n  { name: 'positive number', value: 42, schema: s.number().positive() },\n  { name: 'negative number', value: -5, schema: s.number().positive() },\n  { name: 'in range', value: 50, schema: s.number().max(100) },\n  { name: 'out of range', value: 150, schema: s.number().max(100) },\n  { name: 'integer', value: 5, schema: s.number().int() },\n  { name: 'float', value: 5.5, schema: s.number().int() }\n]\n\ntests.forEach(({ name, value, schema }) => {\n  const result = schema.safeParse(value)\n  console.log(`${name}: ${result.success}`)\n})",
  name: 'Number Validation',
};
