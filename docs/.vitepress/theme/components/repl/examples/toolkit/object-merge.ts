export const objectMergeExample = {
  code: "import { deepMerge, shallowMerge } from '@vielzeug/toolkit'\n\nconst obj1 = { a: 1, b: { c: 2 }, d: [1, 2] }\nconst obj2 = { b: { d: 3 }, e: 4, d: [3, 4] }\nconst obj3 = { a: 10, f: 5 }\n\nconst deeplyMerged = deepMerge(obj1, obj2, obj3)\nconsole.log('Deep merge:', deeplyMerged)\n\nconst shallowlyMerged = shallowMerge(obj1, obj2, obj3)\nconsole.log('Shallow merge:', shallowlyMerged)\n\nconst config1 = {\n  api: { baseUrl: 'https://api.dev', timeout: 5000 },\n  features: { darkMode: true },\n}\nconst config2 = {\n  api: { timeout: 10000, retries: 3 },\n  features: { notifications: true },\n}\n\nconsole.log('Merged configs:', deepMerge(config1, config2))",
  name: 'deepMerge - Merge objects',
};
