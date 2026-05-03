export const objectMergeExample = {
  code: "import { merge } from '@vielzeug/toolkit'\n\nconst obj1 = { a: 1, b: { c: 2 }, d: [1, 2] }\nconst obj2 = { b: { d: 3 }, e: 4, d: [3, 4] }\nconst obj3 = { a: 10, f: 5 }\n\nconst merged = merge('deep', obj1, obj2, obj3)\nconsole.log('Merged:', merged)\n\n// Nested merge\nconst config1 = {\n  api: { baseUrl: 'https://api.dev', timeout: 5000 },\n  features: { darkMode: true }\n}\nconst config2 = {\n  api: { timeout: 10000, retries: 3 },\n  features: { notifications: true }\n}\n\nconsole.log('Merged configs:', merge('deep', config1, config2))",
  name: 'merge - Deep merge objects',
};
