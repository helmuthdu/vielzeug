export const basicSchemaExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst userSchema = v.object({\n  name: v.string().min(1).max(100),\n  email: v.string().email(),\n  age: v.number().min(0).max(150)\n})\n\n// Valid data\nconst result1 = userSchema.safeParse({\n  name: 'John Doe',\n  email: 'john@example.com',\n  age: 30\n})\n\nconsole.log('Valid:', result1.success)\nif (result1.success) {\n  console.log('Data:', result1.data)\n}\n\n// Invalid data\nconst result2 = userSchema.safeParse({\n  name: '',\n  email: 'invalid-email',\n  age: 200\n})\n\nconsole.log('\\nInvalid:', result2.success)\nif (!result2.success) {\n  console.log('Errors:', result2.error.issues)\n}",
  name: 'Basic Schema Validation',
};
