import FractionalIndex from "./FractionalIndex";

/**
 * Slug - represents a content slug consisting of fractional index and name
 * Format: <fractional-index>-<name>
 * Examples: 1a-intro, 2b-advanced, 10aa-special
 *
 * Name rules:
 * - Only lowercase letters, digits, and hyphens
 * - No spaces or special characters
 */
export default class Slug {
  private constructor(
    public readonly fractionalIndex: FractionalIndex,
    public readonly name: string
  ) {
    if (!Slug.isValidName(name)) {
      throw new Error(
        `Invalid slug name: "${name}". Only lowercase letters, digits, and hyphens are allowed`
      );
    }
  }

  /**
   * Get full slug as string
   * @returns string like "1a-intro", "2b-advanced"
   */
  get full(): string {
    return `${this.fractionalIndex.full}-${this.name}`;
  }

  /**
   * Parse a slug from string
   * @param input - string like "1a-intro", "2b-advanced"
   * @returns Slug instance
   * @throws Error if format is invalid
   */
  static parse(input: string): Slug {
    const match = input.match(/^(\d+[a-z]+)-([a-z0-9-]+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(
        `Invalid slug format: "${input}". Expected format: <number><letters>-<name> (e.g., 1a-intro)`
      );
    }

    const fractionalIndex = FractionalIndex.parse(match[1]);
    const name = match[2];

    return new Slug(fractionalIndex, name);
  }

  /**
   * Check if a string is a valid slug
   * @param input - string to validate
   * @returns true if valid
   */
  static isValid(input: string): boolean {
    return /^(\d+[a-z]+)-([a-z0-9-]+)$/.test(input);
  }

  /**
   * Check if a name is valid (lowercase letters, digits, hyphens only)
   * @param name - name to validate
   * @returns true if valid
   */
  static isValidName(name: string): boolean {
    return /^[a-z0-9-]+$/.test(name);
  }

  /**
   * Compare this slug with another
   * @param other - another Slug to compare with
   * @returns negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other: Slug): number {
    return Slug.compare(this, other);
  }

  static compare(left: Slug, right: Slug): number {
    // Compare fractional indices first
    const indexComparison = left.fractionalIndex.compareTo(right.fractionalIndex);
    if (indexComparison !== 0) {
      return indexComparison;
    }

    // If fractional indices are equal, compare names
    return left.name.localeCompare(right.name);
  }

  /**
   * String representation
   */
  toString(): string {
    return this.full;
  }

  static equals(left: Slug, right: Slug): boolean {
    return (
      FractionalIndex.equals(left.fractionalIndex, right.fractionalIndex) &&
      left.name === right.name
    );
  }

  /**
   * Check equality
   */
  equals(other: Slug): boolean {
    return Slug.equals(this, other);
  }
}
