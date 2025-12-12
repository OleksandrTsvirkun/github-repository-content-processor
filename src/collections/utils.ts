export type EqualsFn<K> = (a: K, b: K) => boolean;
export type HashFn<K> = (item: K) => number;

export function defaultEqualsFn<K>(a: K, b: K): boolean {
  return a === b;
}

export type Batch<T> = {
  index: number;
  size: number;
  items: T[];
};

export function* filter<T>(iterable: Iterable<T>, predicate: (item: T) => boolean): Generator<T> {
  for (const value of iterable) {
    if (predicate(value)) {
      yield value;
    }
  }
}

export async function* filterAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => boolean
): AsyncGenerator<T> {
  for await (const value of iterable) {
    if (predicate(value)) {
      yield value;
    }
  }
}

export async function* flatAsync<T>(
  iterable: AsyncIterable<Iterable<T> | AsyncIterable<T>>
): AsyncGenerator<T> {
  for await (const inner of iterable) {
    yield* inner;
  }
}

export function* partition<T>(iterable: Iterable<T>, size: number): Generator<Batch<T>> {
  let batch: Batch<T> = {
    index: 0,
    size: size,
    items: [],
  };

  for (const item of iterable) {
    batch.items.push(item);
    if (batch.items.length === size) {
      yield batch;
      batch = {
        index: batch.index + 1,
        size: size,
        items: [],
      };
    }
  }
  if (batch.items.length > 0) {
    yield batch;
  }
}

export async function* partitionAsync<T>(
  iterable: AsyncIterable<T>,
  size: number
): AsyncGenerator<Batch<T>> {
  let batch: Batch<T> = {
    index: 0,
    size: size,
    items: [],
  };

  for await (const item of iterable) {
    batch.items.push(item);
    if (batch.items.length === size) {
      yield batch;
      batch = {
        index: batch.index + 1,
        size: size,
        items: [],
      };
    }
  }
  if (batch.items.length > 0) {
    yield batch;
  }
}
