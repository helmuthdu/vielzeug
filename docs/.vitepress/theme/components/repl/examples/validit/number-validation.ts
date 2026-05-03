export const numberValidationExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst schemas = {\n  basic: v.number(),\n  positive: v.number().positive(),\n  min: v.number().min(0),\n  max: v.number().max(100),\n  int: v.number().int(),\n}\n\nconst tests = [\n  { name: 'positive number', value: 42, schema: 'positive' },\n  { name: 'negative number', value: -5, schema: 'positive' },\n  { name: 'in range', value: 50, schema: 'max' },\n  { name: 'out of range', value: 150, schema: 'max' },\n  { name: 'integer', value: 5, schema: 'int' },\n  { name: 'float', value: 5.5, schema: 'int' }\n]\n\ntests.forEach(({ name, value, schema }) => {\n  const result = schemas[schema].safeParse(value)\n  console.log(`${name}: ${result.success}`)\n})",
  name: 'Number Validation',
};
