import { search } from '../search';

describe('fuzzy', () => {
  const data = [
    { age: 25, name: 'John Doe' },
    { age: 30, name: 'Jane Doe' },
  ];

  it('should return both objects for a matching search string', () => {
    const result = search(data, 'doe', 0.25);
    expect(result).toEqual(data);
  });

  it('should return an empty array for an empty search string', () => {
    const emptyResult = search(data, '', 0.25);
    expect(emptyResult).toEqual([]);
  });

  it('should throw an error for an invalid tone', () => {
    expect(() => search(data, 'test', 2)).toThrow(Error);
  });

  it('should return one object for a partial match', () => {
    const partialMatch = search(data, 'jon', 0.375);
    expect(partialMatch).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should return an empty array for no match', () => {
    const noMatch = search(data, 'xyz', 0.25);
    expect(noMatch).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const caseInsensitive = search(data, 'JOHN', 0.25);
    expect(caseInsensitive).toEqual([{ age: 25, name: 'John Doe' }]);
  });

  it('should be able to search for numbers', () => {
    const numberSearch = search(data, '25', 0.25);
    expect(numberSearch).toEqual([{ age: 25, name: 'John Doe' }]);
  });
});
