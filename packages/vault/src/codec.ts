import type { CodecInput, RecordCodec } from './types';

const isCodec = <T>(input: CodecInput<T>): input is RecordCodec<T> => 'encode' in input && 'decode' in input;

export const encodeRecord = <T>(input: CodecInput<T>, value: T): unknown =>
  isCodec(input) ? input.encode(value) : value;

export const decodeRecord = <T>(input: CodecInput<T>, value: unknown): T =>
  isCodec(input) ? input.decode(value) : input.parse(value);

export const validateRecord = <T>(input: CodecInput<T>, value: T): T =>
  isCodec(input) ? input.decode(input.encode(value)) : input.parse(value);
