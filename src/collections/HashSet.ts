import hashCode from "./hashCode";
import HashSetIterator from "./HashSetIterator";
import { defaultEqualsFn, EqualsFn, HashFn } from "./utils";

export default class HashSet<T> implements Iterable<T> {
  private static readonly LOAD_FACTOR: number = 0.75;
  private static readonly GROW_FACTOR: number = 2;
  private static readonly INIT_BUCKET_COUNT: number = 8;

  private buckets: T[][];
  private equalsFn: (a: T, b: T) => boolean;
  private hashFn: (item: T) => number;

  public get size(): number {
    return this.buckets.reduce((acc, bucket) => {
      return acc + (bucket ? bucket.length : 0);
    }, 0);
  }

  private get loadFactor(): number {
    return this.size / this.buckets.length;
  }

  constructor(
    iterableOrEqualsFn?: Iterable<T> | null | EqualsFn<T> | undefined,
    equalsFnOrHashFn?: EqualsFn<T> | HashFn<T> | undefined,
    hashFnOrBucketCount?: HashFn<T> | number | undefined,
    bucketCount: number = HashSet.INIT_BUCKET_COUNT
  ) {
    // Determine if first argument is entries or equalsFn
    if (typeof iterableOrEqualsFn === "function") {
      // Called with equalsFn
      this.equalsFn = (iterableOrEqualsFn as EqualsFn<T>) || defaultEqualsFn;
      this.hashFn = (equalsFnOrHashFn as HashFn<T>) || hashCode;
      bucketCount = (hashFnOrBucketCount as number) || HashSet.INIT_BUCKET_COUNT;
    } else {
      // Called with entries or nothing
      this.equalsFn = (equalsFnOrHashFn as EqualsFn<T>) || defaultEqualsFn;
      this.hashFn = (hashFnOrBucketCount as HashFn<T>) || hashCode;
      bucketCount = bucketCount || HashSet.INIT_BUCKET_COUNT;
    }

    this.buckets = Array.from({ length: bucketCount }, () => []);

    if (iterableOrEqualsFn && typeof iterableOrEqualsFn !== "function") {
      for (const value of iterableOrEqualsFn) {
        this.add(value);
      }
    }
  }

  public add(value: T): this {
    return this.addInternal(this.buckets, value);
  }

  private addInternal(buckets: T[][], value: T, isNew: boolean = false): this {
    const hash = this.hashFn(value);
    const index = hash % buckets.length;
    const bucket = buckets[index];

    if (bucket && !bucket.find((x) => this.equalsFn(x, value))) {
      if (!isNew) {
        this.resize();
      }

      bucket.push(value);
    }

    return this;
  }

  public clear(): void {
    this.buckets = Array.from({ length: HashSet.INIT_BUCKET_COUNT }, () => []);
  }

  public delete(value: T): boolean {
    const hash = this.hashFn(value);
    const index = hash % this.buckets.length;
    let bucket = this.buckets[index];

    if (bucket) {
      const lengthBefore = bucket.length;
      bucket = this.buckets[index] = bucket.filter((x) => !this.equalsFn(x, value));
      const lengthAfter = bucket.length;

      return lengthBefore > lengthAfter;
    }

    return false;
  }

  public has(value: T): boolean {
    const hash = this.hashFn(value);
    const index = hash % this.buckets.length;
    const bucket = this.buckets[index];

    if (!bucket) {
      return false;
    }

    return !!bucket.find((x) => this.equalsFn(x, value));
  }

  [Symbol.iterator]() {
    return new HashSetIterator<T>(this.buckets);
  }

  private resize() {
    if (this.loadFactor > HashSet.LOAD_FACTOR) {
      const newBuckets: T[][] = Array.from(
        { length: this.buckets.length * HashSet.GROW_FACTOR },
        () => []
      );

      for (const bucket of this.buckets) {
        for (const value of bucket) {
          this.addInternal(newBuckets, value, true);
        }
      }
    }
  }
}
