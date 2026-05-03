export const arrayGroupExample = {
  code: "import { group } from '@vielzeug/toolkit'\n\nconst items = [\n  { type: 'fruit', name: 'apple', price: 1.2 },\n  { type: 'vegetable', name: 'carrot', price: 0.8 },\n  { type: 'fruit', name: 'banana', price: 0.5 },\n  { type: 'vegetable', name: 'broccoli', price: 1.5 },\n  { type: 'fruit', name: 'orange', price: 0.9 }\n]\n\nconst byType = group(items, item => item.type)\nconsole.log('Grouped by type:', byType)\n\n// Group by price range\nconst byPriceRange = group(items, item =>\n  item.price < 1 ? 'cheap' : 'expensive'\n)\nconsole.log('Grouped by price:', byPriceRange)",
  name: 'group - Group array by key',
};
