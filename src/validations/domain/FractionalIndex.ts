/**
 * FractionalIndex - represents a fractional index for ordering content
 * Format: <number><letters> where letters are mandatory
 * Examples: 1a, 2b, 10aa, 11z
 *
 * Sorting rules:
 * - Compare numbers first (as integers)
 * - If numbers equal, more letters = smaller value
 * - If same letter count, compare lexicographically
 */
export default class FractionalIndex {
  private constructor(
    public readonly number: number,
    public readonly letters: string
  ) {
    if (number < 0) {
      throw new Error("Number must be non-negative");
    }
    if (!letters || letters.length === 0) {
      throw new Error("Letters are required");
    }
    if (!/^[a-z]+$/.test(letters)) {
      throw new Error("Letters must be lowercase a-z only");
    }
  }

  /**
   * Get full fractional index as string
   * @returns string representation like "1a", "2b", "10aa"
   */
  get full(): string {
    return `${this.number}${this.letters}`;
  }

  /**
   * Parse a fractional index from string
   * @param input - string like "1a", "2b", "10aa"
   * @returns FractionalIndex instance
   * @throws Error if format is invalid
   */
  static parse(input: string): FractionalIndex {
    const match = input.match(/^(\d+)([a-z]+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(
        `Invalid fractional index format: "${input}". Expected format: <number><letters> (e.g., 1a, 2b, 10aa)`
      );
    }

    const number = parseInt(match[1], 10);
    const letters = match[2];

    return new FractionalIndex(number, letters);
  }

  /**
   * Check if a string is a valid fractional index
   * @param input - string to validate
   * @returns true if valid
   */
  static isValid(input: string): boolean {
    return /^(\d+)([a-z]+)$/.test(input);
  }

  /**
   * Compare this fractional index with another
   * @param other - another FractionalIndex to compare with
   * @returns negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other: FractionalIndex): number {
    return FractionalIndex.compare(this, other);
  }

  static compare(left: FractionalIndex, right: FractionalIndex): number {
    // 1. Compare numbers
    if (left.number !== right.number) {
      return left.number - right.number;
    }

    // 2. Compare letter count (more letters = smaller value)
    if (left.letters.length !== right.letters.length) {
      return right.letters.length - left.letters.length;
    }

    // 3. Compare lexicographically
    return left.letters.localeCompare(right.letters);
  }

  /**
   * String representation
   */
  toString(): string {
    return this.full;
  }

  static equals(left: FractionalIndex, right: FractionalIndex): boolean {
    return left.number === right.number && left.letters === right.letters;
  }

  /**
   * Check equality
   */
  equals(other: FractionalIndex): boolean {
    return FractionalIndex.equals(this, other);
  }
}
