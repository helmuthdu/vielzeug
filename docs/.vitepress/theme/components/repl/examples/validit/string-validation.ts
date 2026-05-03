export const stringValidationExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst schemas = {\n  email: v.string().email(),\n  url: v.string().url(),\n  uuid: v.string().uuid(),\n  min: v.string().min(3),\n  max: v.string().max(10),\n  length: v.string().length(5),\n  pattern: v.string().pattern(/^[A-Z]+$/),\n}\n\nconst tests = {\n  email: 'user@example.com',\n  url: 'https://example.com',\n  uuid: '550e8400-e29b-41d4-a716-446655440000',\n  min: 'abc',\n  max: 'short',\n  length: 'exact',\n  pattern: 'HELLO'\n}\n\nObject.entries(tests).forEach(([key, value]) => {\n  const result = schemas[key].safeParse(value)\n  console.log(`${key}: ${result.success}`)\n})",
  name: 'String Validation',
};
