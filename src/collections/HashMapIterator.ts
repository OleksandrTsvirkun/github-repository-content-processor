export type HashMapSelector<K, V, TResult> = (keyValue: [K, V]) => TResult;

export default class HashMapIterator<K, V, TResult> implements IterableIterator<TResult> {
  private buckets: [K, V][][];
  private currentBucketIndex: number;
  private currentValueIndex: number;
  private selector: (keyValue: [K, V]) => TResult;

  constructor(
    buckets: [K, V][][],
    selector: HashMapSelector<K, V, TResult> = ([k, v]) => [k, v] as unknown as TResult
  ) {
    this.buckets = buckets;
    this.currentBucketIndex = 0;
    this.currentValueIndex = 0;
    this.selector = selector;
  }

  next(): IteratorResult<TResult> {
    if (this.currentBucketIndex < this.buckets.length) {
      const bucket = (this.buckets[this.currentBucketIndex] ??= []);
      const index = this.currentValueIndex++;
      if (index >= 0 && index < bucket.length) {
        return {
          value: this.selector(bucket[index]!),
          done: false,
        };
      } else if (this.currentBucketIndex < this.buckets.length) {
        this.currentBucketIndex++;
        this.currentValueIndex = 0;
        return this.next();
      }
    }

    return { value: undefined, done: true };
  }

  [Symbol.iterator]() {
    return this;
  }

  reset() {
    this.currentBucketIndex = 0;
    this.currentValueIndex = 0;
  }
}
