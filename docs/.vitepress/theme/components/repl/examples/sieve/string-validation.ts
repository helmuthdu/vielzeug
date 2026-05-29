export const stringValidationExample = {
  code: "import { s } from '/sieve'\n\nconst checks = [\n  { name: 'email', schema: s.string().email(), value: 'user@example.com' },\n  { name: 'url', schema: s.string().url(), value: 'https://example.com' },\n  { name: 'uuid', schema: s.string().uuid(), value: '550e8400-e29b-41d4-a716-446655440000' },\n  { name: 'min', schema: s.string().min(3), value: 'abc' },\n  { name: 'max', schema: s.string().max(10), value: 'short' },\n  { name: 'length', schema: s.string().length(5), value: 'exact' },\n  { name: 'regex', schema: s.string().regex(/^[A-Z]+$/), value: 'HELLO' }\n]\n\nchecks.forEach(({ name, schema, value }) => {\n  const result = schema.safeParse(value)\n  console.log(`${name}: ${result.success}`)\n})",
  name: 'String Validation',
};
