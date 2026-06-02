export const arrayGroupExample = {
  code: "import { groupBy } from '@vielzeug/arsenal'\n\nconst items = [\n  { type: 'fruit', name: 'apple', price: 1.2 },\n  { type: 'vegetable', name: 'carrot', price: 0.8 },\n  { type: 'fruit', name: 'banana', price: 0.5 },\n  { type: 'vegetable', name: 'broccoli', price: 1.5 },\n  { type: 'fruit', name: 'orange', price: 0.9 }\n]\n\nconst byType = groupBy(items, item => item.type)\nconsole.log('Grouped by type:', byType)\n\nconst byPriceRange = groupBy(items, item =>\n  item.price < 1 ? 'cheap' : 'expensive'\n)\nconsole.log('Grouped by price:', byPriceRange)",
  name: 'groupBy - Group array by key',
};
