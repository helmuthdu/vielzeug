export const numberValidationExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst tests = [\n  { name: 'positive number', value: 42, schema: v.number().positive() },\n  { name: 'negative number', value: -5, schema: v.number().positive() },\n  { name: 'in range', value: 50, schema: v.number().max(100) },\n  { name: 'out of range', value: 150, schema: v.number().max(100) },\n  { name: 'integer', value: 5, schema: v.number().int() },\n  { name: 'float', value: 5.5, schema: v.number().int() }\n]\n\ntests.forEach(({ name, value, schema }) => {\n  const result = schema.safeParse(value)\n  console.log(`${name}: ${result.success}`)\n})",
  name: 'Number Validation',
};
