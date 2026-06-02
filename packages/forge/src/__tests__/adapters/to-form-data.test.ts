import { toFormData } from '../../index';

describe('toFormData adapter', () => {
  test('serializes primitive values as string entries', () => {
    const formData = toFormData({ age: 25, name: 'Alice' });

    expect(formData.get('name')).toBe('Alice');
    expect(formData.get('age')).toBe('25');
  });

  test('flattens nested objects to dot-notation keys', () => {
    const formData = toFormData({ user: { age: 30, name: 'Bob' } });

    expect(formData.get('user.name')).toBe('Bob');
    expect(formData.get('user.age')).toBe('30');
  });

  test('omits null and undefined values', () => {
    const formData = toFormData({ a: null, b: undefined, c: 'ok' });

    expect(formData.has('a')).toBe(false);
    expect(formData.has('b')).toBe(false);
    expect(formData.get('c')).toBe('ok');
  });

  test('appends File and Blob values as binary FormData entries', () => {
    const file = new File(['file'], 'upload.txt');
    const blob = new Blob(['blob']);
    const formData = toFormData({ attachment: file, payload: blob });

    expect(formData.get('attachment')).toBe(file);

    const payload = formData.get('payload');

    // Browsers and jsdom surface blob FormData parts as File instances when reading them back.
    expect(payload).toBeInstanceOf(File);
    expect((payload as File).size).toBe(blob.size);
  });

  test('serializes array values as repeated keys', () => {
    const formData = toFormData({ tags: ['js', 'ts'] });

    expect(formData.getAll('tags')).toEqual(['js', 'ts']);
  });

  test('serializes mixed array values by preserving binary items and stringifying others', () => {
    const file = new File(['x'], 'x.txt');
    const blob = new Blob(['y']);
    const formData = toFormData({ items: [1, true, file, blob] });

    const values = formData.getAll('items');

    expect(values[0]).toBe('1');
    expect(values[1]).toBe('true');
    expect(values[2]).toBe(file);
    expect(values[3]).toBeInstanceOf(File);
    expect((values[3] as File).size).toBe(blob.size);
  });

  test('appends each file in a FileList as a separate entry', () => {
    const fileA = new File(['a'], 'a.txt');
    const fileB = new File(['bb'], 'b.txt');

    // jsdom does not expose FileList as a constructible class, so we stub it for this test.
    class FakeFileList {
      [index: number]: File;
      readonly length: number;
      constructor(...items: File[]) {
        items.forEach((f, i) => {
          (this as unknown as Record<number, File>)[i] = f;
        });
        this.length = items.length;
      }
    }

    const origFileList = globalThis.FileList;

    globalThis.FileList = FakeFileList as unknown as typeof FileList;

    const fileList = new FakeFileList(fileA, fileB) as unknown as FileList;
    const formData = toFormData({ files: fileList });

    globalThis.FileList = origFileList;

    const entries = formData.getAll('files');

    expect(entries).toHaveLength(2);
    expect(entries[0]).toBe(fileA);
    expect(entries[1]).toBe(fileB);
  });
});
