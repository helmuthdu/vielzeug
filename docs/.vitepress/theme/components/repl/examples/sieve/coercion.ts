export const coercionExample = {
  code: "import { s } from '/sieve'\n\nconst schema = s.object({\n  age: s.coerce.number(),\n  active: s.coerce.boolean(),\n  createdAt: s.coerce.date()\n})\n\n// Input with string types\nconst input = {\n  age: '25',\n  active: 'true',\n  createdAt: '2024-01-15'\n}\n\nconst result = schema.safeParse(input)\nconsole.log('Success:', result.success)\nif (result.success) {\n  console.log('Coerced data:', result.data)\n  console.log('Age type:', typeof result.data.age)\n  console.log('Active type:', typeof result.data.active)\n  console.log('Date type:', result.data.createdAt instanceof Date)\n}",
  name: 'Type Coercion',
};
