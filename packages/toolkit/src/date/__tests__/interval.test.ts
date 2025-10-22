import { interval } from '../interval';

describe('interval', () => {
  it('should generate daily dates within the range', () => {
    const result = interval('2022-01-01', '2022-01-05', { interval: 'D', steps: 1 });
    expect(result).toEqual([
      new Date('2022-01-01'),
      new Date('2022-01-02'),
      new Date('2022-01-03'),
      new Date('2022-01-04'),
      new Date('2022-01-05'),
    ]);
  });

  it('should generate weekly dates within the range', () => {
    const result = interval('2022-01-01', '2022-01-31', { interval: 'W', steps: 1 });
    expect(result).toEqual([
      new Date('2022-01-01'),
      new Date('2022-01-08'),
      new Date('2022-01-15'),
      new Date('2022-01-22'),
      new Date('2022-01-29'),
    ]);
  });

  it('should generate monthly dates within the range', () => {
    const result = interval('2022-01-01', '2022-06-01', { interval: 'M', steps: 1 });
    expect(result).toEqual([
      new Date('2022-01-01'),
      new Date('2022-02-01'),
      new Date('2022-03-01'),
      new Date('2022-04-01'),
      new Date('2022-05-01'),
      new Date('2022-06-01'),
    ]);
  });

  it('should return an empty array if start date is after end date', () => {
    const result = interval('2022-12-01', '2022-01-01');
    expect(result).toEqual([]);
  });

  it('should throw an error for invalid date input', () => {
    expect(() => interval('invalid-date', '2022-01-10')).toThrowError();
  });

  it('should throw an error if both dates are invalid', () => {
    expect(() => interval('invalid-date', 'invalid-date')).toThrowError();
  });

  it('should throw an error if no parameters are provided', () => {
    // @ts-expect-error Testing case where no arguments are provided
    expect(() => interval()).toThrowError();
  });

  it('should return the latest date when latest flag is true', () => {
    const result = interval('2022-01-01', '2022-01-10', { interval: 'D', latest: true, steps: 100 });
    expect(result).toEqual([new Date('2022-01-01'), new Date('2022-01-10')]);
  });

  it("should generate start-of-month dates when using 'MS' interval", () => {
    const result = interval('2022-01-01', '2022-06-01', { interval: 'MS', steps: 1 });
    expect(result).toEqual([
      new Date('2022-01-01'),
      new Date('2022-02-01'),
      new Date('2022-03-01'),
      new Date('2022-04-01'),
      new Date('2022-05-01'),
      new Date('2022-06-01'),
    ]);
  });

  it("should generate end-of-month dates when using 'ME' interval", () => {
    const result = interval('2022-01-01', '2022-06-30', { interval: 'ME', steps: 1 });
    expect(result).toEqual([
      new Date('2022-01-31'),
      new Date('2022-02-28'),
      new Date('2022-03-31'),
      new Date('2022-04-30'),
      new Date('2022-05-31'),
      new Date('2022-06-30'),
    ]);
  });

  it("should generate start-of-year dates when using 'YS' interval", () => {
    const result = interval('2020-01-01', '2025-12-31', { interval: 'YS', steps: 1 });
    expect(result).toEqual([
      new Date('2020-01-01'),
      new Date('2021-01-01'),
      new Date('2022-01-01'),
      new Date('2023-01-01'),
      new Date('2024-01-01'),
      new Date('2025-01-01'),
    ]);
  });

  it("should generate end-of-year dates when using 'YE' interval", () => {
    const result = interval('2020-01-01', '2025-12-31', { interval: 'YE', steps: 1 });
    expect(result).toEqual([
      new Date('2020-12-31'),
      new Date('2021-12-31'),
      new Date('2022-12-31'),
      new Date('2023-12-31'),
      new Date('2024-12-31'),
      new Date('2025-12-31'),
    ]);
  });

  it('should generate dates correctly with a step of 2', () => {
    const result = interval('2022-01-01', '2022-01-10', { interval: 'D', steps: 2 });
    expect(result).toEqual([
      new Date('2022-01-01'),
      new Date('2022-01-03'),
      new Date('2022-01-05'),
      new Date('2022-01-07'),
      new Date('2022-01-09'),
    ]);
  });

  it('should throw an error when using invalid date parameters', () => {
    expect(() => interval('invalid-date', 'invalid-date', { interval: 'D', steps: 1 })).toThrowError(
      /Invalid date format. Use a valid Date object or ISO string./,
    );
  });
});
