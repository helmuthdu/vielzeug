export type Scheduler = {
  delay(callback: () => void, milliseconds: number): () => void;
  repeat(callback: () => void, milliseconds: number): () => void;
};

export const defaultScheduler: Scheduler = {
  delay(callback, milliseconds) {
    const id = setTimeout(callback, milliseconds);

    return () => clearTimeout(id);
  },
  repeat(callback, milliseconds) {
    const id = setInterval(callback, milliseconds);

    return () => clearInterval(id);
  },
};
