import { ArsenalSerializationError } from '../errors';

export interface CompressionOptions {
  format?: CompressionFormat;
}

export interface DecompressionOptions extends CompressionOptions {
  maxOutputBytes: number;
}

async function transformBytes(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  maxOutputBytes: number,
): Promise<Uint8Array> {
  const reader = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  })
    .pipeThrough(stream)
    .getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxOutputBytes) throw new ArsenalSerializationError('Decompressed data exceeds the byte limit.');
      chunks.push(value);
    }
  } catch (cause) {
    await reader.cancel(cause).catch(() => undefined);
    if (cause instanceof ArsenalSerializationError) throw cause;
    throw new ArsenalSerializationError('Unable to transform compressed data.', { cause });
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function compressBytes(bytes: Uint8Array, options: CompressionOptions = {}): Promise<Uint8Array> {
  try {
    return await transformBytes(bytes, new CompressionStream(options.format ?? 'deflate-raw'), Infinity);
  } catch (cause) {
    if (cause instanceof ArsenalSerializationError) throw cause;
    throw new ArsenalSerializationError('Compression is unavailable for this format.', { cause });
  }
}

export async function decompressBytes(bytes: Uint8Array, options: DecompressionOptions): Promise<Uint8Array> {
  if (!Number.isSafeInteger(options.maxOutputBytes) || options.maxOutputBytes < 0)
    throw new ArsenalSerializationError('maxOutputBytes must be a non-negative safe integer.');
  try {
    return await transformBytes(
      bytes,
      new DecompressionStream(options.format ?? 'deflate-raw'),
      options.maxOutputBytes,
    );
  } catch (cause) {
    if (cause instanceof ArsenalSerializationError) throw cause;
    throw new ArsenalSerializationError('Decompression is unavailable for this format.', { cause });
  }
}
