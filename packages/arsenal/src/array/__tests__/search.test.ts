import { search } from '../search';

describe('fuzzy', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
  ];

  it('should return both objects for a matching search string', () => {
    const result = search(data, 'doe', { threshold: 0.25 });

    expect(result).toEqual(data);
  });

  it('should return all items for an empty search string', () => {
    const emptyResult = search(data, '', { threshold: 0.25 });

    expect(emptyResult).toEqual(data);
  });

  it('should return one object for a partial match', () => {
    const partialMatch = search(data, 'jon', { threshold: 0.375 });

    expect(partialMatch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should return an empty array for no match', () => {
    const noMatch = search(data, 'xyz', { threshold: 0.25 });

    expect(noMatch).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const caseInsensitive = search(data, 'JOHN', { threshold: 0.25 });

    expect(caseInsensitive).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should be able to search for numbers', () => {
    const numberSearch = search(data, '25', { threshold: 0.25 });

    expect(numberSearch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('restricts search to specified fields', () => {
    const result = search(data, '25', { fields: ['name'] });

    expect(result).toEqual([]);
  });
});
