// Types for batch processing
export interface Batch<T> {
  index: number;
  size: number;
  items: T[];
}

// Helper functions for partitioning
function* partition<T>(items: Iterable<T>, size: number): Generator<Batch<T>> {
  const array = Array.from(items);
  let index = 0;
  for (let i = 0; i < array.length; i += size) {
    yield {
      index: index++,
      size,
      items: array.slice(i, i + size),
    };
  }
}

async function* partitionAsync<T>(
  items: AsyncIterable<T>,
  size: number
): AsyncGenerator<Batch<T>> {
  let batch: T[] = [];
  let index = 0;
  
  for await (const item of items) {
    batch.push(item);
    if (batch.length >= size) {
      yield {
        index: index++,
        size,
        items: batch,
      };
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    yield {
      index: index++,
      size,
      items: batch,
    };
  }
}

/**
 * Options for parallel batch processing.
 */
export interface ParallelBatchHandlerOptions {
  /**
   * Maximum number of items to process in parallel.
   * @default 10
   */
  maxParallel?: number;

  /**
   * Optional callback to execute before each batch.
   * Useful for rate limit checks or logging.
   */
  beforeBatch?: (batchNumber: number, batchSize: number) => Promise<void>;

  /**
   * Optional callback to execute after each batch.
   * Useful for progress tracking or cleanup.
   */
  afterBatch?: (batchNumber: number, batchSize: number, results: unknown[]) => Promise<void>;
}

type ProcessorAsync<T, R> = (item: T) => Promise<R>;
type ProcessorManyAsync<T, R> = (item: T) => AsyncGenerator<R>;

/**
 * Utility for processing items in parallel batches with controlled concurrency.
 * Helps avoid overwhelming APIs while maximizing throughput.
 */
export class ParallelBatchHandler {
  private _maxParallel: number;
  private beforeBatch?: (batchNumber: number, batchSize: number) => Promise<void>;
  private afterBatch?: (
    batchNumber: number,
    batchSize: number,
    results: unknown[]
  ) => Promise<void>;

  constructor(options: ParallelBatchHandlerOptions = {}) {
    this._maxParallel = options.maxParallel ?? 10;
    this.beforeBatch = options.beforeBatch;
    this.afterBatch = options.afterBatch;
  }

  /**
   * Process items in parallel batches.
   * @param items - Iterable or AsyncIterable of items to process
   * @param processor - Async function to process each item
   * @returns AsyncGenerator that yields individual processed results
   */
  async *execute<T, R>(items: Iterable<T>, processor: ProcessorAsync<T, R>): AsyncGenerator<R> {
    for (const batch of partition(items, this._maxParallel)) {
      yield* await this.process(batch, processor);
    }
  }

  async *executeAsync<T, R>(
    items: AsyncIterable<T>,
    processor: ProcessorAsync<T, R>
  ): AsyncGenerator<R> {
    for await (const batch of partitionAsync(items, this._maxParallel)) {
      yield* await this.process(batch, processor);
    }
  }

  async *executeMany<T, R>(
    items: Iterable<T>,
    processor: ProcessorManyAsync<T, R>
  ): AsyncGenerator<R> {
    for (const batch of partition(items, this._maxParallel)) {
      yield* this.processMany(batch, processor);
    }
  }

  async *executeManyAsync<T, R>(
    items: AsyncIterable<T>,
    processor: ProcessorManyAsync<T, R>
  ): AsyncGenerator<R> {
    for await (const batch of partitionAsync(items, this._maxParallel)) {
      yield* this.processMany(batch, processor);
    }
  }

  private async process<T, R>(batch: Batch<T>, processor: ProcessorAsync<T, R>): Promise<R[]> {
    if (batch.items.length === 0) {
      return [];
    }

    // Execute before batch callback if provided
    if (this.beforeBatch) {
      await this.beforeBatch(batch.index, batch.size);
    }

    // Process batch in parallel
    const results = await Promise.all(batch.items.map(processor));

    // Execute after batch callback if provided
    if (this.afterBatch) {
      await this.afterBatch(batch.index, batch.size, results);
    }

    return results;
  }

  private async *processMany<T, R>(
    batch: Batch<T>,
    processor: ProcessorManyAsync<T, R>
  ): AsyncGenerator<R> {
    if (batch.items.length === 0) {
      return;
    }

    // Execute before batch callback if provided
    if (this.beforeBatch) {
      await this.beforeBatch(batch.index, batch.size);
    }

    // Process batch in parallel
    const results = await Promise.all(batch.items.map(processor));

    // Execute after batch callback if provided
    if (this.afterBatch) {
      await this.afterBatch(batch.index, batch.size, results);
    }

    for (const result of results) {
      yield* result;
    }
  }

  /**
   * Get max parallel degree.
   */
  get maxParallel(): number {
    return this._maxParallel;
  }
}
