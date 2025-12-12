import hashCode from "./hashCode";
import HashMapIterator from "./HashMapIterator";
import { defaultEqualsFn, EqualsFn, HashFn } from "./utils";

export default class HashMap<K, V> implements Iterable<[K, V]> {
  private static readonly LOAD_FACTOR: number = 0.75;
  private static readonly GROW_FACTOR: number = 2;
  private static readonly INIT_BUCKET_COUNT: number = 8;

  private buckets: [K, V][][];
  private equalsFn: (a: K, b: K) => boolean;
  private hashFn: (item: K) => number;

  public get size(): number {
    return this.buckets.reduce((acc, bucket) => {
      return acc + (bucket ? bucket.length : 0);
    }, 0);
  }

  private get loadFactor(): number {
    return this.size / this.buckets.length;
  }

  constructor(
    entriesOrEqualsFn?: Iterable<[K, V]> | null | EqualsFn<K> | undefined,
    equalsFnOrHashFn?: EqualsFn<K> | HashFn<K> | undefined,
    hashFnOrBucketCount?: HashFn<K> | number | undefined,
    bucketCount: number = HashMap.INIT_BUCKET_COUNT
  ) {
    // Determine if first argument is entries or equalsFn
    if (typeof entriesOrEqualsFn === "function") {
      // Called with equalsFn
      this.equalsFn = (entriesOrEqualsFn as EqualsFn<K>) || defaultEqualsFn;
      this.hashFn = (equalsFnOrHashFn as HashFn<K>) || hashCode;
      bucketCount = (hashFnOrBucketCount as number) || HashMap.INIT_BUCKET_COUNT;
    } else {
      // Called with entries or nothing
      this.equalsFn = (equalsFnOrHashFn as EqualsFn<K>) || defaultEqualsFn;
      this.hashFn = (hashFnOrBucketCount as HashFn<K>) || hashCode;
      bucketCount = bucketCount || HashMap.INIT_BUCKET_COUNT;
    }

    this.buckets = Array.from({ length: bucketCount }, () => []);

    if (entriesOrEqualsFn && typeof entriesOrEqualsFn !== "function") {
      for (const [key, value] of entriesOrEqualsFn) {
        this.set(key, value);
      }
    }
  }

  public set(key: K, value: V): this {
    return this.addInternal(this.buckets, key, value);
  }

  private addInternal(buckets: [K, V][][], key: K, value: V, isNew: boolean = false): this {
    const hash = this.hashFn(key);
    const index = hash % buckets.length;
    const bucket = buckets[index];

    if (bucket && !bucket.find((x) => this.innerComparer(x, key))) {
      if (!isNew) {
        this.resize();
      }

      bucket.push([key, value]);
    }

    return this;
  }

  public clear(): void {
    this.buckets = Array.from({ length: HashMap.INIT_BUCKET_COUNT }, () => []);
  }

  public delete(key: K): boolean {
    const hash = this.hashFn(key);
    const index = hash % this.buckets.length;
    let bucket = this.buckets[index];

    if (bucket) {
      const lengthBefore = bucket.length;
      bucket = this.buckets[index] = bucket.filter((x) => !this.innerComparer(x, key));
      const lengthAfter = bucket.length;

      return lengthBefore > lengthAfter;
    }

    return false;
  }

  public get(key: K): V | undefined {
    const hash = this.hashFn(key);
    const index = hash % this.buckets.length;
    const bucket = this.buckets.at(index);

    if (!bucket) {
      return undefined;
    }

    return bucket.find((x) => this.innerComparer(x, key))?.[1];
  }

  public has(key: K): boolean {
    const hash = this.hashFn(key);
    const index = hash % this.buckets.length;
    const bucket = this.buckets[index];

    if (!bucket) {
      return false;
    }

    return !!bucket.find((x) => this.innerComparer(x, key));
  }

  public keys() {
    return new HashMapIterator(this.buckets, (kv) => kv[0]);
  }

  public values() {
    return new HashMapIterator(this.buckets, (kv) => [kv[1]]);
  }

  public entries(): IterableIterator<[K, V]> {
    return new HashMapIterator(this.buckets);
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  private resize() {
    if (this.loadFactor > HashMap.LOAD_FACTOR) {
      const newBuckets: [K, V][][] = Array.from(
        {
          length: this.buckets.length * HashMap.GROW_FACTOR,
        },
        () => []
      );

      for (const bucket of this.buckets) {
        for (const [key, value] of bucket) {
          this.addInternal(newBuckets, key, value, true);
        }
      }
    }
  }

  private innerComparer([currentKey]: [K, V], key: K) {
    return this.equalsFn(currentKey, key);
  }
}
