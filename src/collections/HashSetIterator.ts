export default class HashSetIterator<T> implements IterableIterator<T> {
  private buckets: T[][];
  private currentBucketIndex: number;
  private currentValueIndex: number;

  constructor(buckets: T[][]) {
    this.buckets = buckets;
    this.currentBucketIndex = 0;
    this.currentValueIndex = 0;
  }

  next(): IteratorResult<T> {
    if (this.currentBucketIndex < this.buckets.length) {
      const bucket = (this.buckets[this.currentBucketIndex] ??= []);
      const index = this.currentValueIndex++;
      if (index >= 0 && index < bucket.length) {
        return {
          value: bucket[index]!,
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
}
