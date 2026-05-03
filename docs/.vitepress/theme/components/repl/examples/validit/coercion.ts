export const coercionExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst schema = v.object({\n  age: v.coerce.number(),\n  active: v.coerce.boolean(),\n  createdAt: v.coerce.date()\n})\n\n// Input with string types\nconst input = {\n  age: '25',\n  active: 'true',\n  createdAt: '2024-01-15'\n}\n\nconst result = schema.safeParse(input)\nconsole.log('Success:', result.success)\nif (result.success) {\n  console.log('Coerced data:', result.data)\n  console.log('Age type:', typeof result.data.age)\n  console.log('Active type:', typeof result.data.active)\n  console.log('Date type:', result.data.createdAt instanceof Date)\n}",
  name: 'Type Coercion',
};
